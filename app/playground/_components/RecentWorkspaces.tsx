"use client";

/**
 * "Recent Workspaces" on the `/playground` landing page: the five most recent
 * workspaces (local + cloud, merged by id) as a hairline-separated list, with
 * a link through to the full, paginated list at `/dashboard/playground`.
 *
 * A lighter sibling of `app/dashboard/playground/PlaygroundWorkspaces.tsx`:
 * same data sources (the localStorage registry + the signed-in account's cloud
 * backups) but trimmed to a preview — no search, no pagination — and with an
 * inline delete affordance per row (mirroring the handoff mock). The heavier
 * concerns (post-sign-in bulk backup, the empty/onboarding state) stay on the
 * dashboard page; here the whole section simply hides when there's nothing
 * recent to show.
 *
 * Client-only: the registry and cloud list are unavailable during SSR, so the
 * first (server-matching) render is empty and the real content swaps in after
 * hydration.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import {
  ArrowRight,
  Clock,
  Cloud,
  Folder,
  HardDrive,
  Loader2,
  Monitor,
  Trash2,
} from "lucide-react";
import { useSession } from "@/lib/auth/client";
import {
  isSqlPlayground,
  type CloudUsage,
  type CloudWorkspaceMeta,
} from "@/lib/workspaces/types";
import Link from "@/app/_components/Link";
import { PLAYGROUNDS } from "@/app/_components/playgrounds";
import {
  LANGUAGE_ICONS,
  LANGUAGE_ICON_SIZE_FACTOR,
} from "@/app/_components/languageIcons";
import {
  deleteWorkspace,
  getWorkspaceRegistry,
  type WorkspaceEntry,
} from "@/app/_components/opfs/workspace";
import { estimateWorkspaceSize } from "@/app/_components/opfs/fileStorage";
import { setActiveWorkspaceId } from "@/app/_components/opfs/activeWorkspace";
import {
  deleteCloudWorkspace,
  fetchCloudWorkspaceBundle,
  isCloudSupported,
  listCloudWorkspaces,
} from "@/app/_components/cloud/cloudApi";
import {
  materializeCodeWorkspace,
  setPendingBundleRef,
} from "@/app/_components/cloud/materialize";

/** How many of the most-recent workspaces the preview shows. */
const RECENT_LIMIT = 5;

const PLAYGROUND_BY_ID: Record<string, { label: string; href: string }> =
  Object.fromEntries(PLAYGROUNDS.map((p) => [p.id, p]));

