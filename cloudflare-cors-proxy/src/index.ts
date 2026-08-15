/**
 * Dataslope CORS Proxy (Cloudflare Worker): proxies playground requests to
 * third-party APIs that lack permissive CORS headers.
 *
 * Security model: only allowed Origins (ALLOWED_ORIGINS); http/https targets
 * only; private/loopback IPs blocked on every redirect hop; hop-by-hop
 * headers stripped both directions; ambient Cookie stripped (explicit
 * Authorization kept).
 */

import {
  parseAllowedOrigins,
  isOriginInAllowList,
  isLocalhostOrigin,
} from "./origins";

export interface Env {
  /**
   * Comma-separated allowed Origin values. A `*` wildcard matches a single
   * hostname label (no dots/slashes), e.g. "https://*-dataslope.subwaymatch.workers.dev"
   * for preview hostnames. Set in wrangler.toml [vars] (dev) or via
   * `wrangler secret put ALLOWED_ORIGINS` (prod).
   */
  ALLOWED_ORIGINS: string;

}

/** Headers that must not be forwarded upstream (hop-by-hop). */
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  // Cloudflare sets the correct Host for the upstream.
  "host",
]);

/** Private/loopback ranges, blocked to prevent SSRF from the Cloudflare edge. */
const PRIVATE_IP_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  // IPv4 link-local, incl. cloud metadata endpoint 169.254.169.254.
  /^169\.254\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /^0\.0\.0\.0$/,
];

const MAX_REDIRECTS = 5;

function buildCorsHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Expose-Headers": "*",
    "Access-Control-Max-Age": "86400",
    "Cross-Origin-Resource-Policy": "cross-origin",
  };
}

function errorResponse(
  status: number,
  message: string,
  corsHeaders: HeadersInit,
): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

/**
 * True when the hostname is a private/loopback address. Beyond the regex list
 * it covers bypass vectors: IPv6 brackets ("[::1]"), IPv4-mapped IPv6
 * (::ffff:127.0.0.1), and decimal/hex-encoded IPv4 (2130706433, 0x7f000001).
 * DNS rebinding is not detectable at this layer.
 */
function isPrivateHostname(hostname: string): boolean {
  // URL.hostname wraps IPv6 in brackets ("[::1]"); strip for pattern matching.
  const h = /^\[.+]$/.test(hostname) ? hostname.slice(1, -1) : hostname;

  if (PRIVATE_IP_PATTERNS.some((re) => re.test(h))) return true;

  // IPv4-mapped IPv6: ::ffff:127.0.0.1, etc.
  const v4Mapped = h.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (v4Mapped && PRIVATE_IP_PATTERNS.some((re) => re.test(v4Mapped[1]))) {
    return true;
  }

  // Decimal-encoded IPv4: no valid public hostname is a bare integer.
  if (/^\d+$/.test(h)) return true;

  // Hex-encoded IPv4 (e.g. 0x7f000001 == 127.0.0.1).
  if (/^0x[0-9a-f]+$/i.test(h)) return true;

  return false;
}

