# Playground

A [Next.js](https://nextjs.org/) app that hosts browser-based language playgrounds.

| Route         | Status      | Description                                              |
| ------------- | ----------- | -------------------------------------------------------- |
| `/`           | ✅ live      | Landing page linking to each playground.                 |
| `/python`     | ✅ live      | Python playground powered by [Pyodide][pyodide] (WASM).  |
| `/r`          | ✅ live      | R playground powered by [WebR][webr] 0.5.9 (WASM).       |
| `/javascript` | ✅ live      | JavaScript playground (runs natively in the browser).    |
| `/typescript` | ✅ live      | TypeScript playground (transpiled in-browser by [`typescript`][ts]). |
| `/postgres`   | 🔜 planned  | PostgreSQL playground (to be added).                     |

[pyodide]: https://pyodide.org/
[webr]: https://docs.r-wasm.org/webr/latest/
[ts]: https://www.typescriptlang.org/

## Project structure

```
.
├── app/                          # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx                  # Landing page (/)
│   ├── _components/              # Shared React components
│   │   ├── Playground.tsx        # The playground UI (editor + output + settings)
│   │   ├── playground.css
│   │   └── runtime/
│   │       ├── python.tsx        # Python language adapter (Pyodide)
│   │       ├── r.tsx             # R language adapter (WebR)
│   │       ├── javascript.tsx    # JavaScript language adapter (native)
│   │       └── typescript.tsx    # TypeScript language adapter (in-browser tsc)
│   ├── python/page.tsx           # /python route     — renders <Playground adapter={pythonAdapter} />
│   ├── r/page.tsx                # /r route          — renders <Playground adapter={rAdapter} />
│   ├── javascript/page.tsx       # /javascript route — renders <Playground adapter={javascriptAdapter} />
│   └── typescript/page.tsx       # /typescript route — renders <Playground adapter={typescriptAdapter} />
├── next.config.ts
├── package.json
└── tsconfig.json
```

Each playground is a React client component that renders the shared
`Playground` UI with a language-specific adapter. The adapter wires up the
runtime — WebAssembly (Pyodide for Python, WebR for R), the native
browser engine (JavaScript), or in-browser transpilation (TypeScript) —
and provides example snippets and the package list.

## Getting started

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Then open:

- http://localhost:3000/ — landing page
- http://localhost:3000/python — Python playground
- http://localhost:3000/r — R playground
- http://localhost:3000/javascript — JavaScript playground
- http://localhost:3000/typescript — TypeScript playground

## Editor settings

Each playground persists its settings in `localStorage` (namespaced per
language). The following settings are available via the ⚙ icon in the header:

| Setting | Default | Description |
| --- | --- | --- |
| Editor Font Size | 13 px | Font size used in the code editor. |
| Output Font Size | (same as editor) | Optionally use a different font size in the output pane. |
| Editor Theme | Dracula | Colour theme for the code editor. |
| Word Wrap | On | Wrap long lines in the editor instead of scrolling horizontally. |

## Scripts

| Script          | Description                       |
| --------------- | --------------------------------- |
| `npm run dev`   | Start the Next.js dev server.     |
| `npm run build` | Build the production bundle.      |
| `npm run start` | Run the production server.        |
| `npm run lint`  | Run ESLint via `next lint`.       |

## Adding a new playground (e.g. `/postgres`)

Playgrounds are built as native Next.js routes using React and npm packages:

1. Create a language adapter at `app/_components/runtime/<name>.tsx` that
   implements the `LanguageAdapter` interface from
   `app/_components/types.ts`. The adapter is responsible for initialising
   the runtime and turning user code into output cells.
2. Add the route at `app/<name>/page.tsx`:

   ```tsx
   "use client";
   import Playground from "../_components/Playground";
   import { postgresAdapter } from "../_components/runtime/postgres";

   export default function PostgresPage() {
     return <Playground adapter={postgresAdapter} />;
   }
   ```

3. Link to it from the landing page in `app/page.tsx`.

Prefer installing runtime libraries from npm. Only fall back to a CDN
`<script>` tag if a library genuinely cannot be installed/bundled (some
WebAssembly runtimes still require fetching their `.wasm` and stdlib assets
from a CDN at runtime — that's fine, but the JavaScript loader itself
should come from an npm package).

## Deployment

The app is a standard Next.js project and deploys to any Next.js-compatible
host. The simplest path is [Vercel](https://vercel.com/):

1. Push this repo to GitHub.
2. Import the repo in Vercel — no configuration is required.
3. Vercel will run `npm run build` and serve the app.

For self-hosting:

```bash
npm run build
npm run start    # serves on http://localhost:3000
```
