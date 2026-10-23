import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { pct, SPRT } from "./data";
import { at, Axes, Curve, Drift, Mark, OK, OK_INK, type Scale, Svg } from "./parts";

const BOX = { left: 190, right: 1100, top: 340, bottom: 800 };
const PAIRS = 300;
const COL_X = 1210;
const BAR_W = 500;

/**
 * Question 10. The SPRT on pairs of users, one from each arm: the running
 * log likelihood ratio of "an effect of 0.2 SD" against "no effect" between
 * Wald's boundaries for 2.5% and 20%. One run with the effect crosses the
 * top; one without crosses the bottom. Then 2,000 runs each way: 2.1% false
 * positives, and 262 pairs on average against the fixed test's 393.
 */
export const SprtScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("sprt").from;
  const qAt = n.word("sprt", "Question");
  const textAt = n.word("sprt", "What is a sequential probability ratio test");
  const tracksAt = n.word("sprt", "tracks the likelihood ratio");
  const h0At = n.word("sprt", "no effect");
  const h1At = n.word("sprt", "the effect you designed for");
  const boundsAt = n.word("sprt", "against boundaries fixed before the start");
  const topAt = n.word("sprt", "Cross the top line");
  const concludeAt = n.word("sprt", "you conclude there's an effect");
  const bottomAt = n.word("sprt", "Cross the bottom");
  const betweenAt = n.word("sprt", "In between, you keep going");
  const runAt = n.word("sprt-cost", "Run it two thousand times");
  const wrongAt = n.word("sprt-cost", "wrongly finds an effect");
  const builtAt = n.word("sprt-cost", "within the two and a half");
  const realAt = n.word("sprt-cost", "when the effect is real");
  const pairsAt = n.word("sprt-cost", "two hundred sixty-two pairs");
  const fixedAt = n.word("sprt-cost", "three hundred ninety-three for the fixed test");
  const cheaperAt = n.word("cuped-in", "makes every test cheaper");
  const clearAt = n.beat("cuped-in").to - 6;

  const clear = 1 - ease(frame, clearAt, 10);
  const xs: Scale = { lo: 0, hi: PAIRS, a: BOX.left, b: BOX.right };
  const ys: Scale = { lo: -2.2, hi: 4.2, a: y(BOX.bottom), b: y(BOX.top) };
  const effect = SPRT.examples.effect.path.map((v, i) => [i, v] as const);
  const none = SPRT.examples.none.path.map((v, i) => [i, v] as const);
  const bounds = ease(frame, boundsAt, 16);
  const band = ease(frame, betweenAt - 2, 14);

  const bars = [
    { text: "the SPRT, on average", v: SPRT.meanH1, at: pairsAt, color: OK, ink: OK_INK },
    { text: "the fixed test", v: SPRT.fixed, at: fixedAt, color: BAR, ink: BLUE_INK },
  ];
  const xb = (v: number) => COL_X + (v / 400) * BAR_W;

  return (
    <AbsoluteFill style={{ opacity: clear }}>
      <Sfx name="el-pencil" at={tracksAt} level={-36} />
      <Sfx name="el-pop" at={concludeAt} level={-34} />
      <Sfx name="el-pop" at={bottomAt + 18} level={-36} />
      <Sfx name="el-tap" at={wrongAt} level={-36} />
      <Sfx name="el-pop" at={pairsAt} level={-32} />

      <Drift from={from} to={n.beat("cuped-in").to + 30}>
        <QuestionCard n={10} at={qAt - 4} textAt={textAt - 4} size={58}>
          What is a sequential probability ratio test (SPRT)?
        </QuestionCard>

        <Axes
          x={xs}
          y={ys}
          xTicks={[0, 100, 200, 300]}
          yTicks={[-2, 0, 2, 4]}
          yFormat={(v) => (v < 0 ? `−${-v}` : `${v}`)}
          xTitle="pairs of users, one from each arm"
          yTitle="log likelihood ratio"
          at={tracksAt - 4}
        />
        <Svg>
          <rect
            x={BOX.left}
            y={at(ys, SPRT.upper)}
            width={(BOX.right - BOX.left) * band}
            height={at(ys, SPRT.lower) - at(ys, SPRT.upper)}
            fill={HIGHLIGHT}
            opacity={0.35 * band}
          />
          <line x1={BOX.left} x2={BOX.left + (BOX.right - BOX.left) * bounds} y1={at(ys, SPRT.upper)} y2={at(ys, SPRT.upper)} stroke={OK} strokeWidth={2.6} strokeDasharray="8 6" />
          <line x1={BOX.left} x2={BOX.left + (BOX.right - BOX.left) * bounds} y1={at(ys, SPRT.lower)} y2={at(ys, SPRT.lower)} stroke={INK} strokeWidth={2.6} strokeDasharray="8 6" />
        </Svg>
        <Note at={boundsAt + 6} x={BOX.right - 6} y={at(ys, SPRT.upper) - h(40)} width={320} align="right">
          <span style={{ ...label(21, OK_INK), fontWeight: 700, whiteSpace: "nowrap", ...TABULAR }}>stop: an effect ({SPRT.upper.toFixed(2)})</span>
        </Note>
        <Note at={boundsAt + 10} x={BOX.right - 6} y={at(ys, SPRT.lower) + h(18)} width={320} align="right">
          <span style={{ ...label(21, INK), fontWeight: 700, whiteSpace: "nowrap", ...TABULAR }}>stop: no effect (−{(-SPRT.lower).toFixed(2)})</span>
        </Note>
        <Curve points={effect} x={xs} y={ys} at={topAt - 2} dur={Math.max(20, concludeAt - topAt + 6)} color={BAR} width={2.6} />
        <Curve points={none} x={xs} y={ys} at={bottomAt - 2} dur={22} color={INK_SOFT} width={2.6} />
        <Svg>
          <circle cx={at(xs, SPRT.examples.effect.n)} cy={at(ys, SPRT.upper)} r={9 * ease(frame, concludeAt, 10)} fill={OK} />
          <circle cx={at(xs, SPRT.examples.none.n)} cy={at(ys, SPRT.lower)} r={9 * ease(frame, bottomAt + 18, 10)} fill={INK} />
        </Svg>
        <Note at={betweenAt} x={BOX.left + 20} y={at(ys, 2.7)}>
          <span style={{ ...note(24, INK), fontWeight: 650, whiteSpace: "nowrap" }}>in between: keep going</span>
        </Note>

        {/* The two hypotheses, and what 2,000 runs each way cost. */}
        <Note at={h0At - 2} x={COL_X} y={y(340)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            <b>H₀</b> no effect
          </span>
        </Note>
        <Note at={h1At - 2} x={COL_X} y={y(384)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            <b>H₁</b> the effect designed for, 0.2 SD
          </span>
        </Note>
        <Note at={runAt} x={COL_X} y={y(470)}>
          <span style={{ ...note(25, INK_SOFT), whiteSpace: "nowrap", ...TABULAR }}>2,000 runs each way</span>
        </Note>
        <Note at={wrongAt} x={COL_X} y={y(514)}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap", ...TABULAR }}>
            false positives <b style={{ color: ACCENT_INK }}>{pct(SPRT.falsePositive, 1)}</b>
            <span style={{ ...note(23, INK_SOFT), opacity: ease(frame, builtAt, 10) }}> · built for 2.5%</span>
          </span>
        </Note>
        <Note at={realAt} x={COL_X} y={y(590)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>pairs needed when the effect is real</span>
        </Note>
        {bars.map((b, i) => {
          const p = ease(frame, b.at - 4, 14);
          if (p <= 0) return null;
          const top = y(640) + i * h(92);
          return (
            <React.Fragment key={b.text}>
              <div style={{ position: "absolute", left: COL_X, top, ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap", opacity: p }}>{b.text}</div>
              <div
                style={{ position: "absolute", left: COL_X, top: top + h(30), width: (xb(b.v) - COL_X) * p, height: h(34), background: b.color, opacity: 0.85, borderRadius: 3 }}
              />
              <Note at={b.at} x={xb(b.v) + 12} y={top + h(30)}>
                <span style={{ ...note(26, b.ink), fontWeight: 700, whiteSpace: "nowrap", ...TABULAR }}>
                  {i === 0 ? <Mark at={cheaperAt - 4}>{String(b.v)}</Mark> : b.v}
                </span>
              </Note>
            </React.Fragment>
          );
        })}
      </Drift>
    </AbsoluteFill>
  );
};
