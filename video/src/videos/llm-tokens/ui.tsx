import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { during, ease, map, pop } from "../../components/motion";
import { ds, type Hue } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { DISPLAY } from "./fonts";
import {
  CONTENT_W,
  fringe,
  glowBox,
  glowText,
  H,
  mix,
  neon,
  NIGHT,
  NIGHT_TOP,
  rimLight,
  SIDE,
  TOP,
  W,
} from "./theme";

export const VIDEO = "llm-tokens";

// ── Motion vocabulary ────────────────────────────────────────────────────────

/** Deterministic noise in [0, 1) from two integers. */
export const hash = (a: number, b = 0) => {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Neon power-on: dark before `at`, a few stutters, then lit. */
const STUTTER = [0.85, 0.12, 0.7, 0.2, 1, 0.5, 1];
export const flicker = (frame: number, at: number) => {
  if (frame < at) return 0;
  const i = frame - at;
  return i < STUTTER.length ? STUTTER[i] : 1;
};

/** A glitch burst: 0..1 jitter for `duration` frames from `at`, decaying,
 *  with a few frames dropped to zero so it stutters rather than shakes. */
export const glitch = (frame: number, at: number, duration = 10) => {
  if (frame < at || frame >= at + duration) return 0;
  const decay = 1 - (frame - at) / duration;
  return hash(frame, at) > 0.28 ? decay : 0;
};

/** Stop-motion time: the clay moves on threes, the neon moves every frame. */
export const onThrees = (frame: number) => Math.floor(frame / 3) * 3;

/** A terminal cursor's blink, about twice a second at 30 fps. */
export const blinkOn = (frame: number) => Math.floor(frame / 8) % 2 === 0;

/** Digits that scramble for a few frames before they settle on `value`. */
export const scramble = (value: string, frame: number, at: number, frames = 9) => {
  if (frame >= at + frames) return value;
  return [...value]
    .map((c, i) => (/[0-9]/.test(c) ? String(Math.floor(hash(frame, i + at) * 10)) : c))
    .join("");
};

// ── Backdrop: the night, its grid floor, and the CRT over everything ────────

const HORIZON = 1270;

/** Deep blue sky, a faint perspective grid floor scrolling toward the viewer,
 *  and a soft bloom on the horizon. Sits under every scene. */
export const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const vx = W / 2;
  const rows = 12;
  const phase = (frame / 40) % 1;
  const horizontals = Array.from({ length: rows }, (_, i) => {
    const z = (i + phase) / rows;
    return { y: HORIZON + (H - HORIZON) * z * z, o: 0.25 + 0.75 * z };
  });
  const verticals = Array.from({ length: 23 }, (_, i) => i - 11);
  const tube = ds("purple", 400);
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(180deg, ${NIGHT_TOP} 0%, ${mix(NIGHT_TOP, 45, NIGHT)} 34%, ${NIGHT} 62%, ${NIGHT} 100%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 70% 32% at 50% ${HORIZON}px, ${mix(ds("purple", 600), 26)} 0%, transparent 70%)`,
        }}
      />
      <svg
        width={W}
        height={H}
        style={{ position: "absolute", inset: 0, opacity: 0.5 }}
      >
        {verticals.map((j) => (
          <line
            key={j}
            x1={vx}
            y1={HORIZON}
            x2={vx + j * 230}
            y2={H}
            stroke={mix(tube, 60)}
            strokeWidth={2}
          />
        ))}
        {horizontals.map((l, i) => (
          <line
            key={i}
            x1={0}
            y1={l.y}
            x2={W}
            y2={l.y}
            stroke={mix(tube, Math.round(70 * l.o))}
            strokeWidth={2}
          />
        ))}
      </svg>
      {/* Far lines melt into the horizon. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: HORIZON - 2,
          width: W,
          height: 220,
          background: `linear-gradient(180deg, ${NIGHT} 0%, transparent 100%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: HORIZON - 1,
          width: W,
          height: 3,
          background: mix(ds("purple", 300), 70),
          boxShadow: `0 0 18px ${mix(ds("purple", 400), 70)}, 0 0 50px ${mix(ds("blue", 400), 40)}`,
        }}
      />
    </>
  );
};

