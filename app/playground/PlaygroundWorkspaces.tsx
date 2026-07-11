"use client";

/**
 * "Your workspaces": the unified workspace list on the /playground index.
 *
 * One list, deliberately: local (this-browser) workspaces and cloud backups
 * are merged by id into a single set of rows rather than the old
 * device-vs-cloud split (separate filters + per-row status icons). A signed-in
 * user's workspaces are cloud-backed by default and the plumbing that keeps
 * them synced is invisible here; a guest's workspaces live in this browser with
 * a standing "sign in to save them to the cloud" nudge. The section always
 * renders (empty and signed-out states included) so the page never looks
 * broken before any workspace exists.
 *
 * The list is read-and-open only. Clicking a row opens that workspace in its
 * playground (rename / duplicate / delete / back-up stay in the playground's
 * own workspace manager). On-device rows just set the active workspace and
 * navigate; cloud-only rows (backed up from another device) materialize first
 * via the same helpers the in-playground manager uses.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ArrowRight, Cloud, LogIn, Loader2, Search } from "lucide-react";
import { useSession } from "@/lib/auth/client";
import {
  isSqlPlayground,
  type CloudUsage,
  type CloudWorkspaceMeta,
} from "@/lib/workspaces/types";
import Link from "../_components/Link";
import { PLAYGROUNDS } from "../_components/playgrounds";
import {
  LANGUAGE_ICONS,
  LANGUAGE_ICON_SIZE_FACTOR,
} from "../_components/languageIcons";
import {
  getWorkspaceRegistry,
  type WorkspaceEntry,
} from "../_components/opfs/workspace";
import { estimateWorkspaceSize } from "../_components/opfs/fileStorage";
import { setActiveWorkspaceId } from "../_components/opfs/activeWorkspace";
import {
  CloudApiError,
  fetchCloudWorkspaceBundle,
  isCloudSupported,
  listCloudWorkspaces,
} from "../_components/cloud/cloudApi";
import {
  materializeCodeWorkspace,
  setPendingBundleRef,
} from "../_components/cloud/materialize";

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

/** Coarse "when" label ("5 min ago", "yesterday", "2 wk ago"). Client-only
 *  (reads the wall clock), so it's kept out of the server render. */
