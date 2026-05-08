# Dataslope Playground

A [Next.js](https://nextjs.org/) app that hosts browser-based language playgrounds and interactive learning content.

## Routes

| Route | Status | Description |
| --- | --- | --- |
| `/` | ✅ live | Landing page linking to the playground, learn section, and GitHub. |
| `/playground` | ✅ live | Playground index — links to each language playground. |
| `/playground/python` | ✅ live | Python playground powered by [Pyodide][pyodide] (WASM). |
| `/playground/r` | ✅ live | R playground powered by [WebR][webr] 0.5.9 (WASM). |
| `/playground/javascript` | ✅ live | JavaScript playground (runs natively in the browser). |
| `/playground/typescript` | ✅ live | TypeScript playground (transpiled in-browser by [`typescript`][ts]). |
| `/playground/php` | ✅ live | PHP playground powered by [php-wasm](https://github.com/seanmorris/php-wasm) (WASM). |
| `/playground/c` | ✅ live | C playground (compiled in-browser to WASM by clang via [`@wasmer/sdk`][wasmer]). |
| `/playground/cpp` | ✅ live | C++ playground (compiled in-browser to WASM by clang in C++ driver mode via [`@wasmer/sdk`][wasmer]). |
| `/playground/java` | ✅ live | Java playground powered by [CheerpJ][cheerpj] — OpenJDK + `javac` running in WebAssembly. |
| `/playground/csharp` | ✅ live | C# playground powered by [Roslyn][roslyn] running on the [.NET WebAssembly runtime][dotnetwasm] (Mono). |
| `/learn` | ✅ live | MDX-based learning section powered by [Fumadocs][fumadocs]. |
| `/playground/sqlite` | ✅ live | SQLite playground powered by [sql.js][sqljs] (WASM). |
| `/playground/postgres` | ✅ live | PostgreSQL playground shell (mocked — connect to a remote database). |

[pyodide]: https://pyodide.org/
[webr]: https://docs.r-wasm.org/webr/latest/
[ts]: https://www.typescriptlang.org/
[wasmer]: https://wasmer.io/
[cheerpj]: https://cheerpj.com/
[roslyn]: https://github.com/dotnet/roslyn
[dotnetwasm]: https://learn.microsoft.com/dotnet/core/wasm/
[sqljs]: https://sql.js.org/
[fumadocs]: https://fumadocs.vercel.app/

## Project structure

```
.
├── app/                          # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx                  # Landing page (/) — links to /playground, /learn, GitHub
│   ├── root.module.css
│   ├── _components/              # Shared React components
│   │   ├── Playground.tsx        # The full playground UI (editor + output + settings)
│   │   ├── playground.css
│   │   ├── playgrounds.ts        # Canonical list of all playground routes (used by header dropdown)
│   │   ├── CodeBlock.tsx         # Compact executable code block for embedding in /learn pages
│   │   ├── CodeBlock.module.css
│   │   ├── MdxCodeBlock.tsx      # MDX wrapper that resolves string adapter IDs for CodeBlock
│   │   ├── ErDiagramPane.tsx     # ER diagram pane for the SQLite playground (elkjs layout)
│   │   ├── SqlPlayground.tsx     # Re-exports the SQLite playground from sql/
│   │   ├── runtimeRegistry.ts    # Shared runtime registry (one runtime per language per page)
│   │   ├── types.ts              # Shared TypeScript interfaces (LanguageAdapter, OutputCell…)
│   │   ├── postgres/             # PostgreSQL playground UI components and store
│   │   │   ├── PostgresPlayground.tsx
│   │   │   ├── components/
│   │   │   └── stores/
│   │   ├── sql/                  # SQLite playground UI components and store
│   │   │   ├── SqlPlayground.tsx # Full SQLite playground (editor, results, schema browser, ER diagram)
│   │   │   ├── sqlCompletion.ts  # CodeMirror SQL autocomplete backed by schema
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── stores/
│   │   │   └── utils/
│   │   └── runtime/
│   │       ├── adapters.ts       # Registry mapping adapter IDs to adapter instances
│   │       ├── sqlite.ts         # SQLite engine wrapper (sql.js WASM)
│   │       ├── python.tsx        # Python language adapter (Pyodide)
│   │       ├── r.tsx             # R language adapter (WebR)
│   │       ├── javascript.tsx    # JavaScript language adapter (native)
│   │       ├── typescript.tsx    # TypeScript language adapter (in-browser tsc)
│   │       ├── php.tsx           # PHP language adapter (php-wasm)
│   │       ├── c.tsx             # C language adapter (clang via Wasmer)
│   │       ├── cpp.tsx           # C++ language adapter (clang via Wasmer)
│   │       ├── java.tsx          # Java language adapter (CheerpJ)
│   │       └── csharp.tsx        # C# language adapter (Roslyn on .NET WebAssembly)
│   ├── learn/                    # /learn route (Fumadocs-powered)
│   │   ├── layout.tsx            # Fumadocs DocsLayout + RootProvider
│   │   ├── learn.css             # Tailwind/Fumadocs CSS (scoped to /learn)
│   │   └── [[...slug]]/page.tsx  # Catch-all MDX page renderer
│   └── playground/
│       ├── page.tsx              # Playground index
│       ├── python/page.tsx
│       ├── r/page.tsx
│       ├── javascript/page.tsx
│       ├── typescript/page.tsx
│       ├── php/page.tsx
│       ├── c/page.tsx
│       ├── cpp/page.tsx
│       ├── java/page.tsx
│       ├── csharp/page.tsx
│       ├── sqlite/page.tsx
│       └── postgres/page.tsx
├── content/learn/                # MDX content for the /learn section
│   └── **/*.mdx
├── lib/
│   └── source.ts                 # Fumadocs loader — maps MDX files to page tree
├── mdx-components.tsx            # MDX component overrides (registers MdxCodeBlock)
├── source.config.ts              # Fumadocs collection definition
├── __tests__/
│   ├── javascript.test.ts        # JavaScript runtime execution tests
│   ├── typescript.test.ts        # TypeScript transpile + execution tests
│   ├── sqlCompletion.test.ts     # SQL autocomplete logic tests
│   └── adapters.test.ts          # Adapter configuration tests (all playgrounds)
├── vitest.config.ts
├── next.config.ts
├── package.json
└── tsconfig.json
```

Each playground is a React client component that renders the shared `Playground` UI with a language-specific adapter. The adapter wires up the runtime — WebAssembly (Pyodide for Python, WebR for R, sql.js for SQLite), the native browser engine (JavaScript), or in-browser transpilation (TypeScript) — and provides example snippets and the package list.

The SQLite playground (`sql/`) is a more specialised experience: it exposes a schema browser sidebar, tabbed query results, paginated result sets, an ER diagram view (via [elkjs](https://github.com/kieler/elkjs)), CSV/JSON/Parquet/Excel export, and a set of bundled sample databases.

The `/learn` section is powered by [Fumadocs](https://fumadocs.vercel.app/). MDX files under `content/learn/` become pages at `/learn/...`. Authors can embed executable code blocks in MDX using `<CodeBlock>` (via `MdxCodeBlock`), which shares the same language runtimes as the full playground — multiple blocks for the same language on one page share a single runtime instance.

## Getting started

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Then open:

- http://localhost:3000/ — landing page
- http://localhost:3000/playground — playground index
- http://localhost:3000/playground/python — Python playground
- http://localhost:3000/playground/r — R playground
- http://localhost:3000/playground/javascript — JavaScript playground
- http://localhost:3000/playground/typescript — TypeScript playground
- http://localhost:3000/playground/php — PHP playground
- http://localhost:3000/playground/c — C playground
- http://localhost:3000/playground/cpp — C++ playground
- http://localhost:3000/playground/java — Java playground
- http://localhost:3000/playground/csharp — C# playground
- http://localhost:3000/playground/sqlite — SQLite playground
- http://localhost:3000/playground/postgres — PostgreSQL playground
- http://localhost:3000/learn — learning section

## Editor settings

Each playground persists its settings in `localStorage` (namespaced per language). The following settings are available via the ⚙ icon in the header:

| Setting | Default | Description |
| --- | --- | --- |
| Editor Font Size | 13 px | Font size used in the code editor. |
| Output Font Size | (same as editor) | Optionally use a different font size in the output pane. |
| Editor Theme | Dracula | Colour theme for the code editor. |
| Word Wrap | On | Wrap long lines in the editor instead of scrolling horizontally. |

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Next.js dev server (also runs `fumadocs-mdx` to regenerate `.source/`). |
| `npm run build` | Build the production bundle (also runs `fumadocs-mdx`). |
| `npm run start` | Run the production server. |
| `npm run lint` | Run ESLint via `next lint`. |
| `npm test` | Run the Vitest test suite. |

## Testing

The test suite covers:

- **JavaScript runtime** — executes code snippets through the same `AsyncFunction` path the playground uses and asserts on stdout / stderr output.
- **TypeScript runtime** — transpiles with the TypeScript compiler API then executes, verifying type-stripping, generics, top-level `await`, and error reporting.
- **SQL autocomplete** — unit-tests the CodeMirror SQL completion source (`createSqlCompletionSource`) against a mock schema, covering keyword completions, table/column suggestions, and view-aware logic.
- **Adapter configuration** — validates that every adapter has required fields (`id`, `examples`, `exportFormats`, `runtimeInfo`) and that examples are non-empty with unique keys.

```bash
npm test
```

The tests run entirely in Node — no browser or WebAssembly runtime is required. Adapters that use WebAssembly runtimes (Python, R, C, C++, PHP, Java, C#) are covered by configuration tests; their actual execution is best verified by loading the playground in a browser.

## Embedding executable code blocks in MDX (`/learn`)

The `<CodeBlock>` component lets you embed a runnable code snippet anywhere in an MDX learning page. It uses a compact version of the playground UI (editor + Run / Reset / Copy buttons + output panel) with the same language runtimes.

In MDX, use the `<CodeBlock>` shorthand registered by `mdx-components.tsx`:

```mdx
import { pythonAdapter } from "@/app/_components/runtime/python";

<CodeBlock adapter={pythonAdapter} initialCode={`print("hello")`} />
```

Or use the string-ID version (`MdxCodeBlock`) that resolves the adapter from the registry:

```mdx
<CodeBlock adapter="python" initialCode={`print("hello")`} />
```

Optional props:
- `label` — human-readable label shown in the block header (defaults to an auto-generated id like `PyBlock-49b7`).
- `initCode` — read-only initialization code (imports, fixtures) prepended to the user-editable code on every Run, rendered in a collapsed panel.

## Adding a new playground (e.g. `/playground/lua`)

Playgrounds are built as native Next.js routes using React and npm packages:

1. Create a language adapter at `app/_components/runtime/<name>.tsx` that implements the `LanguageAdapter` interface from `app/_components/types.ts`. The adapter is responsible for initialising the runtime and turning user code into output cells.
2. Add the route at `app/playground/<name>/page.tsx`:

   ```tsx
   "use client";
   import Playground from "../../_components/Playground";
   import { luaAdapter } from "../../_components/runtime/lua";

   export default function LuaPage() {
     return <Playground adapter={luaAdapter} />;
   }
   ```

3. Register the playground in `app/_components/playgrounds.ts` so it appears in the header dropdown.
4. Link to it from the playground index in `app/playground/page.tsx`.

Prefer installing runtime libraries from npm. Only fall back to a CDN `<script>` tag if a library genuinely cannot be installed/bundled (some WebAssembly runtimes still require fetching their `.wasm` and stdlib assets from a CDN at runtime — that's fine, but the JavaScript loader itself should come from an npm package).

## Deployment

The app is a standard Next.js project and deploys to any Next.js-compatible host. The simplest path is [Vercel](https://vercel.com/):

1. Push this repo to GitHub.
2. Import the repo in Vercel — no configuration is required.
3. Vercel will run `npm run build` and serve the app.

For self-hosting:

```bash
npm run build
npm run start    # serves on http://localhost:3000
```

