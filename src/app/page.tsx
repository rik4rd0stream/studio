
"use client";

import { useState, useEffect } from "react";
import { LoginView } from "@/components/auth/login-view";
import { MainDashboard } from "@/components/dashboard/main-dashboard";
import { User } from "@/lib/types";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Persist login simulation
    const saved = localStorage.getItem('rappi_commander_session');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem('rappi_commander_session');
      }
    }
  }, []);

  const handleLogin = (email: string, pass: string) => {
    // Definindo rik4rd0stream@gmail.com como Master conforme solicitado
    const isMaster = email.includes('master') || email === 'rik4rd0stream@gmail.com';
    const userData: User = {
      id: 'usr_' + Math.random().toString(36).substr(2, 5),
      name: isMaster ? 'Administrador Master' : 'Operador Logístico',
      email: email,
      profile: isMaster ? 'master' : 'normal'
    };
    setUser(userData);
    localStorage.setItem('rappi_commander_session', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('rappi_commander_session');
  };

  if (!mounted) return null;

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
