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
 * - **The command history is the work product.** Nothing else is saved.
 *   That is what makes Undo cheap (reset and replay it minus the last step),
 *   what lets a Reset or a scenario change be undone (the history is kept
 *   and replayed back), and what survives a reload: the steps go to
 *   `sessionStorage` and are replayed on the next load of this tab.
 * - **Editing a file is not Git.** The editor writes to the working
 *   directory and is exempt from the rule above; a save is recorded as a
 *   step so Undo can replay it.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@base-ui/react/select";
import { Dialog } from "@base-ui/react/dialog";
import {
  ArrowRight,
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
import { applyThemePalette, applyMode, setStoredEditorTheme } from "../playgroundTheme";
import { usePlaygroundThemeSync } from "../playgroundThemeSync";
import { ThemePillToggle } from "../ThemePillToggle";
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
import { joinForHistory } from "../bash/useShellPane";
import "../playground.css";
import "./gitPlayground.css";

const SHELL_COMMANDS = [
  "git", "ls", "cat", "cd", "pwd", "echo", "printf", "mkdir", "rm", "cp", "mv",
  "touch", "head", "tail", "wc", "grep", "find", "diff", "sort", "uniq", "clear",
];
const GIT_SUBCOMMANDS = [
  "init", "status", "add", "commit", "log", "diff", "branch", "checkout", "switch",
  "merge", "reset", "restore", "rm", "show", "tag", "cat-file", "config", "help",
];

/** One thing the reader did, in the order they did it. Undo replays all but
 *  the last onto a fresh scenario. */
type Step = { kind: "command"; command: string } | { kind: "write"; path: string; content: string };
/** A session set aside by Reset or a scenario change, so Undo can bring it
 *  back: replaying its steps onto its scenario reproduces it exactly. */
type Shelved = { scenario: string; steps: Step[] };
type Pane = "changes" | "history";
type Snap = "peek" | "half" | "full";
/** A destructive action waiting on the reader's say-so. */
type Pending = { kind: "reset" } | { kind: "scenario"; id: string };

const ROOT = SESSION_ROOTS.git;
const PREFS = { internals: "git_playground_internals", consoleH: "git_playground_console_h" };
/** The tab's own session: scenario plus steps, replayed on the next load. */
const SESSION_KEY = "git_playground_session";
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

function readSession(): Shelved | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Shelved>;
    if (typeof parsed.scenario !== "string" || !Array.isArray(parsed.steps)) return null;
    if (!SCENARIOS.some((s) => s.id === parsed.scenario)) return null;
    return { scenario: parsed.scenario, steps: parsed.steps.slice(0, 500) as Step[] };
  } catch {
    return null;
  }
}

function writeSession(session: Shelved | null) {
  try {
    if (session && session.steps.length) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage blocked; the session lasts until the tab is closed or reloaded */
  }
}

/** The stretch of a composed command a reader is meant to replace: the
 *  message inside `-m "…"`. Null for everything else. */
