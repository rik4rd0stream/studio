
'use server';

/**
 * @fileOverview Ponte de Dados (Data Bridge) via Server Actions.
 * Importa a inicialização diretamente do init.ts para evitar conflitos de 'use client'.
 */

import { 
  collection, 
  setDoc,
  addDoc,
  deleteDoc, 
  doc, 
  getDocs,
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase/init';

const getDb = () => {
  const { firestore } = initializeFirebase();
  return firestore;
};

export async function getCollectionBridge(collectionName: string) {
  try {
    const db = getDb();
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    return { success: true, data };
  } catch (error: any) {
    console.error(`Bridge Read Error (${collectionName}):`, error.message);
    return { success: false, error: error.message };
  }
}

export async function addDocumentBridge(collectionName: string, data: any) {
  try {
    const db = getDb();
    const colRef = collection(db, collectionName);
    const docRef = await addDoc(colRef, {
      ...data,
      createdAt: data.createdAt || new Date().toISOString()
    });
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error(`Bridge Add Error (${collectionName}):`, error.message);
    return { success: false, error: error.message };
  }
}

export async function setDocumentBridge(collectionName: string, docId: string, data: any) {
  try {
    const db = getDb();
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString(),
      createdAt: data.createdAt || new Date().toISOString()
    }, { merge: true });
    return { success: true, id: docId };
  } catch (error: any) {
    console.error(`Bridge Write Error (${collectionName}):`, error.message);
    return { success: false, error: error.message };
  }
}

export async function deleteDocumentBridge(collectionName: string, docId: string) {
  try {
    const db = getDb();
    await deleteDoc(doc(db, collectionName, docId));
    return { success: true };
  } catch (error: any) {
    console.error(`Bridge Delete Error (${collectionName}):`, error.message);
    return { success: false, error: error.message };
  }
}
