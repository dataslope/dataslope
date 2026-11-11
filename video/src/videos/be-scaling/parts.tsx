import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, lineLength, roundedPolyline, type Pt } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, drift, ease, pop } from "../../components/motion";
import { OK, OK_INK } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, headline, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit and the interview
 * kit (editorial/interview.tsx). The headings, the drift and the highlighter
 * are da-pandas's (parts.tsx there, whose Mark already takes its bleed back
 * as margin); the boxes, arrows and pills are de-pipelines'. What is local:
 * the shortener's diagram as a small map that grows question by question
 * (`MiniMap`), and the spot illustrations with their natural sizes.
 */
export { OK, OK_INK };

// ── Page geometry, in the layout's coordinates (pass y through `y()`) ────────

export const X0 = 120;
/** The page's right margin. */
export const RIGHT = 1824;
export const KICKER_Y = 112;
export const HEAD_Y = 150;
/** A deep dive's question wraps within this, clear of the map at the right. */
export const Q_W = 1230;
export const Q_SIZE = 56;

// ── Colors: inkOf (theme/brand.ts) and the editorial palette only ────────────

export const MARK = HIGHLIGHT;
export const MARK_BAD = `color-mix(in srgb, ${ACCENT} 26%, transparent)`;
export const MARK_OK = `color-mix(in srgb, ${OK} 24%, transparent)`;
/** A server's color, one per server: three blues for the first three and the
 *  accent purple for the one added (non-semantic, telling servers apart). */
export const SERVER = [ds("blue", 300), ds("blue", 500), ds("blue", 800), ds("purple", 500)] as const;
export const NEW_SERVER_INK = ds("purple", 500);

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 0 → 1 → 0 over `dur` frames from `at`: a swell for a mark named again. */
export const pulse = (frame: number, at: number, dur = 18) => {
  const t = (frame - at) / dur;
  return t <= 0 || t >= 1 ? 0 : Math.sin(t * Math.PI) ** 2;
};

/** "34,722" → "35,000": a number rounded to its first `digits` figures. */
export const roundTo = (v: number, digits = 2) => {
  const p = 10 ** (Math.floor(Math.log10(Math.abs(v))) - digits + 1);
  return Math.round(v / p) * p;
};
export const commas = (v: number) => v.toLocaleString("en-US");
export const pct = (v: number) => `${Math.round(v * 100)}%`;

export const Svg: React.FC<{ opacity?: number; children: React.ReactNode }> = ({ opacity = 1, children }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
    {children}
  </svg>
);

/**
 * A slow push on a finished figure: the whole scene grows a few percent
 * larger over its life, from `from` to `to` (drift() in components/motion.ts).
 */
export const Drift: React.FC<{
  from: number;
  to: number;
  scale?: number;
  origin?: string;
  children: React.ReactNode;
}> = ({ from, to, scale = 0.02, origin = "50% 45%", children }) => {
  const frame = useCurrentFrame();
  const s = 1 + scale * drift(frame, from, to);
  return <div style={{ position: "absolute", inset: 0, transform: `scale(${s})`, transformOrigin: origin }}>{children}</div>;
};

// ── Headings ─────────────────────────────────────────────────────────────────

/** A part's kicker, top left, in sentence case. */
export const Kicker: React.FC<{ at: number; out?: number; children: React.ReactNode }> = ({ at, out, children }) => {
  const { y } = useLayout();
  return (
    <Ink at={at} dur={14} out={out} style={{ left: 96, top: y(KICKER_Y), whiteSpace: "nowrap" }}>
      <span style={label(26, ACCENT_INK)}>{children}</span>
    </Ink>
  );
};

/** A headline in two inks on one line: the lead in roman, the turn in italic
 *  accent ink, each following the other in the flow. */
