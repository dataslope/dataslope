# Git Playground — GUI-First Input and Multi-User Repos

**Date:** 2026-08-15
**Status:** Design addendum, no code written yet
**Amends:** `agent-outputs/20260813-1424-git-playground-design.md`
**Scope:** Four proposed changes to the Git playground design — (a) replacing
terminal-only input with a GUI, with the terminal reduced to a command
display, (b) letting the learner switch between two or more users so they
can cause conflicts rather than inherit them, (c) how the terminal handles
the UNIX commands a Git curriculum interleaves with `git` itself, and (d)
dropping persistence entirely in favour of an in-memory filesystem.

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
| **`just-bash` as the shell** | **Adopted — spike run 2026-08-15.** 79 commands, pluggable FS, custom `git` command, complete shell language, Apache-2.0 (§4.1). |
| Hand-rolled ~12-command subset | **Fallback only.** Superseded by the spike result (§4.8). |
| Worker-bundle impact | **None.** It ships as a `public/_workers/` static asset, served by `ASSETS` before the Worker (§4.3). Cost is 431 KiB gz of learner download. |
| WebContainers / v86 / `almostnode` | **No.** COOP/COEP conflict; VM weight; almostnode is ~16 MB (§4.8). |
| **Memory-only — no OPFS, no cloud** | **Adopted.** Git's filesystem is derived state, not authored code (§5.1). Deletes §7.1, §7.2 and §7.3.2 of the original. |
| Share links | **Kept, in better form.** Share the command history, not the filesystem — a URL, not an R2 object (§5.4). |
| `sessionStorage` for command history | **Open.** Buys refresh recovery for a few KB of strings; declinable independently of the filesystem decision (§5.5). |

The single most valuable line in this addendum is §3.3: the collaboration
half of Git is unreachable with one repository, and it is the half where
learners fail in the workplace. The best *cheap* idea is §4.2 — with `cat` in
the terminal, `.git/HEAD` turns the pointer chain from a diagram into a file,
now verified working. The largest strategic consequence is §4.5: the same
runtime supports a command-line course, a gap in the current ~30-course
catalogue. The largest *simplification* is §5: memory-only removes the
design's biggest unproven assumption by deleting it rather than testing it.

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

## 4. The shell problem — resolved by `just-bash`

A terminal that answers `ls` with `command not found` is worse than no
terminal: it advertises a capability and then withdraws it, and the learner
concludes the environment is broken rather than that the command is out of
scope. Real Git work interleaves shell and Git constantly, and every tutorial
on the internet creates its first file with `echo "# Project" > README.md`.

The original recommendation here was a hand-rolled ~12-command POSIX subset,
with `just-bash` flagged as a spike. **The spike was run on 2026-08-15 and
`just-bash` won outright.** Hand-rolling is now the fallback, not the plan.

### 4.1 Spike result

`just-bash@3.3.0` (vercel-labs, **Apache-2.0**) ships a dedicated browser
entry point, `just-bash/browser`, that excludes the `node:fs`-dependent
modules. Measured, not assumed:

| Property | Finding |
| --- | --- |
| Commands | **79** — `ls cat echo printf mkdir rm cp mv ln touch head tail wc grep rg sed awk sort uniq cut tr find xargs diff jq base64 tee stat du tree seq …` |
| Filesystem | **Pluggable.** `new Bash({ fs })` takes an `IFileSystem`; the interface docs name "browser IndexedDB" as an intended backend |
| Custom commands | **Yes.** `defineCommand(name, fn)` + `customCommands: []`, plus a `LazyCommand` variant for code-splitting |
| Shell language | **Complete** (§4.4) |
| Bundle, with isomorphic-git | **431 KiB gz** (1509 KiB raw), minified, single chunk |
| Licence | Apache-2.0 — no commercial restriction |

The heavy dependencies in its `package.json` do **not** reach a browser
bundle: `sql.js`, `quickjs-emscripten`, `undici`, `papaparse`,
`fast-xml-parser`, `file-type` and `seek-bzip` all tree-shake away through the
browser entry. Only `re2js` (the regex engine behind `grep`/`sed`) and
`turndown` (`html-to-markdown`) survive; dropping the latter is a possible
further trim.

