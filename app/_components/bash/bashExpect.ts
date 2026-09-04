/**
 * Declarative grading for shell challenges.
 *
 * A Git challenge grades on repository state, because what `git commit`
 * printed is beside the point. A shell challenge is the opposite case: often
 * the printed output *is* the answer ("show the three largest files"), and
 * just as often the answer is a file that now exists. So these assertions read
 * both — the transcript and the filesystem — and the card evaluates them after
 * every command, which is what lets objectives tick live.
 *
 * `commandMatches` grades the *route*, not the result, and is deliberately
 * separate: use it only when a lesson is about a particular tool, since a
 * learner who reaches the right answer another way is not wrong.
 *
 * Isomorphic (no DOM), so tests and the card share one implementation.
 */

import type { RepoState } from "../git/protocol";

export interface BashTranscriptEntry {
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface BashExpect {
  /** Output of the last command contains this substring. */
  stdoutContains?: string | string[];
  /** Output of the last command equals this, both sides trimmed. */
  stdoutEquals?: string;
  /** Output of the last command matches this regex (a string, since MDX
   *  cannot express a literal RegExp). */
  stdoutMatches?: string;
  /** Output of the last command has exactly this many non-empty lines. */
  stdoutLineCount?: number;
  /** Any command in the transcript printed this. */
  anyOutputContains?: string | string[];
  /** The last command exited with this code. */
  exitCode?: number;
  /** No command in the transcript failed. */
  noErrors?: boolean;
  /** These paths exist in the working directory. */
  filesExist?: string[];
  /** This path is gone. */
  fileAbsent?: string;
  /** This file's contents contain the substring(s). */
  fileContains?: { path: string; text: string | string[] };
  /** This file's contents match the regex. */
  fileMatches?: { path: string; pattern: string };
  /** This file has exactly this many non-empty lines. */
  fileLineCount?: { path: string; lines: number };
  /** A command the learner ran matches this regex. Grades the route rather
   *  than the result, so reach for it only when the tool is the lesson. */
  commandMatches?: string;
}

const list = (v: string | string[]): string[] => (Array.isArray(v) ? v : [v]);
const nonEmptyLines = (s: string) => s.split("\n").filter((l) => l.trim() !== "");
const lastEntry = (t: BashTranscriptEntry[]) => t[t.length - 1];
/** Commands may print to either stream; a learner reading the terminal does
 *  not distinguish, so neither does grading. */
const output = (e: BashTranscriptEntry | undefined) =>
  e ? `${e.stdout}${e.stderr}` : "";

export interface BashContext {
  state: RepoState;
  transcript: BashTranscriptEntry[];
}

/** One human-readable reason per failed assertion, most useful first. */
export function explainBashExpect(expect: BashExpect, ctx: BashContext): string | null {
  const { state, transcript } = ctx;
  const last = lastEntry(transcript);
  const lastOut = output(last);
  const files = state.contents ?? {};

  if (expect.commandMatches !== undefined) {
    const re = new RegExp(expect.commandMatches, "i");
    if (!transcript.some((e) => re.test(e.command))) {
      return transcript.length ? "No command you ran matches yet." : "Nothing has run yet.";
    }
  }
  if (expect.stdoutContains !== undefined) {
    if (!last) return "Nothing has run yet.";
    const missing = list(expect.stdoutContains).find((t) => !lastOut.includes(t));
    if (missing !== undefined) return `The last output does not contain "${missing}".`;
  }
  if (expect.stdoutEquals !== undefined) {
    if (!last) return "Nothing has run yet.";
    if (lastOut.trim() !== expect.stdoutEquals.trim()) {
      return `The last output is "${lastOut.trim().slice(0, 60)}".`;
    }
  }
  if (expect.stdoutMatches !== undefined) {
    if (!last) return "Nothing has run yet.";
    if (!new RegExp(expect.stdoutMatches, "i").test(lastOut)) {
      return "The last output does not match yet.";
    }
  }
  if (expect.stdoutLineCount !== undefined) {
    if (!last) return "Nothing has run yet.";
    const n = nonEmptyLines(lastOut).length;
    if (n !== expect.stdoutLineCount) {
      return `The last output has ${n} lines, expected ${expect.stdoutLineCount}.`;
    }
  }
  if (expect.anyOutputContains !== undefined) {
    const all = transcript.map(output).join("\n");
    const missing = list(expect.anyOutputContains).find((t) => !all.includes(t));
    if (missing !== undefined) return `Nothing has printed "${missing}" yet.`;
  }
  if (expect.exitCode !== undefined) {
    if (!last) return "Nothing has run yet.";
    if (last.exitCode !== expect.exitCode) {
      return `The last command exited ${last.exitCode}, expected ${expect.exitCode}.`;
    }
  }
  if (expect.noErrors) {
    const failed = transcript.find((e) => e.exitCode !== 0);
    if (failed) return `"${failed.command}" failed.`;
  }
  for (const path of expect.filesExist ?? []) {
    if (!state.tree.includes(path)) return `${path} does not exist.`;
  }
  if (expect.fileAbsent !== undefined && state.tree.includes(expect.fileAbsent)) {
    return `${expect.fileAbsent} still exists.`;
  }
  if (expect.fileContains !== undefined) {
    const { path, text } = expect.fileContains;
    if (!state.tree.includes(path)) return `${path} does not exist.`;
    const body = files[path];
    if (body === undefined) return `${path} is too large to check.`;
    const missing = list(text).find((t) => !body.includes(t));
    if (missing !== undefined) return `${path} does not contain "${missing}".`;
  }
  if (expect.fileMatches !== undefined) {
    const { path, pattern } = expect.fileMatches;
    if (!state.tree.includes(path)) return `${path} does not exist.`;
    const body = files[path];
    if (body === undefined) return `${path} is too large to check.`;
    if (!new RegExp(pattern, "i").test(body)) return `${path} does not match yet.`;
  }
  if (expect.fileLineCount !== undefined) {
    const { path, lines } = expect.fileLineCount;
    if (!state.tree.includes(path)) return `${path} does not exist.`;
    const body = files[path];
    if (body === undefined) return `${path} is too large to check.`;
    const n = nonEmptyLines(body).length;
    if (n !== lines) return `${path} has ${n} lines, expected ${lines}.`;
  }
  return null;
}

export const satisfiesBashExpect = (expect: BashExpect, ctx: BashContext): boolean =>
  explainBashExpect(expect, ctx) === null;

/** One-line summary of what an assertion checks, for the details popover. */
export function bashExpectSummary(expect: BashExpect): string {
  const parts: string[] = [];
  if (expect.commandMatches) parts.push(`a command matches /${expect.commandMatches}/i`);
  if (expect.stdoutContains) parts.push(`output contains: ${list(expect.stdoutContains).join(", ")}`);
  if (expect.stdoutEquals !== undefined) parts.push(`output equals "${expect.stdoutEquals}"`);
  if (expect.stdoutMatches) parts.push(`output matches /${expect.stdoutMatches}/i`);
  if (expect.stdoutLineCount !== undefined) parts.push(`output has ${expect.stdoutLineCount} lines`);
  if (expect.anyOutputContains) parts.push(`any output contains: ${list(expect.anyOutputContains).join(", ")}`);
  if (expect.exitCode !== undefined) parts.push(`exit code ${expect.exitCode}`);
  if (expect.noErrors) parts.push("no command failed");
  if (expect.filesExist?.length) parts.push(`files exist: ${expect.filesExist.join(", ")}`);
  if (expect.fileAbsent) parts.push(`no file ${expect.fileAbsent}`);
  if (expect.fileContains) {
    parts.push(`${expect.fileContains.path} contains: ${list(expect.fileContains.text).join(", ")}`);
  }
  if (expect.fileMatches) {
    parts.push(`${expect.fileMatches.path} matches /${expect.fileMatches.pattern}/i`);
  }
  if (expect.fileLineCount) {
    parts.push(`${expect.fileLineCount.path} has ${expect.fileLineCount.lines} lines`);
  }
  return parts.join("\n");
}

/** One objective on a shell challenge card. */
export interface BashObjective {
  id: string;
  name: string;
  description?: string;
  expect: BashExpect;
}
