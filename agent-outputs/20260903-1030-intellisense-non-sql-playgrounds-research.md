# Intellisense for the non-SQL playgrounds — state of play and per-language research

- **Date:** 2026-09-03
- **Question:** The non-SQL playgrounds appear to have no autocomplete/intellisense. For each language, is there a straightforward way to add it with existing libraries? If not, could one be built from scratch? The same logic must later serve code blocks and challenge cards.
- **Method:** Code inspection of `app/_components/completion/**`, `runtime/**`, the four editor mount sites and the unit tests; a headless Chromium run against `next dev` in this sandbox (static tiers and trigger policy only — no CDN host is reachable from the sandbox browser, so no WASM runtime can boot); Node experiments against the pinned Pyodide, webR and browsercc builds to measure the runtime-backed tiers; live checks of npm/jsDelivr/NuGet metadata and upstream projects on 2026-09-03.
- **Companion:** `agent-outputs/20260702-0325-intellisense-codemirror-wasm-feasibility.md` (the plan that PR #551 implemented). This report supersedes its per-language verdicts for C/C++ and C#.

---

## 1. Summary

**The premise is out of date: every non-SQL playground already has intellisense, shipped by [PR #551](https://github.com/dataslope/dataslope/pull/551) on 2026-07-02 and hardened by [PR #673](https://github.com/dataslope/dataslope/pull/673).** One shared extension, `languageCompletion()` in `app/_components/completion/languageCompletion.ts`, is mounted in all four imperative editor surfaces — `Playground.tsx`, `CodeBlock.tsx`, `ChallengeCard.tsx`, and `PlaygroundSplitEditors.tsx` — so the "same logic for code blocks and challenge cards" requirement is already met. What each language gets behind that extension is very uneven, and three properties of the current wiring make it *feel* absent:

1. **The popup never opens while you type.** `activateOnTyping` is off on every imperative surface (a deliberate choice, so typing pauses stay free for the pro-only AI ghost text). It opens only on a trigger sequence (`.`, `->`, `::`, `$`) or Ctrl-Space. Typing `pri` and waiting shows nothing. On touch devices there is no Ctrl-Space at all, so only trigger characters ever open it.
2. **The first Ctrl-Space on a fresh page usually shows nothing.** The static lists and the language packs are lazy chunks; the source returns `null` while the chunk loads and only the *next* keystroke re-queries. Reproduced on Java, C and TypeScript surfaces (§3.2).
3. **Five languages (PHP, C, C++, Java, C#) have no semantic tier at all** — keyword/builtin lists plus "any word in the document" — and after a `.` they offer only document words (for `int n = 3; n.` the popup lists `3`, `n`, `x`).

Per-language verdict, with what changed since the July report:

| Language | Shipped today | Straightforward library route? | From-scratch route | Recommendation |
| --- | --- | --- | --- | --- |
| Python | jedi in the Pyodide worker (live namespace + whole buffer), rlcompleter fallback, `@codemirror/lang-python` pack pre-boot | Done. jedi 0.19.2 is in the pinned Pyodide 314.0.4 lock; measured 3–20 ms warm, 0.5–0.8 s cold | — | Polish: signatures/docstrings in the popup, hover, `activateOnTyping` |
| R | webR's own `utils` completion engine, curated list pre-boot | Done. Measured 6–130 ms | — | Polish only |
| JavaScript / TypeScript | Real TS language service (5.9.3) in a dedicated worker, Node ambient types, snippets/keywords pack | Done. Note: TypeScript 7.x on npm no longer ships `lib/typescript.js` (Go binaries), so the CDN pin must stay on the 5.x/6.x JS line | — | Add hover + signature help (same service), fix the profile gaps below |
| React (`react` adapter) | TS service via `complete()`, but **no completion profile** → no `.` trigger, no snippets; Ctrl-Space only | Trivial: reuse the `typescript` profile | — | Fix (S) |
| Web (`web` adapter) | JS pane: TS service, Ctrl-Space only. **HTML and CSS panes: nothing** — `override:` discards `@codemirror/lang-html`/`lang-css`'s built-in sources | Trivial: per-file profile that re-adds `htmlCompletionSource` / `cssCompletionSource` | — | Fix (S) |
| C / C++ | Static lists + document words | **Yes, and it is already downloaded:** clang's built-in `-code-completion-at` on the browsercc `clang.wasm` the Run button already uses. Measured in Node: C 0.42 s, C++ 0.35 s with the existing PCH (2.5 s without). No SharedArrayBuffer, no clangd | — | Implement (M). Replaces the July "defer" verdict |
| C# | Static lists + document words | **Yes, zero extra assemblies:** `SemanticModel.LookupSymbols` in `Microsoft.CodeAnalysis.dll`, which the runner already ships. Richer tiers: Roslyn `Recommender` (+Workspaces, ~10 MB compressed) or full `CompletionService` (+Features, ~15 MB more; the DotNetLab pattern) | — | Implement the `LookupSymbols` tier (M; needs the .NET SDK to rebuild the bundle) |
| PHP | Static list (216 lines), `$variable` scanner, document words | No browser language server exists (Intelephense closed-source, Phpactor untested under php-wasm) | Yes, cheaply: generate the full builtin catalogue with signatures from php-wasm's own `get_defined_functions()` + Reflection (once, offline); document symbols from the Lezer PHP tree already in the editor or `token_get_all()` in the worker | Build (M) |
| Java | Static list + document words | No browser language server; JavaFiddle (CheerpJ's own playground) ships none | Two options: (a) Lezer-tree declarations + curated JDK member table keyed by declared type (Java 8 has no `var`, so declared types are always explicit); (b) a tiny helper on javac's Compiler Tree API (`JavacTask.analyze` + `Elements.getAllMembers`) run via `cheerpjRunMain` — real semantics but on the main-thread JVM, cost unmeasured | Build (a) now (M), spike (b) |

Cross-cutting fixes worth doing before any of the above: make lazy sources `await` their chunk instead of answering `null` (§3.2), add the `react`/`web` profiles (§3.3), decide the trigger policy (§5), and document the feature in `DEVELOPMENT.md` (it is currently undocumented there).

---

## 2. What exists today

### 2.1 The shared extension (already used by code blocks and challenge cards)

`languageCompletion({ adapterId, getRuntime, getContextPrefix?, getFilename? })` returns one self-contained CodeMirror extension: `autocompletion({ override: sources, activateOnTyping: false, defaultKeymap: false })`, a trigger-character listener, and a keymap where **Tab accepts and Enter always inserts a newline** (same convention as the SQL playgrounds).

Its sources, in order:

1. **Runtime source** — bridges `LanguageRuntime.complete(request)` (`types.ts:171–192`). The request carries the full doc, offset, line/column, an `explicit` flag and the filename; learn surfaces prepend the read-only init code (`getContextPrefix`) so whole-file analyzers see the names it defines.
2. **Extra source** — PHP only: `$variables` in the document plus superglobals.
3. **Language pack** — lazy import of the language package's own sources (`@codemirror/lang-python` locals/globals; `@codemirror/lang-javascript` locals + snippets + a keyword list). Suppressed in member position (`pd.|`), and for Python suppressed once the runtime answers.
4. **Static list** — lazy import of `staticLists/{r,php,c,cpp,java,csharp}.ts` (112–216 lines each), suppressed in member position and once a runtime source exists.
5. **Document words** — `completeAnyWord`, filtered against the static labels. Active for PHP/C/C++/Java/C#, also in member position (their only fallback there).

Mount sites: `Playground.tsx:1703`, `CodeBlock.tsx:676`, `ChallengeCard.tsx:529`, `PlaygroundSplitEditors.tsx:210`. Every runtime that gains a `complete()` therefore lights up on all four surfaces with no editor-side change; that is the extension point for everything proposed below.

Unit coverage: `__tests__/languageCompletion.test.ts`, `staticCompletionLists.test.ts`, `tsCompletionKinds.test.ts`, `tsAnalysis.test.ts` (59 tests, all passing on this branch).

### 2.2 Runtime backends that implement `complete()`

| Adapter | Backend | Where |
| --- | --- | --- |
| `python` | `jedi.Interpreter(doc, [globals()])` in the Pyodide worker, loaded on the first request (`pyodide.loadPackage("jedi")`); rlcompleter fallback; dunders hidden; 200-item cap | `runtime/pyodide-worker.ts:673–760`, `runtime/python.tsx:909` |
| `r` | `utils::rc.settings(...)` + `.assignLinebuffer/.guessTokenFromLine/.completeToken/.retrieveCompletions` (the official webR REPL pattern); `name=` arguments boosted, `pkg::` namespaces typed | `runtime/r.tsx:1416–1489` |
| `javascript`, `typescript`, `react`, `web` (JS files only) | `typescript.js` 5.9.3 via `importScripts` from jsDelivr in a dedicated worker; `lib.*.d.ts` closure fetched by following reference directives; Node ambient declarations for the almostnode surface; `@types/react` mounted for `.tsx`; workspace snapshot from the last staged run for cross-file imports | `runtime/ts-language-worker.ts`, `tsLanguageService.ts`, `tsAnalysisConfig.ts`, `nodeAmbientTypes.ts` |
| `php`, `c`, `cpp`, `java`, `csharp` | none — static tiers only | — |

Nothing implements hover, signature help or inline diagnostics in the editor (`grep hoverTooltip|linter(` finds nothing); the TS worker does expose `diagnose` for the run output.

### 2.3 Surfaces and threading facts that constrain the options

- **The playground boot overlay covers the editor until the runtime is up** (`PlaygroundBootOverlay.tsx`, `Playground.tsx:4066`). In the playgrounds the "pre-boot static tier" is therefore never what a user types against; it matters on learn pages, where runtimes attach lazily after warm-up or the first Run (`CodeBlock.tsx:1052,1257`, `ChallengeCard.tsx:960,1313`).
- Python, JS/TS, PHP, C/C++ run in Web Workers; R in webR's own worker; **Java (CheerpJ 4.3) and C# (.NET 10 / Mono WASM) run on the main thread** (`java.tsx:454`, `csharp.tsx:352`). Any completion computed inside those runtimes janks typing unless debounced hard.
- No SharedArrayBuffer / COOP / COEP anywhere (`browsercc.ts:4` chooses the single-threaded build on purpose). Anything multithreaded (clangd) is out.
- Runtime completion shares each worker's message loop with Run: a request during a long-running program waits (no interrupts). The TS service avoids this by living in its own worker.

---

## 3. What the browser shows today (sandbox run, 2026-09-03)

Chromium in this sandbox cannot reach any CDN (`cdn.jsdelivr.net`, `unpkg.com`, `esm.sh`, `cjrtnc.leaningtech.com`, `webr.r-wasm.org` all reset through the proxy), so no runtime booted and the playground overlay stayed up. The editor was focused programmatically to exercise the static tiers; learn pages were tested as a user would see them. All runtime-backed claims below come from the Node experiments in §4 instead.

### 3.1 Trigger policy

| Surface | Typed | Result |
| --- | --- | --- |
| C lesson code block | `stru` then pause | no popup (activateOnTyping off) |
| C lesson code block | Ctrl-Space on `stru` | `struct`, `strdup` in 83 ms |
| Java playground | `Sys` then pause | no popup |

### 3.2 First-request miss on lazy chunks

| Surface | Ctrl-Space #1 (fresh page) | Ctrl-Space #2, four seconds later |
| --- | --- | --- |
| Java playground, `Sys` | nothing | `System`, `System.out.println`, … (8 items, 53 ms) |
| C lesson code block, `pri` | nothing | `printf`, `fprintf`, `sprintf`, `snprintf` (8 ms) |
| TypeScript lesson code block, `cons` | nothing | `const` |
| Python lesson code block, `pri` | `print`, … (85 ms) | same |

Python answers first time only because `@codemirror/lang-python` was already loaded for highlighting. The cause is `lazySource()` in `languageCompletion.ts`: it kicks the import and returns `null`, so CodeMirror closes the request with no results. Completion sources may return a promise; returning `load().then((s) => s(ctx))` (and checking `ctx.aborted`) fixes it with no other change.

### 3.3 Profile gaps for `react` and `web`

`PROFILES` has entries for the nine original adapters (`__tests__/languageCompletion.test.ts:124` enumerates exactly those); the `react` and `web` adapters added by PR #571 fall through to `FALLBACK_PROFILE` (no trigger endings, no language pack, document words only). Observed:

- Web playground, HTML pane: `<di` + Ctrl-Space → nothing. `override:` replaces the sources registered through language data, which is where `html()` registers `htmlCompletionSource` and `css()` registers `cssCompletionSource` (verified against `@codemirror/autocomplete@6.20.1` typings: "Override the completion sources used. By default, they will be taken from the `"autocomplete"` language data"). The comment in `web.tsx:394` ("HTML/CSS tabs rely on CodeMirror's built-in completion sources") is therefore wrong today.
- React playground and web JS pane: `document.` does not auto-open; Ctrl-Space reaches the TS service. No snippets or keyword completions.

Fix: a `react` profile identical to `typescript`, and a `web` profile that picks a sub-profile from `getFilename()` (`.html` → `htmlCompletionSource`, `.css` → `cssCompletionSource`, `.js` → the `javascript` profile). Small change, one place.

### 3.4 Noise in the static tiers

- Document-word completion (`completeAnyWord`) matches numeric literals: `int n = 3; n.` offered `3`. A custom word source that skips all-digit tokens removes it.
- PHP: an explicit Ctrl-Space after a non-`$` word (`arr`) lists every superglobal first, inserted after the word (`arr$_GET`). The `$variable` source should require a `$` token or an empty word.

---

## 4. Measured backends (Node, pinned builds)

### 4.1 jedi in Pyodide 314.0.4 (the shipped tier)

`loadPyodide` 2.3 s (local files), `loadPackage(jedi)` 0.56 s (1.56 MB + 0.1 MB wheels).

| Query | Cold | Warm |
| --- | --- | --- |
| `import math` / `math.` | 530 ms | 13 ms |
| list variable `xs.` in a 22-line doc | 837 ms | — |
| user class instance `inv.` | — | 13 ms |
| `str` variable `s.` | — | 221 ms |
| top-level prefix `su` (offers `sum`, `summarize`, `super`) | — | 17 ms |
| live dict from `globals()` `data.` | — | 3 ms |
| `import statistics` / `statistics.` | — | 294 ms |

The first request after boot pays for jedi's own warm-up; everything after is interactive. jedi also returns `docstring()`, `get_signatures()` and `type` per item, none of which the popup shows yet.

### 4.2 webR 0.6.0 (R 4.6) `utils` completion (the shipped tier)

`me` 37 ms cold / 12 ms warm (29 items: `mean(`, `mean.Date(`, …); `df$` 6 ms (`df$alpha`, `df$beta`); `stats::` 7 ms (465 exports); `mean(x, na` 132 ms (`na.rm=` first). Argument completion is the only thing here a static list can never give.

### 4.3 clang code completion on browsercc 0.1.1 (proposed C/C++ tier)

Driven exactly as `browsercc-worker.ts` drives compiles (driver `-###` to obtain the cc1 line, then cc1 in a fresh instance), with `-fsyntax-only -Xclang -code-completion-at=<file>:<line>:<col> -Xclang -code-completion-macros` added:

| Case | Instantiate | Mount headers | cc1 | Total | Result |
| --- | --- | --- | --- | --- | --- |
| C, `struct point p; p.` | 195 ms | 72 ms | 116 ms | ~0.4 s | `x : [#int#]x`, `y : [#int#]y` |
| C, top-level `pri` (`<stdio.h>`, `<stdlib.h>`, `<math.h>`, `<string.h>`) | 195 ms | 72 ms | 153 ms | 0.42 s | 1,211 items, 586 after dropping `_`-prefixed internals (`printf`, `abort`, `abs`, …) |
| C++, `std::vector<int> v; v.` without PCH | 206 ms | 63 ms | 2,216 ms | 2.5 s | 46 members: `assign`, `at`, `back`, `begin`, `capacity`, … with full signatures |
| C++, same with the shipped `bits/stdc++.h` PCH (`-include-pch`) | 184 ms | 57 ms | 104 ms | **0.35 s** | same 46 |
| C++, `std::` | — | — | 1.7 s (no PCH) | — | 3,178 items, needs `_` filtering |

Facts that shape the implementation:

- Output lines look like `COMPLETION: capacity : [#size_type#]capacity()[# const#]`; `[#…#]` is the result type, `<#…#>` a parameter placeholder — enough for `label`, `detail` (signature) and a kind guess (`(` → function).
- The column must point at the **start** of the identifier being completed; clang does not filter, CodeMirror does (`validFor`).
- Each request needs a fresh Emscripten instance (the module exits after `callMain`); the ~0.2 s instantiate is the floor, the header mount can be trimmed to the headers actually included, and the driver step can be cached per language (only the position argument changes).
- `clang.wasm` (42.5 MB), `sysroot.tar` (28.6 MB) and the PCH (19.4 MB) are already fetched for Run; the completion tier adds **no download**.
- Requests would queue behind a running program on the same worker; a second worker sharing the compiled module (`WebAssembly.Module` is postMessage-able) avoids that at the cost of memory.
- browsercc's own `compile()` captures only stderr and expects an object file, so the worker needs its own ~40-line driver over the exported `Clang` factory (the experiment script is `scratchpad` material; the logic is in this report).

This contradicts the July report's "defer semantic C/C++" verdict, which only considered clangd. clangd-in-browser still needs SharedArrayBuffer and a cross-origin-isolated page (README, verified today); clang's built-in completer needs neither.

---

## 5. Per-language research

### 5.1 Python — done; polish

- jedi is in the pinned lock (`jedi 0.19.2`, `parso 0.8.6`; `mypy 1.19.1` is there too if static diagnostics ever become a goal). Nothing to add for completion.
- Improvements, all inside the existing `_python_completions_jedi`: send `c.type`, `c.get_signatures()[0].to_string()` as `detail` and `c.docstring(raw=True)` (truncated) as `info` — the `CompletionItemDetail` type already carries them and `toCmCompletion` already maps them; add a `hover` message for `jedi.Interpreter(...).help()`.
- `browser-basedpyright` 1.39.10 (2026-08-13, 20.5 MB unpacked) remains an option for static type diagnostics, not needed for completion; its maintainers still warn it is only guaranteed inside their own playground.

### 5.2 R — done; polish

- The engine is R's own; zero download. `rc.settings(fuzzy = FALSE)` is set; CodeMirror does the fuzzy match.
- Possible: `detail` from `args()` for functions (one extra `evalRString` per popup, ~10 ms), hover via `utils:::.helpForCall`. No R language server runs in the browser; the CRAN `languageserver` package is pure R but depends on a running LSP loop and has no webR port.

### 5.3 JavaScript / TypeScript / React / web JS — done; three notes

- **TypeScript 7 changes the packaging.** `typescript@7.0.2` (npm `latest` since 2026-07-08) ships platform binaries via `optionalDependencies` and no `lib/typescript.js` (416 files on jsDelivr, none named `typescript.js`). The worker's `importScripts` pin must stay on `5.9.x`/`6.x` (`6.0.0-beta` exists). Add that note to `cdn.ts` next to `TYPESCRIPT_VERSION`.
- **Hover and signature help are one message each** away: `service.getQuickInfoAtPosition` and `service.getSignatureHelpItems` on the same worker, surfaced with `hoverTooltip` from `@codemirror/view`. The CM side is ~60 lines; the worker side ~40.
- Profile gaps for `react` and `web` (§3.3).
- Bridges considered and not needed: `@codemirror/lsp-client` 6.2.5 (2026-06-09) if an LSP-shaped server is ever adopted; `@valtown/codemirror-ts` (archived, 2.3.1 from 2024-12) as a reference only.

### 5.4 C / C++ — implement clang code completion (new verdict)

Library route: **clang itself**, already on the page. Plan:

1. In `browsercc-worker.ts`, add a `complete` message: compose the same translation unit as Run (`composeTranslationUnit`), write the live doc over the entry, run cc1 with `-fsyntax-only -code-completion-at=<entryPath>:<line>:<col+1-at-identifier-start> -code-completion-macros` (position is per included file, so the entry path works), capture `print`, parse `COMPLETION:` lines, drop `_`-prefixed names and `Pattern` entries, cap at ~300.
2. Cache the cc1 argument vector per language/flag set; instantiate a fresh `Clang` per request; mount only `include/` from the sysroot; pass the PCH for C++ exactly as Run does.
3. Implement `complete()` on the C and C++ runtime classes (`c.tsx`, `cpp.tsx`) as a worker round trip; the shared extension then serves playgrounds, code blocks and challenge cards unchanged. Keep the static lists as the pre-boot tier.
4. Consider a second worker for completion so a running program cannot stall the popup; measure memory first.

Expected UX: ~0.35–0.45 s after `.`/`->`/`::` (compare jedi's 0.5–0.8 s cold), with real member lists and signatures. Risks: a document that does not parse still completes (clang recovers), but a missing include produces nothing after `.`; long C++ files without the PCH path (custom flags) go back to ~2 s.

Not recommended: clangd-in-browser (SharedArrayBuffer + COOP/COEP site-wide, Monaco-oriented, single maintainer), Wasmer's clang (100 MB).

### 5.5 C# — Roslyn is already there (new verdict)

The .NET bundle in `cdn-assets/_dotnet/` (35 MB) already contains `Microsoft.CodeAnalysis.dll` (3.0 MB) and `Microsoft.CodeAnalysis.CSharp.dll` (6.7 MB), and `Runner.cs` already builds a `CSharpCompilation` over cached metadata references for every BCL assembly. Three tiers, by download cost:

| Tier | API | Extra assemblies | Notes |
| --- | --- | --- | --- |
| A | `compilation.GetSemanticModel(tree).LookupSymbols(position, container?, name?, includeReducedExtensionMethods: true)`; for `expr.` bind `GetTypeInfo(expr).Type` and pass it as `container` | none | Accessibility-filtered symbols; no keyword/snippet ranking; ~150 lines of C# |
| B | `Recommender.GetRecommendedSymbolsAtPositionAsync` (`Microsoft.CodeAnalysis.Recommendations`) | `Microsoft.CodeAnalysis.Workspaces.Common` 8.5 MB + `CSharp.Workspaces` 2.0 MB (nupkg, compressed) | Context-aware (no types after `new`, etc.); needs an `AdhocWorkspace` |
| C | `CompletionService.GetService(document).GetCompletionsAsync` | + `Features` 10.6 MB + `CSharp.Features` 4.3 MB | What DotNetLab ships (completions, diagnostics, code fixes); MEF trimming footguns; `PublishTrimmed=false` here already sidesteps one |

Recommendation: tier A now, as a `[JSExport] Complete(string code, int position)` beside `RunScript`, returning JSON `{label, kind, detail}` via `ISymbol.ToMinimalDisplayString`; add `complete()` to `CSharpRuntime` in `csharp.tsx`. Constraints: rebuilding needs the .NET 10 SDK with `wasm-tools` (`script-runner-src/README.md`) and a `CDN_ASSETS_TAG` bump; the runtime is on the main thread, so debounce and keep it explicit-trigger only; the first request pays the same reference-fetch cost Run's warm-up already pays. Tier C is the DotNetLab pattern and DotNetLab runs it in a Web Worker for the reason above; the host cannot move .NET into a worker today (`csharp.tsx:356`).

### 5.6 PHP — no library; build a cheap two-tier engine

No browser language server: Intelephense is closed-source (its "web" request has been open since 2021); Phpactor is pure PHP and could in principle run under php-wasm, but it needs its Composer vendor tree in the VFS and a per-request cold start, and nobody has done it — not recommended without a spike.

From scratch, using what php-wasm already provides:

1. **Builtin catalogue with signatures, generated once offline** by running, on the same php-wasm 0.1.0 build, `get_defined_functions()['internal']` + `ReflectionFunction::getParameters()` (and `get_declared_classes()` + `ReflectionClass::getMethods()` for `ClassName::`), emitting a JSON list (~1,500 functions, a few hundred classes) that replaces the hand-written 216-line list. Exact match with what the runtime actually has; the tokenizer and reflection extensions are default-on in php-wasm builds.
2. **Document symbols** from the Lezer PHP tree the editor already parses (`@lezer/php`, zero download): function/class/method declarations, parameters, `$this->` members inside a class, and simple `$x = new Foo(...)` tracking so `$x->` lists `Foo`'s methods. `token_get_all()` in the worker is the alternative when the runtime is up.
3. Keep `$variable` completion; fix the explicit-request noise (§3.4).

### 5.7 Java — no library; two from-scratch options

- JavaFiddle (Leaning Technologies' own CheerpJ playground) ships no completion; no JDT-LS or other Java language server has a browser port (unchanged since July).
- **Option (a), editor-side (recommended first):** walk the Lezer Java tree (`@lezer/java`, already loaded by `@codemirror/lang-java`) for declarations in scope — locals, fields, parameters, methods, classes — with their declared types, and keep a curated JDK member table keyed by type (`String` → `length()`, `charAt(int)`, …; `List<E>`, `Map<K,V>`, `StringBuilder`, `Scanner`, `Math`, `System.out`). Because the playground compiles at Java 8 (`java.tsx:34`), there is no `var`: every local has an explicit type, which makes `s.` → `String` members tractable without inference. Method-chain results (`s.trim().`) can use the table's return types for one hop. Zero download; sub-millisecond.
- **Option (b), javac-backed (spike):** a small helper class compiled once against the bundled `tools.jar` and shipped as a second jar: `JavacTask.parse()` + `analyze()`, `Trees.getScope(path)` for in-scope names, `Trees.getTypeMirror` on the expression before `.`, `Elements.getAllMembers(typeElement)` for members — the approach `georgewfraser/java-language-server` builds on. Real semantics, but each request is a `cheerpjRunMain` on the main-thread JVM and javac analysis of the whole file; JavaFiddle-class compiles take seconds, so expect one to three seconds of jank per request unless cached aggressively. Needs a JDK to build the helper. Measure before committing.
- **Option (c), jshell:** `jdk.jshell.SourceCodeAnalysis.completionSuggestions` is the JDK's own completion API but requires a Java 9+ runtime and the `jdk.jshell` module; CheerpJ 4.3 supports a Java 17 runtime, and whether its runtime image includes `jdk.jshell`/`jdk.compiler` is not documented. Unverified; not a plan.

### 5.8 Cross-language: from-scratch symbol extraction

If option (a) for Java proves worthwhile, the same "Lezer tree → declarations with declared types → curated member table" module generalises to C/C++ (as the pre-boot tier under the clang engine), C# (needs a grammar: the editor uses a legacy stream mode with no tree; `tree-sitter-c-sharp` ships a 5.4 MB WASM — heavy; the Roslyn tier makes this moot) and PHP (§5.6). Building it once, parameterised by node names, is the "implement from scratch" answer for the analyzer-less languages; it should live next to `languageCompletion.ts` and register as another source, so it too reaches code blocks and challenge cards automatically.

---

## 6. Policy decisions to make

1. **Trigger mode.** The July report and PR #551 kept `activateOnTyping: false` so the AI ghost text (pro-only) owns typing pauses. Two months later the feature still reads as absent to users; the alternatives are: (i) turn it on with `activateOnTypingDelay` ~150 ms for everyone — the ghost-text fetcher already stands down while the popup is open, so pro users get the popup first and ghost text when it closes; (ii) turn it on only when the `/api/ai/complete` capability probe reports `enabled: false` (guests and free members, i.e. most learners), leaving pro users as today. (ii) is a two-line change in `languageCompletion.ts` given `checkAccess()` in `inlineCompletion.ts` is already module-wide. Either way, keep a toolbar/keyboard affordance for explicit completion on touch devices.
2. **Static-tier scope.** Static lists only matter on learn pages before the runtime attaches (the playground overlay hides the editor until boot). If the runtime-backed tiers land for C/C++ and C#, the static lists shrink to keywords + snippets; the PHP and Java lists remain the main tier until §5.6/§5.7 ship.
3. **Where the report's numbers stop.** Every runtime-backed number above is from Node against the pinned builds, not from the browser (the sandbox blocks CDNs). Browser-side latency adds a postMessage round trip and, on the main-thread runtimes, jank; verify on a real device before promising sub-second C++ completion in docs.

---

## 7. Suggested order of work

| # | Item | Size | Reaches code blocks / challenge cards? |
| --- | --- | --- | --- |
| 1 | `lazySource` awaits its chunk; numeric doc-words filtered; PHP explicit noise | S | yes (shared extension) |
| 2 | `react` + `web` profiles (HTML/CSS built-in sources back, `.` trigger, snippets) | S | yes |
| 3 | Trigger-mode decision (§6.1) + `DEVELOPMENT.md` section for intellisense | S | yes |
| 4 | C/C++: clang `-code-completion-at` in `browsercc-worker.ts`, `complete()` on both runtimes | M | yes, via `complete()` |
| 5 | C#: `[JSExport] Complete` on `SemanticModel.LookupSymbols`, bundle rebuild + CDN tag | M | yes, via `complete()` |
| 6 | PHP: generated builtin catalogue + Lezer document symbols | M | yes |
| 7 | Java: Lezer declarations + JDK member table (spike javac helper separately) | M | yes |
| 8 | TS hover + signature help; jedi signatures/docstrings in the popup | M | yes |
| 9 | Pin note for TypeScript 7 packaging in `cdn.ts` | XS | — |

---

## 8. Sources

Internal: `app/_components/completion/languageCompletion.ts`, `completion/staticLists/*`, `runtime/pyodide-worker.ts`, `runtime/r.tsx`, `runtime/ts-language-worker.ts`, `runtime/tsLanguageService.ts`, `runtime/tsAnalysisConfig.ts`, `runtime/cdn.ts`, `runtime/browsercc-worker.ts`, `runtime/browserccBuild.ts`, `runtime/java.tsx`, `runtime/csharp.tsx`, `runtime/dotnet.ts`, `runtime/php-worker.ts`, `runtime/web.tsx`, `PlaygroundSplitEditors.tsx`, `PlaygroundBootOverlay.tsx`, `script-runner-src/Runner.cs` + `ScriptRunner.csproj`, `cdn-assets/_dotnet/` listing, `__tests__/languageCompletion.test.ts`; PR #551, #571, #673 bodies.

External (checked 2026-09-03): Pyodide `v314.0.4` `pyodide-lock.json` (jedi 0.19.2, parso 0.8.6, mypy 1.19.1); npm registry metadata for `typescript` (7.0.2 latest, 6.0.0-beta), `@codemirror/lsp-client` 6.2.5, `browser-basedpyright` 1.39.10, `@valtown/codemirror-ts` 2.3.1, `browsercc` 0.1.1, `web-tree-sitter` 0.27.0, `tree-sitter-c-sharp` 0.23.5 (5.4 MB wasm), `@lezer/java|cpp|php`; jsDelivr file listings for `typescript@7.0.2` and `browsercc@0.1.1` (clang.wasm 42.5 MB, lld.wasm 23.2 MB, sysroot.tar 28.6 MB, stdc++.h.pch 19.4 MB); `@codemirror/autocomplete@6.20.1`, `lang-html@6.4.11`, `lang-css@6.3.1`, `lang-java@6.0.2`, `lang-cpp@6.0.3`, `lang-php@6.0.2` typings; NuGet package sizes for `Microsoft.CodeAnalysis.{Features,CSharp.Features,Workspaces.Common,CSharp.Workspaces}` 4.14.0; [Roslyn `Recommender`](https://learn.microsoft.com/en-us/dotnet/api/microsoft.codeanalysis.recommendations.recommender?view=roslyn-dotnet-4.3.0) and [`SemanticModel.LookupSymbols`](http://source.roslyn.io/Microsoft.CodeAnalysis/R/019112cdb218fa28.html); [DotNetLab](https://github.com/jjonescz/DotNetLab) (Monaco, worker-hosted language services); [clangd-in-browser](https://github.com/Guyutongxue/clangd-in-browser) (SharedArrayBuffer + crossOriginIsolated requirement); clang `-code-completion-at` output format via [clang-completion-mode.el](https://opensource.apple.com/source/lldb/lldb-167.2/llvm/tools/clang/utils/clang-completion-mode.el.auto.html) and the Node experiment above; [CheerpJ 4.3 release notes](https://labs.leaningtech.com/blog/cheerpj-4.3) and [`cheerpjInit` reference](https://cheerpj.com/docs/reference/cheerpjInit) (Java 8/11/17; no statement on `jdk.jshell`); [JavaFiddle README](https://github.com/leaningtech/javafiddle) (no completion); [webR REPL `Editor.tsx`](https://github.com/r-wasm/webr) (the `utils` completion pattern); [php-wasm custom-build docs](https://php-wasm.seanmorr.is/compiling/custom-builds.html) (tokenizer default-on); [georgewfraser/java-language-server](https://github.com/georgewfraser/java-language-server) (javac-API completion); [Intelephense](https://intelephense.com/) (proprietary).
