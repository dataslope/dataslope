import React from "react";
import { AbsoluteFill } from "remotion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { INK, note, TABULAR } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { SUBQUERIES } from "./data";
import { DataTable, Drift, Listing, MARK_OK, Mono, TableName, tableGeometry, X0 } from "./parts";

const TOP = 340;
const HEAD_H = 48;
const ROW_H = 54;
const AVGS_X = 600;
const LIST_X = 940;
const LIST_W = 840;

/**
 * Questions 9 and 10, on the page's orders for three customers. A CTE as a
 * named step; a correlated subquery re-run for every order (the row it reads
 * steps down the table), which keeps the three orders above their own
 * customer's average; the uncorrelated one, run once, which keeps two; and
 * the CTE again, which finds the same three.
 */
export const CteScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("cte").from;
  const qAt = n.word("cte", "Question");
  const textAt = n.word("cte", "A C T E");
  const namedAt = n.word("cte-what", "named step");
  const useAt = n.word("cte-what", "use it");
  const q10At = n.word("cte-correlated", "Question ten");
  const q10TextAt = n.word("cte-correlated", "What's");
  const readsAt = n.word("cte-correlated", "reads the outer row");
  const againAt = n.word("cte-correlated", "runs again");
  const avaAt = n.word("cte-result", "Ava");
  const threeAt = n.word("cte-result", "Three orders");
  const onceAt = n.word("cte-plain", "runs once");
  const everyoneAt = n.word("cte-plain", "everyone's average");
  const twoAt = n.word("cte-plain", "only two orders");
  const sameAt = n.word("cte-same", "the same three");
  const eachAt = n.word("cte-same", "each average once");
  const joiningAt = n.word("cte-same", "then joining");
  const end = n.beat("cte-same").to;

  const og = tableGeometry({
    x: X0,
    top: y(TOP),
    cols: [{ name: "id" }, { name: "customer_id" }, { name: "amount" }],
    rows: SUBQUERIES.orders.rows,
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });
  const ag = tableGeometry({
    x: AVGS_X,
    top: y(TOP),
    cols: SUBQUERIES.averages.cols.map((name) => ({ name })),
    rows: SUBQUERIES.averages.rows,
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });

  // The rows each query keeps, by order id.
  const rowOf = (id: string) => SUBQUERIES.orders.rows.findIndex((r) => r[0] === id);
  const correlated = SUBQUERIES.correlated.rows.map((r) => rowOf(r[0]));
  const uncorrelated = SUBQUERIES.uncorrelated.rows.map((r) => rowOf(r[0]));
  const viaCte = SUBQUERIES.cte.rows.map((r) => rowOf(r[0]));
  const cte = SUBQUERIES.cte.lines;
  const cteEnd = cte.findIndex((l) => l.startsWith(")"));
  const joinLine = cte.findIndex((l) => l.startsWith("JOIN avgs"));
  const readLine = SUBQUERIES.correlated.lines.findIndex((l) => l.includes("= o.customer_id"));
  // The correlated subquery's outer row, stepping down the orders.
  const STEP = 9;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={namedAt + 4} level={-34} />
      <Sfx name="el-tap" at={q10At} level={-32} />
      <Sfx name="el-pop" at={threeAt + 4} level={-32} />
      <Sfx name="el-pop" at={twoAt + 4} level={-32} />
      <Sfx name="el-pop" at={sameAt + 4} level={-30} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={9} at={qAt - 4} textAt={textAt - 4} out={q10At - 4}>
          A <Mono>CTE</Mono> or a subquery?
        </QuestionCard>
        <QuestionCard n={10} at={q10At} textAt={q10TextAt - 2}>
          What&apos;s a correlated subquery?
        </QuestionCard>

        {/* ── The page's orders, and each customer's average ── */}
        <TableName g={og} at={from + 2}>
          orders
        </TableName>
        <DataTable
          g={og}
          cols={[{ name: "id", numeric: true }, { name: "customer_id", numeric: true }, { name: "amount", numeric: true }]}
          at={from + 2}
          rows={SUBQUERIES.orders.rows.map((cells, i) => ({ cells, at: from + 6 + i * 2 }))}
          bands={[
            ...SUBQUERIES.orders.rows.map((_, i) => ({ row: i, at: againAt + i * STEP, out: againAt + (i + 1) * STEP })),
            ...correlated.map((row, k) => ({ row, at: threeAt + 4 + k * 3, out: onceAt, color: MARK_OK })),
            ...uncorrelated.map((row, k) => ({ row, at: twoAt + 4 + k * 3, out: sameAt })),
            ...viaCte.map((row, k) => ({ row, at: sameAt + 4 + k * 3, color: MARK_OK })),
          ]}
        />
        <TableName g={ag} at={avaAt - 6}>
          each customer&apos;s average
        </TableName>
        <DataTable
          g={ag}
          cols={SUBQUERIES.averages.cols.map((name, j) => ({ name, numeric: j > 0 }))}
          at={avaAt - 6}
          rows={SUBQUERIES.averages.rows.map((cells, i) => ({ cells, at: n.word("cte-result", cells[0]) - 2 + i }))}
          dim={onceAt}
        />
        <Note at={everyoneAt - 2} x={AVGS_X} y={ag.rowTop(SUBQUERIES.averages.rows.length) + 18} out={sameAt - 2}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            everyone: <span style={TABULAR}>{SUBQUERIES.overall.toFixed(2)}</span>
          </span>
        </Note>

        {/* ── A CTE: a named step ── */}
        <Listing
          lines={cte}
          x={LIST_X}
          top={y(TOP)}
          width={LIST_W}
          size={22}
          at={namedAt - 6}
          marks={[...Array.from({ length: cteEnd + 1 }, (_, i) => ({ line: i, at: namedAt + 4 + i * 3, out: useAt })), { line: joinLine, at: useAt + 4 }]}
          out={q10At - 4}
        />

        {/* ── Correlated: re-run for every order ── */}
        <Listing
          lines={SUBQUERIES.correlated.lines}
          x={LIST_X}
          top={y(TOP)}
          width={LIST_W}
          size={24}
          at={q10At + 4}
          marks={[{ line: readLine, at: readsAt + 2 }]}
          out={onceAt - 4}
        />

        {/* ── Uncorrelated: run once ── */}
        <Listing lines={SUBQUERIES.uncorrelated.lines} x={LIST_X} top={y(TOP)} width={LIST_W} size={24} at={onceAt} out={sameAt - 4} />

        {/* ── The CTE again: the same three ── */}
        <Listing
          lines={cte}
          x={LIST_X}
          top={y(TOP)}
          width={LIST_W}
          size={22}
          at={sameAt}
          marks={[
            ...Array.from({ length: cteEnd + 1 }, (_, i) => ({ line: i, at: eachAt + 2 + i * 3 })),
            { line: joinLine, at: joiningAt + 2 },
          ]}
        />
      </Drift>
    </AbsoluteFill>
  );
};
