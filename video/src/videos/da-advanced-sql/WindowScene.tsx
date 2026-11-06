import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, INK, INK_SOFT, TABULAR, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { WINDOW } from "./data";
import {
  colsOf,
  DataTable,
  Drift,
  geoOf,
  Listing,
  listingHeight,
  MARK_KEY,
  MARK_OK,
  rowsAt,
  TableName,
  X0,
  Mark,
} from "./parts";
import { QMono } from "./mono";

const TOP = 320;
const LIST_X = 600;
const SIZE = 21;
/** The three things OVER can say, at the page's right: where the boxes'
 *  text stood, each clause 8px over what it says and 110 from the next, so
 *  the space between them is clearly larger than inside one. */
const CHIP_X = 1440;
const CHIP_PITCH = 110;

/**
 * Questions 1 and 2 on the video's own six sales: GROUP BY collapses them to
 * two totals; SUM OVER (PARTITION BY region) writes the same totals beside
 * all six rows; the three things OVER can say; then RANK restarting in each
 * region, North's 250 and South's 320 both first.
 */
export const WindowScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("window").from;
  const qAt = n.word("window", "Question");
  const textAt = n.word("window", "What is a window function");
  // The sales arrive on the question's second half, as the series does.
  const asked = n.word("window", "how does the over clause work") + 4;
  const groupAt = n.word("window-group", "Group by collapses rows");
  const northAt = n.word("window-group", "North four twenty-five");
  const southAt = n.word("window-group", "South six forty");
  const keepsAt = n.word("window-over", "keeps every row");
  const sumOverAt = n.word("window-over", "Sum over");
  const besideAt = n.word("window-over", "beside its sales");
  const sixAt = n.word("window-over", "six rows in");
  const shareAt = n.word("window-parts", "which rows share a window");
  const orderAt = n.word("window-parts", "their order inside it");
  const frameAt = n.word("window-parts", "the frame");
  const q2At = n.word("partition", "Question two");
  const q2TextAt = n.word("partition", "What does partition by do");
  const splitsAt = n.word("partition", "splits the rows into groups");
  const startsAt = n.word("partition", "starts over in each one");
  const setsAt = n.word("partition", "sets the order inside a group");
  const rankAt = n.word("partition-rank", "Rank, partitioned by region");
  const againAt = n.word("partition-rank", "starts again at one for South");
  const firstAt = n.word("partition-rank", "both come first");
  const bridgeAt = n.beat("rank-in").from;
  // The finished page holds through the bridge and fades into the cut, so
  // the next scene's kicker arrives on it rather than on a blank page.
  const clearAt = n.beat("rank").from - 8 - 30;
  const end = n.beat("rank-in").to;

  // The six sales, banded by region.
  const sg = geoOf(WINDOW.sales, X0, y(TOP), h);
  const region = (t: { rows: readonly (readonly string[])[]; cols: readonly string[] }, name: string) =>
    t.rows.flatMap((r, i) => (r[t.cols.indexOf("region")] === name ? [i] : []));
  const north = region(WINDOW.sales, "North");

  // GROUP BY, then the window, then RANK, each a listing over its result.
  const G = WINDOW.grouped;
  const W = WINDOW.windowed;
  const R = WINDOW.ranked;
  const resultTop = (lines: number) => y(TOP) + listingHeight(lines, SIZE) + h(22);
  const gg = geoOf(G, LIST_X, resultTop(G.lines.length), h);
  const wg = geoOf(W, LIST_X, resultTop(W.lines.length), h, { rowH: 42 });
  const rg = geoOf(R, LIST_X, resultTop(R.lines.length), h, { rowH: 42 });
  const totalCol = W.cols.indexOf("total");
  const rnkCol = R.cols.indexOf("rnk");
  const firsts = R.rows.flatMap((r, i) => (r[rnkCol] === "1" ? [i] : []));
  const southFirst = R.rows.findIndex((r) => r[R.cols.indexOf("region")] === "South" && r[rnkCol] === "1");
  const out1 = q2At - 4;

  const chips = [
    { at: shareAt, clause: "PARTITION BY", text: "which rows share a window", hot: [splitsAt, startsAt] },
    { at: orderAt, clause: "ORDER BY", text: "their order inside it", hot: [setsAt, setsAt + 40] },
    { at: frameAt, clause: "ROWS …", text: "the frame around this row", hot: [] },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-scratch" at={groupAt + 4} level={-34} />
      <Sfx name="el-pop" at={sixAt} level={-32} />
      {chips.map((c) => (
        <Sfx key={c.clause} name="el-tap" at={c.at} level={-34} />
      ))}
      <Sfx name="el-pop" at={firstAt} level={-32} />

      <Drift from={from} to={end + 40}>
        {/* On the bridge to the next scene the takeaway is marked; the page clears into the cut. */}
        <AbsoluteFill style={{ opacity: 1 - ease(frame, clearAt, 36) }}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} out={out1} size={60}>
          What is a window function, and how does the <QMono>OVER</QMono> clause work?
        </QuestionCard>
        <QuestionCard n={2} at={q2At} textAt={q2TextAt - 2} size={60}>
          What does <QMono>PARTITION BY</QMono> do, versus <QMono>ORDER BY</QMono>?
        </QuestionCard>

        {/* ── Six sales, in two regions ── */}
        <TableName g={sg} at={asked - 6}>
          sales
        </TableName>
        <DataTable
          g={sg}
          cols={colsOf(WINDOW.sales)}
          at={asked - 6}
          rows={rowsAt(WINDOW.sales.rows, asked - 2)}
          bands={north.map((row) => ({ row, at: groupAt, color: MARK_KEY }))}
        />

        {/* ── GROUP BY: two rows ── */}
        <Listing lines={G.lines} x={LIST_X} top={y(TOP)} width={560} size={SIZE} at={groupAt - 4} out={keepsAt - 4} />
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
        <Note at={groupAt + 16} x={gg.right + 30} y={gg.rowTop(0)} out={keepsAt - 4}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap", ...TABULAR }}>
            {WINDOW.sales.rows.length} rows in, {G.rows.length} out
          </span>
        </Note>

        {/* ── SUM OVER: every row kept ── */}
        <Listing
          lines={W.lines}
          x={LIST_X}
          top={y(TOP)}
          width={700}
          size={SIZE}
          at={keepsAt - 2}
          out={out1}
          marks={[{ line: 1, at: sumOverAt + 6 }]}
        />
        <DataTable
          g={wg}
          cols={colsOf(W, { total: { at: besideAt - 4, ink: BLUE_INK } })}
          at={sumOverAt}
          out={out1}
          rows={rowsAt(W.rows, sumOverAt + 4)}
          bands={north.map((row) => ({ row, at: sumOverAt + 4, color: MARK_KEY }))}
          marks={W.rows.map((_, row) => ({ row, col: totalCol, at: sixAt + 4 + row * 2, color: MARK_OK }))}
        />
        <Note at={sixAt - 2} x={wg.right + 30} y={wg.rowTop(0)} out={out1}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap", ...TABULAR }}>
            {W.rows.length} rows in, {W.rows.length} out
          </span>
        </Note>

        {/* ── What OVER can say: three clauses, each over what it says, as
            plain text with the space between them doing the grouping. The
            clause the narration is on goes under the highlighter. ── */}
        {chips.map((c, i) => {
          const p = ease(frame, c.at - 2, 12);
          return (
            <div
              key={c.clause}
              style={{
                position: "absolute",
                left: CHIP_X,
                top: y(TOP) + i * h(CHIP_PITCH),
                opacity: p,
                transform: `translateX(${(1 - p) * 16}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 22,
                  fontWeight: 600,
                  color: BLUE_INK,
                  fontVariantLigatures: "none",
                  whiteSpace: "nowrap",
                  marginLeft: c.hot.length ? "-0.14em" : 0,
                }}
              >
                {c.hot.length ? (
                  <Mark at={c.hot[0]} out={c.hot[1] + 20} dur={10}>
                    {c.clause}
                  </Mark>
                ) : (
                  c.clause
                )}
              </div>
              <div style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap", marginTop: 8 }}>{c.text}</div>
            </div>
          );
        })}

        {/* ── Question 2: RANK, starting over in each region ── */}
        <Listing
          lines={R.lines}
          x={LIST_X}
          top={y(TOP)}
          width={700}
          size={SIZE}
          at={splitsAt - 6}
          marks={[
            { line: 1, at: splitsAt + 4, out: setsAt },
            { line: 2, at: setsAt + 2 },
          ]}
        />
        <DataTable
          g={rg}
          cols={colsOf(R, { rnk: { ink: BLUE_INK } })}
          at={rankAt + 4}
          rows={rowsAt(R.rows, rankAt + 8)}
          bands={north.map((row) => ({ row, at: rankAt + 8, color: MARK_KEY }))}
          marks={[
            { row: southFirst, col: rnkCol, at: againAt + 4 },
            ...firsts.map((row, k) => ({ row, col: rnkCol, at: firstAt + 2 + k * 4, color: MARK_OK })),
          ]}
        />
        <Note at={againAt + 6} x={rg.right + 30} y={rg.rowTop(southFirst)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <Mark at={bridgeAt}>starts over at 1</Mark>
          </span>
        </Note>
        </AbsoluteFill>
      </Drift>
    </AbsoluteFill>
  );
};
