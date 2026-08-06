"use client";

/**
 * The simplified playground header controls, shared by the code playground
 * shell (Playground.tsx) and the SQL playgrounds — ported from the
 * "Playground Header Redesign" handoff (option 1a, quiet toolbar):
 *
 *   logo · switcher │ workspace name + inline rename ─ Save ▾ · Share · ⋯
 *
 * - `WorkspaceNameControl`: the workspace name docked after a divider, with
 *   a pencil that swaps it for an inline rename input (Enter/blur commits,
 *   Escape cancels).
 * - `SaveControl`: one quiet Save action with a chevron menu — an
 *   "auto-saves in this browser" note, "Back up to cloud" (with the last
 *   backup time), "Download copy" (.zip), or a sign-in row for guests.
 *   Reads "Saved" with a green-dotted cloud when there's nothing to save.
 * - `MoreMenu`: everything secondary folds into one ⋯ menu — labelled
 *   sections whose items either act directly or slide to a sub-panel
 *   (Examples, Export, Import, Runtime info) with a ‹ back header.
 *
 * Styles live in playground.css under the `.ph-*` prefix and follow the
 * handoff's specs exactly (12.5px/500 ghost buttons, 26px boxed menu icons,
 * 10px uppercase section labels, --menu-* palette).
 */

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Menu } from "@base-ui/react/menu";
import { Popover } from "@base-ui/react/popover";
import {
  Check,
  Cloud,
  CloudUpload,
  Download,
  FilePlus2,
  LogIn,
  Pencil,
  type LucideIcon,
} from "lucide-react";
import { useSession } from "@/lib/auth/client";
import { switchActiveWorkspace } from "./opfs/activeWorkspace";
import {
  createWorkspace,
  getWorkspaceRegistry,
  renameWorkspace,
} from "./opfs/workspace";
import { defaultWorkspaceName } from "./workspace/WorkspaceBadge";
import { downloadWorkspaceZip } from "./opfs/workspaceArchive";
import type { WorkspaceBundle } from "@/lib/workspaces/types";
import {
  backUpWorkspace,
  isBackupStale,
  useCloudBackups,
} from "./workspace/workspaceCloud";
import {
  MobileMenuAction,
  MobileMenuLabel,
  MobileMenuSubSheet,
  useMobileMenuClose,
} from "./MobileMenuSheet";

/** The 9px chevron used by the switcher, save menu and badge in the mock. */
export function HeaderChevron({ size = 9 }: { size?: number }) {
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} aria-hidden="true">
      <polyline
        points="2,4 6,8 10,4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

/** 1px × 16px vertical hairline between header zones. */
export function HeaderDivider() {
  return <div className="ph-divider" aria-hidden="true" />;
}

function formatRelative(timestamp: number): string {
  const diff = Math.max(0, Date.now() - timestamp);
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
// Workspace name + inline rename
// ---------------------------------------------------------------------------

export function WorkspaceNameControl({
  workspaceId,
  name,
  onRenamed,
}: {
  workspaceId: string | null;
  name: string;
  /** Called with the committed name; the host updates its store (and the
   *  registry entry was already renamed when one exists). */
  onRenamed: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement | null>(null);
  // Re-seed the draft whenever an edit starts so a stale draft from the
  // previous session never leaks in.
  const startEdit = useCallback(() => {
    setDraft(name);
    setEditing(true);
  }, [name]);
  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = useCallback(async () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (!trimmed || trimmed === name) return;
    // Saved workspaces rename in the registry; drafts only exist in the
    // store, so the host callback carries the new name either way.
    if (workspaceId) {
      const inRegistry = getWorkspaceRegistry().some(
        (e) => e.id === workspaceId,
      );
      if (inRegistry) await renameWorkspace(workspaceId, trimmed);
    }
    onRenamed(trimmed);
  }, [draft, name, workspaceId, onRenamed]);

  if (editing) {
    return (
      <span className="ph-name-wrap">
        <input
          ref={inputRef}
          className="ph-rename-input"
          value={draft}
          autoFocus
          aria-label="Workspace name"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            else if (e.key === "Escape") setEditing(false);
          }}
          onBlur={() => void commit()}
        />
      </span>
    );
  }

  return (
    <span className="ph-name-wrap">
      <span className="ph-name" title="Workspace name">
        {name || "Workspace"}
      </span>
      <button
        type="button"
        className="ph-rename-btn"
        title="Rename workspace"
        aria-label="Rename workspace"
        onClick={startEdit}
      >
        <Pencil size={11} aria-hidden="true" />
      </button>
    </span>
  );
}

