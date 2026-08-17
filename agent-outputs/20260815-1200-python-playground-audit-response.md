# Python Playground audit — response and disposition

Companion to the black-box audit of `/playground/python` (16 findings,
`PY-01`…`PY-16`). This records what was fixed, what was declined and why, and
what turned out not to reproduce — the last two sections matter most for the
remaining playground audits, because several of these findings are properties
of the architecture rather than bugs, and will look identical in every other
language.

**Verification note.** Chromium in the authoring sandbox cannot reach
`cdn.jsdelivr.net`, so Pyodide never boots there and the browser-level checks
could not be run locally. What was verified instead: the worker's Python
scripts were extracted from the source and executed against CPython (streaming
reassembly, whitespace parity, a 5,000-line burst, `input()`, `plt.show()` over
a stub pyplot, traceback filenames); the string-level fixes have unit tests;
and `e2e/python-playground-audit-fixes.spec.ts` covers the browser behaviour
for a machine with CDN access.

---

## Fixed

| ID | Severity | Fix |
|---|---|---|
| PY-01 | Critical | **Stop control.** `LanguageRuntime.cancelRun()` is new and optional; only a runtime that implements it gets a Stop button. Python implements it by terminating the worker and standing a fresh one up in the background, replaying the warm-package hint. The in-flight `run()` rejects with a `RunCancelledError`, which the surface renders as a plain `Run stopped.` under whatever the program had already printed — not as a failure. |
| PY-02 | High | **Streaming output.** Python pushes each output segment to the main thread as it is produced, batched on a 60 ms timer or an 8 KB threshold, whichever comes first. The surface republishes the run's slice at most every 80 ms. Text segments stream *stripped*, so the streamed concatenation is byte-identical to what the old flush-at-the-end path produced. |
| PY-03 | High | **Files the program writes.** The worker snapshots size+mtime of every staged file, then diffs the working directory after each run; new or rewritten files go to the Files panel and OPFS via the existing `collectCreatedFiles` hook (the same one the R playground uses). Capped at 50 files / 64 MB per run. |
| PY-04 | High | **`plt.show()` renders every open figure**, not just `gcf()`. The build-time capture path in `scripts/lib/python-output-capture.mjs` had the same bug and got the same fix, so a lesson's prepopulated panel and a live run agree. |
| PY-05 | High | **`.zip` keeps your filenames.** The archive now also carries `source/<path>` — a readable copy of every editor file under its real name — and `workspace.json` records the id → path mapping. Import reads an allowlist (`meta.json`, `files/`, `db/`, `data/`), so the readable copies don't pollute a restored workspace. |
| PY-06 | High → Medium | **`input()` explains itself.** Not supported (see *Declined*), but `builtins.input` now prints the prompt and raises a playground-specific `RuntimeError` naming two ways forward, instead of `OSError: [Errno 29] I/O error`. |
| PY-07 | Medium | **Readable tracebacks.** User code compiles under its real filename, so frames read `File "main.py"` rather than `File "<string>"`; harness frames (`/lib/python*.zip/_pyodide/…`, `<exec>`) are filtered out before rendering. Chained exceptions keep both halves. A failure with no user frames is shown raw rather than shown empty. |
| PY-08 | Medium | **CORS failures say "CORS".** A urllib3-emscripten timeout/abort gets a plain-language preface naming the missing `Access-Control-Allow-Origin` header and suggesting a CORS-enabled host or an upload. The `requests` entry in the Packages drawer no longer claims network calls are blocked — they work, subject to CORS — and its example now makes a real request. |
| PY-09 | Medium | **Dismissed dialogs stop swallowing clicks.** A closing `.confirm-popup` / `.confirm-backdrop` gets `pointer-events: none` for its exit transition. See *Did not reproduce* for the part of this finding that is an artifact of the audit environment. |
| PY-11 | Low | **"Export code" → "Export current file"**, and the item now says it downloads the open file only. |
| PY-12 | Low | **Mid-run waits are visible.** `RunOptions.onStatus` existed and was wired in `<CodeBlock>` and `<ChallengeCard>` but not in the playground, so "Installing data packages, first run only…" went nowhere. It now renders above the run blocks. |
| PY-14 | High | **Share carries data files.** Code bundles gained `dataFiles` (base64, capped at 4 MB / 50 files); the recipient's copy writes them back into its `data/` store, and they appear in the share landing page's file table. Anything that doesn't fit is named to the sharer at creation time instead of being dropped silently. |
| PY-15 | Low | **Guests are told before they publish.** Revocation genuinely can't work for a guest (see *Declined*), so the dialog now says a guest link stays up for its full TTL and cannot be revoked early, rather than implying otherwise. |
| PY-16 | Low | **Byte counts are bytes.** `utf8ByteLength` replaces `String.length` in the Files panel and in the share manifest. The audit's `−7` on both non-ASCII files is exactly what it predicted. |

