import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, fmt, halo, headline, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER, TABULAR } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ROBUST, robustSd } from "./data";
import { AxisBreak, Bracket, DATA, Drift, lerp, Mark, Pulse, STAT, STAT_INK, Svg, Tag } from "./parts";

/** Nine incomes on one stretch of axis, the tenth past a break. */
const NEAR = { lo: 30, hi: 130, x0: 200, x1: 1340 };
const BREAK_X = 1400;
const FAR_X = 1560;
const STRIP = 560;
const R = 10;
const BOX_H = 76;
const DIST_Y = 770;
/** Where the tenth income sits before it goes wild: just past the others. */
const TAME = 130;
/** The two readouts, top right: what each spread says while the tenth moves. */
const STATS_Y = 392;
const SD_X = 1100;
const IQR_X = 1440;

const xOf = (v: number) => (v > 1000 ? FAR_X : NEAR.x0 + ((v - NEAR.lo) / (NEAR.hi - NEAR.lo)) * (NEAR.x1 - NEAR.x0));

/**
 * Part 2, third scene: ten incomes. The tenth starts at 130 and goes out to
 * the lesson's 9,000, and the standard deviation follows it from 33.1 to
 * 2,828.4; brought back and sent out again, it moves the SD every time and
 * the interquartile range never. The median absolute deviation measures the
 * middle too. Each readout then names the center it goes with.
 */
