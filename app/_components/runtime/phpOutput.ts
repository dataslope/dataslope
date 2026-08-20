/**
 * Ordering and classification for PHP's output streams.
 *
 * php-wasm hands the host two streams, and the worker used to buffer each
 * to completion, pull the diagnostics out of stdout, and post stdout then
 * diagnostics then stderr. The chronology was destroyed: a warning about
 * record 400 arrived after all thousand lines of output, `error_log()`
 * landed below everything it was meant to annotate, and an uncaught
 * exception printed a bare `Stack trace:` heading four lines before the
 * sentence naming the exception.
 *
 * This router keeps arrival order instead. Text is classified a line at a
 * time as it arrives, consecutive lines on one channel coalesce into a
 * single cell, and a channel change opens the next cell. A partial line is
 * held until its newline so a diagnostic split across two writes is still
 * recognised.
 */

export type PhpChannel = "stdout" | "stderr" | "log";

/** One cell's worth of output, addressed by position in the run. */
export interface PhpOutputChunk {
  channel: PhpChannel;
  content: string;
  /** Cell index within the run. */
  seq: number;
  /** True when this text extends the cell at `seq` rather than replacing it. */
  append: boolean;
}

/** First line of a PHP diagnostic block. */
const DIAGNOSTIC_START_RE =
  /^(PHP\s+)?(Parse error|Fatal error|Warning|Notice|Deprecated|Strict Standards|Catchable fatal error)\b/i;

/** Lines that belong to the diagnostic block already in progress: the
 *  stack-trace heading, its frames, the `thrown in` tail, and any indented
 *  continuation. */
const DIAGNOSTIC_CONTINUATION_RE = /^(Stack trace:\s*$|#\d+\s|\s+\S)/;

/** A stack frame: `#0 /index.php(9): thrower()`. */
const STACK_FRAME_RE = /^#(\d+) (.*)$/;

/**
 * php-wasm reports every diagnostic as happening at request startup, which
 * is where its bootstrap evaluates the script. The line number that
 * follows is right, and the prefix contradicts it: this fires mid-script,
 * and there is no request.
 */
const REQUEST_STARTUP_PREFIX_RE = /\bPHP Request Startup:\s*/g;

/** php-wasm's label for the script it was handed. Errors quote it as if it
 *  were a path; the worker runs the entry from the VFS instead, so this is
 *  a fallback for anything that still slips through. */
export const PHP_WASM_SCRIPT_LABEL = "php-wasm run script";

export interface PhpOutputOptions {
  /** Path the entry file was staged at, for rewriting stray labels. */
  entryPath?: string;
}

/** Tidy a diagnostic line: drop the misleading startup prefix, and name
 *  the reader's file rather than php-wasm's internal label. */
export function normalizeDiagnostic(line: string, entryPath?: string): string {
  let out = line.replace(REQUEST_STARTUP_PREFIX_RE, "");
  if (entryPath) out = out.split(PHP_WASM_SCRIPT_LABEL).join(entryPath);
  return out;
}

export class PhpOutputRouter {
  private seq = -1;
  private channel: PhpChannel | null = null;
  /** Partial line held back until its newline arrives. */
  private pending = "";
  /** True while a diagnostic block is still absorbing its continuation. */
  private inDiagnostic = false;
  /** Frame number to print next, so dropping the harness frame leaves a
   *  trace numbered the way PHP numbers one. */
  private frameIndex = 0;

  constructor(
    private emit: (chunk: PhpOutputChunk) => void,
    private options: PhpOutputOptions = {},
  ) {}

  /**
   * Text from one of PHP's streams.
   *
   * `stdout` carries the program's own output *and*, because
   * `display_errors` is on, the diagnostics: those are separated here so
   * they can be styled as errors while staying where they happened.
   * `log` is the stderr stream itself, which in PHP is a destination
   * rather than a severity: `error_log()` is as often progress as it is
   * failure, so it is neither swallowed into stdout nor painted red.
   */
  write(stream: "stdout" | "stderr", text: string): void {
    if (!text) return;
    if (stream === "stderr") {
      // Not classified: everything on this stream is the program writing
      // to it deliberately.
      this.push("log", text);
      return;
    }
    this.pending += text;
    let newline = this.pending.indexOf("\n");
    while (newline !== -1) {
      const line = this.pending.slice(0, newline);
      this.pending = this.pending.slice(newline + 1);
      this.pushLine(line);
      newline = this.pending.indexOf("\n");
    }
  }

  /** Emit whatever is held back, at the end of a run. */
  flush(): void {
    if (this.pending) {
      const line = this.pending;
      this.pending = "";
      this.pushLine(line, false);
    }
  }

  private pushLine(line: string, withNewline = true): void {
    const suffix = withNewline ? "\n" : "";
    if (DIAGNOSTIC_START_RE.test(line)) {
      this.inDiagnostic = true;
      this.frameIndex = 0;
      this.push("stderr", normalizeDiagnostic(line, this.options.entryPath) + suffix);
      return;
    }
    if (this.inDiagnostic) {
      if (line.trim() === "") {
        // A blank line closes the block; PHP prints one after a fatal.
        this.inDiagnostic = false;
        this.push("stdout", suffix);
        return;
      }
      if (DIAGNOSTIC_CONTINUATION_RE.test(line)) {
        const frame = this.renumberFrame(line);
        // The harness frame is dropped entirely; nothing takes its place.
        if (frame !== null) {
          this.push("stderr", normalizeDiagnostic(frame, this.options.entryPath) + suffix);
        }
        return;
      }
      this.inDiagnostic = false;
    }
    this.push("stdout", this.rewriteLabel(line) + suffix);
  }

  /**
   * A stack frame, renumbered, or null for the one the runner itself adds.
   *
   * The entry file is executed with `require` so that it has a real path,
   * and `require` leaves a frame naming the harness. PHP would not have
   * printed it, so it goes, and the frames after it close the gap.
   */
  private renumberFrame(line: string): string | null {
    const match = line.match(STACK_FRAME_RE);
    if (!match) return line;
    if (match[2].includes(PHP_WASM_SCRIPT_LABEL)) return null;
    return `#${this.frameIndex++} ${match[2]}`;
  }

  private rewriteLabel(line: string): string {
    const entry = this.options.entryPath;
    if (!entry || !line.includes(PHP_WASM_SCRIPT_LABEL)) return line;
    return line.split(PHP_WASM_SCRIPT_LABEL).join(entry);
  }

  private push(channel: PhpChannel, content: string): void {
    if (!content) return;
    if (channel === this.channel) {
      this.emit({ channel, content, seq: this.seq, append: true });
      return;
    }
    this.channel = channel;
    this.seq += 1;
    this.emit({ channel, content, seq: this.seq, append: false });
  }
}
