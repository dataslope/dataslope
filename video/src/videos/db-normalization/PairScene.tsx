import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Entity, Relation, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { I, ITEMS_BAD, RENAME_BAD, RENAME_GOOD, RENAMED } from "./data";
import {
  DbTable,
  Fig,
  FIG_Y,
  HEAD_H,
  Headline,
  KEY,
  Listing,
  listingHeight,
  MARK_BAD,
  MARK_KEY,
  Mono,
  ROW_H,
  tableGeometry,
  X0,
} from "./kit";
import { DepArrow, Drift, Fade, Reply, Svg } from "./parts";

const TABLE_Y = 430;
const RIGHT = 980;
const LIST_SIZE = 22;
const ERD_Y = 400;
const FIX_Y = 640;

/**
 * Second normal form: order_items_bad's composite key, the quantity that
 * depends on all of it and the product name that depends on half, the
 * rename that has to touch every line, and the lesson's split, where the
 * name lives once in products.
 */
export const PairScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("pair").from;
  const keysAt = n.word("pair", "keys");
  const partsAt = n.word("pair", "two parts");
  const pairAt = n.word("pair", "pair");
  const orderAt = n.word("pair", "order");
  const productAt = n.word("pair", "product");
  const quantityAt = n.word("whole", "Quantity");
  const wholeAt = n.word("whole", "whole pair");
  const twoAt = n.word("whole", "two notebooks");
  const tookOneAt = n.word("whole", "took one");
  const nameAt = n.word("part", "product name");
  const halfAt = n.word("part", "half");
  const tenAt = n.word("part", "Product ten");
  const notebookAt = n.word("part", "Notebook");
  const partialAt = n.word("partial", "partial dependency");
  const copiesAt = n.word("partial", "copies");
  const renameAt = n.word("partial", "rename");
  const changesAt = n.word("partial", "changes");
  const rowsAt = n.word("partial", "two rows");
  const moveFrom = n.beat("move").from;
  const movesAt = n.word("move", "moves");
  const productsAt = n.word("move", "products");
  const renameGoodAt = n.word("move", "rename");
  const oneRowAt = n.word("move", "one row");
  const inFrom = n.beat("chain-in").from;
  const sneakierAt = n.word("chain-in", "sneakier");
  const end = n.beat("chain-in").to;

  const g = tableGeometry({
    x: X0,
    top: y(TABLE_Y),
    cols: ITEMS_BAD.cols,
    rows: ITEMS_BAD.rows,
    extra: [[null, null, RENAMED, null]],
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });
  const center = (j: number) => g.xs[j] + g.widths[j] / 2;
  const bottom = g.bottom(ITEMS_BAD.rows.length);
  const bracketL = g.xs[I.order] + 8;
  const bracketR = g.xs[I.product] + g.widths[I.product] - 8;
  const bracketY = g.top - 14;
  const bracketMid = (bracketL + bracketR) / 2;
  const bracketIn = ease(frame, pairAt - 2, 14);
  const product10 = ITEMS_BAD.rows[0][I.product];
  const tenRows = ITEMS_BAD.rows.map((r, i) => (r[I.product] === product10 ? i : -1)).filter((i) => i >= 0);
  const listH = listingHeight(RENAME_BAD.lines.length, LIST_SIZE);

  const items = useEntityLayout({
    x: 640,
    y: y(ERD_Y),
    width: 440,
    name: "order_items",
    columns: [
      { name: "order_id", type: "integer", key: "PK, FK" },
      { name: "product_id", type: "integer", key: "PK, FK" },
      { name: "quantity", type: "integer" },
    ],
  });
  const orders = useEntityLayout({
    x: X0,
    y: y(ERD_Y),
    width: 330,
    name: "orders",
    columns: [
      { name: "id", type: "integer", key: "PK" },
      { name: "order_date", type: "date" },
    ],
  });
  const products = useEntityLayout({
    x: 1280,
    y: y(ERD_Y),
    width: 330,
    name: "products",
    columns: [
      { name: "id", type: "integer", key: "PK" },
      { name: "name", type: "text" },
    ],
  });
  const o = orders.anchor("right", "id");
  const io = items.anchor("left", "order_id");
  const p = products.anchor("left", "id");
  const ip = items.anchor("right", "product_id");
  const oMid = (o[0] + io[0]) / 2;
  const pMid = (p[0] + ip[0]) / 2;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={wholeAt} level={-34} />
      <Sfx name="el-pencil" at={halfAt - 4} level={-33} />
      <Sfx name="el-tap" at={rowsAt - 2} level={-27} />
      <Sfx name="el-whoosh" at={moveFrom} level={-34} />
      <Sfx name="el-pop" at={productsAt - 4} level={-30} />
      <Sfx name="el-tap" at={oneRowAt - 2} level={-28} />

      <Headline kicker="Second normal form" lead="The whole key," turn="not half." at={from - 6} turnAt={halfAt - 4} underlineAt={partialAt} />

      <Drift from={from} to={end + 40} amount={0.012} origin="35% 55%">
        {/* ── The table with a composite key ── */}
        <Fade out={moveFrom} slide={40}>
          <Fig n="6" at={keysAt - 4} y={y(FIG_Y)}>
            <Mono>order_items_bad</Mono>, keyed by a pair
          </Fig>
          <DbTable
            g={g}
            cols={ITEMS_BAD.cols}
            rows={ITEMS_BAD.rows.map((cells, i) => ({ cells, at: partsAt + i * 5 }))}
            at={keysAt}
            numeric={[I.order, I.product, I.qty]}
            marks={[
              ...ITEMS_BAD.rows.map((_, i) => ({ row: i, col: I.order, at: orderAt + i * 3, color: MARK_KEY })),
              ...ITEMS_BAD.rows.map((_, i) => ({ row: i, col: I.product, at: productAt + i * 3, color: MARK_KEY })),
              { row: 0, col: I.qty, at: twoAt },
              { row: 2, col: I.qty, at: tookOneAt },
              ...tenRows.map((row, k) => ({ row, col: I.product, at: tenAt + k * 5 })),
              ...tenRows.map((row, k) => ({ row, col: I.name, at: notebookAt + k * 5 })),
              ...tenRows.map((row, k) => ({ row, col: I.name, at: copiesAt + k * 6, color: MARK_BAD })),
            ]}
            swaps={tenRows.map((row, k) => ({ row, col: I.name, at: changesAt + k * 6, value: RENAMED, color: ACCENT_INK }))}
          />
          {/* The key: both columns, together. */}
          <Svg opacity={bracketIn}>
            <path
              d={`M${bracketL},${bracketY + 10} L${bracketL},${bracketY} L${bracketMid + (bracketL - bracketMid) * (1 - bracketIn)},${bracketY} M${bracketR},${bracketY + 10} L${bracketR},${bracketY} L${bracketMid + (bracketR - bracketMid) * (1 - bracketIn)},${bracketY}`}
              fill="none"
              stroke={KEY}
              strokeWidth={2.6}
              strokeLinejoin="round"
            />
          </Svg>
          <Ink at={pairAt} dur={12} style={{ left: X0 + 4, top: bracketY - 46, whiteSpace: "nowrap" }}>
            <span style={label(21, BLUE_INK)}>the key</span>
          </Ink>
          {/* Quantity needs the whole pair; the name needs half of it. */}
          <DepArrow from={[bracketMid, bracketY]} to={[center(I.qty), g.top - 6]} level={g.top - 72} at={wholeAt - 2} color={BLUE_INK} />
          <Ink at={quantityAt} dur={12} style={{ left: center(I.qty) + 18, top: g.top - 112, whiteSpace: "nowrap" }}>
            <span style={label(21, BLUE_INK)}>needs the whole pair</span>
          </Ink>
          <DepArrow from={[center(I.product), bottom + 8]} to={[center(I.name), bottom + 6]} level={bottom + 62} at={halfAt - 4} color={ACCENT} />
          <Ink at={nameAt} dur={12} style={{ left: center(I.name) + 18, top: bottom + 22, whiteSpace: "nowrap" }}>
            <span style={label(21, ACCENT_INK)}>needs half</span>
          </Ink>
          <Ink at={partialAt} dur={14} style={{ left: center(I.product) - 10, top: bottom + 76, whiteSpace: "nowrap" }}>
            <span style={{ ...note(23, ACCENT_INK), fontWeight: 600 }}>a partial dependency</span>
          </Ink>

          {/* The rename that has to find every line. */}
          <Listing
            lines={RENAME_BAD.lines}
            x={RIGHT}
            top={g.top}
            width={600}
            size={LIST_SIZE}
            at={renameAt - 8}
            lineAt={[renameAt - 4, renameAt + 2, changesAt - 6]}
            marks={[{ line: 1, at: changesAt }]}
          />
          <Reply at={rowsAt - 2} x={RIGHT} y={g.top + listH + 18}>
            {RENAME_BAD.tag}
          </Reply>
          <Note at={rowsAt + 6} x={RIGHT + 150} y={g.top + listH + 24}>
            <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>one name, {tenRows.length} rows</span>
          </Note>
        </Fade>

        {/* ── The split: the name moves to products ── */}
        <Fade at={movesAt - 6} dimAt={sneakierAt} dim={0.45}>
          <Fig n="7" at={movesAt - 6} y={y(FIG_Y)}>
            Facts about a product, keyed by the product
          </Fig>
          <Entity layout={items} at={movesAt - 2} marks={{ quantity: { at: inFrom, tone: "key" } }} />
          <Entity layout={products} at={productsAt - 4} marks={{ name: { at: renameGoodAt } }} />
          <Entity layout={orders} at={productsAt + 4} />
          <Relation
            name="orders has order_items"
            points={[o, [oMid, o[1]], [oMid, io[1]], io]}
            from="exactly-one"
            to="zero-or-many"
            at={productsAt + 8}
            label="has"
          />
          <Relation
            name="products appears in order_items"
            points={[p, [pMid, p[1]], [pMid, ip[1]], ip]}
            from="exactly-one"
            to="zero-or-many"
            at={productsAt + 2}
            label="appears"
          />
          <Listing
            lines={RENAME_GOOD.lines}
            x={products.x}
            top={y(FIX_Y)}
            width={470}
            size={LIST_SIZE}
            at={renameGoodAt - 6}
            lineAt={[renameGoodAt - 2, renameGoodAt + 3, renameGoodAt + 8]}
          />
          <Reply at={oneRowAt - 2} x={products.x} y={y(FIX_Y) + listH + 18}>
            {RENAME_GOOD.tag}
          </Reply>
          <Note at={inFrom} x={items.x} y={items.bottom + 24}>
            <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>keeps only what needs the whole pair</span>
          </Note>
        </Fade>
      </Drift>
    </AbsoluteFill>
  );
};
