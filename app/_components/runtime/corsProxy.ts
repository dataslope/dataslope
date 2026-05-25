export const CORS_PROXY_BASE =
  process.env.NEXT_PUBLIC_CORS_PROXY_URL ||
  "https://dataslope-cors-proxy.subwaymatch.workers.dev";

const PASSTHROUGH_HOSTS = [
  "cdn.jsdelivr.net",
  "unpkg.com",
  "cjrtnc.leaningtech.com",
];

function isLocalHostname(hostname: string): boolean {
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

export function shouldProxyUrl(url: string, proxyBase = CORS_PROXY_BASE): boolean {
  if (!proxyBase) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    if (isLocalHostname(parsed.hostname)) return false;
    const proxy = new URL(proxyBase);
    if (parsed.origin === proxy.origin) return false;
    return !PASSTHROUGH_HOSTS.some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}

export function proxiedUrl(url: string, proxyBase = CORS_PROXY_BASE): string {
  return `${proxyBase}/?url=${encodeURIComponent(url)}`;
}
