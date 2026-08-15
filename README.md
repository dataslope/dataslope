<div align="center">

<img src="public/dataslope-blue@4x.png" alt="" width="96">

# Dataslope

**Courses and coding playgrounds that run entirely in your browser.**<br>
No install, no setup, no sign-up, no paywall.

[**dataslope.com**](https://dataslope.com) | [Courses](https://dataslope.com/courses) | [Interview Prep](https://dataslope.com/interview-prep) | [Playgrounds](https://dataslope.com/playground) | [Pricing](https://dataslope.com/pricing)

</div>

<br>

<img src="docs/screenshots/home.webp" alt="The Dataslope home page">

## What this is

Dataslope is a site for learning programming, data work, and databases. It has two
halves, and they share the same engine:

- **Courses.** Written lessons with runnable code, auto-graded challenges, and
  quizzes built into the page you are reading.
- **Playgrounds.** Full editors for fourteen languages and database engines, one
  click from the nav bar.

Every runtime is compiled to WebAssembly and executes on your own machine. There is
no queue, no container to provision, and no round trip to a build server: open a
lesson and a real Python, C++, or PostgreSQL runtime boots next to the text.

Today the site holds **32 courses** and **six interview-prep tracks**, roughly 900
pages carrying **3,800+ runnable code blocks**, **800+ auto-graded challenges**, and
**3,200+ multiple-choice questions**.

<img src="docs/screenshots/home-stats.webp" alt="Home page cards: 32 free courses, free interview prep, 800+ code challenges, 3,800+ runnable code blocks">

## Nothing is gated, and nothing will be

Every lesson, exercise, challenge, quiz, and playground is readable and runnable
**with no account**. Not a trial, not a preview, not the first three chapters. All of
it. Anonymous readers get the same statically served pages a signed-in member does.

This is a commitment, not a current state of affairs. From the
[Terms](https://dataslope.com/terms):

> All learning content available today is completely free; we may introduce
> additional or optional paid features in the future, but doing so will not require
> payment to access the content that is currently free.

An account is optional and free. It adds cloud saves for your workspaces, manageable
share links, and a small daily allowance of the in-app "Ask AI" assistant. That is
the entire difference. There is no paid tier today, and the learning content is not
what a paid tier would ever be for. The details, including the storage limits and the
capacity caveats, are spelled out on the [pricing page](https://dataslope.com/pricing).

## Unlimited code executions

Because the runtimes are WebAssembly running in your tab, there is nothing to meter.
Run a snippet once or ten thousand times; it costs the site nothing, so there is no
execution quota, no daily limit, and no "you have 3 runs left today" banner. Your
code stays in the browser unless you explicitly save or share it.

The practical upshot: you can sit on one lesson and keep changing a number until the
output finally makes sense. That is usually where the learning happens.

## Languages and engines

The same fourteen runtimes power the playgrounds, the lesson code blocks, and the
challenges.

| | Language | Version | Runs on |
| :---: | --- | --- | --- |
| <img src="https://cdn.simpleicons.org/python/3776ab" width="18" alt=""> | **Python** | 3.14 | Pyodide (CPython compiled to WASM), with NumPy, pandas, Plotly, Matplotlib |
| <img src="https://cdn.simpleicons.org/r/276dc3" width="18" alt=""> | **R** | 4.6 | WebR, with ggplot2, dplyr and friends |
| <img src="https://cdn.simpleicons.org/javascript/f7df1e" width="18" alt=""> | **JavaScript** | ES2023+ | The browser's own engine |
| <img src="https://cdn.simpleicons.org/typescript/3178c6" width="18" alt=""> | **TypeScript** | 5.9 | In-browser transpilation, with a real language service |
| <img src="https://cdn.simpleicons.org/php/777bb4" width="18" alt=""> | **PHP** | 8.4 | php-wasm |
| <img src="https://cdn.simpleicons.org/c/a8b9cc" width="18" alt=""> | **C** | C17 | Clang, compiled to WASM in the tab |
| <img src="https://cdn.simpleicons.org/cplusplus/00599c" width="18" alt=""> | **C++** | C++20 | Clang, compiled to WASM in the tab |
| <img src="https://cdn.simpleicons.org/openjdk/ed8b00" width="18" alt=""> | **Java** | 8 | CheerpJ (OpenJDK) |
| <img src="https://cdn.simpleicons.org/sharp/9b4f96" width="18" alt=""> | **C#** | 13 on .NET 10 | Roslyn on .NET WebAssembly |
| <img src="https://cdn.simpleicons.org/html5/e34f26" width="18" alt=""> | **HTML / CSS** | HTML5, CSS3 | Live preview of your own markup |
| <img src="https://cdn.simpleicons.org/react/61dafb" width="18" alt=""> | **React** | 19.2 | JSX bundled in the browser |
| <img src="https://cdn.simpleicons.org/postgresql/4169E1" width="18" alt=""> | **PostgreSQL** | 17 | PGlite |
| <img src="https://cdn.simpleicons.org/sqlite/003b57" width="18" alt=""> | **SQLite** | 3.53 | The official SQLite WASM build |
| <img src="https://cdn.simpleicons.org/duckdb/FFBE11" width="18" alt=""> | **DuckDB** | 1.32 | DuckDB-Wasm |

<img src="docs/screenshots/playground-index.webp" alt="The playground index, grouped into Code Editors, Web Sandboxes, and SQL Workbench">

## Playgrounds

<img src="public/images/playground-hero-cutout.webp" alt="" width="420" align="right">

Three kinds, depending on what you are doing:

- **Code editors** for the general-purpose languages: file tabs, a real multi-file
  project, autocomplete, formatting, and an output pane that understands text, data
  frames, charts, and figures.
- **Web sandboxes** for HTML/CSS/JS and React, with a live preview beside the
  editor.
- **A SQL workbench** with a schema browser, query tabs, an editable result grid,
  `EXPLAIN`, and sample databases already loaded.

<br clear="right">

### General-purpose code editors

Multi-file projects with tabs, not a single textarea. Run the file you are on, or
pick another entry point from the Run menu.

<img src="docs/screenshots/pg-python.webp" alt="Python playground running a Plotly chart">

<img src="docs/screenshots/pg-r.webp" alt="R playground rendering a ggplot2 scatter plot">

<details>
<summary><b>More languages</b>: C, C++, Java, C#, JavaScript, TypeScript, PHP</summary>

<br>

**C++.** Clang compiles to WebAssembly in the tab, and the binary never leaves your
machine.

<img src="docs/screenshots/pg-cpp.webp" alt="C++ playground running an STL sorting example">

**Java.** OpenJDK by way of CheerpJ.

<img src="docs/screenshots/pg-java.webp" alt="Java playground running a streams and lambdas example">

**C#.** Roslyn on the .NET WebAssembly runtime.

<img src="docs/screenshots/pg-csharp.webp" alt="C# playground running a LINQ example">

**C.** The same Clang toolchain, C17.

<img src="docs/screenshots/pg-c.webp" alt="C playground running a pointers and heap example">

**JavaScript.** The browser's own engine, with Node-style module resolution.

<img src="docs/screenshots/pg-javascript.webp" alt="JavaScript playground running an array methods example">

**TypeScript.** Transpiled in the browser, backed by a real language service.

<img src="docs/screenshots/pg-typescript.webp" alt="TypeScript playground running an interfaces and generics example">

**PHP.** php-wasm, 8.4.

<img src="docs/screenshots/pg-php.webp" alt="PHP playground running an arrays example">

</details>

### Web and React sandboxes

HTML, CSS, and JavaScript across separate files with a live preview, and React with
JSX bundled in the browser as you type.

<img src="docs/screenshots/pg-web.webp" alt="Web playground with index.html, styles.css and script.js beside a live preview">

<img src="docs/screenshots/pg-react.webp" alt="React playground with a counter component rendering in the preview pane">

### SQL workbench

Not a query box. A schema tree with tables, views, indexes and triggers; multiple
query tabs; a sortable, filterable, editable result grid; `EXPLAIN`; import and
export. Three engines, each with sample databases already loaded.

<img src="docs/screenshots/pg-postgres.webp" alt="PostgreSQL workbench showing the schema tree, a query tab, and a result grid">

<img src="docs/screenshots/pg-duckdb.webp" alt="DuckDB workbench running an aggregation across joined tables">

<img src="docs/screenshots/pg-sqlite.webp" alt="SQLite workbench with the schema browser and query results">

## Inside a course

Courses are prose first, because the explanation matters more than the widget, but
the page is live wherever being live helps.

<img src="docs/screenshots/courses.webp" alt="The course catalog, filterable by language and level">

Each course opens on a welcome page with its outline in the sidebar, and every page
is reachable without an account.

<img src="docs/screenshots/course-index.webp" alt="The Python Basics course welcome page">

**Lessons are illustrated.** Every course and most lessons carry their own artwork,
diagrams, and figures rather than stock screenshots.

<img src="docs/screenshots/course-lesson.webp" alt="A C++ lesson on variables and memory, opening with a custom illustration">

<img src="docs/screenshots/course-illustration.webp" alt="A database design lesson on cardinality with a custom illustration">

**Charts and diagrams are drawn for the point being made,** not borrowed from
somewhere else.

<img src="docs/screenshots/course-chart.webp" alt="A statistics lesson showing Simpson's paradox as a dumbbell chart">

<img src="docs/screenshots/course-diagram.webp" alt="A SQLite lesson with a diagram of splitting a wide table into related tables">

**Code blocks run in place.** Edit the snippet, press Run, see the output under it,
in the lesson rather than in a separate tab.

<img src="docs/screenshots/course-code-block.webp" alt="A Python lesson code block, edited and run, with its output shown below">

**Challenges are auto-graded** against real test cases, and some span multiple
files. There is a Solution button when you want it.

<img src="docs/screenshots/course-challenge.webp" alt="A multi-file Python challenge with main.py and account.py tabs and a Submit button">

**Quizzes explain themselves.** Each choice comes with a reason, right or wrong.

<img src="docs/screenshots/course-quiz.webp" alt="Multiple-choice questions at the end of a Python lesson">

Course pages also have full-text search across the whole site, per-lesson Markdown
export, and an optional AI assistant that can see the lesson you are on.

## Interview prep

Six role tracks (data analyst, data scientist, data engineer, analytics engineer,
machine learning engineer, backend engineer), built the same way as the courses, so
every question is one you actually run rather than one you read the answer to.

<img src="docs/screenshots/interview-prep.webp" alt="The interview prep index with six role tracks">

## Under the hood

Next.js on Cloudflare Workers, with the lessons prerendered and served statically.
Language runtimes are WebAssembly, loaded on demand and cached by the browser. Search
is a SQLite FTS5 index on D1. Accounts, when you want one, are Better Auth on D1.

The engineering detail (deployment, caching, search indexing, auth, the admin
surface) lives in [`DEVELOPMENT.md`](./DEVELOPMENT.md). Repository conventions and
content-authoring rules live in [`AGENTS.md`](./AGENTS.md).

## Feedback

Bug reports, corrections to lessons, and requests for languages or topics are all
welcome in [issues](https://github.com/dataslope/dataslope/issues) and
[discussions](https://github.com/dataslope/dataslope/discussions). Corrections to
content are especially useful; a wrong explanation is worse than a missing one.

## License

Dataslope is available under more than one license:

- **Source code**: [MIT License](./LICENSE). The MIT license covers Dataslope's own
  code **only**, not the learning content, and not the third-party software,
  runtimes, datasets, fonts, or artwork the project depends on or loads at runtime,
  each of which keeps its own terms.
- **Learning content**: [Creative Commons Attribution-NonCommercial 4.0 International
  (CC BY-NC 4.0)](./LICENSE-CONTENT). Attribution required, non-commercial use only.
  This covers the courses, lessons, exercises, and quizzes under
  [`content/`](./content) **and** the illustrative teaching materials made for them:
  the lesson and course illustrations in `public/images/`, and the figures, diagrams,
  and charts that accompany the lessons (including the ones rendered at build time
  from [`charts/`](./charts)). The chart *scripts* are code under MIT; the drawings
  they produce are content. See [`LICENSE-CONTENT`](./LICENSE-CONTENT) for the exact
  boundary, including what is excluded (brand assets, third-party material).

Third-party software and language runtimes retain their own licenses; see
[`THIRD-PARTY-NOTICES.md`](./THIRD-PARTY-NOTICES.md). In particular, the Java runtime
**CheerpJ** (Leaning Technologies) is proprietary, used here under its free Community
Edition and loaded from Leaning Technologies' CDN.
