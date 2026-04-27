
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Configurações do Firebase para o Service Worker
firebase.initializeApp({
  apiKey: "AIzaSyB8ojoSzZRfgw6PRPTZ-fF3NfZRCJArt5M",
  authDomain: "motoboy-13742.firebaseapp.com",
  projectId: "motoboy-13742",
  storageBucket: "motoboy-13742.appspot.com",
  messagingSenderId: "224481701159",
  appId: "1:224481701159:web:14e7ab6355cfc6aa76cd02"
});

const messaging = firebase.messaging();

// Escuta notificações em Segundo Plano / App Fechado
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const title = data.notification?.title || "Novo Pedido Rappi!";
    const options = {
      body: data.notification?.body || "Você tem uma nova solicitação de despacho.",
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
  }
});

// Ação ao clicar na notificação
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
