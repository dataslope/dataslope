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

const LANE = { x: 400, w: 630, top: 370, h: 68 };
const CELL = { w: 40, h: 46, step: 47 };
/** How many cells the lane holds, and how fast each end moves, in cells a frame. */
const SLOTS = 13;
const IN_RATE = 0.2;
const OUT_RATE = 0.11;

/**
 * Question 12. A producer writing faster than its consumer reads: the log
 * keeps every message, the consumer falls behind, and the gap between the
 * latest offset and the committed one is the lag. A push-based system pushes
 * back on the producer instead. Then the model: about a hundred messages a
 * second against a consumer that handles eighty, lag 1,143 after a minute,
 * and a second consumer that clears it in 18 seconds.
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
  const pushAt = n.word("bp-def", "Push-based systems");
  const slowAt = n.word("bp-def", "slow the producer");
  const lagAt = n.word("bp-lag", "Watch consumer lag");
  const distAt = n.word("bp-lag", "the distance from the latest offset");
  const modelAt = n.word("bp-lag", "Model it");
  const hundredAt = n.word("bp-lag", "about a hundred messages a second");
  const eightyAt = n.word("bp-lag", "handles eighty");
  const minuteAt = n.word("bp-lag", "After a minute");
  const elevenAt = n.word("bp-lag", "over eleven hundred");
  const secondAt = n.word("bp-fix", "A second consumer");
  const clearsAt = n.word("bp-fix", "clears it in eighteen seconds");
  const risingAt = n.word("bp-fix", "Rising lag means");
  const end = n.beat("bp-fix").to;

  // The lane fills from the producer faster than the consumer reads it.
  const t0 = keepUpAt - 10;
  const written = Math.min(SLOTS, Math.max(0, (frame - t0) * IN_RATE));
  const read = Math.min(SLOTS * (OUT_RATE / IN_RATE), Math.max(0, (frame - t0) * OUT_RATE));
  const cellX = (k: number) => LANE.x + 8 + k * CELL.step;
  const laneTop = y(LANE.top);
  const laneH = h(LANE.h);
  const mid = laneTop + laneH / 2;
  const committedX = cellX(read) - (CELL.step - CELL.w) / 2;
  const latestX = cellX(written) - (CELL.step - CELL.w) / 2;
  const prod = { x: X0, w: 210 };
  const cons = { x: LANE.x + LANE.w + 70, w: 220 };

  // The chart: lag, second by second.
  const sx: Scale = { lo: 0, hi: 100, a: 400, b: 1400 };
  const sy: Scale = { lo: 0, hi: 1200, a: y(830), b: y(610) };
  const lag = BACKPRESSURE.lag;
  const drawn = (until: number) =>
    lag
      .slice(0, until)
      .map((v, i) => `${i ? "L" : "M"}${sAt(sx, i + 1)},${sAt(sy, v)}`)
      .join(" ");
  const upTo = Math.round(BACKPRESSURE.join * ease(frame, eightyAt + 4, Math.max(24, minuteAt + 12 - eightyAt - 4)));
  const downTo = Math.round((BACKPRESSURE.drainedAt + 6 - BACKPRESSURE.join) * ease(frame, secondAt + 10, 40));
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

        {/* Producer, log, consumer. */}
        <Box x={prod.x} y={mid - h(44)} w={prod.w} h={h(88)} at={keepUpAt - 8}>
          <span>producer</span>
        </Box>
        <ElbowArrow
          points={[
            [prod.x + prod.w + 6, mid],
            [LANE.x - 8, mid],
          ]}
          at={keepUpAt - 6}
          color={BAR}
          dur={10}
          head={12}
        />
        <Lane x={LANE.x} y={laneTop} w={LANE.w} h={laneH} at={keepUpAt - 8} name="the log: a partition" />
        {Array.from({ length: SLOTS }, (_, k) => {
          const p = Math.min(1, Math.max(0, written - k));
          if (p <= 0) return null;
          const done = read > k + 1;
          return <Cell key={k} x={cellX(k)} y={laneTop + (laneH - CELL.h) / 2} w={CELL.w} h={CELL.h} plain opacity={done ? 0.35 : p} size={19} />;
        })}
        <Box x={cons.x} y={mid - h(44)} w={cons.w} h={h(88)} at={keepUpAt - 4}>
          <span>consumer</span>
          <span style={{ ...label(20, ACCENT_INK), opacity: ease(frame, keepUpAt, 10) }}>can't keep up</span>
        </Box>
        <ElbowArrow
          points={[
            [LANE.x + LANE.w + 8, mid],
            [cons.x - 6, mid],
          ]}
          at={keepUpAt - 2}
          color={BAR}
          dur={10}
          head={12}
        />
        {/* The committed position and the latest offset. */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, keepUpAt + 4, 10) }}>
          <line x1={committedX} x2={committedX} y1={laneTop - 8} y2={laneTop + laneH + 8} stroke={BAR} strokeWidth={4} strokeLinecap="round" />
          <line x1={latestX} x2={latestX} y1={laneTop - 8} y2={laneTop + laneH + 8} stroke={INK} strokeWidth={3} strokeLinecap="round" />
        </svg>
        <Bracket x0={committedX} x1={latestX} y={laneTop + laneH + h(18)} at={lagAt}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 750 }}>consumer lag</span>
        </Bracket>
        <Note at={distAt + 2} x={LANE.x} y={laneTop + laneH + h(76)}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>
            lag = latest offset
            <Bar color={INK} />
            minus committed offset
            <Bar color={BAR} />
          </span>
        </Note>
        <Note at={absorbsAt} x={cons.x + cons.w + 24} y={mid - h(52)}>
          <span style={{ ...note(24, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            Kafka absorbs it<span style={{ opacity: ease(frame, durableAt, 10) }}>: the log is durable,</span>
          </span>
        </Note>
        <Note at={behindAt} x={cons.x + cons.w + 24} y={mid - h(14)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>so the consumer falls behind</span>
        </Note>
        <Note at={droppedAt} x={cons.x + cons.w + 24} y={mid + h(24)}>
          <span style={{ ...note(24, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>and nothing is dropped</span>
        </Note>
        {/* A push-based system pushes back instead. */}
        <ElbowArrow
          points={[
            [cons.x + cons.w / 2, mid - h(52)],
            [cons.x + cons.w / 2, y(300)],
            [prod.x + prod.w / 2, y(300)],
            [prod.x + prod.w / 2, mid - h(52)],
          ]}
          at={pushAt + 4}
          color={ACCENT}
          dur={22}
          head={13}
        />
        <Note at={slowAt - 2} x={LANE.x + 40} y={y(300) - h(38)}>
          <span style={{ ...label(21, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>push-based: "slow down" goes back to the producer</span>
        </Note>

        {/* The model: lag, second by second. */}
        <Axes
          x={sx}
          y={sy}
          xTicks={[0, 20, 40, 60, 80, 100]}
          yTicks={[0, 400, 800, 1200]}
          yFormat={(v) => count(v)}
          xTitle="seconds"
          yTitle="consumer lag, messages"
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
          <line x1={joinX} x2={joinX} y1={sy.b - 10} y2={sy.a} stroke={OK} strokeWidth={3} strokeDasharray="7 6" opacity={ease(frame, secondAt + 4, 10)} />
        </svg>
        <Note at={elevenAt} x={sAt(sx, BACKPRESSURE.join) - 250} y={sAt(sy, BACKPRESSURE.atJoin) - h(48)}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 750, whiteSpace: "nowrap" }}>
            <Num>{count(BACKPRESSURE.atJoin)}</Num> at a minute
          </span>
        </Note>
        <Note at={secondAt + 4} x={joinX + 16} y={sy.b - h(26)}>
          <span style={{ ...label(21, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            a second consumer: <Num>{BACKPRESSURE.two}</Num> a second
          </span>
        </Note>
        <Note at={clearsAt + 2} x={sAt(sx, BACKPRESSURE.drainedAt) + 14} y={sAt(sy, 0) - h(52)}>
          <span style={{ ...note(24, OK_INK), fontWeight: 750, whiteSpace: "nowrap" }}>
            cleared in <Num>{BACKPRESSURE.drainSeconds}</Num> s
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
