import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { body, fmt, halo, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { SANS } from "../../theme/fonts";
import { Sfx } from "../../sound/Sfx";
import { normalPdf, Z } from "./data";
import {
  ASK,
  ASK_FILL,
  ASK_INK,
  areaD,
  askNote,
  Bracket,
  Centered,
  code,
  Count,
  Curve,
  curveD,
  Drift,
  Head,
  lerp,
  pulse,
  Strike,
  Svg,
} from "./parts";

/** Scores, 40 to 160; the z ruler below shares the scale. */
const X: XScale = { lo: 40, hi: 160, x0: 260, x1: 1660 };
const BASE = 660;
const TALL = 280;
const Z_Y = 770;
const TICKS = [-3, -2, -1, 0, 1, 2, 3];

/**
 * Part 3, third scene: a z-score. A score of 130 is thirty points, two SDs,
 * above a mean of 100, so it drops onto the z ruler at 2; that is a
 * position, and the area to its left, 97.7%, is what a percentile reads.
 */
export const ZScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const zFrom = n.beat("z").from;
  const zScoreAt = n.word("z", "z-score");
  const scoreAt = n.word("z", "A score");
  const thirtyAt = n.word("z", "thirty points");
  const twoSdAt = n.word("z", "two standard deviations");
  const isTwoAt = n.word("z", "Its z is two");
  const isTwoEnd = n.word("z", "two", { nth: 2, edge: "end" });
  const percentAt = n.word("position", "two percent");
  const positionAt = n.word("position", "position");
  const lookAt = n.word("position", "Look up");
  const leftAt = n.word("position", "to its left");
  const sevenAt = n.word("position", "ninety-seven point seven");
  const belowAt = n.word("position", "fall below");
  const onlyAt = n.word("skew-in", "only works");

  const { mu, sigma, x } = Z;
  const pdf = (v: number) => normalPdf(v, mu, sigma);
  const base = y(BASE);
  const unit = h(TALL) / pdf(mu);
  const py = (v: number) => base - v * unit;
  const zx = (z: number) => sx(X, mu + z * sigma);
  const x130 = sx(X, x);
  const zY = y(Z_Y);
  const drop = ease(frame, isTwoAt - 4, 18);
  const sweep = ease(frame, leftAt - 6, 30);
  const throb = pulse(frame, positionAt - 4, 22);
  const dim = ease(frame, onlyAt - 6, 14) * 0.3;

  return (
    <AbsoluteFill>
      {/* ── Sound: the score marked, its two steps, the drop onto the z
           ruler, the area sweeping in ── */}
      <Sfx name="el-tap" at={scoreAt - 2} level={-29} />
      <Sfx name="el-pencil" at={thirtyAt - 4} level={-34} />
      <Sfx name="el-pop" at={isTwoAt - 4 + 16} level={-29} />
      <Sfx name="el-scratch" at={percentAt + 4} level={-31} />
      <Sfx name="el-whoosh" at={leftAt - 6} level={-34} />

      <Head
        parts={[
          { text: "A z-score is", at: zFrom - 4 },
          { text: "a position.", at: positionAt - 6, italic: true },
        ]}
      />
      <Ink at={zScoreAt - 2} dur={16} style={{ left: 96, top: y(252), whiteSpace: "nowrap" }}>
        <span style={{ ...body(40, true), color: INK }}>
          z = (x − μ) / σ
          <span style={{ color: ASK_INK, opacity: ease(frame, isTwoAt - 6, 14), marginLeft: "0.4em" }}>
            = ({x} − {mu}) / {sigma} = {fmt(Z.z, 0)}
          </span>
        </span>
      </Ink>

      <Drift from={zFrom} to={n.beat("skew-in").to + 40}>
        <div style={{ position: "absolute", inset: 0, opacity: 1 - dim }}>
          {/* The area to the left of 130. */}
          {sweep > 0 ? (
            <Svg>
              <path d={areaD(pdf, X.lo, lerp(X.lo, x, sweep), X, py)} fill={ASK_FILL} />
            </Svg>
          ) : null}
          <Curve d={curveD(pdf, X.lo, X.hi, X, py)} at={zFrom - 6} dur={24} />

          {/* The score ruler. */}
          <Svg opacity={ease(frame, zFrom - 4, 14)}>
            <line x1={X.x0} x2={X.x1} y1={base + 0.5} y2={base + 0.5} stroke={INK} strokeWidth={1.6} />
            {TICKS.map((k) => (
              <line key={k} x1={zx(k)} x2={zx(k)} y1={base} y2={base + 7} stroke={INK} strokeWidth={1.2} />
            ))}
          </Svg>
          <div style={{ position: "absolute", left: 96, top: base + 10, opacity: ease(frame, zFrom, 14), ...label(21, INK_SOFT) }}>Score</div>
          {TICKS.map((k) => (
            <Centered key={k} x={zx(k)} y={base + 12} opacity={ease(frame, zFrom + 2, 12)} style={{ ...note(22, INK_SOFT) }}>
              {mu + k * sigma}
            </Centered>
          ))}

          {/* The z ruler. */}
          <Svg opacity={ease(frame, zScoreAt - 2, 14)}>
            <line x1={X.x0} x2={X.x1} y1={zY + 0.5} y2={zY + 0.5} stroke={INK} strokeWidth={1.6} />
            {TICKS.map((k) => (
              <line key={k} x1={zx(k)} x2={zx(k)} y1={zY} y2={zY + 7} stroke={INK} strokeWidth={1.2} />
            ))}
            {TICKS.map((k) => (
              <text
                key={k}
                x={zx(k)}
                y={zY + 32}
                textAnchor="middle"
                style={{ fontFamily: SANS, fontSize: 22, fontWeight: 600, fill: k === 2 && drop >= 1 ? ASK_INK : INK_SOFT }}
              >
                {k > 0 ? `+${k}` : k < 0 ? `−${Math.abs(k)}` : "0"}
              </text>
            ))}
          </Svg>
          <div style={{ position: "absolute", left: 96, top: zY + 10, opacity: ease(frame, zScoreAt, 14), ...label(21, INK_SOFT) }}>z</div>

          {/* Thirty points: two steps of fifteen. */}
          <Bracket x0={zx(0)} x1={x130} y={py(pdf(mu)) - h(30)} at={thirtyAt - 4} color={ASK} up />
          <Note at={thirtyAt} x={(zx(0) + x130) / 2} y={py(pdf(mu)) - h(30) - 40} style={{ transform: "translateX(-50%)" }}>
            <span style={{ ...askNote(23), whiteSpace: "nowrap", ...halo }}>
              {x - mu} points<span style={{ opacity: ease(frame, twoSdAt - 4, 10) }}>, two steps of {sigma}</span>
            </span>
          </Note>
          <Svg opacity={ease(frame, twoSdAt - 4, 12)}>
            {[0, 1, 2].map((k) => (
              <line key={k} x1={zx(k)} x2={zx(k)} y1={py(pdf(mu)) - h(30)} y2={py(pdf(mu)) - h(30) + 14} stroke={ASK} strokeWidth={2.2} />
            ))}
          </Svg>

          {/* 130, then the same point on the z ruler. */}
          <Svg opacity={ease(frame, scoreAt - 4, 10)}>
            <line x1={x130} x2={x130} y1={base} y2={lerp(base, py(pdf(x)), ease(frame, scoreAt, 14))} stroke={ASK} strokeWidth={2.4} />
            {drop > 0 ? <line x1={x130} x2={x130} y1={base} y2={lerp(base, zY, drop)} stroke={ASK} strokeWidth={2} strokeDasharray="5 5" /> : null}
            <circle cx={x130} cy={lerp(base, zY, drop)} r={9 + throb * 5} fill={ASK} stroke={PAPER} strokeWidth={2} />
          </Svg>
          <Note at={isTwoEnd - 2} x={x130 + 18} y={zY - 44}>
            <span style={{ ...askNote(26), whiteSpace: "nowrap" }}>z = {fmt(Z.z, 0)}</span>
          </Note>

          {/* A position, not a chance; the area is the percentile. */}
          <Note at={percentAt - 4} x={x130 + 30} y={y(380)}>
            <span style={{ ...note(26, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
              not a <Strike at={percentAt + 4}>2% chance</Strike>
            </span>
          </Note>
          <Note at={lookAt} x={x130 + 30} y={y(426)}>
            <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>the area to its left:</span>
          </Note>
          <Centered x={zx(-0.6)} y={py(pdf(mu - 0.6 * sigma)) + h(70)} opacity={ease(frame, sevenAt - 10, 8)} style={{ ...askNote(38), ...halo }}>
            <Count at={sevenAt - 10} dur={16} to={Z.below} suffix="%" />
          </Centered>
          <Note at={belowAt - 4} x={x130 + 30} y={y(462)}>
            <span style={code(22, INK)}>norm.cdf({fmt(Z.z, 0)}) = {fmt(Z.below / 100, 3)}</span>
          </Note>
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
