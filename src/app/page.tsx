
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
    
    // Ouvir mudanças de autenticação
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Se temos um usuário Firebase (mesmo anônimo), podemos prosseguir
        const saved = localStorage.getItem('rappi_commander_session');
        if (saved) {
          try {
            setUser(JSON.parse(saved));
          } catch (e) {
            localStorage.removeItem('rappi_commander_session');
          }
        }
        setAuthInitialized(true);
      } else {
        // Se não houver ninguém, fazemos login anônimo
        signInAnonymously(auth).catch(err => {
          console.error("Erro no Auth Silencioso:", err);
          // Mesmo com erro, marcamos como inicializado para não travar o app
          setAuthInitialized(true);
        });
      }
    });

    return () => unsubscribe();
  }, [auth]);

  const handleLogin = (email: string, pass: string) => {
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
  };

  if (!mounted || !authInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <div className="text-primary font-bold animate-pulse">Conectando ao Rappi Commander...</div>
        </div>
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
