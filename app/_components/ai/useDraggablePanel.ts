"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Drag-to-reposition for the Ask AI panel.
 *
 * The panel is docked bottom-right by CSS (`position: fixed; right/bottom`).
 * Dragging switches it to explicit `left`/`top` co-ordinates, seeded from
 * wherever it currently sits so the first pointer move does not make it jump.
 *
 * Desktop only. Below `MIN_DRAG_WIDTH` the panel is nearly the width of the
 * screen, so there is nowhere to drag it to and a drag would only fight the
 * scroll gesture; the hook reports `enabled: false` and the caller renders a
 * plain, undraggable header.
 *
 * The position is remembered per browser, and re-clamped into view on resize,
 * so a panel parked against the right edge of a wide window does not end up
 * off-screen in a narrow one.
 */

const STORAGE_KEY = "askai_panel_pos";
const MIN_DRAG_WIDTH = 768;
/** Keep at least this much of the panel on screen in each axis. */
const KEEP_VISIBLE = 64;

export interface PanelPosition {
  left: number;
  top: number;
}

/** `width` lets the panel hang off the left edge while keeping a grabbable
 *  strip on screen. There is no height equivalent: `top` is clamped at 0 so
 *  the header (the drag handle, and the close button) is always reachable. */
function clampToViewport(pos: PanelPosition, width: number): PanelPosition {
  const maxLeft = Math.max(0, window.innerWidth - KEEP_VISIBLE);
  const maxTop = Math.max(0, window.innerHeight - KEEP_VISIBLE);
  return {
    left: Math.min(Math.max(pos.left, KEEP_VISIBLE - width), maxLeft),
    top: Math.min(Math.max(pos.top, 0), maxTop),
  };
}

function readStored(): PanelPosition | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as PanelPosition).left === "number" &&
      typeof (parsed as PanelPosition).top === "number"
    ) {
      return parsed as PanelPosition;
    }
  } catch {
    /* unreadable storage: fall back to the docked position */
  }
  return null;
}

export function useDraggablePanel(panelRef: React.RefObject<HTMLElement | null>) {
  const [pos, setPos] = useState<PanelPosition | null>(null);
  const [dragging, setDragging] = useState(false);
  const [enabled, setEnabled] = useState(false);
  // Pointer offset within the panel at drag start, so the panel moves with
  // the grab point rather than snapping its corner to the cursor.
  const grabRef = useRef({ x: 0, y: 0 });

  // Media query rather than a one-off width read, so resizing across the
  // breakpoint turns dragging on and off without a reload.
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${MIN_DRAG_WIDTH}px)`);
    const sync = () => setEnabled(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Restore once the panel is mounted and measurable.
  useEffect(() => {
    if (!enabled) return;
    const stored = readStored();
    if (!stored) return;
    const el = panelRef.current;
    const rect = el?.getBoundingClientRect();
    setPos(clampToViewport(stored, rect?.width ?? 400));
  }, [enabled, panelRef]);

  // A window that shrinks must not strand the panel outside it.
  useEffect(() => {
    if (!enabled || !pos) return;
    const onResize = () => {
      const rect = panelRef.current?.getBoundingClientRect();
      setPos((prev) => (prev ? clampToViewport(prev, rect?.width ?? 400) : prev));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [enabled, pos, panelRef]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!enabled) return;
      // Let the header's own controls (close, new conversation, …) work.
      if ((event.target as HTMLElement).closest("button,a,input,textarea")) {
        return;
      }
      const el = panelRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      grabRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      // Seed from the current on-screen position so switching from the
      // docked right/bottom anchoring to left/top is invisible.
      setPos({ left: rect.left, top: rect.top });
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    [enabled, panelRef],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!dragging) return;
      const rect = panelRef.current?.getBoundingClientRect();
      setPos(
        clampToViewport(
          {
            left: event.clientX - grabRef.current.x,
            top: event.clientY - grabRef.current.y,
          },
          rect?.width ?? 400,
        ),
      );
    },
    [dragging, panelRef],
  );

  const endDrag = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!dragging) return;
      setDragging(false);
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      setPos((current) => {
        if (current) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
          } catch {
            /* storage full or blocked: the position just won't persist */
          }
        }
        return current;
      });
    },
    [dragging],
  );

  /** Send the panel back to its docked bottom-right position. */
  const reset = useCallback(() => {
    setPos(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  // `right`/`bottom` are cleared explicitly: the CSS sets both, and leaving
  // them in place alongside `left`/`top` would stretch the panel instead of
  // moving it.
  const style: React.CSSProperties | undefined =
    enabled && pos
      ? { left: pos.left, top: pos.top, right: "auto", bottom: "auto" }
      : undefined;

  return {
    enabled,
    dragging,
    moved: pos !== null,
    style,
    reset,
    handleProps: enabled
      ? {
          onPointerDown,
          onPointerMove,
          onPointerUp: endDrag,
          onPointerCancel: endDrag,
        }
      : {},
  };
}
