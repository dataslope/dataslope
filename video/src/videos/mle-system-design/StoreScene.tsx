import { Database } from "lucide-react";
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { Drift, Fade, Flow, Line, MARK_BAD, MARK_OK, MiniMap, Node, OK, OK_INK, Q_SIZE, Q_W, Rel, Tag, X0 } from "./parts";

const TRANSFORM = { x: X0, w: 280 };
const STORE = { x: 520, w: 330 };
const USE = { x: 1000, w: 230 };
const OFF = { x: X0, w: 660 };
const ON = { x: 1290, w: 520 };
/** One card's past-hour count, as the offline store keeps it: every value
 *  with the time it was true. */
const HISTORY = [
  { v: 1, at: "Mar 11, 18:02" },
  { v: 3, at: "Mar 12, 09:14" },
  { v: 5, at: "Mar 12, 21:40" },
  { v: 2, at: "today, 08:30" },
];
const LATEST = [
  { card: "4417", v: 2 },
  { card: "5520", v: 0 },
  { card: "6131", v: 4 },
];

/**
 * Questions 3 and 4: the fix for question 2 as a component. One
 * transformation writes features into a feature store, which serves the same
 * values to training and to serving and lets teams reuse them; each value
 * goes to an offline store (the full history, for training sets) and an
 * online store (the latest value, in milliseconds). Then the follow-up: a
 * training row from March 12 joined to today's value trains on the future;
 * a point-in-time lookup takes the last value before the row's timestamp.
 */
