import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ADA_ROW, CUSTOMERS, PRICE_COL, PRICE_NAME, PRODUCTS } from "./data";
import { DbTable, HEAD_H, MARK, ROW_H, tableGeometry } from "./kit";
import { Bracket, Drift, Headline, Mark, pulse, STAT_INK } from "./parts";

/** The tables are set larger than a listing's, so two rows read across the room. */
const S = 1.6;
const CUSTOMERS_X = 150;
const PRODUCTS_X = 1060;
const TABLE_Y = 400;

/**
 * An entity is a type: the type becomes a table and each real thing a row.
 * The lesson's own two tables, customers (Ada, Grace) and products (Notebook,
 * Pen), with the price only one of them carries.
 */
export const TableScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const typeFrom = n.beat("type").from;
  const typeAt = n.word("type", "TYPE", { nth: 1 });
  const tableAt = n.word("type", "a table");
  const realAt = n.word("type", "each real");
  const rowAt = n.word("type", "a row");
  const customersAt = n.word("ada", "Customers");
  const theTableAt = n.word("ada", "the table");
  const adaAt = n.word("ada", "Ada");
  const oneRowAt = n.word("ada", "one row");
  const realCustomerAt = n.word("ada", "real customer");
  const productsAt = n.word("apart", "Products");
  const ownAt = n.word("apart", "own table");
  const priceAt = n.word("apart", "price");
  const doesntAt = n.word("apart", "doesn't");
  const rememberFrom = n.beat("attrs-in").from;
  const rememberAt = n.word("attrs-in", "remember");
  const end = n.beat("attrs-in").to;

  const top = y(TABLE_Y);
  const gC = tableGeometry({ x: 0, top: 0, cols: CUSTOMERS.cols, rows: CUSTOMERS.rows, headH: h(HEAD_H), rowH: h(ROW_H) });
  const gP = tableGeometry({ x: 0, top: 0, cols: PRODUCTS.cols, rows: PRODUCTS.rows, headH: h(HEAD_H), rowH: h(ROW_H) });
  const cRight = CUSTOMERS_X + gC.width * S;
  const cBottom = top + gC.bottom(CUSTOMERS.rows.length) * S;
  const adaMid = top + gC.rowMid(ADA_ROW) * S;
  const productsDim = ease(frame, rememberFrom, 16) * 0.6;
  const adaSwell = pulse(frame, rememberAt - 4, 24);

  return (
    <AbsoluteFill>
      {/* ── Sound: each table's rows, Ada's row named, the price ── */}
      <Sfx name="el-tap" at={rowAt} level={-28} />
      <Sfx name="el-pencil" at={adaAt} level={-34} />
      <Sfx name="el-tap" at={ownAt} level={-29} />
      <Sfx name="el-pencil" at={priceAt} level={-35} />

      <Drift from={doesntAt} to={end + 60} scale={0.018} origin={[700, 560]}>
        <Headline
          lead={
            <>
              One <Mark at={typeAt}>type,</Mark> one table.
            </>
          }
          leadAt={typeFrom - 6} turn="One thing, one row." turnAt={realAt - 4} />

        {/* ── customers: the entity type, and one real customer ── */}
        <div style={{ position: "absolute", left: CUSTOMERS_X, top: top - 52, display: "flex", gap: "0.3em", whiteSpace: "nowrap" }}>
          <Ink at={tableAt - 4} dur={12} style={{ position: "relative" }}>
            <span style={label(23, INK)}>customers</span>
          </Ink>
          <Ink at={customersAt - 4} dur={14} style={{ position: "relative" }}>
            <span style={{ ...label(23, INK_SOFT), fontWeight: 500 }}>is the table: every customer</span>
          </Ink>
        </div>
        <Bracket x={CUSTOMERS_X - 18} y0={top} y1={cBottom} at={theTableAt} left color={INK_SOFT} />
        <div
          style={{
            position: "absolute",
            left: CUSTOMERS_X,
            top,
            transform: `scale(${S * (1 + adaSwell * 0.015)})`,
            transformOrigin: "0 0",
          }}
        >
          <DbTable
            g={gC}
            cols={CUSTOMERS.cols}
            rows={CUSTOMERS.rows.map((cells, i) => ({ cells, at: rowAt + i * 5 }))}
            at={typeAt}
            numeric={[0]}
            bands={[{ row: ADA_ROW, at: oneRowAt - 2 }]}
          />
        </div>
        <Note at={realCustomerAt - 4} x={cRight + 28} y={adaMid - 16}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            Ada <span style={{ color: INK_SOFT }}>is one row: one real customer</span>
          </span>
        </Note>
        <Note at={doesntAt - 2} x={CUSTOMERS_X} y={cBottom + 26} from="up">
          <span style={{ ...note(23, STAT_INK), whiteSpace: "nowrap" }}>No {PRICE_NAME} here: a customer has other facts</span>
        </Note>

        {/* ── products: another type, another table ── */}
        <div style={{ position: "absolute", inset: 0, opacity: 1 - productsDim }}>
          <Ink at={productsAt - 4} dur={14} style={{ left: PRODUCTS_X, top: top - 52, whiteSpace: "nowrap" }}>
            <span style={label(23, INK)}>
              products <span style={{ color: INK_SOFT, fontWeight: 500 }}>gets a table of its own</span>
            </span>
          </Ink>
          <div style={{ position: "absolute", left: PRODUCTS_X, top, transform: `scale(${S})`, transformOrigin: "0 0" }}>
            <DbTable
              g={gP}
              cols={PRODUCTS.cols}
              rows={PRODUCTS.rows.map((cells, i) => ({ cells, at: ownAt + 2 + i * 5 }))}
              at={productsAt}
              numeric={[0, PRICE_COL]}
              marks={PRODUCTS.rows.map((_, i) => ({ row: i, col: PRICE_COL, at: priceAt + i * 4, color: MARK }))}
            />
          </div>
        </div>

        <Ink at={rememberFrom - 2} dur={18} style={{ left: CUSTOMERS_X, top: y(800), whiteSpace: "nowrap" }}>
          <span style={{ ...body(40, true), color: INK }}>What do you need to remember about each one?</span>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
