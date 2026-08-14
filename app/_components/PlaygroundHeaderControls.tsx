"use client";

/**
 * Playground header controls shared by the code playground shell and the
 * SQL playgrounds: `WorkspaceNameControl` (inline rename),
 * `SaveControl` (Save split button + chevron menu), and `MoreMenu` (the ⋯
 * menu with sections and slide-in sub-panels). Styles live in playground.css
 * under the `.ph-*` prefix.
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
import { useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import { Popover } from "@base-ui/react/popover";
import {
  Check,
  Cloud,
  CloudUpload,
  Download,
  LogIn,
  LogOut,
  Pencil,
  SquarePlus,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { signOut, useSession } from "@/lib/auth/client";
import { switchActiveWorkspace } from "./opfs/activeWorkspace";
import {
  createWorkspace,
  getWorkspaceRegistry,
  renameWorkspace,
} from "./opfs/workspace";
import { defaultWorkspaceName } from "./workspace/WorkspaceBadge";
import { downloadWorkspaceZip } from "./opfs/workspaceArchive";
import type { BuildBundle } from "@/lib/workspaces/types";
import {
  backUpWorkspace,
  isBackupStale,
  useCloudBackups,
} from "./workspace/workspaceCloud";
import {
  MobileMenuAction,
  MobileMenuLabel,
  MobileMenuNote,
  MobileMenuSubSheet,
  useMobileMenuClose,
  useMobileMenuSubSheetOpen,
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
        className="ph-name-action"
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
 * The "start a new workspace" button beside the rename pencil, plus its
 * confirmation dialog. Creating a workspace reloads the page onto it, so the
 * dialog says up front that the current workspace is kept, not destroyed. A
 * blank name takes the same `Workspace <n>` default as the workspace
 * manager's "New" button; `icon` lets the SQL playgrounds pass
 * `DatabasePlus`.
 */
export function NewWorkspaceControl({
  playgroundId,
  icon: Icon = SquarePlus,
}: {
  playgroundId: string;
  icon?: LucideIcon;
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

  // A Dialog, like every other confirmation in the playgrounds. See the note
  // on `.confirm-backdrop` in playground.css for why none of them are Base UI
  // alert dialogs any more.
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setName("");
      }}
    >
      <Dialog.Trigger
        className="ph-name-action"
        title="New workspace"
        aria-label="New workspace"
      >
        <Icon size={12} aria-hidden="true" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="confirm-backdrop" />
        <Dialog.Popup className="confirm-popup ph-new-ws-popup">
          <Dialog.Title className="confirm-title">
            Start a new workspace?
          </Dialog.Title>
          <Dialog.Description className="confirm-desc">
            The editor will switch to a fresh set of files.{" "}
            {signedIn
              ? "Your current workspace is kept in this browser and backed up to your account, so you can reopen it from Workspaces at any time."
              : "Your current workspace is kept in this browser, so you can reopen it from Workspaces at any time. Sign in to also back it up to your account."}
          </Dialog.Description>

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
              <Dialog.Close className="confirm-btn confirm-btn-secondary">
                Cancel
              </Dialog.Close>
              <button
                type="submit"
                className="confirm-btn confirm-btn-primary"
                disabled={busy}
              >
                {busy ? "Creating…" : "Create workspace"}
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ---------------------------------------------------------------------------
// Save split button + menu
// ---------------------------------------------------------------------------

export interface SaveControlProps {
  playgroundId: string;
  workspaceId: string | null;
  workspaceName: string;
  /** True when the workspace is an unsaved, changed draft — the main button
   *  reads "Save" and promotes it; otherwise it reads "Saved". */
  unsaved: boolean;
  onSave?: (name: string) => void | Promise<void>;
  buildBundle?: BuildBundle;
  /** Toast hook so saves/backups flash the host's confirmation. */
  onNotify?: (message: string) => void;
}

/**
 * The three save actions and their copy, shared by the desktop dropdown
 * (`SaveControl`) and the mobile sub-sheet (`MobileSaveMenu`) so the two
 * menus can't drift. `open` is the "refresh the cloud list now" signal.
 */
function useSaveMenu(
  {
    playgroundId,
    workspaceId,
    workspaceName,
    unsaved,
    onSave,
    buildBundle,
    onNotify,
  }: SaveControlProps,
  open: boolean,
) {
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

  return {
    doSave,
    doBackup,
    doDownload,
    backupBusy,
    backupSub,
    /** Signed in with cloud storage configured: show backup + download. */
    showCloudRows,
    /** Cloud storage exists at all (drives the sign-in row for guests). */
    cloudAvailable: cloud.available,
  };
}

