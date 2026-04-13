
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { initializeFirestore, getFirestore, Firestore } from 'firebase/firestore';

let firebaseInstance: { firebaseApp: FirebaseApp; auth: Auth; firestore: Firestore } | null = null;

/**
 * Inicialização única e blindada para Android APK e Web.
 * Forçamos Long Polling para evitar que o Android fique "rodando infinito" tentando conectar.
 */
export function initializeFirebase() {
  if (firebaseInstance) return firebaseInstance;

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

  // No Android, usamos initializeFirestore com configurações de compatibilidade total.
  // Isso resolve o problema de conexões que nunca se completam (travamento infinito).
  let db: Firestore;
  try {
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  } catch (e) {
    db = getFirestore(app);
  }

  firebaseInstance = {
    firebaseApp: app,
    auth: getAuth(app),
    firestore: db
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
