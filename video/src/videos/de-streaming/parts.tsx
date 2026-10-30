import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { ACCENT, HAIRLINE, INK, INK_SOFT, PAPER, TABULAR, label } from "../../editorial/style";
import { ds, inkOf } from "../../theme/brand";
import { ILLUSTRATIONS, type User, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit and the interview
 * kit (editorial/interview.tsx). The page furniture (the slow push, kicker
 * and two-ink headline, highlighter and strike, elbow arrows) comes from the
 * Data Analyst pandas part, as the Data Scientist parts take it, and the
 * bracket from its statistics part, so the series stays one family. What is
 * new here is the stream: a message as a cell in its user's hue, a
 * partition as a lane of cells, a consumer as a box, and a crash.
 */
export {
  Drift,
  ElbowArrow,
  Headline,
  Kicker,
  Mark,
  MARK_BAD,
  MARK_OK,
  OK,
  OK_INK,
  pulse,
  Strike,
  Svg,
  X0,
} from "../da-pandas/parts";
export { Bracket } from "../da-statistics-communication/parts";

/**
 * The four users of the video's own stream. Each is a category, not a
 * meaning, so each takes one of the hues the brand keeps for telling
 * categories apart (blue for data, then teal, purple and orange); red and
 * green stay free for the trap and the right answer.
 */
export const USER_COLOR: Record<User, string> = {
  ava: ds("blue", 500),
  ben: ds("teal", 500),
  cam: ds("purple", 500),
  dee: ds("orange", 500),
};
export const USER_INK: Record<User, string> = {
  ava: inkOf.blue,
  ben: inkOf.teal,
  cam: inkOf.purple,
  dee: inkOf.orange,
};
/** A user's pale fill, for a cell that carries its offset in the user's ink. */
export const userFill = (u: User, share = 18) => `color-mix(in srgb, ${USER_COLOR[u]} ${share}%, ${PAPER})`;

/** Lanes and boxes that are furniture rather than data. */
export const LANE_FILL = ds("gray", 50);
export const LANE_LINE = ds("gray", 300);
export const QUIET = ds("gray", 400);

/**
 * One message: a cell in its user's hue with its offset (or any label)
 * inside, at page position (x, y). `ring` outlines it in a meaning's color:
 * red for a message lost or doubled, green for the right outcome, yellow
 * for the one the narration names.
 */
export const Cell: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  user?: User;
  /** Grey, for a message that belongs to no user in particular. */
  plain?: boolean;
  opacity?: number;
  scale?: number;
  ring?: string;
  ringP?: number;
  size?: number;
  children?: React.ReactNode;
}> = ({ x, y, w, h, user, plain = false, opacity = 1, scale = 1, ring, ringP = 1, size = 24, children }) => {
  if (opacity <= 0.001) return null;
  const stroke = user && !plain ? USER_COLOR[user] : INK_SOFT;
  const ink = user && !plain ? USER_INK[user] : INK;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        boxSizing: "border-box",
        borderRadius: 8,
        border: `2.5px solid ${stroke}`,
        background: user && !plain ? userFill(user) : PAPER,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...label(size, ink),
        fontWeight: 750,
        ...TABULAR,
        opacity,
        transform: scale === 1 ? undefined : `scale(${scale})`,
        boxShadow: ring && ringP > 0 ? `0 0 0 ${4 * ringP}px ${ring}` : undefined,
      }}
    >
      {children}
    </div>
  );
};

/** A partition's lane: a pale strip the cells sit in, its name above it. */
export const Lane: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  name: React.ReactNode;
  at: number;
  out?: number;
  dashed?: boolean;
  nameInk?: string;
}> = ({ x, y, w, h, name, at, out, dashed = false, nameInk = INK_SOFT }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: w * p,
          height: h,
          boxSizing: "border-box",
          borderRadius: 10,
          border: `1.5px ${dashed ? "dashed" : "solid"} ${LANE_LINE}`,
          background: dashed ? PAPER : LANE_FILL,
          opacity: 1 - o,
        }}
      />
      <div style={{ position: "absolute", left: x + 2, top: y - 32, ...label(20, nameInk), fontWeight: 700, whiteSpace: "nowrap", opacity: p * (1 - o) }}>
        {name}
      </div>
    </>
  );
};

