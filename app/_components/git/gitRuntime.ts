"use client";

/**
 * One Git Worker per page, many repositories inside it.
 *
 * The design addendum flags the `getSharedRuntime` trap: sharing a worker
 * between blocks is cheap, but sharing *repo state* would make block 2
 * silently inherit block 1's commits. So the worker is a module singleton and
 * every request names a session; a block gets its own session unless it opts
 * into continuity with an explicit `repo` id.
 *
 * The worker is a prebuilt static asset, spawned from a plain URL string that
 * Turbopack leaves alone.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  EMPTY_STATE,
  SESSION_ROOTS,
  type GitWorkerRequest,
  type GitWorkerResponse,
  type RepoState,
  type SessionKind,
} from "./protocol";

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  content?: string;
  /**
   * The working directory the session is in now the command has run. The
   * subscribed React state carries this too, but a caller running several
   * commands in a row cannot see it: state does not update until the loop
   * yields to a render. Reading it off each result is what lets a `cd` show
   * up on the prompt of the very next line.
   */
  cwd: string;
}

type Pending = { resolve: (r: CommandResult) => void; reject: (e: Error) => void };
type StateListener = (state: RepoState) => void;

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();
/** Which session each in-flight request belongs to, so its result can reach
 *  every block watching that repository rather than only the caller. */
const requestSession = new Map<number, string>();
const subscribers = new Map<string, Set<StateListener>>();
let refCount = 0;

function ensureWorker(): Worker {
  if (worker) return worker;
  const w = new Worker("/_workers/git-worker.js", { type: "module" });
  w.addEventListener("message", (event: MessageEvent<GitWorkerResponse>) => {
    const msg = event.data;
    const entry = pending.get(msg.id);
    const session = requestSession.get(msg.id);
    pending.delete(msg.id);
    requestSession.delete(msg.id);
    if (!msg.ok) {
      entry?.reject(new Error(msg.error));
      return;
    }
    // Every block on this repository, not just the one that asked: blocks
    // sharing a `repo` id must not disagree about its state.
    if (session) for (const listener of subscribers.get(session) ?? []) listener(msg.state);
    entry?.resolve({
      stdout: msg.stdout,
      stderr: msg.stderr,
      exitCode: msg.exitCode,
      content: msg.content,
      cwd: msg.state.cwd,
    });
  });
  w.addEventListener("error", () => {
    for (const [, entry] of pending) entry.reject(new Error("The Git runtime failed to start."));
    pending.clear();
    requestSession.clear();
  });
  worker = w;
  return w;
}

/** `Omit` over a union collapses it to the shared keys, so distribute it. */
type WithoutId<T> = T extends { id: number } ? Omit<T, "id"> : never;

function request(req: WithoutId<GitWorkerRequest>): Promise<CommandResult> {
  const w = ensureWorker();
  const id = nextId++;
  requestSession.set(id, req.session);
  return new Promise<CommandResult>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ ...req, id } as GitWorkerRequest);
  });
}

/** Shared sessions seeded this page-load, so the second block sharing a repo
 *  id attaches rather than wiping the first block's work. */
const seededRepos = new Set<string>();

/** Distinct id per mounted block, so two `<GitBlock>`s without a `repo` prop
 *  never collide. */
let sessionSeq = 0;
const nextSessionId = (prefix: string) => `${prefix}-${(sessionSeq += 1)}`;

export interface GitSession {
  state: RepoState;
  ready: boolean;
  error: string | null;
  /** Run a line in the session's main shell, or in a named one. */
  exec: (command: string, shell?: string) => Promise<CommandResult>;
  /** Open another shell over the same filesystem, optionally in a directory. */
  openShell: (shell: string, cwd?: string) => Promise<CommandResult>;
  closeShell: (shell: string) => Promise<CommandResult>;
  reset: () => Promise<CommandResult>;
  readFile: (path: string) => Promise<CommandResult>;
  writeFile: (path: string, content: string) => Promise<CommandResult>;
  sessionId: string;
}

