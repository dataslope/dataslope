import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ARRIVALS } from "./data";
import { Box, Cell, Crash, Drift, ElbowArrow, Lane, Marker, OK_INK, pulse, QUIET, Strike, X0 } from "./parts";

const LANE_X = 700;
const LANE_W = 476;
const ROWS = [360, 470, 580];
const LANE_H = 70;
const CELL_W = 82;
const CELL_H = 54;
const STEP = 92;
/** Group A, to the right of the lanes; group B, to the left. */
const GA = { x: 1300, w: 380, cx: 1350, cw: 280 };
const GB = { x: X0, w: 360, cx: X0 + 40, cw: 280 };
/** The last committed offset in each partition, drawn as a bar after it. */
const COMMITTED = [1, 2, 2];

/**
 * Questions 3 and 4. The three partitions in the middle, as the producer
 * filled them. Group A reads them from the right: two consumers, then a
 * third after a rebalance, then a fourth with nothing to read. Group B reads
 * every message again from the left. Then the commits: a bar in each lane
 * after the last offset the group has processed and recorded; consumer 2
 * crashes, partition 1 moves to consumer 1, which resumes after the commit,
 * not at offset 0; and the two offsets processed but not committed are the
 * cost question 5 takes up.
 */
export const GroupScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("group").from;
  const qAt = n.word("group", "Question three");
  const textAt = n.word("group", "What is a consumer group");
  const figAt = n.word("group", "scale consumption");
  const setAt = n.word("group-def", "A consumer group is a set of consumers");
  const oneAt = n.word("group-def", "exactly one of them");
  const splitAt = n.word("group-def", "the work is split");
  const twoAt = n.word("group-scale", "Two consumers share three partitions");
  const thirdAt = n.word("group-scale", "Add a third");
  const rebalanceAt = n.word("group-scale", "the group rebalances");
  const eachAt = n.word("group-scale", "one partition each");
  const fourthAt = n.word("group-scale", "Add a fourth");
  const idleAt = n.word("group-scale", "it sits idle");
  const stopsAt = n.word("group-scale", "Parallelism stops");
  const secondAt = n.word("group-fan", "A second group");
  const everyAt = n.word("group-fan", "every message again");
  const feedsAt = n.word("group-fan", "one stream feeds several pipelines");
  const q4At = n.word("commit", "Question four");
  const q4TextAt = n.word("commit", "What are consumer offsets");
  const recordsAt = n.word("commit-def", "A commit records");
  const storesAt = n.word("commit-def", "Kafka stores it");
  const crashAt = n.word("commit-def", "After a crash");
  const ownerAt = n.word("commit-def", "the next owner resumes");
  const startAt = n.word("commit-def", "not from the start");
  const costAt = n.word("commit-when", "what a crash costs");
  const end = n.beat("commit-when").to;

  const laneTop = (p: number) => y(ROWS[p]);
  const laneH = h(LANE_H);
  const mid = (p: number) => laneTop(p) + laneH / 2;
  const cellX = (k: number) => LANE_X + 10 + k * STEP;
  const cellY = (p: number) => laneTop(p) + (laneH - CELL_H) / 2;
  const cH = h(56);
  const cTop = (row: number) => (row < 3 ? mid(row) : mid(2) + h(110)) - cH / 2;
  const cMid = (row: number) => cTop(row) + cH / 2;
  const fanOut = q4At - 4;

  // Assignments in group A: who reads which partition, and when.
  const A = (p: number, c: number, at: number, out?: number) => (
    <ElbowArrow
      key={`${p}-${c}-${at}`}
      points={[
        [LANE_X + LANE_W + 8, mid(p)],
        [GA.cx - 6, cMid(c)],
      ]}
      at={at}
      out={out}
      color={BAR}
      dur={12}
      head={13}
    />
  );
  const lift = pulse(frame, rebalanceAt, 26);
  const crashed = ease(frame, crashAt + 4, 10);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={setAt + 2} level={-35} />
      <Sfx name="el-pencil" at={oneAt} level={-37} />
      <Sfx name="el-whoosh" at={rebalanceAt} level={-35} />
      <Sfx name="el-pop" at={fourthAt + 2} level={-36} />
      <Sfx name="el-pencil" at={everyAt} level={-37} />
      <Sfx name="el-tap" at={recordsAt + 4} level={-36} />
      <Sfx name="el-scratch" at={crashAt + 2} level={-34} />
      <Sfx name="el-scratch" at={startAt + 2} level={-37} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} out={q4At - 4} size={58}>
          What is a consumer group, and how does it scale consumption?
        </QuestionCard>
        <QuestionCard n={4} at={q4At} textAt={q4TextAt - 2} size={60}>
          What are consumer offsets and why commit them?
        </QuestionCard>

        {/* The topic's three partitions, filled as the producer left them. */}
        {[0, 1, 2].map((p) => (
          <Lane
            key={p}
            x={LANE_X}
            y={laneTop(p)}
            w={LANE_W}
            h={laneH}
            at={figAt + p * 3}
            name={
              <>
                partition <Num>{p}</Num>
              </>
            }
          />
        ))}
        {ARRIVALS.map((c) => {
          const flag = c.partition === 1 && c.offset > COMMITTED[1] ? ease(frame, costAt, 10) : 0;
          return (
            <Cell
              key={c.i}
              x={cellX(c.offset)}
              y={cellY(c.partition)}
              w={CELL_W}
              h={CELL_H}
              user={c.user}
              opacity={ease(frame, figAt + 4 + c.order, 8)}
              ring={flag > 0 ? HIGHLIGHT : undefined}
              ringP={flag}
            >
              {c.offset}
            </Cell>
          );
        })}

        {/* Group A. */}
        <Box x={GA.x} y={y(320)} w={GA.w} h={y(780) - y(320)} at={setAt} color={INK_SOFT} fill="transparent" dashed>
          {null}
        </Box>
        <Note at={setAt + 2} x={GA.x + 4} y={y(320) - h(36)}>
          <span style={{ ...label(21, INK), fontWeight: 700, whiteSpace: "nowrap" }}>consumer group A</span>
        </Note>
        {[0, 1, 2, 3].map((c) => {
          const at = c < 2 ? setAt + 6 + c * 4 : c === 2 ? thirdAt : fourthAt;
          const idle = c === 3;
          const down = c === 1 ? crashed : 0;
          return (
            <Box
              key={c}
              x={GA.cx}
              y={cTop(c)}
              w={GA.cw}
              h={cH}
              at={at}
              out={idle ? fanOut : undefined}
              color={idle ? QUIET : INK}
              ink={idle ? INK_SOFT : INK}
              dashed={idle}
              size={21}
              dim={down > 0 ? crashAt + 4 : undefined}
            >
              <span>
                consumer <Num>{c + 1}</Num>
                {idle ? <span style={{ opacity: ease(frame, idleAt, 10) }}> · idle</span> : null}
              </span>
            </Box>
          );
        })}
        {/* Two consumers: 1 takes partitions 0 and 1, 2 takes partition 2. */}
        {A(0, 0, oneAt)}
        {A(1, 0, oneAt + 6, rebalanceAt)}
        {A(2, 1, oneAt + 12, rebalanceAt)}
        {/* After the rebalance: one partition each. */}
        {A(1, 1, rebalanceAt + 8, crashAt + 4)}
        {A(2, 2, rebalanceAt + 14)}
        {/* After consumer 2's crash, partition 1 moves to consumer 1. */}
        {A(1, 0, ownerAt)}
        <div
          style={{
            position: "absolute",
            left: GA.x - 8,
            top: y(320) - 8,
            width: GA.w + 16,
            height: y(780) - y(320) + 16,
            borderRadius: 16,
            boxShadow: lift > 0 ? `0 0 0 ${8 * lift}px ${HIGHLIGHT}` : undefined,
          }}
        />
        <Note at={rebalanceAt} x={GA.x} y={y(790)} out={fanOut}>
          <span style={{ ...label(21, INK), fontWeight: 700, whiteSpace: "nowrap" }}>rebalance: one partition each</span>
        </Note>
        <Crash x={GA.cx + GA.cw - 6} y={cTop(1) + 4} at={crashAt + 2} />

        {/* Group B: one consumer, every message again. */}
        <Box x={GB.x} y={mid(1) - h(70)} w={GB.w} h={h(140)} at={secondAt} out={fanOut} color={INK_SOFT} fill="transparent" dashed>
          {null}
        </Box>
        <Note at={secondAt + 2} x={GB.x + 4} y={mid(1) - h(70) - h(36)} out={fanOut}>
          <span style={{ ...label(21, INK), fontWeight: 700, whiteSpace: "nowrap" }}>consumer group B</span>
        </Note>
        <Box x={GB.cx} y={mid(1) - cH / 2} w={GB.cw} h={cH} at={secondAt + 4} out={fanOut} size={21}>
          consumer
        </Box>
        {[0, 1, 2].map((p) => (
          <ElbowArrow
            key={p}
            points={[
              [LANE_X - 8, mid(p)],
              [GB.cx + GB.cw + 6, mid(1) + (p - 1) * h(14)],
            ]}
            at={everyAt + p * 3}
            out={fanOut}
            color={BAR}
            dur={12}
            head={13}
          />
        ))}

        {/* What a group does, along the bottom. */}
        <Note at={splitAt} x={X0} y={y(820)} out={fanOut}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>each partition goes to exactly one consumer in the group: split, never read twice</span>
        </Note>
        <Note at={stopsAt} x={X0} y={y(872)} out={fanOut}>
          <span style={{ ...note(26, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            parallelism stops at the partition count: a fourth consumer has nothing to read
          </span>
        </Note>
        <Note at={feedsAt} x={X0} y={y(924)} out={fanOut}>
          <span style={{ ...note(26, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>each group reads every message: one stream feeds several pipelines</span>
        </Note>
        <Note at={twoAt} x={GB.x} y={y(320)} out={secondAt - 2}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>
            <Num>2</Num> consumers, <Num>3</Num> partitions
          </span>
        </Note>
        <Note at={eachAt} x={GB.x} y={y(372)} out={secondAt - 2}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>
            then <Num>3</Num> and <Num>3</Num>: one each
          </span>
        </Note>

        {/* Question 4: the commits. */}
        {[0, 1, 2].map((p) => (
          <Marker key={p} x={cellX(COMMITTED[p] + 1) - 5} top={laneTop(p) - 6} bottom={laneTop(p) + laneH + 6} at={recordsAt + 4 + p * 4} color={INK} />
        ))}
        <Note at={recordsAt + 10} x={X0} y={mid(0) - h(16)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            ┃ <b>commit</b>: how far group A got
          </span>
        </Note>
        <Note at={storesAt} x={X0} y={mid(0) + h(26)}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>one per partition, stored in Kafka</span>
        </Note>
        <Note at={ownerAt + 4} x={cellX(COMMITTED[1] + 1) - 20} y={laneTop(2) + laneH + h(36)}>
          <span style={{ ...note(25, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>↑ consumer 1 resumes after the commit</span>
        </Note>
        <Note at={startAt - 2} x={X0} y={mid(2) - h(16)}>
          <span style={{ ...note(25, INK_SOFT), whiteSpace: "nowrap" }}>
            <Strike at={startAt + 4}>not from offset 0</Strike>
          </span>
        </Note>
        <Note at={costAt} x={LANE_X} y={y(820)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <span style={{ background: HIGHLIGHT, borderRadius: 4, padding: "0 6px" }}>offsets 3 and 4</span>: processed, never committed. Read again?
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