export const Headline: React.FC<{
  lead: string;
  turn?: string;
  at: number;
  turnAt?: number;
  out?: number;
  size?: number;
  top?: number;
}> = ({ lead, turn, at, turnAt, out, size = 66, top = HEAD_Y }) => {
  const { y } = useLayout();
  return (
    <div style={{ position: "absolute", left: 92, top: y(top), display: "flex", gap: "0.26em", ...headline(size) }}>
      <Ink at={at} dur={20} out={out} style={{ position: "relative", whiteSpace: "nowrap" }}>
        {lead}
      </Ink>
      {turn ? (
        <Ink at={turnAt ?? at + 10} dur={18} out={out} style={{ position: "relative", ...headline(size, true), color: INK, whiteSpace: "nowrap" }}>
          {turn}
        </Ink>
      ) : null}
    </div>
  );
};

/**
 * A highlighter stroke laid under the words it wraps, swept left to right on
 * `at` (da-pandas/parts.tsx). It reaches 0.14em past the words on each side
 * and takes that back as margin, so a neighbour keeps a full space.
 */
export const Mark: React.FC<{ at: number; out?: number; dur?: number; color?: string; children: React.ReactNode }> = ({
  at,
  out,
  dur = 12,
  color = HIGHLIGHT,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 14);
  return (
    <span style={{ position: "relative", display: "inline-block", margin: "0 0.14em" }}>
      <span
        style={{
          position: "absolute",
          left: "-0.14em",
          top: "0.04em",
          bottom: "-0.06em",
          width: `calc((100% + 0.28em) * ${p})`,
          background: color,
          borderRadius: "0.14em",
          opacity: p > 0 ? 1 - o : 0,
        }}
      />
      <span style={{ position: "relative" }}>{children}</span>
    </span>
  );
};

// ── Boxes and arrows ─────────────────────────────────────────────────────────

/** What a box is: data (blue), the right answer (green), the trap (red), what
 *  the narration points at (yellow), or plain ink (a process, a machine). */
export type Tone = "data" | "ok" | "bad" | "lit" | "plain";
const TONE: Record<Tone, { line: string; fill: string; ink: string }> = {
  data: { line: BAR, fill: `color-mix(in srgb, ${BAR} 10%, ${PAPER})`, ink: BLUE_INK },
  ok: { line: OK, fill: `color-mix(in srgb, ${OK} 12%, ${PAPER})`, ink: OK_INK },
  bad: { line: ACCENT, fill: `color-mix(in srgb, ${ACCENT} 10%, ${PAPER})`, ink: ACCENT_INK },
  lit: { line: INK, fill: HIGHLIGHT, ink: INK },
  plain: { line: INK, fill: PAPER, ink: INK },
};
export const toneInk = (t: Tone) => TONE[t].ink;
export const toneLine = (t: Tone) => TONE[t].line;
export const toneFill = (t: Tone) => TONE[t].fill;

/**
 * A rounded box that pops in on `at`, with a title and an optional line under
 * it. `tone` may change over time (pass the tone for the current frame);
 * `lit` swells its border, for a box the narration names again.
 */
export const Node: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  at: number;
  title?: React.ReactNode;
  sub?: React.ReactNode;
  tone?: Tone;
  fill?: string;
  size?: number;
  subSize?: number;
  dim?: number;
  out?: number;
  lit?: number;
  dashed?: boolean;
  opacity?: number;
  children?: React.ReactNode;
}> = ({ x, y, w, h, at, title, sub, tone = "data", fill, size = 24, subSize = 20, dim, out, lit = 0, dashed, opacity = 1, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.65;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0.001 || o >= 1) return null;
  const t = TONE[tone];
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        boxSizing: "border-box",
        border: `${2.5 + 2 * lit}px ${dashed ? "dashed" : "solid"} ${t.line}`,
        borderRadius: 8,
        background: fill ?? t.fill,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        padding: "0 12px",
        opacity: Math.min(1, p) * (1 - d) * (1 - o) * opacity,
        transform: `scale(${0.9 + 0.1 * Math.min(1, p)})`,
        transformOrigin: "50% 50%",
      }}
    >
      {title ? <span style={{ ...label(size, t.ink), fontWeight: 500, whiteSpace: "nowrap", textAlign: "center" }}>{title}</span> : null}
      {sub ? <span style={{ ...note(subSize, INK_SOFT), whiteSpace: "nowrap", textAlign: "center" }}>{sub}</span> : null}
      {children}
    </div>
  );
};

