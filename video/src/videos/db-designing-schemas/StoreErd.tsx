import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { Pt } from "../../components/arrow";
import { ease } from "../../components/motion";
import { Entity, Relation, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, body, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { STORE } from "./data";
import { Chip, GhostRow, KEY, PathArrow, rowBox, RowWash } from "./parts";

/** The store's diagram on the page: two rows of three boxes, in layout units. */
export const STORE_TOP = 320;
export const STORE_BOTTOM = 590;
export const STORE_X = [110, 545, 980] as const;
export const STORE_W = 330;
/** Where the line from products up to order_items runs, right of both. */
const SIDE_X = 1370;

/** The six boxes and every line between them, laid out once for both scenes
 *  that draw the store (the build in Part 2, and its return at the end). */
export function useStoreLayout() {
  const { y } = useLayout();
  const top = y(STORE_TOP);
  const bottom = y(STORE_BOTTOM);
  const customers = useEntityLayout({ x: STORE_X[0], y: top, width: STORE_W, ...STORE.customers });
  const orders = useEntityLayout({ x: STORE_X[1], y: top, width: STORE_W, ...STORE.orders });
  const orderItems = useEntityLayout({ x: STORE_X[2], y: top, width: STORE_W, ...STORE.orderItems });
  const categories = useEntityLayout({ x: STORE_X[0], y: bottom, width: STORE_W, ...STORE.categories });
  const productCategories = useEntityLayout({ x: STORE_X[1], y: bottom, width: STORE_W, ...STORE.productCategories });
  const products = useEntityLayout({ x: STORE_X[2], y: bottom, width: STORE_W, ...STORE.products });

  const gapMid = (STORE_X[0] + STORE_W + STORE_X[1]) / 2;
  const c = customers.anchor("right", "id");
  const o = orders.anchor("left", "customer_id");
  const cat = categories.anchor("right", "id");
  const pcCat = productCategories.anchor("left", "category_id");
  const pId = products.anchor("right", "id");
  const oiP = orderItems.anchor("right", "product_id");
  const lines = {
    places: [c, [gapMid, c[1]], [gapMid, o[1]], o] as Pt[],
    /** The same route the other way: a customer ID pointing at its row. */
    pointer: [o, [gapMid, o[1]], [gapMid, c[1]], [c[0] + 2, c[1]]] as Pt[],
    contains: [orders.anchor("right", "id"), orderItems.anchor("left", "order_id")] as Pt[],
    sold: [pId, [SIDE_X, pId[1]], [SIDE_X, oiP[1]], oiP] as Pt[],
    classified: [products.anchor("left", "id"), productCategories.anchor("right", "product_id")] as Pt[],
    groups: [cat, [gapMid, cat[1]], [gapMid, pcCat[1]], pcCat] as Pt[],
    /** Many to many, before a table resolves it. */
    catProd: [categories.anchor("right"), products.anchor("left")] as Pt[],
    ordProd: [orders.anchor("right"), [products.anchor("top")[0], orders.anchor("right")[1]], products.anchor("top")] as Pt[],
  };
  return { customers, orders, orderItems, categories, productCategories, products, lines };
}

export type StoreLayout = ReturnType<typeof useStoreLayout>;

/**
 * Part 2's diagram, built as the narration walks the steps: the four nouns'
 * boxes (step two), their facts (three), the key instead of a copied email,
 * the lines and the two tables that resolve many to many (four), the keys
 * (five), the quantity rule (six), and the copied price (seven). It lives in
 * a layer over the Part 2 scenes, so it never cross-fades with itself; for
 * the price figure the four boxes not holding a price leave the page.
 */
export const StoreErd: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const L = useStoreLayout();
  const { lines } = L;
  const { y } = useLayout();

  // ── Cues ──
  const customersAt = n.word("entities", "customers");
  const productsAt = n.word("entities", "products");
  const categoriesAt = n.word("entities", "categories");
  const ordersAt = n.word("entities", "orders");
  const eachFactAt = n.word("facts", "each fact");
  const emailAt = n.word("facts", "email");
  const priceAt = n.word("facts", "price");
  const copyAt = n.word("pointer", "copy");
  const emailNoAt = n.word("pointer", "email");
  const pointsAt = n.word("pointer", "points");
  const onePlaceAt = n.word("pointer", "one place");
  const placesAt = n.word("relate", "places");
  const manyOrdersAt = n.word("relate", "many orders");
  const exactlyAt = n.word("relate", "exactly one");
  const eachOrderAt = n.word("relate", "each order");
  const bothSidesAt = n.word("pairs", "both sides");
  const pairsAt = n.word("pairs", "pairs");
  const pcAt = n.word("pairs", "product categories");
  const manyTooAt = n.word("hidden", "many to many");
  const ownAt = n.word("hidden", "facts of its own");
  const howManyAt = n.word("hidden", "how many");
  const whatPriceAt = n.word("hidden", "what price");
  const itemsAt = n.word("items", "order items");
  const receiptAt = n.word("items", "receipt");
  const keysAt = n.word("keys", "keys");
  const pairAt = n.word("keys", "pair");
  const quantityAt = n.word("rules", "quantity");
  const zeroAt = n.word("rules", "zero mugs");
  const everyFactAt = n.word("copy", "every fact");
  const copiesAt = n.word("copy", "copies one fact");
  const todayAt = n.word("then", "today");
  const chargedAt = n.word("then", "charged");
  const leaveAt = n.beat("mug").from - 4;
  const rowAtCue = n.word("pointer", "customer's row");
  const howManyA = n.word("relate", "how many");
  const howManyB = n.word("relate", "how many", { nth: 2 });
  const meetAt = n.word("pairs", "meet");
  const itselfAt = n.word("rules", "itself");
  const all = (e: { columns: readonly unknown[] }) => e.columns.map((_, i) => i);
  const KEY_WASH = `color-mix(in srgb, var(--ds-blue-300) 55%, ${PAPER})`;
  const BAD_WASH = `color-mix(in srgb, var(--ds-red-300) 55%, ${PAPER})`;

  // The boxes that hold no price set back on "copies", and leave for the figure.
  const setBack = copiesAt;
  const fx = (k: number) => ({ dim: setBack, out: leaveAt + k * 2 });

  const keyMark = (i: number) => ({ at: keysAt + i * 4, tone: "key" as const, out: pairAt + 30 });

  const ownIn = ease(frame, ownAt - 4, 14) * (1 - ease(frame, itemsAt - 2, 10));
  const slot = L.orderItems;

  return (
    <AbsoluteFill>
      {/* ── Sound: boxes landing, lines drawn, the junctions ── */}
      {[customersAt, productsAt, categoriesAt, ordersAt].map((t, i) => (
        <Sfx key={i} name="el-tap" at={t} level={-29} />
      ))}
      <Sfx name="el-sprinkle" at={eachFactAt} level={-34} />
      <Sfx name="el-pencil" at={pointsAt} level={-34} />
      <Sfx name="el-pencil" at={placesAt} level={-33} />
      <Sfx name="el-pop" at={pcAt} level={-29} />
      <Sfx name="el-pop" at={itemsAt} level={-29} />
      <Sfx name="el-pencil" at={itemsAt + 10} level={-35} />
      <Sfx name="el-sprinkle" at={keysAt} level={-34} />
      <Sfx name="el-whoosh" at={leaveAt} level={-34} />

      <FigLabel n="1" title="The store's schema, one step at a time" at={n.beat("entities").from - 2} x={STORE_X[0]} y={y(262)} out={leaveAt} />

      {/* ── The boxes ── */}
      <Entity
        layout={L.customers}
        at={customersAt - 4}
        rowAt={{ id: customersAt + 4, email: emailAt - 2, full_name: emailAt + 5 }}
        marks={{ id: keyMark(0), email: { at: onePlaceAt, tone: "note", out: onePlaceAt + 34 } }}
        {...fx(0)}
      />
      <Entity
        layout={L.products}
        at={productsAt - 4}
        rowAt={{ id: productsAt + 4, name: priceAt - 8, current_price: priceAt }}
        marks={{ id: keyMark(3), current_price: { at: copiesAt + 4, tone: "note" } }}
      />
      <Entity
        layout={L.categories}
        at={categoriesAt - 4}
        rowAt={{ id: categoriesAt + 4, name: eachFactAt + 4 }}
        marks={{ id: keyMark(4) }}
        {...fx(1)}
      />
      <Entity
        layout={L.orders}
        at={ordersAt - 4}
        rowAt={{ id: ordersAt + 4, status: eachFactAt + 10, customer_id: pointsAt - 2 }}
        marks={{ id: keyMark(1), customer_id: { at: pointsAt + 4, tone: "key", out: placesAt + 10 } }}
        {...fx(2)}
      />
      {/* The copy an order does not keep: the customer's email. */}
      <GhostRow e={L.orders} index={3} name="email" at={copyAt - 6} strikeAt={emailNoAt + 4} out={pointsAt + 6} />
      <PathArrow points={lines.pointer} at={pointsAt + 2} dur={18} out={placesAt} color={KEY} width={2.6} radius={12} />

      {/* ── Step four: one customer, many orders ── */}
      <Relation
        name="customers places orders"
        points={lines.places}
        from="exactly-one"
        to="zero-or-many"
        at={placesAt - 2}
        label="places"
        labelPos={[L.customers.right + 10, lines.places[0][1] - 38]}
        {...fx(0)}
      />
      {/* "Many orders", "each order", "exactly one customer": each side lit as it is named. */}
      <RowWash e={L.orders} rows={all(L.orders)} at={manyOrdersAt - 2} out={manyOrdersAt + 24} />
      <RowWash e={L.orders} rows={[1]} at={eachOrderAt - 2} out={exactlyAt + 30} color={KEY_WASH} />
      <RowWash e={L.customers} rows={all(L.customers)} at={exactlyAt - 2} out={exactlyAt + 30} />

      {/* Products and categories: many on both sides, until a table of pairs meets them. */}
      <Relation
        name="categories many-to-many products"
        points={lines.catProd}
        from="many"
        to="many"
        at={bothSidesAt - 4}
        out={pcAt + 4}
      />
      <Entity
        layout={L.productCategories}
        at={pcAt - 2}
        rowGap={6}
        marks={{ product_id: { at: pairsAt + 30, tone: "key", out: pairsAt + 70 }, category_id: { at: pairsAt + 34, tone: "key", out: pairsAt + 70 } }}
        {...fx(1)}
      />
      <Relation name="products classified" points={lines.classified} from="exactly-one" to="zero-or-many" at={pcAt + 8} {...fx(1)} />
      <Relation name="categories group" points={lines.groups} from="exactly-one" to="zero-or-many" at={pcAt + 12} {...fx(1)} />

      {/* Orders and products: many to many too, with facts of their own. */}
      <Relation
        name="orders many-to-many products"
        points={lines.ordProd}
        from="many"
        to="many"
        at={manyTooAt - 4}
        out={ownAt - 4}
      />
      {ownIn > 0 ? (
        <div
          style={{
            position: "absolute",
            left: slot.left,
            top: slot.top,
            width: slot.width,
            height: slot.height,
            boxSizing: "border-box",
            border: `2px dashed ${INK_SOFT}`,
            borderRadius: 6,
            background: `color-mix(in srgb, ${PAPER} 80%, transparent)`,
            opacity: ownIn,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
          }}
        >
          <span style={{ ...label(22, INK_SOFT) }}>facts of the link</span>
          <span style={{ opacity: ease(frame, howManyAt - 2, 10), transform: `translateY(${(1 - ease(frame, howManyAt - 2, 10)) * 8}px)` }}>
            <Chip>how many</Chip>
          </span>
          <span style={{ opacity: ease(frame, whatPriceAt - 2, 10), transform: `translateY(${(1 - ease(frame, whatPriceAt - 2, 10)) * 8}px)` }}>
            <Chip>at what price</Chip>
          </span>
        </div>
      ) : null}
      <Entity
        layout={L.orderItems}
        at={itemsAt - 2}
        rowGap={6}
        marks={{
          quantity: { at: receiptAt - 6, tone: "note", out: receiptAt + 30 },
          unit_price: { at: receiptAt - 2, tone: "note", out: receiptAt + 30 },
          order_id: { at: pairAt, tone: "key" },
          product_id: { at: pairAt + 3, tone: "key" },
        }}
        dim={undefined}
      />
      <QuantityMark e={L.orderItems} at={quantityAt} out={copiesAt} zeroAt={zeroAt} />
      <RowWash e={L.orderItems} rows={[3]} at={copiesAt + 8} />
      <Relation name="orders contain order_items" points={lines.contains} from="exactly-one" to="zero-or-many" at={itemsAt + 10} {...fx(2)} />
      <Relation name="products sold as order_items" points={lines.sold} from="exactly-one" to="zero-or-many" at={itemsAt + 16} />

      {/* "It points at the customer's row". */}
      <RowWash e={L.customers} rows={[0]} at={rowAtCue - 2} out={placesAt - 6} color={KEY_WASH} />
      {/* "How many connect to how many?": each side lit as it is asked. */}
      <RowWash e={L.customers} rows={all(L.customers)} at={howManyA - 2} out={howManyA + 22} />
      <RowWash e={L.orders} rows={all(L.orders)} at={howManyB - 2} out={howManyB + 22} />
      {/* "So they meet in a table": the two sides lit before the table arrives between them. */}
      <RowWash e={L.products} rows={all(L.products)} at={meetAt - 4} out={pcAt + 10} />
      <RowWash e={L.categories} rows={all(L.categories)} at={meetAt} out={pcAt + 10} />
      {/* "Refused by Postgres itself": the rule's row, struck in the accent. */}
      <RowWash e={L.orderItems} rows={[2]} at={itselfAt - 4} out={copiesAt} color={BAD_WASH} />

      {/* "Every fact in one place": each box's facts lit in turn. */}
      {[L.customers, L.orders, L.categories, L.products].map((e, k) => (
        <RowWash key={k} e={e} rows={e.columns.map((_, i) => i).filter((i) => i > 0)} at={everyFactAt + k * 4} out={everyFactAt + k * 4 + 24} />
      ))}

      {/* ── Step seven: the one fact kept twice, tagged inside its rows (the rail is beside them) ── */}
      <Note at={todayAt - 2} x={L.products.right - 14} y={rowBox(L.products, 2).mid - 16} align="right" from="right" out={leaveAt + 40}>
        <span style={{ ...body(24, true), color: ACCENT_INK, whiteSpace: "nowrap" }}>today</span>
      </Note>
      <Note at={chargedAt - 2} x={L.orderItems.right - 14} y={rowBox(L.orderItems, 3).mid - 16} align="right" from="right" out={leaveAt + 40}>
        <span style={{ ...body(24, true), color: ACCENT_INK, whiteSpace: "nowrap" }}>then</span>
      </Note>
    </AbsoluteFill>
  );
};

/** The quantity rule: the row washed in the accent, and "> 0" beside it. */
const QuantityMark: React.FC<{ e: ReturnType<typeof useStoreLayout>["orderItems"]; at: number; out: number; zeroAt: number }> = ({
  e,
  at,
  out,
  zeroAt,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at - 2, 12);
  const o = ease(frame, out, 12);
  if (p <= 0 || o >= 1) return null;
  const r = rowBox(e, 2);
  const shake = Math.sin((frame - zeroAt) * 1.6) * 4 * Math.max(0, 1 - (frame - zeroAt) / 14) * (frame >= zeroAt ? 1 : 0);
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: e.left + 3,
          top: r.top + 3,
          width: (e.width - 6) * p,
          height: e.row - 6,
          border: `2px solid ${ACCENT}`,
          boxSizing: "border-box",
          borderRadius: 4,
          opacity: 1 - o,
          transform: `translateX(${shake}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: e.right - 74,
          top: r.mid - 15,
          ...note(22, "var(--ds-red-ink)"),
          fontWeight: 700,
          opacity: p * (1 - o),
          whiteSpace: "nowrap",
        }}
      >
        &gt; 0
      </div>
    </>
  );
};

