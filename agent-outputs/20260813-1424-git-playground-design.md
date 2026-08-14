# Git Playground — Design

**Date:** 2026-08-13
**Status:** Design proposal, no code written yet
**Scope:** A browser-based Git runtime powering (a) a full-page playground at
`/playground/git`, (b) runnable `<GitBlock>`s in course prose, and
(c) graded `<GitChallengeCard>`s — with local + cloud persistence.

---

## 1. Decision summary

| Question | Answer |
| --- | --- |
| Runtime | **isomorphic-git** (library), not wasm-git, not the `isogit` CLI |
| Terminal-only UI? | **No.** Terminal for input, live state panels for the model |
| Terminal component | Custom React console, **not** xterm.js |
| Repo state | Custom React/SVG components, re-rendered after every command |
| Local persistence | OPFS, via an `fs` shim over the existing `opfs/` layer |
| Cloud persistence | Existing `DSB2` bundle → R2 bytes + D1 metadata, **no migration** |
| Bundle risk | **Measured: fits.** 266.81 KiB headroom; git adds ~0 under §8.4 |

The single highest-value component in the whole design is the **three-areas
panel** (§4.1), and the single best idea is the **live objective checklist** on
challenge cards (§5.2). Both fall directly out of the runtime choice.

---

## 2. Runtime: isomorphic-git

### 2.1 Why not the `isogit` CLI

isomorphic-git ships a CLI, which looks at first like it solves the terminal
problem for free. It does not. Per its own docs it is "a thin shell that
translates command line arguments into the equivalent JS API commands" — the
flags are the **JS API's option-object property names**, and there are no
positional arguments at all:

```
isogit clone --url=https://github.com/isomorphic-git/isomorphic-git --depth=1 --singleBranch
```

| Real git | isogit |
| --- | --- |
| `git add README.md` | `isogit add --filepath=README.md` |
| `git commit -m "msg"` | `isogit commit --message="msg" --author.name=… --author.email=…` |
| `git checkout -b feature` | `isogit branch --ref=feature` + `isogit checkout --ref=feature` |

For a scratchpad that is a nuisance; for a **Git course** it is disqualifying.
Learners would build muscle memory for a syntax that exists nowhere else and
would not discover the problem until they reached a real terminal. The docs
also concede `onAuth` cannot be expressed through the CLI, so authenticated
remotes are out regardless. It is also Node-only (`fs`, `isomorphic-git/http/node`).

### 2.2 Why not wasm-git

wasm-git (libgit2 via Emscripten) has one real advantage: **authentic
semantics and error strings**, because it is actually git's engine. A learner
who googles one of its error messages finds real answers.

It loses on everything else that matters here:

- **Command coverage is the `lg2` examples CLI**, a subset of libgit2, and its
  exact flag support is unverified. The curriculum ceiling would be set by
  something we would have to discover empirically.
- **Introspection is the blocker.** The visualizer needs HEAD, refs, and the
  commit graph *as data*. With libgit2 that means parsing CLI text output, or
  forking wasm-git to add a `dump-state` JSON command. A fork is a permanent
  maintenance cost on the critical path of the product's main feature.
- Emscripten hazards: `callMain` exit state, aborts that wedge the module,
  a worker-restart path to build.

### 2.3 Why isomorphic-git wins

**You write a command parser either way.** Neither option gives you a real
`git` CLI, so "does it ship a CLI" contributes nothing to the decision. Once
that is neutralised, introspection decides it:

- **`statusMatrix()` returns `[filepath, HEAD, workdir, stage]` per file.**
  That is literally the three-areas panel's data model, handed over with no
  derivation. This is the product's core teaching component.
- `log()`, `listBranches()`, `resolveRef()`, `readCommit()`, `readTree()`,
  `readBlob()` give the commit graph and object model as structured objects.
- Plain JS in the browser: no Emscripten FS, no abort-recovery path.
- Snapshotting for undo is straightforward.

Coverage: `merge`, `cherryPick`, `stash`, `tag`, `notes`, `fastForward`,
`abortMerge`, `resetIndex`, plus plumbing (`readCommit`/`writeCommit`/
`writeTree`/`writeRef`). Missing: **`rebase`**, `reflog`, `bisect`.

Note `rebase` is missing from libgit2's example CLI too, so neither option
provides it. isomorphic-git at least exposes enough plumbing to implement a
teaching-grade `git rebase` in JS later; wasm-git would require C work.

**Cost accepted:** error messages are isomorphic-git's, not git's. Mitigation:
we own the parser layer, so we emit git's actual wording ourselves for the
common failures.

---

## 3. Full-page playground (`/playground/git`)

### 3.1 Layout

```
┌────────────────────────────────────────────────────────────────────┐
│ workspace name   [Reset ▾] [Save] [Share]        Supported commands│
├──────────────┬─────────────────────────┬───────────────────────────┤
│ WORKING TREE │  TERMINAL               │ HEAD → main → a1b2c3d     │
│ ● README.md  │  $ git add README.md    │ ┌─ three areas ─────────┐ │
│ ● notes.txt  │  $ git status           │ │        WT  IDX  HEAD  │ │
│ ○ src/       │  On branch main         │ │ README  ·   ●    ·   ⚡│ │
│ [+ New][↑]   │  Changes to be...       │ │ notes   ●   ·    ●    │ │
│──────────────│                         │ └───────────────────────┘ │
│ CodeMirror   │  $ ▊                    │ ┌─ commit graph ────────┐ │
│ (file │ diff │                         │ │  ● main ←HEAD         │ │
│  │ conflict) │                         │ │  │  ○ origin/main     │ │
└──────────────┴─────────────────────────┴───────────────────────────┘
                                            ⚡ = changed by last command
```

