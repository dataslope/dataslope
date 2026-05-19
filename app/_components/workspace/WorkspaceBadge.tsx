"use client";

/**
 * Workspace badge + popover + manager drawer used by every playground
 * header. Renders the current workspace name as a pill button; clicking
 * opens a popover listing recent workspaces for this playground with
 * "New" and "Manage" affordances. The Manage button promotes the popover
 * into a Drawer-backed full manager (rename / delete / duplicate +
 * per-workspace size estimate).
 *
 * Workspace switching is implemented as `setActiveWorkspaceId` followed
 * by `window.location.reload()` — engines and editor state rebuild from
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
import { Popover } from "@base-ui-components/react/popover";
import { Dialog } from "@base-ui-components/react/dialog";
import { AlertDialog } from "@base-ui-components/react/alert-dialog";
import { Drawer } from "@base-ui/react/drawer";
import {
  Check,
  Copy as CopyIcon,
  Download,
  Folder,
  HardDrive,
  Pencil,
  Plus,
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
import { switchActiveWorkspace } from "../opfs/activeWorkspace";
import { estimateWorkspaceSize } from "../opfs/fileStorage";
import {
  downloadWorkspaceZip,
  importWorkspaceFromZip,
} from "../opfs/workspaceArchive";

const RECENT_LIMIT = 6;

export interface WorkspaceBadgeProps {
  /** The playground this badge belongs to ("python", "sqlite", …). */
  playgroundId: string;
  /** Currently-active workspace id (from `ensureActiveWorkspace`). */
  activeWorkspaceId: string | null;
  /** Currently-active workspace display name. */
  activeWorkspaceName: string;
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

export function WorkspaceBadge({
  playgroundId,
  activeWorkspaceId,
  activeWorkspaceName,
}: WorkspaceBadgeProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [registry, setRegistry] = useState<WorkspaceEntry[]>([]);
  // Cached byte-size estimates for the recent workspaces, prefetched
  // whenever the popover opens. State is retained between opens so
  // subsequent opens render the previous size synchronously and update
  // in place when the fresh estimate lands.
  const [popoverSizes, setPopoverSizes] = useState<Map<string, number>>(
    () => new Map(),
  );

  // Hydrate registry on the client only — `getWorkspaceRegistry` reads
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

  // Prefetch sizes when the popover opens. Each `estimateWorkspaceSize`
  // call is independent so we fire them in parallel and stream results
  // into the size map as they land — no flicker on subsequent opens
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
    const defaultName = `Workspace ${new Date().toLocaleString()}`;
    const created = await createWorkspace(defaultName, playgroundId);
    switchActiveWorkspace(playgroundId, created.id);
  }, [playgroundId]);

  const openManager = useCallback(() => {
    refreshRegistry();
    setPopoverOpen(false);
    setManagerOpen(true);
  }, [refreshRegistry]);

  return (
    <>
      <Popover.Root open={popoverOpen} onOpenChange={setPopoverOpen}>
        <Popover.Trigger
          className="workspace-badge"
          title={`Active workspace: ${activeWorkspaceName || "(unnamed)"}`}
          aria-label="Active workspace"
        >
          <Folder size={12} aria-hidden="true" />
          <span className="workspace-badge-name">
            {activeWorkspaceName || "Workspace"}
          </span>
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
          <Popover.Positioner sideOffset={6} align="start">
            <Popover.Popup className="bui-popup workspace-popover">
              <div className="workspace-popover-header">
                Workspaces for {playgroundLabel(playgroundId)}
              </div>
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
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="workspace-popover-footer">
                <button
                  type="button"
                  className="workspace-popover-action"
                  onClick={() => {
                    void handleCreateNew();
                  }}
                >
                  <Plus size={12} aria-hidden="true" />
                  <span>New workspace</span>
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

      <WorkspaceManagerDrawer
        open={managerOpen}
        onOpenChange={setManagerOpen}
        playgroundId={playgroundId}
        activeWorkspaceId={activeWorkspaceId}
        registry={registry}
        onRegistryChange={refreshRegistry}
      />
    </>
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
}

function WorkspaceManagerDrawer({
  open,
  onOpenChange,
  playgroundId,
  activeWorkspaceId,
  registry,
  onRegistryChange,
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
  const [busy, setBusy] = useState<{ id: string; action: "export" | "import" } | null>(
    null,
  );
  const [importError, setImportError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

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
    const defaultName = `Workspace ${new Date().toLocaleString()}`;
    const created = await createWorkspace(defaultName, playgroundId);
    switchActiveWorkspace(playgroundId, created.id);
  }, [playgroundId]);

  const handleExport = useCallback(
    async (ws: WorkspaceEntry) => {
      setBusy({ id: ws.id, action: "export" });
      try {
        const ok = await downloadWorkspaceZip(ws.id);
        if (!ok) {
          setImportError(
            "Couldn't export workspace — persistent storage may be unavailable.",
          );
        }
      } catch (err) {
        setImportError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  const handleImport = useCallback(
    async (file: File) => {
      setImportError(null);
      setBusy({ id: "__import__", action: "import" });
      try {
        const result = await importWorkspaceFromZip(file, {
          expectedPlayground: playgroundId,
        });
        onRegistryChange();
        switchActiveWorkspace(playgroundId, result.entry.id);
      } catch (err) {
        setImportError(err instanceof Error ? err.message : String(err));
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
                      Isolated, OPFS-backed copies of this playground&apos;s
                      files and database state.
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
                  {importError && (
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
                      {importError}
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
                            <Folder size={14} aria-hidden="true" />
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
                          </div>
                        </div>
                        <div className="workspace-manager-item-actions">
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
    </>
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
    <AlertDialog.Root
      open={target !== null}
      onOpenChange={(o) => !o && onClose()}
    >
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="confirm-backdrop" />
        <AlertDialog.Popup className="confirm-popup">
          <AlertDialog.Title className="confirm-title">
            Delete workspace?
          </AlertDialog.Title>
          <AlertDialog.Description className="confirm-desc">
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
          </AlertDialog.Description>
          <div className="confirm-actions">
            <AlertDialog.Close className="confirm-btn confirm-btn-secondary">
              Cancel
            </AlertDialog.Close>
            <AlertDialog.Close
              className="confirm-btn confirm-btn-danger"
              onClick={() => void onConfirm()}
            >
              Delete
            </AlertDialog.Close>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
