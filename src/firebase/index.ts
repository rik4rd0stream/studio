'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { initializeFirestore, Firestore } from 'firebase/firestore';

let firebaseInstance: { firebaseApp: FirebaseApp; auth: Auth; firestore: Firestore } | null = null;

/**
 * Inicialização do Firebase otimizada para Capacitor/Android.
 * Força o uso de Long Polling para evitar falhas de conexão no protocolo capacitor://
 */
export function initializeFirebase() {
  if (firebaseInstance) return firebaseInstance;

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

  // Configuração recomendada para compatibilidade máxima com Capacitor:
  // experimentalForceLongPolling resolve a maioria dos problemas de conexão em Android nativo.
  const firestore = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    useFetchStreams: false,
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
