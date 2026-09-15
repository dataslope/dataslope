"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  importProgressLabel,
  importProgressPercent,
  importProgressSizeText,
  LARGE_IMPORT_BYTES,
  type ImportProgress,
} from "../utils/importProgress";

/** Whole seconds since `startedAt`, ticking while mounted. A long restore
 *  has nothing else that visibly moves, so the clock is what separates
 *  "still working" from "wedged". */
function useElapsedSeconds(startedAt: number): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const tick = () =>
      setSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);
  return seconds;
}

export interface ImportProgressPanelProps {
  progress: ImportProgress;
}

/** Replaces the dropzone while an import runs: which phase it is on, how far
 *  the file read has got, the file's size, and an elapsed clock. */
export function ImportProgressPanel({ progress }: ImportProgressPanelProps) {
  const elapsed = useElapsedSeconds(progress.startedAt);
  const pct = importProgressPercent(progress);
  const label = importProgressLabel(progress);
  const sizeText = importProgressSizeText(progress);

  return (
    <div className="sql-import-progress">
      <div className="sql-import-progress-head">
        <Loader2
          size={15}
          className="sql-import-progress-spinner"
          aria-hidden="true"
        />
        {/* The live region is the label alone: announcing the byte counter or
            the clock would talk over every tick. */}
        <span className="sql-import-progress-label" role="status">
          {label}
          <span className="sql-import-progress-ellipsis" aria-hidden="true">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </span>
        {pct !== null && (
          <span className="sql-import-progress-pct">{pct}%</span>
        )}
      </div>
      <div
        className="sql-import-progress-bar"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        // Omitted while indeterminate, which is how a progressbar says it
        // does not know how far along it is.
        aria-valuenow={pct ?? undefined}
      >
        <div
          className={`sql-import-progress-fill${pct === null ? " indeterminate" : ""}`}
          style={pct === null ? undefined : { width: `${pct}%` }}
        />
      </div>
      <div className="sql-import-progress-meta">
        <span className="sql-import-progress-file" title={progress.filename}>
          {progress.filename}
          {sizeText && ` · ${sizeText}`}
        </span>
        <span className="sql-import-progress-elapsed">{elapsed}s</span>
      </div>
      {progress.totalBytes >= LARGE_IMPORT_BYTES && (
        <p className="sql-import-progress-hint">
          A file this size can take a while to load. Keep this tab open.
        </p>
      )}
    </div>
  );
}
