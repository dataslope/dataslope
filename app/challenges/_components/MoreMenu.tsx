"use client";

/**
 * The phone header's overflow menu.
 *
 * The header has room for a back button, the title and one icon, so
 * everything the desktop top bar spreads across its right-hand side lands
 * here: Reset, the Solution and Submissions tabs, the language picker, and the
 * previous and next challenge. The trigger used to be a button with no
 * handler.
 *
 * A menu button in the WAI-ARIA sense: the trigger announces the popup, focus
 * moves into it on open, the arrow keys move between items, and Escape closes
 * it and hands focus back. Every item closes it.
 */

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Check, EllipsisVertical } from "lucide-react";
import s from "./ChallengeWorkspace.module.css";

export type MoreMenuItem =
  | { kind: "action"; label: string; icon?: ReactNode; onSelect: () => void }
  | { kind: "link"; label: string; icon?: ReactNode; href: string; ariaLabel?: string }
  | {
      kind: "radios";
      label: string;
      options: { id: string; label: string; checked: boolean; onSelect: () => void }[];
    }
  | { kind: "separator" };

export function MoreMenu({ items, className }: { items: MoreMenuItem[]; className: string }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const itemEls = () =>
    Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [],
    );

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  // Focus the first item once the menu is in the DOM.
  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role^="menuitem"]')?.focus();
  }, [open]);

  // An outside tap closes it, the way every other popup on the page behaves.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, close]);

  const onMenuKey = (e: React.KeyboardEvent) => {
    const els = itemEls();
    const at = els.indexOf(document.activeElement as HTMLElement);
    const move = (to: number) => {
      e.preventDefault();
      els[(to + els.length) % els.length]?.focus();
    };
    switch (e.key) {
      case "ArrowDown":
        return move(at + 1);
      case "ArrowUp":
        return move(at - 1);
      case "Home":
        return move(0);
      case "End":
        return move(els.length - 1);
      case "Escape":
        e.preventDefault();
        return close(true);
      case "Tab":
        // Leaving the menu closes it; focus carries on from the trigger.
        return close(false);
    }
  };

  return (
    <div className={s.menuWrap} ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className={className}
        aria-label="More"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <EllipsisVertical size={18} strokeWidth={2} aria-hidden="true" />
      </button>
      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="More"
          className={s.menu}
          onKeyDown={onMenuKey}
        >
          {items.map((item, i) => {
            switch (item.kind) {
              case "separator":
                return <div key={i} role="separator" className={s.menuSep} />;
              case "action":
                return (
                  <button
                    key={i}
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    className={s.menuItem}
                    onClick={() => {
                      close(true);
                      item.onSelect();
                    }}
                  >
                    <span className={s.menuIcon}>{item.icon}</span>
                    {item.label}
                  </button>
                );
              case "link":
                return (
                  <Link
                    key={i}
                    href={item.href}
                    role="menuitem"
                    tabIndex={-1}
                    aria-label={item.ariaLabel}
                    className={s.menuItem}
                    onClick={() => close(false)}
                  >
                    <span className={s.menuIcon}>{item.icon}</span>
                    <span className={s.menuItemText}>{item.label}</span>
                  </Link>
                );
              case "radios":
                return (
                  <div key={i} role="group" aria-label={item.label}>
                    <div className={s.menuLabel} aria-hidden="true">
                      {item.label}
                    </div>
                    {item.options.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={opt.checked}
                        tabIndex={-1}
                        className={s.menuItem}
                        onClick={() => {
                          close(true);
                          opt.onSelect();
                        }}
                      >
                        <span className={s.menuIcon}>
                          {opt.checked ? (
                            <Check size={15} strokeWidth={2.5} aria-hidden="true" />
                          ) : null}
                        </span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                );
            }
          })}
        </div>
      ) : null}
    </div>
  );
}
