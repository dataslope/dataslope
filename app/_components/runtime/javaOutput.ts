/**
 * Ordering, streaming and stack-trace cleanup for the Java playground.
 *
 * CheerpJ hands the host `System.out` and `System.err` as `console.log` and
 * `console.error` calls, one per write. The runtime used to concatenate
 * both to the end of the run and emit two cells, which meant a program that
 * never finished printed nothing at all — the single thing a learner most
 * needs when a program is stuck. This router emits as the writes arrive,
 * coalescing a run of writes on one stream into one growing cell so the two
 * streams keep the interleaving the JVM gave them.
 *
 * It also takes back out what `__DataslopeMain` puts in. Invoking `main`
 * reflectively appends the accessor frames and the launcher frame to every
 * trace; they are noise the user cannot act on, and they inflate the
 * `... N more` counts of every `Caused by:` block below them.
 */

import { LAUNCHER_CLASS } from "./javaBuild";

export type JavaChannel = "stdout" | "stderr";

/** One cell's worth of output, addressed by position in the run. */
export interface JavaOutputChunk {
  channel: JavaChannel;
  content: string;
  /** Cell index within the run. */
  seq: number;
  /** True when this text extends the cell at `seq` rather than opening it. */
  append: boolean;
}

/** `\tat __DataslopeMain.main(...)` — the launcher's own frame. */
const LAUNCHER_FRAME_RE = new RegExp(`^\\s+at (?:\\S+/)?${LAUNCHER_CLASS}\\.`);

/**
 * The reflection frames between the user's `main` and the launcher.
 *
 * Java 8 routes `Method.invoke` through `sun.reflect.*`; later releases use
 * `jdk.internal.reflect.*` and prefix a module name. Both are matched so
 * the same cleanup holds if CheerpJ ever ships a newer OpenJDK.
 */
const REFLECTION_FRAME_RE =
  /^\s+at (?:[\w.]+\/)?(?:sun\.reflect\.|jdk\.internal\.reflect\.|java\.lang\.reflect\.Method\.invoke)/;

/** `\t... 5 more`, the frames a `Caused by:` block shares with its parent. */
const MORE_FRAMES_RE = /^(\s*)\.\.\. (\d+) more\s*$/;

export interface JavaOutputOptions {
  /** Index of this run's first cell, so compile diagnostics can take 0. */
  firstSeq?: number;
}

export class JavaOutputRouter {
  private seq: number;
  private channel: JavaChannel | null = null;
  /** Text of the line in progress that has not been emitted yet. */
  private lineBuffer = "";
  /** True when part of the line in progress has already gone out, so its
   *  remainder must be emitted verbatim rather than re-classified. */
  private linePartlyEmitted = false;
  /** Frames held back while it is still unknown whether they precede the
   *  launcher frame (drop them) or ordinary code (print them). */
  private heldFrames: string[] = [];
  /** How many frames the trace in progress lost, to keep `... N more`
   *  counting the frames the reader can actually see. */
  private strippedFrames = 0;
  /** Channel of the cell currently open, or null before the first write. */
  private openChannel: JavaChannel | null = null;

  constructor(
    private emit: (chunk: JavaOutputChunk) => void,
    options: JavaOutputOptions = {},
  ) {
    this.seq = options.firstSeq ?? 0;
  }

  /** Text from one of the JVM's two streams, exactly as written. */
  write(channel: JavaChannel, text: string): void {
    if (!text) return;
    if (this.channel !== null && channel !== this.channel) {
      // A stream change ends whatever line was in progress on the other
      // one: the streams are separate cells and cannot share a line.
      this.flushLine();
      this.flushHeldFrames();
    }
    this.channel = channel;

    this.lineBuffer += text;
    let newline = this.lineBuffer.indexOf("\n");
    while (newline !== -1) {
      const line = this.lineBuffer.slice(0, newline + 1);
      this.lineBuffer = this.lineBuffer.slice(newline + 1);
      if (this.linePartlyEmitted) {
        this.linePartlyEmitted = false;
        this.push(channel, line);
      } else {
        this.pushLine(channel, line);
      }
      newline = this.lineBuffer.indexOf("\n");
    }

    // A line still waiting for its newline goes out immediately unless it
    // is indented, which is what a stack-trace continuation looks like and
    // those have to be seen whole. `System.out.print("Enter your name: ")`
    // is a prompt, and a prompt held back until the program exits is not a
    // prompt.
    if (
      this.lineBuffer &&
      !this.linePartlyEmitted &&
      !this.lineBuffer.startsWith("\t") &&
      !this.lineBuffer.startsWith(" ")
    ) {
      this.flushHeldFrames();
      this.push(channel, this.lineBuffer);
      this.lineBuffer = "";
      this.linePartlyEmitted = true;
    }
  }

  /** Emit everything held back, at the end of a run. */
  flush(): void {
    this.flushLine();
    this.flushHeldFrames();
  }

  /** Cell index the next chunk would open, so callers can tell whether the
   *  run produced anything. */
  get nextSeq(): number {
    return this.openChannel === null ? this.seq : this.seq + 1;
  }

  private flushLine(): void {
    if (!this.lineBuffer) return;
    const line = this.lineBuffer;
    this.lineBuffer = "";
    if (this.linePartlyEmitted) {
      this.linePartlyEmitted = false;
      this.push(this.channel ?? "stdout", line);
    } else {
      this.pushLine(this.channel ?? "stdout", line);
    }
  }

  /** Classify one complete line (newline included, except at end of run). */
  private pushLine(channel: JavaChannel, line: string): void {
    if (LAUNCHER_FRAME_RE.test(line)) {
      // The launcher frame and everything held above it are the harness,
      // not the program. Reset rather than accumulate: each trace has one
      // launcher block, and the `... N more` lines below it count against
      // that block alone.
      this.strippedFrames = this.heldFrames.length + 1;
      this.heldFrames = [];
      return;
    }
    if (REFLECTION_FRAME_RE.test(line)) {
      this.heldFrames.push(line);
      return;
    }
    this.flushHeldFrames();

    // A line at the left margin that is not a continuation starts something
    // new, so the frame count from the last trace stops applying.
    if (!/^\s/.test(line) && !/^(Caused by|Suppressed):/.test(line)) {
      this.strippedFrames = 0;
    }

    const more = MORE_FRAMES_RE.exec(line.replace(/\n$/, ""));
    if (more && this.strippedFrames > 0) {
      const remaining = Number(more[2]) - this.strippedFrames;
      if (remaining <= 0) return;
      this.push(channel, `${more[1]}... ${remaining} more\n`);
      return;
    }
    this.push(channel, line);
  }

  /** Frames that turned out to be the program's own reflection, not ours. */
  private flushHeldFrames(): void {
    if (this.heldFrames.length === 0) return;
    const frames = this.heldFrames;
    this.heldFrames = [];
    for (const frame of frames) this.push(this.channel ?? "stderr", frame);
  }

  private push(channel: JavaChannel, content: string): void {
    if (!content) return;
    const opening = this.openChannel !== channel;
    if (opening) {
      this.seq = this.openChannel === null ? this.seq : this.seq + 1;
      this.openChannel = channel;
    }
    this.emit({ channel, content, seq: this.seq, append: !opening });
  }
}
