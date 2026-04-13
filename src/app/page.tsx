
"use client";

import { useState, useEffect } from "react";
import { LoginView } from "@/components/auth/login-view";
import { MainDashboard } from "@/components/dashboard/main-dashboard";
import { User } from "@/lib/types";
import { useFirestore, useAuth } from "@/firebase";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged 
} from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

const SESSION_KEY = 'rappi_commander_session_v4';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function Home() {
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  
  const [localUser, setLocalUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Efeito de inicialização (executa apenas uma vez no mount)
  useEffect(() => {
    setMounted(true);
    
    // 1. Verifica sessão salva no localStorage
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
      try {
        const { user, expiry } = JSON.parse(savedSession);
        const now = new Date().getTime();
        
        if (now < expiry) {
          setLocalUser(user);
        } else {
          localStorage.removeItem(SESSION_KEY);
          toast({ title: "Sessão Expirada", description: "Por favor, faça login novamente." });
        }
      } catch (e) {
        localStorage.removeItem(SESSION_KEY);
      }
    }

    // 2. Monitora o estado real do Firebase Auth para garantir sincronia
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // Se deslogou do Firebase, limpamos a sessão local por segurança
      if (!firebaseUser) {
        // setLocalUser(null); // Opcional: descomente se quiser forçar logout total
      }
    });

    setIsInitializing(false);
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth]); // localUser removido das dependências para evitar loop

  const handleLogin = async (emailInput: string, passInput: string) => {
    setIsAuthenticating(true);
    
    const email = emailInput.toLowerCase().trim();
    const password = passInput.trim();
    
    try {
      // 1. Busca o perfil no Firestore
      const q = query(collection(db, 'userProfiles'), where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        // Exceção especial para o seu e-mail mestre inicial
        if (email === 'rik4rd0stream@gmail.com') {
          await handleMasterFirstAccess(email, password);
          return;
        }

        toast({
          variant: "destructive",
          title: "Acesso Negado",
          description: "Usuário não encontrado no banco de dados."
        });
        setIsAuthenticating(false);
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const firestoreData = userDoc.data();

      // Validar senha do Firestore antes de tentar o Auth (Camada extra de controle Master)
      if (firestoreData.password && firestoreData.password !== password) {
         toast({ variant: "destructive", title: "Senha Incorreta", description: "Verifique seus dados cadastrados." });
         setIsAuthenticating(false);
         return;
      }

      // 2. Tenta Logar no Firebase Authentication
      try {
        const authResult = await signInWithEmailAndPassword(auth, email, password);
        completeLogin(authResult.user.uid, firestoreData);
      } catch (authErr: any) {
        // Se o erro for "user-not-found" ou "invalid-credential", e ele existe no Firestore, criamos no Auth
        if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential') {
          try {
            const newAuth = await createUserWithEmailAndPassword(auth, email, password);
            // Atualiza o documento no Firestore com o UID real do Auth para vínculo
            await updateDoc(doc(db, 'userProfiles', userDoc.id), {
              authUid: newAuth.user.uid,
              updatedAt: new Date().toISOString()
            });
            completeLogin(newAuth.user.uid, firestoreData);
          } catch (createErr: any) {
            console.error("Erro ao criar vínculo Auth:", createErr);
            toast({ variant: "destructive", title: "Erro de Segurança", description: "Verifique a força da senha." });
          }
        } else {
          toast({ variant: "destructive", title: "Erro de Acesso", description: "Falha ao conectar com o servidor." });
        }
      }
    } catch (err: any) {
      console.error("Login Error:", err);
      toast({ variant: "destructive", title: "Erro de Conexão", description: "Falha na validação." });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleMasterFirstAccess = async (email: string, pass: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      const masterData = {
        id: result.user.uid,
        name: 'Ricardo (Master)',
        email: email,
        role: 'master',
        notificationsEnabled: true,
        hasRequestAccess: true,
        createdAt: new Date().toISOString()
      };
      
      setLocalUser(masterData as User);
      const expiry = new Date().getTime() + SEVEN_DAYS_MS;
      localStorage.setItem(SESSION_KEY, JSON.stringify({ user: masterData, expiry }));
      toast({ title: "Mestre Configurado", description: "Acesso root ativado." });
    } catch (e: any) {
      try {
        const login = await signInWithEmailAndPassword(auth, email, pass);
        const masterData = { id: login.user.uid, name: 'Ricardo (Master)', email, role: 'master', hasRequestAccess: true, notificationsEnabled: true };
        completeLogin(login.user.uid, masterData);
      } catch (loginErr) {
        toast({ variant: "destructive", title: "Acesso Negado", description: "Senha Master incorreta." });
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const completeLogin = (uid: string, data: any) => {
    const userData: User = { 
      id: uid, 
      name: data.name,
      email: data.email,
      role: data.role || 'normal',
      notificationsEnabled: data.notificationsEnabled,
      hasRequestAccess: data.hasRequestAccess
    };
    setLocalUser(userData);
    const expiry = new Date().getTime() + SEVEN_DAYS_MS;
    localStorage.setItem(SESSION_KEY, JSON.stringify({ user: userData, expiry }));
    toast({ title: "Bem-vindo", description: `Olá, ${userData.name}` });
  };

  const handleLogout = () => {
    auth.signOut();
    setLocalUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  if (!mounted || isInitializing || isAuthenticating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-primary font-bold animate-pulse text-[10px] uppercase tracking-widest text-center px-4">
            {isAuthenticating ? "Autenticando..." : "Carregando Rappi Commander..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {localUser ? (
        <MainDashboard user={localUser} onLogout={handleLogout} />
      ) : (
        <LoginView onLogin={handleLogin} />
      )}
    </div>
  );
}
