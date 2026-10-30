import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Cross, Drift, lineOf, MARK, MARK_OK, OK_INK, PyListing, TaskBox, X0 } from "./parts";

/** The page's sensor, word for word. */
const SENSOR = [
  "wait_for_export = S3KeySensor(",
  '    task_id="wait_for_export",',
  '    bucket_key="exports/{{ ds }}/orders.parquet",',
  '    mode="reschedule",',
  "    poke_interval=300,",
  "    timeout=7200,",
  ")",
];
const SLOTS = 4;
const LANE_X0 = 250;
const LANE_X1 = 1000;
/** A waiting sensor, in the page's grey of a thing not doing work. */
const WAIT = `color-mix(in srgb, ${INK_SOFT} 30%, ${PAPER})`;

/**
 * Question 11. A task acts; a sensor polls a condition (has the file landed?)
 * and blocks until it is true or times out. A pool of four worker slots
 * drawn twice: in poke mode the sensors hold every slot while they wait and
 * the real work queues; in reschedule mode each check takes a slot for a
 * moment and gives it back, and the work runs between. The page's sensor
 * checks every 300 seconds and gives up after 7,200.
 */
export const SensorScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("sensor").from;
  const qAt = n.word("sensor", "Question eleven");
  const textAt = n.word("sensor", "What is a sensor");
  const taskAt = n.word("sensor", "A task performs an action");
  const sensAt = n.word("sensor", "A sensor is a task that polls a condition");
  const fileAt = n.word("sensor", "whether a file has landed");
  const blocksAt = n.word("sensor", "blocks until it's true");
  const timesAt = n.word("sensor", "or it times out");
  const pokeAt = n.word("sensor-poke", "In the default poke mode");
  const holdsAt = n.word("sensor-poke", "holds a worker slot the whole time it waits");
  const fillAt = n.word("sensor-poke", "Fill the pool with waiting sensors");
  const nothingAt = n.word("sensor-poke", "nothing else can run");
  const resAt = n.word("sensor-res", "Reschedule mode releases the slot between checks");
  const fiveAt = n.word("sensor-res", "looks every five minutes");
  const twoAt = n.word("sensor-res", "gives up after two hours");
  const useAt = n.word("sensor-res", "Use it, or a deferrable sensor");
  const brieflyAt = n.word("sensor-res", "more than briefly");
  const end = n.beat("sensor-res").to;

  const laneH = h(30);
  const laneGap = h(8);
  const pokeTop = y(512);
  const resTop = y(712);
  const laneY = (top: number, i: number) => top + i * (laneH + laneGap);
  const W = LANE_X1 - LANE_X0;
  // Checking, in frames: a radar ping on the sensor box every 20 frames.
  const ping = ((frame - sensAt) % 20) / 20;

  // Reschedule: each lane runs work, with a sensor's quick check now and then.
  const resLane = (i: number) => {
    const blocks: { x0: number; x1: number; kind: "task" | "check" }[] = [];
    let x = 0;
    let k = i;
    while (x < W) {
      const len = 90 + ((k * 53) % 70);
      blocks.push({ x0: x, x1: Math.min(W, x + len), kind: "task" });
      x += len + 6;
      if (x < W - 20) {
        blocks.push({ x0: x, x1: x + 12, kind: "check" });
        x += 18;
      }
      k += 3;
    }
    return blocks;
  };

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={taskAt} level={-37} />
      <Sfx name="el-pop" at={sensAt + 2} level={-36} />
      <Sfx name="el-whoosh" at={holdsAt} level={-37} />
      <Sfx name="el-scratch" at={nothingAt + 2} level={-34} />
      <Sfx name="el-sprinkle" at={resAt + 4} level={-35} />
      <Sfx name="el-chime" at={useAt} level={-36} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={11} at={qAt - 4} textAt={textAt - 4} size={56}>
          What is a sensor, and why prefer reschedule mode?
        </QuestionCard>

        {/* A task, and a sensor. */}
        <TaskBox cx={X0 + 120} cy={y(300)} w={240} h={h(50)} at={taskAt} tones={[{ at: taskAt, tone: "data" }]} size={23}>
          load
        </TaskBox>
        <Note at={taskAt + 4} x={X0 + 266} y={y(300) - 16}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>a task: performs an action</span>
        </Note>
        <TaskBox cx={X0 + 120} cy={y(378)} w={240} h={h(50)} at={sensAt} mono size={22}>
          wait_for_export
        </TaskBox>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {frame >= sensAt + 4 && frame < resAt ? (
            <rect
              x={X0 - 8 * ping}
              y={y(378) - h(25) - 8 * ping}
              width={240 + 16 * ping}
              height={h(50) + 16 * ping}
              rx={14}
              fill="none"
              stroke={INK_SOFT}
              strokeWidth={2}
              opacity={1 - ping}
            />
          ) : null}
        </svg>
        <Note at={sensAt + 4} x={X0 + 266} y={y(378) - 16}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            a sensor: polls <span style={{ opacity: ease(frame, fileAt, 10) }}>&quot;has the file landed?&quot;</span>
          </span>
        </Note>
        <Note at={blocksAt} x={X0 + 266} y={y(378) + h(24)}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>
            blocks until true<span style={{ opacity: ease(frame, timesAt, 10) }}>, or times out</span>
          </span>
        </Note>

        {/* The page's sensor. */}
        <PyListing
          lines={SENSOR}
          x={1100}
          top={y(286)}
          width={700}
          size={20}
          at={sensAt + 6}
          marks={[
            { line: lineOf(SENSOR, "bucket_key"), at: fileAt, out: pokeAt },
            { line: lineOf(SENSOR, 'mode="reschedule"'), at: resAt, color: MARK_OK },
            { line: lineOf(SENSOR, "poke_interval"), at: fiveAt },
            { line: lineOf(SENSOR, "timeout"), at: twoAt },
          ].map((m) => ({ color: MARK, ...m }))}
        />
        <Note at={fiveAt + 4} x={1100} y={y(560)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            300 s: a check every 5 minutes<span style={{ opacity: ease(frame, twoAt + 4, 10) }}> · 7,200 s: gives up after 2 hours</span>
          </span>
        </Note>

        {/* Poke mode: four slots, four sensors waiting in them. */}
        <Note at={pokeAt} x={X0} y={pokeTop - h(46)}>
          <span style={{ ...note(25, INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            poke mode <span style={{ ...label(21, INK_SOFT) }}>(the default) · a pool of 4 worker slots</span>
          </span>
        </Note>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, pokeAt, 10) }}>
          {Array.from({ length: SLOTS }, (_, i) => {
            const at = i === 0 ? holdsAt : fillAt + (i - 1) * 4;
            const p = ease(frame, at, 24);
            return (
              <g key={i}>
                <rect x={LANE_X0} y={laneY(pokeTop, i)} width={W} height={laneH} rx={4} fill="none" stroke={INK_SOFT} strokeWidth={1.2} opacity={0.6} />
                <rect x={LANE_X0} y={laneY(pokeTop, i)} width={W * p} height={laneH} rx={4} fill={WAIT} stroke={INK_SOFT} strokeWidth={1.4} />
              </g>
            );
          })}
          {/* The real work, queued. */}
          {Array.from({ length: 3 }, (_, i) => (
            <rect
              key={i}
              x={X0 + i * 34}
              y={laneY(pokeTop, 1) + 4}
              width={26}
              height={laneH * 1.6}
              rx={4}
              fill={BAR}
              opacity={0.85 * ease(frame, fillAt + 10 + i * 3, 8)}
              stroke={ACCENT}
              strokeWidth={ease(frame, nothingAt, 8) * 3}
            />
          ))}
        </svg>
        {Array.from({ length: SLOTS }, (_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: LANE_X0 + 14,
              top: laneY(pokeTop, i) + laneH / 2 - 13,
              ...label(19, INK),
              fontWeight: 600,
              whiteSpace: "nowrap",
              opacity: ease(frame, (i === 0 ? holdsAt : fillAt + (i - 1) * 4) + 10, 10),
            }}
          >
            sensor, waiting
          </div>
        ))}
        <div style={{ position: "absolute", left: X0, top: laneY(pokeTop, 0) + 3, ...label(19, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, fillAt + 10, 10) }}>queued</div>
        {frame >= nothingAt + 2 ? (
          <div style={{ position: "absolute", left: X0 + 100, top: laneY(pokeTop, 1) + laneH * 0.8 - 9 }}>
            <Cross at={nothingAt + 2} size={24} />
          </div>
        ) : null}
        <Note at={nothingAt} x={LANE_X1 + 20} y={laneY(pokeTop, 3) - 2}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>nothing else can run</span>
        </Note>

        {/* Reschedule mode: a check takes a slot for a moment and gives it back. */}
        <Note at={resAt} x={X0} y={resTop - h(46)}>
          <span style={{ ...note(25, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            reschedule mode <span style={{ ...label(21, INK_SOFT) }}>· the slot is free between checks</span>
          </span>
        </Note>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, resAt, 10) }}>
          {Array.from({ length: SLOTS }, (_, i) => (
            <g key={i}>
              <rect x={LANE_X0} y={laneY(resTop, i)} width={W} height={laneH} rx={4} fill="none" stroke={INK_SOFT} strokeWidth={1.2} opacity={0.6} />
              {resLane(i).map((b, k) => {
                const p = ease(frame, resAt + 4 + (b.x0 / W) * 40, 8);
                return (
                  <rect
                    key={k}
                    x={LANE_X0 + b.x0}
                    y={laneY(resTop, i) + (b.kind === "check" ? 0 : 2)}
                    width={(b.x1 - b.x0) * p}
                    height={b.kind === "check" ? laneH : laneH - 4}
                    rx={3}
                    fill={b.kind === "check" ? WAIT : BAR}
                    stroke={b.kind === "check" ? INK_SOFT : undefined}
                    strokeWidth={1.4}
                    opacity={b.kind === "check" ? 1 : 0.85}
                  />
                );
              })}
            </g>
          ))}
        </svg>
        <Note at={resAt + 30} x={LANE_X1 + 20} y={laneY(resTop, 0) - 2}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>grey: a check, then the slot is given back</span>
        </Note>
        <Note at={resAt + 40} x={LANE_X1 + 20} y={laneY(resTop, 1) + 4}>
          <span style={{ ...label(21, INK), whiteSpace: "nowrap" }}>blue: real work, running between</span>
        </Note>
        <Note at={useAt} x={LANE_X1 + 20} y={laneY(resTop, 2) + h(16)}>
          <span style={{ ...note(24, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            reschedule, or a deferrable sensor
          </span>
        </Note>
        <Note at={brieflyAt} x={LANE_X1 + 20} y={laneY(resTop, 3) + h(16)}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>for anything that waits more than briefly</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
