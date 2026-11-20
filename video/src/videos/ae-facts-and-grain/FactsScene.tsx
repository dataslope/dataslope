import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { Entity, Relation, useEntityLayout, type EntityColumn } from "../../editorial/erd";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { HAIRLINE, INK, INK_SOFT, label, note } from "../../editorial/style";
import { badgeStyle, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { STAR } from "./data";
import { colsOf, DataTable, Drift, geoOf, MARK_KEY, Mono, TableName } from "./parts";

const FACT_X = 720;
const FACT_W = 380;
const DATE_X = 120;
const PROD_X = 1380;
const DIM_W = 330;
const TOP = 320;

const FACT: EntityColumn[] = [{ name: "order_id" }, { name: "order_date_sk", key: "FK" }, { name: "product_sk", key: "FK" }, { name: "amount" }];
const DATE: EntityColumn[] = [{ name: "date_sk", key: "PK" }, { name: "full_date" }];
const PRODUCT: EntityColumn[] = [{ name: "product_sk", key: "PK" }, { name: "category" }];

/** Where the sorted column names land: under "Add it up" or "Group by it". */
const SORT_Y = 660;
const LEFT_COL = 400;
const RIGHT_COL = 1060;
const COL_W = 480;

/** A column name as a gray badge in the mono face, sliding from `from` to
 *  `to` on `move`. */
const NameChip: React.FC<{ name: string; at: number; move: number; from: number; to: number; y: number }> = ({ name, at, move, from, to, y }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = Math.min(1, pop(frame, at, fps, 14));
  const m = ease(frame, move, 18);
  if (p <= 0.001) return null;
  return (
    <span
      style={{
        position: "absolute",
        left: interpolate(m, [0, 1], [from, to]),
        top: y,
        ...badgeStyle("gray", 24),
        fontFamily: MONO,
        fontWeight: 500,
        opacity: p,
        transform: `scale(${0.8 + 0.2 * p})`,
        whiteSpace: "nowrap",
      }}
    >
      {name}
    </span>
  );
};

/** A sorting column's head: a short rule, the rule's verb, and where it
 *  puts a column. It carries its own top rule, so no vertical hairline. */
const SortHead: React.FC<{ at: number; x: number; y: number; title: string; sub: string; subAt: number }> = ({ at, x, y, title, sub, subAt }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: COL_W }}>
      <div style={{ height: 1, width: COL_W * p, background: HAIRLINE }} />
      <div style={{ ...label(26, INK), fontWeight: 500, marginTop: 28, opacity: p, whiteSpace: "nowrap" }}>{title}</div>
      <div style={{ ...note(23, INK_SOFT), marginTop: 10, opacity: ease(frame, subAt, 12), whiteSpace: "nowrap" }}>{sub}</div>
    </div>
  );
};

/**
 * Question 1. The page's star as an ERD: fact_orders in the middle, one row
 * per order, its two keys and its amount, with its first four rows beneath;
 * dim_date and dim_product one relation each. The dimensions light as the
 * narration names what they hold, "how much" goes under the fact and "by
 * what" under the dimensions, and then three column names are sorted by the
 * rule: aggregate it and it is a measure on the fact; group by it and it
 * belongs on a dimension.
 */
