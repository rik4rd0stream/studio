
"use client";

import { useState, useEffect } from "react";
import { LoginView } from "@/components/auth/login-view";
import { MainDashboard } from "@/components/dashboard/main-dashboard";
import { User } from "@/lib/types";
import { useAuth, useUser } from "@/firebase";
import { signInAnonymously } from "firebase/auth";

export default function Home() {
  const auth = useAuth();
  const { user: firebaseUser, isUserLoading } = useUser();
  const [localUser, setLocalUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Garante que sempre haverá um usuário autenticado (mesmo que anônimo) 
  // antes de renderizar qualquer componente que consulte o Firestore.
  useEffect(() => {
    if (mounted && !isUserLoading && !firebaseUser) {
      signInAnonymously(auth).catch((err) => {
        console.error("Erro na autenticação anônima:", err);
      });
    }
  }, [firebaseUser, isUserLoading, auth, mounted]);

  // Recupera a sessão do perfil local (Master/Normal)
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

  const handleLogin = (email: string, pass: string) => {
    const isMaster = email.toLowerCase().includes('master') || email.toLowerCase() === 'rik4rd0stream@gmail.com';
    const userData: User = {
      id: firebaseUser?.uid || 'usr_' + Math.random().toString(36).substr(2, 5),
      name: isMaster ? 'Administrador Master' : 'Operador Logístico',
      email: email,
      profile: isMaster ? 'master' : 'normal',
      notificationsEnabled: true,
      hasRequestAccess: isMaster // Master tem acesso total
    };
    
    setLocalUser(userData);
    localStorage.setItem('rappi_commander_session', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setLocalUser(null);
    localStorage.removeItem('rappi_commander_session');
  };

  // Prioriza o localUser (sessão ativa do formulário de login) para garantir que as permissões 
  // de Master/Normal selecionadas no login manual não sejam perdidas pelo usuário anônimo do Firebase.
  const currentUser = localUser || firebaseUser;

  if (!mounted || isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <div className="text-primary font-bold animate-pulse text-xs uppercase tracking-widest">
            Iniciando Rappi Commander...
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
