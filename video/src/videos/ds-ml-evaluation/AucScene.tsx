import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, PAPER, TABULAR, fmt, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CLS, pct } from "./data";
import { at, type Box, Curve, Drift, Fade, Mark, OK, OK_INK, PanelTitle, type Scale, Strike, Svg } from "./parts";

const SIDE = 400;
const ROC: Box = { left: 200, right: 200 + SIDE, top: 400, bottom: 400 + SIDE };
const PR: Box = { left: 820, right: 820 + SIDE, top: 400, bottom: 400 + SIDE };
const READ_X = 1360;
const BAR_X = 480;
const BAR_W = 900;

/** A square plot's frame: both axes and their titles, drawn on `at`. */
const Square: React.FC<{ b: Box; at: number; out?: number; xTitle: string; yTitle: string; diagonal?: boolean }> = ({
  b,
  at: from,
  out,
  xTitle,
  yTitle,
  diagonal,
}) => {
  const frame = useCurrentFrame();
  const { y } = useLayout();
  const p = ease(frame, from, 16) * (out === undefined ? 1 : 1 - ease(frame, out, 10));
  if (p <= 0) return null;
  const top = y(b.top);
  const bottom = y(b.bottom);
  return (
    <Svg opacity={p}>
      <path d={`M${b.left},${top} L${b.left},${bottom} L${b.right},${bottom}`} fill="none" stroke={INK} strokeWidth={1.6} />
      {diagonal ? <line x1={b.left} y1={bottom} x2={b.right} y2={top} stroke={INK_SOFT} strokeWidth={1.6} strokeDasharray="5 7" /> : null}
      {[0, 1].map((v) => (
        <React.Fragment key={v}>
          <text x={b.left + v * (b.right - b.left)} y={bottom + 28} textAnchor="middle" style={{ ...label(19, INK_SOFT) }}>
            {v}
          </text>
          <text x={b.left - 12} y={bottom - v * (bottom - top) + 6} textAnchor="end" style={{ ...label(19, INK_SOFT) }}>
            {v}
          </text>
        </React.Fragment>
      ))}
      <text x={b.right} y={bottom + 56} textAnchor="end" style={{ ...label(20, INK_SOFT), fontWeight: 650 }}>
        {xTitle}
      </text>
      <text x={b.left} y={top - 16} textAnchor="start" style={{ ...label(20, INK_SOFT), fontWeight: 650 }}>
        {yTitle}
      </text>
    </Svg>
  );
};

/**
 * Questions 9 and 10 on the same 200,000 cases. The ROC curve over its
 * chance diagonal (area 0.94) beside the PR curve (area 0.45); then the same
 * scores on a balanced test set, dashed: ROC hardly moves, PR jumps to 0.94.
 * Then imbalance: accuracy struck out (98% for calling everything negative),
 * and what class weights do to recall and precision at 0.5.
 */
