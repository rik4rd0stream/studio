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
    
    // Inicia login anônimo automático se não houver usuário
    // Isso garante que o Firestore sempre tenha um 'request.auth' válido
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Se temos um usuário Firebase (anônimo ou logado), recuperamos a sessão local se houver
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
        // Se não houver ninguém, fazemos login anônimo para ganhar o "crachá" de acesso ao Firestore
        signInAnonymously(auth).catch(err => {
          console.error("Erro no Auth Silencioso:", err);
          setAuthInitialized(true);
        });
      }
    });

    return () => unsubscribe();
  }, [auth]);

  const handleLogin = (email: string, pass: string) => {
    // Definimos perfil master baseado no email ou se for o seu email de dev
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
          <div className="text-primary font-bold animate-pulse">Iniciando Rappi Commander...</div>
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