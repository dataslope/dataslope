import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK_INK, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, HAIRLINE, INK, INK_SOFT, label, note, TABULAR } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { METRIC, UNIT_TEST } from "./data";
import {
  Chip,
  DataTable,
  Drift,
  Flow,
  linesFrom,
  Listing,
  ListingTitle,
  listingWidth,
  MARK_GREEN,
  MARK_RED,
  money,
  resultGeometry,
  SmallMono,
  Spot,
  TableName,
  tableGeometry,
  TestResult,
  X0,
} from "./parts";

const SIZE = 19;
const TOP_Y = 330;
const R_X = 560;
const LOW_Y = 700;

/**
 * Question 10. The video's own daily_revenue, one day at 350.00, with
 * not_null and a range of 0 to 1,000 beside it, each "0 rows: pass" in
 * neutral ink. Then the reconciliation with finance's ledger at a 1%
 * tolerance, beside the day it returns: 350.00 against 150.00. Why: the
 * model's join (in red), order 1's 100.00 drawn once for each of its three
 * items. And the unit test that would have caught it: one mocked order of
 * 100.00 with three items, expected 100.00, actual 300.00.
 */
export const MetricScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("metric").from;
  const qAt = n.word("metric", "Question ten");
  const qTextAt = n.word("metric", "How do you test that a metric");
  const modelAt = n.word("metric", "Here's a daily revenue model");
  const notNullAt = n.word("metric", "Not null passes");
  const existsAt = n.word("metric", "the number exists");
  const rangeAt = n.word("metric", "A range test passes too");
  const plausibleAt = n.word("metric", "is plausible");
  const reconAt = n.word("metric-recon", "reconcile it with an independent source");
  const ledgerAt = n.word("metric-recon", "finance's ledger");
  const percentAt = n.word("metric-recon", "within one percent");
  const returnsAt = n.word("metric-recon", "and returns it");
  const againstAt = n.word("metric-recon", "against a hundred fifty");
  const joinedAt = n.word("metric-why", "The model joined each order to its items");
  const threeAt = n.word("metric-why", "counted three times");
  const unitAt = n.word("metric-unit", "a unit test would have caught it");
  const mockedAt = n.word("metric-unit-run", "one mocked order of a hundred dollars");
  const itemsAt = n.word("metric-unit-run", "with three items");
  const outAt = n.word("metric-unit-run", "comes out at three hundred");
  const end = n.beat("metric-unit-run").to;

  const top = y(TOP_Y);
  const low = y(LOW_Y);

  // ── The model's one day ──
  const m = METRIC.model;
  const mg = tableGeometry({ x: X0, top, cols: m.cols.map((name) => ({ name })), rows: m.rows, headH: h(40), rowH: h(42), headSize: 20, bodySize: 22, pad: 20 });

  // ── not_null and the range, beside what they return ──
  const tests = [
    { name: "not_null", t: METRIC.notNull, at: notNullAt, verdictAt: existsAt },
    { name: "a range, 0 to 1,000", t: METRIC.range, at: rangeAt, verdictAt: plausibleAt },
  ];
  const testW = Math.max(...tests.map((tt) => listingWidth(tt.t.sql, SIZE)));
  const listH = 2 * Math.round(SIZE * 0.66) + 3 * Math.round(SIZE * 1.8);
  const testTop = (i: number) => top + i * (listH + h(78));
  const testsOut = joinedAt - 4;

  // ── The reconciliation ──
  const rc = METRIC.reconcile;
  const rcW = listingWidth(rc.sql, SIZE);
  const rcg = resultGeometry(X0 + rcW + 28, low, rc.result.cols, rc.result.rows, h, 20);
  const reconOut = unitAt - 4;

  // ── Why: the join made a row per item ──
  const model = linesFrom(METRIC.modelSql, "SELECT");
  const modelW = listingWidth(model, SIZE);
  const jx = R_X + modelW + 60;
  const jg = tableGeometry({
    x: jx,
    top,
    cols: [{ name: "order_id" }, { name: "item" }, { name: "amount" }],
    rows: METRIC.joined.map((r) => [r.order, r.item, r.amount]),
    headH: h(38),
    rowH: h(38),
    headSize: 19,
    bodySize: 20,
    pad: 16,
  });
  const firstOrder = METRIC.joined[0].order;

  // ── The unit test ──
  const uo = UNIT_TEST.orders[0];

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={modelAt} level={-35} />
      <Sfx name="el-tap" at={existsAt} level={-34} />
      <Sfx name="el-tap" at={plausibleAt} level={-34} />
      <Sfx name="el-pop" at={ledgerAt} level={-30} />
      <Sfx name="el-pencil" at={percentAt + 2} level={-36} />
      <Sfx name="el-tap" at={returnsAt + 4} level={-31} />
      <Sfx name="el-whoosh" at={joinedAt - 4} level={-37} />
      <Sfx name="el-sprinkle" at={joinedAt + 10} level={-35} />
      <Sfx name="el-pencil" at={threeAt} level={-35} />
      <Sfx name="el-whoosh" at={unitAt - 4} level={-37} />
      <Sfx name="el-tap" at={mockedAt} level={-34} />
      <Sfx name="el-tap" at={outAt + 4} level={-31} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={10} at={qAt - 4} textAt={qTextAt - 4} size={58}>
          How do you test that a metric is correct, not just non-null?
        </QuestionCard>

        {/* ── daily_revenue, one day ── */}
        <TableName g={mg} at={modelAt}>
          daily_revenue
        </TableName>
        <DataTable
          g={mg}
          cols={m.cols.map((name) => ({ name, numeric: name === "revenue", ink: name === "revenue" ? BLUE_INK : INK }))}
          rows={m.rows.map((cells) => ({ cells, at: modelAt + 6 }))}
          at={modelAt}
          marks={[{ row: 0, col: 1, at: againstAt + 4, color: MARK_RED }]}
        />

        {/* ── Two tests that pass on it ── */}
        {tests.map((tt, i) => {
          const rg = resultGeometry(R_X + testW + 28, testTop(i), tt.t.result.cols, tt.t.result.rows, h, 20);
          return (
            <React.Fragment key={tt.name}>
              <ListingTitle x={R_X} top={testTop(i)} at={tt.at} out={testsOut}>
                {i === 0 ? <SmallMono>not_null</SmallMono> : "A range, 0 to 1,000"}
              </ListingTitle>
              <Listing lines={tt.t.sql} x={R_X} top={testTop(i)} size={SIZE} at={tt.at} out={testsOut} marks={[{ line: "WHERE", at: tt.at + 14 }]} />
              <TestResult
                g={rg}
                cols={tt.t.result.cols.map((name) => ({ name }))}
                rows={tt.t.result.rows}
                at={tt.verdictAt - 4}
                verdict={[{ at: tt.verdictAt, tone: "neutral", text: "0 rows: pass" }]}
                verdictSize={20}
                out={testsOut}
              />
            </React.Fragment>
          );
        })}

        {/* ── Reconcile with the ledger ── */}
        <ListingTitle x={X0} top={low} at={reconAt} out={reconOut}>
          A singular test: the day against finance&rsquo;s ledger
        </ListingTitle>
        <Listing
          lines={rc.sql}
          x={X0}
          top={low}
          size={SIZE}
          at={reconAt + 4}
          out={reconOut}
          marks={[{ line: "WHERE ABS", text: "0.01 * f.revenue", at: percentAt }]}
        />
        <TestResult
          g={rcg}
          cols={rc.result.cols.map((name) => ({ name, numeric: name !== "day" }))}
          rows={rc.result.rows}
          at={returnsAt - 2}
          verdict={[{ at: returnsAt + 2, tone: "bad", text: "1 row: fail" }]}
          verdictSize={20}
          marks={[
            { row: 0, col: 1, at: againstAt - 6, color: MARK_RED },
            // Finance's figure is the truth the model is checked against.
            { row: 0, col: 2, at: againstAt + 2, color: MARK_GREEN },
          ]}
          out={reconOut}
        />
        <Spot art="ledger" at={ledgerAt} out={reconOut} left={1560} top={low - h(20)} width={210} />

        {/* ── Why: one row per item ── */}
        <ListingTitle x={R_X} top={top} at={joinedAt}>
          The model&rsquo;s SQL
        </ListingTitle>
        <Listing lines={model} x={R_X} top={top} size={SIZE} at={joinedAt} marks={[{ line: "JOIN order_items", at: joinedAt + 10, color: MARK_RED }]} />
        <TableName g={jg} at={joinedAt + 10}>
          What the join made
        </TableName>
        <DataTable
          g={jg}
          cols={[{ name: "order_id", numeric: true }, { name: "item" }, { name: "amount", numeric: true }]}
          rows={METRIC.joined.map((r, i) => ({ cells: [r.order, r.item, r.amount], at: joinedAt + 14 + i * 4 }))}
          at={joinedAt + 10}
          bands={METRIC.joined.map((r, i) => (r.order === firstOrder ? { row: i, at: threeAt + i * 4, color: MARK_RED } : null)).filter((b) => b !== null)}
        />
        <Note at={threeAt + 8} x={jg.x} y={jg.rowTop(METRIC.joined.length) + h(16)}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            <span style={{ ...TABULAR }}>{METRIC.joined.map((r) => money(r.amount)).join(" + ")}</span> ={" "}
            <b style={{ color: ACCENT_INK }}>{money(METRIC.revenue)}</b>
          </span>
        </Note>

        {/* ── The unit test that would have caught it ── */}
        <Note at={unitAt} x={X0} y={low - h(46)}>
          <span style={{ ...label(21, INK), whiteSpace: "nowrap" }}>A unit test: mocked rows in, an expected row out</span>
        </Note>
        <Ink at={mockedAt} dur={12} style={{ left: X0, top: low + h(8), whiteSpace: "nowrap" }}>
          <div style={{ ...note(20, INK_SOFT) }}>Given</div>
          <div style={{ ...note(24, INK), marginTop: h(8) }}>
            Order {uo[0]}, <b>{money(uo[2])}</b>
            <span style={{ opacity: ease(frame, itemsAt, 10) }}>
              {" "}
              · items {UNIT_TEST.items.map((it) => it[1]).join(", ")}
            </span>
          </div>
        </Ink>
        <Flow points={[[X0 + 470, low + h(52)], [X0 + 600, low + h(52)]]} at={itemsAt + 6} />
        <Note at={itemsAt + 8} x={X0 + 474} y={low + h(6)}>
          <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>the model</span>
        </Note>
        <Ink at={outAt} dur={12} style={{ left: X0 + 620, top: low + h(8), whiteSpace: "nowrap" }}>
          <div style={{ ...note(20, INK_SOFT) }}>Actual</div>
          <div style={{ ...note(24, ACCENT_INK), fontWeight: 600, marginTop: h(8), ...TABULAR }}>{money(UNIT_TEST.actual)}</div>
        </Ink>
        <div style={{ position: "absolute", left: X0 + 790, top: low + h(10), width: 1, height: h(66) * ease(frame, itemsAt + 6, 12), background: HAIRLINE }} />
        <Ink at={itemsAt + 8} dur={12} style={{ left: X0 + 830, top: low + h(8), whiteSpace: "nowrap" }}>
          <div style={{ ...note(20, INK_SOFT) }}>Expected</div>
          <div style={{ ...note(24, OK_INK), fontWeight: 600, marginTop: h(8), ...TABULAR }}>{money(UNIT_TEST.expected)}</div>
        </Ink>
        <Ink at={outAt + 10} dur={10} style={{ left: X0 + 1010, top: low + h(40), whiteSpace: "nowrap" }}>
          <Chip tone="red" size={22}>
            unit test: fail
          </Chip>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
