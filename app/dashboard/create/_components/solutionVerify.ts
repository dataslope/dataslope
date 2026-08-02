"use client";

/**
 * Solution verification for the code/SQL challenge builders: a challenge
 * can only be published once its reference solution passes its own tests.
 *
 * The builder mounts the REAL challenge card (its preview pane) and drives
 * it through the imperative handle both cards register on
 * `window.__dsChallenges["<adapter|dialect>::<title>"]` — the same driver
 * the Playwright solution sweep uses (e2e/challenge-solutions.spec.ts):
 * load each file's solution into the card's buffers, submit, and read the
 * pass/fail banner. Reusing the card's own Check-Answer path means the
 * verification is exactly the run a learner's submission gets, harness,
 * stdout expectations, SQL assertions and all.
 */

import type { ChallengeTestHandle } from "@/app/_components/ChallengeCard";

export interface SolutionFile {
  filename: string;
  source: string;
}

export interface VerifyOutcome {
  ok: boolean;
  /** User-facing failure detail (failing test names etc.). */
  detail: string;
}

function getRegistry(): Record<string, ChallengeTestHandle> {
  return (
    (window as unknown as { __dsChallenges?: Record<string, ChallengeTestHandle> })
      .__dsChallenges ?? {}
  );
}

export function getChallengeHandle(key: string): ChallengeTestHandle | null {
  return getRegistry()[key] ?? null;
}

function poll<T>(
  read: () => T | null,
  timeoutMs: number,
  intervalMs = 250,
): Promise<T | null> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const tick = () => {
      const value = read();
      if (value !== null) return resolve(value);
      if (Date.now() - startedAt >= timeoutMs) return resolve(null);
      setTimeout(tick, intervalMs);
    };
    tick();
  });
}

/** First WASM boot per language can be slow (the toolchain downloads from
 *  a CDN), so the banner wait is generous. */
const HANDLE_TIMEOUT_MS = 60_000;
const BANNER_TIMEOUT_MS = 240_000;

export async function verifySolutionViaCard(opts: {
  /** Registry key: `${adapterId}::${title}` (code) / `${dialect}::${title}`
   *  (SQL). Must match the mounted preview card's props. */
  key: string;
  /** The handle registered BEFORE this verification's card mounted (or
   *  null). Polling waits for a DIFFERENT handle under the same key, so a
   *  stale card from an earlier preview can't answer for the new one. */
  prevHandle: ChallengeTestHandle | null;
  /** Per-file solution sources to stage into the card's buffers. */
  files: SolutionFile[];
}): Promise<VerifyOutcome> {
  const handle = await poll(() => {
    const h = getRegistry()[opts.key] ?? null;
    return h && h !== opts.prevHandle ? h : null;
  }, HANDLE_TIMEOUT_MS);
  if (!handle) {
    return {
      ok: false,
      detail:
        "The verification card didn't finish loading. Try Preview first, then save again.",
    };
  }

  for (const f of opts.files) {
    if (!handle.setFileContent(f.filename, f.source)) {
      return {
        ok: false,
        detail: `Couldn't load the solution into ${f.filename}. Try again.`,
      };
    }
  }

  await handle.submit();

  const banner = await poll(() => handle.getBannerState(), BANNER_TIMEOUT_MS);
  if (banner === "pass") return { ok: true, detail: "" };
  if (banner === null) {
    return {
      ok: false,
      detail:
        "Timed out while running the solution, the language runtime may still be downloading. Try again in a moment.",
    };
  }
  const failing = handle
    .getTestResults()
    .filter((t) => t.state !== "pass")
    .map((t) => `“${t.name}”${t.detail ? `: ${t.detail}` : ""}`)
    .join("; ")
    .replace(/\.+$/, "");
  return {
    ok: false,
    detail: failing
      ? `Your solution fails: ${failing}. Fix the solution (or the tests) and save again.`
      : "Your solution doesn't pass the tests. Fix the solution (or the tests) and save again.",
  };
}
