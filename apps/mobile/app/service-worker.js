// ===== PWA Service Worker =====
// 支持离线缓存和快速加载

const CACHE_NAME = 'xinchuan-cache-v4.2-test';
const ASSETS_TO_CACHE = [
    '/index.html',
    '/splash.html',
    '/login.html',
    '/knowledge.html',
    '/noun-detail.html',
    '/short-detail.html',
    '/essay-detail.html',
    '/practice-list.html',
    '/practice-detail.html',
    '/collections.html',
    '/profile.html',
    '/settings.html',
    '/exam-home.html',
    '/exam-interview.html',
    '/exam-comment.html',
    '/exam-news.html',
    '/exam-history.html',
    '/exam-marketing.html',
    '/exam-copywriting.html',
    '/exam-health.html',
    '/styles.css',
    '/practice-styles.css',
    '/app.js',
    '/packages/content/noun-data.js',
    '/packages/content/short-data.js',
    '/packages/content/essay-data.js',
    '/packages/content/practice-data.js',
    '/packages/content/practice-v2-data.js',
    '/practice-v2.js',
    '/exam.js',
    '/app.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS_TO_CACHE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // 网络优先策略：公网测试环境始终获取最新内容
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                const responseToCache = response.clone();
                caches.open(CACHE_NAME)
                    .then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                return response;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});
