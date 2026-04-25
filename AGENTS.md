# AGENTS.md

Guidance for AI coding agents (and humans) contributing to this repository.

## What this project is

A small Next.js 16 (App Router, TypeScript) app that hosts browser-based
language playgrounds at dedicated routes. Today it ships:

- `/` — landing page (`app/page.tsx`).
- `/python` — Python playground powered by Pyodide (WebAssembly).
- `/r` — R playground powered by WebR (WebAssembly).
- `/javascript` — JavaScript playground (runs natively in the browser via
  the `AsyncFunction` constructor).
- `/typescript` — TypeScript playground (transpiled in-browser using the
  official `typescript` compiler API, then executed natively).

All playgrounds are React client components built on top of the shared
`Playground` component in `app/_components/Playground.tsx`.

### Planned playgrounds

The following playgrounds are on the roadmap and should follow the same
React + npm pattern when implemented:

| Route | Language | Suggested runtime / npm package |
|---|---|---|
| `/sqlite` | SQLite | [`sql.js`](https://www.npmjs.com/package/sql.js) (SQLite compiled to WebAssembly) or [`@sqlite.org/sqlite-wasm`](https://www.npmjs.com/package/@sqlite.org/sqlite-wasm) |
| `/postgres` | PostgreSQL | [`@electric-sql/pglite`](https://www.npmjs.com/package/@electric-sql/pglite) (PostgreSQL compiled to WebAssembly) |
| `/c` | C | [LLVM / Clang via WebAssembly](https://mbebenita.github.io/WasmExplorer/) or [`wasm-clang`](https://www.npmjs.com/package/wasm-clang) |

This table is guidance, not a mandate — pick the npm package that best fits
the playground's needs when you implement it.

## Conventions

- **Build playgrounds with React and npm packages, not static HTML.** Each
  playground lives at `app/<name>/page.tsx`, renders the shared
  `<Playground adapter={...} />`, and pulls its runtime in from npm. Do
  **not** introduce static HTML files in `public/` for new playgrounds —
  there is no longer a `public/` rewrite pattern.
- **Add a language adapter, not a new UI.** New playgrounds implement the
  `LanguageAdapter` interface in `app/_components/types.ts` (examples,
  packages, `init()` and a `run()` that emits output cells). The shared
  `Playground` component handles the editor, settings, output rendering,
  and theming.
- **TypeScript is strict** (`tsconfig.json`). Don't disable strict mode or
  add `any` to silence errors; fix the underlying type instead.
- **Add new dependencies deliberately.** Prefer existing libraries before
  adding new ones, and avoid pulling in heavyweight runtimes that
  duplicate something already wired up.
- **Don't introduce build/lint/test tooling beyond what's already configured**
  (`next build`, `next lint`).

## Adding a new playground

1. Implement a `LanguageAdapter` in
   `app/_components/runtime/<name>.tsx`. The adapter owns runtime init
   (`init()`) and execution (`run(code, emit)`), plus the example list and
   package metadata shown in the UI.
2. Create the route at `app/<name>/page.tsx`:

   ```tsx
   "use client";
   import Playground from "../_components/Playground";
   import { fooAdapter } from "../_components/runtime/foo";

   export default function FooPage() {
     return <Playground adapter={fooAdapter} />;
   }
   ```

3. Link to it from the landing page in `app/page.tsx`.

Install runtime libraries from npm whenever possible. Some runtimes (e.g.
WebAssembly-based ones like Pyodide, WebR, PGlite) need to fetch their
`.wasm` / stdlib assets from a CDN at runtime — that's fine — but the
JavaScript loader itself should come from an npm dependency.

**Execution model by language type:**

- **WebAssembly runtimes** (Python, R, SQLite, PostgreSQL, C): load a `.wasm`
  binary at runtime; the JS wrapper comes from npm.
- **Native browser runtimes** (JavaScript): execute directly in the browser
  sandbox (e.g. via `Function` or a sandboxed `<iframe>`); no extra runtime
  package is needed.
- **Transpiled runtimes** (TypeScript): compile to JS in-browser using the
  TypeScript compiler API from npm, then execute the output natively.

## Verifying changes

Before finalizing any change, run:

```bash
npm install        # if dependencies changed
npm run lint
npm run build
```

For routing or rewrite changes, also smoke-test the dev server:

```bash
npm run dev
# then curl / open http://localhost:3000/<route>
```

## Things to avoid

- Don't create new playgrounds as static HTML files in `public/`. Build
  them as React routes under `app/<name>/page.tsx`.
- Don't add server-side processing for the language playgrounds —
  execution happens entirely in the browser (via WebAssembly, native browser
  APIs, or in-browser compilation depending on the language).
- Don't commit `node_modules/`, `.next/`, or `.env*` files (see
  `.gitignore`).
