const C='rdf-v4';
const SHELL=['./','index.html','style.css','enigmes.js','app.js','manifest.webmanifest','icon.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys()
 .then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k))))
 .then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
 /* NAVIGATION : toujours le réseau d'abord (version fraîche), cache seulement si hors-ligne */
 if(e.request.mode==='navigate'){
  e.respondWith(fetch(e.request)
   .then(res=>{const cl=res.clone();caches.open(C).then(c=>c.put('index.html',cl));return res})
   .catch(()=>caches.match('index.html').then(r=>r||caches.match('./'))));
  return}
 /* ASSETS : cache instantané + rafraîchissement en arrière-plan */
 e.respondWith(caches.match(e.request).then(r=>{
  const upd=fetch(e.request).then(res=>{if(res&&res.ok){const cl=res.clone();caches.open(C).then(c=>c.put(e.request,cl))}return res}).catch(()=>{});
  return r||upd}))});