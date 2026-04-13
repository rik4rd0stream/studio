"use client";

import { useState, useEffect } from "react";
import { LoginView } from "@/components/auth/login-view";
import { MainDashboard } from "@/components/dashboard/main-dashboard";
import { User } from "@/lib/types";
import { useFirestore } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

const SESSION_KEY = 'rappi_commander_session_v2';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function Home() {
  const db = useFirestore();
  const { toast } = useToast();
  const [localUser, setLocalUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    setMounted(true);
    
    // Verifica sessão salva
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
    setIsInitializing(false);
  }, [toast]);

  const handleLogin = async (emailInput: string, passInput: string) => {
    setIsAuthenticating(true);
    
    const email = emailInput.toLowerCase().trim();
    const password = passInput.trim();
    
    try {
      // Busca o perfil no novo banco de dados
      const q = query(collection(db, 'userProfiles'), where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      let userData: User | null = null;
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const data = userDoc.data();
        
        // Validação de senha
        if (data.password && data.password !== password) {
          toast({
            variant: "destructive",
            title: "Senha Incorreta",
            description: "Verifique seus dados."
          });
          setIsAuthenticating(false);
          return;
        }

        userData = { 
          id: userDoc.id, 
          name: data.name,
          email: data.email,
          role: data.role,
          notificationsEnabled: data.notificationsEnabled,
          hasRequestAccess: data.hasRequestAccess
        } as User;
      } else {
        // Mestre Único se não estiver no banco
        if (email === 'rik4rd0stream@gmail.com') {
           userData = {
              id: 'master_root',
              name: 'Ricardo (Master)',
              email: email,
              role: 'master',
              notificationsEnabled: true,
              hasRequestAccess: true
            };
        } else {
          toast({
            variant: "destructive",
            title: "Acesso Negado",
            description: "Usuário não cadastrado."
          });
          setIsAuthenticating(false);
          return;
        }
      }
      
      if (userData) {
        setLocalUser(userData);
        const expiry = new Date().getTime() + SEVEN_DAYS_MS;
        localStorage.setItem(SESSION_KEY, JSON.stringify({ user: userData, expiry }));
        toast({ title: "Bem-vindo!", description: `Olá, ${userData.name}` });
      }
    } catch (err: any) {
      console.error("Login Error:", err);
      toast({
        variant: "destructive",
        title: "Erro de Conexão",
        description: "Não foi possível validar o acesso agora."
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    setLocalUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  if (!mounted || isInitializing || isAuthenticating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-primary font-bold animate-pulse text-[10px] uppercase tracking-widest">
            {isAuthenticating ? "Validando Acesso..." : "Carregando Rappi..."}
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
