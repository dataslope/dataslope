import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { Arrow, Chip, Disk, Drift, OK, OK_INK, Svg } from "./parts";

const COLS = [
  { x: 150, name: "read" },
  { x: 470, name: "filter" },
  { x: 790, name: "map" },
  { x: 1110, name: "reduceByKey" },
];
const BW = 200;
const BH = 50;
const ROWS = [382, 452, 522];
const LOST = 1;
const RDD_X = 1420;
const ACT_Y = [704, 804];

/**
 * Questions 13 and 14. A lineage of four steps (read, filter, map,
 * reduceByKey) over three partitions: the steps are what Spark keeps, not
 * the data. One executor dies and map's middle partition is lost; Spark
 * replays read, filter and map for that partition alone; a checkpoint cuts
 * the chain. Then caching: the filtered table kept in memory, and two
 * actions that read the source twice without it and once with it.
 */
export const LineageScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("lineage").from;
  const qAt = n.word("lineage", "Question thirteen");
  const textAt = n.word("lineage", "How does Spark achieve fault tolerance");
  const lineageAt = n.word("lineage", "Through lineage");
  const rddAt = n.word("lineage", "the resilient in RDD");
  const expandAt = n.word("lineage", "a resilient distributed dataset");
  const stepsAt = n.word("lineage", "records the steps that produced it");
  const notDataAt = n.word("lineage", "not the data");
  const diesAt = n.word("lineage-lost", "When an executor dies");
  const lostAt = n.word("lineage-lost", "a partition is lost");
  const replayAt = n.word("lineage-lost", "replays those steps");
  const aloneAt = n.word("lineage-lost", "for that partition alone");
  const restartAt = n.word("lineage-lost", "instead of restarting the job");
  const ckptAt = n.word("lineage-lost", "Checkpointing cuts a very long lineage short");
  const savingAt = n.word("lineage-lost", "saving a copy to reliable storage");
  const q14At = n.word("cache", "Question fourteen");
  const text14At = n.word("cache", "What does caching or persisting do");
  const keepsAt = n.word("cache", "keeps a DataFrame's computed partitions in memory");
  const reusesAt = n.word("cache", "the next action reuses them");
  const replayingAt = n.word("cache", "instead of replaying the lineage");
  const twoAt = n.word("cache-when", "Two actions on one filtered table");
  const twiceAt = n.word("cache-when", "read the source twice without a cache");
  const onceAt = n.word("cache-when", "and once with one");
  const paysAt = n.word("cache-when", "It pays when a result feeds several actions");
  const iterAt = n.word("cache-when", "like an iterative algorithm");
  const onceUsedAt = n.word("cache-when", "Used once, it wastes memory");
  const lazyAt = n.word("cache-when", "caching is lazy");
  const firstAt = n.word("cache-when", "it fills on the first action");
  const end = n.beat("cache-when").to;

  const top = (r: number) => y(ROWS[r]);
  const bh = h(BH);
  const mid = (r: number) => top(r) + bh / 2;
  const reset = ease(frame, q14At - 6, 12);
  const dataGone = ease(frame, notDataAt, 14) * (1 - ease(frame, keepsAt, 14));
  const lost = ease(frame, lostAt, 10) * (1 - ease(frame, replayAt + 34, 12));
  const replay = (c: number) => ease(frame, replayAt + 4 + c * 8, 10) * (1 - reset);
  const ckpt = ease(frame, ckptAt, 12) * (1 - reset);
  const cached = ease(frame, keepsAt, 12);
  const stepsMark = ease(frame, stepsAt, 12) * (1 - ease(frame, diesAt, 12));

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={lineageAt + 2} level={-37} />
      <Sfx name="el-pencil" at={stepsAt} level={-37} />
      <Sfx name="el-scratch" at={lostAt + 2} level={-35} />
      <Sfx name="el-tap" at={replayAt + 4} level={-36} />
      <Sfx name="el-tap" at={replayAt + 12} level={-36} />
      <Sfx name="el-tap" at={replayAt + 20} level={-36} />
      <Sfx name="el-pop" at={ckptAt + 4} level={-36} />
      <Sfx name="el-pop" at={keepsAt + 4} level={-36} />
      <Sfx name="el-tap" at={twiceAt + 4} level={-36} />
      <Sfx name="el-chime" at={onceAt + 4} level={-36} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={13} at={qAt - 4} textAt={textAt - 4} size={60} out={q14At - 6}>
          How does Spark achieve fault tolerance?
        </QuestionCard>
        <QuestionCard n={14} at={q14At - 2} textAt={text14At - 2} size={58}>
          What does caching or persisting do, and when is it worth it?
        </QuestionCard>

        {/* ── The lineage: four steps, three partitions ── */}
        {COLS.map((c, k) => (
          <Note key={c.name} at={lineageAt + k * 4} x={c.x} y={y(326)}>
            <span style={{ position: "relative", display: "inline-block" }}>
              {stepsMark > 0 ? <span style={{ position: "absolute", inset: "-4px -8px", background: HIGHLIGHT, borderRadius: 6, opacity: stepsMark }} /> : null}
              <span style={{ position: "relative" }}>
                <Chip mono size={22} color={k === 1 && cached > 0 ? OK : BAR} ink={k === 1 && cached > 0 ? OK_INK : INK}>
                  {c.name}
                </Chip>
              </span>
            </span>
          </Note>
        ))}
        <Svg>
          {COLS.slice(0, -1).map((c, k) =>
            ROWS.map((_, r) => {
              const p = ease(frame, lineageAt + 4 + k * 4, 12);
              const x1 = c.x + BW + 6;
              const x2 = COLS[k + 1].x - 8;
              if (k < 2) {
                const cut = k === 0 ? 1 - 0.75 * ckpt : 1;
                const hot = r === LOST && replay(k + 1) > 0;
                return (
                  <line key={`${k}-${r}`} x1={x1} y1={mid(r)} x2={x1 + (x2 - x1) * p} y2={mid(r)} stroke={hot ? ds("yellow", 600) : INK_SOFT} strokeWidth={hot ? 4 : 1.8} opacity={cut} />
                );
              }
              return ROWS.map((__, r2) => (
                <line key={`${k}-${r}-${r2}`} x1={x1} y1={mid(r)} x2={x1 + (x2 - x1) * p} y2={mid(r) + (mid(r2) - mid(r)) * p} stroke={INK_SOFT} strokeWidth={1.2} opacity={0.7} />
              ));
            }),
          )}
        </Svg>
        {COLS.map((c, k) =>
          ROWS.map((_, r) => {
            const p = ease(frame, lineageAt + 2 + k * 4 + r * 2, 10);
            const isLost = k === 2 && r === LOST;
            const isReplay = r === LOST && k <= 2 && replay(k) > 0;
            const fill = isLost ? 1 - lost : 1 - dataGone * 0.85;
            const keep = k === 1 ? cached : 0;
            const dimRead = k === 0 ? 1 - 0.6 * ckpt : 1;
            return (
              <div
                key={`${k}-${r}`}
                style={{
                  position: "absolute",
                  left: c.x,
                  top: top(r),
                  width: BW * p,
                  height: bh,
                  boxSizing: "border-box",
                  borderRadius: 4,
                  background: isReplay ? `color-mix(in srgb, ${ds("yellow", 400)} 55%, ${PAPER})` : `color-mix(in srgb, ${BAR} ${36 * fill}%, ${PAPER})`,
                  border: isLost && lost > 0.5 ? `2.4px dashed ${ACCENT}` : keep > 0.5 ? `2.4px solid ${OK}` : `1.6px solid color-mix(in srgb, ${BAR} 70%, ${PAPER})`,
                  opacity: dimRead,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  ...label(19, isLost && lost > 0.5 ? ACCENT_INK : INK_SOFT),
                  whiteSpace: "nowrap",
                }}
              >
                {isLost && lost > 0.5 ? "lost" : keep > 0.5 ? "in memory" : `part ${r + 1}`}
              </div>
            );
          }),
        )}

        {/* What RDD stands for, and what lineage keeps. */}
        <Note at={rddAt - 2} x={RDD_X} y={y(370)}>
          <span style={{ ...note(30, INK), fontWeight: 700, whiteSpace: "nowrap" }}>RDD</span>
        </Note>
        <Note at={expandAt - 2} x={RDD_X} y={y(414)}>
          <span style={{ ...note(24, INK), display: "block", lineHeight: 1.3, whiteSpace: "nowrap" }}>
            <span style={{ background: HIGHLIGHT, padding: "0 4px", borderRadius: 4 }}>resilient</span>
            <br />
            distributed dataset
          </span>
        </Note>
        <Note at={stepsAt} x={RDD_X} y={y(500)} out={diesAt}>
          <span style={{ ...note(24, BLUE_INK), fontWeight: 650, display: "block", lineHeight: 1.3, whiteSpace: "nowrap" }}>
            keeps the steps
            <br />
            <span style={{ opacity: ease(frame, notDataAt, 10), color: INK_SOFT, fontWeight: 500 }}>not the data</span>
          </span>
        </Note>

        {/* An executor dies. */}
        <Note at={diesAt} x={RDD_X} y={y(500)} out={q14At - 6}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 650, display: "block", lineHeight: 1.3, whiteSpace: "nowrap" }}>
            an executor dies
            <br />
            <span style={{ opacity: ease(frame, aloneAt, 10), color: INK }}>replay that partition alone</span>
          </span>
        </Note>
        <Note at={restartAt - 2} x={RDD_X} y={y(574)} out={q14At - 6}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>not the whole job</span>
        </Note>
        {/* A checkpoint under filter: the chain before it is no longer needed. */}
        <Disk x={COLS[1].x + BW / 2 - 28} top={y(ROWS[2]) + bh + h(30)} at={ckptAt + 2} out={q14At - 6} />
        <Arrow from={[COLS[1].x + BW / 2, y(ROWS[2]) + bh + 4]} to={[COLS[1].x + BW / 2, y(ROWS[2]) + bh + h(28)]} at={savingAt} dur={8} width={1.8} head={9} out={q14At - 6} />
        <Note at={savingAt - 2} x={COLS[1].x + BW / 2 + 40} y={y(ROWS[2]) + bh + h(34)} out={q14At - 6}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>checkpoint: a copy in reliable storage</span>
        </Note>

        {/* ── Caching ── */}
        <Note at={keepsAt + 4} x={COLS[1].x} y={y(ROWS[2]) + bh + h(16)}>
          <span style={{ ...note(22, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            <span style={{ fontFamily: MONO, fontSize: 21 }}>.cache()</span>
            <span style={{ opacity: ease(frame, reusesAt, 10) }}>: the next action starts here</span>
          </span>
        </Note>
        <Note at={replayingAt} x={COLS[0].x} y={y(ROWS[2]) + bh + h(16)} out={twoAt}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>no replay</span>
        </Note>
        <CacheRow
          label="without a cache"
          top={y(ACT_Y[0])}
          at={twoAt}
          countAt={twiceAt}
          reads={2}
          cached={false}
          color={ACCENT_INK}
          h={h}
        />
        <CacheRow label="with one" top={y(ACT_Y[1])} at={onceAt - 6} countAt={onceAt} reads={1} cached color={OK_INK} h={h} />
        <Note at={paysAt - 2} x={RDD_X} y={y(680)}>
          <span style={{ ...note(23, OK_INK), fontWeight: 650, display: "block", lineHeight: 1.3, whiteSpace: "nowrap" }}>
            pays: several actions
            <br />
            <span style={{ opacity: ease(frame, iterAt, 10) }}>an iterative algorithm</span>
          </span>
        </Note>
        <Note at={onceUsedAt - 2} x={RDD_X} y={y(764)}>
          <span style={{ ...note(23, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>used once: wasted memory</span>
        </Note>
        <Note at={lazyAt - 2} x={RDD_X} y={y(808)}>
          <span style={{ ...note(23, INK), display: "block", lineHeight: 1.3, whiteSpace: "nowrap" }}>
            lazy too:
            <span style={{ opacity: ease(frame, firstAt, 10) }}> fills on the</span>
            <br />
            <span style={{ opacity: ease(frame, firstAt, 10) }}>first action</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};

/** Two actions on the filtered table: each runs from the source (no cache),
 *  or both start from the cached copy (with one). */
const CacheRow: React.FC<{
  label: string;
  top: number;
  at: number;
  countAt: number;
  reads: number;
  cached: boolean;
  color: string;
  h: (v: number) => number;
}> = ({ label: name, top, at, countAt, reads, cached, color, h }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  if (p <= 0) return null;
  const step = (text: string, x: number, c: string, k = 0) => (
    <div
      style={{
        position: "absolute",
        left: x,
        top: top + k * h(38),
        height: h(30),
        padding: "0 10px",
        display: "flex",
        alignItems: "center",
        borderRadius: 5,
        background: `color-mix(in srgb, ${c} 14%, ${PAPER})`,
        border: `1.5px solid color-mix(in srgb, ${c} 60%, ${PAPER})`,
        ...label(19, INK),
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
  const arrow = (x1: number, x2: number, k = 0) => {
    const yy = top + k * h(38) + h(15);
    return <Arrow key={`${x1}-${k}`} from={[x1, yy]} to={[x2, yy]} at={at + 4} dur={8} width={1.6} head={9} />;
  };
  return (
    <div style={{ position: "absolute", inset: 0, opacity: p }}>
      <div style={{ position: "absolute", left: 150, top: top + h(4), ...label(21, INK), whiteSpace: "nowrap" }}>{name}</div>
      {cached ? (
        <>
          {step("read", 380, BAR)}
          {arrow(446, 480)}
          {step("filter", 486, BAR)}
          {arrow(562, 596)}
          {step("in memory", 602, OK)}
          {arrow(722, 790, 0)}
          {step("count()", 796, BAR, 0)}
          {arrow(722, 790, 1)}
          {step("write", 796, BAR, 1)}
        </>
      ) : (
        <>
          {[0, 1].map((k) => (
            <React.Fragment key={k}>
              {step("read", 380, BAR, k)}
              {arrow(446, 480, k)}
              {step("filter", 486, BAR, k)}
              {arrow(562, 790, k)}
              {step(k === 0 ? "count()" : "write", 796, BAR, k)}
            </React.Fragment>
          ))}
        </>
      )}
      <div style={{ position: "absolute", left: 960, top: top + h(4), ...note(24, color), fontWeight: 700, whiteSpace: "nowrap", opacity: ease(frame, countAt, 10) }}>
        source read {reads === 2 ? "twice" : "once"}
      </div>
    </div>
  );
};
