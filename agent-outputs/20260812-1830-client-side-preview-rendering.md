# Client-side preview rendering for the web and react blocks

**Date:** 2026-08-12
**Status:** **All four phases are built** (§8 records what shipped and where it
departed from the plan). §1–§7 are as written before any of it, so the
reasoning can be checked against the result.
**Scope:** The 64 `<CodeBlock adapter="web|react">` instances that
[`build-block-outputs`](../scripts/build-block-outputs.mjs) cannot prepopulate,
and what it would take to have them show their result without the reader
pressing Run. §1–§2 are the findings, §3–§5 the options, §6 the recommendation.

---

## 1. The short answer

Yes — and the two adapters are so different in cost that the difference should
drive the whole design.

**`web` is essentially free.** `webAdapter.run()`
(`app/_components/runtime/web.tsx:412`) composes a string and mounts an iframe.
There is no runtime download at all; the adapter's own `runtimeInfo.notes` says
so. `composeWebDocument()` is a **pure function** of the block's source, and it
already carries a Node fallback for base64 because the unit tests call it
outside a browser. Rendering these previews costs a `srcdoc` parse.

**`react` is expensive.** It boots an esbuild-wasm worker (a multi-megabyte
payload from jsDelivr) and then the preview document fetches React from esm.sh.
Auto-running that on page load is a real bandwidth decision, not a free one.

That asymmetry is the single most important fact in this document. Every option
below is cheap for `web` and contested for `react`, and the sequencing in §6
exists to keep the two from blocking each other.

## 2. Scale, and what already exists

### 2.1 Scale

Measured across `content/courses/`:

| | `<CodeBlock>` | `<ChallengeCard>` |
| --- | --- | --- |
| `web` | 42 | 35 |
| `react` | 22 | 15 |

Three courses (`intro-web-development`, `modern-css-layout`,
`react-from-the-ground-up`), and **no lesson page carries more than three**
preview blocks. Only four content files pass `tailwind`. The blast radius is
small enough that a per-page worst case is three iframes, not thirty.

The challenge cards are out of scope throughout — see §5.

### 2.2 Four things that already work in our favour

1. **`HashScrollFix`** (`app/_components/HashScrollFix.tsx`) already solves the
   deep-link problem in general: while a hash target exists it re-aligns the
   viewport on every `ResizeObserver` fire for a 3 s settle window, and any
   scroll intent cancels it. It was written for exactly this class of bug —
   CodeMirror, KaTeX and Mermaid all mounting above the target — so a preview
   that lands inside that window is already handled.
2. **The IntersectionObserver warm-up** (`CodeBlock.tsx:1080`, `rootMargin:
   200px`) is already the right trigger point and already fires once per block,
   and `runtime/warmup.ts` already carries the Save-Data / 2g guard
   (`dataSaverActive()`) that any speculative work should reuse.
3. **`runPreviewDocument()` leaves the iframe live and interactive** after it
   resolves, with the console listener deliberately still attached
   (`webPreview.ts`, the `liveConsoleCleanup` registry). An auto-rendered
   preview is a genuinely usable one — buttons work, `console.log` in a click
   handler still reaches the output panel — not a screenshot.
4. **The prepopulated-output flow is already a solved design.**
   `usePrepopulatedOutput` seeds the same state a run writes, the label reads
   "Output preview" with an Info popover explaining the provenance, and the
   first Run clears it (`CodeBlock.tsx:849`). Whatever we do here can adopt
   that shape rather than invent a second one.

## 3. The real problem is not "can we run it"

It is that **the current empty state is itself a layout shift**, and
auto-rendering merely relocates that shift to page load, where it collides with
anchor navigation.

```css
.previewSlot        { height: 300px; }   /* ChallengeCard.module.css:2780 */
.previewSlot:empty  { height: 120px; }   /* :2792 — "Run the code to render…" */
```

That is a **180 px jump per block**, today, on every manual Run. A page with
three web blocks can move 540 px under the reader while they are reading it.
Auto-rendering does not create this bug; it just makes it fire without anyone
asking.

The output panel is the second source: it is conditionally mounted
(`CodeBlock.tsx:1605`, `outputs.length > 0 || isBusy`), so console cells
arriving after load grow the card again, by an amount nobody knows in advance.

