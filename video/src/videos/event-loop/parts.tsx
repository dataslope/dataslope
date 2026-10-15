import React from "react";
import { MONO } from "../../theme/fonts";
import { DASH, Ink, circle } from "./draw";
import { HAND } from "./fonts";
import { BP, mix } from "./theme";

/**
 * The machine's parts, drafted: the call stack as a graduated tube, a queue
 * as a conveyor lane, the event loop as a spur gear, and the frames and
 * callback cards that move between them. Each is drawn in plain strokes so it
 * can draw itself on, and each takes a `glow` for "this part is acting now".
 */

/** A spur gear outline centered on 0,0: `teeth` square teeth of `depth`. */
export function gearPath(R: number, teeth: number, depth: number) {
  const r = R - depth;
  const a = (Math.PI * 2) / teeth;
  const at = (rad: number, th: number) => `${(Math.cos(th) * rad).toFixed(2)} ${(Math.sin(th) * rad).toFixed(2)}`;
  let d = `M ${at(r, 0)}`;
  for (let i = 0; i < teeth; i++) {
    const t0 = i * a;
    d += ` L ${at(R, t0 + a * 0.12)} L ${at(R, t0 + a * 0.42)} L ${at(r, t0 + a * 0.54)}`;
    d += ` A ${r} ${r} 0 0 1 ${at(r, t0 + a)}`;
  }
  return `${d} Z`;
}

export const Gear: React.FC<{
  cx: number;
  cy: number;
  R: number;
  teeth?: number;
  angle: number;
  p: number;
  glow?: number;
  centerLines?: boolean;
}> = ({ cx, cy, R, teeth = 14, angle, p, glow = 0, centerLines = true }) => {
  if (p <= 0) return null;
  const holes = [0, 1, 2, 3, 4].map((i) => (i / 5) * Math.PI * 2 - Math.PI / 2);
  const ext = R + 26;
  return (
    <g transform={`translate(${cx} ${cy})`}>
      {glow > 0 ? <circle r={R + 10} fill="none" stroke={BP.cyan} strokeWidth={10} opacity={glow * 0.3} /> : null}
      {centerLines ? (
        <g opacity={Math.min(1, p * 1.5)} stroke={BP.faint} strokeWidth={1.5} strokeDasharray={DASH.center}>
          <line x1={-ext} y1={0} x2={ext} y2={0} />
          <line x1={0} y1={-ext} x2={0} y2={ext} />
        </g>
      ) : null}
      <g transform={`rotate(${angle})`}>
        <Ink d={gearPath(R, teeth, R * 0.16)} p={p} color={glow > 0.5 ? BP.white : BP.line} width={2.5} fill={BP.wash} />
        <Ink d={circle(0, 0, R * 0.66)} p={p} color={BP.line2} width={1.6} />
        <Ink d={circle(0, 0, R * 0.2)} p={p} color={BP.line} width={2.5} />
        {holes.map((th) => (
          <Ink key={th} d={circle(Math.cos(th) * R * 0.43, Math.sin(th) * R * 0.43, R * 0.11)} p={p} color={BP.line2} width={1.6} />
        ))}
        <rect x={-R * 0.05} y={-R * 0.27} width={R * 0.1} height={R * 0.09} fill={BP.line2} opacity={p} />
      </g>
    </g>
  );
};

/** Stack-tube geometry, shared by the schematic and its frames. */
export type TubeBox = { x: number; w: number; top: number; bottom: number; slot: number };

/**
 * The call stack as a graduated cylinder: open rim on top, rounded foot, and
 * a tick for each frame's height up the right-hand side.
 */
export const Tube: React.FC<{ box: TubeBox; p: number; glow?: number; graduations?: number }> = ({
  box,
  p,
  glow = 0,
  graduations = 7,
}) => {
  if (p <= 0) return null;
  const { x, w, top, bottom, slot } = box;
  const r = 26;
  const walls = `M ${x} ${top} V ${bottom - r} Q ${x} ${bottom} ${x + r} ${bottom} H ${x + w - r} Q ${x + w} ${bottom} ${x + w} ${bottom - r} V ${top}`;
  const inner = `M ${x + 8} ${top + 10} V ${bottom - r} Q ${x + 8} ${bottom - 8} ${x + r} ${bottom - 8} H ${x + w - r} Q ${x + w - 8} ${bottom - 8} ${x + w - 8} ${bottom - r} V ${top + 10}`;
  const rim = `M ${x} ${top} A ${w / 2} 13 0 1 1 ${x + w} ${top} A ${w / 2} 13 0 1 1 ${x} ${top}`;
  return (
    <g>
      {glow > 0 ? <path d={walls} fill="none" stroke={BP.cyan} strokeWidth={12} opacity={glow * 0.3} /> : null}
      <Ink d={walls} p={p} color={glow > 0.5 ? BP.white : BP.line} width={3} />
      <Ink d={inner} p={p} color={BP.faint} width={1.5} />
      <Ink d={rim} p={p * 1.3 - 0.3} color={BP.line} width={2.5} />
      {Array.from({ length: graduations }, (_, i) => {
        const y = bottom - 10 - (i + 1) * slot;
        const show = Math.max(0, Math.min(1, p * 1.6 - 0.6 - i * 0.05));
        return show > 0 ? (
          <g key={i} opacity={show}>
            <line x1={x + w} y1={y} x2={x + w + 14} y2={y} stroke={BP.line2} strokeWidth={2} />
            <line x1={x + w} y1={y + slot / 2} x2={x + w + 7} y2={y + slot / 2} stroke={BP.faint} strokeWidth={1.5} />
            <text x={x + w + 20} y={y + 6} fontFamily={HAND} fontSize={16} fill={BP.line2}>
              {i + 1}
            </text>
          </g>
        ) : null;
      })}
    </g>
  );
};

