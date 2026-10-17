import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, INK_SOFT, note } from "../../editorial/style";
import { FigLabel, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { NOKEY, TAYLORS } from "./data";
import {
  DataTable,
  Drift,
  Headline,
  KEY_INK,
  KeyArrow,
  Kicker,
  MARK_BAD,
  MARK_KEY,
  Mono,
  Reply,
  Spot,
  TableName,
  tableGeometry,
  X0,
} from "./parts";

const ORDERS_X = X0;
const ORDERS_Y = 500;
const CUSTOMERS_X = 860;
const CUSTOMERS_Y = 420;
const HEAD_H = 50;
const ROW_H = 60;

/**
 * Part 1 opens on Unit 3's bridge: a line between tables lands on one row.
 * Two customers named Taylor Kim, an order for one of them, and a table with
 * no key that cannot say which; then the key column opens, 101 and 102, and
 * the order's line lands on one row.
 */
export const IdentityScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const hookFrom = n.beat("hook").from;
  const whichRowAt = n.word("hook", "WHICH");
  const customersAt = n.word("taylors", "customers");
  const taylorAt = n.word("taylors", "Taylor Kim", { nth: 1 });
  const portlandAt = n.word("taylors", "Portland");
  const orderAt = n.word("taylors", "order");
  const beansAt = n.word("taylors", "coffee beans");
  const saysAt = n.word("taylors", "says");
  const whichAt = n.word("taylors", "Which one");
  const noKeyAt = n.word("blink", "no key");
  const tellAt = n.word("blink", "tell");
  const storeAt = n.word("blink", "store");
  const twiceAt = n.word("blink", "twice");
  const pkAt = n.word("ids", "primary key");
  const fixesAt = n.word("ids", "fixes");
  const oneOhOneAt = n.word("ids", "one oh one");
  const oneOhTwoAt = n.word("ids", "one oh two");
  const end = n.beat("ids").to;

  // ── Tables: the orders row (two versions) and the customers ──
  const keyedCols = [
    { name: "customer_id", at: pkAt + 2, numeric: true, ink: KEY_INK, tag: { text: "PK", at: pkAt + 12 } },
    { name: "name" },
    { name: "city" },
  ];
  const customers = tableGeometry({
    x: CUSTOMERS_X,
    top: y(CUSTOMERS_Y),
    cols: keyedCols,
    rows: TAYLORS.customers.rows,
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });
  // The first column opens on "primary key"; the rows' text takes the rest.
  const rowsAt = [taylorAt, portlandAt];
  const ordersNoKey = tableGeometry({
    x: ORDERS_X,
    top: y(ORDERS_Y),
    cols: NOKEY.orders.cols.map((name) => ({ name })),
    rows: NOKEY.orders.rows,
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });
  const ordersKeyed = tableGeometry({
    x: ORDERS_X,
    top: y(ORDERS_Y),
    cols: TAYLORS.orders.cols.map((name) => ({ name })),
    rows: TAYLORS.orders.rows,
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });

  // Where the order's line leaves, and where it can land.
  const fromNoKey = [ordersNoKey.right + 6, ordersNoKey.rowMid(0)] as const;
  const fromKeyed = [ordersKeyed.right + 6, ordersKeyed.rowMid(0)] as const;
  const toRow = (i: number) => [CUSTOMERS_X - 8, customers.rowMid(i)] as const;
  const owner = TAYLORS.customers.rows.findIndex((r) => r[0] === TAYLORS.owner);
  // The no-key picture clears as the key column starts to open.
  const clearAt = pkAt - 4;
  const repliesOut = clearAt;
  const swapOrders = fixesAt + 4;

  return (
    <AbsoluteFill>
      {/* ── Sound: the tables, the forked lines, the two inserts, the key ── */}
      <Sfx name="el-whoosh" at={customersAt - 6} level={-34} />
      <Sfx name="el-pop" at={beansAt - 2} level={-30} />
      <Sfx name="el-pencil" at={whichAt - 2} level={-34} />
      <Sfx name="el-tap" at={twiceAt - 2} level={-29} />
      <Sfx name="el-whoosh" at={pkAt + 2} level={-34} />
      <Sfx name="el-pencil" at={oneOhOneAt + 2} level={-33} />

      <Kicker at={hookFrom - 10}>Primary keys</Kicker>
      <Drift from={hookFrom} to={end + 60}>
        <Headline lead="Every line ends on a row." turn="Which row?" at={hookFrom - 6} turnAt={whichRowAt - 4} />

        <FigLabel n="1" title="An order, and two customers named Taylor Kim" at={customersAt - 10} x={X0} y={y(300)} />

        {/* ── The customers: first with no key, then with one ── */}
        <TableName g={customers} at={customersAt - 6}>
          customers
        </TableName>
        <DataTable
          g={customers}
          cols={keyedCols}
          at={customersAt - 6}
          rows={TAYLORS.customers.rows.map((cells, i) => ({ cells, at: rowsAt[i] }))}
          bands={[
            { row: 0, at: twiceAt - 6, out: clearAt, color: MARK_BAD },
            { row: 1, at: twiceAt - 2, out: clearAt, color: MARK_BAD },
          ]}
          marks={[
            { row: 0, col: 0, at: oneOhOneAt - 2, color: MARK_KEY },
            { row: 1, col: 0, at: oneOhTwoAt - 2, color: MARK_KEY },
          ]}
        />
        {/* Each insert went in: Postgres's own answer, once per row. */}
        {[NOKEY.insert, NOKEY.insertAgain].map((r, i) => (
          <Reply
            key={i}
            x={CUSTOMERS_X + customers.width - customers.widths[0] + 28}
            top={customers.rowMid(i) - 22}
            at={storeAt + i * 8}
            tag={r.tag}
            size={20}
            out={repliesOut}
          />
        ))}

        {/* ── The order ── */}
        <TableName g={ordersNoKey} at={orderAt - 4}>
          orders
        </TableName>
        <DataTable
          g={ordersNoKey}
          cols={NOKEY.orders.cols.map((name) => ({ name }))}
          at={orderAt - 4}
          rows={[{ cells: NOKEY.orders.rows[0], at: beansAt - 2 }]}
          marks={[{ row: 0, col: 1, at: saysAt + 2, out: fixesAt }]}
          out={swapOrders}
        />
        <DataTable
          g={ordersKeyed}
          cols={TAYLORS.orders.cols.map((name) => ({
            name,
            ink: name === "customer_id" ? KEY_INK : undefined,
          }))}
          at={swapOrders - 2}
          rows={[{ cells: TAYLORS.orders.rows[0], at: swapOrders }]}
          marks={[{ row: 0, col: 1, at: oneOhOneAt, color: MARK_KEY }]}
        />
        <Spot id="db-keys-beans" at={beansAt - 4} left={X0 + 40} top={y(640)} width={250} height={250} />

        {/* "Which one?": the line forks to both, and neither is the answer. */}
        {[0, 1].map((i) => (
          <KeyArrow key={i} from={fromNoKey} to={toRow(i)} at={whichAt - 2 + i * 6} color={ACCENT} dash out={clearAt} />
        ))}
        <Note at={whichAt + 8} x={(fromNoKey[0] + CUSTOMERS_X) / 2 - 14} y={customers.rowMid(0) + h(ROW_H) / 2 - 26} from="up" out={clearAt}>
          <span style={{ ...note(40, ACCENT_INK), fontWeight: 700 }}>?</span>
        </Note>
        <Note at={tellAt - 2} x={CUSTOMERS_X} y={customers.rowTop(2) + 22} out={clearAt}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            Matching on the name finds <b style={{ color: ACCENT_INK }}>{NOKEY.matches}</b> customers.
            <span style={{ opacity: ease(frame, noKeyAt, 10) }}> No key to tell them apart.</span>
          </span>
        </Note>

        {/* The key: one line, to one row. */}
        <KeyArrow from={fromKeyed} to={toRow(owner)} at={oneOhOneAt + 2} />
        <Note at={oneOhTwoAt + 8} x={CUSTOMERS_X} y={customers.rowTop(2) + 22}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            Matching on <Mono color={KEY_INK}>customer_id</Mono> finds{" "}
            <b style={{ color: KEY_INK }}>{TAYLORS.matches}</b>. Same name, two people.
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
