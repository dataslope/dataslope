import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { PEEK, PEEK_RATES, pct } from "./data";
import { at, Axes, Drift, OK_INK, type Scale, Svg } from "./parts";

const BOX = { left: 170, right: 1060, top: 360, bottom: 790 };
const P_MAX = 0.6;
const COL_X = 1190;
const BAR_W = 520;
const RATE_MAX = 0.4;

/**
 * Question 9. Data Analyst Part 7's peeking chart (charts/ab-test-peeking):
 * identical arms, the p-value every hundred visitors, drawn as the
 * narration walks along it: under 0.05 at 800 and again at 2,000, and 0.19
 * at the planned 8,000. Then the video's own 10,000 A/A tests on four
 * schedules, against the 5% a single look promises, and why: every look is
 * another chance at a false positive, so fix n or test sequentially.
 */
export const PeekScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("peek").from;
  const qAt = n.word("peek", "Question");
  const textAt = n.word("peek", "Why fix the sample size");
  const asked = n.word("peek", "Here both arms are identical");
  const everyAt = n.word("peek", "recomputed every hundred visitors");
  const dipAt = n.word("peek", "dips under point oh five");
  const eightHundredAt = n.word("peek", "at eight hundred");
  const twoThousandAt = n.word("peek", "again at two thousand");
  const stopAt = n.word("peek", "Stop at either");
  const noiseAt = n.word("peek", "shipped noise");
  const plannedAt = n.word("peek", "At the planned eight thousand");
  const finalAt = n.word("peek", "point one nine");
  const tenAt = n.word("peek-rate", "Run ten thousand");
  const rateAts = [
    n.word("peek-rate", "Checked once"),
    n.word("peek-rate", "Checked weekly"),
    n.word("peek-rate", "Daily for four weeks"),
    n.word("peek-rate", "Every hundred visitors"),
  ];
  const valueAts = [
    n.word("peek-rate", "four point nine percent"),
    n.word("peek-rate", "twelve"),
    n.word("peek-rate", "twenty-six and a half"),
    n.word("peek-rate", "thirty-five"),
  ];
  const lookAt = n.word("peek-why", "each extra look is one more chance");
  const fixAt = n.word("peek-why", "So fix the sample size in advance");
  const sequentialAt = n.word("peek-why", "or use a sequential test");
  const end = n.beat("peek-why").to;

  const xs: Scale = { lo: 0, hi: PEEK.planned, a: BOX.left, b: BOX.right };
  const ys: Scale = { lo: 0, hi: P_MAX, a: y(BOX.bottom), b: y(BOX.top) };
  // How far along the run the line has been drawn, in visitors per arm.
  const visitors = interpolate(frame, [asked + 6, eightHundredAt, twoThousandAt, plannedAt + 4], [100, 800, 2000, PEEK.planned], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shown = PEEK.rows.filter(([v]) => v <= visitors);
  const path = shown.map(([v, p], i) => `${i ? "L" : "M"}${at(xs, v).toFixed(1)},${at(ys, Math.min(p, P_MAX)).toFixed(1)}`).join(" ");
  const head = shown[shown.length - 1];
  const crossings = [
    { v: 800, at: eightHundredAt },
    { v: 2000, at: twoThousandAt },
  ];
  const pOf = (v: number) => PEEK.rows.find(([x]) => x === v)?.[1] ?? 0;
  const thr = ease(frame, dipAt - 4, 12);

  const rates = [
    { text: "once, at the end", r: PEEK_RATES.once },
    { text: "weekly", r: PEEK_RATES.weekly },
    { text: "daily for four weeks", r: PEEK_RATES.daily },
    { text: "every hundred visitors", r: PEEK_RATES.every100 },
  ];
  const xr = (v: number) => COL_X + (v / RATE_MAX) * BAR_W;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={asked + 6} level={-36} />
      <Sfx name="el-pop" at={eightHundredAt} level={-32} />
      <Sfx name="el-pop" at={twoThousandAt} level={-32} />
      <Sfx name="el-scratch" at={noiseAt} level={-34} />
      {rateAts.map((t, i) => (
        <Sfx key={i} name="el-tap" at={t} level={-38} />
      ))}

      <Drift from={from} to={end + 40}>
        <QuestionCard n={9} at={qAt - 4} textAt={textAt - 4} size={56}>
          Why fix the sample size in advance instead of peeking?
        </QuestionCard>

        <Axes
          x={xs}
          y={ys}
          xTicks={[0, 2000, 4000, 6000, 8000]}
          yTicks={[0, 0.2, 0.4, 0.6]}
          xFormat={(v) => v.toLocaleString("en-US")}
          yFormat={(v) => v.toFixed(1)}
          xTitle="visitors per arm"
          yTitle="p-value"
          at={asked - 4}
        />
        <Note at={everyAt - 2} x={BOX.left + 20} y={y(BOX.top) - h(4)}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>both arms identical · recomputed every 100 visitors</span>
        </Note>
        <Svg>
          <line
            x1={BOX.left}
            x2={BOX.left + (BOX.right - BOX.left) * thr}
            y1={at(ys, 0.05)}
            y2={at(ys, 0.05)}
            stroke={ACCENT}
            strokeWidth={2.2}
            strokeDasharray="7 6"
          />
          <path d={path} fill="none" stroke={BAR} strokeWidth={3} strokeLinejoin="round" />
          {/* The pen's tip, only once the line has started from it. */}
          {head && frame >= asked + 6 ? <circle cx={at(xs, head[0])} cy={at(ys, Math.min(head[1], P_MAX))} r={6} fill={BAR} /> : null}
          {crossings.map((c) => {
            const s = ease(frame, c.at, 10);
            if (s <= 0) return null;
            return <circle key={c.v} cx={at(xs, c.v)} cy={at(ys, pOf(c.v))} r={11 * s} fill="none" stroke={ACCENT} strokeWidth={3} />;
          })}
          {frame >= finalAt - 2 ? (
            <circle cx={at(xs, PEEK.planned)} cy={at(ys, PEEK.final)} r={10 * ease(frame, finalAt - 2, 10)} fill={BLUE_INK} />
          ) : null}
        </Svg>
        <Note at={dipAt} x={BOX.right} y={at(ys, 0.05) - h(36)} width={150} align="right">
          <span style={{ ...label(21, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>p = 0.05</span>
        </Note>
        {/* The two crossings are named in the open space above the dip, where
            no part of the line runs through them. */}
        <Note at={eightHundredAt} x={at(xs, 800) + 20} y={y(426)}>
          <span style={{ ...note(25, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            under 0.05 at 800<span style={{ opacity: ease(frame, twoThousandAt, 8) }}>, and again at 2,000</span>
          </span>
        </Note>
        <Note at={stopAt} x={at(xs, 800) + 20} y={y(470)}>
          <span style={{ ...note(25, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            stop at either<span style={{ opacity: ease(frame, noiseAt, 8) }}>: you&apos;ve shipped noise</span>
          </span>
        </Note>
        <Note at={finalAt} x={at(xs, PEEK.planned) - 14} y={at(ys, PEEK.final) + h(16)} width={250} align="right">
          <span style={{ ...note(25, BLUE_INK), fontWeight: 700, whiteSpace: "nowrap", ...TABULAR }}>
            planned end: {PEEK.final.toFixed(2)}
          </span>
        </Note>

        {/* Ten thousand A/A tests, four ways of looking. */}
        <Note at={tenAt} x={COL_X} y={y(360)}>
          <span style={{ ...note(26, INK), fontWeight: 700, whiteSpace: "nowrap", ...TABULAR }}>
            {PEEK_RATES.sims.toLocaleString("en-US")} A/A tests, significant when checked…
          </span>
        </Note>
        {rates.map((r, i) => {
          const p = ease(frame, rateAts[i] - 2, 10);
          if (p <= 0) return null;
          const grow = ease(frame, valueAts[i] - 8, 14);
          const top = y(420) + i * h(98);
          const bad = r.r.rate > 0.06;
          return (
            <React.Fragment key={r.text}>
              <div style={{ position: "absolute", left: COL_X, top, ...note(23, INK), whiteSpace: "nowrap", opacity: p, ...TABULAR }}>
                {r.text}
                <span style={{ ...label(19, INK_SOFT) }}> · {r.r.looks} {r.r.looks === 1 ? "look" : "looks"}</span>
              </div>
              <div
                style={{
                  position: "absolute",
                  left: COL_X,
                  top: top + h(36),
                  width: (xr(r.r.rate) - COL_X) * grow,
                  height: h(34),
                  borderRadius: 3,
                  background: bad ? ACCENT : BAR,
                  opacity: 0.85,
                }}
              />
              {/* The 5% a single look promises, marked across this bar only. */}
              <Svg opacity={ease(frame, valueAts[0], 12)}>
                <line x1={xr(0.05)} x2={xr(0.05)} y1={top + h(28)} y2={top + h(78)} stroke={INK} strokeWidth={1.8} strokeDasharray="4 5" />
              </Svg>
              <Note at={valueAts[i]} x={Math.max(xr(r.r.rate), xr(0.05) + 6) + 12} y={top + h(36)}>
                <span style={{ ...note(25, bad ? ACCENT_INK : BLUE_INK), fontWeight: 700, whiteSpace: "nowrap", ...TABULAR }}>
                  {pct(r.r.rate, 1)}
                </span>
              </Note>
            </React.Fragment>
          );
        })}
        <Note at={valueAts[0] + 4} x={xr(0.05) - 80} y={y(812)} width={160} style={{ textAlign: "center" }}>
          <span style={{ ...label(20, INK), fontWeight: 700, whiteSpace: "nowrap" }}>5% promised</span>
        </Note>

        {/* Why the bars grow, and what to do instead. */}
        <Note at={lookAt} x={COL_X} y={y(858)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>each look: one more chance at a false positive</span>
        </Note>
        <Note at={fixAt} x={COL_X} y={y(896)}>
          <span style={{ ...note(25, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            fix n in advance<span style={{ opacity: ease(frame, sequentialAt, 8) }}>, or test sequentially</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
