
'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth, useFirestore } from '../provider';
import { User } from '@/lib/types';

export function useUser() {
  const auth = useAuth();
  const db = useFirestore();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        return onSnapshot(userDocRef, (snapshot) => {
          if (snapshot.exists()) {
            setUser({ id: firebaseUser.uid, ...snapshot.data() } as User);
          } else {
            // Se o usuário existe no Auth mas não no Firestore, criamos um perfil básico
            // Verificação especial para o email master do administrador
            const isMasterEmail = firebaseUser.email === 'rik4rd0stream@gmail.com';
            
            setUser({
              id: firebaseUser.uid,
              name: firebaseUser.displayName || (isMasterEmail ? 'Administrador Master' : 'Usuário'),
              email: firebaseUser.email || '',
              profile: isMasterEmail ? 'master' : 'normal',
              hasRequestAccess: isMasterEmail,
              notificationsEnabled: true
            });
          }
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
