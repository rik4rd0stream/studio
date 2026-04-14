'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { initializeFirestore, Firestore } from 'firebase/firestore';

let firebaseInstance: { firebaseApp: FirebaseApp; auth: Auth; firestore: Firestore } | null = null;

/**
 * Inicialização do Firebase otimizada para Capacitor/Android.
 * Força o uso de Long Polling e desativa streams de busca para evitar falhas 
 * de conexão no protocolo capacitor:// ou em conexões remotas de WebView.
 */
export function initializeFirebase() {
  if (firebaseInstance) return firebaseInstance;

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

  // Configuração recomendada para evitar erros de conexão no Android/Capacitor:
  // experimentalForceLongPolling e experimentalAutoDetectLongPolling não podem ser usados juntos.
  const firestore = initializeFirestore(app, {
    experimentalForceLongPolling: true, // Força o Long Polling para compatibilidade máxima com Capacitor
    useFetchStreams: false,             // Desativa streams que costumam falhar em WebViews Android
  });

  firebaseInstance = {
    firebaseApp: app,
    auth: getAuth(app),
    firestore: firestore
  };

  return firebaseInstance;
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
