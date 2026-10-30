import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { Pt } from "../../components/arrow";
import { ease } from "../../components/motion";
import { Relation, useEntityLayout, type EntityLayout } from "../../editorial/erd";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, HAIRLINE, HIGHLIGHT, INK, note, PAPER } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { Chip, Drift, KeyArrow, OK, OK_INK, PanelHead, X0 } from "./parts";

const R_X = 1000;
const CHIP_W = 250;
const STAR_W = 230;
const CHIP_TOP = 392;
const CHIP_BOT = 522;
const STRIP_Y = 640;
const PROPS_Y = 770;

/** Short writes going by, one at a time: what an app's database does all day. */
const OPS = [
  "INSERT order 1043",
  "UPDATE customer 7 email",
  "INSERT order_item",
  "SELECT order 1043",
  "UPDATE order 1043 status",
  "INSERT order 1044",
  "SELECT customer 12",
  "INSERT order_item",
  "UPDATE product 31 price",
  "INSERT order 1045",
  "SELECT order 1044",
  "UPDATE order 1044 status",
] as const;

const Stream: React.FC<{ at: number; x: number; top: number; width: number; height: number; step: number; out?: number }> = ({
  at,
  x,
  top,
  width,
  height,
  step,
  out,
}) => {
  const frame = useCurrentFrame();
  const lineH = 36;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (frame < at || o >= 1) return null;
  return (
    <div style={{ position: "absolute", left: x, top, width, height, overflow: "hidden", opacity: 1 - o }}>
      {OPS.map((op, i) => {
        const t = (frame - (at + i * step)) / step;
        if (t < 0) return null;
        // Each op slides in at the bottom and rises a line per step, fading at the top.
        const slot = Math.min(t, 1) + Math.max(0, t - 1);
        const yy = height - lineH - slot * lineH;
        if (yy < -lineH) return null;
        const fade = Math.min(1, t * 3) * Math.min(1, Math.max(0, yy + lineH * 0.5) / (lineH * 1.2));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 0,
              top: yy,
              height: lineH,
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontFamily: MONO,
              fontSize: 21,
              color: INK,
              opacity: fade,
              whiteSpace: "nowrap",
              fontVariantLigatures: "none",
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: 4, background: BAR }} />
            {op}
          </div>
        );
      })}
    </div>
  );
};

/** A fact table's rows as thin lines, a scan sweeping down them and new rows
 *  appended at the bottom: what a warehouse does. */
const Strip: React.FC<{ at: number; scanAt: number; appendAt: number; x: number; top: number; width: number; height: number }> = ({
  at,
  scanAt,
  appendAt,
  x,
  top,
  width,
  height,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  if (p <= 0) return null;
  const rows = 22;
  const gap = height / (rows + 4);
  const appended = Math.min(4, Math.max(0, Math.floor((frame - appendAt) / 10) + 1));
  const sweep = frame < scanAt ? -1 : ((frame - scanAt) % 50) / 50;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: p }}>
      {Array.from({ length: rows + appended }, (_, i) => {
        const yy = top + i * gap;
        const fresh = i >= rows;
        const w = fresh ? ease(frame, appendAt + (i - rows) * 10, 8) : 1;
        return <line key={i} x1={x} x2={x + width * w} y1={yy} y2={yy} stroke={fresh ? OK : BAR} strokeWidth={fresh ? 3 : 2} opacity={fresh ? 1 : 0.55} />;
      })}
      {sweep >= 0 ? (
        <rect x={x - 6} y={top - 6 + sweep * (rows * gap)} width={width + 12} height={gap * 3} fill={HIGHLIGHT} opacity={0.8} rx={3} />
      ) : null}
    </svg>
  );
};

/**
 * Question 7. The app's database (OLTP): a normalized chain of tables and a
 * stream of one-row writes. The warehouse (OLAP): a star, a scan down many
 * rows and rows appended at the end. Then the arrow between them: the data
 * engineer's job.
 */
