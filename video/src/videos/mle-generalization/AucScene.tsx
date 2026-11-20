import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, fmt, INK, INK_SOFT, TABULAR } from "../../editorial/style";
import { ds } from "../../theme/brand";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { FRAUD } from "./data";
import { at, Axes, commas, Curve, Drift, line, NOISE_C, OK_INK, pulse, Q_SIZE, Say, type Scale, Svg } from "./parts";

const ROC = { left: 200, right: 780 };
const PR = { left: 1100, right: 1680 };
const TOP = 390;
const BOTTOM = 700;

/**
 * Question 9 on the fraud model of question 8. Its ROC curve over the
 * diagonal, the area shaded, 0.91; the false positive rate's denominator, and
 * what 1% of it is here: a thousand false alarms, nearly twice the frauds
 * caught. Beside it the precision-recall curve, which never counts true
 * negatives: 0.46 against a chance level of 0.01, the fraud rate.
 */
export const AucScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("auc").from;
  const qAt = n.word("auc", "Question nine");
  const textAt = n.word("auc", "What is ar-oh-see");
  const rocAt = n.word("auc", "The ROC curve plots");
  const everyAt = n.word("auc", "at every threshold");
  const areaAt = n.word("auc", "Its area is the chance");
  const nineOneAt = n.word("auc-fraud", "point nine one");
  const dividesAt = n.word("auc-fraud", "divides by ninety-nine thousand");
  const onePctAt = n.word("auc-fraud", "At one percent");
  const twiceAt = n.word("auc-fraud", "nearly twice");
  const prAt = n.word("auc-pr", "The precision-recall curve");
  const tnAt = n.word("auc-pr", "never counts true negatives");
  const fourSixAt = n.word("auc-pr", "point four six");
  const chanceAt = n.word("auc-pr", "a chance level");
  const reportAt = n.word("auc-pr", "report pee-ar ay-you-see");
  const baseAt = n.word("auc-pr", "its baseline moves");
  const end = n.beat("auc-pr").to;

  const top = y(TOP);
  const bottom = y(BOTTOM);
  const rx: Scale = { lo: 0, hi: 1, a: ROC.left, b: ROC.right };
  const ry: Scale = { lo: 0, hi: 1, a: bottom, b: top };
  const px: Scale = { lo: 0, hi: 1, a: PR.left, b: PR.right };
  const py: Scale = { lo: 0, hi: 1, a: bottom, b: top };
  const roc = FRAUD.roc.map(([a, b]) => [a, b] as const);
  const pr = [...FRAUD.pr].sort((a, b) => a[0] - b[0]).map(([a, b]) => [a, b] as const);
  const area = (pts: readonly (readonly [number, number])[], sx: Scale, sy: Scale) =>
    [...pts.map(([a, b]) => `${at(sx, a).toFixed(1)},${at(sy, b).toFixed(1)}`), `${at(sx, pts[pts.length - 1][0])},${bottom}`, `${at(sx, pts[0][0])},${bottom}`].join(" ");
  const at1 = FRAUD.thresholds.find((t) => t.t === 0.1) ?? FRAUD.thresholds[3];
  const markX = at(rx, at1.fpr);
  const markY = at(ry, at1.recall);
  const shadeRoc = ease(frame, areaAt, 18);
  const shadePr = ease(frame, fourSixAt - 4, 18);
  const ticks = [0, 0.5, 1];
  const SHADE = ds("blue", 100);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={everyAt} level={-35} />
      <Sfx name="el-whoosh" at={areaAt} level={-37} />
      <Sfx name="el-tap" at={nineOneAt} level={-30} />
      <Sfx name="el-pop" at={onePctAt + 2} level={-30} />
      <Sfx name="el-pencil" at={prAt + 6} level={-35} />
      <Sfx name="el-tap" at={fourSixAt} level={-30} />
      <Sfx name="el-tap" at={reportAt} level={-30} />
      <Sfx name="el-chime" at={end + 6} level={-34} />

      <Drift from={from} to={end + 40} scale={0.016}>
        <QuestionCard n={9} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE}>
          What is ROC-AUC and when does PR-AUC matter more?
        </QuestionCard>

        {/* ── ROC ── */}
        <Say at={rocAt - 2} x={ROC.left} y={top - h(76)}>
          <span style={line(24, INK)}>
            ROC: true positive rate <span style={{ color: INK_SOFT }}>against</span> false positive rate
          </span>
        </Say>
        <Svg opacity={shadeRoc}>
          <polygon points={area(roc, rx, ry)} fill={SHADE} style={{ clipPath: `inset(0 ${(1 - shadeRoc) * 100}% 0 0)` }} />
        </Svg>
        <Axes x={rx} y={ry} xTicks={ticks} yTicks={ticks} xFormat={(v) => (v === 0.5 ? "0.5" : String(v))} yFormat={(v) => (v === 0.5 ? "0.5" : String(v))} at={rocAt} />
        <Svg opacity={ease(frame, rocAt + 6, 12)}>
          <line x1={ROC.left} y1={bottom} x2={ROC.right} y2={top} stroke={NOISE_C} strokeWidth={2.2} strokeDasharray="7 6" />
        </Svg>
        <Curve points={roc} x={rx} y={ry} at={everyAt - 4} dur={26} color={BAR} width={3.6} />
        <Say at={areaAt + 6} x={at(rx, 0.42)} y={at(ry, 0.36)}>
          <span style={{ ...line(36, BLUE_INK), ...TABULAR }}>
            area <span style={{ display: "inline-block", transform: `scale(${1 + 0.12 * pulse(frame, nineOneAt, 20)})` }}>{fmt(FRAUD.rocAuc)}</span>
          </span>
        </Say>
        <Say at={areaAt + 10} x={at(rx, 0.42)} y={at(ry, 0.36) + h(50)}>
          <span style={line(21, INK_SOFT)}>
            the chance a random fraud
            <br />
            outscores a random legitimate one
          </span>
        </Say>
        <Svg opacity={ease(frame, onePctAt, 10)}>
          <circle cx={markX} cy={markY} r={13 + 5 * pulse(frame, onePctAt, 20)} fill="none" stroke={ACCENT} strokeWidth={3.4} />
        </Svg>
        <Say at={onePctAt + 4} x={markX + 24} y={markY - 30}>
          <span style={{ ...line(23, ACCENT_INK), ...TABULAR }}>1%</span>
        </Say>
        <Say at={dividesAt - 2} x={ROC.left} y={y(758)}>
          <span style={line(24, INK)}>
            False positive rate: false alarms ÷ <span style={TABULAR}>{commas(FRAUD.legit)}</span> legitimate
          </span>
        </Say>
        <Say at={onePctAt - 2} x={ROC.left} y={y(758) + h(48)}>
          <span style={line(26, ACCENT_INK)}>
            At 1%: <span style={TABULAR}>{commas(at1.fp)}</span> false alarms
            <span style={{ opacity: ease(frame, twiceAt - 2, 10) }}>
              , <span style={TABULAR}>{at1.tp}</span> frauds caught
            </span>
          </span>
        </Say>

        {/* ── Precision-recall ── */}
        <Say at={prAt - 2} x={PR.left} y={top - h(76)}>
          <span style={line(24, INK)}>
            Precision <span style={{ color: INK_SOFT }}>against</span> recall
          </span>
        </Say>
        <Svg opacity={shadePr}>
          <polygon points={area(pr, px, py)} fill={SHADE} style={{ clipPath: `inset(0 ${(1 - shadePr) * 100}% 0 0)` }} />
        </Svg>
        <Axes x={px} y={py} xTicks={ticks} yTicks={ticks} xFormat={(v) => (v === 0.5 ? "0.5" : String(v))} yFormat={(v) => (v === 0.5 ? "0.5" : String(v))} at={prAt} />
        <Curve points={pr} x={px} y={py} at={prAt + 6} dur={26} color={BAR} width={3.6} />
        <Svg opacity={ease(frame, chanceAt, 12)}>
          <line x1={PR.left} x2={PR.right} y1={at(py, FRAUD.rate) - 3} y2={at(py, FRAUD.rate) - 3} stroke={NOISE_C} strokeWidth={2.6} strokeDasharray="7 6" />
        </Svg>
        <Say at={fourSixAt - 2} x={at(px, 0.06)} y={at(py, 0.4)}>
          <span style={{ ...line(36, BLUE_INK), ...TABULAR }}>area {fmt(FRAUD.prAuc)}</span>
        </Say>
        <Say at={chanceAt + 2} x={at(px, 0.06)} y={at(py, 0.4) + h(50)}>
          <span style={{ ...line(21, INK_SOFT) }}>
            chance: <span style={TABULAR}>{fmt(FRAUD.rate)}</span>, the fraud rate
          </span>
        </Say>
        <Say at={tnAt - 2} x={PR.left} y={y(758)}>
          <span style={line(24, INK)}>Never counts true negatives</span>
        </Say>
        <Say at={reportAt - 2} x={PR.left} y={y(758) + h(48)}>
          <span style={line(26, OK_INK)}>Rare positives: report PR-AUC</span>
        </Say>
        <Say at={baseAt - 2} x={PR.left} y={y(758) + h(96)}>
          <span style={line(22, INK_SOFT)}>Its baseline moves with the base rate</span>
        </Say>
      </Drift>
    </AbsoluteFill>
  );
};