export const FactsScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("facts").from;
  const qAt = n.word("facts", "Question one");
  const textAt = n.word("facts", "What are fact and dimension tables");
  const factAt = n.word("facts", "A fact table records events");
  const grainAt = n.word("facts", "here one row per order");
  const dateKeyAt = n.word("facts", "a key for the order's date");
  const prodKeyAt = n.word("facts", "a key for its product");
  const amountAt = n.word("facts", "and the amount");
  const dimsAt = n.word("dims", "Dimension tables hold what you slice by");
  const dateAt = n.word("dims", "each date");
  const catAt = n.word("dims", "each product's category");
  const howAt = n.word("dims", "The fact answers how much");
  const byAt = n.word("dims", "The dimensions answer by what");
  const askAt = n.word("facts-test", "for any new column");
  const aggAt = n.word("facts-test", "Aggregate it, and");
  const measureAt = n.word("facts-test", "it's a measure on the fact");
  const groupAt = n.word("facts-test", "Group by it, and");
  const dimAt = n.word("facts-test", "it belongs on a dimension");
  const end = n.beat("facts-test").to;

  const fact = useEntityLayout({ x: FACT_X, y: y(TOP), width: FACT_W, name: "fact_orders", columns: FACT });
  // Each dimension's key row level with the fact's foreign key, so both
  // relations run straight.
  const date = useEntityLayout({ x: DATE_X, y: fact.rows[1].mid - fact.rows[0].mid + fact.top, width: DIM_W, name: "dim_date", columns: DATE });
  const prod = useEntityLayout({ x: PROD_X, y: fact.rows[2].mid - fact.rows[0].mid + fact.top, width: DIM_W, name: "dim_product", columns: PRODUCT });

  const F = STAR.facts;
  const g = geoOf(F, FACT_X + FACT_W / 2 - 330, y(700), h, { headH: 44, rowH: 46, bodySize: 23, headSize: 20 });
  const col = (c: string) => F.cols.indexOf(c);
  const rowsOut = askAt - 6;
  const [orders] = STAR.counts.rows[0];
  // What each kind answers, on one line under the lowest box.
  const labelsY = Math.max(fact.bottom, date.bottom, prod.bottom) + h(18);

  // The three names start in a row between the two heads, then sort.
  const chipY = y(SORT_Y) + h(132);
  const startX = [760, 900, 1080];

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={factAt} level={-29} />
      <Sfx name="el-pencil" at={dateKeyAt + 4} level={-36} />
      <Sfx name="el-pencil" at={prodKeyAt + 4} level={-36} />
      <Sfx name="el-tap" at={dateAt} level={-31} />
      <Sfx name="el-tap" at={catAt} level={-31} />
      <Sfx name="el-pop" at={askAt + 2} level={-31} />
      <Sfx name="el-whoosh" at={aggAt + 2} level={-35} />
      <Sfx name="el-whoosh" at={groupAt + 2} level={-35} />

      <Drift from={from} to={end + 30} scale={0.015}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} size={60}>
          What are fact and dimension tables?
        </QuestionCard>

        {/* ── The star: the fact, then each dimension and its relation ── */}
        <Note at={grainAt} x={fact.left} y={fact.top - h(44)}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 500, whiteSpace: "nowrap" }}>
            Grain: <span style={{ color: INK }}>one row per order</span>
          </span>
        </Note>
        <Entity
          layout={fact}
          at={factAt - 4}
          rowAt={{ order_id: grainAt, order_date_sk: dateKeyAt, product_sk: prodKeyAt, amount: amountAt }}
          marks={{
            order_date_sk: { at: dateKeyAt + 4, tone: "key", out: dimsAt },
            product_sk: { at: prodKeyAt + 4, tone: "key", out: dimsAt },
            // The measure lights as the rule puts it on the fact.
            amount: { at: measureAt, tone: "note" },
          }}
        />
        {/* The dimensions light as the narration names what they hold, and
            stay lit: the sort puts their columns there again. */}
        <Entity layout={date} at={dateKeyAt} marks={{ full_date: { at: dateAt, tone: "note" } }} />
        <Entity layout={prod} at={prodKeyAt} marks={{ category: { at: catAt, tone: "note" } }} />
        <Relation name="date" points={[date.anchor("right", "date_sk"), fact.anchor("left", "order_date_sk")]} from="exactly-one" to="zero-or-many" at={dateKeyAt + 4} />
        <Relation name="product" points={[prod.anchor("left", "product_sk"), fact.anchor("right", "product_sk")]} from="exactly-one" to="zero-or-many" at={prodKeyAt + 4} />

        {/* What each kind answers, under it. */}
        <Note at={howAt} x={fact.left} y={labelsY} out={rowsOut + 40}>
          <span style={{ ...note(26, INK), fontWeight: 500, whiteSpace: "nowrap" }}>how much</span>
        </Note>
        {[date, prod].map((e, i) => (
          <Note key={i} at={byAt + i * 4} x={e.left} y={labelsY} out={rowsOut + 40}>
            <span style={{ ...note(26, INK), fontWeight: 500, whiteSpace: "nowrap" }}>by what</span>
          </Note>
        ))}

        {/* The fact's first rows, beneath it. */}
        <TableName g={g} at={grainAt + 6} out={rowsOut}>
          <Mono>fact_orders</Mono>, the first four of <Num>{orders}</Num> rows
        </TableName>
        <DataTable
          g={g}
          cols={colsOf(F)}
          at={grainAt + 6}
          out={rowsOut}
          rows={F.rows.map((cells, i) => ({ cells, at: grainAt + 10 + i * 3 }))}
          marks={F.rows.flatMap((_, row) => [
            { row, col: col("order_date_sk"), at: dateKeyAt + 6 + row * 2, color: MARK_KEY },
            { row, col: col("product_sk"), at: prodKeyAt + 6 + row * 2, color: MARK_KEY },
            { row, col: col("amount"), at: amountAt + 6 + row * 2 },
          ])}
        />

        {/* ── The rule for any new column ── */}
        <Note at={askAt} x={startX[0] - 6} y={y(SORT_Y) + h(64)} out={aggAt - 2}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>Aggregate it, or group by it?</span>
        </Note>
        <SortHead at={aggAt} x={LEFT_COL} y={y(SORT_Y)} title="Add it up" sub="A measure, on the fact" subAt={measureAt} />
        <SortHead at={groupAt} x={RIGHT_COL} y={y(SORT_Y)} title="Group by it" sub="An attribute, on a dimension" subAt={dimAt} />
        <NameChip name="amount" at={askAt + 4} move={aggAt + 2} from={startX[0]} to={LEFT_COL} y={chipY} />
        <NameChip name="full_date" at={askAt + 8} move={groupAt + 2} from={startX[1]} to={RIGHT_COL} y={chipY} />
        <NameChip name="category" at={askAt + 12} move={groupAt + 6} from={startX[2]} to={RIGHT_COL + 180} y={chipY} />
      </Drift>
    </AbsoluteFill>
  );
};
