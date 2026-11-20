import React from "react";
import { AbsoluteFill } from "remotion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK, INK_SOFT, headline, label, note } from "../../editorial/style";
import { ColumnRule, Ink, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { READINGS } from "./data";
import {
  Bracket,
  Clear,
  type Col,
  DataTable,
  Drift,
  Flow,
  line,
  Listing,
  listingHeight,
  listingWidth,
  Mark,
  tableGeometry,
  TableName,
  type TableRow,
  X0,
} from "./parts";

/** Where the query and the result sit: the right of the page. */
const R_X = 780;
const SIZE = 20;

/** The five guesses, as the page asks them. */
const GUESSES = ["Net of refunds?", "Cancelled orders?", "Test accounts?", "Which of three tables?", "Which join path, and does it fan out?"];

/**
 * Question 1. The hard part is the definitions, not the SQL; the five things
 * an assistant over raw tables has to guess; then the page's own rows and
 * query, run: three readings of "revenue", 1,450, 1,190 and 440, the orders
 * each one leaves out fading as it is read. All three run without an error,
 * 3.3 times apart. No query finds the right one in the rows: it is a
 * decision, which the next question writes down.
 */
export const T2sScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("t2s").from;
  const qAt = n.word("t2s", "Question one");
  const textAt = n.word("t2s", "Why does text-to-SQL");
  const hardAt = n.word("t2s-hard", "the hard part");
  const sqlAt = n.word("t2s-hard", "isn't the SQL");
  const defsAt = n.word("t2s-hard", "It's the definitions");
  const encodeAt = n.word("t2s-hard", "has to encode");
  const revenueAt = n.word("t2s-guess", "Ask for revenue");
  const guessAt = [
    n.word("t2s-guess", "Net of refunds"),
    n.word("t2s-guess", "Cancelled orders"),
    n.word("t2s-guess", "Test accounts"),
    n.word("t2s-guess", "Which of three similar tables"),
    n.word("t2s-guess", "which join path"),
  ];
  const rowsAt = n.word("t2s-rows", "eight orders");
  const fiveAt = n.word("t2s-rows", "five customers");
  const testAt = n.word("t2s-rows", "test account");
  const runFrom = n.beat("t2s-run").from;
  const everyAt = n.word("t2s-run", "Sum every order");
  const everyValAt = n.word("t2s-run", "fourteen hundred fifty");
  const completedAt = n.word("t2s-run", "Only the completed ones");
  const completedValAt = n.word("t2s-run", "eleven hundred ninety");
  const governedAt = n.word("t2s-run", "Completed, and not");
  const notTestAt = n.word("t2s-run", "test account");
  const governedValAt = n.word("t2s-run", "four hundred forty");
  const validAt = n.word("t2s-valid", "a valid query");
  const timesAt = n.word("t2s-valid", "more than three times");
  const nothingAt = n.word("t2s-valid", "Nothing in the SQL");
  const nameAt = n.word("t2s-name", "That's the failure to name");
  const fluentAt = n.word("t2s-name", "a fluent, plausible, wrong number");
  const pastAt = n.beat("t2s-past").from;
  const noQueryAt = n.word("t2s-past", "no query can find the right one");
  const decisionAt = n.word("t2s-decision", "a company decision");
  const writtenAt = n.word("t2s-decision", "written down");
  const end = n.beat("t2s-decision").to;

  // The rows: orders on the left, customers on the right until the query
  // takes its place.
  const aTop = y(350);
  const top = y(318);
  const headH = h(38);
  const rowH = h(36);
  const ordersCols: Col[] = READINGS.orders.columns.map((c) => ({ name: c, numeric: c === "amount" }));
  const testIds = new Set(READINGS.customers.rows.filter((r) => r[1] === true).map((r) => r[0]));
  const ordersG = tableGeometry({ x: X0, top, cols: ordersCols, rows: READINGS.orders.rows.map((r) => r.map(String)), headH, rowH, headSize: 20, bodySize: 22, pad: 16 });
  const leftOut = (status: unknown) => status !== "completed";
  const ordersRows: TableRow[] = READINGS.orders.rows.map((r, i) => ({
    cells: r.map(String),
    at: rowsAt + 4 + i * 2,
    dimAt: leftOut(r[3]) ? completedAt + 6 : testIds.has(r[1]) ? notTestAt + 4 : undefined,
  }));
  const custCol = ordersCols.findIndex((c) => c.name === "customer_id");
  // Customer 4's two cells stay marked through the run, so the rows "not
  // from the test account" leaves out are the ones still lit.
  const testMarks = READINGS.orders.rows.flatMap((r, i) => (testIds.has(r[1]) ? [{ row: i, col: custCol, at: testAt + 4, out: nameAt }] : []));
  const custCols: Col[] = READINGS.customers.columns.map((c) => ({ name: c }));
  const custG = tableGeometry({ x: R_X, top, cols: custCols, rows: READINGS.customers.rows.map((r) => r.map(String)), headH, rowH, headSize: 20, bodySize: 22, pad: 16 });
  const custRows: TableRow[] = READINGS.customers.rows.map((r, i) => ({ cells: r.map(String), at: fiveAt + 4 + i * 2 }));
  const testRow = READINGS.customers.rows.findIndex((r) => r[1] === true);

  // The query and its one-row result.
  const q = READINGS.query;
  const qW = listingWidth(q, SIZE);
  const resultTop = top + listingHeight(q.length, SIZE) + h(78);
  const resCols: Col[] = READINGS.result.columns.map((c) => ({ name: c, numeric: true }));
  const values = READINGS.result.rows[0].map(String);
  const resG = tableGeometry({ x: R_X, top: resultTop, cols: resCols, rows: [values], headH, rowH: h(40), headSize: 20, bodySize: 24, pad: 18 });
  const valueAt = [everyValAt, completedValAt, governedValAt];
  const resRows: TableRow[] = [{ cells: ["", "", ""], at: everyAt }];
  const bracketY = resG.rowTop(1) + h(22);

  // The verdict and the decision, on the left once the rows have gone.
  const verdictTop = y(330);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={defsAt} level={-35} />
      {guessAt.map((at, i) => (
        <Sfx key={i} name="el-tap" at={at} level={-33} />
      ))}
      <Sfx name="el-sprinkle" at={rowsAt + 4} level={-34} />
      <Sfx name="el-tap" at={testAt + 4} level={-31} />
      {valueAt.map((at, i) => (
        <Sfx key={i} name="el-tap" at={at + 2} level={-30} />
      ))}
      <Sfx name="el-pencil" at={timesAt} level={-35} />
      <Sfx name="el-chime" at={fluentAt + 8} level={-33} />
      <Sfx name="el-whoosh" at={writtenAt} level={-36} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} size={60}>
          Why does text-to-SQL over raw tables give confident wrong answers?
        </QuestionCard>

        {/* The hard part, and the guesses it forces. */}
        <Clear at={rowsAt - 10}>
          <Ink at={hardAt} dur={12} style={{ left: X0, top: aTop }}>
            <span style={{ ...label(24, INK_SOFT), whiteSpace: "nowrap" }}>The hard part</span>
          </Ink>
          <Ink at={sqlAt} dur={14} style={{ left: X0, top: aTop + h(58) }}>
            <span style={line(42, INK_SOFT)}>Not the syntax</span>
          </Ink>
          <Ink at={defsAt} dur={14} style={{ left: X0 - 6, top: aTop + h(128) }}>
            <span style={{ ...line(42, INK), fontSize: 42 }}>
              <Mark at={encodeAt}>The definitions</Mark>
            </span>
          </Ink>
          <ColumnRule x={R_X - 50} top={aTop} height={h(58) + 5 * h(64) - h(20)} at={revenueAt} />
          <Ink at={revenueAt} dur={12} style={{ left: R_X, top: aTop }}>
            <span style={{ ...label(24, INK_SOFT), whiteSpace: "nowrap" }}>Ask for revenue, and it has to guess</span>
          </Ink>
          {GUESSES.map((g, i) => (
            <Ink key={g} at={guessAt[i]} dur={12} style={{ left: R_X, top: aTop + h(58) + i * h(64) }}>
              <span style={line(34, INK)}>{g}</span>
            </Ink>
          ))}
        </Clear>

        {/* Eight orders from five customers; customer 4 is a test account. */}
        <Clear at={nameAt}>
          <TableName g={ordersG} at={rowsAt}>
            orders
          </TableName>
          <DataTable g={ordersG} cols={ordersCols} rows={ordersRows} at={rowsAt} marks={testMarks} />
        </Clear>
        <Clear at={runFrom - 4}>
          <TableName g={custG} at={fiveAt}>
            customers
          </TableName>
          <DataTable g={custG} cols={custCols} rows={custRows} at={fiveAt} marks={[{ row: testRow, col: 1, at: testAt + 4 }]} />
        </Clear>

        {/* The page's query: three readings, each summed in turn. */}
        <Listing
          lines={q}
          x={R_X}
          top={top}
          width={qW}
          size={SIZE}
          at={runFrom}
          step={2}
          out={pastAt}
          marks={[
            { line: "AS every_order", at: everyAt, out: completedAt },
            { line: "AS completed_orders", at: completedAt, out: governedAt },
            { line: "SUM(o.amount) FILTER (", at: governedAt },
            { line: "AND NOT c.is_test", at: governedAt + 4 },
            { line: "AS governed_net_revenue", at: governedAt + 8 },
          ]}
        />

        {/* The result, a cell for each reading as it is said. */}
        <TableName g={resG} at={everyAt}>
          Result
        </TableName>
        <DataTable
          g={resG}
          cols={resCols}
          rows={resRows}
          at={everyAt}
          swaps={values.map((v, j) => ({ row: 0, col: j, at: valueAt[j], value: v }))}
          marks={values.map((_, j) => ({ row: 0, col: j, at: valueAt[j] + 2, out: valueAt[j] + 40 }))}
        />
        <Bracket x0={resG.colMid(0)} x1={resG.colMid(2)} y={bracketY} at={timesAt} lip={-10} />
        <Ink at={timesAt + 6} dur={12} style={{ left: resG.colMid(0), width: resG.colMid(2) - resG.colMid(0), top: bracketY + h(10), textAlign: "center" }}>
          <span style={{ ...label(26, INK), whiteSpace: "nowrap" }}>
            The biggest is <Num>{`${READINGS.ratio}×`}</Num> the smallest
          </span>
        </Ink>
        <Ink at={validAt} dur={12} style={{ left: resG.right + 50, top: resG.top + headH / 2 - 16 }}>
          <span style={line(24, INK)}>Each reading runs: no error</span>
        </Ink>
        <Ink at={nothingAt} dur={12} style={{ left: resG.right + 50, top: resG.rowTop(0) + h(40) / 2 - 16 }}>
          <span style={line(24, INK_SOFT)}>Nothing looks wrong</span>
        </Ink>

        {/* The failure, named; and why no query finds the right reading. */}
        <Ink at={fluentAt} dur={16} style={{ left: X0, top: verdictTop }}>
          <span style={{ ...note(34, ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap" }}>A fluent, plausible, wrong number</span>
        </Ink>
        <Ink at={noQueryAt} dur={14} style={{ left: X0, top: verdictTop + h(76) }}>
          <span style={line(28, INK)}>No query finds the right one in the rows.</span>
        </Ink>
        <Ink at={decisionAt - 2} dur={20} style={{ left: X0 - 4, top: verdictTop + h(150), ...headline(52), whiteSpace: "nowrap" }}>
          Revenue is a decision,
          <br />
          not a column.
        </Ink>
        <Flow points={[[X0 + 360, verdictTop + h(150) + 88], [1856, verdictTop + h(150) + 88]]} at={writtenAt} dur={20} />
        <Ink at={writtenAt + 8} dur={14} style={{ left: 1856, top: verdictTop + h(150) + 88 - h(54), textAlign: "right", transform: "translateX(-100%)" }}>
          <span style={line(24, INK_SOFT)}>Written down where the assistant reads it</span>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
