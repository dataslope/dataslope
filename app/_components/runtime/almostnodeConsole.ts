/**
 * The `console` the JavaScript and TypeScript playgrounds hand to user code.
 *
 * almostnode's console wrapper forwards `log`/`error`/`warn`/`info`/`debug`/
 * `trace`/`dir` to the runtime's output callback and binds everything else
 * straight to the worker's own console — so `group`, `count`, `time`,
 * `assert` and `table` were functions that produced nothing at all, which
 * user code cannot even feature-detect its way around. Replacing the
 * worker's global console is what makes those methods reach the output pane:
 * the wrapper binds to whatever `console` is when a module is compiled.
 */
import { formatConsoleArgs, inspect, type InspectOptions } from "./nodeInspect.ts";

export type OutputChannel = "stdout" | "stderr";

export interface ConsoleSink {
  /** Append text verbatim; the console adds its own newlines. */
  write(channel: OutputChannel, text: string): void;
}

/** Node's `console.time` durations: ms under a second, then seconds. */
export function formatDuration(ms: number): string {
  if (ms >= 60_000) {
    const minutes = Math.floor(ms / 60_000);
    const seconds = (ms % 60_000) / 1000;
    return `${minutes}:${seconds.toFixed(3).padStart(6, "0")} (m:ss.mmm)`;
  }
  if (ms >= 1000) return `${(ms / 1000).toFixed(3)}s`;
  return `${ms.toFixed(3)}ms`;
}

// ─── console.table ──────────────────────────────────────────────────────

const INDEX_COLUMN = "(index)";
const VALUES_COLUMN = "Values";

/** Cell text for a table entry. Node inspects every value, so a string cell
 *  shows its quotes and is distinguishable from a number. */
function tableCell(value: unknown): string {
  if (value === undefined) return "";
  return inspect(value, { depth: 0, breakLength: Infinity });
}

function renderTable(rows: Array<Array<string>>, widths: number[]): string {
  const line = (left: string, mid: string, right: string) =>
    left + widths.map((w) => "─".repeat(w + 2)).join(mid) + right;
  const body = rows.map(
    (cells) =>
      "│" +
      cells.map((cell, i) => ` ${cell.padEnd(widths[i])} `).join("│") +
      "│",
  );
  return [
    line("┌", "┬", "┐"),
    body[0],
    line("├", "┼", "┤"),
    ...body.slice(1),
    line("└", "┴", "┘"),
  ].join("\n");
}

/** `console.table` as Node draws it: an index column, one column per key
 *  found across the rows, and a `Values` column for primitives. */
export function formatTable(data: unknown, columns?: string[]): string {
  if (data === null || typeof data !== "object") return formatConsoleArgs([data]);

  const entries: Array<[string, unknown]> = Array.isArray(data)
    ? data.map((value, i) => [String(i), value])
    : Object.entries(data as Record<string, unknown>);

  const keys: string[] = [];
  let hasValuesColumn = false;
  for (const [, value] of entries) {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      for (const key of Object.keys(value as Record<string, unknown>)) {
        if (!keys.includes(key)) keys.push(key);
      }
    } else if (Array.isArray(value)) {
      for (const key of value.keys()) {
        const label = String(key);
        if (!keys.includes(label)) keys.push(label);
      }
    } else {
      hasValuesColumn = true;
    }
  }
  const shown = columns ?? keys;
  const header = [INDEX_COLUMN, ...shown, ...(hasValuesColumn ? [VALUES_COLUMN] : [])];

  const rows: string[][] = [header];
  for (const [index, value] of entries) {
    const isRecord = value !== null && typeof value === "object";
    const cells = shown.map((key) =>
      isRecord ? tableCell((value as Record<string, unknown>)[key]) : "",
    );
    if (hasValuesColumn) cells.push(isRecord ? "" : tableCell(value));
    rows.push([index, ...cells]);
  }

  const widths = header.map((_, column) =>
    Math.max(...rows.map((row) => [...(row[column] ?? "")].length)),
  );
  return renderTable(rows, widths);
}

// ─── The console object ─────────────────────────────────────────────────

export interface PlaygroundConsoleOptions {
  /** Where output goes, or null when no run is in flight (output dropped). */
  sink: () => ConsoleSink | null;
  /** The console this one replaces. Between runs the global console hands
   *  back to it, so the host's own logging still works; during a run it
   *  stays inert, which is what keeps almostnode's internal chatter out of
   *  the user's output. */
  hostConsole?: ConsoleLike;
  /** Applied to `console.trace` stacks and to inspected `Error` values. */
  cleanStack?: (stack: string) => string;
  inspectOptions?: InspectOptions;
}

export type ConsoleLike = Record<string, (...args: unknown[]) => void>;

export interface PlaygroundConsole {
  /** The full console, every method live. */
  console: ConsoleLike;
  /**
   * The same console with the streaming methods inert, for installing as
   * the worker's global.
   *
   * almostnode logs its own diagnostics (`[process] cwd() called`) through
   * `console.log`, and binds `table`/`group`/`count`/`time` straight to
   * whatever the global console is. Splitting the two means the methods it
   * binds still reach the output pane, while `log`/`warn`/`error` arrive
   * only through `onConsole`, which fires for user code alone.
   */
  global: ConsoleLike;
  /** almostnode's per-call hook: user-code console calls, by method name. */
  onConsole(method: string, args: unknown[]): void;
}

