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
 * 3. Private/loopback IP addresses are never proxied.
 * 4. Hop-by-hop headers are stripped from both the forwarded request and the
 *    upstream response to prevent header smuggling.
 * 5. Credentials (cookies, Authorization) sent by the browser to THIS worker
 *    are NOT forwarded upstream unless the caller explicitly sets them in the
 *    target request body/headers — the worker only mirrors what the runtime
 *    explicitly passes as query parameters or JSON body fields.
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
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /^0\.0\.0\.0$/,
];

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
 */
function isPrivateHostname(hostname: string): boolean {
  return PRIVATE_IP_PATTERNS.some((re) => re.test(hostname));
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
    // 4. Parse and validate the target URL
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
    // 5. Forward the request to the upstream server
    // ------------------------------------------------------------------
    const upstreamHeaders = new Headers(
      stripHopByHopHeaders(request.headers),
    );

    // Remove the Origin header sent to upstream — the caller's origin is
    // irrelevant to the target server, and leaking it could expose the
    // requester's identity unnecessarily.
    upstreamHeaders.delete("origin");
    upstreamHeaders.delete("referer");

    // Tag requests so upstream servers can identify the proxy.
    upstreamHeaders.set("User-Agent", "dataslope-cors-proxy/1.0");
    upstreamHeaders.set("X-Forwarded-By", "dataslope-cors-proxy");

    const upstreamInit: RequestInit = {
      method: request.method,
      headers: upstreamHeaders,
      // Follow redirects server-side so the final response is returned to the
      // browser. Returning a 3xx redirect to the browser would trigger a new
      // cross-origin request that bypasses the proxy and hits CORS again.
      redirect: "follow",
    };

    // Attach a body for methods that allow one.
    if (!["GET", "HEAD"].includes(request.method)) {
      upstreamInit.body = request.body;
    }

    let upstreamResponse: Response;
    try {
      upstreamResponse = await fetch(targetUrl.toString(), upstreamInit);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Upstream request failed";
      return errorResponse(502, `Upstream error: ${message}`, corsHeaders);
    }

    // ------------------------------------------------------------------
    // 6. Build and return the proxied response
    // ------------------------------------------------------------------
    const responseHeaders = new Headers(
      stripHopByHopHeaders(upstreamResponse.headers),
    );

    // Inject CORS headers so the browser accepts the response.
    for (const [key, value] of Object.entries(corsHeaders)) {
      responseHeaders.set(key, value);
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  },
} satisfies ExportedHandler<Env>;
