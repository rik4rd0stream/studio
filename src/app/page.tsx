"use client";

import { useState, useEffect } from "react";
import { LoginView } from "@/components/auth/login-view";
import { MainDashboard } from "@/components/dashboard/main-dashboard";
import { User } from "@/lib/types";
import { useAuth } from "@/firebase";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";

export default function Home() {
  const auth = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // 1. Ouvir mudanças de autenticação
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Se o usuário já estava logado no sistema do Rappi, restauramos a sessão local
        const saved = localStorage.getItem('rappi_commander_session');
        if (saved) {
          try {
            setUser(JSON.parse(saved));
          } catch (e) {
            localStorage.removeItem('rappi_commander_session');
          }
        }
      } else {
        // 2. Se não houver ninguém, fazemos login anônimo para ganhar permissão no Firestore
        signInAnonymously(auth).catch(err => console.error("Erro no Auth Silencioso:", err));
      }
      setAuthInitialized(true);
    });

    return () => unsubscribe();
  }, [auth]);

  const handleLogin = (email: string, pass: string) => {
    // Simulação de regras de perfil baseada no email
    const isMaster = email.includes('master') || email === 'rik4rd0stream@gmail.com';
    const userData: User = {
      id: auth.currentUser?.uid || 'usr_' + Math.random().toString(36).substr(2, 5),
      name: isMaster ? 'Administrador Master' : 'Operador Logístico',
      email: email,
      profile: isMaster ? 'master' : 'normal',
      notificationsEnabled: true,
      hasRequestAccess: isMaster
    };
    
    setUser(userData);
    localStorage.setItem('rappi_commander_session', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('rappi_commander_session');
    // Mantemos a conexão anônima para que o app continue funcionando
  };

  if (!mounted || !authInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary font-bold">Conectando ao Rappi Commander...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {user ? (
        <MainDashboard user={user} onLogout={handleLogout} />
      ) : (
        <LoginView onLogin={handleLogin} />
      )}
    </div>
  );
}
