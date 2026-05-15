# 2026-05-15 — Structuring the `/learn` Section with Fumadocs for Multiple Mini-Courses

## Context

The `/learn` route is already powered by Fumadocs. The key wiring is:

| File | Role |
|---|---|
| `source.config.ts` | Declares the `docs` MDX collection pointing at `content/learn/` |
| `lib/source.ts` | Wraps the collection with `loader({ baseUrl: "/learn" })` |
| `app/learn/layout.tsx` | `DocsLayout` with sidebar driven by `source.pageTree` |
| `app/learn/[[...slug]]/page.tsx` | Catch-all renderer for every MDX page |
| `content/learn/meta.json` | Top-level sidebar order and separators |

The current content structure is **flat**: one MDX file per language (`python.mdx`, `r.mdx`, `cpp.mdx`, …). Adding mini-courses only requires adopting a **folder-per-course** convention — no changes to `source.config.ts`, `lib/source.ts`, or any app route are needed.

---

## Recommended Directory Structure

```
content/learn/
│
├── index.mdx                        ← Hub / landing page (existing)
├── meta.json                        ← Top-level sidebar order (update this)
│
├── python.mdx                       ← Language overview pages (keep as-is)
├── r.mdx
├── cpp.mdx
├── java.mdx
│   …
│
├── r-ggplot-data-viz/               ← Mini-course: Data Visualization with R's ggplot
│   ├── meta.json
│   ├── index.mdx                    ← Course intro & prerequisites
│   ├── 01-why-ggplot.mdx
│   ├── 02-anatomy-of-a-plot.mdx
│   ├── 03-geoms-and-aesthetics.mdx
│   ├── 04-scales-and-guides.mdx
│   ├── 05-facets.mdx
│   └── 06-themes-and-polish.mdx
│
├── cpp-algorithm-basics/            ← Mini-course: Algorithm Basics with C++
│   ├── meta.json
│   ├── index.mdx
│   ├── 01-complexity-and-big-o.mdx
│   ├── 02-arrays-and-vectors.mdx
│   ├── 03-sorting.mdx
│   ├── 04-binary-search.mdx
│   ├── 05-recursion.mdx
│   └── 06-graph-traversal.mdx
│
└── java-oop/                        ← Mini-course: Object-oriented Programming with Java
    ├── meta.json
    ├── index.mdx
    ├── 01-classes-and-objects.mdx
    ├── 02-constructors-and-fields.mdx
    ├── 03-inheritance.mdx
    ├── 04-interfaces.mdx
    ├── 05-polymorphism.mdx
    └── 06-design-patterns.mdx
```

### Why this works out of the box

Fumadocs' `loader()` scans `content/learn/` recursively. Any subfolder automatically becomes a **sidebar group**. The group title and page order come from the subfolder's own `meta.json`. Nothing else needs to change.

---

## File Templates

### `content/learn/meta.json` (top-level — update)

```json
{
  "title": "Learn",
  "pages": [
    "index",
    "---",
    "python",
    "r",
    "javascript",
    "typescript",
    "php",
    "c",
    "cpp",
    "java",
    "csharp",
    "---",
    "r-ggplot-data-viz",
    "cpp-algorithm-basics",
    "java-oop"
  ]
}
```

Adding each folder name as an entry in `pages` controls where the course group appears in the top-level sidebar list. Separators (`"---"`) create visual dividers between sections.

---

### `content/learn/<course-folder>/meta.json`

```json
{
  "title": "Data Visualization with R's ggplot",
  "pages": [
    "index",
    "01-why-ggplot",
    "02-anatomy-of-a-plot",
    "03-geoms-and-aesthetics",
    "04-scales-and-guides",
    "05-facets",
    "06-themes-and-polish"
  ]
}
```

- `title` becomes the sidebar group label.
- `pages` sets reading order within the course. Omit the `.mdx` extension.

---

### Course landing page — `index.mdx`

