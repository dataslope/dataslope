import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BLIND, DELETE_DAY, IDEM } from "./data";
import { Drift, lineOf, Listing, listingHeight, Mark, MARK_OK, Mono, OK, OK_INK, Pill, pulse, X0 } from "./parts";

const SIZE = 23;
const LIST_W = 560;
const A_TOP = 390;
const B_TOP = 620;
const COUNT_X = 800;
const COUNT_GAP = 220;
const NOTE_X = 1310;

/** The day's count after one run: a label over the number COUNT(*) printed. */
const RunCount: React.FC<{ at: number; x: number; y: number; run: string; value: number; tone: "data" | "bad" | "ok"; lit?: number }> = ({
  at,
  x,
  y,
  run,
  value,
  tone,
  lit = 0,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  if (p <= 0) return null;
  const line = tone === "bad" ? ACCENT : tone === "ok" ? OK : BAR;
  const ink = tone === "bad" ? ACCENT_INK : tone === "ok" ? OK_INK : BLUE_INK;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 170, opacity: p, transform: `translateY(${(1 - p) * 10}px)` }}>
      <div style={{ ...label(20, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>{run}</div>
      <div
        style={{
          marginTop: 8,
          width: 120,
          height: 64,
          boxSizing: "border-box",
          border: `${2.5 + 2 * lit}px solid ${line}`,
          borderRadius: 10,
          background: `color-mix(in srgb, ${line} 12%, ${PAPER})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: MONO,
          fontSize: 40,
          fontWeight: 700,
          color: ink,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
};

/**
 * Question 2 (with Orchestration's "why is idempotency the foundation"). The
 * page's events table loads June 1 twice: a blind INSERT goes 8 then 16; the
 * page's delete-then-insert goes 8 then 8. Then why it matters, and the
 * transaction that keeps a failure between the two statements from leaving
 * the day empty (rolled back in DuckDB: still 8).
 */
export const IdemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("idem").from;
  const qAt = n.word("idem", "Question two");
  const textAt = n.word("idem", "What does it mean");
  const defAt = n.word("idem", "It means running it twice");
  const sameAt = n.word("idem", "the same final state");
  const tableAt = n.word("idem-blind", "the page's events table");
  const blindAt = n.word("idem-blind", "A blind insert loads June first");
  const eightAt = n.word("idem-blind", "eight events");
  const failAt = n.word("idem-blind", "The job fails after the write");
  const retryAt = n.word("idem-blind", "the scheduler retries");
  const againAt = n.word("idem-blind", "the insert runs again");
  const sixteenAt = n.word("idem-blind", "sixteen");
  const overAt = n.word("idem-over", "Overwrite the partition instead");
  const deleteAt = n.word("idem-over", "delete June first");
  const insertAt = n.word("idem-over", "then insert it");
  const onceAt = n.word("idem-over", "Run it once, eight");
  const twiceAt = n.word("idem-over", "Run it twice, still eight");
  const keyAt = n.word("idem-over", "Rows with a key take an upsert");
  const mergeAt = n.word("idem-over", "merge, or insert on conflict");
  const whyAt = n.word("idem-why", "That's why idempotency is the foundation");
  const repairAt = n.word("idem-why", "a retry or a backfill repairs a day");
  const autoAt = n.word("idem-why", "recovery can be automated");
  const wrapAt = n.word("idem-why", "Wrap the delete and the insert");
  const emptyAt = n.word("idem-why", "can't leave the day empty");
  const end = n.beat("idem-why").to;

  const blind = BLIND.split("\n");
  const del = DELETE_DAY.split("\n");
  const B_LINES = ["BEGIN TRANSACTION;", ...del, ...blind, "COMMIT;"];
  const aTop = y(A_TOP);
  const bTop = y(B_TOP);
  const bH = listingHeight(B_LINES.length, SIZE);
  const deleteLine = lineOf(B_LINES, "DELETE FROM events");
  const beginLine = lineOf(B_LINES, "BEGIN");
  const commitLine = lineOf(B_LINES, "COMMIT");
  // Listing B's statements ink in as they are named; BEGIN and COMMIT wait
  // for the transaction.
  const bLineAt = B_LINES.map((_, i) => (i === beginLine || i === commitLine ? wrapAt + 6 : i < deleteLine + del.length ? deleteAt + (i - deleteLine) * 4 : insertAt + (i - deleteLine - del.length) * 4));
  const countY = (top: number) => top + h(10);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={blindAt} level={-34} />
      <Sfx name="el-tap" at={eightAt} level={-30} />
      <Sfx name="el-scratch" at={failAt + 2} level={-31} />
      <Sfx name="el-tap" at={sixteenAt} level={-28} />
      <Sfx name="el-pencil" at={deleteAt} level={-34} />
      <Sfx name="el-tap" at={onceAt + 6} level={-30} />
      <Sfx name="el-tap" at={twiceAt + 8} level={-30} />
      <Sfx name="el-pencil" at={wrapAt + 6} level={-34} />
      <Sfx name="el-chime" at={emptyAt + 10} level={-32} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={2} at={qAt - 4} textAt={textAt - 4} size={58}>
          What does it mean for a pipeline to be idempotent, and why does it matter?
        </QuestionCard>
        <Note at={defAt} x={X0} y={y(296)}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
            Idempotent: run it twice, and it leaves <Mark at={sameAt}>the same final state</Mark> as running it once.
          </span>
        </Note>

        {/* A: the blind insert, run twice. */}
        <Note at={blindAt - 2} x={X0} y={aTop - 40}>
          <span style={{ ...label(22, INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            A blind insert, from <Mono>events_stage</Mono> <span style={{ color: INK_SOFT, fontWeight: 600 }}>(the page's 24 events)</span>
          </span>
        </Note>
        <Listing lines={blind} x={X0} top={aTop} width={LIST_W} size={SIZE} at={blindAt} dim={overAt} />
        <Note at={tableAt} x={COUNT_X} y={aTop - 40} dim={overAt}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>June 1's events, after each run</span>
        </Note>
        <RunCount at={eightAt - 2} x={COUNT_X} y={countY(aTop)} run="after run 1" value={IDEM.blind[0]} tone="data" />
        <RunCount at={sixteenAt - 2} x={COUNT_X + COUNT_GAP} y={countY(aTop)} run="after the retry" value={IDEM.blind[1]} tone="bad" lit={pulse(frame, sixteenAt + 8, 20)} />
        <Pill x={COUNT_X + 140} y={aTop + h(120)} at={failAt} tone="bad" size={20}>
          ✕ failed after the write
        </Pill>
        <Note at={retryAt} x={COUNT_X + 140} y={aTop + h(170)}>
          <span style={{ ...label(20, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            ↻ retried<span style={{ opacity: ease(frame, againAt, 10) }}>: the same insert, again</span>
          </span>
        </Note>

        {/* B: overwrite the partition, run twice; BEGIN and COMMIT come later. */}
        <Note at={overAt - 2} x={X0} y={bTop - 40}>
          <span style={{ ...label(22, INK), fontWeight: 700, whiteSpace: "nowrap" }}>Overwrite the partition, as the page does</span>
        </Note>
        <Listing
          lines={B_LINES}
          x={X0}
          top={bTop}
          width={LIST_W}
          size={SIZE}
          at={overAt}
          lineAt={bLineAt}
          marks={[
            { line: beginLine, at: wrapAt + 10, color: MARK_OK },
            { line: commitLine, at: wrapAt + 14, color: MARK_OK },
          ]}
        />
        <RunCount at={onceAt + 4} x={COUNT_X} y={countY(bTop) + h(40)} run="after run 1" value={IDEM.over[0]} tone="data" />
        <RunCount at={twiceAt + 6} x={COUNT_X + COUNT_GAP} y={countY(bTop) + h(40)} run="after run 2" value={IDEM.over[1]} tone="ok" lit={pulse(frame, twiceAt + 18, 20)} />
        <Note at={emptyAt} x={COUNT_X} y={bTop + bH - h(56)}>
          <span style={{ ...note(23, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            insert fails inside it: rolled back, June 1 still has {IDEM.rolledBack}
          </span>
        </Note>

        {/* Rows with a key. */}
        <Note at={keyAt} x={NOTE_X} y={bTop + h(30)}>
          <div style={{ ...note(25, INK), fontWeight: 650, whiteSpace: "nowrap" }}>Rows with a key: upsert</div>
          <div style={{ marginTop: 12, ...note(26, OK_INK), whiteSpace: "nowrap", opacity: ease(frame, mergeAt, 10) }}>
            <Mono>MERGE INTO …</Mono>
          </div>
          <div style={{ marginTop: 8, ...note(26, OK_INK), whiteSpace: "nowrap", opacity: ease(frame, mergeAt + 14, 10) }}>
            <Mono>INSERT … ON CONFLICT DO UPDATE</Mono>
          </div>
        </Note>

        {/* Why it matters. */}
        <Note at={whyAt} x={NOTE_X} y={aTop - 40}>
          <span style={{ ...label(22, OK_INK), fontWeight: 750, whiteSpace: "nowrap" }}>Why it's the foundation</span>
        </Note>
        <Note at={repairAt} x={NOTE_X} y={aTop + h(4)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            a retry or a backfill <b style={{ color: OK_INK }}>repairs</b> a day,
            <br />
            never duplicates it
          </span>
        </Note>
        <Note at={autoAt} x={NOTE_X} y={aTop + h(100)}>
          <span style={{ ...note(25, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>so recovery can be automated</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
