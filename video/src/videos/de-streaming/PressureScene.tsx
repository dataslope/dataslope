import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { at as sAt, Axes, type Scale } from "../da-statistics-communication/parts";
import { BACKPRESSURE, count } from "./data";
import { Bar, Box, Bracket, Cell, Drift, ElbowArrow, Lane, OK, OK_INK, X0 } from "./parts";

const LANE = { x: 400, w: 630, h: 52 };
/** Each partition's lane top, in the layout's coordinates. */
const ROWS = [350, 438];
const CELL = { w: 40, h: 44, step: 47 };
/** How many cells a lane holds, and how fast each end moves, in cells a frame. */
const SLOTS = 13;
const IN_RATE = 0.2;
const OUT_RATE = 0.11;
/** Where the read end stops while one consumer reads both partitions. */
const BEHIND = SLOTS * (OUT_RATE / IN_RATE);

/**
 * Question 12. A producer writing faster than its consumer reads: the log
 * keeps every message, the consumer falls behind, and the gap between the
 * latest offset and the committed one is the lag; nothing is lost while the
 * lag stays inside retention. A push-based system pushes back on the
 * producer instead. Then the model: about a hundred messages a second into a
 * topic of two partitions, both read by one consumer that handles eighty,
 * lag 1,143 after a minute; a second consumer takes partition 1 in a
 * rebalance, and the two clear it in 20 seconds. On one partition the second
 * consumer would have nothing to read, as question 3 showed.
 */
