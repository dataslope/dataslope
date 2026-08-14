"use client";

/**
 * Workspace badge + popover + manager drawer used by every playground
 * header. Renders the current workspace name as a pill button; clicking
 * opens a popover listing recent workspaces for this playground with
 * "New" and "Manage" affordances. The Manage button promotes the popover
 * into a Drawer-backed full manager (rename / delete / duplicate +
 * per-workspace size estimate).
 *
 * This menu is also the single home for cloud backups (workspaceCloud.tsx):
 * cloud saves share their id with the local workspace, so instead of a
 * separate "Cloud" dialog with a second list, each local row carries its
 * backup status, backups that exist only on the account are listed as
 * "on your account" rows, and the active workspace gets one "Back up"
 * action. Sharing stays separate (ShareControls), publishing an immutable
 * link is a different intent than saving.
 *
 * Workspace switching is implemented as `setActiveWorkspaceId` followed
 * by `window.location.reload()`, engines and editor state rebuild from
 * scratch as a side effect of the reload, which is both simpler and
 * indistinguishable from an in-place tear-down to the user.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Popover } from "@base-ui/react/popover";
import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import { Drawer } from "@base-ui/react/drawer";
import {
  Check,
  Cloud,
  CloudDownload,
  CloudOff,
  CloudUpload,
  Copy as CopyIcon,
  Download,
  Folder,
  FolderDown,
  HardDrive,
  Info,
  Loader2,
  LogIn,
  Pencil,
  Plus,
  Save,
  Settings2,
  Trash2,
  Upload,
} from "lucide-react";
import {
  createWorkspace,
  deleteWorkspace,
  duplicateWorkspace,
  getWorkspaceRegistry,
  renameWorkspace,
  type WorkspaceEntry,
} from "../opfs/workspace";
import {
  isWorkspaceDirty,
  switchActiveWorkspace,
} from "../opfs/activeWorkspace";
import { estimateWorkspaceSize } from "../opfs/fileStorage";
import {
  downloadWorkspaceZip,
  importWorkspaceFromZip,
} from "../opfs/workspaceArchive";
import {
  isSqlPlayground,
  type CloudWorkspaceMeta,
  type BuildBundle,
} from "@/lib/workspaces/types";
import { INACTIVITY_EXPIRY_DAYS } from "@/lib/workspaces/policy";
import { deleteCloudWorkspace } from "../cloud/cloudApi";
import {
  backUpWorkspace,
  isBackupStale,
  openCloudSave,
  useCloudBackups,
  type CloudBackups,
} from "./workspaceCloud";
import {
  useWorkspaceAutoSync,
  type AutoSyncStatus,
} from "./useWorkspaceAutoSync";

const RECENT_LIMIT = 6;

export interface WorkspaceBadgeProps {
  /** The playground this badge belongs to ("python", "sqlite", …). */
  playgroundId: string;
  /** Currently-active workspace id (from `ensureActiveWorkspace`). */
  activeWorkspaceId: string | null;
  /** Currently-active workspace display name. */
  activeWorkspaceName: string;
  /** Optional controlled state for the full workspace-manager drawer.
   *  Lets a host open the manager directly, e.g. the mobile hamburger
   *  menu, which hides the badge pill but still needs a way in. When
   *  omitted the badge manages the manager itself. */
  managerOpen?: boolean;
  onManagerOpenChange?: (open: boolean) => void;
  /** True when the active workspace is an unsaved draft that the user has
   *  changed, surfaces a "Save" button next to the badge. Drafts (the
   *  auto-created default) stay out of the saved list until saved. */
  unsaved?: boolean;
  /** Invoked with the chosen name when the user saves an unsaved draft.
   *  The host promotes the draft to a saved workspace (see
   *  `saveDraftWorkspace`). */
  onSave?: (name: string) => void | Promise<void>;
  /** Serializes the CURRENT playground state into a bundle, the same
   *  builder the Share dialog uses. Powers "Back up" for the active
   *  workspace; when omitted, the backup action is hidden (cloud rows and
   *  statuses still render). */
  buildBundle?: BuildBundle;
  /** Render no header UI (badge pill, sync status, save menu) — keep only
   *  the auto-sync engine and the workspace-manager drawer mounted. The
   *  simplified header (PlaygroundHeaderControls) owns the visible
   *  save/rename controls and opens the manager through `managerOpen`. */
  hideBadge?: boolean;
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

/** A friendly default name for a newly-created workspace, e.g.
 *  "Workspace 2", instead of a raw `toLocaleString()` timestamp (which
 *  was meaningless and truncated in the header badge). Reads naturally
 *  next to the auto-created "Default <playground>". */