export const RobustScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const incomesFrom = n.beat("incomes").from;
  const takeAt = n.word("incomes", "ten incomes");
  const nineAt = n.word("incomes", "Nine", { nth: 1 });
  const betweenAt = n.word("incomes", "between");
  const hundredAt = n.word("incomes", "hundred and twenty");
  const eightHundredAt = n.word("sd", "eight hundred");
  const pairAt = n.word("pair", "pair");
  const pairSdAt = n.word("pair", "standard deviation");
  const pairIqrAt = n.word("pair", "IQR");
  const spreadAt = n.word("shape-in", "spread");
  const tenthAt = n.word("incomes", "tenth");
  const thousandAt = n.word("incomes", "nine thousand");
  const sdAt = n.word("sd", "standard deviation");
  const leapsAt = n.word("sd", "leaps");
  const iqrFrom = n.beat("iqr").from;
  const halfAt = n.word("iqr", "middle half");
  const firstAt = n.word("iqr", "first quartile");
  const thirdAt = n.word("iqr", "third");
  const fourteenAt = n.word("iqr", "fourteen");
  const whateverAt = n.word("iqr", "whatever");
  const topAt = n.word("iqr", "top earner");
  const madAt = n.word("mad", "median absolute deviation");
  const typicalAt = n.word("mad", "typical distance");
  const eightAt = n.word("mad", "eight");
  const fromMedianAt = n.word("mad", "median", { nth: 2 });
  const meanGoesAt = n.word("pair", "mean goes");
  const medianGoesAt = n.word("pair", "median goes");
  const stillAt = n.word("shape-in", "center");
  const looksAt = n.word("shape-in", "looks like");

  // ── The tenth income: out to 9,000 on its word, then back to 130 and out
  //    again on "whatever the top earner makes" ──
  const out =
    ease(frame, thousandAt - 4, 24) * (1 - ease(frame, whateverAt - 2, 22) + ease(frame, whateverAt + 34, 22));
  const tenth = TAME * (ROBUST.values[ROBUST.values.length - 1] / TAME) ** out;
  const tenthX = lerp(xOf(TAME), FAR_X, out);
  const sd = robustSd(tenth);
  const roundTrip = ease(frame, whateverAt - 4, 8) * (1 - ease(frame, whateverAt + 60, 10));

  const strip = y(STRIP);
  const dotIn = (i: number) => ease(frame, takeAt - 2 + i * 2.5, 8);
  const box = ease(frame, halfAt - 4, 16);
  const q1x = xOf(ROBUST.q1);
  const q3x = xOf(ROBUST.q3);
  const medX = xOf(ROBUST.median);
  /** The distances from the median: drawn for the MAD, cleared for the pairing. */
  const sticks = ease(frame, typicalAt - 4, 16) * (1 - ease(frame, pairAt - 6, 14));
  const sticksGone = ease(frame, pairAt - 6, 14);
  const dimAll = ease(frame, looksAt - 4, 16) * 0.45;
  const statsY = y(STATS_Y);

  return (
    <AbsoluteFill>
      {/* ── Sound: the incomes, the wild one, the box, the round trip, the distances ── */}
      <Sfx name="el-sprinkle" at={nineAt - 4} level={-34} />
      <Sfx name="el-whoosh" at={thousandAt - 4} level={-33} />
      <Sfx name="el-pencil" at={halfAt - 4} level={-33} />
      <Sfx name="el-tap" at={fourteenAt - 4} level={-29} />
      <Sfx name="el-whoosh" at={whateverAt - 2} level={-36} />
      <Sfx name="el-whoosh" at={whateverAt + 34} level={-36} />
      <Sfx name="el-tap" at={eightAt - 4} level={-29} />

      {/* ── Headlines ── */}
      <div style={{ position: "absolute", left: 92, top: y(150), display: "flex", gap: "0.26em", ...headline(80) }}>
        <Ink at={incomesFrom - 4} dur={20} out={iqrFrom - 6} style={{ position: "relative", whiteSpace: "nowrap" }}>
          One wild value,
        </Ink>
        <Ink at={leapsAt - 6} dur={18} out={iqrFrom - 6} style={{ position: "relative", ...headline(80, true), color: STAT_INK, whiteSpace: "nowrap" }}>
          and the SD follows it.
        </Ink>
      </div>
      <Ink at={iqrFrom - 2} dur={20} style={{ left: 92, top: y(150), ...headline(80), whiteSpace: "nowrap" }}>
        The middle half stays put.
      </Ink>

      <FigLabel n="6" title="Ten incomes" at={incomesFrom} x={160} y={y(330)} />

      <div style={{ position: "absolute", inset: 0, opacity: 1 - dimAll }}>
        {/* ── The two readouts, and the center each one goes with ── */}
        <Ink at={nineAt - 2} dur={14} style={{ left: SD_X, top: statsY, whiteSpace: "nowrap" }}>
          <div style={{ ...note(32, STAT_INK), fontWeight: 700 }}>
            SD <span style={TABULAR}>{fmt(sd, 1)}</span>
          </div>
          <div style={{ ...label(22, STAT_INK), opacity: ease(frame, meanGoesAt - 4, 12), marginTop: 12 }}>
            <Mark at={meanGoesAt - 2}>goes with a mean</Mark>
          </div>
        </Ink>
        <Ink at={fourteenAt - 2} dur={14} style={{ left: IQR_X, top: statsY, whiteSpace: "nowrap" }}>
          <div style={{ ...note(32, INK), fontWeight: 700, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ display: "inline-block", width: 22, height: 22, background: HIGHLIGHT, opacity: 0.8, border: `2px solid ${INK}` }} />
            <span>
              IQR <span style={TABULAR}>{fmt(ROBUST.iqr, 1)}</span>
            </span>
          </div>
          <div style={{ ...label(22, INK), opacity: ease(frame, medianGoesAt - 4, 12), marginTop: 12 }}>
            <Mark at={medianGoesAt - 2}>goes with a median</Mark>
          </div>
        </Ink>

        <Drift from={incomesFrom} to={looksAt + 40} scale={0.02} origin={[700, strip]}>
          {/* The interquartile box. */}
          {box > 0 ? (
            <Svg>
              <rect
                x={medX - (medX - q1x) * box}
                y={strip - BOX_H / 2}
                width={(q3x - q1x) * box}
                height={BOX_H}
                fill={HIGHLIGHT}
                opacity={0.6}
                stroke={INK}
                strokeWidth={2}
              />
            </Svg>
          ) : null}

          {/* The median, and every income's distance from it. */}
          {ease(frame, typicalAt - 4, 16) > 0 ? (
            <Svg>
              <line
                x1={medX}
                x2={medX}
                y1={strip - BOX_H / 2 - 20}
                y2={lerp(strip + 132, strip + BOX_H / 2, sticksGone)}
                stroke={INK}
                strokeWidth={3}
              />
              {ROBUST.values.map((v, i) => {
                const yy = strip + 52 + i * 8;
                const x1 = Math.min(xOf(v), NEAR.x1 + 30);
                return (
                  <line key={i} x1={medX} x2={medX + (x1 - medX) * sticks} y1={yy} y2={yy} stroke={STAT} strokeWidth={2.4} opacity={0.7 * sticks} />
                );
              })}
            </Svg>
          ) : null}
          <Tag x={medX} y={strip - BOX_H / 2 - 54} opacity={ease(frame, typicalAt - 4, 16)} size={21} bold>
            median {fmt(ROBUST.median, 1)}
          </Tag>

          {/* The axis, broken on the way out to the tenth income. */}
          <Svg opacity={ease(frame, incomesFrom + 2, 14)}>
            <line x1={NEAR.x0 - 20} x2={NEAR.x1 + 40} y1={strip + 30} y2={strip + 30} stroke={INK} strokeWidth={1.6} />
            <line x1={1450} x2={1680} y1={strip + 30} y2={strip + 30} stroke={INK} strokeWidth={1.6} />
          </Svg>
          <AxisBreak x={BREAK_X} y={strip + 30} opacity={ease(frame, incomesFrom + 2, 14)} />
          {[40, 80, 120].map((v) => (
            <Tag key={v} x={xOf(v)} y={strip + 42} opacity={ease(frame, incomesFrom + 6, 14) * (1 - sticks)} color={INK_SOFT} size={20}>
              {v}
            </Tag>
          ))}
          <Tag x={FAR_X} y={strip + 42} opacity={ease(frame, thousandAt, 12)} color={INK_SOFT} size={20}>
            9,000
          </Tag>
          <Tag x={tenthX} y={strip - 64} opacity={ease(frame, tenthAt - 2, 12) * (1 - ease(frame, sdAt - 6, 10))} size={23} bold>
            the tenth
          </Tag>
          {/* On the round trip, what the tenth earns, live. */}
          <Tag x={tenthX} y={strip - 64} opacity={roundTrip} color={BLUE_INK} size={23} bold>
            <span style={TABULAR}>{fmt(tenth, 0)}</span>
          </Tag>
          <Pulse x={FAR_X} y={strip} at={thousandAt + 22} color={DATA} r={R} />

          <Svg>
            {ROBUST.values.map((v, i) => {
              const a = dotIn(i);
              if (a <= 0) return null;
              const x = i === ROBUST.values.length - 1 ? tenthX : xOf(v);
              return <circle key={i} cx={x} cy={strip} r={R * a} fill={DATA} stroke={PAPER} strokeWidth={1.6} />;
            })}
          </Svg>
          <Bracket x0={xOf(38) - 12} x1={xOf(120) + 12} y={strip - 34} at={betweenAt - 4} out={halfAt - 6} up />
          <Tag x={(xOf(38) + xOf(120)) / 2} y={strip - 80} opacity={ease(frame, betweenAt, 12) * (1 - ease(frame, halfAt - 6, 10))} size={21}>
            nine between 38 and 120
          </Tag>
          <Pulse x={xOf(120)} y={strip} at={hundredAt + 4} color={DATA} r={R} />
          <Pulse x={(q1x + q3x) / 2} y={strip - BOX_H / 2} at={pairIqrAt - 2} color={INK} r={8} />
          <Pulse x={(q1x + q3x) / 2} y={strip - BOX_H / 2} at={whateverAt + 10} color={INK} r={8} />
          <Pulse x={(q1x + q3x) / 2} y={strip - BOX_H / 2} at={spreadAt - 2} color={INK} r={8} />
          <Pulse x={medX} y={strip - BOX_H / 2 - 20} at={pairAt - 2} color={INK} r={6} />
          <Pulse x={tenthX} y={strip} at={topAt - 2} color={DATA} r={R} />

          {/* The quartiles and their range. */}
          <Tag x={q1x} y={strip + BOX_H / 2 + 50} opacity={ease(frame, firstAt - 2, 12) * (1 - sticks)} size={21}>
            Q1 {fmt(ROBUST.q1, 2)}
          </Tag>
          <Tag x={q3x} y={strip + BOX_H / 2 + 50} opacity={ease(frame, thirdAt - 2, 12) * (1 - sticks)} size={21}>
            Q3 {fmt(ROBUST.q3, 2)}
          </Tag>
          <Bracket x0={q1x} x1={q3x} y={strip - BOX_H / 2 - 16} at={fourteenAt - 6} out={typicalAt - 6} up color={INK} />
          <Tag x={(q1x + q3x) / 2} y={strip - BOX_H / 2 - 64} opacity={ease(frame, fourteenAt - 2, 12) * (1 - ease(frame, typicalAt - 6, 10))} size={23} bold>
            IQR {fmt(ROBUST.iqr, 1)}
          </Tag>
        </Drift>

        {/* The readouts, pointed at as they are named. */}
        <Pulse x={SD_X + 80} y={statsY + 21} at={leapsAt - 2} color={STAT} r={12} />
        <Pulse x={SD_X + 80} y={statsY + 21} at={eightHundredAt - 2} color={STAT} r={12} />
        <Pulse x={SD_X + 80} y={statsY + 21} at={pairSdAt - 2} color={STAT} r={12} />
        <Pulse x={IQR_X + 100} y={statsY + 21} at={whateverAt + 14} color={INK} r={12} />
        <Pulse x={IQR_X + 100} y={statsY + 21} at={pairIqrAt - 2} color={INK} r={12} />

        {/* The median absolute deviation: the middle of the sorted distances. */}
        <Ink at={madAt - 2} dur={14} style={{ left: 160, top: y(DIST_Y) - 46, whiteSpace: "nowrap" }}>
          <span style={label(22, INK)}>Each income's distance from the median, sorted</span>
        </Ink>
        {ROBUST.distances.map((d, i) => {
          const a = ease(frame, typicalAt + i * 2.5, 10);
          if (a <= 0) return null;
          const middle = i === 4 || i === 5;
          const hot = middle ? ease(frame, eightAt - 10, 10) : 0;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 160 + i * 128 + (i === 9 ? 20 : 0),
                top: y(DIST_Y),
                opacity: a,
                transform: `translateY(${(1 - a) * 10 - hot * 6}px)`,
                whiteSpace: "nowrap",
                ...note(28, hot > 0.5 ? STAT_INK : INK),
                fontWeight: hot > 0.5 ? 700 : 500,
              }}
            >
              {fmt(d, 1)}
            </div>
          );
        })}
        <Bracket x0={160 + 4 * 128} x1={160 + 5 * 128 + 60} y={y(DIST_Y) + 46} at={eightAt - 8} color={STAT} />
        <Tag x={160 + 4.5 * 128 + 30} y={y(DIST_Y) + 66} opacity={ease(frame, eightAt - 2, 12)} color={STAT_INK} size={23} bold>
          MAD {fmt(ROBUST.mad, 1)}
        </Tag>
      </div>
      <Pulse x={medX} y={strip - BOX_H / 2 - 20} at={stillAt - 2} color={INK} r={6} />
      <Pulse x={medX} y={strip - BOX_H / 2 - 20} at={fromMedianAt - 2} color={INK} r={6} />
      <Ink at={looksAt - 2} dur={18} style={{ left: 160, top: y(915), whiteSpace: "nowrap" }}>
        <span style={{ ...note(26, INK), ...halo }}>Neither one shows a shape.</span>
      </Ink>
    </AbsoluteFill>
  );
};
