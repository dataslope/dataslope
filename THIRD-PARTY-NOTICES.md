# Third-Party Notices

Dataslope's own source code is licensed under the MIT License (see [`LICENSE`](./LICENSE))
and its learning content under CC BY 4.0 (see [`LICENSE-CONTENT`](./LICENSE-CONTENT)).
Those licenses do **not** cover the third-party software, language runtimes,
fonts, or other components that Dataslope depends on or loads at runtime. Each
of those retains its own license and terms, summarized below.

Most language runtimes are **downloaded from their providers (or a CDN) in the
user's browser at runtime** and are not redistributed in this repository.

> This list is provided for convenience only and may not be exhaustive or
> perfectly current. Consult each project for its authoritative license, and
> get your own legal review before relying on any of this, especially if you
> monetize the site (for example, with advertising).

## CheerpJ (Java runtime)

The Java playground uses **CheerpJ** by **Leaning Technologies**
(<https://cheerpj.com>), loaded at runtime from Leaning Technologies' CDN
(`cjrtnc.leaningtech.com`).

CheerpJ is proprietary (not OSI-approved open source) and the MIT license on
Dataslope's code grants no rights to it. It is used here under the **CheerpJ
Core Community Edition**, which is free and **allows commercial use for
individuals and one-person companies**, so a solo developer running this site
(including ad-supported) is covered.

Two Community Edition restrictions to stay within, both of which this project's
setup already satisfies:

- **No self-hosting.** CheerpJ must be loaded from Leaning Technologies' CDN,
  which is exactly how it's integrated here (`cjrtnc.leaningtech.com`). Don't
  vendor or self-host the CheerpJ runtime files.
- **No OEM/redistribution.** This repository doesn't bundle or redistribute
  CheerpJ; it only references the CDN loader at runtime.

Re-check CheerpJ's current terms if your situation changes, for example if the
operation grows beyond a one-person company, or if you change how CheerpJ is
loaded, since a paid CheerpJ license may then be required. CheerpJ executes
OpenJDK, which is licensed under the **GPLv2 with the Classpath Exception**.

## Language runtimes (loaded at runtime)

| Component | Used for | License (verify with the project) |
| --- | --- | --- |
| Pyodide | Python | MPL-2.0 (bundles CPython and packages under their own licenses) |
| WebR | R | R is GPL-2.0 / GPL-3.0; verify WebR's specific terms |
| php-wasm | PHP | PHP License / project's own terms; verify the specific build |
| browsercc (Clang/LLD + WASI) | C / C++ | Clang/LLVM: Apache-2.0 with LLVM exceptions; browsercc and @bjorn3/browser_wasi_shim under their own licenses (verify) |
| CheerpJ + OpenJDK | Java | See the CheerpJ note above; OpenJDK: GPLv2 + Classpath Exception |
| .NET / Mono / Roslyn | C# | MIT (the .NET platform) |
| @sqlite.org/sqlite-wasm | SQLite | Apache-2.0 (npm package); SQLite engine: public domain |
| DuckDB-Wasm | DuckDB SQL | MIT |
| PGlite | PostgreSQL (in-browser) | Apache-2.0 / PostgreSQL License |

## Code formatters

The editor's "format code" action uses in-browser WASM formatters, one per
language family. The npm wrapper packages below are all MIT-licensed; the
underlying tools keep their own upstream licenses.

| Package | Formats | License |
| --- | --- | --- |
| @wasm-fmt/clang-format | C, C++, Java, C# | MIT wrapper; clang-format (LLVM): Apache-2.0 with LLVM exceptions |
| @wasm-fmt/web_fmt | JavaScript, TypeScript | MIT |
| @wasm-fmt/mago_fmt | PHP | MIT wrapper; Mago: verify upstream |
| @wasm-fmt/ruff_fmt | Python | MIT wrapper; Ruff (Astral): MIT |
| sql-formatter | SQL (SQLite / Postgres / DuckDB) | MIT |

## Application libraries

Dataslope is built on many open-source packages declared in `package.json`,
each under its own license as published on npm, for example Next.js (MIT),
React (MIT), Better Auth (MIT), fumadocs (MIT), cobe (MIT), Tailwind CSS (MIT),
Radix / Base UI primitives and shadcn/Magic UI-derived components (MIT), and
lucide-react (ISC). Refer to each package's own `LICENSE` for the authoritative
terms.

Build-time only: the lesson charts are rendered by **Observable Plot** (ISC)
into SVG by `scripts/build-charts.mjs`, using **linkedom** (ISC) for a DOM. Both
are devDependencies and neither reaches the browser or the Worker bundle; what
ships is the generated markup, which is Dataslope's own content. Refer to each
package's own `LICENSE` for the authoritative terms.

## Bundled emoji artwork

The home page hero marquee separates its second line with three emoji images
served from `public/emoji/`. These are the 3D variants from **Microsoft Fluent
Emoji**, redistributed under the MIT License.

| File | Emoji | Source asset |
| --- | --- | --- |
| `public/emoji/interactive.webp` | ⚡ High voltage | `assets/High voltage/3D/high_voltage_3d.png` |
| `public/emoji/no-signup.webp` | 🔓 Unlocked | `assets/Unlocked/3D/unlocked_3d.png` |
| `public/emoji/free.webp` | 💯 Hundred points | `assets/Hundred points/3D/hundred_points_3d.png` |

> Copyright (c) Microsoft Corporation.
>
> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the conditions of the MIT License.

Source: https://github.com/microsoft/fluentui-emoji (MIT). The files here are
resized to 160px and re-encoded as WebP; the artwork is otherwise unmodified.

Why these are bundled rather than typed as characters: written as literal
emoji, each platform substitutes its own font, so the line reads differently on
Windows and macOS. Windows draws them from Segoe UI Emoji, which is proprietary
and not licensed for embedding — Fluent Emoji is the same design language
released by Microsoft under MIT, so bundling it gives one drawing everywhere
without redistributing a proprietary font.

## Datasets and fonts

Sample datasets and any bundled fonts are subject to their respective licenses.
Verify the terms of any dataset or font you redistribute or rely on.
