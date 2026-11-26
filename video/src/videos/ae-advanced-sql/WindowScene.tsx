import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, INK, INK_SOFT, TABULAR, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { GRAND_TOTAL, NORTH_PCT, WINDOW } from "./data";
import {
  Chip,
  colsOf,
  DataTable,
  Drift,
  ErrorBox,
  geoOf,
  Listing,
  listingHeight,
  listingLineMid,
  MARK,
  MARK_KEY,
  MARK_OK,
  MARK_RED,
  QMono,
  RowBracket,
  rowsAt,
  Stage,
  SyntaxBreak,
  type SynPart,
  TableName,
  X0,
} from "./parts";

const TOP = 330;
const LIST_X = 640;
const SIZE = 21;
/** Question 2's listing and result: smaller, so all six columns fit. */
const RUN_SIZE = 20;
/** Question 2's run, under the breakdown: the listing left, its result right. */
const RUN_TOP = 470;
const RUN_X = 1000;
/** Question 3's listing, larger: it has the page to itself until the trap. */
const MIX_SIZE = 23;
/** Question 3's trap, beside the query that works. */
const TRAP_X = 1120;

/**
 * Questions 1, 2 and 3 on Data Analyst Part 4's six sales. GROUP BY folds the
 * six into two totals; SUM OVER (PARTITION BY region) writes the same totals
 * beside all six rows. The page's breakdown of OVER, its three parts
 * underlined as the narration names each; the three stacked on one sum, a
 * column each, the running total starting again at South; the frame nobody
 * wrote, a dashed slot. Then the share query, a window over an aggregate,
 * and Postgres refusing it once the outer SUM is dropped.
 */
