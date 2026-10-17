import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { Pt } from "../../components/arrow";
import type { Cardinality } from "../../components/crowsfoot";
import { ease } from "../../components/motion";
import { Entity, Relation, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, body, halo, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, NextLine } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { PATH } from "./data";
import { DbTable, Fig, KEY, MARK, tableGeometry } from "./kit";
import { Drift, Glow, Headline, Kicker, Mark, Spot } from "./parts";

const LEFT_X = 120;
const RIGHT_BOX_X = 640;
const TOP_Y = 310;
const LOW_Y = 615;
const TEXT_X = 1100;
const SENT_Y = 330;
const SENT_STEP = 76;
const RESULT_Y = 370;
const RESULT_SIZE = { head: 19, body: 22 };

type Line = {
  name: string;
  points: Pt[];
  from: Cardinality;
  to: Cardinality;
  verb: string;
  verbPos: Pt;
};

/**
 * Part 3: the lesson's shop, read. The boxes arrive on their names and the
 * lines draw; each line is read as a sentence while it is traced in the
 * accent; then the keys are followed as joins, from Ada to her order, its
 * lines and their products, and the query's own result arrives. The bridge:
 * every line lands on exactly one row, because every row has a key.
 */
export const ShopScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const shopFrom = n.beat("shop").from;
  const littleShopAt = n.word("shop", "little shop");
  const customersAt = n.word("shop", "customers");
  const ordersAt = n.word("shop", "orders");
  const itemsAt = n.word("shop", "order items");
  const productsAt = n.word("shop", "products");
  const readAt = n.word("shop", "Read each line");
  const sentenceAt = n.word("shop", "sentence");
  const s = ["s1", "s2", "s3"].map((id) => ({ from: n.beat(id).from, to: n.beat(id).to }));
  const s1Many = n.word("s1", "zero or many");
  const s2Many = n.word("s2", "one or many");
  const s3Many = n.word("s3", "zero or many");
  const wrongFrom = n.beat("wrong").from;
  const wrongAt = n.word("wrong", "wrong");
  const workAt = n.word("wrong", "needs work");
  const joinsFrom = n.beat("joins").from;
  const followAt = n.word("joins", "follow the keys");
  const joinAt = n.word("joins", "join");
  const queryAt = n.word("joins", "query");
  const adaAt = n.word("joins", "Ada");
  const herOrderAt = n.word("joins", "her order");
  const linesAt = n.word("joins", "its lines");
  const productsPathAt = n.word("joins", "their products");
  const notebooksAt = n.word("result", "Two notebooks");
  const pensAt = n.word("result", "three pens");
  const exactlyAt = n.word("next", "exactly one row");
  const everyRowAt = n.word("next", "every row");
  const nameAt = n.word("next", "name");
  const keyAt = n.word("next", "key");
  const nextTo = n.beat("next").to;

  // ── The diagram (reading-er-diagrams.mdx) ──
  const cust = useEntityLayout({
    x: LEFT_X,
    y: y(TOP_Y),
    width: 330,
    name: "customers",
    columns: [{ name: "id", key: "PK" }, { name: "name" }, { name: "email", key: "UK" }],
  });
  const ord = useEntityLayout({
    x: RIGHT_BOX_X,
    y: y(TOP_Y),
    width: 380,
    name: "orders",
    columns: [{ name: "id", key: "PK" }, { name: "customer_id", key: "FK" }, { name: "placed_on" }, { name: "status" }],
  });
  const prod = useEntityLayout({
    x: LEFT_X,
    y: y(LOW_Y),
    width: 330,
    name: "products",
    columns: [{ name: "id", key: "PK" }, { name: "name" }, { name: "price" }],
  });
  const items = useEntityLayout({
    x: RIGHT_BOX_X,
    y: y(LOW_Y),
    width: 380,
    name: "order_items",
    columns: [
      { name: "order_id", key: "PK, FK" },
      { name: "line_number", key: "PK" },
      { name: "product_id", key: "FK" },
      { name: "quantity" },
    ],
  });
  const c1 = cust.anchor("right");
  const o1 = ord.anchor("left");
  const o2 = ord.anchor("bottom");
  const i2 = items.anchor("top");
  const p3 = prod.anchor("right");
  const i3 = items.anchor("left");
  const LINES: Line[] = [
    { name: "customers place orders", points: [c1, o1], from: "exactly-one", to: "zero-or-many", verb: "places", verbPos: [(c1[0] + o1[0]) / 2, c1[1] - 40] },
    { name: "orders contain order_items", points: [o2, i2], from: "exactly-one", to: "one-or-many", verb: "contains", verbPos: [o2[0] + 60, (o2[1] + i2[1]) / 2 - 14] },
    { name: "products appear in order_items", points: [p3, i3], from: "exactly-one", to: "zero-or-many", verb: "appears in", verbPos: [(p3[0] + i3[0]) / 2, p3[1] - 40] },
  ];
  const sentences = [
    { lead: "One customer places", count: "zero or many", tail: "orders.", countAt: s1Many },
    { lead: "One order contains", count: "one or many", tail: "order items.", countAt: s2Many },
    { lead: "One product appears in", count: "zero or many", tail: "order items.", countAt: s3Many },
  ];
  // The path a query takes: customers to orders, to its lines, to products
  // (the third line traced from order_items back to products).
  const path = [
    { points: LINES[0].points, from: LINES[0].from, to: LINES[0].to, at: herOrderAt - 2 },
    { points: LINES[1].points, from: LINES[1].from, to: LINES[1].to, at: linesAt - 2 },
    { points: [...LINES[2].points].reverse(), from: LINES[2].to, to: LINES[2].from, at: productsPathAt - 2 },
  ];
  const textOut = ease(frame, joinsFrom - 4, 14);

  const rg = tableGeometry({
    x: TEXT_X,
    top: y(RESULT_Y),
    cols: PATH.cols,
    rows: PATH.rows,
    headH: y(46) - y(0),
    rowH: y(56) - y(0),
    size: RESULT_SIZE,
  });
  const P = { customer: 0, product: 3, quantity: 4 } as const;

  return (
    <AbsoluteFill>
      {/* ── Sound: the boxes, the lines, each sentence, the path, the close ── */}
      <Sfx name="el-pop" at={customersAt - 4} level={-30} />
      <Sfx name="el-pencil" at={readAt} level={-34} />
      {s.map((b, i) => (
        <Sfx key={i} name="el-tap" at={b.from - 2} level={-30} />
      ))}
      <Sfx name="el-whoosh" at={herOrderAt - 2} level={-34} />
      <Sfx name="el-tap" at={linesAt} level={-29} />
      <Sfx name="el-chime" at={nextTo + 8} level={-32} />

      <Kicker at={shopFrom - 10}>Reading a diagram</Kicker>
      <Headline lead="Read each line" at={shopFrom - 4} turn="as a sentence." turnAt={sentenceAt - 4} out={followAt - 8} />
      <Headline lead="The keys" at={followAt - 2} turn="are the joins." turnAt={joinAt - 4} out={everyRowAt - 8} />
      <Headline lead="Every row needs" at={everyRowAt - 2} turn="a name of its own." turnAt={nameAt - 4} />
      <Spot id="db-relationships-bag" at={littleShopAt} left={1620} top={y(62)} width={160} height={238} />

      <Drift from={s[0].from} to={nextTo + 60} scale={0.016} origin={[960, y(560)]}>
        <Fig n="6" at={littleShopAt - 4} x={LEFT_X} y={y(268)}>
          A small shop
        </Fig>

        {/* ── The washes under the ends the bridge points at ── */}
        {(
          [
            [c1[0] + 16, c1[1]],
            [o2[0], o2[1] + 16],
            [p3[0] + 16, p3[1]],
          ] as Pt[]
        ).map((c, i) => (
          <Glow key={i} c={c} r={26} at={exactlyAt + i * 5} />
        ))}
        {/* Each count, lit as its sentence reads it. */}
        <Glow c={[o1[0] - 22, o1[1]]} r={28} at={s1Many - 2} out={s[1].from} />
        <Glow c={[i2[0], i2[1] - 20]} r={28} at={s2Many - 2} out={s[2].from} />
        <Glow c={[i3[0] - 22, i3[1]]} r={28} at={s3Many - 2} out={wrongFrom} />

        <Entity
          layout={cust}
          at={customersAt - 4}
          rowGap={3}
          marks={{ name: { at: adaAt - 2, tone: "note", out: nameAt }, id: { at: nameAt, tone: "key" } }}
        />
        <Entity
          layout={ord}
          at={ordersAt - 4}
          rowGap={3}
          marks={{ customer_id: { at: followAt, tone: "key" }, id: { at: nameAt + 5, tone: "key" } }}
        />
        <Entity
          layout={items}
          at={itemsAt - 4}
          rowGap={3}
          marks={{
            order_id: { at: followAt + 6, tone: "key" },
            product_id: { at: followAt + 12, tone: "key" },
            line_number: { at: nameAt + 15, tone: "key" },
          }}
        />
        <Entity
          layout={prod}
          at={productsAt - 4}
          rowGap={3}
          marks={{ name: { at: notebooksAt - 2, tone: "note" }, id: { at: nameAt + 10, tone: "key" } }}
        />
        {LINES.map((l, i) => (
          <React.Fragment key={l.name}>
            <Relation name={l.name} points={l.points} from={l.from} to={l.to} at={readAt + i * 6} />
            <div
              style={{
                position: "absolute",
                left: l.verbPos[0],
                top: l.verbPos[1],
                transform: i === 1 ? undefined : "translateX(-50%)",
                opacity: ease(frame, readAt + i * 6 + 10, 12),
                whiteSpace: "nowrap",
                ...note(21, INK_SOFT),
                fontStyle: "italic",
                ...halo,
              }}
            >
              {l.verb}
            </div>
            {/* The line being read, traced over in the accent. */}
            <Relation name={`${l.name}, read`} points={l.points} from={l.from} to={l.to} at={s[i].from - 4} color={ACCENT} out={s[i].to + 10} />
          </React.Fragment>
        ))}
        {/* The query's path, traced in the key blue. */}
        {path.map((p, i) => (
          <Relation key={i} name={`path ${i + 1}`} points={p.points} from={p.from} to={p.to} at={p.at} color={KEY} width={3.4} />
        ))}

        {/* ── The sentences ── */}
        <AbsoluteFill style={{ opacity: 1 - textOut }}>
          {sentences.map((t, i) => (
            <Ink
              key={i}
              at={s[i].from - 4}
              dur={16}
              style={{ left: TEXT_X, top: y(SENT_Y + i * SENT_STEP), whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 16 }}
            >
              <span style={{ ...label(24, ACCENT_INK), fontWeight: 700 }}>{i + 1}</span>
              <span style={{ ...body(33), color: INK }}>
                {t.lead} <Mark at={t.countAt}>{t.count}</Mark> {t.tail}
              </span>
            </Ink>
          ))}
          <Ink at={wrongFrom - 2} dur={16} style={{ left: TEXT_X, top: y(SENT_Y + 3 * SENT_STEP + 20), width: 640 }}>
            <span style={{ ...note(24, INK_SOFT) }}>
              If a sentence sounds <Mark at={wrongAt}>wrong</Mark> to the business, the diagram <Mark at={workAt}>needs work</Mark>.
            </span>
          </Ink>
        </AbsoluteFill>

        {/* ── What the joins return (the lesson's query) ── */}
        <Ink at={queryAt - 2} dur={14} style={{ left: TEXT_X, top: y(RESULT_Y - 44), whiteSpace: "nowrap" }}>
          <span style={label(22, INK_SOFT)}>The query, joined along the three keys</span>
        </Ink>
        <DbTable
          g={rg}
          cols={PATH.cols}
          rows={PATH.rows.map((cells, i) => ({ cells, at: linesAt + i * 6 }))}
          at={adaAt - 2}
          numeric={[1, 2, 4]}
          marks={[
            { row: 0, col: P.customer, at: adaAt, color: MARK },
            { row: 0, col: P.product, at: notebooksAt, color: MARK },
            { row: 0, col: P.quantity, at: notebooksAt + 4, color: MARK },
            { row: 1, col: P.product, at: pensAt, color: MARK },
            { row: 1, col: P.quantity, at: pensAt + 4, color: MARK },
          ]}
        />

        <NextLine at={keyAt - 6} x={TEXT_X} y={y(640)} width={600}>
          keys.
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
