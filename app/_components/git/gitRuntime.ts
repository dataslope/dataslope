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
  type GitWorkerRequest,
  type GitWorkerResponse,
  type RepoState,
} from "./protocol";

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  content?: string;
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
  exec: (command: string) => Promise<CommandResult>;
  reset: () => Promise<CommandResult>;
  readFile: (path: string) => Promise<CommandResult>;
  writeFile: (path: string, content: string) => Promise<CommandResult>;
  sessionId: string;
}

/**
 * Subscribe to one repository. `repo` names a shared session (blocks with the
 * same id continue each other in document order); omit it for an isolated one.
 */
export function useGitSession(scenario: string, repo?: string): GitSession {
  const [sessionId] = useState(() => repo ?? nextSessionId("block"));
  const [state, setState] = useState<RepoState>(EMPTY_STATE);
  const [readyFor, setReadyFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const ready = readyFor === `${sessionId}:${scenario}`;

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
      }
    };
  }, [sessionId, track]);

  // A shared session is seeded once, by whichever block mounts first; the rest
  // attach to it. Both paths resolve asynchronously, so neither races the
  // other and neither calls setState from an effect body.
  useEffect(() => {
    let cancelled = false;
    const key = `${sessionId}:${scenario}`;
    const first = !repo || !seededRepos.has(key);
    if (repo) seededRepos.add(key);
    const req = first
      ? ({ type: "init", session: sessionId, scenario } as const)
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
  }, [scenario, sessionId, repo, track]);

  return useMemo<GitSession>(
    () => ({
      state,
      ready,
      error,
      sessionId,
      exec: (command) => request({ type: "exec", session: sessionId, command }),
      reset: () => {
        seededRepos.delete(`${sessionId}:${scenario}`);
        return request({ type: "reset", session: sessionId, scenario });
      },
      readFile: (path) => request({ type: "readFile", session: sessionId, path }),
      writeFile: (path, content) =>
        request({ type: "writeFile", session: sessionId, path, content }),
    }),
    [state, ready, error, sessionId, scenario],
  );
}

