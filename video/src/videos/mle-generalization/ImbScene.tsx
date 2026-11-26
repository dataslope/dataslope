import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, fmt, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, TABULAR } from "../../editorial/style";
import { ds } from "../../theme/brand";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { FRAUD } from "./data";
import { Drift, Fade, line, LIT_INK, MARK_BAD, OK, OK_INK, pct, Q_SIZE, RuledList, Say, X0 } from "./parts";

const CELL = 34;
const PITCH = 40;

/**
 * Question 10 on the same fraud model. A hundred transactions, one of them
 * fraud, and the model that calls them all legitimate: 99% accurate, nothing
 * caught. The remedies, read as a list. Then what balanced class weights do
 * to it: recall at 0.5 up from 24% to 84%, at the usual price, precision
 * down from 84% to 5%; but also the average predicted probability up from 1%
 * to 22% when the true rate is 1%, and PR-AUC down; and the three things to
 * do about it.
 */
export const ImbScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("imb").from;
  const qAt = n.word("imb", "Question ten");
  const textAt = n.word("imb", "What is class imbalance");
  const domAt = n.word("imb", "one class dominates");
  const accAt = n.word("imb", "accuracy stops meaning anything");
  const callAt = n.word("imb", "calling every transaction legitimate");
  const ninetyAt = n.word("imb", "ninety-nine percent");
  const nothingAt = n.word("imb", "catches nothing");
  const fixes = [
    { text: "Judge by precision, recall or PR-AUC", at: n.word("imb-fix", "Judge by precision") },
    { text: "Weight the rare class in the loss", at: n.word("imb-fix", "weight the rare class") },
    { text: "Oversample it with SMOTE’s synthetic rows, or undersample the majority", at: n.word("imb-fix", "oversample it") },
    { text: "Move the threshold", at: n.word("imb-fix", "move the threshold") },
    { text: "At the extreme, treat it as anomaly detection", at: n.word("imb-fix", "at the extreme") },
  ];
  const trapAt = n.word("imb-trap", "The follow-up");
  const balancedAt = n.word("imb-trap", "With balanced class weights");
  const recallAt = n.word("imb-trap", "recall at point five jumps");
  const eightyAt = n.word("imb-trap", "to eighty-four");
  const precisionAt = n.word("imb-trade", "precision falls");
  const fiveAt = n.word("imb-trade", "to five");
  const avgAt = n.word("imb-cost", "the average transaction");
  const twentyAt = n.word("imb-cost", "twenty-two percent likely");
  const onePctAt = n.word("imb-cost", "when one percent is");
  const prAt = n.word("imb-cost", "its pee-ar ay-you-see falls");
  const threeTwoAt = n.word("imb-cost", "point three two");
  const recalAt = n.word("imb-prod", "recalibrate");
  const rankingAt = n.word("imb-prod", "won't win back the ranking");
  const lowerAt = n.word("imb-prod", "try lowering");
  const resampleAt = n.word("imb-prod", "resample only the training set");
  const keepsAt = n.word("imb-prod", "the test set keeps");
  const end = n.beat("imb-prod").to;

  // ── A hundred transactions ──
  const move = ease(frame, fixes[0].at - 10, 22);
  const gridX = X0 + (1380 - X0) * move;
  const gridTop = y(330);
  const fraudCell = 67;
  const gridOut = trapAt - 6;

  // ── The table ──
  const T = { x: X0, top: y(330), w: 1420 };
  const COL = [X0 + 20, 860, 1150];
  const rowH = h(84);
  const rows = [
    // A tinted mark's text takes its hue's ink, never black.
    { name: "Recall at threshold 0.5", plain: pct(FRAUD.thresholds[0].recall), bal: pct(FRAUD.weighted.at.recall), at: recallAt, balAt: eightyAt, mark: HIGHLIGHT, ink: LIT_INK, note: "" },
    // What the recall cost: flagging fifteen thousand, not three hundred.
    { name: "Precision at threshold 0.5", plain: pct(FRAUD.thresholds[0].precision), bal: pct(FRAUD.weighted.at.precision), at: precisionAt, balAt: fiveAt, mark: MARK_BAD, ink: ACCENT_INK, note: "" },
    {
      name: "Average predicted probability",
      plain: pct(FRAUD.weighted.plainMeanProbability),
      bal: pct(FRAUD.weighted.meanProbability),
      at: avgAt,
      balAt: twentyAt,
      mark: MARK_BAD,
      ink: ACCENT_INK,
      note: `true rate ${pct(FRAUD.rate)}`,
      noteAt: onePctAt,
    },
    { name: "PR-AUC", plain: fmt(FRAUD.prAuc), bal: fmt(FRAUD.weighted.prAuc), at: prAt, balAt: threeTwoAt, mark: MARK_BAD, ink: ACCENT_INK, note: "" },
  ];
  const tableIn = ease(frame, trapAt - 4, 14);

  const steps = [
    { at: recalAt, text: "If anything reads them as probabilities, recalibrate" },
    { at: lowerAt, text: "Recalibrating can’t win back the ranking: try the plain model’s threshold first", lead: rankingAt },
    { at: resampleAt, text: "Resample only the training set: the test set keeps production’s 1%", lead: keepsAt },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={domAt} level={-36} />
      <Sfx name="el-tap" at={ninetyAt} level={-30} />
      <Sfx name="el-tap" at={nothingAt} level={-30} />
      {fixes.map((f) => (
        <Sfx key={f.text} name="el-tap" at={f.at} level={-34} />
      ))}
      <Sfx name="el-whoosh" at={trapAt - 2} level={-37} />
      <Sfx name="el-tap" at={eightyAt} level={-30} />
      <Sfx name="el-tap" at={twentyAt} level={-30} />
      <Sfx name="el-tap" at={threeTwoAt} level={-30} />
      {steps.map((s) => (
        <Sfx key={s.text} name="el-pop" at={s.at + 2} level={-32} />
      ))}
      <Sfx name="el-chime" at={end} level={-34} />

      <Drift from={from} to={end + 40} scale={0.016}>
        <QuestionCard n={10} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE}>
          What is class imbalance and how do you handle it?
        </QuestionCard>

        {/* ── A hundred transactions, one of them fraud ── */}
        <Fade from={domAt - 6} out={gridOut}>
          {Array.from({ length: 100 }, (_, i) => {
            const r = Math.floor(i / 10);
            const c = i % 10;
            const p = ease(frame, domAt - 4 + i * 0.25, 8);
            const fraud = i === fraudCell;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: gridX + c * PITCH,
                  top: gridTop + r * PITCH,
                  width: CELL,
                  height: CELL,
                  borderRadius: 5,
                  background: fraud ? ds("gray", 900) : ds("blue", 200),
                  opacity: p,
                }}
              />
            );
          })}
          <Say at={domAt} x={gridX} y={gridTop + 10 * PITCH + h(14)}>
            <span style={line(23, INK_SOFT)}>
              <span style={TABULAR}>1</span> in <span style={TABULAR}>100</span> is fraud
            </span>
          </Say>
        </Fade>
        <Fade from={accAt - 4} out={fixes[0].at - 8}>
          <Say at={callAt - 2} x={640} y={y(360)}>
            <span style={line(32, INK, 400)}>Call every transaction legitimate</span>
          </Say>
          <Say at={ninetyAt - 2} x={640} y={y(440)}>
            <span style={{ ...line(44, ACCENT_INK), ...TABULAR }}>{pct(FRAUD.allLegitAccuracy, 1)} accurate</span>
          </Say>
          <Say at={nothingAt - 2} x={640} y={y(520)}>
            <span style={{ ...line(44, ACCENT_INK), ...TABULAR }}>0 frauds caught</span>
          </Say>
        </Fade>

        {/* ── The remedies ── */}
        <RuledList items={fixes} x={X0} top={y(320)} width={1120} pitch={h(80)} size={28} out={trapAt - 6} />

        {/* ── What balanced weights do ── */}
        {tableIn > 0 ? (
          <div style={{ position: "absolute", inset: 0, opacity: tableIn }}>
            <div style={{ position: "absolute", left: T.x, top: T.top, width: T.w * tableIn, height: 2, background: INK }} />
            <div style={{ position: "absolute", left: T.x, top: T.top + h(60), width: T.w * tableIn, height: 1, background: HAIRLINE }} />
            <div style={{ position: "absolute", left: T.x, top: T.top + h(60) + rows.length * rowH, width: T.w * tableIn, height: 1.5, background: INK }} />
          </div>
        ) : null}
        <Say at={trapAt} x={COL[1]} y={T.top + h(14)}>
          <span style={line(26, INK_SOFT)}>Plain</span>
        </Say>
        <Say at={balancedAt - 2} x={COL[2]} y={T.top + h(14)}>
          <span style={line(26, INK_SOFT)}>Balanced class weights</span>
        </Say>
        {rows.map((r, i) => {
          const top = T.top + h(60) + i * rowH;
          const mark = ease(frame, r.balAt, 12);
          return (
            <React.Fragment key={r.name}>
              {i > 0 ? <div style={{ position: "absolute", left: T.x, top, width: T.w, height: 1, background: `color-mix(in srgb, ${INK} 16%, transparent)`, opacity: ease(frame, r.at - 4, 10) }} /> : null}
              <div style={{ position: "absolute", left: COL[2] - 14, top: top + h(20), width: 124 * mark, height: rowH - h(40), background: r.mark, borderRadius: 4 }} />
              <Say at={r.at - 4} x={COL[0]} y={top + rowH / 2 - 21}>
                <span style={line(32, INK)}>{r.name}</span>
              </Say>
              <Say at={r.at} x={COL[1]} y={top + rowH / 2 - 21}>
                <span style={{ ...line(32, INK), ...TABULAR }}>{r.plain}</span>
              </Say>
              <Say at={r.balAt - 2} x={COL[2]} y={top + rowH / 2 - 21}>
                <span style={{ ...line(32, r.ink), ...TABULAR }}>{r.bal}</span>
              </Say>
              {r.note && r.noteAt ? (
                <Say at={r.noteAt - 2} x={COL[2] + 170} y={top + rowH / 2 - 21}>
                  <span style={{ ...line(30, INK_SOFT), ...TABULAR }}>{r.note}</span>
                </Say>
              ) : null}
            </React.Fragment>
          );
        })}

        {/* ── What to do ── */}
        {steps.map((s, i) => (
          <Say key={s.text} at={(s.lead ?? s.at) - 2} x={X0} y={T.top + h(60) + rows.length * rowH + h(42) + i * h(66)}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 16, fontSize: 28 }}>
              <Tick at={s.at} size={26} color={OK} />
              <span style={line(28, OK_INK)}>{s.text}</span>
            </span>
          </Say>
        ))}
      </Drift>
    </AbsoluteFill>
  );
};