export function defaultWorkspaceName(
  registry: WorkspaceEntry[],
  playgroundId: string,
): string {
  const count = registry.filter((e) => e.playground === playgroundId).length;
  return `Workspace ${count + 1}`;
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

/** One-line backup status for a workspace, e.g. "Backed up 5m ago". "Opened
 *  since" flags that the backup predates the last open, the registry tracks
 *  opens, not edits, so it's a prompt to back up again, not a diff. */
function backupStatusText(
  meta: CloudWorkspaceMeta | undefined,
  stale: boolean,
): string {
  if (!meta) return "Not backed up";
  const rel = formatRelative(Date.parse(meta.updatedAt));
  return stale ? `Backed up ${rel} · opened since` : `Backed up ${rel}`;
}

/** Passive cloud-sync indicator that replaces the old manual "Back up" button
 *  for signed-in users. The transient phases (saving / offline / error) come
 *  from the auto-sync engine; the resting state reflects the last known backup
 *  of the active workspace. */
function WorkspaceSyncStatus({
  status,
  activeMeta,
  loaded,
  className = "",
}: {
  status: AutoSyncStatus;
  activeMeta: CloudWorkspaceMeta | undefined;
  loaded: boolean;
  className?: string;
}) {
  let icon: ReactNode;
  let label: string;
  let title: string | undefined;
  let tone = "";
  switch (status.phase) {
    case "pending":
    case "saving":
      icon = <Loader2 size={12} aria-hidden="true" className="cloud-spin" />;
      label = "Saving…";
      break;
    case "offline":
      icon = <CloudOff size={12} aria-hidden="true" />;
      label = "Offline";
      tone = "warn";
      title =
        "You're offline. Your work is saved on this device and syncs when you reconnect.";
      break;
    case "error":
      icon = <Info size={12} aria-hidden="true" />;
      label = "Sync paused";
      tone = "warn";
      title = status.error ?? undefined;
      break;
    case "saved":
      icon = <Cloud size={12} aria-hidden="true" />;
      label = "Backed up";
      title = "Backed up to your account.";
      break;
    default:
      // Resting state: reflect the last known backup of this workspace.
      icon = <Cloud size={12} aria-hidden="true" />;
      if (!loaded) {
        label = "Checking…";
      } else if (activeMeta) {
        label = `Backed up ${formatRelative(Date.parse(activeMeta.updatedAt))}`;
        title = "Backed up to your account.";
      } else {
        label = "Saved on this device";
        title =
          "Saved on this device. It backs up to your account automatically.";
      }
  }
  return (
    <span
      className={`workspace-sync-status${tone ? ` ${tone}` : ""}${
        className ? ` ${className}` : ""
      }`}
      title={title}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
}

/** Inline "backed up Xm ago" marker appended to a local row's meta line. */
function CloudStatusInline({
  entry,
  meta,
}: {
  entry: WorkspaceEntry;
  meta: CloudWorkspaceMeta;
}) {
  const stale = isBackupStale(entry, meta);
  return (
    <span
      className={`workspace-cloud-status${stale ? " stale" : ""}`}
      title={
        stale
          ? "Opened since its last backup. If you've changed anything since, back up again to capture it."
          : "Backed up to your account."
      }
    >
      {" · "}
      <Cloud size={10} aria-hidden="true" />{" "}
      {formatRelative(Date.parse(meta.updatedAt))}
    </span>
  );
}

export function WorkspaceBadge({
  playgroundId,
  activeWorkspaceId,
  activeWorkspaceName,
  managerOpen: managerOpenProp,
  onManagerOpenChange,
  unsaved = false,
  onSave,
  buildBundle,
  hideBadge = false,
}: WorkspaceBadgeProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  // The Save menu's dialog: "local" names the draft; "both" also backs the
  // freshly-saved workspace up to the account afterwards.
  const [saveDialogMode, setSaveDialogMode] = useState<
    "local" | "both" | null
  >(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [internalManagerOpen, setInternalManagerOpen] = useState(false);
  // Controlled when the host passes `managerOpen`/`onManagerOpenChange`
  // (the mobile hamburger does), otherwise self-managed.
  const managerOpen = managerOpenProp ?? internalManagerOpen;
  const setManagerOpen = useCallback(
    (open: boolean) => {
      if (onManagerOpenChange) onManagerOpenChange(open);
      else setInternalManagerOpen(open);
    },
    [onManagerOpenChange],
  );
  const [registry, setRegistry] = useState<WorkspaceEntry[]>([]);
  // Cached byte-size estimates for the recent workspaces, prefetched
  // whenever the popover opens. State is retained between opens so
  // subsequent opens render the previous size synchronously and update
  // in place when the fresh estimate lands.
  const [popoverSizes, setPopoverSizes] = useState<Map<string, number>>(
    () => new Map(),
  );

  // Hydrate registry on the client only, `getWorkspaceRegistry` reads
  // localStorage which is undefined on the server. Re-read whenever the
  // popover or manager is opened so we always reflect deletions from
  // other tabs.
  const refreshRegistry = useCallback(() => {
    setRegistry(getWorkspaceRegistry());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshRegistry();
  }, [refreshRegistry, activeWorkspaceId]);

  // Recent = workspaces for this playground sorted by lastUsedAt desc.
  const recent = useMemo(
    () =>
      registry
        .filter((e) => e.playground === playgroundId)
        .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
        .slice(0, RECENT_LIMIT),
    [registry, playgroundId],
  );

  // Cloud backups for this playground. Cloud saves share ids with local
  // workspaces, so `cloudById` decorates local rows with their backup and
  // `cloudOnly` is the remainder, backups with no copy on this device.
  const cloud = useCloudBackups(playgroundId, popoverOpen || managerOpen);
  const { refresh: refreshCloud } = cloud;
  const cloudById = useMemo(() => {
    const map = new Map<string, CloudWorkspaceMeta>();
    for (const meta of cloud.metas) map.set(meta.id, meta);
    return map;
  }, [cloud.metas]);
  const cloudOnly = useMemo(
    () =>
      cloud.metas.filter(
        (m) =>
          m.id !== activeWorkspaceId && // an unsaved draft's backup isn't "elsewhere"
          !registry.some((e) => e.id === m.id),
      ),
    [cloud.metas, registry, activeWorkspaceId],
  );
  const showCloud = cloud.available && !cloud.signedOut;
  // Auto-sync is code-playgrounds-only: a SQL backup carries a full binary
  // database image, too heavy to push on every change (and sample-database
  // loads would spam it), so SQL keeps the manual Save/Back-up controls
  // instead of auto-syncing. (Local OPFS persistence is separate and stays
  // automatic; identical re-uploads are also skipped via content hash in
  // saveCloudWorkspace.)
  const autoSyncActive = showCloud && !isSqlPlayground(playgroundId);

  const [backupBusy, setBackupBusy] = useState(false);
  const [cloudBusyId, setCloudBusyId] = useState<string | null>(null);
  const [cloudError, setCloudError] = useState<string | null>(null);

  const handleBackUp = useCallback(async () => {
    if (!activeWorkspaceId || !buildBundle) return;
    setBackupBusy(true);
    setCloudError(null);
    try {
      await backUpWorkspace(activeWorkspaceId, buildBundle);
      await refreshCloud();
    } catch (err) {
      setCloudError(err instanceof Error ? err.message : String(err));
    } finally {
      setBackupBusy(false);
    }
  }, [activeWorkspaceId, buildBundle, refreshCloud]);

  const handleOpenCloudOnly = useCallback(
    async (meta: CloudWorkspaceMeta) => {
      setCloudBusyId(meta.id);
      setCloudError(null);
      try {
        await openCloudSave(playgroundId, meta, activeWorkspaceId);
        // success ends in a navigation, no state to restore
      } catch (err) {
        setCloudError(err instanceof Error ? err.message : String(err));
        setCloudBusyId(null);
      }
    },
    [playgroundId, activeWorkspaceId],
  );

  // Backup state of the ACTIVE workspace, surfaced as a dot on the pill:
  // gray = in this browser only, green = backed up, amber = opened since
  // its last backup. No dot for guests (nothing to report).
  const activeEntry = useMemo(
    () => registry.find((e) => e.id === activeWorkspaceId),
    [registry, activeWorkspaceId],
  );
  // Not in the registry → an unsaved draft. "Save locally" names it; once
  // registered, local persistence is automatic (OPFS), so the Save menu's
  // local option flips to a passive "saved" state.
  const isDraft = !activeEntry;
  const activeMeta = activeWorkspaceId
    ? cloudById.get(activeWorkspaceId)
    : undefined;
  const activeStale =
    !!activeMeta && isBackupStale(activeEntry, activeMeta);
  // The dot only distinguishes "backed up" from "not backed up". "Opened
  // since" stays a textual note: the registry tracks opens, not edits, so an
  // amber dot here fired on every reopen and taught users to ignore it.
  let backupDot: "local" | "fresh" | null = null;
  if (showCloud && cloud.loaded && activeWorkspaceId) {
    backupDot = !activeMeta ? "local" : "fresh";
  }
  const badgeTitle = `Active workspace: ${activeWorkspaceName || "(unnamed)"}${
    backupDot
      ? `, ${backupStatusText(activeMeta, activeStale).toLowerCase()}`
      : ""
  }`;

  // Unsynced local work with the user now signed in: a saved workspace with no
  // cloud backup, or a draft the user actually changed (the persisted dirty
  // latch, so a pristine default never uploads). Makes signing in sufficient
  // to get guest work backed up, no fresh edit required. A successful backup
  // refreshes the cloud list, which flips this off.
  const needsInitialBackup =
    autoSyncActive &&
    cloud.loaded &&
    !!activeWorkspaceId &&
    !activeMeta &&
    (!isDraft || isWorkspaceDirty(activeWorkspaceId));

  // Signed-in playgrounds back up to the cloud automatically, there is no
  // manual "Back up" button. The first change to an unsaved draft promotes it
  // (so the backup lands on a stable, listed workspace) and then syncs. OPFS
  // stays the local source of truth, so an offline or failed sync never loses
  // work; the hook retries when the connection returns.
  const autoSync = useWorkspaceAutoSync({
    enabled: autoSyncActive,
    activeWorkspaceId,
    isDraft,
    playgroundId,
    buildBundle,
    promoteDraft: onSave
      ? () => onSave(activeWorkspaceName || "Workspace")
      : undefined,
    onSynced: () => {
      void refreshCloud();
      refreshRegistry();
    },
    needsInitialBackup,
  });

  // Prefetch sizes when the popover opens. Each `estimateWorkspaceSize`
  // call is independent so we fire them in parallel and stream results
  // into the size map as they land, no flicker on subsequent opens
  // because the previous map is retained between renders.
  useEffect(() => {
    if (!popoverOpen) return;
    let cancelled = false;
    const ids = recent.map((ws) => ws.id);
    void Promise.all(
      ids.map(async (id) => {
        const bytes = await estimateWorkspaceSize(id);
        if (cancelled) return;
        setPopoverSizes((prev) => {
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
  }, [popoverOpen, recent]);

  const handleSwitch = useCallback(
    (workspaceId: string) => {
      if (workspaceId === activeWorkspaceId) {
        setPopoverOpen(false);
        return;
      }
      switchActiveWorkspace(playgroundId, workspaceId);
    },
    [playgroundId, activeWorkspaceId],
  );

  const handleCreateNew = useCallback(async () => {
    const created = await createWorkspace(
      defaultWorkspaceName(registry, playgroundId),
      playgroundId,
    );
    switchActiveWorkspace(playgroundId, created.id);
  }, [playgroundId, registry]);

  const openManager = useCallback(() => {
    refreshRegistry();
    setPopoverOpen(false);
    setManagerOpen(true);
  }, [refreshRegistry, setManagerOpen]);

  return (
    <>
      {!hideBadge && (
      <Popover.Root open={popoverOpen} onOpenChange={setPopoverOpen}>
        <Popover.Trigger
          className="workspace-badge"
          title={badgeTitle}
          aria-label="Active workspace"
        >
          <Folder size={12} aria-hidden="true" />
          <span className="workspace-badge-name">
            {activeWorkspaceName || "Workspace"}
          </span>
          {backupDot && (
            <span
              className={`workspace-badge-dot ${backupDot}`}
              aria-hidden="true"
            />
          )}
          <svg viewBox="0 0 12 12" width={9} height={9} aria-hidden="true">
            <polyline
              points="2,4 6,8 10,4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner sideOffset={6} align="start" className="playground-header-positioner">
            <Popover.Popup className="bui-popup workspace-popover">
              <div className="workspace-popover-header">
                <span>Workspaces for {playgroundLabel(playgroundId)}</span>
                <button
                  type="button"
                  className="workspace-popover-info-btn"
                  aria-label="How workspaces and backups work"
                  aria-expanded={infoOpen}
                  title="How workspaces and backups work"
                  onClick={() => setInfoOpen((v) => !v)}
                >
                  <Info size={13} aria-hidden="true" />
                </button>
              </div>
              {infoOpen && (
                <div className="workspace-popover-info">
                  Workspaces are separate copies of this playground&rsquo;s
                  files{isSqlPlayground(playgroundId) ? " and database" : ""},
                  auto-saved in this browser as you work. Backing up puts a
                  snapshot on your account so you can open it on any device,
                  it only changes when you back up again.
                </div>
              )}
              <div className="workspace-popover-body">
                {recent.length === 0 && (
                  <div className="workspace-popover-empty">
                    No workspaces yet.
                  </div>
                )}
                {recent.map((ws) => {
                  const active = ws.id === activeWorkspaceId;
                  return (
                    <button
                      type="button"
                      key={ws.id}
                      className={`workspace-popover-item${active ? " active" : ""}`}
                      onClick={() => handleSwitch(ws.id)}
                    >
                      <span className="workspace-popover-item-check">
                        {active ? <Check size={12} aria-hidden="true" /> : null}
                      </span>
                      <span className="workspace-popover-item-text">
                        <span className="workspace-popover-item-name">
                          {ws.name}
                        </span>
                        <span className="workspace-popover-item-meta">
                          Last opened {formatRelative(ws.lastUsedAt)}
                          {popoverSizes.has(ws.id) && (
                            <>
                              {" · "}
                              {formatBytes(popoverSizes.get(ws.id) ?? 0)}
                            </>
                          )}
                          {showCloud && cloudById.has(ws.id) && (
                            <CloudStatusInline
                              entry={ws}
                              meta={cloudById.get(ws.id)!}
                            />
                          )}
                        </span>
                      </span>
                    </button>
                  );
                })}
                {showCloud && cloudOnly.length > 0 && (
                  <>
                    <div className="workspace-popover-subheader">
                      Cloud, not on this device
                    </div>
                    {cloudOnly.map((meta) => (
                      <button
                        type="button"
                        key={meta.id}
                        className="workspace-popover-item"
                        onClick={() => void handleOpenCloudOnly(meta)}
                        disabled={cloudBusyId !== null}
                        title="Open this backup on this device"
                      >
                        <span className="workspace-popover-item-check">
                          {cloudBusyId === meta.id ? (
                            <Loader2
                              size={12}
                              aria-hidden="true"
                              className="cloud-spin"
                            />
                          ) : (
                            <CloudDownload size={12} aria-hidden="true" />
                          )}
                        </span>
                        <span className="workspace-popover-item-text">
                          <span className="workspace-popover-item-name">
                            {meta.name}
                          </span>
                          <span className="workspace-popover-item-meta">
                            Saved {formatRelative(Date.parse(meta.updatedAt))}
                            {" · "}
                            {formatBytes(meta.sizeBytes)}
                          </span>
                        </span>
                      </button>
                    ))}
                  </>
                )}
              </div>
              {cloud.available &&
                (cloud.signedOut ? (
                  <a href="/sign-in" className="workspace-popover-signin">
                    <LogIn size={12} aria-hidden="true" />
                    <span>Sign in to back up workspaces</span>
                  </a>
                ) : (
                  <div className="workspace-popover-cloud">
                    <div className="workspace-popover-cloud-row">
                      {autoSyncActive ? (
                        // Code playgrounds auto-sync, no manual "Back up".
                        <WorkspaceSyncStatus
                          status={autoSync}
                          activeMeta={activeMeta}
                          loaded={cloud.loaded}
                          className="in-popover"
                        />
                      ) : (
                        // SQL: back up on demand (dumps are too heavy to auto-sync).
                        <>
                          {buildBundle && (
                            <button
                              type="button"
                              className="workspace-popover-backup-btn"
                              onClick={() => void handleBackUp()}
                              disabled={backupBusy || !activeWorkspaceId}
                              title={`Back up “${activeWorkspaceName || "this workspace"}” to your account`}
                            >
                              {backupBusy ? (
                                <Loader2
                                  size={12}
                                  aria-hidden="true"
                                  className="cloud-spin"
                                />
                              ) : (
                                <CloudUpload size={12} aria-hidden="true" />
                              )}
                              <span>
                                {backupBusy ? "Backing up…" : "Back up"}
                              </span>
                            </button>
                          )}
                          <span
                            className={`workspace-popover-backup-status${activeStale ? " stale" : ""}`}
                          >
                            {cloud.loaded
                              ? backupStatusText(activeMeta, activeStale)
                              : "Checking backups…"}
                          </span>
                        </>
                      )}
                    </div>
                    {(autoSync.error ?? cloudError ?? cloud.error) && (
                      <p role="alert" className="workspace-popover-cloud-error">
                        {autoSync.error ?? cloudError ?? cloud.error}
                      </p>
                    )}
                    {cloud.usage && (
                      <div className="workspace-popover-usage">
                        {formatBytes(cloud.usage.bytesUsed)} of{" "}
                        {formatBytes(cloud.usage.bytesLimit)} cloud storage used
                      </div>
                    )}
                  </div>
                ))}
              <div className="workspace-popover-footer">
                <button
                  type="button"
                  className="workspace-popover-action"
                  onClick={() => {
                    void handleCreateNew();
                  }}
                >
                  <Plus size={12} aria-hidden="true" />
                  <span>New</span>
                </button>
                <button
                  type="button"
                  className="workspace-popover-action"
                  onClick={openManager}
                >
                  <Settings2 size={12} aria-hidden="true" />
                  <span>Manage…</span>
                </button>
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      )}

      {/* Code playgrounds auto-sync: a passive status replaces the manual
          Save/Back-up control. SQL playgrounds and guests keep the Save menu
          (guests to name a browser-saved draft; SQL to back up on demand). */}
      {!hideBadge && autoSyncActive && (
        <WorkspaceSyncStatus
          status={autoSync}
          activeMeta={activeMeta}
          loaded={cloud.loaded}
        />
      )}
      {!hideBadge && !autoSyncActive && onSave && (
        <Menu.Root>
          <Menu.Trigger
            className={`workspace-save-btn${unsaved ? "" : " quiet"}`}
            title="Save this workspace, locally, to your account, or both"
          >
            <Save size={12} aria-hidden="true" />
            <span>Save</span>
            <svg viewBox="0 0 12 12" width={9} height={9} aria-hidden="true">
              <polyline
                points="2,4 6,8 10,4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner
              sideOffset={6}
              align="start"
              className="playground-header-positioner"
            >
              <Menu.Popup className="bui-popup workspace-save-menu">
                <Menu.Item
                  className="example-item"
                  disabled={!isDraft}
                  onClick={() => {
                    if (isDraft) setSaveDialogMode("local");
                  }}
                >
                  <div className="ex-title">
                    {isDraft ? "Save locally…" : "Saved locally"}
                  </div>
                  <div className="ex-desc">
                    {isDraft
                      ? "Name this workspace and keep it in this browser"
                      : "Auto-saves in this browser as you work"}
                  </div>
                </Menu.Item>
                {cloud.available &&
                  (cloud.signedOut ? (
                    <Menu.Item
                      className="example-item"
                      render={<a href="/sign-in" />}
                    >
                      <div className="ex-title">Back up to cloud</div>
                      <div className="ex-desc">
                        Sign in to keep a copy on your account
                      </div>
                    </Menu.Item>
                  ) : (
                    <Menu.Item
                      className="example-item"
                      disabled={backupBusy || !activeWorkspaceId || !buildBundle}
                      onClick={() => void handleBackUp()}
                    >
                      <div className="ex-title">Back up to cloud</div>
                      <div className="ex-desc">
                        {backupBusy
                          ? "Backing up…"
                          : "Keep a snapshot on your account"}
                      </div>
                    </Menu.Item>
                  ))}
                {cloud.available && (
                  <Menu.Item
                    className="example-item"
                    disabled={
                      !isDraft || cloud.signedOut || backupBusy || !buildBundle
                    }
                    onClick={() => {
                      if (isDraft && !cloud.signedOut) {
                        setSaveDialogMode("both");
                      }
                    }}
                  >
                    <div className="ex-title">Save locally + back up</div>
                    <div className="ex-desc">
                      {!isDraft
                        ? "Already saved locally, use “Back up to cloud”"
                        : cloud.signedOut
                          ? "Sign in to enable cloud backups"
                          : "Name it here and keep a copy on your account"}
                    </div>
                  </Menu.Item>
                )}
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      )}

      <SaveWorkspaceDialog
        open={saveDialogMode !== null}
        alsoBackUp={saveDialogMode === "both"}
        defaultName={defaultWorkspaceName(registry, playgroundId)}
        onClose={() => setSaveDialogMode(null)}
        onConfirm={async (name) => {
          const mode = saveDialogMode;
          setSaveDialogMode(null);
          await onSave?.(name);
          refreshRegistry();
          // The draft keeps its id when promoted, so the backup lands on
          // the same workspace the badge is showing.
          if (mode === "both") await handleBackUp();
        }}
      />

      <WorkspaceManagerDrawer
        open={managerOpen}
        onOpenChange={setManagerOpen}
        playgroundId={playgroundId}
        activeWorkspaceId={activeWorkspaceId}
        registry={registry}
        onRegistryChange={refreshRegistry}
        cloud={cloud}
      />
    </>
  );
}

function SaveWorkspaceDialog({
  open,
  alsoBackUp,
  defaultName,
  onClose,
  onConfirm,
}: {
  open: boolean;
  /** True for the Save menu's "Save locally + back up" path, the copy and
   *  the primary button reflect that a cloud backup follows the save. */
  alsoBackUp: boolean;
  defaultName: string;
  onClose: () => void;
  onConfirm: (name: string) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setDraft(defaultName);
  }, [open, defaultName]);
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="confirm-backdrop" />
        <Dialog.Popup className="confirm-popup sql-rename-popup">
          <Dialog.Title className="confirm-title">Save workspace</Dialog.Title>
          <Dialog.Description className="confirm-desc">
            {alsoBackUp
              ? "Give this workspace a name to add it to your saved list. It stays in this browser, and a snapshot is backed up to your account."
              : "Give this workspace a name to add it to your saved list. Saved workspaces live in this browser, use “Back up to cloud” in the Save menu to keep a copy on your account."}
          </Dialog.Description>
          <form
            className="sql-rename-form"
            onSubmit={(e) => {
              e.preventDefault();
              const name = draft.trim() || defaultName;
              void onConfirm(name);
            }}
          >
            <input
              className="sql-rename-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
            />
            <div className="confirm-actions">
              <Dialog.Close className="confirm-btn confirm-btn-secondary">
                Cancel
              </Dialog.Close>
              <button type="submit" className="confirm-btn confirm-btn-primary">
                {alsoBackUp ? "Save & back up" : "Save"}
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function playgroundLabel(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

// ---------------------------------------------------------------------------
// Manager Drawer
// ---------------------------------------------------------------------------

interface WorkspaceManagerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playgroundId: string;
  activeWorkspaceId: string | null;
  registry: WorkspaceEntry[];
  onRegistryChange: () => void;
  cloud: CloudBackups;
}

function WorkspaceManagerDrawer({
  open,
  onOpenChange,
  playgroundId,
  activeWorkspaceId,
  registry,
  onRegistryChange,
  cloud,
}: WorkspaceManagerDrawerProps) {
  const list = useMemo(
    () =>
      registry
        .filter((e) => e.playground === playgroundId)
        .sort((a, b) => b.lastUsedAt - a.lastUsedAt),
    [registry, playgroundId],
  );

  const [sizes, setSizes] = useState<Map<string, number>>(() => new Map());
  const [renameTarget, setRenameTarget] = useState<WorkspaceEntry | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<WorkspaceEntry | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<WorkspaceEntry | null>(null);
  const [busy, setBusy] = useState<
    { id: string; action: "export" | "import" } | null
  >(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  // Cloud state mirrors the popover: same id-keyed model, richer actions.
  const { refresh: refreshCloud } = cloud;
  const cloudById = useMemo(() => {
    const map = new Map<string, CloudWorkspaceMeta>();
    for (const meta of cloud.metas) map.set(meta.id, meta);
    return map;
  }, [cloud.metas]);
  const cloudOnly = useMemo(
    () =>
      cloud.metas.filter(
        (m) =>
          m.id !== activeWorkspaceId &&
          !registry.some((e) => e.id === m.id),
      ),
    [cloud.metas, registry, activeWorkspaceId],
  );
  const showCloud = cloud.available && !cloud.signedOut;
  const [cloudBusyId, setCloudBusyId] = useState<string | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<CloudWorkspaceMeta | null>(
    null,
  );
  const [cloudDeleteTarget, setCloudDeleteTarget] =
    useState<CloudWorkspaceMeta | null>(null);

  const handleOpenCloud = useCallback(
    async (meta: CloudWorkspaceMeta) => {
      setCloudBusyId(meta.id);
      setOperationError(null);
      try {
        await openCloudSave(playgroundId, meta, activeWorkspaceId);
        // success ends in a navigation, no state to restore
      } catch (err) {
        setOperationError(err instanceof Error ? err.message : String(err));
        setCloudBusyId(null);
      }
    },
    [playgroundId, activeWorkspaceId],
  );

  const handleDeleteCloud = useCallback(
    async (meta: CloudWorkspaceMeta) => {
      setCloudBusyId(meta.id);
      setOperationError(null);
      try {
        await deleteCloudWorkspace(meta.id);
        await refreshCloud();
      } catch (err) {
        setOperationError(err instanceof Error ? err.message : String(err));
      } finally {
        setCloudBusyId(null);
      }
    },
    [refreshCloud],
  );

  // Recompute byte sizes whenever the drawer opens or the workspace list
  // changes. We rebuild the full map rather than diffing because the
  // recalculation is cheap (one async pass per workspace, no UI block).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const next = new Map<string, number>();
      for (const ws of list) {
        const bytes = await estimateWorkspaceSize(ws.id);
        if (cancelled) return;
        next.set(ws.id, bytes);
      }
      if (!cancelled) setSizes(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, list]);

  const handleCreateNew = useCallback(async () => {
    const created = await createWorkspace(
      defaultWorkspaceName(registry, playgroundId),
      playgroundId,
    );
    switchActiveWorkspace(playgroundId, created.id);
  }, [playgroundId, registry]);

  const handleExport = useCallback(
    async (ws: WorkspaceEntry) => {
      setBusy({ id: ws.id, action: "export" });
      try {
        const ok = await downloadWorkspaceZip(ws.id);
        if (!ok) {
          setOperationError(
            "Couldn't export workspace, persistent storage may be unavailable.",
          );
        }
      } catch (err) {
        setOperationError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  const handleImport = useCallback(
    async (file: File) => {
      setOperationError(null);
      setBusy({ id: "__import__", action: "import" });
      try {
        const result = await importWorkspaceFromZip(file, {
          expectedPlayground: playgroundId,
        });
        onRegistryChange();
        switchActiveWorkspace(playgroundId, result.entry.id);
      } catch (err) {
        setOperationError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(null);
      }
    },
    [playgroundId, onRegistryChange],
  );

  return (
    <>
      <Drawer.Root
        open={open}
        onOpenChange={onOpenChange}
        swipeDirection="down"
      >
        <Drawer.Portal>
          <Drawer.Backdrop className="pkg-overlay" />
          <Drawer.Viewport className="mobile-drawer-viewport pkg-drawer-viewport">
            <Drawer.Popup
              className="pkg-drawer workspace-manager-drawer"
              aria-label="Workspace manager"
            >
              <Drawer.Content className="pkg-drawer-content">
                <div className="mobile-menu-handle" aria-hidden="true" />
                <div className="pkg-drawer-header">
                  <div>
                    <Drawer.Title className="pkg-drawer-title">
                      Workspaces
                      <span className="pkg-count-badge">{list.length}</span>
                    </Drawer.Title>
                    <Drawer.Description className="pkg-drawer-hint">
                      {isSqlPlayground(playgroundId)
                        ? "Each workspace is a separate, saved copy of this playground’s files and database, switch between them to keep projects apart. Everything stays in your browser."
                        : "Each workspace is a separate, saved copy of this playground’s files, switch between them to keep projects apart. Everything stays in your browser."}
                      {showCloud &&
                        " Rows with a cloud mark are also backed up to your account."}
                    </Drawer.Description>
                  </div>
                  <Drawer.Close
                    className="settings-close"
                    aria-label="Close workspaces"
                  >
                    ✕
                  </Drawer.Close>
                </div>

                <div className="pkg-body workspace-manager-body">
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      className="workspace-manager-new"
                      onClick={() => {
                        void handleCreateNew();
                      }}
                    >
                      <Plus size={14} aria-hidden="true" />
                      <span>Create new workspace</span>
                    </button>
                    <button
                      type="button"
                      className="workspace-manager-new"
                      onClick={() => importInputRef.current?.click()}
                      title="Import a workspace ZIP archive"
                    >
                      <Upload size={14} aria-hidden="true" />
                      <span>Import ZIP</span>
                    </button>
                    <input
                      ref={importInputRef}
                      type="file"
                      accept=".zip,application/zip"
                      style={{ display: "none" }}
                      onChange={(event) => {
                        const f = event.target.files?.[0] ?? null;
                        // Reset so re-selecting the same file refires
                        // the change handler.
                        event.target.value = "";
                        if (f) void handleImport(f);
                      }}
                    />
                  </div>
                  {operationError && (
                    <div
                      role="alert"
                      style={{
                        marginTop: 8,
                        padding: "8px 10px",
                        borderRadius: 6,
                        background: "var(--error-bg, rgba(220,38,38,0.08))",
                        color: "var(--error-fg, #b91c1c)",
                        fontSize: 12,
                        lineHeight: 1.4,
                      }}
                    >
                      {operationError}
                    </div>
                  )}
                  {busy?.action === "import" && (
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 12,
                        color: "var(--text-dim)",
                      }}
                    >
                      Importing workspace…
                    </div>
                  )}

                  {list.length === 0 && (
                    <div
                      style={{
                        padding: 32,
                        textAlign: "center",
                        color: "var(--text-dim)",
                        fontSize: 13,
                      }}
                    >
                      No workspaces yet.
                    </div>
                  )}

                  {list.map((ws) => {
                    const active = ws.id === activeWorkspaceId;
                    const bytes = sizes.get(ws.id) ?? 0;
                    return (
                      <div
                        key={ws.id}
                        className={`workspace-manager-item${active ? " active" : ""}`}
                      >
                        <div className="workspace-manager-item-main">
                          <button
                            type="button"
                            className="workspace-manager-item-switch"
                            onClick={() => {
                              if (active) return;
                              switchActiveWorkspace(playgroundId, ws.id);
                            }}
                            aria-label={
                              active
                                ? `${ws.name} (active)`
                                : `Switch to ${ws.name}`
                            }
                          >
                            <span className="workspace-manager-item-name">
                              {ws.name}
                              {active && (
                                <span className="workspace-manager-active-pill">
                                  Active
                                </span>
                              )}
                            </span>
                          </button>
                          <div className="workspace-manager-item-meta">
                            <span title="Approximate storage used by this workspace in OPFS">
                              <HardDrive
                                size={11}
                                aria-hidden="true"
                                style={{ verticalAlign: "-1px" }}
                              />{" "}
                              {formatBytes(bytes)}
                            </span>
                            <span>·</span>
                            <span>Last opened {formatRelative(ws.lastUsedAt)}</span>
                            {showCloud && cloudById.has(ws.id) && (
                              <span>
                                <CloudStatusInline
                                  entry={ws}
                                  meta={cloudById.get(ws.id)!}
                                />
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="workspace-manager-item-actions">
                          {/* No manual "Back up", the active workspace syncs
                              automatically (useWorkspaceAutoSync). */}
                          {showCloud &&
                            cloudById.has(ws.id) &&
                            (isSqlPlayground(playgroundId) ? (
                              // SQL backups replay into the current session
                              // database, the workspace itself isn't touched,
                              // so no confirmation is needed.
                              <ActionButton
                                label="Open backup"
                                onClick={() =>
                                  void handleOpenCloud(cloudById.get(ws.id)!)
                                }
                                icon={
                                  <FolderDown size={12} aria-hidden="true" />
                                }
                                disabled={cloudBusyId !== null}
                              />
                            ) : (
                              <ActionButton
                                label="Restore"
                                onClick={() =>
                                  setRestoreTarget(cloudById.get(ws.id)!)
                                }
                                icon={
                                  <CloudDownload size={12} aria-hidden="true" />
                                }
                                disabled={cloudBusyId !== null}
                              />
                            ))}
                          <ActionButton
                            label="Export"
                            onClick={() => void handleExport(ws)}
                            icon={<Download size={12} aria-hidden="true" />}
                            disabled={
                              busy?.id === ws.id && busy.action === "export"
                            }
                            disabledTitle={
                              busy?.id === ws.id && busy.action === "export"
                                ? "Export in progress…"
                                : undefined
                            }
                          />
                          <ActionButton
                            label="Rename"
                            onClick={() => setRenameTarget(ws)}
                            icon={<Pencil size={12} aria-hidden="true" />}
                          />
                          <ActionButton
                            label="Duplicate"
                            onClick={() => setDuplicateTarget(ws)}
                            icon={<CopyIcon size={12} aria-hidden="true" />}
                          />
                          <ActionButton
                            label="Delete"
                            onClick={() => setDeleteTarget(ws)}
                            icon={<Trash2 size={12} aria-hidden="true" />}
                            danger
                            disabled={active && list.length <= 1}
                            disabledTitle={
                              active && list.length <= 1
                                ? "Can't delete the last workspace."
                                : undefined
                            }
                          />
                        </div>
                      </div>
                    );
                  })}

                  {showCloud && cloudOnly.length > 0 && (
                    <>
                      <div className="workspace-manager-cloud-header">
                        Cloud, not on this device
                      </div>
                      {cloudOnly.map((meta) => (
                        <div key={meta.id} className="workspace-manager-item">
                          <div className="workspace-manager-item-main">
                            <span className="workspace-manager-item-name workspace-manager-cloud-name">
                              <Cloud size={12} aria-hidden="true" /> {meta.name}
                            </span>
                            <div className="workspace-manager-item-meta">
                              <span>{formatBytes(meta.sizeBytes)}</span>
                              <span>·</span>
                              <span>
                                Saved{" "}
                                {formatRelative(Date.parse(meta.updatedAt))}
                              </span>
                            </div>
                          </div>
                          <div className="workspace-manager-item-actions">
                            <ActionButton
                              label={
                                cloudBusyId === meta.id ? "Opening…" : "Open"
                              }
                              onClick={() => void handleOpenCloud(meta)}
                              icon={<FolderDown size={12} aria-hidden="true" />}
                              disabled={cloudBusyId !== null}
                            />
                            <ActionButton
                              label="Delete backup"
                              onClick={() => setCloudDeleteTarget(meta)}
                              icon={<Trash2 size={12} aria-hidden="true" />}
                              danger
                              disabled={cloudBusyId !== null}
                            />
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {showCloud && (
                    <p className="workspace-manager-cloud-note">
                      {cloud.usage && (
                        <>
                          {formatBytes(cloud.usage.bytesUsed)} of{" "}
                          {formatBytes(cloud.usage.bytesLimit)} cloud storage
                          used ·{" "}
                        </>
                      )}
                      Manage backups and share links on your{" "}
                      <a href="/dashboard/account">account page</a>.
                      {cloud.usage?.plan === "free" && (
                        <>
                          {" "}
                          Free backups expire after {INACTIVITY_EXPIRY_DAYS}
                          {" "}days of inactivity, opening one resets its
                          clock.
                        </>
                      )}
                    </p>
                  )}
                  {cloud.available && cloud.signedOut && (
                    <p className="workspace-manager-cloud-note">
                      <a href="/sign-in">Sign in</a> to back up workspaces to
                      your account and open them on any device.
                    </p>
                  )}
                </div>
              </Drawer.Content>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>

      <RenameDialog
        target={renameTarget}
        onClose={() => setRenameTarget(null)}
        onConfirm={async (name) => {
          const t = renameTarget;
          setRenameTarget(null);
          if (!t) return;
          await renameWorkspace(t.id, name);
          onRegistryChange();
        }}
      />

      <DuplicateDialog
        target={duplicateTarget}
        onClose={() => setDuplicateTarget(null)}
        onConfirm={async (name) => {
          const t = duplicateTarget;
          setDuplicateTarget(null);
          if (!t) return;
          await duplicateWorkspace(t.id, name);
          onRegistryChange();
        }}
      />

      <DeleteDialog
        target={deleteTarget}
        isActive={deleteTarget?.id === activeWorkspaceId}
        siblings={list.filter((e) => e.id !== deleteTarget?.id)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          const t = deleteTarget;
          setDeleteTarget(null);
          if (!t) return;
          await deleteWorkspace(t.id);
          onRegistryChange();
          // If we just deleted the active workspace, we have to switch
          // to a surviving one (or auto-create on next visit).
          if (t.id === activeWorkspaceId) {
            const next = list.find((e) => e.id !== t.id);
            if (next) {
              switchActiveWorkspace(playgroundId, next.id);
            } else if (typeof window !== "undefined") {
              window.location.reload();
            }
          }
        }}
      />

      <RestoreBackupDialog
        target={restoreTarget}
        onClose={() => setRestoreTarget(null)}
        onConfirm={(meta) => {
          setRestoreTarget(null);
          void handleOpenCloud(meta);
        }}
      />

      <DeleteBackupDialog
        target={cloudDeleteTarget}
        onClose={() => setCloudDeleteTarget(null)}
        onConfirm={(meta) => {
          setCloudDeleteTarget(null);
          void handleDeleteCloud(meta);
        }}
      />
    </>
  );
}

/** Confirmation before a code-playground restore: pulling the backup
 *  replaces the workspace's files on this device (the same clobber the old
 *  Cloud dialog guarded with "Replace local copy?", now framed from the
 *  workspace's point of view). */
function RestoreBackupDialog({
  target,
  onClose,
  onConfirm,
}: {
  target: CloudWorkspaceMeta | null;
  onClose: () => void;
  onConfirm: (meta: CloudWorkspaceMeta) => void;
}) {
  return (
    <Dialog.Root
      open={target !== null}
      onOpenChange={(o) => !o && onClose()}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="confirm-backdrop" />
        <Dialog.Popup className="confirm-popup" role="alertdialog">
          <Dialog.Title className="confirm-title">
            Restore backup?
          </Dialog.Title>
          <Dialog.Description className="confirm-desc">
            The backup of <strong>“{target?.name}”</strong> from{" "}
            {target ? formatRelative(Date.parse(target.updatedAt)) : ""} will
            replace this workspace&rsquo;s current files on this device.
          </Dialog.Description>
          <div className="confirm-actions">
            <Dialog.Close className="confirm-btn confirm-btn-secondary">
              Cancel
            </Dialog.Close>
            <button
              type="button"
              className="confirm-btn confirm-btn-danger"
              onClick={() => target && onConfirm(target)}
            >
              Restore backup
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DeleteBackupDialog({
  target,
  onClose,
  onConfirm,
}: {
  target: CloudWorkspaceMeta | null;
  onClose: () => void;
  onConfirm: (meta: CloudWorkspaceMeta) => void;
}) {
  return (
    <Dialog.Root
      open={target !== null}
      onOpenChange={(o) => !o && onClose()}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="confirm-backdrop" />
        <Dialog.Popup className="confirm-popup" role="alertdialog">
          <Dialog.Title className="confirm-title">
            Delete backup?
          </Dialog.Title>
          <Dialog.Description className="confirm-desc">
            The backup of <strong>“{target?.name}”</strong> will be removed
            from your account. Copies on your devices are untouched.
          </Dialog.Description>
          <div className="confirm-actions">
            <Dialog.Close className="confirm-btn confirm-btn-secondary">
              Cancel
            </Dialog.Close>
            <button
              type="button"
              className="confirm-btn confirm-btn-danger"
              onClick={() => target && onConfirm(target)}
            >
              Delete backup
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface ActionButtonProps {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  disabledTitle?: string;
}

function ActionButton({
  label,
  icon,
  onClick,
  danger,
  disabled,
  disabledTitle,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      className={`workspace-manager-action${danger ? " danger" : ""}`}
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledTitle : label}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Rename / Duplicate / Delete dialogs
// ---------------------------------------------------------------------------

function RenameDialog({
  target,
  onClose,
  onConfirm,
}: {
  target: WorkspaceEntry | null;
  onClose: () => void;
  onConfirm: (name: string) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (target) setDraft(target.name);
  }, [target]);
  return (
    <Dialog.Root open={target !== null} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="confirm-backdrop" />
        <Dialog.Popup className="confirm-popup sql-rename-popup">
          <Dialog.Title className="confirm-title">Rename workspace</Dialog.Title>
          <Dialog.Description className="confirm-desc">
            Workspaces are scoped per playground; renaming only affects this
            list.
          </Dialog.Description>
          <form
            className="sql-rename-form"
            onSubmit={(e) => {
              e.preventDefault();
              void onConfirm(draft);
            }}
          >
            <input
              className="sql-rename-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
            />
            <div className="confirm-actions">
              <Dialog.Close className="confirm-btn confirm-btn-secondary">
                Cancel
              </Dialog.Close>
              <button type="submit" className="confirm-btn confirm-btn-primary">
                Rename
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DuplicateDialog({
  target,
  onClose,
  onConfirm,
}: {
  target: WorkspaceEntry | null;
  onClose: () => void;
  onConfirm: (name: string) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (target) setDraft(`${target.name} (copy)`);
  }, [target]);
  return (
    <Dialog.Root open={target !== null} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="confirm-backdrop" />
        <Dialog.Popup className="confirm-popup sql-rename-popup">
          <Dialog.Title className="confirm-title">
            Duplicate workspace
          </Dialog.Title>
          <Dialog.Description className="confirm-desc">
            Creates a new workspace with a fresh copy of every file and
            database snapshot.
          </Dialog.Description>
          <form
            className="sql-rename-form"
            onSubmit={(e) => {
              e.preventDefault();
              void onConfirm(draft);
            }}
          >
            <input
              className="sql-rename-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
            />
            <div className="confirm-actions">
              <Dialog.Close className="confirm-btn confirm-btn-secondary">
                Cancel
              </Dialog.Close>
              <button type="submit" className="confirm-btn confirm-btn-primary">
                Duplicate
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DeleteDialog({
  target,
  isActive,
  siblings,
  onClose,
  onConfirm,
}: {
  target: WorkspaceEntry | null;
  isActive: boolean;
  siblings: WorkspaceEntry[];
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <Dialog.Root
      open={target !== null}
      onOpenChange={(o) => !o && onClose()}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="confirm-backdrop" />
        <Dialog.Popup className="confirm-popup" role="alertdialog">
          <Dialog.Title className="confirm-title">
            Delete workspace?
          </Dialog.Title>
          <Dialog.Description className="confirm-desc">
            <strong>“{target?.name}”</strong> and all of its files
            {target?.playground === "sqlite" ||
            target?.playground === "postgres" ||
            target?.playground === "duckdb"
              ? " and database state"
              : ""}{" "}
            will be permanently removed from OPFS. This can&rsquo;t be undone.
            {isActive && siblings.length > 0 && (
              <>
                {" "}
                You&apos;ll be switched to
                <strong> {siblings[0].name}</strong>.
              </>
            )}
          </Dialog.Description>
          <div className="confirm-actions">
            <Dialog.Close className="confirm-btn confirm-btn-secondary">
              Cancel
            </Dialog.Close>
            <Dialog.Close
              className="confirm-btn confirm-btn-danger"
              onClick={() => void onConfirm()}
            >
              Delete
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
