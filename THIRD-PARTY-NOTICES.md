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
> get your own legal review before relying on any of this — especially if you
> monetize the site (for example, with advertising).

## ⚠️ CheerpJ (Java runtime) — read this first

The Java playground uses **CheerpJ** by **Leaning Technologies**
(<https://cheerpj.com>), loaded at runtime from Leaning Technologies' CDN
(`cjrtnc.leaningtech.com`).

CheerpJ is **not** open source under an OSI-approved license. It is distributed
under Leaning Technologies' own license terms, which are free for some uses but
**may require a separate commercial license for others**. The MIT license on
Dataslope's code grants you **no** rights to CheerpJ.

**Action required:** review CheerpJ's current licensing and Leaning
Technologies' terms, and obtain any commercial license your use may need —
particularly commercial/for-profit operation of the site, including running
advertising against it. CheerpJ executes OpenJDK, which is licensed under the
**GPLv2 with the Classpath Exception**.

## Language runtimes (loaded at runtime)

| Component | Used for | License (verify with the project) |
| --- | --- | --- |
| Pyodide | Python | MPL-2.0 (bundles CPython and packages under their own licenses) |
| WebR | R | R is GPL-2.0 / GPL-3.0; verify WebR's specific terms |
| php-wasm | PHP | PHP License / project's own terms; verify the specific build |
| Clang → WASM (Wasmer) | C / C++ | LLVM/Clang: Apache-2.0 with LLVM exceptions; Wasmer: MIT |
| CheerpJ + OpenJDK | Java | See the CheerpJ note above; OpenJDK: GPLv2 + Classpath Exception |
| .NET / Mono / Roslyn | C# | MIT (the .NET platform) |
| sql.js | SQLite | sql.js: MIT; SQLite engine: public domain |
| DuckDB-Wasm | DuckDB SQL | MIT |
| PGlite | PostgreSQL (in-browser) | Apache-2.0 / PostgreSQL License |
| @wasm-fmt/clang-format | C/C++ formatting | LLVM (Apache-2.0 with LLVM exceptions); verify the package |

## Application libraries

Dataslope is built on many open-source packages declared in `package.json`,
each under its own license as published on npm — for example Next.js (MIT),
React (MIT), Better Auth (MIT), fumadocs (MIT), cobe (MIT), Tailwind CSS (MIT),
Radix / Base UI primitives and shadcn/Magic UI–derived components (MIT), and
lucide-react (ISC). Refer to each package's own `LICENSE` for the authoritative
terms.

## Datasets and fonts

Sample datasets and any bundled fonts are subject to their respective licenses.
Verify the terms of any dataset or font you redistribute or rely on.
