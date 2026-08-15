"use client";

/**
 * The share page's "Open a copy" action. Shares are fork-on-open: the sharer's
 * original is never editable through the link. Code bundles materialize into a
 * local workspace before navigating; SQL bundles leave a pending ref for the
 * playground to replay after its engine boots.
 */

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { isSqlPlayground } from "@/lib/workspaces/types";
import {
  fetchShareBundle,
  isCloudSupported,
} from "@/app/_components/cloud/cloudApi";
import {
  materializeCodeWorkspace,
  setPendingBundleRef,
} from "@/app/_components/cloud/materialize";
import { isOpfsSupported } from "@/app/_components/opfs/featureDetect";

export function OpenShareCopy({
  shareId,
  playground,
  name,
}: {
  shareId: string;
  playground: string;
  name: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      if (!isCloudSupported()) {
        throw new Error(
          "This browser can't open shared playgrounds (missing compression support).",
        );
      }
      if (isSqlPlayground(playground)) {
        setPendingBundleRef(playground, { source: "share", id: shareId });
        router.push(`/playground/${playground}`);
        return;
      }
      if (!isOpfsSupported()) {
        throw new Error(
          "This browser can't store playground files (private browsing?). Try a regular window.",
        );
      }
      const bundle = await fetchShareBundle(shareId);
      await materializeCodeWorkspace(bundle, {
        nameOverride: name ? `${name} (copy)` : undefined,
      });
      router.push(`/playground/${playground}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }, [playground, shareId, name, router]);

  return (
    <div>
      <button
        type="button"
        onClick={() => void handleOpen()}
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--ds-green-600)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--ds-green-700)] disabled:opacity-60"
      >
        {busy ? "Opening your copy…" : "Open a copy in the playground"}
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <p className="mt-3 text-sm text-[var(--ds-gray-500)] dark:text-[var(--ds-gray-400)]">
        Opening creates your own private copy, nothing you do affects the
        shared original.
      </p>
    </div>
  );
}
