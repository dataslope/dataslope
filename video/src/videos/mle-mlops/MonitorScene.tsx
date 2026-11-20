import { BellRing, ScrollText } from "lucide-react";
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, INK, INK_SOFT } from "../../editorial/style";
import { ColumnRule } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Box, ClockIcon, CornerLoop, Drift, Flow, Line, LIT_LINE, Mark, Q_SIZE, Q_W, Svg, X0, YELLOW_INK } from "./parts";

const COL_B = 820;
const RULE_X = 760;

/**
 * Question 6: monitoring in two layers, operational health and model health,
 * each line inking in as said, the labels' line with a clock. Then logging
 * for debugging and replay, and every alert wired to retraining or rollback.
 * Labels can take weeks, so the inputs and the predictions move first:
 * where drift comes in.
 */
export const MonitorScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q6").from;
  const qAt = n.word("q6", "Question six");
  const textAt = n.word("q6", "How do you monitor");
  const layersAt = n.word("q6", "In two layers");
  const opAt = n.word("q6", "Operational health");
  const opRows = [n.word("q6", "latency"), n.word("q6", "error rate"), n.word("q6", "throughput"), n.word("q6", "resources")];
  const modelAt = n.word("q6-model", "Model health");
  const mRows = [n.word("q6-model", "the input feature distributions"), n.word("q6-model", "the distribution of predictions"), n.word("q6-model", "live accuracy")];
  const arriveAt = n.word("q6-model", "once labels arrive");
  const logAt = n.word("q6-wire", "Log inputs and predictions");
  const debugAt = n.word("q6-wire", "debug and replay");
  const alertAt = n.word("q6-wire", "wire every alert");
  const retrainAt = n.word("q6-wire", "retrain");
  const backAt = n.word("q6-wire", "roll back");
  const weeksAt = n.word("q6-first", "Labels can take weeks");
  const inputsAt = n.word("q6-first", "the inputs and the predictions");
  const firstAt = n.word("q6-first", "move first");
  const driftAt = n.word("q6-first", "That's where drift comes in");
  const end = n.beat("q6-first").to;

  const head = y(300);
  const row = (i: number) => y(362) + i * h(54);
  const OP = ["Latency: p50, p95, p99", "Error rate", "Throughput", "Resources"];
  const MODEL = ["Input feature distributions", "Prediction distribution", "Accuracy, precision, recall"];
  const clockY = row(3) + 14;
  const weeks = ease(frame, weeksAt, 26);
  const wire = y(668);
  const wireH = h(64);
  const LOG = { x: 470, w: 150 };
  const ALERT = { x: 1010, w: 170 };
  const ACT = { x: 1290, w: 190 };

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={opAt} level={-31} />
      {opRows.map((at, i) => (
        <Sfx key={i} name="el-tap" at={at} level={-34} />
      ))}
      <Sfx name="el-tap" at={modelAt} level={-31} />
      {mRows.map((at, i) => (
        <Sfx key={i} name="el-tap" at={at} level={-34} />
      ))}
      <Sfx name="el-tap" at={logAt} level={-31} />
      <Sfx name="el-tap" at={alertAt} level={-31} />
      <Sfx name="el-pencil" at={weeksAt} level={-35} />
      <Sfx name="el-pencil" at={firstAt} level={-35} />
      <Sfx name="el-whoosh" at={driftAt} level={-37} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE} width={Q_W}>
          How do you monitor a model in production?
        </QuestionCard>
        <CornerLoop at={qAt} lit="watch" />

        {/* ── Two layers ── */}
        <Line at={layersAt} x={X0} y={y(236)} size={22} color={INK_SOFT}>
          In two layers
        </Line>
        <Line at={opAt - 2} x={X0} y={head} size={26} color={INK}>
          Operational health
        </Line>
        {OP.map((t, i) => (
          <Line key={t} at={opRows[i] - 2} x={X0} y={row(i)} size={25} color={INK}>
            {t}
          </Line>
        ))}
        <ColumnRule x={RULE_X} top={head} height={row(3) + h(70) - head} at={modelAt} />
        <Line at={modelAt - 2} x={COL_B} y={head} size={26} color={INK}>
          Model health
        </Line>
        {MODEL.map((t, i) => (
          <Line key={t} at={mRows[i] - 2} x={COL_B} y={row(i)} size={25} color={i < 2 ? BLUE_INK : INK}>
            {i < 2 ? (
              <Mark at={inputsAt + i * 8} out={end + 60}>
                {t}
              </Mark>
            ) : (
              t
            )}
          </Line>
        ))}
        {ease(frame, arriveAt, 10) > 0 ? (
          <div style={{ position: "absolute", inset: 0, opacity: ease(frame, arriveAt, 10) }}>
            <ClockIcon x={COL_B + 12} y={clockY + 14} r={11} t={ease(frame, arriveAt, 40) * 0.6 + weeks * 2} />
          </div>
        ) : null}
        <Line at={arriveAt} x={COL_B + 34} y={clockY} size={23} color={INK_SOFT}>
          once labels arrive
        </Line>
        {/* The wait for labels, stretched out. */}
        <Flow points={[[COL_B + 250, clockY + 14], [COL_B + 250 + 420 * Math.max(0.02, weeks), clockY + 14]]} at={weeksAt} dur={4} color={INK_SOFT} head={weeks > 0.15 ? 13 : 0} />
        <Line at={weeksAt + 10} x={COL_B + 250 + 210} width={300} align="center" y={clockY - 34} size={22} color={INK}>
          can take weeks
        </Line>
        {/* The inputs and the predictions move first. */}
        <Svg opacity={ease(frame, firstAt + 4, 10)}>
          <path d={`M${COL_B + 400},${row(0) + 4} h14 V${row(1) + 28} h-14`} fill="none" stroke={LIT_LINE} strokeWidth={2.6} strokeLinejoin="round" />
        </Svg>
        <Line at={firstAt + 6} x={COL_B + 430} y={(row(0) + row(1)) / 2} size={24} color={YELLOW_INK}>
          move first
        </Line>

        {/* ── Log everything; wire every alert to an action ── */}
        <Line at={logAt - 2} x={LOG.x - 70} width={330} align="right" y={wire + wireH / 2 - 16} size={24} color={BLUE_INK}>
          Inputs and predictions
        </Line>
        <Flow points={[[LOG.x - 60, wire + wireH / 2], [LOG.x - 3, wire + wireH / 2]]} at={logAt + 4} color={BAR} head={12} />
        <Box x={LOG.x} y={wire} w={LOG.w} h={wireH} at={logAt + 4} title="Log" icon={ScrollText} size={24} />
        <Flow points={[[LOG.x + LOG.w + 4, wire + wireH / 2], [LOG.x + LOG.w + 52, wire + wireH / 2]]} at={debugAt - 2} head={12} />
        <Line at={debugAt} x={LOG.x + LOG.w + 64} y={wire + wireH / 2 - 16} size={24} color={INK}>
          Debug and replay
        </Line>
        <ColumnRule x={950} top={wire - h(30)} height={wireH + h(60) + 60} at={alertAt} />
        <Box x={ALERT.x} y={wire + 30} w={ALERT.w} h={wireH} at={alertAt} title="Alert" icon={BellRing} size={24} />
        <Box x={ACT.x} y={wire - 14} w={ACT.w} h={wireH} at={retrainAt - 2} title="Retrain" size={24} tone="ok" />
        <Box x={ACT.x} y={wire + 74} w={ACT.w} h={wireH} at={backAt - 2} title="Roll back" size={24} tone="ok" />
        <Flow points={[[ALERT.x + ALERT.w + 4, wire + 30 + wireH / 2 - 10], [ACT.x - 50, wire + 30 + wireH / 2 - 10], [ACT.x - 50, wire - 14 + wireH / 2], [ACT.x - 3, wire - 14 + wireH / 2]]} at={retrainAt} head={12} radius={12} />
        <Flow points={[[ALERT.x + ALERT.w + 4, wire + 30 + wireH / 2 + 10], [ACT.x - 50, wire + 30 + wireH / 2 + 10], [ACT.x - 50, wire + 74 + wireH / 2], [ACT.x - 3, wire + 74 + wireH / 2]]} at={backAt} head={12} radius={12} />

        <Line at={driftAt} x={1560} y={wire + 40} size={24} color={INK}>
          Where <Mark at={driftAt + 6}>drift</Mark> comes in
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
