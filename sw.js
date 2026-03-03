const CACHE = 'nailpro-v4'
const FILES = ['./','./index.html','./style.css','./app.js','./calc.js','./storage.js','./manifest.json']
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting() })
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))); self.clients.claim() })
self.addEventListener('fetch', e => { e.respondWith(fetch(e.request).then(r=>{ const clone=r.clone(); caches.open(CACHE).then(c=>c.put(e.request,clone)); return r }).catch(()=>caches.match(e.request))) })
self.addEventListener('message', e => { if(e.data?.type==='SKIP_WAITING') self.skipWaiting() })
