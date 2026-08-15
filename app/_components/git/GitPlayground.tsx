"use client";

/**
 * The Git playground shell. Reuses the language playgrounds' chrome
 * (`.playground-root` / `-app` / `-header` / `-body` from playground.css) so
 * the header, palette and scrollbars match the rest of the site; the body is
 * its own three-pane layout because the artifact here is a repository rather
 * than a file of code.
 *
 * Memory-only by design — no OPFS, no cloud save. See the Git playground
 * design addendum §5: the filesystem is derived from the command history, so
 * the history is what a share link would carry.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@base-ui/react/select";
import { RotateCcw } from "lucide-react";
import Link from "../Link";
import { PLAYGROUNDS } from "../playgrounds";
import { useIsFramed } from "../useIsFramed";
import { LANGUAGE_ICONS, LANGUAGE_ICON_SIZE_FACTOR } from "../languageIcons";
import {
  PlaygroundBootOverlay,
  useBootOverlayVisibility,
} from "../PlaygroundBootOverlay";
import { applyThemePalette, getStoredEditorTheme, applyMode } from "../playgroundTheme";
import { useGitSession } from "./gitRuntime";
import { GitTerminal, type TranscriptEntry } from "./GitTerminal";
import { ThreeAreasPanel } from "./ThreeAreasPanel";
import { CommitGraph } from "./CommitGraph";
import { CommandPalette } from "./CommandPalette";
import { WorkingTree } from "./WorkingTree";
import { SCENARIOS, DEFAULT_SCENARIO, scenarioById } from "./scenarios";
import type { FileStatus } from "./protocol";
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

type Tab = "terminal" | "state" | "files";

const fileKey = (f: FileStatus) => `${f.path}:${f.head}${f.workdir}${f.stage}`;

export default function GitPlayground() {
  const router = useRouter();
  const embedded = useIsFramed();
  const [scenario, setScenario] = useState(DEFAULT_SCENARIO);
  const { state, ready, error, exec, reset, readFile, writeFile } = useGitSession(
    scenario,
    "playground",
  );

  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("terminal");
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const entryId = useRef(0);
  const previous = useRef<Map<string, string>>(new Map());

  const overlay = useBootOverlayVisibility(ready || Boolean(error));

  // Match the language playgrounds' theming so the chrome reads identically.
  useEffect(() => {
    const theme = getStoredEditorTheme() ?? "github-dark";
    applyThemePalette(theme);
    applyMode(theme);
  }, []);

  // Highlight the rows the last command actually moved.
  useEffect(() => {
    const next = new Map(state.files.map((f) => [f.path, fileKey(f)]));
    const moved = new Set<string>();
    for (const [path, key] of next) {
      if (previous.current.get(path) !== key) moved.add(path);
    }
    // Skip the first render, where every row is trivially "new".
    if (previous.current.size > 0) setChanged(moved);
    previous.current = next;
    if (moved.size) {
      const timer = setTimeout(() => setChanged(new Set()), 1200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [state.files]);

  const run = useCallback(
    async (command: string) => {
      if (command === "clear") {
        setTranscript([]);
        setInput("");
        setHistory((h) => [...h, command]);
        return;
      }
      setBusy(true);
      setInput("");
      setHistory((h) => [...h, command]);
      try {
        const result = await exec(command);
        setTranscript((t) => [
          ...t,
          {
            id: (entryId.current += 1),
            command,
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
          },
        ]);
      } catch (e) {
        setTranscript((t) => [
          ...t,
          {
            id: (entryId.current += 1),
            command,
            stdout: "",
            stderr: `${(e as Error).message}\n`,
            exitCode: 1,
          },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [exec],
  );

  const handleReset = useCallback(
    async (next: string) => {
      setBusy(true);
      setTranscript([]);
      setInput("");
      setHistory([]);
      previous.current = new Map();
      try {
        if (next === scenario) await reset();
        else setScenario(next);
      } finally {
        setBusy(false);
      }
    },
    [reset, scenario],
  );

  const completions = useMemo(() => {
    const words = new Set<string>([...SHELL_COMMANDS, ...GIT_SUBCOMMANDS, ...state.branches]);
    for (const f of state.tree) words.add(f);
    return [...words];
  }, [state.branches, state.tree]);

  const headline = state.initialized
    ? state.head.detached
      ? `HEAD detached at ${state.head.oid?.slice(0, 7) ?? "?"}`
      : `HEAD → refs/heads/${state.head.branch ?? "main"}${
          state.head.oid ? ` → ${state.head.oid.slice(0, 7)}` : " (unborn)"
        }`
    : "No repository yet. Run git init.";

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
              <img
                src="/dataslope-logo-blue.svg"
                alt="Dataslope logo"
                className="brand-logo ds-logo-mark"
              />
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
                    <span
                      className="playground-switcher-lang-icon"
                      style={{ color: "var(--text)" }}
                      aria-hidden="true"
                    >
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
                  <Select.Popup className="playground-lang-switcher-popup">
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

          <label className="git-scenario">
            <span className="git-scenario-label">Scenario</span>
            <select
              value={scenario}
              onChange={(e) => void handleReset(e.target.value)}
              disabled={busy}
              aria-label="Starting repository"
            >
              {SCENARIOS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="git-header-btn"
            onClick={() => void handleReset(scenario)}
            disabled={busy}
            title="Start this scenario over. Nothing here is saved."
          >
            <RotateCcw size={14} aria-hidden="true" />
            <span>Reset</span>
          </button>
        </header>

        <h1 className="playground-sr-title">Git Playground</h1>

        <div className="playground-body git-body">
          <nav className="git-tabs" aria-label="Panels">
            {(["terminal", "state", "files"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                className={tab === t ? "git-tab active" : "git-tab"}
                onClick={() => setTab(t)}
                aria-current={tab === t}
              >
                {t === "terminal" ? "Terminal" : t === "state" ? "Repo state" : "Files"}
              </button>
            ))}
          </nav>

          <div className="git-panes" data-tab={tab}>
            <div className="git-pane git-pane-files">
              <WorkingTree
                state={state}
                busy={busy}
                readFile={readFile}
                writeFile={writeFile}
                onRefresh={() => void exec("true")}
              />
            </div>

            <div className="git-pane git-pane-terminal">
              <div className="git-headline" title={headline}>
                {headline}
              </div>
              <GitTerminal
                transcript={transcript}
                value={input}
                onValueChange={setInput}
                onSubmit={(c) => void run(c)}
                history={history}
                busy={busy || !ready}
                completions={completions}
              />
              <p className="git-scenario-hint">{scenarioById(scenario).description}</p>
            </div>

            <div className="git-pane git-pane-state">
              <ThreeAreasPanel files={state.files} changed={changed} />
              <CommitGraph commits={state.commits} detached={state.head.detached} />
              <CommandPalette state={state} onCompose={setInput} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
