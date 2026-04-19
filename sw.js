/* ============================================================
   Keiba Note - Service Worker
   オフライン対応・キャッシュ管理
============================================================ */

// キャッシュ名（バージョンを変えると古いキャッシュが削除されます）
const CACHE_NAME = 'keiba-note-v1';

// キャッシュするファイルの一覧
const FILES_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

/* ===== インストール時：ファイルをキャッシュに保存 ===== */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] キャッシュを保存中...');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  // 古いSWを待たず即座にアクティブ化
  self.skipWaiting();
});

/* ===== アクティベート時：古いキャッシュを削除 ===== */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keyList =>
      Promise.all(
        keyList
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] 古いキャッシュを削除:', key);
            return caches.delete(key);
          })
      )
    )
  );
  // すぐに全クライアントを制御下に置く
  self.clients.claim();
});

/* ===== フェッチ時：キャッシュを優先し、なければネットワーク ===== */
self.addEventListener('fetch', event => {
  // GETリクエストのみキャッシュ対象
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // キャッシュがあればそれを返す（オフラインでも動作）
        return cachedResponse;
      }
      // キャッシュがなければネットワークに問い合わせ
      return fetch(event.request).then(networkResponse => {
        // 成功したレスポンスをキャッシュに追加
        if (networkResponse && networkResponse.status === 200) {
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        }
        return networkResponse;
      }).catch(() => {
        // オフラインでキャッシュもない場合はindex.htmlを返す（フォールバック）
        return caches.match('./index.html');
      });
    })
  );
});