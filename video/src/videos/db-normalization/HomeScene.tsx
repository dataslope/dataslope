import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Entity, Relation, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CUSTOMERS, F, FLAT, JOINED, MUG, ORDERS, PRODUCTS, SPLIT_TAGS } from "./data";
import { DbTable, Fig, FIG_Y, HEAD_H, Headline, KEY, KEY_INK, MARK_KEY, Mono, ROW_H, tableGeometry, X0 } from "./kit";
import { Drift, Fade, InlineArrow, Reply, Svg } from "./parts";

const ENTITY_Y = 340;
const DATA_Y = 566;
const CX = X0;
const OX = 760;
const PX = 1420;
const JOIN_X = 520;
const JOIN_Y = 600;
/** Where Fig. 1's table waits while the rule is stated. */
const FLAT_Y = 404;
const LADDER_Y = 836;

/** The normal forms, by name only: what 2NF and 3NF ask for is the oath's job. */
const LADDER = ["1NF", "2NF", "3NF"] as const;

/** orders_flat's columns, grouped by the table each one moves to. */
const HOMES = [
  { name: "orders", cols: [F.id] },
  { name: "customers", cols: [F.name, F.email] },
  { name: "products", cols: [F.product, F.price] },
] as const;

/**
 * The cure: customers, products and orders each in their own table (the
 * lesson's erDiagram), with the rows the flat table held; the update, the
 * new product and the cancelled order each touch one row, and a join gives
 * the wide view back.
 */
