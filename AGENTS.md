# AGENTS.md

Guidance for AI coding agents (and humans) contributing to this repository.

## What this project is

A small Next.js 16 (App Router, TypeScript) app that hosts browser-based
language playgrounds at dedicated routes. Today it ships:

- `/` — landing page (`app/page.tsx`).
- `/python` — Python playground powered by Pyodide (WebAssembly).
- `/r` — R playground powered by WebR (WebAssembly).

Both playgrounds are React client components built on top of the shared
`Playground` component in `app/_components/Playground.tsx`. A `/postgres`
playground is planned and should follow the same React + npm pattern.

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

Install runtime libraries from npm whenever possible. Some WebAssembly
runtimes still need to fetch their `.wasm` / stdlib assets from a CDN at
runtime — that's fine — but the JavaScript loader itself should come from
an npm dependency.

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
  execution happens entirely in the browser via WebAssembly.
- Don't commit `node_modules/`, `.next/`, or `.env*` files (see
  `.gitignore`).
