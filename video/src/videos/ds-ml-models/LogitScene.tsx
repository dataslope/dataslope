import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, INK, INK_SOFT, TABULAR, fmt, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { LOGIT } from "./data";
import { at, Axes, type Box, Curve, Drift, Mark, mulberry32, OK, OK_INK, Points, pulse, type Scale, Svg } from "./parts";

const LEFT = 200;
const WIDTH = 820;
const TOP = 330;
const HEIGHT = 470;
const COL = 1110;
const R_LO = 6;
const R_HI = 30;

/** Where each tumor sits around its 0 or 1, the same on every frame. */
const JITTER = (() => {
  const rand = mulberry32(569);
  return LOGIT.label.map((l) => l + (rand() - 0.5) * 0.07);
})();

const Formula: React.FC<{ children: React.ReactNode; color?: string; size?: number }> = ({ children, color = INK, size = 30 }) => (
  <span style={{ ...note(size, color), fontWeight: 600, whiteSpace: "nowrap", ...TABULAR }}>{children}</span>
);

/** An italic variable in a formula. */
const V: React.FC<{ children: React.ReactNode }> = ({ children }) => <i style={{ fontFamily: "inherit" }}>{children}</i>;

/**
 * Questions 1 and 2. The sigmoid on its own score axis, which turns into the
 * tumors' mean radius once the fitted score is a line in it (the curve does
 * not move, only its ticks), with the tumors at 0 and 1. Then the frame
 * opens past both ends for a straight line through the same labels, which
 * leaves the range at each end.
 */
