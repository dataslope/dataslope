# Bash Playground: Plan

**Date:** 2026-09-03
**Builds on:** the shell runtime shipped for the Git playground and the Bash blocks (just-bash in a Worker, `ShellSession`, `GitTerminal`), the redesigned Git playground shell (`agent-outputs/20260903-0745`), and the house playground chrome.
**Brief:** an in-memory Bash playground with no sharing. Split horizontally and vertically into terminals that share context. Add, close and rearrange terminals; resize them when split.

**Status (2026-09-03):** Phase 1 is implemented on this branch: one session with a shell per terminal (§5.1), the split tree with gutters (§4), drag to rearrange with the five drop zones, the phone's tab strip (§2.2), the keyboard shortcuts (§3), the cap of eight (§6), and the registry and links (§5.4). Two things changed while building. Panes render as one flat list positioned from `layout()` rather than as nested flexbox, because nesting remounted a terminal whenever the tree changed around it, and a split that wiped the scrollback of the terminal being split was worse than no split. And the pane head stays on a phone, minus its grip and close button, so rename, move and clear are reachable there. Phase 2 is untouched.

---

## 1. Decisions

1. **Memory-only, and nothing persists.** No OPFS, no cloud, no share link, no saved layout. A reload is a fresh start: one terminal, the default scenario. The one thing remembered is the shared editor theme, because every playground reads it.

2. **"Share context" means one machine, many shells.** Every terminal sees the same filesystem: a file created in one is there in the other, immediately. Every terminal has its own working directory, environment, functions and history, so `cd src` in one does not move the other. This is what tmux and iTerm do when you split, and it is what a learner expects "split" to mean. A new terminal starts in the working directory of the one it was split from, which is the one tmux convenience worth copying.

3. **Terminals are tabs; the desktop shows them split, the phone shows them as a strip.** There is one list of terminals. On a desktop it is laid out as a split tree with gutters; on a phone the same list is a tab strip with one terminal visible. No second level of "windows" above "panes": the brief's four verbs (add, close, rearrange, resize) all act on that one list.

4. **The terminal is the only surface.** No file tree, no editor, no state panel in the first version. A shell already has `ls`, `cat` and `find`, and the Bash blocks decided the same. A collapsible file tree is a phase 2 option, not a requirement.

5. **Same chrome, same terminal.** The header, tokens and boot overlay are the language playgrounds'. Each pane is the `GitTerminal` component the Git playground and the Bash blocks already use: block cursor, ANSI colors, bash-style Tab completion, history, `Ctrl-L`, `Ctrl-C`.

6. **The runtime already supports this.** `ShellSession` passes its own `cwd` and `env` into every `exec` and reads `PWD` back, so several sessions over one `Bash` instance is exactly the primitive needed. The worker change is small and is described in §5.1.

---

## 2. What the reader sees

