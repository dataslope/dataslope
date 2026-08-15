# Git Playground — GUI-First Input and Multi-User Repos

**Date:** 2026-08-15
**Status:** Design addendum, no code written yet
**Amends:** `agent-outputs/20260813-1424-git-playground-design.md`
**Scope:** Two proposed changes to the Git playground design — (a) replacing
terminal-only input with a GUI, with the terminal reduced to a command
display, and (b) letting the learner switch between two or more users so they
can cause conflicts rather than inherit them.

---

## 0. Verdict summary

| Proposal | Verdict |
| --- | --- |
| Terminal is the only mutator (original §3.2) | **Superseded.** The diagnosis behind the GUI proposal is correct. |
| **Purely** GUI, terminal as read-only echo | **Not recommended.** Costs the transfer guarantee, the flag space, and grading integrity. |
| **GUI composes, terminal commits** (§2.4 below) | **Recommended.** Same discovery win, one execution path, far cheaper to build. |
| Training-wheels dial, per surface (§2.5) | **Recommended.** Resolves the prose-block vs. challenge-card conflict. |
| Multi-user repos | **Strongly recommended** — and worth more than conflict generation alone (§3). |
| Multi-user in phase 1 | **No.** Shape the data model for it now (§3.6); ship it in phase 4. |

The single most valuable line in this addendum is §3.3: the collaboration
half of Git is unreachable with one repository, and it is the half where
learners fail in the workplace.

---

## 1. What the GUI proposal is reacting to

The original design contains an unresolved tension between two of its own
rules:

- **§3.2** — "No 'Commit' button, no click-to-stage… The panels are strictly
  read-only views."
- **§9.4** — "The fastest way to lose a learner is a command that silently
  does nothing."

A bare prompt cannot be discovered. You can only type a command you already
know exists, which means the terminal-only design front-loads a memorisation
wall before any of the visualisation payload (§4.1's three-areas panel, the
thing the report calls its highest-value component) can do its work.

The original design already flinches at this. Its one carve-out — a palette
that **inserts** into the terminal input rather than executing — is the GUI
proposal in miniature, admitted as a footnote. The proposal's contribution is
to notice that the footnote is load-bearing and should be promoted.

Two further points in its favour that the original underweights:

