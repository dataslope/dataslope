import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { Pt } from "../../components/arrow";
import { ease, pop } from "../../components/motion";
import { Entity, Relation, useEntityLayout, type EntityColumn, type EntityLayout } from "../../editorial/erd";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { SANS } from "../../theme/fonts";
import { Drift, KEY, OK_INK } from "./parts";

const W = 330;
const LEFT_X = 120;
const FACT_X = 560;
const RIGHT_X = 1000;
const SNOW_X = 1440;
const TOP_Y = 300;
const BOT_Y = 640;
/** The right-hand column of notes once the snowflake has gone. */
const NOTE_X = 1430;
const NOTE_W = 390;

const FACT: EntityColumn[] = [
  { name: "date_key", key: "FK" },
  { name: "store_key", key: "FK" },
  { name: "customer_key", key: "FK" },
  { name: "product_key", key: "FK" },
  { name: "quantity" },
  { name: "amount" },
];
const DATE: EntityColumn[] = [{ name: "date_key", key: "PK" }, { name: "date" }, { name: "month" }, { name: "fiscal_quarter" }];
const STORE: EntityColumn[] = [{ name: "store_key", key: "PK" }, { name: "store_name" }, { name: "city" }, { name: "region" }];
const CUSTOMER: EntityColumn[] = [{ name: "customer_key", key: "PK" }, { name: "name" }, { name: "city" }, { name: "segment" }];
const PRODUCT: EntityColumn[] = [{ name: "product_key", key: "PK" }, { name: "product_name" }, { name: "category" }, { name: "department" }];
const PRODUCT_SNOW: EntityColumn[] = [{ name: "product_key", key: "PK" }, { name: "product_name" }, { name: "category_key", key: "FK" }];
const CATEGORY: EntityColumn[] = [{ name: "category_key", key: "PK" }, { name: "category_name" }, { name: "department_key", key: "FK" }];
const DEPARTMENT: EntityColumn[] = [{ name: "department_key", key: "PK" }, { name: "department_name" }];

/** An elbow from one side of an entity to the facing side of another, turning at `x`. */
const elbow = (a: Pt, b: Pt, x: number): Pt[] => [a, [x, a[1]], [x, b[1]], b];

/** "1", "2", "3": a join counted along a relationship, popping in on `at`. */
const JoinBadge: React.FC<{ at: number; out?: number; x: number; y: number; n: number }> = ({ at, out, x, y, n: count }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0.01 || o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x - 17,
        top: y - 17,
        width: 34,
        height: 34,
        borderRadius: 17,
        background: KEY,
        color: PAPER,
        fontFamily: SANS,
        fontSize: 20,
        fontWeight: 750,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: Math.min(1, p) * (1 - o),
        transform: `scale(${Math.min(1.1, p)})`,
      }}
    >
      {count}
    </div>
  );
};

/** A yellow ring around an entity, for "the narration is pointing at this". */
const Ring: React.FC<{ e: EntityLayout; at: number; out?: number }> = ({ e, at, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: e.left - 9,
        top: e.top - 9,
        width: e.width + 18,
        height: e.height + 18,
        boxSizing: "border-box",
        border: `7px solid ${HIGHLIGHT}`,
        borderRadius: 12,
        opacity: p * (1 - o),
      }}
    />
  );
};

/**
 * Questions 1 and 2, and Data warehousing's star question. A fact table at
 * one row per order line, its measures and its keys; the four dimensions
 * around it, which make a star; the product dimension snowflaked into
 * category and department (three joins where the star needs one); then why
 * the star is the warehouse's default.
 */
