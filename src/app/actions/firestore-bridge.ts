
'use server';

/**
 * @fileOverview Ponte de Dados (Data Bridge) via Server Actions.
 * Usa a inicialização centralizada para evitar conflitos de instância.
 */

import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  query,
  orderBy,
  getDocsFromServer
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

// Função auxiliar para obter o DB de forma segura no servidor
const getDb = () => {
  const { firestore } = initializeFirebase();
  return firestore;
};

export async function getCollectionBridge(collectionName: string) {
  try {
    const db = getDb();
    const q = query(collection(db, collectionName), orderBy('updatedAt', 'desc'));
    const snapshot = await getDocsFromServer(q);
    
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
