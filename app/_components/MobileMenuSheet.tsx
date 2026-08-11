"use client";

// Reusable mobile "hamburger" bottom-sheet menu, factored out of the
// language-playground header so the SQL playgrounds (SQLite / Postgres /
// DuckDB) can surface the same consolidated menu on narrow viewports.
// Reuses the existing `.mobile-menu-*` CSS so it looks identical to the
// language playgrounds' menu.
//
// Composition:
//   <MobileMenuSheet open onOpenChange title="Menu">
//     <MobileMenuAction label="Settings" onClick={openSettings} />
//     <MobileMenuSubSheet label="Import">…rows…</MobileMenuSubSheet>
//   </MobileMenuSheet>
//
// Any <MobileMenuAction> closes the whole sheet after firing (via the
// context below) so a tap both runs the action and dismisses the menu,
// matching the language playgrounds' behaviour.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Drawer } from "@base-ui/react/drawer";
import type { LucideIcon } from "lucide-react";

interface MobileMenuContextValue {
  /** Closes the whole menu (root sheet + any open sub-sheet). */
  closeRoot: () => void;
  /** Id of the sub-sheet that's currently open, or null. Sub-sheets are
   *  mutually exclusive: opening one closes any other, so selecting a
   *  different menu item never leaves a stale sub-sheet open behind it. */
  activeSubmenu: string | null;
  setActiveSubmenu: (id: string | null) => void;
}

const MobileMenuContext = createContext<MobileMenuContextValue>({
  closeRoot: () => {},
  activeSubmenu: null,
  setActiveSubmenu: () => {},
});

export interface MobileMenuSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Title shown in the sheet header. Defaults to "Menu". */
  title?: string;
  children: ReactNode;
}

const HAMBURGER_ICON = (
  <svg
    viewBox="0 0 24 24"
    width={18}
    height={18}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <line x1="4" y1="7" x2="20" y2="7" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="17" x2="20" y2="17" />
  </svg>
);

