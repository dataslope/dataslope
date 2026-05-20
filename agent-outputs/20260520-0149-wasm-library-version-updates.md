# WASM Library Version Updates

**Date:** 2026-05-20

## Summary

Updated Pyodide, WebR, php-wasm, and duckdb-wasm to their latest stable versions. PGlite was already at the latest stable version and required no changes.

---

## Changes Made

### Pyodide
| | Version |
|---|---|
| **Before** | `0.29.3` |
| **After** | `0.29.4` |

**Files changed:**
- `package.json` — dependency version bumped from `^0.29.3` to `^0.29.4`
- `app/_components/runtime/pyodide-worker.ts` — `PYODIDE_VERSION` constant updated from `"v0.29.3"` to `"v0.29.4"` (used to build the CDN index URL)

---

### WebR
| | Version |
|---|---|
| **Before** | `0.5.9` |
| **After** | `0.6.0` |

**Files changed:**
- `package.json` — dependency version bumped from `^0.5.9` to `^0.6.0`

---

### php-wasm
| | Version |
|---|---|
| **Before** | `0.0.9-alpha-32` |
| **After** | `0.1.0` |

**Files changed:**
- `package.json` — dependency version bumped from `0.0.9-alpha-32` to `0.1.0` (still pinned, no `^` prefix).
- `app/_components/runtime/php-worker.ts`:
  - `PHP_WASM_VERSION` bumped to `0.1.0`.
  - CDN switched from `cdn.jsdelivr.net` to `unpkg.com` — jsDelivr now 403s on every file in this package because php-wasm 0.1.0 exceeds the 150 MB package cap (see [seanmorris/php-wasm#103](https://github.com/seanmorris/php-wasm/issues/103)). unpkg has no equivalent limit and is the upstream-recommended fallback.
  - `PhpWeb.mjs` is now imported directly from the CDN URL with `webpackIgnore` / `turbopackIgnore` magic comments instead of via the bundled `php-wasm/PhpWeb` subpath. Reason: the v0.1.0 `PhpWeb` constructor uses dynamic `import('./phpX.Y-web.mjs')` to pick the runtime, and the bundler can't rewrite those relative specifiers into a worker chunk that resolves at the right base URL. Loading the entry point straight from unpkg keeps the whole module graph (`PhpWeb.mjs` → `php8.4-web.mjs` → hashed `.wasm`) on a single origin where `import.meta.url` and `locateFile` agree.
  - `locateFile` now returns `undefined` for `libxml2.so` instead of resolving it to a CDN URL. PhpBase in 0.1.0 has a built-in `libxml2.so → data:,` suppression that only triggers when the user-supplied `locateFile` returns `undefined`; otherwise the request 404s on every init.
  - Local `PhpWebInstance` interface removed in favour of the now-shipped TypeScript types (`import("php-wasm/PhpWeb").PhpWeb`).
- `app/_components/runtime/modules.d.ts` — the `declare module "php-wasm/PhpWeb.mjs"` shim is deleted; the package now ships its own `.d.mts` files.

**Verification:** Playwright e2e (`PHP runs the default example`) passes; a manual CDP probe of `/playground/php` shows the default Hello-World example printing under PHP 8.4.1 with no console errors, no failed network requests, and no `Aborted(both async and sync fetching of the wasm failed)`.

**Incidental fix surfaced during verification:** the inline theme-bootstrap script in `app/layout.tsx` had a template-literal bug — `\/playground(?:\/|$)` collapses to `/playground(?:/|$)` after JS parsing, which renders an unterminated regex literal and throws `SyntaxError: Invalid regular expression flags` on **every** page of the site. Doubled the backslashes (`\\/`) in the template literal so the emitted inline script reads `/^\/playground(?:\/|$)/`. Pre-existing bug, unrelated to the php-wasm upgrade, but is in this diff because the same probe session caught it.

---

### PGlite (`@electric-sql/pglite`)
| | Version |
|---|---|
| **Current** | `0.4.5` |
| **Latest stable** | `0.4.5` |

**No changes required** — already at the latest stable version.

---

### duckdb-wasm (`@duckdb/duckdb-wasm`)
| | Version |
|---|---|
| **Before** | `1.30.0` |
| **After** | `1.32.0` |

**Files changed:**
- `app/_components/runtime/duckdb.ts` — `DUCKDB_VERSION` constant updated from `"1.30.0"` to `"1.32.0"` (used to build the jsDelivr CDN URL; this package is loaded from CDN at runtime, not installed via npm)

---

## Notes

- `package-lock.json` was regenerated via `npm install` after the `package.json` changes.
- The duckdb-wasm latest stable version is `1.32.0`; the `1.33.x-dev*` releases on npm are pre-release development builds and were intentionally skipped.
