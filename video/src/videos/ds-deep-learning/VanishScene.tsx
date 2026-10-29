import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, INK, TABULAR, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { VANISH } from "./data";
import { Axes, Drift, Fade, Mark, type Scale, Svg, Tagline, WARM, WARM_INK } from "./parts";

const BOX = { left: 230, right: 1000, top: 384, bottom: 806 };
const FIX_X = 1180;
const FIX_Y = 372;
const FIX_ROW = 64;

const power = (v: number) => (v >= 1 ? v.toLocaleString("en-US", { maximumFractionDigits: 0 }) : v.toFixed(Math.max(0, -Math.floor(Math.log10(v)))));

/**
 * Question 5: the gradient's size, layer by layer back from the output, on
 * a log scale. Each layer's factor is its weight times its activation's
 * slope: a quarter per layer (the sigmoid's slope at its steepest, with
 * weights near one) falls to 0.25^10, under one in a million; one and a half
 * per layer (large weights) climbs to 57.7. Then the fixes, each ticked as
 * it is named.
 */
export const VanishScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("vanish").from;
  const qAt = n.word("vanish", "Question five");
  const textAt = n.word("vanish", "What causes vanishing");
  const explodingAt = n.word("vanish", "exploding gradients");
  const sweepAt = n.word("vanish", "That backward sweep");
  const productAt = n.word("vanish", "a long product");
  const slopeAt = n.word("vanish", "The sigmoid's slope");
  const quarterAt = n.word("vanish", "a quarter at most");
  const tenAt = n.word("vanish", "ten sigmoid layers");
  const millionAt = n.word("vanish", "less than one in a million");
  const earlyAt = n.word("vanish", "The early layers barely learn");
  const aboveAt = n.word("vanish", "Factors above one");
  const halfAt = n.word("vanish", "One and a half, ten times over");
  const explodesAt = n.word("vanish", "the gradient explodes");
  const whyAt = n.word("vanish-why", "Each layer's factor is its weight");
  const nearAt = n.word("vanish-why", "weights near one");
  const largeAt = n.word("vanish-why", "large weights push the factor above one");
  const fixes = [
    { text: "ReLU", at: n.word("vanish-fix", "ReLU") },
    { text: "careful initialization", at: n.word("vanish-fix", "careful initialization") },
    { text: "skip connections, around layers", at: n.word("vanish-fix", "skip connections") },
    { text: "normalization", at: n.word("vanish-fix", "normalization") },
    { text: "exploding: clipping", at: n.word("vanish-fix", "clipping") },
  ];
  const stepAt = n.word("opt-in", "The step size");
  const end = n.beat("opt-in").to;

  const xs: Scale = { lo: 0, hi: 10, a: BOX.left, b: BOX.right };
  const ys: Scale = { lo: -7, hi: 2.4, a: y(BOX.bottom), b: y(BOX.top) };
  const px = (k: number) => xs.a + (k / 10) * (xs.b - xs.a);
  const py = (v: number) => ys.a + ((Math.log10(v) - ys.lo) / (ys.hi - ys.lo)) * (ys.b - ys.a);
  const series = [
    { values: VANISH.smallPowers, color: ACCENT, at: tenAt, every: 3 },
    { values: VANISH.bigPowers, color: WARM, at: halfAt - 2, every: 2.4 },
  ];
  const dim = ease(frame, stepAt, 14) * 0.5;
  const late = ease(frame, earlyAt, 12);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={productAt} level={-36} />
      {Array.from({ length: 10 }, (_, k) => (
        <Sfx key={k} name="el-tap" at={tenAt + (k + 1) * 3} level={-42} />
      ))}
      <Sfx name="el-pop" at={millionAt + 2} level={-32} />
      <Sfx name="el-whoosh" at={explodesAt} level={-34} />
      {fixes.map((f) => (
        <Sfx key={f.text} name="el-tap" at={f.at} level={-38} />
      ))}

      <Drift from={from} to={end + 40}>
        {/* Held to the cut, as every other scene is: clearing on the bridge's
            last word left a blank page through the gap. */}
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} size={60}>
          What causes vanishing and exploding gradients?
        </QuestionCard>

        <Fade from={from}>
          <div style={{ position: "absolute", inset: 0, opacity: 1 - dim }}>
            <Axes
              x={xs}
              y={ys}
              xTicks={[0, 2, 4, 6, 8, 10]}
              yTicks={[-6, -4, -2, 0, 2]}
              yFormat={(v) => power(10 ** v)}
              xTitle="layers back from the output"
              yTitle="the gradient's size"
              at={explodingAt - 2}
            />
            {/* The opening builds a step at a time: the empty axes as the
                question ends, then each line on its words, so the page never
                holds still for 3 s while the question is read. */}
            <Tagline x={120} y={y(236)} at={sweepAt} size={24} color={INK}>
              each layer:{" "}
              <span style={{ opacity: ease(frame, productAt + 2, 10) }}>
                <Mark at={whyAt + 4}>× its weight × its activation&apos;s slope</Mark>
              </span>
            </Tagline>
            <Tagline x={120} y={y(290)} at={slopeAt - 2} size={24} color={ACCENT_INK}>
              the sigmoid&apos;s slope: <Mark at={quarterAt + 4}>at most 0.25</Mark>, so × 0.25 a layer
              <span style={{ opacity: ease(frame, nearAt - 2, 10) }}>, with weights near 1</span>
            </Tagline>
            <Svg>
              {series.map((s) =>
                s.values.map((v, k) => {
                  const p = ease(frame, s.at + k * s.every, 8);
                  if (p <= 0) return null;
                  const prev = k > 0 ? s.values[k - 1] : v;
                  return (
                    <g key={`${s.color}-${k}`}>
                      {k > 0 ? (
                        <line
                          x1={px(k - 1)}
                          y1={py(prev)}
                          x2={px(k - 1) + (px(k) - px(k - 1)) * p}
                          y2={py(prev) + (py(v) - py(prev)) * p}
                          stroke={s.color}
                          strokeWidth={3}
                        />
                      ) : null}
                      <circle cx={px(k)} cy={py(v)} r={7 * p} fill={s.color} />
                    </g>
                  );
                }),
              )}
              {/* The early layers: what little arrives there. */}
              <rect
                x={px(7.5)}
                y={py(VANISH.ten) - 34}
                width={(px(10) - px(7.5)) * late + 20}
                height={68}
                rx={8}
                fill={`color-mix(in srgb, ${ACCENT} 10%, transparent)`}
                stroke={ACCENT}
                strokeWidth={1.6}
                strokeDasharray="5 5"
                opacity={late}
              />
            </Svg>
            <Note at={millionAt} x={px(0.3)} y={py(1e-5)}>
              <span style={{ ...note(25, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>
                0.25<sup>10</sup> = {VANISH.ten.toFixed(8)}: under one in a million
              </span>
            </Note>
            <Note at={earlyAt + 2} x={px(0.3)} y={py(1e-5) + h(40)}>
              <span style={{ ...note(23, ACCENT_INK), whiteSpace: "nowrap" }}>the early layers barely learn</span>
            </Note>
            <Note at={explodesAt - 2} x={px(10) - 330} y={py(VANISH.tenBig) - h(50)}>
              <span style={{ ...note(25, WARM_INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>
                1.5<sup>10</sup> = {VANISH.tenBig}: it explodes
              </span>
            </Note>
            {/* Under the gridline at 1, clear of both lines (it sat on the gridline). */}
            <Tagline x={px(3)} y={py(1) + h(16)} at={aboveAt} size={21} color={WARM_INK}>
              × 1.5 a layer<span style={{ opacity: ease(frame, largeAt - 2, 10) }}>, with large weights</span>
            </Tagline>
          </div>

          {/* ── The fixes ── */}
          <Tagline x={FIX_X} y={y(FIX_Y) - h(48)} at={fixes[0].at - 6} size={22} color={INK}>
            the fixes
          </Tagline>
          {fixes.map((f, i) => (
            <Note key={f.text} at={f.at - 2} x={FIX_X} y={y(FIX_Y) + i * h(FIX_ROW)}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <Tick at={f.at + 2} size={26} />
                <span style={{ ...note(29, i === 4 ? WARM_INK : INK), whiteSpace: "nowrap" }}>{f.text}</span>
              </div>
            </Note>
          ))}
        </Fade>
      </Drift>
    </AbsoluteFill>
  );
};