/**
 * A queue as a conveyor lane in side elevation: a belt looped over two end
 * rollers with idlers between. `offset` is how far the belt has travelled, in
 * px, so the belt surface and every roller turn with whatever rides on it.
 */
export const Lane: React.FC<{ x0: number; x1: number; y: number; p: number; offset: number; glow?: number }> = ({
  x0,
  x1,
  y,
  p,
  offset,
  glow = 0,
}) => {
  if (p <= 0) return null;
  const hh = 18;
  const belt = `M ${x0 + hh} ${y - hh} H ${x1 - hh} A ${hh} ${hh} 0 0 1 ${x1 - hh} ${y + hh} H ${x0 + hh} A ${hh} ${hh} 0 0 1 ${x0 + hh} ${y - hh} Z`;
  const rollers = [x0 + hh, x1 - hh];
  const idlers: number[] = [];
  for (let x = x0 + hh + 58; x < x1 - hh - 40; x += 58) idlers.push(x);
  const spin = (rr: number) => (-offset / rr) * (180 / Math.PI);
  const show = Math.max(0, Math.min(1, p * 1.5 - 0.5));
  return (
    <g>
      {glow > 0 ? <path d={belt} fill="none" stroke={BP.cyan} strokeWidth={12} opacity={glow * 0.32} /> : null}
      <Ink d={belt} p={p} color={glow > 0.5 ? BP.white : BP.line} width={2.5} fill={BP.wash} />
      {/* The belt's surface, moving. */}
      <line
        x1={x0 + hh}
        y1={y - hh + 6}
        x2={x1 - hh}
        y2={y - hh + 6}
        stroke={BP.line2}
        strokeWidth={2}
        strokeDasharray="12 16"
        strokeDashoffset={offset}
        opacity={show * 0.7}
      />
      {rollers.map((rx) => (
        <g key={rx} transform={`translate(${rx} ${y}) rotate(${spin(hh - 5)})`} opacity={show}>
          <circle r={hh - 5} fill="none" stroke={BP.line2} strokeWidth={2} />
          <line x1={-(hh - 5)} y1={0} x2={hh - 5} y2={0} stroke={BP.line2} strokeWidth={1.5} />
          <circle r={3} fill={BP.line2} />
        </g>
      ))}
      {idlers.map((ix) => (
        <g key={ix} transform={`translate(${ix} ${y + 3}) rotate(${spin(7)})`} opacity={show}>
          <circle r={7} fill="none" stroke={BP.faint} strokeWidth={1.5} />
          <line x1={-7} y1={0} x2={7} y2={0} stroke={BP.faint} strokeWidth={1.5} />
        </g>
      ))}
    </g>
  );
};

export const FRAME_W = 192;
export const FRAME_H = 58;

/**
 * A stack frame or a callback card: the same drafted block, so a callback
 * that rides a queue is visibly the thing that later lands on the stack.
 */
export const Block: React.FC<{
  x: number;
  y: number;
  label: string;
  opacity: number;
  balloon?: number;
  active?: boolean;
  scale?: number;
  w?: number;
  h?: number;
  font?: number;
}> = ({ x, y, label, opacity, balloon, active = false, scale = 1, w = FRAME_W, h = FRAME_H, font = 21 }) =>
  opacity <= 0 ? null : (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        boxSizing: "border-box",
        border: `2.5px solid ${active ? BP.white : BP.line2}`,
        outline: `1.5px solid ${mix(active ? BP.cyan : BP.line2, active ? 70 : 35)}`,
        outlineOffset: -7,
        background: active ? mix(BP.cyan, 16, BP.paper) : mix(BP.line, 9, BP.paper),
        boxShadow: active ? `0 0 0 5px ${mix(BP.cyan, 22)}` : "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        paddingLeft: balloon ? 30 : 0,
        opacity,
        transform: `scale(${scale})`,
        fontFamily: MONO,
        fontSize: font,
        fontWeight: 600,
        fontVariantLigatures: "none",
        color: active ? BP.white : BP.line,
        whiteSpace: "nowrap",
      }}
    >
      {balloon ? (
        <span
          style={{
            position: "absolute",
            left: 9,
            top: (h - 30) / 2 - 2.5,
            width: 30,
            height: 30,
            borderRadius: 999,
            border: `2px solid ${BP.mark}`,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: HAND,
            fontSize: 18,
            fontWeight: 400,
            color: BP.mark,
          }}
        >
          {balloon}
        </span>
      ) : null}
      {label}
    </div>
  );
