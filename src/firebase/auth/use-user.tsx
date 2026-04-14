
'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth, useFirestore } from '../provider';
import { User } from '@/lib/types';

/**
 * Hook para monitorar o usuário logado e seu perfil no Firestore.
 * Sincronizado para usar o E-mail como ID do documento, conforme o banco real.
 */
export function useUser() {
  const auth = useAuth();
  const db = useFirestore();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && firebaseUser.email) {
        // O banco real usa o e-mail como ID do documento
        const userEmail = firebaseUser.email.toLowerCase();
        const userDocRef = doc(db, 'userProfiles', userEmail);
        
        return onSnapshot(userDocRef, (snapshot) => {
          if (snapshot.exists()) {
            setUser({ id: firebaseUser.uid, ...snapshot.data() } as User);
          } else {
            // Perfil básico se ainda não existir no Firestore
            const isMasterEmail = firebaseUser.email === 'rik4rd0stream@gmail.com';
            
            setUser({
              id: firebaseUser.uid,
              name: firebaseUser.displayName || (isMasterEmail ? 'Ricardo (Master)' : 'Operador'),
              email: firebaseUser.email || '',
              role: isMasterEmail ? 'master' : 'normal',
              hasRequestAccess: isMasterEmail,
              notificationsEnabled: true
            });
          }
          setLoading(false);
        }, (error) => {
          console.warn("Aguardando permissão de leitura do perfil...");
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });
  }, [auth, db]);

  return { user, loading };
}