```mdx
---
title: Data Visualization with R's ggplot
description: Build publication-quality charts in the browser using WebR and ggplot2.
---

This mini-course walks you through **ggplot2** — R's grammar-of-graphics
plotting library — entirely in the browser via WebR.

## What you'll learn

- The layered grammar of graphics (data → aesthetics → geoms → scales → themes)
- Common chart types: scatter, bar, line, histogram, box plot
- Faceting and small-multiples
- Customizing themes for publication-ready output

## Prerequisites

Basic familiarity with R vectors and data frames is helpful.
See the [R overview](/learn/r) page if you're just getting started.

## Lessons

1. [Why ggplot?](/learn/r-ggplot-data-viz/01-why-ggplot)
2. [Anatomy of a plot](/learn/r-ggplot-data-viz/02-anatomy-of-a-plot)
3. [Geoms and aesthetics](/learn/r-ggplot-data-viz/03-geoms-and-aesthetics)
4. [Scales and guides](/learn/r-ggplot-data-viz/04-scales-and-guides)
5. [Facets](/learn/r-ggplot-data-viz/05-facets)
6. [Themes and polish](/learn/r-ggplot-data-viz/06-themes-and-polish)
```

---

### Lesson page — e.g., `03-geoms-and-aesthetics.mdx`

```mdx
---
title: Geoms and Aesthetics
description: Learn how ggplot2 maps data columns to visual properties and renders them with geometric layers.
---

Every ggplot2 plot is built from **layers**. A layer has two parts:

- **`aes()`** — maps data columns to visual channels (x, y, colour, size, …)
- **`geom_*()`** — decides the geometric shape used to render those values

<CodeBlock
  adapter="r"
  initCode={`library(ggplot2)
data(mpg)`}
  initialCode={`ggplot(mpg, aes(x = displ, y = hwy, colour = class)) +
  geom_point()
`}
/>

Try changing `colour = class` to `size = cyl` and re-running.
```

Lessons follow exactly the same MDX conventions as the existing language overview pages: frontmatter with `title`/`description`, prose, and `<CodeBlock>` components.

---

## URL Scheme

| Content file | URL |
|---|---|
| `content/learn/index.mdx` | `/learn` |
| `content/learn/r.mdx` | `/learn/r` |
| `content/learn/r-ggplot-data-viz/index.mdx` | `/learn/r-ggplot-data-viz` |
| `content/learn/r-ggplot-data-viz/03-geoms-and-aesthetics.mdx` | `/learn/r-ggplot-data-viz/03-geoms-and-aesthetics` |
| `content/learn/cpp-algorithm-basics/04-binary-search.mdx` | `/learn/cpp-algorithm-basics/04-binary-search` |

The numeric prefixes (`01-`, `02-`, …) keep the filesystem order readable without affecting the URL — they are reflected verbatim in the slug, which is fine and even descriptive for learners.

---

## Sidebar Behaviour

With this structure, Fumadocs renders the sidebar with two collapsible sections automatically:

```
Learn
  ├── (Overview)
  ├── Python
  ├── R
  ├── JavaScript
  ├── TypeScript
  ├── PHP
  ├── C
  ├── C++
  ├── Java
  ├── C#
  │
  ├── ▾ Data Visualization with R's ggplot   ← folder group
  │     ├── Introduction
  │     ├── Why ggplot?
  │     ├── Anatomy of a plot
  │     ├── Geoms and aesthetics
  │     ├── Scales and guides
  │     ├── Facets
  │     └── Themes and polish
  │
  ├── ▾ Algorithm Basics with C++
  │     └── …
  │
  └── ▾ Object-oriented Programming with Java
        └── …
```

---

## Optional: Previous / Next Navigation

Fumadocs generates "Previous" / "Next" links automatically based on the `pages` order in `meta.json`. Because each lesson lists the next one, learners get linear navigation for free — no extra code required.

---

## Summary of Changes Required

| What | Action |
|---|---|
| `content/learn/meta.json` | Add course folder names to `pages` array |
| `content/learn/<course>/meta.json` | Create — sets group title and lesson order |
| `content/learn/<course>/index.mdx` | Create — course landing page |
| `content/learn/<course>/<lesson>.mdx` | Create — one file per lesson |
| `source.config.ts` | **No change needed** |
| `lib/source.ts` | **No change needed** |
| `app/learn/**` | **No change needed** |

The entire feature is content-only. Adding a new mini-course is as simple as creating a new folder under `content/learn/`, dropping in a `meta.json` and a handful of MDX files, and adding the folder name to the top-level `meta.json`.
