import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MOVE, TYPE2 } from "./data";
import { colsOf, DataTable, Drift, geoOf, lineOf, Listing, listingHeight, MARK_KEY, MARK_OK, OK_INK, TableName, X0 } from "./parts";

const TOP = 340;
const SIZE = 22;
const DIM_X = 950;
const ROWS = { headH: 42, rowH: 48, bodySize: 23, headSize: 20 } as const;

/**
 * Question 2. Left, the page's two statements, run with the dates the page's
 * table holds: the UPDATE that closes Boston (valid_to the day before the
 * move, is_current false), then the INSERT of Austin's version under a new
 * surrogate key. Right, customer 42's rows changing as each runs. Then the
 * page's point-in-time join, its two orders resolving to Boston and Austin,
 * all 24 orders matching one version each; then the load-time lookup that
 * stores the version's key on the fact, and today's row by its flag.
 */
export const Type2Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("type2").from;
  const qAt = n.word("type2", "Question two");
  const textAt = n.word("type2", "How does SCD");
  const twoAt = n.word("type2", "Two statements");
  const closeAt = n.word("type2", "close the current row");
  const endDateAt = n.word("type2", "its end date becomes");
  const beforeAt = n.word("type2", "the day before the move");
  const flagAt = n.word("type2", "its current flag goes false");
  const insertAt = n.word("type2-insert", "Then insert the new version");
  const keyAt = n.word("type2-insert", "a new surrogate key");
  const validAt = n.word("type2-insert", "valid from the day of the move");
  const futureAt = n.word("type2-insert", "a far future date");
  const currentAt = n.word("type2-insert", "flagged current");
  const findsAt = n.word("type2-join", "A fact finds its version by date");
  const betweenAt = n.word("type2-join", "the order date falls between");
  const allAt = n.word("type2-join", "All twenty-four");
  const oneAt = n.word("type2-join", "match exactly one version");
  const overlapAt = n.word("type2-join", "never overlap");
  const onceAt = n.word("type2-load", "that lookup runs once");
  const storesAt = n.word("type2-load", "the fact stores the key it found");
  const keepsAt = n.word("type2-load", "order one oh one keeps ten oh one");
  const todayAt = n.word("type2-load", "Today's view");
  const isCurrentAt = n.word("type2-load", "where is current is true");
  const end = n.beat("type2-load").to;

  // ── Left: close, then insert ──
  const C = TYPE2.close;
  const I = TYPE2.insert;
  const closeTop = y(TOP) + h(16);
  const insertTop = closeTop + listingHeight(C.lines.length, SIZE) + h(64);
  const listW = 780;
  const stmtOut = findsAt - 4;

  // ── Right: customer 42's rows ──
  const A = TYPE2.after;
  const B = TYPE2.before.rows[0];
  const col = (name: string) => A.cols.indexOf(name);
  const g = geoOf(A, DIM_X, y(TOP) + h(16), h, ROWS);

  // ── Then: the page's join, and the key stored at load ──
  const P = TYPE2.pit;
  const pCity = P.cols.indexOf("city");
  const joinTop = y(TOP) + h(16);
  const resultTop = g.rowTop(2) + h(70);
  const gp = geoOf(P, DIM_X, resultTop, h, ROWS);
  const L = TYPE2.load;
  const gl = geoOf(L, DIM_X, resultTop, h, ROWS);
  const lKey = L.cols.indexOf("customer_key");

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={closeAt + 2} level={-36} />
      <Sfx name="el-tap" at={beforeAt + 4} level={-35} />
      <Sfx name="el-tap" at={flagAt + 6} level={-35} />
      <Sfx name="el-pencil" at={insertAt + 2} level={-36} />
      <Sfx name="el-tap" at={keyAt + 4} level={-35} />
      <Sfx name="el-whoosh" at={findsAt - 2} level={-37} />
      <Sfx name="el-pop" at={allAt + 4} level={-34} />
      <Sfx name="el-tap" at={keepsAt + 6} level={-35} />
      <Sfx name="el-pop" at={isCurrentAt} level={-35} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={2} at={qAt - 4} textAt={textAt - 4} size={60}>
          How does SCD Type 2 work in practice?
        </QuestionCard>

        {/* ── Left: the two statements ── */}
        <Listing
          lines={C.lines}
          x={X0}
          top={closeTop}
          width={listW}
          size={SIZE}
          at={twoAt + 4}
          out={stmtOut}
          title={<span>1. close the current row</span>}
          marks={[
            { line: lineOf(C.lines, "SET valid_to"), at: endDateAt + 2, out: insertAt },
            { line: lineOf(C.lines, "is_current = false"), at: flagAt + 2, out: insertAt },
          ]}
        />
        <Listing
          lines={I.lines}
          x={X0}
          top={insertTop}
          width={listW}
          size={SIZE}
          at={insertAt - 2}
          out={stmtOut}
          title={<span>2. insert the new version</span>}
          marks={[{ line: lineOf(I.lines, "(1087"), at: keyAt + 2, out: findsAt, color: MARK_KEY }]}
        />

        {/* ── Right: customer 42 ── */}
        <TableName g={g} at={twoAt}>
          dim_customer, customer <Num>42</Num>
        </TableName>
        <DataTable
          g={g}
          cols={colsOf(A, { customer_key: { ink: INK } })}
          at={twoAt}
          rows={[
            { cells: B, at: twoAt + 4 },
            { cells: A.rows[1], at: insertAt + 10, grow: true },
          ]}
          swaps={[
            { row: 0, col: col("valid_to"), at: beforeAt + 4, value: A.rows[0][col("valid_to")] },
            { row: 0, col: col("is_current"), at: flagAt + 6, value: A.rows[0][col("is_current")] },
          ]}
          marks={[
            { row: 0, col: col("valid_to"), at: endDateAt, out: insertAt },
            { row: 0, col: col("is_current"), at: flagAt + 2, out: insertAt },
            { row: 1, col: col("customer_key"), at: keyAt + 4, out: findsAt, color: MARK_KEY },
            { row: 1, col: col("valid_from"), at: validAt + 4, out: findsAt },
            { row: 1, col: col("valid_to"), at: futureAt + 2, out: findsAt },
            { row: 1, col: col("is_current"), at: currentAt, out: findsAt },
            // The boundary: Boston ends the day before Austin starts.
            { row: 0, col: col("valid_to"), at: overlapAt, out: onceAt, color: MARK_OK },
            { row: 1, col: col("valid_from"), at: overlapAt + 4, out: onceAt, color: MARK_OK },
            // Today's row, by its flag.
            { row: 1, col: col("is_current"), at: isCurrentAt + 2, color: MARK_OK },
          ]}
          bands={[{ row: 1, at: isCurrentAt + 4, color: `color-mix(in srgb, ${OK_INK} 10%, transparent)` }]}
        />
        <Note at={overlapAt + 6} x={X0} y={joinTop + listingHeight(P.lines.length, SIZE) + h(80)} out={onceAt}>
          <span style={{ ...note(22, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            {MOVE.bostonTo}, then {MOVE.austinFrom}: no overlap, no gap
          </span>
        </Note>

        {/* ── Left, then: the page's point-in-time join ── */}
        <Listing
          lines={P.lines}
          x={X0}
          top={joinTop}
          width={listW}
          size={SIZE}
          at={findsAt}
          title={<span>the page&rsquo;s point-in-time join</span>}
          marks={[
            { line: lineOf(P.lines, "BETWEEN"), at: betweenAt + 2 },
            { line: lineOf(P.lines, "WHERE"), at: findsAt + 10, out: allAt },
          ]}
        />
        <TableName g={gp} at={findsAt + 6} out={onceAt}>
          her two orders
        </TableName>
        <DataTable
          g={gp}
          cols={colsOf(P)}
          at={findsAt + 6}
          out={onceAt}
          rows={[
            { cells: P.rows[0], at: betweenAt + 6 },
            { cells: P.rows[1], at: betweenAt + 12 },
          ]}
          marks={[
            { row: 0, col: pCity, at: betweenAt + 14, color: MARK_OK },
            { row: 1, col: pCity, at: betweenAt + 18, color: MARK_OK },
          ]}
        />
        <Note at={allAt} x={X0} y={joinTop + listingHeight(P.lines.length, SIZE) + h(28)} out={onceAt}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            All <b><Num>{TYPE2.orders}</Num></b> of the page&rsquo;s orders:{" "}
            <b style={{ color: OK_INK, opacity: ease(frame, oneAt, 10) }}>
              <Num>{TYPE2.matched}</Num> rows, one version each
            </b>
          </span>
        </Note>

        {/* ── Right, last: the key stored at load ── */}
        <TableName g={gl} at={onceAt + 6}>
          stored on the fact at load time
        </TableName>
        <DataTable
          g={gl}
          cols={colsOf(L, { customer_key: { ink: INK } })}
          at={onceAt + 6}
          rows={[
            { cells: L.rows[0], at: storesAt },
            { cells: L.rows[1], at: storesAt + 4 },
          ]}
          marks={[
            { row: 0, col: lKey, at: keepsAt + 6, color: MARK_KEY },
            { row: 1, col: lKey, at: keepsAt + 12, color: MARK_KEY },
          ]}
        />
        <Note at={onceAt + 2} x={X0} y={joinTop + listingHeight(P.lines.length, SIZE) + h(28)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            runs once, at load: the fact keeps <b>customer_key</b>
          </span>
        </Note>
        <Note at={todayAt} x={X0} y={joinTop + listingHeight(P.lines.length, SIZE) + h(86)}>
          <span style={{ ...note(25, INK_SOFT), whiteSpace: "nowrap" }}>
            today&rsquo;s view:{" "}
            <span style={{ color: OK_INK, opacity: ease(frame, isCurrentAt, 10) }}>
              <QMono>WHERE is_current</QMono>
            </span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
