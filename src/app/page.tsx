
"use client";

import { useState, useEffect } from "react";
import { LoginView } from "@/components/auth/login-view";
import { MainDashboard } from "@/components/dashboard/main-dashboard";
import { User } from "@/lib/types";
import { useAuth, useUser, useFirestore } from "@/firebase";
import { signInAnonymously } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const { user: firebaseUser, isUserLoading } = useUser();
  const [localUser, setLocalUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isUserLoading && !firebaseUser) {
      signInAnonymously(auth).catch((err) => {
        console.error("Erro na autenticação anônima:", err);
      });
    }
  }, [firebaseUser, isUserLoading, auth, mounted]);

  useEffect(() => {
    const saved = localStorage.getItem('rappi_commander_session');
    if (saved) {
      try {
        setLocalUser(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem('rappi_commander_session');
      }
    }
  }, []);

  const handleLogin = async (emailInput: string, passInput: string) => {
    setIsAuthenticating(true);
    
    const email = emailInput.toLowerCase().trim();
    const password = passInput.trim();
    
    try {
      // Busca na NOVA coleção de perfis
      const q = query(collection(db, 'userProfiles'), where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      let userData: User;
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const data = userDoc.data();
        
        if (data.password && data.password !== password) {
          toast({
            variant: "destructive",
            title: "Acesso Negado",
            description: "Senha incorreta."
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
        // Regra de Ouro: Somente este e-mail entra como Master se não houver cadastro
        const isMaster = email === 'rik4rd0stream@gmail.com';
        
        if (isMaster) {
           userData = {
              id: firebaseUser?.uid || 'master_init',
              name: 'Ricardo (Master)',
              email: email,
              role: 'master',
              notificationsEnabled: true,
              hasRequestAccess: true
            };
        } else {
          toast({
            variant: "destructive",
            title: "Não autorizado",
            description: "Usuário não encontrado no novo banco de dados."
          });
          setIsAuthenticating(false);
          return;
        }
      }
      
      setLocalUser(userData);
      localStorage.setItem('rappi_commander_session', JSON.stringify(userData));
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro de Conexão",
        description: "Falha ao validar acesso."
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    setLocalUser(null);
    localStorage.removeItem('rappi_commander_session');
  };

  if (!mounted || isUserLoading || isAuthenticating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <div className="text-primary font-bold animate-pulse text-xs uppercase tracking-widest">
            Iniciando Novo Banco...
          </div>
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
