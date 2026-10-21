import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Entity, Relation, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, body, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { NOTE_TEXT, NOTEBOOK, NOTEBOOK_NAME, OTHERS, SHOP } from "./data";
import { DbTable, Drift, FIG_Y, FigKey, Headline, KEY, Kicker, LISTING_PAPER, Mark, MARK_BAD, tableGeometry, X0 } from "./parts";

const TOP = 340;
const LOW_FIG = 640;
const LOW_Y = 690;
const CARD_X = 800;
/** The four boxes, narrow enough to leave each line room for its verb. */
const BOX = {
  customers: { x: X0, width: 290 },
  orders: { x: 543, width: 330 },
  items: { x: 1006, width: 380 },
  products: { x: 1520, width: 280 },
};
const RIGHT = BOX.products.x + BOX.products.width;
/** A relationship's verb, centred over the gap its line crosses, above the line. */
const VERB_W = { places: 60, holds: 52, "appears in": 108 } as const;

const firstName = (who: string) => who.split(" ")[0];
const times = (k: number) => (k === 1 ? "once" : k === 2 ? "twice" : `${k} times`);

/** The lesson's list of what the free-text version would take, one every
 *  CHORE_STEP frames from "notebooks", so each can be read before the next. */
const PROJECT = ["parse the text", "handle misspellings", "notebook or notebooks?", "clean up old rows"] as const;
const CHORE_STEP = 18;

/**
 * Part 3 opens: which customers bought a notebook? In the lesson's clean
 * schema it is a walk along keys the design already drew, and one name comes
 * back; stored as a sentence, the same question becomes a project.
 */
