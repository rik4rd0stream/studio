
import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { 
  initializeFirestore, 
  Firestore, 
  getFirestore as getFirestoreInstance,
  enableIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED
} from 'firebase/firestore';
import { getMessaging, Messaging, isSupported } from 'firebase/messaging';

let firestoreInstance: Firestore | null = null;
let authInstance: Auth | null = null;
let appInstance: FirebaseApp | null = null;
let messagingInstance: Messaging | null = null;

/**
 * Inicialização Singleton do Firebase Otimizada para Mobile.
 * Ativa persistência offline agressiva para performance em 4G.
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
        // Configuração para redes móveis instáveis
        firestoreInstance = initializeFirestore(appInstance, {
          experimentalAutoDetectLongPolling: true,
          cacheSizeBytes: CACHE_SIZE_UNLIMITED
        });
        
        // Ativa persistência offline (Cache no HD do Celular)
        enableIndexedDbPersistence(firestoreInstance).catch((err) => {
          if (err.code === 'failed-precondition') {
            console.warn("Múltiplas abas: persistência desativada para evitar conflito.");
          } else if (err.code === 'unimplemented') {
            console.warn("Navegador sem suporte a persistência offline.");
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

/**
 * Obtém a instância de Messaging se suportada pelo ambiente.
 */
export async function getFirebaseMessaging() {
  const { firebaseApp } = initializeFirebase();
  if (typeof window !== 'undefined' && await isSupported()) {
    if (!messagingInstance) {
      messagingInstance = getMessaging(firebaseApp);
    }
    return messagingInstance;
  }
  return null;
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
