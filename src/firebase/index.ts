
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, Firestore } from 'firebase/firestore';

/**
 * Inicialização centralizada do Firebase.
 * Configuração limpa e estável.
 */
let firebaseInstance: {
  firebaseApp: FirebaseApp;
  auth: any;
  firestore: Firestore;
} | null = null;

export function initializeFirebase() {
  if (firebaseInstance) return firebaseInstance;

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

  // Firestore com configuração básica de compatibilidade
  const firestore = initializeFirestore(app, {
    experimentalForceLongPolling: true
  });

  firebaseInstance = {
    firebaseApp: app,
    auth: getAuth(app),
    firestore
  };

  return firebaseInstance;
}

// Re-exportações explícitas para evitar erros de importação
export { 
  FirebaseProvider, 
  useFirebase, 
  useFirestore, 
  useAuth, 
  useFirebaseApp, 
  useMemoFirebase,
  useUser as useAuthUser
} from './provider';

export { FirebaseClientProvider } from './client-provider';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
export { useUser } from './auth/use-user';
