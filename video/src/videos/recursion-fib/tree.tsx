import React from "react";
import { MONO } from "../../theme/fonts";
import { headline, HIGHLIGHT, INK, INK_SOFT, label, PAPER } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { MEMO, MEMO_INK, NAIVE, NAIVE_INK } from "./kit";

/** One call in a drawn call tree: a pill with `fib(n)` set in mono. */
export const NODE_W = 112;
/** A node renamed `fibMemo(n)` is this wide, its text this size. */
export const MEMO_NODE_W = 146;
const MEMO_TEXT = 21;
export const NODE_H = 46;
const TEXT = 24;

/** How a call is drawn: an ordinary call, a repeat of work already done
 *  (naive), or an answer read from the table (memo). */
export type NodeLook = "call" | "repeat" | "lookup";

const LOOK: Record<NodeLook, { fill: string; stroke: string; ink: string; dash?: string }> = {
  call: { fill: PAPER, stroke: INK_SOFT, ink: INK },
  repeat: { fill: `color-mix(in srgb, ${NAIVE} 20%, ${PAPER})`, stroke: NAIVE, ink: NAIVE_INK },
  lookup: { fill: `color-mix(in srgb, ${MEMO} 14%, ${PAPER})`, stroke: MEMO, ink: MEMO_INK, dash: "7 5" },
};

/**
 * A node, centred on `x` with its top at `top` (page px, already through the
 * layout). `look` fades from `from` to `to` by `mix` (0..1), so a node can
 * turn red or blue in place. `ring` (0..1) draws an accent ring around it;
 * `glow` (0..1) lays a highlighter wash behind it. `rename` (0..1) turns its
 * label from `fib(n)` into `fibMemo(n)`, widening the pill to fit.
 */
export const TreeNode: React.FC<{
  n: number;
  x: number;
  top: number;
  appear: number;
  from?: NodeLook;
  to?: NodeLook;
  mix?: number;
  ring?: number;
  glow?: number;
  opacity?: number;
  rename?: number;
}> = ({ n, x, top, appear, from = "call", to, mix = 0, ring = 0, glow = 0, opacity = 1, rename = 0 }) => {
  if (appear <= 0 || opacity <= 0) return null;
  const w = NODE_W + (MEMO_NODE_W - NODE_W) * rename;
  const a = LOOK[from];
  const b = LOOK[to ?? from];
  const m = Math.round(Math.min(1, Math.max(0, mix)) * 100);
  const blend = (p: string, q: string) => (m <= 0 ? p : m >= 100 ? q : `color-mix(in srgb, ${q} ${m}%, ${p})`);
  const dash = m >= 50 ? b.dash : a.dash;
  return (
    <div
      style={{
        position: "absolute",
        left: x - w / 2,
        top,
        width: w,
        height: NODE_H,
        opacity: appear * opacity,
        transform: `scale(${0.86 + 0.14 * appear})`,
      }}
    >
      {glow > 0 ? (
        <div
          style={{
            position: "absolute",
            inset: -9,
            borderRadius: NODE_H,
            background: HIGHLIGHT,
            opacity: glow,
          }}
        />
      ) : null}
      <svg width={w} height={NODE_H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <rect
          x={1.5}
          y={1.5}
          width={w - 3}
          height={NODE_H - 3}
          rx={(NODE_H - 3) / 2}
          fill={blend(a.fill, b.fill)}
          stroke={blend(a.stroke, b.stroke)}
          strokeWidth={2.4}
          strokeDasharray={dash}
        />
        {ring > 0 ? (
          <rect
            x={-6}
            y={-6}
            width={w + 12}
            height={NODE_H + 12}
            rx={(NODE_H + 12) / 2}
            fill="none"
            stroke={NAIVE}
            strokeWidth={3}
            pathLength={1}
            strokeDasharray={`${ring} 1`}
          />
        ) : null}
      </svg>
      {(
        [
          ["fib", TEXT, 1 - rename],
          ["fibMemo", MEMO_TEXT, rename],
        ] as const
      ).map(([name, size, o]) =>
        o <= 0 ? null : (
          <div
            key={name}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: MONO,
              fontSize: size,
              fontWeight: 500,
              fontVariantLigatures: "none",
              color: blend(a.ink, b.ink),
              whiteSpace: "pre",
              opacity: o,
            }}
          >
            {name}({n})
          </div>
        ),
      )}
    </div>
  );
};

/** The line from a parent's bottom to a child's top, drawn in by `draw`. */
export const TreeEdge: React.FC<{
  from: readonly [number, number];
  to: readonly [number, number];
  draw: number;
  color?: string;
  width?: number;
  opacity?: number;
}> = ({ from, to, draw, color = INK_SOFT, width = 1.8, opacity = 1 }) => {
  if (draw <= 0 || opacity <= 0) return null;
  const [x1, y1] = [from[0], from[1] + NODE_H + 3];
  const [x2, y2] = [to[0], to[1] - 3];
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
      <path
        d={`M${x1},${y1} L${x2},${y2}`}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={`${draw} 1`}
      />
    </svg>
  );
};

/**
 * The running call count beside a tree: a big number in the series ink, a
 * caption under it, and a highlighter wash when the narration leans on it.
 */
export const Counter: React.FC<{
  x: number;
  top: number;
  at: number;
  value: number;
  color: string;
  caption: React.ReactNode;
  hot?: number;
}> = ({ x, top, at, value, color, caption, hot = 0 }) => (
  <Ink at={at} dur={14} style={{ left: x, top }}>
    <div style={{ position: "relative", display: "inline-block" }}>
      <span
        style={{
          position: "absolute",
          left: "-0.08em",
          right: `calc(${1 - hot} * (100% + 0.16em) - 0.08em)`,
          top: "0.12em",
          bottom: "0.02em",
          background: HIGHLIGHT,
          opacity: hot > 0 ? 1 : 0,
        }}
      />
      <span style={{ position: "relative", ...headline(120), color, fontVariantNumeric: "tabular-nums lining-nums" }}>
        {value}
      </span>
    </div>
    <div style={{ ...label(22, INK_SOFT), marginTop: 10 }}>{caption}</div>
  </Ink>
);
