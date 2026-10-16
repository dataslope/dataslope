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
import { NOTE_TEXT, NOTEBOOK, NOTEBOOK_NAME, SHOP } from "./data";
import { DbTable, Drift, FIG_Y, Headline, KEY, Kicker, LISTING_PAPER, Mark, MARK_BAD, tableGeometry, X0 } from "./parts";

const TOP = 340;
const LOW_FIG = 640;
const LOW_Y = 690;
const CARD_X = 800;

const cols = (c: (typeof SHOP)["customers"]) => c.map(({ name, type, key }) => ({ name, type, key }));

/** The lesson's list of what the free-text version would take. */
const PROJECT = ["parse the text", "handle misspellings", "notebook or notebooks?", "clean up old rows"] as const;

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
  const walkAt = n.word("walk", "walk");
  const linksAt = n.word("walk", "links");
  const drewAt = n.word("walk", "drew");
  const nameAt = n.word("answer", "name");
  const adaAt = n.word("answer", "Ada");
  const sentenceAt = n.word("sentence", "sentence");
  const notebooksAt = n.word("sentence", "notebooks");
  const questionAt = n.word("sentence", "question");
  const projectAt = n.word("sentence", "project");
  const end = n.beat("gate").from;

  const customers = useEntityLayout({ x: X0, y: y(TOP), width: 330, name: "customers", columns: cols(SHOP.customers) });
  const orders = useEntityLayout({ x: 560, y: y(TOP), width: 330, name: "orders", columns: cols(SHOP.orders) });
  const items = useEntityLayout({ x: 1000, y: y(TOP), width: 380, name: "order_items", columns: cols(SHOP.items) });
  const products = useEntityLayout({ x: 1490, y: y(TOP), width: 310, name: "products", columns: cols(SHOP.products) });

  const c = customers.anchor("right", "id");
  const o = orders.anchor("left", "customer_id");
  const oId = orders.anchor("right", "id");
  const iOrder = items.anchor("left", "order_id");
  const p = products.anchor("left", "id");
  const iProduct = items.anchor("right", "product_id");
  const jog1 = (c[0] + o[0]) / 2;
  const jog3 = (iProduct[0] + p[0]) / 2;

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
      <Sfx name="el-tap" at={questionAt} level={-30} />

      <Kicker at={askFrom - 10}>What design buys</Kicker>
      <Headline lead="Which customers" turn="bought a notebook?" at={askFrom - 6} turnAt={notebookAt - 6} size={72} />

      <Drift from={askFrom} to={end} amount={0.016} origin="50% 40%">
        <div style={{ position: "absolute", inset: 0, opacity: 1 - lowered * 0.5 }}>
          <FigLabel n="4" title="The shop, as four tables" at={customersAt - 6} x={X0} y={y(FIG_Y)} />
          <Entity layout={customers} at={customersAt - 2} marks={{ id: { at: link(0), tone: "key" }, name: { at: adaAt - 2, tone: "note" } }} />
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
          />
          <Relation name="orders hold order_items" points={[oId, iOrder]} from="exactly-one" to="zero-or-many" at={link(1)} color={KEY} />
          <Relation
            name="products appear in order_items"
            points={[p, [jog3, p[1]], [jog3, iProduct[1]], iProduct]}
            from="exactly-one"
            to="zero-or-many"
            at={link(2)}
            color={KEY}
          />
          <Note at={linksAt} x={orders.left} y={orders.bottom + 16}>
            <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>Three joins, along keys that were already there</span>
          </Note>
        </div>

        {/* The answer, as the lesson's query returned it. */}
        <FigLabel n="5" title="The answer" at={nameAt - 6} x={X0} y={y(LOW_FIG)} />
        <DbTable g={g} cols={NOTEBOOK.cols} rows={NOTEBOOK.rows.map((cells) => ({ cells, at: adaAt - 4 }))} at={nameAt - 2} marks={[{ row: 0, col: 0, at: adaAt + 4 }]} />
        <Note at={adaAt + 10} x={X0} y={g.rowTop(1) + 18}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            One row, from orders {NOTEBOOK.lines.map((l) => l[0]).join(" and ")}
          </span>
        </Note>

        {/* The same order as free text, and what the question then takes. */}
        <FigLabel n="6" title="The same order, as a sentence" at={sentenceAt - 4} x={CARD_X} y={y(LOW_FIG)} />
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
            at={questionAt + i * Math.max(5, Math.round((projectAt - questionAt + 14) / 4))}
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
