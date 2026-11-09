import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Entity, Relation, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
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
  KEY,
  Listing,
  MARK,
  MARK_BAD,
  MARK_KEY,
  Mono,
  ROW_H,
  tableGeometry,
  X0,
} from "./kit";
import { DepArrow, Drift, Fade, Notation, pulse, Reply, Svg } from "./parts";

const TABLE_Y = 430;
const RIGHT = 980;
const LIST_SIZE = 22;
const TWO_Y = 626;
const ERD_Y = 400;
/** Fig. 9's join, in the right half: every order, and the city it now shows. */
const JOIN_X = 1250;

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
  const cityAt = n.word("chain", "city", { nth: 1 });
  const keyAt = n.word("chain", "The key");
  const orderIdAt = n.word("chain", "order ID");
  const orderAt = n.word("chain", "ORDER", { nth: 2 });
  const customerAt = n.word("chain", "customer");
  const givesAt = n.word("detour", "gives", { nth: 1 });
  const cityToo = n.word("detour", "city");
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
  // The key, bracketed as Fig. 6 brackets its pair.
  const bracketL = g.xs[K.order] + 8;
  const bracketR = g.xs[K.order] + g.widths[K.order] - 8;
  const bracketY = g.top - 14;
  const bracketIn = ease(frame, orderIdAt - 2, 14);
  // Fig. 9's payoff: the join, showing every order with the city it now has.
  const JOIN_COLS = 3;
  const joined = CITY_JOIN.rows.map((r) => r.slice(0, JOIN_COLS));
  const jg = tableGeometry({ x: JOIN_X, top: y(ERD_Y), cols: CITY_JOIN.cols.slice(0, JOIN_COLS), rows: joined, headH: h(HEAD_H), rowH: h(ROW_H) });
  const oxford = joined.map((r, i) => (r[2] === NEW_CITY ? i : -1)).filter((i) => i >= 0);
  const orderSwell = Math.max(pulse(frame, orderIdAt, 24), pulse(frame, orderAt, 24));
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

      <Headline kicker="Third normal form" lead="A dependency" turn="with a detour." at={from - 6} turnAt={givesAt - 4} underlineAt={transitiveAt} />

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
          <Svg opacity={bracketIn}>
            <path
              d={`M${bracketL},${bracketY + 10} L${bracketL},${bracketY} L${bracketR},${bracketY} L${bracketR},${bracketY + 10}`}
              fill="none"
              stroke={KEY}
              strokeWidth={2.6}
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray={`${bracketIn} 1`}
            />
          </Svg>
          <Ink at={orderIdAt - 2} dur={12} style={{ left: g.x + 4, top: g.top - 104, whiteSpace: "nowrap" }}>
            <span style={label(21, BLUE_INK)}>the key</span>
          </Ink>
          {/* What the narration says about the city, in the right column
              until the update's listing takes its place. */}
          <Note at={customerAt + 6} out={adaAt - 10} x={RIGHT} y={g.top}>
            <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
              <Mono>customer_city</Mono> is a fact about the customer
            </span>
          </Note>

          {/* order_id gives customer_id, which gives the city: one path, both
              legs over the titles. */}
          <DepArrow from={[center(K.order), bracketY]} to={[center(K.customer) - 14, g.top - 6]} level={g.top - 44} at={givesAt - 2} color={BLUE_INK} />
          <DepArrow from={[center(K.customer) + 14, g.top - 6]} to={[center(K.city), g.top - 6]} level={g.top - 82} at={cityToo - 4} color={ACCENT} />
          {/* The name hangs off customer_id too (the lesson draws both); it is
              not the path being followed, so it goes underneath, quietly. */}
          <DepArrow
            from={[center(K.customer), bottom + 8]}
            to={[center(K.name), bottom + 6]}
            level={bottom + 50}
            at={cityToo + 8}
            color={INK_SOFT}
            width={2}
          />
          {/* The same path written out, and named. */}
          <Notation
            x={RIGHT}
            y={g.top - 150}
            parts={[
              // "The key is the order ID": the path starts from the key.
              { text: CITY_BAD.cols[K.order], at: orderIdAt + 4 },
              { arrow: BLUE_INK, at: givesAt + 4 },
              { text: CITY_BAD.cols[K.customer], at: givesAt + 10 },
              { arrow: ACCENT, at: cityToo - 2 },
              { text: CITY_BAD.cols[K.city], at: cityToo + 4 },
            ]}
          />
          <Ink at={transitiveAt - 2} dur={14} style={{ left: RIGHT, top: g.top - 98, whiteSpace: "nowrap" }}>
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
          <Note at={onceAt + 18} x={X0 + 470} y={customers.bottom + 106}>
            <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
              and {oxford.length === 2 ? "both" : `all ${oxford.length}`} of her orders now show {NEW_CITY}
            </span>
          </Note>

          {/* The orders, joined to their customer: Ada's two say Oxford. */}
          <Ink at={onceAt + 2} dur={12} style={{ left: jg.x, top: jg.top - 44, whiteSpace: "nowrap" }}>
            <span style={label(22, INK_SOFT)}>orders joined to customers</span>
          </Ink>
          <DbTable
            g={jg}
            cols={CITY_JOIN.cols.slice(0, JOIN_COLS)}
            rows={joined.map((cells, i) => ({ cells, at: onceAt + 6 + i * 4 }))}
            at={onceAt + 2}
            numeric={[0]}
            marks={oxford.map((row, k) => ({ row, col: 2, at: onceAt + 18 + k * 5, color: MARK }))}
          />
        </Fade>
      </Drift>
    </AbsoluteFill>
  );
};
