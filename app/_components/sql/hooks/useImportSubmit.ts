"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseImportSubmitResult {
  /** True from the click until the import settles. */
  importing: boolean;
  /** Start the import, unless one from this dialog is already running. */
  submit: () => void;
}

/**
 * Busy state for the Import button of the CSV / JSON / Parquet dialogs.
 *
 * Writing a 17,000-row Parquet file into the engine takes seconds, and the
 * button used to sit there looking clickable the whole time: nothing said the
 * click had registered, and a second click started a second import of the
 * same rows. `run` should return the import's promise; it is expected to
 * report its own failures, so a rejection only ends the busy state.
 */
export function useImportSubmit(run: () => unknown): UseImportSubmitResult {
  const [importing, setImporting] = useState(false);
  // State lags a render behind the click; the ref closes the gap for a
  // double click that lands before the button has re-rendered as disabled.
  const inFlight = useRef(false);
  const runRef = useRef(run);
  const mounted = useRef(false);

  useEffect(() => {
    runRef.current = run;
  });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const submit = useCallback(() => {
    if (inFlight.current) return;
    inFlight.current = true;
    setImporting(true);
    void Promise.resolve()
      .then(() => runRef.current())
      .catch(() => {
        /* the import reports its own errors */
      })
      .finally(() => {
        inFlight.current = false;
        if (mounted.current) setImporting(false);
      });
  }, []);

  return { importing, submit };
}
