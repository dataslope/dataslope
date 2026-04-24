# AGENTS.md

Guidance for AI coding agents (and humans) contributing to this repository.

## What this project is

A small Next.js 15 (App Router, TypeScript) app that hosts browser-based
language playgrounds at dedicated routes. Today it ships:

- `/` — landing page (`app/page.tsx`).
- `/python` — the Python playground, served from `public/python.html` via a
  rewrite defined in `next.config.ts`.

A `/postgres` playground is planned and should follow the same pattern.

## Conventions

- **Keep self-contained playgrounds as static HTML in `public/`.** The Python
  playground is one ~64 KB HTML file with inline CSS/JS that loads Pyodide,
  CodeMirror, and Plotly from CDNs. Do **not** rewrite it into React
  components unless explicitly asked. To expose it at a clean URL, add a
  rewrite in `next.config.ts` (`/foo` → `/foo.html`).
- **Routes use the App Router** (`app/<segment>/page.tsx`). Use this form
  when a playground genuinely benefits from React/SSR; otherwise prefer the
  static-HTML pattern above.
- **TypeScript is strict** (`tsconfig.json`). Don't disable strict mode or
  add `any` to silence errors; fix the underlying type instead.
- **No new dependencies unless necessary.** The whole point of the
  static-HTML approach is to avoid pulling Pyodide/CodeMirror into the bundle.
- **Don't introduce build/lint/test tooling beyond what's already configured**
  (`next build`, `next lint`).

## Adding a new playground

Prefer the drop-in static HTML pattern:

1. Put the self-contained HTML at `public/<name>.html`.
2. Add `{ source: "/<name>", destination: "/<name>.html" }` to the `rewrites()`
   array in `next.config.ts`.
3. Link to it from the landing page in `app/page.tsx`.

Only reach for `app/<name>/page.tsx` when the playground needs React state,
data fetching, or other Next.js features.

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

- Don't move `public/python.html` or rename it without updating the rewrite
  in `next.config.ts`; the URL `/python` is the public contract.
- Don't add server-side processing for the Python playground — execution
  happens entirely in the browser via Pyodide (WebAssembly).
- Don't commit `node_modules/`, `.next/`, or `.env*` files (see `.gitignore`).
