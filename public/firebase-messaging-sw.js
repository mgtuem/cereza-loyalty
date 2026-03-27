importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCnxIoJ9v5Wlutk59fc8aMTARss1S78xbc",
  authDomain: "cereza-loyalty.firebaseapp.com",
  projectId: "cereza-loyalty",
  storageBucket: "cereza-loyalty.firebasestorage.app",
  messagingSenderId: "684783511032",
  appId: "1:684783511032:web:8951cb96551d350209220d"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || 'Cereza', {
    body: body || '',
    icon: icon || '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: payload.data,
    actions: [{ action: 'open', title: 'Öffnen' }]
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
