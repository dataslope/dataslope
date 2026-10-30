import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK, INK_SOFT, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { SNAP } from "./data";
import { colsOf, DataTable, Drift, geoOf, KeyArrow, lineOf, Listing, listingHeight, MARK, MARK_OK, OK_INK, TableName, X0 } from "./parts";

const TOP = 330;
const SNAP_X = 1130;
const SIZE = 19;
const ROWS = { headH: 38, rowH: 42, bodySize: 21, headSize: 19 } as const;

/**
 * Question 6, on the video's own two orders. Left, the insert-only log: six
 * rows, every status change. Right, the snapshot: one row per order, its
 * state now, where 502 says cancelled and nothing says it was paid. Then the
 * log answers that (502, paid then cancelled), and rebuilds the snapshot by
 * keeping the latest row per order (arrows from those rows); the snapshot
 * cannot rebuild the log. Then the advice: keep the log, serve the snapshot.
 */
export const SnapScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("snap").from;
  const qAt = n.word("snap", "Question six");
  const textAt = n.word("snap", "What is a snapshot versus");
  const insertOnlyAt = n.word("snap", "Insert-only appends a row for every change");
  const sixAt = n.word("snap", "six rows for two orders");
  const wholeAt = n.word("snap", "the whole history");
  const oneAt = n.word("snap-one", "A snapshot keeps one row per order");
  const nowAt = n.word("snap-one", "its state now");
  const easyAt = n.word("snap-one", "easy to query");
  const cancelledAt = n.word("snap-one", "just says cancelled");
  const paidAt = n.word("snap-one", "Nothing says it was paid first");
  const answerAt = n.word("snap-log", "The log can answer that");
  const thenAt = n.word("snap-log", "five oh two was paid, then cancelled");
  const rebuildAt = n.word("snap-log", "it can rebuild the snapshot");
  const latestAt = n.word("snap-log", "keeping the latest row per order");
  const cantAt = n.word("snap-log", "The snapshot can't rebuild the log");
  const auditAt = n.word("snap-end", "when history has to be auditable");
  const keepAt = n.word("snap-end", "keep the insert-only log as the record");
  const serveAt = n.word("snap-end", "serve the snapshot from it");
  const end = n.beat("snap-end").to;

  const LOG = SNAP.log;
  const gl = geoOf(LOG, X0, y(TOP) + h(40), h, ROWS);
  const status = LOG.cols.indexOf("status");
  const rowOf = (id: string, st: string) => LOG.rows.findIndex((r) => r[0] === id && r[status] === st);
  const paid502 = rowOf("502", "paid");
  const latest = SNAP.snapshotRows.rows.map((r) => rowOf(r[0], r[1]));

  const SR = SNAP.snapshotRows;
  const gs = geoOf(SR, SNAP_X, y(TOP) + h(40), h, ROWS);
  const s502 = SR.rows.findIndex((r) => r[0] === "502");

  const Q = SNAP.paidThenCancelled;
  const qTop = gl.rowTop(LOG.rows.length) + h(66);
  const qW = 560;
  const S = SNAP.snapshot;
  const sTop = gs.rowTop(SR.rows.length) + h(74);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={insertOnlyAt + 4} level={-36} />
      <Sfx name="el-tap" at={oneAt + 4} level={-35} />
      <Sfx name="el-scratch" at={paidAt + 2} level={-35} />
      <Sfx name="el-pencil" at={answerAt + 2} level={-36} />
      <Sfx name="el-pop" at={thenAt + 4} level={-35} />
      <Sfx name="el-whoosh" at={latestAt} level={-37} />
      <Sfx name="el-chime" at={keepAt} level={-37} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is a snapshot vs insert-only fact table strategy?
        </QuestionCard>

        {/* ── Left: the insert-only log ── */}
        <TableName g={gl} at={insertOnlyAt - 2}>
          order_events: insert-only
        </TableName>
        <DataTable
          g={gl}
          cols={colsOf(LOG)}
          at={insertOnlyAt - 2}
          rows={LOG.rows.map((cells, i) => ({ cells, at: insertOnlyAt + 2 + i * 3 }))}
          marks={[
            { row: paid502, col: status, at: paidAt + 4, out: answerAt, color: MARK },
            { row: paid502, col: status, at: thenAt + 2, color: MARK_OK },
            { row: rowOf("502", "cancelled"), col: status, at: thenAt + 8, color: MARK_OK },
          ]}
        />
        <Note at={sixAt} x={gl.right + 24} y={gl.rowTop(0) + h(4)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <b><Num>{SNAP.logRows}</Num> rows</b> for <Num>{SR.rows.length}</Num> orders
            <span style={{ color: INK_SOFT, opacity: ease(frame, wholeAt, 10) }}>
              <br />
              the whole history
            </span>
          </span>
        </Note>

        {/* ── Right: the snapshot ── */}
        <TableName g={gs} at={oneAt}>
          order_snapshot
        </TableName>
        <DataTable
          g={gs}
          cols={colsOf(SR)}
          at={oneAt}
          rows={SR.rows.map((cells, i) => ({ cells, at: nowAt + i * 4 }))}
          marks={[{ row: s502, col: 1, at: cancelledAt + 2, out: thenAt }]}
        />
        <Note at={easyAt} x={gs.right + 28} y={gs.rowTop(0) + h(2)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>one row per order: easy</span>
        </Note>
        <Note at={paidAt} x={gs.right + 28} y={gs.rowTop(s502) + h(6)}>
          <span style={{ ...note(23, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>paid first? not here</span>
        </Note>

        {/* The log answers, with the page's own kind of query. */}
        <Listing
          lines={Q.lines}
          x={X0}
          top={qTop}
          width={qW}
          size={SIZE}
          at={answerAt}
          title="only the log can answer"
          marks={[{ line: lineOf(Q.lines, "HAVING"), at: answerAt + 12 }]}
        />
        <Note at={thenAt} x={X0 + qW + 24} y={qTop + h(8)}>
          <span style={{ ...note(26, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            → <Num>502</Num>
          </span>
        </Note>

        {/* The log rebuilds the snapshot: its latest row per order. */}
        <Listing
          lines={S.lines}
          x={SNAP_X + 20}
          top={sTop}
          width={660}
          size={SIZE}
          at={rebuildAt}
          title="the log rebuilds the snapshot"
          marks={[{ line: lineOf(S.lines, "QUALIFY"), at: latestAt + 2 }]}
        />
        {latest.map((r, i) => (
          <KeyArrow key={i} from={[gl.right + 8, gl.rowMid(r)]} to={[gs.x - 10, gs.rowMid(i)]} at={latestAt + 4 + i * 6} color={OK_INK} />
        ))}
        <Note at={cantAt} x={SNAP_X + 20} y={sTop + listingHeight(S.lines.length, SIZE) + h(24)}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>the snapshot can&rsquo;t rebuild the log</span>
        </Note>

        {/* The advice. */}
        <Note at={auditAt} x={SNAP_X + 20} y={sTop + listingHeight(S.lines.length, SIZE) + h(80)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            history must be auditable?
            <br />
            <span style={{ color: OK_INK, fontWeight: 700, opacity: ease(frame, keepAt, 10) }}>keep the log</span>
            <span style={{ opacity: ease(frame, serveAt, 10) }}>, serve the snapshot from it</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