/** A consumer, producer or any other process: a box with its name. */
export const Box: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  at: number;
  out?: number;
  dim?: number;
  color?: string;
  fill?: string;
  dashed?: boolean;
  size?: number;
  ink?: string;
  children: React.ReactNode;
}> = ({ x, y, w, h, at, out, dim, color = INK, fill = PAPER, dashed = false, size = 22, ink = INK, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.62;
  if (p <= 0.001 || o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        boxSizing: "border-box",
        borderRadius: 10,
        border: `2.5px ${dashed ? "dashed" : "solid"} ${color}`,
        background: fill,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        ...label(size, ink),
        fontWeight: 700,
        lineHeight: 1.2,
        opacity: Math.min(1, p) * (1 - o) * (1 - d),
        transform: `scale(${0.85 + 0.15 * Math.min(1, p)})`,
      }}
    >
      {children}
    </div>
  );
};

/** A crash: a red cross that pops in on `at`, centred on (x, y). */
export const Crash: React.FC<{ x: number; y: number; at: number; out?: number; size?: number }> = ({ x, y, at, out, size = 30 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0.001 || o >= 1) return null;
  const r = (size / 2) * Math.min(1.15, p);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - o }}>
      <circle cx={x} cy={y} r={r + 8} fill={PAPER} />
      <path d={`M${x - r},${y - r} L${x + r},${y + r} M${x + r},${y - r} L${x - r},${y + r}`} stroke={ACCENT} strokeWidth={5} strokeLinecap="round" />
    </svg>
  );
};

/** A marker between two cells: a vertical bar with a label under it. */
export const Marker: React.FC<{
  x: number;
  top: number;
  bottom: number;
  at: number;
  out?: number;
  color?: string;
  dash?: string;
  children?: React.ReactNode;
  /** Where the label sits: under the bar (default) or over it. */
  labelAt?: "below" | "above";
  ink?: string;
}> = ({ x, top, bottom, at, out, color = INK, dash, children, labelAt = "below", ink = INK }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - o }}>
        <line x1={x} x2={x} y1={top} y2={top + (bottom - top) * p} stroke={color} strokeWidth={4} strokeDasharray={dash} strokeLinecap="round" />
      </svg>
      {children ? (
        <div
          style={{
            position: "absolute",
            left: x - 200,
            width: 400,
            top: labelAt === "below" ? bottom + 8 : top - 34,
            textAlign: "center",
            ...label(20, ink),
            fontWeight: 700,
            whiteSpace: "nowrap",
            opacity: ease(frame, at + 6, 10) * (1 - o),
          }}
        >
          {children}
        </div>
      ) : null}
    </>
  );
};

/** The four users, each a swatch and a name, on one line from (x, y). */
export const Legend: React.FC<{ x: number; y: number; at: number; out?: number; users?: readonly User[]; note?: React.ReactNode }> = ({
  x,
  y,
  at,
  out,
  users = ["ava", "ben", "cam", "dee"],
  note,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "center", gap: 18, opacity: p * (1 - o), whiteSpace: "nowrap" }}>
      {users.map((u) => (
        <span key={u} style={{ display: "inline-flex", alignItems: "center", gap: 7, ...label(20, USER_INK[u]), fontWeight: 700 }}>
          <span style={{ width: 16, height: 16, borderRadius: 4, background: userFill(u, 40), border: `2px solid ${USER_COLOR[u]}` }} />
          {u}
        </span>
      ))}
      {note ? <span style={{ ...label(20, INK_SOFT), fontWeight: 600 }}>{note}</span> : null}
    </div>
  );
};

/** A thin rule across a span, for a section of a figure. */
export const Rule: React.FC<{ x: number; y: number; w: number; at: number; out?: number }> = ({ x, y, w, at, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return <div style={{ position: "absolute", left: x, top: y, width: w * p, height: 1, background: HAIRLINE, opacity: 1 - o }} />;
};

/** The watercolor hero from illustrations.json: it pops in on `at`, bobs
 *  gently, and fades on `out`. */
export const Spot: React.FC<{
  id: string;
  at: number;
  out?: number;
  dim?: number;
  left: number;
  top: number;
  width: number;
  height: number;
}> = ({ id, at, out, dim, left, top, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 20) * 0.6;
  if (!ILLUSTRATIONS || p <= 0.001 || o >= 1) return null;
  return (
    <Illustration
      video={VIDEO}
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

/** A word inside running text, in a hue's ink. */
export const Hue: React.FC<{ color: string; children: React.ReactNode; weight?: number }> = ({ color, children, weight = 700 }) => (
  <span style={{ color, fontWeight: weight }}>{children}</span>
);
