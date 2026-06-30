const CACHE_NAME = 'live-venue-map-v16';
const STATIC_ASSETS = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet-src.js'
];

// インストール時：外部ライブラリだけキャッシュ
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

// 古いキャッシュを削除
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // 外部オリジンへのリクエスト（ライセンスWorker・StripeなどのAPI）は一切横取りしない
  if (url.origin !== location.origin) {
    // 事前キャッシュした外部ライブラリだけはキャッシュ優先で返す
    if (STATIC_ASSETS.includes(e.request.url)) {
      e.respondWith(caches.match(e.request).then(c => c || fetch(e.request)));
    }
    // それ以外（API通信など）はブラウザに完全に任せる（respondWithしない）
    return;
  }

  // 同一オリジン：ネット優先、ダメならキャッシュ。両方ダメなら通常のネットワークエラーを返す
  e.respondWith((async () => {
    try {
      return await fetch(e.request);
    } catch (err) {
      const cached = await caches.match(e.request);
      if (cached) return cached;
      throw err;
    }
  })());
});
