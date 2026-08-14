// Route-land runtime warm-up: blocks request a warm-up on mount and the
// coordinator turns those into at most one boot chain. Policies:
// idle-scheduled (hydration/first paint win the race); one heavy boot at
// a time (chained, not competing for bandwidth); skipped entirely under
// Save-Data / 2g. The blocks' IntersectionObserver warm-up stays as the
// fallback; the registry dedupes, so whichever trigger fires first wins.

import type { LanguageAdapter } from "../types";
import {
  getSharedRuntime,
  onRuntimeEvicted,
  type RuntimeScope,
} from "../runtimeRegistry";

const requested = new Set<string>();
// Sequential boot chain ("one heavy boot at a time").
let bootChain: Promise<void> = Promise.resolve();

// Forget evicted runtimes so a later route-land can warm them again.
onRuntimeEvicted((scope, adapterId) => {
  requested.delete(`${scope}:${adapterId}`);
});

interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
}

/** True when speculative downloads should be skipped (Save-Data or 2g). */
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
    // Past the timeout, starting the download wins over idleness.
    requestIdleCallback(() => callback(), { timeout: 4000 });
  } else {
    setTimeout(callback, 1500);
  }
}

/** Request a land-time warm-up. Deduped per SPA session; failures are
 *  swallowed (the registry never caches failed boots, so Run retries). */
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