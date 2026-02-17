self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("bed-cache").then(cache => {
      return cache.addAll([
        "index.html",
        "app.js",
        "codes.json",
        "master.bedx"
      ]);
    })
  );
});
