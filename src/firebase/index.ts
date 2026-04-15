
import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { 
  initializeFirestore, 
  Firestore, 
  getFirestore as getFirestoreInstance,
  enableIndexedDbPersistence
} from 'firebase/firestore';

let firestoreInstance: Firestore | null = null;
let authInstance: Auth | null = null;
let appInstance: FirebaseApp | null = null;

/**
 * Inicialização Singleton do Firebase Isomórfica (Client + Server).
 * Ativa persistência offline para garantir que notificações não se percam.
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
        
        // Ativa persistência offline (Cache local)
        enableIndexedDbPersistence(firestoreInstance).catch((err) => {
          if (err.code === 'failed-precondition') {
            console.warn("Múltiplas abas abertas, persistência offline desativada.");
          } else if (err.code === 'unimplemented') {
            console.warn("O navegador não suporta persistência offline.");
          }
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