export const StarScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("facts").from;
  const q1At = n.word("facts", "Question one");
  const q1TextAt = n.word("facts", "What are fact and dimension tables");
  const factAt = n.word("facts", "A fact table records events");
  const grainAt = n.word("facts", "one row per order line");
  const numbersAt = n.word("facts", "the numbers you add up");
  const keyAt = n.word("facts", "a key to each dimension");
  const contextAt = n.word("dims", "hold the context");
  const dateAt = n.word("dims", "the date");
  const productAt = n.word("dims", "the product");
  const storeAt = n.word("dims", "the store");
  const customerAt = n.word("dims", "the customer");
  const q2At = n.word("star", "Question two");
  const q2TextAt = n.word("star", "Star versus snowflake schema");
  const oneJoinAt = n.word("star", "one join from the fact");
  const plainAt = n.word("star", "category and department as plain text");
  const snowAt = n.word("snow", "Snowflake it");
  const moveAt = n.word("snow", "move out into tables of their own");
  const onceAt = n.word("snow", "stored once");
  const threeAt = n.word("snow", "three joins");
  const insteadAt = n.word("snow", "instead of one");
  const whyFrom = n.beat("star-why").from;
  const whyTextAt = n.word("star-why", "why is a star warehouse-friendly");
  const filtersAt = n.word("star-why", "Filters land on the small dimensions");
  const scannedAt = n.word("star-why", "scanned a column at a time");
  const toolsAt = n.word("star-why", "dashboard tools");
  const defaultAt = n.word("star-why", "So the star is the default");
  const largeAt = n.word("star-why", "Snowflake a dimension");
  const end = n.beat("star-why").to;

  // ── Layout: four dimensions in two columns, the fact between them ──
  const dims = {
    date: useEntityLayout({ x: LEFT_X, y: y(TOP_Y), width: W, name: "dim_date", columns: DATE }),
    customer: useEntityLayout({ x: LEFT_X, y: y(BOT_Y), width: W, name: "dim_customer", columns: CUSTOMER }),
    store: useEntityLayout({ x: RIGHT_X, y: y(TOP_Y), width: W, name: "dim_store", columns: STORE }),
    product: useEntityLayout({ x: RIGHT_X, y: y(BOT_Y), width: W, name: "dim_product", columns: PRODUCT }),
  };
  const mid = (dims.date.top + dims.customer.bottom) / 2;
  const probe = useEntityLayout({ x: FACT_X, y: 0, width: W, name: "fact_sales", columns: FACT });
  const fact = useEntityLayout({ x: FACT_X, y: mid - probe.height / 2, width: W, name: "fact_sales", columns: FACT });
  const productSnow = useEntityLayout({ x: RIGHT_X, y: y(BOT_Y), width: W, name: "dim_product", columns: PRODUCT_SNOW });
  const category = useEntityLayout({ x: SNOW_X, y: y(BOT_Y), width: W, name: "dim_category", columns: CATEGORY });
  const department = useEntityLayout({ x: SNOW_X, y: y(TOP_Y), width: W, name: "dim_department", columns: DEPARTMENT });

  const LX = (LEFT_X + W + FACT_X) / 2;
  const RX = (FACT_X + W + RIGHT_X) / 2;
  const SX = (RIGHT_X + W + SNOW_X) / 2;
  const lines = {
    date: elbow(dims.date.anchor("right", "date_key"), fact.anchor("left", "date_key"), LX),
    customer: elbow(dims.customer.anchor("right", "customer_key"), fact.anchor("left", "customer_key"), LX),
    store: elbow(dims.store.anchor("left", "store_key"), fact.anchor("right", "store_key"), RX),
    product: elbow(dims.product.anchor("left", "product_key"), fact.anchor("right", "product_key"), RX),
    category: elbow(category.anchor("left", "category_key"), productSnow.anchor("right", "category_key"), SX),
    department: [department.anchor("bottom"), category.anchor("top")] as Pt[],
  };
  const dimTimes = { date: dateAt, product: productAt, store: storeAt, customer: customerAt };
  // The snowflake leaves when the talk turns to why the star wins.
  const snowOut = whyFrom - 4;
  const fkMark = (i: number) => ({ at: keyAt + i * 3, tone: "key" as const, out: contextAt });
  const badgeAt = (k: keyof typeof lines) => {
    const pts = lines[k];
    return [pts[1][0], (pts[1][1] + pts[2][1]) / 2] as const;
  };

  return (
    <AbsoluteFill>
      {/* ── Sound ── */}
      <Sfx name="el-tap" at={factAt} level={-30} />
      {Object.values(dimTimes).map((t, i) => (
        <Sfx key={i} name="el-tap" at={t} level={-31} />
      ))}
      <Sfx name="el-pencil" at={dateAt + 4} level={-36} />
      <Sfx name="el-sprinkle" at={oneJoinAt} level={-36} />
      <Sfx name="el-whoosh" at={snowAt} level={-34} />
      <Sfx name="el-pencil" at={moveAt + 6} level={-36} />
      <Sfx name="el-pop" at={threeAt} level={-33} />
      <Sfx name="el-chime" at={defaultAt} level={-36} />

      <Drift from={from} to={end + 30} scale={0.015}>
        <QuestionCard n={1} at={q1At - 4} textAt={q1TextAt - 4} out={q2At - 6} size={60}>
          What are fact and dimension tables?
        </QuestionCard>
        <QuestionCard n={2} at={q2At} textAt={q2TextAt - 2} out={whyFrom - 6} size={60}>
          Star versus snowflake schema?
        </QuestionCard>
        <QuestionCard n={2} kicker="Question 2, continued" at={whyFrom} textAt={whyTextAt - 2} size={60}>
          Why is a star warehouse-friendly?
        </QuestionCard>

        {/* ── The fact table, its grain, measures and keys ── */}
        <Note at={grainAt} x={fact.left} y={fact.top - 44}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>
            grain: <span style={{ color: INK }}>one row per order line</span>
          </span>
        </Note>
        <Entity
          layout={fact}
          at={factAt - 4}
          rowAt={{ quantity: numbersAt + 2, amount: numbersAt + 6 }}
          marks={{
            date_key: fkMark(0),
            store_key: fkMark(1),
            customer_key: fkMark(2),
            product_key: fkMark(3),
            quantity: { at: numbersAt + 8, out: keyAt, tone: "note" },
            amount: { at: numbersAt + 12, out: keyAt, tone: "note" },
          }}
          dim={undefined}
        />
        {/* The two measures marked again while the star is "scanned a column at a time". */}
        <Entity
          layout={fact}
          at={scannedAt}
          rowGap={0}
          marks={{ quantity: { at: scannedAt + 2, tone: "note", out: defaultAt }, amount: { at: scannedAt + 6, tone: "note", out: defaultAt } }}
          out={defaultAt + 12}
        />

        {/* ── The dimensions, each as it is named ── */}
        <Entity layout={dims.date} at={dateAt - 4} />
        <Entity layout={dims.customer} at={customerAt - 4} />
        <Entity layout={dims.store} at={storeAt - 4} />
        <Entity layout={dims.product} at={productAt - 4} out={snowAt + 6} marks={{ category: { at: plainAt, tone: "note" }, department: { at: plainAt + 6, tone: "note" } }} />
        <Entity layout={dims.product} at={snowOut + 6} rowGap={2} />
        <Relation name="date" points={lines.date} from="exactly-one" to="zero-or-many" at={dateAt + 2} />
        <Relation name="customer" points={lines.customer} from="exactly-one" to="zero-or-many" at={customerAt + 2} />
        <Relation name="store" points={lines.store} from="exactly-one" to="zero-or-many" at={storeAt + 2} />
        <Relation name="product" points={lines.product} from="exactly-one" to="zero-or-many" at={productAt + 2} />

        {/* "One join from the fact": each relationship counted once. */}
        {(["date", "customer", "store", "product"] as const).map((k, i) => {
          const [bx, by] = badgeAt(k);
          return <JoinBadge key={k} at={oneJoinAt + i * 3} out={moveAt} x={bx} y={by} n={1} />;
        })}

        {/* ── The snowflake: product's category and department in tables of their own ── */}
        <Entity layout={productSnow} at={snowAt + 4} rowGap={3} out={snowOut} />
        <Entity layout={category} at={moveAt} rowGap={4} out={snowOut} />
        <Entity layout={department} at={moveAt + 10} rowGap={4} out={snowOut} marks={{ department_name: { at: onceAt, tone: "note" } }} />
        <Relation name="category" points={lines.category} from="exactly-one" to="zero-or-many" at={moveAt + 4} out={snowOut} />
        <Relation name="department" points={lines.department} from="exactly-one" to="zero-or-many" at={moveAt + 14} out={snowOut} />
        {/* Revenue by department: fact → product → category → department. */}
        {(
          [
            ["product", 1],
            ["category", 2],
          ] as const
        ).map(([k, count], i) => {
          const [bx, by] = badgeAt(k);
          return <JoinBadge key={k} at={threeAt + i * 6} out={snowOut} x={bx} y={by} n={count} />;
        })}
        <JoinBadge
          at={threeAt + 12}
          out={snowOut}
          x={lines.department[0][0] - 34}
          y={(lines.department[0][1] + lines.department[1][1]) / 2}
          n={3}
        />
        <Note at={threeAt + 4} x={SNOW_X} y={category.bottom + 22} out={snowOut}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            revenue by department: <b style={{ color: BLUE_INK }}>3 joins</b>
          </span>
          <div style={{ ...note(22, INK_SOFT), opacity: ease(frame, insteadAt, 10), whiteSpace: "nowrap" }}>in the star, 1</div>
        </Note>

        {/* ── Why the star: what each part is good at ── */}
        {Object.entries(dims).map(([k, e], i) => (
          <Ring key={k} e={e} at={filtersAt + 4 + i * 3} out={scannedAt} />
        ))}
        <Note at={filtersAt + 2} x={NOTE_X} y={y(310)} width={NOTE_W}>
          <span style={{ ...note(24, INK) }}>Filters land on the small dimensions.</span>
        </Note>
        <Note at={scannedAt} x={NOTE_X} y={y(400)} width={NOTE_W}>
          <span style={{ ...note(24, INK) }}>The one large fact is scanned a column at a time.</span>
        </Note>
        <Note at={toolsAt} x={NOTE_X} y={y(490)} width={NOTE_W}>
          <span style={{ ...note(24, INK) }}>Dashboard tools map straight onto it.</span>
        </Note>
        <Note at={defaultAt} x={NOTE_X} y={y(600)} width={NOTE_W}>
          <span style={{ ...note(30, OK_INK), fontWeight: 750 }}>The default: a star.</span>
        </Note>
        <Note at={largeAt} x={NOTE_X} y={y(660)} width={NOTE_W}>
          <span style={{ ...note(24, INK_SOFT) }}>Snowflake a dimension when it&apos;s very large, or shared.</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
