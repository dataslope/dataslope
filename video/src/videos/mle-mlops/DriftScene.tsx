import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { M } from "../../editorial/math";
import { ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, label, svgText } from "../../editorial/style";
import { ColumnRule, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { DRIFT } from "./data";
import { BadgeRow, Box, CornerLoop, LONG_Q, LONG_W, Drift, lerp, Line, Mark, OK_INK, pct, Phase, rng, Svg, X0, YELLOW_INK } from "./parts";

const PANEL_B = 1000;
const RULE_X = 930;
const NEG = ds("gray", 400);

/** Forty points, seeded, roughly normal in both features. */
const POINTS = (() => {
  const r = rng(7);
  const g = () => (r() + r() + r() - 1.5) * 1.15;
  return Array.from({ length: 40 }, () => [g(), g()] as const);
})();

type Rule = { a: number; b: number; c: number };
/** The simulation's rules: the label is 1 where a·x1 + b·x2 + c > 0. */
const BEFORE: Rule = { a: 2, b: 1, c: 0 };
const AFTER: Rule = { a: 2, b: -1.5, c: -1 };
/** A rule part way between two: its unit normal swung from one to the other
 *  (normalized linear interpolation, which never passes through zero here,
 *  the two normals being about 64 degrees apart) and its offset eased. */
const turnRule = (t: number) => {
  const na = Math.hypot(BEFORE.a, BEFORE.b);
  const nb = Math.hypot(AFTER.a, AFTER.b);
  const vx = lerp(BEFORE.a / na, AFTER.a / nb, t);
  const vy = lerp(BEFORE.b / na, AFTER.b / nb, t);
  const len = Math.hypot(vx, vy);
  return { nx: vx / len, ny: vy / len, off: lerp(BEFORE.c / na, AFTER.c / nb, t) };
};

/** A rule's boundary, as a long segment through the plot (clipped to its frame). */
const boundary = (rule: ReturnType<typeof turnRule>, X: (v: number) => number, Y: (v: number) => number) => {
  const px = -rule.off * rule.nx;
  const py = -rule.off * rule.ny;
  const dx = -rule.ny;
  const dy = rule.nx;
  return { x1: X(px - 6 * dx), y1: Y(py - 6 * dy), x2: X(px + 6 * dx), y2: Y(py + 6 * dy) };
};
/** The model's boundary once the world's has turned away from it: pale. */
const MODEL_LINE = ds("gray", 400);
const GHOST = ds("gray", 200);

/**
 * A small scatter of the two features, the true boundary drawn across; each
 * point is colored by its label under that rule (blue y = 1, grey y = 0).
 * `model` (0 → 1) keeps the boundary the model learned, pale, where the true
 * one has turned away from it: the points on the wrong side of it are what
 * the model now gets wrong.
 */
const Scatter: React.FC<{ x: number; y: number; w: number; h: number; at: number; shift: number; turn: number; model?: number }> = ({
  x,
  y,
  w,
  h,
  at,
  shift,
  turn,
  model = 0,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const X = (v: number) => x + ((v + 2.6) / 6.2) * w;
  const Y = (v: number) => y + h - ((v + 2.4) / 4.8) * h;
  const rule = turnRule(turn);
  const line = boundary(rule, X, Y);
  const learned = boundary(turnRule(0), X, Y);
  const id = `clip-${Math.round(x)}`;
  return (
    <Svg opacity={p}>
      <defs>
        <clipPath id={id}>
          <rect x={x} y={y} width={w} height={h} />
        </clipPath>
      </defs>
      <line x1={x} x2={x + w} y1={y + h} y2={y + h} stroke={INK_SOFT} strokeWidth={1.4} />
      <line x1={x} x2={x} y1={y} y2={y + h} stroke={INK_SOFT} strokeWidth={1.4} />
      <g clipPath={`url(#${id})`}>
        {POINTS.map(([a, b], i) => {
          const ax = a + shift * 1.1;
          const pos = rule.nx * ax + rule.ny * b + rule.off > 0;
          return (
            <React.Fragment key={i}>
              {shift > 0 ? <circle cx={X(a)} cy={Y(b)} r={6} fill={GHOST} /> : null}
              <circle cx={X(ax)} cy={Y(b)} r={7} fill={pos ? BAR : NEG} />
            </React.Fragment>
          );
        })}
        {model > 0 ? <line {...learned} stroke={MODEL_LINE} strokeWidth={2.6} strokeDasharray="8 6" opacity={model} /> : null}
        <line {...line} stroke={INK} strokeWidth={2.6} strokeDasharray="8 6" />
      </g>
      <text x={x + w} y={y + h + 30} textAnchor="end" style={svgText(label(20, INK_SOFT))}>
        first feature
      </text>
    </Svg>
  );
};

/** A scatter's key: a dot of each color and what it is, inking in on `at`. */
const Key: React.FC<{ x: number; y: number; at: number; items: readonly { color: string; text: React.ReactNode }[] }> = ({ x, y, at, items }) => (
  <Line at={at} x={x} y={y} size={21} color={INK_SOFT}>
    {items.map((it, i) => (
      <span key={i} style={{ display: "inline-flex", alignItems: "center", marginLeft: i ? 24 : 0 }}>
        <svg width={14} height={14} style={{ marginRight: 8, flex: "none" }}>
          <circle cx={7} cy={7} r={7} fill={it.color} />
        </svg>
        {it.text}
      </span>
    ))}
  </Line>
);

/** The window's share of the first feature in each training decile, against
 *  the 10% each held in training (the dashed line). */
const Deciles: React.FC<{ x: number; y: number; w: number; h: number; at: number; shares: readonly number[]; color: string }> = ({ x, y, w, h, at, shares, color }) => {
  const frame = useCurrentFrame();
  const top = 0.4;
  const bw = w / 10;
  const Y = (v: number) => y + h - (v / top) * h;
  return (
    <Svg opacity={ease(frame, at - 6, 10)}>
      {shares.map((s, i) => {
        const p = ease(frame, at + i * 2, 14);
        return <rect key={i} x={x + i * bw + 4} y={Y(s * p)} width={bw - 8} height={Math.max(0, y + h - Y(s * p))} rx={4} fill={color} />;
      })}
      <line x1={x} x2={x + w} y1={y + h} y2={y + h} stroke={INK_SOFT} strokeWidth={1.4} />
      <line x1={x - 6} x2={x + w + 6} y1={Y(0.1)} y2={Y(0.1)} stroke={INK} strokeWidth={2} strokeDasharray="6 6" />
      <text x={x + w + 14} y={Y(0.1) + 7} style={svgText(label(20, INK))}>
        training: 10% each
      </text>
      <text x={x} y={y + h + 30} style={svgText(label(20, INK_SOFT))}>
        first feature, by training decile
      </text>
    </Svg>
  );
};

/**
 * Questions 7 and 8: data drift (the inputs move under a fixed boundary) and
 * concept drift (the inputs stay, the boundary turns), and the degradation
 * either can cause. Then the simulation: the first feature shifts and its
 * PSI rings at 0.91 while accuracy rises from 80% to 84%; another quarter no
 * input moves, every PSI stays under 0.02, and accuracy falls to 61%. The
 * inputs alarm for the harmless shift and stay silent for the harmful one,
 * so concept drift is confirmed with labels, and the response is in
 * proportion.
 */
export const DriftScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q7").from;
  const qAt = n.word("q7", "Questions seven and eight");
  const textAt = n.word("q7", "Data drift versus");
  const dataDefAt = n.word("q7-defs", "Data drift is the inputs shifting");
  const customerAt = n.word("q7-defs", "a new kind of customer");
  const unitsAt = n.word("q7-defs", "a sensor's new units");
  const conceptDefAt = n.word("q7-defs", "Concept drift is the link");
  const tacticsAt = n.word("q7-defs", "fraud tactics evolve");
  const meanAt = n.word("q7-defs", "the same features mean something new");
  const degAt = n.word("q7-defs", "Degradation is the drop");
  const simAt = n.word("q7-data", "Simulate a model");
  const shiftsAt = n.word("q7-data", "Next quarter, the first one shifts");
  const scoreAt = n.word("q7-data", "Its drift score");
  const psiAt = n.word("q7-data", "reads point nine one");
  const alarmAt = n.word("q7-data", "a loud alarm");
  const risesAt = n.word("q7-rises", "Yet accuracy rises");
  const r84At = n.word("q7-rises", "to eighty-four");
  const thisAt = n.word("q7-rises", "This time");
  const anotherAt = n.word("q7-concept", "Another quarter");
  const everyAt = n.word("q7-concept", "Every PSI");
  const underAt = n.word("q7-concept", "stays under point oh two");
  const changedAt = n.word("q7-concept", "But the relationship changed");
  const r61At = n.word("q7-concept", "accuracy falls to sixty-one");
  const rangAt = n.word("q7-respond", "The inputs rang");
  const silentAt = n.word("q7-respond", "stayed silent for the harmful one");
  const labelsAt = n.word("q7-respond", "Confirming concept drift takes labels");
  const trackAt = n.word("q7-respond", "track accuracy and calibration over time");
  const cohortsAt = n.word("q7-respond", "against stable cohorts");
  const proportionAt = n.word("q7-respond", "respond in proportion");
  const alertAt = n.word("q7-respond", "an alert");
  const retrainAt = n.word("q7-respond", "a retrain on recent data");
  const featuresAt = n.word("q7-respond", "or new features");
  const end = n.beat("q7-respond").to;

  // Phase A: the two kinds of drift.
  const shift = ease(frame, dataDefAt + 6, 40);
  const turn = ease(frame, conceptDefAt + 10, 44);
  const sc = { w: 420, h: h(210), top: y(440) };
  const fmtPsi = (v: number) => v.toFixed(2);
  const conceptMax = Math.max(DRIFT.concept.psiX1, DRIFT.concept.psiX2, DRIFT.concept.psiPred);
  const conceptBound = conceptMax < 0.02 ? "0.02" : fmtPsi(Math.ceil(conceptMax * 100) / 100);
  const ch = { w: 470, h: h(190), top: y(420) };
  // Phase C: the two-by-two.
  const grid = { x: 360, top: y(390), cw: 250, ch: h(96), gap: 16 };

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={dataDefAt + 6} level={-37} />
      <Sfx name="el-whoosh" at={conceptDefAt + 10} level={-37} />
      <Sfx name="el-tap" at={degAt} level={-31} />
      <Sfx name="el-sprinkle" at={shiftsAt} level={-33} />
      <Sfx name="el-tap" at={psiAt} level={-29} />
      <Sfx name="el-tap" at={r84At} level={-30} />
      <Sfx name="el-sprinkle" at={anotherAt + 4} level={-33} />
      <Sfx name="el-tap" at={underAt} level={-31} />
      <Sfx name="el-tap" at={r61At} level={-29} />
      <Sfx name="el-tap" at={rangAt} level={-31} />
      <Sfx name="el-tap" at={silentAt} level={-31} />
      {[alertAt, retrainAt, featuresAt].map((at, i) => (
        <Sfx key={i} name="el-tap" at={at} level={-33} />
      ))}
      <Sfx name="el-chime" at={end + 10} level={-33} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={7} kicker="Questions 7 and 8" at={qAt - 4} textAt={textAt - 4} size={LONG_Q} width={LONG_W}>
          Data drift vs concept drift vs performance degradation? And how do you detect and respond to concept drift?
        </QuestionCard>
        <CornerLoop at={qAt} lit="watch" />

        {/* ── A: the definitions ── */}
        <Phase from={dataDefAt - 6} to={simAt - 6}>
          <Line at={dataDefAt - 2} x={X0} y={y(330)} size={26} color={INK}>
            Data drift: <M>P(x)</M> moves
          </Line>
          <Line at={customerAt - 2} x={X0} y={y(330) + h(44)} size={22} color={INK_SOFT}>
            A new kind of customer<span style={{ opacity: ease(frame, unitsAt - 2, 10) }}>, a sensor&apos;s new units</span>
          </Line>
          <Scatter x={X0 + 20} y={sc.top} w={sc.w} h={sc.h} at={dataDefAt} shift={shift} turn={0} />
          <ColumnRule x={RULE_X} top={y(330)} height={sc.top + sc.h - y(330)} at={conceptDefAt} />
          <Line at={conceptDefAt - 2} x={PANEL_B} y={y(330)} size={26} color={INK}>
            Concept drift: <M>P(y | x)</M> moves
          </Line>
          <Line at={tacticsAt - 2} x={PANEL_B} y={y(330) + h(44)} size={22} color={INK_SOFT}>
            Fraud tactics evolve<span style={{ opacity: ease(frame, meanAt - 2, 10) }}>: the same features mean something new</span>
          </Line>
          <Scatter x={PANEL_B + 20} y={sc.top} w={sc.w} h={sc.h} at={conceptDefAt} shift={0} turn={turn} model={ease(frame, conceptDefAt + 10, 12)} />
          <Line at={dataDefAt + 30} x={X0 + 20 + sc.w + 30} y={sc.top + sc.h * 0.3} size={21} color={INK_SOFT}>
            the points move,
          </Line>
          <Line at={dataDefAt + 40} x={X0 + 20 + sc.w + 30} y={sc.top + sc.h * 0.3 + 30} size={21} color={INK_SOFT}>
            the boundary stays
          </Line>
          {/* What the colors are: each point's label under the true rule. */}
          <Key
            x={X0 + 20 + sc.w + 30}
            y={sc.top + sc.h * 0.3 + 120}
            at={dataDefAt + 48}
            items={[
              { color: BAR, text: <M>y = 1</M> },
              { color: NEG, text: <M>y = 0</M> },
            ]}
          />
          <Key x={X0 + 20 + sc.w + 30} y={sc.top + sc.h * 0.3 + 150} at={dataDefAt + 54} items={[{ color: GHOST, text: "before the shift" }]} />
          <Line at={conceptDefAt + 40} x={PANEL_B + 20 + sc.w + 30} y={sc.top + sc.h * 0.3} size={21} color={INK_SOFT}>
            the points stay,
          </Line>
          <Line at={conceptDefAt + 50} x={PANEL_B + 20 + sc.w + 30} y={sc.top + sc.h * 0.3 + 30} size={21} color={INK_SOFT}>
            the true boundary turns;
          </Line>
          <Line at={conceptDefAt + 58} x={PANEL_B + 20 + sc.w + 30} y={sc.top + sc.h * 0.3 + 60} size={21} color={INK_SOFT}>
            the model&apos;s (pale) stays
          </Line>
          <Key
            x={PANEL_B + 20 + sc.w + 30}
            y={sc.top + sc.h * 0.3 + 120}
            at={conceptDefAt + 64}
            items={[
              { color: BAR, text: <M>y = 1</M> },
              { color: NEG, text: <M>y = 0</M> },
            ]}
          />
          <Line at={degAt - 2} x={X0} y={sc.top + sc.h + h(70)} size={26} color={INK}>
            Degradation: <Mark at={degAt + 10}>the drop in quality either can cause</Mark>
          </Line>
        </Phase>

        {/* ── B: the simulation ── */}
        <Phase from={simAt - 4} to={rangAt - 6}>
          <Line at={simAt} x={X0} y={y(316)} size={22} color={INK_SOFT}>
            Simulation: a logistic regression on two features, <Num>{DRIFT.train.toLocaleString("en-US")}</Num> training rows, windows of{" "}
            <Num>{DRIFT.window.toLocaleString("en-US")}</Num>
          </Line>
          <Line at={shiftsAt - 2} x={X0} y={y(372)} size={25} color={INK}>
            Next quarter: the first feature shifts
          </Line>
          <Deciles x={X0 + 10} y={ch.top} w={ch.w} h={ch.h} at={shiftsAt} shares={DRIFT.x1Shares.data} color={BAR} />
          <Line at={scoreAt} x={X0} y={ch.top + ch.h + h(62)} size={25} color={INK}>
            <Mark at={psiAt}>
              PSI <Num>{fmtPsi(DRIFT.data.psiX1)}</Num>:
            </Mark>
            <span style={{ color: YELLOW_INK, opacity: ease(frame, alarmAt, 10) }}> a loud alarm</span>
          </Line>
          <Line at={risesAt - 2} x={X0} y={ch.top + ch.h + h(110)} size={25} color={BLUE_INK}>
            Accuracy <Num>{pct(DRIFT.same.accuracy)}</Num>
            <span style={{ opacity: ease(frame, r84At - 2, 10) }}>
              {" "}
              → <b><Num>{pct(DRIFT.data.accuracy)}</Num></b>
            </span>
          </Line>
          <Line at={thisAt - 2} x={X0} y={ch.top + ch.h + h(158)} size={22} color={INK_SOFT}>
            This time, the learned rule still held where the inputs moved
          </Line>

          <ColumnRule x={RULE_X} top={y(372)} height={ch.top + ch.h + h(180) - y(372)} at={anotherAt} />
          <Line at={anotherAt - 2} x={PANEL_B} y={y(372)} size={25} color={INK}>
            Another quarter: no input moves
          </Line>
          <Deciles x={PANEL_B + 10} y={ch.top} w={ch.w} h={ch.h} at={anotherAt + 6} shares={DRIFT.x1Shares.concept} color={BAR} />
          <Line at={everyAt - 2} x={PANEL_B} y={ch.top + ch.h + h(62)} size={25} color={INK_SOFT}>
            Every PSI under <Num>{conceptBound}</Num>
            <span style={{ opacity: ease(frame, underAt + 6, 10) }}>: both features and the predictions</span>
          </Line>
          <Line at={changedAt - 2} x={PANEL_B} y={ch.top + ch.h + h(110)} size={25} color={ACCENT_INK}>
            Accuracy <Num>{pct(DRIFT.same.accuracy)}</Num>
            <span style={{ opacity: ease(frame, r61At - 2, 10) }}>
              {" "}
              → <b><Num>{pct(DRIFT.concept.accuracy)}</Num></b>
            </span>
          </Line>
          <Line at={changedAt + 4} x={PANEL_B} y={ch.top + ch.h + h(158)} size={22} color={INK_SOFT}>
            The relationship changed
          </Line>
        </Phase>

        {/* ── C: what the inputs say, against what happened ── */}
        <Phase from={rangAt - 4}>
          <Line at={rangAt - 2} x={grid.x + grid.cw / 2} width={grid.cw} align="center" y={grid.top - h(44)} size={22} color={INK_SOFT}>
            accuracy held
          </Line>
          <Line at={rangAt - 2} x={grid.x + grid.cw * 1.5 + grid.gap} width={grid.cw} align="center" y={grid.top - h(44)} size={22} color={INK_SOFT}>
            accuracy fell
          </Line>
          <Line at={rangAt} x={grid.x - 24} width={220} align="right" y={grid.top + grid.ch / 2 - 15} size={22} color={INK_SOFT}>
            inputs alarm
          </Line>
          <Line at={rangAt + 4} x={grid.x - 24} width={220} align="right" y={grid.top + grid.ch + grid.gap + grid.ch / 2 - 15} size={22} color={INK_SOFT}>
            inputs quiet
          </Line>
          {[0, 1].map((r) =>
            [0, 1].map((c) => {
              const isData = r === 0 && c === 0;
              const isConcept = r === 1 && c === 1;
              return (
                <Box
                  key={`${r}${c}`}
                  x={grid.x + c * (grid.cw + grid.gap)}
                  y={grid.top + r * (grid.ch + grid.gap)}
                  w={grid.cw}
                  h={grid.ch}
                  at={rangAt + 4}
                  tone={isConcept ? "bad" : "plain"}
                  title={isData ? "Data drift" : isConcept ? "Concept drift" : undefined}
                  sub={isData ? "harmless, this time" : isConcept ? "harmful, and silent" : undefined}
                  lit={isData ? rangAt + 8 : undefined}
                  size={24}
                  dashed={!isData && !isConcept}
                />
              );
            }),
          )}
          <Line at={labelsAt - 2} x={X0} y={grid.top + 2 * grid.ch + grid.gap + h(56)} size={25} color={INK}>
            Confirming concept drift takes labels:
          </Line>
          <Line at={trackAt - 2} x={X0} y={grid.top + 2 * grid.ch + grid.gap + h(98)} size={25} color={OK_INK}>
            <Mark at={trackAt + 6}>accuracy and calibration over time</Mark>
            <span style={{ color: INK_SOFT, opacity: ease(frame, cohortsAt - 2, 10) }}>, against stable cohorts</span>
          </Line>

          <ColumnRule x={RULE_X + 50} top={grid.top - h(44)} height={2 * grid.ch + grid.gap + h(44)} at={proportionAt} />
          <Line at={proportionAt - 2} x={PANEL_B + 60} y={grid.top - h(44)} size={25} color={INK}>
            Respond in proportion
          </Line>
          <BadgeRow x={PANEL_B + 60} y={grid.top + h(6)} size={24} items={[{ text: "Alert", at: alertAt - 2, lit: alertAt, litOut: retrainAt }]} />
          <BadgeRow x={PANEL_B + 60} y={grid.top + h(66)} size={24} items={[{ text: "Retrain on recent data", at: retrainAt - 2, lit: retrainAt, litOut: featuresAt }]} />
          <BadgeRow x={PANEL_B + 60} y={grid.top + h(126)} size={24} items={[{ text: "New features, if the change is structural", at: featuresAt - 2, lit: featuresAt }]} />
        </Phase>
      </Drift>
    </AbsoluteFill>
  );
};