export const LogitScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("logit").from;
  const qAt = n.word("logit", "Question one");
  const textAt = n.word("logit", "What is logistic regression");
  const addsAt = n.word("logit", "It adds up the features");
  const oddsAt = n.word("logit", "the log odds");
  const sigAt = n.word("logit", "through the sigmoid");
  const squeezeAt = n.word("logit", "squeezes any number");
  const tumorsAt = n.word("logit-fit", "five hundred sixty-nine tumors");
  const radiusAt = n.word("logit-fit", "the mean radius");
  const fitAt = n.word("logit-fit", "The score is minus");
  const fifteenAt = n.word("logit-fit", "At a radius of fifteen");
  const p56At = n.word("logit-fit", "fifty-six percent");
  const oddsXAt = n.word("logit-fit", "multiplies the odds");
  const q2At = n.word("linear", "Question two");
  const q2TextAt = n.word("linear", "Why not linear regression");
  const lineAt = n.word("linear", "Fit a straight line");
  const leavesAt = n.word("linear", "it leaves the range");
  const belowAt = n.word("linear", "below zero");
  const aboveAt = n.word("linear", "above one");
  const r28At = n.word("linear", "At a radius of twenty-eight");
  const insideAt = n.word("linear", "stays inside");
  const mlAt = n.word("linear", "maximum likelihood");
  const nextAt = n.word("tree-in", "Next");
  const end = n.beat("tree-in").to;

  // The frame opens from just around 0 to 1 to well past both ends.
  const open = ease(frame, lineAt - 6, 26);
  const yLo = -0.08 + (-0.75 + 0.08) * open;
  const yHi = 1.08 + (2.05 - 1.08) * open;
  const box: Box = { left: LEFT, top: y(TOP), width: WIDTH, height: h(HEIGHT) };
  const sx: Scale = { lo: R_LO, hi: R_HI, a: LEFT, b: LEFT + WIDTH };
  const sz: Scale = { lo: LOGIT.b0 + LOGIT.b1 * R_LO, hi: LOGIT.b0 + LOGIT.b1 * R_HI, a: LEFT, b: LEFT + WIDTH };
  const sy: Scale = { lo: yLo, hi: yHi, a: box.top + box.height, b: box.top };

  const ex = LOGIT.example;
  const exP = ease(frame, fifteenAt + 2, 16);
  const at28 = LOGIT.linAt["28"];
  const out1 = q2At - 4;
  const insideSwell = pulse(frame, insideAt, 22);
  const outside = ease(frame, leavesAt, 14);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={sigAt + 2} level={-34} />
      <Sfx name="el-sprinkle" at={tumorsAt + 2} level={-36} />
      <Sfx name="el-tap" at={p56At} level={-34} />
      <Sfx name="el-scratch" at={lineAt + 4} level={-32} />
      <Sfx name="el-pop" at={r28At + 4} level={-33} />
      <Sfx name="el-chime" at={insideAt} level={-36} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} out={out1} size={60}>
          What is logistic regression, and how does it output probabilities?
        </QuestionCard>
        <QuestionCard n={2} at={q2At} textAt={q2TextAt - 2} size={60}>
          Why not linear regression for a binary target?
        </QuestionCard>

        {/* The range a probability can take, and what lies outside it. */}
        <Svg opacity={outside}>
          <rect x={box.left} y={at(sy, yHi)} width={box.width} height={at(sy, 1) - at(sy, yHi)} fill={ACCENT} opacity={0.07} />
          <rect x={box.left} y={at(sy, 0)} width={box.width} height={at(sy, yLo) - at(sy, 0)} fill={ACCENT} opacity={0.07} />
          {[0, 1].map((v) => (
            <line key={v} x1={box.left} x2={box.left + box.width} y1={at(sy, v)} y2={at(sy, v)} stroke={INK} strokeWidth={1.4} />
          ))}
        </Svg>

        <Axes x={sz} y={sy} xTicks={[-5, 0, 5, 10, 15]} yTicks={[0, 0.5, 1]} yFormat={(v) => String(v)} xTitle="score z (the log odds)" yTitle="probability" at={addsAt - 2} out={radiusAt} />
        <Axes x={sx} y={sy} xTicks={[10, 15, 20, 25, 30]} yTicks={[0, 0.5, 1]} yFormat={(v) => String(v)} xTitle="mean radius" yTitle="probability of malignant" at={radiusAt} />

        <Points xs={LOGIT.radius} ys={JITTER} labels={LOGIT.label} sx={sx} sy={sy} at={tumorsAt} spread={22} r={4.5} opacity={0.55} />
        <Note at={tumorsAt + 8} x={box.left + box.width - 16} y={at(sy, 1) - h(40)} align="right" from="right">
          <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>{LOGIT.malignant} malignant, at 1</span>
        </Note>
        <Note at={tumorsAt + 14} x={box.left + box.width - 16} y={at(sy, 0) - h(40)} align="right" from="right">
          <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>{LOGIT.n - LOGIT.malignant} benign, at 0</span>
        </Note>

        {/* The sigmoid: the same curve in z and in radius. */}
        <Curve points={LOGIT.curve} x={sx} y={sy} at={sigAt} dur={30} color={OK} width={4 + 2 * insideSwell} clip={box} />

        {/* Radius 15: up to the curve, across to its probability. */}
        <Svg opacity={exP}>
          <path
            d={`M${at(sx, ex.radius)},${at(sy, yLo)} L${at(sx, ex.radius)},${at(sy, ex.p)} L${box.left},${at(sy, ex.p)}`}
            fill="none"
            stroke={BLUE_INK}
            strokeWidth={2}
            strokeDasharray="5 6"
            opacity={1 - ease(frame, out1, 10)}
          />
          <circle cx={at(sx, ex.radius)} cy={at(sy, ex.p)} r={7} fill={BLUE_INK} opacity={1 - ease(frame, out1, 10)} />
        </Svg>

        {/* The straight line through the same zeros and ones. */}
        <Curve points={LOGIT.line} x={sx} y={sy} at={lineAt + 2} dur={24} color={ACCENT} width={3.5} clip={box} />
        <Note at={belowAt} x={box.left + 16} y={at(sy, yLo) - h(42)}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>below 0: {LOGIT.linBelow} tumors</span>
        </Note>
        <Note at={aboveAt} x={box.left + 16} y={at(sy, yHi) + h(12)}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>above 1: {LOGIT.linAbove} tumors</span>
        </Note>
        <Svg opacity={ease(frame, r28At + 2, 10)}>
          <circle cx={at(sx, 28)} cy={at(sy, at28)} r={8} fill={ACCENT} />
        </Svg>
        <Note at={r28At + 4} x={at(sx, 28) - 22} y={at(sy, at28) - h(44)} align="right" from="up">
          <span style={{ ...note(26, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap", ...TABULAR }}>{fmt(at28, 2)} at radius 28</span>
        </Note>

        {/* ── The right column: what the model computes ── */}
        <Note at={addsAt} x={COL} y={y(TOP)} out={fitAt - 4}>
          <Formula>
            <V>z</V> = <V>b</V>
            <sub>0</sub> + <V>b</V>
            <sub>1</sub>
            <V>x</V>
            <sub>1</sub> + <V>b</V>
            <sub>2</sub>
            <V>x</V>
            <sub>2</sub> + …
          </Formula>
        </Note>
        <Note at={oddsAt} x={COL} y={y(TOP) + h(54)} out={fitAt - 4}>
          <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>the score: the log odds</span>
        </Note>
        <Note at={fitAt} x={COL} y={y(TOP)} out={out1}>
          <Formula>
            <V>z</V> = −15.25 + 1.03 × radius
          </Formula>
        </Note>
        <Note at={fitAt + 6} x={COL} y={y(TOP) + h(54)} out={out1}>
          <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>fitted on {LOGIT.n} tumors</span>
        </Note>

        <Note at={sigAt} x={COL} y={y(TOP) + h(130)} out={out1}>
          <Formula color={OK_INK}>
            <V>p</V> = 1 / (1 + <V>e</V>
            <sup>−z</sup>)
          </Formula>
        </Note>
        <Note at={sigAt + 6} x={COL} y={y(TOP) + h(184)} out={out1}>
          <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>
            the sigmoid: <Mark at={squeezeAt + 2}>any score, into 0 to 1</Mark>
          </span>
        </Note>

        <Note at={fifteenAt + 4} x={COL} y={y(TOP) + h(270)} out={out1}>
          <Formula color={BLUE_INK} size={28}>
            radius 15 → <V>z</V> = {fmt(ex.z, 2)} → <V>p</V> = {fmt(ex.p, 2)}
          </Formula>
        </Note>
        <Note at={oddsXAt} x={COL} y={y(TOP) + h(340)} out={out1}>
          <Formula size={28}>each unit of radius: odds × {fmt(LOGIT.oddsPerUnit, 2)}</Formula>
        </Note>

        <Note at={insideAt} x={COL} y={y(TOP) + h(130)}>
          <span style={{ ...note(28, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            <Mark at={nextAt}>logistic: always between 0 and 1</Mark>
          </span>
        </Note>
        <Note at={mlAt} x={COL} y={y(TOP) + h(186)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>fitted by maximum likelihood</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
