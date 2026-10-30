import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Entity, Relation, useEntityLayout } from "../../editorial/erd";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK, INK_SOFT, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BRIDGE } from "./data";
import { colsOf, DataTable, Drift, geoOf, MARK, MARK_OK, OK_INK, Strike, TableName, X0 } from "./parts";

const ERD_Y = 330;
const DATA_Y = 620;
const ROWS = { headH: 38, rowH: 40, bodySize: 21, headSize: 19 } as const;
const RESULT_ROWS = { headH: 38, rowH: 40, bodySize: 20, headSize: 19 } as const;

/**
 * Questions 7 and 8, on the video's own three orders and three promotions.
 * The diagram is DbDesign-5's junction table (db-relationship-patterns/
 * JunctionScene.tsx), copied and re-cued: a fact table whose one promo_key
 * column can't hold two promotions, then the bridge between fact_orders and
 * dim_promotion, two one-to-many lines into it, and the pairs it holds. For
 * question 8 the bridge gains its weight: summed through it, the orders'
 * 200.00 reports 340.00; weighted, the promotions share exactly 200.00. The
 * unweighted totals stay, labelled for what they answer, and their sum is
 * struck.
 */
export const BridgeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("bridge").from;
  const qAt = n.word("bridge", "Question seven");
  const textAt = n.word("bridge", "What is a bridge table");
  const severalAt = n.word("bridge", "several members of a dimension");
  const twoAt = n.word("bridge", "an order that used two promotions");
  const roomAt = n.word("bridge", "only has room for one promotion key");
  const sitsAt = n.word("bridge-pairs", "a bridge table sits between them");
  const pairAt = n.word("bridge-pairs", "one row per order and promotion pair");
  const q8At = n.word("mtm", "Question eight");
  const text8At = n.word("mtm", "How do you model a many-to-many");
  const weightAt = n.word("mtm", "and a weight");
  const sumAt = n.word("mtm-fan", "Join through the bridge and sum");
  const onceAt = n.word("mtm-fan", "every order counts once per promotion");
  const worthAt = n.word("mtm-fan", "three orders worth two hundred dollars");
  const fortyAt = n.word("mtm-fan", "report three hundred forty");
  const giveAt = n.word("mtm-weight", "Give each pair a weight");
  const oneAt = n.word("mtm-weight", "summing to one per order");
  const multAt = n.word("mtm-weight", "multiply before you sum");
  const shareAt = n.word("mtm-weight", "share exactly two hundred");
  const touchedAt = n.word("mtm-end", "how much revenue each promotion touched");
  const neverAt = n.word("mtm-end", "never add them up");
  const end = n.beat("mtm-end").to;

  // ── The diagram ──
  const factBefore = useEntityLayout({
    x: X0,
    y: y(ERD_Y),
    width: 330,
    name: "fact_orders",
    columns: [
      { name: "order_key", type: "int", key: "PK" },
      { name: "amount", type: "decimal" },
      { name: "promo_key", type: "int", key: "FK" },
    ],
  });
  const fact = useEntityLayout({
    x: X0,
    y: y(ERD_Y),
    width: 330,
    name: "fact_orders",
    columns: [
      { name: "order_key", type: "int", key: "PK" },
      { name: "amount", type: "decimal" },
    ],
  });
  const bridge = useEntityLayout({
    x: 650,
    y: y(ERD_Y),
    width: 470,
    name: "order_promotion_bridge",
    columns: [
      { name: "order_key", type: "int", key: "PK, FK" },
      { name: "promo_key", type: "int", key: "PK, FK" },
      { name: "weight", type: "decimal" },
    ],
  });
  const promo = useEntityLayout({
    x: 1440,
    y: y(ERD_Y),
    width: 340,
    name: "dim_promotion",
    columns: [
      { name: "promo_key", type: "int", key: "PK" },
      { name: "promo_name", type: "text" },
    ],
  });
  const fOut = fact.anchor("right", "order_key");
  const bIn = bridge.anchor("left", "order_key");
  const pOut = promo.anchor("left", "promo_key");
  const bOut = bridge.anchor("right", "promo_key");
  const midR = (pOut[0] + bOut[0]) / 2;
  const swapAt = sitsAt + 4;

  // ── The rows ──
  const O = BRIDGE.orders;
  const go = geoOf(O, X0, y(DATA_Y), h, ROWS);
  const B = BRIDGE.rows;
  const gb = geoOf(B, go.right + 40, y(DATA_Y), h, ROWS);
  const order1 = B.rows.map((r, i) => (r[0] === "1" ? i : -1)).filter((i) => i >= 0);
  const F = BRIDGE.fanout;
  const gf = geoOf(F, gb.right + 50, y(DATA_Y), h, RESULT_ROWS);
  const W = BRIDGE.weighted;
  const gw = geoOf(W, gf.right + 40, y(DATA_Y), h, RESULT_ROWS);
  const bWeight = B.cols.indexOf("weight");

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={severalAt + 2} level={-35} />
      <Sfx name="el-scratch" at={roomAt + 6} level={-35} />
      <Sfx name="el-tap" at={sitsAt + 2} level={-35} />
      <Sfx name="el-pencil" at={sitsAt + 12} level={-36} />
      <Sfx name="el-tap" at={weightAt} level={-35} />
      <Sfx name="el-pop" at={fortyAt + 2} level={-34} />
      <Sfx name="el-pop" at={shareAt + 2} level={-34} />
      <Sfx name="el-scratch" at={neverAt + 2} level={-35} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={7} at={qAt - 4} textAt={textAt - 4} out={q8At - 6} size={60}>
          What is a bridge table and when do you need one?
        </QuestionCard>
        <QuestionCard n={8} at={q8At - 2} textAt={text8At - 4} size={54}>
          How do you model a many-to-many relationship between facts and dimensions?
        </QuestionCard>

        {/* ── The fact table alone: one column for one promotion ── */}
        <Entity layout={factBefore} at={severalAt - 4} marks={{ promo_key: { at: roomAt + 2, tone: "warn" } }} out={swapAt} />
        <Entity layout={promo} at={severalAt + 4} />
        <Note at={twoAt + 2} x={promo.x} y={promo.bottom + h(20)} out={sitsAt}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            order <Num>1</Num>: SUMMER10 <i>and</i> FREESHIP
          </span>
        </Note>
        <Note at={roomAt + 6} x={factBefore.x} y={factBefore.bottom + h(16)} out={swapAt}>
          <span style={{ ...note(23, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>one column, one promotion</span>
        </Note>

        {/* ── The bridge between them ── */}
        <Entity layout={fact} at={swapAt} rowGap={0} />
        <Entity
          layout={bridge}
          at={sitsAt}
          rowAt={{ order_key: sitsAt + 6, promo_key: sitsAt + 10, weight: weightAt }}
          marks={{ weight: { at: weightAt + 4, out: sumAt } }}
        />
        <Relation name="fact_orders to bridge" points={[fOut, bIn]} from="exactly-one" to="zero-or-many" at={sitsAt + 12} dur={16} />
        <Relation
          name="dim_promotion to bridge"
          points={[pOut, [midR, pOut[1]], [midR, bOut[1]], bOut]}
          from="exactly-one"
          to="zero-or-many"
          at={sitsAt + 18}
          dur={16}
        />

        {/* ── The rows: orders, and the pairs the bridge holds ── */}
        <TableName g={go} at={worthAt - 4}>
          fact_orders
        </TableName>
        <DataTable
          g={go}
          cols={colsOf(O)}
          at={worthAt - 4}
          rows={O.rows.map((cells, i) => ({ cells, at: worthAt + i * 3 }))}
          bands={[{ row: 0, at: onceAt, out: worthAt, color: MARK }]}
        />
        <Note at={worthAt + 8} x={go.x} y={go.rowTop(O.rows.length) + h(14)}>
          <span style={{ ...note(24, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            total: $<Num>{BRIDGE.total}</Num>
          </span>
        </Note>
        <TableName g={gb} at={pairAt - 2}>
          its rows: one per pair
        </TableName>
        <DataTable
          g={gb}
          cols={colsOf(B, { weight: { at: weightAt + 2 } })}
          at={pairAt - 2}
          rows={B.rows.map((cells, i) => ({ cells, at: order1.includes(i) ? pairAt + 2 + i * 4 : q8At + 4 + i * 3 }))}
          bands={order1.map((row) => ({ row, at: onceAt + 2, out: giveAt, color: MARK }))}
          marks={B.rows.map((_, row) => ({ row, col: bWeight, at: oneAt + row * 2, out: shareAt + 20 }))}
        />

        {/* ── Summed through the bridge, then weighted ── */}
        <TableName g={gf} at={sumAt}>
          {ease(frame, touchedAt, 10) > 0.5 ? "revenue each touched" : "summed through it"}
        </TableName>
        <DataTable g={gf} cols={colsOf(F)} at={sumAt} rows={F.rows.map((cells, i) => ({ cells, at: sumAt + 6 + i * 3 }))} />
        <Note at={fortyAt} x={gf.x} y={gf.rowTop(F.rows.length) + h(14)}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            sum: $<Strike at={neverAt + 2}>
              <Num>{BRIDGE.fanoutTotal}</Num>
            </Strike>
          </span>
        </Note>
        <TableName g={gw} at={multAt}>
          weighted
        </TableName>
        <DataTable
          g={gw}
          cols={colsOf(W)}
          at={multAt}
          rows={W.rows.map((cells, i) => ({ cells, at: multAt + 6 + i * 3 }))}
          marks={W.rows.map((_, row) => ({ row, col: 1, at: shareAt + row * 3, color: MARK_OK }))}
        />
        <Note at={shareAt + 4} x={gw.x} y={gw.rowTop(W.rows.length) + h(14)}>
          <span style={{ ...note(24, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            sum: $<Num>{BRIDGE.weightedTotal}</Num>
          </span>
        </Note>
        <Note at={neverAt + 6} x={gf.x} y={gf.rowTop(F.rows.length) + h(56)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>never add these up</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
