
'use server';

/**
 * @fileOverview Ponte de Dados (Data Bridge) via Server Actions.
 * Garante que o Android consiga ler e gravar dados ignorando bloqueios locais.
 */

import { 
  collection, 
  setDoc,
  deleteDoc, 
  doc, 
  query,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

const getDb = () => {
  const { firestore } = initializeFirebase();
  return firestore;
};

export async function getCollectionBridge(collectionName: string) {
  try {
    const db = getDb();
    const q = query(collection(db, collectionName), orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    
    const data = snapshot.docs.map(doc => {
      const docData = doc.data();
      return {
        id: doc.id,
        ...docData,
        createdAt: docData.createdAt || new Date().toISOString(),
        updatedAt: docData.updatedAt || new Date().toISOString()
      };
    });
    
    return { success: true, data };
  } catch (error: any) {
    console.error(`Bridge Read Error (${collectionName}):`, error.message);
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
