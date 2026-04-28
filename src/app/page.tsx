
"use client";

import { useState, useEffect } from "react";
import { LoginView } from "@/components/auth/login-view";
import { MainDashboard } from "@/components/dashboard/main-dashboard";
import { User } from "@/lib/types";
import { useFirestore, useAuth } from "@/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { 
  signInWithEmailAndPassword, 
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

  useEffect(() => {
    setMounted(true);
    
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
      try {
        const { user, expiry } = JSON.parse(savedSession);
        const now = new Date().getTime();
        
        if (now < expiry) {
          setLocalUser(user);
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      } catch (e) {
        localStorage.removeItem(SESSION_KEY);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // Sincronização passiva
    });

    setIsInitializing(false);
    return () => unsubscribe();
  }, [auth]);

  const handleLogin = async (emailInput: string, passInput: string) => {
    setIsAuthenticating(true);
    
    const email = emailInput.toLowerCase().trim();
    const password = passInput.trim();
    
    try {
      // BUSCA DIRETA PELO ID (E-MAIL) - Prioridade total ao Firestore
      const userDocRef = doc(db, 'userProfiles', email);
      const userSnap = await getDoc(userDocRef);
      
      if (!userSnap.exists()) {
        toast({
          variant: "destructive",
          title: "Acesso Negado",
          description: "Usuário não encontrado no banco de dados. Solicite o cadastro."
        });
        setIsAuthenticating(false);
        return;
      }

      const firestoreData = userSnap.data();

      // Validação de senha local (Firestore) antes de tentar o Auth
      if (firestoreData.password && firestoreData.password !== password) {
         toast({ variant: "destructive", title: "Senha Incorreta", description: "Verifique seus dados." });
         setIsAuthenticating(false);
         return;
      }

      try {
        // Tenta o login oficial no Firebase Auth
        const authResult = await signInWithEmailAndPassword(auth, email, password);
        completeLogin(authResult.user.uid, firestoreData);
      } catch (authErr: any) {
        console.error("Auth Login Error:", authErr.code);
        toast({ 
          variant: "destructive", 
          title: "Erro de Autenticação", 
          description: "O usuário não foi ativado no Auth ou a senha está divergente." 
        });
      }
    } catch (err: any) {
      console.error("Login Critical Error:", err);
      toast({ variant: "destructive", title: "Erro de Conexão", description: "Falha na comunicação com o servidor." });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const completeLogin = (uid: string, data: any) => {
    const userData: User = { 
      id: uid, 
      name: data.name || data.nome || 'Operador',
      email: data.email,
      role: data.role || 'normal',
      notificationsEnabled: data.notificationsEnabled !== false,
      hasRequestAccess: !!data.hasRequestAccess,
      hasRtStatusAccess: !!data.hasRtStatusAccess
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
          <p className="text-primary font-bold animate-pulse text-[10px] uppercase tracking-widest">
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
