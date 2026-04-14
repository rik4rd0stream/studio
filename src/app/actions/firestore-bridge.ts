
'use server';

/**
 * @fileOverview Ponte de Dados (Data Bridge) via Server Actions.
 * O Android faz uma chamada HTTP simples para este servidor (Vercel),
 * e o servidor busca os dados no Firestore. Isso resolve o bloqueio de rede do Android.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  query,
  orderBy,
  getDocsFromServer
} from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

// Inicialização interna para o servidor NextJS (Singleton no lado do servidor)
const getDb = () => {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getFirestore(app);
};

export async function getCollectionBridge(collectionName: string) {
  try {
    const db = getDb();
    // No servidor, forçamos a busca direto do Firebase (sem cache local do servidor)
    const q = query(collection(db, collectionName), orderBy('updatedAt', 'desc'));
    const snapshot = await getDocsFromServer(q);
    
    const data = snapshot.docs.map(doc => {
      const docData = doc.data();
      return {
        id: doc.id,
        ...docData,
        // Converte timestamps se necessário para o JSON
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
