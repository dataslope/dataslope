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

Generated in **OKLCH** (constant hue; lightness/chroma interpolated toward white for the light steps and toward near-black for the dark steps; every value gamut-mapped to valid sRGB). **500 = your exact brand color.** These are now shipped in `app/brand.css` as `--ds-{hue}-{step}` tokens; the "ink" roles in §2.1 are remapped onto ramp steps (`blue-700`, `green-800`, `red-700`, `yellow-800`) so everything references one ramp.

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

### 4.3 Result

One file defines the palette; each route reads it through its native token system; the `.dark` class flips light↔dark everywhere at once. Adding a color or fixing a shade is a one-line change in `brand.css`.

---

## 5. Semantic usage rules (keep it disciplined)

Consistency comes from **meaning**, not just shared hex. Lock these mappings:

| Color | Means | Use for | Don't use for |
|---|---|---|---|
| **Blue** | primary / interactive | links, primary buttons, active nav, focus ring, brand moments | success or error states |
| **Green** | success / go | "Run", passing tests, correct answers, positive deltas | links or generic accents (reads as "success") |
| **Red** | error / stop | failures, destructive actions, wrong answers, validation errors | decoration (alarms users) |
| **Yellow** | attention | highlights, warnings, "new" badges, callout accents | body text on light; large fills behind dark text only with care |

**Accessibility do/don'ts:**
- ✅ Use the **ink variants** for any text/link/icon on **light** backgrounds; use the **bright** hues for text on **dark**.
- ✅ Bright hues are always fine for **fills, buttons, borders ≥3:1**, and **graphics/illustration**.
- ❌ Never put **yellow text on white**, or **green body text on white**.
- ✅ Pair colored fills with a foreground token that has ≥4.5:1 against the fill (e.g. white text on the blue button: white on `#148CFF` ≈ 3.4:1 → use for large/bold button labels, or darken the button slightly for small text).
- ✅ Don't rely on color alone for meaning (correct/incorrect) — pair with an icon or label.

---

## 6. Migration plan

> **Status: Phases 0–3 are implemented in this branch** (build green, lint clean, 445 unit tests pass). Phase 4 (de-dupe) and a light-mode home redesign remain.

**Phase 0 — Define & QA — ✅ done.** `app/brand.css` ships the full ramps + ink + semantic-role tokens, imported once in `app/layout.tsx`. The **`/color-test`** route now renders the four ink anchors and all 40 ramp swatches (each with copy-to-clipboard), so it doubles as the acceptance gate.

**Phase 1 — Playground — ✅ done.** `playground.css` repoints `--primary/--blue/--green/--red/--yellow` (and `--primary-glow` via `color-mix`) at the brand tokens. The editor-theme palettes (`THEME_PALETTES`) are deliberately untouched.

**Phase 2 — Learn — ✅ done (primary/ring).** `learn.css` maps `--color-fd-primary` → `--ds-blue-ink` (light) / `--ds-blue-400` (dark) and `--color-fd-ring` → brand blue. Remapping individual callout/admonition accents is a follow-up if you want them brand-tinted too.

**Phase 3 — Home — ✅ tokenized (still dark-only).** `root.module.css` now pulls its blue/green accents and the title gradient from the ramp (`var(--ds-blue)`, `var(--ds-green)`, `var(--ds-blue-400)`). It remains dark-only by design — **adding a light mode to the home route is a separate design decision** (no theme switch exists there yet) and was intentionally *not* done unilaterally.

**Phase 4 — De-dupe — ⬜ todo.** Sweep the ~10 ad-hoc blues / multiple greens/ambers still hardcoded in component CSS modules and replace with tokens. Add a lint rule or CI grep to flag new raw-hex brand colors so drift doesn't return.

> Sequence rationale (as executed): playground → learn → home went from "tokens already exist" to "tokens partially exist (Fumadocs)" to "no tokens," i.e. easiest-to-hardest and lowest-to-highest visual risk.

---

## 7. Feasibility for AI illustration generation (light **and** dark mode)

**Short answer: yes — and this palette is especially well-suited to it, with one rule.**

The same dark-native asymmetry from §2 applies to illustrations, but illustrations are **graphics, not text**, so they live under the 3:1 UI bar, not the 4.5:1 text bar — which gives more freedom. Practical guidance:

- **On dark mode:** the bright palette is ideal — saturated blue/green/red/yellow shapes pop against `#121212`. No adjustment needed.
- **On light mode:** large saturated **shapes** read fine on white, but **yellow and light-green areas can look weak/washed** on a pure-white page. Mitigate by: (a) giving shapes a subtle darker outline or shadow, (b) composing on the brand's **off-white surface** rather than pure `#fff`, or (c) leaning on blue/red as the dominant hues with yellow/green as accents.
- **The rule (ties to the illustration report §7):** generate art with a **transparent background** and a **theme-agnostic, mid-tone application** of the palette so a single asset reads on both themes — OR use **SVG** (Recraft) where fills can be brand tokens and even adapt via CSS. Avoid baking pure-white or pure-black backgrounds into raster art.
- **Consistency:** feed these exact hex values into the house-style prompt preamble (already updated in the illustration report) and cap each illustration to **2–3 of the four** brand colors to avoid a circus look. Use the per-course accent trick (swap one hue per course) for variety within the system.

**Verdict:** the palette is a strong fit for AI illustration in both modes. Dark mode is "free"; light mode needs the transparent-background + mid-tone discipline already recommended for illustrations generally. See `20260605-0532-ai-image-generation-for-course-illustrations.md` §7 and Appendix A for the prompt mechanics.

---

## 8. Summary

1. **Adopt two values per hue** — a bright "signal" (your four hex) and a darker "ink" for light-mode text. The palette is dark-native; light mode needs the ink variants.
2. **One `app/brand.css` token layer** (✅ shipped), adapted into each of the three worlds (CSS modules → tokens, Fumadocs `--color-fd-*` remap, playground `--primary/...` remap). Dark overrides target both `.dark` (/learn) and `[data-theme="dark"]` (/playground); dark-only home uses the raw ramp.
3. **Lock semantic meaning** (blue=primary, green=success, red=error, yellow=attention) and the accessibility do/don'ts.
4. **Migrate playground → learn → home**, using `/color-test` as the QA gate; then de-dupe ad-hoc hex.
5. **Illustrations:** feasible and well-suited in both modes — transparent backgrounds + mid-tone palette use (or SVG), bright hues for dark, slightly tempered for light.

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

*Computed via the standard WCAG relative-luminance formula; re-verify any shipped value in a contrast checker.*
