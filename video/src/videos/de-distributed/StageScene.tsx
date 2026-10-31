import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { at as atScale, Axes, type Scale } from "../da-statistics-communication/parts";
import { TAIL } from "./data";
import { Drift, Machine, Svg } from "./parts";

const S1_X = 120;
const S2_X = 1000;
const S_W = 700;
const S_TOP = 362;
const S_H = 196;
const LANE0 = 402;
const LANE_PITCH = 36;
const LANE_H = 24;
const TRACK_X = 140;
const TRACK_W = 560;
const TASKS = 4;
/** How far each task in stage 1 gets before it finishes: the third is the straggler. */
const DONE = [0.58, 0.66, 1, 0.52];
const SLOW = 2;

/**
 * Question 8. One action starts a job; the job is two stages, cut at its one
 * shuffle. Each stage is four tasks, one per partition, running the same
 * narrow steps side by side, and stage 1 ends only when its slowest task
 * does. Then the page's fan-out chart, 1 - 0.99^n: at a 1% chance per task,
 * sixty-nine tasks are slow half the time, two hundred 87% of it.
 */
export const StageScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("stage").from;
  const qAt = n.word("stage", "Question eight");
  const textAt = n.word("stage", "What is a stage and a task");
  const actionAt = n.word("stage", "One action starts a job");
  const cutsAt = n.word("stage", "cuts it into stages");
  const wideAt = n.word("stage", "at every wide dependency");
  const countAt = n.word("stage", "counting shuffles counts stages");
  const tasksAt = n.word("stage-tasks", "Each stage is a set of tasks");
  const perAt = n.word("stage-tasks", "one per partition");
  const parallelAt = n.word("stage-tasks", "in parallel");
  const lastAt = n.word("stage-tasks", "ends only when its last task does");
  const chartAt = n.word("stage-tail", "From the page's fan-out chart");
  const pAt = n.word("stage-tail", "a one percent chance of being slow");
  const halfAt = n.word("stage-tail", "sixty-nine tasks is slow half the time");
  const twoAt = n.word("stage-tail", "one of two hundred");
  const pctAt = n.word("stage-tail", "eighty-seven percent");
  const end = n.beat("stage-tail").to;

  const laneY = (i: number) => y(LANE0 + i * LANE_PITCH);
  const laneH = h(LANE_H);
  const run = (at: number, k: number) => ease(frame, at + k * 2, Math.round(50 + 70 * DONE[k]));
  const stall = ease(frame, lastAt, 12);

  // The fan-out chart, in the lower half.
  const sx: Scale = { lo: 0, hi: TAIL.max, a: 300, b: 1240 };
  const sy: Scale = { lo: 0, hi: 1, a: y(866), b: y(704) };
  const draw = ease(frame, pAt, 30);
  const pts = TAIL.curve.map((v, k) => [atScale(sx, k * TAIL.step), atScale(sy, v)] as const);
  const shown = pts.slice(0, Math.max(2, Math.round(pts.length * draw)));
  const halfX = atScale(sx, TAIL.half);
  const halfY = atScale(sy, 0.5);
  const twoX = atScale(sx, TAIL.tasks);
  const twoY = atScale(sy, TAIL.at200);

  const stage = (x: number, k: number, title: string, at: number, runAt: number) => (
    <>
      <Machine x={x} top={y(S_TOP)} width={S_W} height={h(S_H)} at={at} name={title} nameSize={21} />
      {Array.from({ length: TASKS }, (_, i) => {
        const p = ease(frame, tasksAt + 4 + i * 2 + k * 6, 10);
        const r = k === 0 ? run(runAt, i) * DONE[i] : 0;
        const slow = k === 0 && i === SLOW;
        return (
          <React.Fragment key={i}>
            <div style={{ position: "absolute", left: x + 20, top: laneY(i) + laneH / 2 - 13, opacity: p, ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>
              task {i + 1}
            </div>
            <div
              style={{
                position: "absolute",
                left: x + TRACK_X,
                top: laneY(i),
                width: TRACK_W * p,
                height: laneH,
                borderRadius: 4,
                background: `color-mix(in srgb, ${ds("gray", 200)} 60%, ${PAPER})`,
              }}
            />
            {r > 0 ? (
              <div
                style={{
                  position: "absolute",
                  left: x + TRACK_X,
                  top: laneY(i),
                  width: TRACK_W * r,
                  height: laneH,
                  borderRadius: 4,
                  background: slow && stall > 0 ? `color-mix(in srgb, ${ACCENT} ${40 + 30 * stall}%, ${PAPER})` : `color-mix(in srgb, ${BAR} 55%, ${PAPER})`,
                }}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </>
  );

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={actionAt + 4} level={-36} />
      <Sfx name="el-scratch" at={wideAt + 2} level={-37} />
      <Sfx name="el-sprinkle" at={parallelAt} level={-37} />
      <Sfx name="el-tap" at={lastAt + 4} level={-35} />
      <Sfx name="el-pencil" at={pAt} level={-37} />
      <Sfx name="el-tap" at={halfAt + 4} level={-35} />
      <Sfx name="el-tap" at={pctAt} level={-35} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={8} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is a stage and a task in Spark&apos;s execution model?
        </QuestionCard>

        {/* One action, one job. */}
        <Note at={actionAt - 2} x={S1_X} y={y(296)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600 }}>write()</span>, one action: <b>one job</b>
          </span>
        </Note>
        <Svg opacity={ease(frame, actionAt + 4, 12)}>
          <path d={`M${S1_X},${y(S_TOP) - 10} L${S1_X},${y(S_TOP) - 22} L${S2_X + S_W},${y(S_TOP) - 22} L${S2_X + S_W},${y(S_TOP) - 10}`} fill="none" stroke={INK} strokeWidth={1.6} />
        </Svg>

        {/* Two stages, cut at the shuffle. */}
        {stage(S1_X, 0, "Stage 1: read, filter, map", cutsAt, parallelAt)}
        {stage(S2_X, 1, "Stage 2: reduce by key, write", cutsAt + 6, parallelAt)}
        <Svg opacity={ease(frame, wideAt, 12)}>
          {Array.from({ length: TASKS }, (_, i) =>
            Array.from({ length: TASKS }, (_, j) => (
              <line key={`${i}-${j}`} x1={S1_X + S_W + 8} y1={laneY(i) + laneH / 2} x2={S2_X - 8} y2={laneY(j) + laneH / 2} stroke={ACCENT} strokeWidth={1} opacity={0.5} />
            )),
          )}
        </Svg>
        <Note at={wideAt + 2} x={S1_X + S_W} y={y(S_TOP) + h(S_H) + h(8)} width={S2_X - S1_X - S_W} style={{ textAlign: "center" }}>
          <span style={{ ...label(21, ACCENT_INK), fontWeight: 700 }}>shuffle</span>
        </Note>
        <Note at={countAt - 2} x={S2_X} y={y(296)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <Num>1</Num> shuffle → <b><Num>2</Num> stages</b>
          </span>
        </Note>

        {/* A stage ends with its last task. */}
        {stall > 0 ? (
          <Svg opacity={stall}>
            <line
              x1={S1_X + TRACK_X + TRACK_W + 4}
              x2={S1_X + TRACK_X + TRACK_W + 4}
              y1={laneY(0) - 8}
              y2={laneY(TASKS - 1) + laneH + 8}
              stroke={INK}
              strokeWidth={2}
              strokeDasharray="5 5"
            />
          </Svg>
        ) : null}
        <Note at={perAt - 2} x={S1_X + TRACK_X} y={y(S_TOP) + h(S_H) + h(8)}>
          <span style={{ ...label(20, BLUE_INK), whiteSpace: "nowrap" }}>
            one task per partition<span style={{ opacity: ease(frame, parallelAt, 10) }}>, side by side</span>
          </span>
        </Note>
        <Note at={lastAt + 6} x={S1_X + TRACK_X + TRACK_W - 300} y={y(S_TOP) + h(8)}>
          <span style={{ ...label(20, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>waits for its last task</span>
        </Note>

        {/* The page's fan-out chart. */}
        <Note at={chartAt} x={S1_X} y={y(620)}>
          <span style={{ ...label(23, INK), whiteSpace: "nowrap" }}>
            From the page&apos;s fan-out chart
            <span style={{ opacity: ease(frame, pAt, 10), color: INK_SOFT, fontWeight: 500 }}>: each task slow with a 1% chance</span>
          </span>
        </Note>
        <Axes
          x={sx}
          y={sy}
          xTicks={[0, 50, 100, 150, 200]}
          yTicks={[0, 0.5, 1]}
          yFormat={(v) => `${Math.round(v * 100)}%`}
          at={chartAt + 4}
          size={19}
        />
        <Note at={chartAt + 6} x={sx.a - 14} y={sy.b - h(40)}>
          <span style={{ ...label(19, INK_SOFT), whiteSpace: "nowrap" }}>chance the stage is slow</span>
        </Note>
        <Note at={chartAt + 6} x={sx.b + 18} y={sy.a - 14}>
          <span style={{ ...label(19, INK_SOFT), whiteSpace: "nowrap" }}>tasks in the stage</span>
        </Note>
        <Svg>
          {draw > 0 ? (
            <path d={shown.map(([a, b], i) => `${i ? "L" : "M"}${a.toFixed(1)},${b.toFixed(1)}`).join(" ")} fill="none" stroke={BAR} strokeWidth={3.2} strokeLinejoin="round" />
          ) : null}
          <line x1={sx.a} x2={halfX} y1={halfY} y2={halfY} stroke={ACCENT} strokeWidth={1.6} strokeDasharray="5 5" opacity={ease(frame, halfAt, 10)} />
          <line x1={halfX} x2={halfX} y1={halfY} y2={sy.a} stroke={ACCENT} strokeWidth={1.6} strokeDasharray="5 5" opacity={ease(frame, halfAt, 10)} />
          <circle cx={halfX} cy={halfY} r={7 * ease(frame, halfAt + 2, 10)} fill={ACCENT} />
          <circle cx={twoX} cy={twoY} r={7 * ease(frame, twoAt + 2, 10)} fill={ACCENT} />
        </Svg>
        <Note at={halfAt + 4} x={halfX + 22} y={halfY + h(8)}>
          <span style={{ ...note(23, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            <Num>{TAIL.half}</Num> tasks: slow half the time
          </span>
        </Note>
        <Note at={pctAt - 2} x={twoX - 20} y={twoY - h(46)} align="right">
          <span style={{ ...note(23, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            <Num>{TAIL.tasks}</Num> tasks: <Num>{Math.round(TAIL.at200 * 100)}</Num>%
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
