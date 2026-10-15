import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, headline, HIGHLIGHT, INK, INK_SOFT } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import {
  FILTER_LINE,
  ILLUSTRATIONS,
  JOIN_LINE,
  SQL_LINES,
  TEST_FALSE,
  TEST_NULL,
  TEST_TRUE,
  TESTED,
  VANISHED,
  VIDEO,
  WHERE,
} from "./data";
import {
  type CellMark,
  Fig,
  insertOpen,
  joinCols,
  KEPT_INK,
  KEPT_WASH,
  Listing,
  listingHeight,
  LOST,
  LOST_INK,
  Mono,
  NULL_INK,
  noteText,
  rowCount,
  STAGE,
  Table,
  tableRows,
} from "./kit";

/**
 * Filter, vanish, why and inner: the same join with `WHERE o.amount > 50`.
 * The table shows what WHERE tests on each row; the false rows go as they
 * should, the NULL rows go by mistake, and what is left is exactly what an
 * inner join returns.
 */
export const WhereScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();
  const start = n.beat("filter").from;
  /** Everything carried over from Fig. 2 is already printed when the cut lands. */
  const pre = start - 40;
  const overAt = n.word("filter", "over fifty");
  const whereAt = n.word("filter", "WHERE clause");
  const keepAt = n.word("vanish", "keep one order each");
  const eachAt = n.word("vanish", "one order each");
  const goneAt = n.word("vanish", "Linus and Mae");
  const vanishedAt = n.word("vanish", "vanished");
  const amountAt = n.word("why", "Their amount");
  const gtAt = n.word("why", "greater than fifty");
  const notTrueAt = n.word("why", "not true");
  const whereKeepsAt = n.word("why", "WHERE keeps");
  const trueAt = n.word("why", "condition is true");
  const leftAt = n.word("inner", "LEFT JOIN");
  const exactlyAt = n.word("inner", "exactly");
  const innerAt = n.word("inner", "inner join");

  const top = y(STAGE.top);
  const lines = SQL_LINES.where;
  const insert = { line: FILTER_LINE, at: overAt - 2 };
  const listBottom = top + listingHeight(lines.length, STAGE.codeSize, insertOpen(frame, insert));

  // The WHERE test opens as its own column, then closes with the rows it
  // failed, leaving the two rows the query returns.
  const testAt = whereAt + 6;
  const collapseAt = exactlyAt;
  const testCol = ease(frame, testAt - 4, 14) * (1 - ease(frame, collapseAt, 14));
  const rowScale = TESTED.rows.map((_, i) => (TEST_TRUE.includes(i) ? 1 : 1 - ease(frame, collapseAt + 4, 16)));
  const full = tableRows(top, STAGE.tableSize, TESTED.rows.map(() => 1));
  const out = collapseAt - 2;
  const ring = (row: number, col: number, at: number, color?: string): CellMark => ({ row, col, at, out, ring: true, color });
  const sieve = pop(frame, whereKeepsAt - 4, fps, 16);

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 116, top: y(104), display: "flex", gap: "0.26em", ...headline(56) }}>
        <Ink at={start - 14} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
          Add a <Mono weight={600}>WHERE</Mono>,
        </Ink>
        <Ink
          at={goneAt - 2}
          dur={18}
          style={{ position: "relative", ...headline(56, true), color: LOST_INK, whiteSpace: "nowrap" }}
        >
          and two customers vanish.
        </Ink>
      </div>
      <Fig n="3" at={start - 8} x={STAGE.listX} y={y(196)}>
        The same join, filtered on the order amount
      </Fig>

      <Listing
        lines={lines}
        x={STAGE.listX}
        top={top}
        width={STAGE.listW}
        size={STAGE.codeSize}
        at={pre}
        lineAt={lines.map((_, i) => (i === FILTER_LINE ? overAt + 8 : pre))}
        insert={insert}
        marks={[{ line: FILTER_LINE, at: whereAt, color: HIGHLIGHT }]}
        strikes={[{ line: JOIN_LINE, start: 0, chars: 4, at: leftAt }]}
      />

      <Table
        x={STAGE.tableX}
        top={top}
        size={STAGE.tableSize}
        at={pre}
        cols={joinCols(TESTED.fields)}
        rows={TESTED.rows}
        rowAt={TESTED.rows.map(() => pre)}
        colAt={[undefined, undefined, undefined, testAt]}
        cellAt={(ri, ci) => (ci === 3 ? testAt + 4 + ri * 3 : undefined)}
        colScale={[1, 1, 1, testCol]}
        rowScale={rowScale}
        marks={[
          ...TEST_TRUE.map((row, k) => ({ row, at: keepAt + k * 4, out, color: KEPT_WASH })),
          ...TEST_NULL.map((row, k) => ring(row, 2, amountAt + k * 4)),
          ...TEST_NULL.map((row, k) => ring(row, 3, gtAt + k * 4)),
          ...TEST_TRUE.map((row, k) => ring(row, 3, trueAt + k * 4, KEPT_INK)),
        ]}
        strikes={[
          ...TEST_FALSE.map((row, k) => ({ row, at: eachAt + 4 + k * 4, color: INK_SOFT, weight: 2 })),
          ...TEST_NULL.map((row, k) => ({ row, at: goneAt + k * 5, color: LOST, weight: 4, dim: 0.3 })),
        ]}
        footer={{ text: rowCount(WHERE.rows.length), at: collapseAt + 16 }}
      />
      {/* Under the struck rows, while they are still on the page. */}
      <Note at={vanishedAt - 2} out={collapseAt} x={STAGE.tableX + 14} y={full.bottom + h(14)} from="up">
        <span style={{ ...body(32, true), color: LOST_INK }}>{VANISHED.join(" and ")} vanished.</span>
      </Note>

      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="ljt-sieve"
          style={{
            position: "absolute",
            left: 1530,
            top: full.bottom + h(56),
            width: 210,
            height: 210,
            opacity: sieve,
            transformOrigin: "50% 40%",
            transform: `translateY(${bob(frame, 4, 100) + (1 - sieve) * 26}px) rotate(${(1 - sieve) * -14 + Math.sin(frame / 36) * 1.5}deg)`,
          }}
        />
      ) : null}

      <div style={{ position: "absolute", left: STAGE.listX, top: listBottom + h(44), display: "flex", flexDirection: "column", gap: 14 }}>
        <Ink at={notTrueAt - 2} dur={14} style={{ position: "relative" }}>
          <span style={noteText(24, INK)}>
            <Mono color={NULL_INK} weight={700}>NULL</Mono> <Mono>&gt; 50</Mono> is <Mono color={NULL_INK} weight={700}>NULL</Mono>: unknown, not true.
          </span>
        </Ink>
        <Ink at={whereKeepsAt - 2} dur={14} style={{ position: "relative" }}>
          <span style={noteText(24, INK)}>
            <Mono>WHERE</Mono> keeps a row only when its test is <span style={{ color: KEPT_INK, fontWeight: 600 }}>true</span>.
          </span>
        </Ink>
        <Ink at={innerAt - 2} dur={14} style={{ position: "relative" }}>
          <span style={noteText(24)}>
            A plain <Mono>JOIN</Mono> with this <Mono>WHERE</Mono> returns the same {WHERE.rows.length} rows.
          </span>
        </Ink>
      </div>
    </AbsoluteFill>
  );
};
