
"use client";

import { useState, useEffect } from "react";
import { LoginView } from "@/components/auth/login-view";
import { MainDashboard } from "@/components/dashboard/main-dashboard";
import { User } from "@/lib/types";
import { useAuth, useUser, useFirestore } from "@/firebase";
import { signInAnonymously } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function Home() {
  const auth = useAuth();
  const db = useFirestore();
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

  const handleLogin = async (email: string, pass: string) => {
    setIsAuthenticating(true);
    
    try {
      // Busca o perfil no Firestore pelo email para garantir que o ID seja o mesmo do cadastro
      const q = query(collection(db, 'users'), where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      let userData: User;
      
      if (!querySnapshot.empty) {
        // Usuário encontrado no banco (ID sincronizado para notificações)
        const userDoc = querySnapshot.docs[0];
        userData = { id: userDoc.id, ...userDoc.data() } as User;
      } else {
        // Fallback: Se não encontrar, mantém lógica de Master para seu email
        const isMaster = email.toLowerCase().includes('master') || email.toLowerCase() === 'rik4rd0stream@gmail.com';
        userData = {
          id: firebaseUser?.uid || 'usr_' + Math.random().toString(36).substr(2, 5),
          name: isMaster ? 'Administrador Master' : 'Operador Logístico',
          email: email,
          profile: isMaster ? 'master' : 'normal',
          notificationsEnabled: true,
          hasRequestAccess: isMaster
        };
      }
      
      setLocalUser(userData);
      localStorage.setItem('rappi_commander_session', JSON.stringify(userData));
    } catch (err) {
      console.error("Erro ao validar login:", err);
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
            {isAuthenticating ? "Validando Acesso..." : "Iniciando Rappi Commander..."}
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
