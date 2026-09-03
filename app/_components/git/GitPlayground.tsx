"use client";

/**
 * The Git playground shell.
 *
 * Reuses the language playgrounds' chrome (`.playground-root` / `-app` /
 * `-header` from playground.css) so the header and tokens match the rest of
 * the site. The body is its own: two panes over a terminal strip, which is
 * what the tools beginners learn Git from converge on. The graph and the
 * three areas are the hero; the terminal is how you poke them.
 *
 * Three rules carry over from the design and do not bend here:
 *
 * - **The terminal is the only mutator.** Every chip, card and menu item
 *   composes a command into the prompt; the reader presses Enter. The
 *   grading and the transcript depend on that.
 * - **Memory-only.** Nothing is saved. The command history is the work
 *   product, which is also what makes Undo cheap: reset and replay it minus
 *   the last step.
 * - **Editing a file is not Git.** The editor writes to the working
 *   directory and is exempt from the rule above; a save is recorded as a
 *   step so Undo can replay it.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@base-ui/react/select";
import {
  Check,
  ChevronDown,
  Code2,
  Files,
  GitBranch,
  History as HistoryIcon,
  LayoutList,
  Plus,
  RotateCcw,
  Terminal as TerminalIcon,
  Undo2,
  X,
} from "lucide-react";
import Link from "../Link";
import { PLAYGROUNDS } from "../playgrounds";
import { useIsFramed } from "../useIsFramed";
import { LANGUAGE_ICONS, LANGUAGE_ICON_SIZE_FACTOR } from "../languageIcons";
import { PlaygroundBootOverlay, useBootOverlayVisibility } from "../PlaygroundBootOverlay";
import { applyThemePalette, getStoredEditorTheme, applyMode } from "../playgroundTheme";
import { useGitSession } from "./gitRuntime";
import { GitTerminal, type GitTerminalHandle, type TranscriptEntry } from "./GitTerminal";
import { CommitGraph } from "./CommitGraph";
import { CommandPalette } from "./CommandPalette";
import { AreasBoxes, placeFiles } from "./AreasBoxes";
import { FileEditor } from "./FileEditor";
import { makePathCompleter } from "./pathCompleter";
import { changedFiles, isConflicted, narrate, stagedFiles, stepDone, suggest, unstagedFiles } from "./repoFacts";
import { SCENARIOS, DEFAULT_SCENARIO, scenarioById } from "./scenarios";
import { SESSION_ROOTS, type FileStatus, type RepoState } from "./protocol";
import "../playground.css";
import "./gitPlayground.css";

const SHELL_COMMANDS = [
  "git", "ls", "cat", "cd", "pwd", "echo", "printf", "mkdir", "rm", "cp", "mv",
  "touch", "head", "tail", "wc", "grep", "find", "diff", "sort", "uniq", "clear",
];
const GIT_SUBCOMMANDS = [
  "init", "status", "add", "commit", "log", "diff", "branch", "checkout", "switch",
  "merge", "reset", "restore", "rm", "show", "tag", "cat-file", "help",
];

/** One thing the reader did, in the order they did it. Undo replays all but
 *  the last onto a fresh scenario. */
type Step = { kind: "command"; command: string } | { kind: "write"; path: string; content: string };
type Pane = "changes" | "history";
type Snap = "peek" | "half" | "full";

const ROOT = SESSION_ROOTS.git;
const PREFS = { internals: "git_playground_internals", consoleH: "git_playground_console_h" };
const fileKey = (f: FileStatus) => `${f.path}:${f.head}${f.workdir}${f.stage}`;

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
}

function readPref<T>(key: string, fallback: T, parse: (raw: string) => T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : parse(raw);
  } catch {
    return fallback;
  }
}

function writePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode; the preference lasts the session */
  }
}