So the design question is not "how do we correct for the shift." It is **"how
do we not shift at all."** Correcting after the fact — extending the settle
window, fighting the reflow with scroll realignment — is the strictly worse
mechanism, because it is a race that the reader can lose and, when they lose
it, the failure looks exactly like the bug `HashScrollFix` was written to fix.
Realignment belongs in this design as a backstop, never as the plan.

## 4. Options

### 4.1 Axis A — Where the preview comes from

**A1. Server-render the composed iframe.** `composeWebDocument()` is pure, so
the composed document can be produced during SSR and shipped as
`<iframe srcdoc="…" sandbox="allow-scripts allow-modals allow-forms"
loading="lazy">` **in the prerendered HTML**. `<CodeBlock>` is a client
component, but Next still renders client components to HTML for the initial
response, so this needs no new server component — only that the composition run
without browser globals, which it already can.

The preview is then present at first paint. No layout shift, no hydration wait,
no client execution, no runtime. It is the same posture prepopulated Python
output already has: the lesson reads end to end without pressing anything.

Two details to work through:

- **The bridge token** is `Math.random()`-based (`newPreviewToken()`), which
  hydration will flag as a mismatch. Either derive it deterministically from
  the block's `blockOutputKey`, or omit the bridge from the server-rendered
  frame entirely and let the client adopt the frame on hydration. The bridge
  only exists to forward console output to the parent; a first-paint frame that
  has not been asked for output does not need one.
- **Persisted buffers.** A reader who edited the block has their buffer
  restored from `localStorage` (`codePersistence.ts`), so the server-rendered
  frame shows the starter and the client would have to re-render their version.
  That is a shift — but only for readers who already edited that specific
  block, who are by definition not reading it for the first time, and who are
  about to press Run anyway.

**A2. Client auto-run on visibility.** Reuse the existing IntersectionObserver
and call the existing `run()`. Far less new machinery: no SSR path, no
hydration questions, no token derivation. But it reintroduces the shift, it
depends on hydration timing, and it does nothing for a reader whose JS has not
executed yet.

**A3. Build-time screenshot.** Extend `capture-browser-outputs.mjs` to snapshot
the iframe into `public/block-outputs/`, and swap in the live frame on Run.
Zero client cost and exactly known dimensions — but it is static, it adds a
third asset class to the manifest, and it re-opens the carry-across hazard
documented in AGENTS.md for `BROWSER_ADAPTERS`.

**Recommendation: A1 for `web`.** It is more work up front than A2, but it
makes the layout-shift question disappear rather than merely tractable, and it
is the only option whose result exists before hydration.

### 4.2 Axis B — What to do about `react`

**B1. Opt-in per block.** The author marks the handful worth the download.
Cheap to build, leaves 22 blocks mostly blank.

**B2. Precompile the bundle at build time.** The esbuild worker
(`esbuild-worker.ts:257`) marks every bare import **external** and rewrites it
to a pinned esm.sh URL (`esmResolve.ts`), so the bundle is a pure function of
the workspace files — no network, no resolution, no node_modules. The identical
`esbuild.build()` call runs in Node with the same options, which means `{js,
css}` can be precomputed into the manifest exactly the way
`build-block-outputs` precomputes cells today.

The reader then pays **no esbuild-wasm at all** — only the esm.sh React fetch,
which the browser caches across the entire course after the first block. That
collapses react's cost to roughly web's, at which point A1 works for react too.

**B3. Leave react manual.** Defensible. It is 22 blocks, and the React course
is the one where "press Run and watch it happen" is closest to the real
workflow being taught.

**Recommendation: B2, as a later phase.** It is the difference between "react
auto-preview is a bandwidth problem" and "react auto-preview is free," and it
is a build-time change with no runtime risk. But it should not gate `web`.

### 4.3 Axis C — Layout-shift containment (needed under every option)

**C1. Make the reserved height unconditional.** Delete the `:empty` height
override so the slot occupies the same space whether or not a frame is in it.
One CSS change; removes the entire preview-panel shift — including the one that
fires on manual Run today, with no auto-rendering anywhere.

**C2. Add a `previewHeight` prop.** 300 px of white space under a 60 px
box-model demo is its own bad outcome, and the reason the `:empty` rule existed
in the first place. Letting the author declare the height per block is what
makes C1 payable.

**C3. Decide the output panel's fate.** Console cells are the remaining
variable-height source. Either reserve a min-height, or have the auto-rendered
path render *visually only* and leave console output to a real Run.

