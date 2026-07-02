// Route-land runtime warm-up.
//
// `<CodeBlock>` / `<ChallengeCard>` historically warmed their shared
// runtime only when scrolled within 200 px of the viewport — so a
// reader who spends thirty seconds on a page's intro paragraph paid the
// whole Pyodide download *after* reaching the first block instead of
// during the read. This module starts that boot when the page lands:
// every block requests a warm-up on mount, and the coordinator below
// turns those requests into at most one `getSharedRuntime` boot chain.
//
// Policies (per the loading-UX research report):
//   - Idle-scheduled: boots start via `requestIdleCallback` (setTimeout
//     fallback for Safari) so hydration and first paint win the race.
//   - One heavy boot at a time: a page mixing two languages warms the
//     first-mounted (≈ first-on-page) adapter immediately and chains
//     the next one behind it, instead of competing for bandwidth.
//   - Data-saver guard: no land-time downloads when the user enabled
//     Save-Data or sits on a 2g-class connection. The scroll-into-view
//     warm-up and Run itself still work for everyone — this gate only
//     skips the *speculative* download.
//
// The IntersectionObserver warm-up in the blocks stays as the fallback
// (and as the bandwidth-respecting path for data-saver users): the
// registry dedupes, so whichever trigger fires first wins and the rest
// are no-ops.

import type { LanguageAdapter } from "../types";
import {
  getSharedRuntime,
  onRuntimeEvicted,
  type RuntimeScope,
} from "../runtimeRegistry";

const requested = new Set<string>();
// Sequential boot chain — see "one heavy boot at a time" above.
let bootChain: Promise<void> = Promise.resolve();

// When the registry evicts a runtime, forget that we warmed it so a later
// route-land on the same language can warm it again.
onRuntimeEvicted((scope, adapterId) => {
  requested.delete(`${scope}:${adapterId}`);
});

interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
}

/** True when speculative downloads should be skipped: the user asked
 *  for reduced data usage, or the connection is 2g-class. */
function dataSaverActive(): boolean {
  if (typeof navigator === "undefined") return false;
  const connection = (
    navigator as Navigator & { connection?: NetworkInformationLike }
  ).connection;
  if (!connection) return false;
  if (connection.saveData) return true;
  const effectiveType = connection.effectiveType;
  return effectiveType === "slow-2g" || effectiveType === "2g";
}

function whenIdle(callback: () => void): void {
  if (typeof requestIdleCallback === "function") {
    // The timeout bounds how long a busy main thread can defer the
    // warm-up — past that, starting the download wins over idleness.
    requestIdleCallback(() => callback(), { timeout: 4000 });
  } else {
    setTimeout(callback, 1500);
  }
}

/** Request a land-time warm-up of `(scope, adapter)`. Deduped for the
 *  whole SPA session; failures are swallowed (the block's
 *  IntersectionObserver warm-up and Run itself retry through the
 *  registry, which never caches failed boots). */
export function warmRuntimeOnRouteLand(
  scope: RuntimeScope,
  adapter: LanguageAdapter,
): void {
  if (typeof window === "undefined") return;
  const key = `${scope}:${adapter.id}`;
  if (requested.has(key)) return;
  requested.add(key);
  if (dataSaverActive()) return;
  whenIdle(() => {
    bootChain = bootChain.then(() =>
      getSharedRuntime(scope, adapter).then(
        () => undefined,
        () => undefined,
      ),
    );
  });
}