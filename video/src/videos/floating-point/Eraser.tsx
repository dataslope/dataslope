// The video's one transition: a felt eraser scrubs the board clean between
// lessons. It sweeps across in a zigzag, the old board vanishes behind it,
// and it leaves a haze of chalk and a fall of dust that settle as the next
// board is written.
import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { ds } from "../../theme/brand";
import { H, INK, W } from "./chalk";
import { rng, smooth, type Pt } from "./rough";

/** One wipe: starts at `at`, travels left to right (`dir` 1) or back. */
export type Wipe = { at: number; dir: 1 | -1; seed: number };

/** Frames the eraser takes to cross the board. */
export const WIPE_DUR = 20;
/** Frames the haze and dust take to settle after it leaves. */
const SETTLE = 26;

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const progress = (frame: number, w: Wipe) =>
  interpolate(frame, [w.at, w.at + WIPE_DUR], [0, 1], { ...CLAMP, easing: Easing.inOut(Easing.quad) });

/** Where the eraser is at progress `p`: across the board, scrubbing up and
 *  down two and a half times on the way. */
function position(p: number, w: Wipe): Pt {
  const x = -200 + p * (W + 400);
  const r = rng(w.seed);
  const phase = r() * Math.PI;
  const wander = r() * Math.PI * 2;
  // A hand never scrubs a perfect zigzag: the reach of each stroke varies.
  const reach = 300 * (0.78 + 0.22 * Math.sin(p * 9.1 + wander));
  const y = 470 + reach * Math.sin(p * Math.PI * 5 + phase) + 30 * Math.sin(p * 17 + wander);
  return [w.dir === 1 ? x : W - x, y];
}

/** Mask for a board being erased: gone wherever the eraser has been. */
export function erasedBy(frame: number, w: Wipe): React.CSSProperties {
  if (frame < w.at) return {};
  const [x] = position(progress(frame, w), w);
  const f = 90;
  const m =
    w.dir === 1
      ? `linear-gradient(90deg, transparent ${x - f}px, ${INK.white} ${x + f}px)`
      : `linear-gradient(90deg, ${INK.white} ${x - f}px, transparent ${x + f}px)`;
  return { maskImage: m, WebkitMaskImage: m };
}

export const Eraser: React.FC<{ wipe: Wipe }> = ({ wipe }) => {
  const frame = useCurrentFrame();
  if (frame < wipe.at || frame > wipe.at + WIPE_DUR + SETTLE) return null;
  const p = progress(frame, wipe);
  const [ex, ey] = position(p, wipe);
  const [nx, ny] = position(Math.min(1, p + 0.02), wipe);
  const tilt = Math.max(-16, Math.min(16, (Math.atan2(ny - ey, Math.abs(nx - ex) + 1) * 180) / Math.PI * 0.35));
  const settle = interpolate(frame, [wipe.at + WIPE_DUR, wipe.at + WIPE_DUR + SETTLE], [1, 0], CLAMP);

  // The eraser's track, drawn as haze up to where it has got to.
  const track = Array.from({ length: 64 }, (_, i) => position(i / 63, wipe));
  const trackD = smooth(track);

  // Dust: knocked loose along the track, falling and fading.
  const r = rng(wipe.seed * 31 + 7);
  const dust = Array.from({ length: 46 }, () => {
    const t = r();
    const [px, py] = position(t, wipe);
    return {
      spawn: wipe.at + t * WIPE_DUR,
      x: px + (r() - 0.5) * 200,
      y: py + (r() - 0.3) * 110,
      vx: (r() - 0.5) * 2.2,
      vy: -0.6 - r() * 1.2,
      size: 2 + r() * 4.5,
    };
  });

  return (
    <>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: 0.5 * settle }}>
        <g filter="url(#fp-smear)">
          <path
            d={trackD}
            fill="none"
            stroke={INK.white}
            strokeWidth={280}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - p}
            opacity={0.26}
          />
        </g>
        {dust.map((d, i) => {
          const age = frame - d.spawn;
          if (age < 0 || age > 30) return null;
          const o = interpolate(age, [0, 4, 30], [0, 0.75, 0], CLAMP);
          return (
            <circle
              key={i}
              cx={d.x + d.vx * age}
              cy={d.y + d.vy * age + 0.09 * age * age}
              r={d.size}
              fill={INK.white}
              opacity={o}
            />
          );
        })}
      </svg>
      {p < 1 ? <EraserBlock x={ex} y={ey} tilt={tilt * wipe.dir} /> : null}
    </>
  );
};

/** A felt board eraser seen from above: a wooden back, a felt pad, chalk on
 *  its edges. */
const EraserBlock: React.FC<{ x: number; y: number; tilt: number }> = ({ x, y, tilt }) => {
  const w = 300;
  const h = 126;
  const wood = `color-mix(in srgb, ${ds("orange", 600)} 70%, ${ds("gray", 800)})`;
  const woodDark = `color-mix(in srgb, ${ds("orange", 800)} 70%, ${ds("gray", 900)})`;
  return (
    <div
      style={{
        position: "absolute",
        left: x - w / 2,
        top: y - h / 2,
        width: w,
        height: h,
        transform: `rotate(${tilt}deg)`,
        filter: `drop-shadow(0 18px 18px color-mix(in srgb, ${ds("gray", 900)} 65%, transparent))`,
      }}
    >
      {/* Felt pad, a little proud of the back on every side. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 16,
          background: `linear-gradient(180deg, ${ds("gray", 300)}, ${ds("gray", 400)})`,
          boxShadow: `inset 0 0 0 4px color-mix(in srgb, ${INK.white} 60%, transparent)`,
        }}
      />
      {/* Wooden back with grain. */}
      <div
        style={{
          position: "absolute",
          left: 12,
          top: 10,
          right: 12,
          bottom: 26,
          borderRadius: 12,
          background: `repeating-linear-gradient(176deg, transparent 0 9px, color-mix(in srgb, ${woodDark} 45%, transparent) 9px 11px), linear-gradient(180deg, ${wood}, ${woodDark})`,
          boxShadow: `inset 0 3px 0 color-mix(in srgb, ${ds("orange", 400)} 45%, transparent)`,
        }}
      />
      {/* A smear of chalk on the leading face of the felt. */}
      <div
        style={{
          position: "absolute",
          left: 18,
          right: 18,
          bottom: 6,
          height: 14,
          borderRadius: 7,
          background: `color-mix(in srgb, ${INK.white} 75%, transparent)`,
          filter: "blur(3px)",
        }}
      />
    </div>
  );
};