/** One line under the prompt, in the reader's words, always current. */
function statusLine(state: RepoState): string {
  if (!state.initialized) return "No repository yet";
  const where = state.head.detached
    ? `detached at ${state.head.oid?.slice(0, 7) ?? "?"}`
    : `on ${state.head.branch ?? "main"}`;
  const commits = `${state.commits.length} commit${state.commits.length === 1 ? "" : "s"}`;
  if (state.merging) {
    const conflicts = state.files.filter((f) => isConflicted(f, state.merging)).length;
    return `${where} · merging ${state.merging} · ${conflicts ? `${conflicts} conflict${conflicts === 1 ? "" : "s"} to resolve` : "conflicts resolved, ready to commit"}`;
  }
  const staged = stagedFiles(state).length;
  const unstaged = unstagedFiles(state).length;
  const work =
    staged || unstaged
      ? [staged ? `${staged} staged` : "", unstaged ? `${unstaged} not staged` : ""].filter(Boolean).join(", ")
      : "working directory clean";
  return `${where} · ${commits} · ${work}`;
}

export default function GitPlayground() {
  const router = useRouter();
  const embedded = useIsFramed();
  const mobile = useMediaQuery("(max-width: 860px)");
  const [scenario, setScenario] = useState(DEFAULT_SCENARIO);
  const { state, ready, error, exec, reset, readFile, writeFile } = useGitSession(scenario, "playground");

  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [busy, setBusy] = useState(false);
  const [narration, setNarration] = useState<string | null>(null);
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const [internals, setInternals] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [newFile, setNewFile] = useState<string | null>(null);
  const [pane, setPane] = useState<Pane>("changes");
  const [snap, setSnap] = useState<Snap>("half");
  const [consoleH, setConsoleH] = useState(300);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [tryDismissed, setTryDismissed] = useState(false);

  const entryId = useRef(0);
  const promptAt = useRef(new Map<number, string>());
  const cwdRef = useRef(ROOT);
  const prevState = useRef<RepoState | null>(null);
  const previousFiles = useRef<Map<string, string>>(new Map());
  const replaying = useRef(false);
  const termRef = useRef<GitTerminalHandle>(null);
  const drag = useRef<{ y: number; h: number } | null>(null);

  const overlay = useBootOverlayVisibility(ready || Boolean(error));
  const scenarioDef = scenarioById(scenario);

  // The shared editor theme, and the same default as every other playground.
  // Preferences are read here rather than in a lazy initializer so the server
  // and the first client render agree; the same arrangement Playground.tsx
  // uses for its own stored settings.
  useEffect(() => {
    const theme = getStoredEditorTheme() ?? "github-light";
    applyThemePalette(theme);
    applyMode(theme);
    /* eslint-disable react-hooks/set-state-in-effect -- one-time read of stored preferences after hydration */
    setInternals(readPref(PREFS.internals, false, (r) => r === "1"));
    setConsoleH(readPref(PREFS.consoleH, 300, (r) => Math.max(160, Number(r) || 300)));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Ring the chips the last command actually moved, briefly.
  useEffect(() => {
    const next = new Map(state.files.map((f) => [f.path, fileKey(f)]));
    const moved = new Set<string>();
    for (const [path, key] of next) if (previousFiles.current.get(path) !== key) moved.add(path);
    if (previousFiles.current.size > 0) setChanged(moved);
    previousFiles.current = next;
    if (moved.size) {
      const timer = setTimeout(() => setChanged(new Set()), 1400);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [state.files]);

  // One sentence about what just happened, derived from the state diff.
  // The diff starts from the first *ready* state, not from the empty one the
  // page mounts with, or every load would announce a repository being made.
  useEffect(() => {
    if (!ready) {
      prevState.current = null;
      return;
    }
    const prev = prevState.current;
    prevState.current = state;
    if (!prev || replaying.current) return;
    const line = narrate(prev, state);
    if (line) setNarration(line);
  }, [state, ready]);

  const append = useCallback(
    (command: string, result: { stdout: string; stderr: string; exitCode: number }, at: string) => {
      const id = (entryId.current += 1);
      promptAt.current.set(id, at);
      setTranscript((t) => [...t, { id, command, ...result }]);
    },
    [],
  );

  const runOne = useCallback(
    async (command: string) => {
      const at = cwdRef.current;
      try {
        const result = await exec(command);
        cwdRef.current = result.cwd;
        append(command, result, at);
      } catch (e) {
        append(command, { stdout: "", stderr: `${(e as Error).message}\n`, exitCode: 1 }, at);
      }
    },
    [append, exec],
  );

  const run = useCallback(
    async (command: string) => {
      if (command === "clear") {
        setTranscript([]);
        setInput("");
        setHistory((h) => [...h, command]);
        return;
      }
      if (command === "") {
        const id = (entryId.current += 1);
        promptAt.current.set(id, cwdRef.current);
        setTranscript((t) => [...t, { id, command: "", stdout: "", stderr: "", exitCode: 0 }]);
        setInput("");
        return;
      }
      setBusy(true);
      setInput("");
      setHistory((h) => [...h, command]);
      setSteps((s) => [...s, { kind: "command", command }]);
      try {
        await runOne(command);
      } finally {
        setBusy(false);
      }
    },
    [runOne],
  );

  const clearSession = useCallback(() => {
    setTranscript([]);
    setInput("");
    setHistory([]);
    setSteps([]);
    setNarration(null);
    setEditing(null);
    setNewFile(null);
    setTryDismissed(false);
    promptAt.current = new Map();
    previousFiles.current = new Map();
    prevState.current = null;
    cwdRef.current = ROOT;
  }, []);

  const handleReset = useCallback(
    async (next: string) => {
      setBusy(true);
      clearSession();
      try {
        if (next === scenario) await reset();
        else setScenario(next);
      } finally {
        setBusy(false);
      }
    },
    [clearSession, reset, scenario],
  );

  /** Reset, then replay every step but the last. Exact, because the scenario
   *  is itself a replayed script and the session is memory-only. */
  const undo = useCallback(async () => {
    if (!steps.length || busy) return;
    const keep = steps.slice(0, -1);
    setBusy(true);
    replaying.current = true;
    setTranscript([]);
    setInput("");
    setEditing(null);
    setSteps(keep);
    setHistory(keep.filter((s) => s.kind === "command").map((s) => (s as { command: string }).command));
    promptAt.current = new Map();
    cwdRef.current = ROOT;
    try {
      await reset();
      for (const step of keep) {
        if (step.kind === "command") await runOne(step.command);
        else await writeFile(step.path, step.content);
      }
      // Let the last replayed state commit before narration resumes, so the
      // replay itself does not narrate.
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const last = steps[steps.length - 1];
      setNarration(
        last.kind === "command" ? `Undid: ${last.command}` : `Undid the edit to ${last.path}.`,
      );
    } finally {
      replaying.current = false;
      setBusy(false);
    }
  }, [busy, reset, runOne, steps, writeFile]);

  /** A chip, a card or a menu item composes into the prompt; nothing runs. */
  const compose = useCallback(
    (command: string) => {
      setInput(command);
      setPaletteOpen(false);
      if (mobile && snap === "peek") setSnap("half");
      requestAnimationFrame(() => termRef.current?.focus());
    },
    [mobile, snap],
  );

  const write = useCallback(({ echo, text }: { echo: string | null; text: string }) => {
    const id = (entryId.current += 1);
    if (echo !== null) promptAt.current.set(id, cwdRef.current);
    setTranscript((t) => [
      ...t,
      { id, command: echo ?? "", stdout: text, stderr: "", exitCode: 0, note: echo === null },
    ]);
  }, []);

  const onSaved = useCallback((path: string, content: string) => {
    setSteps((s) => [...s, { kind: "write", path, content }]);
    void exec("true");
  }, [exec]);

  const createFile = useCallback(
    async (name: string) => {
      const clean = name.replace(/^\/+/, "").trim();
      if (!clean) return;
      const result = await writeFile(clean, "");
      if (result.exitCode === 0) {
        setSteps((s) => [...s, { kind: "write", path: clean, content: "" }]);
        setNewFile(null);
        setEditing(clean);
        void exec("true");
      }
    },
    [exec, writeFile],
  );

  const toggleInternals = useCallback(() => {
    setInternals((v) => {
      writePref(PREFS.internals, v ? "0" : "1");
      return !v;
    });
  }, []);

  // The handle between the panes and the console: drag to resize on a
  // desktop, drag or tap to move between snap points on a phone.
  const onHandleDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y: e.clientY, h: consoleH };
  };
  const onHandleMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag.current || mobile) return;
    const h = Math.max(160, Math.min(window.innerHeight * 0.8, drag.current.h + (drag.current.y - e.clientY)));
    setConsoleH(h);
  };
  const onHandleUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const dy = d.y - e.clientY;
    if (mobile) {
      if (dy > 40) setSnap((s) => (s === "peek" ? "half" : "full"));
      else if (dy < -40) setSnap((s) => (s === "full" ? "half" : "peek"));
      else if (Math.abs(dy) < 8) setSnap((s) => (s === "peek" ? "half" : s === "half" ? "full" : "peek"));
    } else {
      writePref(PREFS.consoleH, String(Math.round(consoleH)));
    }
  };
  const onHandleKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const up = e.key === "ArrowUp";
    if (mobile) setSnap((s) => (up ? (s === "peek" ? "half" : "full") : s === "full" ? "half" : "peek"));
    else setConsoleH((h) => Math.max(160, Math.min(window.innerHeight * 0.8, h + (up ? 40 : -40))));
  };

  const completions = useMemo(
    () => [...new Set([...SHELL_COMMANDS, ...state.branches])],
    [state.branches],
  );
  const subcommands = useMemo(
    () => ({ git: [...GIT_SUBCOMMANDS, ...state.branches] }),
    [state.branches],
  );
  const pathCompletions = useMemo(
    () => makePathCompleter(state.tree, state.dirs, state.cwd, ROOT),
    [state.tree, state.dirs, state.cwd],
  );

  const suggestions = useMemo(() => suggest(state), [state]);
  const uncommitted = changedFiles(state).length;
  const conflicted = state.files.find((f) => isConflicted(f, state.merging)) ?? null;
  const tryThis = scenarioDef.tryThis;
  const tryDone = tryThis.map((s) => stepDone(s, history));
  const showTry = !tryDismissed && tryThis.length > 0 && tryDone.some((d) => !d) && !state.merging;
  const editingWord = editing
    ? placeFiles(state.files, state.merging).find((c) => c.path === editing)?.word ?? ""
    : "";
  const disabled = busy || !ready;

  const branchChip = !state.initialized
    ? "no repository"
    : state.head.detached
      ? `detached at ${state.head.oid?.slice(0, 7) ?? "?"}`
      : state.head.branch ?? "main";

  return (
    <div className="playground-root">
      {overlay.mounted && (
        <PlaygroundBootOverlay
          title="Git"
          statusMessage={error ?? "Starting the Git runtime…"}
          fraction={ready ? 1 : 0.6}
          error={Boolean(error)}
          className={overlay.fading ? "hidden" : ""}
        />
      )}

      <div className="playground-app">
        <header className="playground-header">
          <div className="logo">
            {!embedded && (
              <Link href="/" aria-label="Dataslope home" className="ds-logo-hover">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/dataslope-logo-blue.svg" alt="Dataslope logo" className="brand-logo ds-logo-mark" />
              </Link>
            )}
            {!embedded && (
              <Select.Root
                value="git"
                onValueChange={(value) => {
                  const next = PLAYGROUNDS.find((p) => p.id === value);
                  if (next && next.id !== "git") router.push(next.href);
                }}
              >
                <Select.Trigger className="playground-switcher" aria-label="Switch playground">
                  {(() => {
                    const Icon = LANGUAGE_ICONS.git;
                    const factor = LANGUAGE_ICON_SIZE_FACTOR.git ?? 1;
                    return Icon ? (
                      <span className="playground-switcher-lang-icon" style={{ color: "var(--text)" }} aria-hidden="true">
                        <Icon size={Math.round(16 * factor)} />
                      </span>
                    ) : null;
                  })()}
                  <Select.Value className="playground-switcher-label">Git</Select.Value>
                  <Select.Icon className="playground-switcher-icon">
                    <svg viewBox="0 0 12 12" width={10} height={10}>
                      <polyline points="2,4 6,8 10,4" fill="none" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner className="playground-lang-switcher-positioner" sideOffset={6}>
                    <Select.Popup className="bui-select-popup playground-lang-switcher-popup">
                      {PLAYGROUNDS.map((p) => {
                        const Icon = LANGUAGE_ICONS[p.id];
                        const factor = LANGUAGE_ICON_SIZE_FACTOR[p.id] ?? 1;
                        return (
                          <Select.Item key={p.id} value={p.id} className="bui-select-item">
                            {Icon && (
                              <span className="bui-select-item-icon" aria-hidden="true">
                                <Icon size={Math.round(14 * factor)} />
                              </span>
                            )}
                            <Select.ItemText>{p.label}</Select.ItemText>
                          </Select.Item>
                        );
                      })}
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
            )}
          </div>

          <div className="header-sep" />

          <Select.Root value={scenario} onValueChange={(v) => v && void handleReset(v)}>
            <Select.Trigger className="gitx-btn gitx-scenario" aria-label="Scenario" disabled={busy}>
              <LayoutList size={14} aria-hidden="true" />
              <Select.Value className="gitx-scenario-label">{scenarioDef.label}</Select.Value>
              <ChevronDown size={12} aria-hidden="true" />
            </Select.Trigger>
            <Select.Portal>
              <Select.Positioner className="playground-lang-switcher-positioner" sideOffset={6} align="end">
                <Select.Popup className="bui-select-popup playground-lang-switcher-popup gitx-scenario-popup">
                  {SCENARIOS.map((s) => (
                    <Select.Item key={s.id} value={s.id} className="bui-select-item gitx-scenario-item">
                      <span className="gitx-scenario-text">
                        <Select.ItemText>{s.label}</Select.ItemText>
                        <span className="gitx-scenario-desc">{s.description}</span>
                      </span>
                    </Select.Item>
                  ))}
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select.Root>

          <span className={`gitx-branch${state.head.detached ? " detached" : ""}`} title="Current branch">
            <GitBranch size={13} aria-hidden="true" />
            <span>{branchChip}</span>
          </span>

          <button
            type="button"
            className="gitx-btn"
            onClick={() => void undo()}
            disabled={disabled || steps.length === 0}
            title={steps.length ? "Undo the last thing you did" : "Nothing to undo yet"}
            aria-label="Undo"
          >
            <Undo2 size={14} aria-hidden="true" />
            <span className="gitx-btn-label">Undo</span>
          </button>
          <button
            type="button"
            className="gitx-btn"
            onClick={() => void handleReset(scenario)}
            disabled={disabled}
            title="Start this scenario over. Nothing here is saved."
            aria-label="Reset"
          >
            <RotateCcw size={14} aria-hidden="true" />
            <span className="gitx-btn-label">Reset</span>
          </button>
        </header>

        <h1 className="playground-sr-title">Git Playground</h1>

        <div className="playground-body gitx-body" style={{ "--gitx-console-h": `${consoleH}px` } as React.CSSProperties}>
          <div className="gitx-stage" data-pane={pane}>
            <nav className="gitx-seg" aria-label="Pane">
              <button type="button" className={pane === "changes" ? "gitx-seg-btn active" : "gitx-seg-btn"} onClick={() => setPane("changes")} aria-current={pane === "changes"}>
                <Files size={14} aria-hidden="true" /> Changes
              </button>
              <button type="button" className={pane === "history" ? "gitx-seg-btn active" : "gitx-seg-btn"} onClick={() => setPane("history")} aria-current={pane === "history"}>
                <HistoryIcon size={14} aria-hidden="true" /> History
              </button>
            </nav>

            <section className="gitx-pane gitx-changes" aria-label="Changes">
              <header className="gitx-pane-head">
                <span className="pane-label">
                  <Files size={12} aria-hidden="true" />
                  Changes
                </span>
                <span className="gitx-pane-sep" />
                <button type="button" className="gitx-btn quiet small" onClick={() => setNewFile("")} disabled={disabled || newFile !== null}>
                  <Plus size={13} aria-hidden="true" />
                  <span>New file</span>
                </button>
                <button
                  type="button"
                  className={`gitx-btn quiet small${internals ? " on" : ""}`}
                  onClick={toggleInternals}
                  aria-pressed={internals}
                  title="Use the names Git itself uses, and show where HEAD points"
                >
                  <Code2 size={13} aria-hidden="true" />
                  <span>Git&apos;s names</span>
                </button>
              </header>

              <div className="gitx-pane-body">
                {newFile !== null && (
                  <form
                    className="gitx-newfile"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void createFile(newFile);
                    }}
                  >
                    <input
                      className="gitx-newfile-input"
                      value={newFile}
                      onChange={(e) => setNewFile(e.target.value)}
                      placeholder="notes.txt"
                      aria-label="New file name"
                      autoFocus
                      spellCheck={false}
                    />
                    <button type="submit" className="gitx-btn primary small" disabled={!newFile.trim()}>
                      Create
                    </button>
                    <button type="button" className="gitx-btn quiet small" onClick={() => setNewFile(null)} aria-label="Cancel">
                      <X size={14} aria-hidden="true" />
                    </button>
                  </form>
                )}

                {editing ? (
                  <FileEditor
                    path={editing}
                    word={editingWord}
                    merging={state.merging}
                    busy={busy}
                    readFile={readFile}
                    writeFile={writeFile}
                    onSaved={onSaved}
                    onClose={() => setEditing(null)}
                  />
                ) : (
                  <>
                    {state.merging && (
                      <div className="gitx-banner" role="status">
                        <strong>Merge in progress.</strong>{" "}
                        {conflicted ? (
                          <>
                            <code>{conflicted.path}</code> has a conflict. Open it, keep the lines you want, then mark it
                            resolved and finish the merge.
                          </>
                        ) : (
                          <>Every conflict is marked resolved. Finish the merge, or abort it.</>
                        )}
                        <span className="gitx-banner-actions">
                          {conflicted && (
                            <>
                              <button type="button" className="gitx-btn small" onClick={() => setEditing(conflicted.path)}>
                                Open {conflicted.path}
                              </button>
                              <button type="button" className="gitx-btn small" onClick={() => compose(`git add ${conflicted.path}`)}>
                                Mark it resolved
                              </button>
                            </>
                          )}
                          <button type="button" className="gitx-btn small" onClick={() => compose(`git commit -m "Merge ${state.merging}"`)}>
                            Finish the merge
                          </button>
                          <button type="button" className="gitx-btn quiet small" onClick={() => compose("git merge --abort")}>
                            Abort
                          </button>
                        </span>
                      </div>
                    )}

                    {showTry && (
                      <div className="gitx-try" role="region" aria-label="Try this">
                        <header className="gitx-try-head">
                          <span>Try this</span>
                          <button type="button" className="gitx-btn quiet small" onClick={() => setTryDismissed(true)} aria-label="Dismiss">
                            <X size={13} aria-hidden="true" />
                          </button>
                        </header>
                        <ol className="gitx-try-steps">
                          {tryThis.map((step, i) => (
                            <li key={step.command} className={tryDone[i] ? "done" : ""}>
                              <button type="button" className="gitx-try-step" onClick={() => compose(step.command)} disabled={tryDone[i]}>
                                <span className="gitx-try-mark" aria-hidden="true">
                                  {tryDone[i] ? <Check size={12} /> : i + 1}
                                </span>
                                <span className="gitx-try-label">{step.label}</span>
                                <code className="gitx-try-cmd">{step.command}</code>
                              </button>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    <AreasBoxes state={state} changed={changed} internals={internals} onOpen={setEditing} />
                  </>
                )}
              </div>
            </section>

            <section className="gitx-pane gitx-history" aria-label="History">
              <header className="gitx-pane-head">
                <span className="pane-label">
                  <HistoryIcon size={12} aria-hidden="true" />
                  History
                </span>
                <span className="gitx-pane-sep" />
                <span className="gitx-pane-sub">
                  {state.commits.length} commit{state.commits.length === 1 ? "" : "s"}
                  {state.branches.length > 1 && ` · ${state.branches.length} branches`}
                </span>
              </header>
              <div className="gitx-pane-body">
                <CommitGraph
                  commits={state.commits}
                  detached={state.head.detached}
                  size="large"
                  framed={false}
                  showOids={internals}
                  wip={uncommitted ? { files: uncommitted } : null}
                  onCompose={compose}
                />
              </div>
            </section>
          </div>

          <div className="gitx-console" data-sheet={snap}>
            <button
              type="button"
              className="gitx-handle"
              aria-label={mobile ? "Resize the terminal: drag, or tap to cycle" : "Resize the terminal"}
              onPointerDown={onHandleDown}
              onPointerMove={onHandleMove}
              onPointerUp={onHandleUp}
              onPointerCancel={() => (drag.current = null)}
              onKeyDown={onHandleKey}
            >
              <span aria-hidden="true" />
            </button>

            <div className="gitx-console-head">
              <span className="pane-label">
                <TerminalIcon size={12} aria-hidden="true" />
                Terminal
              </span>
              <div className="gitx-steps" role="group" aria-label="Suggested next steps">
                {suggestions.map((s) => (
                  <button key={s.command} type="button" className="gitx-step" onClick={() => compose(s.command)} title={s.command} disabled={disabled}>
                    {s.label}
                  </button>
                ))}
              </div>
              <span className="gitx-pane-sep" />
              {mobile && (
                <button type="button" className="gitx-btn small mono" onClick={() => termRef.current?.complete()} disabled={disabled} title="Complete the word, as Tab does">
                  Tab
                </button>
              )}
              <button type="button" className="gitx-btn quiet small" onClick={() => setPaletteOpen((v) => !v)} aria-expanded={paletteOpen}>
                All commands
              </button>
            </div>

            {paletteOpen && (
              <>
                <button type="button" className="gitx-palette-backdrop" aria-label="Close the command list" onClick={() => setPaletteOpen(false)} />
                <div className="gitx-palette" role="dialog" aria-label="All commands">
                  <CommandPalette state={state} onCompose={compose} />
                </div>
              </>
            )}

            <div className="gitx-console-body">
              <GitTerminal
                ref={termRef}
                transcript={transcript}
                value={input}
                onValueChange={setInput}
                onSubmit={(c) => void run(c)}
                history={history}
                busy={disabled}
                completions={completions}
                subcommands={subcommands}
                pathCompletions={pathCompletions}
                prompt={state.cwd || ROOT}
                promptFor={(entry) => promptAt.current.get(entry.id)}
                placeholder=""
                inlineInput
                onWrite={write}
                placeholderHint={null}
              />
            </div>

            <div className="gitx-console-foot">
              <span className="gitx-status">{statusLine(state)}</span>
              {narration && (
                <span className="gitx-narration" role="status" aria-live="polite">
                  {narration}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
