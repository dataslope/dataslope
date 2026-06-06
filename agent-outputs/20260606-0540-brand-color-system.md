# DataSlope Brand Color System — Usage Across `/`, `/learn`, `/playground`

**Date:** 2026-06-06
**Author:** Claude (research agent)
**Scope:** How to apply the four-color brand palette consistently across the three styling "worlds" of the app (the home route, the Fumadocs `/learn` route, and the `/playground` route), with light/dark-mode accessibility, a concrete token architecture, and a migration plan. Companion to `20260605-0532-ai-image-generation-for-course-illustrations.md` (illustration feasibility is summarized in §7 here and detailed there).

---

## 1. The palette

| Role (proposed) | Hex | Notes |
|---|---|---|
| **Primary — Blue** | `#148CFF` | Brand color; links, primary actions, active state, focus |
| **Green** | `#20C621` | Success, "Run", correct answers, positive |
| **Red** | `#FF4F59` | Errors, destructive, incorrect answers |
| **Yellow** | `#FFDD6C` | Highlights, warnings, accents, "new" |

These already appear in your mockup (alien, astronaut, topic chips) and the playground tokens are *almost* this blue already (`--primary: oklch(68% 0.18 250)` ≈ `#148CFF`), so alignment is low-friction.

### 1.1 Decorative / categorical hues (added for charts & illustrations)

The four-color palette is intentionally small and **semantically loaded** — green/red/yellow are locked to success/error/warning (§5), which leaves **blue as the only meaning-free hue**. That's fine for UI, but **diagrams and illustrations need categorical variety**: a flowchart with several node groups, a Mermaid **mindmap** (which assigns a different color per branch), or an illustration with several distinct shapes. A content audit confirms the gap — across the `/learn` MDX, authors hand-color Mermaid nodes in **~480 places**, reaching for **seven-plus hue families** (purple `#e9d5ff`, pink `#fbcfe8`, orange `#fed7aa`, teal `#dee`, …), i.e. well beyond the four brand colors and off-brand.

So we add **three decorative hues** — **teal, purple, orange** — generated with the *same* OKLCH method as the brand ramps (constant hue, interpolated L/C, gamut-mapped; 500 = base). They carry **no semantic meaning**; use them purely to tell series/branches apart. With blue they form a seven-step categorical wheel: **blue · teal · green · yellow · orange · red · purple**.

| Decorative hue | 500 (base) | Ink (700 — AA body text on white) |
|---|---|---|
| **Teal** (hue ≈192) | `#00AEAA` | `#007B79` (5.1:1) |
| **Purple** (hue ≈300) | `#AB77FA` | `#7A51B6` (5.7:1) |
| **Orange** (hue ≈55) | `#E47600` | `#A35200` (5.6:1) |

Full 50–900 ramps ship in `app/brand.css` as `--ds-{teal,purple,orange}-{step}` (plus `--ds-{hue}` and `--ds-{hue}-ink` aliases), mirroring the four brand ramps. Like the brand hues they are **dark-native**: the 500s clear AA body text on dark, the 700s clear AA on white.

---

## 2. The one thing that shapes everything: this palette is **dark-mode-native**

WCAG contrast of each brand color against a white vs. a dark (`#121212`) background:

| Color | On **white** | On **dark `#121212`** | Usable as… |
|---|---|---|---|
| Blue `#148CFF` | **3.37:1** | **5.55:1** | white → UI/large text/icons only; dark → body text ✓ |
| Green `#20C621` | **2.29:1** | **8.17:1** | white → **decorative fill only**; dark → body text ✓ |
| Red `#FF4F59` | **3.22:1** | **5.81:1** | white → UI/large text/icons only; dark → body text ✓ |
| Yellow `#FFDD6C` | **1.33:1** | **14.10:1** | white → **highlight/fill only, never text**; dark → body text ✓ |

WCAG AA needs **4.5:1** for body text, **3:1** for large/bold text, icons, and UI component boundaries.

**Reading:** On **dark backgrounds the saturated palette is perfect** — every hue clears AA for body text. On **white**, the bright versions are too light for body text; blue and red just clear the 3:1 UI/large-text bar, while green and yellow are decorative-only.

### 2.1 Consequence — you need two variants per hue