// ---------------------------------------------------------------------------
// New workspace
// ---------------------------------------------------------------------------

/**
 * The "start a new workspace" button that sits beside the rename pencil,
 * and its confirmation dialog.
 *
 * Creating a workspace swaps the editor over to it (`switchActiveWorkspace`
 * reloads the page), so this is a disruptive-looking action even though it
 * destroys nothing: the current workspace stays in the registry, its files
 * are already in OPFS, and a signed-in user's auto-sync has it on their
 * account. The dialog exists to say so before the editor blanks, because
 * "my code vanished" is the reasonable thing to assume otherwise.
 *
 * The name field is optional. Left blank it takes the same
 * `Workspace <n>` default the workspace manager's "New" button uses, so
 * the two entry points cannot drift apart.
 */
export function NewWorkspaceControl({
  playgroundId,
}: {
  playgroundId: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: session } = useSession();
  const signedIn = Boolean(session?.user);

  // Read at open time so the suggestion reflects the registry as it is now.
  const suggested = useMemo(
    () => (open ? defaultWorkspaceName(getWorkspaceRegistry(), playgroundId) : ""),
    [open, playgroundId],
  );

  const create = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const created = await createWorkspace(name.trim() || suggested, playgroundId);
      // Reloads the page onto the new workspace.
      switchActiveWorkspace(playgroundId, created.id);
    } finally {
      setBusy(false);
    }
  }, [busy, name, suggested, playgroundId]);

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setName("");
      }}
    >
      <AlertDialog.Trigger
        className="ph-rename-btn"
        title="New workspace"
        aria-label="New workspace"
      >
        <FilePlus2 size={11} aria-hidden="true" />
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="confirm-backdrop" />
        <AlertDialog.Popup className="confirm-popup ph-new-ws-popup">
          <AlertDialog.Title className="confirm-title">
            Start a new workspace?
          </AlertDialog.Title>
          <AlertDialog.Description className="confirm-desc">
            The editor will switch to a fresh set of files.{" "}
            {signedIn
              ? "Your current workspace is kept in this browser and backed up to your account, so you can reopen it from Workspaces at any time."
              : "Your current workspace is kept in this browser, so you can reopen it from Workspaces at any time. Sign in to also back it up to your account."}
          </AlertDialog.Description>

          <form
            className="ph-new-ws-form"
            onSubmit={(event) => {
              event.preventDefault();
              void create();
            }}
          >
            <label className="ph-new-ws-label" htmlFor="ph-new-ws-name">
              Name <span className="ph-new-ws-optional">(optional)</span>
            </label>
            <input
              id="ph-new-ws-name"
              className="sql-rename-input"
              value={name}
              placeholder={suggested}
              autoComplete="off"
              onChange={(event) => setName(event.target.value)}
            />
            <div className="confirm-actions">
              <AlertDialog.Close className="confirm-btn confirm-btn-secondary">
                Cancel
              </AlertDialog.Close>
              <button
                type="submit"
                className="confirm-btn confirm-btn-primary"
                disabled={busy}
              >
                {busy ? "Creating…" : "Create workspace"}
              </button>
            </div>
          </form>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

// ---------------------------------------------------------------------------
// Save split button + menu
// ---------------------------------------------------------------------------

