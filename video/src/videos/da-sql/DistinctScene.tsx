import React from "react";
import { AbsoluteFill } from "remotion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { INK, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { DISTINCT } from "./data";
import {
  DataTable,
  Drift,
  Listing,
  listingHeight,
  Mark,
  MARK_BAD,
  MARK_OK,
  Mono,
  TableName,
  tableGeometry,
  X0,
} from "./parts";

const TOP = 340;
const HEAD_H = 48;
const ROW_H = 54;
const JOINED_X = 480;
const LIST_X = 960;
const LIST_W = 720;

/**
 * Question 8, DISTINCT hiding a bug: three orders, two of them 50.00. Joined
 * to their items they are five rows; DISTINCT makes them three again, and
 * SUM(DISTINCT amount) counts the two fifties once, 150.00 against a real
 * total of 200.00.
 */
export const DistinctScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("distinct").from;
  const qAt = n.word("distinct", "Question");
  const textAt = n.word("distinct", "When should");
  const threeAt = Math.min(n.word("distinct-rows", "Three orders", { nth: 1 }), n.beat("distinct").to + 4);
  const joinedAt = n.word("distinct-rows", "joined");
  const tooManyAt = n.word("distinct-rows", "Too many");
  const addsAt = n.word("distinct-rows", "adds DISTINCT");
  const rightAt = n.word("distinct-rows", "look right");
  const sumAt = n.word("distinct-sum", "sum of distinct amount");
  const fiftyAt = n.word("distinct-sum", "one fifty");
  const bothAt = n.word("distinct-sum", "Orders two and three");
  const truthAt = n.word("distinct-truth", "real total");
  const findAt = n.word("distinct-truth", "find out why");
  const end = n.beat("cte-in").to;

  const og = tableGeometry({
    x: X0,
    top: y(TOP),
    cols: [{ name: "order_id" }, { name: "amount" }],
    rows: DISTINCT.orders.rows,
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });
  const jg = tableGeometry({
    x: JOINED_X,
    top: y(TOP),
    cols: [{ name: "order_id" }, { name: "amount" }, { name: "item" }],
    rows: DISTINCT.joined.rows,
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });
  const rowsH = listingHeight(DISTINCT.rows.lines.length, 24);
  const rg = tableGeometry({
    x: LIST_X,
    top: y(TOP) + rowsH + h(64),
    cols: DISTINCT.rows.cols.map((name) => ({ name })),
    rows: DISTINCT.rows.rows,
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });
  const sumH = listingHeight(DISTINCT.sum.lines.length, 24);
  const sg = tableGeometry({
    x: LIST_X,
    top: y(TOP) + sumH + h(64),
    cols: DISTINCT.sum.cols.map((name) => ({ name })),
    rows: DISTINCT.sum.rows,
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });

  // The orders that appear more than once after the join.
  const repeats = DISTINCT.joined.rows.map((r) => DISTINCT.joined.rows.filter((s) => s[0] === r[0]).length > 1);
  // The orders whose amount another order shares: the ones DISTINCT folds.
  const fifty = DISTINCT.orders.rows.flatMap((r, i) => (DISTINCT.orders.rows.filter((s) => s[1] === r[1]).length > 1 ? [i] : []));

  return (
    <AbsoluteFill>
      <Sfx name="el-scratch" at={tooManyAt} level={-32} />
      <Sfx name="el-pencil" at={addsAt + 4} level={-34} />
      <Sfx name="el-scratch" at={fiftyAt + 2} level={-30} />
      <Sfx name="el-pop" at={truthAt + 6} level={-30} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={8} at={qAt - 4} textAt={textAt - 4}>
          When should you be careful with <Mono>DISTINCT</Mono>?
        </QuestionCard>

        {/* ── Three orders, and the five rows the join makes ── */}
        <TableName g={og} at={threeAt - 4}>
          orders
        </TableName>
        <DataTable
          g={og}
          cols={[{ name: "order_id", numeric: true }, { name: "amount", numeric: true }]}
          at={threeAt - 4}
          rows={DISTINCT.orders.rows.map((cells, i) => ({ cells, at: threeAt + i * 2 }))}
          marks={fifty.map((row, k) => ({ row, col: 1, at: bothAt + 4 + k * 4 }))}
        />

        <TableName g={jg} at={joinedAt - 4}>
          joined to their items
        </TableName>
        <DataTable
          g={jg}
          cols={[{ name: "order_id", numeric: true }, { name: "amount", numeric: true }, { name: "item" }]}
          at={joinedAt - 4}
          rows={DISTINCT.joined.rows.map((cells, i) => ({ cells, at: joinedAt + 2 + i * 3 }))}
          bands={repeats.flatMap((r, i) => (r ? [{ row: i, at: tooManyAt + i * 2, out: sumAt, color: MARK_BAD }] : []))}
        />

        {/* ── DISTINCT makes three rows again ── */}
        <Listing lines={DISTINCT.rows.lines} x={LIST_X} top={y(TOP)} width={LIST_W} size={24} at={addsAt - 4} marks={[{ line: 0, at: addsAt + 6 }]} out={sumAt - 4} />
        <DataTable
          g={rg}
          cols={DISTINCT.rows.cols.map((name) => ({ name, numeric: true }))}
          at={rightAt - 6}
          rows={DISTINCT.rows.rows.map((cells, i) => ({ cells, at: rightAt - 2 + i * 2 }))}
          out={sumAt - 4}
        />

        {/* ── SUM(DISTINCT amount) counts 50.00 once ── */}
        <Listing lines={DISTINCT.sum.lines} x={LIST_X} top={y(TOP)} width={LIST_W} size={24} at={sumAt} marks={[{ line: 0, at: sumAt + 8, color: MARK_BAD }]} />
        <DataTable
          g={sg}
          cols={DISTINCT.sum.cols.map((name) => ({ name, numeric: true }))}
          at={fiftyAt - 6}
          rows={DISTINCT.sum.rows.map((cells) => ({ cells, at: fiftyAt - 2 }))}
          marks={[{ row: 0, col: 0, at: fiftyAt + 4, color: MARK_BAD }]}
        />
        {/* The real total, beside the wrong one. */}
        <Note at={truthAt - 2} x={sg.right + 48} y={sg.top + h(HEAD_H) + h(6)}>
          <span style={{ ...note(30, INK), whiteSpace: "nowrap" }}>
            the real total:{" "}
            <Mark at={truthAt + 8} color={MARK_OK}>
              {DISTINCT.truth}
            </Mark>
          </span>
        </Note>
        <Note at={findAt - 4} x={LIST_X} y={sg.rowTop(1) + h(40)}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            Before <Mono>DISTINCT</Mono>, find out why the duplicates are there.
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
