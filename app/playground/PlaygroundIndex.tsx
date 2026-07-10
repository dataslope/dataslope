"use client";

/**
 * /playground index — a workspace manager + language launcher.
 *
 * The old index was a static directory of the 14 language playgrounds. This
 * replaces it with the same personalized workspace surface the in-playground
 * header exposes (WorkspaceBadge), but scoped across ALL playgrounds and given
 * a full-page home:
 *
 *  - a unified list of the visitor's saved workspaces, merged from the local
 *    OPFS registry (all playgrounds) and, when signed in, their cloud saves,
 *    joined by shared id so a cloud row that matches a local one shows as its
 *    backup and unmatched cloud rows show as "cloud only";
 *  - search, location filter chips (all / on this device / in the cloud),
 *    sort, per-row actions (open / rename / duplicate / delete, plus open-on-
 *    this-device and delete-backup for cloud rows), and a storage summary;
 *  - a "start something new" launcher grid.
 *
 * Personalization happens after hydration (like AuthMenu / WorkspaceBadge): the
 * server and first client paint render the SEO-friendly launcher (title +
 * language grid), and the workspace list appears once the localStorage registry
 * and the cloud list resolve on the client. New visitors and crawlers therefore
 * always see the language directory, preserving this page's search-landing role.
 *
 * Dark-only, matching the palette of the index it replaces (see the module CSS).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "@base-ui-components/react/menu";
import { Dialog } from "@base-ui-components/react/dialog";
import { AlertDialog } from "@base-ui-components/react/alert-dialog";
import {
  ArrowRight,
  ArrowUpDown,
  Check,
  ChevronDown,
  Cloud,
  CloudDownload,
  CloudUpload,
  Copy,
  Monitor,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import Link from "../_components/Link";
import {
  LANGUAGE_ICONS,
  LANGUAGE_ICON_SIZE_FACTOR,
} from "../_components/languageIcons";
import { PLAYGROUNDS } from "../_components/playgrounds";
import { useSession } from "@/lib/auth/client";
import {
  deleteWorkspace,
  duplicateWorkspace,
  getWorkspaceRegistry,
  renameWorkspace,
  type WorkspaceEntry,
} from "../_components/opfs/workspace";
import { setActiveWorkspaceId } from "../_components/opfs/activeWorkspace";
import { estimateWorkspaceSize } from "../_components/opfs/fileStorage";
import { loadManifest } from "../_components/playgroundTabs";
import {
  CloudApiError,
  deleteCloudWorkspace,
  fetchCloudWorkspaceBundle,
  isCloudSupported,
  listCloudWorkspaces,
} from "../_components/cloud/cloudApi";
import {
  materializeCodeWorkspace,
  setPendingBundleRef,
} from "../_components/cloud/materialize";
import {
  isSqlPlayground,
  type CloudUsage,
  type CloudWorkspaceMeta,
} from "@/lib/workspaces/types";

import styles from "./playgroundIndex.module.css";

// ---------------------------------------------------------------------------
// Language catalog (drives the launcher + row icons)
// ---------------------------------------------------------------------------

/** One-line engine descriptions, mirroring the shorts on the old index /
 *  WorkspaceBadge copy. Keyed by playground id. */
const LANG_SHORTS: Record<string, string> = {
  python: "Pyodide (WASM)",
  r: "WebR (WASM)",
  javascript: "Native engine",
  typescript: "In-browser transpile",
  web: "Live HTML preview",
  react: "esbuild-wasm",
  php: "php-wasm",
  c: "clang (WASM)",
  cpp: "clang (WASM)",
  java: "CheerpJ (OpenJDK)",
  csharp: "Roslyn on .NET",
  sqlite: "sqlite-wasm",
  postgres: "PGlite",
  duckdb: "DuckDB-Wasm",
};

/** Featured six for the empty state, the rest render as a compact inline row. */
const FEATURED_IDS = ["python", "javascript", "sqlite", "r", "web", "postgres"];

// ---------------------------------------------------------------------------
// Formatting helpers (mirrors WorkspaceBadge/CloudStorageSection)
// ---------------------------------------------------------------------------

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