export function SaveControl(props: SaveControlProps) {
  const { unsaved } = props;
  const [open, setOpen] = useState(false);
  const {
    doSave,
    doBackup,
    doDownload,
    backupBusy,
    backupSub,
    showCloudRows,
    cloudAvailable,
  } = useSaveMenu(props, open);

  return (
    <Menu.Root open={open} onOpenChange={setOpen}>
      {unsaved ? (
        // A real split button: the left half saves, so only the chevron can
        // open the menu.
        <span className="ph-save-split">
          <button
            type="button"
            className="ph-ghost-btn ph-save-main"
            title="Save this workspace"
            onClick={doSave}
          >
            <CloudUpload size={12} aria-hidden="true" />
            <span>Save</span>
          </button>
          <Menu.Trigger
            className="ph-save-chev"
            title="Save options"
            aria-label="Save options"
          >
            <HeaderChevron />
          </Menu.Trigger>
        </span>
      ) : (
        // Nothing to save, so the left half has no action of its own — the
        // whole control is the menu trigger. Cloud, label and chevron are one
        // hit target (like Share beside it) rather than a 9px chevron with an
        // inert button glued to it.
        <Menu.Trigger
          className="ph-ghost-btn ph-save-trigger"
          title="All changes saved, open save options"
        >
          <span className="ph-saved-cloud">
            <Cloud size={12} aria-hidden="true" />
            <span className="ph-saved-dot" aria-hidden="true" />
          </span>
          <span>Saved</span>
          <span className="ph-save-trigger-chev" aria-hidden="true">
            <HeaderChevron />
          </span>
        </Menu.Trigger>
      )}
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
                {cloudAvailable && (
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

/** Sub-sheet identity for the save panel (sub-sheets are mutually
 *  exclusive and keyed by id). */
const SAVE_SUBSHEET_ID = "save";

/**
 * Mobile drawer counterpart of `SaveControl`: a sub-sheet with the same
 * rows as the desktop chevron menu (via `useSaveMenu`) plus the split
 * button's own Save action. Must render inside a `MobileMenuSheet`.
 */
export function MobileSaveMenu(props: SaveControlProps) {
  const { unsaved } = props;
  // The whole drawer body only mounts while the hamburger sheet is open, so
  // this hook's first fetch already happens on open; the sub-sheet's own
  // open state re-reads the list when the user drills into it.
  const open = useMobileMenuSubSheetOpen(SAVE_SUBSHEET_ID);
  const {
    doSave,
    doBackup,
    doDownload,
    backupBusy,
    backupSub,
    showCloudRows,
    cloudAvailable,
  } = useSaveMenu(props, open);

  return (
    <MobileMenuSubSheet
      id={SAVE_SUBSHEET_ID}
      icon={unsaved ? CloudUpload : Cloud}
      label={unsaved ? "Save" : "Saved"}
      title={unsaved ? "Save" : "Saved"}
    >
      <MobileMenuNote icon={Check}>
        Auto-saves in this browser as you work
      </MobileMenuNote>
      {unsaved && (
        <MobileMenuAction
          icon={CloudUpload}
          label="Save workspace"
          sub="Add it to your saved workspaces"
          onClick={doSave}
        />
      )}
      {showCloudRows ? (
        <>
          <MobileMenuAction
            icon={CloudUpload}
            label={backupBusy ? "Backing up…" : "Back up to cloud"}
            sub={backupSub}
            disabled={backupBusy}
            onClick={() => void doBackup()}
          />
          <MobileMenuAction
            icon={Download}
            label="Download copy"
            sub="Workspace files as a .zip"
            onClick={() => void doDownload()}
          />
        </>
      ) : (
        <>
          {cloudAvailable && (
            <MobileMenuAction
              icon={LogIn}
              href="/sign-in"
              label="Sign in to back up"
              sub="Keep snapshots on your account, free"
            />
          )}
          <MobileMenuAction
            icon={Download}
            label="Download copy"
            sub="Workspace files as a .zip"
            onClick={() => void doDownload()}
          />
        </>
      )}
    </MobileMenuSubSheet>
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
// Account section (sign in · account · sign out)
// ---------------------------------------------------------------------------

/**
 * Body of the "Sign out" sub-panel. Says up front that workspaces stay in
 * this browser (OPFS); only the cloud backup sync stops. A panel rather
 * than a Dialog so it works unchanged in the desktop ⋯ menu and the mobile
 * nested sheet.
 */
function SignOutPanel({
  email,
  close,
}: {
  email?: string | null;
  close: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const confirm = useCallback(async () => {
    setBusy(true);
    try {
      await signOut();
      close();
      // Re-render everything reading the session (the save menu's cloud
      // rows, the workspace manager's backup list).
      router.refresh();
    } catch {
      // Network failure: leave the session alone and re-enable the button.
      setBusy(false);
    }
  }, [close, router]);

  return (
    <div className="ph-signout-panel">
      <p className="ph-signout-note">
        {email && (
          <>
            Signed in as <strong>{email}</strong>.{" "}
          </>
        )}
        Your workspaces stay in this browser. Signing out only stops backing
        them up to your account.
      </p>
      <div className="confirm-actions">
        <button
          type="button"
          className="confirm-btn confirm-btn-secondary"
          onClick={close}
        >
          Cancel
        </button>
        <button
          type="button"
          className="confirm-btn confirm-btn-primary"
          disabled={busy}
          onClick={() => void confirm()}
        >
          {busy ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </div>
  );
}

/**
 * The ⋯ menu's Account group, as a `MoreMenuSection` each playground appends
 * to its own sections. Returns `null` while the first session fetch is in
 * flight so "Sign in" never flashes for a signed-in visitor. Sign-in links
 * to plain `/sign-in`: `ReturnToTracker` already recorded the playground
 * URL, and a hand-built `?next=` would lose the query and hash.
 */
export function useAccountMenuSection(): MoreMenuSection | null {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const email = session?.user?.email;

  return useMemo<MoreMenuSection | null>(() => {
    if (isPending) return null;
    if (!session) {
      return {
        label: "Account",
        items: [
          {
            key: "sign-in",
            label: "Sign in",
            icon: LogIn,
            onSelect: () => router.push("/sign-in"),
          },
        ],
      };
    }
    return {
      label: "Account",
      items: [
        {
          key: "account",
          label: "Account settings",
          icon: UserRound,
          onSelect: () => router.push("/dashboard/account"),
        },
        {
          key: "sign-out",
          label: "Sign out",
          icon: LogOut,
          panel: {
            title: "Sign out",
            render: (close: () => void) => (
              <SignOutPanel email={email} close={close} />
            ),
          },
        },
      ],
    };
  }, [isPending, session, email, router]);
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