function playgroundLabel(id: string): string {
  return PLAYGROUND_BY_ID[id]?.label ?? id;
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Coarse "when" label ("24 minutes ago", "yesterday", "2 days ago"). Reads
 *  the wall clock, so it's client-only and kept out of the server render. */
function formatRelative(ts: number): string {
  if (!ts) return "";
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  if (d < 30) {
    const w = Math.floor(d / 7);
    return `${w} week${w === 1 ? "" : "s"} ago`;
  }
  return new Date(ts).toLocaleDateString();
}

interface WorkspaceRow {
  id: string;
  name: string;
  playground: string;
  onDevice: boolean;
  backedUp: boolean;
  /** Most recent activity (ms) across the local + cloud copies. */
  when: number;
  /** Bytes, or null while a local estimate is still resolving. */
  sizeBytes: number | null;
}

/** Monochrome language glyph, tinted by the row's `currentColor`. */
function RowIcon({ id }: { id: string }) {
  const Icon = LANGUAGE_ICONS[id];
  if (!Icon) return null;
  const factor = LANGUAGE_ICON_SIZE_FACTOR[id] ?? 1;
  return (
    <span className="flex w-4 shrink-0 justify-center">
      <Icon size={Math.round(16 * factor)} aria-hidden="true" />
    </span>
  );
}

/** Cloud-usage donut gauge, mirroring the mock's small dial. */
function UsageDonut({ fraction }: { fraction: number }) {
  const r = 8;
  const circ = 2 * Math.PI * r;
  const used = Math.max(0, Math.min(1, fraction)) * circ;
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      style={{ transform: "rotate(-90deg)" }}
      aria-hidden="true"
    >
      <circle
        cx="10"
        cy="10"
        r={r}
        fill="none"
        stroke="var(--ds-gray-200)"
        strokeWidth="3.5"
      />
      <circle
        cx="10"
        cy="10"
        r={r}
        fill="none"
        stroke="var(--ds-blue-500)"
        strokeWidth="3.5"
        strokeDasharray={`${used.toFixed(2)} ${(circ - used).toFixed(2)}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function RecentWorkspaces() {
  const { data: session, isPending } = useSession();

  const [mounted, setMounted] = useState(false);
  const [localEntries, setLocalEntries] = useState<WorkspaceEntry[]>([]);
  const [cloudMetas, setCloudMetas] = useState<CloudWorkspaceMeta[]>([]);
  const [cloudUsage, setCloudUsage] = useState<CloudUsage | null>(null);
  const [sizes, setSizes] = useState<Map<string, number>>(() => new Map());
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Read the localStorage registry only after mount (it's undefined on the
  // server), so the first render matches the server's empty output.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setLocalEntries(getWorkspaceRegistry());
  }, []);

  // Signed-in: pull the account's cloud workspaces + usage. 401/503 (session
  // expired server-side / cloud not configured) degrade silently to the
  // local-only view.
  const refreshCloud = useCallback(async () => {
    if (!isCloudSupported()) return;
    try {
      const res = await listCloudWorkspaces();
      setCloudMetas(res.workspaces);
      setCloudUsage(res.usage);
    } catch {
      // Transient/network error, leave the list as-is.
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    void (async () => {
      if (!isCloudSupported()) return;
      try {
        const res = await listCloudWorkspaces();
        if (cancelled) return;
        setCloudMetas(res.workspaces);
        setCloudUsage(res.usage);
      } catch {
        // Leave the local list as-is on error.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  // Estimate on-device sizes for the browser-only rows (backed-up rows already
  // carry an authoritative cloud size).
  useEffect(() => {
    if (!mounted || localEntries.length === 0) return;
    const cloudIds = new Set(cloudMetas.map((m) => m.id));
    const ids = localEntries
      .map((e) => e.id)
      .filter((id) => !cloudIds.has(id));
    let cancelled = false;
    void Promise.all(
      ids.map(async (id) => {
        const bytes = await estimateWorkspaceSize(id);
        if (cancelled) return;
        setSizes((prev) => {
          if (prev.get(id) === bytes) return prev;
          const next = new Map(prev);
          next.set(id, bytes);
          return next;
        });
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [mounted, localEntries, cloudMetas]);

  const rows = useMemo<WorkspaceRow[]>(() => {
    const cloudById = new Map(cloudMetas.map((m) => [m.id, m]));
    const localIds = new Set(localEntries.map((e) => e.id));
    const merged: WorkspaceRow[] = [];
    for (const e of localEntries) {
      const cloud = cloudById.get(e.id);
      merged.push({
        id: e.id,
        name: e.name,
        playground: e.playground,
        onDevice: true,
        backedUp: !!cloud,
        when: Math.max(e.lastUsedAt, cloud ? Date.parse(cloud.updatedAt) : 0),
        sizeBytes: cloud ? cloud.sizeBytes : sizes.get(e.id) ?? null,
      });
    }
    for (const m of cloudMetas) {
      if (localIds.has(m.id)) continue;
      merged.push({
        id: m.id,
        name: m.name,
        playground: m.playground,
        onDevice: false,
        backedUp: true,
        when: Date.parse(m.updatedAt),
        sizeBytes: m.sizeBytes,
      });
    }
    merged.sort((a, b) => b.when - a.when);
    return merged;
  }, [localEntries, cloudMetas, sizes]);

  const recent = rows.slice(0, RECENT_LIMIT);

  const openRow = useCallback(async (row: WorkspaceRow) => {
    setError(null);
    if (row.onDevice) {
      setActiveWorkspaceId(row.playground, row.id);
      window.location.assign(`/playground/${row.playground}`);
      return;
    }
    // Cloud-only: pull the backup onto this device, then open it. SQL bundles
    // replay after the engine boots (pending ref); code bundles materialize
    // into a local workspace up front.
    setOpeningId(row.id);
    try {
      if (isSqlPlayground(row.playground)) {
        setPendingBundleRef(row.playground, { source: "cloud", id: row.id });
      } else {
        const bundle = await fetchCloudWorkspaceBundle(row.id);
        await materializeCodeWorkspace(bundle, { id: row.id });
      }
      window.location.assign(`/playground/${row.playground}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setOpeningId(null);
    }
  }, []);

  const deleteRow = useCallback(
    async (row: WorkspaceRow) => {
      const backed = row.backedUp || !row.onDevice;
      const scope = backed
        ? row.onDevice
          ? " from this device and your account"
          : " from your account"
        : "";
      if (
        !window.confirm(
          `Delete “${row.name}”?\n\nThis permanently removes it${scope}. This can't be undone.`,
        )
      ) {
        return;
      }
      setError(null);
      setDeletingId(row.id);
      try {
        if (row.onDevice) await deleteWorkspace(row.id);
        if (backed) await deleteCloudWorkspace(row.id);
        setLocalEntries((prev) => prev.filter((e) => e.id !== row.id));
        setCloudMetas((prev) => prev.filter((m) => m.id !== row.id));
        // Refresh cloud usage so the dial reflects the freed space.
        if (backed) void refreshCloud();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setDeletingId(null);
      }
    },
    [refreshCloud],
  );

  const signedOut = !isPending && !session;
  const usageFraction =
    cloudUsage && cloudUsage.bytesLimit > 0
      ? cloudUsage.bytesUsed / cloudUsage.bytesLimit
      : 0;

  // Nothing recent (or not mounted yet): hide the whole section. New visitors
  // just see the language chooser; the dashboard owns the empty state.
  if (!mounted || recent.length === 0) return null;

  const shown = recent.length;

  return (
    <section className="mt-24 sm:mt-28">
      <h2 className="text-center text-xl font-semibold text-[#121212] dark:text-white">
        Recent Workspaces
      </h2>

      {error && (
        <p
          role="alert"
          className="mx-auto mt-6 max-w-xl rounded-lg bg-[var(--ds-red-100)] px-3 py-2 text-center text-[13px] text-[var(--ds-red-700)] dark:bg-[var(--ds-red-900)]/40 dark:text-[var(--ds-red-300)]"
        >
          {error}
        </p>
      )}

      <ul className="mt-8 flex flex-col">
        {recent.map((row) => {
          const busy = openingId === row.id;
          const removing = deletingId === row.id;
          const StoreIcon = row.backedUp ? Cloud : Monitor;
          const storeTitle = row.backedUp
            ? "Saved to your account"
            : "Saved in this browser";
          const when = formatRelative(row.when);
          return (
            <li
              key={row.id}
              className="group relative border-t border-[var(--ds-gray-100)] first:border-t-0 dark:border-white/[0.07]"
            >
              {/* Full-row open action sits under the delete button (which lifts
                  itself above with z-10). */}
              <button
                type="button"
                onClick={() => void openRow(row)}
                disabled={busy || removing}
                aria-label={`Open “${row.name}” in the ${playgroundLabel(
                  row.playground,
                )} playground`}
                className="absolute inset-0 rounded-lg"
              />
              <div className="pointer-events-none flex items-center gap-3 px-2 py-4">
                <span
                  className="flex shrink-0 text-[var(--ds-gray-400)]"
                  title={storeTitle}
                >
                  <StoreIcon size={14} aria-hidden="true" />
                </span>

                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm text-[#121212] transition-colors group-hover:text-[var(--ds-blue-700)] dark:text-white dark:group-hover:text-[var(--ds-blue-400)]">
                    {row.name}
                  </span>
                  {/* Compact meta line for narrow screens (the columns below
                      collapse under md). */}
                  <span className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--ds-gray-500)] md:hidden dark:text-[var(--ds-gray-400)]">
                    <RowIcon id={row.playground} />
                    <span className="truncate">
                      {playgroundLabel(row.playground)}
                      {when ? ` · ${when}` : ""}
                      {row.sizeBytes != null
                        ? ` · ${formatBytes(row.sizeBytes)}`
                        : ""}
                    </span>
                  </span>
                </span>

                <span className="hidden w-[132px] items-center gap-2 text-[13px] text-[var(--ds-gray-500)] md:flex dark:text-[var(--ds-gray-400)]">
                  <RowIcon id={row.playground} />
                  <span className="truncate">
                    {playgroundLabel(row.playground)}
                  </span>
                </span>
                <span className="hidden w-[140px] items-center gap-2 text-[13px] text-[var(--ds-gray-500)] md:flex dark:text-[var(--ds-gray-400)]">
                  <Clock size={12} className="shrink-0" aria-hidden="true" />
                  <span className="truncate">{when}</span>
                </span>
                <span className="hidden w-[84px] items-center gap-2 text-[13px] tabular-nums text-[var(--ds-gray-500)] md:flex dark:text-[var(--ds-gray-400)]">
                  <HardDrive size={12} className="shrink-0" aria-hidden="true" />
                  {row.sizeBytes != null ? formatBytes(row.sizeBytes) : ""}
                </span>

                <button
                  type="button"
                  onClick={() => void deleteRow(row)}
                  disabled={removing}
                  aria-label={`Delete “${row.name}”`}
                  title="Delete workspace"
                  className="pointer-events-auto relative z-10 flex size-7 shrink-0 items-center justify-center rounded-lg text-[var(--ds-red-500)] opacity-70 transition hover:scale-110 hover:opacity-100 disabled:opacity-40 dark:text-[var(--ds-red-400)]"
                >
                  {removing ? (
                    <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 size={15} aria-hidden="true" />
                  )}
                </button>
              </div>
              {busy && (
                <span
                  className="pointer-events-none absolute right-11 top-1/2 z-10 -translate-y-1/2 text-[var(--ds-gray-400)]"
                  aria-hidden="true"
                >
                  <Loader2 size={15} className="animate-spin" />
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {/* Footer line: session count + cloud usage (signed in) or a sign-in
          nudge (signed out). */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-2">
        <span className="text-[13px] text-[var(--ds-gray-400)]">
          Your {shown} most recent {shown === 1 ? "session" : "sessions"}
        </span>
        {cloudUsage ? (
          <span className="inline-flex items-center gap-2.5 text-[13px] text-[var(--ds-gray-500)] dark:text-[var(--ds-gray-400)]">
            <UsageDonut fraction={usageFraction} />
            {formatBytes(cloudUsage.bytesUsed)} of{" "}
            {formatBytes(cloudUsage.bytesLimit)} in the cloud ·{" "}
            {cloudUsage.plan === "pro" ? "Pro" : "Free"} plan
          </span>
        ) : (
          signedOut && (
            <Link
              href="/sign-in"
              prefetch={false}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--ds-blue-500)] transition-colors hover:text-[var(--ds-blue-400)]"
            >
              <Cloud size={14} aria-hidden="true" />
              Sign in to save to the cloud
            </Link>
          )
        )}
      </div>

      {/* Through to the full, paginated list on the dashboard. */}
      <div className="mt-6 flex justify-center">
        <Link
          href="/dashboard/playground"
          prefetch={false}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--ds-blue-500)] px-[18px] py-2.5 text-[15px] font-medium text-white transition-colors hover:bg-[var(--ds-blue-600)]"
        >
          <Folder size={15} aria-hidden="true" />
          All workspaces
          <ArrowRight
            size={15}
            className="opacity-70"
            aria-hidden="true"
            style={{ marginLeft: -2 } as CSSProperties}
          />
        </Link>
      </div>
    </section>
  );
}
