import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { BAR } from "../../editorial/style";
import { ds, inkOf } from "../../theme/brand";
import { type Col, tableGeometry } from "../da-sql/parts";
import { at, type Scale } from "../da-statistics-communication/parts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit and the interview
 * kit (editorial/interview.tsx). Listings, tables and page furniture are
 * Part 1's (da-sql/parts.tsx), the plot axes, dots and reference lines Part
 * 3's (da-statistics-communication/parts.tsx), so the series stays one family.
 * What is local: column and geometry helpers for a result, a line that draws
 * itself on, and the spot illustration bound to this video.
 */
export {
  DataTable,
  Drift,
  ElbowArrow,
  Headline,
  Kicker,
  Listing,
  listingHeight,
  Mark,
  MARK,
  MARK_BAD,
  MARK_KEY,
  MARK_OK,
  Mono,
  OK,
  OK_INK,
  pulse,
  Strike,
  Svg,
  TableName,
  X0,
  type TableGeometry,
} from "../da-sql/parts";
export { at, Axes, Bracket, Dots, VLine, WARM, WARM_INK, type Scale } from "../da-statistics-communication/parts";

/** The two arms keep one ink each across the video, as in the hook: A the
 *  data blue, B a teal (a non-semantic hue, so neither reads as right). */
export const A_COLOR = BAR;
export const A_INK = inkOf.blue;
export const B_COLOR = ds("teal", 500);
export const B_INK = inkOf.teal;

/** The standard normal density. */
export const phi = (z: number) => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);

/** The standard normal CDF (Abramowitz and Stegun 7.1.26, error under 1.5e-7). */
export const Phi = (z: number) => {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-(z * z) / 2);
  return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
};

/** An SVG path of a normal curve centred on `mu` (unit spread) between `lo`
 *  and `hi`, in page pixels: closed to the baseline when `area` is set. */
export const curvePath = (x: Scale, base: number, height: number, mu: number, lo: number, hi: number, area = false, steps = 90) => {
  const pts = Array.from({ length: steps + 1 }, (_, i) => {
    const v = lo + ((hi - lo) * i) / steps;
    return [at(x, v), base - (phi(v - mu) / phi(0)) * height] as const;
  });
  const line = pts.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
  return area ? `${line} L${at(x, hi).toFixed(1)},${base} L${at(x, lo).toFixed(1)},${base} Z` : line;
};

const NUMBER = /^-?\d[\d,_]*(\.\d+)?$/;

/** Columns for a result: all-number columns set flush right, `extra` added by name. */
export const colsOf = (t: { cols: readonly string[]; rows: readonly (readonly string[])[] }, extra: Record<string, Partial<Col>> = {}): Col[] =>
  t.cols.map((name, j) => ({
    name,
    numeric: t.rows.length > 0 && t.rows.every((r) => NUMBER.test(r[j] ?? "") || r[j] === "null") && t.rows.some((r) => NUMBER.test(r[j] ?? "")),
    ...extra[name],
  }));

/** A result's geometry at (x, top): `top` a page position, heights through `h()`. */
export const geoOf = (
  t: { cols: readonly string[]; rows: readonly (readonly string[])[] },
  x: number,
  top: number,
  h: (v: number) => number,
  opts: { headH?: number; rowH?: number; bodySize?: number; headSize?: number; extra?: readonly (readonly string[])[] } = {},
) =>
  tableGeometry({
    x,
    top,
    cols: t.cols.map((name) => ({ name })),
    rows: t.rows,
    extra: opts.extra,
    headH: h(opts.headH ?? 46),
    rowH: h(opts.rowH ?? 50),
    bodySize: opts.bodySize ?? 24,
    headSize: opts.headSize ?? 21,
  });

/** Rows inking in one after another from `at`. */
export const rowsAt = (rows: readonly (readonly string[])[], from: number, step = 2) => rows.map((cells, i) => ({ cells, at: from + i * step }));

/**
 * A data line in page pixels, drawn on from its first point over `dur`
 * frames from `at`. `points` are data units, mapped through the two scales.
 */
export const Line: React.FC<{
  points: readonly (readonly [number, number])[];
  x: Scale;
  y: Scale;
  at: number;
  dur?: number;
  out?: number;
  dim?: number;
  color: string;
  width?: number;
  dash?: string;
}> = ({ points, x, y, at: from, dur = 24, out, dim, color, width = 3, dash }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (p <= 0 || o >= 1) return null;
  const path = points.map(([vx, vy], i) => `${i ? "L" : "M"}${at(x, vx).toFixed(1)},${at(y, vy).toFixed(1)}`).join(" ");
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) }}>
      {dash ? (
        <path d={path} fill="none" stroke={color} strokeWidth={width} strokeDasharray={dash} style={{ clipPath: `inset(-20px ${(1 - p) * 100}% -20px 0)` }} />
      ) : (
        <path d={path} fill="none" stroke={color} strokeWidth={width} strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray={`${p} 1`} />
      )}
    </svg>
  );
};

// ── Spot illustrations ───────────────────────────────────────────────────────

/** A watercolor spot from illustrations.json: it pops in on `at`, bobs
 *  gently, and fades on `out`. */
export const Spot: React.FC<{
  id: string;
  /** Another video's folder, for art the series shares. */
  video?: string;
  at: number;
  out?: number;
  dim?: number;
  left: number;
  top: number;
  width: number;
  height: number;
}> = ({ id, video = VIDEO, at: from, out, dim, left, top, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, from, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 20) * 0.6;
  // Another video's art is always there; this video's waits for its file.
  if ((video === VIDEO && !ILLUSTRATIONS) || p <= 0.001 || o >= 1) return null;
  return (
    <Illustration
      video={video}
      id={id}
      style={{
        position: "absolute",
        left,
        top,
        width,
        height,
        opacity: Math.min(1, p) * (1 - o) * (1 - d),
        transform: `translateY(${bob(frame, 5, 110) + (1 - p) * 30}px)`,
      }}
    />
  );
};
