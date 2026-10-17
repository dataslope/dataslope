import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { BAR, body, fmt, halo, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { DAY_NAMES, DAYS, jitter, TIPS } from "./data";
import { Headline, Kicker, lerp, Marker, Ring, Spot, STAT, STAT_INK, Svg } from "./parts";

/** The bills: tip as a share of the bill, 0 to 45%. One bill (71%) runs off
 *  the end and is pinned there, labelled. */
const X: XScale = { lo: 0, hi: 45, x0: 330, x1: 1230 };
/** Each day's average (then median), enlarged. */
const X2: XScale = { lo: 13, hi: 20, x0: 1410, x1: 1790 };
const ROW_Y = [430, 520, 610, 700];
const ALL_Y = 565;
const AXIS = 770;
const JIT = 26;
const OFF_END = X.x1 + 34;

const JIT_ALL = jitter(91, TIPS.rows);
const JIT_ROW = jitter(92, TIPS.rows);
const FRI = DAYS.indexOf("Fri");
const SAT = DAYS.indexOf("Sat");
const SUN = DAYS.indexOf("Sun");

/** "16.99%" */
const pct = (v: number) => `${fmt(v)}%`;

/**
 * Part 1 opens on Unit 8's bridge as a puzzle, then looks: 244 bills, split
 * by day; Friday's average leads, on only nineteen bills, with the widest
 * wobble; the median crowns Sunday instead. A lead, not a finding.
 */
export const LookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const hookFrom = n.beat("hook").from;
  const beforeAt = n.word("hook", "before");
  const adviceAt = n.word("hook", "Good advice");
  const lookingAt = n.word("hook", "without looking");
  const howAt = n.word("hook", "how");
  const billsFrom = n.beat("bills").from;
  const countAt = n.word("bills", "two hundred");
  const restaurantAt = n.word("bills", "restaurant");
  const tipAt = n.word("bills", "tip");
  const splitAt = n.word("days", "Split");
  const standsAt = n.word("days", "stands out");
  const fridayAt = n.word("days", "Friday");
  const seventeenAt = n.word("days", "seventeen");
  const fifteenAt = n.word("days", "fifteen");
  const nineteenAt = n.word("few", "nineteen");
  const fewFridayAt = n.word("few", "Friday");
  const wobblesAt = n.word("few", "wobbles");
  const medianAt = n.word("median", "median");
  const sundayAt = n.word("median", "Sunday");
  const findingAt = n.word("lead", "finding");
  const leadAt = n.word("lead", "lead");
  const questionAt = n.word("lead", "question");
  const jobsAt = n.word("jobs-in", "two different jobs");
  const hereAt = n.word("jobs-in", "here");

  // ── State ──
  const split = (i: number) => ease(frame, splitAt - 4 + (i % 61) * 0.25, 18);
  const medianT = ease(frame, medianAt - 2, 20);
  const meansIn = ease(frame, standsAt - 6, 12);
  const band = ease(frame, fridayAt - 6, 12) * (1 - ease(frame, findingAt - 6, 14));
  const bandRow = lerp(ROW_Y[FRI], ROW_Y[SUN], ease(frame, sundayAt - 6, 16));
  const whisk = ease(frame, wobblesAt - 6, 16) * (1 - ease(frame, medianAt - 6, 12));
  const dimRows = ease(frame, nineteenAt - 4, 12) * (1 - ease(frame, medianAt - 6, 12));
  const figDim = 1 - 0.55 * ease(frame, jobsAt - 4, 16);

  const value = (k: number) => {
    const d = TIPS.byDay[DAYS[k]];
    return lerp(d.mean, d.median, medianT);
  };

  return (
    <AbsoluteFill>
      {/* ── Sound: the bills landing, the split, the averages, the wobble, the swap ── */}
      <Sfx name="el-sprinkle" at={countAt - 2} level={-33} />
      <Sfx name="el-pop" at={restaurantAt - 6} level={-30} />
      <Sfx name="el-whoosh" at={splitAt - 4} level={-33} />
      <Sfx name="el-tap" at={fridayAt - 6} level={-28} />
      <Sfx name="el-pencil" at={wobblesAt - 6} level={-34} />
      <Sfx name="el-whoosh" at={medianAt - 2} level={-34} />

      <Kicker at={hookFrom - 10}>Exploring, then confirming</Kicker>

      {/* ── Headlines ── */}
      <Headline
        lead={<Marker at={adviceAt - 4}>Decide what to test</Marker>}
        turn={<Marker at={adviceAt + 4}>before you look.</Marker>}
        at={hookFrom - 8}
        turnAt={beforeAt - 4}
        out={billsFrom - 6}
      />
      <Ink at={howAt - 4} dur={18} out={billsFrom - 6} style={{ left: 96, top: y(262), whiteSpace: "nowrap" }}>
        <span style={{ ...body(40, true), color: STAT_INK }}>
          But how do you know what to test, <Marker at={lookingAt - 2}>without looking?</Marker>
        </span>
      </Ink>
      <Headline lead="Friday tips best." turn="Or does it?" at={fridayAt - 4} turnAt={nineteenAt - 4} out={findingAt - 8} />
      <Headline lead="Not a finding." turn="A lead." at={findingAt - 4} turnAt={leadAt - 4} out={hereAt - 2} />

      <Spot id="statistics-in-practice-bill" at={restaurantAt - 6} left={1560} top={y(92)} width={250} height={232} />

      <div style={{ position: "absolute", inset: 0, opacity: figDim }}>
        <FigLabel n="1" title={`${TIPS.rows} restaurant bills: the tip, as a share of the bill`} at={countAt - 8} x={160} y={y(330)} />

        {/* Friday's row, then Sunday's: the day the narration is reading. */}
        {band > 0 ? (
          <Svg opacity={band * 0.5}>
            <rect x={150} y={y(bandRow) - h(38)} width={1660} height={h(76)} rx={8} fill={HIGHLIGHT} />
          </Svg>
        ) : null}

        <Axis
          scale={X}
          base={y(AXIS)}
          ticks={[0, 10, 20, 30, 40]}
          format={(v) => `${v}%`}
          at={countAt - 6}
        />
        <Note at={tipAt} x={X.x1} y={y(AXIS) + 40} align="right">
          <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>tip, as a share of the bill</span>
        </Note>

        {/* Before the split: one strip of every bill. */}
        <Note at={countAt + 6} out={splitAt - 2} x={160} y={y(ALL_Y) - 14}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>All {TIPS.rows}</span>
        </Note>

        {/* ── The bills ── */}
        <Svg>
          {TIPS.billPct.map((v, i) => {
            const a = ease(frame, countAt - 2 + i * 0.12, 8);
            if (a <= 0) return null;
            const k = TIPS.billDay[i];
            const s = split(i);
            const x = v > X.hi ? OFF_END : sx(X, v);
            const yAll = y(ALL_Y) + h((JIT_ALL[i] - 0.5) * 2 * JIT * 1.6);
            const yRow = y(ROW_Y[k]) + h((JIT_ROW[i] - 0.5) * 2 * JIT);
            const dim = k === FRI ? 0 : dimRows * 0.55;
            return (
              <circle
                key={i}
                cx={x}
                cy={lerp(yAll, yRow, s)}
                r={5.2 * a}
                fill={k === FRI && dimRows > 0 ? BAR : `color-mix(in srgb, ${INK} 58%, transparent)`}
                stroke={PAPER}
                strokeWidth={1}
                opacity={1 - dim}
              />
            );
          })}
        </Svg>
        <Note at={splitAt + 16} x={OFF_END - 10} y={y(ROW_Y[SUN]) - 46} from="up">
          <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>{Math.round(TIPS.max)}%</span>
        </Note>

        {/* ── Row labels, and each day's count ── */}
        {DAYS.map((d, k) => (
          <React.Fragment key={d}>
            <Ink at={splitAt + k * 4} dur={12} style={{ left: 160, top: y(ROW_Y[k]) - 26, whiteSpace: "nowrap" }}>
              <span style={label(22, INK)}>{DAY_NAMES[d]}</span>
            </Ink>
            <Note at={nineteenAt - 2 + (k === FRI ? 0 : 6 + k * 2)} x={160} y={y(ROW_Y[k]) + 6}>
              <span
                style={{
                  ...note(20, k === FRI ? STAT_INK : INK_SOFT),
                  fontWeight: k === FRI ? 700 : 500,
                  whiteSpace: "nowrap",
                }}
              >
                {TIPS.byDay[d].count} bills
              </span>
            </Note>
          </React.Fragment>
        ))}
        <Ring x={200} y={y(ROW_Y[FRI]) + 18} at={fewFridayAt - 4} r0={14} r1={60} />

        {/* Each day's average (then median), in the strips. */}
        {meansIn > 0 ? (
          <Svg opacity={meansIn}>
            {DAYS.map((d, k) => {
              const x = sx(X, value(k));
              return (
                <line
                  key={d}
                  x1={x}
                  x2={x}
                  y1={y(ROW_Y[k]) - h(34)}
                  y2={y(ROW_Y[k]) + h(34)}
                  stroke={STAT}
                  strokeWidth={4}
                  strokeLinecap="round"
                />
              );
            })}
          </Svg>
        ) : null}

        {/* ── The enlarged panel: each day's average, its wobble, then the median ── */}
        <Ink at={standsAt - 8} dur={14} out={medianAt - 4} style={{ left: X2.x0, top: y(330), whiteSpace: "nowrap" }}>
          <span style={{ ...label(24, INK), fontWeight: 560 }}>Average tip, by day</span>
        </Ink>
        <Ink at={medianAt} dur={14} style={{ left: X2.x0, top: y(330), whiteSpace: "nowrap" }}>
          <span style={{ ...label(24, INK), fontWeight: 560 }}>Median tip, by day</span>
        </Ink>
        <Axis scale={X2} base={y(AXIS)} ticks={[14, 16, 18, 20]} format={(v) => `${v}%`} at={standsAt - 8} />
        {whisk > 0 ? (
          <Svg opacity={whisk}>
            {DAYS.map((d, k) => {
              const m = TIPS.byDay[d];
              const g = ease(frame, wobblesAt - 6 + k * 3, 14);
              const a = sx(X2, m.mean - m.half * g);
              const b = sx(X2, m.mean + m.half * g);
              const yy = y(ROW_Y[k]);
              return (
                <g key={d} stroke={k === FRI ? STAT : INK_SOFT} strokeWidth={k === FRI ? 3 : 2.2} strokeLinecap="round">
                  <line x1={a} x2={b} y1={yy} y2={yy} />
                  <line x1={a} x2={a} y1={yy - 9} y2={yy + 9} />
                  <line x1={b} x2={b} y1={yy - 9} y2={yy + 9} />
                </g>
              );
            })}
          </Svg>
        ) : null}
        <Note at={wobblesAt + 4} out={medianAt - 6} x={X2.x0} y={y(AXIS) + 44}>
          <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>how far each average could wobble</span>
        </Note>
        <Svg>
          {DAYS.map((d, k) => {
            const a = ease(frame, standsAt - 6 + k * 4, 10);
            if (a <= 0) return null;
            const lead = medianT < 0.5 ? k === FRI : k === SUN;
            return (
              <circle
                key={d}
                cx={sx(X2, value(k))}
                cy={y(ROW_Y[k])}
                r={(lead ? 9 : 7) * a}
                fill={lead ? STAT : INK}
                stroke={PAPER}
                strokeWidth={2}
              />
            );
          })}
        </Svg>
        {DAYS.map((d, k) => {
          const a = ease(frame, standsAt - 2 + k * 4, 10);
          if (a <= 0) return null;
          const lead = medianT < 0.5 ? k === FRI : k === SUN;
          const v = value(k);
          return (
            <div
              key={d}
              style={{
                position: "absolute",
                left: sx(X2, v),
                top: y(ROW_Y[k]) - 44,
                transform: "translateX(-50%)",
                opacity: a,
                whiteSpace: "nowrap",
                ...note(21, lead ? STAT_INK : INK_SOFT),
                fontWeight: lead ? 700 : 500,
                ...halo,
              }}
            >
              {k === SAT && frame >= fifteenAt - 4 && medianT < 0.5 ? (
                <Marker at={fifteenAt - 4} off={nineteenAt}>
                  {pct(v)}
                </Marker>
              ) : (
                pct(v)
              )}
            </div>
          );
        })}
        <Ring x={sx(X2, TIPS.byDay.Fri.mean)} y={y(ROW_Y[FRI])} at={seventeenAt - 4} />
        <Ring x={sx(X2, TIPS.byDay.Sun.median)} y={y(ROW_Y[SUN])} at={sundayAt - 2} />
      </div>

      {/* ── The lead, carried into the next scene ── */}
      <Ink at={questionAt - 4} dur={16} style={{ left: 1410, top: y(846), whiteSpace: "nowrap" }}>
        <span
          style={{
            ...body(34, true),
            color: INK,
            display: "inline-block",
            padding: "6px 18px 8px",
            border: `2px solid ${INK}`,
            borderRadius: 10,
            background: PAPER,
          }}
        >
          Does Friday tip more?
        </span>
      </Ink>
    </AbsoluteFill>
  );
};
