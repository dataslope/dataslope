import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { LATE, STALE, SUM_BUILD_TAG, SUM_ITEMS, SUM_ORDERS, SUMMARY } from "./data";
import { DbTable, Fig, FIG_Y, HEAD_H, Headline, KEY, KEY_INK, MARK, MARK_BAD, Mono, ROW_H, tableGeometry, X0 } from "./kit";
import { Drift, Reply, SmallArrow, Svg } from "./parts";

const NAMES_Y = 336;
const TABLES_Y = 380;
const ITEMS_X = 440;
const SUMMARY_X = 1060;

/**
 * Denormalization: a daily summary built from orders and order_items (the
 * lesson's own tables and INSERT ... SELECT), the reads it makes simple, the
 * late line item that leaves it stale, and the source of truth it answers to.
 */
export const SummaryScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("summary").from;
  const reportAt = n.word("summary", "report");
  const soldAt = n.word("summary", "sold");
  const dayAt = n.word("summary", "each day");
  const storeAt = n.word("summary", "store");
  const tableAt = n.word("summary", "summary table");
  const tenthAt = n.word("days", "January tenth");
  const fiftyAt = n.word("days", "thirty-two fifty");
  const eleventhAt = n.word("days", "eleventh");
  const twelveAt = n.word("days", "twelve dollars");
  const denormAt = n.word("denorm", "denormalization");
  const purposeAt = n.word("denorm", "on purpose");
  const simplerAt = n.word("denorm", "simpler");
  const fourAt = n.word("stale", "four dollars");
  const saysAt = n.word("stale", "still says twelve");
  const staleAt = n.word("stale", "stale");
  const planAt = n.word("sync", "sync plan");
  const truthAt = n.word("sync", "source of truth");
  const end = n.beat("sync").to;

  const geo = (x: number, t: { cols: readonly string[]; rows: readonly (readonly (string | null)[])[] }, extra: (string | null)[][] = []) =>
    tableGeometry({ x, top: y(TABLES_Y), cols: t.cols, rows: t.rows, extra, headH: h(HEAD_H), rowH: h(ROW_H) });
  const og = geo(X0, SUM_ORDERS);
  const ig = geo(ITEMS_X, SUM_ITEMS, [[...LATE.row]]);
  const sg = geo(SUMMARY_X, SUMMARY);

  const day = (d: string | null) => SUM_ORDERS.rows.filter((r) => r[1] === d).map((r) => r[0]);
  const ordersOn = (d: string | null) => SUM_ORDERS.rows.map((r, i) => (r[1] === d ? i : -1)).filter((i) => i >= 0);
  const itemsOn = (d: string | null) => SUM_ITEMS.rows.map((r, i) => (day(d).includes(r[1]) ? i : -1)).filter((i) => i >= 0);
  const [d0, d1] = [SUMMARY.rows[0][0], SUMMARY.rows[1][0]];
  const late = SUM_ITEMS.rows.length;
  const stale = STALE.rows.find((r) => r[1] !== r[2])!;
  const staleRow = SUMMARY.rows.findIndex((r) => r[0] === stale[0]);
  const arrowY = sg.rowMid(0);
  const sourcesBottom = ig.bottom(SUM_ITEMS.rows.length + 1);

  const dayMarks = (d: string | null, at: number, out: number, total: number, totalOut: number) => ({
    orders: ordersOn(d).map((row, k) => ({ row, col: 1, at: at + k * 4, out })),
    items: itemsOn(d).map((row, k) => ({ row, col: 2, at: total + k * 4, out: totalOut })),
  });
  const m0 = dayMarks(d0, tenthAt, eleventhAt, fiftyAt, eleventhAt);
  const m1 = dayMarks(d1, eleventhAt, denormAt, twelveAt, denormAt);

  const name = (x: number, text: string, at: number) => (
    <Ink at={at} dur={12} style={{ left: x, top: y(NAMES_Y), whiteSpace: "nowrap" }}>
      <span style={label(22, INK)}>
        <Mono>{text}</Mono>
      </span>
    </Ink>
  );

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={reportAt} level={-30} />
      <Sfx name="el-whoosh" at={storeAt - 2} level={-34} />
      <Sfx name="el-tap" at={tableAt + 6} level={-28} />
      <Sfx name="el-pop" at={fourAt} level={-30} />
      <Sfx name="el-tap" at={saysAt + 4} level={-28} />
      <Sfx name="el-pencil" at={truthAt - 2} level={-34} />

      <Headline kicker="Denormalization" lead="A copy," turn="on purpose." at={from - 6} turnAt={denormAt - 4} underlineAt={purposeAt} />

      <Drift from={from} to={end + 40} amount={0.012} origin="40% 50%">
        <Fig n="10" at={reportAt - 6} y={y(FIG_Y)}>
          A daily summary, built from the orders
        </Fig>

        {/* The source tables. */}
        {name(og.x, "orders", reportAt - 2)}
        {name(ig.x, "order_items", soldAt - 4)}
        <DbTable
          g={og}
          cols={SUM_ORDERS.cols}
          rows={SUM_ORDERS.rows.map((cells, i) => ({ cells, at: reportAt + 4 + i * 4 }))}
          at={reportAt}
          numeric={[0]}
          colInk={{ 0: KEY_INK }}
          marks={[
            ...SUM_ORDERS.rows.map((_, i) => ({ row: i, col: 1, at: dayAt + i * 3, out: tenthAt - 2 })),
            ...m0.orders,
            ...m1.orders,
          ]}
        />
        <DbTable
          g={ig}
          cols={SUM_ITEMS.cols}
          rows={[
            ...SUM_ITEMS.rows.map((cells, i) => ({ cells, at: soldAt + i * 4 })),
            { cells: LATE.row, at: fourAt, grow: true },
          ]}
          at={soldAt - 4}
          numeric={[0, 1, 2]}
          colInk={{ 1: KEY_INK }}
          marks={[...m0.items, ...m1.items, { row: late, col: 2, at: fourAt + 8 }]}
          bands={[{ row: late, at: fourAt + 4, out: planAt, color: MARK_BAD }]}
        />
        <Reply at={fourAt + 10} x={ig.x + ig.width + 20} y={ig.rowMid(late) - 20}>
          {LATE.tag}
        </Reply>

        {/* The derived copy. */}
        <SmallArrow from={[ig.x + ig.width + 24, arrowY]} to={[sg.x - 24, arrowY]} at={storeAt - 2} color={INK} width={2.4} />
        <Ink at={storeAt + 4} dur={12} style={{ left: ig.x + ig.width + 34, top: arrowY - 42, whiteSpace: "nowrap" }}>
          <span style={{ ...note(21, INK_SOFT), fontStyle: "italic" }}>derived</span>
        </Ink>
        {name(sg.x, "daily_sales_summary", storeAt + 2)}
        <DbTable
          g={sg}
          cols={SUMMARY.cols}
          rows={SUMMARY.rows.map((cells, i) => ({ cells, at: tableAt + i * 5 }))}
          at={tableAt - 6}
          numeric={[1, 2]}
          marks={[
            { row: 0, col: 2, at: fiftyAt, out: eleventhAt },
            { row: 1, col: 2, at: twelveAt, out: denormAt },
            { row: staleRow, col: 2, at: saysAt, color: MARK_BAD },
          ]}
          bands={[
            { row: 0, at: tenthAt, out: eleventhAt, color: MARK },
            { row: 1, at: eleventhAt, out: denormAt, color: MARK },
          ]}
        />
        <Reply at={tableAt + 8} x={ig.x + ig.width + 34} y={arrowY + 16}>
          {SUM_BUILD_TAG}
        </Reply>

        <Note at={purposeAt - 6} x={sg.x} y={sg.bottom(SUMMARY.rows.length) + 22}>
          <span style={{ ...label(23, ACCENT_INK), whiteSpace: "nowrap" }}>A derived copy, stored on purpose</span>
        </Note>
        <Note at={simplerAt - 4} x={sg.x} y={sg.bottom(SUMMARY.rows.length) + 62}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>One row per day, ready to read</span>
        </Note>
        <Note at={staleAt - 4} x={sg.x} y={sg.bottom(SUMMARY.rows.length) + 118}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            {stale[0]}: stored <Mono color={ACCENT_INK}>{stale[1] ?? ""}</Mono>, live <Mono>{stale[2] ?? ""}</Mono>
          </span>
        </Note>
        <Note at={planAt - 2} x={sg.x} y={sg.bottom(SUMMARY.rows.length) + 162}>
          <span style={{ ...note(22, ACCENT_INK), whiteSpace: "nowrap" }}>A copy needs a sync plan.</span>
        </Note>

        {/* What it answers to. */}
        <SourceBracket x0={og.x} x1={ig.x + ig.width} y={sourcesBottom + 18} at={truthAt - 4} />
        <Ink at={truthAt} dur={14} style={{ left: og.x, top: sourcesBottom + 34, whiteSpace: "nowrap" }}>
          <span style={{ ...label(23, BLUE_INK) }}>The source of truth</span>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};

/** A bracket under the source tables, opening from its middle toward them. */
const SourceBracket: React.FC<{ x0: number; x1: number; y: number; at: number }> = ({ x0, x1, y, at }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  if (p <= 0) return null;
  const mid = (x0 + x1) / 2;
  const a = mid + (x0 - mid) * p;
  const b = mid + (x1 - mid) * p;
  return (
    <Svg>
      <path d={`M${a},${y - 10} L${a},${y} L${b},${y} L${b},${y - 10}`} fill="none" stroke={KEY} strokeWidth={2.6} strokeLinejoin="round" />
    </Svg>
  );
};