function formatRelative(timestamp: number): string {
  const now = Date.now();
  const diff = Math.max(0, now - timestamp);
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Language glyph (monochrome white brand mark)
// ---------------------------------------------------------------------------

function LangGlyph({ id, size }: { id: string; size: number }) {
  const Icon = LANGUAGE_ICONS[id];
  const factor = LANGUAGE_ICON_SIZE_FACTOR[id] ?? 1;
  const px = Math.round(size * factor);
  if (!Icon) {
    return (
      <span style={{ fontSize: Math.round(size * 0.7), fontWeight: 700 }}>
        {id.slice(0, 1).toUpperCase()}
      </span>
    );
  }
  // The enclosing wrapper sets color:#fff, so currentColor renders the glyph
  // white for both the react-icons marks and the custom C icon.
  return <Icon size={px} aria-hidden />;
}

// ---------------------------------------------------------------------------
// Row model
// ---------------------------------------------------------------------------

type RowStatus = "local" | "backed" | "stale" | "cloudOnly";

interface Row {
  id: string;
  name: string;
  playground: string;
  status: RowStatus;
  onDevice: boolean;
  inCloud: boolean;
  /** ms timestamp used for sort + relative-time display. */
  when: number;
  sizeBytes: number | null;
  fileCount: number | null;
  entry?: WorkspaceEntry;
  meta?: CloudWorkspaceMeta;
}

function metaFileCount(meta: CloudWorkspaceMeta): number | null {
  const m = meta.manifest;
  if (!m) return null;
  if (m.files) return m.files.length;
  if (m.tabs) return m.tabs.length;
  return null;
}

/** File/tab count for a local workspace, read synchronously from the tab
 *  manifest (localStorage). SQL playgrounds don't use this manifest, so their
 *  count is left to the cloud manifest when a backup exists. */
function localFileCount(entry: WorkspaceEntry): number | null {
  const m = loadManifest(entry.playground, entry.id);
  return m ? m.files.length : null;
}

function statusView(status: RowStatus): {
  color: string;
  label: string;
  device: boolean;
} {
  switch (status) {
    case "backed":
      return { color: "var(--ds-green, #20C621)", label: "Backed up", device: false };
    case "stale":
      return {
        color: "var(--ds-yellow, #FFDD6C)",
        label: "Edited since backup",
        device: false,
      };
    case "cloudOnly":
      return { color: "var(--ds-blue, #148CFF)", label: "Cloud only", device: false };
    default:
      return { color: "#94a3b8", label: "This device only", device: true };
  }
}

// ---------------------------------------------------------------------------
// Storage ring
// ---------------------------------------------------------------------------

function StorageRing({ fraction }: { fraction: number }) {
  const r = 8;
  const c = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0)) * c;
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 20 20"
      style={{ transform: "rotate(-90deg)" }}
      aria-hidden="true"
    >
      <circle
        cx="10"
        cy="10"
        r="8"
        fill="none"
        stroke="rgba(148,163,184,0.22)"
        strokeWidth="3.5"
      />
      <circle
        cx="10"
        cy="10"
        r="8"
        fill="none"
        stroke="var(--ds-blue, #148CFF)"
        strokeWidth="3.5"
        strokeDasharray={`${dash} ${c}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PlaygroundIndex() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const signedIn = !!session;

  const [hydrated, setHydrated] = useState(false);
  const [registry, setRegistry] = useState<WorkspaceEntry[]>([]);
  const [sizes, setSizes] = useState<Map<string, number>>(() => new Map());
  const [cloudList, setCloudList] = useState<CloudWorkspaceMeta[]>([]);
  const [usage, setUsage] = useState<CloudUsage | null>(null);
  const [cloudUnavailable, setCloudUnavailable] = useState(false);
  const [cloudAuthLost, setCloudAuthLost] = useState(false);

  const [search, setSearch] = useState("");
  const [location, setLocation] = useState<"all" | "device" | "cloud">("all");
  const [sort, setSort] = useState<"recent" | "name">("recent");

  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [renameTarget, setRenameTarget] = useState<Row | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<Row | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);

  const refreshRegistry = useCallback(() => {
    setRegistry(getWorkspaceRegistry());
  }, []);

  const refreshCloud = useCallback(async () => {
    try {
      const res = await listCloudWorkspaces();
      setCloudList(res.workspaces);
      setUsage(res.usage);
      setCloudAuthLost(false);
    } catch (err) {
      if (err instanceof CloudApiError && err.status === 401) {
        setCloudList([]);
        setUsage(null);
        setCloudAuthLost(true);
      } else if (err instanceof CloudApiError && err.status === 503) {
        setCloudUnavailable(true);
      }
      // Any other error: keep the local list usable, cloud simply stays empty.
    }
  }, []);

  // Hydrate the local registry once mounted (localStorage is client-only).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
    refreshRegistry();
  }, [refreshRegistry]);

  // Fetch cloud saves once the session resolves to signed-in.
  useEffect(() => {
    if (!hydrated || isPending || !signedIn) return;
    if (!isCloudSupported()) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the list lands async in refreshCloud(), after the fetch resolves
    void refreshCloud();
  }, [hydrated, isPending, signedIn, refreshCloud]);

  // Estimate on-disk size for each local workspace, in parallel.
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    void Promise.all(
      registry.map(async (e) => {
        const bytes = await estimateWorkspaceSize(e.id);
        if (cancelled) return;
        setSizes((prev) => {
          if (prev.get(e.id) === bytes) return prev;
          const next = new Map(prev);
          next.set(e.id, bytes);
          return next;
        });
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [hydrated, registry]);

  const cloudSupported = hydrated && isCloudSupported() && !cloudUnavailable;
  const signedOut = hydrated && ((!isPending && !signedIn) || cloudAuthLost);
  const showCloud = cloudSupported && signedIn && !cloudAuthLost;

  // Merge local + cloud into one row set, joined by id.
  const rows = useMemo<Row[]>(() => {
    const cloudById = new Map(cloudList.map((m) => [m.id, m]));
    const localRows: Row[] = registry.map((e) => {
      const meta = cloudById.get(e.id);
      const stale = meta ? e.lastUsedAt > Date.parse(meta.updatedAt) : false;
      const status: RowStatus = !meta ? "local" : stale ? "stale" : "backed";
      const count = meta ? metaFileCount(meta) ?? localFileCount(e) : localFileCount(e);
      return {
        id: e.id,
        name: e.name,
        playground: e.playground,
        status,
        onDevice: true,
        inCloud: !!meta,
        when: e.lastUsedAt,
        sizeBytes: sizes.get(e.id) ?? meta?.sizeBytes ?? null,
        fileCount: count,
        entry: e,
        meta,
      };
    });

    // Cloud saves with no local copy on this device.
    const localIds = new Set(registry.map((e) => e.id));
    const cloudOnly: Row[] = showCloud
      ? cloudList
          .filter((m) => !localIds.has(m.id))
          .map((m) => ({
            id: m.id,
            name: m.name,
            playground: m.playground,
            status: "cloudOnly" as const,
            onDevice: false,
            inCloud: true,
            when: Date.parse(m.updatedAt),
            sizeBytes: m.sizeBytes,
            fileCount: metaFileCount(m),
            meta: m,
          }))
      : [];

    return [...localRows, ...cloudOnly];
  }, [registry, cloudList, sizes, showCloud]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      device: rows.filter((r) => r.onDevice).length,
      cloud: rows.filter((r) => r.inCloud).length,
    }),
    [rows],
  );

  const deviceSizeTotal = useMemo(
    () =>
      rows
        .filter((r) => r.onDevice)
        .reduce((sum, r) => sum + (r.sizeBytes ?? 0), 0),
    [rows],
  );

  const visible = useMemo(() => {
    let r = rows;
    if (location === "device") r = r.filter((x) => x.onDevice);
    else if (location === "cloud") r = r.filter((x) => x.inCloud);
    const q = search.trim().toLowerCase();
    if (q) r = r.filter((x) => x.name.toLowerCase().includes(q));
    const sorted = [...r];
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else sorted.sort((a, b) => b.when - a.when);
    return sorted;
  }, [rows, location, search, sort]);

  // ── Actions ──────────────────────────────────────────────────────────

  const openCloud = useCallback(
    async (meta: CloudWorkspaceMeta) => {
      setBusyId(meta.id);
      setError(null);
      try {
        if (isSqlPlayground(meta.playground)) {
          setPendingBundleRef(meta.playground, { source: "cloud", id: meta.id });
          router.push(`/playground/${meta.playground}`);
          return;
        }
        const local = getWorkspaceRegistry().find((e) => e.id === meta.id);
        if (
          local &&
          local.lastUsedAt > Date.parse(meta.updatedAt) &&
          !window.confirm(
            `The copy of "${meta.name}" in this browser was used more recently than the cloud save. Replace the local copy?`,
          )
        ) {
          setBusyId(null);
          return;
        }
        const bundle = await fetchCloudWorkspaceBundle(meta.id);
        await materializeCodeWorkspace(bundle, { id: meta.id });
        router.push(`/playground/${meta.playground}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setBusyId(null);
      }
    },
    [router],
  );

  const openRow = useCallback(
    (row: Row) => {
      if (busyId) return;
      if (row.onDevice) {
        setActiveWorkspaceId(row.playground, row.id);
        router.push(`/playground/${row.playground}`);
      } else if (row.meta) {
        void openCloud(row.meta);
      }
    },
    [busyId, openCloud, router],
  );

  const handleRename = useCallback(
    async (row: Row, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      await renameWorkspace(row.id, trimmed);
      refreshRegistry();
    },
    [refreshRegistry],
  );

  const handleDuplicate = useCallback(
    async (row: Row, name: string) => {
      await duplicateWorkspace(row.id, name.trim() || `${row.name} (copy)`);
      refreshRegistry();
    },
    [refreshRegistry],
  );

  const handleDelete = useCallback(
    async (row: Row) => {
      setError(null);
      try {
        if (row.onDevice) {
          await deleteWorkspace(row.id);
          refreshRegistry();
        } else {
          setBusyId(row.id);
          await deleteCloudWorkspace(row.id);
          await refreshCloud();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusyId(null);
      }
    },
    [refreshRegistry, refreshCloud],
  );

  // ── Render ───────────────────────────────────────────────────────────

  const hasWorkspaces = hydrated && rows.length > 0;

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        {hasWorkspaces ? (
          <>
            <h1 className={styles.title}>Playground</h1>
            <p className={styles.subtitle}>
              {showCloud
                ? "Your workspaces, on this device and in the cloud."
                : "Workspaces saved in this browser."}
            </p>

            <div className={styles.toolbar}>
              <label className={styles.search}>
                <Search size={14} aria-hidden="true" />
                <input
                  className={styles.searchInput}
                  type="text"
                  placeholder="Search workspaces…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search workspaces"
                />
              </label>
              <SortMenu sort={sort} onChange={setSort} />
              <NewWorkspaceMenu onPick={(href) => router.push(href)} />
            </div>

            {showCloud && (
              <div className={styles.chips}>
                <Chip
                  active={location === "all"}
                  onClick={() => setLocation("all")}
                  label="All"
                  count={counts.all}
                />
                <Chip
                  active={location === "device"}
                  onClick={() => setLocation("device")}
                  label="On this device"
                  count={counts.device}
                  icon={<Monitor size={12} aria-hidden="true" />}
                />
                <Chip
                  active={location === "cloud"}
                  onClick={() => setLocation("cloud")}
                  label="In the cloud"
                  count={counts.cloud}
                  icon={<Cloud size={12} aria-hidden="true" />}
                />
              </div>
            )}

            <div className={styles.divider} />

            {error && (
              <div role="alert" className={styles.errorBanner}>
                {error}
              </div>
            )}

            <div className={styles.list}>
              {visible.length === 0 ? (
                <div
                  style={{
                    padding: "28px 8px",
                    fontSize: 13,
                    color: "#94a3b8",
                  }}
                >
                  No workspaces match your filters.
                </div>
              ) : (
                visible.map((row) => (
                  <WorkspaceRow
                    key={row.id}
                    row={row}
                    showCloud={showCloud}
                    busy={busyId === row.id}
                    onOpen={() => openRow(row)}
                    onRename={() => setRenameTarget(row)}
                    onDuplicate={() => setDuplicateTarget(row)}
                    onDelete={() => setDeleteTarget(row)}
                  />
                ))
              )}
            </div>

            <div className={styles.footer}>
              <span>
                {counts.device} of {counts.all}{" "}
                {counts.all === 1 ? "workspace" : "workspaces"} on this device ·{" "}
                {formatBytes(deviceSizeTotal)}
              </span>
              {showCloud && usage && (
                <span className={styles.footerCloud}>
                  <StorageRing fraction={usage.bytesUsed / usage.bytesLimit} />
                  {formatBytes(usage.bytesUsed)} of {formatBytes(usage.bytesLimit)}{" "}
                  in the cloud · {usage.plan === "pro" ? "Pro" : "Free"} plan
                </span>
              )}
            </div>

            {signedOut && cloudSupported && (
              <div className={styles.cta}>
                <CloudUpload
                  size={20}
                  aria-hidden="true"
                  color="var(--ds-blue, #148CFF)"
                />
                <span className={styles.ctaText}>
                  <strong>Back up to cloud</strong>
                  <span>
                    Sign in to keep a copy of your workspaces in the cloud and
                    open them on any device.
                  </span>
                </span>
                <a className={styles.ctaBtn} href="/sign-in">
                  Sign in
                </a>
              </div>
            )}

            <StartSomethingNew />
          </>
        ) : (
          <LaunchView />
        )}

        <nav aria-label="Site" className={styles.siteLinks}>
          <Link href="/">Dataslope home</Link>
          <Link href="/courses">Free courses</Link>
          <Link href="/pricing">Pricing</Link>
        </nav>
      </div>

      <NameDialog
        open={renameTarget !== null}
        title="Rename workspace"
        desc="Workspaces are scoped per playground; renaming only affects this list."
        confirmLabel="Rename"
        initialName={renameTarget?.name ?? ""}
        onClose={() => setRenameTarget(null)}
        onConfirm={(name) => {
          const t = renameTarget;
          setRenameTarget(null);
          if (t) void handleRename(t, name);
        }}
      />

      <NameDialog
        open={duplicateTarget !== null}
        title="Duplicate workspace"
        desc="Creates a new workspace with a fresh copy of every file and database snapshot."
        confirmLabel="Duplicate"
        initialName={duplicateTarget ? `${duplicateTarget.name} (copy)` : ""}
        onClose={() => setDuplicateTarget(null)}
        onConfirm={(name) => {
          const t = duplicateTarget;
          setDuplicateTarget(null);
          if (t) void handleDuplicate(t, name);
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title={deleteTarget?.onDevice ? "Delete workspace?" : "Delete backup?"}
        desc={
          deleteTarget?.onDevice
            ? `“${deleteTarget?.name}” and all of its files${
                deleteTarget && isSqlPlayground(deleteTarget.playground)
                  ? " and database state"
                  : ""
              } will be permanently removed from this device. This can’t be undone.${
                deleteTarget?.inCloud
                  ? " Its cloud backup is not affected."
                  : ""
              }`
            : `The cloud backup of “${deleteTarget?.name}” will be removed from your account. Copies on your devices are untouched.`
        }
        confirmLabel={deleteTarget?.onDevice ? "Delete" : "Delete backup"}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          const t = deleteTarget;
          setDeleteTarget(null);
          if (t) void handleDelete(t);
        }}
      />
    </main>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Chip({
  active,
  onClick,
  label,
  count,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`${styles.chip}${active ? ` ${styles.chipActive}` : ""}`}
      onClick={onClick}
      aria-pressed={active}
    >
      {icon}
      {label} <span className={styles.chipCount}>{count}</span>
    </button>
  );
}

