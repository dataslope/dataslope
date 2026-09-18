/**
 * A window handle so Playwright can drive the workspace.
 *
 * Typing a whole SQL query or Python function through CodeMirror's
 * contenteditable is slow and flaky, so the e2e sweep sets the buffer
 * directly and clicks Submit through this handle instead — the same approach
 * `e2e/challenge-solutions.spec.ts` already takes with `window.__dsChallenges`
 * for the lesson cards.
 *
 * This is a test seam, not an API: it exposes no state the UI does not
 * already render, and the page works identically with nothing attached.
 */

import type { IndexLanguage, TestOutcome } from "@/lib/challenges";

export interface WorkspaceTestHandle {
  slug: string;
  /** Which runtime the Run button boots. */
  runtimeKind: "sql" | "code";
  /**
   * The catalog's languages for this challenge. The sweep uses these to skip
   * a runtime the current environment cannot reach — a sandbox with no route
   * to the CDN can still run the JavaScript worker, which is served locally.
   */
  langs: IndexLanguage[];
  /** Step numbers ("01", "02") or language ids, whichever the challenge uses. */
  taskKeys: string[];
  /** Whether a step has been unlocked by passing the one before it. */
  isTaskUnlocked(key: string): boolean;
  /** Move to a step or language by key. */
  selectTask(key: string): void;
  /** Replace the editor buffer. */
  setCode(code: string): void;
  /** Load the current task's reference solution into the editor. */
  loadSolution(): void;
  /** Run the checks; resolves when grading has finished. */
  submit(): Promise<void>;
  getTestResults(): TestOutcome[];
  /** "table" | "stdio" | "error" | null before the first run. */
  getOutputKind(): string | null;
  /** The run's error message, when the last run failed outright. */
  getOutputError(): string | null;
  isBusy(): boolean;
}

declare global {
  interface Window {
    __dsChallengeWorkspace?: Record<string, WorkspaceTestHandle>;
  }
}

/**
 * Publish a handle for this challenge, returning the cleanup that removes it.
 * Safe to call during render effects: it no-ops outside a browser.
 */
export function registerWorkspaceForTests(
  slug: string,
  handle: WorkspaceTestHandle,
): () => void {
  if (typeof window === "undefined") return () => {};
  window.__dsChallengeWorkspace = {
    ...(window.__dsChallengeWorkspace ?? {}),
    [slug]: handle,
  };
  return () => {
    const all = window.__dsChallengeWorkspace;
    if (all && all[slug] === handle) delete all[slug];
  };
}
