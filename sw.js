/* ==========================================================================
   Pazarkule KİBA - Service Worker
   Amaç: uygulamanın internet bağlantısı olmadan da (tablet / telefon / PC)
          açılabilmesi. Tüm dosyalar kurulum sırasında önbelleğe alınır.
   Not: Uygulama verileri localStorage / IndexedDB'de tutulur, burada tutulmaz.
   ========================================================================== */

const VERSION = 'kiba-pwa-v1.0.0';
const CACHE = 'kiba-cache-' + VERSION;

/* Uygulamanın çalışması için zorunlu dosyalar */
const APP_SHELL = [
    './',
    'index.html',
    'manifest.webmanifest',
    'offline.html',
    'vendor/tailwind.js',
    'vendor/xlsx.full.min.js',
    'vendor/fontawesome/css/all.min.css',
    'vendor/fontawesome/webfonts/fa-solid-900.woff2',
    'vendor/fontawesome/webfonts/fa-solid-900.ttf',
    'vendor/fontawesome/webfonts/fa-regular-400.woff2',
    'vendor/fontawesome/webfonts/fa-regular-400.ttf',
    'vendor/fontawesome/webfonts/fa-brands-400.woff2',
    'vendor/fontawesome/webfonts/fa-brands-400.ttf',
    'vendor/fontawesome/webfonts/fa-v4compatibility.woff2',
    'vendor/fontawesome/webfonts/fa-v4compatibility.ttf',
    'vendor/inter/inter.css',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'icons/maskable-192.png',
    'icons/maskable-512.png',
    'icons/apple-touch-icon.png',
    'icons/favicon-32.png'
];

/* Kurulum: dosyaları önbelleğe al. Bir dosya bulunamazsa kurulum bozulmasın. */
self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE);
        await Promise.all(APP_SHELL.map(async url => {
            try {
                await cache.add(new Request(url, { cache: 'reload' }));
            } catch (err) {
                console.warn('[SW] Önbelleğe alınamadı:', url, err && err.message);
            }
        }));
        await self.skipWaiting();
    })());
});

/* Etkinleştirme: eski sürüm önbelleklerini temizle */
self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => (k !== CACHE && k.indexOf('kiba-cache-') === 0) ? caches.delete(k) : null));
        if (self.registration.navigationPreload) {
            try { await self.registration.navigationPreload.disable(); } catch (e) { /* yok say */ }
        }
        await self.clients.claim();
    })());
});

/* Önbellekten hızlı yanıt + arka planda güncelleme (stale-while-revalidate) */
async function staleWhileRevalidate(request, cacheKey) {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(cacheKey || request, { ignoreSearch: false });
    const network = fetch(request).then(resp => {
        if (resp && resp.ok && resp.type === 'basic') cache.put(cacheKey || request, resp.clone());
        return resp;
    }).catch(() => null);
    if (cached) return cached;
    const fresh = await network;
    if (fresh) return fresh;
    throw new Error('offline');
}

self.addEventListener('fetch', event => {
    const req = event.request;

    /* Yalnızca GET istekleri önbelleğe alınır */
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    /* Uygulama dışı adresler (örn. hava durumu API'si) doğrudan ağdan gider;
       çevrimdışıysa ağ hatası döner, uygulama bunu zaten tolere eder. */
    if (url.origin !== self.location.origin) return;

    /* Sayfa gezinmeleri: önce ağ, olmazsa önbellekteki index.html */
    if (req.mode === 'navigate') {
        event.respondWith((async () => {
            try {
                return await fetch(req);
            } catch (err) {
                const cache = await caches.open(CACHE);
                return (await cache.match('index.html')) ||
                       (await cache.match('./')) ||
                       (await cache.match('offline.html')) ||
                       new Response('<h1>Çevrimdışı</h1>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
            }
        })());
        return;
    }

    /* Diğer tüm yerel dosyalar: önbellekten sun, arka planda tazele */
    event.respondWith(staleWhileRevalidate(req).catch(() => new Response('', { status: 504 })));
});

/* Sayfa tarafından "hemen güncelle" mesajı gelirse */
self.addEventListener('message', event => {
    if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
