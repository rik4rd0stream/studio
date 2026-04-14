
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { 
  initializeFirestore, 
  Firestore, 
  getFirestore as getFirestoreInstance 
} from 'firebase/firestore';

let firestoreInstance: Firestore | null = null;
let authInstance: Auth | null = null;
let appInstance: FirebaseApp | null = null;

/**
 * Inicialização Singleton do Firebase.
 * No Capacitor/Android, usamos Long Polling para evitar bloqueios de rede.
 */
export function initializeFirebase() {
  if (!appInstance) {
    appInstance = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }

  if (!firestoreInstance) {
    try {
      // Configuração otimizada para ambientes restritos (Android WebView)
      firestoreInstance = initializeFirestore(appInstance, {
        experimentalAutoDetectLongPolling: true,
      });
    } catch (e) {
      // Recupera a instância se já houver uma inicializada
      firestoreInstance = getFirestoreInstance(appInstance);
    }
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

// Re-exportações dos hooks para o restante do app
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
