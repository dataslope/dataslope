/**
 * Dataslope CORS Proxy — Cloudflare Worker
 *
 * Proxies HTTP/HTTPS requests on behalf of playground runtimes so that
 * third-party APIs that don't expose permissive CORS headers can be reached
 * from browser-side code.
 *
 * Security model
 * ──────────────
 * 1. Only requests from allowed Origins may use the proxy
 *    (ALLOWED_ORIGINS env var, comma-separated).
 * 2. Only http:// and https:// target URLs are accepted.
 * 3. Private/loopback IP addresses are never proxied, including on every
 *    redirect hop (redirect: "manual" + per-hop re-validation).
 * 4. Hop-by-hop headers are stripped from both the forwarded request and the
 *    upstream response to prevent header smuggling.
 * 5. The browser's ambient Cookie header is stripped before forwarding — it is
 *    never relevant to third-party upstream APIs. Explicitly-set Authorization
 *    headers are kept so authenticated API calls work.
 * 6. Requests are rate-limited per client IP (RATE_LIMITER binding).
 */

export interface Env {
  /**
   * Comma-separated list of allowed Origin values, e.g.:
   *   "http://localhost:3000,https://dataslope.com,https://dataslope.vercel.app"
   *
   * Configure in wrangler.toml [vars] for development, or via
   * `wrangler secret put ALLOWED_ORIGINS` / Cloudflare dashboard for production.
   */
  ALLOWED_ORIGINS: string;
  /**
   * Cloudflare Rate Limiting binding (Workers Paid plan required).
   * Configure via [[unsafe.bindings]] in wrangler.toml.
   * When absent (e.g. during `wrangler dev` without the binding), rate limiting
   * is silently skipped so local development works without a paid plan.
   */
  RATE_LIMITER?: {
    limit(options: { key: string }): Promise<{ success: boolean }>;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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
  // Strip the host header — Cloudflare sets the correct one for the upstream.
  "host",
]);

/**
 * Patterns that identify private/loopback IP ranges.
 * We block these to prevent Server-Side Request Forgery (SSRF) to internal
 * services that would be reachable from the Cloudflare edge.
 */
const PRIVATE_IP_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  // IPv4 link-local (169.254.0.0/16) — also covers the cloud metadata
  // endpoint 169.254.169.254. The IPv6 link-local equivalent (fe80:) is
  // already blocked below.
  /^169\.254\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /^0\.0\.0\.0$/,
];

/** Maximum number of redirects the proxy will follow before giving up. */
const MAX_REDIRECTS = 5;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function parseAllowedOrigins(raw: string): Set<string> {
  return new Set(
    raw
      .split(",")
      .map((o) => o.trim().replace(/\/+$/, ""))
      .filter(Boolean),
  );
}

/**
 * Returns true when the hostname looks like a private / loopback address that
 * should never be reachable via the proxy.
 *
 * Handles the common bypass vectors beyond the regex list:
 *  - IPv6 bracket syntax (`URL.hostname` returns "[::1]", not "::1")
 *  - IPv4-mapped IPv6 (::ffff:127.0.0.1)
 *  - Decimal-encoded IPv4 (2130706433 == 127.0.0.1)
 *  - Hex-encoded IPv4 (0x7f000001 == 127.0.0.1)
 *
 * Note: DNS rebinding (a public hostname that later resolves to a private IP)
 * is not detectable at this layer. On Cloudflare Workers the risk is reduced
 * because the runtime restricts outbound routing and there is no privileged
 * internal metadata service reachable via the same private IP ranges available
 * on typical cloud VMs.
 */
function isPrivateHostname(hostname: string): boolean {
  // URL.hostname wraps IPv6 addresses in brackets: "[::1]". Strip them so
  // patterns match the raw address string.
  const h = /^\[.+]$/.test(hostname) ? hostname.slice(1, -1) : hostname;

  if (PRIVATE_IP_PATTERNS.some((re) => re.test(h))) return true;

  // IPv4-mapped IPv6: ::ffff:127.0.0.1, ::ffff:192.168.0.1, etc.
  const v4Mapped = h.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (v4Mapped && PRIVATE_IP_PATTERNS.some((re) => re.test(v4Mapped[1]))) {
    return true;
  }

  // Decimal-encoded IPv4 (e.g. 2130706433 == 127.0.0.1). No valid public
  // hostname is a bare integer, so any pure-numeric hostname is treated as
  // private.
  if (/^\d+$/.test(h)) return true;

  // Hex-encoded IPv4 (e.g. 0x7f000001 == 127.0.0.1).
  if (/^0x[0-9a-f]+$/i.test(h)) return true;

  return false;
}

/**
 * Strips hop-by-hop headers from a Headers object and returns a plain object
 * suitable for constructing a new Headers instance.
 */
