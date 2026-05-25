const PROXY_BASE = "https://dataslope-cors-proxy.subwaymatch.workers.dev";
const APP_ORIGIN = self.location.origin;
const PROXY_ORIGIN = new URL(PROXY_BASE).origin;

const PASSTHROUGH_HOSTS = [
  "cdn.jsdelivr.net",
  "unpkg.com",
  "cjrtnc.leaningtech.com",
];

function isLocalHostname(hostname) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  );
}

function shouldProxy(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    if (parsed.origin === APP_ORIGIN || parsed.origin === PROXY_ORIGIN) return false;
    if (isLocalHostname(parsed.hostname)) return false;
    return !PASSTHROUGH_HOSTS.some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (!shouldProxy(event.request.url)) return;

  const proxyUrl = `${PROXY_BASE}/?url=${encodeURIComponent(event.request.url)}`;
  event.respondWith(fetch(new Request(proxyUrl, event.request)));
});