### 4.2 The integration: one filesystem, two facades

The decisive question was whether isomorphic-git and `just-bash` can operate
on the *same* filesystem — a shell that cannot see `.git` is useless. They
can. `just-bash`'s `IFileSystem` becomes the single source of truth, and
isomorphic-git gets a thin `node:fs`-promises facade over it:

```
        ┌─────────────────────────────────┐
        │  IFileSystem  (OPFS-backed)     │  ← single source of truth
        └───────┬─────────────────┬───────┘
                │                 │
      native ───┘                 └─── ~40-line node:fs facade
                │                 │
         ┌──────┴──────┐   ┌──────┴───────┐
         │  just-bash  │   │isomorphic-git│
         └─────────────┘   └──────────────┘
```

Verified end to end in the spike — isomorphic-git wrote the repo, `just-bash`
read it:

```
$ cat .git/HEAD
ref: refs/heads/main
$ cat .git/refs/heads/main
65896b7d80d8f24e71bdd807c60794cd405fbad9
$ ls .git
HEAD  config  hooks  index  info  objects  refs
```

Writes flow the other way too: after `echo "second line" >> README.md` and
`mkdir -p src && echo … > src/app.py` in the shell,
`git.statusMatrix()` reported `README.md HEAD=1 WT=2 stage=1` and
`src/app.py HEAD=0 WT=2 stage=0` — the three-areas panel (§4.1 of the
original) updating from shell activity with no extra plumbing.

Registering `git` itself as a custom command works, and composes with
builtins through pipes:

```
$ git init
Initialized empty Git repository in /repo/.git/
$ git commit -m "Initial commit"
[main 68ddea5] Initial commit
$ git log | wc -l
1
```

That last line is the point: a custom command piping into a builtin is
something a Git-only terminal structurally cannot do.

**The facade is where the real work is** — roughly 40 lines, but three details
must be right: `stat`/`lstat` must return `isFile()`/`isDirectory()` as
*methods* (`IFileSystem` returns booleans), thrown errors need `.code` set to
`ENOENT`/`EEXIST` (isomorphic-git branches on it), and `readFile` must return
`Uint8Array` when no encoding is given but a `string` when one is.

### 4.3 Bundle cost, and why the 10 MiB limit is not the constraint

**`just-bash` never enters the Worker.** Per §8.4.1 of the original design the
Git engine lives in a prebuilt module at `public/_workers/git-worker.js`, and
`wrangler.jsonc:13` records that `/_next/static/*` and `public/` are served by
the `ASSETS` binding **before the Worker runs**. Static assets do not count
against the 10 MiB Worker cap. This is the same mechanism that already keeps
Pyodide, DuckDB, PGlite, PHP and .NET out of the bundle — §8.3 verified those
are absent from the Worker entirely.

| Bundle | Raw | GZ |
| --- | ---: | ---: |
| isomorphic-git alone | 256 KiB | **78 KiB** |
| just-bash + isomorphic-git | 1509 KiB | **431 KiB** |
| **Marginal cost of the shell** | | **353 KiB** |

(The 78 KiB confirms the original §8.4.1 estimate of 76 KiB.)

So the cost is **learner download, not Worker headroom** — 431 KiB gz fetched
lazily on first Run, against a page that already ships megabytes of WASM for
every other runtime. For scale: the current Worker headroom after the §8.7
fixes is 2999.59 KiB, so even the naive outcome of accidentally bundling the
whole thing into the Worker would fit. It should still not happen, and the
§8.4.1 rule is what prevents it.

One build note, already solved in this repo: esbuild fails on `just-bash`'s
dead `node:zlib` import unless `node:*` specifiers are stubbed.
`scripts/build-almostnode-workers.mjs:29` already contains exactly that
plugin — `stubNodeBuiltins` — because almostnode pulls `just-bash` in
transitively today. The Git worker reuses it verbatim.

### 4.4 The shell language is complete

Every construct tested passed, which is what separates "a shim that fakes
`ls`" from "a shell you can teach":