### 2.1 Desktop

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ⌂  [◆ Bash ▾]   Scenario: Small project ▾     [+ New] [Split ▾]   [⟲ Reset] │
├──────────────────────────────────┬─────────────────────────────────────────┤
│ ≡ bash 1            ~        ⋯ ✕ │ ≡ bash 2            ~/src         ⋯ ✕  │
│ ~ $ ls                           │ ~ $ cd src                              │
│ README.md  notes.txt  src        │ ~/src $ touch new.js                    │
│ ~ $ ls src                       │ ~/src $ ▊                               │
│ app.js  lib  new.js  util.js     │                                         │
│ ~ $ ▊                            ├─────────────────────────────────────────┤
│                                  │ ≡ bash 3            ~             ⋯ ✕  │
│                                  │ ~ $ wc -l src/*.js                      │
│                                  │  ...                                    │
│                                  │ ~ $ ▊                                   │
└──────────────────────────────────┴─────────────────────────────────────────┘
```

- **Header.** Logo and playground switcher (Bash joins the list, with its icon), the scenario picker as the same base-ui Select the Git playground uses, **New** (adds a terminal by splitting the focused one along its longer side), **Split** with two entries (Right, Down), and **Reset**. On a phone the labels drop to icons, as in the Git playground.
- **A pane.** A title bar and a terminal. The title bar holds a drag handle, the name (`bash 1`, renamable by double-click), the working directory in muted mono (`~/src`, updated after every command), a **⋯** menu (Split right, Split down, Move left / right / up / down, Swap with next, Rename, Clear, Close) and **✕**. The focused pane's title bar carries the accent; every action in the header acts on the focused pane.
- **Gutters.** 6 px between siblings, `col-resize` / `row-resize` cursors, a minimum pane size of 220 × 120 px, and double-click to equalize the siblings. The gutter lights on hover the way the Git playground's console handle does.
- **Empty terminal.** The scenario description as the first line of the first pane only, in muted text (`A handful of files and one nested directory. Try ls.`). Nothing else; a shell should open as a prompt.

### 2.2 Phone

```
┌──────────────────────┐
│ ⌂ [◆ ▾]  ⋯  ⟲        │
│ [bash 1][bash 2 ✕][+]│  tab strip, scrolls
│ ~/src $ touch new.js │
│ ~/src $ ▊      [Tab] │
│                      │
└──────────────────────┘
```

The tab strip shows every terminal in tree order; the active tab has the ✕; **+** adds one. Rearranging is the ⋯ menu's Move left / Move right. The split tree is kept, not discarded, so rotating a tablet back to landscape restores the layout. The **Tab** button and the 16 px hidden input carry over from the Git playground's mobile work.

---

## 3. Interaction spec

| Action | Desktop | Phone | Keyboard |
| --- | --- | --- | --- |
| Add a terminal | **New**: split the focused pane along its longer side, new pane after it, focus moves to it | **+** on the strip: append, make active | `Alt+Shift+T` |
| Split | **Split ▾ → Right / Down**, or the pane's ⋯ menu | not offered; a tab is added instead | `Alt+Shift+→` right, `Alt+Shift+↓` down |
| Close | ✕ on the title bar, or ⋯ → Close; the sibling takes the space; focus moves to the nearest pane | ✕ on the active tab | `Alt+Shift+W` |
| Rearrange | drag the title bar onto another pane: five drop zones, four edges move the pane there as a new split, the center swaps the two | ⋯ → Move left / right | ⋯ menu; `Alt+Shift+M` opens it |
| Resize | drag the gutter; double-click it to equalize | not applicable | none |
| Focus | click anywhere in a pane | tap a tab | `Alt+←↑→↓` moves to the neighbor in that direction |
| Rename | double-click the name | ⋯ → Rename | `F2` on the focused pane |
| Clear | `clear` or `Ctrl-L`, as now | same | same |

Rules that keep the model simple:

- The last terminal cannot be closed; closing it clears it instead.
- At most **8** terminals. **New** and **Split** disable at the cap, with a tooltip saying why.
- Focus follows creation: a new terminal is focused and its prompt takes the keyboard.
- **Reset** reseeds the filesystem for the current scenario, clears every terminal's scrollback and returns every shell to the home directory. It does not close terminals or change the layout; the layout is the reader's, the filesystem is the scenario's. Changing scenario does the same.
- Drag starts after 6 px of movement, so a click on the handle still focuses. While dragging, the pane under the pointer shows its drop zones; `Escape` cancels.

---

## 4. The split tree

The layout is a binary tree. Leaves are terminals; internal nodes split their children along one axis and hold each child's share.

```
type Node =
  | { kind: "leaf"; id: string }
  | { kind: "split"; id: string; dir: "row" | "col"; children: [Node, Node]; ratio: number };
```

`ratio` is the first child's share, 0.1 to 0.9. Binary rather than n-ary because every operation the brief names is a local edit to one leaf and its parent, and binary keeps resizing a single number per gutter. Three panes in a row are two nested splits, which renders identically.

Pure operations, in `splitTree.ts`, each with tests:

| Operation | What it does |
| --- | --- |
| `split(tree, leafId, dir, newId, after = true)` | Replace the leaf with a split of `[leaf, new]` (or `[new, leaf]`), ratio 0.5. |
| `remove(tree, leafId)` | Replace the leaf's parent with its sibling. |
| `move(tree, leafId, targetId, edge)` | `remove`, then `split` the target on that edge. The center zone is `swap`. |
| `swap(tree, a, b)` | Exchange two leaves in place. |
| `resize(tree, splitId, ratio)` | Set a split's ratio, clamped. |
| `equalize(tree, splitId)` | Ratio to 0.5. |
| `leaves(tree)` | In-order leaf ids: tab order on a phone, `Tab`-cycle order everywhere. |
| `neighbor(tree, leafId, dir, rects)` | The leaf whose rendered rectangle is nearest in that direction, for `Alt+Arrow`. Takes measured rects rather than reasoning about the tree, because "left of" is a geometric question. |

Rendering is recursive and uses CSS: a split node is `display: flex` in its direction, its children `flex: ratio` and `flex: 1 - ratio`, with a gutter element between them. Resizing sets the ratio from pointer movement divided by the split's rendered length. No layout library: the tree is a few dozen lines, and the rendering is flexbox.

Rearranging by drag is the only part with real interaction complexity. The plan is pointer events on the title bar: on drag start, record the source leaf; on move, find the pane element under the pointer (`document.elementFromPoint`, walking up to `[data-pane]`) and which of five zones the pointer is in (outer 25 % on each side is an edge, the rest is the center); on release, `move` or `swap`. A translucent overlay on the target pane draws the zone. Same-pane drops and drops outside a pane cancel. HTML5 drag-and-drop is avoided on purpose: its ghost image and touch story are both poor.

---

## 5. Architecture

### 5.1 Worker: many shells, one filesystem

Today a bash session in the worker is one `Bash` instance, one filesystem and one `ShellSession`. The change:

- **A session holds a map of shells.** `shells: Map<string, ShellSession>`. The `Bash` instance and the filesystem stay one per session; that is the sharing.
- **Protocol.** `exec` gains `shell: string`. Two new requests: `openShell { session, shell, cwd? }` (a split passes its source's `cwd`) and `closeShell { session, shell }`. An `exec` on an unknown shell opens it at the session root, so the first terminal needs no ceremony.
- **The response's `cwd` is the executing shell's.** Each pane already tracks its own working directory from `CommandResult.cwd`, as the Bash block does, and ignores the shared state's `cwd`.
- **Serialize per session.** The message handler is an async arrow per message, so two panes running commands at once would interleave inside one `Bash`. A `queue: Promise<void>` on the session chains execs (`s.queue = s.queue.then(run)`), and `readState` runs on the queue too, so a snapshot never reads a filesystem mid-write. A pane whose command is waiting shows the existing "working…" line; a long-running command in one pane delays the others, which is the honest behavior of one machine and is bounded by just-bash's existing `executionLimits`.
- **State snapshot.** `tree`, `dirs` and `contents` are per session and unchanged. They feed every pane's path completion.

About 60 lines in `git-worker.ts` and 10 in `protocol.ts`. The Git playground and the blocks keep working unchanged: they use the default shell.

### 5.2 Client runtime

`useGitSession` grows `exec(command, shell?)`, `openShell(id, cwd?)` and `closeShell(id)`. Subscriptions are per session and stay as they are, since the filesystem snapshot is what they carry. The request functions are stable already (fixed during the Git playground work), which matters here because a pane keeps them in effects.

### 5.3 Components

| Component | Role |
| --- | --- |
| `bash/BashPlayground.tsx` | The shell: header, the split tree or the tab strip by viewport, focus, keyboard shortcuts, the pane cap, Reset. Owns the tree and the list of pane records `{ id, title }`. |
| `bash/SplitView.tsx` | Recursive renderer: a leaf renders its pane, a split renders two children and a gutter. Gutter drag and double-click live here. |
| `bash/TerminalPane.tsx` | Title bar plus `GitTerminal`. Owns the per-pane state: transcript, input, history, `cwd`, completion. |
| `bash/useShellPane.ts` | The per-pane state and handlers, extracted from `BashBlock` so the block and the pane share one implementation. `BashBlock` is then a `useShellPane` inside the block chrome, with its starting script. |
| `bash/PaneDrag.tsx` | The drag-to-rearrange overlay and zone detection. |
| `bash/splitTree.ts` | The pure tree operations from §4. |
| `bash/bashPlayground.css` | Layout, gutters, title bars, tab strip, drop zones. Terminal styling comes from `gitPanels.css` as it does everywhere else. |
| `app/playground/bash/{page,client,layout}.tsx` | The route, mirroring `playground/git`. |

### 5.4 Registry

The Git playground's checklist, again: `PLAYGROUNDS` entry with `ephemeral: true`; `bash` in `EPHEMERAL_PLAYGROUND_IDS`; `bash: SiGnubash` in `LANGUAGE_ICONS` with a brand tint; the card on `/playground`; the home page's Playground section; the shared footer; the boot overlay title. Nothing in the workspace persistence layer, because there is nothing to persist.

---

## 6. Limits

| Limit | Value | Why |
| --- | --- | --- |
| Terminals | 8 | Past that the split tree is unreadable on any screen, and each pane holds a scrollback. |
| Scrollback per pane | 2,000 entries, oldest dropped | Bounds memory for a `while true; do echo; done` that the loop cap lets run 10,000 times. |
| Minimum pane | 220 × 120 px | Below that the prompt wraps every word. Splits that cannot fit are refused with the same tooltip as the cap. |
| Filesystem | existing `MAX_FILE_BYTES`, `MAX_TREE_BYTES` | Unchanged; enforced in the FS wrapper. |
| Command | existing `executionLimits` | Unchanged; a runaway loop ends itself. |

---

## 7. Testing

- **`splitTree.test.ts`**: every operation, including that `remove` on the last leaf is a no-op, `move` onto itself is a no-op, ratios clamp, and `leaves` order is stable under split and move.
- **Worker multi-shell test**, in the style of `gitPlayground.test.ts`: two `ShellSession`s over one `Bash`; `cd src` in one leaves the other at home; `touch` in one is visible to `ls` in the other; a function defined in one is undefined in the other; two execs issued without awaiting resolve in order.
- **Browser walkthrough** with Playwright, as for the Git playground: split right, split down, type in each, confirm the shared file and the separate directories, drag a gutter and read back the ratio, drag a pane to another's edge, close one, cap at 8, then the phone: strip, add, close, move.

---

## 8. Phasing

**Phase 1, the brief.** Worker multi-shell and per-session queue; the route and registry; the split tree; panes with title bars; New, Split right, Split down; close; gutters with min size and equalize; focus and `Alt+Arrow`; Reset and scenario; the phone tab strip with add, close and move. Drag-to-rearrange on desktop ships here too, since it is the one interaction the ⋯ menu cannot fully replace.

**Phase 2, comfort.** Rename; keyboard shortcuts beyond focus; a **Commands** popover listing the shell's commands by group, as the Git playground's "All commands" does; a per-scenario "Try this" strip in the first pane, borrowed from the Git playground; a collapsible file tree on the left using the existing `FileTreePanel`, off by default.

**Later, if wanted.** A file editor on the tree (the Git playground's `FileEditor`); "Try this" chips per scenario; presets ("two side by side", "one over two"). Sharing stays out: the brief rules it out, and the addendum's §5 makes the case for why a shell session's history is not a thing to hand around.

---

## 9. Open questions

- **Inherit more than `cwd` on split?** tmux inherits nothing but the directory. Inheriting env and functions would surprise a reader who then edits one and expects the other to follow. Recommend directory only.
- **Should the layout survive a reload?** The brief says memory-only. Keeping the layout in `localStorage` would be a convenience with no data in it, but it blurs the rule. Recommend no, and revisit if readers ask.
- **Shortcut set.** `Alt+Shift` avoids every browser binding on Windows, macOS and Linux, but it collides with nothing because it is used by nothing, which also means it is undiscoverable. The ⋯ menu shows each shortcut beside its item, which is the usual fix.
- **Cap of 8.** A number to feel out. It is one constant.
