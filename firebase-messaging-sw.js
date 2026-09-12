importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAE04G9yxs1cfdMzq005TQC0rCi33x6mFA",
  authDomain: "the-selfverse-5b533.firebaseapp.com",
  projectId: "the-selfverse-5b533",
  storageBucket: "the-selfverse-5b533.firebasestorage.app",
  messagingSenderId: "392744214572",
  appId: "1:392744214572:web:1d3ae92d6373cdb5ae7189",
  measurementId: "G-BP7JD6XZNN"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload){
  const notification = payload.notification || {};
  const title = notification.title || "THE SELFVERSE";
  const options = {
    body: notification.body || "You have a new appointment.",
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%23a9894d'/><text x='50' y='63' text-anchor='middle' font-size='48' fill='white'>S</text></svg>",
    tag: "selfverse-appointment",
    data: {url: "./"}
  };
  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", function(event){
  event.notification.close();
  const url = new URL("./", self.location.origin).href;
  event.waitUntil(clients.matchAll({type:"window", includeUncontrolled:true}).then(function(list){
    for(const client of list){
      if("focus" in client) return client.focus();
    }
    if(clients.openWindow) return clients.openWindow(url);
  }));
});
