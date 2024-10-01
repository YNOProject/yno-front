'use strict';
let sessionId;
let root;

self.addEventListener('message', function(event) {
  sessionId = event.data.sessionId;
  root = `https://connect.ynoproject.net/${event.data.game || '2kki'}/api`;
});

function apiFetch(path, opts) {
  if (!root)
    throw new Error("Service worker's root has not been assigned");
  if (!opts)
    opts = {};
  opts.headers = Object.assign(opts.headers || {}, sessionId ? { 'Authorization': sessionId } : {});
  return fetch(`${root}/${path}`, opts);
};

self.addEventListener('push', function(event) {
  const { title, ...options } = event.data.json();
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const url = event.notification.data || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' })
      .then(clients => {
        for (const client of clients) {
          if (client.url.startsWith(url) && 'focus' in client)
            return client.focus();
        }
        if (clients.openWindow)
          return clients.openWindow(url);
      })
  );
});

self.addEventListener('pushsubscriptionchange', function(event) {
  event.waitUntil(
    apiFetch('vapidpublickey')
      .then(r => r.text())
      .then(applicationServerKey => self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey }))
      .then(subscription => apiFetch('registernotification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      }))
  );
});
