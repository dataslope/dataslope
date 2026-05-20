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
| **Current** | `0.0.9-alpha-32` |
| **Latest stable** | `0.1.0` |

**No changes made** — `0.1.0` is the latest published stable release, but it introduces breaking changes incompatible with the existing worker-based integration:

- `PhpWeb` in `0.1.0` now uses dynamic `import('./php8.4-web.mjs')` internally (default PHP 8.4), which breaks the Next.js/webpack bundling in the Web Worker context.
- WASM files are now hash-named (e.g., `e31ec3faf3e2323a2b4a448342b50307765b8217.wasm`) and the Emscripten environment assumptions changed.
- The upgrade caused a runtime "Aborted(both async and sync fetching of the wasm failed)" error on every PHP Playground load.

The version was reverted to `0.0.9-alpha-32` (pinned, no `^` range prefix) to prevent accidental future auto-upgrade to the broken `0.1.0`.

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
