import React from "react";
import { AbsoluteFill } from "remotion";
import { useLayout } from "../../editorial/layout";
import { INK_SOFT, label } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { NATURAL, SURROGATE } from "./data";
import {
  type Col,
  DataTable,
  Drift,
  ElbowArrow,
  ErrorBox,
  Headline,
  KEY_INK,
  Listing,
  listingHeight,
  MARK,
  MARK_KEY,
  Reply,
  RIGHT,
  TableName,
  tableGeometry,
  X0,
} from "./parts";

const USERS_Y = 420;
const ORDERS_Y = 640;
const HEAD_H = 50;
const ROW_H = 60;
const SQL_X = 1000;
const SQL_Y = 352;
const SIZE = 24;

/**
 * A natural key that changes: with email as users' key, Ada's new address is
 * refused, because her order still holds the old one. With a surrogate key,
 * user 10, the same change is UPDATE 1 and the order's pointer stays put;
 * the email keeps a UNIQUE rule of its own.
 */
export const EmailScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const from = n.beat("email").from;
  const keyAt = n.word("email", "email the key");
  const changesAt = n.word("email", "changes hers");
  const refusesAt = n.word("email", "refuses");
  const orderAt = n.word("email", "her order");
  const oldAt = n.word("email", "old one");
  const tenAt = n.word("user-ten", "user ten");
  const throughAt = n.word("user-ten", "goes through");
  const uniqueAt = n.word("user-ten", "unique");
  const notKeyAt = n.word("user-ten", "not the key");
  const namesAt = n.word("fk-in", "names a row");
  const pointAt = n.word("fk-in", "point at one");
  const swapAt = n.word("user-ten", "Make her") - 2;

  // ── Email as the key ──
  const natUserCols: Col[] = [{ name: "email", ink: KEY_INK, tag: { text: "PK", at: keyAt + 4 } }, { name: "name" }];
  const natOrderCols: Col[] = [{ name: "order_id", numeric: true }, { name: "user_email", ink: KEY_INK }];
  const natUsers = tableGeometry({ x: X0, top: y(USERS_Y), cols: natUserCols, rows: NATURAL.users.rows, headH: h(HEAD_H), rowH: h(ROW_H) });
  const natOrders = tableGeometry({ x: X0, top: y(ORDERS_Y), cols: natOrderCols, rows: NATURAL.orders.rows, headH: h(HEAD_H), rowH: h(ROW_H) });
  const natLoop = Math.max(natUsers.right, natOrders.right) + 44;

  // ── A surrogate key ──
  const surUserCols: Col[] = [
    { name: "user_id", numeric: true, ink: KEY_INK, tag: { text: "PK", at: swapAt + 8 } },
    { name: "email", tag: { text: "UNIQUE", at: uniqueAt, color: INK_SOFT } },
    { name: "name" },
  ];
  const surOrderCols: Col[] = [{ name: "order_id", numeric: true }, { name: "user_id", numeric: true, ink: KEY_INK }];
  const surUsers = tableGeometry({
    x: X0,
    top: y(USERS_Y),
    cols: surUserCols,
    rows: SURROGATE.users.rows,
    extra: SURROGATE.after.rows,
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });
  const surOrders = tableGeometry({ x: X0, top: y(ORDERS_Y), cols: surOrderCols, rows: SURROGATE.orders.rows, headH: h(HEAD_H), rowH: h(ROW_H) });
  const surLoop = Math.max(surUsers.right, surOrders.right) + 44;
  const emailCol = SURROGATE.users.cols.indexOf("email");
  const newEmail = SURROGATE.after.rows[0][emailCol];

  const loop = (users: typeof natUsers, orders: typeof natOrders, x: number) =>
    [
      [orders.right + 8, orders.rowMid(0)],
      [x, orders.rowMid(0)],
      [x, users.rowMid(0)],
      [users.right + 8, users.rowMid(0)],
    ] as const;
  const listH = listingHeight(3, SIZE);

  return (
    <AbsoluteFill>
      {/* ── Sound: the tables, the refusal, the swap, the update going through ── */}
      <Sfx name="el-whoosh" at={keyAt - 6} level={-34} />
      <Sfx name="el-pencil" at={orderAt} level={-34} />
      <Sfx name="el-tap" at={refusesAt} level={-28} />
      <Sfx name="el-whoosh" at={swapAt + 4} level={-34} />
      <Sfx name="el-tap" at={throughAt} level={-28} />
      <Sfx name="el-pencil" at={pointAt - 2} level={-34} />

      <Drift from={from} to={n.beat("fk-in").to + 50}>
        <Headline lead="When the key itself" turn="has to change" at={from - 6} turnAt={changesAt - 4} />

        {/* ── Email as the key ── */}
        <Ink at={keyAt - 6} dur={12} out={swapAt} style={{ left: X0, top: y(300), whiteSpace: "nowrap" }}>
          <span style={label(26, INK_SOFT)}>Email as the key</span>
        </Ink>
        <TableName g={natUsers} at={keyAt - 6} out={swapAt}>
          users
        </TableName>
        <DataTable
          g={natUsers}
          cols={natUserCols}
          at={keyAt - 6}
          rows={[{ cells: NATURAL.users.rows[0], at: keyAt }]}
          marks={[{ row: 0, col: 0, at: oldAt - 4, color: MARK }]}
          out={swapAt}
        />
        <TableName g={natOrders} at={keyAt + 4} out={swapAt}>
          orders
        </TableName>
        <DataTable
          g={natOrders}
          cols={natOrderCols}
          at={keyAt + 4}
          rows={[{ cells: NATURAL.orders.rows[0], at: keyAt + 10 }]}
          marks={[{ row: 0, col: 1, at: orderAt, color: MARK_KEY }]}
          out={swapAt}
        />
        <ElbowArrow points={loop(natUsers, natOrders, natLoop)} at={orderAt + 2} out={swapAt} />
        <Listing lines={NATURAL.change.lines} x={SQL_X} top={y(SQL_Y)} width={RIGHT - SQL_X} size={SIZE} at={changesAt - 4} out={swapAt} />
        <ErrorBox
          x={SQL_X}
          top={y(SQL_Y) + listH + 18}
          width={RIGHT - SQL_X}
          at={refusesAt}
          message={NATURAL.change.message}
          detail={NATURAL.change.detail}
          mark={{ text: NATURAL.change.detail.slice(NATURAL.change.detail.indexOf("is still")), at: orderAt + 4 }}
          out={swapAt}
        />

        {/* ── A surrogate key ── */}
        <Ink at={swapAt + 4} dur={12} style={{ left: X0, top: y(300), whiteSpace: "nowrap" }}>
          <span style={label(26, INK_SOFT)}>A surrogate key</span>
        </Ink>
        <TableName g={surUsers} at={swapAt + 4}>
          users
        </TableName>
        <DataTable
          g={surUsers}
          cols={surUserCols}
          at={swapAt + 4}
          rows={[{ cells: SURROGATE.users.rows[0], at: swapAt + 8 }]}
          marks={[
            { row: 0, col: 0, at: tenAt, color: MARK_KEY },
            { row: 0, col: emailCol, at: throughAt + 2 },
          ]}
          swaps={[{ row: 0, col: emailCol, at: throughAt, value: newEmail }]}
          bands={[{ row: 0, at: namesAt, color: MARK_KEY, out: pointAt + 20 }]}
        />
        <TableName g={surOrders} at={swapAt + 10}>
          orders
        </TableName>
        <DataTable
          g={surOrders}
          cols={surOrderCols}
          at={swapAt + 10}
          rows={[{ cells: SURROGATE.orders.rows[0], at: swapAt + 14 }]}
          marks={[{ row: 0, col: 1, at: tenAt + 6, color: MARK_KEY }]}
          bands={[{ row: 0, at: pointAt, color: MARK_KEY }]}
        />
        <ElbowArrow points={loop(surUsers, surOrders, surLoop)} at={tenAt + 4} />
        <Listing lines={SURROGATE.change.lines} x={SQL_X} top={y(SQL_Y)} width={RIGHT - SQL_X} size={SIZE} at={swapAt + 12} />
        <Reply x={SQL_X} top={y(SQL_Y) + listH + 18} at={throughAt} tag={SURROGATE.change.tag} />
        <Ink at={notKeyAt - 4} dur={16} style={{ left: SQL_X, top: y(SQL_Y) + listH + 96, whiteSpace: "nowrap" }}>
          <span style={{ ...label(24, INK_SOFT), fontWeight: 560 }}>
            The email is an attribute now: unique, but nothing points at it.
          </span>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
