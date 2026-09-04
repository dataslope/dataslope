"use client";

/**
 * Renders a split tree as positioned panes and gutters.
 *
 * The panes are one flat list keyed by id, in reading order, each placed
 * from `layout()`. Flat on purpose: nesting components in the tree's shape
 * would remount a terminal every time the tree changed around it, and a
 * split that wiped the scrollback of the terminal being split would be worse
 * than no split. Gutters sit on the boundary between a split's children and
 * resize it from the pointer's position over the split's rendered length,
 * held to a minimum pane size so a terminal never shrinks past where its
 * prompt wraps every word.
 *
 * Positions travel as custom properties rather than inline `left`/`top`, so
 * the phone stylesheet can ignore them and stack the panes instead.
 */

import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { MAX_RATIO, MIN_RATIO, layout, leaves, type Gutter, type Node, type Rect } from "./splitTree";

/** Smallest a pane may be, in px, along the axis being resized. */
export const MIN_PANE = { row: 220, col: 120 } as const;
/** Gutter thickness, in px; half of it is taken from each neighbor. The
 *  hairline sits in its middle, as the code playground's resizer does. */
export const GUTTER = 8;

interface Props {
  node: Node;
  renderLeaf: (id: string) => ReactNode;
  onResize: (splitId: string, ratio: number) => void;
}

const pct = (n: number) => `${(n * 100).toFixed(4)}%`;

/** A pane's box, pulled in by half a gutter on every edge it shares. */
function slotStyle(r: Rect): CSSProperties {
  const l = r.x > 0 ? GUTTER / 2 : 0;
  const t = r.y > 0 ? GUTTER / 2 : 0;
  const rr = r.x + r.width < 0.9999 ? GUTTER / 2 : 0;
  const b = r.y + r.height < 0.9999 ? GUTTER / 2 : 0;
  return {
    "--l": `calc(${pct(r.x)} + ${l}px)`,
    "--t": `calc(${pct(r.y)} + ${t}px)`,
    "--w": `calc(${pct(r.width)} - ${l + rr}px)`,
    "--h": `calc(${pct(r.height)} - ${t + b}px)`,
  } as CSSProperties;
}

/** A gutter's box, trimmed by half a gutter at either end where it meets an
 *  enclosing split's gutter, so the crossing belongs to the outer one. */
function gutterStyle({ rect: r, ratio, dir }: Gutter): CSSProperties {
  if (dir === "row") {
    const t = r.y > 0 ? GUTTER / 2 : 0;
    const b = r.y + r.height < 0.9999 ? GUTTER / 2 : 0;
    return {
      left: `calc(${pct(r.x + r.width * ratio)} - ${GUTTER / 2}px)`,
      top: `calc(${pct(r.y)} + ${t}px)`,
      width: GUTTER,
      height: `calc(${pct(r.height)} - ${t + b}px)`,
    };
  }
  const l = r.x > 0 ? GUTTER / 2 : 0;
  const rr = r.x + r.width < 0.9999 ? GUTTER / 2 : 0;
  return {
    top: `calc(${pct(r.y + r.height * ratio)} - ${GUTTER / 2}px)`,
    left: `calc(${pct(r.x)} + ${l}px)`,
    height: GUTTER,
    width: `calc(${pct(r.width)} - ${l + rr}px)`,
  };
}

export function SplitView({ node, renderLeaf, onResize }: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<{ gutter: Gutter; start: number; length: number; pointer: number } | null>(null);
  const [held, setHeld] = useState<string | null>(null);
  const { panes, gutters } = useMemo(() => layout(node), [node]);
  const order = useMemo(() => leaves(node), [node]);

  const onPointerDown = (g: Gutter) => (e: React.PointerEvent<HTMLDivElement>) => {
    const el = stage.current;
    if (!el) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const s = el.getBoundingClientRect();
    const row = g.dir === "row";
    drag.current = {
      gutter: g,
      start: row ? s.left + g.rect.x * s.width : s.top + g.rect.y * s.height,
      length: row ? g.rect.width * s.width : g.rect.height * s.height,
      pointer: e.pointerId,
    };
    setHeld(g.id);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.pointer !== e.pointerId) return;
    const pos = (d.gutter.dir === "row" ? e.clientX : e.clientY) - d.start;
    const min = MIN_PANE[d.gutter.dir];
    // Hold both children above the minimum; if the split is too small for
    // that, fall back to the ratio clamp so the gutter still moves.
    const lo = d.length > min * 2 ? min / d.length : MIN_RATIO;
    const hi = d.length > min * 2 ? 1 - min / d.length : MAX_RATIO;
    onResize(d.gutter.id, Math.min(hi, Math.max(lo, pos / d.length)));
  };
  const onPointerUp = () => {
    drag.current = null;
    setHeld(null);
  };

  return (
    <div ref={stage} className="bpg-tree">
      {order.map((id) => (
        <div key={id} className="bpg-slot" style={slotStyle(panes[id])}>
          {renderLeaf(id)}
        </div>
      ))}
      {gutters.map((g) => (
        <div
          key={g.id}
          className={`bpg-gutter ${g.dir === "row" ? "dir-row" : "dir-col"}${held === g.id ? " dragging" : ""}`}
          style={gutterStyle(g)}
          role="separator"
          aria-orientation={g.dir === "row" ? "vertical" : "horizontal"}
          aria-valuenow={Math.round(g.ratio * 100)}
          aria-label={g.dir === "row" ? "Resize the panes side by side" : "Resize the panes above and below"}
          onPointerDown={onPointerDown(g)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={() => onResize(g.id, 0.5)}
          title="Drag to resize. Double-click to make them equal."
        />
      ))}
    </div>
  );
}