export const OltpScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("oltp").from;
  const qAt = n.word("oltp", "Question seven");
  const textAt = n.word("oltp", "What is OLTP versus OLAP");
  const oltpAt = n.word("oltp", "OLTP, online transaction processing");
  const appAt = n.word("oltp", "runs the app");
  const shortAt = n.word("oltp", "many short reads and writes");
  const normAt = n.word("oltp", "normalized to third normal form");
  const rowAt = n.word("oltp", "each write touches one row");
  const olapAt = n.word("olap", "OLAP, online analytical processing");
  const historyAt = n.word("olap", "questions about the history");
  const scanAt = n.word("olap", "each scanning a lot of rows");
  const starAt = n.word("olap", "denormalized into stars");
  const wideAt = n.word("olap", "wide tables");
  const appendAt = n.word("olap", "mostly appended to");
  const moveAt = n.word("oltp-move", "Reshaping data");
  const jobAt = n.word("oltp-move", "a data engineer's job");
  const end = n.beat("oltp-move").to;

  // ── The app's schema: a normalized chain ──
  const chip = (x: number, top: number, name: string, w = CHIP_W) => ({ x, y: y(top), width: w, name, columns: [] });
  const customers = useEntityLayout(chip(X0, CHIP_TOP, "customers"));
  const orders = useEntityLayout(chip(X0 + 340, CHIP_TOP, "orders"));
  const items = useEntityLayout(chip(X0 + 340, CHIP_BOT, "order_items"));
  const products = useEntityLayout(chip(X0, CHIP_BOT, "products"));

  // ── The warehouse: a star ──
  const dDate = useEntityLayout(chip(R_X, CHIP_TOP, "dim_date", STAR_W));
  const dCust = useEntityLayout(chip(R_X, CHIP_BOT, "dim_customer", STAR_W));
  const dStore = useEntityLayout(chip(R_X + 2 * (STAR_W + 60), CHIP_TOP, "dim_store", STAR_W));
  const dProd = useEntityLayout(chip(R_X + 2 * (STAR_W + 60), CHIP_BOT, "dim_product", STAR_W));
  const probe = useEntityLayout(chip(0, 0, "fact_sales", STAR_W));
  const factTop = (dDate.top + dCust.bottom) / 2 - probe.height / 2;
  const fact = useEntityLayout({ x: R_X + STAR_W + 60, y: factTop, width: STAR_W, name: "fact_sales", columns: [] });
  const side = (e: EntityLayout, s: "left" | "right", dy: number): Pt => [s === "left" ? e.left : e.right, (e.top + e.bottom) / 2 + dy];
  const toFact = (d: EntityLayout, s: "left" | "right", dy: number): Pt[] => {
    const a = side(d, s === "left" ? "right" : "left", 0);
    const b = side(fact, s, dy);
    const mx = (a[0] + b[0]) / 2;
    return [a, [mx, a[1]], [mx, b[1]], b];
  };

  const PROP = (top: number) => y(PROPS_Y) + h(top);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={oltpAt} level={-33} />
      <Sfx name="el-pencil" at={normAt} level={-35} />
      <Sfx name="el-tap" at={olapAt} level={-33} />
      <Sfx name="el-whoosh" at={scanAt} level={-35} />
      <Sfx name="el-sprinkle" at={appendAt} level={-36} />
      <Sfx name="el-pencil" at={moveAt + 4} level={-34} />
      <Sfx name="el-chime" at={jobAt} level={-37} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={7} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is OLTP versus OLAP, and how does schema design differ?
        </QuestionCard>

        {/* ── OLTP ── */}
        <PanelHead at={oltpAt - 2} x={X0} y={y(262)} width={760} sub="online transaction processing: the app's database" subAt={appAt}>
          OLTP
        </PanelHead>
        <Chip layout={customers} at={normAt - 6} />
        <Chip layout={orders} at={normAt - 2} />
        <Chip layout={items} at={normAt + 2} />
        <Chip layout={products} at={normAt + 6} />
        <Relation name="customers-orders" points={[customers.anchor("right"), orders.anchor("left")]} from="exactly-one" to="zero-or-many" at={normAt + 4} />
        <Relation name="orders-items" points={[orders.anchor("bottom"), items.anchor("top")]} from="exactly-one" to="zero-or-many" at={normAt + 8} />
        <Relation name="products-items" points={[products.anchor("right"), items.anchor("left")]} from="exactly-one" to="zero-or-many" at={normAt + 12} />
        <Stream at={shortAt} x={X0} top={y(STRIP_Y) - h(10)} width={700} height={h(118)} step={11} />

        <Note at={shortAt} x={X0} y={PROP(0)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>many short reads and writes, an order at a time</span>
        </Note>
        <Note at={normAt} x={X0} y={PROP(46)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            normalized: <b style={{ color: BLUE_INK }}>third normal form</b>
          </span>
        </Note>
        <Note at={rowAt} x={X0} y={PROP(92)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>each write touches one row, holds few locks</span>
        </Note>

        {/* ── OLAP ── */}
        <PanelHead at={olapAt - 2} x={R_X} y={y(262)} width={800} sub="online analytical processing: the warehouse" subAt={historyAt}>
          OLAP
        </PanelHead>
        <Chip layout={fact} at={starAt - 6} />
        <Chip layout={dDate} at={starAt - 2} />
        <Chip layout={dCust} at={starAt} />
        <Chip layout={dStore} at={starAt + 2} />
        <Chip layout={dProd} at={starAt + 4} />
        <Relation name="olap-date" points={toFact(dDate, "left", -14)} from="exactly-one" to="many" at={starAt + 2} />
        <Relation name="olap-cust" points={toFact(dCust, "left", 14)} from="exactly-one" to="many" at={starAt + 4} />
        <Relation name="olap-store" points={toFact(dStore, "right", -14)} from="exactly-one" to="many" at={starAt + 6} />
        <Relation name="olap-prod" points={toFact(dProd, "right", 14)} from="exactly-one" to="many" at={starAt + 8} />
        <Strip at={historyAt} scanAt={scanAt} appendAt={appendAt} x={R_X} top={y(STRIP_Y) - h(4)} width={790} height={h(112)} />

        <Note at={scanAt - 4} x={R_X} y={PROP(0)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>fewer queries, each scanning a lot of rows</span>
        </Note>
        <Note at={starAt} x={R_X} y={PROP(46)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            denormalized: <b style={{ color: BLUE_INK }}>stars</b>
          </span>
        </Note>
        <Note at={wideAt} x={R_X} y={PROP(92)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            wide tables, <span style={{ opacity: ease(frame, appendAt, 10), color: OK_INK, fontWeight: 650 }}>mostly appended to</span>
          </span>
        </Note>

        {/* ── Between them: the job ── */}
        <KeyArrow from={[orders.right + 30, y(CHIP_TOP) + h(100)]} to={[R_X - 30, y(CHIP_TOP) + h(100)]} at={moveAt + 2} color={OK} />
        <Note at={moveAt + 8} x={orders.right + 30} y={y(CHIP_TOP) + h(100) - 52}>
          <span style={{ ...note(22, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>reshape</span>
        </Note>
        <Note at={jobAt} x={orders.right + 4} y={y(CHIP_TOP) + h(100) + 18}>
          <div style={{ ...note(21, INK), fontWeight: 650, whiteSpace: "nowrap", background: PAPER, borderTop: `1px solid ${HAIRLINE}`, paddingTop: 6 }}>
            the data
            <br />
            engineer&apos;s job
          </div>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
