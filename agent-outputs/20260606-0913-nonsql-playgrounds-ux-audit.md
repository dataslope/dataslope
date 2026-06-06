# Non-SQL Playgrounds UI/UX Audit — Python · R · JavaScript · TypeScript · PHP · C · C++ · Java · C#

**Date:** 2026-06-06
**Scope:** The nine language playgrounds under `/playground/{python,r,javascript,typescript,php,c,cpp,java,csharp}`, all of which render the **single shared component** `app/_components/Playground.tsx` (`<Playground adapter={…} />`). SQL playgrounds (`/sqlite`, `/postgres`, `/duckdb`) are out of scope — they have their own audit (`20260531-0345-sql-playgrounds-ux-audit.md`).
**Method:** Hands-on, driven live with Playwright (Chromium, 1600×1000 desktop + 390×844 mobile), cross-checked against source in `app/_components/Playground.tsx`, `playgroundShared.tsx`, `files/FilesPanel.tsx`, `workspace/WorkspaceBadge.tsx`, `opfs/**`, and `playground.css`. 21 screenshots saved alongside this report in `assets-20260606-nonsql-playground-audit/`.

> **Single-component note.** Every non-SQL playground is the same `Playground.tsx` with a different `adapter`. I verified this in source (all nine `page.tsx` files are one line: `<Playground adapter={…} />`) and confirmed the chrome is pixel-identical across languages. **Every finding below therefore applies to all nine playgrounds at once**, and every fix lands in the shared component/CSS — fix once, fixed everywhere. The walkthrough was performed primarily on **JavaScript** (the fastest to boot) with a cross-language boot/run smoke for the rest (§8).

