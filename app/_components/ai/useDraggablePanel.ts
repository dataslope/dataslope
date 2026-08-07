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
/** Panel size assumed when the element cannot be measured (it is always
 *  mounted by the time a drag can start, so this only covers the restore
 *  path racing layout). Matches the panel's CSS width/height. */
const FALLBACK_SIZE: PanelSize = { width: 400, height: 620 };

export interface PanelPosition {
  left: number;
  top: number;
}

interface PanelSize {
  width: number;
  height: number;
}

/** The panel is kept wholly inside the window: no edge may pass a viewport
 *  edge, so it can never be dragged half (or entirely) out of the browser.
 *  Measured against the document element's client box rather than
 *  `innerWidth`/`innerHeight`, which count the scrollbar gutter.
 *
 *  `Math.max(0, …)` on the upper bounds handles a panel taller or wider than
 *  the window: it pins to the top-left rather than going negative, so the
 *  header (the drag handle, and the close button) stays reachable. */
function clampToViewport(pos: PanelPosition, size: PanelSize): PanelPosition {
  const view = document.documentElement;
  const vw = view?.clientWidth || window.innerWidth;
  const vh = view?.clientHeight || window.innerHeight;
  return {
    left: Math.min(Math.max(pos.left, 0), Math.max(0, vw - size.width)),
    top: Math.min(Math.max(pos.top, 0), Math.max(0, vh - size.height)),
  };
}

/** Current on-screen size of the panel, or the CSS defaults if it has not
 *  been laid out yet. */
function measure(el: HTMLElement | null | undefined): PanelSize {
  const rect = el?.getBoundingClientRect();
  if (!rect || !rect.width || !rect.height) return FALLBACK_SIZE;
  return { width: rect.width, height: rect.height };
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
    setPos(clampToViewport(stored, measure(panelRef.current)));
  }, [enabled, panelRef]);

  // A window that shrinks must not strand the panel outside it.
  useEffect(() => {
    if (!enabled || !pos) return;
    const onResize = () => {
      const size = measure(panelRef.current);
      setPos((prev) => (prev ? clampToViewport(prev, size) : prev));
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
      setPos(
        clampToViewport(
          {
            left: event.clientX - grabRef.current.x,
            top: event.clientY - grabRef.current.y,
          },
          measure(panelRef.current),
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