Worth checking before choosing: AGENTS.md records that the browser capture
returns nothing but "the preview didn't finish within the time limit" for
web/react. If that is a harness problem rather than a fundamental one — the
capture reads `window.__blockCapture`, and `runPreviewDocument` resolves 150 ms
after the document's `load` — then web console cells could be prepopulated
through the ordinary manifest path, and only the iframe would need
auto-rendering. That is a short investigation that could remove this axis
entirely.

**Recommendation: C1 + C2 unconditionally.** They are small, they are
independently correct, and they fix a live bug on their own.

### 4.4 Axis D — The boolean prop

A boolean prop is the right shape, but it should be the **escape hatch, not the
switch**:

- **Adapter-level default**, as a field alongside the existing
  `outputCapabilities.preview` (`types.ts:307`), marking whether
  auto-rendering is cheap enough to be the default. `web`: yes. `react`: not
  until B2 lands.
- **Per-block override** on `<CodeBlock>`, forwarded through `MdxCodeBlock`,
  for the ones that should not (or, for react, should).

The reason not to make the prop primary: all 42 web blocks want it on. A prop
that must be remembered on every block is a prop that will be missing from the
next one, and the failure mode is silent — a blank panel is exactly what a
never-configured block looks like, which is the same class of invisible loss
that cost the site 689 r/java/csharp entries for four commits.

## 5. What must never auto-render

- **`<ChallengeCard>`** — all 50 of them. The card appends a test harness and
  the buffer is an *unsolved* starter; auto-running it would print failing
  assertions before the learner has read the task. Hard exclusion, and the
  reason this document is scoped to `<CodeBlock>`.
- **`expectError` blocks** — the failure is the lesson. Showing it unprompted
  spoils the reveal.
- **Save-Data / 2g** — reuse `dataSaverActive()` from `runtime/warmup.ts:52`.
  It already gates every other speculative download on the site.
- **`tailwind` blocks** — only four files, and they are fine to render; just
  know that each one is a CDN script fetch, so they are not free the way the
  other 38 are.

## 6. Sequencing

1. **C1 + C2** — unconditional reserved height and a `previewHeight` prop.
   Improves manual Run today, requires no auto-rendering, ships alone.
2. **A1 for `web`** — server-render the composed iframe, adapter-level default
   with a per-block override, hard exclusion for `ChallengeCard` and
   `expectError`. 42 blocks go from blank to rendered at first paint, with no
   runtime cost and no CLS.
3. **Investigate C3** — can the browser capture record web console cells? If
   so, the output panel is solved through the manifest that already exists.
4. **B2 + A1 for `react`** — precompute the bundle at build time, then run the
   same server-rendered path over the react blocks.

## 7. One thing worth flagging

`<LivePreview>` (`app/_components/mdx/LivePreview.tsx`) already does "renders
instantly, no Run button," via Shadow DOM rather than an iframe, and
`modern-css-layout` uses **both** it and `adapter="web"` CodeBlocks. Adding
auto-rendering would give the site a third answer to one question.

Before building phase 2, it is worth deciding whether an auto-rendering
CodeBlock should *absorb* `LivePreview` — one widget, `runnable` or not —
rather than sit beside it. The consolidation may be worth more than the
feature: two widgets that both mean "here is the result" but disagree about
isolation, about whether the code is editable, and about where the source
appears is a choice every future author has to make and can get wrong.

---

## 8. As built

### 8.1 Phase 1 — reserved height (shipped)

C1 and C2 as planned. `.previewSlot` reads its height from
`--ch-preview-height` (default 300px) and no longer shrinks while empty;
`previewHeight` on `<CodeBlock>`, `<MdxCodeBlock>` and `<ChallengeCard>` moves
the number, through `app/_components/previewStage.ts` so the number → px
convention has one implementation.

The shift §3 predicted was real and measurable. On
`intro-web-development/html-structure`, with the old rule temporarily restored:

```
empty:     slot 120  card 153  doc 4012  heading-top 2866.6
rendered:  slot 300  card 333  doc 4192  heading-top 3046.6
deltas:    slot 180  card 180  doc  180  heading    +180
```

After: every delta 0.

**Departure from the plan:** the empty state also went **dashed**. At 120px a
solid box read as a small panel that happened to be blank; at full height it
read as a broken one. The plan did not anticipate that reserving the space
would change what the empty state *means* visually.

`min-height` became `min(100px, var(--ch-preview-height, 300px))` rather than a
flat 100px: the floor exists for the user's drag handle, and clamping the
author's declared height would have put back the space `previewHeight` exists
to remove.