Define, for each brand hue, a **bright "signal" value** (the hex above — used for fills, accents, dark-mode text, illustration) and a **darker "ink" value** for light-mode text/links/borders. Verified candidates that clear ~5:1 on white:

| Hue | Bright "signal" | Light-mode **ink** (text/links on white) |
|---|---|---|
| Blue | `#148CFF` | **`#0A6ED6`** (4.98:1) |
| Red | `#FF4F59` | **`#D5323C`** (4.83:1) |
| Green | `#20C621` | **`#178017`** (5.08:1) |
| Yellow | `#FFDD6C` | *(yellow can't be text on white — pair with* **`#8A6D00`** *amber-ink, 4.92:1, for warning text)* |

### 2.2 The full 50–900 tonal ramps

Generated in **OKLCH** (constant hue; lightness/chroma interpolated toward white for the light steps and toward near-black for the dark steps; every value gamut-mapped to valid sRGB). **500 = your exact brand color.** These are now shipped in `app/brand.css` as `--ds-{hue}-{step}` tokens; the "ink" roles in §2.1 are remapped onto ramp steps (`blue-700`, `green-800`, `red-700`, `yellow-800`) so everything references one ramp. The three **decorative** hues from §1.1 ship as parallel `--ds-{teal,purple,orange}-*` ramps in the same file, built the same way.

| Step | Blue | Green | Red | Yellow |
|---|---|---|---|---|
| 50  | `#E8F2FF` | `#E8F9E6` | `#FFEDEC` | `#FDF8E8` |
| 100 | `#D1E6FF` | `#D4F3D1` | `#FFDCDA` | `#FDF5D9` |
| 200 | `#AED3FF` | `#B4EAAF` | `#FFC2BF` | `#FEF0C3` |
| 300 | `#8ABFFF` | `#93E08E` | `#FFA6A3` | `#FEEBAC` |
| 400 | `#5BA7FF` | `#66D361` | `#FF807F` | `#FFE48E` |
| **500** | **`#148CFF`** | **`#20C621`** | **`#FF4F59`** | **`#FFDD6C`** |
| 600 | `#0878DD` | `#0AA80F` | `#DC3F49` | `#D4B651` |
| 700 | `#0064BD` | `#008B03` | `#BA303A` | `#AB9137` |
| 800 | `#00519C` | `#006F01` | `#99212C` | `#836D1C` |
| 900 | `#00407F` | `#005600` | `#7C141F` | `#624F00` |

**Text-on-white safety (WCAG AA, ≥4.5:1 body):** Blue ≥ **700** (5.9:1), Green ≥ **800** (6.4:1; 700 is 4.5 borderline), Red ≥ **700** (5.9:1), Yellow ≥ **800** (5.0:1). On dark (`#121212`) the 500s and below all clear AA. Pick a 600/700 for hover/pressed states of a 500 fill. *Re-verify any shipped text value in a contrast checker.*

---

## 3. Why consistency is hard today: three independent styling worlds

| Route | How it's styled now | Theme tokens | Light/dark |
|---|---|---|---|
| **`/` (home)** | `app/root.module.css` (CSS module), **hardcoded hex** | none | **dark-only** (`#0f1117` bg; gradient `#4f8ef7→#34d399`) |
| **`/learn`** | `app/learn/learn.css` — **Tailwind v4 + Fumadocs UI** | `--color-fd-*` (Fumadocs) | light + dark via `.dark` class |
| **`/playground`** | `app/_components/playground.css` + CSS modules | **`--primary/--blue/--green/--red/--yellow`** (OKLCH) + per-editor-theme palettes | light + dark via `applyMode` |

Plus: colors are duplicated as raw hex across components (~10 distinct blues, multiple greens/ambers/reds). There is **no shared brand-token layer** any of the three can reference. `#148CFF` appears nowhere yet.

**Theme mechanisms differ per route** (verified in code — an earlier draft of this report over-simplified this):

- **`/learn`** uses **next-themes** (via Fumadocs `RootProvider`), toggling a **`.dark` class** on `<html>`.
- **`/playground`** uses a **`data-theme="light|dark"` attribute** on `<html>`, driven by the selected editor theme (`applyMode` in `playgroundTheme.ts`) — *not* next-themes.
- **`/`** has **no theme switch at all** — it's hardcoded dark.

So there is no single universal hook. The fix (below) keeps token **values** global and has each route's dark override target **both** `.dark` *and* `[data-theme="dark"]`, while the dark-only home consumes the raw bright ramp directly.

---

## 4. Proposed architecture: one brand-token layer, three adapters

Introduce a single source of truth, then *adapt* it into each world rather than rewriting each world.

### 4.1 Layer 1 — global brand tokens (`app/brand.css`, imported once)

A plain CSS file with **raw hues** and **semantic roles** that remap for dark mode. No Tailwind needed, so it works for the CSS-module routes and Fumadocs alike. Import it in the root `app/layout.tsx` (it's tiny and framework-agnostic).

> The snippet below is an **abridged illustration**. The **authoritative version shipped in `app/brand.css`** also includes the full 50–900 ramps from §2.2 and targets both dark hooks (`.dark, [data-theme="dark"]`). Read that file for the exact tokens.

```css
/* app/brand.css — single source of truth for brand color */
:root {
  /* raw brand hues (bright "signal" values) */
  --ds-blue:   #148CFF;
  --ds-green:  #20C621;
  --ds-red:    #FF4F59;
  --ds-yellow: #FFDD6C;

  /* light-mode "ink" variants (AA body text on white) */
  --ds-blue-ink:   #0A6ED6;
  --ds-green-ink:  #178017;
  --ds-red-ink:    #D5323C;
  --ds-amber-ink:  #8A6D00;

  /* ── semantic roles — LIGHT MODE defaults ── */
  --ds-primary:        var(--ds-blue);      /* fills, buttons, active bg */
  --ds-link:           var(--ds-blue-ink);  /* text/links on light bg   */
  --ds-focus:          var(--ds-blue);      /* focus ring               */
  --ds-success:        var(--ds-green-ink);
  --ds-success-fill:   var(--ds-green);
  --ds-danger:         var(--ds-red-ink);
  --ds-danger-fill:    var(--ds-red);
  --ds-warning:        var(--ds-amber-ink);
  --ds-warning-fill:   var(--ds-yellow);
}

.dark {
  /* On dark bg the bright hues ARE the readable values, so roles
     point straight at them — no ink variants needed. */
  --ds-link:     var(--ds-blue);
  --ds-success:  var(--ds-green);
  --ds-danger:   var(--ds-red);
  --ds-warning:  var(--ds-yellow);
}
```

Use `color-mix()` for tints (the playground already does this): `color-mix(in srgb, var(--ds-primary) 12%, transparent)` for hover/selected backgrounds, so you never hand-pick a tint again.

### 4.2 Layer 2 — three adapters

**Home `/` (`root.module.css`):** replace hardcoded hex with the tokens, and add a light mode. The title gradient becomes `linear-gradient(135deg, var(--ds-blue), var(--ds-green))`; surfaces switch on `.dark`. This is the biggest visual change because the home route is currently dark-only.

**Learn `/learn` (`learn.css`):** map the brand tokens onto the **Fumadocs** tokens — the file already has `:root:not(.dark)` and `.dark` hooks, so add:

```css
:root {
  --color-fd-primary: var(--ds-link);          /* doc links, active nav */
  --color-fd-ring:    var(--ds-focus);
}
.dark { --color-fd-primary: var(--ds-blue); }
```

…and similarly point callouts/admonitions at `--ds-warning-fill`, `--ds-danger`, etc. Fumadocs derives most accents from `--color-fd-primary`, so this one remap re-tints most of the docs UI.

**Playground `/playground` (`playground.css`):** the static `:root` block (lines ~28–33) already defines `--primary/--blue/--green/--red/--yellow`. Point them at the brand tokens:

```css
:root {
  --primary: var(--ds-primary);
  --blue:    var(--ds-blue);
  --green:   var(--ds-success);
  --red:     var(--ds-danger);
  --yellow:  var(--ds-warning);
}
```

> **Leave the per-editor-theme palettes alone.** `THEME_PALETTES` / `applyThemePalette` deliberately recolor the chrome to match the *chosen code theme* (Dracula, Nord…). Those are user-selected editor aesthetics, not brand surfaces — keep them independent. Only the brand-signal tokens above should be unified.

### 4.3 Fourth consumer — Mermaid diagrams (JS, not CSS)

`/learn` renders Mermaid diagrams (flowcharts dominate, plus ER, sequence, class, state, gantt, mindmaps). Mermaid **can't read `var(--ds-*)`** — it runs color math (khroma) over its theme variables and needs concrete colors. So instead of the stock **`neutral`** (light) / **`dark`** themes, `app/_components/mdx/mermaid.tsx` builds Mermaid's customizable **`base`** theme from the brand palette: it resolves the `--ds-*` tokens to hex at render time (via `getComputedStyle`, keeping `brand.css` the source of truth, with literal fallbacks) and maps them onto Mermaid's `themeVariables`.

**One light palette, in both modes — the legibility constraint that shapes everything.** ~200 MDX diagrams hand-color nodes with `classDef` using **light pastel fills and no text color** (e.g. `classDef bad fill:#fee2e2,stroke:#b91c1c`). Mermaid exposes a *single* global node-text color, so it must be **dark** to stay readable on those author fills — which means our own node fills must be light too. The diagram is therefore **light-based in both modes**, and dark mode is handled by rendering the whole figure on a soft **light "figure card"** (a `border-radius`'d white panel in `mermaid.module.css`, applied to both the inline diagram and the fullscreen modal). This keeps every label dark-on-light and author pastels legible, with no per-element light/dark juggling.

The mapping, tuned to be soft and low-border (per the report updates):
- **Nodes** — soft `blue-100` fill (light enough to stay calm, dark enough to read as "blue" on the white card; `blue-50` looked colorless), a **soft `blue-300` hairline** border (not the old bold accent border), `gray-900` text. Author `classDef` fills keep their colors; only the bold default borders were toned down.
- **Structure** — neutral `--ds-gray-*` for edges, arrowheads, lifelines, and subgraph/cluster backgrounds; edge-label backdrops blend into the canvas/card.
- **Semantic hues keep their meaning** — yellow "sticky-note" notes; red critical-path and "today" markers in gantt.
- **Categorical wheel** — mindmaps cycle the **seven-hue** wheel (§1.1) as soft `-200` fills under dark labels, identical in both modes. (Mermaid re-applies overrides *after* its internal derivation, so these exact values reach the SVG — its built-in `cScale` darkening is bypassed.)

Every node/label pairing is dark-on-light (WCAG-AA), and the output was spot-checked with **Playwright** across all diagram types in light and dark — including the author-`classDef` pages that exposed the original dark-mode legibility bug.

### 4.4 Result

One file defines the palette; each route reads it through its native token system (CSS tokens, Fumadocs `--color-fd-*`, the playground `--primary/...`, and now Mermaid's JS `themeVariables`); the `.dark` class flips light↔dark everywhere at once. Adding a color or fixing a shade is a one-line change in `brand.css`.

---

## 5. Semantic usage rules (keep it disciplined)

Consistency comes from **meaning**, not just shared hex. Lock these mappings:

| Color | Means | Use for | Don't use for |
|---|---|---|---|
| **Blue** | primary / interactive | links, primary buttons, active nav, focus ring, brand moments | success or error states |
| **Green** | success / go | "Run", passing tests, correct answers, positive deltas | links or generic accents (reads as "success") |
| **Red** | error / stop | failures, destructive actions, wrong answers, validation errors | decoration (alarms users) |
| **Yellow** | attention | highlights, warnings, "new" badges, callout accents | body text on light; large fills behind dark text only with care |

**Decorative hues (teal/purple/orange) are the exception to "meaning":** they are deliberately *non-semantic* — use them only for categorical distinction in charts, diagrams, and illustrations, never to imply success/error/warning and not as a second "primary." See §1.1.

**Accessibility do/don'ts:**
- ✅ Use the **ink variants** for any text/link/icon on **light** backgrounds; use the **bright** hues for text on **dark**.
- ✅ Bright hues are always fine for **fills, buttons, borders ≥3:1**, and **graphics/illustration**.
- ❌ Never put **yellow text on white**, or **green body text on white**.
- ✅ Pair colored fills with a foreground token that has ≥4.5:1 against the fill (e.g. white text on the blue button: white on `#148CFF` ≈ 3.4:1 → use for large/bold button labels, or darken the button slightly for small text).
- ✅ Don't rely on color alone for meaning (correct/incorrect) — pair with an icon or label.

---

## 6. Migration plan

> **Status: Phases 0–4 are implemented in this branch** (build green, lint clean, 445 unit tests pass). Only a light-mode home **redesign** remains (a deliberate design decision, not a mechanical task).

**Phase 0 — Define & QA — ✅ done.** `app/brand.css` ships the full ramps + ink + semantic-role tokens, imported once in `app/layout.tsx`. The **`/color-test`** route now renders the four ink anchors and all 40 ramp swatches (each with copy-to-clipboard), so it doubles as the acceptance gate.

**Phase 1 — Playground — ✅ done.** `playground.css` repoints `--primary/--blue/--green/--red/--yellow` (and `--primary-glow` via `color-mix`) at the brand tokens. The editor-theme palettes (`THEME_PALETTES`) are deliberately untouched.

**Phase 2 — Learn — ✅ done (primary/ring + callouts).** `learn.css` maps `--color-fd-primary` → `--ds-blue-ink` (light) / `--ds-blue-400` (dark) and `--color-fd-ring` → brand blue. **Callouts/admonitions are now brand-tinted too:** Fumadocs derives each callout's bar + icon from `--callout-color: var(--color-fd-<type>, --color-fd-muted)`, so `learn.css` defines `--color-fd-info/warning/error/success` (AA "ink" steps in light mode, brighter brand steps in dark) — info=blue, warning=yellow, error=red, success=green. This also adds color where callouts previously fell back to muted gray.

**Phase 3 — Home — ✅ tokenized (still dark-only).** `root.module.css` now pulls its blue/green accents and the title gradient from the ramp (`var(--ds-blue)`, `var(--ds-green)`, `var(--ds-blue-400)`). It remains dark-only by design — **adding a light mode to the home route is a separate design decision** (no theme switch exists there yet) and was intentionally *not* done unilaterally.

**Phase 4 — De-dupe — ✅ done (interactive components).** The big repeated offenders now source from the brand ramp:
- **`ChallengeCard.module.css`** — its documented `--ch-{blue,green,red}-*` palette scale + the `--ch-amber-500` accent + the dark-mode `.runBtn` literals all repoint to `--ds-*` (one audit surface, as the file's own comments intended).
- **`MultipleChoiceQuestion.module.css`** — same treatment for the mirrored `--mc-*` scale, plus the badge/code-text literals.
- **`sqlPlayground.css`** — its semantic accents (`--danger/--ok-accent/--err-accent/--accent`) were *never defined*, so every call site fell back to a hardcoded Tailwind hex. They're now defined once in `playground.css` `:root` → brand. The ~23 inline `var(--token, #hex)` fallbacks remain only as an inert safety net (the codebase's defensive pattern).
- **`mermaid.module.css`** + **`playground/home.module.css`** — stray blue literals → `--ds-blue-400`.

Deliberately **left alone:** non-brand decoratives (violet/purple `--ch-violet-*`, the SQL editor-theme palettes), neutral grays/surfaces/backgrounds, and a few dark-mode `rgba()` wash tints (perceptually identical at 12–30% alpha; not worth the churn/risk).

*Not yet done:* a lint rule / CI grep to flag **new** raw-hex brand colors so drift doesn't creep back — recommended as a small follow-up.

> Sequence rationale (as executed): playground → learn → home went from "tokens already exist" to "tokens partially exist (Fumadocs)" to "no tokens," i.e. easiest-to-hardest and lowest-to-highest visual risk.

**Phase 5 — Variable cleanup — ✅ done.** Once the components pulled brand colors from `--ds-*`, their local Tailwind-style palette scales (`--ch-*`, `--mc-*`) became a redundant pass-through layer. Cleaned up:
- **ChallengeCard:** 81 → **46** vars (−43%). The `--ch-{blue,green,red,amber}-NNN` numeric steps were collapsed — every usage now points at `--ds-*` directly (a provably appearance-preserving change, since each step already resolved to the identical `--ds-*` value), and the dead `--ch-purple*`, unused slates, and `--ch-badge-bg/border` were removed. Only the **neutral** Tailwind palette + the **semantic aliases** (`--ch-accent`, `--ch-bg`, `--ch-green`…) remain.
- **MultipleChoiceQuestion:** 57 → **24** vars (−58%), same treatment. A follow-up pass also migrated its **dark-mode block** — which still hardcoded Tailwind hues (`rgba(22,163,74,…)` green, `rgba(220,38,38,…)` red, `rgba(217,119,6,…)` amber, `rgba(59,130,246,…)` blue, and `#86efac`/`#fca5a5`/`#fcd34d` verdict text) — to brand tokens (washes via `color-mix(... var(--ds-*) …)`, text via the `--ds-*-300` ramp). MCQ now sources **every** brand color from the palette in both light and dark; only neutrals/surfaces remain as literals.
- **CodeBlock:** repointed `--cb-yellow` off the removed `--ch-amber-500` to `--ds-yellow-500`; dropped the dead `--cb-white`/`--cb-font-ui`. (Note: CodeBlock consumes ChallengeCard's `--ch-*` cross-file — verified before any removal.)
- **learn.css:** merged the duplicate `:root:not(.dark)` / `.dark` brand→Fumadocs blocks into one pair.

**Phase 6 — Shared neutral foundation — ✅ done.** The last duplication was the **neutral gray scale**, defined identically in *both* ChallengeCard (`--ch-gray-*`) and MCQ (`--mc-gray-*`) and consumed cross-file by CodeBlock. Hoisted a single Tailwind gray ramp (`--ds-gray-50…900`) plus `--ds-white`/`--ds-black` into `app/brand.css`, and pointed all three components at it (gray/white/black usages → `--ds-*`, local scales deleted). Appearance-preserving (the `--ds-gray-NNN` values equal the Tailwind values the components already used) and slightly **more robust** — code blocks now resolve neutrals from `:root` instead of relying on a `.card` ancestor.
- ChallengeCard local vars **46 → 34**; MCQ **24 → 15**; ~88 references now share the ramp.
- ChallengeCard keeps a small local `--ch-slate-*` set (cool-gray surfaces — *not* duplicated elsewhere, so left in place).

Across Phases 5–6: **ChallengeCard 81 → 34** unique vars (−58%), **MCQ 57 → 15** (−74%). **0 dangling references**, build green, lint clean, 445 tests pass throughout.

**Phase 7 — Mermaid chart theme — ✅ done.** `app/_components/mdx/mermaid.tsx` previously selected Mermaid's stock `neutral` (light) / `dark` themes. It now builds the customizable **`base`** theme from the brand palette (see §4.3), so diagrams match the rest of `/learn`. This is also what motivated the **three decorative hues** (§1.1): mindmaps and other categorical diagrams cycle the seven-hue brand wheel instead of Mermaid's off-brand defaults.

A follow-up pass refined the look after dark-mode review:
- **Fixed a dark-mode legibility bug.** The first cut used dark nodes + light text in dark mode, which made the ~200 author `classDef` light-pastel nodes (light fill + inherited light text) unreadable. Switched to a single **light palette in both modes** with dark text, rendered on a soft **light figure card** in dark mode (§4.3) — author pastels and edge labels are now legible everywhere.
- **Minimized borders.** Default node borders dropped from the bold `blue-600` to a soft `blue-300` hairline.
- **Softer, less "poppy" palette.** Low-contrast fills, neutral-gray connectors, and the figure card give a calmer, more figure-like look.
- **`/color-test`** now also renders the teal / purple / orange ramps + ink anchors, so the QA gate covers the decorative hues.

A second dark-mode review caught two more issues, now fixed:
- **Shrinking.** The figure card used `width: fit-content`, but the SVG is sized `width: 100%; max-width: <W>px` — a shrink-to-fit parent gave it ~0 intrinsic width, collapsing the diagram. The card now keeps `width: 100%` (the SVG renders at its natural size, centered).
- **Washed-out colors.** `blue-50` node fills were nearly indistinguishable from the white card. Bumped to `blue-100` (clearly blue, still soft) with a `blue-300` edge.

Typecheck + lint clean, 450 unit tests pass; verified visually with Playwright across flowchart / ER / sequence / class / state / gantt / mindmap in light and dark (incl. author-`classDef` pages).

---

## 7. Feasibility for AI illustration generation (light **and** dark mode)

**Short answer: yes — and this palette is especially well-suited to it, with one rule.**

The same dark-native asymmetry from §2 applies to illustrations, but illustrations are **graphics, not text**, so they live under the 3:1 UI bar, not the 4.5:1 text bar — which gives more freedom. Practical guidance:

- **On dark mode:** the bright palette is ideal — saturated blue/green/red/yellow shapes pop against `#121212`. No adjustment needed.
- **On light mode:** large saturated **shapes** read fine on white, but **yellow and light-green areas can look weak/washed** on a pure-white page. Mitigate by: (a) giving shapes a subtle darker outline or shadow, (b) composing on the brand's **off-white surface** rather than pure `#fff`, or (c) leaning on blue/red as the dominant hues with yellow/green as accents.
- **The rule (ties to the illustration report §7):** generate art with a **transparent background** and a **theme-agnostic, mid-tone application** of the palette so a single asset reads on both themes — OR use **SVG** (Recraft) where fills can be brand tokens and even adapt via CSS. Avoid baking pure-white or pure-black backgrounds into raster art.
- **Consistency:** feed these exact hex values into the house-style prompt preamble (already updated in the illustration report) and cap each illustration to **2–3 hues** to avoid a circus look — drawn from the four brand colors, or from the decorative hues (§1.1) when an image needs non-semantic categorical accents. Use the per-course accent trick (swap one hue per course) for variety within the system.

**Verdict:** the palette is a strong fit for AI illustration in both modes. Dark mode is "free"; light mode needs the transparent-background + mid-tone discipline already recommended for illustrations generally. See `20260605-0532-ai-image-generation-for-course-illustrations.md` §7 and Appendix A for the prompt mechanics.

---

## 8. Summary

1. **Adopt two values per hue** — a bright "signal" (your four hex) and a darker "ink" for light-mode text. The palette is dark-native; light mode needs the ink variants.
2. **One `app/brand.css` token layer** (✅ shipped) — brand hue ramps, ink anchors, semantic roles, **a shared neutral ramp (`--ds-gray-*`, `--ds-white/black`)**, and **three non-semantic decorative hues (teal/purple/orange)** for categorical use in charts and illustrations (§1.1) — adapted into each world (CSS modules → tokens, Fumadocs `--color-fd-*` remap, playground `--primary/...` remap). Dark overrides target both `.dark` (/learn) and `[data-theme="dark"]` (/playground); dark-only home uses the raw ramp. Components (challenge cards, quizzes, code blocks) keep only semantic aliases — all literal palette values now live in `brand.css`.
3. **Lock semantic meaning** (blue=primary, green=success, red=error, yellow=attention; decoratives carry none) and the accessibility do/don'ts.
4. **Migrate playground → learn → home**, using `/color-test` as the QA gate; then de-dupe ad-hoc hex.
5. **Charts (Mermaid):** the `/learn` diagram theme is built from the brand palette (Mermaid `base` theme) instead of the stock neutral/dark themes. It uses one **soft light palette with dark text in both modes** — required so author `classDef` pastel fills stay legible — rendered on a light **figure card** in dark mode, with minimal hairline borders; mindmaps cycle the seven-hue categorical wheel (§4.3). Playwright-verified in light and dark.
6. **Illustrations:** feasible and well-suited in both modes — transparent backgrounds + mid-tone palette use (or SVG), bright hues for dark, slightly tempered for light.

---

## Appendix — contrast reference (for the QA harness)

WCAG AA: **4.5:1** body text · **3:1** large/bold text, icons, UI boundaries.

| Foreground | on white `#fff` | on dark `#121212` |
|---|---|---|
| Blue `#148CFF` | 3.37 | 5.55 |
| Green `#20C621` | 2.29 | 8.17 |
| Red `#FF4F59` | 3.22 | 5.81 |
| Yellow `#FFDD6C` | 1.33 | 14.10 |
| Blue-ink `#0A6ED6` | 4.98 | — |
| Red-ink `#D5323C` | 4.83 | — |
| Green-ink `#178017` | 5.08 | — |
| Amber-ink `#8A6D00` | 4.92 | — |
| Teal `#00AEAA` | 2.75 | 6.81 |
| Purple `#AB77FA` | 3.11 | 6.02 |
| Orange `#E47600` | 3.05 | 6.15 |
| Teal-ink `#007B79` | 5.11 | — |
| Purple-ink `#7A51B6` | 5.71 | — |
| Orange-ink `#A35200` | 5.58 | — |

*Computed via the standard WCAG relative-luminance formula; re-verify any shipped value in a contrast checker.*
