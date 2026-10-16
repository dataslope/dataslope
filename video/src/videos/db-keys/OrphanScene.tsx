import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, INK_SOFT, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { MONO } from "../../theme/fonts";
import { Sfx } from "../../sound/Sfx";
import { ORPHAN } from "./data";
import {
  type Col,
  DataTable,
  Drift,
  ErrorBox,
  Headline,
  KEY_INK,
  KeyArrow,
  Listing,
  MARK_BAD,
  MARK_KEY,
  Reply,
  TableName,
  tableGeometry,
  Tag,
  X0,
} from "./parts";

const SQL_Y = 330;
const SIZE = 24;
const TABLE_Y = 560;
const CUSTOMERS_X = 1180;
const HEAD_H = 46;
const ROW_H = 56;
const ERROR_Y = 780;

/**
 * The lesson's block: order 101 for customer 1 goes in; order 102 for
 * customer 99, who doesn't exist, is refused, so no orphan gets in. Then the
 * turn to Part 4: what happens when a parent leaves.
 */
export const OrphanScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const from = n.beat("defend").from;
  const checksAt = n.word("defend", "checks");
  const orderAt = n.word("defend", "An order");
  const oneAt = n.word("defend", "customer one");
  const inAt = n.word("defend", "right in");
  const ninetyAt = n.word("ninety", "ninety-nine");
  const existAt = n.word("ninety", "doesn't exist");
  const rejectedAt = n.word("ninety", "rejected");
  const orphanAt = n.word("ninety", "orphan");
  const parentAt = n.word("ninety", "parent isn't there");
  const leavesAt = n.word("ri-in", "parent leaves");
  const end = n.beat("ri-in").to;

  const orderCols: Col[] = [
    { name: "order_id", numeric: true },
    { name: "customer_id", numeric: true, ink: KEY_INK, tag: { text: "FK", at: checksAt } },
    { name: "total", numeric: true },
  ];
  const customerCols: Col[] = [
    { name: "customer_id", numeric: true, ink: KEY_INK, tag: { text: "PK", at: checksAt + 6 } },
    { name: "name" },
  ];
  const orders = tableGeometry({ x: X0, top: y(TABLE_Y), cols: orderCols, rows: ORPHAN.tried, headH: h(HEAD_H), rowH: h(ROW_H) });
  const customers = tableGeometry({
    x: CUSTOMERS_X,
    top: y(TABLE_Y),
    cols: customerCols,
    rows: ORPHAN.customers.rows,
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });
  const lines = [ORPHAN.ok.lines[0], ORPHAN.bad.lines[0]];
  const listW = 760;
  const lineMid = (i: number) => y(SQL_Y) + Math.round(SIZE * 0.66) + i * Math.round(SIZE * 1.8) + Math.round(SIZE * 0.9);
  const owner = ORPHAN.customers.rows.findIndex((r) => r[0] === ORPHAN.tried[0][1]);
  const missing = ORPHAN.tried[1][1];
  // Where customer 99 would be, if there were one.
  const slotTop = customers.rowTop(ORPHAN.customers.rows.length) + 8;
  const slot = ease(frame, existAt - 4, 12);
  const errW = CUSTOMERS_X - 60 - X0;

  return (
    <AbsoluteFill>
      {/* ── Sound: the accepted row, the dangling pointer, the refusal ── */}
      <Sfx name="el-tap" at={inAt - 2} level={-28} />
      <Sfx name="el-pencil" at={inAt + 2} level={-34} />
      <Sfx name="el-pencil" at={existAt} level={-35} />
      <Sfx name="el-scratch" at={rejectedAt + 2} level={-30} />
      <Sfx name="el-pop" at={orphanAt - 2} level={-30} />

      <Drift from={from} to={end + 50}>
        <Headline lead="No parent," turn="no child." at={from - 6} turnAt={rejectedAt - 4} />

        <Listing
          lines={lines}
          x={X0}
          top={y(SQL_Y)}
          width={listW}
          size={SIZE}
          at={orderAt - 6}
          lineAt={[orderAt - 2, ninetyAt - 6]}
          marks={[{ line: 1, at: ninetyAt + 2, color: MARK_BAD }]}
        />
        <Reply x={X0 + listW + 24} top={lineMid(0) - 22} at={inAt} tag={ORPHAN.ok.tag} size={20} />

        {/* ── The two tables ── */}
        <TableName g={orders} at={from - 2}>
          orders
        </TableName>
        <DataTable
          g={orders}
          cols={orderCols}
          at={from - 2}
          rows={[
            { cells: ORPHAN.tried[0], at: inAt - 4 },
            { cells: ORPHAN.tried[1], at: ninetyAt, ghost: true, grow: true, strikeAt: rejectedAt + 2, dimAt: leavesAt - 10 },
          ]}
          marks={[
            { row: 0, col: 1, at: oneAt, color: MARK_KEY },
            { row: 1, col: 1, at: ninetyAt + 4, color: MARK_BAD },
          ]}
        />
        <TableName g={customers} at={from + 2}>
          customers
        </TableName>
        <DataTable
          g={customers}
          cols={customerCols}
          at={from + 2}
          rows={ORPHAN.customers.rows.map((cells, i) => ({
            cells,
            at: from + 6 + i * 4,
            outline: i === owner ? { at: leavesAt - 2 } : undefined,
          }))}
          marks={[{ row: owner, col: 0, at: oneAt + 4, color: MARK_KEY }]}
        />
        <KeyArrow from={[orders.right + 8, orders.rowMid(0)]} to={[CUSTOMERS_X - 10, customers.rowMid(owner)]} at={inAt + 2} dim={leavesAt + 4} />

        {/* Customer 99: nobody there. */}
        <div
          style={{
            position: "absolute",
            left: CUSTOMERS_X,
            top: slotTop,
            width: customers.width,
            height: h(ROW_H) - 10,
            boxSizing: "border-box",
            border: `2px dashed ${ACCENT}`,
            borderRadius: 4,
            opacity: slot * (1 - ease(frame, leavesAt - 10, 12) * 0.6),
            display: "flex",
            alignItems: "center",
            paddingLeft: 18,
            fontFamily: MONO,
            fontSize: 24,
            color: ACCENT_INK,
          }}
        >
          {missing}?
        </div>
        <KeyArrow
          from={[orders.right + 8, orders.rowMid(1) + h(6)]}
          to={[CUSTOMERS_X - 10, slotTop + (h(ROW_H) - 10) / 2]}
          at={existAt - 2}
          color={ACCENT}
          dash
          dim={rejectedAt + 6}
        />
        <Note at={orphanAt - 2} x={CUSTOMERS_X + customers.width + 20} y={slotTop + 4}>
          <Tag color={ACCENT_INK} size={21}>
            orphan
          </Tag>
          <span style={{ ...note(21, INK_SOFT), marginLeft: 10, opacity: ease(frame, parentAt - 2, 10) }}>no parent</span>
        </Note>

        <ErrorBox
          x={X0}
          top={y(ERROR_Y)}
          width={errW}
          at={rejectedAt}
          message={ORPHAN.bad.message}
          detail={ORPHAN.bad.detail}
          mark={{ text: ORPHAN.bad.detail.slice(ORPHAN.bad.detail.indexOf("is not")), at: rejectedAt + 16 }}
          dim={leavesAt - 10}
        />
        <Note at={leavesAt - 2} x={CUSTOMERS_X + customers.width + 20} y={customers.rowMid(owner) - 16}>
          <span style={{ ...note(30, ACCENT_INK), fontWeight: 700 }}>?</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
