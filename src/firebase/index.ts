
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
 * Inicialização Singleton do Firebase Isomórfica (Client + Server).
 * No lado do servidor (Vercel), usamos a conexão padrão.
 * No lado do cliente (Android), usamos Long Polling para estabilidade.
 */
export function initializeFirebase() {
  if (!appInstance) {
    appInstance = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }

  if (!firestoreInstance) {
    const isServer = typeof window === 'undefined';
    
    if (isServer) {
      firestoreInstance = getFirestoreInstance(appInstance);
    } else {
      try {
        firestoreInstance = initializeFirestore(appInstance, {
          experimentalAutoDetectLongPolling: true,
        });
      } catch (e) {
        firestoreInstance = getFirestoreInstance(appInstance);
      }
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

// Re-exportações dos hooks (somente para Client Components)
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
