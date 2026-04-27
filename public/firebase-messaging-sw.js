
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyB8ojoSzRFgw6PRPTZ-fF3NfZRCJArt5M",
  authDomain: "motoboy-13742.firebaseapp.com",
  projectId: "motoboy-13742",
  storageBucket: "motoboy-13742.appspot.com",
  messagingSenderId: "224481701159",
  appId: "1:224481701159:web:14e7ab6355cfc6aa76cd02"
});

const messaging = firebase.messaging();

// 👉 RECEBE NOTIFICAÇÃO EM BACKGROUND
self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.notification?.title || "Rappi Commander";
      const options = {
        body: data.notification?.body || "Você tem uma nova solicitação operacional.",
        icon: '/logo.png',
        badge: '/logo.png',
        vibrate: [200, 100, 200],
        data: data.data || {}
      };
      event.waitUntil(self.registration.showNotification(title, options));
    } catch (e) {
      console.error("Erro ao processar push data:", e);
    }
  }
});

// 👉 QUANDO CLICA NA NOTIFICAÇÃO
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
