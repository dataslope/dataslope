import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Entity, Relation, useEntityLayout } from "../../editorial/erd";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Badge, Ink, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO, SANS } from "../../theme/fonts";
import { FAN, money } from "./data";
import {
  DataTable,
  Drift,
  Flow,
  KeyArrow,
  Listing,
  MARK,
  MARK_BAD,
  Mono,
  noteLine,
  TableName,
  tableGeometry,
  X0,
} from "./parts";

const ERD_Y = 300;
const ZOOM_Y = 620;
const LIST_Y = 300;
const RESULT_X = 1260;
const BARS_Y = 560;
const BAR_X = 260;
const BAR_W = 860;
const BAR_ROW = 26;

/**
 * Question 2, the fan trap. Orders and their items, one to many. Zoomed to
 * orders 1 and 2 (100.00 and 50.00, the rows Data Analyst Part 1 joined):
 * order 1's amount appears once per item, three times, and 150.00 sums to
 * 350.00. Then all twelve: the page's own query, as written, returns
 * 4,555.25 over 24 rows, against 1,949.25 for the orders alone, 2.34 times.
 * The danger is that nothing errors: each order is counted once per item,
 * drawn as one bar of copies per order. The tell is the row count, 12 orders
 * in and 24 rows out. And why every test passed: each checked an input
 * table; the same unique test on the joined rows fails, 8 orders repeating.
 */
