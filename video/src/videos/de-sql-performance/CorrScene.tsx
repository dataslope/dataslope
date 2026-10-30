import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QMono, QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK, INK_SOFT, headline, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { CORR, thousands } from "./data";
import { Drift, Listing, listingHeight, MARK_OK, MARK_RED, OK, OK_INK, PlanBox, X0 } from "./parts";

const TOP = 330;
const SIZE = 21;
const PLAN = 20;
const R_X = 1180;

/**
 * Question 7, on the page's correlated subquery over the video's own 10,000
 * employees. The listing marks the outer reference; the plan Postgres
 * printed runs SubPlan 1 with loops=10000, each a Seq Scan of the whole
 * table (1,000 kept, 9,000 removed), so the count on the right multiplies
 * out to a hundred million rows read. Then the page's CTE rewrite and its
 * plan, one Hash Join with the same 10,000 rows, and the window function
 * that also does it. Last, DuckDB's plan for the original: its optimizer
 * decorrelates it into a hash join over a group by on its own.
 */
export const CorrScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("corr").from;
  const qAt = n.word("corr", "Question seven");
  const textAt = n.word("corr", "What is a correlated subquery");
  const outerAt = n.word("corr", "reads a column of the outer row");
  const avgAt = n.word("corr", "each employee's department average");
  const subAt = n.word("corr-loop", "as a sub plan");
  const perRowAt = n.word("corr-loop", "once per row");
  const tenAt = n.word("corr-loop", "ten thousand times");
  const scanAt = n.word("corr-loop", "each a scan of ten thousand");
  const hundredAt = n.word("corr-loop", "a hundred million rows read");
  const onceAt = n.word("corr-fix", "Compute the averages once");
  const cteAt = n.word("corr-fix", "in a CTE");
  const hashAt = n.word("corr-fix", "one hash join");
  const sameAt = n.word("corr-fix", "the same ten thousand rows");
  const windowAt = n.word("corr-fix", "A window function works too");
  const someAt = n.word("corr-duck", "Some optimizers");
  const duckAt = n.word("corr-duck", "DuckDB, the page's engine");
  const asHashAt = n.word("corr-duck", "as a hash join");
  const readAt = n.word("corr-duck", "read the plan before you rewrite");
  const end = n.beat("corr-duck").to;

  const planTop = y(TOP) + listingHeight(CORR.correlated.length, SIZE) + h(22);
  const fixOut = onceAt - 2;
  const total = CORR.loops * CORR.perLoop;
  const rewriteTop = y(TOP);
  const duckTop = rewriteTop + listingHeight(CORR.rewrite.length, 20) + h(150);
  const ops = CORR.duckOps;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={outerAt + 4} level={-35} />
      <Sfx name="el-scratch" at={tenAt + 2} level={-33} />
      <Sfx name="el-pop" at={hundredAt + 2} level={-32} />
      <Sfx name="el-pop" at={hashAt + 2} level={-32} />
      <Sfx name="el-tap" at={asHashAt + 2} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={7} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is a correlated subquery, and why can it be slow?
        </QuestionCard>

        {/* ── The page's correlated subquery, and its plan in Postgres ── */}
        <Note at={avgAt - 4} x={X0} y={y(TOP) - h(46)} out={fixOut}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>
            The page&rsquo;s query, on <Num>{thousands(CORR.employees)}</Num> employees in {CORR.departments} departments
          </span>
        </Note>
        <Listing
          lines={CORR.correlated}
          x={X0}
          top={y(TOP)}
          width={720}
          size={SIZE}
          at={outerAt - 6}
          out={fixOut}
          marks={[{ line: "WHERE e2.department", text: "e.department", at: outerAt + 6 }]}
        />
        <PlanBox
          lines={CORR.correlatedPlan}
          x={X0}
          top={planTop}
          width={960}
          size={PLAN}
          step={2}
          at={subAt - 6}
          out={fixOut}
          marks={[
            { line: "SubPlan", text: "SubPlan 1", at: subAt + 2 },
            { line: "Seq Scan on employees e2", text: "loops=10000", at: tenAt, color: MARK_RED },
            { line: "Seq Scan on employees e2", text: "actual rows=1000.00", at: scanAt + 6 },
            { line: "Rows Removed", at: scanAt + 12 },
          ]}
        />
        <Note at={perRowAt} x={R_X} y={y(TOP)} out={fixOut}>
          <div style={{ ...label(21, INK_SOFT) }}>rows read</div>
          <div style={{ ...note(30, INK), whiteSpace: "nowrap", marginTop: h(10) }}>
            <Num>{thousands(CORR.loops)}</Num> runs
            <span style={{ opacity: ease(frame, scanAt, 10) }}>
              {" "}
              × <Num>{thousands(CORR.perLoop)}</Num> rows each
            </span>
          </div>
          <div style={{ ...headline(76), color: ACCENT_INK, whiteSpace: "nowrap", marginTop: h(10), opacity: ease(frame, hundredAt, 12) }}>
            = <Num>{thousands(total)}</Num>
          </div>
        </Note>

        {/* ── The rewrite: aggregate once, then join ── */}
        <PlanBox
          lines={CORR.rewritePlan}
          x={X0}
          top={y(TOP)}
          width={1020}
          size={PLAN}
          step={2}
          at={hashAt - 6}
          marks={[
            { line: "Hash Join", text: "Hash Join", at: hashAt + 2, color: MARK_OK },
            { line: "Hash Join", text: "actual rows=10000.00", at: sameAt, color: MARK_OK },
            { line: "HashAggregate", text: "HashAggregate", at: hashAt + 10 },
          ]}
        />
        <Note at={onceAt} x={R_X} y={rewriteTop - h(46)}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>The page&rsquo;s rewrite</span>
        </Note>
        <Listing lines={CORR.rewrite} x={R_X} top={rewriteTop} width={640} size={20} at={onceAt} marks={[{ line: "WITH dept_avgs", at: cteAt + 4, color: MARK_OK }]} />
        <Note at={sameAt + 4} x={R_X} y={rewriteTop + listingHeight(CORR.rewrite.length, 20) + h(18)}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10, ...note(24, INK), whiteSpace: "nowrap" }}>
            the same rows: <Num>{CORR.differ}</Num> differ
            <Tick at={sameAt + 12} size={24} color={OK} />
          </span>
        </Note>
        <Note at={windowAt} x={R_X} y={rewriteTop + listingHeight(CORR.rewrite.length, 20) + h(62)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            or <QMono>AVG(salary) OVER (PARTITION BY department)</QMono>
          </span>
        </Note>

        {/* ── DuckDB decorrelates it on its own ── */}
        <Note at={someAt} x={R_X} y={duckTop}>
          <div style={{ ...note(24, INK), whiteSpace: "nowrap" }}>Some optimizers rewrite it themselves.</div>
          <div style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap", marginTop: h(14), opacity: ease(frame, duckAt, 10) }}>
            DuckDB {CORR.duckVersion}, the original query&rsquo;s plan:
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: h(12) }}>
            {ops.map((op, i) => (
              <React.Fragment key={op}>
                {i > 0 ? <span style={{ ...note(22, INK_SOFT), opacity: ease(frame, asHashAt - 4 + i * 4, 10) }}>over</span> : null}
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 21,
                    fontWeight: op === "HASH_JOIN" ? 700 : 500,
                    color: op === "HASH_JOIN" ? OK_INK : INK,
                    opacity: ease(frame, asHashAt - 4 + i * 4, 10),
                  }}
                >
                  {op}
                </span>
              </React.Fragment>
            ))}
          </div>
          <div style={{ ...note(24, INK), fontWeight: 650, whiteSpace: "nowrap", marginTop: h(18), opacity: ease(frame, readAt, 10) }}>
            Read the plan before you rewrite.
          </div>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
