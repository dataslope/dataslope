# Bash & Git playgrounds: the September 2026 audit, fixed

**Date:** 2026-09-04
**Input:** the black-box audit of `/playground/bash` and `/playground/git` (findings BG-01 to BG-27) and its engineering handoff.
**Scope:** every finding except the three that live in the engine or the site rather than the playgrounds (listed at the end).

## What was wrong, in one paragraph each

**BG-01, the critical Bash bug.** `ShellSession` in `app/_components/git/runCommand.ts` kept functions alive between commands by remembering the whole line a function was defined on and prepending it to every later command. `greet(){ …; }; greet a` therefore re-ran `greet a` before every subsequent command, and a `>>` on the same line appended a line to its file forever. It now parses each line with just-bash's own parser (`bash.transform()`), extracts the `FunctionDef` nodes and the `alias` / `unalias` / `unset` commands, prints each definition back to canonical source through a transform plugin, and remembers only those. Aliases work (`shopt -s expand_aliases` heads the prelude), `unset -f` and `unalias` forget, and definitions inside an `if` that did not run are not kept.

**BG-02, the critical Git bug.** `stagedBlob()` returned the *working file* as the "old" side of an unstaged diff whenever the index matched HEAD, so `git diff` marked nothing. The index is now read through `git.walk` with the `STAGE()` walker, path to object id, and every comparison reads blobs by id. The diff itself is a real line diff (LCS with three lines of context, proper hunk headers, `\ No newline at end of file`), so the seed's `git diff` prints `@@ -1,3 +1,5 @@` with two `+` lines. Note the handoff's regression line expected `-1,4 +1,5` and one `+` line; the README the seed edits is three lines and the edit adds two, so real git prints what this now prints.

**BG-03 / BG-04 / BG-08.** `git status` classified anything staged as `A`; it now derives X and Y from the (HEAD, index, working tree) triple the way `git status --short` does (`M `, `A `, `AM`, `MM`, `D `, ` D`, `??`, `UU`). `reset --hard <rev>` resolved its target through isomorphic-git's `resolveRef` fallback chain (hence `origin/HEAD~1`) after already moving HEAD; a shared `resolveRevision()` (HEAD, `@`, branches, tags with peeling, full and short shas, `~n`, `^`, `^n`, `rev:path`) now runs first and nothing moves on failure. `--soft` and `--mixed` are implemented.

**BG-09 / BG-10 / BG-11 / BG-18.** Every command declares the options it takes (`parseOpts`); anything else is `error: unknown option '--x'` plus a usage line, and `git <cmd> --help` prints that line. Implemented on top of that: commit-to-commit diff (`a b`, `a..b`, single rev), `-p` / `--stat` / `--name-only` / `--name-status` on `show`, `log` and `diff`, `-n` / `--max-count` / `-N`, `--all`, ranges, path filters, `--format` / `--pretty` (the common placeholders and named formats), a small `--graph`, clustered short flags (`-am`), `commit -a`, state-aware nothing-to-commit text, `tag -d` / `-l` / `-a -m`, `branch -m` / `-M` / `--show-current`, detached `checkout <rev>` with git's note, `checkout -- <paths>`, `switch -` / `checkout -`, `restore --source`, `rm --cached`, `git config user.name` (written into `.git/config`), insertion and deletion counts, `Updating a..b` on fast-forward, `Already on`, `merge: x - not something we can merge`, `HEAD detached at <sha>`, git's own date format, and backend errors stripped of isomorphic-git's `(Hint: use 'force: true')` text. `git init` from a subdirectory refuses rather than reinitialising the root.

**BG-14.** Conflict markers are written by a merge driver that labels the first side `HEAD`; a conflicted path is `UU`, `git status` says "All conflicts fixed but you are still merging." once it is added, and the CHANGES panel shows it in the working directory as "1 to resolve", never in the staging area as "ready".

