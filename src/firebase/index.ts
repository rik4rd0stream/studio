
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { initializeFirestore, Firestore } from 'firebase/firestore';

let firebaseInstance: { firebaseApp: FirebaseApp; auth: Auth; firestore: Firestore } | null = null;

/**
 * Inicialização do Firebase otimizada para Capacitor/Android.
 * Resolve a falha silenciosa de WebSockets no protocolo capacitor://
 * Utiliza as configurações sugeridas para máxima compatibilidade em mobile.
 */
export function initializeFirebase() {
  if (firebaseInstance) return firebaseInstance;

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

  // Configuração definitiva para Android + Capacitor:
  // experimentalAutoDetectLongPolling: Detecta falhas de WebSocket e muda para HTTP.
  // useFetchStreams: false: Evita o uso de streams de rede que o Capacitor costuma bloquear.
  const firestore = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
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
