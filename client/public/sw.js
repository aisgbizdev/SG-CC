// Service worker SG Control Center — KHUSUS push notification.
//
// CATATAN PENTING: versi sebelumnya memasang handler `fetch` yang mengintersepsi
// navigasi (event.respondWith(fetch(...)) tanpa fallback) dan menyimpan cache.
// Itu membuat aplikasi "muter-muter"/blank saat refresh (navigasi menggantung
// bila ada hiccup jaringan, dan cache basi setelah republish). Sekarang service
// worker TIDAK lagi mengintersepsi request apa pun — browser menangani semua
// fetch secara normal — sehingga tidak bisa lagi menyebabkan halaman menggantung.

self.addEventListener('install', () => {
  // Aktifkan versi baru langsung, jangan menunggu tab lama tertutup.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    // Hapus SEMUA cache lama (mis. 'sgcc-v2') supaya aset basi tidak tersaji lagi.
    caches.keys()
      .then((names) => Promise.all(names.map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

// Sengaja TIDAK ada handler 'fetch': biar browser yang menangani semua request.

self.addEventListener('push', function (event) {
  if (!event.data) return;
  try {
    var data = event.data.json();
    var options = {
      body: data.body || '',
      icon: '/SGCC_logo.png',
      badge: '/SGCC_logo.png',
      vibrate: [200, 100, 200],
      data: { url: data.url || '/' },
      tag: 'sgcc-' + Date.now(),
      renotify: true,
    };
    event.waitUntil(self.registration.showNotification(data.title || 'SG Control Center', options));
  } catch (e) {
    console.error('Push parse error:', e);
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
