import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, body, fmt, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import {
  CUSTOMER_FIRST,
  DUPLICATE_LINE,
  ITEM_COLS,
  ITEM_ROWS,
  MUG,
  PRODUCT_COLS,
  PRODUCT_ROWS,
  TOTAL_CATALOG,
  TOTAL_CHARGED,
  ZERO_QUANTITY,
} from "./data";
import { DbTable, ErrorBox, Head, Mark, MARK_BAD, Strike, tableGeometry } from "./parts";
import { STORE_BOTTOM, STORE_TOP, STORE_X } from "./StoreErd";

/** Where Postgres's answers sit: under the diagram, across its width. */
const ERROR_Y = 806;
/** Out to the page margin: the rail ends above this band. */
const ERROR_W = 1824 - STORE_X[0];

/**
 * The foreground of Part 2's diagram scenes. The diagram itself and the step
 * rail are layers over these (StoreErd, StepsLayer); each scene carries the
 * headline for its steps and what Postgres says back.
 */

/** Steps two and three: a table per noun, each fact where it belongs, a key instead of a copy. */
export const EntitiesScene: React.FC = () => {
  const n = useNarration();
  const factsFrom = n.beat("facts").from;
  const pointerFrom = n.beat("pointer").from;
  const pointsAt = n.word("pointer", "points");
  return (
    <AbsoluteFill>
      <Head at={n.beat("entities").from - 6} out={factsFrom - 6}>
        One table per noun.
      </Head>
      <Head at={factsFrom - 2} second={n.word("facts", "describes")} out={pointerFrom - 6} italic="where it belongs.">
        Each fact
      </Head>
      <Head at={pointerFrom - 2} second={pointsAt} italic="not a copy.">
        A pointer,
      </Head>
    </AbsoluteFill>
  );
};

/** Step four: how many to how many, and the two tables many to many needs. */
export const RelateScene: React.FC = () => {
  const n = useNarration();
  const pairsFrom = n.beat("pairs").from;
  const hiddenFrom = n.beat("hidden").from;
  return (
    <AbsoluteFill>
      <Head at={n.beat("relate").from - 6} second={n.word("relate", "One customer")} out={pairsFrom - 6} italic="Both ways.">
        How many to how many?
      </Head>
      <Head at={pairsFrom - 2} second={n.word("pairs", "pairs")} out={hiddenFrom - 6} italic="a table of pairs.">
        Many to many:
      </Head>
      <Head at={hiddenFrom - 2} second={n.word("hidden", "facts of its own")} italic="with facts of its own.">
        A link
      </Head>
    </AbsoluteFill>
  );
};

/** Steps five and six: the pair as a key, the quantity rule, and what Postgres says to each. */
export const RulesScene: React.FC = () => {
  const n = useNarration();
  const { y } = useLayout();
  const keysFrom = n.beat("keys").from;
  const twiceAt = n.word("keys", "twice");
  const rulesFrom = n.beat("rules").from;
  const refusedAt = n.word("rules", "refused");
  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={twiceAt - 2} level={-28} />
      <Sfx name="el-tap" at={refusedAt - 2} level={-27} />
      <Head at={keysFrom - 6} second={rulesFrom - 2} italic="then rules.">
        Keys first,
      </Head>
      <ErrorBox
        x={STORE_X[0]}
        top={y(ERROR_Y)}
        width={ERROR_W}
        at={twiceAt - 2}
        out={n.word("rules", "quantity") - 4}
        message={DUPLICATE_LINE.message}
        detail={DUPLICATE_LINE.detail}
      />
      <ErrorBox x={STORE_X[0]} top={y(ERROR_Y)} width={ERROR_W} at={refusedAt - 2} message={ZERO_QUANTITY.message} detail={ZERO_QUANTITY.detail} />
    </AbsoluteFill>
  );
};

/** "2 × 10.00 + 1 × 24.00": an order's lines, priced one way or the other. */
const sumOf = (price: (row: readonly (string | null)[]) => string) =>
  ITEM_ROWS.map((r) => `${r[2]} × ${price(r)}`).join(" + ");
const productOf = (row: readonly (string | null)[]) => PRODUCT_ROWS.find((p) => p[0] === row[1])!;

