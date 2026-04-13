
'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
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
            setUser({
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'Usuário',
              email: firebaseUser.email || '',
              profile: 'normal'
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
