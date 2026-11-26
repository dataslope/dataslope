import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { I, MathRun } from "../../editorial/math";
import { INK, INK_SOFT, note } from "../../editorial/style";
import { ColumnRule, Ink, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { MODELS, PEEK } from "./data";
import { Area, BAD, BAD_INK, Curve, Drift, Heading, Line, Mark, normalPoints, OK_INK, POINT, pulse, StepDisc, Strike, Svg, X0, QMark } from "./parts";

const C_X1 = 1000;
const TAIL = ds("yellow", 400);
const R_X0 = 1100;
/** The observed statistic, in standard units: a picture of "at least as
 *  extreme", not a measured value. */
const OBS = 1.8;

const H0 = () => (
  <MathRun>
    <I>H</I>
    <sub style={{ fontSize: "0.7em" }}>0</sub>
  </MathRun>
);
const H1 = () => (
  <MathRun>
    <I>H</I>
    <sub style={{ fontSize: "0.7em" }}>1</sub>
  </MathRun>
);

/**
 * Questions 6 and 7. The p-value as an area: a null distribution with the
 * tails beyond the observed value shaded, the definition beside it, then the
 * two misreadings it rules out, struck in red (they are wrong, so the strike
 * is right here). Then the test's four steps, each inked as it is read, with
 * this video's null, α and n beside them; and what fixing them in advance
 * buys: checking every 200 labels finds a difference between two equally
 * good models 19% of the time, deciding once at 2,000 finds one 5%.
 */
export const TestScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q6").from;
  const qAt = n.word("q6", "Question six");
  const textAt = n.word("q6", "What exactly is a p-value?");
  const probAt = n.word("q6", "The probability of data");
  const extremeAt = n.word("q6", "at least as extreme as yours");
  const assumingAt = n.word("q6", "assuming the null hypothesis is true");
  const smallAt = n.word("q6", "Small means");
  const nothingAt = n.word("q6", "if nothing were going on");
  const becauseAt = n.word("q6-not", "Because it assumes the null");
  const nullTrueAt = n.word("q6-not", "the probability that the null is true");
  const flukeAt = n.word("q6-not", "your result is a fluke");
  const q7At = n.word("q7", "Question seven");
  const q7TextAt = n.word("q7", "What is hypothesis testing");
  const stateAt = n.word("q7", "State the null");
  const fixAt = n.word("q7", "Fix the significance level");
  const beforeAt = n.word("q7", "before you look");
  const computeAt = n.word("q7", "Compute a test statistic");
  const rejectAt = n.word("q7", "reject the null if p is below alpha");
  const hereAt = n.word("q7", "Here, the null is");
  const equallyAt = n.word("q7", "equally accurate");
  const honestAt = n.word("q7-peek", "keeps the test honest");
  const simAt = n.word("q7-peek", "Simulate two equally good models");
  const everyAt = n.word("q7-peek", "check after every two hundred labels");
  const stopAt = n.word("q7-peek", "stop at the first p");
  const nineteenAt = n.word("q7-peek", "nineteen percent of the time");
  const notFiveAt = n.word("q7-peek", "not five");
  const end = n.beat("q7-peek").to;

  const out = q7At - 4;

  // ── The null distribution ──
  const base = y(700);
  const height = h(320);
  const zx = (z: number) => X0 + ((z + 3.6) / 7.2) * (C_X1 - X0);
  const curve = normalPoints({ mu: 0, sd: 1, lo: -3.6, hi: 3.6, x0: X0, x1: C_X1, base, height, steps: 240 });
  const curveY = (z: number) => base - Math.exp(-0.5 * z * z) * height;

  // ── The steps ──
  const stepY = [y(316), y(426), y(536), y(626)];
  const stepAt = [stateAt, fixAt, computeAt, rejectAt];
  /** Where a step's text starts: after its disc (45px) and the gap. */
  const STEP_TEXT_X = X0 + 45 + 18;

  // ── The looks ──
  const lookY = y(790);
  const tx0 = X0 + 20;
  const tx1 = C_X1;
  const tx = (k: number) => tx0 + ((k - PEEK.step) / (PEEK.step * (PEEK.looks - 1))) * (tx1 - tx0);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={probAt + 4} level={-35} />
      <Sfx name="el-tap" at={extremeAt + 6} level={-31} />
      <Sfx name="el-scratch" at={nullTrueAt + 12} level={-33} />
      <Sfx name="el-scratch" at={flukeAt + 10} level={-33} />
      {stepAt.map((t, i) => (
        <Sfx key={i} name="el-tap" at={t} level={-32} />
      ))}
      <Sfx name="el-pencil" at={hereAt + 4} level={-35} />
      <Sfx name="el-sprinkle" at={everyAt} level={-33} />
      <Sfx name="el-tap" at={nineteenAt} level={-29} />
      <Sfx name="el-tap" at={notFiveAt} level={-31} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} out={out} size={60}>
          What exactly is a <QMark at={n.word("q6", "exactly is a p-value?")} after="?">p-value</QMark>
        </QuestionCard>
        <QuestionCard n={7} at={q7At} textAt={q7TextAt - 2} size={60}>
          What is <QMark at={n.word("q7", "hypothesis testing, and")} after=",">hypothesis testing</QMark> and what are{" "}
          <QMark at={n.word("q7", "its steps?")} after="?">its steps</QMark>
        </QuestionCard>

        {/* ── Question 6: the p-value as an area ── */}
        <div style={{ position: "absolute", inset: 0, opacity: 1 - ease(frame, out, 12) }}>
          <Area points={curve} x0={zx(OBS)} x1={zx(3.6)} base={base} at={extremeAt + 4} color={TAIL} opacity={0.9} />
          <Area points={curve} x0={zx(-3.6)} x1={zx(-OBS)} base={base} at={extremeAt + 8} color={TAIL} opacity={0.9} />
          <Curve points={curve} at={probAt} dur={24} color={INK} width={3} />
          <Svg opacity={ease(frame, probAt, 14)}>
            <line x1={X0} x2={C_X1} y1={base + 0.5} y2={base + 0.5} stroke={INK} strokeWidth={1.6} />
          </Svg>
          <Svg opacity={ease(frame, extremeAt, 10)}>
            <line x1={zx(OBS)} x2={zx(OBS)} y1={base} y2={curveY(OBS) - h(120)} stroke={POINT} strokeWidth={3} />
          </Svg>
          <Line at={extremeAt} x={zx(OBS) + 12} y={curveY(OBS) - h(120)} size={24}>
            Your data
          </Line>
          <Line at={extremeAt + 8} x={C_X1} y={base + h(16)} size={24} align="right" width={500}>
            <b>p-value</b>: the shaded tails
          </Line>
          <Line at={assumingAt} x={zx(0)} y={base - height - h(56)} size={24} align="center" width={600}>
            If the null is true
          </Line>
        </div>
        <div style={{ position: "absolute", inset: 0, opacity: 1 - ease(frame, out, 12) }}>
          <ColumnRule x={(C_X1 + R_X0) / 2} top={y(320)} height={y(800) - y(320)} at={probAt} />
          <Line at={probAt} x={R_X0} y={y(330)} size={26}>
            The probability of data at least
          </Line>
          <Line at={probAt + 6} x={R_X0} y={y(372)} size={26}>
            as extreme as yours,{" "}
            <span style={{ opacity: ease(frame, assumingAt - 2, 10) }}>
              <Mark at={assumingAt + 4}>assuming the null</Mark>
            </span>
          </Line>
          <Line at={smallAt} x={R_X0} y={y(444)} size={24} color={INK_SOFT}>
            Small: your data would be surprising
          </Line>
          <Line at={nothingAt} x={R_X0} y={y(482)} size={24} color={INK_SOFT}>
            if nothing were going on
          </Line>
          <Line at={becauseAt} x={R_X0} y={y(600)} size={24}>
            It assumes the null, so it is not
          </Line>
          <Ink at={nullTrueAt} dur={14} style={{ left: R_X0, top: y(652), whiteSpace: "nowrap" }}>
            <span style={{ ...note(28, BAD_INK) }}>
              <Strike at={nullTrueAt + 12} color={BAD}>
                The chance the null is true
              </Strike>
            </span>
          </Ink>
          <Ink at={flukeAt} dur={14} style={{ left: R_X0, top: y(708), whiteSpace: "nowrap" }}>
            <span style={{ ...note(28, BAD_INK) }}>
              <Strike at={flukeAt + 10} color={BAD}>
                The chance it&apos;s a fluke
              </Strike>
            </span>
          </Ink>
          <Line at={flukeAt + 24} x={R_X0} y={y(766)} size={22} color={INK_SOFT}>
            Both read it backwards
          </Line>
        </div>

        {/* ── Question 7: the steps ── */}
        {[
          <>
            State the null and the alternative, <H0 /> and <H1 />
          </>,
          <>
            Fix the significance level{" "}
            <MathRun>
              <I>α</I>
            </MathRun>{" "}
            and the sample size{" "}
            <MathRun>
              <I>n</I>
            </MathRun>
            <span style={{ opacity: ease(frame, beforeAt - 2, 10) }}>, before you look</span>
          </>,
          <>Compute a test statistic and its p-value</>,
          <>
            Reject{" "}
            <H0 /> if{" "}
            <MathRun>
              <I>p</I> &lt; <I>α</I>
            </MathRun>
          </>,
        ].map((text, i) => (
          <Ink key={i} at={stepAt[i]} dur={14} style={{ left: X0, top: stepY[i], whiteSpace: "nowrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 30, ...note(30, INK) }}>
              <span style={{ transform: `scale(${1 + 0.15 * pulse(frame, honestAt + 2, 20) * (i === 1 ? 1 : 0)})` }}>
                <StepDisc n={i + 1} size={28} lit={i === 1 ? ease(frame, honestAt, 10) : 0} />
              </span>
              <span>{text}</span>
            </div>
          </Ink>
        ))}
        {/* This video's null, α and n, as step notes under steps 1 and 2. */}
        <Line at={hereAt} x={STEP_TEXT_X} y={stepY[0] + h(50)} size={24} color={INK_SOFT}>
          Here: <H0 />, old and new{" "}
          <span style={{ opacity: ease(frame, equallyAt - 2, 10) }}>equally accurate</span>
        </Line>
        <Line at={hereAt + 8} x={STEP_TEXT_X} y={stepY[1] + h(50)} size={24} color={INK_SOFT}>
          Here:{" "}
          <MathRun>
            <I>α</I>
          </MathRun>{" "}
          = <Num>5%</Num>,{" "}
          <MathRun>
            <I>n</I>
          </MathRun>{" "}
          = <Num>{MODELS.n.toLocaleString("en-US")}</Num>
        </Line>

        {/* ── Peeking ── */}
        <Heading at={simAt} x={X0} y={y(704)}>
          Simulation: two equally good models, <Num>{PEEK.runs.toLocaleString("en-US")}</Num> runs
        </Heading>
        <Svg opacity={ease(frame, everyAt - 2, 10)}>
          <line x1={tx0} x2={tx1} y1={lookY} y2={lookY} stroke={INK} strokeWidth={1.6} />
          {Array.from({ length: PEEK.looks }, (_, i) => {
            const k = (i + 1) * PEEK.step;
            const p = ease(frame, everyAt + 2 + i * 2, 8);
            return <circle key={i} cx={tx(k)} cy={lookY} r={8 * p * (1 + 0.3 * pulse(frame, stopAt + i * 2, 12))} fill={i === PEEK.looks - 1 ? INK : POINT} />;
          })}
        </Svg>
        {Array.from({ length: PEEK.looks }, (_, i) => {
          const k = (i + 1) * PEEK.step;
          return (
            <Line key={i} at={everyAt + 2 + i * 2} x={tx(k)} y={lookY + h(20)} size={20} color={INK_SOFT} align="center" width={100}>
              <Num>{k.toLocaleString("en-US")}</Num>
            </Line>
          );
        })}
        <Line at={everyAt + 10} x={tx0} y={lookY + h(62)} size={22} color={INK_SOFT}>
          A look every <Num>{PEEK.step}</Num> labels
        </Line>
        <ColumnRule x={(C_X1 + 60 + R_X0) / 2 + 20} top={y(704)} height={y(880) - y(704)} at={stopAt} />
        <Line at={stopAt} x={R_X0 + 40} y={y(756)} size={26} color={BAD_INK} weight={600}>
          Stop at the first{" "}
          <MathRun>
            <I>p</I> &lt; 0.05
          </MathRun>
          :{" "}
          <span style={{ opacity: ease(frame, nineteenAt - 2, 10) }}>
            <Num>{Math.round(PEEK.everyLook * 100)}%</Num> false positives
          </span>
        </Line>
        <Line at={notFiveAt} x={R_X0 + 40} y={y(812)} size={26} color={OK_INK} weight={600}>
          Decide once at <Num>{MODELS.n.toLocaleString("en-US")}</Num>: <Num>{Math.round(PEEK.onceAtEnd * 100)}%</Num>
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
