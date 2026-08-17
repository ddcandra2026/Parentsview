// Service Worker sederhana untuk AbsensiTK Ortu
// Fungsinya: bikin app bisa di-install (syarat wajib PWA) dan cache halaman
// utama supaya tetap bisa dibuka (walau data presensi tetap perlu internet).
const CACHE_NAME = 'absensitk-ortu-v1';
const FILES_TO_CACHE = [
  './index.html',
  './manifest-ortu.json',
  './icon-ortu-192.png',
  './icon-ortu-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Cache API cuma mendukung request GET (ambil data). Untuk POST/PATCH/DELETE
  // (kirim chat, simpan langganan push, dll) biarkan browser proses seperti
  // biasa tanpa campur tangan Service Worker.
  if (event.request.method !== 'GET') return;

  // Network-first: selalu coba internet dulu (supaya data selalu terbaru),
  // baru fallback ke cache kalau offline.
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});

// ===== WEB PUSH NOTIFICATION =====
// Diterima walau aplikasi tertutup / HP terkunci, selama browser masih
// aktif di latar belakang sistem (bukan force-close total oleh pengguna).
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e) {}
  const title = data.title || 'AbsensiTK Ortu';
  const options = {
    body: data.body || '',
    icon: 'icon-ortu-192.png',
    badge: 'icon-ortu-192.png',
    vibrate: [120, 60, 120],
    data: { url: data.url || './index.html' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || './index.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