export const StoreScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q3").from;
  const qAt = n.word("q3", "Questions three and four");
  const textAt = n.word("q3", "What is a feature store");
  const q4At = n.word("q3", "And what are its offline and online stores");
  const placeAt = n.word("q3-what", "one place to define");
  const bothAt = n.word("q3-what", "for training and serving alike");
  const reuseAt = n.word("q3-what", "Teams reuse vetted features");
  const oneTransformAt = n.word("q3-what", "one transformation backs both paths");
  const cureAt = n.word("q3-what", "the cure for question two");
  const twoAt = n.word("q3-stores", "written to two stores");
  const offlineAt = n.word("q3-stores", "The offline store");
  const lakeAt = n.word("q3-stores", "a warehouse or a lake of files");
  const historyAt = n.word("q3-stores", "keeps the full history");
  const onlineAt = n.word("q3-stores", "The online store");
  const redisAt = n.word("q3-stores", "a key-value database like Redis");
  const latestAt = n.word("q3-stores", "keeps only the latest value");
  const msAt = n.word("q3-stores", "served in milliseconds");
  const timeAt = n.word("q3-time", "The follow-up is time");
  const rowAt = n.word("q3-time", "A training row from March");
  const asStoodAt = n.word("q3-time", "as it stood in March");
  const todayAt = n.word("q3-time", "Join today's value instead");
  const futureAt = n.word("q3-time", "trains on the future");
  const pitAt = n.word("q3-time", "point-in-time lookups");
  const lastAt = n.word("q3-time", "the last value before");
  const inAt = n.word("q5-in", "the model has to answer quickly");
  const end = n.beat("q5-in").to;

  const top = y(400);
  const storeMid = top;
  const useMid = [y(352), y(448)];
  const storeBottom = storeMid + 42;
  const fork = y(548);
  const titleTop = y(586);
  const rowY = (i: number) => y(690) + i * h(36);
  const onRowY = (i: number) => y(690) + i * h(36);
  const cols = { card: OFF.x + 14, v: OFF.x + 150, at: OFF.x + 380 };
  const chipMid = y(408);
  const tableRight = OFF.x + OFF.w;
  const rowMid = (i: number) => rowY(i) + 14;

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={placeAt} level={-30} />
      <Sfx name="el-pencil" at={bothAt} level={-35} />
      <Sfx name="el-tap" at={reuseAt + 6} level={-31} />
      <Sfx name="el-chime" at={cureAt + 6} level={-33} />
      <Sfx name="el-whoosh" at={twoAt} level={-36} />
      <Sfx name="el-sprinkle" at={historyAt} level={-33} />
      <Sfx name="el-tap" at={latestAt} level={-31} />
      <Sfx name="el-tap" at={rowAt} level={-30} />
      <Sfx name="el-scratch" at={futureAt} level={-33} />
      <Sfx name="el-pencil" at={pitAt} level={-35} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={3} kicker="Questions 3 and 4" at={qAt - 4} textAt={textAt - 4} size={Q_SIZE} width={Q_W}>
          What is a feature store, and why use one?{" "}
          <span style={{ opacity: ease(frame, q4At, 14) }}>And what are its offline and online stores?</span>
        </QuestionCard>
        <MiniMap
          at={qAt}
          store={placeAt}
          lit={[
            ["features", qAt + 10],
            ["model", inAt],
          ]}
        />

        {/* ── One place: a transformation into the store, out to both paths ── */}
        <Fade out={timeAt}>
          <Node x={TRANSFORM.x} y={top - 42} w={TRANSFORM.w} h={84} at={placeAt} title="Transformation" sub="defined once" lit={oneTransformAt} litOut={twoAt} />
          <Flow points={[[TRANSFORM.x + TRANSFORM.w + 3, storeMid], [STORE.x - 3, storeMid]]} at={placeAt + 6} color={BAR} />
          <Node x={STORE.x} y={top - 42} w={STORE.w} h={84} at={placeAt + 4} icon={Database} title="Feature Store" sub="define, store, serve" />
          {[0, 1].map((i) => (
            <React.Fragment key={i}>
              <Flow
                points={[
                  [STORE.x + STORE.w + 3, storeMid + (i ? 14 : -14)],
                  [STORE.x + STORE.w + 50, storeMid + (i ? 14 : -14)],
                  [STORE.x + STORE.w + 50, useMid[i]],
                  [USE.x - 3, useMid[i]],
                ]}
                at={bothAt + i * 6}
                color={BAR}
                lit={oneTransformAt + 4}
                litOut={twoAt}
              />
              <Node x={USE.x} y={useMid[i] - 30} w={USE.w} h={60} at={bothAt + 4 + i * 6} title={i ? "Serving" : "Training"} size={22} />
            </React.Fragment>
          ))}
          <Line at={reuseAt} x={1320} y={useMid[0] - 16} size={21} color={INK_SOFT}>
            Reused, not rewritten
          </Line>
          <Ink at={reuseAt + 6} dur={12} style={{ left: 1320, top: useMid[0] + h(30), whiteSpace: "nowrap", display: "flex", gap: 12, fontSize: 21 }}>
            <Tag size={21}>fraud team</Tag>
            <Tag size={21}>search team</Tag>
          </Ink>
          <Line at={cureAt} x={USE.x} y={useMid[1] + h(56)} size={22} color={OK_INK}>
            The cure for question 2
          </Line>
          {/* Each value goes to two stores. */}
          {[
            [STORE.x + STORE.w / 2 - 30, OFF.x + 165],
            [STORE.x + STORE.w / 2 + 30, ON.x + 150],
          ].map(([sx, tx], i) => (
            <Flow
              key={i}
              points={[
                [sx, storeBottom + 3],
                [sx, fork],
                [tx, fork],
                [tx, titleTop - 3],
              ]}
              at={twoAt + i * 4}
              dur={18}
              color={BAR}
            />
          ))}
        </Fade>

        {/* ── The offline store: the full history ── */}
        <Node x={OFF.x + 15} y={titleTop} w={300} h={60} at={offlineAt} icon={Database} title="Offline Store" size={22} />
        <Ink at={offlineAt + 6} dur={12} style={{ left: OFF.x, top: y(654), whiteSpace: "nowrap", fontSize: 20 }}>
          <Rel w={OFF.w - 120} h={28}>
            <span style={{ ...label(20, INK_SOFT), position: "absolute", left: cols.card - OFF.x }}>card</span>
            <span style={{ ...label(20, INK_SOFT), position: "absolute", left: cols.v - OFF.x, fontFamily: MONO, fontSize: 19 }}>txn_count_1h</span>
            <span style={{ ...label(20, INK_SOFT), position: "absolute", left: cols.at - OFF.x }}>as of</span>
          </Rel>
        </Ink>
        <div style={{ position: "absolute", left: OFF.x, top: y(654) + 30, width: OFF.w - 120, height: 1, background: HAIRLINE, opacity: ease(frame, offlineAt + 8, 12) }} />
        {HISTORY.map((r, i) => {
          const good = i === 1 ? ease(frame, lastAt, 12) : 0;
          const bad = i === 3 ? ease(frame, todayAt + 10, 12) * (1 - ease(frame, pitAt, 14) * 0.6) : 0;
          return (
            <Ink key={i} at={historyAt + i * 5} dur={12} style={{ left: OFF.x, top: rowY(i) }}>
              <Rel w={OFF.w - 120} h={30}>
                <div style={{ position: "absolute", inset: "-4px -8px", borderRadius: 5, background: good > 0 ? MARK_OK : MARK_BAD, opacity: Math.max(good, bad) }} />
                <span style={{ ...note(21, INK), position: "absolute", left: cols.card - OFF.x }}>4417</span>
                <span style={{ ...note(21, BLUE_INK), position: "absolute", left: cols.v - OFF.x + 40 }}>
                  <Num>{r.v}</Num>
                </span>
                <span style={{ ...note(21, INK), position: "absolute", left: cols.at - OFF.x, whiteSpace: "nowrap" }}>{r.at}</span>
              </Rel>
            </Ink>
          );
        })}
        <Line at={lakeAt} x={OFF.x} y={y(846)} size={21} color={INK_SOFT} dim={timeAt}>
          A warehouse or a lake of files
        </Line>
        <Line at={historyAt + 10} x={OFF.x} y={y(846) + h(34)} size={21} color={BLUE_INK} dim={timeAt}>
          Full history, to build training sets
        </Line>

        {/* ── The online store: one row per key, the latest value ── */}
        <Fade dim={timeAt}>
          <Node x={ON.x + 30} y={titleTop} w={290} h={60} at={onlineAt} icon={Database} title="Online Store" size={22} />
          <Ink at={onlineAt + 6} dur={12} style={{ left: ON.x, top: y(654), whiteSpace: "nowrap" }}>
            <Rel w={340} h={28}>
              <span style={{ ...label(20, INK_SOFT), position: "absolute", left: 14 }}>card</span>
              <span style={{ ...label(20, INK_SOFT), position: "absolute", left: 150, fontFamily: MONO, fontSize: 19 }}>txn_count_1h</span>
            </Rel>
          </Ink>
          <div style={{ position: "absolute", left: ON.x, top: y(654) + 30, width: 340, height: 1, background: HAIRLINE, opacity: ease(frame, onlineAt + 8, 12) }} />
          {LATEST.map((r, i) => (
            <Ink key={r.card} at={latestAt + i * 4} dur={12} style={{ left: ON.x, top: onRowY(i) }}>
              <Rel w={340} h={30}>
                <span style={{ ...note(21, INK), position: "absolute", left: 14 }}>{r.card}</span>
                <span style={{ ...note(21, BLUE_INK), position: "absolute", left: 190 }}>
                  <Num>{r.v}</Num>
                </span>
              </Rel>
            </Ink>
          ))}
          <Line at={redisAt} x={ON.x} y={y(846)} size={21} color={INK_SOFT}>
            Key-value, like Redis
          </Line>
          <Line at={msAt} x={ON.x} y={y(846) + h(34)} size={21} color={BLUE_INK}>
            Latest value, served in milliseconds
          </Line>
        </Fade>

        {/* ── The follow-up: a training row from March 12 ── */}
        <Node
          x={OFF.x}
          y={chipMid - 44}
          w={OFF.w - 120}
          h={88}
          at={rowAt}
          title="Training Row"
          sub="card 4417 · Mar 12, 10:00 · fraud"
          lit={asStoodAt}
          litOut={todayAt}
        />
        {/* Today's value: the future. */}
        <Flow
          points={[
            [tableRight - 120 + 3, chipMid + 16],
            [tableRight - 30, chipMid + 16],
            [tableRight - 30, rowMid(3)],
            [tableRight - 112, rowMid(3)],
          ]}
          at={todayAt}
          dur={20}
          color={ACCENT}
          dim={pitAt}
        />
        <Line at={futureAt} x={tableRight + 14} y={rowMid(3) - 15} size={22} color={ACCENT_INK} dim={pitAt}>
          Today&apos;s value: the future
        </Line>
        {/* The last value before the row's timestamp. */}
        <Flow
          points={[
            [tableRight - 120 + 3, chipMid - 16],
            [tableRight + 20, chipMid - 16],
            [tableRight + 20, rowMid(1)],
            [tableRight - 112, rowMid(1)],
          ]}
          at={lastAt}
          dur={20}
          color={OK}
        />
        <Line at={pitAt} x={tableRight + 60} y={rowMid(1) - 30} size={22} color={OK_INK}>
          Point-in-time lookup
        </Line>
        <Line at={lastAt + 6} x={tableRight + 60} y={rowMid(1) + 2} size={21} color={INK_SOFT}>
          the last value before 10:00 on Mar 12
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
