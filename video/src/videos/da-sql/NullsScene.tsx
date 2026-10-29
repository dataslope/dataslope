import React from "react";
import { AbsoluteFill } from "remotion";
import { QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { INK, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { NULLS } from "./data";
import { DataTable, Drift, Listing, listingHeight, MARK_BAD, MARK_OK, Mono, NoRows, TableName, tableGeometry, X0 } from "./parts";

const TOP = 340;
const HEAD_H = 48;
const ROW_H = 54;
const RIGHT_X = 520;
const RESULT_X = 1110;

/**
 * Questions 5 and 6 on six discounts, two of them null. discount = NULL
 * finds no rows and IS NULL finds both; aggregates skip the nulls, so the
 * average is over the other four, and COALESCE says a missing discount is
 * zero. Then Question 6: COUNT(*), COUNT(1) and COUNT(discount), and the two
 * things said beside them (COUNT(1) is no faster; COUNT(DISTINCT) counts the
 * different values).
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
  const aggAt = n.word("nulls-avg", "Aggregates skip nulls");
  const avgAt = n.word("nulls-avg", "The average");
  const sevenAt = n.word("nulls-avg", "seven and a half");
  const otherAt = n.word("nulls-avg", "the other four");
  const coalesceAt = n.word("nulls-coalesce", "coalesce");
  const fiveAt = n.word("nulls-coalesce", "to five");
  const q6At = n.word("nulls-count", "Question six");
  const q6TextAt = n.word("nulls-count", "Count star", { nth: 1 });
  const starAt = n.word("nulls-count", "Count star", { nth: 2 });
  const sixAt = n.word("nulls-count", "all six rows");
  const discAt = n.word("nulls-count", "Count of discount");
  const fourAt = n.word("nulls-count", "only the four");
  const fasterAt = n.word("nulls-faster", "isn't any faster");
  const distinctAt = n.word("nulls-faster", "count distinct");
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
  if (NULLS.isNull.rows.length !== nullRows.length) throw new Error("IS NULL does not find every null");

  const eqH = listingHeight(NULLS.equals.lines.length, 26);
  const isTop = y(TOP) + eqH + h(70);
  const resultG = (top: number, table: { cols: string[]; rows: string[][] }) =>
    tableGeometry({ x: RESULT_X, top, cols: table.cols.map((name) => ({ name })), rows: table.rows, headH: h(HEAD_H), rowH: h(ROW_H) });
  const isG = resultG(isTop, NULLS.isNull);

  // Question 5's aggregates: the average over the four, then with COALESCE.
  const avgs = NULLS.averages;
  const avgsH = listingHeight(avgs.lines.length, 24);
  const coalesceLine = avgs.lines.findIndex((l) => l.includes("COALESCE"));
  const ag = tableGeometry({
    x: RIGHT_X,
    top: y(TOP) + avgsH + h(60),
    cols: avgs.cols.map((name) => ({ name })),
    rows: avgs.rows,
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });

  // Question 6's three COUNTs.
  const counts = NULLS.counts;
  const countsH = listingHeight(counts.lines.length, 24);
  const colAt = [starAt, starAt + 10, discAt];
  const cg = tableGeometry({
    x: RIGHT_X,
    top: y(TOP) + countsH + h(60),
    cols: counts.cols.map((name) => ({ name })),
    rows: counts.rows,
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });
  const countsEnd = cg.rowTop(counts.rows.length);

  return (
    <AbsoluteFill>
      <Sfx name="el-scratch" at={zeroAt} level={-32} />
      <Sfx name="el-pop" at={bothAt} level={-32} />
      <Sfx name="el-pop" at={fiveAt} level={-32} />
      <Sfx name="el-tap" at={q6At} level={-32} />
      <Sfx name="el-pop" at={fourAt} level={-32} />

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
            ...nullRows.map((row, k) => ({ row, at: isAt + 4 + k * 4, out: aggAt })),
            ...valueRows.map((row, k) => ({ row, at: otherAt + k * 3, out: q6At })),
            ...valueRows.map((row, k) => ({ row, at: fourAt + k * 3 })),
          ]}
          marks={nullRows.map((row) => ({ row, col: 1, at: unknownAt, out: equalsAt, color: MARK_BAD }))}
        />
        <Note at={unknownAt - 2} x={X0} y={tg.rowTop(NULLS.orders.rows.length) + 18} out={q6At}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>A null means unknown.</span>
        </Note>

        {/* ── = NULL against IS NULL: the rows each finds ── */}
        <Listing lines={NULLS.equals.lines} x={RIGHT_X} top={y(TOP)} width={560} size={26} at={equalsAt - 4} out={aggAt - 4} />
        <NoRows x={RESULT_X} top={y(TOP)} at={zeroAt - 2} col={NULLS.equals.cols[0]} out={aggAt - 4} />
        <Listing lines={NULLS.isNull.lines} x={RIGHT_X} top={isTop} width={560} size={26} at={isAt - 4} out={aggAt - 4} />
        <DataTable
          g={isG}
          cols={[{ name: NULLS.isNull.cols[0], numeric: true }]}
          at={bothAt - 6}
          rows={NULLS.isNull.rows.map((cells, i) => ({ cells, at: bothAt - 2 + i * 3 }))}
          bands={NULLS.isNull.rows.map((_, i) => ({ row: i, at: bothAt + 4 + i * 3, color: MARK_OK }))}
          out={aggAt - 4}
        />

        {/* ── Question 5's aggregates: AVG skips them; COALESCE fills them ── */}
        <Listing
          lines={avgs.lines}
          x={RIGHT_X}
          top={y(TOP)}
          width={640}
          size={24}
          at={aggAt}
          marks={[
            { line: 0, at: avgAt },
            { line: coalesceLine, at: coalesceAt },
          ]}
          out={q6At - 4}
        />
        <DataTable
          g={ag}
          cols={avgs.cols.map((name, j) => ({ name, numeric: true, at: j === 0 ? undefined : coalesceAt }))}
          at={avgAt - 2}
          rows={avgs.rows.map((cells) => ({ cells, at: avgAt + 2 }))}
          marks={[
            { row: 0, col: 0, at: sevenAt },
            { row: 0, col: 1, at: fiveAt },
          ]}
          out={q6At - 4}
        />

        {/* ── Question 6: the three COUNTs ── */}
        <Listing lines={counts.lines} x={RIGHT_X} top={y(TOP)} width={680} size={24} at={q6At + 4} />
        <DataTable
          g={cg}
          cols={counts.cols.map((name, j) => ({ name, numeric: true, at: colAt[j] }))}
          at={starAt - 2}
          rows={counts.rows.map((cells) => ({ cells, at: starAt }))}
          marks={[
            { row: 0, col: 0, at: sixAt },
            { row: 0, col: 1, at: sixAt + 4 },
            { row: 0, col: 2, at: fourAt + 4 },
          ]}
        />
        <Note at={fasterAt - 4} x={RIGHT_X} y={countsEnd + h(30)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <Mono>COUNT(1)</Mono> is no faster than <Mono>COUNT(*)</Mono>: engines treat them the same.
          </span>
        </Note>
        <Note at={distinctAt - 2} x={RIGHT_X} y={countsEnd + h(78)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <Mono>COUNT(DISTINCT discount)</Mono> counts the different values, nulls left out.
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
