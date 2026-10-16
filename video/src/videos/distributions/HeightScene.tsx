import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { fmt, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { UNIFORM } from "./data";
import { ASK, askNote, Bracket, Centered, code, DIST, Drift, Head, lerp, pulse, Strike, Svg, YTicks } from "./parts";

const X: XScale = { lo: 0, hi: 10, x0: 220, x1: 1420 };
const BASE = 820;
/** Pixels per unit of density: a height of 2 stands 380 px tall. */
const PER = 190;
const PANEL_X = 1500;

/**
 * Part 2, second scene: a uniform on zero to ten, flat at 0.1, whose slice
 * from three to seven holds 0.4; then the same probability squeezed into
 * half a unit, which has to stand at a height of 2. Height is density; only
 * the area is a probability.
 */
export const HeightScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const uniformFrom = n.beat("uniform").from;
  const evenlyAt = n.word("uniform", "evenly");
  const tenEnd = n.word("uniform", "ten", { edge: "end" });
  const flatAt = n.word("uniform", "flat");
  const pointOneAt = n.word("uniform", "point one");
  const sliceAt = n.word("slice", "Three to seven");
  const widthAt = n.word("slice", "width");
  const probAt = n.word("slice", "probability");
  const squeezeAt = n.word("squeeze", "squeeze");
  const halfEnd = n.word("squeeze", "half a unit", { edge: "end" });
  const keepAt = n.word("squeeze", "keep the area");
  const climbAt = n.word("squeeze", "climb");
  const twoAt = n.word("squeeze", "two");
  const percentAt = n.word("density", "two hundred percent");
  const densityAt = n.word("density", "density");
  const onlyAt = n.word("density", "Only the area");
  const otherAt = n.word("quantile-in", "other way round");

  const base = y(BASE);
  const py = (v: number) => base - h(v * PER);

  // The block: drawn out to ten, then squeezed to half a unit, area kept at 1.
  const grow = ease(frame, evenlyAt - 4, tenEnd - evenlyAt + 6);
  const squeeze = ease(frame, squeezeAt - 2, halfEnd - squeezeAt + 34);
  const width = lerp(UNIFORM.scale, UNIFORM.narrowScale, squeeze);
  const shown = grow * width;
  const height = 1 / width;
  const top = py(height);
  const slice = ease(frame, sliceAt - 4, 14) * (1 - ease(frame, squeezeAt - 6, 10));
  const areaFlash = pulse(frame, onlyAt - 2, 24) + pulse(frame, keepAt - 4, 20);
  const dim = ease(frame, otherAt - 10, 14) * 0.3;

  return (
    <AbsoluteFill>
      {/* ── Sound: the flat block drawn out, the slice, the squeeze, the height
           landing at two ── */}
      <Sfx name="el-pencil" at={evenlyAt - 4} level={-34} />
      <Sfx name="el-tap" at={sliceAt - 4} level={-29} />
      <Sfx name="el-whoosh" at={squeezeAt - 2} level={-33} />
      <Sfx name="el-tap" at={twoAt - 4} level={-28} />
      <Sfx name="el-scratch" at={percentAt + 2} level={-31} />

      <Head
        parts={[
          { text: "Flat:", at: uniformFrom - 4 },
          { text: "a uniform.", at: n.word("uniform", "a uniform") - 6, italic: true },
        ]}
        out={densityAt - 8}
      />
      <Head
        parts={[
          { text: "Height is density.", at: densityAt - 4 },
          { text: "Area is probability.", at: onlyAt - 6, italic: true },
        ]}
      />

      <Drift from={uniformFrom} to={n.beat("quantile-in").to + 40} origin="40% 70%">
        <div style={{ position: "absolute", inset: 0, opacity: 1 - dim }}>
          <FigLabel n="7" title="A value spread evenly from 0 to 10" at={uniformFrom} x={160} y={y(300)} />
          <Note at={uniformFrom + 10} x={X.x1} y={y(304)} align="right">
            <span style={code(21, INK_SOFT)}>
              uniform(loc={UNIFORM.loc}, scale=<Count2 from={UNIFORM.scale} to={UNIFORM.narrowScale} t={squeeze} />)
            </span>
          </Note>
          <YTicks ticks={[0.5, 1, 1.5, 2]} py={py} x0={X.x0} x1={X.x1} at={uniformFrom + 4} format={(v) => fmt(v, 1)} />
          <Ink at={uniformFrom + 8} dur={14} style={{ left: X.x0 - 60, top: py(2) - h(64), whiteSpace: "nowrap" }}>
            <span style={label(20, INK_SOFT)}>density</span>
          </Ink>
          <Axis scale={X} base={base} ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]} at={uniformFrom + 2} />

          {/* A height of one, for reference. */}
          <Svg opacity={ease(frame, climbAt - 4, 14)}>
            <line x1={X.x0} x2={X.x1} y1={py(1)} y2={py(1)} stroke={INK} strokeWidth={1.6} strokeDasharray="6 6" opacity={0.6} />
          </Svg>

          {/* The block. */}
          {grow > 0 ? (
            <Svg>
              <rect
                x={X.x0}
                y={top}
                width={sx(X, shown) - X.x0}
                height={base - top}
                fill={`color-mix(in srgb, ${DIST} ${22 + areaFlash * 30}%, transparent)`}
              />
              <path
                d={`M${X.x0},${base} L${X.x0},${top} L${sx(X, shown)},${top} L${sx(X, shown)},${base}`}
                fill="none"
                stroke={DIST}
                strokeWidth={lerp(3, 4.2, ease(frame, flatAt - 4, 10) * (1 - squeeze))}
                strokeLinejoin="round"
              />
            </Svg>
          ) : null}
          {slice > 0 ? (
            <Svg opacity={slice}>
              <rect x={sx(X, UNIFORM.a)} y={py(UNIFORM.pdf)} width={sx(X, UNIFORM.b) - sx(X, UNIFORM.a)} height={base - py(UNIFORM.pdf)} fill={ASK} />
            </Svg>
          ) : null}

          {/* Labels on the flat block. */}
          <Note at={pointOneAt - 4} x={sx(X, 8.2)} y={py(UNIFORM.pdf) - 44} out={squeezeAt - 6}>
            <span style={{ ...note(23, INK), fontWeight: 650, whiteSpace: "nowrap" }}>height {fmt(UNIFORM.pdf, 1)}</span>
          </Note>
          <Bracket
            x0={sx(X, UNIFORM.a)}
            x1={sx(X, UNIFORM.b)}
            y={base + 46}
            at={widthAt - 6}
            out={squeezeAt - 6}
            color={ASK}
            up
          />
          <Centered x={sx(X, 5)} y={base + 54} opacity={ease(frame, widthAt - 2, 10) * (1 - ease(frame, squeezeAt - 6, 10))} style={askNote(22)}>
            4 of the 10
          </Centered>
          <Note at={probAt - 4} x={sx(X, UNIFORM.a)} y={py(UNIFORM.pdf) - h(120)} out={squeezeAt - 6}>
            <span style={{ ...askNote(28), whiteSpace: "nowrap" }}>
              area = {UNIFORM.b - UNIFORM.a} × {fmt(UNIFORM.pdf, 1)} = {fmt(UNIFORM.between, 1)}
            </span>
          </Note>

          {/* The squeeze, read live. */}
          <Ink at={squeezeAt + 4} dur={14} style={{ left: PANEL_X - 40, top: y(430), whiteSpace: "nowrap" }}>
            <span style={label(22, INK_SOFT)}>width × height</span>
          </Ink>
          <Ink at={squeezeAt + 8} dur={14} style={{ left: PANEL_X - 40, top: y(470), whiteSpace: "nowrap" }}>
            <span style={{ ...note(32, INK), fontWeight: 650 }}>
              {fmt(width, 2)} × {fmt(height, 2)}
            </span>
          </Ink>
          <Ink at={keepAt - 4} dur={14} style={{ left: PANEL_X - 40, top: y(522), whiteSpace: "nowrap" }}>
            <span style={{ ...askNote(32), opacity: 1 - areaFlash * 0.3 }}>= area 1</span>
          </Ink>
          <Note at={twoAt - 2} x={sx(X, UNIFORM.narrowScale) + 22} y={py(UNIFORM.narrowPdf) - 16}>
            <span style={{ ...note(26, INK), fontWeight: 700, whiteSpace: "nowrap", background: PAPER, padding: "0 6px" }}>
              height {fmt(UNIFORM.narrowPdf, 0)}
            </span>
          </Note>
          <Note at={percentAt - 4} x={sx(X, UNIFORM.narrowScale) + 22} y={py(UNIFORM.narrowPdf) + 30}>
            <span style={{ ...askNote(26), whiteSpace: "nowrap" }}>
              a <Strike at={percentAt + 2}>200% chance</Strike>
            </span>
          </Note>
          <Note at={densityAt} x={sx(X, UNIFORM.narrowScale) + 22} y={py(UNIFORM.narrowPdf) + 74}>
            <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
              a density: probability <span style={{ opacity: ease(frame, n.word("density", "per unit") - 4, 10) }}>per unit of width</span>
            </span>
          </Note>
        </div>
      </Drift>
    </AbsoluteFill>
  );
};

/** A number moving from `from` to `to` as `t` goes 0 to 1, set to two places. */
const Count2: React.FC<{ from: number; to: number; t: number }> = ({ from, to, t }) => <>{fmt(lerp(from, to, t), t > 0 && t < 1 ? 2 : 1)}</>;