| Feature | Verified |
| --- | --- |
| Variables, `$(…)` substitution, `$((…))` arithmetic | ✅ |
| `for`, `while`, `if/else`, `case` | ✅ |
| Functions with positional args | ✅ |
| Arrays (`${arr[1]}`, `${#arr[@]}`) | ✅ |
| Parameter expansion (`${S^^}`, `${#S}`) | ✅ |
| Multi-stage pipes, `&&`/`\|\|`, `$?` | ✅ |
| Heredocs, globs, subshells, `export` | ✅ |
| `sed`, `awk`, `jq`, `xargs` | ✅ |

Error wording is real bash (`bash: git: command not found`), which is a
better outcome than the original §2.3 accepted for isomorphic-git's own
messages.

### 4.5 What this unlocks: a command-line course

The marginal 353 KiB gz is a debatable price for `ls` inside a Git
playground. It is an obviously good price for **a new course vertical**, and
that is the strongest argument for `just-bash` over hand-rolling.

DataSlope has ~30 courses and **none on the command line** — a conspicuous
gap for a data-skills site whose interview tracks include data-engineer,
analytics-engineer, backend-engineer and ML-engineer, every one of which
assumes shell fluency. §4.4 shows the runtime supports a real curriculum:
navigation and file manipulation, pipes and filters, text processing with
`grep`/`sed`/`awk`/`cut`/`sort`/`uniq`, `find` + `xargs`, and scripting with
variables, loops and functions.

Almost all the surrounding machinery would already exist by the time the Git
playground ships: the terminal console (§3.3), the OPFS-backed `IFileSystem`
(§7.1), the bundle codec and share links (§7.2, adding `"bash"` to
`BundleKind` beside `"git"`), the reset tiers (§6.3), and the challenge-card
grammar. A `<BashChallengeCard>` grading on filesystem state and stdout is a
near-clone of `<GitChallengeCard>` grading on repo state.

**Scope discipline:** a Bash course is a separate project and must not expand
the Git playground's phase 1. The claim here is narrower and only about
sequencing — choosing `just-bash` now keeps that option open at no additional
runtime cost, whereas a hand-rolled 12-command subset would have to be thrown
away and rewritten to get there.

### 4.6 Residual risks

1. **Release velocity.** 98 versions published, `3.3.0` released two days
   before this spike. **Pin the exact version** and treat upgrades as
   deliberate, tested changes. This is the main ongoing cost of the
   dependency.
2. **`gzip`/`gunzip`/`zcat` fail in the browser** — the package documents
   this (they need `node:zlib`). Worth noting these are exactly the commands
   someone might reach for on a loose Git object; the answer there is
   `git cat-file -p` via isomorphic-git's `readObject`, which is the correct
   teaching path anyway. Add the three to the redirect list in §4.7.
3. **OPFS under async concurrency is still unproven.** The original §9.2
   already flagged this for isomorphic-git (`async-lock` is one of its
   deps); `just-bash` driving the same `IFileSystem` concurrently makes it
   more pressing, not less. This is now the top open question.
4. **Not built as a teaching tool.** `just-bash` targets AI-agent sandboxes.
   Its command coverage is generous but its *flag* coverage per command is
   unverified — a lesson using an unsupported flag would fail confusingly.
   Mitigation: the supported-command list §9.4 already requires should be
   generated from `getCommandNames()`, and lesson commands should be checked
   in CI the way `scripts/check-*.mjs` already validate code blocks.

### 4.7 Unknown commands are still a product surface

Adopting a 79-command shell shrinks this problem but does not remove it —
`vim`, `nano`, `less`, `sudo`, `npm`, `ssh` and the three zlib commands are
all still absent. Three response classes:

1. **Deliberately absent.** A named redirect to the right affordance:
   `vim isn't available here — click README.md in the working tree to edit it.`
2. **A typo of something supported.** Edit-distance match against
   `getCommandNames()` → `git stauts` → `did you mean: git status?`
3. **Genuinely unknown.** `just-bash`'s own real-bash wording, unmodified.

