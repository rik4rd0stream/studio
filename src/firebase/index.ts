
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

let firebaseInstance: { firebaseApp: FirebaseApp; auth: Auth; firestore: Firestore } | null = null;

/**
 * Inicialização padrão do Firebase para Web e Android.
 */
export function initializeFirebase() {
  if (firebaseInstance) return firebaseInstance;

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

  firebaseInstance = {
    firebaseApp: app,
    auth: getAuth(app),
    firestore: getFirestore(app)
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
