self.addEventListener("install", e=>{
  e.waitUntil(
    caches.open("bed-cache").then(cache=>{
      return cache.addAll([
        "index.html",
        "app.js",
        "master.bedx"
        
      ]);
    })
  );
});

self.addEventListener("fetch", e=>{
  e.respondWith(
    caches.match(e.request).then(r=>r||fetch(e.request))
  );
});