**BG-05 / BG-21.** The palette's inner classes are `gitx-palette-*` with rules in `gitPanels.css` (shared with the Bash palette). The dialog has `aria-modal`, takes focus, closes on Escape and on its Close button, and the click-eating backdrop exists only while it is open. `__tests__/gitPaletteStyles.test.ts` fails the build if a palette class ever loses its rule again.

**BG-06.** Reset and a scenario change ask first when there is work to lose, with the same `confirm-*` dialog the editor playgrounds use. In Git the session being left is shelved and Undo brings it back (replaying its steps onto its scenario), so "Undo disabled afterwards" is gone.

**BG-07.** Before running a line, `ShellSession.run` parses it alone; an EOF-type parse error, a trailing `|` / `&&` / `\`, or an unterminated heredoc comes back as `incomplete`. Both terminals then show bash's `>` prompt, accumulate lines, and run the whole command when it is complete; Ctrl-C echoes `^C` and drops it. A real syntax error is worded as bash words it (`syntax error near unexpected token 'fi'`), with no parser line numbers.

**BG-12.** `GitTerminal` places the caret at the end of any value that arrives from the host, and `focus({ select })` selects a range; the Git playground selects the message inside `-m "…"` on commit chips so the first keystroke replaces it.

**BG-13.** The file editor saves on blur and on "← Changes"; Ctrl+S and the Save button remain.

**BG-15 / BG-16 / BG-27.** Aliases (above); a note when a command would read stdin (`cat > file`, `read`); stderr from a successful command rendered in its own tone rather than as stdout; the command cap raised (250,000 commands, 100,000 loop iterations, a 20 s wall-clock budget) and its message reworded without option names; `$USER`, `$SHELL`, `$LOGNAME`, `$TERM`, `$LANG` set; echoed commands keep their spaces (`white-space: pre-wrap`).

**BG-17.** The Bash playground has an on-ramp: a scenario picker (five scenarios, each with "Try this" steps), a strip of step chips that tick as they run (in any terminal), an "All commands" palette of coreutils grouped by purpose, and an "About this shell" dialog listing what is installed, what is not, and the stdin / continuation / persistence notes. The strip collapses and remembers it.

**BG-19.** Both playgrounds keep the session in `sessionStorage` (this tab only) and replay it on reload: Git replays its steps on the saved scenario; Bash restores the layout, the panes, and each pane's command history.

**BG-20, BG-22, BG-23, BG-24, BG-25, BG-26.** Enter creates the new file; the commit card clears when its commit is gone and shows git's date format; prompt, command and error colours moved to the brand ramp's ink steps (green 800, red 700, amber 800; the 400s in dark mode) and a test pins them at 4.5:1; the graph rows have accessible names and the Changes/History strip is a tablist; phone targets are 40px, chips scroll in one row, the input carries `enterkeyhint="go"`; a line typed while a command runs is queued and runs next; the layout preference is read after hydration.

## Tests

- `__tests__/shellSession.test.ts`: the BG-01 regressions from the handoff (`f(){ :; }; echo X >> t` then `wc -l t` prints `1 t`; nothing after `g(){ :; }; echo ONCE` prints ONCE), aliases, `unset`, stdin note, limits wording, every continuation case.
- `__tests__/gitAudit.test.ts`: BG-02 to BG-11, BG-14, BG-18, one block per finding.
- `__tests__/gitPaletteStyles.test.ts`: every palette and on-ramp class has a rule; terminal colours clear AA.
- `e2e/bash-git-playground-audit-fixes.spec.ts` (opt-in, like the other playground specs): the same in a browser, plus a 375px pass.

## Not fixed, and why

- **stderr ordering (BG-15).** just-bash's `exec()` returns stdout and stderr as two strings; there is no per-chunk callback, so `echo err >&2; echo out` cannot be shown in emission order. Each stream is at least coloured by descriptor now.
- **`ls -la` trailing `/` and synthetic dates (BG-27).** just-bash's `ls`.
- **Console preload warnings and dark mode (BG-27).** Site-wide, outside the playgrounds.
- **`git log --graph`** draws the shapes a lesson uses (a branch that diverges and merges back); the History panel remains the general case.
