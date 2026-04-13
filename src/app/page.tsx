
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

const SESSION_KEY = 'rappi_commander_session_v3';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function Home() {
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  
  const [localUser, setLocalUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    setMounted(true);
    
    // Verifica sessão salva no localStorage para persistência de 7 dias
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

    // Monitora o estado real do Firebase Auth
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser && localUser) {
        // Se o Firebase deslogou mas temos sessão local, tentamos manter (opcional)
        // Ou podemos forçar o logout aqui se quisermos sincronia total
      }
    });

    setIsInitializing(false);
    return () => unsubscribe();
  }, [auth, toast, localUser]);

  const handleLogin = async (emailInput: string, passInput: string) => {
    setIsAuthenticating(true);
    
    const email = emailInput.toLowerCase().trim();
    const password = passInput.trim();
    
    try {
      // 1. Busca o perfil no Firestore (Sua base de controle)
      const q = query(collection(db, 'userProfiles'), where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        // Exceção especial para o Ricardo Master caso não esteja no banco
        if (email === 'rik4rd0stream@gmail.com') {
          await handleMasterFirstAccess(email, password);
          return;
        }

        toast({
          variant: "destructive",
          title: "Acesso Negado",
          description: "Usuário não encontrado no sistema."
        });
        setIsAuthenticating(false);
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const firestoreData = userDoc.data();

      // 2. Tenta Logar no Firebase Authentication
      try {
        const authResult = await signInWithEmailAndPassword(auth, email, password);
        completeLogin(authResult.user.uid, firestoreData);
      } catch (authErr: any) {
        // Se o erro for "user-not-found", significa que ele está no Firestore mas não no Auth
        // Vamos criar a conta dele no Auth agora (Vínculo Automático)
        if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential') {
          // Validação extra de senha antes de criar (usando a senha que você cadastrou no Firestore)
          if (firestoreData.password && firestoreData.password !== password) {
             toast({ variant: "destructive", title: "Senha Incorreta", description: "Verifique seus dados." });
             setIsAuthenticating(false);
             return;
          }

          try {
            const newAuth = await createUserWithEmailAndPassword(auth, email, password);
            // Atualiza o documento no Firestore com o UID real do Auth
            await updateDoc(doc(db, 'userProfiles', userDoc.id), {
              authUid: newAuth.user.uid,
              updatedAt: new Date().toISOString()
            });
            completeLogin(newAuth.user.uid, firestoreData);
          } catch (createErr: any) {
            console.error("Erro ao criar vínculo Auth:", createErr);
            toast({ variant: "destructive", title: "Erro de Segurança", description: "Senha muito fraca ou e-mail já existente." });
          }
        } else {
          toast({ variant: "destructive", title: "Erro de Acesso", description: "Senha incorreta ou erro de conexão." });
        }
      }
    } catch (err: any) {
      console.error("Login Error:", err);
      toast({ variant: "destructive", title: "Erro de Conexão", description: "Falha ao validar acesso." });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleMasterFirstAccess = async (email: string, pass: string) => {
    try {
      // Cria o mestre no Auth e no Firestore simultaneamente
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      const masterData = {
        id: 'master_root',
        authUid: result.user.uid,
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
      toast({ title: "Mestre Configurado", description: "Seu acesso root foi vinculado ao Firebase." });
    } catch (e: any) {
      // Se já existe no Auth, apenas loga
      try {
        const login = await signInWithEmailAndPassword(auth, email, pass);
        const masterData = { id: 'master_root', name: 'Ricardo (Master)', email, role: 'master', hasRequestAccess: true, notificationsEnabled: true };
        completeLogin(login.user.uid, masterData);
      } catch (loginErr) {
        toast({ variant: "destructive", title: "Erro Master", description: "Verifique sua senha master." });
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
    toast({ title: "Acesso Confirmado", description: `Olá, ${userData.name}` });
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
          <p className="text-primary font-bold animate-pulse text-[10px] uppercase tracking-widest text-center">
            {isAuthenticating ? "Autenticando via Firebase..." : "Carregando Rappi..."}
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