export const FanScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("fan").from;
  const qAt = n.word("fan", "Question");
  const textAt = n.word("fan", "What is a fan-out join");
  const joinTableAt = n.word("fan", "You join a table");
  const detailAt = n.word("fan", "one-to-many detail table");
  const sumOneAt = n.word("fan", "sum a measure from the one side");
  const worthAt = n.word("fan-two", "Orders one and two");
  const fiftyAt = n.word("fan-two", "a hundred fifty dollars");
  const oneAt = n.word("fan-two", "Order one has three items");
  const twoAt = n.word("fan-two", "order two has one");
  const joinAt = n.word("fan-two", "Join the items");
  const threeAt = n.word("fan-two", "appears three times");
  const inflatedAt = n.word("fan-two", "three hundred fifty");
  const rowsAt = n.word("fan-all", "twenty-four rows");
  const becomesAt = n.word("fan-all", "nineteen hundred forty-nine dollars becomes");
  const bigAt = n.word("fan-all", "forty-five hundred fifty-five");
  const doubleAt = n.word("fan-all", "more than double");
  const nothingAt = n.word("fan-danger", "nothing errors");
  const ordinaryAt = n.word("fan-danger", "the result looks ordinary");
  const onceAt = n.word("fan-danger", "counted once per item");
  const biggerAt = n.word("fan-danger", "the bigger the baskets");
  const tellAt = n.word("fan-tell", "The tell is the row count");
  const inAt = n.word("fan-tell", "Twelve orders went into the join");
  const outAt = n.word("fan-tell", "twenty-four rows came out");
  const inputsAt = n.word("fan-test", "each one checked an input table");
  const uniqueAt = n.word("fan-test", "Run a unique test on order ID");
  const failsAt = n.word("fan-test", "it fails");
  const repeatAt = n.word("fan-test", "eight orders repeat");
  const end = n.beat("fan-test").to;
  const returnsAt = n.word("fan-all", "the join returns");
  // Orders 1 and 2 stay up for two seconds after their 350.00, then clear.
  const phaseOut = returnsAt - 4;

  // ── Phase A: the schema, then orders 1 and 2 ──
  const orders = useEntityLayout({
    x: X0,
    y: y(ERD_Y),
    width: 300,
    name: "orders",
    columns: [
      { name: "order_id", key: "PK" },
      { name: "amount" },
    ],
  });
  const items = useEntityLayout({
    x: 620,
    y: y(ERD_Y),
    width: 340,
    name: "order_items",
    columns: [{ name: "order_id", key: "FK" }, { name: "item" }, { name: "qty" }],
  });

  const firstTwo = FAN.firstTwo.result.rows;
  const twoIds = [...new Set(firstTwo.map((r) => r[0]))];
  const twoOrders = FAN.orders.rows.filter((r) => twoIds.includes(r[0]));
  const twoItems = FAN.items.rows.filter((r) => twoIds.includes(r[0])).map((r) => [r[0], r[1]]);
  const zoomTop = y(ZOOM_Y);
  const headH = h(40);
  const rowH = h(44);
  const og = tableGeometry({ x: X0, top: zoomTop, cols: [{ name: "order_id" }, { name: "amount" }], rows: twoOrders, headH, rowH, bodySize: 24 });
  const ig = tableGeometry({ x: 1100, top: zoomTop, cols: [{ name: "order_id" }, { name: "item" }], rows: twoItems, headH, rowH, bodySize: 24 });
  const jg = tableGeometry({ x: 560, top: zoomTop, cols: [{ name: "order_id" }, { name: "amount" }, { name: "item" }], rows: firstTwo, headH, rowH, bodySize: 24 });
  const orderRow = new Map(twoOrders.map((r, i) => [r[0], i]));
  const first = firstTwo[0][0];

  // ── Phase B: all twelve ──
  const page = FAN.page.sql;
  const listTop = y(LIST_Y);
  const rg = tableGeometry({
    x: RESULT_X,
    top: listTop,
    cols: [{ name: FAN.page.result.cols[0] }],
    rows: FAN.page.result.rows,
    headH: h(40),
    rowH: h(48),
    bodySize: 28,
  });
  const notesTop = rg.rowTop(1) + h(30);
  const barsTop = y(BARS_Y);
  const maxCounted = Math.max(...FAN.perOrder.map((o) => o.counted));
  const px = BAR_W / maxCounted;
  const maxItems = Math.max(...FAN.perOrder.map((o) => o.items));
  const tellTop = notesTop + h(224);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={detailAt + 6} level={-35} />
      <Sfx name="el-tap" at={worthAt} level={-33} />
      <Sfx name="el-pencil" at={joinAt + 4} level={-35} />
      <Sfx name="el-scratch" at={inflatedAt + 2} level={-31} />
      <Sfx name="el-whoosh" at={phaseOut} level={-36} />
      <Sfx name="el-tap" at={bigAt} level={-32} />
      <Sfx name="el-sprinkle" at={onceAt} level={-34} />
      <Sfx name="el-tap" at={inAt} level={-33} />
      <Sfx name="el-tap" at={outAt} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={2} at={qAt - 4} textAt={textAt - 4} size={62}>
          What is a fan-out join (fan trap), and why is it dangerous?
        </QuestionCard>

        {/* ── One to many ── */}
        <Entity layout={orders} at={joinTableAt - 2} marks={{ amount: { at: sumOneAt, tone: "note" } }} out={phaseOut} />
        <Entity layout={items} at={detailAt - 2} out={phaseOut} />
        <Relation
          name="orders-items"
          points={[orders.anchor("right", "order_id"), [items.left, orders.anchor("right", "order_id")[1]]]}
          from="exactly-one"
          to="one-or-many"
          at={detailAt + 4}
          out={phaseOut}
        />
        <Note at={detailAt + 10} x={items.right + 40} y={items.top + h(4)} out={phaseOut}>
          <span style={noteLine(22, INK_SOFT)}>many rows per order</span>
        </Note>

        {/* ── Orders 1 and 2: 150.00, then 350.00 joined ── */}
        <TableName g={og} at={worthAt - 2} out={phaseOut}>
          orders
        </TableName>
        <DataTable
          g={og}
          cols={[{ name: "order_id", numeric: true }, { name: "amount", numeric: true }]}
          at={worthAt - 2}
          rows={twoOrders.map((cells, i) => ({ cells, at: worthAt + 2 + i * 3 }))}
          out={phaseOut}
        />
        <Note at={fiftyAt} x={X0} y={og.rowTop(twoOrders.length) + h(16)} out={phaseOut}>
          <span style={noteLine(23, INK)}>
            <Mono>SUM</Mono> <Num>{money(FAN.firstTwoRevenue)}</Num>
          </span>
        </Note>
        <TableName g={ig} at={oneAt - 2} out={phaseOut}>
          order_items
        </TableName>
        <DataTable
          g={ig}
          cols={[{ name: "order_id", numeric: true }, { name: "item" }]}
          at={oneAt - 2}
          rows={twoItems.map((cells, i) => ({ cells, at: (cells[0] === first ? oneAt + 2 : twoAt) + i * 3 }))}
          out={phaseOut}
        />
        <TableName g={jg} at={joinAt - 2} out={phaseOut}>
          joined
        </TableName>
        <DataTable
          g={jg}
          cols={[{ name: "order_id", numeric: true }, { name: "amount", numeric: true }, { name: "item" }]}
          at={joinAt - 2}
          rows={firstTwo.map((cells, i) => ({ cells, at: joinAt + 6 + i * 3 }))}
          marks={firstTwo.flatMap((r, i) => (r[0] === first ? [{ row: i, col: 1, at: threeAt + 2 + i * 4, color: MARK_BAD }] : []))}
          out={phaseOut}
        />
        {firstTwo.map((r, i) => (
          <KeyArrow
            key={i}
            from={[og.right + 6, og.rowMid(orderRow.get(r[0])!)]}
            to={[jg.x - 10, jg.rowMid(i)]}
            at={joinAt + 4 + i * 3}
            color={r[0] === first ? ACCENT : BAR}
            width={2.2}
            dim={inflatedAt}
            out={phaseOut}
          />
        ))}
        {firstTwo.map((r, i) => (
          <KeyArrow
            key={`i${i}`}
            from={[ig.x - 6, ig.rowMid(twoItems.findIndex((it) => it[0] === r[0] && it[1] === r[2]))]}
            to={[jg.right + 10, jg.rowMid(i)]}
            at={joinAt + 6 + i * 3}
            width={2}
            dim={threeAt}
            out={phaseOut}
          />
        ))}
        <Note at={inflatedAt - 2} x={jg.x} y={jg.rowTop(firstTwo.length) + h(16)} out={phaseOut}>
          <span style={noteLine(23, INK)}>
            <Mono>SUM</Mono> <b style={{ color: ACCENT_INK }}>{money(FAN.firstTwoJoined)}</b>
            <span style={{ color: INK_SOFT }}>
              , not <Num>{money(FAN.firstTwoRevenue)}</Num>
            </span>
          </span>
        </Note>

        {/* ── All twelve: the page's query, as written ── */}
        <Listing
          lines={page}
          x={X0}
          top={listTop}
          width={1060}
          size={20}
          at={phaseOut + 8}
          marks={[{ line: "JOIN", at: tellAt + 2, color: MARK }]}
        />
        <TableName g={rg} at={bigAt - 6}>
          result
        </TableName>
        <DataTable
          g={rg}
          cols={[{ name: FAN.page.result.cols[0], numeric: true }]}
          at={bigAt - 6}
          rows={FAN.page.result.rows.map((cells) => ({ cells, at: bigAt - 2 }))}
          marks={[{ row: 0, col: 0, at: bigAt + 6, color: MARK_BAD }]}
        />
        <Note at={rowsAt} x={RESULT_X} y={notesTop}>
          <span style={noteLine(23, INK)}>
            from <b>
              <Num>{FAN.joinedRows}</Num> joined rows
            </b>
          </span>
        </Note>
        <Note at={becomesAt} x={RESULT_X} y={notesTop + h(40)}>
          <span style={noteLine(23, INK)}>
            orders alone: <Num>{money(FAN.revenue)}</Num>
          </span>
        </Note>
        <Note at={doubleAt} x={RESULT_X} y={notesTop + h(80)}>
          <span style={noteLine(23, ACCENT_INK)}>
            <b>
              <Num>{FAN.times.toFixed(2)}</Num> times
            </b>
          </span>
        </Note>
        <Note at={nothingAt} x={RESULT_X} y={notesTop + h(132)}>
          <span style={noteLine(22, INK_SOFT)}>No error, no warning</span>
        </Note>
        <Note at={ordinaryAt} x={RESULT_X} y={notesTop + h(166)}>
          <span style={noteLine(22, INK_SOFT)}>and an ordinary-looking number</span>
        </Note>

        {/* ── Each order counted once per item ── */}
        <Ink at={onceAt - 6} dur={12} style={{ left: X0, top: barsTop - h(40) }}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>Each order&rsquo;s amount, as the join counts it</span>
        </Ink>
        {FAN.perOrder.map((o, i) => {
          const top = barsTop + i * h(BAR_ROW);
          const at = onceAt + i * 2;
          const p = ease(frame, at, 12);
          if (p <= 0) return null;
          const lit = o.items === maxItems ? ease(frame, biggerAt + i, 10) : 0;
          return (
            <React.Fragment key={o.order}>
              <div style={{ position: "absolute", left: X0, top, width: 120, height: h(BAR_ROW), display: "flex", alignItems: "center", opacity: p }}>
                <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>
                  order <Num>{o.order}</Num>
                </span>
              </div>
              {Array.from({ length: o.items }, (_, k) => {
                const sp = ease(frame, at + k * 4, 10);
                return (
                  <div
                    key={k}
                    style={{
                      position: "absolute",
                      left: BAR_X + k * o.amount * px,
                      top: top + 5,
                      width: Math.max(0, o.amount * px * sp - 2),
                      height: h(BAR_ROW) - 10,
                      background: k === 0 ? BAR : ACCENT,
                      borderRadius: 2,
                      opacity: k === 0 ? 1 : 0.85,
                    }}
                  />
                );
              })}
              <div
                style={{
                  position: "absolute",
                  left: BAR_X + o.counted * px + 14,
                  top,
                  height: h(BAR_ROW),
                  display: "flex",
                  alignItems: "center",
                  opacity: ease(frame, at + o.items * 4, 10),
                }}
              >
                <span style={{ ...label(20, o.items > 1 ? ACCENT_INK : BLUE_INK), whiteSpace: "nowrap", background: lit > 0 ? `color-mix(in srgb, var(--ds-yellow-300) ${55 * lit}%, transparent)` : undefined, padding: "0 4px", margin: "0 -4px" }}>
                  <Num>{o.items}</Num>×
                </span>
              </div>
            </React.Fragment>
          );
        })}

        {/* ── The tell: rows in, rows out ── */}
        <Note at={inAt} x={RESULT_X} y={tellTop}>
          <span style={{ ...noteLine(26, INK), background: `color-mix(in srgb, var(--ds-yellow-300) ${55 * ease(frame, inAt + 4, 10)}%, transparent)`, padding: "2px 8px", margin: "0 -8px" }}>
            <b>
              <Num>{FAN.orderCount}</Num> orders
            </b>{" "}
            in
          </span>
        </Note>
        <Flow points={[[RESULT_X + 80, tellTop + h(40)], [RESULT_X + 80, tellTop + h(92)]]} at={outAt - 6} dur={10} color={INK} />
        <Note at={outAt} x={RESULT_X} y={tellTop + h(104)}>
          <span style={{ ...noteLine(26, INK), background: `color-mix(in srgb, var(--ds-yellow-300) ${55 * ease(frame, outAt + 4, 10)}%, transparent)`, padding: "2px 8px", margin: "0 -8px" }}>
            <b>
              <Num>{FAN.joinedRows}</Num> rows
            </b>{" "}
            out
          </span>
        </Note>
        <Note at={outAt + 12} x={RESULT_X + 104} y={tellTop + h(52)}>
          <span style={{ fontFamily: MONO, fontSize: 21, color: INK_SOFT, whiteSpace: "nowrap" }}>JOIN</span>
        </Note>

        {/* ── Why every test passed, and the one that fails ── */}
        <Note at={inputsAt} x={RESULT_X} y={tellTop + h(140)}>
          <span style={noteLine(22, INK_SOFT)}>Every test ran on an input table</span>
        </Note>
        <Note at={uniqueAt} x={RESULT_X} y={tellTop + h(182)}>
          <span style={{ ...noteLine(22, INK), display: "inline-flex", alignItems: "center", gap: "0.45em" }}>
            <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 500 }}>unique</span>
            on the joined rows
            <Badge tone="red" size={22} style={{ fontFamily: SANS, opacity: ease(frame, failsAt, 8) }}>
              fail
            </Badge>
          </span>
        </Note>
        <Note at={repeatAt} x={RESULT_X} y={tellTop + h(224)}>
          <span style={noteLine(22, ACCENT_INK)}>
            <b>
              <Num>{FAN.joinedRepeats}</Num> orders repeat
            </b>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