/**
 * Subscribe to one session. `repo` names a shared one (blocks with the same id
 * continue each other in document order); omit it for an isolated one. `kind`
 * picks the engine: a bash session skips every git read.
 */
export function useGitSession(
  scenario: string,
  repo?: string,
  kind: SessionKind = "git",
): GitSession {
  const [sessionId] = useState(() => repo ?? nextSessionId("block"));
  // Seeded with the kind's own root so a shell block's prompt does not read
  // `/repo` for the moment before the worker answers.
  const [state, setState] = useState<RepoState>(() => ({
    ...EMPTY_STATE,
    kind,
    cwd: SESSION_ROOTS[kind],
  }));
  const [readyFor, setReadyFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const ready = readyFor === `${sessionId}:${scenario}:${kind}`;

  const track = useCallback((next: RepoState) => {
    if (mounted.current) setState(next);
  }, []);

  useEffect(() => {
    mounted.current = true;
    refCount += 1;
    const set = subscribers.get(sessionId) ?? new Set<StateListener>();
    set.add(track);
    subscribers.set(sessionId, set);
    return () => {
      mounted.current = false;
      refCount -= 1;
      set.delete(track);
      if (set.size === 0) subscribers.delete(sessionId);
      // Last block on the page leaves: drop the worker so a route change does
      // not leak a 437 KiB runtime plus every repository it was holding.
      if (refCount === 0 && worker) {
        worker.terminate();
        worker = null;
        pending.clear();
        requestSession.clear();
        subscribers.clear();
        // The sessions died with the worker, so the next mount has to seed
        // again. Without this a remount attaches to a session that no longer
        // exists and the learner gets an empty repository.
        seededRepos.clear();
      }
    };
  }, [sessionId, track]);

  // A shared session is seeded once, by whichever block mounts first; the rest
  // attach to it. Both paths resolve asynchronously, so neither races the
  // other and neither calls setState from an effect body.
  useEffect(() => {
    let cancelled = false;
    const key = `${sessionId}:${scenario}:${kind}`;
    const first = !repo || !seededRepos.has(key);
    if (repo) seededRepos.add(key);
    const req = first
      ? ({ type: "init", session: sessionId, scenario, kind } as const)
      : ({ type: "attach", session: sessionId } as const);
    void request(req)
      .then(() => {
        if (!cancelled) setReadyFor(key);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [scenario, sessionId, repo, kind, track]);

  // The request functions depend only on the session, not on its state, so
  // they keep their identity across responses. A file editor that reloads
  // when `readFile` changes would otherwise reset its draft on every command.
  const exec = useCallback(
    (command: string, shell?: string) =>
      request({ type: "exec", session: sessionId, command, ...(shell ? { shell } : {}) }),
    [sessionId],
  );
  const openShell = useCallback(
    (shell: string, cwd?: string) =>
      request({ type: "openShell", session: sessionId, shell, ...(cwd ? { cwd } : {}) }),
    [sessionId],
  );
  const closeShell = useCallback(
    (shell: string) => request({ type: "closeShell", session: sessionId, shell }),
    [sessionId],
  );
  const resetSession = useCallback(() => {
    seededRepos.delete(`${sessionId}:${scenario}:${kind}`);
    return request({ type: "reset", session: sessionId, scenario, kind });
  }, [sessionId, scenario, kind]);
  const readFile = useCallback(
    (path: string) => request({ type: "readFile", session: sessionId, path }),
    [sessionId],
  );
  const writeFile = useCallback(
    (path: string, content: string) =>
      request({ type: "writeFile", session: sessionId, path, content }),
    [sessionId],
  );

  return useMemo<GitSession>(
    () => ({ state, ready, error, sessionId, exec, openShell, closeShell, reset: resetSession, readFile, writeFile }),
    [state, ready, error, sessionId, exec, openShell, closeShell, resetSession, readFile, writeFile],
  );
}

