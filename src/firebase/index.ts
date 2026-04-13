'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore, Firestore, terminate } from 'firebase/firestore'

/**
 * Inicialização robusta e única para Android e Web.
 * Garantimos que o Firestore não seja inicializado mais de uma vez.
 */
export function initializeFirebase() {
  let app: FirebaseApp;
  
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }

  // No Firebase v10+, não podemos chamar initializeFirestore se ele já estiver ativo.
  // Buscamos a instância existente ou criamos uma nova com as flags de Android.
  let firestore: Firestore;
  try {
    firestore = getFirestore(app);
  } catch (e) {
    firestore = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  }

  return {
    firebaseApp: app,
    auth: getAuth(app),
    firestore: firestore
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
