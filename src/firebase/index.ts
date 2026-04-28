
'use client';

/**
 * @fileOverview Barrel file para o Firebase no lado do cliente.
 * Re-exporta a inicialização e os hooks de interface.
 */

import { Messaging, getMessaging } from 'firebase/messaging';
import { initializeFirebase as initCore } from './init';

export { initializeFirebase, getSdks } from './init';

/**
 * Getter específico para o Firebase Messaging (apenas Browser).
 */
export function getFirebaseMessaging(): Messaging | null {
  if (typeof window === 'undefined') return null;
  try {
    const { firebaseApp } = initCore();
    return getMessaging(firebaseApp);
  } catch (e) {
    console.warn("FCM não disponível neste ambiente.");
    return null;
  }
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
