/**
 * Small SVG primitives shared across the illustration set.
 *
 * These deliberately carry no visual "style" of their own beyond geometry, so
 * each illustration stays free to set its own look. The key constraint: NO
 * `<defs>`/`<marker>` with shared ids — several illustrations can render into
 * the same document, and a duplicated marker id would cross-wire them. Arrow
 * heads are therefore drawn inline as polygons.
 */
import type { ReactNode } from "react";

interface ArrowProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width?: number;
  /** Arrowhead length in user units. */
  head?: number;
  dashed?: boolean;
  /** Draw a head at the start too (double-headed). */
  double?: boolean;
}

/** A straight line ending in a filled triangular arrowhead at (x2, y2). */
export function Arrow({
  x1,
  y1,
  x2,
  y2,
  color,
  width = 2.5,
  head = 9,
  dashed = false,
  double = false,
}: ArrowProps): ReactNode {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const spread = 0.42;
  // Pull each end of the shaft back to the base of its head so the stroke
  // doesn't poke through the triangle's tip.
  const ex = x2 - Math.cos(angle) * head * 0.85;
  const ey = y2 - Math.sin(angle) * head * 0.85;
  const sx = double ? x1 + Math.cos(angle) * head * 0.85 : x1;
  const sy = double ? y1 + Math.sin(angle) * head * 0.85 : y1;
  const headAt = (tipX: number, tipY: number, dir: number) => {
    const a = dir < 0 ? angle + Math.PI : angle;
    const lx = tipX - Math.cos(a - spread) * head;
    const ly = tipY - Math.sin(a - spread) * head;
    const rx = tipX - Math.cos(a + spread) * head;
    const ry = tipY - Math.sin(a + spread) * head;
    return `${tipX},${tipY} ${lx},${ly} ${rx},${ry}`;
  };
  return (
    <g>
      <line
        x1={sx}
        y1={sy}
        x2={ex}
        y2={ey}
        style={{
          stroke: color,
          strokeWidth: width,
          strokeLinecap: "round",
          strokeDasharray: dashed ? "1 7" : undefined,
        }}
      />
      <polygon points={headAt(x2, y2, 1)} style={{ fill: color }} />
      {double && (
        <polygon points={headAt(x1, y1, -1)} style={{ fill: color }} />
      )}
    </g>
  );
}

/** An eight-tooth gear — shorthand for "a machine / a process". The hole is
 *  punched in `holeColor` (pass the surrounding fill to make it read as a
 *  ring). */
export function Gear({
  cx,
  cy,
  r,
  color,
  holeColor,
}: {
  cx: number;
  cy: number;
  r: number;
  color: string;
  holeColor: string;
}): ReactNode {
  const toothW = r * 0.27;
  const toothH = r * 0.42;
  return (
    <g>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((d) => (
        <rect
          key={d}
          x={cx - toothW / 2}
          y={cy - r - toothH * 0.55}
          width={toothW}
          height={toothH}
          rx={toothW * 0.3}
          style={{ fill: color }}
          transform={`rotate(${d} ${cx} ${cy})`}
        />
      ))}
      <circle cx={cx} cy={cy} r={r} style={{ fill: color }} />
      <circle cx={cx} cy={cy} r={r * 0.42} style={{ fill: holeColor }} />
    </g>
  );
}
