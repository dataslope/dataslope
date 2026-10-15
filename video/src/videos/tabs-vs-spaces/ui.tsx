import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { pop } from "../../components/motion";
import { colors, ds } from "../../theme/brand";
import { SANS } from "../../theme/fonts";

/** Tabs and spaces get one hue each, everywhere in the video. */
export const TAB = { main: ds("blue"), onDark: ds("blue", 400), ink: colors.accentInk, soft: ds("blue", 100) };
export const SPACE = { main: ds("orange"), onDark: ds("orange", 400), ink: "var(--ds-orange-ink)", soft: ds("orange", 100) };

type From = "up" | "down" | "left" | "right" | "scale" | "none";

/** Springs its children in at a cue frame; hidden before it. */
export const Appear: React.FC<{
  at: number;
  from?: From;
  distance?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ at, from = "up", distance = 60, style, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = frame < at ? 0 : pop(frame, at, fps);
  const d = (1 - p) * distance;
  const transform =
    from === "up"
      ? `translateY(${d}px)`
      : from === "down"
        ? `translateY(${-d}px)`
        : from === "left"
          ? `translateX(${-d}px)`
          : from === "right"
            ? `translateX(${d}px)`
            : from === "scale"
              ? `scale(${0.5 + 0.5 * p})`
              : undefined;
  return (
    <div
      style={{
        position: "absolute",
        opacity: Math.min(1, p * 1.6),
        transform,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Big display type. */
export const Headline: React.FC<{
  size?: number;
  color?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ size = 104, color = colors.ink, style, children }) => (
  <div
    style={{
      fontFamily: SANS,
      fontWeight: 800,
      fontSize: size,
      lineHeight: 1.05,
      letterSpacing: "-0.03em",
      color,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </div>
);

/** Body copy. */
export const Body: React.FC<{
  size?: number;
  color?: string;
  weight?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ size = 58, color = colors.ink, weight = 700, style, children }) => (
  <div
    style={{
      fontFamily: SANS,
      fontWeight: weight,
      fontSize: size,
      lineHeight: 1.15,
      letterSpacing: "-0.015em",
      color,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </div>
);

/** A rounded label. */
export const Chip: React.FC<{
  bg: string;
  color: string;
  size?: number;
  font?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ bg, color, size = 44, font = SANS, style, children }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: size * 0.3,
      padding: `${size * 0.22}px ${size * 0.5}px`,
      borderRadius: size * 0.5,
      background: bg,
      color,
      fontFamily: font,
      fontWeight: 700,
      fontSize: size,
      lineHeight: 1.1,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </div>
);

/** A tab drawn the way an editor's "render whitespace" draws it: an arrow
 *  running into a stop bar, inside a pill the width of the tab. */
export const TabGlyph: React.FC<{
  width: number;
  height: number;
  color: string;
  fill?: string;
  stroke?: number;
  opacity?: number;
}> = ({ width, height, color, fill, stroke = 4, opacity = 1 }) => {
  const mid = height / 2;
  const head = Math.min(height * 0.18, Math.max(6, (width - 20) * 0.35));
  const x0 = Math.min(12, width * 0.2);
  const x1 = width - Math.max(stroke * 2.5, 10);
  return (
    <svg width={width} height={height} style={{ display: "block", opacity, flexShrink: 0 }}>
      {fill ? (
        <rect
          x={2}
          y={height * 0.2}
          width={Math.max(0, width - 4)}
          height={height * 0.6}
          rx={height * 0.3}
          fill={fill}
        />
      ) : null}
      <g stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <line x1={x0} y1={mid} x2={x1 - stroke} y2={mid} />
        <polyline points={`${x1 - stroke - head},${mid - head} ${x1 - stroke},${mid} ${x1 - stroke - head},${mid + head}`} />
        <line x1={x1 + stroke * 0.6} y1={mid - head * 1.2} x2={x1 + stroke * 0.6} y2={mid + head * 1.2} />
      </g>
    </svg>
  );
};

/** A run of spaces drawn as centred dots, one per character cell. */
export const DotsGlyph: React.FC<{
  count: number;
  cell: number;
  height: number;
  color: string;
  dot?: number;
  reveal?: number;
}> = ({ count, cell, height, color, dot = 10, reveal = 1 }) => (
  <div style={{ display: "flex", flexShrink: 0 }}>
    {Array.from({ length: count }, (_, i) => (
      <div
        key={i}
        style={{
          width: cell,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: dot,
            height: dot,
            borderRadius: dot,
            background: color,
            opacity: reveal,
            transform: `scale(${reveal})`,
          }}
        />
      </div>
    ))}
  </div>
);

/** A check mark, drawn. */
export const Check: React.FC<{ size: number; color: string; progress?: number }> = ({
  size,
  color,
  progress = 1,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
    <polyline
      points="4,12.5 9.5,18 20,6.5"
      fill="none"
      stroke={color}
      strokeWidth={3.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength={1}
      strokeDasharray={1}
      strokeDashoffset={1 - progress}
    />
  </svg>
);

/** A bold X made of two bars, for the one wrong answer. */
export const Cross: React.FC<{ size: number; color: string; thickness?: number }> = ({
  size,
  color,
  thickness = size * 0.16,
}) => (
  <div style={{ position: "relative", width: size, height: size }}>
    {[45, -45].map((deg) => (
      <div
        key={deg}
        style={{
          position: "absolute",
          left: 0,
          top: (size - thickness) / 2,
          width: size,
          height: thickness,
          borderRadius: thickness / 2,
          background: color,
          transform: `rotate(${deg}deg)`,
        }}
      />
    ))}
  </div>
);

/** A comic-book impact burst. */
export const Burst: React.FC<{ size: number; color: string; points?: number }> = ({
  size,
  color,
  points = 12,
}) => {
  const r = size / 2;
  const pts = Array.from({ length: points * 2 }, (_, i) => {
    const a = (Math.PI * i) / points - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.58;
    return `${r + rr * Math.cos(a)},${r + rr * Math.sin(a)}`;
  }).join(" ");
  return (
    <svg width={size} height={size} style={{ display: "block" }}>
      <polygon points={pts} fill={color} />
    </svg>
  );
};

/** An editor-style on/off switch. */
export const Toggle: React.FC<{ on: number; width?: number }> = ({ on, width = 112 }) => {
  const h = width * 0.54;
  const knob = h - 12;
  return (
    <div
      style={{
        position: "relative",
        width,
        height: h,
        borderRadius: h / 2,
        background: `color-mix(in srgb, ${ds("blue")} ${Math.round(on * 100)}%, ${ds("gray", 300)})`,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 6,
          left: 6 + on * (width - knob - 12),
          width: knob,
          height: knob,
          borderRadius: knob,
          background: colors.page,
          boxShadow: `0 2px 6px color-mix(in srgb, ${colors.ink} 25%, transparent)`,
        }}
      />
    </div>
  );
};

/** Soft drop shadow for cards, from the ink token. */
export const SHADOW = `0 18px 40px color-mix(in srgb, ${ds("gray", 900)} 16%, transparent)`;
