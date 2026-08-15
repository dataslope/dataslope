"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Geometry for the Ask AI panel: drag to reposition, drag a grip to resize.
 * The panel is docked bottom-right by CSS; dragging switches it to explicit
 * `left`/`top`, seeded from where it sits so the first move doesn't jump.
 * Resizing keeps the bottom-right corner (the anchor: dock + composer) still.
 * Desktop only — below `MIN_DRAG_WIDTH` the hook reports `enabled: false`.
 * Geometry is remembered per browser and re-clamped on window resize so the
 * panel never ends up off-screen.
 */

const STORAGE_KEY = "askai_panel_pos";
const SIZE_STORAGE_KEY = "askai_panel_size";
const MIN_DRAG_WIDTH = 768;
/** Size assumed when the element cannot be measured (restore path racing
 *  layout). Must match the panel's CSS width/height. */
const FALLBACK_SIZE: PanelSize = { width: 400, height: 620 };

/** Resize bounds: the minimum still fits the composer/chip/quota lines plus a
 *  few lines of answer; the maximum keeps it a panel, not a page takeover. */
const MIN_SIZE: PanelSize = { width: 340, height: 380 };
const MAX_SIZE: PanelSize = { width: 760, height: 1000 };

export interface PanelPosition {
  left: number;
  top: number;
}

interface PanelSize {
  width: number;
  height: number;
}

/** Which edges a resize gesture is dragging. */
export type ResizeEdge = "left" | "top" | "corner";

/** Where the panel is and how big it is. `null` on either means "as the CSS
 *  says" — docked bottom-right, at the default size. */
interface PanelGeometry {
  pos: PanelPosition | null;
  size: PanelSize | null;
}

/** Size held within the fixed bounds AND within the current viewport, so a
 *  panel can never be sized past the window it lives in. */
function clampSize(size: PanelSize): PanelSize {
  const view = document.documentElement;
  const vw = view?.clientWidth || window.innerWidth;
  const vh = view?.clientHeight || window.innerHeight;
  const maxW = Math.max(MIN_SIZE.width, Math.min(MAX_SIZE.width, vw - 32));
  const maxH = Math.max(MIN_SIZE.height, Math.min(MAX_SIZE.height, vh - 40));
  return {
    width: Math.min(Math.max(size.width, MIN_SIZE.width), maxW),
    height: Math.min(Math.max(size.height, MIN_SIZE.height), maxH),
  };
}

/** Keep the panel wholly inside the window. Measured against the document
 *  element's client box (`innerWidth` counts the scrollbar gutter).
 *  `Math.max(0, …)` pins an oversized panel to the top-left rather than going
 *  negative, so the header stays reachable. */
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

function readStoredSize(): PanelSize | null {
  try {
    const raw = localStorage.getItem(SIZE_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as PanelSize).width === "number" &&
      typeof (parsed as PanelSize).height === "number"
    ) {
      return parsed as PanelSize;
    }
  } catch {
    /* unreadable storage: fall back to the CSS size */
  }
  return null;
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: the geometry just won't persist */
  }
}

