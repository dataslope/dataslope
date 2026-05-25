# CDN Research: Runtime CDN Opportunities & JAR File Hosting

**Date**: 2026-05-25  
**Context**: Companion report to the PGlite CDN migration (Update 1).

---

## Update 2: CDN Opportunities for Remaining Runtimes

This section audits every programming language and SQL runtime in the project for current CDN usage and identifies candidates that could migrate to CDN delivery.

### Current CDN Status — Full Inventory

| Runtime | Language / SQL | CDN Used? | CDN Provider | Mechanism |
|---------|---------------|-----------|--------------|-----------|
| Pyodide (Python 3.13.2) | Python | ✅ Yes | jsDelivr | `importScripts` in worker |
| WebR 0.6.0 (R 4.6.0) | R | ❌ **No** | — | `import("webr")` from npm bundle |
| php-wasm 0.1.0 (PHP 8.4) | PHP | ✅ Yes | unpkg | Dynamic `import()` in worker |
| almostnode 0.2.14 | JavaScript | ❌ **No** | — | Static `import` in worker bundle |
| almostnode + TypeScript 5.7.3 | TypeScript | ❌ **No** | — | Static `import` in worker bundle |
| browsercc 0.1.1 (C/C++) | C & C++ | ✅ Yes | jsDelivr + esm.sh | Dynamic `import()` in main thread |
| .NET WASM (C# / Roslyn) | C# | ✅ Yes | jsDelivr (via cdn.ts) | Dynamic `import()` in main thread |
| CheerpJ 4.3 (Java) | Java | ✅ Yes | cjrtnc.leaningtech.com | `<script>` tag injection |
| @sqlite.org/sqlite-wasm 3.53.0 | SQLite | ✅ Yes | jsDelivr | Dynamic `import()` in worker |
| @electric-sql/pglite 0.4.5 (PG 17) | PostgreSQL | ✅ Yes* | jsDelivr | Dynamic `import()` (see note) |
| @duckdb/duckdb-wasm 1.32.0 | DuckDB | ✅ Yes | jsDelivr | Dynamic `import()` in main thread |

> **\*** PGlite was bundled from npm prior to the Update 1 migration in this PR. It now loads from jsDelivr CDN.

---

### Candidates for CDN Migration

#### 1. WebR (R runtime) — **Recommended**

**Current behaviour**: `r.tsx` uses `await import("webr")` — a dynamic import of the npm package `webr@0.6.0`. Although lazy, Next.js/Turbopack still bundles the WebR JS loader (~6 MB) into the page chunk.

**CDN option**: jsDelivr can serve WebR's ESM entry point directly:

```
https://cdn.jsdelivr.net/npm/webr@0.6.0/dist/webr.mjs
```

WebR automatically fetches its large WASM binary and R package tree from r-wasm.org's own CDN (`cdn.r-wasm.org`) regardless of how the JS loader is delivered, so the WASM payload is already off Vercel. Switching the JS loader to CDN would eliminate the remaining ~6 MB from Vercel's bandwidth for the JS bundle.

**Implementation**: Replace `await import("webr")` with:

```ts
const { WebR } = await import(
  /* webpackIgnore: true */ /* turbopackIgnore: true */
  "https://cdn.jsdelivr.net/npm/webr@0.6.0/dist/webr.mjs"
) as { WebR: new () => WebRInstance };
```

**Feasibility**: High — WebR is specifically designed to be loaded from a URL; its internal `new Worker(new URL('...', import.meta.url))` calls will resolve relative to the CDN path automatically.

**Benefit**: Medium — Removes ~6 MB from Vercel's served JS bundle; consistent with how every other WASM runtime in the project is loaded.

---

#### 2. JavaScript / TypeScript Workers (almostnode + TypeScript compiler) — **Possible but lower priority**

**Current behaviour**: Both `javascript-worker.ts` and `typescript-worker.ts` statically import from npm packages:

- `import { VirtualFS } from "almostnode"` (~0.2 MB)
- `import * as ts from "typescript"` (~10 MB — the full TypeScript compiler)

These are bundled into their respective worker chunks by Next.js/Turbopack and served by Vercel.

**CDN options**:
- almostnode: `https://cdn.jsdelivr.net/npm/almostnode@0.2.14/+esm`
- TypeScript: `https://cdn.jsdelivr.net/npm/typescript@5.7.3/lib/typescript.js`

**Feasibility**: Medium — Both are pure-JS packages without WASM, so there are no Turbopack compatibility reasons forcing CDN use today. The larger concern is runtime correctness: `almostnode` uses Node.js module shims that may depend on specific import-resolution behaviour, and the TypeScript compiler is a CommonJS module that would need its global `ts` binding pattern to work in the CDN `+esm` form.

**Benefit**: High for the TypeScript compiler (~10 MB), low for almostnode alone (~0.2 MB).

**Recommendation**: Evaluate the TypeScript compiler specifically, since its size is the dominant factor. Test whether `import("https://cdn.jsdelivr.net/npm/typescript@5.7.3/lib/typescript.js")` returns the expected `ts` namespace in a Dedicated Worker before committing to this change.

---

### Runtimes Already on CDN — No Action Needed

- **Python (Pyodide)**: `importScripts` from jsDelivr in `pyodide-worker.ts`
- **PHP (php-wasm)**: Dynamic import from unpkg in `php-worker.ts`
- **C / C++ (browsercc)**: Dynamic import from jsDelivr + esm.sh in `browsercc.ts`
- **C# (.NET WASM)**: Dynamic import from jsDelivr via `cdn.ts` in `dotnet.ts`
- **Java (CheerpJ)**: Script-tag injection from CheerpJ's own CDN in `cheerpj.ts`
- **SQLite**: Dynamic import from jsDelivr in `sqlite-wasm.ts`
- **DuckDB**: Dynamic import from jsDelivr in `duckdb.ts`
- **PostgreSQL (PGlite)**: Now migrated to jsDelivr in this PR

---

## Update 3: Free CDN Providers That Support `.jar` File Hosting

### Background

`public/tools.jar` is an 18 MB Java 8 tools archive served directly by Vercel/Next.js at `/tools.jar`. It is pre-loaded by CheerpJ into its virtual filesystem so `javac` (`com.sun.tools.javac.Main`) is available in the browser. The `.NET` runtime bundle uses jsDelivr for the same reason (keeping large binaries off Vercel bandwidth), but the existing code comments note that **jsDelivr does not serve `.jar` files**.

This section researches whether any free CDN alternatives can serve a `.jar` from a public GitHub repository.

---

### jsDelivr — ❌ Does NOT support `.jar` files

jsDelivr's CDN (both the npm mode and the GitHub `cdn.jsdelivr.net/gh/` mode) blocks `.jar` files. This is a deliberate security policy: JAR files are executable archives that can be abused for malware distribution. The existing code comment in `cheerpj.ts` correctly reflects this limitation. Several open GitHub issues (e.g. delivr/jsdelivr#22257) confirm the block.

> **The current `cdn.ts` / GitHub-tag CDN pattern used for the .NET assets cannot be reused for `tools.jar`.**

---

### Free CDN Providers with `.jar` Support

#### 1. Statically.io — ✅ Supports `.jar` from public GitHub repos

[Statically.io](https://statically.io) is a free multi-CDN that proxies files from public GitHub repositories (as well as GitLab, Bitbucket, and npm) with correct `Content-Type` headers. Unlike jsDelivr, it does not block binary file extensions including `.jar`.

**URL format**:
```
https://cdn.statically.io/gh/{owner}/{repo}/{tag_or_branch}/{path}
```

**Example for this project** (if `tools.jar` were committed to a `cdn-assets/` path under a release tag):
```
https://cdn.statically.io/gh/dataslope/dataslope@v1.0.3-cdn-assets/cdn-assets/tools.jar
```

**Pros**:
- Free for public projects
- No file-type restrictions for binary files
- Uses multiple CDN edge networks (Cloudflare, Fastly, etc.)
- Same GitHub-tag-backed approach as the existing jsDelivr `cdn.ts` setup
- Can be adopted with minimal code changes

**Cons**:
- Statically.io is a smaller provider than jsDelivr; uptime and long-term sustainability are less certain
- Bandwidth limits apply for excessive usage (abuse threshold not publicly quantified)

---

#### 2. GitHub Releases (raw asset URL) — ✅ Supports `.jar` via GitHub's CDN

GitHub Release assets are served through GitHub's own CDN infrastructure (`objects.githubusercontent.com`) and support any file type including `.jar`.

**URL format**:
```
https://github.com/{owner}/{repo}/releases/download/{tag}/{filename}
```

**Example**:
```
https://github.com/dataslope/dataslope/releases/download/v1.0.3-cdn-assets/tools.jar
```

**Pros**:
- Free, unlimited file types, backed by GitHub's own CDN (Fastly-based)
- Highly reliable and long-lived
- No third-party dependency

**Cons**:
- Release assets must be uploaded via the GitHub Releases UI or the GitHub API (not just committed to the repo); this breaks the simple `git tag && git push` workflow currently used for `cdn.ts`
- URLs are tied to a specific release, not a git tag commit, so the automation is slightly different

---

#### 3. Cloudflare Pages — ✅ Supports `.jar` as a static asset

A free Cloudflare Pages project can serve any static file type including `.jar`. The workflow would be to maintain a separate branch or repo with `tools.jar` and deploy it to Cloudflare Pages via GitHub Actions.

**URL format**:
```
https://{project-name}.pages.dev/tools.jar
```

**Pros**:
- Free tier (unlimited requests, 100,000 req/day for bandwidth-heavy scenarios)
- Backed by Cloudflare's global CDN
- Custom domain possible

**Cons**:
- Requires a separate Cloudflare account and Pages project setup
- File size limit per file: 25 MB (tools.jar is 18 MB, so it fits, but leaves little headroom)
- Slightly more complex pipeline than a git-tag CDN

---

#### 4. raw.githack.com — ⚠️ Technically works but not recommended for production

[raw.githack.com](https://raw.githack.com) serves files from public GitHub repositories with correct content-type headers. It does not restrict file types.

**URL format**:
```
https://rawcdn.githack.com/{owner}/{repo}/{tag}/{path}
```

**Pros**: Simple, no registration required

**Cons**: Smaller infrastructure than Statically.io; not recommended for high-traffic production use; service reliability is unclear

---

### Recommendation for `tools.jar`

| Option | Feasibility | Reliability | Setup Complexity |
|--------|-------------|-------------|-----------------|
| Statically.io | ✅ High | Medium | Low (same pattern as existing cdn.ts) |
| GitHub Releases | ✅ High | High | Medium (release upload step required) |
| Cloudflare Pages | ✅ High | High | Medium (separate Pages project) |
| raw.githack.com | ⚠️ Medium | Low | Low |
| jsDelivr | ❌ Blocked | — | — |

**Top pick**: **Statically.io** offers the closest drop-in replacement for the existing jsDelivr GitHub-tag CDN pattern. Moving `tools.jar` to `cdn-assets/tools.jar` and updating `cheerpj.ts` to fetch from `https://cdn.statically.io/gh/dataslope/dataslope@${CDN_ASSETS_TAG}/cdn-assets/tools.jar` would require minimal code changes.

**Runner-up**: **GitHub Releases** is more reliable and doesn't depend on a third-party CDN, but requires updating the release automation pipeline.

---

*Report generated by Copilot agent on 2026-05-25.*
