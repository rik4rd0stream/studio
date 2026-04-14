
'use server';

/**
 * @fileOverview Ponte de Autenticação via Server Actions.
 * Permite que um administrador crie contas no Firebase Auth para outros usuários
 * sem deslogar de sua própria sessão.
 */

import { initializeApp, deleteApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';

/**
 * Cria um usuário no Firebase Auth em segundo plano.
 * @param email E-mail do novo usuário.
 * @param pass Senha do novo usuário (mínimo 6 caracteres).
 */
export async function createAuthUserBridge(email: string, pass: string) {
  const tempAppName = `auth-bridge-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  
  try {
    // Inicializa um app temporário apenas para esta operação
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);
    
    const userCredential = await createUserWithEmailAndPassword(tempAuth, email, pass);
    
    // Limpa o app temporário para não vazar memória
    await deleteApp(tempApp);
    
    return { success: true, uid: userCredential.user.uid };
  } catch (error: any) {
    // Tenta limpar mesmo em caso de erro
    try {
      const apps = getApps();
      const appToCleanup = apps.find(a => a.name === tempAppName);
      if (appToCleanup) await deleteApp(appToCleanup);
    } catch (e) {}

    console.error("Auth Bridge Error:", error.code, error.message);
    
    // Se o erro for que o usuário já existe, retornamos sucesso parcial
    if (error.code === 'auth/email-already-in-use') {
      return { success: true, message: 'Usuário já possui registro de autenticação.' };
    }
    
    return { success: false, error: error.message };
  }
}
