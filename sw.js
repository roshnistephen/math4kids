/* LokaKids service worker: works offline, always refreshes in the background.
   Bump VERSION whenever you want every device to re-download the app. */
const VERSION = 'lokakids-v4';
const CORE = [
  "index.html",
  "unicorn-trail.html",
  "rainbow-kingdom.html",
  "chain-reaction.html",
  "privacy.html",
  "manifest.webmanifest",
  "trail.webmanifest",
  "css/chain.css",
  "css/fonts.css",
  "css/home.css",
  "css/kingdom.css",
  "css/theme.css",
  "css/trail.css",
  "js/chain.js",
  "js/kid.js",
  "js/pwa.js",
  "js/trail.js",
  "js/kingdom/audio.js",
  "js/kingdom/env.js",
  "js/kingdom/game.js",
  "js/kingdom/levels.js",
  "js/kingdom/models.js",
  "js/vendor/three.min.js",
  "fonts/fredoka-400.woff2",
  "fonts/fredoka-500.woff2",
  "fonts/fredoka-600.woff2",
  "fonts/fredoka-700.woff2",
  "fonts/nunito-600.woff2",
  "fonts/nunito-700.woff2",
  "fonts/nunito-800.woff2",
  "fonts/nunito-900.woff2",
  "images/trail/castle.png",
  "images/trail/frog.png",
  "images/trail/heart.png",
  "images/trail/hedgehog.png",
  "images/trail/mushroom.png",
  "images/trail/rainbow.png",
  "images/trail/raincloud.png",
  "images/trail/snail.png",
  "images/trail/spider.png",
  "images/trail/star.png",
  "images/trail/tulip.png",
  "images/trail/unicorn.png",
  "images/kingdom/bubbles.png",
  "images/kingdom/butterfly.png",
  "images/kingdom/candy.png",
  "images/kingdom/castle.png",
  "images/kingdom/cloud.png",
  "images/kingdom/crown.png",
  "images/kingdom/cupcake.png",
  "images/kingdom/doughnut.png",
  "images/kingdom/feather.png",
  "images/kingdom/gem.png",
  "images/kingdom/heart.png",
  "images/kingdom/lollipop.png",
  "images/kingdom/luna.png",
  "images/kingdom/note.png",
  "images/kingdom/pause.png",
  "images/kingdom/rainbow.png",
  "images/kingdom/ribbon.png",
  "images/kingdom/sparkles.png",
  "images/kingdom/star.png",
  "images/kingdom/storm.png",
  "images/kingdom/wand.png",
  "images/icons/icon-192.png",
  "images/icons/icon-512.png",
  "images/icons/trail-192.png",
  "images/icons/trail-512.png",
  "images/icons/trail-maskable-192.png",
  "images/icons/trail-maskable-512.png"
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(VERSION).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Stale-while-revalidate: open instantly from the cache (works offline), refresh from the network for next time.
self.addEventListener('fetch', e => {
    const req = e.request, url = new URL(req.url);
    if (req.method !== 'GET' || url.origin !== location.origin) return;
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => {
        const net = fetch(req).then(res => { if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return res; })
            .catch(() => hit || (req.mode === 'navigate' ? caches.match('index.html') : undefined));
        return hit || net;
    }));
});
