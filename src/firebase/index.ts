'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, Firestore } from 'firebase/firestore';

let firebaseInstance: {
  firebaseApp: FirebaseApp;
  auth: any;
  firestore: Firestore;
} | null = null;

export function initializeFirebase() {
  if (firebaseInstance) return firebaseInstance;

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

  const firestore = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });

  firebaseInstance = {
    firebaseApp: app,
    auth: getAuth(app),
    firestore
  };

  return firebaseInstance;
}