1. **Mobile.** §3.1 disposes of mobile in one line ("the same three as tabs,
   terminal default"). Typing `git checkout -b feature` on a phone keyboard is
   miserable, and every mistyped character produces an error that teaches
   nothing about Git. A tap-driven surface is not a nicety on mobile — it is
   the difference between a usable lesson and an abandoned one.
2. **The parser becomes optional.** §2.3 argues that a command parser is the
   price of admission for *either* runtime, and uses that to neutralise the
   CLI question. A pure-GUI design is the one option that escapes the parser
   entirely. This is a real saving and should be credited as such.

---

## 2. Why not *purely* GUI

### 2.1 The proposal concedes its own counter-argument

The proposal keeps a Git-command display. That choice is an admission that
**the commands are the payload** — nobody renders a command pane for a
concept they consider incidental. But if the commands are what is being
taught, the learner should produce them. A pane that shows you what you would
have typed is the "you could have used a keyboard shortcut" toast: correct,
well-intentioned, and skimmed.

Recognition is not recall. A learner who has clicked *Commit* forty times has
forty repetitions of finding a button, and zero of composing
`git commit -m "…"`.

### 2.2 It breaks the house grammar

Every playground in this repository — 15 routes under `app/playground/`,
backing ~30 courses — is *type the real thing, run it*. A GUI-only Git
playground would be the only course on the site where the learner never
authors the artifact being taught. That is a large consistency cost to pay
once, and it compounds: `<GitBlock>` in prose would show commands the reader
never writes, in a document format whose entire convention is runnable source.

### 2.3 Grading stops measuring the right thing

`GitExpect` (§6.2) grades repo state, so a GUI action satisfies it just as
well as a typed command — which sounds like a feature and is actually the
problem. A card reading *"create a branch called `feature`"* would be
measuring whether the learner located the New Branch button. The live
objective checklist (§5.2), which the original design correctly identifies as
its best idea, derives its teaching value from the learner seeing **which
command** flipped an objective green. Replace the command with a click and the
causal link it exists to expose is the thing that disappears.

There is also no room in a button for the argument space that makes Git hard
and worth teaching: `reset --soft` vs `--mixed` vs `--hard`,
`log --oneline --graph --all`, `checkout -b` vs `checkout`. GUIs collapse
these into menu items, and the collapse is exactly where the understanding
was.

### 2.4 The synthesis: GUI composes, terminal commits

**Every GUI affordance writes a command into the terminal input. None of them
execute.** The learner presses Enter.

```
WORKING TREE                         TERMINAL
● README.md   ┐                      $ git add README.md▊
● notes.txt   │ drag to Index ──────►  ^ composed by the drag, not yet run
○ src/        ┘                        press Enter to run it
```

What this preserves:

- **One execution path.** The parser stays the only mutator, so §6.2 grading,
  §6.3 per-command snapshots for time travel, and the transcript-as-work-
  product all keep working unchanged. A second, GUI-only mutation path would
  need its own snapshot hooks and its own grading story.
- **Transfer.** The learner's fingers still produce `git add README.md`.
- **The flag space.** Composed commands can carry flags the learner then sees,
  edits, and eventually types unaided.

What it costs to build: a string template and a click handler per affordance.
A real GUI costs dialogs, validation, error states, empty states, and an
accessibility surface per operation — and then a *second* implementation of
every Git operation behind them. The composed-command model is perhaps a tenth
of the work for most of the benefit.

**Drag-to-stage is worth building specifically.** Dragging a file from Working
Tree to Index across the three-areas panel is the one GUI gesture that is
pedagogically *better* than typing, because it makes the areas physical rather
than nominal. It should still fill the input rather than execute.

### 2.5 The dial, not the constant

Training wheels that never come off are just wheels. Make the assistance level
an explicit, visible setting with three positions:

| Level | Behaviour | Default surface |
| --- | --- | --- |
| **Guided** | Full palette + drag gestures compose complete commands | `<GitBlock>` in prose; mobile |
| **Assisted** | GUI composes the verb; learner types the argument (branch name, message) | Playground default |
| **Bare** | Palette collapses to a cheat sheet behind a keypress | `<GitChallengeCard>` |

One code path, three configurations. It also resolves a conflict the original
design leaves open — prose blocks want maximum hand-holding and challenge
cards want none, and §5.1/§5.2 already split on `expandState` for the same
underlying reason.

Pin challenge cards to **Bare** by default so grading keeps measuring
composition. Let a card opt into Assisted when the objective is a concept
rather than a command.

---

## 3. Multi-user repos

### 3.1 Verdict

Adopt it. It is the stronger of the two proposals, and its value is larger
than the stated motivation.

### 3.2 It fixes a real defect in the original design

The original scenario set (§6.1) includes `conflict-pending` — conflicts
arrive **pre-baked as a fixture**. That teaches conflict *resolution* while
skipping conflict *causation*, and causation is the part learners are actually
confused by. "Why did this happen, and what could I have done differently?" is
unanswerable when the conflict was handed to you fully formed at t=0.

A learner who edits line 3 as Alice, switches to Bob, edits line 3 again, and
then watches the merge fail has learned something a fixture cannot deliver:
conflicts are not a Git malfunction, they are two people editing the same line.

### 3.3 The larger prize: the collaboration half of Git

Conflicts are the headline; the real value is everything else that requires a
second repository:

- push rejected as non-fast-forward, and why `git pull` fixes it
- fetch vs. pull — invisible with one repo, obvious with two
- divergence: `main` two ahead and three behind `origin/main`
- a merge commit appearing "from nowhere" after a pull
- force-push overwriting a colleague's commits

This is where beginners fail at work. None of it is reachable with one user,
and the original design's §4.2 already wants ghosted `origin/main` pills on
the graph precisely because "ahead/behind is the most misunderstood
relationship in Git." Multi-user is what generates those states honestly
rather than staging them.

### 3.4 Naming: machines, not users

Call them **machines or people with laptops**, not "users," and give them
names: *Alice's laptop*, *Bob's laptop*, plus a non-interactive *origin*.

"User switcher" reads as an identity or permissions concept — the GitHub
account model — which is a different thing and a well-documented source of
beginner confusion. The model that must land is **three separate
repositories**, each with its own working tree, its own index, and its own
idea of where `main` points. The label should carry "different computer,"
because that is the fact that makes conflicts inevitable rather than
mysterious.

Identity should be visible and consequential: commits authored as Alice show
`Alice <alice@…>` in `git log`, which teaches `user.name`/`user.email` as a
side effect.

### 3.5 The three-lane graph is the payoff view

Switching should swap the whole workspace by default — you cannot see Bob's
work, and that opacity *is* the lesson. But the commit-graph panel (§4.2)
should offer an **all-machines** mode:

```
Alice    ●──●──●  main
              ↑ 2 ahead of origin

origin   ●──●     main

Bob      ●──●──●  main
              ↑ diverged
```

Three lanes, one shared history, three different ideas of where `main` is.
That single image is distributed version control, and no amount of prose
substitutes for it. Default the panel to the active machine; make the
all-machines view one toggle away.

### 3.6 What it changes in the existing design

Mostly small, and much cheaper now than as a retrofit — the same argument
§4.4 makes for clickable graph nodes.

| Original | Change needed | Cost now | Cost later |
| --- | --- | --- | --- |
| `GitScenario.remote?: GitScenario` (§6.1) | Single-remote shaped. Wants `machines: Record<string, …>` + one `origin` | Small | Rewrites every fixture |
| `GitExpect` (§6.2) | Needs a `machine` discriminator — "Bob has the merge commit" is a different assertion from "Alice does" | Small | Breaking change to authored cards |
| Snapshots (§6.3) | Time travel must snapshot *all* repos per command, not one | Small | Silent correctness bug |
| Bundle (§7.2) | **No change.** A tar of the whole FS already captures N directories | Free | — |
| D1 `manifest` (§7.2) | Wants per-machine summary (`{machines:[{name, head, commitCount}]}`) | Small | Display-only, safe to defer |
| Panels (§4.1–4.3) | Every panel needs to know whose repo it renders | Medium | Threading a param through later is tedious but mechanical |
| Terminal | Per-machine scrollback, or one transcript with machine badges | Medium | — |

Engine cost is genuinely near zero: isomorphic-git takes `dir`/`gitdir` per
call and an `author` per commit, so N machines are N directories in the OPFS
FS the design already specifies. The local-remote decision in §6.1 (a second
in-FS repo as `origin`, no network, no auth) is the same mechanism — this
generalises it from 2 to N rather than introducing anything new.

### 3.7 Phasing caution

Multi-user should **not** land in phase 1. It multiplies the state surface of
every panel, and doing it before the single-repo refresh loop (§3.1: "the
refresh loop is the product") is solid would sink the core.

The cheap part now is making the data model N-shaped — the four "small" rows
above. Ship the feature in phase 4.

---

## 4. Revised phasing

| Phase | Contents | Change from original |
| --- | --- | --- |
| 1 | `git-worker.js` + parser + console + three-areas panel. **Composed-command palette + drag-to-stage from day one.** Single machine. | Palette promoted from carve-out to phase 1 |
| 2 | Commit graph, pointer chain, scenarios, reset tiers, OPFS persistence. **Assistance dial.** | Dial added |
| 3 | Cloud save/share (`BundleKind: "git"`), `[↗]` handoff. | Unchanged |
| 4 | **Multi-machine + `origin`, three-lane graph, machine-aware `GitExpect`.** Then `<GitBlock>`, `<GitChallengeCard>` + live checklist. | Multi-machine added ahead of cards, so card grading is machine-aware from its first release |
| 5 | Object inspector, conflict merge view, `rebase` on plumbing. | Unchanged |

Data-model shaping for phase 4 (§3.6) happens in phase 2, when scenarios and
`GitExpect` are first written.

---

## 5. Open questions

1. **Does the composed command auto-run at Guided level?** Arguments both
   ways: auto-run is smoother on mobile; manual Enter is the repetition that
   builds the habit. Suggest manual Enter everywhere, and revisit only if
   mobile testing shows the extra tap is a real drop-off point.
2. **How many machines?** Two plus `origin` covers every listed scenario.
   Three would enable "someone else pushed while you were working," which is
   the most realistic frustration of all. Recommend building for N, seeding
   with 2.
3. **Machine switching in embedded surfaces.** A `<GitChallengeCard>` clamped
   to 480px (§5.1) probably cannot host a machine switcher plus a terminal
   plus a checklist. Likely resolution: multi-machine challenges are
   playground-only, and cards get the `[↗]` handoff. Needs a mock before
   phase 4.
4. **Does the assistance dial persist per learner or per surface?** A learner
   who has graduated to Bare should not be dropped back to Guided by the next
   lesson's default. Suggest: surface sets the *initial* level, learner
   override persists.
5. **Conflict authoring.** For a scenario to *reliably* produce a conflict,
   the fixture needs both machines pointed at the same lines. Worth a helper
   in the scenario format rather than leaving it to per-lesson hand-authoring.
