import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BAR, HAIRLINE, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { GROUPBY } from "./data";
import {
  colsOf,
  DataTable,
  Drift,
  geoOf,
  KeyArrow,
  lerp,
  Listing,
  listingHeight,
  MARK_OK,
  TableName,
  X0,
} from "./parts";

const TOP = 340;
const PIECES_X = 640;
const RESULT_X = 1200;
const RIGHT_X = 980;
const SIZE = 22;
const BODY = 26;
const PIECE_ROW = 50;
const PIECE_LABEL = 34;
const PIECE_GAP = 30;

/**
 * Questions 3, 4 and 5 on one frame, the page's percentage-of-group block:
 * the rows split into one piece per region and slide across, each piece is
 * summed, the sums combine into a Series; then agg against transform (three
 * rows against five, the five as a new column of the same frame); then each
 * order's share of its region, a second new column.
 */
export const GroupbyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("groupby").from;
  const qAt = n.word("groupby", "Question");
  const textAt = n.word("groupby", "What does");
  const asked = n.beat("groupby").to;
  const splitAt = n.word("gb-split", "splits the rows");
  const sumAt = n.word("gb-split", "here a sum");
  const combineAt = n.word("gb-split", "Combine stacks");
  const returnsAt = n.word("gb-returns", "Group one column");
  const seriesAt = n.word("gb-returns", "a Series");
  const aggAt = n.word("gb-returns", "Name two aggregates");
  const frameAt = n.word("gb-returns", "a data frame");
  const q4At = n.word("gb-transform", "Question four");
  const onePerGroupAt = n.word("gb-transform", "one row per group");
  const transformAt = n.word("gb-transform", "Transform gives");
  const fiveAt = n.word("gb-transform", "Five rows in");
  const q5At = n.word("gb-pct", "question five");
  const divideAt = n.word("gb-pct", "Divide the amount");
  const percentAt = n.word("gb-pct", "sixty-two and a half percent");
  const end = n.beat("merge-in").to;

  // One frame for the whole scene: the page's rows, the transform's column
  // (question 4) and the share (question 5), each opening on its question.
  const base = GROUPBY.pct;
  const tName = 'transform("mean")';
  const table = {
    cols: [...base.cols.slice(0, 3), tName, base.cols[3]],
    rows: base.rows.map((r, i) => [...r.slice(0, 3), GROUPBY.transform.rows[i][1], r[3]]),
  };
  const g = geoOf(table, X0, y(TOP), h, { bodySize: BODY });
  const cols = colsOf(table, { [tName]: { at: transformAt + 4 }, pct_of_region: { at: divideAt + 4 } });

  // The pieces, in the order groupby sorts its keys.
  const keys = GROUPBY.sum.rows.map((r) => r[0]);
  const pieceRows = keys.map((k) => base.rows.flatMap((r, i) => (r[1] === k ? [i] : [])));
  const pieceTops: number[] = [];
  let cursor = y(TOP);
  for (const rows of pieceRows) {
    pieceTops.push(cursor);
    cursor += h(PIECE_LABEL) + rows.length * h(PIECE_ROW) + h(PIECE_GAP);
  }
  const rowLanding = (i: number) => {
    const k = pieceRows.findIndex((rows) => rows.includes(i));
    return pieceTops[k] + h(PIECE_LABEL) + pieceRows[k].indexOf(i) * h(PIECE_ROW);
  };
  const piecesOut = ease(frame, returnsAt - 4, 12);

  const lineH = listingHeight(1, SIZE);
  const sg = geoOf(GROUPBY.sum, RESULT_X, y(TOP) + lineH + h(18), h, { bodySize: BODY });
  const aggH = listingHeight(GROUPBY.agg.lines.length, SIZE);
  const ag = geoOf(GROUPBY.agg, PIECES_X, y(TOP) + aggH + h(30), h, { bodySize: BODY });
  const mg = geoOf(GROUPBY.aggMean, RIGHT_X, y(TOP) + lineH + h(18), h, { bodySize: BODY });
  const below = g.rowTop(table.rows.length) + h(40);
  const north = 0;

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={splitAt + 4} level={-34} />
      <Sfx name="el-tap" at={sumAt + 4} level={-32} />
      <Sfx name="el-pop" at={combineAt + 6} level={-32} />
      <Sfx name="el-pencil" at={transformAt + 6} level={-34} />
      <Sfx name="el-pencil" at={divideAt + 6} level={-34} />
      <Sfx name="el-pop" at={percentAt} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} out={q4At - 4}>
          What does <QMono>groupby</QMono> return, and what is split, apply, combine?
        </QuestionCard>
        <QuestionCard n={4} at={q4At} textAt={q4At + 10} out={q5At - 4}>
          What&apos;s the difference between <QMono>transform</QMono> and <QMono>agg</QMono>?
        </QuestionCard>
        <QuestionCard n={5} at={q5At} textAt={q5At + 10}>
          What&apos;s each order&apos;s share of its region?
        </QuestionCard>

        {/* ── The page's frame, growing a column per question ── */}
        <TableName g={g} at={asked - 6}>
          df
        </TableName>
        <DataTable
          g={g}
          cols={cols}
          at={asked - 6}
          rows={table.rows.map((cells, i) => ({ cells, at: asked - 2 + i * 2 }))}
          marks={[
            ...table.rows.map((_, i) => ({ row: i, col: 3, at: fiveAt + i * 3, out: q5At })),
            { row: north, col: 2, at: percentAt - 6 },
            { row: north, col: 4, at: percentAt, color: MARK_OK },
          ]}
        />

        {/* ── Split: one piece per region ── */}
        <div style={{ position: "absolute", inset: 0, opacity: 1 - piecesOut }}>
          {keys.map((k, p) => (
            <React.Fragment key={k}>
              <div
                style={{
                  position: "absolute",
                  left: PIECES_X - 12,
                  top: pieceTops[p] - 4,
                  width: 330,
                  height: h(PIECE_LABEL) + pieceRows[p].length * h(PIECE_ROW) + 8,
                  border: `1.5px solid ${HAIRLINE}`,
                  borderRadius: 8,
                  opacity: ease(frame, splitAt + 14 + p * 4, 12),
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: PIECES_X,
                  top: pieceTops[p],
                  height: h(PIECE_LABEL),
                  display: "flex",
                  alignItems: "center",
                  ...label(21, INK),
                  opacity: ease(frame, splitAt + 14 + p * 4, 12),
                }}
              >
                {k}
              </div>
              {/* Apply: each piece's sum, beside it. */}
              <div
                style={{
                  position: "absolute",
                  left: PIECES_X + 340,
                  top: pieceTops[p] + h(PIECE_LABEL) + (pieceRows[p].length * h(PIECE_ROW)) / 2 - 18,
                  ...note(26, INK),
                  ...TABULAR,
                  whiteSpace: "nowrap",
                  opacity: ease(frame, sumAt + 2 + p * 5, 10),
                }}
              >
                sum <span style={{ fontWeight: 700 }}>{GROUPBY.sum.rows[p][1]}</span>
              </div>
              <KeyArrow
                from={[PIECES_X + 470, pieceTops[p] + h(PIECE_LABEL) + (pieceRows[p].length * h(PIECE_ROW)) / 2]}
                to={[sg.x - 8, sg.rowMid(p)]}
                at={combineAt + 4 + p * 4}
                width={2.2}
              />
            </React.Fragment>
          ))}
          {base.rows.map((r, i) => {
            const p = ease(frame, splitAt + 2 + i * 3, 18);
            if (p <= 0) return null;
            const top = lerp(g.rowTop(i), rowLanding(i), p);
            const left = lerp(g.x, PIECES_X, p);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left,
                  top,
                  width: g.xs[3] - g.x,
                  height: h(PIECE_ROW),
                  fontFamily: MONO,
                  fontSize: BODY,
                  fontVariantLigatures: "none",
                  background: `color-mix(in srgb, ${BAR} ${8 + 6 * Math.sin(p * Math.PI)}%, ${PAPER})`,
                  borderRadius: 4,
                }}
              >
                {[0, 1, 2].map((j) => (
                  <span
                    key={j}
                    style={{
                      position: "absolute",
                      left: g.xs[j] - g.x + g.pad,
                      width: g.widths[j] - 2 * g.pad,
                      textAlign: j === 2 ? "right" : "left",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: j === 0 ? INK_SOFT : INK,
                    }}
                  >
                    {r[j]}
                  </span>
                ))}
              </div>
            );
          })}
        </div>

        {/* ── Combine: a Series, indexed by region ── */}
        <Listing lines={GROUPBY.sum.lines} x={RESULT_X} top={y(TOP)} width={600} size={SIZE} at={returnsAt - 2} out={q4At - 4} />
        <DataTable
          g={sg}
          cols={colsOf(GROUPBY.sum)}
          at={combineAt}
          rows={GROUPBY.sum.rows.map((cells, i) => ({ cells, at: combineAt + 8 + i * 4 }))}
          out={q4At - 4}
        />
        <Note at={seriesAt} x={sg.right + 28} y={sg.rowTop(1)} out={q4At - 4}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>a Series</span>
        </Note>
        <Listing lines={GROUPBY.agg.lines} x={PIECES_X} top={y(TOP)} width={500} size={SIZE} at={aggAt - 2} out={q4At - 4} />
        <DataTable
          g={ag}
          cols={colsOf(GROUPBY.agg)}
          at={frameAt - 6}
          rows={GROUPBY.agg.rows.map((cells, i) => ({ cells, at: frameAt - 2 + i * 3 }))}
          out={q4At - 4}
        />
        <Note at={frameAt + 2} x={ag.right + 28} y={ag.rowTop(1)} out={q4At - 4}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>a DataFrame</span>
        </Note>

        {/* ── agg: one row per group; transform: one per row ── */}
        <Listing lines={GROUPBY.aggMean.lines} x={RIGHT_X} top={y(TOP)} width={640} size={SIZE} at={onePerGroupAt - 6} out={q5At - 4} />
        <DataTable
          g={mg}
          cols={colsOf(GROUPBY.aggMean)}
          at={onePerGroupAt - 2}
          rows={GROUPBY.aggMean.rows.map((cells, i) => ({ cells, at: onePerGroupAt + 2 + i * 3 }))}
          out={q5At - 4}
        />
        <Note at={onePerGroupAt + 10} x={mg.right + 28} y={mg.rowTop(1)} out={q5At - 4}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>{GROUPBY.aggMean.rows.length} rows</span>
        </Note>
        <Listing lines={GROUPBY.transform.lines} x={X0} top={below} width={760} size={SIZE} at={transformAt - 2} out={q5At - 4} />
        <Note at={fiveAt} x={X0 + 780} y={below + h(8)} out={q5At - 4}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>{table.rows.length} rows</span>
        </Note>

        {/* ── A share of the group's total ── */}
        <Listing lines={GROUPBY.pct.lines} x={X0} top={below} width={1000} size={SIZE} at={divideAt - 2} />
        <Note at={percentAt - 4} x={g.right + 60} y={g.rowTop(north)}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap", ...TABULAR }}>
            {base.rows[north][2]} ÷ {GROUPBY.sum.rows.find((r) => r[0] === base.rows[north][1])![1]} = {base.rows[north][3]}%
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
