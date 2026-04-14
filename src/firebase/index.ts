
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, Firestore } from 'firebase/firestore';

/**
 * Inicialização centralizada do Firebase.
 * Otimizado para Capacitor/Android usando as configurações de rede solicitadas.
 */
let firebaseInstance: {
  firebaseApp: FirebaseApp;
  auth: any;
  firestore: Firestore;
} | null = null;

export function initializeFirebase() {
  if (firebaseInstance) return firebaseInstance;

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

  const firestore = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
    useFetchStreams: false,
  });

  firebaseInstance = {
    firebaseApp: app,
    auth: getAuth(app),
    firestore
  };

  return firebaseInstance;
}

// Re-exportações explícitas para evitar erros de "export not found" no build
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