export const HomeScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("home").from;
  const ruleAt = n.word("home", "rule");
  const everyAt = n.word("home", "Every fact");
  const homeAt = n.word("home", "one home");
  const customersAt = n.word("tables", "Customers");
  const productsAt = n.word("tables", "products");
  const ordersAt = n.word("tables", "each order");
  const pointsAt = n.word("tables", "points");
  const bothAt = n.word("tables", "both");
  const adaAt = n.word("once", "Ada's email");
  const changeAt = n.word("once", "change");
  const mugAt = n.word("once", "mug");
  const waitAt = n.word("once", "wait");
  const graceAt = n.word("once", "Grace");
  const outlivesAt = n.word("once", "outlives");
  const wideAt = n.word("join", "wide view");
  const joinAt = n.word("join", "join");
  const anyAt = n.word("join", "any time");
  const formsAt = n.word("forms-in", "Normal forms");
  const stepsAt = n.word("forms-in", "steps");
  const cellAt = n.word("forms-in", "cell");
  const end = n.beat("forms-in").to;

  const customers = useEntityLayout({
    x: CX,
    y: y(ENTITY_Y),
    width: 360,
    name: "customers",
    columns: [
      { name: "id", type: "integer", key: "PK" },
      { name: "name", type: "text" },
      { name: "email", type: "text" },
    ],
  });
  const orders = useEntityLayout({
    x: OX,
    y: y(ENTITY_Y),
    width: 400,
    name: "orders",
    columns: [
      { name: "id", type: "integer", key: "PK" },
      { name: "customer_id", type: "integer", key: "FK" },
      { name: "product_id", type: "integer", key: "FK" },
    ],
  });
  const products = useEntityLayout({
    x: PX,
    y: y(ENTITY_Y),
    width: 360,
    name: "products",
    columns: [
      { name: "id", type: "integer", key: "PK" },
      { name: "name", type: "text" },
      { name: "price", type: "numeric" },
    ],
  });
  const c = customers.anchor("right", "id");
  const oc = orders.anchor("left", "customer_id");
  const p = products.anchor("left", "id");
  const op = orders.anchor("right", "product_id");
  const cMid = (c[0] + oc[0]) / 2;
  const pMid = (p[0] + op[0]) / 2;

  const data = (x: number, t: { cols: readonly string[]; rows: readonly (readonly (string | null)[])[] }, extra: (string | null)[][] = []) =>
    tableGeometry({ x, top: y(DATA_Y), cols: t.cols, rows: t.rows, extra, headH: h(HEAD_H), rowH: h(ROW_H) });
  const cg = data(CX, CUSTOMERS, [[null, null, JOINED.rows[0][2]]]);
  const og = data(OX, ORDERS);
  const pg = data(PX, PRODUCTS, [[...MUG]]);
  const grace = CUSTOMERS.rows.findIndex((r) => r[1] === "Grace");
  const graceOrder = ORDERS.rows.findIndex((r) => r[1] === CUSTOMERS.rows[grace][0]);
  const jg = tableGeometry({ x: JOIN_X, top: y(JOIN_Y), cols: JOINED.cols, rows: JOINED.rows, headH: h(HEAD_H), rowH: h(ROW_H) });
  const fg = tableGeometry({ x: X0, top: y(FLAT_Y), cols: FLAT.cols, rows: FLAT.rows, headH: h(HEAD_H), rowH: h(ROW_H) });
  // Fig. 1 holds the page while the rule is stated, and gives way to the
  // three tables its columns become.
  const flatOut = customersAt - 14;

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={customersAt} level={-30} />
      <Sfx name="el-pencil" at={pointsAt} level={-34} />
      <Sfx name="el-pencil" at={bothAt - 2} level={-35} />
      <Sfx name="el-tap" at={changeAt + 2} level={-28} />
      <Sfx name="el-whoosh" at={joinAt - 6} level={-33} />
      <Sfx name="el-sprinkle" at={stepsAt} level={-34} />

      <Sfx name="el-pencil" at={everyAt} level={-35} />
      <Headline kicker="Why normalize" lead="One fact," turn="one home." at={from - 6} turnAt={ruleAt} underlineAt={homeAt} />

      <Drift from={from} to={end + 40} amount={0.012} origin="50% 40%">
        {/* The flat table once more, its columns grouped by the home each
            fact gets: those groups are the three tables that follow. */}
        <Fade out={flatOut}>
          <Fig n="1" at={from - 30} y={y(FIG_Y)}>
            <Mono>orders_flat</Mono>, every fact in one table
          </Fig>
          <DbTable
            g={fg}
            cols={FLAT.cols}
            rows={FLAT.rows.map((cells) => ({ cells, at: from - 30 }))}
            at={from - 30}
            numeric={[F.id, F.price]}
          />
          {HOMES.map((home, k) => {
            const first = home.cols[0];
            const last = home.cols[home.cols.length - 1];
            return (
              <HomeBracket
                key={home.name}
                name={home.name}
                x0={fg.xs[first] + 8}
                x1={fg.xs[last] + fg.widths[last] - 8}
                y={fg.top - 14}
                at={everyAt + 4 + k * 8}
              />
            );
          })}
        </Fade>

        <Fig n="2" at={customersAt - 6} y={y(FIG_Y)}>
          The same facts, each stored once
        </Fig>

        {/* The three tables, as they are named, and the lines between them. */}
        <Entity layout={customers} at={customersAt - 4} dim={wideAt} marks={{ email: { at: adaAt, out: wideAt } }} />
        <Entity layout={products} at={productsAt - 4} dim={wideAt} />
        <Entity
          layout={orders}
          at={ordersAt - 4}
          dim={wideAt}
          marks={{ customer_id: { at: pointsAt, tone: "key", out: wideAt }, product_id: { at: bothAt, tone: "key", out: wideAt } }}
        />
        <Relation
          name="customers places orders"
          points={[c, [cMid, c[1]], [cMid, oc[1]], oc]}
          from="exactly-one"
          to="zero-or-many"
          at={pointsAt}
          label="places"
          dim={wideAt}
        />
        <Relation
          name="products contains orders"
          points={[p, [pMid, p[1]], [pMid, op[1]], op]}
          from="exactly-one"
          to="zero-or-many"
          at={bothAt - 2}
          label="contains"
          dim={wideAt}
        />

        {/* Their rows, and the three changes, one row each, held until the
            join is asked for. */}
        <Fade out={joinAt - 16}>
          <DbTable
            g={cg}
            cols={CUSTOMERS.cols}
            rows={CUSTOMERS.rows.map((cells, i) => ({ cells, at: customersAt + 6 + i * 5 }))}
            at={customersAt + 2}
            numeric={[0]}
            colInk={{ 0: KEY_INK }}
            marks={[{ row: 0, col: 2, at: adaAt + 2 }]}
            swaps={[{ row: 0, col: 2, at: changeAt, value: JOINED.rows[0][2] ?? "", color: ACCENT_INK }]}
            bands={[{ row: grace, at: outlivesAt }]}
          />
          <DbTable
            g={pg}
            cols={PRODUCTS.cols}
            rows={[
              ...PRODUCTS.rows.map((cells, i) => ({ cells, at: productsAt + 6 + i * 5 })),
              { cells: MUG, at: mugAt, grow: true },
            ]}
            at={productsAt + 2}
            numeric={[0, 2]}
            colInk={{ 0: KEY_INK }}
            bands={[{ row: PRODUCTS.rows.length, at: waitAt }]}
          />
          <DbTable
            g={og}
            cols={ORDERS.cols}
            rows={ORDERS.rows.map((cells, i) => ({
              cells,
              at: ordersAt + 6 + i * 5,
              ...(i === graceOrder ? { strikeAt: graceAt, collapseAt: graceAt + 18 } : {}),
            }))}
            at={ordersAt + 2}
            numeric={[0, 1, 2]}
            colInk={{ 0: KEY_INK, 1: KEY_INK, 2: KEY_INK }}
            marks={[
              ...ORDERS.rows.map((_, i) => ({ row: i, col: 1, at: pointsAt + 4 + i * 3, color: MARK_KEY })),
              ...ORDERS.rows.map((_, i) => ({ row: i, col: 2, at: bothAt + 2 + i * 3, color: MARK_KEY })),
            ]}
          />
          <Reply at={changeAt + 2} x={cg.x} y={cg.bottom(CUSTOMERS.rows.length) + 16}>
            {SPLIT_TAGS.update}
          </Reply>
          <Reply at={waitAt - 2} x={pg.x} y={pg.bottom(PRODUCTS.rows.length + 1) + 16}>
            {SPLIT_TAGS.insert}
          </Reply>
          {/* After Grace's order has closed up, so the chip sits under the new rule. */}
          <Reply at={graceAt + 34} x={og.x} y={og.bottom(ORDERS.rows.length - 1) + 16}>
            {SPLIT_TAGS.delete}
          </Reply>
        </Fade>

        {/* The wide view, computed when it is asked for. */}
        <Ink at={joinAt - 6} dur={14} style={{ left: jg.x, top: jg.top - 44, whiteSpace: "nowrap" }}>
          <span style={label(22, INK_SOFT)}>orders joined to customers and products</span>
        </Ink>
        <DbTable
          g={jg}
          cols={JOINED.cols}
          rows={JOINED.rows.map((cells, i) => ({ cells, at: joinAt + 4 + i * 5 }))}
          at={joinAt - 2}
          numeric={[0, 4]}
        />
        <Note at={anyAt} x={jg.x + jg.width + 40} y={jg.rowMid(0) - 16}>
          <div style={{ ...note(22, INK), whiteSpace: "nowrap" }}>Rebuilt by a join,</div>
          <div style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>stored nowhere.</div>
        </Note>

        {/* The path the normal forms take, starting with one cell: the
            names only, since only the first is explained here. */}
        <Ink at={formsAt - 2} dur={14} style={{ left: X0, top: y(LADDER_Y) - 40, whiteSpace: "nowrap" }}>
          <span style={label(21, INK_SOFT)}>The normal forms</span>
        </Ink>
        <div style={{ position: "absolute", left: X0 - 12, top: y(LADDER_Y), display: "flex", alignItems: "center", gap: 16 }}>
          {LADDER.map((name, k) => (
            <React.Fragment key={name}>
              {k > 0 ? <InlineArrow at={stepsAt + k * 6 - 2} /> : null}
              <Ink at={stepsAt + k * 6} dur={14} style={{ position: "relative" }}>
                <Step name={name} litAt={k === 0 ? cellAt : undefined} />
              </Ink>
            </React.Fragment>
          ))}
        </div>
      </Drift>
    </AbsoluteFill>
  );
};

