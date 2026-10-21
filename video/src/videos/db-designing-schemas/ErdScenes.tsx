import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, body, fmt, HIGHLIGHT, INK, INK_SOFT, label, note, TABULAR } from "../../editorial/style";
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
  TRIED,
  ZERO_QUANTITY,
} from "./data";
import { DbTable, ErrorBox, Head, Leave, Mark, MARK_BAD, MARK_KEY, Mono, Strike, type TableGeometry, tableGeometry, widenTo } from "./parts";
import { STORE_BOTTOM, STORE_TOP, STORE_X } from "./StoreErd";

/** Where the rows tried and Postgres's answers sit: under the diagram. */
const ERROR_Y = 806;
/** The page margin: the rail ends above this band. */
const RIGHT = 1824;

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
      <Head at={factsFrom - 2} second={n.word("facts", "describes", { nth: 1 })} out={pointerFrom - 6} italic="where it belongs.">
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
      <Head at={n.beat("relate").from - 6} second={n.word("relate", "One customer", { nth: 1 })} out={pairsFrom - 6} italic="Both ways.">
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
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const keysFrom = n.beat("keys").from;
  const sameAt = n.word("keys", "same product");
  const cantAt = n.word("keys", "can't");
  const oneOrderAt = n.word("keys", "one order");
  const twiceAt = n.word("keys", "twice");
  const rulesFrom = n.beat("rules").from;
  const refusedAt = n.word("rules", "refused");
  const lineAt = n.word("rules", "a line");
  const zeroAt = n.word("rules", "zero mugs");

  // Each tried line drawn as the one-row table it would have been, with
  // Postgres's answer beside it.
  const tried = (row: readonly (string | null)[]) =>
    tableGeometry({ x: STORE_X[0], top: y(ERROR_Y), cols: ITEM_COLS, rows: [row], headH: h(44), rowH: h(52) });
  const dup = tried(TRIED.duplicate);
  const zero = tried(TRIED.zero);
  const errorX = (g: { x: number; width: number }) => g.x + g.width + 36;
  const dupOut = rulesFrom - 6;
  // A refused line is struck through in the accent as the refusal is said.
  const struck = (g: TableGeometry, at: number) => (
    <div
      style={{
        position: "absolute",
        left: g.x - 6,
        top: g.rowMid(0) - 1.5,
        width: (g.width + 12) * ease(frame, at, 12),
        height: 3,
        borderRadius: 2,
        background: ACCENT,
      }}
    />
  );
  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={sameAt - 4} level={-35} />
      <Sfx name="el-tap" at={cantAt - 2} level={-28} />
      <Sfx name="el-tap" at={refusedAt - 2} level={-27} />
      <Sfx name="el-pencil" at={lineAt - 4} level={-35} />
      <Sfx name="el-scratch" at={twiceAt} level={-33} />
      <Sfx name="el-scratch" at={refusedAt + 2} level={-33} />
      <Head at={keysFrom - 6} second={rulesFrom - 2} italic="then rules.">
        Keys first,
      </Head>

      {/* "The same product can't land on one order twice": the line tried, and the refusal. */}
      <Leave out={dupOut}>
        <DbTable
          g={dup}
          cols={ITEM_COLS}
          rows={[{ cells: TRIED.duplicate, at: sameAt }]}
          at={sameAt - 4}
          numeric={[0, 1, 2, 3]}
          marks={[
            { row: 0, col: 1, at: sameAt + 4, color: MARK_KEY },
            { row: 0, col: 0, at: oneOrderAt - 2, color: MARK_KEY },
          ]}
        />
        {struck(dup, twiceAt)}
      </Leave>
      <ErrorBox
        x={errorX(dup)}
        top={y(ERROR_Y)}
        width={RIGHT - errorX(dup)}
        at={cantAt - 2}
        out={dupOut}
        message={DUPLICATE_LINE.message}
        detail={DUPLICATE_LINE.detail}
      />

      {/* "A line for zero mugs": the row tried, until Postgres refuses it. */}
      <DbTable
        g={zero}
        cols={ITEM_COLS}
        rows={[{ cells: TRIED.zero, at: lineAt }]}
        at={lineAt - 4}
        numeric={[0, 1, 2, 3]}
        marks={[{ row: 0, col: 2, at: zeroAt - 2, color: MARK_BAD }]}
      />
      {struck(zero, refusedAt + 2)}
      <ErrorBox x={errorX(zero)} top={y(ERROR_Y)} width={RIGHT - errorX(zero)} at={refusedAt - 2} message={ZERO_QUANTITY.message} detail={ZERO_QUANTITY.detail} />
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
  const purposeAt = n.word("copy", "on purpose");
  const mugFrom = n.beat("mug").from;
  const tenAt = n.word("mug", "ten dollars");
  const twelveAt = n.word("mug", "twelve");
  const linesAt = n.word("history", "lines");
  const fortyFourAt = n.word("history", "forty-four");
  const paidAt = n.word("history", "paid");
  const todayAt = n.word("history", "today's prices");
  const fortyEightAt = n.word("history", "forty-eight");
  const rewriteAt = n.word("history", "rewrite");
  const withoutAt = n.word("without", "Without that copy");
  const reviewFrom = n.beat("review").from;
  const walkAt = n.word("review", "walk");

  const tableAt = mugFrom + 6;
  const items = tableGeometry({ x: STORE_X[0], top: y(STORE_TOP + 8), cols: ITEM_COLS, rows: ITEM_ROWS, headH: h(52), rowH: h(62) });
  // Both tables end on one edge, so the two price columns line up.
  const products = widenTo(
    tableGeometry({ x: STORE_X[0], top: y(STORE_BOTTOM + 8), cols: PRODUCT_COLS, rows: PRODUCT_ROWS, headH: h(52), rowH: h(62) }),
    items.width,
  );
  const mugProduct = PRODUCT_ROWS.findIndex((p) => p[0] === ITEM_ROWS[MUG][1]);

  // Each total lands on its word, as the database returns it: nothing shows
  // in its place before then.
  const lands = (at: number): React.CSSProperties => {
    const p = ease(frame, at - 4, 8);
    return { display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 6}px)` };
  };
  // "Without that copy": the second line's label says what it stands for.
  const swap = ease(frame, withoutAt - 2, 10);
  const charged = sumOf((r) => r[3] as string);
  const catalog = sumOf((r) => productOf(r)[2] as string);
  // "Walk real rows through the design": each stored row lit in turn.
  const walk = (k: number) => walkAt + k * 7;
  const breaksAt = n.word("review", "breaks");
  const nowAt = n.word("then", "today");
  const thenAt = n.word("then", "back then");
  const productsAt = n.word("then", "Products");
  const itemsAt = n.word("then", "Order items");
  const tagsOut = mugFrom - 6;

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={tableAt} level={-30} />
      <Sfx name="el-tap" at={tenAt} level={-29} />
      <Sfx name="el-tap" at={twelveAt} level={-29} />
      <Sfx name="el-pop" at={fortyFourAt - 4} level={-29} />
      <Sfx name="el-pop" at={fortyEightAt - 4} level={-30} />
      <Sfx name="el-scratch" at={rewriteAt} level={-30} />
      <Sfx name="el-chime" at={reviewFrom - 14} level={-33} />

      <Head at={copyFrom - 6} second={purposeAt - 4} out={reviewFrom - 6} italic="copied on purpose.">
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
        ]}
      />

      {/* "Products holds the price today. Order items holds the price charged." */}
      <Ink at={productsAt - 4} dur={16} out={tagsOut} style={{ left: STORE_X[0], top: y(800), whiteSpace: "nowrap" }}>
        <span style={{ ...body(32), color: INK }}>
          <Mono>products.current_price</Mono> is the price <Mark at={nowAt - 2}>today</Mark>
        </span>
      </Ink>
      <Ink at={itemsAt - 4} dur={16} out={tagsOut} style={{ left: STORE_X[0], top: y(856), whiteSpace: "nowrap" }}>
        <span style={{ ...body(32), color: INK }}>
          <Mono>order_items.unit_price</Mono> is the price charged, <Mark at={thenAt - 2}>back then</Mark>
        </span>
      </Ink>
      {/* "Walk real rows through the design": each stored row lit across, in turn. */}
      {[...ITEM_ROWS.map((_, i) => ({ g: items, i })), ...PRODUCT_ROWS.map((_, i) => ({ g: products, i }))].map(({ g, i }, k) => {
        const w = ease(frame, walk(k), 10);
        const o = ease(frame, walk(k) + 22, 12);
        if (w <= 0 || o >= 1) return null;
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: g.x,
              top: g.rowTop(i) + 4,
              width: g.width * w,
              height: g.rowH - 8,
              background: HIGHLIGHT,
              mixBlendMode: "multiply",
              opacity: 1 - o,
            }}
          />
        );
      })}
      {/* "See what breaks": the total from today's prices, lit in the accent. */}
      {frame >= breaksAt - 4 ? (
        <div
          style={{
            position: "absolute",
            left: STORE_X[0] - 10,
            top: y(856) - 6,
            width: 1000 * ease(frame, breaksAt - 4, 14),
            height: 52,
            background: MARK_BAD,
            mixBlendMode: "multiply",
            borderRadius: 4,
          }}
        />
      ) : null}

      {/* The two totals, from the price charged and from today's. */}
      <Ink at={linesAt - 4} dur={16} style={{ left: STORE_X[0], top: y(800), display: "flex", alignItems: "baseline", gap: 18, whiteSpace: "nowrap" }}>
        <span style={{ ...label(22, INK_SOFT), width: 250 }}>From its lines</span>
        <span style={{ ...note(28, INK) }}>{charged} =</span>
        <span style={{ ...note(30, INK), ...TABULAR, fontWeight: 700, ...lands(fortyFourAt) }}>
          <Mark at={paidAt - 2}>{fmt(Number(TOTAL_CHARGED), 2)}</Mark>
        </span>
        <span style={{ ...body(28, true), color: INK_SOFT, opacity: ease(frame, paidAt - 2, 12) }}>what she paid</span>
      </Ink>
      <Ink at={todayAt - 4} dur={16} style={{ left: STORE_X[0], top: y(856), display: "flex", alignItems: "baseline", gap: 18, whiteSpace: "nowrap" }}>
        <span style={{ ...label(22, INK_SOFT), width: 250, display: "grid" }}>
          <span style={{ gridArea: "1 / 1", opacity: 1 - swap }}>From today&rsquo;s prices</span>
          <span style={{ gridArea: "1 / 1", opacity: swap, color: ACCENT_INK, fontWeight: 650 }}>Without the copy</span>
        </span>
        <span style={{ ...note(28, INK) }}>{catalog} =</span>
        <span style={{ ...note(30, ACCENT_INK), ...TABULAR, fontWeight: 700, ...lands(fortyEightAt) }}>
          <Mark at={n.word("without", "all it could say") - 2} color={MARK_BAD}>
            <Strike at={rewriteAt + 4}>{fmt(Number(TOTAL_CATALOG), 2)}</Strike>
          </Mark>
        </span>
        <span style={{ ...body(28, true), color: ACCENT_INK, opacity: ease(frame, rewriteAt - 2, 12) }}>would rewrite history</span>
      </Ink>
    </AbsoluteFill>
  );
};
