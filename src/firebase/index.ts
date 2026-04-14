
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, Firestore } from 'firebase/firestore';

let firebaseInstance: {
  firebaseApp: FirebaseApp;
  auth: any;
  firestore: Firestore;
} | null = null;

/**
 * Inicializa o Firebase com configurações otimizadas para ambientes mobile (Capacitor/Android).
 * Força o uso de Long Polling e desativa Fetch Streams para contornar bloqueios de WebSocket.
 */
export function initializeFirebase() {
  if (firebaseInstance) return firebaseInstance;

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

  // Configuração "Blindada" para Capacitor: Resolve falhas silenciosas de conexão no Android
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

// Re-exportação de todos os hooks e provedores para centralizar o acesso via '@/firebase'
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
