import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Entity, Relation, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CITY_BAD, CITY_GOOD, CITY_JOIN, CITY_TWO, CITY_UPDATE, K, NEW_CITY } from "./data";
import {
  DbTable,
  Fig,
  FIG_Y,
  HEAD_H,
  Headline,
  Listing,
  MARK_BAD,
  MARK_KEY,
  Mono,
  ROW_H,
  tableGeometry,
  X0,
} from "./kit";
import { DepArrow, Drift, Fade, pulse, Reply } from "./parts";

const TABLE_Y = 430;
const RIGHT = 980;
const LIST_SIZE = 22;
const TWO_Y = 626;
const ERD_Y = 400;

/**
 * Third normal form: orders_bad carries each customer's city, which depends
 * on the order only through customer_id; Ada's move, made on one row, leaves
 * her in two cities; and with customers in their own table she moves once.
 */
export const ChainScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("chain").from;
  const ordersAt = n.word("chain", "These orders");
  const cityAt = n.word("chain", "city");
  const keyAt = n.word("chain", "The key");
  const orderAt = n.word("chain", "ORDER");
  const customerAt = n.word("chain", "customer");
  const givesAt = n.word("detour", "gives");
  const cityToo = n.word("detour", "city");
  const detourAt = n.word("detour", "detour");
  const transitiveAt = n.word("detour", "transitive");
  const sameAt = n.word("moves", "Same disease");
  const adaAt = n.word("moves", "Ada moves");
  const oxfordAt = n.word("moves", "Oxford");
  const updateAt = n.word("moves", "update");
  const missesAt = n.word("moves", "misses");
  const livesAt = n.word("moves", "lives");
  const citiesAt = n.word("moves", "two cities");
  const giveAt = n.word("extract", "Give");
  const tableAt = n.word("extract", "own table");
  const movesAt = n.word("extract", "moves");
  const onceAt = n.word("extract", "once");
  const end = n.beat("extract").to;

  const g = tableGeometry({
    x: X0,
    top: y(TABLE_Y),
    cols: CITY_BAD.cols,
    rows: CITY_BAD.rows,
    extra: [[null, null, null, NEW_CITY]],
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });
  const center = (j: number) => g.xs[j] + g.widths[j] / 2;
  const bottom = g.bottom(CITY_BAD.rows.length);
  const ada = CITY_BAD.rows.map((r, i) => (r[K.name] === "Ada" ? i : -1)).filter((i) => i >= 0);
  const tg = tableGeometry({ x: RIGHT, top: y(TWO_Y), cols: CITY_TWO.cols, rows: CITY_TWO.rows, headH: h(HEAD_H), rowH: h(ROW_H) });
  const twoAda = CITY_TWO.rows.map((r, i) => (r[1] === "Ada" ? i : -1)).filter((i) => i >= 0);
  const oxfordOrders = CITY_JOIN.rows.filter((r) => r[2] === NEW_CITY).length;
  const orderSwell = pulse(frame, orderAt, 24);
  const sameSwell = pulse(frame, sameAt, 24);

  const customers = useEntityLayout({
    x: X0,
    y: y(ERD_Y),
    width: 340,
    name: "customers",
    columns: [
      { name: "id", type: "integer", key: "PK" },
      { name: "name", type: "text" },
      { name: "city", type: "text" },
    ],
  });
  const orders = useEntityLayout({
    x: 760,
    y: y(ERD_Y),
    width: 420,
    name: "orders",
    columns: [
      { name: "id", type: "integer", key: "PK" },
      { name: "customer_id", type: "integer", key: "FK" },
      { name: "order_date", type: "date" },
    ],
  });
  const c = customers.anchor("right", "id");
  const o = orders.anchor("left", "customer_id");
  const mid = (c[0] + o[0]) / 2;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={givesAt - 2} level={-34} />
      <Sfx name="el-pencil" at={cityToo - 4} level={-33} />
      <Sfx name="el-tap" at={updateAt} level={-28} />
      <Sfx name="el-pop" at={livesAt - 4} level={-30} />
      <Sfx name="el-whoosh" at={giveAt - 4} level={-34} />
      <Sfx name="el-tap" at={onceAt - 2} level={-28} />

      <Headline kicker="Third normal form" lead="A dependency" turn="with a detour." at={from - 6} turnAt={detourAt - 4} underlineAt={transitiveAt} />

      <Drift from={from} to={end + 40} amount={0.012} origin="35% 55%">
        <Fade out={giveAt - 4} slide={40}>
          <Fig n="8" at={ordersAt - 4} y={y(FIG_Y)}>
            <Mono>orders_bad</Mono>, keyed by <Mono>order_id</Mono>
          </Fig>
          <DbTable
            g={g}
            cols={CITY_BAD.cols}
            rows={CITY_BAD.rows.map((cells, i) => ({ cells, at: ordersAt + 4 + i * 5 }))}
            at={ordersAt}
            numeric={[K.order, K.customer]}
            marks={[
              ...CITY_BAD.rows.map((_, i) => ({ row: i, col: K.city, at: cityAt + i * 4, out: customerAt })),
              ...CITY_BAD.rows.map((_, i) => ({ row: i, col: K.order, at: keyAt + i * 3, color: MARK_KEY })),
              ...CITY_BAD.rows.map((_, i) => ({ row: i, col: K.customer, at: customerAt + i * 3, color: MARK_KEY })),
              ...CITY_BAD.rows.map((_, i) => ({ row: i, col: K.city, at: customerAt + 4 + i * 3 })),
              { row: ada[1], col: K.city, at: missesAt, color: MARK_BAD },
              { row: ada[0], col: K.city, at: missesAt + 6, color: MARK_BAD },
            ]}
            swaps={[{ row: ada[0], col: K.city, at: oxfordAt + 2, value: NEW_CITY, color: ACCENT_INK }]}
          />
          {/* "isn't about an order": the key column swells, then the customer's takes over. */}
          {[
            { col: K.order, swell: orderSwell },
            { col: K.city, swell: sameSwell },
          ].map(({ col, swell }) => (
            <div
              key={col}
              style={{
                position: "absolute",
                left: g.xs[col] + 4,
                top: g.top + 4,
                width: g.widths[col] - 8,
                height: bottom - g.top - 8,
                borderRadius: 4,
                border: `2px solid ${col === K.order ? BAR : ACCENT}`,
                opacity: swell,
              }}
            />
          ))}
          <Note at={customerAt + 6} x={g.x} y={bottom + 92}>
            <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
              <Mono>customer_city</Mono> is a fact about the customer
            </span>
          </Note>

          {/* order_id gives customer_id, which gives the city. */}
          <DepArrow from={[center(K.order), bottom + 8]} to={[center(K.customer), bottom + 6]} level={bottom + 56} at={givesAt - 2} />
          <DepArrow from={[center(K.customer) + 14, g.top - 6]} to={[center(K.city), g.top - 6]} level={g.top - 82} at={cityToo - 4} color={ACCENT} />
          <DepArrow
            from={[center(K.customer) - 14, g.top - 6]}
            to={[center(K.name), g.top - 6]}
            level={g.top - 44}
            at={cityToo + 4}
            color={INK_SOFT}
            width={2}
          />
          <Ink at={transitiveAt - 2} dur={14} style={{ left: center(K.name) + 40, top: g.top - 124, whiteSpace: "nowrap" }}>
            <span style={{ ...label(22, ACCENT_INK) }}>a transitive dependency</span>
          </Ink>

          {/* Ada's move, made on one row. */}
          <Listing
            lines={CITY_UPDATE.lines}
            x={RIGHT}
            top={g.top}
            width={560}
            size={LIST_SIZE}
            at={adaAt - 8}
            lineAt={[adaAt - 4, oxfordAt - 4, updateAt]}
            marks={[{ line: 2, at: missesAt }]}
          />
          <Reply at={updateAt + 2} x={RIGHT + 580} y={g.top + 8}>
            {CITY_UPDATE.tag}
          </Reply>
          <Ink at={livesAt - 6} dur={12} style={{ left: RIGHT, top: tg.top - 40, whiteSpace: "nowrap" }}>
            <span style={label(21, INK_SOFT)}>Grouped by customer and city</span>
          </Ink>
          <DbTable
            g={tg}
            cols={CITY_TWO.cols}
            rows={CITY_TWO.rows.map((cells, i) => ({ cells, at: livesAt + i * 4 }))}
            at={livesAt - 4}
            numeric={[0, 3]}
            marks={twoAda.map((row, k) => ({ row, col: 2, at: citiesAt + k * 6, color: MARK_BAD }))}
          />
        </Fade>

        {/* Customers in a table of their own: one row to change. */}
        <Fade at={giveAt}>
          <Fig n="9" at={giveAt} y={y(FIG_Y)}>
            Facts about a customer, keyed by the customer
          </Fig>
          <Entity layout={customers} at={giveAt + 2} marks={{ city: { at: movesAt } }} />
          <Entity layout={orders} at={tableAt} />
          <Relation
            name="customers places orders"
            points={[c, [mid, c[1]], [mid, o[1]], o]}
            from="exactly-one"
            to="zero-or-many"
            at={tableAt + 4}
            label="places"
          />
          <Listing
            lines={CITY_GOOD.lines}
            x={X0}
            top={customers.bottom + 40}
            width={440}
            size={LIST_SIZE}
            at={movesAt - 6}
            lineAt={[movesAt - 2, movesAt + 2, movesAt + 6]}
          />
          <Reply at={onceAt - 2} x={X0 + 470} y={customers.bottom + 48}>
            {CITY_GOOD.tag}
          </Reply>
          <Note at={onceAt + 6} x={X0 + 470} y={customers.bottom + 106}>
            <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
              and all {oxfordOrders} of her orders show {NEW_CITY}
            </span>
          </Note>
        </Fade>
      </Drift>
    </AbsoluteFill>
  );
};