export function SaveControl({
  playgroundId,
  workspaceId,
  workspaceName,
  unsaved,
  onSave,
  buildBundle,
  onNotify,
}: {
  playgroundId: string;
  workspaceId: string | null;
  workspaceName: string;
  /** True when the workspace is an unsaved, changed draft — the main button
   *  reads "Save" and promotes it; otherwise it reads "Saved". */
  unsaved: boolean;
  onSave?: (name: string) => void | Promise<void>;
  buildBundle?: () => Promise<WorkspaceBundle | null>;
  /** Toast hook so saves/backups flash the host's confirmation. */
  onNotify?: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const cloud = useCloudBackups(playgroundId, open);
  const [backupBusy, setBackupBusy] = useState(false);

  const activeMeta = useMemo(
    () =>
      workspaceId ? cloud.metas.find((m) => m.id === workspaceId) : undefined,
    [cloud.metas, workspaceId],
  );
  const activeEntry = useMemo(
    () =>
      workspaceId
        ? getWorkspaceRegistry().find((e) => e.id === workspaceId)
        : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- registry read is cheap; re-read per open
    [workspaceId, open],
  );

  const backupSub = activeMeta
    ? `Snapshot on your account · Backed up ${formatRelative(Date.parse(activeMeta.updatedAt))}${
        activeEntry && isBackupStale(activeEntry, activeMeta)
          ? " · opened since"
          : ""
      }`
    : "Keep a snapshot on your account";

  const doSave = useCallback(() => {
    if (!unsaved || !onSave) return;
    void onSave(workspaceName || "Workspace");
    onNotify?.("Workspace saved");
  }, [unsaved, onSave, workspaceName, onNotify]);

  const doBackup = useCallback(async () => {
    if (!workspaceId || !buildBundle || backupBusy) return;
    setBackupBusy(true);
    try {
      // Unsaved drafts get promoted first so the backup lands on a stable,
      // listed workspace (mirrors the auto-sync engine's promoteDraft).
      if (unsaved && onSave) await onSave(workspaceName || "Workspace");
      await backUpWorkspace(workspaceId, buildBundle);
      await cloud.refresh();
      onNotify?.("Backed up to your account");
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : "Backup failed");
    } finally {
      setBackupBusy(false);
    }
  }, [
    workspaceId,
    buildBundle,
    backupBusy,
    unsaved,
    onSave,
    workspaceName,
    cloud,
    onNotify,
  ]);

  const doDownload = useCallback(async () => {
    if (!workspaceId) return;
    // Drafts aren't in the registry yet; save first so the zip has a name.
    if (unsaved && onSave) await onSave(workspaceName || "Workspace");
    const ok = await downloadWorkspaceZip(workspaceId);
    onNotify?.(ok ? "Workspace downloaded" : "Nothing to download yet");
  }, [workspaceId, unsaved, onSave, workspaceName, onNotify]);

  const showCloudRows = cloud.available && !cloud.signedOut;

  return (
    <Menu.Root open={open} onOpenChange={setOpen}>
      <span className="ph-save-split">
        {unsaved ? (
          <button
            type="button"
            className="ph-ghost-btn ph-save-main"
            title="Save this workspace"
            onClick={doSave}
          >
            <CloudUpload size={12} aria-hidden="true" />
            <span>Save</span>
          </button>
        ) : (
          <button
            type="button"
            className="ph-ghost-btn ph-save-main ph-saved"
            title="All changes saved"
          >
            <span className="ph-saved-cloud">
              <Cloud size={12} aria-hidden="true" />
              <span className="ph-saved-dot" aria-hidden="true" />
            </span>
            <span>Saved</span>
          </button>
        )}
        <Menu.Trigger
          className="ph-save-chev"
          title="Save options"
          aria-label="Save options"
        >
          <HeaderChevron />
        </Menu.Trigger>
      </span>
      <Menu.Portal>
        <Menu.Positioner
          sideOffset={6}
          align="end"
          className="playground-header-positioner"
        >
          <Menu.Popup className="bui-popup ph-save-menu">
            <div className="ph-save-menu-note">
              <Check size={11} aria-hidden="true" />
              <span>Auto-saves in this browser as you work</span>
            </div>
            {showCloudRows ? (
              <>
                <Menu.Item
                  className="ph-save-menu-item"
                  disabled={backupBusy}
                  onClick={() => void doBackup()}
                >
                  <CloudUpload size={14} aria-hidden="true" />
                  <span className="ph-save-menu-text">
                    <span className="ph-save-menu-title">
                      {backupBusy ? "Backing up…" : "Back up to cloud"}
                    </span>
                    <span className="ph-save-menu-sub">{backupSub}</span>
                  </span>
                </Menu.Item>
                <Menu.Item
                  className="ph-save-menu-item"
                  onClick={() => void doDownload()}
                >
                  <Download size={14} aria-hidden="true" />
                  <span className="ph-save-menu-text">
                    <span className="ph-save-menu-title">Download copy</span>
                    <span className="ph-save-menu-sub">
                      Workspace files as a .zip
                    </span>
                  </span>
                </Menu.Item>
              </>
            ) : (
              <>
                {cloud.available && (
                  <Menu.Item
                    className="ph-save-menu-item"
                    render={<a href="/sign-in" />}
                  >
                    <LogIn size={14} aria-hidden="true" />
                    <span className="ph-save-menu-text">
                      <span className="ph-save-menu-title">
                        Sign in to back up
                      </span>
                      <span className="ph-save-menu-sub">
                        Keep snapshots on your account, free
                      </span>
                    </span>
                  </Menu.Item>
                )}
                <Menu.Item
                  className="ph-save-menu-item"
                  onClick={() => void doDownload()}
                >
                  <Download size={14} aria-hidden="true" />
                  <span className="ph-save-menu-text">
                    <span className="ph-save-menu-title">Download copy</span>
                    <span className="ph-save-menu-sub">
                      Workspace files as a .zip
                    </span>
                  </span>
                </Menu.Item>
              </>
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

// ---------------------------------------------------------------------------
// ⋯ "More" menu with sections + slide-in sub-panels
// ---------------------------------------------------------------------------

export interface MoreMenuItem {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Small mono count chip on the right (e.g. example/package counts). */
  hint?: string | number;
  /** Direct action; closes the menu. Ignored when `panel` is set. */
  onSelect?: () => void;
  /** Sub-panel: clicking slides to it (chevron shown). The panel body is a
   *  render-prop so lists can close the menu via the provided callback. */
  panel?: {
    title: string;
    render: (close: () => void) => ReactNode;
  };
}

export interface MoreMenuSection {
  label: string;
  items: MoreMenuItem[];
}

export function MoreMenu({ sections }: { sections: MoreMenuSection[] }) {
  const [open, setOpen] = useState(false);
  const [panelKey, setPanelKey] = useState<string | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setPanelKey(null);
  }, []);

  const activePanel = useMemo(() => {
    if (!panelKey) return null;
    for (const s of sections) {
      const item = s.items.find((i) => i.key === panelKey && i.panel);
      if (item?.panel) return item.panel;
    }
    return null;
  }, [sections, panelKey]);

  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setPanelKey(null);
      }}
    >
      <Popover.Trigger className="ph-more-btn" title="More" aria-label="More">
        <svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          sideOffset={6}
          align="end"
          className="playground-header-positioner"
        >
          <Popover.Popup className="bui-popup ph-more-menu">
            {!activePanel ? (
              <div className="ph-more-root">
                {sections.map((section, i) => (
                  <div key={section.label}>
                    {i > 0 && <div className="ph-more-sep" aria-hidden="true" />}
                    <div className="ph-more-label">{section.label}</div>
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          type="button"
                          key={item.key}
                          className="ph-more-item"
                          onClick={() => {
                            if (item.panel) setPanelKey(item.key);
                            else {
                              close();
                              item.onSelect?.();
                            }
                          }}
                        >
                          <span className="ph-more-item-icon" aria-hidden="true">
                            <Icon size={13} strokeWidth={1.8} />
                          </span>
                          <span className="ph-more-item-title">{item.label}</span>
                          {item.hint !== undefined && (
                            <span className="ph-more-item-hint">{item.hint}</span>
                          )}
                          {item.panel && (
                            <svg
                              className="ph-more-item-chev"
                              width={12}
                              height={12}
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="m9 18 6-6-6-6" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="ph-more-back"
                  onClick={() => setPanelKey(null)}
                >
                  <span aria-hidden="true">‹</span>
                  <span>{activePanel.title}</span>
                </button>
                <div className="ph-more-panel-body">
                  {activePanel.render(close)}
                </div>
              </>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

// ---------------------------------------------------------------------------
// Mobile drawer mirror of the ⋯ menu
// ---------------------------------------------------------------------------

/** Renders the same `MoreMenuSection[]` data the desktop ⋯ menu uses as
 *  bottom-sheet rows for the mobile drawer: labelled groups whose panel
 *  items open a nested sheet (the drawer counterpart of the desktop
 *  slide-in sub-panels). Must render inside a `MobileMenuSheet`. */
export function MobileMoreSections({
  sections,
}: {
  sections: MoreMenuSection[];
}) {
  const closeMenu = useMobileMenuClose();
  return (
    <>
      {sections.map((section) => (
        <Fragment key={section.label}>
          <MobileMenuLabel>{section.label}</MobileMenuLabel>
          {section.items.map((item) =>
            item.panel ? (
              <MobileMenuSubSheet
                key={item.key}
                id={item.key}
                icon={item.icon}
                label={item.label}
                hint={item.hint}
                title={item.panel.title}
              >
                {item.panel.render(closeMenu)}
              </MobileMenuSubSheet>
            ) : (
              <MobileMenuAction
                key={item.key}
                icon={item.icon}
                label={item.label}
                hint={item.hint}
                onClick={() => item.onSelect?.()}
              />
            ),
          )}
        </Fragment>
      ))}
    </>
  );
}
