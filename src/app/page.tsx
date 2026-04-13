
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

  // Garante que sempre haverá um usuário autenticado no Firebase (anônimo)
  useEffect(() => {
    if (mounted && !isUserLoading && !firebaseUser) {
      signInAnonymously(auth).catch((err) => {
        console.error("Erro na autenticação anônima:", err);
      });
    }
  }, [firebaseUser, isUserLoading, auth, mounted]);

  // Recupera a sessão do perfil local
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
    
    // Limpeza rigorosa para evitar erros de teclado mobile (espaços e maiúsculas)
    const email = emailInput.toLowerCase().trim();
    const password = passInput.trim();
    
    try {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      let userData: User;
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const data = userDoc.data();
        
        // Validação de Senha (se houver senha cadastrada)
        if (data.password && data.password !== password) {
          toast({
            variant: "destructive",
            title: "Acesso Negado",
            description: "A senha informada está incorreta para este usuário."
          });
          setIsAuthenticating(false);
          return;
        }

        userData = { id: userDoc.id, ...data } as User;
      } else {
        // Fallback Master para o primeiro acesso ou administrador fixo
        const isMaster = email.includes('master') || email === 'rik4rd0stream@gmail.com';
        
        if (isMaster) {
           // No primeiro acesso (antes de estar no banco), a senha deve ser rappi123
           if (password !== 'rappi123') {
              toast({
                variant: "destructive",
                title: "Acesso Negado",
                description: "Senha incorreta para o perfil Master."
              });
              setIsAuthenticating(false);
              return;
           }

           userData = {
              id: firebaseUser?.uid || 'usr_' + Math.random().toString(36).substr(2, 5),
              name: 'Administrador Master',
              email: email,
              profile: 'master',
              notificationsEnabled: true,
              hasRequestAccess: true
            };
        } else {
          toast({
            variant: "destructive",
            title: "Usuário não encontrado",
            description: "Verifique o e-mail informado ou solicite cadastro."
          });
          setIsAuthenticating(false);
          return;
        }
      }
      
      setLocalUser(userData);
      localStorage.setItem('rappi_commander_session', JSON.stringify(userData));
    } catch (err: any) {
      console.error("Erro ao validar login:", err);
      toast({
        variant: "destructive",
        title: "Erro de Conexão",
        description: "Não foi possível validar seu acesso. Verifique sua internet."
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    setLocalUser(null);
    localStorage.removeItem('rappi_commander_session');
  };

  const currentUser = localUser || firebaseUser;

  if (!mounted || isUserLoading || isAuthenticating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <div className="text-primary font-bold animate-pulse text-xs uppercase tracking-widest">
            {isAuthenticating ? "Validando Credenciais..." : "Iniciando Rappi Commander..."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {localUser ? (
        <MainDashboard user={currentUser as User} onLogout={handleLogout} />
      ) : (
        <LoginView onLogin={handleLogin} />
      )}
    </div>
  );
}
