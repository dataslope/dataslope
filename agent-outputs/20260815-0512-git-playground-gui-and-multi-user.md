# Git Playground — GUI-First Input and Multi-User Repos

**Date:** 2026-08-15
**Status:** Design addendum, no code written yet
**Amends:** `agent-outputs/20260813-1424-git-playground-design.md`
**Scope:** Three proposed changes to the Git playground design — (a) replacing
terminal-only input with a GUI, with the terminal reduced to a command
display, (b) letting the learner switch between two or more users so they
can cause conflicts rather than inherit them, and (c) how the terminal handles
the UNIX commands a Git curriculum interleaves with `git` itself.

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
| Git-only terminal (no `ls`/`cat`/`echo`) | **Not viable.** Advertises a capability then withdraws it (§4). |
| Hand-rolled ~12-command POSIX subset | **Recommended.** The FS shim §7.1 already mandates *is* the shell (§4.1). |
| `just-bash` instead of hand-rolling | **Spike first.** Already in the tree via `almostnode`; size and FS-pluggability unverified (§4.5). |
| WebContainers / v86 | **No.** COOP/COEP conflicts with the CDN-import strategy; VM weight (§4.5). |

The single most valuable line in this addendum is §3.3: the collaboration
half of Git is unreachable with one repository, and it is the half where
learners fail in the workplace. The best *cheap* idea is §4.2 — with `cat` in
the terminal, `.git/HEAD` turns the pointer chain from a diagram into a file.

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

## 4. The shell problem

A terminal that answers `ls` with `command not found` is worse than no
terminal: it advertises a capability and then withdraws it, and the learner
concludes the environment is broken rather than that the command is out of
scope. Real Git work interleaves shell and Git constantly — `ls`, `cat`,
`mkdir`, `echo > file` — and every tutorial on the internet creates its first
file with `echo "# Project" > README.md`.

### 4.1 The FS shim already required *is* the shell

The strongest argument for building a small POSIX subset ourselves is that
almost all of the work is already mandatory. §7.1 requires the OPFS shim to
implement `readFile`, `writeFile`, `unlink`, `readdir`, `mkdir`, `rmdir`,
`stat`, and `lstat` because isomorphic-git demands them. That is precisely the
syscall set a file-command subset needs:

| Command | Implemented with |
| --- | --- |
| `ls`, `ls -a`, `ls -l` | `readdir` + `stat` |
| `cat` | `readFile` |
| `echo`, `echo > f`, `echo >> f` | `writeFile` |
| `touch` | `stat` + `writeFile` |
| `mkdir`, `mkdir -p` | `mkdir` |
| `rm`, `rm -r` | `unlink`, `readdir` + `rmdir` |
| `mv`, `cp` | `readFile` + `writeFile` + `unlink` |
| `pwd`, `cd` | shell-local state — no FS call at all |

Not one of these needs a filesystem primitive the Git runtime does not already
force us to write. And §2.3 concedes a command parser is unavoidable for
either runtime, so the marginal cost here is **argument parsing and output
formatting against an existing dispatch table** — not filesystem engineering.
Estimate: 400–600 lines, no new dependency, no bundle impact (it lives in
`public/_workers/git-worker.js` per §8.4.1, outside both bundles).

### 4.2 The payoff: `.git` becomes explorable

This is the reason to prefer a real shell subset over GUI-only file
management, and it is worth more than the convenience.

isomorphic-git writes a **genuine on-disk Git layout** — `.git/HEAD`,
`.git/refs/heads/*`, `.git/objects/`, `.git/config`, `.git/index`. With `cat`
and `ls` in the terminal, the object model stops being a diagram and becomes a
directory:

```
$ cat .git/HEAD
ref: refs/heads/main

$ cat .git/refs/heads/main
a1b2c3d4e5f6...

$ ls .git/
HEAD  config  index  objects/  refs/
```

That is §4.3's pointer chain, except the learner *discovers* it instead of
reading it off a panel. "HEAD is a pointer to a pointer" stops being a claim
to be believed and becomes two files to look at. No GUI can teach this, and a
Git-only terminal cannot either — it needs `cat`.

Caveat worth turning into a lesson: loose objects are zlib-deflated, so
`cat .git/objects/ab/cdef…` prints binary noise. That is the natural entry
point to `git cat-file -p`, which isomorphic-git supports directly via
`readObject`. Worth adding to the supported command list for exactly this
reason.

### 4.3 Scope: three tiers, and a stated line

The failure mode of a hand-rolled shell is unbounded creep — "just add
`sed`," "just add variables." Fix the boundary in advance:

| Tier | Contents | Decision |
| --- | --- | --- |
| **1 — must have** | The 12 commands above, plus `>` and `>>` redirection | Build in phase 1 |
| **2 — cheap, worth it** | `\|`, `&&`, `*` glob in the final path segment, `head`, `tail`, `wc`, `grep -n`, `clear` | Build if commands are modelled as `(args, stdin) => stdout`, which makes pipes nearly free |
| **3 — refuse by policy** | Variables, `$(…)`, subshells, `sed`/`awk`, `vim`/`nano`/`less`, job control, `sudo`, `curl`/`ssh`/`npm` | Never — each gets a redirect message (§4.4) |

The governing principle: **the shell exists to serve Git lessons, not to teach
shell.** Any command that does not appear in a Git curriculum is out, and the
curriculum's actual vocabulary is remarkably small.

### 4.4 Unknown commands are a product surface, not an error path

This is where the subset either feels curated or feels half-finished, and it
is almost entirely a copywriting problem. Three response classes:

1. **Deliberately absent, and we know why.** `vim`, `nano`, `less`, `sudo`,
   `npm`, `curl`, `ssh` get a named redirect to the right affordance rather
   than a failure:
   `vim isn't available here — click README.md in the working tree to edit it.`
   Editors are the important case: they are the most likely thing a learner
   reaches for, and the working-tree editor genuinely is the answer.
2. **A typo of something supported.** Edit-distance match →
   `git stauts` → `did you mean: git status?`
3. **Genuinely unknown.** The real message, unembellished:
   `bash: foo: command not found`.

§9.4 already requires publishing the supported Git command list in the UI. It
should be **one list covering both** Git commands and shell builtins — a
learner does not experience those as separate vocabularies.

### 4.5 Options considered and rejected

| Option | Verdict |
| --- | --- |
| **Hand-rolled subset** (§4.1) | **Recommended.** Bounded, no dependency, reuses the mandatory FS shim, and unlocks §4.2. |
| **`just-bash`** | **Spike it first.** Already in the tree transitively via `almostnode` (`scripts/build-almostnode-workers.mjs:24` stubs its dead `node:*` imports). Unverified: standalone bundle size, whether it accepts a custom FS backend, and its command coverage. Note `almostnode` itself is ~16 MB bundled and must **not** be pulled into the Git worker for a shell. |
| **WebContainers** (StackBlitz) | **No.** Requires site-wide COOP/COEP cross-origin isolation, which conflicts directly with the CDN-import strategy every other runtime depends on (§8.2), and its licence is restrictive for commercial use. |
| **v86 / full Linux VM** | **No.** Multi-megabyte image and a visible boot delay to run `ls`. |
| **No shell; GUI-only file management** | **No.** Leaves `ls` failing, which is the original complaint. |

The spike is worth an hour before committing to §4.1: if `just-bash` is small,
FS-pluggable, and covers tier 1, it removes 400–600 lines of maintained code.
If it is not, the hand-rolled subset is a known quantity.

---

## 5. Revised phasing

| Phase | Contents | Change from original |
| --- | --- | --- |
| 0 | **`just-bash` spike (§4.5)** — size, FS-pluggability, tier-1 coverage. One hour; decides §4.1. | New |
| 1 | `git-worker.js` + parser + console + three-areas panel. **Composed-command palette + drag-to-stage from day one. Tier-1 shell subset + redirect messages (§4.3–4.4).** Single machine. | Palette promoted from carve-out; shell added |
| 2 | Commit graph, pointer chain, scenarios, reset tiers, OPFS persistence. **Assistance dial. Tier-2 shell (pipes, glob), `git cat-file -p`.** | Dial and tier-2 shell added |
| 3 | Cloud save/share (`BundleKind: "git"`), `[↗]` handoff. | Unchanged |
| 4 | **Multi-machine + `origin`, three-lane graph, machine-aware `GitExpect`.** Then `<GitBlock>`, `<GitChallengeCard>` + live checklist. | Multi-machine added ahead of cards, so card grading is machine-aware from its first release |
| 5 | Object inspector, conflict merge view, `rebase` on plumbing. | Unchanged |

Data-model shaping for phase 4 (§3.6) happens in phase 2, when scenarios and
`GitExpect` are first written.

---

## 6. Open questions

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
5. **Does the shell subset get its own `cd` state per machine?** Once §3
   lands, each machine has its own working directory. A shared `cwd` across a
   machine switch would be confusing; a per-machine `cwd` is one more field on
   the machine record. Recommend per-machine.
6. **Conflict authoring.** For a scenario to *reliably* produce a conflict,
   the fixture needs both machines pointed at the same lines. Worth a helper
   in the scenario format rather than leaving it to per-lesson hand-authoring.
