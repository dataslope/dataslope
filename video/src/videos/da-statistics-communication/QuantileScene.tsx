import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, PAPER, TABULAR, fmt, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { AMOUNTS } from "./data";
import { Bracket, Drift, MARK_BAD, MARK_OK, OK_INK, Svg, X0 } from "./parts";

const CELL = 96;
const STRIP_X = 330;
const STRIP_Y = 440;
const CELL_H = 64;
const Z_Y = 660;

/** A mark on one cell, from a frame, in an ink. */
type CellMark = { i: number; at: number; out?: number; color: string };

/** One row of thirteen cells, set in the code face. */
const Row: React.FC<{
  values: readonly string[];
  top: number;
  height: number;
  at: (i: number) => number;
  marks?: readonly CellMark[];
  boxed?: boolean;
  size?: number;
  color?: string;
}> = ({ values, top, height, at: inAt, marks = [], boxed = true, size = 28, color = INK }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {values.map((v, i) => {
        const p = ease(frame, inAt(i), 10);
        if (p <= 0) return null;
        const fills = marks
          .filter((m) => m.i === i)
          .map((m) => ({ m, w: ease(frame, m.at, 12) * (m.out === undefined ? 1 : 1 - ease(frame, m.out, 10)) }))
          .filter(({ w }) => w > 0);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: STRIP_X + i * CELL,
              top,
              width: CELL,
              height,
              boxSizing: "border-box",
              border: boxed ? `1.5px solid ${HAIRLINE}` : undefined,
              marginLeft: boxed && i > 0 ? -1.5 : 0,
              background: boxed ? PAPER : undefined,
              opacity: p,
              transform: `translateY(${(1 - p) * 8}px)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {fills.map(({ m, w }, k) => (
              <div key={k} style={{ position: "absolute", inset: 3, background: m.color, opacity: w, borderRadius: 3 }} />
            ))}
            <span style={{ position: "relative", fontFamily: MONO, fontSize: size, fontWeight: 600, color, ...TABULAR, fontVariantLigatures: "none" }}>
              {v}
            </span>
          </div>
        );
      })}
    </>
  );
};

/**
 * Questions 6 and 7 on the page's thirteen amounts, in order: the quartiles
 * (10, 12, 13) and their IQR of 3, the 90th percentile interpolated to 154.8
 * between 14 and 190; then the fences at 5.5 and 17.5, which catch 200 and
 * 190, and the z-scores, which the two inflate: 2.32 and 2.18, caught at a
 * cutoff of 2 and missed at 3.
 */
export const QuantileScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("quantile").from;
  const qAt = n.word("quantile", "Question");
  const textAt = n.word("quantile", "What are percentiles");
  const cutAt = n.word("quantile-def", "A percentile is a cut");
  const ninetyAt = n.word("quantile-def", "about ninety percent");
  const quartilesAt = n.word("quantile-def", "Quartiles cut");
  const thirteenAt = n.word("quantile-cuts", "thirteen amounts");
  const q1At = n.word("quantile-cuts", "Q one is ten");
  const medAt = n.word("quantile-cuts", "the median twelve");
  const q3At = n.word("quantile-cuts", "Q three thirteen");
  const iqrAt = n.word("quantile-cuts", "the I Q R");
  const p90At = n.word("quantile-p90", "a hundred fifty-four point eight");
  const nobodyAt = n.word("quantile-p90", "an amount nobody spent");
  const betweenAt = n.word("quantile-p90", "between fourteen and one ninety");
  const rulesAt = n.word("quantile-p90", "Other tools use other rules");
  const q7At = n.word("outlier", "Question seven");
  const q7TextAt = n.word("outlier", "How do you identify");
  const fenceAt = n.word("outlier-iqr", "puts a fence");
  const fencesAt = n.word("outlier-iqr", "five and a half and seventeen and a half");
  const outsideAt = n.word("outlier-iqr", "are outside");
  const zAt = n.word("outlier-z", "A z-score");
  const meanAt = n.word("outlier-z", "drag the mean up");
  const stdAt = n.word("outlier-z", "the standard deviation to");
  const onlyAt = n.word("outlier-z", "only two point three two");
  const twoAt = n.word("outlier-mask", "a cutoff of two");
  const threeAt = n.word("outlier-mask", "With three");
  const hideAt = n.word("outlier-mask", "hide themselves");
  const lookAt = n.word("outlier-look", "look before you delete");
  const typoAt = n.word("outlier-look", "a typo");
  const end = n.beat("present-in").to;

  const S = AMOUNTS.sorted;
  const last = S.length - 1;
  const cx = (i: number) => STRIP_X + i * CELL + CELL / 2;
  const top = y(STRIP_Y);
  const cellH = h(CELL_H);
  const bottom = top + cellH;
  // pandas' linear rule: the q-th quantile sits at position q * (n - 1).
  const pos = (q: number) => q * last;
  const xAt = (p: number) => cx(Math.floor(p)) + (p - Math.floor(p)) * CELL;
  const quartiles = [
    { q: 0.25, name: "Q1", v: AMOUNTS.q1, at: q1At },
    { q: 0.5, name: "median", v: AMOUNTS.median, at: medAt },
    { q: 0.75, name: "Q3", v: AMOUNTS.q3, at: q3At },
  ];
  const p90X = xAt(pos(0.9));
  const lo = Math.floor(pos(0.9));
  const flagged = S.flatMap((s, i) => (AMOUNTS.iqrFlagged.includes(s.v) ? [i] : []));
  const lowFenceX = STRIP_X - 22;
  // The high fence falls between the last value under it and the first over.
  const firstOver = S.findIndex((s) => s.v > AMOUNTS.high);
  const highFenceX = STRIP_X + firstOver * CELL;
  const zTop = y(Z_Y);
  const zFlag2 = S.flatMap((s, i) => (AMOUNTS.zOver2.includes(s.v) ? [i] : []));
  const out6 = q7At - 4;

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={thirteenAt} level={-34} />
      <Sfx name="el-tap" at={q1At} level={-34} />
      <Sfx name="el-tap" at={medAt} level={-34} />
      <Sfx name="el-tap" at={q3At} level={-34} />
      <Sfx name="el-pop" at={p90At + 2} level={-32} />
      <Sfx name="el-pencil" at={fencesAt} level={-34} />
      <Sfx name="el-scratch" at={outsideAt} level={-32} />
      <Sfx name="el-pop" at={twoAt + 4} level={-32} />
      <Sfx name="el-scratch" at={threeAt + 4} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} out={out6}>
          What are percentiles and quartiles?
        </QuestionCard>
        <QuestionCard n={7} at={q7At} textAt={q7TextAt - 2}>
          How do you identify outliers?
        </QuestionCard>

        {/* ── What the words mean ── */}
        <Note at={cutAt - 2} x={X0} y={y(286)} out={out6}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <b>90th percentile</b>: the value with <span style={{ opacity: ease(frame, ninetyAt - 2, 10) }}>about 90% of the data at or below it</span>
          </span>
        </Note>
        <Note at={quartilesAt - 2} x={X0} y={y(328)} out={out6}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <b>quartiles</b>: the cuts at 25, 50 and 75
          </span>
        </Note>
        <Note at={fenceAt - 2} x={X0} y={y(286)} out={lookAt - 4}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <b>IQR rule</b>: below Q1 − 1.5 × IQR, or above Q3 + 1.5 × IQR
          </span>
        </Note>
        <Note at={zAt - 2} x={X0} y={y(328)} out={lookAt - 4}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <b>z-score</b>: (x − mean) ÷ standard deviation
          </span>
        </Note>
        <Note at={lookAt - 2} x={X0} y={y(286)}>
          <span style={{ ...note(28, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>Look before you delete:</span>
        </Note>
        <Note at={typoAt - 2} x={X0} y={y(328)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>an outlier can be a typo, or the most important row you have</span>
        </Note>

        {/* ── Thirteen amounts, in order ── */}
        <Note at={thirteenAt - 2} x={X0} y={top + cellH / 2 - 16}>
          <span style={{ ...label(23, INK), whiteSpace: "nowrap" }}>amount</span>
        </Note>
        <Row
          values={S.map((s) => String(s.v))}
          top={top}
          height={cellH}
          at={(i) => thirteenAt + i * 2}
          marks={[
            { i: lo, at: betweenAt, out: out6, color: HIGHLIGHT },
            { i: lo + 1, at: betweenAt + 4, out: out6, color: HIGHLIGHT },
            ...flagged.map((i, k) => ({ i, at: outsideAt + k * 4, color: MARK_BAD })),
          ]}
        />

        {/* Quartiles under the strip, the IQR between Q1 and Q3. */}
        {quartiles.map((q) => {
          const x = xAt(pos(q.q));
          const p = ease(frame, q.at - 2, 12);
          return (
            <React.Fragment key={q.name}>
              <Svg opacity={p}>
                <path d={`M${x},${bottom + 6} l-8,12 l16,0 Z`} fill={INK} />
              </Svg>
              <Note at={q.at - 2} x={x - 150} width={300} y={bottom + 24} from="up" style={{ textAlign: "center" }}>
                <span style={{ ...note(24, INK), whiteSpace: "nowrap", ...TABULAR }}>
                  {q.name} <b>{fmt(q.v, 0)}</b>
                </span>
              </Note>
            </React.Fragment>
          );
        })}
        <Bracket x0={xAt(pos(0.25))} x1={xAt(pos(0.75))} y={bottom + h(88)} at={iqrAt}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap", ...TABULAR }}>
            IQR = Q3 − Q1 = <b>{fmt(AMOUNTS.iqr, 0)}</b>
          </span>
        </Bracket>

        {/* The 90th percentile: between two values, and neither of them. */}
        {/* Pandas' rule: 80% of the way from 14's place to 190's. */}
        <Svg opacity={ease(frame, p90At - 2, 12) * (1 - ease(frame, out6, 10))}>
          <line x1={cx(lo)} x2={cx(lo + 1)} y1={top - 14} y2={top - 14} stroke={INK_SOFT} strokeWidth={1.6} />
          <line x1={cx(lo)} x2={cx(lo)} y1={top - 20} y2={top - 8} stroke={INK_SOFT} strokeWidth={1.6} />
          <line x1={cx(lo + 1)} x2={cx(lo + 1)} y1={top - 20} y2={top - 8} stroke={INK_SOFT} strokeWidth={1.6} />
          <line x1={p90X} x2={p90X} y1={top - 36} y2={top - 6} stroke={ACCENT} strokeWidth={3.2} />
        </Svg>
        <Note at={p90At - 2} x={p90X - 300} width={600} y={top - h(76)} out={out6} from="up" style={{ textAlign: "center" }}>
          <span style={{ ...note(26, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>
            90th percentile {fmt(AMOUNTS.p90, 1)}
          </span>
        </Note>
        <Note at={nobodyAt} x={p90X + 30} y={bottom + h(24)} out={out6}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>not in the data:</span>
          <br />
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>interpolated</span>
        </Note>
        <Note at={rulesAt - 2} x={p90X + 30} y={bottom + h(90)} out={out6}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>other tools,</span>
          <br />
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>other rules</span>
        </Note>

        {/* ── Question 7: the fences ── */}
        {[
          { x: lowFenceX, v: AMOUNTS.low, k: 0 },
          { x: highFenceX, v: AMOUNTS.high, k: 1 },
        ].map((f) => {
          const p = ease(frame, fencesAt + f.k * 8, 14);
          return (
            <React.Fragment key={f.k}>
              <Svg opacity={Math.min(1, p * 2)}>
                <line x1={f.x} x2={f.x} y1={top - 30} y2={top - 30 + (cellH + 46) * p} stroke={ACCENT} strokeWidth={3} strokeDasharray="7 5" />
              </Svg>
              <Note at={fencesAt + f.k * 8} x={f.x - 150} width={300} y={top - h(70)} from="up" style={{ textAlign: "center" }}>
                <span style={{ ...note(24, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>fence {fmt(f.v, 1)}</span>
              </Note>
            </React.Fragment>
          );
        })}

        {/* ── The z-scores ── */}
        <Note at={zAt + 4} x={X0} y={zTop + cellH / 2 - 16}>
          <span style={{ ...label(23, INK), whiteSpace: "nowrap" }}>z</span>
        </Note>
        <Row
          values={S.map((s) => (s.z < 0 ? `−${fmt(-s.z)}` : fmt(s.z)))}
          top={zTop}
          height={cellH}
          boxed={false}
          size={22}
          color={INK_SOFT}
          at={(i) => zAt + 6 + i * 1.5}
          marks={[
            { i: last, at: onlyAt, out: twoAt, color: HIGHLIGHT },
            ...zFlag2.map((i, k) => ({ i, at: twoAt + 4 + k * 4, out: threeAt + 2, color: MARK_OK })),
            ...zFlag2.map((i, k) => ({ i, at: threeAt + 6 + k * 4, color: MARK_BAD })),
          ]}
        />
        <Note at={meanAt - 2} x={STRIP_X} y={zTop + cellH + h(14)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap", ...TABULAR }}>
            the two drag the mean to <b>{fmt(AMOUNTS.mean, 1)}</b>
            <span style={{ opacity: ease(frame, stdAt - 2, 10) }}>
              {" "}
              and the standard deviation to <b>{fmt(AMOUNTS.std, 1)}</b>
            </span>
          </span>
        </Note>
        <Note at={twoAt - 2} x={STRIP_X} y={zTop + cellH + h(62)}>
          <span style={{ ...note(25, OK_INK), fontWeight: 600, whiteSpace: "nowrap", ...TABULAR }}>
            |z| &gt; 2: {AMOUNTS.zOver2.join(" and ")}
          </span>
        </Note>
        <Note at={threeAt} x={STRIP_X + 420} y={zTop + cellH + h(62)}>
          <span style={{ ...note(25, ACCENT_INK), fontWeight: 600, whiteSpace: "nowrap", ...TABULAR }}>
            |z| &gt; 3: {AMOUNTS.zOver3.length ? AMOUNTS.zOver3.join(" and ") : "nothing"}
          </span>
        </Note>
        <Note at={hideAt - 2} x={STRIP_X + 840} y={zTop + cellH + h(62)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>the outliers hide themselves</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
