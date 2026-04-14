'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, Firestore } from 'firebase/firestore';

/**
 * Inicialização centralizada do Firebase.
 * Configurada para compatibilidade máxima com Capacitor/Android.
 */
export function initializeFirebase() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

  // Firestore configurado com Long Polling para evitar falhas de WebSocket no Android
  const firestore = initializeFirestore(app, {
    experimentalForceLongPolling: true
  });

  return {
    firebaseApp: app,
    auth: getAuth(app),
    firestore
  };
}

// Re-exportações explícitas para garantir que os hooks estejam disponíveis em src/app/page.tsx
export { 
  FirebaseProvider, 
  useFirebase, 
  useFirestore, 
  useAuth, 
  useFirebaseApp, 
  useMemoFirebase
} from './provider';

export { FirebaseClientProvider } from './client-provider';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
export { useUser } from './auth/use-user';
