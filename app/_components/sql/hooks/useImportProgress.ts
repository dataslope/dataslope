"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_IMPORT_STEP,
  type FileReadHandle,
  type FileReadStarter,
  type ImportProgress,
  type ImportStepReporter,
} from "../utils/importProgress";

/** Whatever an import handler returns. Handlers that hand back a promise keep
 *  the progress panel up until the engine is actually done; one that returns
 *  nothing (because it still needs a decision from the user, like the dump
 *  dialog's "where should this go?") drops the panel right away. */
type ImportResult = void | Promise<unknown>;

function isPromiseLike(value: ImportResult): value is Promise<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Promise<unknown>).then === "function"
  );
}

export interface UseImportProgressResult {
  /** The live phase, or null when no import is in flight. */
  progress: ImportProgress | null;
  /** Read failure message, cleared when the next file is picked. */
  readError: string | null;
  /** True once the bytes are with the engine. The import can no longer be
   *  cancelled and the dialog must not be dismissed out from under it. */
  working: boolean;
  /** Read `file` with byte progress, then hand the result to `run`, which
   *  returns the import's promise (or nothing when the dialog needs another
   *  decision from the user first). */
  startRead: <T>(
    file: File,
    read: FileReadStarter<T>,
    run: (value: T, report: ImportStepReporter) => ImportResult,
  ) => void;
  /** Start the engine phase for a file that has already been read, e.g. the
   *  dump dialog's import-after-choosing-a-target step. */
  startWork: (
    filename: string,
    totalBytes: number,
    run: (report: ImportStepReporter) => ImportResult,
  ) => void;
  /** Abort a read in flight and take the panel down. */
  cancelRead: () => void;
  /** Drop the panel and any error, e.g. when the dialog closes. */
  reset: () => void;
}

/** Progress state for one import dialog: which phase it is in, how far the
 *  read has got, and which engine step is running. */
export function useImportProgress(): UseImportProgressResult {
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const readHandleRef = useRef<FileReadHandle | null>(null);
  // Runs are numbered so a stale one (cancelled read, a second file dropped
  // while the first was still going) cannot clear or relabel the panel that
  // now belongs to a later run.
  const runIdRef = useRef(0);

  const beginRun = useCallback(() => {
    readHandleRef.current?.abort();
    readHandleRef.current = null;
    setReadError(null);
    return ++runIdRef.current;
  }, []);

  /** `setProgress` that no-ops once this run has been superseded. */
  const patch = useCallback(
    (runId: number, fields: Partial<ImportProgress>) => {
      setProgress((prev) =>
        prev && runIdRef.current === runId ? { ...prev, ...fields } : prev,
      );
    },
    [],
  );

  /** Hand off to an import handler: label the step it reports, and keep the
   *  panel up until its promise settles. */
  const runImport = useCallback(
    (runId: number, run: (report: ImportStepReporter) => ImportResult) => {
      const result = run((step) => patch(runId, { step }));
      if (!isPromiseLike(result)) {
        // Synchronously, so React batches it with the state above and the
        // panel never flashes a step it is not going to stay on.
        if (runIdRef.current === runId) setProgress(null);
        return;
      }
      void result.finally(() => {
        if (runIdRef.current === runId) setProgress(null);
      });
    },
    [patch],
  );

  const startRead = useCallback(
    <T,>(
      file: File,
      read: FileReadStarter<T>,
      run: (value: T, report: ImportStepReporter) => ImportResult,
    ) => {
      const runId = beginRun();
      setProgress({
        filename: file.name,
        stage: "reading",
        totalBytes: file.size,
        loadedBytes: 0,
        step: "",
        startedAt: Date.now(),
      });
      readHandleRef.current = read(file, {
        onProgress: (loadedBytes, totalBytes) =>
          patch(runId, { loadedBytes, totalBytes }),
        onDone: (value) => {
          if (runIdRef.current !== runId) return;
          readHandleRef.current = null;
          patch(runId, { stage: "working", step: DEFAULT_IMPORT_STEP });
          runImport(runId, (report) => run(value, report));
        },
        onError: (message) => {
          if (runIdRef.current !== runId) return;
          readHandleRef.current = null;
          setProgress(null);
          setReadError(message);
        },
      });
    },
    [beginRun, patch, runImport],
  );

  const startWork = useCallback(
    (
      filename: string,
      totalBytes: number,
      run: (report: ImportStepReporter) => ImportResult,
    ) => {
      const runId = beginRun();
      setProgress({
        filename,
        stage: "working",
        totalBytes,
        loadedBytes: totalBytes,
        step: DEFAULT_IMPORT_STEP,
        startedAt: Date.now(),
      });
      runImport(runId, run);
    },
    [beginRun, runImport],
  );

  const cancelRead = useCallback(() => {
    runIdRef.current += 1;
    readHandleRef.current?.abort();
    readHandleRef.current = null;
    setProgress(null);
  }, []);

  const reset = useCallback(() => {
    runIdRef.current += 1;
    readHandleRef.current?.abort();
    readHandleRef.current = null;
    setProgress(null);
    setReadError(null);
  }, []);

  // A dialog can unmount mid-read (route change, playground switch); the
  // reader would otherwise keep chewing through a 100 MB file for nobody.
  useEffect(
    () => () => {
      readHandleRef.current?.abort();
      readHandleRef.current = null;
    },
    [],
  );

  return {
    progress,
    readError,
    working: progress?.stage === "working",
    startRead,
    startWork,
    cancelRead,
    reset,
  };
}