function formatRelative(ts: number): string {
  if (!ts) return "";
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} d ago`;
  if (d < 30) return `${Math.floor(d / 7)} wk ago`;
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
    <span
      className="flex size-[26px] items-center justify-center"
      title={playgroundLabel(id)}
    >
      <Icon size={Math.round(20 * factor)} aria-hidden="true" />
    </span>
  );
}

/** Cloud-usage donut gauge, mirroring the index design's small dial. */
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
        className="stroke-[var(--ds-gray-200)] dark:stroke-white/15"
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

export function PlaygroundWorkspaces() {
  const { data: session, isPending } = useSession();

  // Mount latch: the registry + cloud list are client-only, so the first
  // (server-matching) render shows a skeleton and the real content swaps in
  // after hydration. Avoids a hydration mismatch on the workspace rows.
  const [mounted, setMounted] = useState(false);
  const [localEntries, setLocalEntries] = useState<WorkspaceEntry[]>([]);
  const [cloudMetas, setCloudMetas] = useState<CloudWorkspaceMeta[]>([]);
  const [cloudUsage, setCloudUsage] = useState<CloudUsage | null>(null);
  const [sizes, setSizes] = useState<Map<string, number>>(() => new Map());
  const [query, setQuery] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);

  useEffect(() => {
    // Read the localStorage registry only after mount: it's undefined on the
    // server, so a first render that matched the server (the skeleton) must
    // paint before we swap in the real, client-only list.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setLocalEntries(getWorkspaceRegistry());
  }, []);

  // Signed-in: pull the account's cloud workspaces + usage. 401/503 (session
  // expired server-side / cloud not configured) degrade silently to the
  // local-only view.
  useEffect(() => {
    if (!session || !isCloudSupported()) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await listCloudWorkspaces();
        if (cancelled) return;
        setCloudMetas(res.workspaces);
        setCloudUsage(res.usage);
      } catch (err) {
        if (cancelled) return;
        if (!(err instanceof CloudApiError)) {
          // Transient/network error, leave the local list as-is.
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  // Estimate on-device sizes (parallel, streamed in). Backed-up rows already
  // carry an authoritative cloud size, so only the browser-only ones need it.
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [rows, query]);

  const openRow = useCallback(async (row: WorkspaceRow) => {
    setOpenError(null);
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
      setOpenError(err instanceof Error ? err.message : String(err));
      setOpeningId(null);
    }
  }, []);

  const signedOut = !isPending && !session;
  const usageFraction =
    cloudUsage && cloudUsage.bytesLimit > 0
      ? cloudUsage.bytesUsed / cloudUsage.bytesLimit
      : 0;

  return (
    <section className="mt-20">
      <h2 className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--ds-gray-400)]">
        Your workspaces
      </h2>

      {!mounted ? (
        <WorkspacesSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState signedOut={signedOut} />
      ) : (
        <>
          {/* Name filter. */}
          <div className="mt-5 flex items-center gap-2.5 rounded-lg bg-[var(--ds-gray-100)] px-3 dark:bg-white/[0.06]">
            <Search
              size={15}
              className="shrink-0 text-[var(--ds-gray-500)] dark:text-[var(--ds-gray-400)]"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search workspaces…"
              aria-label="Search workspaces"
              className="h-10 w-full min-w-0 border-0 bg-transparent text-sm text-[#121212] outline-none placeholder:text-[var(--ds-gray-500)] dark:text-white dark:placeholder:text-[var(--ds-gray-400)]"
            />
          </div>

          {openError && (
            <p
              role="alert"
              className="mt-3 rounded-lg bg-[var(--ds-red-500)]/10 px-3 py-2 text-[13px] text-[var(--ds-red-600)] dark:text-[var(--ds-red-400)]"
            >
              {openError}
            </p>
          )}

          <div className="mt-4 h-px bg-[var(--ds-gray-200)] dark:bg-white/[0.08]" />

          <ul className="flex flex-col">
            {filtered.map((row) => {
              const meta = PLAYGROUND_BY_ID[row.playground];
              const busy = openingId === row.id;
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => void openRow(row)}
                    disabled={busy}
                    title={`Open “${row.name}” in the ${playgroundLabel(
                      row.playground,
                    )} playground`}
                    className="group flex w-full items-center gap-3 rounded-lg px-2 py-3.5 text-left transition-colors hover:bg-[var(--ds-gray-100)] disabled:opacity-60 dark:hover:bg-white/[0.05]"
                  >
                    <span className="shrink-0 text-[#121212] dark:text-white">
                      <RowIcon id={row.playground} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium text-[#121212] dark:text-white">
                        {row.name}
                      </span>
                      <span className="truncate text-[13px] text-[var(--ds-gray-500)] dark:text-[var(--ds-gray-400)]">
                        {meta?.label ?? row.playground}
                        {!row.onDevice && (
                          <span className="text-[var(--ds-gray-400)]">
                            {" · not on this device"}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="hidden w-16 shrink-0 text-right text-[13px] text-[var(--ds-gray-500)] tabular-nums sm:block dark:text-[var(--ds-gray-400)]">
                      {row.sizeBytes != null ? formatBytes(row.sizeBytes) : ""}
                    </span>
                    <span className="hidden w-24 shrink-0 text-right text-[13px] text-[var(--ds-gray-500)] sm:block dark:text-[var(--ds-gray-400)]">
                      {formatRelative(row.when)}
                    </span>
                    <span className="flex w-5 shrink-0 justify-end text-[var(--ds-gray-400)]">
                      {busy ? (
                        <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                      ) : (
                        <ArrowRight
                          size={15}
                          className="opacity-0 transition-opacity group-hover:opacity-100"
                          aria-hidden="true"
                        />
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-2 py-6 text-[13px] text-[var(--ds-gray-500)] dark:text-[var(--ds-gray-400)]">
                No workspaces match “{query}”.
              </li>
            )}
          </ul>

          {/* Footer: count + (signed-in) cloud usage, or the sign-in nudge. */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-2 text-[13px] text-[var(--ds-gray-500)] dark:text-[var(--ds-gray-400)]">
            <span>
              {rows.length} {rows.length === 1 ? "workspace" : "workspaces"}
            </span>
            {cloudUsage ? (
              <span className="inline-flex items-center gap-2.5">
                <UsageDonut fraction={usageFraction} />
                {formatBytes(cloudUsage.bytesUsed)} of{" "}
                {formatBytes(cloudUsage.bytesLimit)} in the cloud ·{" "}
                {cloudUsage.plan === "pro" ? "Pro" : "Free"} plan
              </span>
            ) : (
              signedOut && <SignInNudge compact />
            )}
          </div>
        </>
      )}
    </section>
  );
}

/** Loading placeholder shown until the client reads the registry. */
function WorkspacesSkeleton() {
  return (
    <div className="mt-5" aria-hidden="true">
      <div className="h-10 w-full animate-pulse rounded-lg bg-[var(--ds-gray-100)] dark:bg-white/[0.06]" />
      <div className="mt-4 h-px bg-[var(--ds-gray-200)] dark:bg-white/[0.08]" />
      <div className="flex flex-col gap-1 py-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-3.5">
            <div className="size-[26px] shrink-0 animate-pulse rounded bg-[var(--ds-gray-100)] dark:bg-white/[0.06]" />
            <div className="h-4 w-40 animate-pulse rounded bg-[var(--ds-gray-100)] dark:bg-white/[0.06]" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Section body when there are no workspaces yet. No boxed borders, a single
 *  top divider frames the zone (matching the populated list) and the sign-in
 *  nudge sits under its own hairline. */
function EmptyState({ signedOut }: { signedOut: boolean }) {
  return (
    <div className="mt-5 border-t border-[var(--ds-gray-200)] dark:border-white/[0.08]">
      <div className="px-2 py-10">
        <p className="text-sm text-[#121212] dark:text-white">
          No workspaces yet.
        </p>
        <p className="mt-1.5 max-w-md text-[13px] text-[var(--ds-gray-500)] dark:text-[var(--ds-gray-400)]">
          Pick a language under “Start something new” and your work is saved
          automatically{signedOut ? " in this browser" : " to your account"}.
        </p>
      </div>
      {signedOut && <SignInNudge />}
    </div>
  );
}

/** "Sign in to save to the cloud" upsell for guests. `compact` renders the
 *  inline footer variant; otherwise a full-width row separated by a single top
 *  hairline (no boxed border). */
function SignInNudge({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <Link
        href="/sign-in"
        prefetch={false}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--ds-blue-700)] transition-colors hover:text-[var(--ds-blue-500)] dark:text-[var(--ds-blue-400)]"
      >
        <Cloud size={14} aria-hidden="true" />
        Sign in to save to the cloud
      </Link>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-[var(--ds-gray-200)] px-2 py-4 dark:border-white/[0.08]">
      <Cloud
        size={20}
        className="shrink-0 text-[var(--ds-blue-500)] dark:text-[var(--ds-blue-400)]"
        aria-hidden="true"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium text-[#121212] dark:text-white">
          Save to the cloud
        </span>
        <span className="text-[13px] text-[var(--ds-gray-500)] dark:text-[var(--ds-gray-400)]">
          Sign in to keep your workspaces safe and open them on any device.
        </span>
      </div>
      <Link
        href="/sign-in"
        prefetch={false}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--ds-blue-500)] px-4 py-2 text-sm font-medium text-white transition-[filter] hover:brightness-110"
      >
        <LogIn size={14} aria-hidden="true" />
        Sign in
      </Link>
    </div>
  );
}