export function placeholderRange(command: string): [number, number] | null {
  const m = /-a?m "([^"]*)"/.exec(command);
  if (!m || !m[1]) return null;
  const start = m.index + m[0].indexOf('"') + 1;
  return [start, start + m[1].length];
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
  const [shelved, setShelved] = useState<Shelved[]>([]);
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
  const [pending, setPending] = useState<Pending | null>(null);
  /** Lines waiting at the `>` prompt for the rest of their command. */
  const [continuation, setContinuation] = useState<string[]>([]);

  const entryId = useRef(0);
  const promptAt = useRef(new Map<number, string>());
  const cwdRef = useRef(ROOT);
  const prevState = useRef<RepoState | null>(null);
  const previousFiles = useRef<Map<string, string>>(new Map());
  const replaying = useRef(false);
  const busyRef = useRef(false);
  const queue = useRef<string[]>([]);
  const continuationRef = useRef<string[]>([]);
  const termRef = useRef<GitTerminalHandle>(null);
  const drag = useRef<{ y: number; h: number } | null>(null);
  /** Steps saved by an earlier load of this tab, replayed once the session
   *  they belong to is ready. */
  const restore = useRef<Shelved | null>(null);
  const hydrated = useRef(false);

  const overlay = useBootOverlayVisibility(ready || Boolean(error));
  const scenarioDef = scenarioById(scenario);

  // The colour scheme follows the site-wide light/dark choice, as every
  // other playground's does; the header pill flips it for every surface.
  const setEditorTheme = useCallback((theme: string) => {
    applyThemePalette(theme);
    applyMode(theme);
    setStoredEditorTheme(theme);
  }, []);
  usePlaygroundThemeSync(setEditorTheme);

  // Preferences are read here rather than in a lazy initializer so the server
  // and the first client render agree; the same arrangement Playground.tsx
  // uses for its own stored settings.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time read of stored preferences after hydration */
    setInternals(readPref(PREFS.internals, false, (r) => r === "1"));
    setConsoleH(readPref(PREFS.consoleH, 300, (r) => Math.max(160, Number(r) || 300)));
    // A reload keeps the session: its steps replay once the runtime is up.
    const saved = readSession();
    if (saved) {
      restore.current = saved;
      if (saved.scenario !== DEFAULT_SCENARIO) setScenario(saved.scenario);
    }
    hydrated.current = true;
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Everything the session is made of goes to sessionStorage as it happens,
  // so a reload lands where the reader left off rather than on the seed.
  useEffect(() => {
    if (!hydrated.current || restore.current) return;
    writeSession({ scenario, steps });
  }, [scenario, steps]);

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
    (
      command: string,
      result: { stdout: string; stderr: string; exitCode: number },
      at: string,
      continued = false,
    ) => {
      const id = (entryId.current += 1);
      promptAt.current.set(id, at);
      setTranscript((t) => [...t, { id, command, ...result, ...(continued ? { continuation: true } : {}) }]);
    },
    [],
  );

  /** Run one complete command line (possibly several lines joined) and
   *  record it. Used by typing, by Undo's replay and by a restore. */
  const runOne = useCallback(
    async (command: string) => {
      const at = cwdRef.current;
      try {
        const result = await exec(command);
        cwdRef.current = result.cwd;
        const lines = command.split("\n");
        lines.forEach((line, i) => {
          append(line, i === lines.length - 1 ? result : { stdout: "", stderr: "", exitCode: 0 }, at, i > 0);
        });
      } catch (e) {
        append(command, { stdout: "", stderr: `${(e as Error).message}\n`, exitCode: 1 }, at);
      }
    },
    [append, exec],
  );

  /**
   * One typed line. With lines waiting at the `>` prompt it is the next piece
   * of their command; only when the shell says the whole thing is complete
   * does it run, join the history, and count as a step.
   */
  const perform = useCallback(
    async (line: string) => {
      const waiting = continuationRef.current;
      if (line === "clear" && !waiting.length) {
        setTranscript([]);
        setHistory((h) => [...h, line]);
        return;
      }
      if (line === "" && !waiting.length) {
        const id = (entryId.current += 1);
        promptAt.current.set(id, cwdRef.current);
        setTranscript((t) => [...t, { id, command: "", stdout: "", stderr: "", exitCode: 0 }]);
        return;
      }
      const lines = [...waiting, line];
      const at = cwdRef.current;
      try {
        const result = await exec(lines.join("\n"));
        if (result.incomplete) {
          append(line, { stdout: "", stderr: "", exitCode: 0 }, at, waiting.length > 0);
          continuationRef.current = lines;
          setContinuation(lines);
          return;
        }
        cwdRef.current = result.cwd;
        append(line, result, at, waiting.length > 0);
      } catch (e) {
        append(line, { stdout: "", stderr: `${(e as Error).message}\n`, exitCode: 1 }, at, waiting.length > 0);
      }
      continuationRef.current = [];
      setContinuation([]);
      setHistory((h) => [...h, joinForHistory(lines)]);
      setSteps((s) => [...s, { kind: "command", command: lines.join("\n") }]);
    },
    [append, exec],
  );

  const run = useCallback(
    async (line: string) => {
      setInput("");
      // A line typed while a command runs waits its turn, as in a shell.
      if (busyRef.current) {
        queue.current.push(line);
        return;
      }
      busyRef.current = true;
      setBusy(true);
      try {
        await perform(line);
        while (queue.current.length) await perform(queue.current.shift()!);
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [perform],
  );

  /** Ctrl-C: echo the abandoned line with `^C` and drop any half-typed
   *  multi-line command with it. */
  const cancel = useCallback(
    (abandoned: string) => {
      append(`${abandoned}^C`, { stdout: "", stderr: "", exitCode: 130 }, cwdRef.current, continuationRef.current.length > 0);
      continuationRef.current = [];
      setContinuation([]);
      setInput("");
    },
    [append],
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
    setContinuation([]);
    continuationRef.current = [];
    queue.current = [];
    promptAt.current = new Map();
    previousFiles.current = new Map();
    prevState.current = null;
    cwdRef.current = ROOT;
  }, []);

  /** Replay a list of steps onto the fresh session, quietly. */
  const replay = useCallback(
    async (list: Step[]) => {
      replaying.current = true;
      try {
        for (const step of list) {
          if (step.kind === "command") await runOne(step.command);
          else await writeFile(step.path, step.content);
        }
        // Let the last replayed state commit before narration resumes, so the
        // replay itself does not narrate.
        await new Promise((r) => requestAnimationFrame(() => r(null)));
      } finally {
        replaying.current = false;
      }
    },
    [runOne, writeFile],
  );

  // The saved session replays once the runtime is ready on its scenario.
  useEffect(() => {
    const saved = restore.current;
    if (!ready || !saved || saved.scenario !== scenario) return;
    restore.current = null;
    if (!saved.steps.length) return;
    let cancelled = false;
    setBusy(true);
    busyRef.current = true;
    void (async () => {
      try {
        await replay(saved.steps);
        if (!cancelled) {
          setSteps(saved.steps);
          setHistory(saved.steps.filter((s) => s.kind === "command").map((s) => joinForHistory((s as { command: string }).command.split("\n"))));
          setNarration("Restored your session from before the reload.");
        }
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, scenario, replay]);

  /** Start over, or start another scenario. The session being left is
   *  shelved so Undo can bring it back. */
  const startOver = useCallback(
    async (next: string) => {
      setPending(null);
      if (steps.length) setShelved((s) => [...s.slice(-4), { scenario, steps }]);
      setBusy(true);
      clearSession();
      try {
        if (next === scenario) await reset();
        else setScenario(next);
      } finally {
        setBusy(false);
      }
    },
    [clearSession, reset, scenario, steps],
  );

  /** Reset or switch scenario, asking first when there is work to lose. */
  const handleReset = useCallback(
    (next: string) => {
      if (steps.length === 0 || transcript.length === 0) {
        void startOver(next);
        return;
      }
      setPending(next === scenario ? { kind: "reset" } : { kind: "scenario", id: next });
    },
    [scenario, startOver, steps.length, transcript.length],
  );

  /**
   * Reset, then replay every step but the last. Exact, because the scenario
   * is itself a replayed script and the session is memory-only. With no
   * steps to take back, Undo restores the session a Reset or a scenario
   * change set aside.
   */
  const undo = useCallback(async () => {
    if (busy) return;
    if (!steps.length) {
      const back = shelved[shelved.length - 1];
      if (!back) return;
      setShelved((s) => s.slice(0, -1));
      setBusy(true);
      busyRef.current = true;
      clearSession();
      try {
        if (back.scenario !== scenario) {
          // Replay once the other scenario's session is ready.
          restore.current = { ...back };
          setScenario(back.scenario);
          return;
        }
        await reset();
        await replay(back.steps);
        setSteps(back.steps);
        setHistory(back.steps.filter((s) => s.kind === "command").map((s) => joinForHistory((s as { command: string }).command.split("\n"))));
        setNarration("Undid the reset: your session is back.");
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
      return;
    }
    const keep = steps.slice(0, -1);
    setBusy(true);
    busyRef.current = true;
    setTranscript([]);
    setInput("");
    setEditing(null);
    setSteps(keep);
    setHistory(keep.filter((s) => s.kind === "command").map((s) => joinForHistory((s as { command: string }).command.split("\n"))));
    promptAt.current = new Map();
    cwdRef.current = ROOT;
    try {
      await reset();
      await replay(keep);
      const last = steps[steps.length - 1];
      setNarration(
        last.kind === "command" ? `Undid: ${last.command.replace(/\n/g, "; ")}` : `Undid the edit to ${last.path}.`,
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [busy, clearSession, replay, reset, scenario, shelved, steps]);

  /** A chip, a card or a menu item composes into the prompt; nothing runs.
   *  The caret lands at the end, or on the message a commit chip expects the
   *  reader to replace. */
  const compose = useCallback(
    (command: string) => {
      setInput(command);
      setPaletteOpen(false);
      if (mobile && snap === "peek") setSnap("half");
      const select = placeholderRange(command);
      requestAnimationFrame(() => termRef.current?.focus(select ? { select } : undefined));
    },
    [mobile, snap],
  );

  const closePalette = useCallback(() => {
    setPaletteOpen(false);
    requestAnimationFrame(() => termRef.current?.focus());
  }, []);

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
  const tryFinished = tryThis.length > 0 && tryDone.every(Boolean);
  const showTry = !tryDismissed && tryThis.length > 0 && !state.merging;
  const nextScenario = SCENARIOS[(SCENARIOS.findIndex((s) => s.id === scenario) + 1) % SCENARIOS.length];
  const editingWord = editing
    ? placeFiles(state.files, state.merging).find((c) => c.path === editing)?.word ?? ""
    : "";
  const disabled = busy || !ready;
  const canUndo = steps.length > 0 || shelved.length > 0;
  const pendingLabel = pending?.kind === "scenario" ? scenarioById(pending.id).label : null;

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

          <Select.Root value={scenario} onValueChange={(v) => v && v !== scenario && handleReset(v)}>
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
            disabled={disabled || !canUndo}
            title={
              steps.length
                ? "Undo the last thing you did"
                : shelved.length
                  ? "Bring back the session you reset or switched away from"
                  : "Nothing to undo yet"
            }
            aria-label="Undo"
          >
            <Undo2 size={14} aria-hidden="true" />
            <span className="gitx-btn-label">Undo</span>
          </button>
          <button
            type="button"
            className="gitx-btn"
            onClick={() => handleReset(scenario)}
            disabled={disabled}
            title="Start this scenario over. Undo brings the session back."
            aria-label="Reset"
          >
            <RotateCcw size={14} aria-hidden="true" />
            <span className="gitx-btn-label">Reset</span>
          </button>

          <ThemePillToggle className="gitx-theme" />
        </header>

        <h1 className="playground-sr-title">Git Playground</h1>

        {/* Reset and a scenario change wipe the repository. With work in it
            they ask first, as every editor playground does. Undo can still
            bring the session back afterwards. */}
        <Dialog.Root open={pending !== null} onOpenChange={(open) => { if (!open) setPending(null); }}>
          <Dialog.Portal>
            <Dialog.Backdrop className="confirm-backdrop" />
            <Dialog.Popup className="confirm-popup" role="alertdialog">
              <Dialog.Title className="confirm-title">
                {pending?.kind === "scenario" ? `Switch to “${pendingLabel}”?` : "Start this scenario over?"}
              </Dialog.Title>
              <Dialog.Description className="confirm-desc">
                {pending?.kind === "scenario" ? "Switching scenarios" : "Resetting"} replaces the repository you have
                built here ({steps.length} step{steps.length === 1 ? "" : "s"}) and clears the terminal. Undo can bring
                it back until you make new changes.
              </Dialog.Description>
              <div className="confirm-actions">
                <Dialog.Close className="confirm-btn confirm-btn-secondary">Cancel</Dialog.Close>
                <Dialog.Close
                  className="confirm-btn confirm-btn-danger"
                  onClick={() => {
                    if (pending) void startOver(pending.kind === "scenario" ? pending.id : scenario);
                  }}
                >
                  {pending?.kind === "scenario" ? "Switch scenario" : "Reset"}
                </Dialog.Close>
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>

        <div className="playground-body gitx-body" style={{ "--gitx-console-h": `${consoleH}px` } as React.CSSProperties}>
          <div className="gitx-stage" data-pane={pane}>
            <div className="gitx-seg" role="tablist" aria-label="Pane">
              <button
                type="button"
                role="tab"
                id="gitx-tab-changes"
                aria-controls="gitx-pane-changes"
                aria-selected={pane === "changes"}
                className={pane === "changes" ? "gitx-seg-btn active" : "gitx-seg-btn"}
                onClick={() => setPane("changes")}
              >
                <Files size={14} aria-hidden="true" /> Changes
              </button>
              <button
                type="button"
                role="tab"
                id="gitx-tab-history"
                aria-controls="gitx-pane-history"
                aria-selected={pane === "history"}
                className={pane === "history" ? "gitx-seg-btn active" : "gitx-seg-btn"}
                onClick={() => setPane("history")}
              >
                <HistoryIcon size={14} aria-hidden="true" /> History
              </button>
            </div>

            <section className="gitx-pane gitx-changes" id="gitx-pane-changes" role="tabpanel" aria-labelledby="gitx-tab-changes">
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
                      onKeyDown={(e) => {
                        // Enter creates the file even when the browser does
                        // not submit the form for it; Escape puts the field
                        // away.
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void createFile(newFile);
                        } else if (e.key === "Escape") {
                          setNewFile(null);
                        }
                      }}
                      placeholder="notes.txt"
                      aria-label="New file name"
                      autoFocus
                      spellCheck={false}
                      enterKeyHint="done"
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
                          <span>{tryFinished ? "Done" : "Try this"}</span>
                          <button type="button" className="gitx-btn quiet small" onClick={() => setTryDismissed(true)} aria-label="Dismiss">
                            <X size={13} aria-hidden="true" />
                          </button>
                        </header>
                        {tryFinished ? (
                          <p className="gitx-try-done">
                            <Check size={14} aria-hidden="true" />
                            <span>
                              Every step of <strong>{scenarioDef.label}</strong> is done. Keep exploring here, or try the next scenario.
                            </span>
                            <button type="button" className="gitx-btn primary small" onClick={() => handleReset(nextScenario.id)} disabled={disabled}>
                              <span>{nextScenario.label}</span>
                              <ArrowRight size={13} aria-hidden="true" />
                            </button>
                          </p>
                        ) : (
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
                        )}
                      </div>
                    )}

                    <AreasBoxes state={state} changed={changed} internals={internals} onOpen={setEditing} />
                  </>
                )}
              </div>
            </section>

            <section className="gitx-pane gitx-history" id="gitx-pane-history" role="tabpanel" aria-labelledby="gitx-tab-history">
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
              <button
                type="button"
                className="gitx-btn quiet small"
                onClick={() => (paletteOpen ? closePalette() : setPaletteOpen(true))}
                aria-expanded={paletteOpen}
                aria-haspopup="dialog"
              >
                All commands
              </button>
            </div>

            {paletteOpen && (
              <>
                <button type="button" className="gitx-palette-backdrop" aria-label="Close the command list" onClick={closePalette} tabIndex={-1} />
                <div className="gitx-palette" role="dialog" aria-modal="true" aria-label="All commands">
                  <CommandPalette state={state} onCompose={compose} onClose={closePalette} />
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
                continuation={continuation.length > 0}
                onCancel={cancel}
                queueWhileBusy={ready}
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