§9.4 requires publishing the supported command list in the UI; it should be
**generated from `getCommandNames()`** rather than hand-maintained, so it
cannot drift from what the runtime actually accepts.

### 4.8 Options rejected

| Option | Verdict |
| --- | --- |
| **`just-bash`** | **Adopted.** 79 commands, pluggable FS, custom commands, complete shell language, Apache-2.0, 353 KiB gz marginal — all measured. |
| Hand-rolled ~12-command subset | **Fallback only.** Still viable (the §7.1 FS shim is most of it), but delivers a fraction of the coverage, none of the shell language, and forecloses §4.5. |
| **WebContainers** (StackBlitz) | **No.** Requires site-wide COOP/COEP cross-origin isolation, which conflicts with the CDN-import strategy every other runtime depends on (§8.2), plus commercial licensing. |
| **v86 / full Linux VM** | **No.** Multi-megabyte image and a visible boot delay to run `ls`. |
| **`almostnode`** (already a dependency) | **No.** ~16 MB bundled per `build-almostnode-workers.mjs`; it is the JS/TS runtime, and pulling it in for a shell would cost 37× what `just-bash` alone does. |
| No shell; GUI-only file management | **No.** Leaves `ls` failing, which was the original complaint. |

---

## 5. Memory-only: no OPFS, no cloud

**Adopted.** The Git playground runs entirely in `InMemoryFs`. §7.1 (OPFS
shim) and §7.2 (R2 + D1 bundles) of the original design do not apply to it.

### 5.1 Why Git is different from the other playgrounds

The other playgrounds persist because **the artifact is authored code**. A
Python script or a SQL query exists nowhere else; the learner wrote it, and
losing it is losing their writing.

A Git playground's filesystem is **derived state** — a scenario fixture plus
the sequence of commands run against it:

```
repo = f(scenario_id, [command, command, …])
```

The commands are the work product. The filesystem is a projection of them.
Persisting the projection rather than the source is backwards, and it is what
forced every expensive part of §7 — the OPFS shim, the tar-in-bundle format,
and its untrusted-input hardening.

### 5.2 What this deletes

| Original | Status |
| --- | --- |
| §7.1 OPFS `fs` shim | **Deleted.** With it, the async-concurrency risk, the PGlite-style exclusive-lock hazard (`activeWorkspace.ts:386`), and the `copyConflictedWorkspace` class of workaround. |
| §7.2 `BundleKind: "git"`, tar of the FS | **Deleted.** |
| §7.3.2 tar entry-count / per-entry-size caps | **Deleted** — and with it a *new untrusted binary format* the original correctly flagged as a hostile-share DoS surface. |
| Addendum open question 5 (OPFS concurrency) | **Resolved by deletion**, not investigation. |

It also removes the design's single largest unproven assumption at the point
where it was cheapest to remove.

### 5.3 It is a product argument, not only an engineering one

§3.1 of the original states "the refresh loop is the product": after every
command, re-read repo state and re-render both panels. `git status` on a
teaching repo walks every entry under `.git/objects/`; in memory that is
instant, while over OPFS it is hundreds of async directory-handle walks
between the learner's Enter and the dot moving from Working Tree to Index.

The animation in §4.1 — the thing the original calls its highest-value
component — is only convincing if it is immediate. Memory-only is what makes
it so.

The same applies to §6.3's "step back one command" time travel: a structured
clone of an in-memory tree per command, rather than tar bytes written to
OPFS. The reset tiers collapse to `new InMemoryFs()` plus a re-seed.

### 5.4 Share links survive — share the history, not the filesystem

The one genuine loss is §7.2's share feature, which it rightly called "a
great course feature: a stuck learner shares a link reproducing their exact
broken repo."

Keep it by sharing the **command history** instead of the filesystem:

```
/playground/git?scenario=conflict-pending&h=<compressed command list>
```

Replayed on load. This is strictly better than the bundle it replaces —
smaller, inspectable in the address bar, no R2 object, no D1 row, and no
untrusted binary format to harden. It also subsumes the `[↗] Open in
playground` handoff from `<GitBlock>` (§5.2 of the original): hand over the
block's command list, which the block already has.