function SortMenu({
  sort,
  onChange,
}: {
  sort: "recent" | "name";
  onChange: (s: "recent" | "name") => void;
}) {
  const label = sort === "name" ? "Name" : "Recent";
  return (
    <Menu.Root>
      <Menu.Trigger className={styles.sortBtn}>
        <ArrowUpDown size={13} aria-hidden="true" />
        {label}
        <ChevronDown size={12} aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          className={styles.menuPositioner}
          sideOffset={6}
          align="end"
        >
          <Menu.Popup className={styles.menuPopup}>
            <Menu.Item
              className={styles.menuItem}
              onClick={() => onChange("recent")}
            >
              Recently used
              {sort === "recent" && (
                <Check size={14} className={styles.menuCheck} aria-hidden="true" />
              )}
            </Menu.Item>
            <Menu.Item
              className={styles.menuItem}
              onClick={() => onChange("name")}
            >
              Name (A–Z)
              {sort === "name" && (
                <Check size={14} className={styles.menuCheck} aria-hidden="true" />
              )}
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function NewWorkspaceMenu({ onPick }: { onPick: (href: string) => void }) {
  return (
    <Menu.Root>
      <Menu.Trigger className={styles.newBtn}>
        <Plus size={13} strokeWidth={2.4} aria-hidden="true" />
        New workspace
        <ChevronDown size={12} aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          className={styles.menuPositioner}
          sideOffset={6}
          align="end"
        >
          <Menu.Popup className={styles.menuPopup}>
            {PLAYGROUNDS.map((p) => (
              <Menu.Item
                key={p.id}
                className={`${styles.menuItem} ${styles.menuItemIconWhite}`}
                onClick={() => onPick(p.href)}
              >
                <LangGlyph id={p.id} size={16} />
                {p.label}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function WorkspaceRow({
  row,
  showCloud,
  busy,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
}: {
  row: Row;
  showCloud: boolean;
  busy: boolean;
  onOpen: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const sv = statusView(row.status);
  const unit = isSqlPlayground(row.playground) ? "tab" : "file";
  const metaParts: string[] = [];
  if (row.fileCount != null) {
    metaParts.push(`${row.fileCount} ${row.fileCount === 1 ? unit : `${unit}s`}`);
  }
  if (row.sizeBytes != null) metaParts.push(formatBytes(row.sizeBytes));
  metaParts.push(formatRelative(row.when));

  return (
    <div className={styles.row}>
      <span className={`${styles.rowIcon}${!row.onDevice ? ` ${styles.rowIconCloud}` : ""}`}>
        <LangGlyph id={row.playground} size={20} />
      </span>
      <button
        type="button"
        className={styles.rowMain}
        onClick={onOpen}
        disabled={busy}
        title={row.onDevice ? "Open workspace" : "Open on this device"}
      >
        <span className={styles.rowName}>{row.name}</span>
        <span className={styles.rowMeta}>
          {metaParts.map((part, i) => (
            <span key={i}>
              {i > 0 && <span className={styles.rowMetaSep}>·</span>}{" "}
              {part}
            </span>
          ))}
        </span>
      </button>

      {showCloud && (
        <span className={styles.rowStatus} title={sv.label}>
          {sv.device ? (
            <Monitor size={13} color={sv.color} aria-hidden="true" />
          ) : (
            <Cloud size={13} color={sv.color} aria-hidden="true" />
          )}
          {sv.label}
        </span>
      )}

      <RowMenu
        row={row}
        busy={busy}
        onOpen={onOpen}
        onRename={onRename}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />
    </div>
  );
}

function RowMenu({
  row,
  busy,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
}: {
  row: Row;
  busy: boolean;
  onOpen: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <Menu.Root>
      <Menu.Trigger
        className={styles.kebab}
        aria-label={`Actions for ${row.name}`}
        disabled={busy}
      >
        <MoreHorizontal size={16} aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          className={styles.menuPositioner}
          sideOffset={6}
          align="end"
        >
          <Menu.Popup className={styles.menuPopup}>
            {row.onDevice ? (
              <>
                <Menu.Item className={styles.menuItem} onClick={onOpen}>
                  <ArrowRight size={14} aria-hidden="true" />
                  Open
                </Menu.Item>
                <Menu.Item className={styles.menuItem} onClick={onRename}>
                  <Pencil size={14} aria-hidden="true" />
                  Rename…
                </Menu.Item>
                <Menu.Item className={styles.menuItem} onClick={onDuplicate}>
                  <Copy size={14} aria-hidden="true" />
                  Duplicate…
                </Menu.Item>
                <div className={styles.menuDivider} />
                <Menu.Item
                  className={`${styles.menuItem} ${styles.menuItemDanger}`}
                  onClick={onDelete}
                >
                  <Trash2 size={14} aria-hidden="true" />
                  Delete…
                </Menu.Item>
              </>
            ) : (
              <>
                <Menu.Item className={styles.menuItem} onClick={onOpen}>
                  <CloudDownload size={14} aria-hidden="true" />
                  Open on this device
                </Menu.Item>
                <div className={styles.menuDivider} />
                <Menu.Item
                  className={`${styles.menuItem} ${styles.menuItemDanger}`}
                  onClick={onDelete}
                >
                  <Trash2 size={14} aria-hidden="true" />
                  Delete backup…
                </Menu.Item>
              </>
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function StartSomethingNew() {
  return (
    <div className={styles.startSection}>
      <div className={styles.startLabel}>Start something new</div>
      <div className={styles.startGrid}>
        {PLAYGROUNDS.map((p) => (
          <Link
            key={p.id}
            href={p.href}
            prefetch={false}
            className={styles.startItem}
          >
            <span className={styles.startItemIcon}>
              <LangGlyph id={p.id} size={18} />
            </span>
            {p.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

/** The pre-hydration + no-workspaces view: the SEO-friendly language directory. */
function LaunchView() {
  const featured = FEATURED_IDS.map(
    (id) => PLAYGROUNDS.find((p) => p.id === id)!,
  ).filter(Boolean);
  const featuredSet = new Set(FEATURED_IDS);
  const more = PLAYGROUNDS.filter((p) => !featuredSet.has(p.id));

  return (
    <>
      <h1 className={styles.title}>Playground</h1>
      <p className={styles.subtitle}>
        Browser-based language playgrounds. Pick one to start, no sign-up,
        nothing to install.
      </p>

      <div className={styles.featuredGrid}>
        {featured.map((p) => (
          <Link
            key={p.id}
            href={p.href}
            prefetch={false}
            className={styles.featuredItem}
          >
            <span className={styles.featuredIcon}>
              <LangGlyph id={p.id} size={24} />
            </span>
            <span className={styles.featuredText}>
              <strong className={styles.featuredName}>{p.label}</strong>
              <span className={styles.featuredShort}>
                {LANG_SHORTS[p.id] ?? ""}
              </span>
            </span>
          </Link>
        ))}
      </div>

      <div className={styles.moreRow}>
        {more.map((p) => (
          <Link
            key={p.id}
            href={p.href}
            prefetch={false}
            className={styles.moreItem}
          >
            <span className={styles.moreIcon}>
              <LangGlyph id={p.id} size={15} />
            </span>
            {p.label}
          </Link>
        ))}
      </div>

      <p className={styles.emptyNote}>
        Workspaces you save in a playground appear here, on this device, and in
        the cloud when you back them up.
      </p>
    </>
  );
}

// ---------------------------------------------------------------------------
// Dialogs
// ---------------------------------------------------------------------------

function NameDialog({
  open,
  title,
  desc,
  confirmLabel,
  initialName,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  desc: string;
  confirmLabel: string;
  initialName: string;
  onClose: () => void;
  onConfirm: (name: string) => void;
}) {
  const [draft, setDraft] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setDraft(initialName);
  }, [open, initialName]);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className={styles.dialogBackdrop} />
        <Dialog.Popup className={styles.dialogPopup}>
          <Dialog.Title className={styles.dialogTitle}>{title}</Dialog.Title>
          <Dialog.Description className={styles.dialogDesc}>
            {desc}
          </Dialog.Description>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onConfirm(draft);
            }}
          >
            <input
              className={styles.dialogInput}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              aria-label={title}
            />
            <div className={styles.dialogActions}>
              <Dialog.Close className={`${styles.btn} ${styles.btnSecondary}`}>
                Cancel
              </Dialog.Close>
              <button
                type="submit"
                className={`${styles.btn} ${styles.btnPrimary}`}
              >
                {confirmLabel}
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ConfirmDialog({
  open,
  title,
  desc,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  desc: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className={styles.dialogBackdrop} />
        <AlertDialog.Popup className={styles.dialogPopup}>
          <AlertDialog.Title className={styles.dialogTitle}>
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className={styles.dialogDesc}>
            {desc}
          </AlertDialog.Description>
          <div className={styles.dialogActions}>
            <AlertDialog.Close className={`${styles.btn} ${styles.btnSecondary}`}>
              Cancel
            </AlertDialog.Close>
            <AlertDialog.Close
              className={`${styles.btn} ${styles.btnDanger}`}
              onClick={onConfirm}
            >
              {confirmLabel}
            </AlertDialog.Close>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
