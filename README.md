# Playground

A [Next.js](https://nextjs.org/) app that hosts browser-based language playgrounds.

| Route         | Status      | Description                                              |
| ------------- | ----------- | -------------------------------------------------------- |
| `/`           | ✅ live      | Landing page linking to each playground.                 |
| `/python`     | ✅ live      | Python playground powered by [Pyodide][pyodide] (WASM).  |
| `/r`          | ✅ live      | R playground powered by [WebR][webr] 0.5.9 (WASM).       |
| `/javascript` | ✅ live      | JavaScript playground (runs natively in the browser).    |
| `/typescript` | ✅ live      | TypeScript playground (transpiled in-browser by [`typescript`][ts]). |
| `/php`        | ✅ live      | PHP playground powered by [php-wasm](https://github.com/seanmorris/php-wasm) (WASM). |
| `/c`          | ✅ live      | C playground (compiled in-browser to WASM by clang via [`@wasmer/sdk`][wasmer]). |
| `/cpp`        | ✅ live      | C++ playground (compiled in-browser to WASM by clang in C++ driver mode via [`@wasmer/sdk`][wasmer]). |
| `/java`       | ✅ live      | Java playground powered by [CheerpJ][cheerpj] — OpenJDK + `javac` running in WebAssembly. |
| `/csharp`     | ✅ live      | C# playground powered by [Roslyn][roslyn] running on the [.NET WebAssembly runtime][dotnetwasm] (Mono). |
| `/postgres`   | 🔜 planned  | PostgreSQL playground (to be added).                     |

[pyodide]: https://pyodide.org/
[webr]: https://docs.r-wasm.org/webr/latest/
[ts]: https://www.typescriptlang.org/
[wasmer]: https://wasmer.io/
[cheerpj]: https://cheerpj.com/
[roslyn]: https://github.com/dotnet/roslyn
[dotnetwasm]: https://learn.microsoft.com/dotnet/core/wasm/

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
│   │       ├── typescript.tsx    # TypeScript language adapter (in-browser tsc)
│   │       ├── php.tsx           # PHP language adapter (php-wasm)
│   │       ├── c.tsx             # C language adapter (clang/clang via Wasmer)
│   │       ├── cpp.tsx           # C++ language adapter (clang/clang via Wasmer)
│   │       ├── java.tsx          # Java language adapter (CheerpJ)
│   │       └── csharp.tsx        # C# language adapter (Roslyn on .NET WebAssembly)
│   ├── python/page.tsx           # /python route
│   ├── r/page.tsx                # /r route
│   ├── javascript/page.tsx       # /javascript route
│   ├── typescript/page.tsx       # /typescript route
│   ├── php/page.tsx              # /php route
│   ├── c/page.tsx                # /c route
│   ├── cpp/page.tsx              # /cpp route
│   ├── java/page.tsx             # /java route
│   └── csharp/page.tsx           # /csharp route
├── __tests__/
│   ├── javascript.test.ts        # JavaScript runtime execution tests
│   ├── typescript.test.ts        # TypeScript transpile + execution tests
│   └── adapters.test.ts          # Adapter configuration tests (all playgrounds)
├── vitest.config.ts
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
- http://localhost:3000/php — PHP playground
- http://localhost:3000/c — C playground
- http://localhost:3000/cpp — C++ playground
- http://localhost:3000/java — Java playground
- http://localhost:3000/csharp — C# playground

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
| `npm test`      | Run the Vitest test suite.        |

## Testing

The test suite covers:

- **JavaScript runtime** — executes code snippets through the same `AsyncFunction` path the playground uses and asserts on stdout / stderr output.
- **TypeScript runtime** — transpiles with the TypeScript compiler API then executes, verifying type-stripping, generics, top-level `await`, and error reporting.
- **Adapter configuration** — validates that every adapter has required fields (`id`, `examples`, `exportFormats`, `runtimeInfo`) and that examples are non-empty with unique keys.

```bash
npm test
```

The tests run entirely in Node — no browser or WebAssembly runtime is required. Adapters that use WebAssembly runtimes (Python, R, C, C++, PHP, Java, C#) are covered by configuration tests; their actual execution is best verified by loading the playground in a browser.

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
