import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { fmt, halo, headline, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ROBUST } from "./data";
import { AxisBreak, Bracket, DATA, Drift, Mark, Pulse, STAT, STAT_INK, Svg, Tag, counted } from "./parts";

/** Nine incomes on one stretch of axis, the tenth past a break. */
const NEAR = { lo: 30, hi: 130, x0: 200, x1: 1340 };
const BREAK_X = 1400;
const FAR_X = 1560;
const STRIP = 560;
const R = 10;
const BOX_H = 76;
const DIST_Y = 770;

const xOf = (v: number) => (v > 1000 ? FAR_X : NEAR.x0 + ((v - NEAR.lo) / (NEAR.hi - NEAR.lo)) * (NEAR.x1 - NEAR.x0));

/**
 * Part 2, third scene: ten incomes, one of them 9,000. The standard
 * deviation follows the wild one; the interquartile range and the median
 * absolute deviation measure the middle and don't move.
 */
export const RobustScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const incomesFrom = n.beat("incomes").from;
  const takeAt = n.word("incomes", "ten incomes");
  const nineAt = n.word("incomes", "Nine");
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
  const topAt = n.word("iqr", "top earner");
  const madAt = n.word("mad", "median absolute deviation");
  const typicalAt = n.word("mad", "typical distance");
  const eightAt = n.word("mad", "eight");
  const meanGoesAt = n.word("pair", "mean goes");
  const medianGoesAt = n.word("pair", "median goes");
  const stillAt = n.word("shape-in", "center");
  const looksAt = n.word("shape-in", "looks like");

  const strip = y(STRIP);
  const dotIn = (i: number) =>
    i === ROBUST.values.length - 1 ? ease(frame, tenthAt - 2, 12) : ease(frame, takeAt - 2 + i * 2.5, 8);
  const box = ease(frame, halfAt - 4, 16);
  const q1x = xOf(ROBUST.q1);
  const q3x = xOf(ROBUST.q3);
  const medX = xOf(ROBUST.median);
  const sticks = ease(frame, typicalAt - 4, 16);
  const dimAll = ease(frame, looksAt - 4, 16) * 0.45;

  return (
    <AbsoluteFill>
      {/* ── Sound: the incomes, the wild one, the box, the distances ── */}
      <Sfx name="el-sprinkle" at={nineAt - 4} level={-34} />
      <Sfx name="el-pop" at={tenthAt - 2} level={-29} />
      <Sfx name="el-whoosh" at={leapsAt - 4} level={-33} />
      <Sfx name="el-pencil" at={halfAt - 4} level={-33} />
      <Sfx name="el-tap" at={fourteenAt - 4} level={-29} />
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
          {sticks > 0 ? (
            <Svg>
              <line x1={medX} x2={medX} y1={strip - BOX_H / 2 - 20} y2={strip + 132} stroke={INK} strokeWidth={3} />
              {ROBUST.values.map((v, i) => {
                const yy = strip + 52 + i * 8;
                const x1 = Math.min(xOf(v), NEAR.x1 + 30);
                return <line key={i} x1={medX} x2={medX + (x1 - medX) * sticks} y1={yy} y2={yy} stroke={STAT} strokeWidth={2.4} opacity={0.7} />;
              })}
            </Svg>
          ) : null}
          <Tag x={medX} y={strip - BOX_H / 2 - 54} opacity={sticks} size={21} bold>
            median {fmt(ROBUST.median, 1)}
          </Tag>

          {/* The axis, broken on the way out to the tenth income. */}
          <Svg opacity={ease(frame, incomesFrom + 2, 14)}>
            <line x1={NEAR.x0 - 20} x2={NEAR.x1 + 40} y1={strip + 30} y2={strip + 30} stroke={INK} strokeWidth={1.6} />
            <line x1={1450} x2={1680} y1={strip + 30} y2={strip + 30} stroke={INK} strokeWidth={1.6} />
          </Svg>
          <AxisBreak x={BREAK_X} y={strip + 30} opacity={ease(frame, tenthAt - 4, 12)} />
          {[40, 80, 120].map((v) => (
            <Tag key={v} x={xOf(v)} y={strip + 42} opacity={ease(frame, incomesFrom + 6, 14) * (1 - sticks)} color={INK_SOFT} size={20}>
              {v}
            </Tag>
          ))}
          <Tag x={FAR_X} y={strip + 42} opacity={ease(frame, thousandAt, 12)} color={INK_SOFT} size={20}>
            9,000
          </Tag>

          <Svg>
            {ROBUST.values.map((v, i) => {
              const a = dotIn(i);
              if (a <= 0) return null;
              const drop = i === ROBUST.values.length - 1 ? (1 - a) * -60 : 0;
              return <circle key={i} cx={xOf(v)} cy={strip + drop} r={R * a} fill={DATA} stroke={PAPER} strokeWidth={1.6} />;
            })}
          </Svg>
          <Bracket x0={xOf(38) - 12} x1={xOf(120) + 12} y={strip - 34} at={betweenAt - 4} out={halfAt - 6} up />
          <Tag x={(xOf(38) + xOf(120)) / 2} y={strip - 80} opacity={ease(frame, betweenAt, 12) * (1 - ease(frame, halfAt - 6, 10))} size={21}>
            nine between 38 and 120
          </Tag>
          <Pulse x={xOf(120)} y={strip} at={hundredAt + 4} color={DATA} r={R} />
          <Pulse x={FAR_X} y={strip - 108} at={eightHundredAt - 2} color={STAT} r={10} />
          <Pulse x={FAR_X} y={strip - 108} at={pairSdAt - 2} color={STAT} r={10} />
          <Pulse x={(q1x + q3x) / 2} y={strip - BOX_H / 2} at={pairIqrAt - 2} color={INK} r={8} />
          <Pulse x={(q1x + q3x) / 2} y={strip - BOX_H / 2} at={spreadAt - 2} color={INK} r={8} />
          <Pulse x={medX} y={strip - BOX_H / 2 - 20} at={pairAt - 2} color={INK} r={6} />
          <Pulse x={FAR_X} y={strip} at={topAt - 2} color={DATA} r={R} />
          <Pulse x={FAR_X} y={strip} at={topAt + 10} color={DATA} r={R} />

          {/* The standard deviation, wrecked. */}
          <Tag x={FAR_X} y={strip - 120} opacity={ease(frame, sdAt - 4, 12)} color={STAT_INK} size={24} bold>
            SD {counted(frame, leapsAt - 4, 0, ROBUST.sd, 1, 44)}
          </Tag>

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

        {/* Which spread goes with which center. */}
        {[
          { text: "Mean with standard deviation", at: meanGoesAt, red: true },
          { text: "Median with IQR", at: medianGoesAt, red: false },
        ].map((c, i) => {
          const p = ease(frame, c.at - 6, 14);
          if (p <= 0) return null;
          return (
            <div
              key={c.text}
              style={{
                position: "absolute",
                left: 1180,
                top: y(870) + i * 46,
                opacity: p,
                transform: `translateX(${(1 - p) * 20}px)`,
                whiteSpace: "nowrap",
                ...label(25, c.red ? STAT_INK : INK),
                fontWeight: 650,
                ...halo,
              }}
            >
              <Mark at={c.at - 2} out={c.at + 40}>
                {c.text}
              </Mark>
            </div>
          );
        })}
      </div>
      <Pulse x={medX} y={strip - BOX_H / 2 - 20} at={stillAt - 2} color={INK} r={6} />
      <Ink at={looksAt - 2} dur={18} style={{ left: 160, top: y(915), whiteSpace: "nowrap" }}>
        <span style={{ ...note(26, INK), ...halo }}>Neither one shows a shape.</span>
      </Ink>
    </AbsoluteFill>
  );
};