Two requirements this creates, both worth building in deliberately:

1. **Replay must be deterministic.** Fix the author identity and seed commit
   timestamps (isomorphic-git accepts `author.timestamp` /
   `author.timezoneOffset`) so object SHAs reproduce exactly. **Bonus:**
   deterministic SHAs mean lesson prose can reference `a1b2c3d` and have it
   match what the learner actually sees — impossible with wall-clock commits.
2. **File edits must enter the history.** §3.2 exempts the CodeMirror editor
   from the terminal-only rule, so editor saves happen outside the command
   stream and would otherwise be lost on replay. Serialize each save as a
   heredoc — `cat > README.md <<'EOF' … EOF` — which §4.4 verified the shell
   supports. The history stays a single readable command list rather than a
   command list plus a side-channel of file blobs.

### 5.5 The accepted risk

**Refresh, crash, or tab eviction loses the session.** Mobile Safari discards
background tabs aggressively, so this is not a rare event.

Mitigation, if wanted: persist only the **command history** — a few KB of
strings, not a filesystem — to `sessionStorage`, and offer "restore your
session?" on reload. This is a different decision from the filesystem one and
can be declined independently; the filesystem stays memory-only either way.

Deliberately *not* mitigated: cross-device resume. Course progress is tracked
separately, and a playground session is exploration rather than coursework.

### 5.6 The registry gotcha survives, in a smaller form

`__tests__/workspacesCloud.test.ts:83` asserts that every
`app/playground/<id>` route with a `page.tsx` satisfies `isKnownPlayground`.
Its comment records the reason: *"a route missing from the lists ships with
broken sharing (this is exactly how the web playground regressed)."*

The test models two categories, code and SQL, and treats absence as a bug.
A **deliberately ephemeral** playground is a third category it does not
model, so `app/playground/git/page.tsx` fails this test on arrival even
though nothing is wrong.

Register it explicitly rather than leaving it out — an `EPHEMERAL_PLAYGROUND_IDS`
list that `isKnownPlayground` consults, with `bundleKindForPlayground`
rejecting those ids outright. Then the save/share endpoints refuse git for a
stated reason instead of by omission, and the intent is recorded where the
next person will look. §7.3.1 of the original anticipated four edits to this
file for a persisted git playground; this is a smaller version of the same
change, not an escape from it.
---

## 6. Revised phasing

| Phase | Contents | Change from original |
| --- | --- | --- |
| 0 | ~~`just-bash` spike~~ — **done 2026-08-15, §4.** Adopted. ~~OPFS concurrency check~~ — **moot under §5.** No blocking prerequisites remain. | Spike complete; OPFS risk deleted |
| 1 | `git-worker.js` (just-bash + isomorphic-git, node-builtins stubbed) + `git` as a custom command + console + three-areas panel. **Composed-command palette + drag-to-stage from day one. Generated command list + redirect messages (§4.7).** Single machine. | Palette promoted from carve-out; shell is now a dependency, not a build |
| 2 | Commit graph, pointer chain, scenarios, reset tiers, OPFS persistence. **Assistance dial, `git cat-file -p`, CI check that lesson commands exist in `getCommandNames()` (§4.6.4).** | Dial and lesson-command linting added |
| 3 | **Command-history share links + `[↗]` handoff (§5.4)**, deterministic replay, editor saves serialized as heredocs. | Replaces the cloud-bundle phase entirely — no R2, no D1, no tar |
| 4 | **Multi-machine + `origin`, three-lane graph, machine-aware `GitExpect`.** Then `<GitBlock>`, `<GitChallengeCard>` + live checklist. | Multi-machine added ahead of cards, so card grading is machine-aware from its first release |
| 5 | Object inspector, conflict merge view, `rebase` on plumbing. | Unchanged |

Data-model shaping for phase 4 (§3.6) happens in phase 2, when scenarios and
`GitExpect` are first written.

---

## 7. Open questions

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
5. ~~**OPFS-backed `IFileSystem` under async concurrency.**~~ **Closed by
   §5** — there is no OPFS backend. Recorded here because it was the top
   risk in the previous revision and its removal, not its resolution, is
   what changed.
