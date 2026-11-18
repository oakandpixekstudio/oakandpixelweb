// Minimal service worker so the browser offers "Install app".
// It does not cache anything: every request goes to the network, so signed-in pages are never served stale.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