/**
 * One normal form on the path. The first is lit as the narration reaches it,
 * a wash and an outline, with what it asks for set under it, so lighting it
 * moves nothing beside it.
 */
const Step: React.FC<{ name: string; litAt?: number }> = ({ name, litAt }) => {
  const frame = useCurrentFrame();
  const lit = litAt === undefined ? 0 : ease(frame, litAt - 2, 12);
  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        padding: "2px 12px",
        borderRadius: 6,
        border: `1.5px solid color-mix(in srgb, ${INK} ${Math.round(lit * 100)}%, transparent)`,
        background: `color-mix(in srgb, ${BAR} ${Math.round(lit * 14)}%, transparent)`,
      }}
    >
      <span style={{ ...label(26, lit > 0 ? BLUE_INK : INK), fontWeight: 700 }}>{name}</span>
      {litAt !== undefined ? (
        <span style={{ position: "absolute", left: 12, top: "100%", marginTop: 10, ...note(21, INK_SOFT), whiteSpace: "nowrap", opacity: lit }}>
          one value per cell
        </span>
      ) : null}
    </span>
  );
};

/** A bracket over a group of columns, drawn in from both ends to meet in the
 *  middle, named for the table those columns move to. */
const HomeBracket: React.FC<{ name: string; x0: number; x1: number; y: number; at: number }> = ({ name, x0, x1, y, at }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  if (p <= 0) return null;
  const mid = (x0 + x1) / 2;
  return (
    <>
      <Svg>
        <path
          d={`M${x0},${y + 10} L${x0},${y} L${mid + (x0 - mid) * (1 - p)},${y} M${x1},${y + 10} L${x1},${y} L${mid + (x1 - mid) * (1 - p)},${y}`}
          fill="none"
          stroke={KEY}
          strokeWidth={2.6}
          strokeLinejoin="round"
          opacity={p}
        />
      </Svg>
      <Ink at={at + 4} dur={12} style={{ left: x0, top: y - 40, whiteSpace: "nowrap" }}>
        <span style={{ ...label(22, BLUE_INK) }}>
          <Mono>{name}</Mono>
        </span>
      </Ink>
    </>
  );
};
