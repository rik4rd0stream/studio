import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

/**
 * API Route para disparar notificações Push (FCM).
 * Esta rota atua como o servidor que "acorda" o app fechado.
 */

const FIREBASE_CONFIG = {
  projectId: process.env.FIREBASE_PROJECT_ID || 'motoboy-13742',
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!admin.apps.length && FIREBASE_CONFIG.clientEmail && FIREBASE_CONFIG.privateKey) {
  admin.initializeApp({
    credential: admin.credential.cert(FIREBASE_CONFIG as any),
  });
}

export async function POST(req: Request) {
  try {
    const { tokens, title, body, data } = await req.json();

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ success: false, error: 'Nenhum token fornecido.' });
    }

    if (!admin.apps.length) {
      console.warn("Firebase Admin não inicializado. Verifique as variáveis de ambiente.");
      return NextResponse.json({ success: false, error: 'Admin não inicializado.' });
    }

    const message = {
      notification: { title, body },
      data: data || {},
      tokens: tokens,
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    
    return NextResponse.json({ 
      success: true, 
      successCount: response.successCount, 
      failureCount: response.failureCount 
    });
  } catch (error: any) {
    console.error("Erro no envio de Push:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
