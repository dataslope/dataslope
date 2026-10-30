import React from "react";
import { AbsoluteFill } from "remotion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, INK, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { FANOUT } from "./data";
import {
  DataTable,
  Drift,
  KeyArrow,
  Listing,
  listingHeight,
  MARK_BAD,
  MARK_OK,
  Mono,
  TableName,
  tableGeometry,
  X0,
} from "./parts";

const TOP = 340;
const ITEMS_Y = 620;
const JOINED_X = 570;
const LIST_X = 1040;
const LIST_W = 720;
const HEAD_H = 48;
const ROW_H = 56;

/**
 * Question 4, the fan-out: two orders worth 150.00, one with three items.
 * Joined to its items, order 1 is three rows and the sum comes to 350.00.
 * The fix is the grain, what one row stands for: the query wants revenue and
 * an item count, so it counts the items per order in a CTE first, keeping one
 * row per order, and the sum is 150.00 again.
 */
export const FanoutScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("fanout").from;
  const qAt = n.word("fanout", "Question");
  const textAt = n.word("fanout", "Why");
  // The two tables arrive as the question ends, not on their own words.
  const asked = n.beat("fanout").to;
  const twoAt = Math.min(n.word("fanout-tables", "Two orders"), asked + 4);
  const worthAt = n.word("fanout-tables", "a hundred and fifty");
  const oneAt = Math.min(n.word("fanout-tables", "Order one"), asked + 16);
  const twoItemsAt = n.word("fanout-tables", "Order two");
  const joinAt = n.word("fanout-join", "Join the items");
  const timesAt = n.word("fanout-join", "three times");
  const sumAt = n.word("fanout-join", "Sum the amount");
  const inflatedAt = n.word("fanout-join", "three hundred fifty");
  const fixAt = n.word("fanout-fix", "The fix");
  const grainAt = n.word("fanout-fix", "what one row stands for");
  const wantAt = n.word("fanout-fix", "revenue and an item count");
  const countAt = n.word("fanout-fix", "count the items");
  const oneRowAt = n.word("fanout-fix", "One row per order");
  const backAt = n.word("fanout-fix", "one fifty");
  const end = n.beat("fanout-fix").to;

  const og = tableGeometry({
    x: X0,
    top: y(TOP),
    cols: [{ name: "order_id" }, { name: "amount" }],
    rows: FANOUT.orders.rows,
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });
  const ig = tableGeometry({
    x: X0,
    top: y(ITEMS_Y),
    cols: [{ name: "order_id" }, { name: "item" }],
    rows: FANOUT.items.rows,
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });
  const jg = tableGeometry({
    x: JOINED_X,
    top: y(TOP),
    cols: [{ name: "order_id" }, { name: "amount" }, { name: "item" }],
    rows: FANOUT.joined.rows,
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });
  const inflatedH = listingHeight(FANOUT.inflated.lines.length, 24);
  const fixedH = listingHeight(FANOUT.fixed.lines.length, 22);
  const sumG = tableGeometry({
    x: LIST_X,
    top: y(TOP) + inflatedH + h(70),
    cols: [{ name: "revenue" }],
    rows: FANOUT.inflated.rows,
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });
  const fixG = tableGeometry({
    x: LIST_X,
    top: y(TOP) + fixedH + h(128),
    cols: [{ name: "revenue" }, { name: "items" }],
    rows: FANOUT.fixed.rows,
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });
  // The orders' rows each joined row came from: order 1 fans out to three.
  const orderRow = new Map(FANOUT.orders.rows.map((r, i) => [r[0], i]));
  const fanned = FANOUT.joined.rows.map((r) => r[0] === FANOUT.joined.rows[0][0]);
  const cteLines = FANOUT.fixed.lines.findIndex((l) => l.startsWith(")"));
  // The outer SELECT's two lines: the revenue and the item count it wants.
  const selectLine = FANOUT.fixed.lines.findIndex((l) => l.startsWith("SELECT"));

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={joinAt + 6} level={-34} />
      <Sfx name="el-scratch" at={inflatedAt + 2} level={-30} />
      <Sfx name="el-pencil" at={countAt + 4} level={-34} />
      <Sfx name="el-pop" at={backAt} level={-30} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4}>
          Why can a join make a sum too large?
        </QuestionCard>

        {/* ── Two orders and their items ── */}
        <TableName g={og} at={twoAt - 4}>
          orders
        </TableName>
        <DataTable
          g={og}
          cols={[{ name: "order_id", numeric: true }, { name: "amount", numeric: true }]}
          at={twoAt - 4}
          rows={FANOUT.orders.rows.map((cells, i) => ({ cells, at: twoAt + i * 3 }))}
          dim={fixAt + 4}
        />
        <Note at={worthAt} x={X0} y={og.rowTop(FANOUT.orders.rows.length) + 14} dim={fixAt + 4}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <Mono>SUM(amount)</Mono> = {FANOUT.revenue}
          </span>
        </Note>
        <TableName g={ig} at={oneAt - 4}>
          order_items
        </TableName>
        <DataTable
          g={ig}
          cols={[{ name: "order_id", numeric: true }, { name: "item" }]}
          at={oneAt - 4}
          rows={FANOUT.items.rows.map((cells, i) => ({ cells, at: (cells[0] === "1" ? oneAt : twoItemsAt) + i * 2 }))}
          dim={fixAt + 4}
        />

        {/* ── Joined: order 1 is three rows now ── */}
        <TableName g={jg} at={joinAt - 2}>
          orders joined to order_items
        </TableName>
        <DataTable
          g={jg}
          cols={[{ name: "order_id", numeric: true }, { name: "amount", numeric: true }, { name: "item" }]}
          at={joinAt - 2}
          rows={FANOUT.joined.rows.map((cells, i) => ({ cells, at: joinAt + 6 + i * 3 }))}
          marks={FANOUT.joined.rows.flatMap((_, i) => (fanned[i] ? [{ row: i, col: 1, at: timesAt + 2 + i * 3, color: MARK_BAD }] : []))}
          dim={fixAt + 4}
        />
        {FANOUT.joined.rows.map((r, i) => (
          <KeyArrow
            key={i}
            from={[og.right + 6, og.rowMid(orderRow.get(r[0])!)]}
            to={[jg.x - 8, jg.rowMid(i)]}
            at={joinAt + 4 + i * 3}
            color={fanned[i] ? ACCENT : undefined}
            width={2.2}
            out={fixAt + 2}
          />
        ))}

        {/* ── The inflated sum ── */}
        <Listing lines={FANOUT.inflated.lines} x={LIST_X} top={y(TOP)} width={LIST_W} size={24} at={sumAt - 4} out={fixAt - 2} />
        <DataTable
          g={sumG}
          cols={[{ name: "revenue", numeric: true }]}
          at={inflatedAt - 4}
          rows={FANOUT.inflated.rows.map((cells) => ({ cells, at: inflatedAt }))}
          marks={[{ row: 0, col: 0, at: inflatedAt + 4, color: MARK_BAD }]}
          out={fixAt - 2}
        />

        {/* ── The fix: one row per order, then join ── */}
        <Listing
          lines={FANOUT.fixed.lines}
          x={LIST_X}
          top={y(TOP)}
          width={LIST_W}
          size={22}
          at={fixAt + 2}
          marks={[
            { line: selectLine, at: wantAt, out: countAt },
            { line: selectLine + 1, at: wantAt + 3, out: countAt },
            ...Array.from({ length: cteLines + 1 }, (_, i) => ({ line: i, at: countAt + 2 + i * 3 })),
          ]}
        />
        <Note at={grainAt - 2} x={LIST_X} y={y(TOP) + fixedH + 12}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <span style={{ fontWeight: 650 }}>The grain:</span> what one row stands for.
          </span>
        </Note>
        <Note at={oneRowAt - 2} x={LIST_X} y={y(TOP) + fixedH + 54}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <Mono>items</Mono>: one row per order, the orders&apos; grain. Then the join.
          </span>
        </Note>
        <DataTable
          g={fixG}
          cols={[{ name: "revenue", numeric: true }, { name: "items", numeric: true }]}
          at={oneRowAt}
          rows={FANOUT.fixed.rows.map((cells) => ({ cells, at: oneRowAt + 4 }))}
          bands={[{ row: 0, at: backAt, color: MARK_OK }]}
        />
      </Drift>
    </AbsoluteFill>
  );
};
