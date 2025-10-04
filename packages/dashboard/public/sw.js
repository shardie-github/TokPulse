/* TokPulse — © Hardonia. MIT. */
// Tiny cache-first for HTML + assets
const CACHE="tokpulse-v1";
self.addEventListener("install", e=>{ e.waitUntil(caches.open(CACHE)) });
self.addEventListener("fetch", e=>{
  const {request} = e; if(request.method!=="GET") return;
  e.respondWith((async()=>{
    const cached = await caches.match(request); if (cached) return cached;
    try{ const resp = await fetch(request); const c = await caches.open(CACHE); c.put(request, resp.clone()); return resp }catch{ return (await caches.match("/"))||Response.error() }
  })());
});