export const JoinScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const askFrom = n.beat("ask").from;
  const customersAt = n.word("ask", "customers");
  const notebookAt = n.word("ask", "notebook");
  const ordersAt = n.word("walk", "orders");
  const itemsAt = n.word("walk", "items");
  const ownTablesAt = n.word("walk", "tables");
  const walkAt = n.word("walk", "walk");
  const linksAt = n.word("walk", "links");
  const drewAt = n.word("walk", "drew");
  const nameAt = n.word("answer", "name");
  const adaAt = n.word("answer", "Ada");
  const sentenceAt = n.word("sentence", "sentence");
  const notebooksAt = n.word("sentence", "notebooks");
  const projectAt = n.word("sentence", "project");
  const end = n.beat("gate").from;

  const customers = useEntityLayout({ ...BOX.customers, y: y(TOP), name: "customers", columns: SHOP.customers });
  const orders = useEntityLayout({ ...BOX.orders, y: y(TOP), name: "orders", columns: SHOP.orders });
  const items = useEntityLayout({ ...BOX.items, y: y(TOP), name: "order_items", columns: SHOP.items });
  const products = useEntityLayout({ ...BOX.products, y: y(TOP), name: "products", columns: SHOP.products });

  const c = customers.anchor("right", "id");
  const o = orders.anchor("left", "customer_id");
  const oId = orders.anchor("right", "id");
  const iOrder = items.anchor("left", "order_id");
  const p = products.anchor("left", "id");
  const iProduct = items.anchor("right", "product_id");
  const jog1 = (c[0] + o[0]) / 2;
  const jog3 = (iProduct[0] + p[0]) / 2;
  const verbAt = (verb: keyof typeof VERB_W, gapMid: number, lineY: number): [number, number] => [gapMid - VERB_W[verb] / 2, lineY - 48];

  // The walk: each link draws in turn, and the keys it joins on light up.
  const step = Math.max(6, Math.round((drewAt - walkAt) / 3));
  const link = (k: number) => walkAt - 4 + k * step;
  const lowered = ease(frame, sentenceAt - 6, 18);
  const g = tableGeometry({ x: X0, top: y(LOW_Y), cols: NOTEBOOK.cols, rows: NOTEBOOK.rows, headH: h(48), rowH: h(56) });
  const parts = NOTE_TEXT.split(/(notebooks)/);

  return (
    <AbsoluteFill>
      {/* ── Sound: the entities, each link, the one row, the sentence and its chores ── */}
      <Sfx name="el-tap" at={customersAt - 2} level={-30} />
      <Sfx name="el-tap" at={notebookAt - 2} level={-30} />
      <Sfx name="el-pencil" at={link(0)} level={-35} />
      <Sfx name="el-pop" at={adaAt - 4} level={-29} />
      <Sfx name="el-whoosh" at={sentenceAt - 6} level={-34} />
      <Sfx name="el-tap" at={notebooksAt + 8} level={-30} />

      <Kicker at={askFrom - 10}>What design buys</Kicker>
      <Headline lead="Which customers" turn="bought a notebook?" at={askFrom - 6} turnAt={notebookAt - 6} size={72} />

      <Drift from={askFrom} to={end} amount={0.016} origin="50% 40%">
        <div style={{ position: "absolute", inset: 0, opacity: 1 - lowered * 0.5 }}>
          {/* Another shop's data: the same names as Fig. 1, other orders. */}
          <FigLabel n="4" title="Another shop, as four tables" at={customersAt - 6} x={X0} y={y(FIG_Y)} />
          <FigKey
            right={RIGHT}
            top={y(FIG_Y)}
            entries={[
              { badge: "PK", text: "the row's identity", at: customersAt + 4 },
              { badge: "UK", text: "unique", at: ownTablesAt },
              { badge: "FK", text: "points at another table", at: ordersAt },
              { badge: "PK, FK", text: "both: the pair is the identity", at: itemsAt + 4 },
            ]}
          />
          <Entity
            layout={customers}
            at={customersAt - 2}
            marks={{
              id: { at: link(0), tone: "key" },
              name: { at: adaAt - 2, tone: "note" },
              email: { at: ownTablesAt, tone: "note", out: walkAt },
            }}
          />
          {/* Part 1's anomaly, cured: the email lives in one row. */}
          <Note at={ownTablesAt + 4} x={customers.left} y={customers.bottom + 16}>
            <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>Each email, stored once</span>
          </Note>
          <Entity
            layout={orders}
            at={ordersAt - 2}
            marks={{ customer_id: { at: link(0) + 8, tone: "key" }, id: { at: link(1), tone: "key" } }}
          />
          <Entity
            layout={items}
            at={itemsAt - 2}
            marks={{ order_id: { at: link(1) + 8, tone: "key" }, product_id: { at: link(2) + 8, tone: "key" } }}
          />
          <Entity
            layout={products}
            at={notebookAt - 2}
            marks={{ name: { at: notebookAt + 4, tone: "note" }, id: { at: link(2), tone: "key" } }}
          />
          <Note at={notebookAt + 6} x={products.left} y={products.bottom + 16}>
            <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
              name = <span style={{ fontFamily: MONO, color: INK }}>&apos;{NOTEBOOK_NAME}&apos;</span>
            </span>
          </Note>
          <Relation
            name="customers place orders"
            points={[c, [jog1, c[1]], [jog1, o[1]], o]}
            from="exactly-one"
            to="zero-or-many"
            at={link(0)}
            color={KEY}
            label="places"
            labelPos={verbAt("places", jog1, c[1])}
          />
          <Relation
            name="orders hold order_items"
            points={[oId, iOrder]}
            from="exactly-one"
            to="zero-or-many"
            at={link(1)}
            color={KEY}
            label="holds"
            labelPos={verbAt("holds", (oId[0] + iOrder[0]) / 2, oId[1])}
          />
          <Relation
            name="products appear in order_items"
            points={[p, [jog3, p[1]], [jog3, iProduct[1]], iProduct]}
            from="exactly-one"
            to="zero-or-many"
            at={link(2)}
            color={KEY}
            label="appears in"
            labelPos={verbAt("appears in", jog3, p[1])}
          />
          <Note at={linksAt} x={orders.left} y={orders.bottom + 16}>
            <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>Three joins, along keys that were already there</span>
          </Note>
        </div>

        {/* The answer, as the lesson's query returned it. */}
        <FigLabel n="5" title="The answer" at={nameAt - 6} x={X0} y={y(LOW_FIG)} />
        <DbTable g={g} cols={NOTEBOOK.cols} rows={NOTEBOOK.rows.map((cells) => ({ cells, at: adaAt - 4 }))} at={nameAt - 2} marks={[{ row: 0, col: 0, at: adaAt + 4 }]} />
        {/* Why one name: Ada's notebook orders fold into one row, and in this shop no one else bought one. */}
        <Note at={adaAt + 10} x={X0} y={g.rowTop(1) + 18}>
          <div style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            One row: {firstName(NOTEBOOK.rows[0][0] as string)} bought notebooks {times(NOTEBOOK.lines.length)}.
          </div>
          {OTHERS.map((o) => (
            <div key={o.who} style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap", marginTop: 4 }}>
              In this shop, {firstName(o.who)} bought a {o.bought.join(" and a ")}.
            </div>
          ))}
        </Note>

        {/* The same order as free text, and what the question then takes. */}
        <FigLabel n="6" title="One order, as a sentence" at={sentenceAt - 4} x={CARD_X} y={y(LOW_FIG)} />
        <Ink at={sentenceAt - 2} dur={16} style={{ left: CARD_X, top: y(LOW_Y), width: 1000 }}>
          <div
            style={{
              background: LISTING_PAPER,
              borderTop: `2px solid ${INK}`,
              padding: "16px 22px",
              display: "flex",
              alignItems: "baseline",
              gap: 18,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontFamily: MONO, fontSize: 21, color: INK_SOFT }}>orders.note</span>
            <span style={{ fontFamily: MONO, fontSize: 28, color: INK }}>
              &apos;
              {parts.map((t, i) =>
                t === "notebooks" ? (
                  <Mark key={i} at={notebooksAt} color={MARK_BAD}>
                    {t}
                  </Mark>
                ) : (
                  <span key={i}>{t}</span>
                ),
              )}
              &apos;
            </span>
          </div>
        </Ink>
        {PROJECT.map((t, i) => (
          <Ink
            key={t}
            at={notebooksAt + 8 + i * CHORE_STEP}
            dur={14}
            style={{ left: CARD_X + (i % 2) * 470, top: y(LOW_Y) + 104 + Math.floor(i / 2) * 48, whiteSpace: "nowrap" }}
          >
            <span style={{ ...label(22, INK), fontWeight: 560 }}>
              <span style={{ color: ACCENT_INK, fontWeight: 700, marginRight: 10 }}>{i + 1}</span>
              {t}
            </span>
          </Ink>
        ))}
        <Ink at={projectAt + 2} dur={18} style={{ left: CARD_X, top: y(LOW_Y) + 214, whiteSpace: "nowrap" }}>
          <span style={{ ...body(32, true), color: ACCENT_INK, background: PAPER }}>A query became a project.</span>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