### 8.2 Phase 2 — web renders itself (shipped)

A1 as planned, with the bridge omitted rather than its token derived. The
adapter opts in with `outputCapabilities.autoPreview` and
`composeStaticPreview` (`runtime/web.tsx`); `<CodeBlock>` composes during
render, so the frame is in the server's HTML. Verified by `curl` against a
lesson route with no JavaScript involved:

```
<iframe class="ds-web-preview-frame" sandbox="allow-scripts allow-modals allow-forms"
        title="Page preview" loading="lazy" srcDoc="&lt;!DOCTYPE html&gt;…
```

Measured across the interaction on the same page — auto-render, Run, Reset —
every delta 0, exactly one frame at each step, no hydration warnings. Verified
on five pages: multi-file CSS inlines, JS executes (`js-dom-basics` paints
"Chore list (3 items)", which only its script can produce), react blocks show
**0** framed panels, and ChallengeCard panels show **0** framed on every page
that has one.

**Three things the plan got wrong or left out:**

1. **The bridge-token question had a third answer.** §4.1 offered "derive it
   deterministically" or "let the client adopt the frame". The right answer was
   neither: *omit the bridge entirely*. Nothing is listening for its messages
   before a run exists, so the token was solving a problem that only existed
   because the bridge was assumed. `composeWebDocument` grew a `bridge?: boolean`,
   and throws if a bridged document is composed without a token — composing one
   silently would send a run's console output nowhere and render as a block
   that prints nothing.
2. **The React/imperative-DOM handover is the real hazard, and §4.1 missed it.**
   React owns the auto-rendered frame; `runPreviewDocument` owns the slot's
   children through `replaceChildren`. Interleaved they corrupt each other —
   React's removal landing after the runtime's insertion deletes the run's
   frame. `run()` now flushes the unmount with `flushSync` before it awaits
   anything. This is the one line in the change that a later edit could quietly
   break, which is why it carries the longest comment in the file.
3. **The persisted-buffer case needed no code.** §4.1 treated it as a wrinkle
   to handle. It resolves by policy: the auto-preview renders the *starter*,
   which is exactly what the prepopulated cells do, so the two surfaces already
   agreed and nothing had to reconcile them.

**Anti-drift.** `__tests__/webPreview.test.ts` asserts the static composition
and a real Run produce the same document modulo the bridge. That is the test
that matters: both paths reach `composeWebDocument`, and the assertion is what
keeps a future change to one from silently diverging from the other.

**Scale delivered.** 42 of the site's 42 web `<CodeBlock>`s now show their page
before the reader presses anything, at no runtime cost. The 22 react blocks are
unchanged and wait on phase 4.

### 8.3 Phase 3 — the console output belongs to the block (shipped)

**The plan for this phase was wrong, and phase 2 is what made it wrong.** §4.3
proposed teaching `capture-browser-outputs.mjs` to record web cells at build
time. That was never necessary once web blocks auto-render: the code is already
executing in the reader's browser, so the output exists — it simply was not
being collected, because phase 2 dropped the bridge to keep the document
deterministic. Phase 3 turned out to be "put the bridge back, deterministically",
not "build a capture pipeline". No generator, no manifest, no committed asset.

Prompted by a question about whether the browser's devtools console was being
used as an output channel. It was not — but phase 2 had quietly made it the
*only* place an auto-preview's output appeared, which is the same complaint one
step removed. Audited across every adapter: output always reaches the block's
own panel, and the devtools echo is a passthrough. Java is the case that proves
it — CheerpJ writes `System.out` *through* `console.log` because there is no
other sink, and `runWithCapture` swallows it rather than letting it through.

**What shipped:**

- **A derived bridge token** — content hash + `useId`. Both halves matter: the
  hash alone collides between two identical blocks on a page, `useId` alone
  does not survive an edit. The security note is in AGENTS.md and in the code:
  a guessable token is fine for a frame with no harness and is *not* fine for
  one with a harness, which is why challenge cards keep per-run random tokens.
- **A replay buffer in the bridge.** This is the part the plan could not have
  anticipated, because it only exists once the frame is server-rendered: the
  frame runs while the page's JavaScript is still downloading, so by the time
  React subscribes the block has already printed. Without a replay those
  messages are simply lost and the block looks like one that prints nothing.
  Replayed and live messages are deduped on a per-message sequence number —
  identity is destroyed by `postMessage`'s structured clone, and text would
  collapse a block that logs the same line twice.
