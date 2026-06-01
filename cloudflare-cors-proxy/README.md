# Dataslope CORS Proxy

A lightweight [Cloudflare Worker](https://developers.cloudflare.com/workers/) that acts as a CORS proxy for the Dataslope playground runtimes (JavaScript, TypeScript, Python, R, PHP, C/C++, Java, C#, SQLite, PostgreSQL, DuckDB).

## Why Cloudflare Workers?

The playground runtimes run entirely in the browser. When user code calls a third-party API that doesn't send permissive `Access-Control-Allow-Origin` headers, the browser blocks the response. A server-side proxy solves this by forwarding the request from a trusted server origin.

Cloudflare Workers are chosen over a Next.js route handler because:

- **Edge-native** — requests are served from the Cloudflare edge closest to the user, minimising latency.
- **Independently deployable** — the proxy can be updated, scaled, or replaced without touching the Next.js app.
- **Zero cold starts** — Workers use the V8 isolate model with no container spin-up delay.
- **Future-proof** — as the playground evolves (e.g. almostnode Phase 1+), the proxy stays stable regardless of which framework hosts the frontend.

## How it works

```
Browser (playground runtime)
  └─► GET https://dataslope-cors-proxy.<subdomain>.workers.dev/?url=<encoded-url>
          │
          ▼
    Cloudflare Worker (this repo)
          │  validates Origin, scheme, and hostname
          │  strips hop-by-hop and credential headers
          │  forwards request to upstream
          ▼
    Third-party API  (e.g. https://api.example.com/data)
          │
          ▼
    Cloudflare Worker
          │  injects CORS headers
          ▼
Browser  ✅ response accepted
```

The playground runtime appends the target URL as a query parameter:

```js
const proxyBase = 'https://dataslope-cors-proxy.<subdomain>.workers.dev';
const response = await fetch(`${proxyBase}/?url=${encodeURIComponent(targetUrl)}`);
```

## Security

| Concern | Mitigation |
|---|---|
| Open proxy abuse | Only requests from whitelisted `Origin` headers are served (see [Allowed Origins](#allowed-origins)). All other origins receive `403`. |
| SSRF to internal services | Private/loopback hostnames (`localhost`, `127.*`, `10.*`, `192.168.*`, etc.) are rejected with `400`. |
| Credential forwarding | `Cookie`, `Authorization`, and `Origin`/`Referer` headers are stripped before forwarding to the upstream server. |
| Non-HTTP schemes | Only `http://` and `https://` target URLs are accepted. |
| Header smuggling | Hop-by-hop headers (`Connection`, `Transfer-Encoding`, etc.) are stripped from both directions. |

### Allowed Origins

The following origins are whitelisted by default:

| Origin | Purpose |
|---|---|
| `http://localhost:3000` | Local development |
| `https://dataslope.com` | Production site |
| `https://www.dataslope.com` | Production site (www) |
| `https://dataslope.vercel.app` | Vercel preview/staging |
| `https://dataslope-*-ye-joo-parks-projects.vercel.app` | Vercel branch/commit preview deployments |

Any `localhost` port is also allowed automatically during local development (`wrangler dev`).

#### Wildcard entries (Vercel previews)

Vercel generates a unique hostname for every branch and commit deployment, e.g.

```
https://dataslope-git-claude-focused-barde-c4a546-ye-joo-parks-projects.vercel.app
https://dataslope-git-claude-vigilant-feyn-a92c1c-ye-joo-parks-projects.vercel.app
```

Listing each one is impractical, so an `ALLOWED_ORIGINS` entry may contain a `*`
wildcard. The `*` matches **one hostname label** — one or more characters that
are not a `.` or `/` — so it stays scoped to a single host and can never match a
different registrable domain.

The default entry `https://dataslope-*-ye-joo-parks-projects.vercel.app` matches
both examples above. Note the team-scope suffix (`-ye-joo-parks-projects`) is
deliberately part of the pattern: only the project owner can deploy under that
scope, so an attacker cannot register a `dataslope`-named project elsewhere and
get a matching preview host. Avoid an over-broad pattern such as
`https://dataslope-*.vercel.app`, which *would* match an attacker-controlled
`dataslope-xyz-evil-team.vercel.app`.

To change the allowlist, edit `ALLOWED_ORIGINS` in `wrangler.toml` (for non-sensitive values) or set it as a Cloudflare secret for production (see [Configuration](#configuration)).

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier is sufficient)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (installed as a dev dependency — no global install needed)

## Setup

### 1. Install dependencies

```bash
cd cloudflare-cors-proxy
npm install
```

### 2. Authenticate with Cloudflare

```bash
npx wrangler login
```

This opens a browser window to authorise the CLI. Your credentials are stored locally at `~/.wrangler/config/`.

### 3. Run locally

```bash
npm run dev
# or: npx wrangler dev
```

The worker starts at `http://localhost:8787`. Test it:

```bash
curl "http://localhost:8787/?url=https%3A%2F%2Fhttpbin.org%2Fget"
```

### 4. Deploy to Cloudflare

```bash
npm run deploy
# or: npx wrangler deploy
```

Wrangler prints the deployed URL, e.g.:

```
https://dataslope-cors-proxy.<your-subdomain>.workers.dev
```

## Configuration

### `wrangler.toml`

| Key | Default | Description |
|---|---|---|
| `name` | `dataslope-cors-proxy` | Worker name shown in the Cloudflare dashboard |
| `compatibility_date` | `2025-05-19` | Pins the Workers runtime version |
| `vars.ALLOWED_ORIGINS` | (see above) | Comma-separated allowed Origin values |

### Overriding `ALLOWED_ORIGINS` in production

For production, set the allowed origins as a [Cloudflare secret](https://developers.cloudflare.com/workers/configuration/secrets/) so the value isn't committed to source control:

```bash
npx wrangler secret put ALLOWED_ORIGINS
# Paste the comma-separated list when prompted:
# https://dataslope.com,https://www.dataslope.com,https://dataslope.vercel.app
```

Secrets take precedence over `[vars]` in `wrangler.toml`.

### Custom domain

To serve the proxy from a custom subdomain (e.g. `cors-proxy.dataslope.com`) instead of `*.workers.dev`, add a route in `wrangler.toml`:

```toml
routes = [
  { pattern = "cors-proxy.dataslope.com/*", custom_domain = true }
]
```

Then add a CNAME record in your DNS pointing `cors-proxy.dataslope.com` to `<worker-name>.<subdomain>.workers.dev` (Cloudflare handles this automatically when `custom_domain = true`).

## Connecting to the playground

In each playground runtime worker that makes user-driven HTTP requests, replace bare `fetch` calls with the proxy URL:

```ts
const CORS_PROXY_URL = process.env.NEXT_PUBLIC_CORS_PROXY_URL ?? '';

async function proxiedFetch(url: string, init?: RequestInit): Promise<Response> {
  if (!CORS_PROXY_URL) return fetch(url, init);
  const proxyUrl = `${CORS_PROXY_URL}/?url=${encodeURIComponent(url)}`;
  return fetch(proxyUrl, init);
}
```

Set `NEXT_PUBLIC_CORS_PROXY_URL` in your Next.js project's `.env.local`:

```
NEXT_PUBLIC_CORS_PROXY_URL=https://dataslope-cors-proxy.<your-subdomain>.workers.dev
```

## Project structure

```
cloudflare-cors-proxy/
├── src/
│   └── index.ts        # Worker entry point — all proxy logic lives here
├── package.json        # Dev dependencies (wrangler, TypeScript, types)
├── tsconfig.json       # TypeScript config for Workers runtime
├── wrangler.toml       # Cloudflare Worker configuration
└── README.md           # This file
```

## Generating TypeScript types

After deploying or making changes to `wrangler.toml` bindings, regenerate the `Env` types:

```bash
npm run cf-typegen
# or: npx wrangler types
```

## Updating Wrangler

```bash
npm install wrangler@latest --save-dev
```

Always update `compatibility_date` in `wrangler.toml` when upgrading to use new runtime APIs.
