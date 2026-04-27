
import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

/**
 * @fileOverview Inicialização base do Firebase compatível com Server e Client.
 * Adicionado forceLongPolling para resolver problemas de conexão em redes restritas.
 */

export function initializeFirebase() {
  let firebaseApp: FirebaseApp;
  
  if (!getApps().length) {
    try {
      firebaseApp = initializeApp(firebaseConfig);
    } catch (e) {
      firebaseApp = initializeApp(firebaseConfig);
    }
  } else {
    firebaseApp = getApp();
  }

  return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    // Usando initializeFirestore com forceLongPolling para evitar erro [code=unavailable]
    firestore: initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
    })
  };
}