> **What's already good.** This is a genuinely strong playground. All nine languages boot and run correctly (live-verified, §8): a CodeMirror editor with autocomplete/format/find, a Run split-button with ⌘/Ctrl+Enter, a clean output pane with an empty state, a multi-file tab bar, an Examples menu with titled+described snippets, Export, a Packages drawer, per-language settings (font size, word wrap, themes), and OPFS-backed workspaces with export/import-ZIP, duplicate, and rename. The issues below are the gap between "very good" and "production-ready," not foundational problems.

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Severity legend](#2-severity-legend)
3. [Top findings at a glance](#3-top-findings-at-a-glance)
4. [Detailed findings](#4-detailed-findings)
5. [Accessibility](#5-accessibility)
6. [Responsiveness / mobile](#6-responsiveness--mobile)
7. [Workflow walkthrough log](#7-workflow-walkthrough-log)
8. [Cross-language boot/run results](#8-cross-language-bootrun-results)
9. [Prioritized implementation plan](#9-prioritized-implementation-plan)
10. [Appendix — methodology & screenshot index](#10-appendix--methodology--screenshot-index)

---

## 1. Executive summary

The five issues you reported all reproduce, and each has a concrete, low-risk fix in the shared component. Investigating around them surfaced four more findings worth folding into the same pass — most notably an **uncaught OPFS error that fires on every first load in every language**, and the **Files panel being completely unreachable on mobile**.

The reported issues cluster into three themes:

1. **The left activity bar's interaction model is inconsistent.** The "Editor" icon is hard-coded permanently `active` and has *no click handler at all* — it's a decorative, inert button. The "Files" icon is a real toggle. So when you open Files, **two buttons light up at once** (your issue #1), implying a mutually-exclusive selection that doesn't exist. The Settings gear is alone at the bottom of this rail — the single hardest-to-reach corner of the screen, and the only desktop entry point to Settings (your issue #2).

2. **Settings hides the very thing it's configuring.** The Settings tab renders as an **opaque overlay** (`position:absolute; inset:0; z-index:10`) that completely covers the editor. Theme changes *do* apply live to the editor underneath — I measured the CodeMirror background flip to Dracula instantly — but you can't see it because the editor is hidden, and the preview cards are static snippets that **render Python code in every non-Python language** (your issue #3, plus a bug).

3. **Workspaces are under-explained and the manager drawer is visually unpolished.** The drawer leaks a **mobile drag-handle onto the desktop side panel**, its **header is inset 16px while its cards sit flush against both walls** (the spacing you flagged, issue #4), the default workspace name is a raw timestamp, and the one-line description leads with the jargon "OPFS-backed" and claims "database state" that **doesn't exist for a non-SQL playground** (your issue #5).

Everything here is fixable in `Playground.tsx`, `playgroundShared.tsx`, `WorkspaceBadge.tsx`, and `playground.css`. No runtime/adapter changes required.

---

## 2. Severity legend

| Symbol | Meaning |
|---|---|
| 🔴 **High** | Breaks a basic task, misleads the user, or throws errors users/monitoring will see. |
| 🟡 **Medium** | Achievable but confusing, inconsistent, or unpolished. |
| 🟢 **Low** | Visual polish, terminology, minor redundancy. |
| ♿ | Accessibility issue. |

Each finding carries an ID (`NSQL-NN`) for cross-reference from the plan in §9.

---

## 3. Top findings at a glance

| ID | Finding | Sev | Your # | Primary code reference |
|---|---|---|---|---|
| **NSQL-01** | Activity-bar shows **two active buttons** when Files is open; the "Editor" button is hard-coded `active` and is **inert (no `onClick`)** | 🟡 ♿ | #1 | `Playground.tsx:3395` (hard-coded `active`), `:3420-3423` (Files toggle) |
| **NSQL-02** | **Settings only reachable from the bottom-left gear** on desktop — opposite corner from every other control, the hardest pixel to reach | 🟡 | #2 | `Playground.tsx:3438-3467`; header has no Settings entry (`:3100-3223`) |
| **NSQL-03** | Theme changes are **invisible until you leave Settings** — the Settings tab is an opaque overlay covering the editor; previews are static | 🟡 | #3 | `playground.css:4073-4083` (opaque overlay), `Playground.tsx:1390-1398` (live apply) |
| **NSQL-04** | Theme preview cards render a **Python snippet for every language** except R/SQL (so JS/TS/PHP/C/C++/Java/C# previews are misleading) | 🟡 | #3 | `playgroundShared.tsx:206-269` (`ThemePreviewSnippet` only special-cases sql/r) |
| **NSQL-05** | Workspace manager drawer **spacing**: desktop drag-handle leak + header/body left-edge misalignment (16px vs 0) + cards touch both walls + ragged button row | 🟡 | #4 | `WorkspaceBadge.tsx:403-404`, `playground.css:2102,2181-2185,3940-3956` |
| **NSQL-06** | **"Workspace" is under-explained**: jargon ("OPFS-backed"), claims "database state" that non-SQL playgrounds don't have, timestamp default name, no first-run hint | 🟢 | #5 | `WorkspaceBadge.tsx:411-414` (desc), `:168-169,345-346` (timestamp name) |
| **NSQL-07** | **Uncaught `NotFoundError` (OPFS) on every first load, in all nine languages** — trips the dev error overlay; would reach prod error monitoring | 🔴 | new | `opfs/fileStorage.ts:51-95` (fire-and-forget `flush()`); shared bootstrap |
| **NSQL-08** | **Files panel is unreachable on mobile** — the icon rail is `display:none` < 768px and the mobile menu has no "Files" entry | 🟡 | new | `playground.css:774-781`, `Playground.tsx:3160-3217` (mobile menu actions) |
| **NSQL-09** | Minor polish: icon-rail hover tooltip overlaps the Files panel toolbar; redundant Files close affordances; long workspace name truncates in the header badge | 🟢 | new | `FilesPanel.tsx:641-677`, `WorkspaceBadge.tsx:188-191` |

---

## 4. Detailed findings

### NSQL-01 — Activity bar: two "active" buttons, and an inert "Editor" button 🟡 ♿ (your #1)

**What happens.** The left icon rail has three buttons: **Editor** (`</>`), **Files** (folder-tree), and **Settings** (gear, bottom). When the Files panel is open, **both** the Editor and Files buttons show the same active background (`var(--bg3)`), so it looks like two views are simultaneously selected. See `assets/02-icon-sidebar-both-active.png` (both top icons grey) and `assets/03-js-files-pane-open.png` (in full context).

**Root cause (verified in source + live).**
- The Editor button is hard-coded active and has **no click handler**:
  ```tsx
  // Playground.tsx:3392-3399
  <button {...triggerProps} type="button"
    className="playground-icon-sidebar-btn active"   // ← always "active"
    aria-label="Editor">
    <Code2 size={16} aria-hidden="true" />
  </button>
  ```
  Its only behavior is the hover-tooltip Popover wrapping it. Clicking it does nothing. (Live probe: the Files button toggles `filesPaneOpen`; the Editor button has no toggle.)
- The Files button is a genuine toggle with `aria-pressed`:
  ```tsx
  // Playground.tsx:3417-3423
  className={`playground-icon-sidebar-btn${filesPaneOpen ? " active" : ""}`}
  aria-pressed={filesPaneOpen}
  onClick={() => setFilesPaneOpen((v) => !v)}
  ```
- `.playground-icon-sidebar-btn.active` and `:hover` share the identical `var(--bg3)` background (`playground.css:493-501`), so "active" and "hovered" are visually indistinguishable too.

**Why it's a problem.** The rail looks like a VS Code activity bar (one selected view at a time), but it isn't: the editor is always present, and Files is an *overlay panel beside it*. A permanently-lit, non-clickable "Editor" button (a) implies the editor is a toggleable view it isn't, (b) collides visually with the real Files toggle, and (c) is an accessibility trap — it's a `<button>` that announces nothing pressed and does nothing.

**Recommendation.**
- Make the rail's `active` style mean exactly one thing — "this toggle is on." Since the editor is always visible, **drop the hard-coded `active` from the Editor button**. Either remove the Editor button entirely (the editor is the default backdrop, it needs no rail entry), or keep it as a non-selected "Editor" affordance that, when Files is open, *focuses/returns to* the editor (give it an `onClick` that does `setFilesPaneOpen(false)` and focuses CM, and only light it when Files is closed).
- Differentiate `.active` from `:hover` (e.g. `active` gets an accent left-border or `--primary`-tinted background) so the selected state is legible.
- Add `aria-pressed` consistently to whatever stays a toggle.

---

### NSQL-02 — Settings is only reachable from the bottom-left gear on desktop 🟡 (your #2)

**What happens.** The Settings gear lives alone in `.playground-icon-sidebar-bottom`, pinned to the bottom of the 40px rail (`Playground.tsx:3438-3467`). On a 1000px-tall window it's the **bottom-left corner** — the furthest point from the workspace badge / Examples / Export / info cluster, which all live **top-right** (`assets/01-js-initial.png`). There is **no Settings entry in the desktop header at all**; the gear is the only way in. (On mobile it's the reverse — the gear rail is hidden and Settings moves into the header overflow menu, `assets/31-mobile-menu.png`.)

**Why it's a problem.** Fitts's-law-wise, bottom-left is a long diagonal mouse trip from where the user's attention and the rest of the toolbar sit. It also splits the mental model: "most chrome is top-right, but settings is bottom-left."

**Recommendation.** Add a Settings affordance to the **top-right header cluster** next to the info (`i`) button — the same `openSettingsTab()` call already exists. Keep or drop the bottom-left gear as you like, but the primary, discoverable entry should be co-located with the other global controls. (This also makes desktop and mobile consistent — both would reach Settings from the header.)

---

### NSQL-03 — Theme changes are invisible until you close Settings 🟡 (your #3)

**What happens.** Open Settings → Themes → pick "Dracula." The whole chrome re-themes live, but the **editor with your actual code is hidden behind the Settings overlay**, so you can't preview the result on real code until you switch back to your file tab. See `assets/11-dracula-selected-editor-hidden.png` (Settings covers everything) → `assets/12-editor-after-close-dracula-applied.png` (only now do you see Dracula on your code).

**Root cause (verified live + source).** The theme *does* apply instantly — I measured `getComputedStyle(.cm-editor).backgroundColor === rgb(40,42,54)` (Dracula) the moment the card was clicked (`Playground.tsx:1390-1398` reconfigures the CodeMirror theme compartment + `applyThemePalette`). The problem is purely that the editor is **occluded**:
```css
/* playground.css:4073-4083 */
.playground-settings-tab-pane {
  position: absolute; inset: 0; z-index: 10;
  background: var(--bg);   /* opaque — fully hides editor + output */
}
```
So "Settings as a tab" replaces the panes rather than sitting beside them.

**Recommendation (any one of these; first is highest-value):**
- **Don't occlude the editor.** Render Settings in the **output-pane half** (split view) instead of as a full-bleed overlay, so the editor with the user's code stays visible and re-themes live as they click theme cards. This turns the existing live-apply into a real-time preview for free.
- Or add a small **"live preview" strip** inside the Themes tab that renders a few lines of the *current file* (not a canned snippet) in the focused palette.
- Or apply theme **on hover** of each card (preview) and commit on click, with the editor visible.

---

### NSQL-04 — Theme preview cards show Python code in every non-Python language 🟡 (your #3, related)

**What happens.** In the **JavaScript** playground (and TS/PHP/C/C++/Java/C#), every theme preview card shows `def greet(name): return f"Hello, {name}!"` — i.e. **Python**. See `assets/11-dracula-selected-editor-hidden.png` (all 12 cards show Python in the JS playground).

**Root cause.** `ThemePreviewSnippet` only special-cases `sqlite`/`sql` and `r`; **everything else falls through to the Python snippet**:
```tsx
// playgroundShared.tsx:206-269
if (language === "sqlite" || language === "sql") { …SQL… }
const fnName = SAMPLE_FN_NAME[language] ?? "greet";
// r → R snippet; ALL OTHERS → Python def/return/f-string
```

**Why it's a problem.** The preview is supposed to be "representative of what the editor will actually look like" (its own doc comment), but it shows the wrong language's syntax for 7 of 9 playgrounds — undermining the previews and looking unfinished.

**Recommendation.** Add per-language snippets (a small map keyed by `adapter.id`), or — cleaner — derive the preview from the **first line or two of the active file / first example** so it's always the real language. If NSQL-03 is fixed by keeping the editor visible, these cards matter less, but they should still not show Python in a Java playground.

---

### NSQL-05 — Workspace manager drawer: spacing & a leaked mobile handle 🟡 (your #4)

Reproduced at the exact 2-workspace state from your screenshot: `assets/41-workspace-drawer-2ws-crop.png`. Four distinct problems, all measured live:

1. **Mobile drag-handle leaks onto the desktop side panel.** The grey pill at the top is the bottom-sheet swipe handle. It's *supposed* to be desktop-hidden, but the hide rule is a **direct-child** selector:
   ```css
   /* playground.css:2102 */ .pkg-drawer > .mobile-menu-handle { display: none; }
   ```
   The workspace drawer renders the handle **one level deeper**, inside `.pkg-drawer-content`:
   ```tsx
   // WorkspaceBadge.tsx:399-404
   <Drawer.Popup className="pkg-drawer workspace-manager-drawer">
     <Drawer.Content className="pkg-drawer-content">
       <div className="mobile-menu-handle" aria-hidden="true" />   // ← grandchild, rule misses it
   ```
   So `.pkg-drawer > .mobile-menu-handle` never matches → the handle shows on desktop. **Fix:** move the handle to be a direct child of `.pkg-drawer`, or change the rule to `.pkg-drawer .mobile-menu-handle` (and re-show only in the mobile media query).

2. **Header is inset 16px; body content is flush at 0.** Measured left edges (drawer left = 1220):
   | Element | left x | inset |
   |---|---|---|
   | `.pkg-drawer-header` text | 1237 | **16px** |
   | `.workspace-manager-new` button | 1221 | **0px** |
   | `.workspace-manager-item` card | 1221 | **0px** |
   | card **right** edge | **1600** | **0px (touches the wall)** |

   The cause is `.pkg-body { padding: 8px 0 }` (`playground.css:2181-2185`) — zero horizontal padding — while the header uses `padding: 8px 16px`. So the buttons and cards don't line up with the title and **touch both side walls**. **Fix:** give `.pkg-body` (or the workspace body/cards) `padding-inline: 16px` to match the header.

3. **The two top buttons are ragged.** `Create new workspace` (196px) and `Import ZIP` (116px) are content-sized with `align-self: flex-start`, leaving a lopsided row with empty space on the right. **Fix:** equal widths or `flex: 1` so they fill the row, or right-size consistently.

4. **Compounding vertical spacing.** `.workspace-manager-new` carries `margin-bottom: 8px` **and** sits in a `gap: 8px` flex row **and** the column has `gap: 6px` (`playground.css:3940-3956`, `3934-3938`). The margin is redundant and creates uneven rhythm (and double spacing when the buttons wrap). **Fix:** drop the `margin-bottom`, rely on the container gaps.

> One more structural note: the manager is a **bottom-sheet `Drawer` (`swipeDirection="down"`)** reused as a right-anchored desktop side panel. The handle leak (above) is the visible symptom; consider whether the desktop presentation should be a centered modal/dialog rather than a side sheet, which would also fix the awkward top-right close-button-over-handle stack.

---

### NSQL-06 — "Workspace" is under-explained 🟢 (your #5)

**What's unclear.**
- The drawer's one-line description is **`"Isolated, OPFS-backed copies of this playground's files and database state."`** (`WorkspaceBadge.tsx:411-414`). For a non-SQL playground this is doubly off: **"OPFS-backed" is internal jargon** a learner won't know, and **"database state" doesn't exist** here (there's no DB in the JS/Python/… playgrounds — that string is copied from the SQL playground).
- New workspaces are named with a **raw timestamp** — `Workspace 6/6/2026, 9:09:55 AM` (`WorkspaceBadge.tsx:168-169` and `:345-346`). It's meaningless and **truncates in the header badge** ("Workspace 6/6/2026, 9:09…", `assets/42-examples-menu.png`).
- There's **no first-run explanation** of what a workspace is or why you'd want more than one. The only entry point is the badge, which most users won't click.

**Recommendation.**
- Rewrite the description in plain language, branched by playground type, e.g. non-SQL: *"A workspace is a separate, saved copy of your files for this playground. Switch between them to keep different projects apart — everything stays in your browser."* Drop "OPFS-backed" / "database state" for non-SQL.
- Default new workspaces to a friendly name — `"Untitled workspace"` or `"Workspace 2"` (next ordinal) — and let the timestamp be a subtitle, not the title.
- Consider a one-time tooltip/callout on the badge ("This is your workspace — your files are saved here") on first visit.

---

### NSQL-07 — Uncaught OPFS `NotFoundError` on every first load (all nine languages) 🔴 (new)

**What happens.** On a fresh load of *any* non-SQL playground, exactly one uncaught promise rejection fires:
```
NotFoundError: A requested file or directory could not be found at the time an operation was processed.
```
Captured via `pageerror` and `unhandledrejection` on all nine languages (§8 — every row shows `pageErrs=1`). In dev it pops the Next.js error overlay ("1 Issue", visible bottom-left of `assets/01-js-initial.png` and `assets/03-js-files-pane-open.png`); **in production it would surface to whatever error monitoring you run** as a recurring uncaught exception. It does **not** break functionality — code still runs correctly — but a 🔴 "throws on every load" is not production-ready.

**Diagnosis.** The DOMException has an empty `.stack` (typical for async OPFS handle ops), so it's a fire-and-forget OPFS call that isn't `.catch()`-ed. The app's own read/delete/list helpers in `opfs/fileStorage.ts` and `files/opfsDataStorage.ts` all swallow `NotFoundError` internally, and the bootstrap's awaited path is wrapped in try/catch (`Playground.tsx:886-973`). The remaining unguarded surfaces are the **fire-and-forget writers/flushers**, e.g.:
```ts
// opfs/fileStorage.ts:51-95 — flush() is invoked as `void flush()` (no .catch);
// navigator.storage.getDirectory() on line 62 is OUTSIDE the per-write try/catch.
function schedule(){ … requestIdleCallback(() => void flush() …) }  // unguarded rejection path
```
(The worker runtimes' own OPFS layer is another candidate, but the leak reproduces identically across all nine languages — pointing at the shared JS bootstrap, not a per-runtime worker.)

**Recommendation.**
- Wrap the fire-and-forget schedulers: `requestIdleCallback(() => { flush().catch(() => {}); })` and move `navigator.storage.getDirectory()` inside `flush()`'s try (or wrap the whole body).
- Audit the bootstrap for any non-awaited OPFS call (`opfsWriteFile` at `Playground.tsx:907,925`, `void loadDataFiles(...)` at `:1001`) and ensure each has a `.catch()`.
- As a belt-and-suspenders net, install a single `window.addEventListener("unhandledrejection")` that silently drops OPFS `NotFoundError` (these are expected on empty storage).

---

### NSQL-08 — The Files panel is completely unreachable on mobile 🟡 (new)

**What happens.** Below 768px the entire icon rail (and thus the Files button) is hidden, and the mobile header menu offers only **Examples / Export / Information / Settings** — **no Files** (`assets/30-mobile-initial.png`, `assets/31-mobile-menu.png`). So on a phone you cannot open the file tree, upload data files, create folders, rename via the tree, or download files. (You *can* still add/switch file tabs via the tab-bar `+`, and switch workspaces via the badge — but the whole FilesPanel feature is desktop-only.)

**Root cause.**
```css
/* playground.css:774-781 */
@media (max-width: 768px) {
  .playground-icon-sidebar { display: none; }
  .playground-files-sidebar { display: none; }
}
```
…with no mobile replacement entry point (the mobile menu in `Playground.tsx:3160-3217` lists Examples/Export/Info/Settings only).

**Why it's a problem.** Data-upload and multi-file workflows are core to several of these playgrounds (the JS Examples even include "Fetch CSV", "Multi-file Project"). Silently dropping all file management on mobile is a feature gap, not just a layout compromise.

**Recommendation.** Add a **"Files"** entry to the mobile header menu that opens the FilesPanel as a bottom-sheet `Drawer` (the same pattern Packages/Workspaces already use), or surface a Files tab in the existing mobile Editor/Output tab bar. At minimum, if mobile file management is intentionally out of scope, say so (disabled item with a tooltip) rather than omitting it.

---

### NSQL-09 — Minor polish 🟢 (new)

- **Hover tooltip overlaps the Files panel toolbar.** With the Files panel open, the icon-rail "Files" hover tooltip renders on top of the panel's "Upload" button (`assets/03-js-files-pane-open.png`). The rail's tooltips open `side="right"`, directly over the adjacent panel. Consider suppressing the tooltip while the panel is open, or offsetting it.
- **Redundant Files close affordances.** The panel can be closed by its own header `✕` (`Playground.tsx:3473-3480`) *and* by re-clicking the rail Files button — plus the rail button stays lit. Harmless but slightly redundant; pick one primary.
- **Header workspace badge truncates the timestamp name** ("Workspace 6/6/2026, 9:09…"). Fixed largely by NSQL-06's friendlier default name; otherwise the badge already ellipsizes (`.workspace-badge-name`), which is fine once names are short.

---

## 5. Accessibility

| Item | Notes |
|---|---|
| Inert "Editor" button (NSQL-01) | A focusable `<button>` with `aria-label="Editor"` that has no action and no pressed state. Screen-reader/keyboard users land on a control that does nothing. Remove it or give it a real action + `aria-pressed`. |
| `active` vs `:hover` indistinguishable | `.playground-icon-sidebar-btn.active` and `:hover` are the same background (`playground.css:493-501`). Toggled state isn't conveyed by anything but a color identical to hover — weak for low-vision users. Add a non-color cue (border/indicator). |
| Theme cards | ✅ Good — implemented as a `role="radiogroup"` with `role="radio"` + `aria-checked` (`playgroundShared.tsx:529-545`). |
| Icon-rail labels | ✅ Each rail button has an `aria-label` and a visible hover tooltip. |
| Drag handle (`aria-hidden`) | ✅ Correct, but it shouldn't render on desktop at all (NSQL-05). |

---

## 6. Responsiveness / mobile

- **Desktop layout** is solid at 1600×1000: 40px icon rail, optional 220px Files sidebar, then a 1fr/1fr editor/output split (`playground.css:784-806`).
- **Mobile (390×844)** collapses to an Editor/Output tab bar and a bottom-sheet header menu (`assets/30-mobile-initial.png`, `assets/31-mobile-menu.png`). This works for the core run loop, **but**:
  - **Files is unreachable** (NSQL-08, 🟡).
  - The **workspace manager drawer** becomes a proper bottom sheet on mobile (good) — the handle leak (NSQL-05) is a *desktop* regression of that same component, not a mobile one.
- No horizontal overflow observed at 390px on the editor/output view.

---

## 7. Workflow walkthrough log

Common IDE/playground flows exercised live (JavaScript unless noted):

| Flow | Result |
|---|---|
| Boot + render editor | ✅ all 9 languages (§8) |
| Run code (▶ / Ctrl+Enter) | ✅ correct output, e.g. JS prints the π/e/loop/banner sample; "Done in 0.08s" |
| Output empty state | ✅ "Run your code to see output" with icon |
| Open/close Files panel | ⚠️ works, but NSQL-01 (dual active) + NSQL-09 (tooltip overlap) |
| Examples menu | ✅ rich, titled+described snippets (`assets/42-examples-menu.png`) |
| Export menu | ✅ opens (`assets/43-export-menu.png`) |
| Settings → General/Themes | ⚠️ works, but NSQL-03 (occluded editor) + NSQL-04 (wrong-language preview) |
| Theme apply | ✅ applies live to CM (measured), ⚠️ but hidden behind Settings |
| Workspace popover | ✅ clean (`assets/21-workspace-popover-crop.png`) |
| Create / switch workspace | ✅ creates + reloads into the new workspace |
| Workspace manager drawer | ⚠️ functional, but NSQL-05 (spacing) + NSQL-06 (terminology) |
| Language switcher | ✅ dropdown navigates between playgrounds (`assets/20-language-dropdown.png`) |
| Mobile run loop | ✅ Editor/Output tabs + header menu; ⚠️ NSQL-08 (no Files) |

---

## 8. Cross-language boot/run results

Each playground loaded in a fresh context; waited for the editor + an enabled Run button, clicked Run, and waited for output. Cold-cache (includes CDN runtime downloads for Pyodide/WebR/php-wasm/browsercc/CheerpJ/.NET).

| Language | Boot | Ran | Output chars | Page errors | Time (cold) |
|---|---|---|---|---|---|
| javascript | ✅ | ✅ | 218 | **1** | 1.4s |
| typescript | ✅ | ✅ | 158 | **1** | 3.4s |
| python | ✅ | ✅ | 176 | **1** | 14.8s |
| php | ✅ | ✅ | 197 | **1** | 5.3s |
| r | ✅ | ✅ | 158 | **1** | 4.9s |
| c | ✅ | ✅ | 155 | **1** | 5.6s |
| cpp | ✅ | ✅ | 131 | **1** | 8.0s |
| java | ✅ | ✅ | 159 | **1** | 12.9s |
| csharp | ✅ | ✅ | 153 | **1** | 9.8s |

**Takeaways:** (1) every language works end-to-end; (2) **every language throws exactly one page error** — the OPFS `NotFoundError` of NSQL-07, confirming it's in the shared bootstrap; (3) Python/Java/C# are the slow cold boots (10–15s) — the loading hero + quips cover this, but it's worth noting for perceived performance.

---

## 9. Prioritized implementation plan

All changes are in shared files, so each fixes all nine playgrounds at once.

**Phase 1 — Correctness (do first)**
- **NSQL-07** Stop the uncaught OPFS `NotFoundError`: `.catch()` the fire-and-forget `flush()`/writers in `opfs/fileStorage.ts`, wrap `getDirectory()`, add a global `unhandledrejection` net for OPFS NotFound. *(🔴; small, isolated.)*

**Phase 2 — The five reported issues**
- **NSQL-01** Remove the hard-coded `active` from the Editor button; either drop it or give it a real focus-editor action; make `.active` ≠ `:hover`. *(`Playground.tsx`, `playground.css`.)*
- **NSQL-02** Add a Settings entry to the top-right header cluster (reuse `openSettingsTab()`). *(`Playground.tsx`.)*
- **NSQL-03** Render Settings beside the editor (in the output half) instead of as an opaque overlay, so theme changes preview live. *(`playground.css`, small `Playground.tsx` layout tweak.)*
- **NSQL-04** Per-language (or real-file-derived) theme preview snippets. *(`playgroundShared.tsx`.)*
- **NSQL-05** Workspace drawer: fix the handle selector, add `padding-inline:16px` to the body so cards align with the header and don't touch the walls, drop the redundant button `margin-bottom`, equalize the two top buttons. *(`WorkspaceBadge.tsx`, `playground.css`.)*
- **NSQL-06** Plain-language, playground-type-aware workspace description; friendly default names. *(`WorkspaceBadge.tsx`.)*

**Phase 3 — Mobile & polish**
- **NSQL-08** Add a "Files" entry to the mobile menu (FilesPanel as a bottom-sheet drawer). *(`Playground.tsx`.)*
- **NSQL-09** Tooltip-vs-panel overlap, redundant close affordance, badge truncation cleanup.
- **A11y** `aria-pressed` consistency, non-color active cue (folds into NSQL-01).

---

## 10. Appendix — methodology & screenshot index

**Environment.** Next.js dev server on `:3457`; Playwright Chromium (`--ignore-certificate-errors`, `ignoreHTTPSErrors`); desktop 1600×1000, mobile 390×844. Findings cross-checked against source. The Next.js dev error overlay was neutralized with an injected `nextjs-portal{display:none}` style so it wouldn't intercept clicks (it only appears because of NSQL-07).

**Reproduction.** All findings are reproducible by loading any `/playground/<lang>` (non-SQL), opening the Files panel (NSQL-01), the Settings tab → Themes (NSQL-03/04), and the workspace badge → Manage (NSQL-05/06); and by reading the console on first load (NSQL-07).

**Screenshot index** (`assets-20260606-nonsql-playground-audit/`):

| File | Shows |
|---|---|
| `01-js-initial.png` | Default JS playground; note settings gear bottom-left + dev "1 Issue" overlay |
| `02-icon-sidebar-both-active.png` | Icon rail crop — Editor **and** Files both lit (NSQL-01) |
| `03-js-files-pane-open.png` | Files panel open in context (NSQL-01, tooltip overlap NSQL-09) |
| `04-body-files-open.png` | Body region with Files open |
| `10-settings-themes-grid.png` | Settings → Themes grid |
| `11-dracula-selected-editor-hidden.png` | Dracula selected; editor hidden behind Settings; **Python snippets in JS playground** (NSQL-03, NSQL-04) |
| `12-editor-after-close-dracula-applied.png` | After closing Settings — Dracula now visible on real code (NSQL-03) |
| `13-workspace-popover.png`, `21-workspace-popover-crop.png` | Workspace popover |
| `14-workspace-drawer.png`, `15-…-crop.png`, `16-workspace-item-crop.png` | Manager drawer (1 workspace) — handle leak, edge spacing (NSQL-05) |
| `40-workspace-drawer-2ws.png`, `41-…-2ws-crop.png` | Manager drawer at the 2-workspace state from your screenshot (NSQL-05/06) |
| `20-language-dropdown.png` | Language switcher |
| `42-examples-menu.png` | Examples menu + truncated workspace name in badge (NSQL-06) |
| `43-export-menu.png` | Export menu |
| `30-mobile-initial.png`, `31-mobile-menu.png` | Mobile (390px): no Files entry (NSQL-08) |
| `50-python-run.png`, `50-typescript-run.png` | Cross-language run verification (§8) |
