'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

/**
 * Inicialização robusta para Android e Web.
 * Forçamos o uso do firebaseConfig para garantir que o APK aponte para o projeto correto.
 */
export function initializeFirebase() {
  if (!getApps().length) {
    // No Android (Capacitor), as variáveis de ambiente do App Hosting não existem.
    // Inicializamos diretamente com o objeto de configuração para evitar que o APK use um projeto padrão.
    const firebaseApp = initializeApp(firebaseConfig);
    return getSdks(firebaseApp);
  }

  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
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