## Declined — structural, not defects

**PY-06, `input()` proper.** Supporting it needs `Atomics.wait` on a
`SharedArrayBuffer` to block the worker while the main thread collects a
value, which needs cross-origin isolation (COOP/COEP). Those headers break
third-party embeds and CDN-loaded runtimes across the site, which is a much
larger trade than one builtin is worth. The playground is a
run-to-completion sandbox, not a REPL. **This applies to every playground**:
any "reads from stdin interactively" finding has the same answer.

**PY-15, guest link revocation.** A guest share has no owner row, so there is
nothing for a revoke to authorise against — the `DELETE /api/shares/[id]`
route requires a session by design. Giving guests revocation means minting a
per-link secret and storing it client-side, which is a real feature with real
security surface, not a fix. Signing in gives you managed, revocable links.

**PY-10, run history.** Not a feature this playground offers, and the finding
did not reproduce anyway (below).

**PY-01's interrupt-buffer variant.** `pyodide.setInterruptBuffer` would
preserve interpreter state across a Stop, but it needs the same cross-origin
isolation as `input()`. Terminate-and-respawn costs nothing observable: globals
are already wiped between runs. The trade-off is deliberate, and the same one
any WASM runtime in this codebase should make.

## Did not reproduce

**PY-10 — "each run replaces the last".** Output accumulates by default.
`clearBeforeRun` defaults to `false` for code playgrounds, `runCode` appends
to the file's cell list, and the panel groups by `runId` with `Run 1..N`
incrementing. The chrome the finding calls dishonest is accurate; the audit
session most likely had *Clear Output Before Running* switched on in Settings.
Worth re-checking that setting before filing this against another playground.

**PY-13 — "no rename affordance".** Rename exists in two places: the Files
panel context menu (right-click → Rename) and the tab context menu. Neither is
a *hover* affordance, which is probably why it wasn't found. The naming
complaint underneath it (a new tab is `untitled_2.py`, and that becomes the
module name) is fair but is a product decision, not a defect; left as is.

**PY-09, the focus half.** A dismissed dialog holding focus indefinitely is an
artifact of the audit's own measurement caveat: the tab ran with
`document.visibilityState === "hidden"`, which stops `requestAnimationFrame`,
so Base UI's exit transition never completes and the modal focus trap never
unmounts. In a foreground tab the window is ~180 ms. The click-swallowing
inside that window is real, and is what the CSS fix addresses. **Any
finding derived from focus or animation timing in a hidden tab should be
re-checked in a visible one before filing** — this one was filed against all
four playgrounds.

## Notes for the remaining audits

- `RunOptions.onStatus` now reaches the playground surface. If another
  runtime has mid-run waits it doesn't report, that is a runtime-side gap.
- `cancelRun` is opt-in per runtime. A playground without a Stop button is a
  runtime that hasn't implemented it, and it is worth reporting — the surface
  is ready.
- `collectCreatedFiles` is likewise opt-in; R and Python implement it.
- The `EmitOutput` signature grew `(cell, seq?, append?)`. Runtimes that emit
  whole cells keep working unchanged; only streaming runtimes pass `seq`.
