
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
    
    // Subscrever ao estado de autenticação do Firebase
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Se autenticado no Firebase, tentamos recuperar os dados locais
        const saved = localStorage.getItem('rappi_commander_session');
        if (saved) {
          try {
            setUser(JSON.parse(saved));
          } catch (e) {
            localStorage.removeItem('rappi_commander_session');
          }
        }
      }
      setAuthInitialized(true);
    });

    return () => unsubscribe();
  }, [auth]);

  const handleLogin = async (email: string, pass: string) => {
    try {
      // Garante que o usuário está autenticado no Firebase para as regras de segurança
      await signInAnonymously(auth);
      
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
    } catch (error) {
      console.error("Erro ao autenticar no Firebase:", error);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('rappi_commander_session');
    auth.signOut();
  };

  if (!mounted || !authInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary font-bold">Iniciando Rappi Commander...</div>
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
