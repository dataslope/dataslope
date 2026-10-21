import React from "react";
import { AbsoluteFill } from "remotion";
import { CARDINALITIES } from "../components/crowsfoot";
import { Entity, Relation, useEntityLayout } from "./erd";
import { LayoutContext, layoutFor } from "./layout";
import { INK_SOFT, label, PAPER } from "./style";

/**
 * The ERD kit (erd.tsx) on one page, for reviewing it: every crow's-foot end,
 * and three entities building themselves with the relationships between
 * them. Registered under Assets as `ErdKit`; scrub it in the Studio.
 */
const Diagram: React.FC = () => {
  const customers = useEntityLayout({
    x: 760,
    y: 330,
    width: 340,
    name: "customers",
    columns: [
      { name: "id", type: "integer", key: "PK" },
      { name: "name", type: "text" },
      { name: "email", type: "text", key: "UK" },
    ],
  });
  const orders = useEntityLayout({
    x: 1360,
    y: 300,
    width: 400,
    name: "orders",
    columns: [
      { name: "id", type: "integer", key: "PK" },
      { name: "customer_id", type: "integer", key: "FK" },
      { name: "placed_at", type: "timestamptz" },
    ],
  });
  const items = useEntityLayout({
    x: 1360,
    y: 640,
    width: 400,
    name: "order_items",
    columns: [
      { name: "order_id", type: "integer", key: "PK, FK" },
      { name: "product_id", type: "integer", key: "PK, FK" },
      { name: "quantity", type: "integer" },
    ],
  });
  const c = customers.anchor("right", "id");
  const o = orders.anchor("left", "customer_id");
  const midX = (c[0] + o[0]) / 2;
  return (
    <>
      <Entity layout={customers} at={6} />
      <Entity layout={orders} at={24} marks={{ customer_id: { at: 70, tone: "key" } }} />
      <Entity layout={items} at={44} />
      <Relation
        name="customers places orders"
        points={[c, [midX, c[1]], [midX, o[1]], o]}
        from="exactly-one"
        to="zero-or-many"
        at={62}
        label="places"
      />
      <Relation
        name="orders contain order_items"
        points={[orders.anchor("bottom"), items.anchor("top")]}
        from="exactly-one"
        to="one-or-many"
        at={84}
        label="contains"
      />
    </>
  );
};

export const ErdKit: React.FC = () => (
  <LayoutContext.Provider value={layoutFor(false)}>
    <AbsoluteFill style={{ background: PAPER }}>
      {CARDINALITIES.map((kind, i) => {
        const yy = 300 + i * 120;
        return (
          <React.Fragment key={kind}>
            <Relation name={kind} points={[[160, yy], [540, yy]]} from="many" to={kind} at={4 + i * 6} dur={14} />
            <div style={{ position: "absolute", left: 540, top: yy - 30, width: 26, height: 60, background: INK_SOFT, opacity: 0.25, borderRadius: 3 }} />
            <div style={{ position: "absolute", left: 160, top: yy - 52, ...label(21) }}>{kind.replace(/-/g, " ")}</div>
          </React.Fragment>
        );
      })}
      <Diagram />
    </AbsoluteFill>
  </LayoutContext.Provider>
);