export const AucScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("auc").from;
  const qAt = n.word("auc", "Question");
  const textAt = n.word("auc", "What is ar-oh-see ay-you-see");
  const rocWordAt = n.word("auc", "is ar-oh-see ay-you-see");
  const prWordAt = n.word("auc", "is pee-ar ay-you-see preferred");
  const asked = n.word("auc", "The ROC curve");
  const rateAt = n.word("auc", "plots the true positive rate");
  const areaAt = n.word("auc", "The AUC is the area");
  const chanceAt = n.word("auc", "point five is chance");
  const hereAt = n.word("auc", "Here it's point nine four");
  const prAt = n.word("auc", "The PR curve plots precision");
  const onlyAt = n.word("auc", "only point four five");
  const sameAt = n.word("auc-balance", "Same model, same scores");
  const movesAt = n.word("auc-balance", "barely moves");
  const jumpsAt = n.word("auc-balance", "pee-ar ay-you-see jumps");
  const floodAt = n.word("auc-balance", "The false positive rate divides");
  const honestAt = n.word("auc-balance", "the honest one");
  const q10At = n.word("imbalance", "Question ten");
  const q10TextAt = n.word("imbalance", "How do you handle");
  const ignoreAt = n.word("imbalance", "ignoring accuracy");
  const negAt = n.word("imbalance", "calling every case negative");
  const weightAt = n.word("imbalance", "Weight the rare class");
  const recallAt = n.word("imbalance", "recall goes from");
  const precAt = n.word("imbalance", "while precision falls");
  const moveAt = n.word("imbalance", "Or move the threshold");
  const resampleAt = n.word("imbalance", "or resample");
  const judgeAt = n.word("imbalance", "judge the result");
  const end = n.beat("imbalance").to;

  const unit: Scale = { lo: 0, hi: 1, a: 0, b: 1 };
  const xsOf = (b: Box): Scale => ({ ...unit, a: b.left, b: b.right });
  const ysOf = (b: Box): Scale => ({ ...unit, a: y(b.bottom), b: y(b.top) });
  const clipOf = (b: Box): Box => ({ left: b.left - 6, right: b.right + 6, top: y(b.top) - 6, bottom: y(b.bottom) + 6 });
  const areaP = ease(frame, areaAt, 20);
  const rocArea = `M${ROC.left},${y(ROC.bottom)} ${CLS.roc.map(([fx, ty]) => `L${at(xsOf(ROC), fx)},${at(ysOf(ROC), ty)}`).join(" ")} L${ROC.right},${y(ROC.bottom)} Z`;
  const out9 = q10At - 6;

  const plain = CLS.plainAt50;
  const weighted = CLS.weightedAt50;
  const pairs = [
    { name: "recall", at: recallAt, before: plain.recall, after: weighted.recall, good: true },
    { name: "precision", at: precAt, before: plain.precision, after: weighted.precision, good: false },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={rateAt + 4} level={-34} />
      <Sfx name="el-pop" at={hereAt + 2} level={-32} />
      <Sfx name="el-pencil" at={prAt + 4} level={-34} />
      <Sfx name="el-pop" at={jumpsAt + 2} level={-30} />
      <Sfx name="el-scratch" at={ignoreAt + 2} level={-32} />
      <Sfx name="el-pop" at={recallAt + 4} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={9} at={qAt - 4} textAt={textAt - 4} out={q10At - 4} size={60}>
          What is <Mark at={rocWordAt + 4}>ROC-AUC</Mark>, and when is <Mark at={prWordAt + 4}>PR-AUC</Mark> preferred?
        </QuestionCard>
        <QuestionCard n={10} at={q10At} textAt={q10TextAt - 2} out={end - 6} size={60}>
          How do you handle class imbalance?
        </QuestionCard>

        <Fade from={asked - 8} out={out9}>
          {/* ── ROC ── */}
          <PanelTitle x={ROC.left} y={y(ROC.top) - h(84)} at={asked} color={INK}>
            ROC: receiver operating characteristic
          </PanelTitle>
          <Square b={ROC} at={asked} xTitle="false positive rate" yTitle="true positive rate" diagonal />
          <Svg opacity={areaP * 0.9}>
            <path d={rocArea} fill={`color-mix(in srgb, ${BAR} 16%, transparent)`} />
          </Svg>
          <Curve points={CLS.roc} x={xsOf(ROC)} y={ysOf(ROC)} at={rateAt + 4} dur={26} color={BAR} width={3.6} clip={clipOf(ROC)} />
          <Curve points={CLS.rocBalanced} x={xsOf(ROC)} y={ysOf(ROC)} at={sameAt + 6} dur={22} color={INK} width={2.6} dash="8 7" clip={clipOf(ROC)} />
          <Note at={chanceAt - 2} x={at(xsOf(ROC), 0.55)} y={at(ysOf(ROC), 0.42)}>
            <span style={{ ...label(20, INK_SOFT), fontWeight: 650 }}>chance: 0.5</span>
          </Note>

          {/* ── PR ── */}
          <PanelTitle x={PR.left} y={y(PR.top) - h(84)} at={prAt - 2} color={INK}>
            PR: precision against recall
          </PanelTitle>
          <Square b={PR} at={prAt - 2} xTitle="recall" yTitle="precision" />
          <Curve points={CLS.pr} x={xsOf(PR)} y={ysOf(PR)} at={prAt + 4} dur={26} color={BAR} width={3.6} clip={clipOf(PR)} />
          <Curve points={CLS.prBalanced} x={xsOf(PR)} y={ysOf(PR)} at={jumpsAt - 4} dur={22} color={INK} width={2.6} dash="8 7" clip={clipOf(PR)} />

          {/* ── The two areas, and then on a balanced test set ── */}
          <Note at={hereAt - 2} x={READ_X} y={y(ROC.top)}>
            <span style={{ ...note(30, INK), ...TABULAR, whiteSpace: "nowrap" }}>
              ROC-AUC <b style={{ color: BLUE_INK }}>{fmt(CLS.auc)}</b>
              <span style={{ opacity: ease(frame, movesAt - 2, 10) }}>
                {" "}→ <b>{fmt(CLS.aucBalanced)}</b>
              </span>
            </span>
          </Note>
          <Note at={onlyAt - 2} x={READ_X} y={y(ROC.top) + h(56)}>
            <span style={{ ...note(30, INK), ...TABULAR, whiteSpace: "nowrap" }}>
              PR-AUC <b style={{ color: BLUE_INK }}>{fmt(CLS.ap)}</b>
              <span style={{ opacity: ease(frame, jumpsAt - 2, 10) }}>
                {" "}→ <b style={{ color: OK_INK }}>{fmt(CLS.apBalanced)}</b>
              </span>
            </span>
          </Note>
          <Note at={sameAt} x={READ_X} y={y(ROC.top) + h(140)}>
            <div style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap", lineHeight: 1.7 }}>
              <div>
                <span style={{ display: "inline-block", width: 34, borderTop: `3.6px solid ${BAR}`, marginRight: 10, verticalAlign: "middle" }} />
                {pct(CLS.prevalence)} positive: every negative
              </div>
              <div>
                <span style={{ display: "inline-block", width: 34, borderTop: `2.6px dashed ${INK}`, marginRight: 10, verticalAlign: "middle" }} />
                as many negatives as positives
              </div>
            </div>
          </Note>
          <Note at={floodAt - 4} x={READ_X} y={y(ROC.top) + h(250)}>
            <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>false positive rate:</span>
            <br />
            <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>false alarms ÷ every negative</span>
          </Note>
          <Note at={honestAt - 2} x={READ_X} y={y(ROC.top) + h(350)}>
            <span style={{ ...note(27, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
              rare positives: <Mark at={honestAt + 4}>trust PR-AUC</Mark>
            </span>
          </Note>
        </Fade>

        {/* ── Question 10 ── */}
        <Fade from={q10At + 6} out={end - 8}>
          <Note at={ignoreAt - 2} x={ROC.left} y={y(300)}>
            <span style={{ ...note(32, INK), whiteSpace: "nowrap" }}>
              <Strike at={ignoreAt + 6} color={ACCENT} top="0.78em">
                accuracy
              </Strike>
              <span style={{ opacity: ease(frame, negAt - 2, 10) }}>
                : calling every case negative scores <b style={{ color: ACCENT_INK }}>{fmt(CLS.allNegative * 100, 0)}%</b>
              </span>
            </span>
          </Note>
          <Note at={weightAt - 2} x={ROC.left} y={y(400)}>
            <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
              weight the rare class in the loss, at a threshold of 0.5:
            </span>
          </Note>
          {pairs.map((p, i) => {
            const rowTop = y(470) + i * h(150);
            const before = ease(frame, p.at, 18);
            const after = ease(frame, p.at + 18, 20);
            const color = p.good ? OK : ACCENT;
            const ink = p.good ? OK_INK : ACCENT_INK;
            return (
              <React.Fragment key={p.name}>
                <div style={{ position: "absolute", left: ROC.left, top: rowTop + h(10), ...note(28, INK), fontWeight: 650, opacity: before }}>{p.name}</div>
                {[
                  { v: p.before, p: before, fill: `color-mix(in srgb, ${INK_SOFT} 35%, ${PAPER})`, tag: "unweighted", ink: INK },
                  { v: p.after, p: after, fill: color, tag: "weighted", ink },
                ].map((b, k) => (
                  <React.Fragment key={b.tag}>
                    <div
                      style={{
                        position: "absolute",
                        left: BAR_X,
                        top: rowTop + k * h(52),
                        width: BAR_W * b.v * b.p,
                        height: h(38),
                        background: b.fill,
                        borderRadius: 3,
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        left: BAR_X + BAR_W * b.v + 14,
                        top: rowTop + k * h(52) + h(2),
                        ...note(26, b.ink),
                        fontWeight: 700,
                        ...TABULAR,
                        opacity: b.p,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {pct(b.v)} <span style={{ ...label(19, INK_SOFT), fontWeight: 500 }}>{b.tag}</span>
                    </div>
                  </React.Fragment>
                ))}
              </React.Fragment>
            );
          })}
          <Note at={moveAt - 2} x={ROC.left} y={y(790)}>
            <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
              or move the threshold
              <span style={{ opacity: ease(frame, resampleAt - 2, 10) }}>, or resample</span>
              <span style={{ opacity: ease(frame, judgeAt - 2, 10) }}>
                ; judge by <b style={{ color: OK_INK }}>PR-AUC</b> or <b style={{ color: OK_INK }}>F1</b>
              </span>
            </span>
          </Note>
        </Fade>
      </Drift>
    </AbsoluteFill>
  );
};
