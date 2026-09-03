"use client";

/**
 * Everything one terminal needs to behave like a terminal, minus the chrome:
 * its scrollback, its input, its history, the directory it is in, and the
 * handlers that keep them right. `BashBlock` wraps this in a block; the Bash
 * playground wraps it in a pane. One implementation, two surfaces.
 *
 * The directory is tracked here rather than read from the session state,
 * because a session can hold several shells (the playground's split
 * terminals) and the shared state only carries the directory of whichever
 * shell ran last. Each result carries the directory of the shell that ran
 * it, and that is what this keeps.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import type { CommandResult, GitSession } from "../git/gitRuntime";
import type { TranscriptEntry } from "../git/GitTerminal";
import { makePathCompleter } from "../git/pathCompleter";
import { HOME, displayCwd } from "./prompt";

/** Commands offered by tab-completion, on top of whatever is in the tree. */
export const SHELL_COMMANDS = [
  "ls", "cd", "pwd", "cat", "echo", "printf", "touch", "mkdir", "rmdir", "rm",
  "cp", "mv", "head", "tail", "wc", "grep", "sed", "awk", "sort", "uniq", "cut",
  "tr", "find", "xargs", "diff", "jq", "tee", "du", "tree", "stat", "clear",
  "basename", "dirname", "seq", "date", "which", "help", "env", "export",
];

/** Scrollback kept per terminal. Bounds memory for a loop the execution
 *  limits still let run ten thousand times. */
const MAX_ENTRIES = 2000;

export interface ShellPaneOptions {
  /** Which shell in the session; omitted means the session's main shell. */
  shell?: string;
  /** Where the shell starts, for the prompt before the first command. */
  startCwd?: string;
}

export function useShellPane(
  session: Pick<GitSession, "state" | "exec">,
  { shell, startCwd = HOME }: ShellPaneOptions = {},
) {
  const { state, exec } = session;
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [cwd, setCwd] = useState(startCwd);
  const entryId = useRef(0);
  /** The directory each entry ran in, so scrollback shows a `cd` taking
   *  effect on the line after it rather than rewriting the whole history. */
  const promptAt = useRef<Map<number, string>>(new Map());
  /** Where the shell is right now. A ref, because React state cannot keep up
   *  inside a run of commands; mirrored into `cwd` for rendering. */
  const cwdRef = useRef(startCwd);

  const append = useCallback(
    (command: string, result: { stdout: string; stderr: string; exitCode: number }, at: string) => {
      const id = (entryId.current += 1);
      promptAt.current.set(id, at);
      setTranscript((t) => {
        const next = [...t, { id, command, ...result }];
        if (next.length <= MAX_ENTRIES) return next;
        for (const dropped of next.slice(0, next.length - MAX_ENTRIES)) promptAt.current.delete(dropped.id);
        return next.slice(-MAX_ENTRIES);
      });
    },
    [],
  );

  const runOne = useCallback(
    async (command: string) => {
      // The directory as it was before the command ran: a `cd` belongs to the
      // prompt of the *next* line, exactly as in a terminal.
      const at = cwdRef.current;
      try {
        const result: CommandResult = await exec(command, shell);
        cwdRef.current = result.cwd;
        setCwd(result.cwd);
        append(command, result, at);
      } catch (e) {
        append(command, { stdout: "", stderr: `${(e as Error).message}\n`, exitCode: 1 }, at);
      }
    },
    [append, exec, shell],
  );

  const clear = useCallback(() => {
    setTranscript([]);
    setInput("");
  }, []);

  const submit = useCallback(
    async (command: string) => {
      if (command === "clear") {
        clear();
        setHistory((h) => [...h, command]);
        return;
      }
      // A blank line is not a no-op in a shell: it echoes the prompt and
      // hands back a fresh one. Nothing runs and nothing joins the history,
      // which is also how bash treats it.
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
      try {
        await runOne(command);
      } finally {
        setBusy(false);
      }
    },
    [clear, runOne],
  );

  /** Play several lines in order, each through the same path a typed line
   *  takes, so the state they leave behind is real. */
  const runLines = useCallback(
    async (lines: string[]) => {
      setBusy(true);
      try {
        for (const line of lines) {
          setHistory((h) => [...h, line]);
          await runOne(line);
        }
      } finally {
        setBusy(false);
      }
    },
    [runOne],
  );

  /**
   * Whatever the line editor wants in the scrollback: a completion listing, or
   * the question it asks before a very long one. `echo` reprints the line the
   * reader was editing; a `null` echo is bare output.
   */
  const write = useCallback(({ echo, text }: { echo: string | null; text: string }) => {
    const id = (entryId.current += 1);
    if (echo !== null) promptAt.current.set(id, cwdRef.current);
    setTranscript((t) => [
      ...t,
      { id, command: echo ?? "", stdout: text, stderr: "", exitCode: 0, note: echo === null },
    ]);
  }, []);

  /** Paths as the reader would type them, relative to this shell's own
   *  directory, which is not necessarily the one the shared state names. */
  const pathCompletions = useMemo(
    () => makePathCompleter(state.tree, state.dirs, cwd, HOME),
    [state.tree, state.dirs, cwd],
  );

  /** The scrollback as text, prompts included, which is what a reader who
   *  wants to keep a session is after. */
  const copyTranscript = useCallback(() => {
    const lines: string[] = [];
    for (const entry of transcript) {
      if (!entry.note) {
        const at = displayCwd(promptAt.current.get(entry.id) ?? HOME);
        for (const line of entry.command.split("\n")) lines.push(`${at} $ ${line}`);
      }
      if (entry.stdout) lines.push(entry.stdout.replace(/\n$/, ""));
      if (entry.stderr) lines.push(entry.stderr.replace(/\n$/, ""));
    }
    return lines.join("\n");
  }, [transcript]);

  /** Back to an empty scrollback at the starting directory; the caller
   *  resets the filesystem itself. */
  const reset = useCallback(() => {
    setTranscript([]);
    setInput("");
    setHistory([]);
    promptAt.current = new Map();
    cwdRef.current = startCwd;
    setCwd(startCwd);
  }, [startCwd]);

  const promptFor = useCallback(
    (entry: TranscriptEntry) => displayCwd(promptAt.current.get(entry.id) ?? HOME),
    [],
  );

  return {
    transcript,
    input,
    setInput,
    history,
    busy,
    cwd,
    prompt: displayCwd(cwd),
    promptFor,
    submit,
    runLines,
    write,
    clear,
    reset,
    copyTranscript,
    pathCompletions,
    completions: SHELL_COMMANDS,
  };
}