6. **Flag coverage per command.** `getCommandNames()` proves a command
   exists, not that `ls -lh` or `sort -rn` parse. Worth enumerating the flags
   the curriculum actually uses and testing them in one pass (§4.6.4).
7. **Does the shell subset get its own `cd` state per machine?** Once §3
   lands, each machine has its own working directory. A shared `cwd` across a
   machine switch would be confusing; a per-machine `cwd` is one more field on
   the machine record. Recommend per-machine.
8. **Does the command history persist to `sessionStorage`?** (§5.5) The
   filesystem decision is settled; this one is not, and can go either way
   without affecting anything else.
9. **How large can a shared history URL get before it needs shortening?** A
   40-command session compresses to a few hundred bytes, but a long
   exploration plus heredoc'd file contents could exceed practical URL
   limits. Decide the fallback (truncate, or a short-link row) in phase 3.
10. **Conflict authoring.** For a scenario to *reliably* produce a conflict,
   the fixture needs both machines pointed at the same lines. Worth a helper
   in the scenario format rather than leaving it to per-lesson hand-authoring.

---

## Appendix A — the node:fs facade (verified working)

The bridge from `just-bash`'s `IFileSystem` to what isomorphic-git expects.
Reproduced from the 2026-08-15 spike, which drove `git init` / `add` /
`commit` / `log` / `statusMatrix` through it successfully.

```js
const err = (code, msg) => Object.assign(new Error(`${code}: ${msg}`), { code });

// IFileSystem returns booleans; isomorphic-git calls methods.
const toStat = (s) => ({
  isFile: () => s.isFile,
  isDirectory: () => s.isDirectory,
  isSymbolicLink: () => s.isSymbolicLink,
  mode: s.mode, size: s.size,
  mtimeMs: s.mtime.getTime(), ctimeMs: s.mtime.getTime(),
  uid: 1, gid: 1, dev: 1, ino: s.ino ?? 1,
});

// isomorphic-git branches on err.code, so map messages onto errno strings.
const wrap = (fn) => async (...args) => {
  try { return await fn(...args); }
  catch (e) {
    if (e.code) throw e;
    const m = String(e.message || "");
    if (/no such file|not found|ENOENT/i.test(m)) throw err("ENOENT", m);
    if (/exists|EEXIST/i.test(m)) throw err("EEXIST", m);
    throw e;
  }
};

export const makeNodeFacade = (jbfs) => ({
  promises: {
    // Bytes with no encoding, string with one — isomorphic-git relies on both.
    readFile: wrap(async (p, opts) => {
      const enc = typeof opts === "string" ? opts : opts?.encoding;
      const buf = await jbfs.readFileBuffer(p);
      return enc && enc !== "binary" ? new TextDecoder().decode(buf) : buf;
    }),
    writeFile: wrap(async (p, d) =>
      void await jbfs.writeFile(p, typeof d === "string" ? d : new Uint8Array(d))),
    unlink:   wrap(async (p) => void await jbfs.rm(p, {})),
    readdir:  wrap((p) => jbfs.readdir(p)),
    mkdir:    wrap(async (p) => void await jbfs.mkdir(p, {})),
    rmdir:    wrap(async (p) => void await jbfs.rm(p, { recursive: true })),
    stat:     wrap(async (p) => toStat(await jbfs.stat(p))),
    lstat:    wrap(async (p) => toStat(await jbfs.lstat(p))),
    readlink: wrap((p) => jbfs.readlink(p)),
    symlink:  wrap(async (t, p) => void await jbfs.symlink(t, p)),
  },
});
```

In production `jbfs` is the OPFS-backed `IFileSystem` from §7.1 rather than
`InMemoryFs`, which is what open question 5 exists to de-risk.

**Registering `git`:** `defineCommand(name, async (args, ctx) => ({ stdout,
stderr, exitCode }))` — note the positional signature, not an options object —
passed via `new Bash({ fs, cwd, customCommands: [gitCmd] })`. A `LazyCommand`
variant (`{ name, load }`) exists if the Git half should code-split away from
the shell half.