export function useDraggablePanel(panelRef: React.RefObject<HTMLElement | null>) {
  // Position and size are one state: a resize moves the origin and the size in
  // the same gesture, and splitting them would make that two visible renders.
  const [geom, setGeom] = useState<PanelGeometry>({ pos: null, size: null });
  const { pos, size } = geom;
  const setPos = useCallback(
    (fn: (prev: PanelPosition | null) => PanelPosition | null) =>
      setGeom((g) => ({ ...g, pos: fn(g.pos) })),
    [],
  );
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState<ResizeEdge | null>(null);
  const [enabled, setEnabled] = useState(false);
  // Pointer offset within the panel at drag start, so the panel moves with
  // the grab point rather than snapping its corner to the cursor.
  const grabRef = useRef({ x: 0, y: 0 });
  // The panel's bottom-right at resize start: the fixed point every resize is
  // measured back from.
  const anchorRef = useRef({ right: 0, bottom: 0 });

  // Media query rather than a one-off width read, so resizing across the
  // breakpoint turns dragging on and off without a reload.
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${MIN_DRAG_WIDTH}px)`);
    const sync = () => setEnabled(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Restore once mounted. The stored position is clamped against the stored
  // *size*, not the CSS default, or a panel saved large would jump on frame 1.
  useEffect(() => {
    if (!enabled) return;
    const storedSize = readStoredSize();
    const storedPos = readStored();
    if (!storedSize && !storedPos) return;
    const size = storedSize ? clampSize(storedSize) : null;
    setGeom({
      size,
      pos: storedPos
        ? clampToViewport(storedPos, size ?? measure(panelRef.current))
        : null,
    });
  }, [enabled, panelRef]);

  // A window that shrinks must not strand the panel outside it, nor leave it
  // sized for a window that no longer exists.
  useEffect(() => {
    if (!enabled) return;
    const onResize = () =>
      setGeom((g) => {
        if (!g.pos && !g.size) return g;
        const size = g.size ? clampSize(g.size) : null;
        const pos = g.pos
          ? clampToViewport(g.pos, size ?? measure(panelRef.current))
          : null;
        // Same object when nothing moved, so a window resize that changes
        // neither does not re-render the panel.
        return size?.width === g.size?.width &&
          size?.height === g.size?.height &&
          pos?.left === g.pos?.left &&
          pos?.top === g.pos?.top
          ? g
          : { pos, size };
      });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [enabled, panelRef]);

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
      setPos(() => ({ left: rect.left, top: rect.top }));
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    [enabled, panelRef, setPos],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!dragging) return;
      setPos(() =>
        clampToViewport(
          {
            left: event.clientX - grabRef.current.x,
            top: event.clientY - grabRef.current.y,
          },
          measure(panelRef.current),
        ),
      );
    },
    [dragging, panelRef, setPos],
  );

  const endDrag = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!dragging) return;
      setDragging(false);
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      setPos((current) => {
        if (current) write(STORAGE_KEY, current);
        return current;
      });
    },
    [dragging, setPos],
  );

  // ── Resize ─────────────────────────────────────────────────────────
  const startResize = useCallback(
    (edge: ResizeEdge) => (event: React.PointerEvent<HTMLElement>) => {
      if (!enabled) return;
      const el = panelRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      anchorRef.current = { right: rect.right, bottom: rect.bottom };
      // Seed the size from what is on screen, so the first pointer move
      // measures against the panel's real box rather than the CSS default.
      setGeom((g) => ({ ...g, size: { width: rect.width, height: rect.height } }));
      setResizing(edge);
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
      event.stopPropagation();
    },
    [enabled, panelRef],
  );

  const onResizeMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!resizing) return;
      const { right, bottom } = anchorRef.current;
      setGeom((g) => {
        const current = g.size ?? measure(panelRef.current);
        const size = clampSize({
          width: resizing === "top" ? current.width : right - event.clientX,
          height: resizing === "left" ? current.height : bottom - event.clientY,
        });
        return {
          size,
          // Once dragged, the panel is anchored top-left, so holding the
          // bottom-right still is this subtraction rather than the browser's
          // job. Still docked (`pos === null`) and CSS already does it.
          pos: g.pos
            ? { left: right - size.width, top: bottom - size.height }
            : null,
        };
      });
    },
    [resizing, panelRef],
  );

  const endResize = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!resizing) return;
      setResizing(null);
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      setGeom((g) => {
        if (g.size) write(SIZE_STORAGE_KEY, g.size);
        if (g.pos) write(STORAGE_KEY, g.pos);
        return g;
      });
    },
    [resizing],
  );

  /** Send the panel back to its docked bottom-right position and CSS size. */
  const reset = useCallback(() => {
    setGeom({ pos: null, size: null });
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SIZE_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  // `right`/`bottom` are cleared explicitly: the CSS sets both, and leaving
  // them in place alongside `left`/`top` would stretch the panel instead of
  // moving it.
  const style: React.CSSProperties | undefined =
    enabled && (pos || size)
      ? {
          ...(size ? { width: size.width, height: size.height } : {}),
          ...(pos
            ? { left: pos.left, top: pos.top, right: "auto", bottom: "auto" }
            : {}),
        }
      : undefined;

  const resizeProps = (edge: ResizeEdge) => ({
    onPointerDown: startResize(edge),
    onPointerMove: onResizeMove,
    onPointerUp: endResize,
    onPointerCancel: endResize,
  });

  return {
    enabled,
    dragging,
    resizing: resizing !== null,
    /** True once moved OR resized — i.e. there is something to restore. */
    moved: pos !== null || size !== null,
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
    /** Spread onto a grip element; `enabled` gates whether to render one. */
    resizeProps,
  };
}