function stripHopByHopHeaders(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of headers.entries()) {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      out[key] = value;
    }
  }
  return out;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS ?? "");

    const rawOrigin = request.headers.get("Origin");
    const normalizedOrigin = rawOrigin ? rawOrigin.replace(/\/+$/, "") : null;

    // No Origin header (navigation, curl, ...) is always allowed — only
    // browser cross-origin fetch/XHR reliably sends one.
    const isAllowedOrigin =
      normalizedOrigin === null ||
      isOriginInAllowList(normalizedOrigin, allowedOrigins) ||
      // Also allow any localhost port during local development.
      isLocalhostOrigin(normalizedOrigin);

    const corsHeaders = isAllowedOrigin
      ? buildCorsHeaders(normalizedOrigin ?? "*")
      : buildCorsHeaders("null");

    // Preflight.
    if (request.method === "OPTIONS") {
      if (!isAllowedOrigin) {
        return errorResponse(403, "Origin not allowed", corsHeaders);
      }
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (!isAllowedOrigin) {
      return errorResponse(403, "Origin not allowed", corsHeaders);
    }

    const { searchParams } = new URL(request.url);
    const targetUrlRaw = searchParams.get("url");

    if (!targetUrlRaw) {
      return errorResponse(
        400,
        'Missing required query parameter "url"',
        corsHeaders,
      );
    }

    let targetUrl: URL;
    try {
      targetUrl = new URL(targetUrlRaw);
    } catch {
      return errorResponse(400, "Invalid target URL", corsHeaders);
    }

    if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") {
      return errorResponse(
        400,
        "Only http:// and https:// URLs are allowed",
        corsHeaders,
      );
    }

    // SSRF protection.
    if (isPrivateHostname(targetUrl.hostname)) {
      return errorResponse(
        400,
        "Requests to private or loopback addresses are not allowed",
        corsHeaders,
      );
    }

    // Redirects are followed manually so every hop is re-validated against
    // the private-IP list; redirect: "follow" would skip checks after hop 1.
    const upstreamHeaders = new Headers(
      stripHopByHopHeaders(request.headers),
    );

    // Don't leak the caller's identity to the target.
    upstreamHeaders.delete("origin");
    upstreamHeaders.delete("referer");
    // Ambient cookies must never leak to arbitrary hosts; explicitly-set
    // Authorization headers are kept so authenticated API calls work.
    upstreamHeaders.delete("cookie");

    // Never forward Accept-Encoding: fetch() then goes pass-through and can
    // return a decompressed body while keeping the upstream Content-Encoding,
    // so clients that trust the header (pandas read_csv in Pyodide) fail with
    // "Not a gzipped file". Without it Cloudflare returns an identity body.
    upstreamHeaders.delete("accept-encoding");

    // Tag requests so upstream servers can identify the proxy.
    upstreamHeaders.set("User-Agent", "dataslope-cors-proxy/1.0");
    upstreamHeaders.set("X-Forwarded-By", "dataslope-cors-proxy");

    let currentUrl = targetUrl.toString();
    let upstreamResponse: Response | null = null;
    let redirectCount = 0;

    while (true) {
      const init: RequestInit = {
        method: request.method,
        headers: upstreamHeaders,
        redirect: "manual",
      };
      // Body only on the first hop: the request body stream is consumed
      // after the initial read.
      if (!["GET", "HEAD"].includes(request.method) && redirectCount === 0) {
        init.body = request.body;
      }

      let response: Response;
      try {
        response = await fetch(currentUrl, init);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Upstream request failed";
        return errorResponse(502, `Upstream error: ${message}`, corsHeaders);
      }

      if (response.status < 300 || response.status >= 400) {
        upstreamResponse = response;
        break;
      }

      const location = response.headers.get("Location");
      if (!location) {
        upstreamResponse = response;
        break;
      }

      if (redirectCount >= MAX_REDIRECTS) {
        return errorResponse(502, "Too many redirects", corsHeaders);
      }

      let nextUrl: URL;
      try {
        nextUrl = new URL(location, currentUrl);
      } catch {
        return errorResponse(502, "Invalid redirect URL", corsHeaders);
      }

      if (nextUrl.protocol !== "http:" && nextUrl.protocol !== "https:") {
        return errorResponse(400, "Redirect to disallowed scheme", corsHeaders);
      }

      if (isPrivateHostname(nextUrl.hostname)) {
        return errorResponse(
          400,
          "Redirect to private or loopback address not allowed",
          corsHeaders,
        );
      }

      currentUrl = nextUrl.toString();
      redirectCount++;
    }

    if (!upstreamResponse) {
      return errorResponse(502, "Upstream request failed", corsHeaders);
    }

    const responseHeaders = new Headers(
      stripHopByHopHeaders(upstreamResponse.headers),
    );

    for (const [key, value] of Object.entries(corsHeaders)) {
      responseHeaders.set(key, value);
    }

    // The Workers runtime already decompressed the body, so the upstream
    // Content-Encoding/Content-Length no longer describe the returned bytes —
    // clients trusting them would gunzip decoded data or truncate. Drop them.
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  },
} satisfies ExportedHandler<Env>;
