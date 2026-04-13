'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore, Firestore } from 'firebase/firestore'

/**
 * Inicialização robusta para Android e Web.
 * Usamos initializeFirestore com configurações específicas para MOBILE (Android/APK).
 */
export function initializeFirebase() {
  let app: FirebaseApp;
  
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }

  // Configuração CRÍTICA para Android:
  // 1. experimentalForceLongPolling: Força o app a usar HTTP simples, evitando bloqueios de operadoras.
  // 2. ignoreUndefinedProperties: Evita erros ao salvar objetos com campos vazios.
  const firestore = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });

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