export const PressureScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("pressure").from;
  const qAt = n.word("pressure", "Question twelve");
  const textAt = n.word("pressure", "What is backpressure");
  const keepUpAt = n.word("bp-def", "can't keep up");
  const absorbsAt = n.word("bp-def", "Kafka absorbs it");
  const durableAt = n.word("bp-def", "the log is durable");
  const behindAt = n.word("bp-def", "falls behind");
  const droppedAt = n.word("bp-def", "nothing is dropped");
  const retentionAt = n.word("bp-retain", "inside the retention period");
  const pushAt = n.word("bp-push", "Push-based systems");
  const slowAt = n.word("bp-push", "slow the producer");
  const lagAt = n.word("bp-lag", "Watch consumer lag");
  const distAt = n.word("bp-lag", "the distance from the latest offset");
  const modelAt = n.word("bp-lag", "Model it");
  const hundredAt = n.word("bp-lag", "about a hundred messages a second");
  const eightyAt = n.word("bp-lag", "handles eighty");
  const minuteAt = n.word("bp-lag", "After a minute");
  const elevenAt = n.word("bp-lag", "over eleven hundred");
  const secondAt = n.word("bp-fix", "A second consumer");
  const takesAt = n.word("bp-fix", "one of the two partitions");
  const clearsAt = n.word("bp-fix", "the lag clears in twenty seconds");
  const idleAt = n.word("bp-fix", "With one partition");
  const risingAt = n.word("bp-rising", "Rising lag means");
  const end = n.beat("bp-rising").to;

  // Each lane fills from the producer faster than the one consumer reads it;
  // once a second consumer takes partition 1, both read ends catch up.
  const t0 = keepUpAt - 10;
  const catchUp = ease(frame, secondAt + 10, 60);
  const lane = (p: number) => {
    const start = t0 + p * 4;
    const written = Math.min(SLOTS, Math.max(0, (frame - start) * IN_RATE));
    const reading = Math.min(BEHIND, Math.max(0, (frame - start) * OUT_RATE));
    return { written, read: reading + (written - reading) * catchUp };
  };
  const parts = Array.from({ length: BACKPRESSURE.partitions }, (_, p) => p);
  const cellX = (k: number) => LANE.x + 8 + k * CELL.step;
  const markX = (k: number) => cellX(k) - (CELL.step - CELL.w) / 2;
  const laneTop = (p: number) => y(ROWS[p]);
  const laneH = h(LANE.h);
  const mid = (p: number) => laneTop(p) + laneH / 2;
  /** Halfway between the two lanes: where the producer and the notes sit. */
  const both = (mid(0) + mid(parts.length - 1)) / 2;
  const last = parts.length - 1;
  const prod = { x: X0, w: 210, h: h(100) };
  const cons = { x: LANE.x + LANE.w + 70, w: 220, h: h(64) };
  const loopY = y(292);
  const bottom = lane(last);

  // The chart: lag, second by second, summed over the two partitions.
  const sx: Scale = { lo: 0, hi: 100, a: 400, b: 1400 };
  const sy: Scale = { lo: 0, hi: 1200, a: y(830), b: y(610) };
  const lag = BACKPRESSURE.lagTwoPartitions;
  const drawn = (until: number) =>
    lag
      .slice(0, until)
      .map((v, i) => `${i ? "L" : "M"}${sAt(sx, i + 1)},${sAt(sy, v)}`)
      .join(" ");
  const upTo = Math.round(BACKPRESSURE.join * ease(frame, eightyAt + 4, Math.max(24, minuteAt + 12 - eightyAt - 4)));
  const downTo = Math.round((BACKPRESSURE.drainedAtByPartition + 6 - BACKPRESSURE.join) * ease(frame, secondAt + 10, 40));
  const shown = upTo + (upTo >= BACKPRESSURE.join ? downTo : 0);
  const joinX = sAt(sx, BACKPRESSURE.join);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={keepUpAt} level={-34} />
      <Sfx name="el-pencil" at={pushAt + 4} level={-37} />
      <Sfx name="el-pencil" at={distAt + 2} level={-37} />
      <Sfx name="el-pencil" at={eightyAt + 6} level={-37} />
      <Sfx name="el-tap" at={elevenAt} level={-35} />
      <Sfx name="el-pop" at={secondAt + 4} level={-35} />
      <Sfx name="el-tap" at={clearsAt + 2} level={-36} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={12} at={qAt - 4} textAt={textAt - 4} size={58}>
          What is backpressure, and how do streaming systems handle it?
        </QuestionCard>

        {/* Producer, a topic of two partitions, and its consumers. */}
        <Box x={prod.x} y={both - prod.h / 2} w={prod.w} h={prod.h} at={keepUpAt - 8}>
          <span>producer</span>
        </Box>
        {parts.map((p) => {
          const { written, read } = lane(p);
          return (
            <React.Fragment key={p}>
              <ElbowArrow
                points={[
                  [prod.x + prod.w + 6, mid(p)],
                  [LANE.x - 8, mid(p)],
                ]}
                at={keepUpAt - 6 + p * 2}
                color={BAR}
                dur={10}
                head={12}
              />
              <Lane
                x={LANE.x}
                y={laneTop(p)}
                w={LANE.w}
                h={laneH}
                at={keepUpAt - 8 + p * 2}
                name={
                  p === 0 ? (
                    <>
                      the log: a topic of <Num>{BACKPRESSURE.partitions}</Num> partitions · partition <Num>0</Num>
                    </>
                  ) : (
                    <>
                      partition <Num>{p}</Num>
                    </>
                  )
                }
              />
              {Array.from({ length: SLOTS }, (_, k) => {
                const shownP = Math.min(1, Math.max(0, written - k));
                if (shownP <= 0) return null;
                const done = read > k + 1;
                return (
                  <Cell
                    key={k}
                    x={cellX(k)}
                    y={laneTop(p) + (laneH - h(CELL.h)) / 2}
                    w={CELL.w}
                    h={h(CELL.h)}
                    plain
                    opacity={done ? 0.35 : shownP}
                    size={19}
                  />
                );
              })}
              {/* The committed position and the latest offset. */}
              <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, keepUpAt + 4, 10) }}>
                <line x1={markX(read)} x2={markX(read)} y1={laneTop(p) - 6} y2={laneTop(p) + laneH + 6} stroke={BAR} strokeWidth={4} strokeLinecap="round" />
                <line x1={markX(written)} x2={markX(written)} y1={laneTop(p) - 6} y2={laneTop(p) + laneH + 6} stroke={INK} strokeWidth={3} strokeLinecap="round" />
              </svg>
            </React.Fragment>
          );
        })}
        {/* One consumer reads both partitions; a second takes partition 1. */}
        <Box x={cons.x} y={mid(0) - cons.h / 2} w={cons.w} h={cons.h} at={keepUpAt - 4}>
          <span>
            consumer<span style={{ opacity: ease(frame, secondAt + 2, 10) }}>
              {" "}
              <Num>1</Num>
            </span>
          </span>
          {/* Folds away once the second consumer takes a partition, so "consumer 1" re-centres. */}
          <span
            style={{
              ...label(20, ACCENT_INK),
              display: "block",
              overflow: "hidden",
              height: 26 * (1 - ease(frame, takesAt + 6, 12)),
              opacity: ease(frame, keepUpAt, 10) * (1 - ease(frame, takesAt, 10)),
            }}
          >
            can't keep up
          </span>
        </Box>
        <ElbowArrow
          points={[
            [LANE.x + LANE.w + 8, mid(0)],
            [cons.x - 6, mid(0)],
          ]}
          at={keepUpAt - 2}
          color={BAR}
          dur={10}
          head={12}
        />
        <ElbowArrow
          points={[
            [LANE.x + LANE.w + 8, mid(last)],
            [LANE.x + LANE.w + 34, mid(last)],
            [LANE.x + LANE.w + 34, mid(0) + h(18)],
            [cons.x - 6, mid(0) + h(18)],
          ]}
          at={keepUpAt}
          out={takesAt}
          color={BAR}
          dur={12}
          head={12}
        />
        <Box x={cons.x} y={mid(last) - cons.h / 2} w={cons.w} h={cons.h} at={secondAt + 2} color={OK}>
          <span>
            consumer <Num>2</Num>
          </span>
        </Box>
        <ElbowArrow
          points={[
            [LANE.x + LANE.w + 8, mid(last)],
            [cons.x - 6, mid(last)],
          ]}
          at={takesAt + 4}
          color={BAR}
          dur={10}
          head={12}
        />
        <Note at={idleAt} x={cons.x} y={mid(last) + cons.h / 2 + h(12)}>
          <span style={{ ...label(20, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>on one partition, it would sit idle</span>
        </Note>
        <Bracket x0={markX(bottom.read)} x1={markX(bottom.written)} y={laneTop(last) + laneH + h(16)} at={lagAt} out={clearsAt + 10}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 750 }}>consumer lag</span>
        </Bracket>
        <Note at={distAt + 2} x={X0} y={laneTop(last) + laneH + h(28)}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>
            lag = latest offset
            <Bar color={INK} />
            minus committed offset
            <Bar color={BAR} />
          </span>
        </Note>
        <Note at={absorbsAt} x={cons.x + cons.w + 24} y={both - h(66)}>
          <span style={{ ...note(24, OK_INK), fontWeight: 600, whiteSpace: "nowrap" }}>
            Kafka absorbs it<span style={{ opacity: ease(frame, durableAt, 10) }}>: the log is durable,</span>
          </span>
        </Note>
        <Note at={behindAt} x={cons.x + cons.w + 24} y={both - h(26)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>so the consumer falls behind</span>
        </Note>
        <Note at={droppedAt} x={cons.x + cons.w + 24} y={both + h(14)}>
          <span style={{ ...note(24, OK_INK), fontWeight: 600, whiteSpace: "nowrap" }}>
            and nothing is dropped
            <span style={{ ...label(22, INK_SOFT), fontWeight: 650, opacity: ease(frame, retentionAt, 10) }}>, within retention</span>
          </span>
        </Note>
        {/* A push-based system pushes back instead. */}
        <ElbowArrow
          points={[
            [cons.x + cons.w / 2, mid(0) - cons.h / 2 - 6],
            [cons.x + cons.w / 2, loopY],
            [prod.x + prod.w / 2, loopY],
            [prod.x + prod.w / 2, both - prod.h / 2 - 6],
          ]}
          at={pushAt + 4}
          color={INK_SOFT}
          dur={22}
          head={13}
        />
        <Note at={slowAt - 2} x={LANE.x + 40} y={loopY - h(38)}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 600, whiteSpace: "nowrap" }}>push-based: "slow down" goes back to the producer</span>
        </Note>

        {/* The model: lag, second by second. */}
        <Axes
          x={sx}
          y={sy}
          xTicks={[0, 20, 40, 60, 80, 100]}
          yTicks={[0, 400, 800, 1200]}
          yFormat={(v) => count(v)}
          xTitle="seconds"
          yTitle="lag in messages, both partitions"
          at={modelAt}
        />
        <Note at={modelAt + 2} x={X0} y={sy.b - h(4)}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>model</span>
        </Note>
        <Note at={hundredAt} x={X0} y={sy.b + h(36)}>
          <span style={{ ...label(20, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            in: about <Num>{BACKPRESSURE.rate}</Num> a second
          </span>
        </Note>
        <Note at={eightyAt} x={X0} y={sy.b + h(70)}>
          <span style={{ ...label(20, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            handled: <Num>{BACKPRESSURE.one}</Num> a second
          </span>
        </Note>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {shown > 1 ? <path d={drawn(shown)} fill="none" stroke={ACCENT} strokeWidth={3.5} strokeLinejoin="round" /> : null}
          <line x1={joinX} x2={joinX} y1={sy.b - 10} y2={sy.a} stroke={OK} strokeWidth={3} strokeDasharray="7 6" opacity={ease(frame, takesAt + 4, 10)} />
        </svg>
        <Note at={elevenAt} x={sAt(sx, BACKPRESSURE.join) - 250} y={sAt(sy, BACKPRESSURE.atJoin) - h(48)}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 750, whiteSpace: "nowrap" }}>
            <Num>{count(BACKPRESSURE.atJoin)}</Num> at a minute
          </span>
        </Note>
        <Note at={takesAt + 4} x={joinX + 16} y={sy.b - h(26)}>
          <span style={{ ...label(21, OK_INK), fontWeight: 600, whiteSpace: "nowrap" }}>
            a second consumer takes partition <Num>1</Num>
          </span>
        </Note>
        <Note at={clearsAt + 2} x={sAt(sx, BACKPRESSURE.drainedAtByPartition) + 14} y={sAt(sy, 0) - h(52)}>
          <span style={{ ...note(24, OK_INK), fontWeight: 750, whiteSpace: "nowrap" }}>
            cleared in <Num>{BACKPRESSURE.drainSecondsByPartition}</Num> s
          </span>
        </Note>
        <Note at={risingAt} x={1460} y={y(660)}>
          <span style={{ ...note(24, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            rising lag:
            <br />
            more partitions and consumers,
            <br />
            or faster processing
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