export const WindowScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Question 1 ──
  const from = n.beat("window").from;
  const qAt = n.word("window", "Question one");
  const textAt = n.word("window", "What is a window function");
  const asked = n.word("window", "differ from group by") + 4;
  const groupAt = n.word("window-group", "Group by collapses rows");
  const regionsAt = n.word("window-group", "two regions");
  const northAt = n.word("window-group", "North four twenty-five");
  const southAt = n.word("window-group", "South six forty");
  const keepsAt = n.word("window-over", "keeps every row");
  const sumOverAt = n.word("window-over", "Sum over");
  const besideAt = n.word("window-over", "beside its own sales");
  const sixAt = n.word("window-over", "six rows in");
  const whyWords = [
    { text: "running total", at: n.word("window-why", "running total") },
    { text: "rank", at: n.word("window-why", "its rank") },
    { text: "share of the whole", at: n.word("window-why", "share of the whole") },
  ];

  // ── Question 2 ──
  const q2At = n.word("over", "Question two");
  const q2TextAt = n.word("over", "What are the three parts");
  const partAt = n.word("over-parts", "Partition by splits rows");
  const orderAt = n.word("over-parts", "Order by sets their order");
  const frameAt = n.word("over-parts", "the frame bounds");
  const stackAt = n.word("over-run", "Stack them on one sum");
  const nothingAt = n.word("over-run", "With nothing inside over");
  const tenAt = n.word("over-run", "ten sixty-five");
  const partedAt = n.word("over-run", "Partitioned");
  const ownAt = n.word("over-run", "each region's own total");
  const orderedAt = n.word("over-run", "Ordered by day");
  const againAt = n.word("over-run", "starts again for South");
  const nobodyAt = n.word("over-default", "Nobody wrote that frame");
  const defaultAt = n.word("over-default", "the default runs");
  const startAt = n.word("over-default", "from the start of the partition");
  const tiesAt = n.word("over-default", "what it does with ties");

  // ── Question 3 ──
  const q3At = n.word("mix", "Question three");
  const q3TextAt = n.word("mix", "What is the difference");
  const collapsesAt = n.word("mix-run", "The aggregate collapses");
  const windowKeepsAt = n.word("mix-run", "the window keeps");
  const afterAt = n.word("mix-run", "windows run after group by");
  const byRegionAt = n.word("mix-run", "Group by region");
  const sumsAt = n.word("mix-run", "sum the sums over everything");
  const bothAt = n.word("mix-run", "ten sixty-five on both rows");
  const shareAt = n.word("mix-run", "North's share");
  const dropAt = n.word("mix-trap", "Drop the outer sum");
  const refusesAt = n.word("mix-trap", "Postgres refuses");
  const end = n.beat("mix-trap").to;

  const out1 = q2At - 4;
  const out2 = q3At - 4;

  // ── Question 1's tables ──
  const S = WINDOW.sales;
  const sg = geoOf(S, X0, y(TOP), h);
  const regionRows = (t: { rows: readonly (readonly string[])[]; cols: readonly string[] }, name: string) =>
    t.rows.flatMap((r, i) => (r[t.cols.indexOf("region")] === name ? [i] : []));
  const north = regionRows(S, "North");
  const G = WINDOW.grouped;
  const W = WINDOW.windowed;
  const under = (lines: number, size = SIZE) => y(TOP) + listingHeight(lines, size) + h(22);
  const gg = geoOf(G, LIST_X, under(G.lines.length), h);
  const wg = geoOf(W, LIST_X, under(W.lines.length), h, { rowH: 44 });
  const totalCol = W.cols.indexOf("total");

  // ── Question 2's breakdown and run ──
  const parts: SynPart[] = [
    { text: "SUM(amount)" },
    { text: "OVER (" },
    { text: "PARTITION BY region", label: "independent groups", at: partAt, hot: { at: partAt, out: orderAt } },
    { text: "ORDER BY day", label: "sequence inside each group", at: orderAt, row: 1, hot: { at: orderAt, out: frameAt } },
    { text: "ROWS 6 PRECEDING", label: "the frame that bounds the calculation", at: frameAt, hot: { at: frameAt, out: stackAt } },
    { text: ")" },
  ];
  const P = WINDOW.parts;
  const runTop = y(RUN_TOP);
  const pg = geoOf(P, RUN_X, runTop, h, { rowH: 44, bodySize: 22, headSize: 20 });
  const pc = (name: string) => P.cols.indexOf(name);
  const southFirst = P.rows.findIndex((r) => r[pc("region")] === "South");
  const clauseX = X0;
  const clauseTop = runTop + listingHeight(P.lines.length, RUN_SIZE) + h(34);
  const windowLines = ["AS all_rows", "AS by_region", "AS running"];
  const windowAt = [nothingAt, partedAt, orderedAt];
  const runLineAt = P.lines.map((l) => {
    const k = windowLines.findIndex((w) => l.includes(w));
    return k < 0 ? stackAt : windowAt[k] - 2;
  });
  const SLOT = 150;

  // ── Question 3 ──
  const M = WINDOW.share;
  const mg = geoOf(M, X0, y(TOP) + listingHeight(M.lines.length, MIX_SIZE) + h(26), h, { rowH: 54, bodySize: 26, headSize: 22 });
  const mc = (name: string) => M.cols.indexOf(name);
  const northRow = M.rows.findIndex((r) => r[0] === "North");
  const B = WINDOW.shareBare;
  const bareH = listingHeight(B.lines.length, SIZE);
  const notesX = TRAP_X;
  const windowLine = "SUM(SUM(amount)) OVER () AS grand_total";
  const groupLine = M.lines.findIndex((l) => l.startsWith("GROUP BY region"));
  const sumsLine = M.lines.findIndex((l) => l.includes(windowLine));

  return (
    <AbsoluteFill>
      <Sfx name="el-scratch" at={groupAt + 6} level={-34} />
      <Sfx name="el-tap" at={northAt} level={-33} />
      <Sfx name="el-tap" at={southAt} level={-33} />
      <Sfx name="el-pop" at={sixAt} level={-32} />
      {whyWords.map((w) => (
        <Sfx key={w.text} name="el-tap" at={w.at} level={-34} />
      ))}
      <Sfx name="el-pencil" at={partAt} level={-35} />
      <Sfx name="el-pencil" at={orderAt} level={-35} />
      <Sfx name="el-pencil" at={frameAt} level={-35} />
      <Sfx name="el-tap" at={tenAt} level={-33} />
      <Sfx name="el-tap" at={ownAt} level={-33} />
      <Sfx name="el-pop" at={againAt + 2} level={-32} />
      <Sfx name="el-pencil" at={nobodyAt + 4} level={-35} />
      <Sfx name="el-tap" at={bothAt} level={-33} />
      <Sfx name="el-pop" at={shareAt + 4} level={-32} />
      <Sfx name="el-scratch" at={dropAt + 4} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} out={out1} size={60}>
          What is a window function, and how does it differ from <QMono>GROUP BY</QMono>?
        </QuestionCard>
        <QuestionCard n={2} at={q2At} textAt={q2TextAt - 2} out={out2} size={60}>
          What are the three parts of an <QMono>OVER</QMono> clause?
        </QuestionCard>
        <QuestionCard n={3} at={q3At} textAt={q3TextAt - 2} size={60}>
          What is the difference between a window function and an aggregate in one query?
        </QuestionCard>

        {/* ── 1. Six sales in, two rows out; then six out ── */}
        <TableName g={sg} at={asked - 6} out={out1}>
          sales
        </TableName>
        <DataTable
          g={sg}
          cols={colsOf(S)}
          at={asked - 6}
          out={out1}
          rows={rowsAt(S.rows, asked - 2)}
          bands={north.map((row) => ({ row, at: regionsAt, color: MARK_KEY }))}
        />
        <Listing lines={G.lines} x={LIST_X} top={y(TOP)} size={SIZE} at={groupAt - 4} out={keepsAt - 4} marks={[{ line: "GROUP BY region", at: groupAt + 6 }]} />
        <DataTable
          g={gg}
          cols={colsOf(G)}
          at={groupAt + 8}
          out={keepsAt - 4}
          rows={rowsAt(G.rows, groupAt + 12, 4)}
          marks={[
            { row: 0, col: 1, at: northAt },
            { row: 1, col: 1, at: southAt },
          ]}
        />
        <Note at={groupAt + 16} x={gg.right + 30} y={gg.rowTop(0) + h(4)} out={keepsAt - 4}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap", ...TABULAR }}>
            {S.rows.length} rows in, {G.rows.length} out
          </span>
        </Note>
        <Listing lines={W.lines} x={LIST_X} top={y(TOP)} size={SIZE} at={keepsAt - 2} out={out1} marks={[{ line: "OVER (PARTITION BY region)", at: sumOverAt + 4 }]} />
        <DataTable
          g={wg}
          cols={colsOf(W, { total: { at: besideAt - 4, ink: BLUE_INK } })}
          at={sumOverAt}
          out={out1}
          rows={rowsAt(W.rows, sumOverAt + 4)}
          bands={north.map((row) => ({ row, at: sumOverAt + 4, color: MARK_KEY }))}
          marks={W.rows.map((_, row) => ({ row, col: totalCol, at: sixAt + 4 + row * 2, color: MARK_OK }))}
        />
        <Note at={sixAt - 2} x={wg.right + 30} y={wg.rowTop(0) + h(4)} out={out1}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap", ...TABULAR }}>
            {W.rows.length} rows in, {W.rows.length} out
          </span>
        </Note>
        {/* What a detail row gets from a window, one badge per word. */}
        <div style={{ position: "absolute", left: LIST_X, top: wg.rowTop(W.rows.length) + h(36), display: "flex", gap: 16, fontSize: 24 }}>
          {whyWords.map((w) => {
            const p = ease(frame, w.at - 2, 10) * (1 - ease(frame, out1, 10));
            return (
              <span key={w.text} style={{ opacity: p, transform: `translateY(${(1 - p) * 8}px)` }}>
                <Chip tone="blue" size={24}>
                  {w.text}
                </Chip>
              </span>
            );
          })}
        </div>

        {/* ── 2. The three parts of OVER ── */}
        <SyntaxBreak parts={parts} x={X0} top={y(TOP) - h(10)} at={q2At + 10} out={out2} />
        <Stage from={partAt - 4} to={out2}>
          <Listing
            lines={P.lines}
            x={X0}
            top={runTop}
            size={RUN_SIZE}
            at={stackAt - 4}
            lineAt={runLineAt}
            marks={[
              { line: "OVER () AS all_rows", at: nothingAt + 2, out: partedAt },
              { line: "AS by_region", at: partedAt + 2, out: orderedAt },
              { line: "AS running", at: orderedAt + 2, out: nobodyAt },
              { line: "AS running", text: "ORDER BY day", at: nobodyAt + 4 },
            ]}
          />
          <DataTable
            g={pg}
            cols={colsOf(P, {
              all_rows: { at: nothingAt, ink: BLUE_INK },
              by_region: { at: partedAt, ink: BLUE_INK },
              running: { at: orderedAt, ink: BLUE_INK },
            })}
            at={partAt - 4}
            rows={rowsAt(P.rows, partAt)}
            bands={north.map((row) => ({ row, at: partAt + 8, color: MARK_KEY }))}
            marks={[
              ...P.rows.map((_, row) => ({ row, col: pc("all_rows"), at: tenAt + row * 2, out: partedAt })),
              ...P.rows.map((_, row) => ({ row, col: pc("by_region"), at: ownAt + row * 2, out: orderedAt })),
              { row: southFirst, col: pc("running"), at: againAt },
            ]}
          />
          {/* The frame the running total ran with: up to the current row. */}
          <RowBracket
            g={pg}
            steps={[
              { at: startAt, from: 0, to: 0 },
              { at: startAt + 14, from: 0, to: 1 },
              { at: startAt + 28, from: 0, to: 2 },
              { at: startAt + 42, from: southFirst, to: southFirst + 1 },
            ]}
          />
          {/* ── The frame nobody wrote: a slot in the clause ── */}
          <Note at={nobodyAt} x={clauseX} y={clauseTop}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: MONO, fontSize: 22, fontWeight: 500, color: INK, whiteSpace: "pre", fontVariantLigatures: "none" }}>
              <span>OVER (PARTITION BY region</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, fontFamily: MONO, fontSize: 22, fontWeight: 500, color: INK, whiteSpace: "pre", fontVariantLigatures: "none" }}>
              <span>{"      ORDER BY day"}</span>
              <span
                style={{
                  display: "inline-block",
                  width: SLOT,
                  height: 36,
                  boxSizing: "border-box",
                  border: `2px dashed ${INK_SOFT}`,
                  borderRadius: 6,
                  background: `color-mix(in srgb, var(--ds-yellow-300) ${Math.round(55 * ease(frame, defaultAt, 12))}%, transparent)`,
                }}
              />
              <span>)</span>
            </div>
          </Note>
          <Note at={startAt} x={clauseX} y={clauseTop + h(94)}>
            <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>The default: from the start of the partition to the current row</span>
          </Note>
          <Note at={tiesAt} x={clauseX} y={clauseTop + h(134)}>
            <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>With ties: question 7</span>
          </Note>
        </Stage>

        {/* ── 3. A window over an aggregate ── */}
        <Stage from={q3At + 6}>
          <Listing
            lines={M.lines}
            x={X0}
            top={y(TOP)}
            size={MIX_SIZE}
            at={collapsesAt - 6}
            dim={dropAt + 2}
            marks={[
              { line: "SUM(amount) AS total", at: collapsesAt + 2, out: windowKeepsAt },
              { line: windowLine, at: windowKeepsAt + 2, out: afterAt },
              { line: "GROUP BY region", at: byRegionAt, color: MARK_KEY },
              { line: windowLine, text: "SUM(amount)", at: byRegionAt + 6, color: MARK_KEY },
              { line: windowLine, text: "SUM(SUM(amount)) OVER ()", at: sumsAt + 2, out: dropAt },
              { line: windowLine, text: "SUM(", at: dropAt + 2, strike: true },
            ]}
          />
          <DataTable
            g={mg}
            cols={colsOf(M, { grand_total: { ink: BLUE_INK }, pct: { ink: BLUE_INK } })}
            at={sumsAt + 6}
            dim={dropAt + 2}
            rows={rowsAt(M.rows, sumsAt + 10, 4)}
            marks={[
              ...M.rows.map((_, row) => ({ row, col: mc("grand_total"), at: bothAt + 4 + row * 3, color: MARK_OK })),
              { row: northRow, col: mc("pct"), at: shareAt + 4, color: MARK },
            ]}
          />
          {/* Each step beside the line that does it: the window is written
              above the GROUP BY it runs after. */}
          <Note at={byRegionAt + 4} x={notesX} y={listingLineMid(y(TOP), groupLine, MIX_SIZE) - 16} out={dropAt - 2}>
            <span style={{ ...note(24, BLUE_INK), whiteSpace: "nowrap" }}>1. Group: one row per region</span>
          </Note>
          <Note at={sumsAt + 4} x={notesX} y={listingLineMid(y(TOP), sumsLine, MIX_SIZE) - 16} out={dropAt - 2}>
            <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>2. Window: summed over the groups</span>
          </Note>
          <Note at={shareAt + 6} x={mg.right + 30} y={mg.rowTop(northRow) + h(6)} dim={dropAt + 2}>
            <span style={{ ...note(24, INK), whiteSpace: "nowrap", ...TABULAR }}>
              North: {NORTH_PCT}% of {GRAND_TOTAL}
            </span>
          </Note>

          {/* ── The trap: no outer SUM ── */}
          <Note at={dropAt + 2} x={TRAP_X} y={y(TOP) - h(40)}>
            <span style={{ ...note(22, ACCENT_INK), whiteSpace: "nowrap" }}>Without the outer SUM</span>
          </Note>
          <Listing lines={B.lines} x={TRAP_X} top={y(TOP)} size={SIZE} at={dropAt + 2} marks={[{ line: "OVER () AS grand_total", at: refusesAt, color: MARK_RED }]} />
          <ErrorBox x={TRAP_X} top={y(TOP) + bareH + h(24)} width={664} at={refusesAt + 4} kind={B.kind} message={B.message} size={20} />
        </Stage>
      </Drift>
    </AbsoluteFill>
  );
};
