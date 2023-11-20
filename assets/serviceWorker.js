self.addEventListener("install", installEvent => {
    console.log("Service Worker installed.");
});

self.addEventListener("fetch", (event) => {
    fetchEvent.respondWith(fetch(event.request));
  });