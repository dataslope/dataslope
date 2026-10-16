import React from "react";
import { AbsoluteFill } from "remotion";
import { Entity, Relation, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Head, KEY_INK, Kicker, Pulse, Spot, Tag } from "./parts";

/**
 * Part 1 opens: one customer, many orders, as the lesson's own ER diagram
 * draws them, built as it is named, then its two ends read aloud.
 */
export const OneManyScene: React.FC = () => {
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("many").from;
  const customerAt = n.word("many", "customer");
  const ordersAt = n.word("many", "lots of orders");
  const belongsAt = n.word("many", "belongs");
  const justOneAt = n.word("many", "just one");
  const barsAt = n.word("ends", "Two bars");
  const exactlyAt = n.word("ends", "exactly one");
  const footAt = n.word("ends", "crow's foot");
  const zeroAt = n.word("ends", "zero or many");
  const whichAt = n.word("where-in", "which table");
  const holdsAt = n.word("where-in", "holds");

  const customers = useEntityLayout({
    x: 200,
    y: y(450),
    width: 380,
    name: "customers",
    columns: [
      { name: "id", type: "serial", key: "PK" },
      { name: "name", type: "text" },
      { name: "email", type: "text" },
    ],
  });
  const orders = useEntityLayout({
    x: 1060,
    y: y(430),
    width: 420,
    name: "orders",
    columns: [
      { name: "id", type: "serial", key: "PK" },
      { name: "customer_id", type: "integer", key: "FK" },
      { name: "placed_on", type: "date" },
      { name: "total", type: "numeric" },
    ],
  });
  const c = customers.anchor("right", "id");
  const o = orders.anchor("left", "customer_id");
  const midX = (c[0] + o[0]) / 2;

  return (
    <AbsoluteFill>
      {/* ── Sound: each box, the line, each end read ── */}
      <Sfx name="el-tap" at={customerAt - 2} level={-29} />
      <Sfx name="el-tap" at={ordersAt} level={-29} />
      <Sfx name="el-pencil" at={belongsAt} level={-33} />
      <Sfx name="el-pop" at={exactlyAt} level={-30} />
      <Sfx name="el-pop" at={zeroAt} level={-30} />

      <Kicker at={from - 10}>One to many</Kicker>
      <Head lead="One customer," leadAt={from - 6} turn="many orders." turnAt={ordersAt - 2} />
      <Spot id="db-relationship-patterns-basket" at={ordersAt + 4} left={1560} top={y(66)} width={270} height={270} />

      <Drift from={belongsAt} to={holdsAt + 60} scale={0.02} origin={[midX, y(600)]}>
        <Entity layout={customers} at={customerAt - 4} />
        <Entity layout={orders} at={ordersAt - 2} marks={{ customer_id: { at: justOneAt, tone: "key" } }} />
        <Relation
          name="customers places orders"
          points={[c, [midX, c[1]], [midX, o[1]], o]}
          from="exactly-one"
          to="zero-or-many"
          at={belongsAt}
          dur={20}
          label="places"
          labelAt={belongsAt + 10}
        />

        {/* The two ends, read aloud. */}
        <Pulse x={c[0] + 18} y={c[1]} at={barsAt} r={12} color={KEY_INK} />
        <Tag at={exactlyAt - 2} x={c[0] + 14} y={c[1] + 22} color={KEY_INK} size={22}>
          exactly one
        </Tag>
        <Pulse x={o[0] - 22} y={o[1]} at={footAt} r={14} color={KEY_INK} />
        <Tag at={zeroAt - 2} x={o[0] - 14} y={o[1] + 22} color={KEY_INK} size={22} align="right">
          zero or many
        </Tag>

        {/* "Which table holds the link?": both boxes asked in turn. */}
        <Pulse x={customers.x + customers.width / 2} y={customers.top + customers.head / 2} at={whichAt} r={40} />
        <Pulse x={orders.x + orders.width / 2} y={orders.top + orders.head / 2} at={holdsAt} r={40} />
        <Tag at={whichAt + 4} x={midX} y={y(750)} italic size={24} align="center">
          which side stores it?
        </Tag>
      </Drift>
    </AbsoluteFill>
  );
};