function stripHopByHopHeaders(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of headers.entries()) {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Returns true when the origin is localhost (any port, http or https).
 * Uses URL parsing rather than a regex to avoid potential ReDoS on
 * pathological inputs.
 */
function isLocalhostOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.hostname === "localhost"
    );
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS ?? "");

    // ------------------------------------------------------------------
    // 1. Determine and validate the request Origin
    // ------------------------------------------------------------------
    const rawOrigin = request.headers.get("Origin");
    // null means no Origin header was sent (browser navigation, curl, Postman…).
    const normalizedOrigin = rawOrigin ? rawOrigin.replace(/\/+$/, "") : null;

    // Requests without an Origin header are always allowed — only browser
    // cross-origin fetch/XHR requests reliably include an Origin header.
    // Short-circuit evaluation means isLocalhostOrigin() is only called when
    // normalizedOrigin is a non-null string (TypeScript narrows accordingly).
    const isAllowedOrigin =
      normalizedOrigin === null ||
      allowedOrigins.has(normalizedOrigin) ||
      // Also allow any localhost port during local development.
      isLocalhostOrigin(normalizedOrigin);

    const corsHeaders = isAllowedOrigin
      ? buildCorsHeaders(normalizedOrigin ?? "*")
      : buildCorsHeaders("null");

    // ------------------------------------------------------------------
    // 2. Handle preflight OPTIONS request
    // ------------------------------------------------------------------
    if (request.method === "OPTIONS") {
      if (!isAllowedOrigin) {
        return errorResponse(403, "Origin not allowed", corsHeaders);
      }
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ------------------------------------------------------------------
    // 3. Reject requests from disallowed Origins
    // ------------------------------------------------------------------
    if (!isAllowedOrigin) {
      return errorResponse(403, "Origin not allowed", corsHeaders);
    }

    // ------------------------------------------------------------------
    // 4. Rate limit per client IP
    //    Preflights (handled above) are intentionally excluded so browsers
    //    are not penalised for the automatic preflight they send.
    //    Falls through silently when RATE_LIMITER is not bound (local dev).
    // ------------------------------------------------------------------
    if (env.RATE_LIMITER) {
      const clientIp = request.headers.get("CF-Connecting-IP") ?? "unknown";
      const { success } = await env.RATE_LIMITER.limit({ key: clientIp });
      if (!success) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded — please try again shortly" }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": "60",
              ...corsHeaders,
            },
          },
        );
      }
    }

    // ------------------------------------------------------------------
    // 5. Parse and validate the target URL
    // ------------------------------------------------------------------
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

    // Only allow http and https schemes.
    if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") {
      return errorResponse(
        400,
        "Only http:// and https:// URLs are allowed",
        corsHeaders,
      );
    }

    // Block private / loopback addresses (SSRF protection).
    if (isPrivateHostname(targetUrl.hostname)) {
      return errorResponse(
        400,
        "Requests to private or loopback addresses are not allowed",
        corsHeaders,
      );
    }

    // ------------------------------------------------------------------
    // 6. Forward the request to the upstream server, following redirects
    //    manually so that each hop is re-validated against the private-IP
    //    list. Using redirect: "follow" would skip that check for hops
    //    after the first.
    // ------------------------------------------------------------------
    const upstreamHeaders = new Headers(
      stripHopByHopHeaders(request.headers),
    );

    // Remove the Origin header — the caller's origin is irrelevant to the
    // target server, and leaking it could expose the requester's identity.
    upstreamHeaders.delete("origin");
    upstreamHeaders.delete("referer");
    // Strip ambient browser cookies — never relevant to third-party upstream
    // APIs and must not be leaked to arbitrary hosts. Explicitly-set
    // Authorization headers are kept so authenticated API calls work.
    upstreamHeaders.delete("cookie");

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
      // Only attach a body for methods that allow one, and only on the first
      // hop — the request body stream is consumed after the initial read.
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

      // Not a redirect — use this response.
      if (response.status < 300 || response.status >= 400) {
        upstreamResponse = response;
        break;
      }

      const location = response.headers.get("Location");
      if (!location) {
        // 3xx with no Location — return as-is.
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

    // ------------------------------------------------------------------
    // 7. Build and return the proxied response
    // ------------------------------------------------------------------
    const responseHeaders = new Headers(
      stripHopByHopHeaders(upstreamResponse.headers),
    );

    // Inject CORS headers so the browser accepts the response.
    for (const [key, value] of Object.entries(corsHeaders)) {
      responseHeaders.set(key, value);
    }

    // The Workers runtime transparently decompresses gzip/brotli upstream
    // bodies, so `upstreamResponse.body` is already decoded. The upstream
    // Content-Encoding/Content-Length no longer describe the bytes we return —
    // leaving them in place makes clients (e.g. pandas read_csv, which trusts
    // Content-Encoding over its own `compression=` argument) try to gunzip
    // already-decompressed data, or truncate on a stale length. Drop them.
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  },
} satisfies ExportedHandler<Env>;
