
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { initializeFirestore, Firestore } from 'firebase/firestore';

let firestoreInstance: Firestore | null = null;
let authInstance: Auth | null = null;
let appInstance: FirebaseApp | null = null;

/**
 * Inicialização centralizada e segura (Singleton) do Firebase.
 * Configurada para evitar o erro de 'failed-precondition' e otimizar para Android/Capacitor.
 */
export function initializeFirebase() {
  if (!appInstance) {
    appInstance = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }

  if (!firestoreInstance) {
    // Configuração robusta para Android: experimentalAutoDetectLongPolling resolve falhas de WebSocket.
    // O cache é mantido no padrão (pelo menos 1MB) para evitar erro de inicialização.
    firestoreInstance = initializeFirestore(appInstance, {
      experimentalAutoDetectLongPolling: true,
      useFetchStreams: false,
    });
  }

  if (!authInstance) {
    authInstance = getAuth(appInstance);
  }

  return {
    firebaseApp: appInstance,
    auth: authInstance,
    firestore: firestoreInstance
  };
}

// Re-exportações explícitas dos hooks para o app encontrar as referências
export { 
  FirebaseProvider, 
  useFirebase, 
  useFirestore, 
  useAuth, 
  useFirebaseApp, 
  useMemoFirebase,
  useUser 
} from './provider';

export { FirebaseClientProvider } from './client-provider';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
