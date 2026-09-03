# Git Playground: UX Review and Redesign Proposal

**Date:** 2026-09-03
**Scope:** `/playground/git` as built on `claude/git-playground-gui-design-5joih7` (PR #669), reviewed against the two design documents (`20260813-1424`, `20260815-0512`), the house chrome in the language playgrounds, and the Git learning tools beginners actually use.
**Goal from the brief:** a Git playground beginners can experiment in without being scared off; visually clean; usable on a phone, best on a desktop.

The short version: the runtime is right and the design decisions underneath it are right, but the surface was assembled panel by panel rather than composed as one screen. It looks like a developer tool, defaults to a black terminal even on a light site, buries the two panels that teach under a list of fifteen commands, and on a phone it separates the terminal from the state it changes, which removes the one thing the playground exists to show. Every finding below is fixable without touching the worker or the grading.

---

## 1. What was reviewed

- The code: `GitPlayground.tsx`, `gitPlayground.css`, `gitPanels.css`, and the five panel components (`WorkingTree`, `ThreeAreasPanel`, `CommitGraph`, `CommandPalette`, `GitTerminal`).
- Screenshots at 1440, 1024 and 390 px wide, in both themes, across four states: fresh load, a worked session with a branch, a merge conflict with the file open, and each mobile tab.
- The JavaScript playground at the same widths, as the reference for house chrome.
- Reference tools: Learn Git Branching, Visualizing Git, Oh My Git!, GitHub Desktop, VS Code Source Control, GitKraken and Fork. The first three are learning tools; the rest are what a beginner will graduate to.

Bugs found along the way are collected in §7.

---

## 2. What the reference tools agree on

Five tools built for the same audience converge on the same choices. That convergence is the strongest evidence in this review.

| Pattern | Who does it | Why it matters for beginners |
| --- | --- | --- |
| **The graph is the hero; the terminal is a strip.** | Learn Git Branching, Visualizing Git, GitKraken, Fork | The graph is the mental model. The terminal is how you poke it. Putting the terminal in the center column makes the poking stick the main event. |
| **Three nouns, one verb per screen.** Changes, history, branches. | GitHub Desktop, VS Code | Beginners are lost in vocabulary before they are lost in concepts. "Index", "refs/heads", and object ids appear nowhere in GitHub Desktop's default UI. |
| **Uncommitted work is drawn on the graph** as a would-be commit at the top. | GitKraken, Fork, Tower | It closes the gap between "my edits" and "the history": the working tree is the next node, not a separate world. |
| **Undo.** | Learn Git Branching (`undo`), Oh My Git! | The single largest reducer of fear. A beginner who knows they can step back will try things. |
| **Commands as objects you can pick up.** Cards with an icon and one line of meaning. | Oh My Git! | Validates the command palette's idea, but as a handful of cards in context, not a reference list. |
| **A goal, lightly held.** "Make your graph look like this." | Learn Git Branching | A sandbox with no suggested first move is a blank page. A suggested first move is not a level system. |

None of these tools teach with a dot matrix of three columns, and none default to a dark terminal chrome for a first-time audience.

---

## 3. Findings

Ordered by how much each one costs a beginner. Severity: **Blocker** stops a first session; **High** makes the playground read as hostile or hides the lesson; **Medium** is friction; **Polish** is finish.

### 3.1 It defaults to dark, alone among the playgrounds. *(High)*

`GitPlayground.tsx:74` reads `getStoredEditorTheme() ?? "github-dark"`. Every language playground defaults to `github-light` (`playgroundShared.tsx:48`). A learner arriving from a light course page lands on a black screen with green and blue monospace. That is the exact image "scary terminal" evokes, and it is one string. There is also no theme control in the Git header, so a learner cannot undo it; the language playgrounds expose the shared editor theme through their settings menu.

### 3.2 The terminal is the whole middle of the screen, and it is empty. *(High)*

The layout gives the terminal the widest column, the full height, and nothing to show: a paragraph of instructions at the top, a prompt 750 px below it at the bottom, and darkness between. The design document's own rule is that the terminal is the *only mutator*, which is a statement about what may change the repository, not about how much of the screen it deserves. Every reference tool makes it a strip.

### 3.3 The two panels that teach are compressed under a list of fifteen commands. *(High)*

The right column stacks Three areas, Commit graph and Commands. The first two are what the design calls the entire pedagogical payload. They get roughly 240 px between them; the command list gets the rest and scrolls. The graph nodes are 5 px.

### 3.4 On a phone you cannot see the state change. *(Blocker on mobile)*

Mobile is three tabs. The terminal is one tab; the three areas and the graph are another. The learner types `git add README.md` on one tab and must switch tabs to see what it did, by which point the 1.2-second highlight has faded. The refresh loop that the design says "is the product" is unobservable on the device.

### 3.5 The first thing a beginner reads is `HEAD → refs/heads/main → 4b1264b`. *(High)*

The pointer chain is a good component. It is the wrong headline. It sits at the top of the center pane, in monospace, before anything else on the page. Under it, the column header of the three areas says **Index**. A beginner has heard "staging area" from every tutorial they have read; "index" is the name in the plumbing. The design document itself wrote "Index (staging)".

### 3.6 The dot does not move. *(Medium, but it is the star)*

The design promises that "the dot sliding from Working Tree to Index on `git add` teaches more than a chapter of prose." What is built is a row highlight for 1.2 s and an opacity transition on each dot. One dot dims, another brightens. Nothing travels, so nothing reads as "it went from here to there."

### 3.7 Everything is blue. *(Medium)*

File names, commit messages, hashes, branch pills, panel headings and the HEAD tag all use the accent. Commit messages look like links and are not. With one color carrying every role, nothing is emphasized.

### 3.8 The conflict moment has no guidance. *(High)*

The scenario "Conflict waiting to happen" produces a correct merge conflict: red `CONFLICT` output, raw `<<<<<<<` markers in the editor, the graph showing two lanes. Then nothing. The three areas panel labels `config.yml` as "staged, then edited", which is wrong (it is unmerged) and which a beginner cannot act on. The scenario hint at the bottom still says "Merge them and see." This is the exact moment a beginner closes the tab.

### 3.9 The scenario hint is static. *(Polish)*

"Three commits on main, plus one unstaged edit." stays under the prompt after the edit has been committed and a branch created. It describes the starting state forever.

### 3.10 The working tree pane is a developer's file list. *(Medium)*

Tiny colored dots with no legend (yellow is modified, green is staged, you are expected to know). "New" opens `window.prompt()`. Opening a file reveals a bare `<textarea>` with a Save button, crammed into the lower half of a 240 px column. The design planned CodeMirror here; it is already a dependency of the other playgrounds.

### 3.11 The header controls do not match the switcher beside them. *(Polish)*

The scenario picker is a native `<select>` next to a base-ui `Select` for the playground switcher. On mobile the label is hidden and Reset is icon-only, so the header reads as two unlabeled controls.

### 3.12 Touch targets and type are sized for a mouse. *(Medium on mobile)*

Palette rows and file rows have 4 px vertical padding. Command text is 10.5 px, area labels 10 px. On a phone these are below any touch-target guideline. The hidden `<input>` behind the prompt inherits a 13 px font size, which is below the threshold at which iOS zooms the page on focus; the first tap on the prompt will likely zoom the layout.

### 3.13 The mobile tab bar is its own component. *(Polish)*

`.git-tabs` is a custom bar. The language playground has `.mobile-tabs` with a different treatment (uppercase eyebrows). Two playgrounds, two tab bars.

---

## 4. Proposal

### 4.1 Five principles

1. **Graph first, terminal as a strip.** The terminal remains the only mutator. It stops being the canvas.
2. **Three nouns: changes, history, branches.** Git's own names live behind one toggle, off by default in the playground, on by default in `<GitBlock>` where the prose is teaching them.
3. **One thing lit at a time.** The only highlight on the page is what the last command changed, and it moves.
4. **Every state suggests the next command.** The palette's `when` predicates already encode this; surface three of them as chips by the prompt rather than fifteen as a list.
5. **Same chrome as the other playgrounds.** Light by default, the same eyebrow labels, the same tab bar, the same tokens.

### 4.2 Desktop layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ⌂  [◆ Git ▾]   Scenario: Linear history ▾      on main    [Undo] [Reset]│
├────────────────────────────┬─────────────────────────────────────────────┤
│ ▤ CHANGES                  │ ⑂ HISTORY                        3 commits │
│                            │                                             │
│  Working directory      2  │   ◌ Uncommitted · 1 file          ← WIP row │
│  ┌ README.md   modified ┐  │   ● 4b1264b  [main] [HEAD]  Ignore node_… │
│  └ math.js               ┘  │   ● 9eea604               Add add()       │
│         ↓ git add          │   ● 0376154               Add README      │
│  Staging area           0  │                                             │
│    empty                   │                                             │
│         ↓ git commit       │                                             │
│  Committed  (HEAD → main)  │                                             │
│    3 files                 │                                             │
├────────────────────────────┴─────────────────────────────────────────────┤
│ >_ TERMINAL        [Commit these changes] [See what changed] [Unstage]   │
│ $ git add README.md                                                      │
│ on main · 3 commits · 1 change staged                                    │
│ $ ▊                                                                      │
└──────────────────────────────────────────────────────────────────────────┘
```

**Left, "Changes": the three areas as three boxes, top to bottom.** Files are chips. `git add` moves a chip from the top box to the middle one; `git commit` moves it to the bottom. The arrows between boxes are labelled with the command that moves things across them, so the panel is also the cheat sheet for the two commands that matter most. This is the design's "make the areas physical" note from the addendum, built. Box titles are "Working directory", "Staging area", "Committed"; with the internals toggle on they become "Working tree", "Index", "HEAD", and the pointer chain appears under the third.

**Right, "History": the graph, given room.** 8 px nodes, 36 px rows, lane colors. Branch pills in their lane color; `HEAD` as its own small tag attached to the branch pill rather than the text `HEAD -> main`. Messages in body text color; hashes muted. A **WIP row** at the top whenever the working directory or staging area is non-empty: a dashed hollow node reading "Uncommitted · 1 file", which is the GitKraken convention and the single image that connects "my edits" to "the next commit". Clicking a node opens a small detail card (message, author, files) with one button that fills the prompt with `git show <hash>`.

**Bottom, the terminal, full width, about a third of the height, draggable.** Scrollback above, prompt at the bottom, always in view. Above the prompt, up to three **next-step chips** chosen by state: after an edit, "Stage README.md"; after a stage, "Commit these changes" and "Unstage"; on a conflict, the three-step resolution. Chips fill the prompt and never execute, so the design's one-execution-path rule and the grading are untouched. "All commands" opens the full palette as a popover; `?` toggles it.

**Header.** Scenario picker as the same base-ui `Select` the switcher uses, with each scenario's one-line description in the menu. A live branch indicator ("on main"). **Undo**, which the memory-only, replay-from-history model makes almost free: reset and replay the command history minus the last entry. Reset stays. The theme follows the shared editor theme like every other playground.

### 4.3 Mobile layout

```
┌────────────────────┐
│ ⌂ [◆ ▾]  ⋯  ↶  ⟲   │
│ [ Changes │ History ]│  segmented control
│                      │
│   Working directory  │
│    README.md  mod.   │
│   Staging area       │
│   Committed          │
│                      │
├── ═══ ───────────────┤  drag handle
│ [Stage README.md]    │  chips
│ $ git add README.md  │
│ $ ▊            [Tab] │
└────────────────────┘
```

The terminal becomes a bottom sheet with three snap points: prompt only, about 40 %, and full height. The state pane sits above it and stays visible while typing, so the chip moving between boxes happens in view. The segmented control switches the upper pane between Changes and History; the graph gets the full width when chosen. The pointer chain and the scenario description are hidden at this width. A **Tab** button sits by the prompt because a phone keyboard has no Tab key and completion is the thing that makes typing bearable there. Next-step chips do double duty as completion. Touch targets go to 44 px; nothing below 13 px type.

### 4.4 The conflict moment

Detect a merge in progress (the worker already tracks `MERGE_HEAD`) and:

- Show a banner at the top of Changes: "Merge in progress. `config.yml` has a conflict." with three chips: "Open config.yml", "Mark it resolved" (`git add config.yml`), "Finish the merge" (`git commit`), plus a quiet "Abort the merge".
- Label the file "conflict" in the areas, not "staged, then edited".
- In the editor, color the three marker lines and add a small toolbar: Keep mine, Keep theirs, Keep both. These edit the working tree, which is exempt from the terminal-only rule. Raw markers remain the default view; that was the right call in the design and it stays.

### 4.5 A first move for every scenario

Each scenario gets a three-step "Try this" under its description, shown once in the Changes pane on load: "1. Edit README.md → 2. `git add README.md` → 3. `git commit -m …`". Steps tick as they are done; the strip disappears after the third. It is a suggested first move, not a level system, and it costs one array per scenario.

### 4.6 Motion

- Chips move between boxes with a FLIP transition (about 250 ms, disabled under `prefers-reduced-motion`). The moved chip carries a brief ring; nothing else glows.
- New commits scale in at the top of the graph and their edge draws.
- One line of narration appears under the prompt after each command, derived from the state diff: "README.md moved to the staging area." "New commit 4ffa806 on main." It is what makes the animation legible to a reader who blinked, and it is the same information the row highlight was trying to convey.

### 4.7 Visual system

- **Light by default**, dark following the site theme. Both use the same `--ds-*` tokens the language playgrounds use; no pure black surfaces.
- **One accent.** Blue for interactive and for the current branch. Green only for the prompt and "staged". Amber for "modified". Red for conflict and deletion. Everything else is ink and muted ink.
- **Pane heads as eyebrows**, the `</> EDITOR` / `>_ OUTPUT` treatment from the language playground, so the two playgrounds read as siblings.
- **Type**: UI 13 px, mono 13 px, nothing smaller than 12 px. Panel padding 16 px, rows 32 px.
- **Words**: "Working directory", "Staging area", "Committed"; "on main"; "1 change staged". `Index`, `refs/heads/main`, object ids and the pointer chain live behind "Show Git's names".

### 4.8 What stays

The review is of the surface. These are right and should not be touched:

- The terminal is the only mutator; every affordance composes a command and the learner presses Enter.
- Memory-only; the command history is the work product.
- Scenarios as replayed command scripts through the same shell the learner uses.
- The hand-rolled SVG graph.
- just-bash underneath, so `ls`, `cat .git/HEAD` and friends work.
- Raw conflict markers as the default view.

---

## 5. Phasing

**Phase 1, structure and calm.** Light default and shared theme; terminal to a bottom strip; the three boxes with chips and FLIP motion; vocabulary toggle; next-step chips; Undo; mobile bottom sheet and segmented control; the touch-target and type-size floor. This phase changes how the playground feels without adding a feature the worker does not already support.

**Phase 2, depth.** WIP row and commit detail card; conflict banner and editor toolbar; CodeMirror for the file editor; "Try this" per scenario; narration line; share links that carry the history (addendum §5.4).

**Phase 3, the addendum's larger items.** Multi-user repositories with the three-lane graph; drag-to-stage that composes a command. Both were designed already and both sit naturally on the phase 1 layout.

---

## 6. Component impact

| Component | Change |
| --- | --- |
| `GitPlayground.tsx` | New layout shell: two panes over a terminal strip; header controls; Undo; mobile sheet. Most of the file. |
| `ThreeAreasPanel.tsx` | Rewritten as three boxes with chips and FLIP; keeps its `statusMatrix` reading. |
| `CommitGraph.tsx` | Sizing, WIP row, `HEAD` tag, detail card. Layout algorithm unchanged. |
| `CommandPalette.tsx` | Becomes the next-step chips plus a popover; the `GROUPS` table and `when` predicates are reused as-is. |
| `WorkingTree.tsx` | Inline new-file row; CodeMirror; status words; conflict toolbar. |
| `GitTerminal.tsx` | Unchanged except a narration slot and the mobile Tab button. |
| `gitPlayground.css` / `gitPanels.css` | Largely rewritten to the visual system in §4.7; tokens unchanged. |
| Worker, protocol, grading, `GitBlock`, `GitChallengeCard` | Untouched. `GitBlock`'s state strip could adopt the boxes later. |

---

## 7. Bugs found during review

1. **Dark default** while every other playground defaults light (`GitPlayground.tsx:74`).
2. **Stale scenario hint** under the prompt describes the starting state after it has changed.
3. **"staged, then edited"** shown for an unmerged file during a conflict.
4. **`window.prompt()`** for New file.
5. **iOS zoom on prompt focus**: the hidden input has no font size and inherits 13 px. Set 16 px on it; it is invisible, so the size costs nothing.
6. **The AI assistant button** overlaps the bottom of the palette on desktop and the end of the prompt line on mobile. Site-wide, not the playground's, but the terminal strip in §4.2 should reserve room for it.
7. `HEAD -> main` in the graph uses ASCII while the headline uses `→`.

---

## 8. Open questions

- **How much vocabulary to hide by default?** The proposal hides `Index`, `refs/heads` and object ids in the playground and shows them in `<GitBlock>`. The course authors should decide where the line is; the toggle makes it a setting rather than a rewrite.
- **Undo semantics.** Replay-minus-one is exact and cheap, but "undo a merge that touched three commands" needs a decision: undo the last command, or undo to the last clean state?
- **Is the WIP row worth its confusion?** It is the industry convention and it teaches; it is also one more thing on the graph. Recommend shipping it behind the same internals toggle for one release and watching.
