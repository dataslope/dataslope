# Playground

A [Next.js](https://nextjs.org/) app that hosts browser-based language playgrounds.

| Route       | Status      | Description                                              |
| ----------- | ----------- | -------------------------------------------------------- |
| `/`         | ✅ live      | Landing page linking to each playground.                 |
| `/python`   | ✅ live      | Python playground powered by [Pyodide][pyodide] (WASM).  |
| `/postgres` | 🔜 planned  | PostgreSQL playground (to be added).                     |

[pyodide]: https://pyodide.org/

## Project structure

```
.
├── app/                  # Next.js App Router
│   ├── layout.tsx
│   └── page.tsx          # Landing page (/)
├── public/
│   └── python.html       # Self-contained Python playground (served at /python)
├── next.config.ts        # Defines the /python → /python.html rewrite
├── package.json
└── tsconfig.json
```

The Python playground is intentionally kept as a single self-contained HTML
file in `public/python.html`. It loads CodeMirror, Plotly, and Pyodide from
public CDNs, so no bundler integration is required. A Next.js
[rewrite](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites)
in `next.config.ts` maps the user-facing URL `/python` to that file.

## Getting started

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Then open:

- http://localhost:3000/ — landing page
- http://localhost:3000/python — Python playground

## Scripts

| Script          | Description                       |
| --------------- | --------------------------------- |
| `npm run dev`   | Start the Next.js dev server.     |
| `npm run build` | Build the production bundle.      |
| `npm run start` | Run the production server.        |
| `npm run lint`  | Run ESLint via `next lint`.       |

## Adding a new playground (e.g. `/postgres`)

You have two options, mirroring how `/python` is wired up today.

**Option A — drop-in static HTML (matches `/python`)**

1. Add your self-contained HTML file at `public/postgres.html`.
2. Add a rewrite in `next.config.ts`:

   ```ts
   { source: "/postgres", destination: "/postgres.html" },
   ```

3. Add a link to it from `app/page.tsx`.

**Option B — native Next.js route**

1. Create `app/postgres/page.tsx` (and any client components it needs).
2. Add a link to it from `app/page.tsx`.

## Deployment

The app is a standard Next.js 15 project and deploys to any Next.js-compatible
host. The simplest path is [Vercel](https://vercel.com/):

1. Push this repo to GitHub.
2. Import the repo in Vercel — no configuration is required.
3. Vercel will run `npm run build` and serve the app.

For self-hosting:

```bash
npm run build
npm run start    # serves on http://localhost:3000
```
