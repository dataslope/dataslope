import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, HIGHLIGHT, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { NOISE, num } from "./data";
import { at, Axes, Clear, DATA, DATA_LIGHT, Drift, madeUp, Mark, type Scale, Svg, WARM, WARM_INK, X0 } from "./parts";

const CHART = { x0: X0 + 100, x1: 1150, top: 360, bottom: 740 };
const SIDE_X = 1260;

/**
 * Question 7 on eight simulated ordinary weeks of the made-up app's daily
 * users (seed 7): the band the metric moves in with nothing wrong, a 2% dip
 * sitting well inside it, and the 24 of 56 days that moved further than that.
 * Then the three things a real shift does that noise doesn't.
 */
export const NoiseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("noise").from;
  const qAt = n.word("noise", "Question");
  const textAt = n.word("noise", "How do you decide");
  const measureAt = n.word("noise", "Measure the normal swing first");
  const threeAt = n.word("noise-band", "about three percent");
  const dipAt = n.word("noise-band", "a two percent dip");
  const insideAt = n.word("noise-band", "well inside its band");
  const weeksAt = n.word("noise-band", "In eight simulated weeks");
  const countAt = n.word("noise-band", "twenty-four days moved further");
  const real = [
    { text: "persists for days", at: n.word("noise-real", "persists for days") },
    { text: "clears the band", at: n.word("noise-real", "clears the band") },
    { text: "shows up in related metrics too", at: n.word("noise-real", "shows up in related metrics") },
  ];
  const testingAt = n.word("rec-in", "testing a change");
  const cantAt = n.word("rec-in", "when you can't");
  const end = n.beat("rec-in").to;

  const days = NOISE.values.length;
  const xs: Scale = { lo: 1, hi: days + 1, a: CHART.x0, b: CHART.x1 };
  const ys: Scale = { lo: 90_000, hi: 110_000, a: y(CHART.bottom), b: y(CHART.top) };
  const band = ease(frame, threeAt, 16);
  const today = ease(frame, dipAt, 12);
  const ring = ease(frame, countAt, 14);
  const beyond = (v: number) => Math.abs(v - NOISE.mean) / NOISE.mean > 0.02;

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={measureAt} level={-34} />
      <Sfx name="slide" at={threeAt} level={-34} />
      <Sfx name="el-pop" at={dipAt + 2} level={-32} />
      <Sfx name="el-sprinkle" at={countAt} level={-36} />
      {real.map((r) => (
        <Sfx key={r.text} name="el-tap" at={r.at + 2} level={-34} />
      ))}

      <Drift from={from} to={end + 40}>
        <QuestionCard n={7} at={qAt - 4} textAt={textAt - 4} size={60}>
          How do you decide whether a change is signal or noise?
        </QuestionCard>

        <Clear at={cantAt}>
          <Axes
            x={xs}
            y={ys}
            xTicks={[1, 15, 29, 43, 57]}
            yTicks={[95_000, 100_000, 105_000]}
            xFormat={(v) => (v === 57 ? "today" : `day ${v}`)}
            yFormat={(v) => `${v / 1000}k`}
            at={measureAt - 6}
          />
          <Svg>
            {/* The band the metric lives in on an ordinary day. */}
            <rect
              x={CHART.x0}
              width={(CHART.x1 - CHART.x0) * band}
              y={at(ys, NOISE.band[1])}
              height={at(ys, NOISE.band[0]) - at(ys, NOISE.band[1])}
              fill={DATA_LIGHT}
              opacity={0.45 * band}
            />
            <line
              x1={CHART.x0}
              x2={CHART.x0 + (CHART.x1 - CHART.x0) * band}
              y1={at(ys, NOISE.mean)}
              y2={at(ys, NOISE.mean)}
              stroke={BLUE_INK}
              strokeWidth={1.6}
              strokeDasharray="5 6"
            />
            {NOISE.values.map((v, i) => {
              const p = ease(frame, measureAt + i * 0.5, 8);
              if (p <= 0) return null;
              const cx = at(xs, i + 1);
              const cy = at(ys, v);
              const out = beyond(v);
              return (
                <g key={i}>
                  {out ? <circle cx={cx} cy={cy} r={11 * ring} fill="none" stroke={WARM} strokeWidth={2.4} opacity={ring} /> : null}
                  <circle cx={cx} cy={cy} r={6 * p} fill={DATA} opacity={0.8} />
                </g>
              );
            })}
            {/* Today: down 2%, inside the band. */}
            {today > 0 ? (
              <>
                <circle cx={at(xs, days + 1)} cy={at(ys, NOISE.today)} r={20 * today} fill={HIGHLIGHT} opacity={0.9} />
                <circle cx={at(xs, days + 1)} cy={at(ys, NOISE.today)} r={8 * today} fill={INK} />
              </>
            ) : null}
          </Svg>
          <Note at={threeAt + 8} x={CHART.x0 + 12} y={at(ys, NOISE.band[1]) - h(36)}>
            <span style={{ ...label(21, BLUE_INK), fontWeight: 700, whiteSpace: "nowrap" }}>its normal band</span>
          </Note>
          <Note at={dipAt + 6} x={at(xs, days + 1) - 24} align="right" y={at(ys, NOISE.today) + h(18)}>
            <span style={{ ...note(26, INK), fontWeight: 700, whiteSpace: "nowrap" }}>
              <Mark at={insideAt}>today: −2%, inside it</Mark>
            </span>
          </Note>
          <Note at={weeksAt} x={CHART.x0} y={y(CHART.bottom) + h(64)}>
            <span style={madeUp()}>simulated: 8 ordinary weeks of the made-up app, nothing wrong</span>
          </Note>

          <Note at={threeAt} x={SIDE_X} y={y(370)}>
            <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>an ordinary day: about ±3%</span>
          </Note>
          <Note at={threeAt + 6} x={SIDE_X} y={y(412)}>
            <span style={{ ...label(21, INK_SOFT), ...TABULAR, whiteSpace: "nowrap" }}>
              standard deviation {(NOISE.sdShare * 100).toFixed(1)}% of {num(NOISE.mean)}
            </span>
          </Note>
          <Note at={countAt + 4} x={SIDE_X} y={y(470)}>
            <span style={{ ...note(28, WARM_INK), fontWeight: 700, ...TABULAR, whiteSpace: "nowrap" }}>
              <Mark at={testingAt} color={`color-mix(in srgb, ${WARM} 22%, transparent)`}>
                {NOISE.beyondTwo} of {NOISE.days} days moved more than 2%
              </Mark>
            </span>
          </Note>

          <Note at={real[0].at - 4} x={SIDE_X} y={y(560)}>
            <span style={{ ...note(28, INK), fontWeight: 650, whiteSpace: "nowrap" }}>A real shift:</span>
          </Note>
          {real.map((r, i) => (
            <Note key={r.text} at={r.at - 2} x={SIDE_X} y={y(614) + i * h(54)}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <Tick at={r.at + 4} size={28} />
                <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>{r.text}</span>
              </div>
            </Note>
          ))}
        </Clear>
      </Drift>
    </AbsoluteFill>
  );
};
