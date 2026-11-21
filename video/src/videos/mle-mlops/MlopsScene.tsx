import { Lock } from "lucide-react";
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, INK, INK_SOFT, label, svgText } from "../../editorial/style";
import { ColumnRule } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BadgeRow, Box, CornerLoop, Drift, Line, Mark, OK_INK, Q_SIZE, Q_W, Svg, X0 } from "./parts";

const COL_A = X0;
const COL_B = 520;
const BOX_W = 250;
const BOX_H = 56;
/** The small chart of a model decaying with its code frozen, at the right. */
const DECAY = { left: 980, right: 1400, top: 520, bottom: 660 };

/**
 * Question 1: what DevOps brings (automation, monitoring, CI/CD), and the
 * moving part it adds: data. A traditional app is code and config; an ML
 * system is code, data and the model they produce, all three versioned,
 * tested and reproducible. And a model decays with its code frozen, so
 * watching and retraining join the loop from day one.
 */
export const MlopsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q1").from;
  const qAt = n.word("q1", "Question one");
  const textAt = n.word("q1", "What is MLOps");
  const bringsAt = n.word("q1", "It brings DevOps practices");
  const autoAt = n.word("q1", "automation");
  const monAt = n.word("q1", "monitoring");
  const cicdAt = n.word("q1", "continuous integration and delivery");
  const movingAt = n.word("q1", "a moving part");
  const dataAt = n.word("q1", "data");
  const appAt = n.word("q1-three", "A traditional app");
  const appConfigAt = n.word("q1-three", "config");
  const mlAt = n.word("q1-three", "An ML system");
  const mlCodeAt = n.word("q1-three", "code", { nth: 2 });
  const mlDataAt = n.word("q1-three", "plus data");
  const modelAt = n.word("q1-three", "the trained model");
  const versionedAt = n.word("q1-three", "versioned");
  const testedAt = n.word("q1-three", "tested");
  const reproAt = n.word("q1-three", "reproducible");
  const decaysAt = n.word("q1-three", "a model decays");
  const frozenAt = n.word("q1-three", "its code stays frozen");
  const monitorAt = n.word("q1-three", "monitoring and retraining");
  const dayAt = n.word("q1-three", "from day one");
  const end = n.beat("q1-three").to;

  const top = y(470);
  // The two lines of question 1 sit mid-page while they are the whole answer,
  // and rise to make room when the stacks arrive.
  const lift = h(130) * (1 - ease(frame, appAt - 14, 22));
  const row = (i: number) => y(524) + i * h(74);
  const dx = (i: number) => DECAY.left + 30 + (i * (DECAY.right - DECAY.left - 60)) / 3;
  const SAG = [0.93, 0.915, 0.865, 0.79];
  const dy = (v: number) => y(DECAY.bottom) - ((v - 0.74) / (0.96 - 0.74)) * h(DECAY.bottom - DECAY.top);
  const draw = ease(frame, decaysAt, 30);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={autoAt} level={-31} />
      <Sfx name="el-tap" at={monAt} level={-31} />
      <Sfx name="el-tap" at={cicdAt} level={-31} />
      <Sfx name="el-pencil" at={dataAt} level={-35} />
      <Sfx name="el-tap" at={appAt} level={-31} />
      <Sfx name="el-tap" at={mlAt} level={-31} />
      <Sfx name="el-tap" at={mlDataAt} level={-30} />
      <Sfx name="el-tap" at={modelAt} level={-30} />
      <Sfx name="el-pencil" at={decaysAt} level={-35} />
      <Sfx name="el-chime" at={dayAt + 10} level={-33} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE} width={Q_W}>
          What is MLOps, and how does it differ from traditional DevOps?
        </QuestionCard>
        <CornerLoop at={qAt} lit={[["watch", monitorAt], ["retrain", monitorAt + 10]]} />

        {/* What it brings from DevOps, and what it adds. */}
        <Line at={bringsAt - 2} x={X0} y={y(330) + lift} size={24} color={INK}>
          DevOps practices, brought to machine learning:
        </Line>
        {/* The badges follow the line's colon at a word space (the line is
            about 548px of Inter at 24px). */}
        <BadgeRow
          x={X0 + 566}
          y={y(330) - 5 + lift}
          size={24}
          items={[
            { text: "automation", at: autoAt - 2 },
            { text: "monitoring", at: monAt - 2 },
            { text: "CI/CD", at: cicdAt - 2 },
          ]}
        />
        <Line at={movingAt - 2} x={X0} y={y(392) + lift} size={24} color={INK}>
          Plus a moving part: <Mark at={dataAt}>data</Mark>
        </Line>

        {/* Code and config, against code, data and the model. */}
        <Line at={appAt - 2} x={COL_A} y={top} size={24} color={INK_SOFT}>
          Traditional app
        </Line>
        <Box x={COL_A} y={row(0)} w={BOX_W} h={BOX_H} at={appAt + 4} title="Code" />
        <Box x={COL_A} y={row(1)} w={BOX_W} h={BOX_H} at={appConfigAt - 2} title="Config" />
        <ColumnRule x={(COL_A + BOX_W + COL_B) / 2} top={top} height={row(2) + BOX_H - top} at={mlAt} />
        <Line at={mlAt - 2} x={COL_B} y={top} size={24} color={INK_SOFT}>
          ML system
        </Line>
        <Box x={COL_B} y={row(0)} w={BOX_W} h={BOX_H} at={mlCodeAt - 2} title="Code" />
        <Box x={COL_B} y={row(1)} w={BOX_W} h={BOX_H} at={mlDataAt} title="Data" lit={mlDataAt + 4} />
        <Box x={COL_B} y={row(2)} w={BOX_W} h={BOX_H} at={modelAt} title="Trained model" lit={modelAt + 4} />
        <BadgeRow
          x={COL_B}
          y={row(3) + h(10)}
          size={22}
          gap={12}
          items={[
            { text: "versioned", at: versionedAt - 2 },
            { text: "tested", at: testedAt - 2 },
            { text: "reproducible", at: reproAt - 2 },
          ]}
        />

        {/* It decays with its code frozen. */}
        <Line at={decaysAt - 4} x={DECAY.left} y={y(DECAY.top) - h(70)} size={24} color={INK}>
          A model decays
          <span style={{ opacity: ease(frame, frozenAt - 2, 10) }}>
            {" "}
            with its code frozen <Lock size={22} strokeWidth={2.2} color={INK_SOFT} style={{ verticalAlign: "-0.1em" }} />
          </span>
        </Line>
        <Svg opacity={ease(frame, decaysAt - 4, 10)}>
          <line x1={DECAY.left} x2={DECAY.right} y1={y(DECAY.bottom)} y2={y(DECAY.bottom)} stroke={INK_SOFT} strokeWidth={1.4} />
          <path
            d={SAG.map((v, i) => `${i ? "L" : "M"}${dx(i)},${dy(v)}`).join(" ")}
            fill="none"
            stroke={ACCENT}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={`${draw} 1`}
          />
          {SAG.map((v, i) => (draw >= i / 3 - 0.001 ? <circle key={i} cx={dx(i)} cy={dy(v)} r={6} fill={ACCENT} /> : null))}
          {["Q1", "Q2", "Q3", "Q4"].map((q, i) => (
            <text key={q} x={dx(i)} y={y(DECAY.bottom) + 32} textAnchor="middle" style={svgText(label(21, INK_SOFT))}>
              {q}
            </text>
          ))}
        </Svg>
        <Line at={decaysAt + 30} x={dx(3) + 16} y={dy(SAG[3]) - 14} size={22} color={ACCENT_INK}>
          worse
        </Line>
        <Line at={monitorAt - 2} x={DECAY.left} y={y(DECAY.bottom) + h(80)} size={26} color={OK_INK}>
          Monitoring and retraining,
        </Line>
        <Line at={dayAt - 4} x={DECAY.left} y={y(DECAY.bottom) + h(80) + 38} size={26} color={OK_INK}>
          part of the job from day one
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};

