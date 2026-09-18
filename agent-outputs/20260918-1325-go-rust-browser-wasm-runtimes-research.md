# WASM runtimes for Go and Rust — can serverless playgrounds be built on them?

- **Date:** 2026-09-18
- **Question:** Are there WebAssembly runtimes for Go and Rust good enough to build DataSlope-style playgrounds on — editable code, Run, output, no execution backend?
- **Method:** Codebase reconnaissance of the existing fourteen runtimes (what a playground actually has to satisfy here), then external search and source-by-source verification of every in-browser Go and Rust toolchain found. Live checks run on 2026-09-18: response headers of the rubrc demo, and CORS/CORP headers of the three CDNs this site loads runtimes from.
- **Audience:** DataSlope maintainer deciding whether `/playground/go` and `/playground/rust` are buildable.

---

## 1. The answer in three sentences

**Go: yes, and one of the routes fits this codebase almost exactly.** Yaegi, a Go interpreter written in pure Go, compiles to a `GOOS=wasip1` WASI binary that runs under `@bjorn3/browser_wasi_shim` — the same shim the C and C++ playgrounds already execute their compiled binaries with — at a reported ~38 MB, which sits between today's R (15 MB) and C++ (45 MB) cold downloads.

**Rust: not yet on the same terms.** The only credible in-browser rustc is [rubrc](https://github.com/oligamiq/rubrc) (rustc + cargo + LLVM + rust-analyzer as Wasm modules, MIT/Apache-2.0); it is explicitly pre-release, supports no external crates and no proc macros, and — verified live against its demo today — requires cross-origin isolation (`COOP: same-origin` + `COEP: require-corp`), which nothing else on this site needs.

**So: build Go now, and do not build a Rust playground yet** — ship Rust, if it is wanted, as build-time-compiled `wasm32-wasip1` binaries in lesson blocks (exact rustc semantics, no editing) and re-evaluate rubrc in a couple of quarters.

---

## 2. What a playground has to satisfy here

These come from the repo, and every option below was scored against them.

| Constraint | Evidence | Consequence for Go/Rust |
| --- | --- | --- |
| No execution backend, ever | `README.md` ("run entirely in your browser"), the fourteen runtimes in `app/_components/runtime/` | A server compile service (play.rust-lang.org's API, a container of our own) is out of scope by construction, not just by cost. |
| The site is **not** cross-origin isolated | No COOP/COEP in `next.config.ts`, `wrangler.jsonc`, `public/_headers`; prior report `agent-outputs/20260706-0224` reached the same conclusion for WebContainers | Anything needing `SharedArrayBuffer` needs isolation turned on for at least one route. That is the single biggest discriminator between Go and Rust here (§5). |
| Heavy runtimes load from pinned CDNs | `app/_components/runtime/cdn.ts`; browsercc from jsDelivr, `tools.jar` from unpkg, the .NET bundle from `cdn-assets/` by git tag | A Go runtime ships the same way: one pin in `cdn.ts`, a matching entry in `__tests__/wasmCdnPins.test.ts` where glue and binary are two halves of one build. |
| WASI is already a first-class host here | `browsercc.ts` instantiates `@bjorn3/browser_wasi_shim` 0.4.2; `AGENTS.md:1242` documents the shim's `fd_write` behaviour; `stdinFile.ts` feeds `stdin.txt` to fd 0 | A `GOOS=wasip1` binary is a *known quantity* in this codebase, not new infrastructure. This is the whole reason the Go recommendation is cheap. |
| Runtimes plug in behind one interface | `LanguageRuntime` / `LanguageAdapter` in `app/_components/types.ts`, registry in `runtime/adapters.ts` | A new language is an adapter plus a runtime module; the editor chrome, files pane, examples, Stop, and output panel come free. |
| Cold download is a first-class UX number | `coldDownloadMB`: python 6, r 15, java 30, csharp 35, c 35, cpp 45 | ~38 MB for Go is unremarkable. A wasm rustc would be the largest asset on the site by a wide margin. |
| Editor and formatter are per-language | `cmExtensions.ts` (legacy-modes for R/C#), `@wasm-fmt/*` for clang-format, ruff, mago, web | Go is covered on both: `@codemirror/legacy-modes/mode/go` is already in the dependency tree, and `@wasm-fmt/gofmt` (MIT, 0.7.3) is the same family as the four formatters already shipped. For Rust, `@wasm-fmt/rustfmt` does not exist (registry 404 on 2026-09-18). |

---

## 3. Go — four routes, three of them real

| Route | What it is | License | State | Verdict |
| --- | --- | --- | --- | --- |
| **A. Yaegi → `GOOS=wasip1`** | Pure-Go interpreter compiled to a WASI binary, run under the existing shim | Apache-2.0 | Upstream frozen at v0.16.1 (2024-04-03); maintained forks exist | **Recommended.** Fits the existing WASI host with no new browser requirements. |
| **B. Yaegi → `GOOS=js GOARCH=wasm`** | Same interpreter, `wasm_exec.js` glue instead of WASI | Apache-2.0 | Shipped in production by Playcode's Go compiler | Viable alternative; only worth it if `syscall/js` interop is wanted. |
| **C. Real `gc` toolchain in the browser** | hackpad (Go 1.20 fork, virtual FS, process manager, real `go build`); ccbrown/progrium `wasm-go-playground` (gc compiled to js/wasm) | Apache-2.0 | Proven but stale and slow | Not now. Right semantics, wrong maintenance and performance profile. |
| **D. Precompiled at CI** | `GOOS=wasip1 GOARCH=wasm go build` in a workflow, binary executed by the existing shim | n/a | Trivially available today | Not a playground (no editing), but the correct way to run *lesson blocks* with exact Go semantics. |

### 3.1 Route A in detail — yaegi on WASI

Yaegi is "Another Elegant Go Interpreter", written in pure Go using only the standard library, Apache-2.0, from the Traefik team. Because it is pure Go, it cross-compiles to `GOOS=wasip1 GOARCH=wasm` like any other Go program; the resulting binary interprets the learner's source *inside* the Wasm sandbox, so goroutines, channels, `select` and `time.Sleep` are real Go runtime behaviour rather than an emulation.

One published implementation of exactly this (Ata Kuyumcu, adding Go to a browser code runner) reports:

- A **38 MB** yaegi WASI binary.
- About **fifty lines** of host-side WASI shims (`fd_write`, `args_get`, `clock_time_get`, `random_get`) — we already have a full shim, so this cost is zero here.
- The author first tried `GOOS=js GOARCH=wasm` and abandoned it: the boot path returns a Promise that never settles in an environment without an event loop driving it, and the `syscall/js` bridge depends on `globalThis` wiring. (That failure was in `isolated-vm`, not a browser, so it does not transfer directly — but it is the reason the WASI route was chosen.)
- **A fresh `WebAssembly.Instance` is required per run** (a reused instance panics with `fatal error: randinit twice`); the compiled `WebAssembly.Module` is cached and only instantiation repeats. Our runtimes already cache modules this way.

Limitations, straight from the yaegi README and issue tracker, all of which must be disclosed in `runtimeInfo.notes` the way the C++ playground discloses `-fno-exceptions`:

- **Language level lags.** v0.16.1 "supports the latest 2 major releases of Go (Go 1.21 and Go 1.22)". Go 1.27 shipped 2026-08-19 with generic methods and `encoding/json/v2` as the default JSON implementation; none of that exists in yaegi. For a beginners' course this is nearly invisible; for "modern Go" content it is a real ceiling.
- **Generics work but are not bulletproof.** Added in v0.14.0 (August 2022), with edge-case issues (e.g. generic declarations with multiple type parameters) filed afterwards.
- **No cgo, no assembly files, no compiler/linker directives, no `go:embed`.**
- **Go modules are not supported** — stdlib only, via yaegi's pre-extracted `stdlib` package. That matches how C/C++ ship here (no package manager), but it means no `golang.org/x/...` in lessons.
- **`reflect` and `%T` output can differ** from compiled Go, and interpreted computation is "significantly slower than in compiled mode".

**Maintenance is the real risk.** Upstream's last release is April 2024. Forks are picking it up — GoCodeAlone/yaegi advertises Go 1.26+ support, panic recovery in `Eval`, and generic function imports, but describes itself as alpha. Choosing between a frozen upstream on Go 1.22 and an alpha fork on Go 1.26 is the one genuine decision in this route, and it should be made with a test corpus (run every Go snippet the courses would contain through both).

### 3.2 Route C in detail — why the real compiler is out

It exists, and it works, which is worth knowing: **hackpad** (Apache-2.0, formerly go-wasm) runs a custom fork of the Go 1.20 toolchain in the browser with a virtualised POSIX environment — process manager, layered filesystem, terminal — so `go build` genuinely compiles and links in the tab. Its own README lists the two things that disqualify it: "Slow compile times" (the fix is an unstarted rewrite to parallelise with Web Workers) and "Safari crashes — regularly crashes due to Wasm memory bugs". The older `wasm-go-playground` (gc compiled to js/wasm) is blunter still: "Imports other than `runtime` are not supported… this probably has no practical uses", and "Safari works, but is unbearably slow."

We ship to phones and to Safari. Route C would be a research project, not an adapter.

### 3.3 Route D — the lesson-block hybrid worth taking anyway

The repo already precomputes block output in CI (`.github/workflows/block-outputs.yml`, `scripts/build-block-outputs.mjs`). A Go job could compile each lesson block with the **real** Go toolchain (`GOOS=wasip1 GOARCH=wasm`, or TinyGo when binary size matters — TinyGo is LLVM-based and ships as a native binary, so it is a build-time tool, not a browser one) and either commit the output or commit the `.wasm` for the shim to execute. That gives exact, current-Go semantics on the page, with yaegi powering only the editable playground. The discrepancy is the cost: a block that behaves one way in the lesson and another after the learner edits it in the playground is a credibility bug, so the two paths need the same snippet corpus run through both before shipping.

---

## 4. Rust — one real project, and it is not ready

| Route | What it is | License | State | Verdict |
| --- | --- | --- | --- | --- |
| **A. rubrc** | rustc, cargo, LLVM/lld and rust-analyzer as Wasm modules behind a VFS + shell, in a browser worker | MIT OR Apache-2.0 | Pre-release v2.0, "not yet ready for general production use" | Watch it. Needs cross-origin isolation (§5). |
| **B. An interpreter, à la yaegi** | — | — | Does not exist | Nothing to evaluate. |
| **C. Precompiled at CI** | `cargo build --target wasm32-wasip1`, executed by the existing shim | n/a | Available today | The only Rust execution we can ship now. No editing. |
| **D. Editor-only Rust** | rust-analyzer compiled to Wasm for diagnostics/completions, no Run | MIT/Apache-2.0 | Builds exist (`rust-analyzer/rust-analyzer-wasm`; rubrc embeds one as `lsp_opt`) | Possible half-playground; only honest if the UI says it cannot run code. |
| **E. Server-side compile** | play.rust-lang.org's API, or our own container | — | — | Out by §2. |

### 4.1 rubrc, in detail

Architecture, from its README: a SolidJS frontend (Monaco + xterm.js) over a Wasm-hosted toolchain in a worker — `vfs` (virtual filesystem, tool dispatch), `vfs-shell` (terminal sessions, pipes), and the embedded tools `rustc_opt`, `cargo_opt`, `llvm_opt` and `lsp_opt` (rust-analyzer). Targets that link successfully: `wasm32-wasip1` and `x86_64-unknown-linux-musl`.

What rules it out for now:

- **Cross-origin isolation is mandatory.** The README says it, and the live demo confirms it: `https://rubrc.pages.dev/` returned `cross-origin-embedder-policy: require-corp` and `cross-origin-opener-policy: same-origin` on 2026-09-18. The v1 demo loads `mini-coi.js`, the service-worker trick for synthesising those headers where the host cannot set them.
- **No external crates and no procedural macros.** A Rust playground that cannot `use serde` or `#[derive(Serialize)]` is a narrower promise than any playground currently on the site.
- **Stability is stated as not there yet:** compiler and cargo invocations are serialised internally, there is no general OS subprocess model, and "commands still occasionally throw errors that can render the session unusable".
- **Unknown weight.** No releases are published and the toolchain artefacts are not fetched from a URL discoverable in its bundles, so the download size could not be measured. A wasm rustc plus LLVM should be assumed larger than browsercc's clang/lld, i.e. the heaviest asset on the site.

The underlying reason there is no second option: Rust's front end is inseparable from LLVM and from monomorphisation, so "an interpreter someone maintains in a weekend" — which is what yaegi is for Go — has no Rust equivalent. The 2022 rust-lang internals thread "Running rustc on WASM" opened with exactly this idea and closed after 90 days with no path forward; rubrc is what happened in the four years since, and it got the compiler running, not the ecosystem.

---

## 5. The cross-origin isolation question, priced honestly

The prior report (`20260706-0224`) rejected WebContainers partly because site-wide isolation "would force CORP/CORS compliance onto every CDN-loaded WASM runtime". That is right about site-wide isolation and too pessimistic about a single route. Isolation is a per-document property, so `/playground/rust` could carry the headers alone (Next route headers, or a dedicated cookie-less subdomain in an iframe, which the same report already recommends for preview sandboxes).

Measured today, the CDNs this site depends on would survive `require-corp`:

| Asset checked | `access-control-allow-origin` | `cross-origin-resource-policy` |
| --- | --- | --- |
| `cdn.jsdelivr.net/npm/pyodide@0.28.3/pyodide.mjs` | `*` | `cross-origin` |
| `unpkg.com/dataslope-tools-jar@1.0.0/tools.jar` | `*` | `cross-origin` |
| `esm.sh/@bjorn3/browser_wasi_shim@0.4.2` | `*` | *(absent)* |

So jsDelivr and unpkg are already CORP-tagged; the one esm.sh URL checked is not, which means it must be loaded in CORS mode (`fetch`, or `<script crossorigin>`) rather than as a plain no-cors subresource. `COEP: credentialless` would relax this further, but reports on Safari's support conflict (one source says Safari never implemented it, another claims 2024 support) and, given the CORP headers above, we would not need it.

The costs that remain, and they are not nothing:

- `COOP: same-origin` severs `window.opener`, so any auth or checkout popup flow on that route breaks. Auth lives across this site (better-auth, Polar) — an isolated route needs its own audit.
- Every future third-party asset on that route inherits the constraint, permanently.
- The service-worker workaround (mini-coi / coi-serviceworker) must be served from our own origin, forces a reload on first visit, and is a second, subtler thing to keep working.

None of this is worth paying for a pre-release compiler that cannot import a crate. All of it becomes worth re-pricing the moment rubrc reaches a stable release.

---

## 6. Recommendation

**Build the Go playground. Do not build the Rust playground yet.**

Suggested order:

1. **Spike yaegi on WASI (half a day).** Build `GOOS=wasip1 GOARCH=wasm` from both upstream v0.16.1 and the GoCodeAlone fork, run each through `@bjorn3/browser_wasi_shim` exactly as `browsercc.ts` does, measure real sizes against the reported 38 MB, and run a corpus of intended course snippets — goroutines, channels, generics, `errors.Is`, `slices`/`maps`, struct embedding, `encoding/json` — through both. The fork/upstream decision falls out of that corpus, not out of a changelog.
2. **Host it like the other heavy runtimes.** `cdn-assets/` behind a `CDN_ASSETS_TAG` (as the .NET bundle) or its own npm package (as `tools.jar`), one pin in `cdn.ts`, and a `wasmCdnPins.test.ts` entry if any JS glue ships alongside the binary.
3. **Write the adapter.** `goAdapter` in `runtime/go.tsx` + the `ADAPTERS` entry, `@codemirror/legacy-modes/mode/go` in `cmExtensions.ts`, `@wasm-fmt/gofmt` for Format, `coldDownloadMB` from step 1, examples, and a `runtimeInfo.notes` that states plainly: interpreted by yaegi, Go 1.22-level (or 1.26 on the fork), standard library only, no cgo, slower than compiled Go.
4. **Decide the lesson-block story** before writing Go content: yaegi everywhere (consistent, slightly behind), or CI-compiled real Go in blocks plus yaegi in the playground (accurate, with a divergence risk to test for).
5. **Rust: ship content, not a playground.** If Rust courses are wanted, precompile each block at CI to `wasm32-wasip1` and run it under the existing shim — real rustc semantics on the page — and label the absence of an editable playground rather than shipping a crippled one. Re-check rubrc when it cuts a stable release or drops the isolation requirement.

---

## 7. What would change this answer

- **Rust flips to buildable** if rubrc reaches a stable release with external-crate support, or if it stops requiring `SharedArrayBuffer`. Both are on its roadmap's far side today; neither is implausible within a year.
- **Go's ceiling rises** if a yaegi fork keeps pace with Go releases. Conversely, if the alpha forks stall and upstream stays frozen, the Go playground is pinned to 2024 semantics and the notes must keep saying so.
- **Hackpad becoming maintained again** would make a real-`go build` playground interesting, with the Safari crash the gate to watch.
- **A WASI-hosted rustc outside rubrc** (a rust-lang-blessed `wasm32-wasip1` host build) would be the cleanest possible outcome and would slot into the browsercc pattern directly.

---

## 8. Sources

External, all verified 2026-09-18:

- [traefik/yaegi](https://github.com/traefik/yaegi) — README limitations, Apache-2.0, "latest 2 major releases of Go (Go 1.21 and Go 1.22)"; [v0.16.1 on pkg.go.dev](https://pkg.go.dev/github.com/traefik/yaegi) (published 2024-04-03); [releases](https://github.com/traefik/yaegi/releases); generics from v0.14.0 ([issue #1363](https://github.com/traefik/yaegi/issues/1363), [issue #1460](https://github.com/traefik/yaegi/issues/1460)).
- [GoCodeAlone/yaegi](https://github.com/GoCodeAlone/yaegi) — maintained fork, Go 1.26+, alpha.
- [Adding Go to a browser code runner](https://blog.lvmbdv.dev/posts/adding-go-to-a-browser-code-runner/) — yaegi on `GOOS=wasip1`, 38 MB, the `randinit twice` instance rule, why `GOOS=js` was abandoned. Single source for the size figure.
- [hack-pad/hackpad](https://github.com/hack-pad/hackpad) and [the write-up](https://blog.johnstarich.com/how-to-compile-code-in-the-browser-with-webassembly-b59ffd452c2b) — real Go toolchain in the browser; known issues: slow compiles, Safari crashes.
- [ccbrown/wasm-go-playground](https://github.com/ccbrown/wasm-go-playground) / [progrium fork](https://github.com/progrium/wasm-go-playground) — gc compiled to js/wasm; "imports other than `runtime` are not supported", Safari "unbearably slow".
- [Playcode's Go compiler](https://playcode.io/go-compiler) and [Aryan-Bagale/go-browser-interpreter](https://github.com/Aryan-Bagale/go-browser-interpreter) — yaegi + `GOOS=js` in production and as a reference implementation.
- [Instant Go](https://appliedgo.net/instantgo/) — an earlier yaegi-in-Wasm playground; useful as the cautionary case (stuck on Go 1.16, pre-generics, no third-party imports).
- [Go 1.27 release notes](https://go.dev/doc/go1.27) — released 2026-08-19, generic methods, `encoding/json/v2` by default.
- [tinygo-org/tinygo](https://github.com/tinygo-org/tinygo) — LLVM-based, ships as a native binary; a build-time tool.
- [oligamiq/rubrc](https://github.com/oligamiq/rubrc) — architecture, targets, limitations, MIT/Apache-2.0, pre-release; demo at [rubrc.pages.dev](https://rubrc.pages.dev/), headers checked live.
- [Running rustc on WASM](https://internals.rust-lang.org/t/running-rustc-on-wasm/16198) — rust-lang internals, Feb 2022, closed without a path.
- [rust-analyzer/rust-analyzer-wasm](https://github.com/rust-analyzer/rust-analyzer-wasm) — rust-analyzer as a Wasm build.
- [web.dev: COOP and COEP](https://web.dev/articles/coop-coep), [MDN: Cross-Origin-Embedder-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Embedder-Policy), [WebReflection/mini-coi](https://github.com/WebReflection/mini-coi), [gzuidhof/coi-serviceworker](https://github.com/gzuidhof/coi-serviceworker) — isolation mechanics and the service-worker workaround. Safari's `credentialless` support is the one claim left unresolved: sources conflict.
- [npm @wasm-fmt/gofmt](https://www.npmjs.com/package/@wasm-fmt/gofmt) — 0.7.3, MIT. `@wasm-fmt/rustfmt` returns 404 from the registry.

Internal: `README.md`, `app/_components/runtime/` (`cdn.ts`, `browsercc.ts`, `cheerpj.ts`, `dotnet.ts`, `adapters.ts`, `c.tsx`, `cpp.tsx`, `r.tsx`), `app/_components/types.ts`, `app/_components/cmExtensions.ts`, `AGENTS.md`, `.github/workflows/block-outputs.yml`, and the prior report `agent-outputs/20260706-0224-web-dev-playgrounds-browser-wasm-research.md`.
