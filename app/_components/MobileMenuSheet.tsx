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
// context below) so a tap both runs the action and dismisses the menu —
// matching the language playgrounds' behaviour.

import { createContext, useContext, type ReactNode } from "react";
import { Drawer } from "@base-ui/react/drawer";

/** Closes the root menu sheet. Provided by `MobileMenuSheet`, consumed by
 *  `MobileMenuAction` (including those nested inside a sub-sheet). */
const CloseRootContext = createContext<() => void>(() => {});

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
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} swipeDirection="down">
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
            <Drawer.Content>
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
                <CloseRootContext.Provider value={() => onOpenChange(false)}>
                  {children}
                </CloseRootContext.Provider>
              </div>
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

export interface MobileMenuActionProps {
  label: ReactNode;
  onClick: () => void;
  /** Show a trailing chevron (use when the action opens another surface,
   *  e.g. a tab/dialog). */
  chevron?: boolean;
  /** Keep the sheet open after firing (rare — most actions dismiss it). */
  keepOpen?: boolean;
}

/** A flat action row. Fires `onClick` then closes the whole menu. */
export function MobileMenuAction({
  label,
  onClick,
  chevron,
  keepOpen,
}: MobileMenuActionProps) {
  const closeRoot = useContext(CloseRootContext);
  return (
    <button
      type="button"
      className="mobile-menu-action"
      onClick={() => {
        onClick();
        if (!keepOpen) closeRoot();
      }}
    >
      <span>{label}</span>
      {chevron && (
        <span className="mobile-menu-chev" aria-hidden="true">
          ›
        </span>
      )}
    </button>
  );
}

export interface MobileMenuSubSheetProps {
  label: ReactNode;
  /** Sheet header title; defaults to `label`. */
  title?: ReactNode;
  /** Accessible label for the nested sheet; defaults to a string `label`. */
  ariaLabel?: string;
  /** Extra class appended to the body (e.g. `info-popover` for the
   *  runtime-info panel). */
  bodyClassName?: string;
  children: ReactNode;
}

/** A row that opens a nested bottom-sheet holding `children` (e.g. the
 *  Import / Export format lists). Actions inside still close the whole
 *  menu via the shared context. */
export function MobileMenuSubSheet({
  label,
  title,
  ariaLabel,
  bodyClassName,
  children,
}: MobileMenuSubSheetProps) {
  return (
    <Drawer.Root swipeDirection="down">
      <Drawer.Trigger className="mobile-menu-action">
        <span>{label}</span>
        <span className="mobile-menu-chev" aria-hidden="true">
          ›
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
            <Drawer.Content>
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
