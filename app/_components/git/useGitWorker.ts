"use client";

/**
 * Owns the Git playground's Web Worker: one request in flight at a time (a
 * terminal is serial by nature), every response carrying a fresh `RepoState`
 * so the panels re-render after each command. The worker is a prebuilt static
 * asset, spawned from a plain URL string Turbopack leaves alone.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  EMPTY_STATE,
  type GitWorkerRequest,
  type GitWorkerResponse,
  type RepoState,
} from "./protocol";

/** `Omit` over a union collapses it to the shared keys, so distribute it:
 *  each member keeps its own payload fields. */
type WithoutId<T> = T extends { id: number } ? Omit<T, "id"> : never;

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  content?: string;
}

type Pending = {
  resolve: (r: CommandResult) => void;
  reject: (e: Error) => void;
};

export function useGitWorker(scenario: string) {
  const workerRef = useRef<Worker | null>(null);
  const pending = useRef(new Map<number, Pending>());
  const nextId = useRef(1);
  const [state, setState] = useState<RepoState>(EMPTY_STATE);
  // Which scenario finished seeding, rather than a bare boolean: a scenario
  // change then reads as not-ready by derivation, with no setState in an
  // effect body to trigger a cascading render.
  const [readyFor, setReadyFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ready = readyFor === scenario;

  useEffect(() => {
    let disposed = false;
    const inflight = pending.current;
    const worker = new Worker("/_workers/git-worker.js", { type: "module" });
    workerRef.current = worker;

    worker.addEventListener("message", (event: MessageEvent<GitWorkerResponse>) => {
      const msg = event.data;
      const entry = pending.current.get(msg.id);
      pending.current.delete(msg.id);
      if (!msg.ok) {
        entry?.reject(new Error(msg.error));
        return;
      }
      if (!disposed) setState(msg.state);
      entry?.resolve({
        stdout: msg.stdout,
        stderr: msg.stderr,
        exitCode: msg.exitCode,
        content: msg.content,
      });
    });

    worker.addEventListener("error", (event) => {
      if (!disposed) setError(event.message || "The Git runtime failed to start.");
    });

    return () => {
      disposed = true;
      worker.terminate();
      workerRef.current = null;
      inflight.clear();
    };
  }, []);

  const send = useCallback((req: WithoutId<GitWorkerRequest>): Promise<CommandResult> => {
    const worker = workerRef.current;
    if (!worker) return Promise.reject(new Error("Git runtime is not running."));
    const id = nextId.current++;
    return new Promise<CommandResult>((resolve, reject) => {
      pending.current.set(id, { resolve, reject });
      worker.postMessage({ ...req, id } as GitWorkerRequest);
    });
  }, []);

  // Seed once the worker exists, and again whenever the scenario changes.
  useEffect(() => {
    let cancelled = false;
    void send({ type: "init", scenario })
      .then(() => {
        if (!cancelled) setReadyFor(scenario);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [scenario, send]);

  const exec = useCallback((command: string) => send({ type: "exec", command }), [send]);
  const reset = useCallback(
    (next: string) => send({ type: "reset", scenario: next }),
    [send],
  );
  const readFile = useCallback((path: string) => send({ type: "readFile", path }), [send]);
  const writeFile = useCallback(
    (path: string, content: string) => send({ type: "writeFile", path, content }),
    [send],
  );

  return { state, ready, error, exec, reset, readFile, writeFile };
}
