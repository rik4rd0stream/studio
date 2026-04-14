
'use server';

/**
 * @fileOverview Ponte de Dados (Data Bridge) via Server Actions.
 * O Android chama estas funções que rodam na Vercel, ignorando bloqueios locais.
 */

import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  query,
  getDocs,
  orderBy,
  serverTimestamp,
  updateDoc
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
        // Garante que datas sejam strings para o transporte JSON
        createdAt: docData.createdAt?.toDate?.()?.toISOString() || docData.createdAt || new Date().toISOString(),
        updatedAt: docData.updatedAt?.toDate?.()?.toISOString() || docData.updatedAt || new Date().toISOString()
      };
    });
    
    return { success: true, data };
  } catch (error: any) {
    console.error(`Bridge Read Error (${collectionName}):`, error.message);
    return { success: false, error: error.message };
  }
}

export async function addDocumentBridge(collectionName: string, data: any) {
  try {
    const db = getDb();
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return { success: true, id: docRef.id };
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
