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

  // Garante uma conexão anônima persistente para evitar erros de permissão iniciais
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
      // Busca no novo banco de perfis (userProfiles)
      const q = query(collection(db, 'userProfiles'), where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      let userData: User;
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const data = userDoc.data();
        
        // Validação de senha simples via Firestore
        if (data.password && data.password !== password) {
          toast({
            variant: "destructive",
            title: "Senha Incorreta",
            description: "Verifique seus dados e tente novamente."
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
        // Se não existir no banco, apenas o Ricardo entra como Master Inicial
        const isMasterAdmin = email === 'rik4rd0stream@gmail.com';
        
        if (isMasterAdmin) {
           userData = {
              id: firebaseUser?.uid || 'master_root',
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
            description: "Usuário não encontrado no novo banco. Peça ao administrador para cadastrá-lo."
          });
          setIsAuthenticating(false);
          return;
        }
      }
      
      setLocalUser(userData);
      localStorage.setItem('rappi_commander_session', JSON.stringify(userData));
      toast({ title: "Bem-vindo!", description: `Logado como ${userData.name}` });
    } catch (err: any) {
      console.error("Login Error:", err);
      toast({
        variant: "destructive",
        title: "Erro de Permissão",
        description: "O banco de dados ainda está sendo configurado. Tente novamente em instantes."
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
          <p className="text-primary font-bold animate-pulse text-xs uppercase tracking-widest">
            Sincronizando Banco...
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
