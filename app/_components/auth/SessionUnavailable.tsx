"use client";

import { useState } from "react";
import { RotateCw } from "lucide-react";
import { useSession } from "@/lib/auth/client";

/**
 * What a session-dependent page shows when the session read failed, as
 * opposed to coming back empty (see `isSessionUnavailable`). Before this the
 * page either sat on its loading note or told a signed-in user to sign in.
 * Retry refetches the shared session atom, so every consumer on the page
 * recovers together and no reload is needed.
 */
export function SessionUnavailable({ compact = false }: { compact?: boolean }) {
  const { refetch } = useSession();
  const [busy, setBusy] = useState(false);

  const retry = async () => {
    setBusy(true);
    try {
      await refetch();
    } finally {
      setBusy(false);
    }
  };

  const button = (
    <button
      type="button"
      onClick={() => void retry()}
      disabled={busy}
      className={
        compact
          ? "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-medium text-[var(--ds-blue-700)] transition-colors hover:bg-[var(--ds-blue-500)]/10 disabled:opacity-60 dark:text-[var(--ds-blue-400)]"
          : "mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--ds-blue-600)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--ds-blue-700)] disabled:opacity-60"
      }
    >
      <RotateCw size={compact ? 13 : 15} className={busy ? "animate-spin" : undefined} aria-hidden="true" />
      {busy ? "Retrying…" : "Retry"}
    </button>
  );

  if (compact) {
    return (
      <div role="alert" className="mt-1 flex items-center justify-between gap-2 px-2.5 py-2 text-[12px] text-[var(--ds-gray-600)] dark:text-[var(--ds-gray-400)]">
        <span>Couldn&apos;t load your account.</span>
        {button}
      </div>
    );
  }

  return (
    <div role="alert" className="py-12 text-center">
      <p className="text-[15px] text-[var(--ds-gray-700)] dark:text-[var(--ds-gray-300)]">
        We couldn&apos;t check whether you&apos;re signed in.
      </p>
      <p className="mt-1 text-sm text-[var(--ds-gray-500)]">
        This is usually a brief server hiccup. Retrying normally fixes it.
      </p>
      {button}
    </div>
  );
}