Mobile: the same three as tabs, terminal default (reuse `playgroundTabs.ts`).

**The refresh loop is the product.** After every command completes, re-read
repo state and re-render both right-hand panels, diffing against the previous
snapshot so the changed rows can flash. The learner types `git add README.md`
and *watches* a dot move from Working Tree to Index. That is the entire
pedagogical payload; everything else is support.

### 3.2 The one rule: the terminal is the only mutator

No "Commit" button, no click-to-stage. Buttons that perform git operations
teach our GUI, not Git, and the skill has to transfer to a real shell. The
panels are strictly read-only views.

**One carve-out:** a command palette / cheat sheet that **inserts** into the
terminal input rather than executing. Click "stage everything" → the input
fills with `git add .` → the learner presses Enter. Removes the memorisation
wall without removing the practice.

File editing and upload are exempt — that is the working tree, not Git.

### 3.3 Terminal: custom console, not xterm.js

wasm-git and isomorphic-git are both non-interactive: no TTY, no ANSI cursor
control, no Ctrl-C, no pager. xterm.js would cost ~250KB and a theming/a11y
fight to emulate something with nothing to emulate.

A React console — scrollback of `{command, output}` blocks plus a single-line
input — is small, themes off the existing `playground.css` tokens, is
selectable and screen-reader navigable, and maps onto the existing
`OutputCell` idea in `app/_components/types.ts`.

