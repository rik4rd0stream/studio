
'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth, useFirestore } from '../provider';
import { User } from '@/lib/types';

/**
 * Hook para monitorar o usuário logado e seu perfil no Firestore.
 * Sincronizado para usar o E-mail como ID do documento.
 */
export function useUser() {
  const auth = useAuth();
  const db = useFirestore();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && firebaseUser.email) {
        // Busca o documento pelo e-mail (ID do documento no seu Firebase)
        const userEmail = firebaseUser.email.toLowerCase().trim();
        const userDocRef = doc(db, 'userProfiles', userEmail);
        
        const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            setUser({ 
              id: firebaseUser.uid, 
              ...data,
              name: data.name || data.nome || 'Operador',
              role: data.role || 'normal',
              notificationsEnabled: data.notificationsEnabled !== false,
              hasRequestAccess: !!data.hasRequestAccess,
              hasRtStatusAccess: !!data.hasRtStatusAccess
            } as User);
          } else {
            // Perfil básico se não houver documento mas houver Auth
            const isMasterEmail = firebaseUser.email === 'rik4rd0stream@gmail.com';
            setUser({
              id: firebaseUser.uid,
              name: isMasterEmail ? 'Ricardo (Master)' : 'Operador',
              email: firebaseUser.email || '',
              role: isMasterEmail ? 'master' : 'normal',
              hasRequestAccess: isMasterEmail,
              hasRtStatusAccess: isMasterEmail,
              notificationsEnabled: true
            });
          }
          setLoading(false);
        }, (error) => {
          console.error("Erro ao ler perfil no Firestore:", error);
          setLoading(false);
        });

        return () => unsubscribe();
      } else {
        setUser(null);
        setLoading(false);
      }
    });
  }, [auth, db]);

  return { user, loading };
}
