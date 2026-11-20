import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, HAIRLINE, INK_SOFT, label, note, svgText } from "../../editorial/style";
import { Badge, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { SANS } from "../../theme/fonts";
import { LATE, money } from "./data";
import { colsOf, DataTable, Drift, geoOf, lineOf, Listing, listingWidth, MARK_BAD, MARK_KEY, MARK_OK, OK_INK, TableName, X0 } from "./parts";

const ROW1 = 300;
const ROW2 = 580;
const SIZE = 20;
const ROWS = { headH: 40, rowH: 44, bodySize: 21, headSize: 19 } as const;

/** A table's amounts with separators. */
const withMoney = (t: { cols: string[]; rows: string[][] }, col = "amount") => ({
  cols: t.cols,
  rows: t.rows.map((r) => r.map((v, j) => (t.cols[j] === col ? money(v) : v))),
});

/**
 * Question 5, on de-modeling-history's three staged orders against this
 * page's rows for customers 42 and 99: order 203 is for customer 77, who is
 * not in the dimension yet. The inner-join lookup loads two rows (700.00 of
 * 1,110.00, no error). The page's fix: the unknown member, -1, with the
 * customer's own ID kept on the fact, so all 1,110.00 load and the report
 * shows Unknown 410.00; when 77 lands, the correction job re-keys the one
 * row and the 410.00 moves to the South. The other path, holding the facts,
 * in grey; then the count to watch, drawn: a late feed's waiting rows go
 * back to none, a broken feed's keep growing.
 */
export const LateScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("late").from;
  const qAt = n.word("late", "Question five");
  const textAt = n.word("late", "How do you handle late-arriving dimension records");
  const orderAt = n.word("late", "an order for customer seventy-seven");
  const beforeAt = n.word("late", "before customer seventy-seven does");
  const lookAt = n.word("late-drop", "Look up its key with an inner join");
  const vanishAt = n.word("late-drop", "the order vanishes");
  const sevenAt = n.word("late-drop", "seven hundred dollars loaded");
  const errAt = n.word("late-drop", "and no error");
  const neverAt = n.word("late-fix", "Never drop the fact");
  const happenedAt = n.word("late-fix", "the sale happened");
  const unknownAt = n.word("late-fix", "Load it against an unknown member");
  const minusAt = n.word("late-fix", "key minus one");
  const ownAt = n.word("late-fix", "keep the customer's own ID on the row");
  const arrivesAt = n.word("late-correct", "When seventy-seven arrives");
  const rekeyAt = n.word("late-correct", "a correction job re-keys those rows");
  const southAt = n.word("late-correct", "to the South");
  const holdAt = n.word("late-correct", "The other way is to hold the facts back");
  const laterAt = n.word("late-correct", "totals arrive later, but never short");
  const countAt = n.word("late-watch", "count the rows still waiting");
  const growingAt = n.word("late-watch", "A count that keeps growing");
  const brokenAt = n.word("late-watch", "a feed is broken, not late");
  const end = n.beat("late-watch").to;

  // ── Row 1: what arrived, and the dimension it needs ──
  const S = withMoney(LATE.staged);
  const top1 = y(ROW1);
  const gs = geoOf(S, X0, top1, h, ROWS);
  const D = LATE.dimAfter;
  const gd = geoOf(D, gs.right + 80, top1, h, ROWS);
  const dCustomer = D.cols.indexOf("customer_id");
  const sideX = gd.right + 80;

  // ── Row 2: the lookup, what it loaded, the report ──
  const top2 = y(ROW2);
  const Lq = LATE.load;
  const Lu = LATE.loadUnknown;
  const Lc = LATE.correct;
  const listW = Math.max(listingWidth(Lq.lines, SIZE), listingWidth(Lu.lines, SIZE), listingWidth(Lc.lines, SIZE));
  const Ld = withMoney(LATE.load);
  const tableX = X0 + listW + 60;
  const gl = geoOf(Ld, tableX, top2, h, ROWS);
  const F = withMoney(LATE.facts);
  const FA = withMoney(LATE.factsAfter);
  const gf = geoOf(F, tableX, top2, h, ROWS);
  const fKey = F.cols.indexOf("customer_sk");
  const fCustomer = F.cols.indexOf("customer_id");
  const RB = withMoney(LATE.reportBefore, "revenue");
  const RA = withMoney(LATE.reportAfter, "revenue");
  const gr = geoOf(RB, gf.right + 60, top2, h, { ...ROWS, extra: RA.rows });
  const rRegion = RB.cols.indexOf("region");
  const missing = S.rows.find((r) => !Ld.rows.some((l) => l[0] === r[0])) ?? S.rows[S.rows.length - 1];
  const loaded = LATE.loadSum.rows[0];
  const dropOut = neverAt - 2;
  const unknownRow = F.rows.findIndex((r) => r[fKey] === "-1");
  const reportRow = RB.rows.findIndex((r) => r[rRegion] === "Unknown");
  const minusRow = D.rows.findIndex((r) => r[0] === "-1");
  const newRow = D.rows.length - 1;

  // ── The count to watch, drawn in the listing's place ──
  const CH = { x0: X0 + 20, x1: X0 + 400, top: top2 + h(20), bottom: top2 + h(230) };
  const draw = ease(frame, countAt + 4, 40);
  const ramp = ease(frame, growingAt, 36);
  const steps = 6;
  const lateLine = Array.from({ length: steps * 4 + 1 }, (_, i) => {
    const t = i / (steps * 4);
    const phase = (t * steps) % 1;
    const v = phase < 0.6 ? phase / 0.6 : (1 - phase) / 0.4;
    return [CH.x0 + t * (CH.x1 - CH.x0), CH.bottom - v * 0.3 * (CH.bottom - CH.top)] as const;
  });
  const shown = (pts: readonly (readonly [number, number])[], p: number) => pts.filter((_, i) => i <= Math.round(p * (pts.length - 1)));
  const path = (pts: readonly (readonly [number, number])[]) => pts.map(([px, py], i) => `${i ? "L" : "M"}${px},${py}`).join(" ");
  const brokenLine = Array.from({ length: 25 }, (_, i) => [CH.x0 + (i / 24) * (CH.x1 - CH.x0), CH.bottom - (i / 24) * 0.92 * (CH.bottom - CH.top)] as const);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={orderAt + 4} level={-34} />
      <Sfx name="el-pencil" at={lookAt + 2} level={-36} />
      <Sfx name="el-scratch" at={vanishAt + 4} level={-34} />
      <Sfx name="el-chime" at={neverAt + 2} level={-37} />
      <Sfx name="el-tap" at={minusAt + 2} level={-34} />
      <Sfx name="el-pop" at={arrivesAt + 4} level={-34} />
      <Sfx name="el-pencil" at={rekeyAt} level={-36} />
      <Sfx name="el-tap" at={southAt + 2} level={-34} />
      <Sfx name="el-pencil" at={countAt + 4} level={-36} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} size={60}>
          How do you handle late-arriving dimension records?
        </QuestionCard>

        {/* ── Row 1 ── */}
        <TableName g={gs} at={orderAt - 6}>
          staged_orders
        </TableName>
        <DataTable
          g={gs}
          cols={colsOf(S)}
          at={orderAt - 6}
          rows={S.rows.map((cells, i) => ({ cells, at: orderAt - 2 + i * 3 }))}
          marks={[
            { row: 2, col: S.cols.indexOf("customer_id"), at: orderAt + 10, out: vanishAt },
            { row: 2, col: S.cols.indexOf("customer_id"), at: vanishAt + 2, out: neverAt, color: MARK_BAD },
          ]}
        />
        <TableName g={gd} at={beforeAt - 6}>
          dim_customer
        </TableName>
        <DataTable
          g={gd}
          cols={colsOf(D)}
          at={beforeAt - 6}
          rows={[
            ...LATE.dim.rows.map((cells, i) => ({ cells, at: beforeAt - 2 + i * 3 })),
            { cells: D.rows[newRow], at: arrivesAt + 2, grow: true },
          ]}
          marks={[
            { row: minusRow, col: 0, at: unknownAt + 4, out: arrivesAt, color: MARK_KEY },
            { row: newRow, col: dCustomer, at: arrivesAt + 8, out: rekeyAt + 10 },
            { row: newRow, col: 0, at: rekeyAt + 4, color: MARK_KEY },
          ]}
        />
        <Note at={beforeAt + 8} x={sideX} y={top1 + h(4)} out={dropOut}>
          <span style={{ ...note(25, ACCENT_INK), whiteSpace: "nowrap" }}>
            No customer <Num>77</Num> yet
          </span>
        </Note>
        <Note at={neverAt} x={sideX} y={top1 + h(4)}>
          <span style={{ ...note(25, OK_INK), whiteSpace: "nowrap" }}>
            Never drop the fact
            <span style={{ opacity: ease(frame, happenedAt, 10) }}>: the sale happened</span>
          </span>
        </Note>
        <Note at={holdAt} x={sideX} y={top1 + h(74)}>
          <div style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>Or hold the facts back until the customer lands</div>
          <div style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap", marginTop: 6, opacity: ease(frame, laterAt, 10) }}>Totals arrive later, but never short</div>
        </Note>

        {/* ── Row 2: the inner join drops 203 ── */}
        <Listing
          lines={Lq.lines}
          x={X0}
          top={top2}
          width={listW}
          size={SIZE}
          at={lookAt - 2}
          out={dropOut}
          title="The load’s key lookup"
          marks={[{ line: lineOf(Lq.lines, "JOIN dim_customer"), at: lookAt + 10 }]}
        />
        <TableName g={gl} at={lookAt + 6} out={dropOut}>
          Loaded
        </TableName>
        <DataTable
          g={gl}
          cols={colsOf(Ld)}
          at={lookAt + 6}
          out={dropOut}
          rows={[
            ...Ld.rows.map((cells, i) => ({ cells, at: lookAt + 10 + i * 3 })),
            { cells: [missing[0], "", missing[2]], at: vanishAt + 2, ghost: true },
          ]}
        />
        <Note at={sevenAt} x={gl.x} y={gl.rowTop(3) + h(18)} out={dropOut}>
          <span style={{ ...note(25, ACCENT_INK), whiteSpace: "nowrap" }}>
            <Num>{money(loaded[0])}</Num> of <Num>{money(loaded[1])}</Num>
            <span style={{ opacity: ease(frame, errAt, 10) }}>, and no error</span>
          </span>
        </Note>

        {/* ── Row 2: the unknown member, then the correction job ── */}
        <Listing
          lines={Lu.lines}
          x={X0}
          top={top2}
          width={listW}
          size={SIZE}
          at={unknownAt - 4}
          out={rekeyAt - 4}
          title="Every fact loads"
          marks={[
            { line: lineOf(Lu.lines, "COALESCE"), at: minusAt },
            { line: lineOf(Lu.lines, "o.customer_id"), at: ownAt + 2 },
          ]}
        />
        <TableName g={gf} at={unknownAt + 4}>
          fact_orders
        </TableName>
        <DataTable
          g={gf}
          cols={colsOf(F)}
          at={unknownAt + 4}
          rows={F.rows.map((cells, i) => ({ cells, at: unknownAt + 8 + i * 3 }))}
          swaps={[{ row: unknownRow, col: fKey, at: rekeyAt + 10, value: FA.rows[unknownRow][fKey] }]}
          marks={[
            { row: unknownRow, col: fKey, at: minusAt + 4, out: rekeyAt + 8, color: MARK_KEY },
            { row: unknownRow, col: fCustomer, at: ownAt + 4, out: arrivesAt },
            { row: unknownRow, col: fKey, at: rekeyAt + 12, color: MARK_KEY },
          ]}
        />
        <Note at={ownAt + 10} x={gf.x} y={gf.rowTop(3) + h(18)} out={rekeyAt}>
          <span style={{ ...note(25, OK_INK), whiteSpace: "nowrap" }}>
            All <Num>{money(LATE.factsSum)}</Num> loaded
          </span>
        </Note>
        <Note at={rekeyAt + 14} x={gf.x} y={gf.rowTop(3) + h(18)}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 14, fontSize: 24 }}>
            <Badge tone="gray" size={22}>
              <Num>{LATE.corrected}</Num> row re-keyed
            </Badge>
            <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
              <Num>{LATE.stillUnknown}</Num> left on −1
            </span>
          </span>
        </Note>
        <TableName g={gr} at={ownAt + 8}>
          Revenue by region
        </TableName>
        <DataTable
          g={gr}
          cols={colsOf(RB)}
          at={ownAt + 8}
          rows={RB.rows.map((cells, i) => ({ cells, at: ownAt + 12 + i * 3 }))}
          swaps={[{ row: reportRow, col: rRegion, at: southAt, value: RA.rows[reportRow][rRegion] }]}
          marks={[
            { row: reportRow, col: rRegion, at: ownAt + 20, out: southAt - 2 },
            { row: reportRow, col: rRegion, at: southAt + 4, color: MARK_OK },
          ]}
        />
        <Listing
          lines={Lc.lines}
          x={X0}
          top={top2}
          width={listW}
          size={SIZE}
          at={rekeyAt - 2}
          out={countAt - 2}
          title="The correction job, once 77 lands"
          marks={[{ line: lineOf(Lc.lines, "WHERE f.customer_sk = -1"), at: rekeyAt + 8 }]}
        />

        {/* ── The count to watch (drawn, no values) ── */}
        <Note at={countAt} x={X0} y={top2 - h(38)}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>Rows on −1, day by day</span>
        </Note>
        {draw > 0 ? (
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            <line x1={CH.x0} x2={CH.x1} y1={CH.bottom} y2={CH.bottom} stroke={HAIRLINE} strokeWidth={1.4} opacity={draw} />
            <line x1={CH.x0} x2={CH.x0} y1={CH.top} y2={CH.bottom} stroke={HAIRLINE} strokeWidth={1.4} opacity={draw} />
            <path d={path(shown(lateLine, draw))} fill="none" stroke={ds("gray", 400)} strokeWidth={3} strokeLinejoin="round" />
            {ramp > 0 ? <path d={path(shown(brokenLine, ramp))} fill="none" stroke={ACCENT} strokeWidth={3.4} strokeLinejoin="round" /> : null}
            <text x={CH.x1 + 14} y={CH.bottom - 0.12 * (CH.bottom - CH.top)} style={svgText({ fontFamily: SANS, fontSize: 22, fontWeight: 500, color: INK_SOFT })} opacity={ease(frame, countAt + 40, 10)}>
              Late: back to none
            </text>
            <text x={CH.x1 + 14} y={CH.top + 0.1 * (CH.bottom - CH.top)} style={svgText({ fontFamily: SANS, fontSize: 22, fontWeight: 500, color: ACCENT_INK })} opacity={ease(frame, brokenAt, 10)}>
              Broken feed
            </text>
            <text x={CH.x0} y={CH.bottom + 32} style={svgText({ fontFamily: SANS, fontSize: 21, fontWeight: 500, color: INK_SOFT })} opacity={draw}>
              days
            </text>
          </svg>
        ) : null}
      </Drift>
    </AbsoluteFill>
  );
};