- **A reserved output panel**, gated on the source mentioning `console.`.

**Measured**, with Chrome's own `layout-shift` entries rather than before/after
snapshots:

| page | CLS | output body |
| --- | --- | --- |
| `js-dom-basics` (prints at load) | 0.00002 | reserved 58.2px, actual 58px |
| `html-structure` (prints nothing) | 0.00002 | no panel at all |

Both figures are the page's own baseline; the panel contributes nothing. The
first reservation was 14px short because `min-height` on a `border-box`
element has to include the body's padding — caught only because the measurement
compared the reservation against the actual height rather than trusting CLS,
which was already under 0.0001 and would have hidden it.

**Scale:** three web blocks contain a `console.` call and reserve a panel. One
prints at load; the other two print from a click handler, so their reserved
panel sits empty until the reader interacts — which reads as "output appears
here", and is the benign direction for the heuristic to be wrong in.

### 8.4 Phase 4 — react compiles on a build machine (shipped)

B2 as planned, and the plan held: the bundler marks every bare import external
and rewrites it to a pinned esm.sh URL, so a bundle is a pure function of the
block's own tabs. All 25 react blocks compile to **73 kB total**, 2–8 kB each.

Built on the `block-outputs.yml` pattern rather than in the build chain, which
was the explicit ask: `scripts/build-react-bundles.mjs` writes a committed,
content-hash-keyed manifest; `.github/workflows/react-bundles.yml` runs it on
pushes to `main`, path-filtered; `build` and `dev` read it and run esbuild
never. Per-block reuse verified by editing one block and re-running —
**24 reused, 1 bundled**.

**Verified end to end**, with esm.sh proxied through Node because the sandbox
blocks the browser's egress (the same asymmetry AGENTS.md records for the
other runtimes): a react block renders `Count: 0 +1 Reset` on load and the
button increments it to `Count: 1` — interactive, with no Run pressed. On a
react page with no challenge card, **0 jsDelivr requests**: the reader
downloads no esbuild at all.

**Four things worth recording:**

1. **The warm-up nearly cancelled the whole phase.** `<CodeBlock>` warms its
   runtime on route-land and on scroll-into-view, so a react lesson still
   fetched 3 MB of esbuild-wasm on load — the exact cost the precompiled
   bundle exists to remove — while every test passed and the preview looked
   perfect. Found only by watching the network, not the DOM. A block showing
   an auto-preview now skips both warm-ups; `<ChallengeCard>` still warms,
   deliberately, since it cannot auto-preview and the learner is expected to
   attempt it.
2. **Sharing the bundler contract needed a resolver hook.** Node 22 strips
   types, which is why `build-block-outputs.mjs` can import
   `blockOutputKey.ts` — but it does not do Node-resolution of extensionless
   ESM specifiers, so any shared module that imports a sibling the way app
   code always does fails immediately. `scripts/lib/ts-resolve.mjs` closes
   that one gap, and it is the difference between the generator sharing
   `reactBundle.ts` and copying it. The generator's app imports must be
   `await import()`, not static, or the hook is not installed in time.
3. **The version pin had to be exact, and the test caught it immediately.**
   `npm install --save-dev` wrote `^0.28.1`. A caret range would let `npm ci`
   install a different esbuild on a runner and silently change every bundle on
   the site, with the preview and the reader's Run then disagreeing. The guard
   failed on its first run, which is the best possible time.
4. **`loading="lazy"` really does defer.** An off-screen react frame requests
   nothing at all until it nears the viewport — worth knowing before writing a
   test that reads one without scrolling to it, which is a false failure that
   looks exactly like a broken bundle.

### 8.5 Still open

- **§7, the `<LivePreview>` consolidation** — deliberately deferred through
  all four phases. Both now exist side by side, which is the comparison §7
  asked for and could not make before.
- **The `console.` heuristic** (§8.3) could be replaced by an exact answer if
  the build ever does run these blocks. It is the one place in this design
  that guesses, and it guesses about layout rather than about content, so the
  cost of being wrong is bounded.
- **A react lesson with a challenge card still downloads esbuild**, because
  the card warms its runtime. That is pre-existing behaviour and defensible —
  the card is meant to be attempted — but it means phase 4's bandwidth win is
  whole only on pages without one. Worth revisiting as its own decision rather
  than folding into this work.
