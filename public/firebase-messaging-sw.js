importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDBiEiOiPxzUl68O33U6d3OK1fE6RE5RxY",
  authDomain: "gen-lang-client-0721397173.firebaseapp.com",
  projectId: "gen-lang-client-0721397173",
  storageBucket: "gen-lang-client-0721397173.firebasestorage.app",
  messagingSenderId: "65553140689",
  appId: "1:65553140689:web:7d2f80386b5c595f4a6ef0"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title || 'BLU-Hjelperen';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