/** Methods almostnode reports through `onConsole`; the rest it binds to the
 *  global console object. */
const FORWARDED_METHODS = ["log", "info", "debug", "warn", "error", "trace", "dir"];

/**
 * A Node-shaped console over `sink`. Everything routes through one `write`,
 * so group indentation, channels and ordering hold for every method.
 */
export function createPlaygroundConsole(
  options: PlaygroundConsoleOptions,
): PlaygroundConsole {
  let groupIndent = "";
  const inspectOptions: InspectOptions = {
    ...options.inspectOptions,
    ...(options.cleanStack ? { cleanStack: options.cleanStack } : {}),
  };
  const counts = new Map<string, number>();
  const timers = new Map<string, number>();
  const now = () =>
    typeof performance !== "undefined" ? performance.now() : Date.now();

  const line = (channel: OutputChannel, text: string): void => {
    const sink = options.sink();
    if (!sink) return;
    const indented = groupIndent
      ? text
          .split("\n")
          .map((l) => groupIndent + l)
          .join("\n")
      : text;
    sink.write(channel, `${indented}\n`);
  };

  const format = (args: unknown[]) => formatConsoleArgs(args, inspectOptions);
  const out = (...args: unknown[]) => line("stdout", format(args));
  const err = (...args: unknown[]) => line("stderr", format(args));

  const console_: ConsoleLike = {
    log: out,
    info: out,
    debug: out,
    dirxml: out,
    warn: err,
    error: err,
    dir: (obj: unknown, opts?: unknown) => {
      const depth = (opts as InspectOptions | undefined)?.depth;
      line("stdout", inspect(obj, { ...inspectOptions, ...(depth !== undefined ? { depth } : {}) }));
    },
    trace: (...args: unknown[]) => {
      const message = args.length > 0 ? `Trace: ${format(args)}` : "Trace";
      const raw = new Error().stack ?? "";
      // Drop the Error's own header line and this frame.
      const frames = raw.split("\n").slice(2).join("\n");
      const cleaned = options.cleanStack ? options.cleanStack(frames) : frames;
      line("stderr", cleaned ? `${message}\n${cleaned}` : message);
    },
    group: (...args: unknown[]) => {
      if (args.length > 0) out(...args);
      groupIndent += "  ";
    },
    groupCollapsed: (...args: unknown[]) => {
      if (args.length > 0) out(...args);
      groupIndent += "  ";
    },
    groupEnd: () => {
      groupIndent = groupIndent.slice(0, -2);
    },
    count: (label: unknown = "default") => {
      const key = String(label);
      const next = (counts.get(key) ?? 0) + 1;
      counts.set(key, next);
      line("stdout", `${key}: ${next}`);
    },
    countReset: (label: unknown = "default") => {
      counts.delete(String(label));
    },
    time: (label: unknown = "default") => {
      const key = String(label);
      if (timers.has(key)) {
        line("stderr", `Warning: Label '${key}' already exists for console.time()`);
        return;
      }
      timers.set(key, now());
    },
    timeEnd: (label: unknown = "default") => {
      const key = String(label);
      const started = timers.get(key);
      if (started === undefined) {
        line("stderr", `Warning: No such label '${key}' for console.timeEnd()`);
        return;
      }
      timers.delete(key);
      line("stdout", `${key}: ${formatDuration(now() - started)}`);
    },
    timeLog: (label: unknown = "default", ...rest: unknown[]) => {
      const key = String(label);
      const started = timers.get(key);
      if (started === undefined) {
        line("stderr", `Warning: No such label '${key}' for console.timeLog()`);
        return;
      }
      const head = `${key}: ${formatDuration(now() - started)}`;
      line("stdout", rest.length > 0 ? `${head} ${format(rest)}` : head);
    },
    assert: (condition: unknown, ...args: unknown[]) => {
      if (condition) return;
      line(
        "stderr",
        args.length > 0 ? `Assertion failed: ${format(args)}` : "Assertion failed",
      );
    },
    table: (data: unknown, columns?: unknown) => {
      line(
        "stdout",
        formatTable(data, Array.isArray(columns) ? (columns as string[]) : undefined),
      );
    },
    clear: () => {
      // Node's console.clear is a no-op when stdout is not a TTY.
    },
  };

  const global: ConsoleLike = { ...console_ };
  for (const method of FORWARDED_METHODS) {
    global[method] = (...args: unknown[]) => {
      // A run owns the console: these calls arrive through `onConsole`
      // instead, and anything else on this path is the runtime talking to
      // itself. With no run in flight, the host gets its console back.
      if (options.sink()) return;
      options.hostConsole?.[method]?.(...args);
    };
  }

  return {
    console: console_,
    global,
    onConsole: (method, args) => {
      const handler = console_[method] ?? console_.log;
      handler(...args);
    },
  };
}
