const CACHE = 'blog-VERSION_PLACEHOLDER';
const PRECACHE_URLS = [
  '/index.html',
  '/offline.html',
  '/assets/style.css',
  '/assets/style-mobile.css',
  '/assets/github-markdown.css',
  '/assets/search.js',
  '/assets/avatar.jpg',
  '/assets/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 只缓存 HTTP/HTTPS 请求，忽略 chrome-extension 等协议
  if (!url.protocol.startsWith('http')) return;

  // 1. 对于经常变动的页面 (HTML, RSS feed, Sitemap, JSON 数据)，采用 Network-First (网络优先，缓存兜底) 策略
  const isDynamicPage = 
    url.pathname.endsWith('.html') || 
    url.pathname.endsWith('.xml') || 
    url.pathname.endsWith('.json') || 
    url.pathname === '/' || 
    url.pathname.startsWith('/page/');

  // Offline fallback: when both network and cache miss, show /offline.html
  function offlineFallback() {
    return caches.match('/offline.html');
  }

  if (isDynamicPage) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then(cached => cached || offlineFallback()))
    );
  } else {
    // 2. 静态资源 (CSS, JS, 图片, 字体) 采用 Cache-First (缓存优先) 策略
    event.respondWith(
      caches.match(event.request).then(cached => {
        const fetched = fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(event.request, copy));
          }
          return response;
        }).catch(() => null);

        return cached || fetched || offlineFallback();
      })
    );
  }
});
