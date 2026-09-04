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
 *
 * Two shell habits live here too. A line that is not finished (`if true;
 * then echo yes`) gets bash's `>` prompt and is joined to the next line
 * rather than rejected, and a line typed while a command is still running
 * is queued and runs next rather than being dropped.
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
  "alias", "unalias", "type", "true", "false", "test", "sleep", "time",
];

/** Scrollback kept per terminal. Bounds memory for a loop the execution
 *  limits still let run ten thousand times. */
const MAX_ENTRIES = 2000;

export interface ShellPaneOptions {
  /** Which shell in the session; omitted means the session's main shell. */
  shell?: string;
  /** Where the shell starts, for the prompt before the first command. */
  startCwd?: string;
  /** Called with every line that ran to completion, in order, for a host
   *  that keeps a record of the session. */
  onRan?: (command: string) => void;
}

/** How bash keeps a multi-line command in its history: as one line. */
export const joinForHistory = (lines: string[]) => lines.join("; ");

export function useShellPane(
  session: Pick<GitSession, "state" | "exec">,
  { shell, startCwd = HOME, onRan }: ShellPaneOptions = {},
) {
  const { state, exec } = session;
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [cwd, setCwd] = useState(startCwd);
  /** Lines waiting at the `>` prompt for the rest of their command. */
  const [pending, setPending] = useState<string[]>([]);
  const pendingRef = useRef<string[]>([]);
  const busyRef = useRef(false);
  /** Lines typed while a command was running, to run next in order. */
  const queue = useRef<string[]>([]);
  const entryId = useRef(0);
  /** The directory each entry ran in, so scrollback shows a `cd` taking
   *  effect on the line after it rather than rewriting the whole history. */
  const promptAt = useRef<Map<number, string>>(new Map());
  /** Where the shell is right now. A ref, because React state cannot keep up
   *  inside a run of commands; mirrored into `cwd` for rendering. */
  const cwdRef = useRef(startCwd);

  const append = useCallback(
    (
      command: string,
      result: { stdout: string; stderr: string; exitCode: number },
      at: string,
      continuation = false,
    ) => {
      const id = (entryId.current += 1);
      promptAt.current.set(id, at);
      setTranscript((t) => {
        const next = [...t, { id, command, ...result, ...(continuation ? { continuation } : {}) }];
        if (next.length <= MAX_ENTRIES) return next;
        for (const dropped of next.slice(0, next.length - MAX_ENTRIES)) promptAt.current.delete(dropped.id);
        return next.slice(-MAX_ENTRIES);
      });
    },
    [],
  );

  const setPendingLines = useCallback((lines: string[]) => {
    pendingRef.current = lines;
    setPending(lines);
  }, []);

  /**
   * Run one typed line. With lines already waiting at the continuation
   * prompt it is the next piece of their command; the whole thing is sent,
   * and only when the shell says it is complete does it run and join the
   * history.
   */
  const runOne = useCallback(
    async (line: string) => {
      // The directory as it was before the command ran: a `cd` belongs to the
      // prompt of the *next* line, exactly as in a terminal.
      const at = cwdRef.current;
      const lines = [...pendingRef.current, line];
      const continuation = pendingRef.current.length > 0;
      try {
        const result: CommandResult = await exec(lines.join("\n"), shell);
        if (result.incomplete) {
          append(line, { stdout: "", stderr: "", exitCode: 0 }, at, continuation);
          setPendingLines(lines);
          return;
        }
        cwdRef.current = result.cwd;
        setCwd(result.cwd);
        append(line, result, at, continuation);
      } catch (e) {
        append(line, { stdout: "", stderr: `${(e as Error).message}\n`, exitCode: 1 }, at, continuation);
      }
      if (continuation) setPendingLines([]);
      const recorded = joinForHistory(lines);
      setHistory((h) => [...h, recorded]);
      onRan?.(lines.join("\n"));
    },
    [append, exec, onRan, setPendingLines, shell],
  );

  const clear = useCallback(() => {
    setTranscript([]);
    setInput("");
  }, []);

  /** What one submitted line means, continuation prompt included. */
  const perform = useCallback(
    async (command: string) => {
      const continuing = pendingRef.current.length > 0;
      if (command === "clear" && !continuing) {
        clear();
        setHistory((h) => [...h, command]);
        return;
      }
      // A blank line is not a no-op in a shell: it echoes the prompt and
      // hands back a fresh one. Nothing runs and nothing joins the history,
      // which is also how bash treats it. At a `>` prompt it is a line of
      // the command, which a heredoc body may well need.
      if (command === "" && !continuing) {
        const id = (entryId.current += 1);
        promptAt.current.set(id, cwdRef.current);
        setTranscript((t) => [...t, { id, command: "", stdout: "", stderr: "", exitCode: 0 }]);
        return;
      }
      await runOne(command);
    },
    [clear, runOne],
  );

  const submit = useCallback(
    async (command: string) => {
      setInput("");
      if (busyRef.current) {
        queue.current.push(command);
        return;
      }
      busyRef.current = true;
      setBusy(true);
      try {
        await perform(command);
        while (queue.current.length) await perform(queue.current.shift()!);
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [perform],
  );

  /** Ctrl-C: the abandoned line is echoed with `^C`, as a terminal does,
   *  and a half-typed multi-line command is dropped with it. */
  const cancel = useCallback(
    (abandoned: string) => {
      const continuation = pendingRef.current.length > 0;
      append(`${abandoned}^C`, { stdout: "", stderr: "", exitCode: 130 }, cwdRef.current, continuation);
      setPendingLines([]);
      setInput("");
    },
    [append, setPendingLines],
  );

  /** Play several lines in order, each through the same path a typed line
   *  takes, so the state they leave behind is real. */
  const runLines = useCallback(
    async (lines: string[]) => {
      busyRef.current = true;
      setBusy(true);
      try {
        for (const line of lines) await runOne(line);
      } finally {
        busyRef.current = false;
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
        for (const line of entry.command.split("\n")) {
          lines.push(entry.continuation ? `> ${line}` : `${at} $ ${line}`);
        }
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
    setPendingLines([]);
    queue.current = [];
    promptAt.current = new Map();
    cwdRef.current = startCwd;
    setCwd(startCwd);
  }, [setPendingLines, startCwd]);

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
    /** True while lines wait at the `>` prompt. */
    continuation: pending.length > 0,
    submit,
    cancel,
    runLines,
    write,
    clear,
    reset,
    copyTranscript,
    pathCompletions,
    completions: SHELL_COMMANDS,
  };
}
