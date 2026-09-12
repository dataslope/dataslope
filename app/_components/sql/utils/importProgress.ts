/** Progress reporting for the "drop a database file here" import dialogs
 *  shared by the SQL playgrounds (sqlite, postgres, duckdb).
 *
 *  A 100 MB `.db` file spends seconds being read off disk and more seconds
 *  being restored inside the engine worker. Before this existed the dialog
 *  went on showing an idle dropzone for the whole time, so the only hint
 *  that the drop had registered at all was the import eventually finishing,
 *  and the natural reading was that nothing had happened. */

/** Phase of an import. `reading` is the pass over the dropped file, which is
 *  byte-accurate; `working` is everything the engine does afterwards
 *  (restore, replay, schema read), which names a step instead. */
export type ImportStage = "reading" | "working";

export interface ImportProgress {
  filename: string;
  stage: ImportStage;
  /** The file's size in bytes, 0 when the browser reported none. */
  totalBytes: number;
  /** Bytes read so far. Only meaningful while `stage === "reading"`. */
  loadedBytes: number;
  /** What the engine is doing right now, e.g. "Restoring database". Only
   *  meaningful while `stage === "working"`. */
  step: string;
  /** `Date.now()` when the file was picked, for the elapsed clock. */
  startedAt: number;
}

/** Names the engine step an import is on. The dialogs hand one to the
 *  playground's import handler so its phases ("Replaying SQL dump",
 *  "Reading schema") reach the progress panel rather than hiding behind a
 *  single anonymous spinner. Labels are rendered with a trailing ellipsis,
 *  so they read as a present participle and carry none of their own. */
export type ImportStepReporter = (step: string) => void;

/** First step shown once a file has been read, until the handler reports a
 *  more specific one. */
export const DEFAULT_IMPORT_STEP = "Importing";

/** Files at least this big are worth warning about: the import can take long
 *  enough that a reader wonders whether the tab is stuck. Sample databases
 *  and hand-written dumps sit well below it. */
export const LARGE_IMPORT_BYTES = 8 * 1024 * 1024;

/** Byte count for humans, e.g. "98.4 MB". Mirrors the workspace badge's
 *  formatter: one decimal below 10 of a unit, none above. */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Completion percentage for the progress bar, or null when this phase has
 *  no measurable fraction and the bar should animate indeterminately: engine
 *  work (the worker reports steps, not bytes), and a read that has not
 *  reported its first chunk yet. */
export function importProgressPercent(progress: ImportProgress): number | null {
  if (progress.stage !== "reading") return null;
  if (progress.totalBytes <= 0 || progress.loadedBytes <= 0) return null;
  const pct = (progress.loadedBytes / progress.totalBytes) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

/** The line the panel shows above the bar. */
export function importProgressLabel(progress: ImportProgress): string {
  if (progress.stage === "reading") return "Reading file";
  return progress.step || DEFAULT_IMPORT_STEP;
}

/** The size line under the bar: how far the read has got, or the whole size
 *  once the engine has the bytes. */
export function importProgressSizeText(progress: ImportProgress): string {
  if (progress.totalBytes <= 0) return "";
  if (progress.stage === "reading" && progress.loadedBytes > 0) {
    return `${formatFileSize(progress.loadedBytes)} of ${formatFileSize(progress.totalBytes)}`;
  }
  return formatFileSize(progress.totalBytes);
}

/** Resolves after the browser has had a chance to paint. Put one in front of
 *  a step that blocks the main thread (decoding a 100 MB dump to text, say),
 *  or the label naming it never reaches the screen before the freeze. */
export function yieldToPaint(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame !== "function") {
      setTimeout(resolve, 0);
      return;
    }
    // rAF fires before the paint, so hand back on the task after it.
    requestAnimationFrame(() => setTimeout(resolve, 0));
  });
}

export interface FileReadHandlers<T> {
  /** Called as bytes arrive. `totalBytes` falls back to the file's size when
   *  the progress event reports none. */
  onProgress?: (loadedBytes: number, totalBytes: number) => void;
  onDone: (result: T) => void;
  /** Read failures used to be swallowed: a file the browser could not read
   *  (revoked permission, a device that went away mid-read) left the dialog
   *  sitting there as if nothing had been dropped. */
  onError: (message: string) => void;
}

export interface FileReadHandle {
  /** Stop the read. No handler fires afterwards. */
  abort: () => void;
}

/** Signature shared by {@link readFileAsText} and {@link readFileAsBytes},
 *  so a caller can be handed whichever one its import path needs. */
export type FileReadStarter<T> = (
  file: File,
  handlers: FileReadHandlers<T>,
) => FileReadHandle;

const READ_FAILED = "The file could not be read.";

function startRead<T>(
  file: File,
  handlers: FileReadHandlers<T>,
  extract: (result: FileReader["result"]) => T | null,
  begin: (reader: FileReader) => void,
): FileReadHandle {
  const reader = new FileReader();
  let settled = false;
  reader.onprogress = (ev) => {
    if (settled) return;
    // `lengthComputable` is false for some sources; the File's own size is
    // the better total there.
    handlers.onProgress?.(ev.loaded, ev.total || file.size);
  };
  reader.onload = () => {
    if (settled) return;
    const value = extract(reader.result);
    settled = true;
    if (value === null) {
      handlers.onError(READ_FAILED);
      return;
    }
    // Browsers do not always emit a final 100% progress event; without this
    // the bar could hand over to the engine phase stuck at 90-something.
    handlers.onProgress?.(file.size, file.size);
    handlers.onDone(value);
  };
  reader.onerror = () => {
    if (settled) return;
    settled = true;
    handlers.onError(reader.error?.message || READ_FAILED);
  };
  begin(reader);
  return {
    abort: () => {
      if (settled) return;
      settled = true;
      reader.abort();
    },
  };
}

/** Read a file as text (a `.sql` dump), reporting progress. */
export function readFileAsText(
  file: File,
  handlers: FileReadHandlers<string>,
): FileReadHandle {
  return startRead(
    file,
    handlers,
    (result) => (typeof result === "string" ? result : null),
    (reader) => reader.readAsText(file),
  );
}

/** Read a file as bytes (a SQLite image, or a dump sniffed by its header),
 *  reporting progress. */
export function readFileAsBytes(
  file: File,
  handlers: FileReadHandlers<Uint8Array>,
): FileReadHandle {
  return startRead(
    file,
    handlers,
    (result) => (result instanceof ArrayBuffer ? new Uint8Array(result) : null),
    (reader) => reader.readAsArrayBuffer(file),
  );
}