/** Step seven's exception, and step eight: the price charged and the price now. */
export const PriceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const copyFrom = n.beat("copy").from;
  const copiesAt = n.word("copy", "copies one fact");
  const mugFrom = n.beat("mug").from;
  const tenAt = n.word("mug", "ten dollars");
  const twelveAt = n.word("mug", "twelve");
  const linesAt = n.word("history", "lines");
  const fortyFourAt = n.word("history", "forty-four");
  const paidAt = n.word("history", "paid");
  const todayAt = n.word("history", "today's prices");
  const fortyEightAt = n.word("history", "forty-eight");
  const rewriteAt = n.word("history", "rewrite");
  const reviewFrom = n.beat("review").from;
  const walkAt = n.word("review", "walk");

  const tableAt = mugFrom + 6;
  const items = tableGeometry({ x: STORE_X[0], top: y(STORE_TOP + 8), cols: ITEM_COLS, rows: ITEM_ROWS, headH: h(52), rowH: h(62) });
  const products = tableGeometry({
    x: STORE_X[0],
    top: y(STORE_BOTTOM + 8),
    cols: PRODUCT_COLS,
    rows: PRODUCT_ROWS,
    headH: h(52),
    rowH: h(62),
  });
  const mugProduct = PRODUCT_ROWS.findIndex((p) => p[0] === ITEM_ROWS[MUG][1]);

  // The totals count up to what the database returns.
  const count = (at: number, to: string) => {
    const p = ease(frame, at, 22);
    return fmt(Number(to) * p, 2);
  };
  const charged = sumOf((r) => r[3] as string);
  const catalog = sumOf((r) => productOf(r)[2] as string);
  // "Walk real rows through the design": each stored row lit in turn.
  const walk = (k: number) => walkAt + k * 6;

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={tableAt} level={-30} />
      <Sfx name="el-tap" at={tenAt} level={-29} />
      <Sfx name="el-tap" at={twelveAt} level={-29} />
      <Sfx name="el-pop" at={fortyFourAt - 4} level={-29} />
      <Sfx name="el-scratch" at={rewriteAt} level={-30} />
      <Sfx name="el-chime" at={reviewFrom - 14} level={-33} />

      <Head at={copyFrom - 6} second={copiesAt} out={reviewFrom - 6} italic="copied on purpose.">
        One fact,
      </Head>
      <Head at={reviewFrom - 2} second={walkAt} italic="walk real rows through it.">
        Step eight:
      </Head>

      <FigLabel n="2" title={`${CUSTOMER_FIRST}'s order, as the two tables store it`} at={tableAt} x={STORE_X[0]} y={y(262)} />
      <DbTable
        g={items}
        cols={ITEM_COLS}
        rows={ITEM_ROWS.map((cells, i) => ({ cells, at: tableAt + 4 + i * 4 }))}
        at={tableAt}
        numeric={[0, 1, 2, 3]}
        marks={[
          { row: MUG, col: 2, at: tenAt - 6, out: twelveAt - 2 },
          { row: MUG, col: 3, at: tenAt, color: undefined },
          ...ITEM_ROWS.map((_, i) => ({ row: i, col: 0, at: walk(i), out: walk(i) + 20 })),
        ]}
      />
      <DbTable
        g={products}
        cols={PRODUCT_COLS}
        rows={PRODUCT_ROWS.map((cells, i) => ({ cells, at: tableAt + 10 + i * 4 }))}
        at={tableAt + 6}
        numeric={[0, 2]}
        marks={[
          { row: mugProduct, col: 2, at: twelveAt - 2, color: MARK_BAD },
          ...PRODUCT_ROWS.map((_, i) => ({ row: i, col: 0, at: walk(2 + i), out: walk(2 + i) + 20 })),
        ]}
      />

      {/* The two totals, from the price charged and from today's. */}
      <Ink at={linesAt - 4} dur={16} style={{ left: STORE_X[0], top: y(800), display: "flex", alignItems: "baseline", gap: 18, whiteSpace: "nowrap" }}>
        <span style={{ ...label(22, INK_SOFT), width: 250 }}>From its lines</span>
        <span style={{ ...note(28, INK) }}>{charged} =</span>
        <span style={{ ...note(30, INK), fontWeight: 700 }}>
          <Mark at={paidAt - 2}>{count(fortyFourAt - 6, TOTAL_CHARGED)}</Mark>
        </span>
        <span style={{ ...body(28, true), color: INK_SOFT, opacity: ease(frame, paidAt - 2, 12) }}>what she paid</span>
      </Ink>
      <Ink at={todayAt - 4} dur={16} style={{ left: STORE_X[0], top: y(856), display: "flex", alignItems: "baseline", gap: 18, whiteSpace: "nowrap" }}>
        <span style={{ ...label(22, INK_SOFT), width: 250 }}>From today&rsquo;s prices</span>
        <span style={{ ...note(28, INK) }}>{catalog} =</span>
        <span style={{ ...note(30, ACCENT_INK), fontWeight: 700 }}>
          <Strike at={rewriteAt + 4}>{count(fortyEightAt - 6, TOTAL_CATALOG)}</Strike>
        </span>
        <span style={{ ...body(28, true), color: ACCENT_INK, opacity: ease(frame, rewriteAt - 2, 12) }}>history, rewritten</span>
      </Ink>
    </AbsoluteFill>
  );
};
