/* MARU 서비스 워커 — tools/postbuild.mjs가 __VERSION__·__PRECACHE__를 채워 dist/sw.js로 만든다.
 *
 * · 앱 껍데기(HTML·JS·CSS·아이콘)는 설치 때 미리 받아 둔다 → 오프라인에서도 계산기·타이머·표준 레시피가 열린다.
 * · 페이지 이동: 네트워크 우선, 실패하거나 404면 저장해 둔 index.html (SPA라 어느 경로든 같은 HTML).
 * · 해시가 붙은 /assets/ 파일: 캐시 우선 (내용이 바뀌면 파일 이름이 바뀐다).
 * · 웹폰트(jsDelivr·Google Fonts): 캐시에서 바로 주고 뒤에서 갱신.
 * · Supabase(로그인·노트·활동 데이터)는 절대 캐시하지 않는다.
 */
const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
const SHELL = `maru-shell-${VERSION}`;
const FONTS = 'maru-fonts-v1';
const BASE = new URL('./', self.location).pathname;
const INDEX = `${BASE}index.html`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL)
      .then((cache) => cache.addAll(PRECACHE.map((p) => `${BASE}${p}`)))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('maru-shell-') && k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (request.mode === 'navigate' && url.origin === self.location.origin && url.pathname.startsWith(BASE)) {
    event.respondWith(
      fetch(request)
        .then((res) => (res.ok ? res : caches.match(INDEX).then((cached) => cached || res)))
        .catch(() => caches.match(INDEX)),
    );
    return;
  }

  if (url.origin === self.location.origin && url.pathname.startsWith(`${BASE}assets/`)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(SHELL).then((cache) => cache.put(request, copy));
        }
        return res;
      })),
    );
    return;
  }

  if (url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONTS).then((cache) => cache.match(request).then((cached) => {
        const network = fetch(request).then((res) => {
          if (res.ok || res.type === 'opaque') cache.put(request, res.clone());
          return res;
        }).catch(() => cached);
        return cached || network;
      })),
    );
  }
  // 그 밖(Supabase 등)은 브라우저 기본 동작 그대로
});
