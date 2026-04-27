
/**
 * Service Worker para Firebase Cloud Messaging (FCM).
 * Este arquivo permite que o navegador ou o Android recebam notificações em BACKGROUND.
 */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyB8ojoSzZRfgw6PRPTZ-fF3NfZRCJArt5M",
  authDomain: "motoboy-13742.firebaseapp.com",
  projectId: "motoboy-13742",
  storageBucket: "motoboy-13742.appspot.com",
  messagingSenderId: "224481701159",
  appId: "1:224481701159:web:14e7ab6355cfc6aa76cd02"
});

const messaging = firebase.messaging();

// Escuta mensagens quando o app está FECHADO
self.addEventListener('push', function(event) {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.notification?.title || "Nova Solicitação Rappi";
    const options = {
      body: data.notification?.body || "Você tem um novo pedido para despachar.",
      icon: '/logo.png',
      badge: '/logo.png',
      vibrate: [200, 100, 200],
      data: {
        url: '/'
      }
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (e) {
    console.error("Erro ao processar push notification:", e);
  }
});

// Abre o app ao clicar na notificação
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
