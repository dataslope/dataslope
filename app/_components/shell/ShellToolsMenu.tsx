"use client";

/**
 * The ellipsis menu in a shell block's header, holding the two actions that
 * are not the primary one: Reset and Copy.
 *
 * It borrows `SqlCardToolsMenu.module.css` rather than restating it. The two
 * menus sit in the same header slot on adjacent blocks in a lesson, so they
 * have to be the same menu, and a second stylesheet describing the same popup
 * is a second thing to keep in sync.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { Check, ClipboardCopy, MoreHorizontal, RotateCcw } from "lucide-react";
import styles from "../sqlCardTools/SqlCardToolsMenu.module.css";

export interface ShellToolsMenuProps {
  /** Clears the transcript and re-seeds the filesystem. */
  onReset: () => void;
  /** Returns the text to put on the clipboard; empty means nothing to copy. */
  getCopyText: () => string;
  /** What the Copy item says it copies, e.g. "transcript". */
  copyLabel: string;
  copyNote: string;
  disabled?: boolean;
}

export function ShellToolsMenu({
  onReset,
  getCopyText,
  copyLabel,
  copyNote,
  disabled = false,
}: ShellToolsMenuProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(async () => {
    const text = getCopyText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // A denied clipboard permission is not worth interrupting the lesson
      // over; the item simply does not flip to "Copied".
    }
  }, [getCopyText]);

  return (
    <Menu.Root>
      <Menu.Trigger
        className={styles.trigger}
        disabled={disabled}
        aria-label="Block tools"
        title="Block tools"
      >
        <MoreHorizontal size={14} strokeWidth={2.2} aria-hidden />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="end" className={styles.positioner}>
          <Menu.Popup className={styles.popup}>
            <Menu.Item className={styles.item} onClick={onReset}>
              <RotateCcw strokeWidth={1.8} aria-hidden />
              <span className={styles.itemLabel}>
                Reset
                <span className={styles.itemNote}>
                  Back to the starting files, transcript cleared
                </span>
              </span>
            </Menu.Item>
            <Menu.Item
              className={styles.item}
              closeOnClick={false}
              onClick={() => void copy()}
            >
              {copied ? (
                <Check strokeWidth={1.8} aria-hidden />
              ) : (
                <ClipboardCopy strokeWidth={1.8} aria-hidden />
              )}
              <span className={styles.itemLabel}>
                {copied ? "Copied" : `Copy ${copyLabel}`}
                <span className={styles.itemNote}>{copyNote}</span>
              </span>
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
