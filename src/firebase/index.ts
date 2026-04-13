
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore, Firestore } from 'firebase/firestore'

/**
 * Inicialização robusta e única para Android e Web.
 * Forçamos as configurações de rede (Long Polling) para evitar bloqueios em APKs.
 */
export function initializeFirebase() {
  let app: FirebaseApp;
  
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }

  // No Android, usamos initializeFirestore diretamente para garantir que as flags de rede
  // sejam aplicadas na primeira tentativa de conexão.
  let firestore: Firestore;
  try {
    firestore = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  } catch (e) {
    // Se já foi inicializado, pegamos a instância existente
    firestore = getFirestore(app);
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
