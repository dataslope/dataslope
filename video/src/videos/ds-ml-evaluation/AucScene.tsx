import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, PAPER, TABULAR, fmt, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CLS, count, pct } from "./data";
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

/** A horizontal chance level across a square plot, labelled above its left end. */
const ChanceLine: React.FC<{ b: Box; level: number; at: number; dash: string; children: React.ReactNode }> = ({
  b,
  level,
  at: from,
  dash,
  children,
}) => {
  const frame = useCurrentFrame();
  const { y } = useLayout();
  const p = ease(frame, from, 16);
  if (p <= 0) return null;
  const ly = y(b.bottom) - level * (y(b.bottom) - y(b.top));
  return (
    <>
      <Svg>
        <line x1={b.left} x2={b.left + (b.right - b.left) * p} y1={ly} y2={ly} stroke={INK_SOFT} strokeWidth={2} strokeDasharray={dash} />
      </Svg>
      <div style={{ position: "absolute", left: b.left + 14, top: ly - 32, ...label(20, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap", opacity: ease(frame, from + 6, 10) }}>
        {children}
      </div>
    </>
  );
};

/**
 * Questions 9 and 10 on the same 200,000 cases. The ROC curve over its
 * chance diagonal (area 0.94) beside the PR curve (area 0.45) over its own
 * chance level, the positive rate (0.02); then the same scores on a balanced
 * test set, dashed: ROC hardly moves, PR jumps to 0.94 as its chance level
 * jumps to 0.5. Beside them, what a low false positive rate hides: 6.8% of
 * the negatives is still 13,402 false alarms against 3,017 catches.
 * Then imbalance: accuracy struck out (98% for calling everything negative),
 * what class weights do to recall and precision at 0.5, and the plain model
 * with its threshold moved to 0.02 landing on nearly the same pair.
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
  const prAt = n.word("auc-pr", "The PR curve plots precision");
  const onlyAt = n.word("auc-pr", "its area here is point four five");
  const prChanceAt = n.word("auc-pr", "Chance on it is the positive rate");
  const sameAt = n.word("auc-balance", "Same model, same scores");
  const movesAt = n.word("auc-balance", "barely moves");
  const jumpsAt = n.word("auc-balance", "pee-ar ay-you-see jumps");
  const floodAt = n.word("auc-balance", "The false positive rate divides");
  const easyAt = n.word("auc-balance", "a flood of easy ones");
  const flattersAt = n.word("auc-balance", "flatters the ROC curve");
  const honestAt = n.word("auc-balance", "the honest one");
  const q10At = n.word("imbalance", "Question ten");
  const q10TextAt = n.word("imbalance", "How do you handle");
  const ignoreAt = n.word("imbalance", "ignoring accuracy");
  const negAt = n.word("imbalance", "calling every case negative");
  const weightAt = n.word("imbalance-fix", "Weight the rare class");
  const recallAt = n.word("imbalance-fix", "recall goes from");
  const precAt = n.word("imbalance-fix", "while precision falls");
  const moveAt = n.word("imbalance-fix", "Or move the threshold");
  const resampleAt = n.word("imbalance-fix", "or resample");
  const judgeAt = n.word("imbalance-fix", "judge the result");
  const movingAt = n.word("imbalance-same", "moving the threshold");
  const recall2At = n.word("imbalance-same", "eighty-seven percent recall");
  const prec2At = n.word("imbalance-same", "eleven percent precision");
  const end = n.beat("imbalance-same").to;

  const unit: Scale = { lo: 0, hi: 1, a: 0, b: 1 };
  const xsOf = (b: Box): Scale => ({ ...unit, a: b.left, b: b.right });
  const ysOf = (b: Box): Scale => ({ ...unit, a: y(b.bottom), b: y(b.top) });
  const clipOf = (b: Box): Box => ({ left: b.left - 6, right: b.right + 6, top: y(b.top) - 6, bottom: y(b.bottom) + 6 });
  const areaP = ease(frame, areaAt, 20);
  const rocArea = `M${ROC.left},${y(ROC.bottom)} ${CLS.roc.map(([fx, ty]) => `L${at(xsOf(ROC), fx)},${at(ysOf(ROC), ty)}`).join(" ")} L${ROC.right},${y(ROC.bottom)} Z`;
  const out9 = q10At - 6;

  const plain = CLS.plainAt50;
  const weighted = CLS.weightedAt50;
  // The plain model with its threshold moved to 0.02 lands where the weights
  // did at 0.5: the weights mostly moved the threshold.
  const [lowT, lowPrecision, lowRecall] = CLS.curve.find(([t]) => t === 0.02)!;
  const pairs = [
    { name: "recall", at: recallAt, lowAt: recall2At, before: plain.recall, after: weighted.recall, low: lowRecall, good: true },
    { name: "precision", at: precAt, lowAt: prec2At, before: plain.precision, after: weighted.precision, low: lowPrecision, good: false },
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
          <Square b={ROC} at={asked} xTitle="false positive rate" yTitle="true positive rate (recall)" diagonal />
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
          {/* PR's chance level is the share positive: 0.02 here, 0.5 on the
              balanced set, which is most of why its area jumps. */}
          <ChanceLine b={PR} level={CLS.prevalence} at={prChanceAt} dash="2 6">
            chance: {fmt(CLS.prevalence)}, the positive rate
          </ChanceLine>
          <ChanceLine b={PR} level={CLS.prevalenceBalanced} at={jumpsAt + 6} dash="2 6">
            chance: {fmt(CLS.prevalenceBalanced, 1)}
          </ChanceLine>

          {/* ── The two areas, and then on a balanced test set ── */}
          <Note at={hereAt - 2} x={READ_X} y={y(ROC.top)}>
            {/* Tabular figures on the numbers only: over the whole span they set
                the hyphen a digit wide ("ROC - AUC"). */}
            <span style={{ ...note(30, INK), whiteSpace: "nowrap" }}>
              ROC-AUC <b style={{ color: BLUE_INK, ...TABULAR }}>{fmt(CLS.auc)}</b>
              <span style={{ opacity: ease(frame, movesAt - 2, 10) }}>
                {" "}→ <b style={TABULAR}>{fmt(CLS.aucBalanced)}</b>
              </span>
            </span>
          </Note>
          <Note at={onlyAt - 2} x={READ_X} y={y(ROC.top) + h(56)}>
            <span style={{ ...note(30, INK), whiteSpace: "nowrap" }}>
              PR-AUC <b style={{ color: BLUE_INK, ...TABULAR }}>{fmt(CLS.ap)}</b>
              <span style={{ opacity: ease(frame, jumpsAt - 2, 10) }}>
                {/* In ink, as ROC's balanced value is: green would endorse the
                    rebalanced test set the answer warns against. */}
                {" "}→ <b style={TABULAR}>{fmt(CLS.apBalanced)}</b>
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
          {/* The flattering, in counts: a small rate of a huge denominator. */}
          <Note at={easyAt} x={READ_X} y={y(ROC.top) + h(330)}>
            <div style={{ ...note(22, INK), whiteSpace: "nowrap", lineHeight: 1.35 }}>
              <div>
                at <span style={TABULAR}>{pct(CLS.alarms.recall)}</span> recall it is only <span style={TABULAR}>{pct(CLS.alarms.fpr, 1)}</span>,
              </div>
              <div style={{ opacity: ease(frame, flattersAt - 2, 10) }}>
                but that is <b style={{ color: ACCENT_INK, ...TABULAR }}>{count(CLS.alarms.fp)}</b> false alarms
              </div>
              <div style={{ opacity: ease(frame, flattersAt + 6, 10) }}>
                against <b style={{ color: BLUE_INK, ...TABULAR }}>{count(CLS.alarms.tp)}</b> catches
              </div>
            </div>
          </Note>
          <Note at={honestAt - 2} x={READ_X} y={y(ROC.top) + h(445)}>
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
            const rowTop = y(470) + i * h(160);
            const before = ease(frame, p.at, 18);
            const after = ease(frame, p.at + 18, 20);
            const low = ease(frame, p.lowAt, 20);
            const color = p.good ? OK : ACCENT;
            const ink = p.good ? OK_INK : ACCENT_INK;
            return (
              <React.Fragment key={p.name}>
                <div style={{ position: "absolute", left: ROC.left, top: rowTop + h(10), ...note(28, INK), fontWeight: 650, opacity: before }}>{p.name}</div>
                {[
                  { v: p.before, p: before, fill: `color-mix(in srgb, ${INK_SOFT} 35%, ${PAPER})`, tag: "unweighted", ink: INK },
                  { v: p.after, p: after, fill: color, tag: "weighted", ink },
                  { v: p.low, p: low, fill: `color-mix(in srgb, ${color} 45%, ${PAPER})`, tag: `unweighted, threshold ${lowT}`, ink },
                ].map((b, k) => (
                  <React.Fragment key={b.tag}>
                    <div
                      style={{
                        position: "absolute",
                        left: BAR_X,
                        top: rowTop + k * h(46),
                        width: BAR_W * b.v * b.p,
                        height: h(34),
                        background: b.fill,
                        boxSizing: "border-box",
                        border: k === 2 && b.p > 0 ? `2px solid ${color}` : undefined,
                        borderRadius: 3,
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        left: BAR_X + BAR_W * b.v + 14,
                        top: rowTop + k * h(46),
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
              or <Mark at={movingAt}>move the threshold</Mark>
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
