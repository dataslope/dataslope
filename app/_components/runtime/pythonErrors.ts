/**
 * Making a Pyodide failure readable.
 *
 * Two things stand between the user and their actual error: the interpreter
 * harness (Pyodide's `eval_code_async` plumbing plus the `<exec>` wrapper
 * pyodide-worker.ts compiles around a block) shows up as five frames above
 * the user's own, and a request the *browser* refused for cross-origin
 * reasons surfaces as sixty lines of urllib3 internals that never say
 * "CORS". Both are string-level fixes applied at the moment a run fails, so
 * they're kept here, out of the worker, and pinned by
 * `__tests__/pythonErrors.test.ts`.
 */

/** Traceback frames belonging to the harness rather than the user. */
function isHarnessFrame(filename: string): boolean {
  return (
    filename === "<exec>" ||
    /^\/lib\/python[\d.]*\.zip\//.test(filename) ||
    filename.includes("/_pyodide/")
  );
}

/**
 * Strip harness frames from a Python traceback.
 *
 * A frame is the `  File "…", line N, in name` line plus the source lines
 * indented under it; anything at column 0 (the `Traceback …` header, the
 * final `ValueError: boom`, the "During handling of the above exception"
 * joiners) is kept, so chained exceptions survive intact.
 *
 * Returns the input unchanged when no frame would survive — a failure
 * inside the harness itself is better shown raw than shown empty.
 */
export function cleanPythonTraceback(message: string): string {
  if (!message.includes('File "')) return message;
  const lines = message.split("\n");
  const out: string[] = [];
  let dropping = false;
  let keptFrames = 0;
  let droppedAny = false;
  for (const line of lines) {
    const frame = /^\s+File "(.*)", line \d+/.exec(line);
    if (frame) {
      dropping = isHarnessFrame(frame[1]);
      if (dropping) droppedAny = true;
      else {
        keptFrames += 1;
        out.push(line);
      }
      continue;
    }
    // Continuation lines (the echoed source, `...<9 lines>...`) belong to
    // the frame above them; a line at column 0 ends the frame list.
    if (dropping && /^\s/.test(line)) continue;
    dropping = false;
    out.push(line);
  }
  if (!droppedAny || keptFrames === 0) return message;
  return out.join("\n");
}

/** Signature of a request the browser refused for cross-origin reasons.
 *  urllib3's emscripten backend reports it as a timeout or a bare
 *  `AbortError`, neither of which mentions the browser or CORS. */
const CORS_FAILURE_RE =
  /urllib3\.contrib\.emscripten|AbortError: signal is aborted|_TimeoutError/;

const CORS_HINT =
  "This request was blocked by the browser, not by Python: the site didn't " +
  "send an Access-Control-Allow-Origin header, so the page isn't allowed to " +
  "read the response. Try a host that allows it (raw.githubusercontent.com " +
  "does), or upload the file in the Files panel and read it with open().";

/** Prepend a plain-language explanation to browser-level network failures. */
export function annotateRunError(message: string): string {
  if (CORS_FAILURE_RE.test(message)) return `${CORS_HINT}\n\n${message}`;
  return message;
}
