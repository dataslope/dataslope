import React from "react";
import { AbsoluteFill } from "remotion";
import { QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { INK, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { NULLS } from "./data";
import { DataTable, Drift, Listing, listingHeight, MARK_BAD, MARK_OK, TableName, tableGeometry, X0 } from "./parts";

const TOP = 340;
const HEAD_H = 48;
const ROW_H = 54;
const RIGHT_X = 520;
const RESULT_X = 1110;

/**
 * Questions 5 and 6 on six discounts, two of them null. discount = NULL
 * finds nothing and IS NULL finds both; then COUNT(*), COUNT(1) and
 * COUNT(discount), the average over the four that have one, and the average
 * once COALESCE says a missing discount is zero.
 */
export const NullsScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("nulls").from;
  const qAt = n.word("nulls", "Question");
  const textAt = n.word("nulls", "How do nulls");
  const unknownAt = n.word("nulls", "unknown");
  const equalsAt = n.word("nulls-equals", "discount equals null");
  const zeroAt = n.word("nulls-equals", "Zero rows");
  const isAt = n.word("nulls-equals", "IS NULL");
  const bothAt = n.word("nulls-equals", "find both");
  const q6At = n.word("nulls-count", "Question six");
  const q6TextAt = n.word("nulls-count", "Count star", { nth: 1 });
  const starAt = n.word("nulls-count", "Count star", { nth: 2 });
  const sixAt = n.word("nulls-count", "all six rows");
  const discAt = n.word("nulls-count", "Count of discount");
  const fourAt = n.word("nulls-count", "only the four");
  const avgAt = n.word("nulls-avg", "The average");
  const sevenAt = n.word("nulls-avg", "seven and a half");
  const coalesceAt = n.word("nulls-avg", "coalesce");
  const fiveAt = n.word("nulls-avg", "to five");
  const end = n.beat("anti-in").to;

  const tg = tableGeometry({
    x: X0,
    top: y(TOP),
    cols: [{ name: "id" }, { name: "discount" }],
    rows: NULLS.orders.rows,
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });
  const nullRows = NULLS.orders.rows.flatMap((r, i) => (r[1] === "null" ? [i] : []));
  const valueRows = NULLS.orders.rows.flatMap((r, i) => (r[1] === "null" ? [] : [i]));

  const eqH = listingHeight(NULLS.equals.lines.length, 26);
  const isTop = y(TOP) + eqH + h(70);
  const resultG = (top: number, table: { cols: string[]; rows: string[][] }) =>
    tableGeometry({ x: RESULT_X, top, cols: table.cols.map((name) => ({ name })), rows: table.rows, headH: h(HEAD_H), rowH: h(ROW_H) });
  const eqG = resultG(y(TOP) + 6, NULLS.equals);
  const isG = resultG(isTop + 6, NULLS.isNull);

  const countsH = listingHeight(NULLS.counts.lines.length, 24);
  const avgLine = NULLS.counts.lines.findIndex((l) => l.trim().startsWith("AVG(discount)"));
  const coalesceLine = NULLS.counts.lines.findIndex((l) => l.includes("COALESCE"));
  const cols = NULLS.counts.cols;
  const colAt = [starAt, starAt + 10, discAt, avgAt, coalesceAt];
  const cg = tableGeometry({
    x: RIGHT_X,
    top: y(TOP) + countsH + h(60),
    cols: cols.map((name) => ({ name })),
    rows: NULLS.counts.rows,
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });

  return (
    <AbsoluteFill>
      <Sfx name="el-scratch" at={zeroAt} level={-32} />
      <Sfx name="el-pop" at={bothAt} level={-32} />
      <Sfx name="el-tap" at={q6At} level={-32} />
      <Sfx name="el-pop" at={fourAt} level={-32} />
      <Sfx name="el-pop" at={fiveAt} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} out={q6At - 4}>
          How do nulls behave?
        </QuestionCard>
        <QuestionCard n={6} at={q6At} textAt={q6TextAt}>
          <QMono>COUNT(*)</QMono>, <QMono>COUNT(1)</QMono>, or <QMono>COUNT(column)</QMono>?
        </QuestionCard>

        {/* ── Six discounts, two unknown ── */}
        <TableName g={tg} at={from + 2}>
          orders
        </TableName>
        <DataTable
          g={tg}
          cols={[{ name: "id", numeric: true }, { name: "discount", numeric: true }]}
          at={from + 2}
          rows={NULLS.orders.rows.map((cells, i) => ({ cells, at: from + 6 + i * 2 }))}
          bands={[
            ...nullRows.map((row, k) => ({ row, at: isAt + 4 + k * 4, out: q6At })),
            ...valueRows.map((row, k) => ({ row, at: fourAt + k * 3 })),
          ]}
          marks={nullRows.map((row) => ({ row, col: 1, at: unknownAt, out: equalsAt, color: MARK_BAD }))}
        />
        <Note at={unknownAt - 2} x={X0} y={tg.rowTop(NULLS.orders.rows.length) + 18} out={q6At}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>A null means unknown.</span>
        </Note>

        {/* ── = NULL against IS NULL ── */}
        <Listing lines={NULLS.equals.lines} x={RIGHT_X} top={y(TOP)} width={560} size={26} at={equalsAt - 4} out={q6At - 4} />
        <DataTable
          g={eqG}
          cols={[{ name: NULLS.equals.cols[0], numeric: true }]}
          at={zeroAt - 4}
          rows={NULLS.equals.rows.map((cells) => ({ cells, at: zeroAt }))}
          marks={[{ row: 0, col: 0, at: zeroAt + 4, color: MARK_BAD }]}
          out={q6At - 4}
        />
        <Listing lines={NULLS.isNull.lines} x={RIGHT_X} top={isTop} width={560} size={26} at={isAt - 4} out={q6At - 4} />
        <DataTable
          g={isG}
          cols={[{ name: NULLS.isNull.cols[0], numeric: true }]}
          at={bothAt - 6}
          rows={NULLS.isNull.rows.map((cells) => ({ cells, at: bothAt - 2 }))}
          marks={[{ row: 0, col: 0, at: bothAt + 4, color: MARK_OK }]}
          out={q6At - 4}
        />

        {/* ── The three COUNTs, and two averages ── */}
        <Listing
          lines={NULLS.counts.lines}
          x={RIGHT_X}
          top={y(TOP)}
          width={820}
          size={24}
          at={q6At + 4}
          marks={[
            { line: avgLine, at: avgAt },
            { line: coalesceLine, at: coalesceAt },
          ]}
        />
        <DataTable
          g={cg}
          cols={cols.map((name, j) => ({ name, numeric: true, at: colAt[j] }))}
          at={starAt - 2}
          rows={NULLS.counts.rows.map((cells) => ({ cells, at: starAt }))}
          marks={[
            { row: 0, col: 0, at: sixAt },
            { row: 0, col: 1, at: sixAt + 4 },
            { row: 0, col: 2, at: fourAt + 4 },
            { row: 0, col: 3, at: sevenAt },
            { row: 0, col: 4, at: fiveAt },
          ]}
        />
      </Drift>
    </AbsoluteFill>
  );
};
