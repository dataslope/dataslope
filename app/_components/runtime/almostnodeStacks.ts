/**
 * Error locations that point at the user's code.
 *
 * almostnode compiles each module inside a CommonJS wrapper via `eval`, so
 * V8 reports frames as `<anonymous>` at a line ~17 further down than the one
 * the user wrote, and every stack ends with a run of frames inside the
 * minified worker bundle. These helpers put the file name back, subtract the
 * wrapper's prologue, and drop the frames that are never actionable.
 *
 * The offset is measured at startup (see `measureWrapperOffset`) rather than
 * hard-coded, so an almostnode upgrade that changes the wrapper doesn't
 * silently start pointing at the wrong line.
 */

/** `file:line:col`, the last of which in a frame is the interesting one:
 *  an eval frame names its origin first and the eval'd location second. */
const LOCATION_RE = /([^\s()]+):(\d+):(\d+)/g;
const FRAME_RE = /^\s*at\s/;
const FUNCTION_NAME_RE = /^\s*at\s+(?:async\s+)?([^(]+?)\s*\(/;

export interface StackCleanOptions {
  /** Attributed to frames V8 could only call `<anonymous>`. */
  entryPath: string;
  /** Lines the module wrapper adds above the user's first line. */
  lineOffset: number;
  /** Files of this run, so only their frames get the offset subtracted. */
  userPaths?: ReadonlySet<string>;
  /** True for frames inside the worker bundle rather than user code. */
  isInternal?: (file: string) => boolean;
}

function defaultIsInternal(file: string): boolean {
  return (
    file.includes("/_workers/") ||
    file.includes("javascript-worker.js") ||
    file.includes("typescript-worker.js") ||
    file.includes("almostnode") ||
    file.startsWith("node:") ||
    file.includes("node_modules")
  );
}

/** A path inside the run's virtual filesystem — `/index.js`, `/lib/util.js`
 *  — as opposed to a URL for the worker bundle or a host file. */
function isVfsPath(file: string): boolean {
  return file.startsWith("/") && !file.includes("://");
}

/** One frame, rewritten to point at user code, or null when it points into
 *  the runtime's own machinery. */
export function cleanFrame(frame: string, options: StackCleanOptions): string | null {
  const isInternal = options.isInternal ?? defaultIsInternal;
  const matches = [...frame.matchAll(LOCATION_RE)];
  if (matches.length === 0) {
    // A frame with no location at all (`at new Promise (<anonymous>)`) is
    // noise from the runtime's plumbing.
    return null;
  }
  const [, rawFile, rawLine, rawColumn] = matches[matches.length - 1];
  const file = rawFile === "<anonymous>" ? options.entryPath : rawFile;
  // Only code the runtime eval'd carries the module wrapper's offset.
  const evaluated =
    isVfsPath(file) && (options.userPaths?.has(file) ?? true);
  if (!evaluated && isInternal(file)) return null;
  const line = evaluated
    ? Math.max(1, Number(rawLine) - options.lineOffset)
    : Number(rawLine);
  const name = FUNCTION_NAME_RE.exec(frame)?.[1]?.trim();
  const location = `${file}:${line}:${rawColumn}`;
  // A frame for the module body itself reads better without the eval name
  // V8 gives it.
  const isModuleBody = !name || name === "eval" || name === "<anonymous>";
  return isModuleBody ? `    at ${location}` : `    at ${name} (${location})`;
}

/**
 * Rewrite a stack so its frames name the user's files and lines. The message
 * lines above the first frame are kept as they are.
 */
export function cleanStack(stack: string, options: StackCleanOptions): string {
  const lines = stack.split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if (!FRAME_RE.test(line)) {
      out.push(line);
      continue;
    }
    const cleaned = cleanFrame(line, options);
    if (cleaned !== null) out.push(cleaned);
  }
  // Trailing blank lines look like truncation; drop them.
  while (out.length > 0 && out[out.length - 1].trim() === "") out.pop();
  return out.join("\n");
}

/**
 * Lines the wrapper adds, measured from a stack captured on line 1 of a
 * probe module. Null when the stack has no usable frame, in which case the
 * caller should leave line numbers alone rather than guess.
 */
export function measureWrapperOffset(probeStack: string): number | null {
  for (const line of probeStack.split("\n")) {
    if (!FRAME_RE.test(line)) continue;
    const matches = [...line.matchAll(LOCATION_RE)];
    if (matches.length === 0) continue;
    const reported = Number(matches[matches.length - 1][2]);
    if (!Number.isFinite(reported)) continue;
    return Math.max(0, reported - 1);
  }
  return null;
}

/** `//# sourceURL` makes V8 name the file in stacks instead of
 *  `<anonymous>`; it must be the last line of the source it names. */
export function withSourceUrl(source: string, path: string): string {
  return `${source}\n//# sourceURL=${path.startsWith("/") ? path : `/${path}`}`;
}
