// ===== PWA Service Worker（V5.1）=====
// 网络优先 + 离线回退；导航请求按"去 query"的键缓存，保证离线直达 ?term=xxx 等深链可用。

const CACHE_NAME = 'xinchuan-cache-v5.1';
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
    '/xc-sync.js',
    '/ai-service.js',
    '/packages/content/noun-data.js',
    '/packages/content/short-data.js',
    '/packages/content/essay-data.js',
    '/packages/content/practice-data.js',
    '/packages/content/practice-v2-data.js',
    '/practice-v2.js',
    '/exam.js',
    '/app.json'
];

// 去掉 query/hash 的纯路径键，使 ?term=xx 这类导航与缓存中的文档能对上
function pathOnlyUrl(url) {
    try {
        var u = new URL(url);
        return u.origin + u.pathname;
    } catch (e) {
        return url;
    }
}

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            // 单项失败（如个别资源 404）不应拖垮整个 SW 安装
            .then((cache) => Promise.all(
                ASSETS_TO_CACHE.map((asset) =>
                    cache.add(asset).catch((err) => console.warn('[SW] precache skip:', asset, err))
                )
            ))
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
    var req = event.request;
    if (req.method !== 'GET') return;

    var reqUrl;
    try { reqUrl = new URL(req.url); } catch (e) { return; }
    // 同源策略：跨域请求、AI 代理接口不进缓存
    if (reqUrl.origin !== self.location.origin) return;
    if (reqUrl.pathname.indexOf('/api/') === 0) return;

    var isNavigation = req.mode === 'navigate';
    // 导航文档统一以"纯路径"为键，普通资源按原始 URL 为键
    var cacheKey = isNavigation ? pathOnlyUrl(req.url) : req.url;

    event.respondWith(
        fetch(req)
            .then((response) => {
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                const responseToCache = response.clone();
                caches.open(CACHE_NAME)
                    .then((cache) => cache.put(cacheKey, responseToCache))
                    .catch(() => {});
                return response;
            })
            .catch(() => {
                // 离线：导航深链（带 query）先按纯路径命中缓存，再退回原始请求匹配，
                // 最后兜底首页（App Shell），避免"离线打开白屏"
                return caches.match(cacheKey)
                    .then((hit) => hit || caches.match(req.url))
                    .then((hit) => {
                        if (hit) return hit;
                        if (isNavigation) return caches.match('/index.html');
                        return undefined;
                    });
            })
    );
});
