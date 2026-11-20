import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, label, note } from "../../editorial/style";
import { ColumnRule, Ink, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { SELECTION } from "./data";
import { BAD, BAD_INK, DATA, Drift, Heading, Line, Mark, MUTED, mulberry32, OK, OK_INK, pulse, Spot, Svg, X0 } from "./parts";

const COLS = 25;
const ROWS = 16;
const PITCH = 25;
const R = 8.5;
/** Columns of the safest-looking 60%, which the old model approves. */
const APPROVED_COLS = 15;
const DEFAULT = ds("orange", 500);
const R_X0 = 980;
const BAR_X0 = 1240;
const BAR_PER_PT = 20;

/**
 * The field of applicants, each dot 250 of the simulation's 100,000: risk
 * rises left to right, the old model approves the safest-looking 60%, and
 * the defaults are placed so the dots hold the measured rates (5.3% of the
 * approved, 11.6% of all). Two percent are approved at random, whatever
 * their column.
 */
const FIELD = (() => {
  const total = COLS * ROWS;
  const approved = APPROVED_COLS * ROWS;
  const inDefaults = Math.round(approved * SELECTION.approvedRate);
  const allDefaults = Math.round(total * SELECTION.population);
  const rand = mulberry32(31);
  const pick = (ids: number[], k: number, weight: (i: number) => number) => {
    const chosen = new Set<number>();
    while (chosen.size < k) {
      const i = ids[Math.floor(rand() * ids.length)];
      if (rand() < weight(i)) chosen.add(i);
    }
    return chosen;
  };
  const ids = Array.from({ length: total }, (_, i) => i);
  const col = (i: number) => i % COLS;
  const inside = ids.filter((i) => col(i) < APPROVED_COLS);
  const outside = ids.filter((i) => col(i) >= APPROVED_COLS);
  const d1 = pick(inside, inDefaults, (i) => 0.2 + col(i) / APPROVED_COLS);
  const d2 = pick(outside, allDefaults - inDefaults, (i) => 0.3 + (col(i) - APPROVED_COLS) / (COLS - APPROVED_COLS));
  const explore = pick(outside, Math.round(total * (SELECTION.explore / SELECTION.applicants)), () => 1);
  return ids.map((i) => ({ i, c: col(i), r: Math.floor(i / COLS), approved: col(i) < APPROVED_COLS, defaulted: d1.has(i) || d2.has(i), explore: explore.has(i) }));
})();

/**
 * Question 10. Applicants as a field of dots; the approved 60% inside an
 * outline, the only place an outcome is seen. In the simulation, the
 * approved default at 5.3% while all applicants default at 11.6%, the gap in
 * red, and samples of 1,000, 10,000 and 60,000 approved loans all stay near
 * 5.5%. The fix: a 2% slice approved at random, whose rate (11.8%) lands on
 * the truth, in green, for the price of some bad loans.
 */
export const BiasScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q10").from;
  const qAt = n.word("q10", "Question ten");
  const textAt = n.word("q10", "What is selection bias?");
  const sampleAt = n.word("q10", "The sample doesn't represent");
  const stayAt = n.word("q10", "so estimates stay off");
  const mlAt = n.word("q10", "In machine learning");
  const simAt = n.word("q10-loans", "In a simulation");
  const lenderAt = n.word("q10-loans", "a lender only sees defaults");
  const approvedAt = n.word("q10-loans", "the loans it approved");
  const fiveAt = n.word("q10-loans", "five point three percent default");
  const elevenAt = n.word("q10-loans", "eleven point six percent");
  const sixtyAt = n.word("q10-loans", "Sixty times as many approved loans");
  const closeAt = n.word("q10-loans", "don't close that gap");
  const sliceAt = n.word("q10-fix", "Approve a small random slice");
  const twoAt = n.word("q10-fix", "here two percent");
  const rateAt = n.word("q10-fix", "eleven point eight percent");
  const priceAt = n.word("q10-fix", "The price is some bad loans");
  const trustAt = n.word("q10-fix", "labels you can trust");
  const end = n.beat("q10-fix").to;

  const top = y(432);
  const dx = (c: number) => X0 + c * PITCH + R;
  const dy = (r: number) => top + r * PITCH + R;
  const reveal = ease(frame, elevenAt - 4, 14);
  const explore = ease(frame, twoAt, 12);

  // ── The bars ──
  const bx = (v: number) => BAR_X0 + v * 100 * BAR_PER_PT;
  const rows = [
    { key: "approved", label: "Approved loans", v: SELECTION.approvedRate, at: fiveAt, y: y(500) },
    { key: "all", label: "All applicants", v: SELECTION.population, at: elevenAt, y: y(550) },
  ];
  const sizes = (["1000", "10000", "60000"] as const).map((k, i) => ({ k, v: SELECTION.bySize[k], y: y(690) + i * h(44), at: sixtyAt + i * 6 }));
  const exploreY = y(846);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={sampleAt} level={-33} />
      <Sfx name="el-pop" at={lenderAt} level={-30} />
      <Sfx name="el-pencil" at={approvedAt} level={-35} />
      <Sfx name="el-tap" at={fiveAt} level={-30} />
      <Sfx name="el-tap" at={elevenAt} level={-30} />
      {sizes.map((s) => (
        <Sfx key={s.k} name="el-tap" at={s.at} level={-33} />
      ))}
      <Sfx name="el-sprinkle" at={twoAt} level={-33} />
      <Sfx name="el-tap" at={rateAt} level={-29} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={10} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is selection (sampling) bias?
        </QuestionCard>

        <Line at={sampleAt} x={X0} y={y(282)} size={28}>
          The sample doesn&apos;t represent the population you want to generalize to
        </Line>
        <Line at={stayAt} x={X0} y={y(330)} size={24} color={INK_SOFT}>
          Estimates stay off however much data you collect.{" "}
          <span style={{ opacity: ease(frame, mlAt - 2, 10) }}>In ML: training on a population unlike serving traffic</span>
        </Line>

        {/* ── The applicants ── */}
        <Line at={sampleAt + 6} x={X0} y={top - h(46)} size={22} color={INK_SOFT}>
          Applicants, safest-looking on the left
        </Line>
        <Svg>
          {FIELD.map((d) => {
            const p = ease(frame, sampleAt + 4 + d.c * 0.6 + d.r * 0.3, 8);
            if (p <= 0) return null;
            const seen = d.approved ? ease(frame, approvedAt + 4, 12) : d.explore ? explore : 0;
            const known = Math.max(seen, d.approved ? 0 : reveal * 0.5);
            const color = known > 0 ? (d.defaulted ? DEFAULT : DATA) : MUTED;
            const lift = d.explore ? pulse(frame, twoAt + 4, 18) : 0;
            return (
              <g key={d.i} opacity={p}>
                <circle cx={dx(d.c)} cy={dy(d.r)} r={R * (1 + 0.3 * lift)} fill={color} opacity={d.approved || d.explore ? 1 : known > 0 ? 0.5 + 0.5 * known : 1} />
                {d.explore && explore > 0 ? <circle cx={dx(d.c)} cy={dy(d.r)} r={R + 5} fill="none" stroke={OK} strokeWidth={3} opacity={explore} /> : null}
              </g>
            );
          })}
          {/* The approved: an outline around the safest-looking 60%. */}
          <rect
            x={X0 - 8}
            y={top - 8}
            width={APPROVED_COLS * PITCH + 10}
            height={ROWS * PITCH + 10}
            rx={8}
            fill="none"
            stroke={INK}
            strokeWidth={2}
            pathLength={1}
            strokeDasharray={`${ease(frame, approvedAt, 20)} 1`}
          />
        </Svg>
        <Ink at={approvedAt + 6} dur={14} style={{ left: X0, top: top + ROWS * PITCH + h(18), whiteSpace: "nowrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 22, ...note(22, INK_SOFT) }}>
            <span>Approved: outcomes seen</span>
            <span style={{ width: 14, height: 14, borderRadius: 7, background: DATA, marginLeft: 10 }} />
            <span>Repaid</span>
            <span style={{ width: 14, height: 14, borderRadius: 7, background: DEFAULT, marginLeft: 10 }} />
            <span>Defaulted</span>
          </div>
        </Ink>

        <ColumnRule x={(X0 + COLS * PITCH + R_X0) / 2} top={top - h(46)} height={ROWS * PITCH + h(46)} at={simAt} />

        {/* ── The default rates ── */}
        <Spot id="bank" at={lenderAt} x={1584} y={y(244)} w={176} />
        <Heading at={simAt} x={R_X0} y={y(440)}>
          Default rate, in a simulation
        </Heading>
        {rows.map((r) => {
          const p = ease(frame, r.at, 16);
          return (
            <React.Fragment key={r.key}>
              <Line at={r.at - 4} x={R_X0} y={r.y - 14} size={24}>
                {r.label}
              </Line>
              <Svg opacity={p > 0 ? 1 : 0}>
                <rect x={BAR_X0} y={r.y - 9} width={(bx(r.v) - BAR_X0) * p} height={18} fill={DATA} />
              </Svg>
              <Line at={r.at + 8} x={bx(r.v) + 12} y={r.y - 14} size={24} weight={600}>
                <Num>{(r.v * 100).toFixed(1)}%</Num>
              </Line>
            </React.Fragment>
          );
        })}
        {/* The part of the truth the lender never sees. */}
        <Svg opacity={ease(frame, elevenAt + 10, 10)}>
          <path
            d={`M${bx(SELECTION.approvedRate)},${rows[1].y + 22} L${bx(SELECTION.approvedRate)},${rows[1].y + 30} L${bx(SELECTION.population)},${rows[1].y + 30} L${bx(SELECTION.population)},${rows[1].y + 22}`}
            fill="none"
            stroke={BAD}
            strokeWidth={2.4}
          />
        </Svg>
        <Line at={elevenAt + 12} x={(bx(SELECTION.approvedRate) + bx(SELECTION.population)) / 2} y={rows[1].y + h(30)} size={22} color={BAD_INK} align="center" width={200}>
          The gap
        </Line>

        <Line at={sixtyAt} x={R_X0} y={y(640)} size={24} color={INK_SOFT}>
          Samples of approved loans
        </Line>
        {sizes.map((s) => {
          const p = ease(frame, s.at, 14);
          return (
            <React.Fragment key={s.k}>
              <Line at={s.at - 2} x={BAR_X0 - 24} y={s.y - 13} size={22} align="right" width={200}>
                <Num>{Number(s.k).toLocaleString("en-US")}</Num>
              </Line>
              <Svg opacity={p > 0 ? 1 : 0}>
                <rect x={BAR_X0} y={s.y - 6} width={(bx(s.v) - BAR_X0) * p} height={12} fill={DATA} />
              </Svg>
              <Line at={s.at + 6} x={bx(s.v) + 12} y={s.y - 13} size={22}>
                <Num>{(s.v * 100).toFixed(1)}%</Num>
              </Line>
            </React.Fragment>
          );
        })}
        <Svg opacity={ease(frame, closeAt, 12)}>
          <line x1={bx(SELECTION.population)} x2={bx(SELECTION.population)} y1={sizes[0].y - 20} y2={exploreY + 16} stroke={INK} strokeWidth={2} strokeDasharray="6 5" />
        </Svg>
        <Line at={closeAt + 4} x={bx(SELECTION.population) + 12} y={sizes[1].y - 13} size={22} color={INK_SOFT}>
          The truth
        </Line>

        {/* ── The fix ── */}
        <Ink at={sliceAt} dur={14} style={{ left: R_X0, top: exploreY - 14, whiteSpace: "nowrap" }}>
          <span style={{ ...label(24, OK_INK), fontWeight: 600 }}>Random <Num>2%</Num></span>
        </Ink>
        <Svg opacity={ease(frame, rateAt - 4, 4)}>
          <rect x={BAR_X0} y={exploreY - 9} width={(bx(SELECTION.exploreRate) - BAR_X0) * ease(frame, rateAt - 4, 16)} height={18} fill={OK} />
        </Svg>
        <Line at={rateAt + 6} x={bx(SELECTION.exploreRate) + 26} y={exploreY - 14} size={24} color={OK_INK} weight={600}>
          <Mark at={rateAt + 10}>
            <Num>{(SELECTION.exploreRate * 100).toFixed(1)}%</Num>
          </Mark>
        </Line>
        <Line at={priceAt} x={X0} y={top + ROWS * PITCH + h(58)} size={22} color={INK_SOFT}>
          The price: some bad loans,{" "}
          <span style={{ opacity: ease(frame, trustAt - 2, 10) }}>for labels you can trust</span>
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
