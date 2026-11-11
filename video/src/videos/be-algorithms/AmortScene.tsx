import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { HAIRLINE, TABULAR, label, note, svgText } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { SANS } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { AMORTIZED, DOUBLING_CAPS } from "./data";
import { BAR, BLUE_INK, Drift, HIGHLIGHT, INK, INK_SOFT, Line, Mark, OK_INK, Svg, int, VRule } from "./parts";

/** The chart: items appended across, slots allocated up. */
const CX0 = 210;
const CX1 = 1060;
const X_MAX = AMORTIZED.appends;
const Y_MAX = 1_100_000;
const RX = 1180;

/**
 * Question 3. A million appends to a Python list, its allocated slots read
 * after each: a staircase of 86 resizes drawn as a sweep runs along it, a
 * textbook doubling array's 20 dashed behind it. Copies per append if every
 * resize copied every item so far: about eight at any length (doubling's
 * just over one). Then the last step lit: the one append that can copy
 * 938,736 items.
 */
export const AmortScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("amort").from;
  const qAt = n.word("amort", "Question three");
  const textAt = n.word("amort", "What is amortized O of one");
  const spreadsAt = n.word("amort", "It spreads a rare expensive step's cost");
  const appendAt = n.word("amort-run", "Append a million items");
  const roomAt = n.word("amort-run", "It runs out of room");
  const timesAt = n.word("amort-run", "eighty-six times");
  const copyAt = n.word("amort-run", "can copy every item so far");
  const addAt = n.word("amort-total", "Add those copies up");
  const anyAt = n.word("amort-total", "at any length");
  const constAt = n.word("amort-total", "Constant, on average");
  const doublesAt = n.word("amort-factor", "A textbook array doubles");
  const underAt = n.word("amort-factor", "under two copies an append");
  const eighthAt = n.word("amort-factor", "Python grows by about an eighth");
  const fixedAt = n.word("amort-factor", "Any fixed factor keeps it constant");
  const promiseAt = n.word("amort-spike", "not a promise per call");
  const lastAt = n.word("amort-spike", "the append that triggers the last resize");
  const copiesAt = n.word("amort-spike", "nine hundred thirty-nine thousand items");
  const budgetAt = n.word("amort-spike", "On a latency budget");
  const upfrontAt = n.word("amort-spike", "allocate up front");
  const end = n.beat("amort-spike").to;

  const base = y(800);
  const top = y(390);
  const px = (items: number) => CX0 + (items / X_MAX) * (CX1 - CX0);
  const py = (slots: number) => base - (slots / Y_MAX) * (base - top);

  // The list's staircase: flat at each capacity until the resize, then up.
  let d = `M${px(0)},${py(0)}`;
  let cap = 0;
  for (const [items, slots] of AMORTIZED.steps) {
    d += ` L${px(items)},${py(cap)} L${px(items)},${py(slots)}`;
    cap = slots;
  }
  d += ` L${px(X_MAX)},${py(cap)}`;
  // The doubling array's: capacity 1, then doubling whenever it fills.
  let dd = `M${px(0)},${py(1)}`;
  for (const c of DOUBLING_CAPS) dd += ` L${px(c)},${py(c)} L${px(c)},${py(2 * c)}`;
  dd += ` L${px(X_MAX)},${py(2 * DOUBLING_CAPS[DOUBLING_CAPS.length - 1])}`;

  const sweep = ease(frame, appendAt + 4, Math.max(40, copyAt - appendAt));
  const k = Math.max(1, Math.round(sweep * X_MAX));
  const resizes = AMORTIZED.steps.filter(([items]) => items < k).length;
  const dbl = ease(frame, doublesAt, 30);
  const [lastItems, lastSlots] = AMORTIZED.steps[AMORTIZED.steps.length - 1];
  const prevSlots = AMORTIZED.steps[AMORTIZED.steps.length - 2][1];
  const spike = ease(frame, lastAt, 12);
  const count = ease(frame, addAt + 4, 24);
  const perAppend = AMORTIZED.copiesPerAppend * count;
  const at = AMORTIZED.copiesPerAppendAt;
  const tick = svgText({ fontFamily: SANS, fontSize: 20, fontWeight: 500, color: INK_SOFT, ...TABULAR });

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={appendAt + 4} level={-35} />
      <Sfx name="el-tap" at={timesAt} level={-32} />
      <Sfx name="el-tap" at={addAt + 4} level={-32} />
      <Sfx name="el-pencil" at={doublesAt} level={-35} />
      <Sfx name="el-tap" at={eighthAt} level={-33} />
      <Sfx name="el-pop" at={lastAt} level={-30} />
      <Sfx name="el-chime" at={upfrontAt} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} size={62}>
          What is amortized O(1) and when does it apply?
        </QuestionCard>
        <Line at={spreadsAt} x={96} y={y(262)} size={26} color={INK_SOFT}>
          A rare expensive step&apos;s cost, spread over the cheap ones around it
        </Line>

        {/* The chart. */}
        <Line at={appendAt} x={CX0} y={top - 64} size={22} weight={500}>
          A Python list, a million appends: slots allocated
        </Line>
        <Svg opacity={ease(frame, appendAt, 12)}>
          <line x1={CX0} x2={CX1} y1={base} y2={base} stroke={INK} strokeWidth={1.6} />
          <line x1={CX0} x2={CX0} y1={base} y2={top - 10} stroke={INK} strokeWidth={1.6} />
          {[0, 500_000, 1_000_000].map((v) => (
            <g key={`x${v}`}>
              <line x1={px(v)} x2={px(v)} y1={base} y2={base + 7} stroke={INK} strokeWidth={1.2} />
              <text x={px(v)} y={base + 30} textAnchor={v === 0 ? "start" : v === X_MAX ? "end" : "middle"} style={tick}>
                {int(v)}
              </text>
            </g>
          ))}
          {[500_000, 1_000_000].map((v) => (
            <g key={`y${v}`}>
              <line x1={CX0 - 7} x2={CX0} y1={py(v)} y2={py(v)} stroke={INK} strokeWidth={1.2} />
              <line x1={CX0} x2={CX1} y1={py(v)} y2={py(v)} stroke={HAIRLINE} strokeWidth={0.8} opacity={0.35} />
              <text x={CX0 - 14} y={py(v) + 7} textAnchor="end" style={tick}>
                {v === 1_000_000 ? "1M" : "500k"}
              </text>
            </g>
          ))}
        </Svg>
        <Line at={appendAt + 10} x={CX1} y={base + 56} size={20} color={INK_SOFT} weight={500} align="right" width={400}>
          items appended
        </Line>
        <Svg>
          <defs>
            <clipPath id="be-alg-sweep">
              <rect x={CX0 - 4} y={top - 40} width={(CX1 - CX0) * sweep + 6} height={base - top + 60} />
            </clipPath>
            <clipPath id="be-alg-double">
              <rect x={CX0 - 4} y={top - 40} width={(CX1 - CX0) * dbl + 6} height={base - top + 60} />
            </clipPath>
          </defs>
          {/* The doubling array, dashed behind. */}
          <path d={dd} fill="none" stroke={INK_SOFT} strokeWidth={2.4} strokeDasharray="7 6" clipPath="url(#be-alg-double)" opacity={dbl > 0 ? 1 : 0} />
          {/* The last resize, lit. */}
          <line x1={px(lastItems)} x2={px(lastItems)} y1={py(prevSlots)} y2={py(lastSlots)} stroke={HIGHLIGHT} strokeWidth={16} strokeLinecap="round" opacity={spike} />
          {/* An ink outline round the band, so the lit step can be found. */}
          <rect x={px(lastItems) - 11} y={py(lastSlots) - 11} width={22} height={py(prevSlots) - py(lastSlots) + 22} rx={11} fill="none" stroke={INK} strokeWidth={2} opacity={spike} />
          <path d={d} fill="none" stroke={BAR} strokeWidth={3} strokeLinejoin="round" clipPath="url(#be-alg-sweep)" />
          {sweep > 0 && sweep < 1 ? <line x1={px(k)} x2={px(k)} y1={top - 20} y2={base} stroke={INK_SOFT} strokeWidth={1.6} strokeDasharray="4 4" /> : null}
        </Svg>
        {/* Legend, at the right end of the chart's own line. */}
        <div style={{ position: "absolute", left: 830, top: top - 64, display: "flex", alignItems: "center", gap: 14, fontSize: 21, opacity: ease(frame, doublesAt, 12), whiteSpace: "nowrap" }}>
          <span style={{ width: 30, borderTop: `3px solid ${BAR}` }} />
          <span style={label(21, BLUE_INK)}>list</span>
          <span style={{ width: 30, marginLeft: 12, borderTop: `3px dashed ${INK_SOFT}` }} />
          <span style={label(21, INK_SOFT)}>doubling</span>
        </div>

        <VRule x={1130} top={top - 64} bottom={base + 80} at={roomAt} />

        {/* The counts, on the right. */}
        <Line at={roomAt} x={RX} y={y(372)} size={28} weight={500}>
          Resizes: <span style={{ ...TABULAR, color: BLUE_INK }}>{resizes}</span>
        </Line>
        <Line at={copyAt} x={RX} y={y(418)} size={24} color={INK_SOFT}>
          each can copy every item so far: <Num>{int(AMORTIZED.copiesIfEveryResizeCopies)}</Num> in all
        </Line>
        <Line at={addAt} x={RX} y={y(488)} size={28} weight={500}>
          Copies per append: <span style={{ ...TABULAR, color: BLUE_INK }}>{perAppend.toFixed(1)}</span>
          <span style={{ color: OK_INK, opacity: ease(frame, constAt, 10) }}> constant</span>
        </Line>
        <div style={{ position: "absolute", left: RX, top: y(536), display: "flex", gap: 28, fontSize: 22, whiteSpace: "nowrap", opacity: ease(frame, anyAt, 10) }}>
          {(["1000", "1000000", "2000000"] as const).map((len) => (
            <span key={len} style={note(22, INK_SOFT)}>
              at <Num>{int(Number(len))}</Num>: <b style={{ color: INK }}><Num>{at[len].toFixed(1)}</Num></b>
            </span>
          ))}
        </div>
        <Line at={doublesAt} x={RX} y={y(604)} size={24}>
          Doubling: <Num>{AMORTIZED.doublingResizes}</Num> resizes,{" "}
          <span style={{ opacity: ease(frame, underAt, 10) }}>
            <b>
              under <Num>2</Num>
            </b>{" "}
            copies per append
          </span>
        </Line>
        <Line at={eighthAt} x={RX} y={y(648)} size={24}>
          Python: <b>×<Num>{AMORTIZED.meanGrowthAbove1000.toFixed(3)}</Num></b> a step, about an eighth
        </Line>
        <Line at={fixedAt} x={RX} y={y(692)} size={24} color={INK_SOFT}>
          Any fixed factor stays O(1); so does a rehash
        </Line>
        <Line at={promiseAt} x={RX} y={y(762)} size={24} weight={500}>
          An average, not a promise per call:
        </Line>
        <Line at={lastAt} x={RX} y={y(806)} size={24} weight={500}>
          <Mark at={copiesAt}>
            one append copies <Num>{int(lastItems)}</Num>
          </Mark>
        </Line>
        <Line at={budgetAt} x={RX} y={y(850)} size={24} weight={500} color={OK_INK}>
          On a latency budget, allocate up front
        </Line>

      </Drift>
    </AbsoluteFill>
  );
};
