import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK_INK, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { inkOf } from "../../theme/brand";
import { PLAN, thousands } from "./data";
import {
  Drift,
  lineOf,
  Listing,
  listingHeight,
  MARK_GREEN,
  MARK_RED,
  planLineMid,
  PlanBox,
  SmallMono,
  X0,
} from "./parts";

const TOP = 300;
const SIZE = 21;
const PSIZE = 19;
const R_X = 1320;

/**
 * Question 5. Left: the count of one day's orders, written with a cast on
 * the column, and the plan Postgres printed for it. The plan read as a tree
 * first (the indented Seq Scan runs first and feeds the Aggregate above it),
 * then the three things to read, each a band on its span with its label on
 * the right: the kind of scan, estimated rows against actual rows, the rows
 * a filter threw away. Then the numbers themselves, why the gap matters
 * (the plan is chosen from the estimate), and the cause: the cast, banded
 * red in the statement and in the filter. Last, the range on the
 * column itself and its plan, an Index Only Scan whose estimate and actual
 * rows agree, and the word for it, with the other two usual fixes.
 */
export const PlanScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("plan-q").from;
  const qAt = n.word("plan-q", "Question five");
  const textAt = n.word("plan-q", "How do you read a query plan");
  const explainAt = n.word("plan-q", "Explain analyze runs the query");
  const treeAt = n.word("plan-q", "prints its plan as a tree");
  const firstAt = n.word("plan-q", "the indented step runs first");
  const feedsAt = n.word("plan-q", "feeds the one above it");
  const threeAt = n.word("plan-look", "Read three things");
  const kindAt = n.word("plan-look", "the kind of scan");
  const estAt = n.word("plan-look", "the estimated rows");
  const actualAt = n.word("plan-look", "the actual rows");
  const awayAt = n.word("plan-look", "the rows a filter threw away");
  const countAt = n.word("plan-bad", "This count of one day's orders");
  const scansAt = n.word("plan-bad", "scans the table");
  const hasAt = n.word("plan-bad", "order time has an index");
  const expectedAt = n.word("plan-bad", "It expected five thousand rows");
  const foundAt = n.word("plan-bad", "found two thousand seven hundred thirty-two");
  const millionAt = n.word("plan-bad", "threw away nearly a million");
  const picksAt = n.word("plan-gap", "Postgres picks its plan from that estimate");
  const gapAt = n.word("plan-gap", "a big gap means a bad choice");
  const loopAt = n.word("plan-gap", "like a nested loop");
  const causeAt = n.word("plan-why", "The cause is the filter");
  const dateAt = n.word("plan-why", "turns each timestamp into a date");
  const cantAt = n.word("plan-why", "can't search a function of it");
  const rangeAt = n.word("plan-fix", "Write it as a range");
  const onlyAt = n.word("plan-fix", "an index-only scan");
  const rightAt = n.word("plan-fix", "exactly right");
  const sargAt = n.word("plan-sarg", "a sargable filter");
  const searchAt = n.word("plan-sarg", "one the index can search");
  const otherAt = n.word("plan-fixes", "The other usual fixes");
  const exprAt = n.word("plan-fixes", "an index on the expression itself");
  const statsAt = n.word("plan-fixes", "fresh statistics");
  const staleAt = n.word("plan-fixes", "when the estimates are stale");
  const end = n.beat("plan-fixes").to;

  const fixOut = rangeAt - 4;
  const listTop = y(TOP);
  const planTop = listTop + listingHeight(PLAN.fn.length, SIZE) + h(24);
  const rangePlanTop = listTop + listingHeight(PLAN.range.length, SIZE) + h(24);
  const rangeShown = PLAN.rangePlan.filter((l) => !l.includes("Index Cond"));

  // The tree's arrow: from the Seq Scan up to the Aggregate it feeds.
  const aggY = planLineMid(planTop, lineOf(PLAN.fnPlan, "Aggregate"), PSIZE);
  const seqY = planLineMid(planTop, lineOf(PLAN.fnPlan, "Seq Scan"), PSIZE);
  const arrowX = X0 + 900;

  // The notes beside the plan, one per row at a reading pitch.
  const rows = (i: number) => planTop + h(4) + i * h(46);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={explainAt} level={-35} />
      <Sfx name="el-tap" at={firstAt + 2} level={-34} />
      <Sfx name="el-pencil" at={feedsAt + 2} level={-35} />
      <Sfx name="el-tap" at={kindAt} level={-34} />
      <Sfx name="el-tap" at={estAt} level={-34} />
      <Sfx name="el-tap" at={awayAt} level={-34} />
      <Sfx name="el-pop" at={foundAt + 2} level={-32} />
      <Sfx name="el-scratch" at={millionAt + 4} level={-33} />
      <Sfx name="el-pencil" at={dateAt + 2} level={-34} />
      <Sfx name="el-whoosh" at={rangeAt - 2} level={-36} />
      <Sfx name="el-pop" at={rightAt} level={-31} />
      <Sfx name="el-chime" at={sargAt + 2} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} size={58}>
          How do you read a query plan?
        </QuestionCard>

        {/* ── The statement and its plan ── */}
        <Listing
          lines={PLAN.fn}
          x={X0}
          top={listTop}
          width={860}
          size={SIZE}
          at={explainAt - 4}
          out={fixOut}
          marks={[
            { line: "EXPLAIN", at: explainAt + 4, out: firstAt },
            { line: "::date", text: "created_at::date", at: dateAt, color: MARK_RED },
          ]}
        />
        <PlanBox
          lines={PLAN.fnPlan}
          x={X0}
          top={planTop}
          width={860}
          size={PSIZE}
          at={treeAt - 4}
          out={fixOut}
          marks={[
            { line: "Seq Scan", text: "Seq Scan", at: firstAt, out: threeAt },
            { line: "Aggregate", text: "Aggregate", at: feedsAt + 4, out: threeAt },
            { line: "Seq Scan", text: "Seq Scan", at: kindAt, out: countAt },
            { line: "Seq Scan", text: `(rows=${PLAN.fnEstimate})`, at: estAt, out: countAt },
            { line: "Seq Scan", text: `actual rows=${PLAN.fnActual}.00`, at: actualAt, out: countAt },
            { line: "Rows Removed", at: awayAt, out: countAt },
            { line: "Seq Scan", text: "Seq Scan", at: scansAt, color: MARK_RED },
            { line: "Seq Scan", text: `(rows=${PLAN.fnEstimate})`, at: expectedAt },
            { line: "Seq Scan", text: `actual rows=${PLAN.fnActual}.00`, at: foundAt },
            { line: "Rows Removed", at: millionAt, color: MARK_RED },
            { line: "Filter:", text: "(created_at)::date", at: dateAt + 6, color: MARK_RED },
          ]}
        />
        {/* Read as a tree: the indented step first, feeding the one above. */}
        <Note at={firstAt + 4} x={arrowX} y={seqY - h(16)} out={threeAt}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: inkOf.yellow }}>1</b>&nbsp;&nbsp;The indented step runs first
          </span>
        </Note>
        <Note at={feedsAt + 2} x={arrowX} y={aggY - h(16)} out={threeAt}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: inkOf.yellow }}>2</b>&nbsp;&nbsp;and feeds the one above it
          </span>
        </Note>

        {/* ── The three things to read ── */}
        <Note at={threeAt} x={R_X} y={rows(0)} out={countAt}>
          <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>Read three things</span>
        </Note>
        {[
          { at: kindAt, text: "The kind of scan", row: 1 },
          { at: estAt, text: "Estimated rows against actual", row: 2 },
          { at: awayAt, text: "Rows a filter threw away", row: 3 },
        ].map((t, i) => (
          <Note key={t.text} at={t.at} x={R_X} y={rows(t.row)} out={countAt}>
            <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
              <b>{i + 1}</b>&nbsp;&nbsp;{t.text}
            </span>
          </Note>
        ))}

        {/* ── What this plan says ── */}
        <Note at={hasAt} x={R_X} y={rows(0)} out={fixOut}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            An index on <SmallMono color={INK}>created_at</SmallMono> exists
          </span>
        </Note>
        <Note at={expectedAt} x={R_X} y={rows(1)} out={fixOut}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            Expected <b><Num>{thousands(PLAN.fnEstimate)}</Num></b> rows
          </span>
        </Note>
        <Note at={foundAt} x={R_X} y={rows(2)} out={fixOut}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            Found <b><Num>{thousands(PLAN.fnActual)}</Num></b>
          </span>
        </Note>
        <Note at={millionAt} x={R_X} y={rows(3)} out={fixOut}>
          <span style={{ ...note(24, ACCENT_INK), whiteSpace: "nowrap" }}>
            Threw away <b><Num>{thousands(PLAN.fnRemoved)}</Num></b>
          </span>
        </Note>
        {/* Why the gap matters: the plan is chosen from the estimate. */}
        <Note at={picksAt} x={R_X} y={rows(4) + h(20)} out={fixOut}>
          <div style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>Postgres plans from the estimate,</div>
          <div style={{ ...note(22, INK), whiteSpace: "nowrap", marginTop: h(6), opacity: ease(frame, gapAt, 10) }}>so a big gap means a bad choice</div>
          <div style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap", marginTop: h(6), opacity: ease(frame, loopAt, 10) }}>such as a nested loop over too many rows</div>
        </Note>
        <Note at={causeAt} x={X0} y={planTop + h(206)} out={fixOut}>
          <div style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            The cause: <SmallMono color={ACCENT_INK}>created_at::date</SmallMono>
            <span style={{ opacity: ease(frame, dateAt, 10) }}>, a date made from every row&rsquo;s timestamp.</span>
          </div>
          <div style={{ ...note(24, INK), whiteSpace: "nowrap", marginTop: h(10), opacity: ease(frame, cantAt, 10) }}>
            The index holds <SmallMono>created_at</SmallMono>, not a function of it, so it can&rsquo;t search this.
          </div>
        </Note>

        {/* ── The fix: a range on the column itself ── */}
        <Listing
          lines={PLAN.range}
          x={X0}
          top={listTop}
          width={860}
          size={SIZE}
          at={rangeAt}
          marks={[
            { line: ">=", text: "created_at >= '2024-06-01'", at: rangeAt + 10, color: MARK_GREEN },
            { line: "<", text: "created_at <  '2024-06-02'", at: rangeAt + 14, color: MARK_GREEN },
          ]}
        />
        <PlanBox
          lines={rangeShown}
          x={X0}
          top={rangePlanTop}
          width={1150}
          size={PSIZE}
          at={rangeAt + 8}
          marks={[
            { line: "Index Only Scan", text: "Index Only Scan", at: onlyAt, color: MARK_GREEN },
            { line: "Index Only Scan", text: `(rows=${PLAN.rangeEstimate})`, at: rightAt, color: MARK_GREEN },
            { line: "Index Only Scan", text: `actual rows=${PLAN.rangeActual}.00`, at: rightAt + 4, color: MARK_GREEN },
          ]}
        />
        <Note at={rightAt} x={R_X + 30} y={rangePlanTop + h(20)}>
          <div style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            Estimated <b><Num>{thousands(PLAN.rangeEstimate)}</Num></b>
          </div>
          <div style={{ ...note(24, OK_INK), fontWeight: 500, whiteSpace: "nowrap", marginTop: h(8) }}>
            Actual <Num>{thousands(PLAN.rangeActual)}</Num>
          </div>
        </Note>
        <Note at={sargAt} x={X0} y={rangePlanTop + h(200)}>
          <span style={{ ...note(30, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: OK_INK }}>Sargable</b>
            <span style={{ opacity: ease(frame, searchAt, 10) }}>: a filter the index can search.</span>
          </span>
        </Note>
        <Note at={otherAt} x={X0} y={rangePlanTop + h(258)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
            The other usual fixes:
            <span style={{ color: INK, opacity: ease(frame, exprAt, 10) }}>
              {" "}
              an index on <SmallMono>created_at::date</SmallMono>,
            </span>
            <span style={{ color: INK, opacity: ease(frame, statsAt, 10) }}>
              {" "}
              or <SmallMono>ANALYZE</SmallMono>
            </span>
            <span style={{ opacity: ease(frame, staleAt, 10) }}> when estimates are stale</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