/**
 * An arrow along `points` (straight segments, corners rounded), drawn from its
 * tail on `at`, its head built by arrowHead() on the straight last stretch.
 * `head={0}` draws a plain line.
 */
export const Flow: React.FC<{
  points: readonly Pt[];
  at: number;
  dur?: number;
  color?: string;
  width?: number;
  head?: number;
  dash?: string;
  dim?: number;
  out?: number;
  opacity?: number;
  /** A highlighter band laid under the line, 0 to 1: the narration points at it. */
  glow?: number;
}> = ({ points, at, dur = 14, color = INK, width = 2.6, head = 15, dash, dim, out, opacity = 1, glow = 0 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.65;
  if (p <= 0 || o >= 1) return null;
  const { d: path, samples } =
    points.length > 2 ? roundedPolyline(points, 18) : { d: `M${points[0][0]},${points[0][1]} L${points[1][0]},${points[1][1]}`, samples: [...points] };
  const line: Pt[] =
    samples.length > 2
      ? samples
      : Array.from({ length: 41 }, (_, i) => [points[0][0] + ((points[1][0] - points[0][0]) * i) / 40, points[0][1] + ((points[1][1] - points[0][1]) * i) / 40] as Pt);
  const len = lineLength(line);
  const reach = head > 0 ? Math.max(0, (len - head + 1) / len) : 1;
  const [sx, sy] = points[0];
  const [tx, ty] = points[points.length - 1];
  const across = Math.abs(tx - sx) >= Math.abs(ty - sy);
  const hide = `${(1 - p) * 100}%`;
  const clip = across
    ? tx >= sx
      ? `inset(-40px ${hide} -40px -40px)`
      : `inset(-40px -40px -40px ${hide})`
    : ty >= sy
      ? `inset(-40px -40px ${hide} -40px)`
      : `inset(${hide} -40px -40px -40px)`;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) * opacity }}>
      {glow > 0 ? <path d={path} fill="none" stroke={HIGHLIGHT} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" opacity={glow} /> : null}
      {dash ? (
        <g style={{ clipPath: clip }}>
          <path d={path} fill="none" stroke={color} strokeWidth={width} strokeDasharray={dash} />
        </g>
      ) : (
        <path d={path} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${p * reach} 1`} />
      )}
      {head > 0 ? <path d={arrowHead(line, head, head * 0.53, { filled: true })} fill={color} opacity={ease(frame, at + dur - 4, 5)} /> : null}
    </svg>
  );
};

/** A small rounded label on the page, in its tone's ink, that inks in. */
export const Pill: React.FC<{
  x: number;
  y: number;
  at: number;
  tone?: Tone;
  size?: number;
  out?: number;
  dim?: number;
  solid?: boolean;
  children: React.ReactNode;
}> = ({ x, y, at, tone = "data", size = 22, out, dim, solid, children }) => {
  const frame = useCurrentFrame();
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.65;
  const t = TONE[tone];
  return (
    <Ink at={at} dur={12} out={out} style={{ left: x, top: y, opacity: 1 - d }}>
      <span
        style={{
          display: "inline-block",
          padding: "5px 14px 6px",
          borderRadius: 8,
          border: `2px solid ${t.line}`,
          background: solid ? t.line : t.fill,
          ...label(size, solid ? PAPER : t.ink),
          fontWeight: 500,
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </span>
    </Ink>
  );
};

/** A line of text that inks in at `at` and fades on `out`: the page's notes. */
export const Line: React.FC<{
  at: number;
  x: number;
  y: number;
  out?: number;
  dim?: number;
  size?: number;
  color?: string;
  weight?: number;
  align?: "left" | "right" | "center";
  width?: number;
  children: React.ReactNode;
}> = ({ at, x, y, out, dim, size = 24, color = INK, weight = 500, align = "left", width, children }) => {
  const frame = useCurrentFrame();
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.65;
  const left = align === "left" ? x : align === "right" ? x - (width ?? 0) : x - (width ?? 0) / 2;
  return (
    <Ink at={at} dur={14} out={out} style={{ left, top: y, width, textAlign: align, opacity: 1 - d }}>
      <span style={{ ...note(size, color), fontWeight: weight, whiteSpace: "nowrap", fontSize: size }}>{children}</span>
    </Ink>
  );
};

// ── Spot illustrations ───────────────────────────────────────────────────────

/** Each watercolor's natural size in pixels, after the import's trim. At 4K
 *  an image may be drawn at most half that on the 1080p layout. */
export const SPOTS = {
  bison: [1268, 1021],
  conveyor: [1024, 653],
  crack: [314, 1024],
  newspaper: [1024, 830],
  timer: [867, 1003],
} as const satisfies Record<string, readonly [number, number]>;
export type SpotId = keyof typeof SPOTS;

/** A spot's drawn height at width `w`, from its natural aspect. */
export const spotH = (id: SpotId, w: number) => Math.round((w * SPOTS[id][1]) / SPOTS[id][0]);

/**
 * A watercolor from illustrations.json, `w` wide at (x, y): it pops in on
 * `at` (with an `el-pop` cued by the scene on the same frame), bobs gently,
 * and fades on `out`.
 */
export const Spot: React.FC<{ id: SpotId; at: number; out?: number; x: number; y: number; w: number; phase?: number }> = ({
  id,
  at,
  out,
  x,
  y,
  w,
  phase = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  if (!ILLUSTRATIONS || p <= 0.001 || o >= 1) return null;
  return (
    <Illustration
      video={VIDEO}
      id={`${VIDEO}-${id}`}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: spotH(id, w),
        opacity: Math.min(1, p) * (1 - o),
        transform: `translateY(${bob(frame + phase, 4, 100) + (1 - p) * 24}px) scale(${0.85 + 0.15 * Math.min(1, p)})`,
      }}
    />
  );
};

// ── The shortener, as a small map that grows question by question ────────────

export type MapPart = "client" | "lb" | "app" | "cache" | "store" | "queue" | "limit";
const MAP_LABEL: Record<MapPart, string> = {
  client: "client",
  lb: "load balancer",
  app: "app servers",
  cache: "cache",
  store: "store",
  queue: "queue",
  limit: "rate limiter",
};
export const MAP = { x: 1384, w: 440, h: 150 };

/**
 * The shortener's diagram (client, load balancer, app servers, cache, store),
 * drawn small in the top right of every deep dive, with the part the question
 * is about lit yellow and named under the map. It grows as the questions add
 * to the design: `stage` is the last question whose change is already in
 * (1: more app servers, 3: a cache replica, 5: followers, 6: eight shards, 8: a
 * queue, 9: a rate limiter), and `grow` names a change this scene makes, with
 * the frame it happens on.
 */
export const MiniMap: React.FC<{
  at: number;
  stage: number;
  /** The lit part, or a list of parts, each lit from its frame. */
  lit: MapPart | readonly (readonly [MapPart, number])[];
  grow?: Partial<Record<"apps" | "replica" | "followers" | "shards" | "queue" | "limit", number>>;
  out?: number;
}> = ({ at, stage, lit, grow = {}, out }) => {
  const frame = useCurrentFrame();
  const { y } = useLayout();
  const p = ease(frame, at, 16);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const ox = MAP.x;
  const oy = y(KICKER_Y) - 6;
  // How far each change is in: 1 once its question is behind us, else eased
  // from the frame this scene makes it on.
  const has = (feature: keyof NonNullable<typeof grow>, since: number) =>
    stage >= since ? 1 : grow[feature] !== undefined ? ease(frame, grow[feature] as number, 16) : 0;
  const apps = has("apps", 1);
  const replica = has("replica", 3);
  const followers = has("followers", 5);
  const shards = has("shards", 6);
  const queue = has("queue", 8);
  const limit = has("limit", 9);
  const litList = typeof lit === "string" ? [[lit, -1e6] as const] : lit;
  const glow = (part: MapPart) => {
    let v = 0;
    litList.forEach(([q, from], i) => {
      const until = litList[i + 1]?.[1] ?? 1e9;
      if (q === part) v = Math.max(v, Math.min(ease(frame, from, 10), 1 - ease(frame, until, 10)));
    });
    return v;
  };
  const current = [...litList].reverse().find(([, from]) => frame >= from - 4)?.[0] ?? litList[0][0];
  const fillOf = (part: MapPart) => `color-mix(in srgb, ${HIGHLIGHT} ${glow(part) * 100}%, ${PAPER})`;
  const stroke = (part: MapPart) => (glow(part) > 0.5 ? INK : INK_SOFT);
  // The app tier: two boxes, then four, moving into place as the others fade in.
  const appBoxes = [0, 1, 2, 3].map((i) => {
    const two = [
      [30, 34],
      [86, 34],
    ][Math.min(i, 1)];
    const four = [14 + i * 32, 26];
    return { y: lerp(two[0], four[0], apps), h: lerp(two[1], four[1], apps), o: i < 2 ? 1 : apps };
  });
  const lb = { x: 42, y: 55, w: 56, h: 40 };
  const app = { x: 140, w: 72 };
  const cache = { x: 300, y: 16, w: 84, h: 42 };
  const store = { x: 300, y: 88, w: 84, h: 48 };
  const q = { x: 238, y: 104, w: 36, h: 28 };
  const edge = { stroke: INK_SOFT, strokeWidth: 1.4, opacity: 0.55 };
  const box = (part: MapPart) => ({ fill: fillOf(part), stroke: stroke(part), strokeWidth: 1.8 + glow(part) * 0.6 });
  const labelX = {
    client: 14,
    lb: lb.x + lb.w / 2,
    app: app.x + app.w / 2,
    cache: cache.x + cache.w / 2,
    store: store.x + store.w / 2,
    queue: q.x + q.w / 2,
    limit: 24,
  }[current];
  return (
    <div style={{ position: "absolute", left: ox, top: oy, width: MAP.w, height: MAP.h + 40, opacity: p * (1 - o) }}>
      <svg width={MAP.w} height={MAP.h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        {/* Edges first, so the boxes sit on them. */}
        <line x1={24} y1={75} x2={lb.x} y2={75} {...edge} />
        {appBoxes.map((b, i) => (
          <g key={i} opacity={b.o}>
            <line x1={lb.x + lb.w} y1={75} x2={app.x} y2={b.y + b.h / 2} {...edge} />
            <line x1={app.x + app.w} y1={b.y + b.h / 2} x2={cache.x} y2={cache.y + cache.h / 2} {...edge} />
            <line x1={app.x + app.w} y1={b.y + b.h / 2} x2={queue > 0.5 ? q.x : store.x} y2={queue > 0.5 ? q.y + q.h / 2 : store.y + store.h / 2} {...edge} />
          </g>
        ))}
        {queue > 0 ? <line x1={q.x + q.w} y1={q.y + q.h / 2} x2={store.x} y2={store.y + store.h / 2} {...edge} opacity={0.55 * queue} /> : null}
        {/* The client. */}
        <circle cx={14} cy={75} r={10} fill={fillOf("client")} stroke={stroke("client")} strokeWidth={1.8} />
        {/* A rate limiter: a gate in front of the load balancer. */}
        {limit > 0 ? (
          <rect x={28} y={58} width={8} height={34} rx={2} fill={glow("limit") > 0.5 ? HIGHLIGHT : INK_SOFT} stroke={stroke("limit")} strokeWidth={1.4} opacity={limit} />
        ) : null}
        <rect x={lb.x} y={lb.y} width={lb.w} height={lb.h} rx={5} {...box("lb")} />
        {appBoxes.map((b, i) => (
          <rect key={i} x={app.x} y={b.y} width={app.w} height={b.h} rx={4} {...box("app")} opacity={b.o} />
        ))}
        {queue > 0 ? (
          <g opacity={queue}>
            <rect x={q.x} y={q.y} width={q.w} height={q.h} rx={5} {...box("queue")} />
            {[0, 1, 2].map((k) => (
              <line key={k} x1={q.x + 9 + k * 9} x2={q.x + 9 + k * 9} y1={q.y + 7} y2={q.y + q.h - 7} stroke={stroke("queue")} strokeWidth={1.4} />
            ))}
          </g>
        ) : null}
        {/* The cache, with its replica behind it. */}
        {replica > 0 ? <rect x={cache.x + 10} y={cache.y + 9} width={cache.w} height={cache.h} rx={5} {...box("cache")} opacity={replica} /> : null}
        <rect x={cache.x} y={cache.y} width={cache.w} height={cache.h} rx={5} {...box("cache")} />
        {/* The store: one box, then the eight shards of question 6, with two
            followers beside it. */}
        {Array.from({ length: 8 }, (_, k) => {
          const w = lerp(store.w, (store.w - 7 * 2) / 8, shards);
          const x = lerp(store.x, store.x + k * ((store.w - 7 * 2) / 8 + 2), shards);
          return <rect key={k} x={x} y={store.y} width={w} height={store.h} rx={lerp(4, 2, shards)} {...box("store")} opacity={k === 0 ? 1 : shards} />;
        })}
        {followers > 0
          ? [0, 1].map((k) => (
              <g key={k} opacity={followers}>
                <line x1={store.x + store.w} y1={store.y + store.h / 2} x2={store.x + store.w + 14} y2={store.y + 12 + k * 26} {...edge} />
                <rect x={store.x + store.w + 14} y={store.y + 2 + k * 26} width={34} height={20} rx={4} {...box("store")} />
              </g>
            ))
          : null}
      </svg>
      <div
        style={{
          position: "absolute",
          top: MAP.h + 8,
          left: Math.min(MAP.w - 180, Math.max(0, labelX - 90)),
          width: 180,
          textAlign: "center",
          ...label(19, INK),
          fontWeight: 500,
          whiteSpace: "nowrap",
        }}
      >
        {MAP_LABEL[current]}
      </div>
    </div>
  );
};

// ── Steps in a row: plain text joined by arrows, never boxed ─────────────────

export type Step = {
  text: React.ReactNode;
  /** When the step inks in. */
  at: number;
  /** A highlight behind it while the narration is on it. */
  lit?: readonly [number, number];
  color?: string;
  weight?: number;
};

/**
 * A process as words in a row joined by arrows ("check the cache → miss →
 * …"): each step inks in on its cue and is highlighted while it is read. The
 * house has no cards (README, "No cards unless the layout needs one"), so the
 * steps are plain text, grouped by the row itself.
 */
export const StepRow: React.FC<{ x: number; y: number; steps: readonly Step[]; size?: number; dim?: number; out?: number }> = ({
  x,
  y,
  steps,
  size = 24,
  dim,
  out,
}) => {
  const frame = useCurrentFrame();
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.65;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (o >= 1) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "baseline", gap: "0.5em", fontSize: size, whiteSpace: "nowrap", opacity: (1 - d) * (1 - o) }}>
      {steps.map((s, i) => {
        const p = ease(frame, s.at, 12);
        const lit = s.lit ? Math.min(ease(frame, s.lit[0], 8), 1 - ease(frame, s.lit[1], 10)) : 0;
        return (
          <React.Fragment key={i}>
            {i > 0 ? <span style={{ ...note(size, INK_SOFT), opacity: p }}>→</span> : null}
            <span style={{ ...note(size, s.color ?? INK), fontWeight: s.weight ?? 500, opacity: p, position: "relative", display: "inline-block", margin: "0 0.14em" }}>
              <span
                style={{
                  position: "absolute",
                  left: "-0.14em",
                  right: "-0.14em",
                  top: "0.04em",
                  bottom: "-0.06em",
                  background: HIGHLIGHT,
                  borderRadius: "0.14em",
                  opacity: lit,
                }}
              />
              <span style={{ position: "relative" }}>{s.text}</span>
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
};

/**
 * The subtle separator between columns laid side by side: a 1px hairline,
 * centred in the gap, the height of the columns' content, inking in with the
 * column to its right (README, "No cards unless the layout needs one").
 */
export const VRule: React.FC<{ x: number; top: number; bottom: number; at: number; out?: number }> = ({ x, top, bottom, at, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: Math.round(x),
        top,
        width: 1,
        height: (bottom - top) * p,
        background: HAIRLINE,
        opacity: 1 - o,
      }}
    />
  );
};
