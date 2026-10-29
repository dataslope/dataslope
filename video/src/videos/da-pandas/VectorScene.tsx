import React from "react";
import { AbsoluteFill } from "remotion";
import { QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, INK, INK_SOFT, TABULAR, fmt, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { VECTOR } from "./data";
import {
  colsOf,
  DataTable,
  Drift,
  ElbowArrow,
  geoOf,
  Listing,
  listingHeight,
  MARK_OK,
  TableName,
  X0,
} from "./parts";

const TOP = 340;
const VEC_X = 520;
const APPLY_X = 1080;
const RIGHT_X = 960;
const SIZE = 22;

/**
 * Questions 13, 14 and 15. The page's five amounts discounted both ways, one
 * call against one per value (and a million for a million rows); the page's
 * q1/q2 frame with apply's two axes drawn as the direction the answer runs, a
 * row of column ranges under it and a column of row ranges beside it; then
 * Series.map and DataFrame.map.
 */
export const VectorScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("vector").from;
  const qAt = n.word("vector", "Question");
  const textAt = n.word("vector", "Why is");
  const asked = n.beat("vector").to;
  const multAt = n.word("vector-why", "Multiply the column");
  const oneCallAt = n.word("vector-why", "one call");
  const applyAt = n.word("vector-apply", "Apply calls");
  const everyAt = n.word("vector-apply", "once for every value");
  const millionAt = n.word("vector-apply", "A million rows");
  const sameAt = n.word("vector-same", "Same answer");
  const q14At = n.word("vector-axis", "Question fourteen");
  const rangeAt = n.word("vector-range", "Here the function");
  const maxAt = n.word("vector-range", "max minus min");
  const axis0At = n.word("vector-axes", "axis zero");
  const colAt = n.word("vector-axes", "each column");
  const axis1At = n.word("vector-axes", "Axis one");
  const rowAt = n.word("vector-axes", "each row");
  const q15At = n.word("vector-map", "Question fifteen");
  const seriesMapAt = n.word("vector-map", "Series map");
  const alongAt = n.word("vector-map", "Apply works along");
  const frameMapAt = n.word("vector-cell", "data frame map");
  const formerlyAt = n.word("vector-cell", "formerly applymap");
  const cellAt = n.word("vector-cell", "every cell");
  const end = n.beat("reshape-in").to;

  // ── Question 13 ──
  const ag = geoOf(VECTOR.amounts, X0, y(TOP), h);
  const lineH = listingHeight(1, SIZE);
  const vg = geoOf(VECTOR.vectorized, VEC_X, y(TOP) + lineH + h(18), h);
  const pg = geoOf(VECTOR.applied, APPLY_X, y(TOP) + lineH + h(18), h);
  const out13 = q14At - 4;
  const rows = VECTOR.applied.rows.length;

  // ── Questions 14, 15: the q1/q2 frame, with apply's two answers on it ──
  const rangeCol = "axis=1";
  const F = VECTOR.frame;
  const table = { cols: [...F.cols, rangeCol], rows: F.rows.map((r, i) => [...r, VECTOR.byRow.rows[i][1]]) };
  const fg = geoOf(table, X0, y(TOP), h);
  const fcols = colsOf(table, { [rangeCol]: { at: rowAt - 2, ink: BLUE_INK } });
  const qCols = [2, 3];
  const under = fg.rowTop(F.rows.length) + h(10);
  const listTop = under + h(80);
  const out14 = q15At - 4;
  const smH = listingHeight(1, SIZE);
  const resultsTop = y(TOP) + 2 * smH + h(40);
  const smg = geoOf(VECTOR.seriesMap, RIGHT_X, resultsTop, h);
  const fmg = geoOf(VECTOR.frameMap, RIGHT_X + 260, resultsTop, h);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={oneCallAt} level={-32} />
      {Array.from({ length: rows }, (_, i) => (
        <Sfx key={i} name="el-tap" at={everyAt + 4 + i * 5} level={-36} />
      ))}
      <Sfx name="el-pop" at={millionAt + 6} level={-32} />
      <Sfx name="el-pencil" at={axis0At + 4} level={-34} />
      <Sfx name="el-pencil" at={axis1At + 4} level={-34} />
      <Sfx name="el-pop" at={cellAt} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={13} at={qAt - 4} textAt={textAt - 4} out={q14At - 4}>
          Why is vectorization preferred over <QMono>apply</QMono> with a lambda?
        </QuestionCard>
        <QuestionCard n={14} at={q14At} textAt={q14At + 10} out={q15At - 4}>
          How do you apply a function to each row or column?
        </QuestionCard>
        <QuestionCard n={15} at={q15At} textAt={q15At + 10}>
          <QMono>map</QMono>, <QMono>apply</QMono>, or <QMono>DataFrame.map</QMono>?
        </QuestionCard>

        {/* ── Question 13: one call, or one per value ── */}
        <TableName g={ag} at={asked - 6} out={out13}>
          df
        </TableName>
        <DataTable g={ag} cols={colsOf(VECTOR.amounts)} at={asked - 6} out={out13} rows={VECTOR.amounts.rows.map((cells, i) => ({ cells, at: asked - 2 + i * 2 }))} />
        <Listing lines={VECTOR.vectorized.lines} x={VEC_X} top={y(TOP)} width={420} size={SIZE} at={multAt - 4} out={out13} />
        <DataTable
          g={vg}
          cols={colsOf(VECTOR.vectorized)}
          at={multAt + 2}
          out={out13}
          rows={VECTOR.vectorized.rows.map((cells, i) => ({ cells, at: multAt + 6 + i }))}
          marks={VECTOR.vectorized.rows.map((_, i) => ({ row: i, col: 1, at: sameAt + i * 2, color: MARK_OK }))}
        />
        <Note at={oneCallAt - 2} x={vg.right + 26} y={vg.rowTop(2)} out={out13}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            <span style={{ fontWeight: 650 }}>1 call</span>, in compiled C
          </span>
        </Note>
        <Listing lines={VECTOR.applied.lines} x={APPLY_X} top={y(TOP)} width={600} size={SIZE} at={applyAt - 4} out={out13} />
        <DataTable
          g={pg}
          cols={colsOf(VECTOR.applied)}
          at={applyAt + 2}
          out={out13}
          rows={VECTOR.applied.rows.map((cells, i) => ({ cells, at: everyAt + 4 + i * 5 }))}
          marks={VECTOR.applied.rows.map((_, i) => ({ row: i, col: 1, at: sameAt + i * 2, color: MARK_OK }))}
        />
        {/* One call per value, counted as the values arrive. */}
        {Array.from({ length: rows }, (_, i) => (
          <Ink key={i} at={everyAt + 4 + i * 5} dur={8} out={out13} style={{ left: pg.right + 20, top: pg.rowMid(i) - 14 }}>
            <span style={{ ...label(20, BLUE_INK), whiteSpace: "nowrap" }}>call {i + 1}</span>
          </Ink>
        ))}
        <Note at={millionAt - 2} x={APPLY_X} y={pg.rowTop(rows) + h(30)} out={out13}>
          <span style={{ ...note(30, INK), whiteSpace: "nowrap", ...TABULAR }}>
            {fmt(VECTOR.calls, 0)} rows, <span style={{ fontWeight: 650 }}>{fmt(VECTOR.calls, 0)} calls</span>
          </span>
        </Note>

        {/* ── Questions 14 and 15: the page's q1/q2 frame ── */}
        <TableName g={fg} at={q14At + 4}>
          df
        </TableName>
        <DataTable g={fg} cols={fcols} at={q14At + 4} rows={table.rows.map((cells, i) => ({ cells, at: q14At + 8 + i * 2 }))} />
        {/* axis=0: down each column, its answer under it. */}
        {qCols.map((j, k) => (
          <React.Fragment key={j}>
            <ElbowArrow
              points={[
                // In the column's padding, left of its right-aligned numbers.
                [fg.xs[j] + 9, fg.top + fg.headH + 6],
                [fg.xs[j] + 9, fg.rowTop(F.rows.length) - 4],
              ]}
              at={axis0At + 4 + k * 4}
              color={BAR}
              width={3}
            />
            <Ink at={colAt + 2 + k * 4} dur={12} style={{ left: fg.xs[j], top: under, width: fg.widths[j] - fg.pad, textAlign: "right" }}>
              <span style={{ fontFamily: MONO, fontSize: 26, color: BLUE_INK, fontVariantLigatures: "none" }}>{VECTOR.byColumn.rows[k][1]}</span>
            </Ink>
          </React.Fragment>
        ))}
        <Ink at={colAt} dur={12} style={{ left: fg.x + fg.pad, top: under }}>
          <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600, color: BLUE_INK }}>axis=0</span>
        </Ink>
        {/* axis=1: across each row, its answer beside it. */}
        {F.rows.map((_, i) => (
          <ElbowArrow
            key={i}
            points={[
              // Under the row's numbers, not through them.
              [fg.xs[2] + 6, fg.rowMid(i) + h(20)],
              [fg.xs[4] - 6, fg.rowMid(i) + h(20)],
            ]}
            at={axis1At + 4 + i * 4}
            color={BAR}
            width={2.4}
            out={rowAt + 30}
          />
        ))}
        <Listing
          lines={VECTOR.byColumn.lines}
          x={X0}
          top={listTop}
          width={980}
          size={SIZE}
          at={rangeAt - 2}
          out={out14}
          marks={[{ line: 0, at: maxAt + 2, out: axis0At }]}
        />
        <Listing lines={VECTOR.byRow.lines} x={X0} top={listTop + lineH + h(14)} width={980} size={SIZE} at={axis1At - 2} out={out14} />

        {/* ── Question 15: Series.map and DataFrame.map ── */}
        <Listing lines={VECTOR.seriesMap.lines} x={RIGHT_X} top={y(TOP)} width={840} size={SIZE} at={seriesMapAt - 4} />
        <Listing lines={VECTOR.frameMap.lines} x={RIGHT_X} top={y(TOP) + smH + h(14)} width={840} size={SIZE} at={frameMapAt - 4} />
        <DataTable
          g={smg}
          cols={colsOf(VECTOR.seriesMap)}
          at={seriesMapAt + 4}
          rows={VECTOR.seriesMap.rows.map((cells, i) => ({ cells, at: seriesMapAt + 8 + i * 3 }))}
        />
        <DataTable
          g={fmg}
          cols={colsOf(VECTOR.frameMap)}
          at={frameMapAt + 4}
          rows={VECTOR.frameMap.rows.map((cells, i) => ({ cells, at: frameMapAt + 8 + i * 2 }))}
          marks={VECTOR.frameMap.rows.flatMap((_, i) => [1, 2].map((col) => ({ row: i, col, at: cellAt + 2 + i * 3 + col })))}
        />
        <Note at={alongAt} x={RIGHT_X} y={smg.rowTop(VECTOR.seriesMap.rows.length) + h(40)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
            <QMono>apply</QMono>: along an axis, as on the left
          </span>
        </Note>
        <Note at={formerlyAt - 2} x={RIGHT_X} y={smg.rowTop(VECTOR.seriesMap.rows.length) + h(90)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
            <QMono>DataFrame.map</QMono>: formerly <QMono>applymap</QMono>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
