import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ADA, ANSWER, COUNTS, CUSTOMERS, LISTING, ON_DISK, ORDERS, SAME_ANSWER } from "./data";
import {
  cellCenter,
  columnWidths,
  type Column,
  Headline,
  KEY,
  KEY_INK,
  KEY_WASH,
  Listing,
  listingHeight,
  Mark,
  MovingTable,
  PaperPage,
  Strike,
  Svg,
  Tick,
} from "./parts";

const CUST_COLS: Column[] = [{ title: "id", numeric: true, ink: KEY_INK }, { title: "name" }];
const ORDER_COLS: Column[] = [
  { title: "id", numeric: true },
  { title: "customer_id", numeric: true, ink: KEY_INK },
  { title: "total", numeric: true },
  { title: "stored at", ink: INK_SOFT },
];
const ANSWER_COLS: Column[] = [{ title: "order_id", numeric: true }, { title: "total", numeric: true }];

/**
 * Part 1, Codd's idea: the 1970 paper, then the lesson's two tables linked by
 * a shared value instead of a pointer. The rows are rewritten on disk in a
 * new order (CLUSTER, in check.mjs: every ctid changes) and the lesson's query
 * gives back the same two orders: data independence.
 */
export const CoddScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const coddFrom = n.beat("codd").from;
  const juneAt = n.word("codd", "June");
  const seventyAt = n.word("codd", "nineteen seventy");
  const tedAt = n.word("codd", "Ted Codd");
  const britishAt = n.word("codd", "British-born");
  const ibmAt = n.word("codd", "IBM");
  const publishedAt = n.word("codd", "published");
  const plainAt = n.word("codd", "almost too plain");
  const keepAt = n.word("values", "Keep");
  const tablesAt = n.word("values", "tables");
  const linkAt = n.word("values", "link");
  const valueAt = n.word("values", "by value");
  const pointerAt = n.word("values", "pointer");
  const orderAt = n.word("values", "Order");
  const adasAt = n.word("values", "Ada's");
  const numberAt = n.word("values", "her number");
  const oneAt = n.word("values", "one");
  const storeAt = n.word("shuffle", "store rows");
  const likesAt = n.word("shuffle", "likes");
  const shuffleAt = n.word("shuffle", "Shuffle");
  const diskAt = n.word("shuffle", "disk");
  const againAt = n.word("shuffle", "again");
  const sameAt = n.word("shuffle", "SAME");
  const independenceAt = n.word("independence", "data independence");
  const wantsAt = n.word("independence", "what it wants");
  const whereAt = n.word("independence", "where to walk");

  // ── The tables ──
  const HEAD_H = h(48);
  const ROW_H = h(54);
  const TOP = y(350);
  const CX = 150;
  const custRows = CUSTOMERS.map((c) => [String(c.id), c.name]);
  const custW = columnWidths(CUST_COLS, custRows);
  const OX = CX + custW.reduce((a, b) => a + b, 0) + 110;
  const before = new Map(ON_DISK.before.map((p, i) => [p.id, { slot: i, ctid: p.ctid }]));
  const after = new Map(ON_DISK.after.map((p, i) => [p.id, { slot: i, ctid: p.ctid }]));
  // Rows in the order a scan met them before the rewrite.
  const placed = ON_DISK.before.map((p) => ORDERS.find((o) => o.id === p.id)!);
  const orderRows = placed.map((o) => [String(o.id), String(o.customerId), o.total, before.get(o.id)!.ctid]);
  const orderW = columnWidths(ORDER_COLS, [...orderRows, ...ON_DISK.after.map((p) => ["", "", "", p.ctid])]);
  const adaOrder = placed.findIndex((o) => o.customerId === ADA.id);
  const adaRow = CUSTOMERS.findIndex((c) => c.id === ADA.id);

  // ── The query and its answer, on the right ──
  const LX = OX + orderW.reduce((a, b) => a + b, 0) + 90;
  const LTOP = y(346);
  const listingH = listingHeight(LISTING.length, 22);
  const ATOP = LTOP + listingH + h(64);
  const answerRows = (rows: typeof ANSWER.before) => rows.map((r) => [String(r.orderId), r.total]);
  const answerW = columnWidths(ANSWER_COLS, answerRows(ANSWER.before));
  const answerRight = LX + answerW.reduce((a, b) => a + b, 0);
  const askAt = adasAt - 2;
  const answerAt = oneAt - 2;

  // The two "1"s that make order 101 Ada's, and the short rule between the
  // tables that says they match: a value, not a pointer, so no arrowhead.
  const [, rowY] = cellCenter(CX, TOP, custW, HEAD_H, ROW_H, adaRow, 0);
  const custRight = CX + custW.reduce((a, b) => a + b, 0);
  const match = ease(frame, oneAt - 2, 12);

  return (
    <AbsoluteFill>
      {/* ── Sound: the paper, the rows, the match, the shuffle, the answer ── */}
      <Sfx name="el-whoosh" at={juneAt - 10} level={-33} />
      <Sfx name="el-tap" at={seventyAt} level={-29} />
      <Sfx name="el-sprinkle" at={tablesAt - 4} level={-34} />
      <Sfx name="el-tap" at={oneAt - 2} level={-28} />
      <Sfx name="el-whoosh" at={shuffleAt - 2} level={-32} />
      <Sfx name="el-pop" at={againAt + 2} level={-30} />
      <Sfx name="el-pencil" at={sameAt - 2} level={-34} />

      <Headline at={plainAt - 6} lead="An idea almost too plain." out={keepAt - 4} />
      <Headline at={linkAt - 4} lead="Link rows by value," turn="not by pointer." turnAt={pointerAt - 6} out={independenceAt - 6} />
      <Headline at={independenceAt - 2} lead="Data independence." />

      {/* ── The paper, and who wrote it ── */}
      <PaperPage
        x={120}
        top={y(310)}
        width={540}
        height={500}
        at={juneAt - 10}
        titleAt={publishedAt - 4}
        authorAt={tedAt - 2}
        dateAt={seventyAt}
        textAt={plainAt}
        authorMark={tedAt + 4}
        out={keepAt - 6}
      />
      <Ink at={britishAt - 2} dur={14} out={keepAt - 6} style={{ left: 730, top: y(360), whiteSpace: "nowrap" }}>
        <div style={{ ...label(24, INK) }}>Ted Codd</div>
        <div style={{ ...body(28, true), marginTop: 8 }}>a British-born mathematician</div>
      </Ink>
      <Ink at={ibmAt - 2} dur={14} out={keepAt - 6} style={{ left: 730, top: y(470), whiteSpace: "nowrap" }}>
        <div style={{ ...body(28, true) }}>at IBM&apos;s lab in San Jose</div>
      </Ink>
      <Ink at={publishedAt - 2} dur={14} out={keepAt - 6} style={{ left: 730, top: y(560), whiteSpace: "nowrap" }}>
        <div style={{ ...note(21, INK_SOFT) }}>Communications of the ACM 13(6), pp. 377–387</div>
      </Ink>

      {/* ── The tables ── */}
      <FigLabel
        n="2"
        title={`Three of the lesson's ${COUNTS.customers} customers, and their orders`}
        at={tablesAt - 6}
        x={CX}
        y={y(290)}
      />
      <MovingTable
        x={CX}
        top={TOP}
        cols={CUST_COLS}
        widths={custW}
        headH={HEAD_H}
        rowH={ROW_H}
        at={tablesAt - 6}
        rows={custRows.map((cells, i) => ({
          cells,
          at: tablesAt + i * 4,
          slot: i,
          bands: i === adaRow ? [{ at: adasAt - 2, out: storeAt }] : undefined,
        }))}
        marks={[
          ...CUSTOMERS.map((_, i) => ({ row: i, col: 0, at: valueAt + i * 3, out: orderAt, color: KEY_WASH })),
          { row: adaRow, col: 0, at: oneAt - 2, out: storeAt, color: KEY_WASH },
        ]}
      />
      <MovingTable
        x={OX}
        top={TOP}
        cols={ORDER_COLS}
        widths={orderW}
        headH={HEAD_H}
        rowH={ROW_H}
        at={tablesAt}
        moveAt={shuffleAt - 2}
        colAt={{ 3: storeAt - 4 }}
        colDim={{ 3: whereAt }}
        rows={placed.map((o, i) => ({
          cells: orderRows[i],
          at: tablesAt + 6 + i * 3,
          slot: before.get(o.id)!.slot,
          to: after.get(o.id)!.slot,
          after: { 3: after.get(o.id)!.ctid },
          bands:
            o.customerId === ADA.id
              ? [...(i === adaOrder ? [{ at: orderAt - 2, out: storeAt }] : []), { at: sameAt - 2, out: independenceAt + 10 }]
              : undefined,
        }))}
        marks={[
          ...placed.map((_, i) => ({ row: i, col: 1, at: valueAt + 4 + i * 3, out: orderAt, color: KEY_WASH })),
          { row: adaOrder, col: 1, at: oneAt - 2, out: storeAt, color: KEY_WASH },
        ]}
      />
      {/* "stored at": the row's place on disk, as Postgres names it (its ctid). */}
      <Ink at={likesAt - 2} dur={12} out={whereAt + 20} style={{ left: OX + orderW[0] + orderW[1] + orderW[2] + 8, top: TOP + HEAD_H + 6 * ROW_H + 14, whiteSpace: "nowrap" }}>
        <span style={{ ...note(20, INK_SOFT) }}>
          <Strike at={whereAt}>block, slot on disk</Strike>
        </span>
      </Ink>
      {match > 0 ? (
        <Svg opacity={match * (1 - ease(frame, storeAt, 12))}>
          <line x1={custRight + 10} x2={custRight + 10 + 90 * match} y1={rowY} y2={rowY} stroke={KEY} strokeWidth={2.4} strokeDasharray="5 5" />
          <circle cx={custRight + 10} cy={rowY} r={4} fill={KEY} />
          <circle cx={custRight + 10 + 90 * match} cy={rowY} r={4} fill={KEY} />
        </Svg>
      ) : null}

      {/* ── The question, and its answer before and after the shuffle ── */}
      <Listing
        lines={LISTING}
        x={LX}
        top={LTOP}
        width={650}
        at={askAt - 4}
        lineAt={LISTING.map((_, i) => askAt + i * 4)}
        marks={[
          { line: 0, at: againAt - 4, out: againAt + 10, color: `color-mix(in srgb, ${HIGHLIGHT} 60%, transparent)` },
          { line: 3, at: wantsAt - 2 },
        ]}
      />
      <Ink at={answerAt - 4} dur={12} style={{ left: LX, top: ATOP - h(40), whiteSpace: "nowrap" }}>
        <span style={{ ...label(21, INK) }}>Ada&apos;s orders</span>
      </Ink>
      <MovingTable
        x={LX}
        top={ATOP}
        cols={ANSWER_COLS}
        widths={answerW}
        headH={HEAD_H}
        rowH={ROW_H}
        at={answerAt - 4}
        out={againAt}
        rows={answerRows(ANSWER.before).map((cells, i) => ({ cells, at: answerAt + i * 4, slot: i }))}
      />
      <MovingTable
        x={LX}
        top={ATOP}
        cols={ANSWER_COLS}
        widths={answerW}
        headH={HEAD_H}
        rowH={ROW_H}
        at={againAt + 4}
        rows={answerRows(ANSWER.after).map((cells, i) => ({
          cells,
          at: againAt + 8 + i * 4,
          slot: i,
          bands: [{ at: sameAt - 2 + i * 3 }],
        }))}
      />
      {SAME_ANSWER ? (
        <>
          <Tick x={answerRight + 44} y={ATOP + HEAD_H + ROW_H} at={sameAt} />
          <Ink at={sameAt + 4} dur={12} style={{ left: answerRight + 80, top: ATOP + HEAD_H + ROW_H - 16, whiteSpace: "nowrap" }}>
            <span style={{ ...note(22, KEY_INK), fontWeight: 650 }}>same answer</span>
          </Ink>
        </>
      ) : null}

      {/* ── What Codd's paper opens with ── */}
      <Ink at={independenceAt + 6} dur={22} style={{ left: LX, top: ATOP + HEAD_H + 2 * ROW_H + h(44), width: 720 }}>
        <div style={{ ...body(27, true), color: INK, lineHeight: 1.3 }}>
          Future users of large data banks must be protected from having to know{" "}
          <Mark at={whereAt - 2}>how the data is organized</Mark> in the machine.
        </div>
        <div style={{ ...note(20, INK_SOFT), marginTop: 10 }}>Codd, 1970, the paper&apos;s first sentence</div>
      </Ink>
    </AbsoluteFill>
  );
};