/** Hamburger trigger (mobile-only) + the main bottom-sheet drawer. */
export function MobileMenuSheet({
  open,
  onOpenChange,
  title = "Menu",
  children,
}: MobileMenuSheetProps) {
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  // Forget the open sub-sheet whenever the whole menu closes, so it
  // reopens from the top next time.
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) setActiveSubmenu(null);
      onOpenChange(next);
    },
    [onOpenChange],
  );
  const closeRoot = useCallback(() => {
    setActiveSubmenu(null);
    onOpenChange(false);
  }, [onOpenChange]);
  const ctx = useMemo<MobileMenuContextValue>(
    () => ({ closeRoot, activeSubmenu, setActiveSubmenu }),
    [closeRoot, activeSubmenu],
  );
  return (
    <Drawer.Root
      open={open}
      onOpenChange={handleOpenChange}
      swipeDirection="down"
    >
      <Drawer.Trigger
        className="header-btn icon-only mobile-only mobile-menu-btn"
        title="Menu"
        aria-label="Open menu"
      >
        {HAMBURGER_ICON}
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop className="pkg-overlay mobile-menu-backdrop" />
        <Drawer.Viewport className="mobile-drawer-viewport">
          <Drawer.Popup className="mobile-menu-drawer" aria-label={title}>
            <Drawer.Content className="mobile-menu-drawer-content">
              <div className="mobile-menu-handle" aria-hidden="true" />
              <div className="mobile-menu-drawer-header">
                <Drawer.Title className="mobile-menu-drawer-title">
                  {title}
                </Drawer.Title>
                <Drawer.Close className="settings-close" aria-label="Close menu">
                  ✕
                </Drawer.Close>
              </div>
              <div className="mobile-menu-drawer-body">
                <MobileMenuContext.Provider value={ctx}>
                  {children}
                </MobileMenuContext.Provider>
              </div>
              {/* While a sub-sheet is open the parent menu acts as a
                  backdrop: a tap anywhere on it just closes the sub-sheet
                  (rather than opening whatever item was tapped). */}
              {activeSubmenu !== null && (
                <button
                  type="button"
                  className="mobile-menu-dismiss-catch"
                  aria-label="Close submenu"
                  onClick={() => setActiveSubmenu(null)}
                />
              )}
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

/** Uppercase group label, the drawer counterpart of the desktop ⋯ menu's
 *  section labels. */
export function MobileMenuLabel({ children }: { children: ReactNode }) {
  return <div className="mobile-menu-label">{children}</div>;
}

/** Close-the-whole-menu callback for custom content rendered inside a
 *  MobileMenuSheet (e.g. shared menu panels that dismiss on selection). */
export function useMobileMenuClose() {
  return useContext(MobileMenuContext).closeRoot;
}

/** True while the `MobileMenuSubSheet` with this id is the open one. Lets a
 *  row that owns a sub-sheet react to it opening (e.g. refetch the cloud
 *  backup list) from *outside* the sheet, where the hooks stay mounted. */
export function useMobileMenuSubSheetOpen(id: string) {
  return useContext(MobileMenuContext).activeSubmenu === id;
}

/** Leading icon + label cluster shared by action rows and sub-sheet rows.
 *  `sub` adds the desktop menus' second, dimmer line under the label. */
function RowMain({
  icon: Icon,
  label,
  sub,
}: {
  icon?: LucideIcon;
  label: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <span className="mobile-menu-main">
      {Icon && <Icon size={15} strokeWidth={1.8} aria-hidden="true" />}
      {sub === undefined ? (
        <span>{label}</span>
      ) : (
        <span className="mobile-menu-text">
          <span>{label}</span>
          <span className="mobile-menu-sub">{sub}</span>
        </span>
      )}
    </span>
  );
}

/** Non-interactive note row, the drawer counterpart of the desktop save
 *  menu's "Auto-saves in this browser as you work" strip. */
export function MobileMenuNote({
  icon: Icon,
  children,
}: {
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className="mobile-menu-note">
      {Icon && <Icon size={13} strokeWidth={2} aria-hidden="true" />}
      <span>{children}</span>
    </div>
  );
}

export interface MobileMenuActionProps {
  label: ReactNode;
  /** Fired on tap. Optional only for `href` rows, which navigate instead. */
  onClick?: () => void;
  /** Renders the row as a link to this URL instead of a button (e.g. the
   *  save menu's "Sign in to back up"). */
  href?: string;
  /** Leading icon, mirroring the desktop ⋯ menu rows. */
  icon?: LucideIcon;
  /** Second, dimmer line under the label, mirroring the desktop save
   *  menu's item subtitles. */
  sub?: ReactNode;
  /** Small trailing count/status chip (e.g. example counts, "Saved"). */
  hint?: ReactNode;
  disabled?: boolean;
  /** Show a trailing chevron (use when the action opens another surface,
   *  e.g. a tab/dialog). */
  chevron?: boolean;
  /** Keep the sheet open after firing (rare, most actions dismiss it). */
  keepOpen?: boolean;
}

/** A flat action row. Fires `onClick` then closes the whole menu. */
export function MobileMenuAction({
  label,
  onClick,
  href,
  icon,
  sub,
  hint,
  disabled,
  chevron,
  keepOpen,
}: MobileMenuActionProps) {
  const { closeRoot } = useContext(MobileMenuContext);
  const body = (
    <>
      <RowMain icon={icon} label={label} sub={sub} />
      <span className="mobile-menu-trailing">
        {hint !== undefined && (
          <span className="mobile-menu-hint">{hint}</span>
        )}
        {chevron && (
          <span className="mobile-menu-chev" aria-hidden="true">
            ›
          </span>
        )}
      </span>
    </>
  );
  if (href) {
    return (
      <a
        className="mobile-menu-action"
        href={href}
        onClick={() => {
          onClick?.();
          closeRoot();
        }}
      >
        {body}
      </a>
    );
  }
  return (
    <button
      type="button"
      className="mobile-menu-action"
      disabled={disabled}
      onClick={() => {
        onClick?.();
        if (!keepOpen) closeRoot();
      }}
    >
      {body}
    </button>
  );
}

export interface MobileMenuSubSheetProps {
  label: ReactNode;
  /** Leading icon, mirroring the desktop ⋯ menu rows. */
  icon?: LucideIcon;
  /** Small trailing count chip shown before the chevron. */
  hint?: ReactNode;
  /** Sheet header title; defaults to `label`. */
  title?: ReactNode;
  /** Accessible label for the nested sheet; defaults to a string `label`. */
  ariaLabel?: string;
  /** Extra class appended to the body (e.g. `info-popover` for the
   *  runtime-info panel). */
  bodyClassName?: string;
  /** Identity used to enforce one-open-sub-sheet-at-a-time. Defaults to a
   *  string `label`; pass explicitly if `label` isn't a unique string. */
  id?: string;
  children: ReactNode;
}

/** A row that opens a nested bottom-sheet holding `children` (e.g. the
 *  Import / Export format lists). Actions inside still close the whole
 *  menu via the shared context. */
export function MobileMenuSubSheet({
  label,
  icon,
  hint,
  title,
  ariaLabel,
  bodyClassName,
  id,
  children,
}: MobileMenuSubSheetProps) {
  const { activeSubmenu, setActiveSubmenu } = useContext(MobileMenuContext);
  const submenuId = id ?? (typeof label === "string" ? label : "submenu");
  return (
    <Drawer.Root
      open={activeSubmenu === submenuId}
      onOpenChange={(next) => setActiveSubmenu(next ? submenuId : null)}
      swipeDirection="down"
    >
      <Drawer.Trigger className="mobile-menu-action">
        <RowMain icon={icon} label={label} />
        <span className="mobile-menu-trailing">
          {hint !== undefined && (
            <span className="mobile-menu-hint">{hint}</span>
          )}
          <span className="mobile-menu-chev" aria-hidden="true">
            ›
          </span>
        </span>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop
          className="pkg-overlay mobile-menu-backdrop"
          forceRender
        />
        <Drawer.Viewport className="mobile-drawer-viewport">
          <Drawer.Popup
            className="mobile-menu-drawer mobile-menu-nested-drawer"
            aria-label={ariaLabel ?? (typeof label === "string" ? label : undefined)}
          >
            <Drawer.Content className="mobile-menu-drawer-content">
              <div className="mobile-menu-handle" aria-hidden="true" />
              <div className="mobile-menu-drawer-header">
                <Drawer.Title className="mobile-menu-drawer-title">
                  {title ?? label}
                </Drawer.Title>
                <Drawer.Close className="settings-close" aria-label="Close">
                  ✕
                </Drawer.Close>
              </div>
              <div
                className={`mobile-menu-drawer-body${
                  bodyClassName ? ` ${bodyClassName}` : ""
                }`}
              >
                {children}
              </div>
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