The decisive advantage: **rich blocks inside the transcript.** A colorized
diff after `git diff`. An inline mini-graph after `git log --graph`. A hint
callout under an error ("`fatal: not a git repository` — you need `git init`
first"). None of that is expressible in xterm.

Table stakes: ↑/↓ history, tab-completion over commands + branches + paths,
Ctrl-L, persistent scrollback across reload.

### 3.4 Where CodeMirror fits — four roles

In the language playgrounds the editor *is* the product. Here it is a
supporting surface with four distinct jobs:

1. **Working-tree editing.** Click a file → CodeMirror opens on it,
   write-through to the FS on change (same contract `PlaygroundSplitEditors`
   has with OPFS today).
2. **Conflict resolution.** `@codemirror/merge` is already a dependency
   (`^6.12.2`; `Playground.tsx:15` uses `unifiedMergeView` for AI
   suggestions). `MergeView` gives side-by-side conflict resolution.
   **Keep raw `<<<<<<< HEAD` markers as the default with a "resolve visually"
   toggle** — in a real terminal the markers are what they will face, and
   teaching only the pretty view produces learners who are helpless outside
   this site.
3. **Diff rendering.** `git diff`, `git diff --staged`, `git show` render as a
   read-only `unifiedMergeView` — inline in the transcript when short, in the
   right pane when long.
4. **Commit message editor.** `git commit` with no `-m` opens a modal CM
   buffer prefilled with `#`-commented status; empty message aborts. People
   who only learn `-m "fix"` never learn to write a commit body, and this is
   the one environment that can enforce the habit.

**Mechanics:** the editor is a *mode* of the left pane, not a fourth column.
Merge view and commit-message editor take over the centre as overlays. The
terminal must never lose scroll position or focus history.

---

## 4. Repo state components

All read-only, all re-rendered after every command, all diffed against the
previous snapshot so changes can be highlighted.

### 4.1 Three areas (the star)

`statusMatrix()` → `[filepath, HEAD, workdir, stage]`, each 0–3, maps
directly onto three columns:

```
        WORKING TREE      INDEX       HEAD
README.md    ·             ●           ·      ← new, staged
notes.txt    ●             ·           ●      ← modified, unstaged
app.js       ·             ·           ●      ← committed, clean
```

Animate the transition between snapshots. The dot sliding from Working Tree
to Index on `git add` teaches more than a chapter of prose.

### 4.2 Commit graph

From `log()` + `listBranches()` + `resolveRef()`. **Hand-rolled SVG, not a
graph library** — teaching repos are under ~20 commits and ~4 branches, so
lane assignment is ~150 lines and we keep full control of theming and
labelling. A general graph lib buys a layout engine we do not need and fights
`brand.css`. Custom SVG is already the house style (`charts/`).

Label deliberately: branch pills, a distinct `HEAD →` marker, a visibly
different shape when HEAD detaches, and **remote-tracking refs (`origin/main`)
as ghosted pills on the same graph**. Ahead/behind is the most misunderstood
relationship in Git and a graph showing `main` two ahead of `origin/main`
explains `git push` better than prose will.

### 4.3 Pointer chain

One line, always visible: `HEAD → refs/heads/main → a1b2c3d`. Compare
`resolveRef({ref:"HEAD", depth:1})` against the full resolve to detect
detachment and change the line's shape. Tiny component, disproportionate
clarity — it makes "HEAD is a pointer to a pointer" concrete.

### 4.4 Object inspector (phase 2)

Click a commit → `readCommit()` (tree/parents/author); into the tree →
`readTree()`; a blob → `readBlob()`. This is how *commits are snapshots, not
diffs* gets taught — the conceptual keystone. Ship later, but **make graph
nodes clickable from day one** so it is not a retrofit.

---

## 5. Embedded surfaces

The card editor host is clamped to `min-height: 120px` / `max-height: 480px`
(`ChallengeCard.module.css:694`). A three-pane playground does not fit, and
omitting state entirely gives back a plain terminal — the opacity the design
exists to fix.

**Principle: reduce, don't shrink.** Two moves used together:

1. **Progressive disclosure** — one always-visible state *strip*, expandable.
2. **An escape hatch** — "Open in playground" on every block, handing over the
   exact repo state. The bundle codec makes this nearly free.

### 5.1 `<GitBlock>` — runnable blocks

```
┌─ git · linear-history · 3 commits ─────────── [Run] [↗] ─┐
│ $ git log --oneline                                      │  ← editable
├──────────────────────────────────────────────────────────┤
│ a1b2c3d Add README                                       │
│ e4f5g6h Initial commit                                   │
├──────────────────────────────────────────────────────────┤
│ HEAD → main · 3 commits · 1 staged, 1 modified   [▸ state]│  ← the strip
└──────────────────────────────────────────────────────────┘
```

Structurally this is `<CodeBlock>` with the editor holding a command script —
same Run button, same output area, same `RuntimeBootNotice`.

The strip is ~24px, always visible. Expanding slides open a compact
three-areas table plus a small graph (~150px). **Collapsed by default** (a
lesson with twelve blocks cannot afford twelve panels), opened via an
`expandState` prop on blocks where the state *is* the lesson.

A free-typing micro-terminal is deliberately **not** a second component —
that is what `[↗]` is for.

### 5.2 `<GitChallengeCard>` — and the live checklist

Keeps the existing grammar: header badge + title + status,
`renderInstructions`, `TestResultsRail`, Show Solution modal, Reset. Two
things change.

**The tall element is a terminal, not a code editor.** The learner types
commands into the 120–480px slot; the transcript is the work product.

**The test rail goes live.** Every existing card must *run* to learn anything
— Python has to execute before stdout can be asserted. Repo state is cheap to
read after every command, so `GitExpect` can be evaluated continuously:

```
INSTRUCTIONS                      │  ○ Create a branch called feature
Create a feature branch, commit   │  ● Commit README.md on it          ✓ just now
README.md on it, then merge it    │  ○ Merge feature back into main
back into main.                   │
──────────────────────────────────┤  HEAD → feature · 2 commits
$ git checkout -b feature         │  ┌ WT  IDX  HEAD ┐
Switched to a new branch 'feature'│  │ ·    ·    ●   │ README.md
$ git commit -m "Add readme"      │  └───────────────┘
$ ▊                               │
```

Each objective flips green the instant the repo satisfies it, so the learner
sees *which command* did it — exactly the causal link Git normally hides. No
other card in the codebase can do this.

"Check Answer" stays for the finality moment and grammar consistency, but
becomes confirmation rather than the feedback channel. The state strip is
**expanded by default here** (inverse of demo blocks).

### 5.3 The `getSharedRuntime` trap

`getSharedRuntime(RuntimeScope.Fumadocs, adapter)` shares one worker across a
page's cards. Correct for Pyodide (stateless between cards); **wrong for git**
— block 2 would silently inherit block 1's commits, and re-running block 1
would corrupt everything below.

Default to **one repo per block**, re-seeded from its scenario. Make
continuity explicit:

```mdx
<GitBlock repo="lesson-3" scenario="empty" commands={`git init`} />
<GitBlock repo="lesson-3" commands={`git add README.md`} expandState />
<GitBlock repo="lesson-3" commands={`git commit -m "First commit"`} expandState />
```

Blocks sharing a `repo` id share state in document order; blocks without one
are isolated.

**The trap this creates:** a reader who scrolls down and runs step 3 first.
Do not error. Render *"Run step 1 first"* with a **"catch me up"** button that
silently replays the earlier blocks then runs this one. Cheap (we have the
ordered command list) and it rescues the most likely failure on the page.

### 5.4 Cost and seeding

isomorphic-git is ~76–122 KiB gzipped (§8.4) against Pyodide's tens of
megabytes, so per-block weight is a non-issue — git blocks can be sprinkled
through prose the way Python blocks cannot.

Seeding is the real cost. Seed **lazily on first Run**, not on mount (matching
the existing boot pattern), and build each distinct scenario once per page,
handing copies to blocks by cloning the serialized FS — a few-KB copy instead
of replaying commits per block.

---

## 6. Scenarios and the course contract

Define both of these **before writing lesson one**; they are the interface
between the playground and the content.

### 6.1 Scenario fixtures

```ts
interface GitScenario {
  id: string;
  files: Record<string, string>;
  commits: { message: string; files: string[]; branch?: string }[];
  branches?: string[];
  headAt?: string;                  // detached-HEAD scenarios
  dirty?: Record<string, string>;   // uncommitted edits at start
  remote?: GitScenario;             // a second repo acting as origin
}
```

Starter set: empty · linear-history · conflict-pending · detached-HEAD ·
diverged-from-origin. Scenarios are referenced **by string id** from MDX
(`scenario="linear-history"`) — MDX cannot import modules, so they need a
registry resolved the way `getAdapterById` resolves adapters.

**Use a local remote, not the network.** libgit2 and isomorphic-git both
support a second repo as `origin` inside the same FS, so push/pull/fetch and
remote-tracking-branch lessons work offline, deterministically, with no auth
and no abuse surface. Keep HTTPS clone as an opt-in extra through the existing
`cloudflare-cors-proxy`, never on a lesson's critical path.

### 6.2 `GitExpect` — grading on repo state

The stdout-shaped `StdoutExpect` in `challengeHarness.ts` does not fit: the
interesting outcome of `git commit` is not what it printed.

```ts
interface GitExpect {
  headBranch?: string;
  commitCount?: number;
  commitMessageMatches?: string;
  staged?: string[];
  unstaged?: string[];
  branchesExist?: string[];
  fileAtHead?: { path: string; contains?: string };
  isDetached?: boolean;
  graphShape?: "linear" | "merged" | "diverged";
}
```

Register as a `HarnessBuilder` under the `git` id so `MdxChallengeCard` picks
it up the same way the language challenges do.

### 6.3 Reset — three tiers

- **Reset workspace** — wipe the FS, re-seed the scenario. Confirm dialog.
- **Reset to lesson start** — course mode, re-seeds that lesson's fixture.
- **Step back one command** — snapshot the FS before each command (kilobytes,
  effectively free) for a time-travel scrubber over command history.

The third is the one worth building. Learners abandon Git precisely when they
have wrecked the repo and do not know which of four recovery commands applies.
Rewinding one step and trying another is an affordance real Git cannot offer.

---

## 7. Persistence

### 7.1 OPFS (local)

isomorphic-git takes a pluggable `fs`. **Implement its interface directly over
OPFS** rather than using lightning-fs and syncing — one source of truth, no
sync step. `app/_components/opfs/fileStorage.ts` is most of the way there.

Required: `readFile/writeFile/unlink/readdir/mkdir/rmdir/stat/lstat/symlink/
readlink`. OPFS has no symlinks — throw `ENOSYS`; playground repos will not
have any. The existing registry, per-tab active workspace, and draft-vs-saved
logic in `activeWorkspace.ts` then apply unchanged.

### 7.2 Cloud (R2 + D1) — no migration needed

The `DSB2` container in `bundleCodec.ts` is already the right shape:

```
magic "DSB2" | u32 header len | JSON header | raw binary section
```

Add `"git"` to `BundleKind`. JSON header carries scenario id, command history
(for time travel), and terminal scrollback; the binary section carries a
**tar of the whole FS** — working tree plus `.git`. This is exactly the SQL
precedent stated in `lib/workspaces/types.ts`: *"carry the engine's native
database image… reopened by loading the image straight into the in-browser
engine, no dump replay."*

Use a tar, **not** `packObjects()`/`indexPack()` — restoring refs through a
packfile is fiddly, and a tar is inspectable and obviously correct. Loose
objects are already zlib-deflated so the outer gzip does little for `.git`,
but at these sizes it is noise: a lesson repo is ~50 KB against a 25 MB
free-tier item cap.

`cloud_workspaces` needs no schema change — `playground` is free TEXT and
`manifest` is display-only JSON. A git manifest
(`{kind:"git", head:"main", branches:[…], commitCount:7}`) lets the workspace
list render "main · 7 commits" without fetching R2. Share links work unchanged
through `playground_shares`, which quietly yields a great course feature: **a
stuck learner shares a link reproducing their exact broken repo.**

### 7.3 Two gotchas

1. `CODE_PLAYGROUND_IDS` in `lib/workspaces/types.ts` is a literal list and
   `__tests__/workspacesCloud.test.ts:83` asserts it covers every
   `app/playground/<id>` directory. Creating `app/playground/git/` fails that
   test until registered. Since git is neither `code` nor `sql`, add a third
   `GIT_PLAYGROUND_IDS` plus edits to `isKnownPlayground`,
   `bundleKindForPlayground`, and `validateBundle`'s `kind` check — four
   places, one file.
2. `validateBundle` bounds files/tabs via `BUNDLE_MAX_FILES`, but a tar
   section is a **new untrusted format**. Apply entry-count and per-entry-size
   caps when unpacking, or a hostile share declaring a million tiny files
   wedges the recipient's storage before `MAX_DECOMPRESSED_BYTES` trips.

---

## 8. Bundle budget

### 8.1 The constraint and the current number

Cloudflare Workers Paid caps a Worker at **10 MiB (10240 KiB) gzipped**. The
deploy runbook (`agent-outputs/20260620-1640-cloudflare-deploy-runbook.md`)
recorded ~9.96 MiB with ≈38 KiB headroom on 2026-06-20.

**Measured on this branch, 2026-08-13** (`npx opennextjs-cloudflare build &&
npx wrangler deploy --dry-run`, commit `95471a57`):

```
Total Upload: 52159.64 KiB / gzip: 9973.19 KiB
```

| | KiB gzipped |
| --- | --- |
| Worker | **9973.19** |
| Limit | 10240 |
| **Headroom** | **266.81** (2.6%) |

Headroom has *improved* since June (38 → 267 KiB), but 2.6% is still thin.

### 8.2 What actually lands in the Worker

Two different lazy-loading patterns exist in this repo and they do **not** do
the same thing:

| Pattern | Effect |
| --- | --- |
| `lazyWidgets.ts` — `dynamic()`, **SSR on** | Splits the *client* bundle per lesson. Widget is **still in the Worker** (it is server-rendered). |
| `CustomItemRendererLazy` — `dynamic(…, {ssr:false})` | Keeps the graph **out of the Worker** entirely. Costs SSR HTML. |

So the MDX widget registration pattern reduces per-lesson JS but buys **zero**
Worker headroom. Only `ssr: false` does that.

Heavy WASM never enters either bundle because it is fetched at runtime:
CDN dynamic imports carrying `/* webpackIgnore */ /* turbopackIgnore */`
(PGlite, DuckDB, sqlite-wasm, PHP, .NET) or prebuilt static workers under
`public/_workers/` (`scripts/build-almostnode-workers.mjs`).

### 8.3 Measured breakdown

**Method.** Turbopack chunk names are opaque hashes, so a first pass that
fingerprinted chunks by counting library-name substrings produced a wrong
answer: it reported a large "plotly + duckdb + arrow" bucket that does not
exist. Those hits were *prose* — `lib/generated/images.js` holds illustration
prompts whose text mentions those tools. The numbers below come from a
sounder method: esbuild's metafile
(`.open-next/server-functions/default/handler.mjs.meta.json`) gives exact raw
bytes per input, then **each Turbopack chunk's own sourcemap** splits those
bytes across real module paths, scaled by the chunk's measured gzip ratio.
36.69 MB of 41.44 MB (88.5%) attributes this way; the estimated total lands at
~9884 KiB against the deployed 9973 KiB.

| GZ KiB | Share | Raw MB | Component |
| ---: | ---: | ---: | --- |
| **1758** | 17.8% | 10.47 | **`lib/generated/charts.js` — 2 copies** |
| 1623 | 16.4% | 5.77 | React + Next runtime |
| 990 | 10.0% | 3.54 | Our app code (`app/`, `lib/`) |
| 750 | 7.6% | 4.95 | Shiki (`@shikijs/*` grammars + oniguruma) |
| **487** | 4.9% | 1.59 | **`elkjs`** (ER-diagram layout) |
| 365 | 3.7% | 1.25 | `lib/generated/images.js` |
| 330 | 3.3% | 0.93 | CodeMirror + `@lezer` language modes |
| 316 | 3.2% | 1.13 | `lucide-react` |
| 294 | 3.0% | 1.05 | `katex` |
| 223 | 2.3% | 0.84 | `.source/dynamic.ts` (Fumadocs content index) |
| 201 | 2.0% | 0.61 | `@base-ui/react` |
| 185 | 1.9% | 0.71 | `zod` |
| 166 | 1.7% | 0.51 | Fumadocs |
| 154 | 1.6% | 0.52 | `parse5` |
| 143 | 1.4% | 0.48 | `acorn` |
| 114 | 1.1% | 0.61 | `@polar-sh/sdk` |
| 98 | 1.0% | 0.33 | `highlight.js` |
| 55 | 0.6% | 0.24 | `apache-arrow` |

**Good news first: the CDN strategy is working.** Plotly, Pyodide and
duckdb-wasm are **absent** from the Worker entirely — the
`webpackIgnore`/`turbopackIgnore` CDN imports and the prebuilt
`public/_workers/` bundles do exactly what they were built to do. Only a
55 KiB `apache-arrow` remnant survives.

**The single biggest occupant is our own generated chart data.**
`lib/generated/charts.js` is 5,980,287 bytes on disk and is in the Worker
**twice**, ~1.72 MiB gzipped, ≈18% of the whole thing — and it is *data*, not
code. The two copies are not a server/SSR split as first assumed; they map to
two separate compilation graphs (§8.6.1).

#### Verification (direct measurements, independent of the attribution script)

The GZ column above is an estimate (each module's raw bytes × its chunk's
measured gzip ratio). The rows that drive decisions were re-checked directly:

- **charts.js**: standalone gz is 897 KiB; the two chunk copies measure
  891 + 887 = **1778 KiB gz direct** — the table's 1758 slightly
  *under*states it. `_13l8iog._.js`'s sourcemap lists exactly four sources
  (`app/api/admin/charts/route.ts`, `lib/generated/charts.js`,
  `lib/charts/regenMarks.ts`, Next's route template), confirming both that
  the chunk is ~pure manifest and that it exists solely for the API route.
- **elkjs**: exact VLQ decode of `ssr/_0it6b2w._.js` puts
  `elk.bundled.js` at 1416 KiB of the chunk's 1570 KiB mapped (~90%), with
  `@xyflow/react` + `@xyflow/system` (118 KiB) and `ErDiagramPane.tsx`
  most of the rest — i.e. the chunk *is* the SqlCardDialogs subtree. The
  chunk's direct gz is **479 KiB** (elk.bundled.js standalone: 456 KiB),
  so read the table's 487 as "the dialogs chunk, ~479 measured".
- **images.js**: 579,247 raw / 150 KiB gz standalone; two copies =
  **~300 KiB gz**, so the table's 365 modestly overstates it (prose-heavy
  JSON gzips better than its chunks' average ratio).
- **Absences**: zero chunks in the Worker input tree contain plotly's
  `_fullLayout` or `loadPyodide`. The one `AsyncDuckDB` hit is
  `app__components_runtime_duckdb_ts` — our own 30 KB adapter glue that
  performs the CDN import, not the library.

### 8.4 Rules that keep git's Worker cost at ~0

1. **isomorphic-git must never be statically imported from any module
   reachable by SSR.** Put the engine in a prebuilt worker at
   `public/_workers/git-worker.js` via the existing
   `build-almostnode-workers.mjs` esbuild pipeline, spawned as
   `new Worker("/_workers/git-worker.js", {type:"module"})`. Then its
   ~76–122 KiB gzipped is a **static asset**, in neither bundle. (Measured:
   `index.js` 533K raw / 122K gz; `index.umd.min.js` 256K raw / 76K gz.)
2. **`app/playground/git/page.tsx` uses `ssr: false`.** The existing
   playground pages statically import `Playground` and are therefore in the
   Worker — part of why it is at 9.96 MiB. A playground shell has nothing to
   index; follow `CustomItemRendererLazy`, not `app/playground/python/page.tsx`.
3. **`<GitBlock>` / `<GitChallengeCard>` register through `lazyWidgets.ts`**
   for client-bundle splitting, accepting that their component shells are in
   the Worker. That cost is small because they reuse `challengeShared`,
   `TestResultsRail` and CodeMirror, which are already there.

### 8.5 Verdict: does Git fit?

**Yes, comfortably — if built to the rules in §8.4.**

| Scenario | Worker cost | Fits in 266.81 KiB? |
| --- | --- | --- |
| Engine in `public/_workers/git-worker.js` (§8.4.1) | ~0 KiB | ✅ trivially |
| Playground page with `ssr: false` (§8.4.2) | ~0 KiB | ✅ |
| `<GitBlock>` / `<GitChallengeCard>` shells, SSR on | tens of KiB (reuse CodeMirror + `challengeShared`, already present) | ✅ |
| **Naive**: static `import * as git from "isomorphic-git"` reachable by SSR | +76–122 KiB | ⚠️ fits, but eats **29–46% of all remaining headroom** for nothing |

So Git is affordable. The rules matter not because Git is heavy but because
the margin is thin enough that a careless import is a meaningful fraction of
it.

### 8.6 What can be moved out of the Worker

#### 8.6.1 `charts.js` — two copies, two different fixes

The duplication is not a server/SSR split. Each copy belongs to a distinct
compilation graph:

| Copy | Chunk | GZ | Referenced by |
| --- | --- | ---: | --- |
| A | `chunks/ssr/lib_generated_charts_0-dabtn.js` | ~887 KiB | `courses/[...slug]`, `interview-prep/[...slug]`, `fumadocs-dev/[[...slug]]`, `dashboard/admin/charts/[[...page]]` |
| B | `chunks/_13l8iog._.js` | ~891 KiB | **only** `api/admin/charts/route.js` |

Both verified to contain the manifest (the `ab-test-peeking` slug appears in
each). API routes compile as their own graph, so they get their own copy.

**Copy B is nearly free to remove — the best item in this audit.**
`app/api/admin/charts/route.ts` imports the entire manifest, every chart's
serialized `svg` included, and uses it in exactly two places
(`route.ts:146`, `route.ts:194`):

```ts
if (!slug || !chartManifest[slug]) {
  return json({ error: "Unknown chart slug." }, 400);
}
```

It is a slug existence check. Have `build-charts.mjs` also emit
`lib/generated/chart-slugs.js` (a string array, a few KB) and import that
instead: **~891 KiB gz — 8.9% of the Worker — for a near-trivial change.**

**Copy A is a real job.** `Chart.tsx` inlines `entry.svg` into the HTML, and
the slug lookup is dynamic so nothing tree-shakes. The fix is to split the
manifest: keep metadata (`title`, `caption`, `width`, `height`, `minWidth`,
`usedBy`) in the JS module and move the `svg` bodies — the overwhelming bulk —
to per-chart static assets, fetched through the `ASSETS` binding at render
time. `Chart` becomes an async Server Component. Prerendered pages already
carry the markup, so the fetch only happens on cache-miss re-renders.

**Spike it before committing:** `open-next.config.ts` documents that
on-demand re-renders run in workerd with no `node:fs`, so the load path must
be `env.ASSETS.fetch()` (or equivalent), not a file read. jsDelivr via
`cdn-assets/` also works but is operationally worse here — charts change
often and that route needs a git tag bump per change.

#### 8.6.2 `elkjs` (487 KiB gz) — wrong kind of lazy

`ErDiagramPane.tsx:20` imports `elkjs/lib/elk.bundled.js`. It reaches the
Worker through `sqlCardTools/SqlCardDialogs.tsx`, which `SqlCardToolsMenu`
loads with a bare `import("./SqlCardDialogs")`. That splits the *client*
bundle — which is what the comment there intends — but leaves the module in
the route's server graph, so the Worker still pays.

`SqlPlayground.tsx:132` and `PostgresPlayground.tsx:73` already use
`dynamic(…, { ssr: false })` for the same pane. Applying that to the card
path drops the whole dialogs chunk — **479 KiB gz, directly measured**
(elkjs is ~90% of it, `@xyflow/react` most of the rest) — plus whatever of
the second CodeMirror configuration lives in adjacent chunks. These dialogs
only ever open from a click, so they are never server-rendered — nothing is
lost.

This is the same trap as §8.2 in a third form: a bare `import()` splits the
client bundle, `next/dynamic` with SSR on splits the client bundle, and only
`ssr: false` removes Worker weight.

#### 8.6.3 `images.js` (365 KiB gz)

Same shape as charts — a generated data module with eight importers,
including `api/admin/illustration-prompts/route.ts`, which again gets its own
copy. Same fix family: split ids/metadata from payload, or give the API route
a slim index.

#### 8.6.4 Shiki (750 KiB gz)

`lib/shiki-slim.ts` already lazy-imports grammars per language, but the full
`@shikijs/langs` set still lands in the Worker (`cpp` alone is 0.76 MB, and
it appears twice). Trimming the language table to what the corpus actually
uses is a plausible 300–500 KiB. Worth also asking why `highlight.js`
(98 KiB) is present alongside it.

#### 8.6.5 Not movable

React + Next runtime (1623 KiB), Fumadocs plus `.source/dynamic.ts`
(389 KiB combined), and the server-rendering dependencies (`zod`,
`@base-ui/react`, `parse5`, `acorn`) are the framework and the content index.
Treat these as fixed cost.

Smaller items worth a look: `lucide-react` at 316 KiB despite
`optimizePackageImports`, `katex` at 294 KiB (needed only on math lessons),
and `@polar-sh/sdk` at 114 KiB (billing routes only).

#### 8.6.6 Recovery summary

| Fix | GZ KiB | Basis | Effort | Risk |
| --- | ---: | --- | --- | --- |
| `chart-slugs.js` for the admin API route | ~891 | direct | trivial | very low |
| `ssr: false` on `SqlCardDialogs` | ~479 | direct | small | low |
| Chart SVG bodies → `ASSETS` | ~887 | direct | medium | medium — spike first |
| Same treatment for `images.js` | ~300 | direct | medium | medium |
| Trim Shiki grammars | 300–500 | estimate | medium | low |

Plausible total ≈ **2.8–3.0 MiB**, which would take the Worker from 9.74 MiB
to roughly 6.8 MiB — near the "~5–6 MiB" the June runbook projected.

**Recommendation:** Git does not need to wait for any of this. But the first
two rows are cheap enough to be worth doing regardless, and together they
recover ~1.4 MiB — about five times the current total headroom.

### 8.7 Applied 2026-08-13: the two direct-basis fixes

Both cheap rows were implemented on this branch and measured:

```
before: Total Upload: 52159.64 KiB / gzip: 9973.19 KiB
after:  Total Upload: 43546.90 KiB / gzip: 8423.84 KiB
```

**−1549.35 KiB gzipped (−15.5%). Headroom: 266.81 → 1816.16 KiB (17.7%).**
The result beats the ~1370 KiB prediction because dropping `SqlCardDialogs`
from the server graph also removed its adjacent modules (`DdlViewer`'s second
CodeMirror configuration, `@xyflow`), not just the elkjs chunk.

What changed:

- `scripts/build-charts.mjs` additionally emits
  `lib/generated/chart-slugs.js` (9 KB slug array; committed `.d.ts`
  sibling, gitignored like `charts.js`, and the digest fast-path exits only
  when the slugs file exists too). `app/api/admin/charts/route.ts` imports
  that instead of the manifest and checks a `Set`. Verified: zero
  `lib_generated_charts` references remain in the API route's graph.
- `SqlCardToolsMenu` loads `SqlCardDialogs` via
  `dynamic(…, { ssr: false })` with a portaled backdrop-spinner fallback,
  replacing the bare `import()`. Verified: zero server chunks contain
  elkjs (`org.eclipse.elk`). Behavior trade: the chunk now starts
  downloading on the first ER-diagram/DDL click rather than on menu open
  (a second bare `import()` for preload would put the module straight back
  into the Worker); the fallback backdrop covers the wait.

### 8.7.1 Applied 2026-08-13, round two: the three medium levers

```
round 1: 9973.19 → 8423.84 KiB gzip   (slug index + ssr:false dialogs)
round 2: 8423.84 → 7240.41 KiB gzip   (this round)
```

**Cumulative: −2732.78 KiB (−27.4%) in one day. Headroom: 266.81 →
2999.59 KiB (29.3%).**

What round two changed:

- **Chart SVG bodies → static assets (§8.6.1 copy A).** `build-charts.mjs`
  writes one `public/chart-svgs/<slug>.svg` per chart and the manifest keeps
  metadata only (`svg` → `svgBytes`); `charts.js` fell 5.98 MB → 453 KB on
  disk, and the remaining Worker copy is 382 KB raw. `<Chart>` is now an
  async server component reading through `lib/charts/loadChartSvg.ts` →
  `lib/serverAssets.ts`, which tries `node:fs` first (build machine,
  `next dev`) and falls back to the `ASSETS` binding (workerd, where unenv's
  fs throws). The admin gallery loads only its 20-chart page slice; the
  chart check scripts read the asset files. Verified: prerendered lesson
  HTML still contains the full inlined markup (checked an actual path string
  in the built cache), and zero server chunks contain chart path data.
- **Playground pages `ssr: false` (§8.8).** The 11 language pages now match
  the SQL pages' existing pattern: `page.tsx` holds
  `dynamic(() => import("./client"), { ssr: false })` and the new
  `client.tsx` holds the `Playground` + adapter imports, so the whole graph
  stays out of the server compile. Verified: zero references to the
  Playground component graph remain under the playground routes' server
  output.
- **Illustrations route reads a JSON asset (§8.8).** `build-images.mjs`
  additionally emits `public/_gen/illustration-gallery.json` (manifest +
  created-at timestamps, write-if-changed so no-op runs stay no-ops), and
  `app/api/admin/illustration-prompts` fetches it per isolate via
  `readPublicAsset` instead of importing `images.js` + `created-at.js`.
  Verified: zero manifest references in that route's graph.

Supporting changes: `.gitignore` covers `public/chart-svgs/` and
`public/_gen/`; `outputFileTracingExcludes` covers both so nft's fs-call
analysis cannot trace the assets into the server function.

### 8.8 Remaining levers, traced to their importers

A second pass over what is left (post-fix Worker: 8423.84 KiB, headroom
1816 KiB), answering "can X leave?" per component rather than by size alone.

**KaTeX (294 KiB) — not removable, and a CDN does not help.** Three import
paths, three different situations:

1. `source.config.ts` → `rehype-katex` in the fumadocs-mdx pipeline. Courses
   run in dynamic mode, so a cache-miss re-render compiles MDX *in the
   Worker*; math lessons need KaTeX server-side. workerd cannot import
   modules from URLs at runtime, so "load from CDN" is not expressible for
   server code at all — the CDN trick the playground runtimes use works
   because they run in the *browser*.
2. `challengeShared.tsx` / `MultipleChoiceQuestion.tsx` render card
   instructions through react-markdown + rehype-katex. These are SSR'd
   deliberately (the `lazyWidgets` rationale: prerendered HTML keeps every
   widget for SEO and zero layout shift), and hydration needs the same
   plugin synchronously, so it cannot be deferred client-side either.
3. `AskAiWidget` — already behind `dynamic(…, {ssr:false})` (`AskAi.tsx:23`);
   its copy never reaches the Worker.

**highlight.js (98 KiB)** — same verdict as KaTeX path 2 (`rehype-highlight`
in the SSR'd instruction renderer). It is not redundant with Shiki: Shiki
highlights MDX code blocks in the compile pipeline; highlight.js highlights
learner-authored markdown at render time.

**Shiki (750 KiB)** — mostly already optimized, estimate revised down. The
big win was taken previously: `next.config.ts:34-44` aliases the bare
`shiki` specifier to `lib/shiki-slim.ts`, whose 21-language registry
replaced the full bundled set ("~1.3 MiB of the Worker" per its comment).
Checked against the corpus fence census: every registered language is used
except `haskell` (0 fences; `rust`/`sas`/`toml` have 1 each) — dropping
haskell saves single-digit KiB. The remaining cost is that every grammar
appears **twice** (`chunks/` and `chunks/ssr/` graphs, 4.1 MB raw total),
which is a bundler-graph artifact, not a language-list problem. The earlier
"trim 300–500 KiB" estimate was wrong; treat Shiki as near-fixed cost.

**images.js (365 KiB) — not the charts pattern.** Its entries are already
small metadata (`{hash, width, height, formats}`) and the illustrations
route *reads* them (`cutoutFor` needs formats + dimensions), so no free
slug-index swap. A subset manifest (illustration ids only, emitted by
`build-images.mjs`) would remove most of the API route's copy: **~150 KiB
gz, medium-small effort.**

**Playground pages (~200–400 KiB, estimate) — the same `ssr: false` lever,
one level up.** Every `app/playground/<id>/page.tsx` statically imports its
playground component, so the `Playground.tsx` graph (5,100 lines), the
SQL playground graph, `sql-formatter` (72 KiB), and part of the CodeMirror
bucket (330 KiB) sit in the Worker for pages whose body cannot function
without a browser anyway. `metadata` lives in each route's `layout.tsx` and
stays server-rendered; the body becomes a skeleton until hydration. This is
exactly the pattern §8.4.2 already prescribes for the Git playground page —
applying it to the existing 14 is the same change, with the same trade.

**@polar-sh/sdk (114 KiB)** — replaceable with direct REST calls from the
billing routes; medium effort, touches money paths, low urgency at current
headroom.

**Left alone deliberately:** `lucide-react` (icons in actual use;
`optimizePackageImports` already scopes it), `zod`/`@base-ui`/`parse5`/
`acorn`/fumadocs/`.source/dynamic.ts` (the request-time MDX compile
machinery — the only lever over that family is eliminating request-time
compilation entirely, i.e. the static-export question, which is an
architecture decision rather than a bundle fix).

Ranked, what remains actionable: charts copy A → `ASSETS` (~887, needs the
workerd spike) > playground pages `ssr: false` (~200–400) > images.js subset
(~150) > polar REST (~114). Everything else is framework or load-bearing.

---

## 9. Spikes and open questions

1. ~~Measure the Worker today~~ — **done, §8**: 9973.19 KiB gz, 266.81 KiB
   headroom. Git fits; the rules in §8.4 keep its cost at ~0.
2. **OPFS `fs` shim** — confirm isomorphic-git is happy with an async OPFS
   backend under concurrent access (`async-lock` is one of its deps).
3. **Local remote transport** — confirm a second in-FS repo works as `origin`
   for push/pull/fetch. The offline curriculum depends on it.
4. **Parser scope** — decide the supported command list and **publish it in
   the UI**. The fastest way to lose a learner is a command that silently does
   nothing.
5. **`rebase`** — decide whether to implement on plumbing in phase 2 or scope
   the curriculum around it.

## 10. Suggested phasing

| Phase | Contents |
| --- | --- |
| 1 | `git-worker.js` + parser + console + three-areas panel. Playground only. |
| 2 | Commit graph, pointer chain, scenarios, reset tiers, OPFS persistence. |
| 3 | Cloud save/share (`BundleKind: "git"`), `[↗]` handoff. |
| 4 | `<GitBlock>`, `<GitChallengeCard>` + `GitExpect` + live checklist. |
| 5 | Object inspector, conflict merge view, `rebase` on plumbing. |