/** Scanlines and a vignette over the whole picture, under the captions. */
export const Crt: React.FC = () => {
  const frame = useCurrentFrame();
  // A slow roll bar, the way a CRT filmed on camera drifts.
  const roll = ((frame * 6) % (H + 400)) - 200;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `repeating-linear-gradient(180deg, ${mix(NIGHT, 26)} 0px, ${mix(NIGHT, 26)} 2px, transparent 2px, transparent 5px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: roll,
          width: W,
          height: 200,
          background: `linear-gradient(180deg, transparent, ${mix(ds("blue", 300), 4)}, transparent)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 85% 70% at 50% 45%, transparent 60%, ${mix(NIGHT, 75)} 100%)`,
        }}
      />
    </div>
  );
};

/** A cut between scenes: a few frames of torn neon scan bars. */
export const GlitchCut: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const d = frame - at;
  if (d < -4 || d > 5) return null;
  const k = 1 - Math.abs(d) / 6;
  const hues: Hue[] = ["blue", "purple", "teal", "yellow", "red"];
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "screen" }}>
      <div style={{ position: "absolute", inset: 0, background: mix(ds("blue", 400), Math.round(10 * k)) }} />
      {Array.from({ length: 8 }, (_, i) => {
        const y = hash(i, frame) * H;
        const h = 8 + hash(i + 20, frame) * 80;
        const x = (hash(i + 40, frame) - 0.5) * 220;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: W,
              height: h,
              background: mix(ds(hues[i % hues.length], 400), Math.round((14 + 34 * hash(i + 60, frame)) * k)),
            }}
          />
        );
      })}
    </div>
  );
};

// ── Type ─────────────────────────────────────────────────────────────────────

/** Display type lit like a neon sign. */
export const NeonText: React.FC<{
  size?: number;
  hue?: Hue;
  weight?: number;
  glow?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ size = 96, hue = "blue", weight = 700, glow = 1, style, children }) => {
  const n = neon(hue);
  return (
    <div
      style={{
        fontFamily: DISPLAY,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1.04,
        letterSpacing: "-0.02em",
        color: n.core,
        textShadow: glowText(n.tube, glow),
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Terminal-style mono line. */
export const Mono: React.FC<{
  size?: number;
  color?: string;
  glow?: string;
  weight?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ size = 40, color = ds("gray", 200), glow, weight = 600, style, children }) => (
  <div
    style={{
      fontFamily: MONO,
      fontWeight: weight,
      fontSize: size,
      lineHeight: 1.25,
      color,
      textShadow: glow ? glowText(glow, 0.5) : undefined,
      whiteSpace: "pre",
      ...style,
    }}
  >
    {children}
  </div>
);

/** A block cursor: solid while typing, blinking while it waits. */
export const Cursor: React.FC<{ size: number; hue?: Hue; solid?: boolean }> = ({
  size,
  hue = "yellow",
  solid = false,
}) => {
  const frame = useCurrentFrame();
  const n = neon(hue);
  return (
    <span
      style={{
        display: "inline-block",
        width: size * 0.56,
        height: size * 0.98,
        marginLeft: size * 0.06,
        verticalAlign: "-0.16em",
        background: n.core,
        boxShadow: glowBox(n.tube, 0.7),
        opacity: solid || blinkOn(frame) ? 1 : 0,
      }}
    />
  );
};

/**
 * Text typed out between two cues, with the cursor riding its end. Before
 * `from` only the cursor shows (if asked for), so a line is never blank.
 */
export type Seg = { text: string; color?: string; glow?: string };

export const Typed: React.FC<{
  /** One string, or runs of differently lit text typed as one line. */
  text: string | Seg[];
  from: number;
  to: number;
  size: number;
  color?: string;
  glow?: string;
  font?: string;
  weight?: number;
  cursor?: "always" | "typing" | "none";
  cursorHue?: Hue;
  style?: React.CSSProperties;
}> = ({
  text,
  from,
  to,
  size,
  color = ds("gray", 100),
  glow,
  font = MONO,
  weight = 600,
  cursor = "always",
  cursorHue = "yellow",
  style,
}) => {
  const frame = useCurrentFrame();
  const segs: Seg[] = typeof text === "string" ? [{ text }] : text;
  const total = segs.reduce((n, s) => n + s.text.length, 0);
  const count = Math.round(map(frame, [from, Math.max(from + 1, to)], [0, total]));
  const typing = frame >= from && count < total;
  const showCursor = cursor === "always" || (cursor === "typing" && typing);
  let left = count;
  return (
    <div
      style={{
        fontFamily: font,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1.2,
        color,
        textShadow: glow ? glowText(glow, 0.5) : undefined,
        whiteSpace: "pre",
        ...style,
      }}
    >
      {segs.map((s, i) => {
        const shown = s.text.slice(0, Math.max(0, left));
        left -= s.text.length;
        return shown ? (
          <span
            key={i}
            style={{
              color: s.color,
              textShadow: s.glow ? glowText(s.glow, 0.5) : undefined,
            }}
          >
            {shown}
          </span>
        ) : null;
      })}
      {showCursor ? <Cursor size={size} hue={cursorHue} solid={typing} /> : null}
    </div>
  );
};

// ── Tokens ───────────────────────────────────────────────────────────────────

/** Mono advance: JetBrains Mono is 600/1000 em per glyph. */
export const charW = (size: number) => size * 0.6;

/** Width of a token chip, so rows can be laid out before they render. */
export const chipWidth = (text: string, size: number) =>
  text.length * charW(size) + size * 0.68 + size * 0.14;

/**
 * A token as a neon pill. A leading space is part of the token, so it is
 * drawn as a dot in its own character cell rather than dropped.
 */
export const TokenChip: React.FC<{
  text: string;
  hue: Hue;
  size: number;
  /** Brightness, 0 (off) to 1; feed it `flicker()` for a power-on. */
  on?: number;
  /** 0 (lit) to 1 (barely there). */
  dim?: number;
  /** Highlight the leading-space dot. */
  spaceLit?: number;
  radius?: string;
  style?: React.CSSProperties;
}> = ({ text, hue, size, on = 1, dim = 0, spaceLit = 0, radius, style }) => {
  const n = neon(hue);
  const lead = text.startsWith(" ");
  const body = lead ? text.slice(1) : text;
  const y = neon("yellow");
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        width: chipWidth(text, size),
        height: size * 1.5,
        borderRadius: radius ?? size * 0.75,
        border: `${size * 0.07}px solid ${n.tube}`,
        background: n.fill,
        boxShadow: glowBox(n.tube, 0.8 * (1 - dim * 0.8)),
        color: n.core,
        textShadow: glowText(n.tube, 0.5 * (1 - dim)),
        fontFamily: MONO,
        fontWeight: 700,
        fontSize: size,
        whiteSpace: "pre",
        opacity: on * (1 - dim * 0.72),
        ...style,
      }}
    >
      {lead ? (
        <span
          style={{
            color: spaceLit > 0 ? y.core : mix(n.core, 55),
            textShadow: spaceLit > 0 ? glowText(y.tube, 0.6 + spaceLit) : undefined,
            display: "inline-block",
            transform: `scale(${1 + spaceLit * 0.7})`,
          }}
        >
          ·
        </span>
      ) : null}
      {body}
    </div>
  );
};

/** A token id: scrambles, then settles. */
export const IdTag: React.FC<{
  id: number;
  at: number;
  size: number;
  hue?: Hue;
  style?: React.CSSProperties;
}> = ({ id, at, size, hue = "yellow", style }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const n = neon(hue);
  return (
    <div
      style={{
        fontFamily: MONO,
        fontWeight: 700,
        fontSize: size,
        lineHeight: 1,
        color: n.core,
        textShadow: glowText(n.tube, 0.6),
        whiteSpace: "pre",
        opacity: flicker(frame, at),
        ...style,
      }}
    >
      {scramble(String(id), frame, at)}
    </div>
  );
};

/** A neon arrow pointing down, drawn as it lights. */
export const DownArrow: React.FC<{ length: number; hue: Hue; progress: number }> = ({
  length,
  hue,
  progress,
}) => {
  const n = neon(hue);
  const w = 36;
  return (
    <svg
      width={w}
      height={length}
      style={{ display: "block", overflow: "visible", filter: `drop-shadow(0 0 6px ${mix(n.tube, 80)})` }}
    >
      <line
        x1={w / 2}
        y1={4}
        x2={w / 2}
        y2={4 + (length - 8) * progress}
        stroke={n.core}
        strokeWidth={5}
        strokeLinecap="round"
      />
      {progress > 0.85 ? (
        <polyline
          points={`${w / 2 - 12},${length - 18} ${w / 2},${length - 4} ${w / 2 + 12},${length - 18}`}
          fill="none"
          stroke={n.core}
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </svg>
  );
};

/** A neon answer pill: who is answering, and what they say. */
export const AnswerPill: React.FC<{
  who: string;
  value: string;
  hue: "green" | "red";
  on: number;
  left: number;
  top: number;
  jitter?: number;
  scale?: number;
}> = ({ who, value, hue, on, left, top, jitter = 0, scale = 1 }) => {
  const n = neon(hue);
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        height: 104,
        padding: "0 34px",
        display: "flex",
        alignItems: "center",
        gap: 22,
        boxSizing: "border-box",
        borderRadius: 52,
        border: `4px solid ${n.tube}`,
        background: n.fill,
        boxShadow: glowBox(n.tube, 0.9),
        opacity: on,
        transformOrigin: "0 50%",
        transform: `translateX(${jitter * 18}px) scale(${scale})`,
        filter: fringe(Math.round(Math.abs(jitter) * 7)),
      }}
    >
      <span style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 44, color: mix(n.core, 80) }}>
        {who}
      </span>
      <span
        style={{
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: 76,
          color: n.core,
          textShadow: glowText(n.tube, 0.8),
        }}
      >
        {value}
      </span>
    </div>
  );
};

// ── Panels ───────────────────────────────────────────────────────────────────

/** A terminal window lit in neon. Children are placed inside its body. */
export const Terminal: React.FC<{
  top: number;
  height: number;
  title: string;
  subtitle?: string;
  hue?: Hue;
  on?: number;
  children?: React.ReactNode;
}> = ({ top, height, title, subtitle, hue = "blue", on = 1, children }) => {
  const n = neon(hue);
  return (
    <div
      style={{
        position: "absolute",
        left: SIDE,
        top,
        width: CONTENT_W,
        height,
        boxSizing: "border-box",
        borderRadius: 30,
        border: `3px solid ${n.tube}`,
        background: mix(NIGHT, 84),
        boxShadow: glowBox(n.tube, 0.8),
        opacity: on,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: 78,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "0 30px",
          borderBottom: `2px solid ${mix(n.tube, 45)}`,
        }}
      >
        {(["red", "yellow", "green"] as Hue[]).map((h) => (
          <div
            key={h}
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              background: ds(h, 400),
              boxShadow: `0 0 10px ${mix(ds(h, 400), 80)}`,
            }}
          />
        ))}
        <div
          style={{
            marginLeft: 14,
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: 34,
            color: n.core,
            textShadow: glowText(n.tube, 0.5),
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div
            style={{
              marginLeft: "auto",
              fontFamily: MONO,
              fontWeight: 600,
              fontSize: 26,
              color: ds("gray", 400),
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>
      <div style={{ position: "relative", width: "100%", height: height - 78 }}>{children}</div>
    </div>
  );
};

/** One-line headlines that glitch in at their cue and hand over to the next. */
export const Headlines: React.FC<{
  items: [number, React.ReactNode][];
  end: number;
  top?: number;
}> = ({ items, end, top = TOP }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {items.map(([at, node], i) => {
        const next = items[i + 1]?.[0] ?? end;
        const o = during(frame, at, next, 5) * flicker(frame, at);
        if (o <= 0) return null;
        const g = glitch(frame, at, 9);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top,
              left: 0,
              width: W,
              display: "flex",
              justifyContent: "center",
              opacity: o,
              transform: `translateX(${g * (hash(frame, i) - 0.5) * 40}px) translateY(${(1 - ease(frame, at, 8)) * 18}px)`,
              filter: fringe(Math.round(g * 6)),
            }}
          >
            {node}
          </div>
        );
      })}
    </>
  );
};

// ── Clay ─────────────────────────────────────────────────────────────────────

/**
 * A clay cut-out. It lands with a squash and stretch, then idles the way
 * stop-motion does: moved on threes, with a little hand-made boil.
 */
export const Clay: React.FC<{
  id: string;
  at: number;
  left: number;
  top: number;
  width: number;
  height: number;
  rim?: Hue;
  bob?: number;
  seed?: number;
  style?: React.CSSProperties;
}> = ({ id, at, left, top, width, height, rim = "blue", bob = 10, seed = 0, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < at) return null;
  const p = pop(frame, at, fps, 8);
  const t = onThrees(frame + seed);
  const y = Math.sin(((t + seed * 7) / 54) * Math.PI * 2) * bob;
  const rot = (hash(Math.floor(frame / 3), seed + 3) - 0.5) * 1.4;
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width,
        height,
        transformOrigin: "50% 100%",
        transform: `translateY(${y}px) rotate(${rot}deg) scale(${1 + (1 - p) * 0.45}, ${p})`,
        filter: rimLight(ds(rim, 400)),
        ...style,
      }}
    >
      <Illustration video={VIDEO} id={id} style={{ width, height }} />
    </div>
  );
};
