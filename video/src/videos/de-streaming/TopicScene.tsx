import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ARRIVALS, count, MOVED, PARTITIONS, USERS } from "./data";
import { Box, Cell, Drift, ElbowArrow, Lane, LANE_LINE, Legend, MARK_BAD, OK_INK, pulse, USER_INK, X0 } from "./parts";

const LANE_X = 520;
const LANE_W = 476;
/** Each partition's lane top, in the layout's coordinates. */
const ROWS = [370, 490, 610];
const LANE_H = 70;
const CELL_W = 82;
const CELL_H = 54;
const STEP = 92;
const PROD = { x: X0, w: 250 };
const RIGHT_X = 1160;
/** The waffle: a hundred squares of a hundred keys each. */
const WAFFLE = { x: 1420, top: 360, cell: 22, gap: 4 };

/**
 * Questions 1 and 2. A topic as one log that only grows at its end, split
 * into three partitions; the video's twelve clicks fly from the producer to
 * the partition their user's key hashes to, each taking the next offset
 * there. Then why the count matters: it caps the consumers and sets where
 * order holds, costs files, rebalances and latency, and can only grow; and
 * growing it moves keys: three of the four users, and in the model 7,432 of
 * ten thousand keys (74%).
 */
export const TopicScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("topic").from;
  const qAt = n.word("topic", "Question one");
  const textAt = n.word("topic", "What are Kafka topics");
  const logAt = n.word("topic-log", "A topic is a named log");
  const endAt = n.word("topic-log", "only grows at its end");
  const splitAt = n.word("topic-log", "It's split into partitions");
  const unitAt = n.word("topic-log", "the unit of parallelism");
  const offsetAt = n.word("topic-log", "Each message gets an offset");
  const zeroAt = n.word("topic-log", "counting up from zero");
  const hashAt = n.word("topic-key", "The producer hashes");
  const avaAt = n.word("topic-key", "all of ava's clicks");
  const orderAt = n.word("topic-key", "in the order they arrived");
  const insideAt = n.word("topic-key", "Order holds inside a partition");
  const acrossAt = n.word("topic-key", "never across them");
  const noKeyAt = n.word("topic-key", "A message with no key");
  const q2At = n.word("parts", "Question two");
  const q2TextAt = n.word("parts", "Why does the number");
  const capAt = n.word("parts-cap", "Partitions cap how many consumers");
  const whereAt = n.word("parts-cap", "set where order holds");
  const moreAt = n.word("parts-cap", "More of them buy throughput");
  const costs = [
    { text: "more open files", at: n.word("parts-cap", "more open files") },
    { text: "longer rebalances", at: n.word("parts-cap", "longer rebalances") },
    { text: "more latency", at: n.word("parts-cap", "more latency") },
  ];
  const addAt = n.word("parts-move", "You can add partitions later");
  const neverAt = n.word("parts-move", "never remove them");
  const movesAt = n.word("parts-move", "adding them moves keys");
  const modelAt = n.word("parts-move", "Model it with ten thousand keys");
  const fourAt = n.word("parts-move", "then four");
  const pctAt = n.word("parts-move", "seventy-four percent move");
  const readAt = n.word("parts-move", "a user's new clicks");
  const peakAt = n.word("parts-move", "Size for peak");
  const end = n.beat("parts-move").to;

  const laneTop = (p: number) => y(ROWS[p]);
  const laneH = h(LANE_H);
  const cellY = (p: number) => laneTop(p) + (laneH - CELL_H) / 2;
  const cellX = (k: number) => LANE_X + 10 + k * STEP;

  // One log first, then three lanes: the outer two open out of the middle one.
  const split = ease(frame, splitAt, 18);
  const laneY = (p: number) => laneTop(1) + (laneTop(p) - laneTop(1)) * split;
  // The single log's grey messages, appended one by one, fade at the split.
  const preCells = [0, 1, 2, 3, 4].map((k) => ({ k, at: k < 4 ? logAt + 4 + k * 5 : endAt + 6 }));
  const preOut = 1 - ease(frame, splitAt - 2, 10);

  // The clicks fly from the producer in arrival order, after the hash is named.
  const prodTop = laneTop(1) + laneH / 2 - h(70);
  const prodMid: [number, number] = [PROD.x + PROD.w, laneTop(1) + laneH / 2];
  const flyAt = (order: number) => hashAt + 8 + order * 4;
  const avaLane = PARTITIONS.of.ava;
  const avaBand = ease(frame, avaAt, 10) * (1 - ease(frame, insideAt + 10, 12));
  const partsOut = q2At - 4;
  const moveOut = addAt - 4;

  // The waffle: the first 74 of 100 squares turn red as the share is said.
  const moved100 = Math.round(MOVED.share * 100);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={logAt} level={-37} />
      <Sfx name="el-whoosh" at={splitAt} level={-36} />
      <Sfx name="el-sprinkle" at={flyAt(0) + 10} level={-33} />
      <Sfx name="el-tap" at={insideAt} level={-36} />
      <Sfx name="el-scratch" at={acrossAt + 2} level={-36} />
      {costs.map((c) => (
        <Sfx key={c.text} name="el-tap" at={c.at} level={-37} />
      ))}
      <Sfx name="el-pop" at={addAt} level={-35} />
      <Sfx name="el-sprinkle" at={pctAt} level={-33} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} out={q2At - 4} size={60}>
          What are Kafka topics, partitions, and offsets?
        </QuestionCard>
        <QuestionCard n={2} at={q2At} textAt={q2TextAt - 2} size={60}>
          Why does the number of partitions matter in Kafka?
        </QuestionCard>

        {/* The producer, which hashes each key. */}
        <Box x={PROD.x} y={prodTop} w={PROD.w} h={h(140)} at={hashAt - 4}>
          <span>producer</span>
          <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 600, color: BLUE_INK, marginTop: 6, fontVariantLigatures: "none" }}>hash(key) mod 3</span>
        </Box>
        <Note at={noKeyAt} x={PROD.x} y={prodTop + h(160)}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>no key: round-robin</span>
        </Note>

        {/* The lanes: one log, then three partitions. */}
        {[0, 1, 2].map((p) => {
          if (p !== 1 && split <= 0) return null;
          const yy = p === 1 ? laneTop(1) : laneY(p);
          const named = p === 1 ? ease(frame, splitAt + 4, 10) : 1;
          return (
            <React.Fragment key={p}>
              <Lane
                x={LANE_X}
                y={yy}
                w={LANE_W}
                h={laneH}
                at={p === 1 ? logAt - 2 : splitAt}
                name={
                  <span style={{ position: "relative" }}>
                    <span style={{ opacity: named }}>
                      partition <Num>{p}</Num>
                    </span>
                    {p === 1 ? <span style={{ position: "absolute", left: 0, top: 0, opacity: 1 - named, color: INK }}>topic · clicks</span> : null}
                  </span>
                }
              />
            </React.Fragment>
          );
        })}
        {preCells.map((c) => (
          <Cell
            key={c.k}
            x={cellX(c.k)}
            y={cellY(1)}
            w={CELL_W}
            h={CELL_H}
            plain
            opacity={ease(frame, c.at, 8) * preOut}
            scale={0.9 + 0.1 * ease(frame, c.at, 8)}
          />
        ))}
        <ElbowArrow
          points={[
            [LANE_X + LANE_W + 120, laneTop(1) + laneH / 2],
            [LANE_X + LANE_W + 10, laneTop(1) + laneH / 2],
          ]}
          at={endAt}
          out={splitAt - 2}
          color={INK}
          dur={10}
        />
        <Note at={endAt + 2} x={LANE_X + LANE_W + 134} y={laneTop(1) + laneH / 2 - h(16)} out={splitAt - 2}>
          <span style={{ ...label(21, INK), fontWeight: 650, whiteSpace: "nowrap" }}>new messages go on the end</span>
        </Note>

        {/* The clicks, each into its user's partition, at the next offset. */}
        {ARRIVALS.map((c) => {
          const at = flyAt(c.order);
          const p = ease(frame, at, 14);
          if (p <= 0) return null;
          const tx = cellX(c.offset);
          const ty = cellY(c.partition);
          const x = interpolate(p, [0, 1], [prodMid[0] - CELL_W / 2, tx]);
          const yy = interpolate(p, [0, 1], [prodMid[1] - CELL_H / 2, ty]) - Math.sin(p * Math.PI) * 30;
          const ring = c.partition === avaLane ? pulse(frame, orderAt + c.offset * 4, 16) : 0;
          return (
            <Cell key={c.i} x={x} y={yy} w={CELL_W} h={CELL_H} user={c.user} opacity={Math.min(1, p * 3)} ring={ring > 0 ? BAR : undefined} ringP={ring}>
              {c.offset}
            </Cell>
          );
        })}
        {/* ava's lane, named. */}
        <div
          style={{
            position: "absolute",
            left: LANE_X - 8,
            top: laneTop(avaLane) - 8,
            width: LANE_W + 16,
            height: laneH + 16,
            borderRadius: 14,
            border: `3px solid ${USER_INK.ava}`,
            opacity: avaBand,
          }}
        />
        <Note at={orderAt} x={LANE_X + LANE_W + 24} y={laneTop(avaLane) + laneH / 2 - h(16)} out={insideAt + 10}>
          <span style={{ ...label(21, USER_INK.ava), fontWeight: 700, whiteSpace: "nowrap" }}>← ava's clicks, offsets 0 to 4, in arrival order</span>
        </Note>
        <Legend x={LANE_X} y={laneTop(2) + laneH + h(34)} at={flyAt(0) + 4} out={addAt - 4} note="· the video's own stream" />

        {/* Offsets named: each lane's slots count from zero. */}
        <Note at={offsetAt} x={RIGHT_X} y={y(400)} out={partsOut}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <b>topic</b>: a named log that only grows at its end
          </span>
        </Note>
        <Note at={unitAt} x={RIGHT_X} y={y(452)} out={partsOut}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <b>partition</b>: the unit of parallelism
          </span>
        </Note>
        <Note at={zeroAt - 4} x={RIGHT_X} y={y(504)} out={partsOut}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <b>offset</b>: a message's position in its partition, from <Num>0</Num>
          </span>
        </Note>

        {/* Order: inside each partition, never across. */}
        {[0, 1, 2].map((p) => (
          <Note key={p} at={insideAt + p * 3} x={LANE_X + LANE_W + 18} y={laneTop(p) + laneH / 2 - h(15)} out={partsOut}>
            <span style={{ ...label(21, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>✓ in order</span>
          </Note>
        ))}
        <Note at={acrossAt} x={RIGHT_X} y={y(600)} out={partsOut}>
          <span style={{ ...note(26, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>no order across partitions</span>
        </Note>

        {/* Question 2: what the count caps, and what it costs. */}
        {[0, 1, 2].map((p) => (
          <React.Fragment key={p}>
            <ElbowArrow
              points={[
                [LANE_X + LANE_W + 6, laneTop(p) + laneH / 2],
                [LANE_X + LANE_W + 74, laneTop(p) + laneH / 2],
              ]}
              at={capAt + 4 + p * 3}
              out={moveOut}
              color={INK_SOFT}
              dur={10}
              head={12}
            />
            <Box x={LANE_X + LANE_W + 84} y={laneTop(p) + laneH / 2 - h(26)} w={120} h={h(52)} at={capAt + 6 + p * 3} out={moveOut} size={20}>
              consumer
            </Box>
          </React.Fragment>
        ))}
        <Note at={capAt + 10} x={RIGHT_X + 160} y={y(400)} out={moveOut}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            at most <b style={TABULAR}>3</b> consumers share the work
          </span>
        </Note>
        <Note at={whereAt} x={RIGHT_X + 160} y={y(452)} out={moveOut}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>order holds inside each one</span>
        </Note>
        <Note at={moreAt} x={RIGHT_X + 160} y={y(530)} out={moveOut}>
          <span style={{ ...note(26, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>more partitions: more throughput</span>
        </Note>
        {costs.map((c, i) => (
          <Note key={c.text} at={c.at - 2} x={RIGHT_X + 184} y={y(580) + i * h(44)} out={moveOut}>
            <span style={{ ...note(25, ACCENT_INK), fontWeight: 600, whiteSpace: "nowrap" }}>+ {c.text}</span>
          </Note>
        ))}

        {/* Growing the topic: a fourth lane, and the keys it moves. */}
        <Lane
          x={LANE_X}
          y={y(730)}
          w={LANE_W}
          h={laneH}
          at={addAt}
          dashed
          name={
            <>
              partition <Num>3</Num>, added
            </>
          }
        />
        <Note at={neverAt} x={LANE_X + 40} y={y(730) + laneH / 2 - h(15)}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>added later; never removed</span>
        </Note>
        <div style={{ position: "absolute", left: RIGHT_X - 100, top: y(330), opacity: ease(frame, movesAt, 12) }}>
          <div style={{ display: "flex", gap: 0, ...label(20, INK_SOFT), fontWeight: 700, borderBottom: `1.5px solid ${HAIRLINE}`, paddingBottom: 6 }}>
            <span style={{ width: 90 }}>key</span>
            <span style={{ width: 110, textAlign: "center" }}>of 3</span>
            <span style={{ width: 110, textAlign: "center" }}>of 4</span>
          </div>
          {USERS.map((u, i) => {
            const moved = PARTITIONS.of[u] !== PARTITIONS.four[u];
            const p = ease(frame, movesAt + 6 + i * 4, 10);
            return (
              <div
                key={u}
                style={{
                  display: "flex",
                  alignItems: "center",
                  height: h(46),
                  ...note(25, INK),
                  background: moved && p > 0 ? `color-mix(in srgb, ${MARK_BAD} ${p * 100}%, transparent)` : undefined,
                  borderRadius: 4,
                }}
              >
                <span style={{ width: 90, color: USER_INK[u], fontWeight: 700, paddingLeft: 4 }}>{u}</span>
                <span style={{ width: 110, textAlign: "center", ...TABULAR }}>{PARTITIONS.of[u]}</span>
                <span style={{ width: 110, textAlign: "center", ...TABULAR, fontWeight: 700, color: moved ? ACCENT_INK : INK, opacity: p }}>
                  {PARTITIONS.four[u]}
                </span>
              </div>
            );
          })}
        </div>
        <Note at={modelAt} x={WAFFLE.x} y={y(WAFFLE.top) - h(70)}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>
            model: <Num>{count(MOVED.keys)}</Num> keys,
            <br />3 partitions, then 4
          </span>
        </Note>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {Array.from({ length: 100 }, (_, k) => {
            const col = k % 10;
            const row = Math.floor(k / 10);
            const inP = ease(frame, modelAt + 4 + row * 1.2, 8);
            const red = k < moved100 ? ease(frame, fourAt + 4 + (k / moved100) * 18, 6) : 0;
            return (
              <rect
                key={k}
                x={WAFFLE.x + col * (WAFFLE.cell + WAFFLE.gap)}
                y={y(WAFFLE.top) + row * (WAFFLE.cell + WAFFLE.gap)}
                width={WAFFLE.cell}
                height={WAFFLE.cell}
                rx={3}
                fill={red > 0.5 ? ACCENT : `color-mix(in srgb, ${BAR} 30%, ${PAPER})`}
                stroke={red > 0.5 ? ACCENT : LANE_LINE}
                strokeWidth={1}
                opacity={inP}
              />
            );
          })}
        </svg>
        <Note at={pctAt} x={WAFFLE.x} y={y(WAFFLE.top) + 10 * (WAFFLE.cell + WAFFLE.gap) + h(10)}>
          <span style={{ ...note(26, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            <Num>{count(MOVED.moved)}</Num> move: <Num>{Math.round(MOVED.share * 100)}</Num>%
          </span>
        </Note>
        <Note at={readAt} x={RIGHT_X - 100} y={y(650)}>
          <span style={{ ...note(25, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>a user's new clicks can be read before the old ones</span>
        </Note>
        <Note at={peakAt} x={RIGHT_X - 100} y={y(706)}>
          <span style={{ ...note(26, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>size for peak throughput, with headroom</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
