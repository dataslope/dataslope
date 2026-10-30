import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, INK, INK_SOFT, TABULAR, headline, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { EXPLAIN, SLOW, thousands } from "./data";
import { Drift, Listing, listingHeight, MARK_OK, MARK_RED, OK_INK, PlanBox, RowGrid, X0 } from "./parts";

const TOP = 300;
const SIZE = 22;
const PLAN = 20;
const GRID_X = 1010;
const CELL = 12;
const PITCH = 15;
const RIGHT_X = 1350;

/** A count that runs up as the scan reads. */
const Counter: React.FC<{ from: number; to: number; value: number }> = ({ from, to, value }) => {
  const frame = useCurrentFrame();
  return <Num>{thousands(Math.round(ease(frame, from, to - from) * value))}</Num>;
};

/**
 * Questions 1 and 2. First, one customer's orders with no index: the
 * listing, then the plan Postgres printed, a Seq Scan whose filter removed
 * 999,980 rows. Beside it the table's thousand squares are swept as the
 * narration says it read every row, and the twenty kept rows' squares light
 * (they fall in one column: customer 42's order ids are 50,000 apart). The
 * usual fixes follow, the index first.
 *
 * Then reading a plan, on the join after 50,000 pending orders arrived
 * since the last ANALYZE: the indented steps light first, then the line they
 * feed; the estimate (rows=1) against the actual 50,000, in red; the nested
 * loop's 50,000 index lookups. ANALYZE, and the plan Postgres prints then:
 * a hash join on an estimate of 50,820.
 */
export const SlowScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("slow").from;
  const qAt = n.word("slow", "Question one");
  const textAt = n.word("slow", "A query is slow");
  const planAt = n.word("slow", "The plan");
  const explainAt = n.word("slow", "Put explain analyze");
  const reportsAt = n.word("slow", "reports what each step did");
  const seqAt = n.word("slow-scan", "a sequential scan");
  const everyAt = n.word("slow-scan", "It read every row");
  const keptAt = n.word("slow-scan", "kept twenty");
  const awayAt = n.word("slow-scan", "threw away");
  const indexAt = n.word("slow-wins", "That points at an index");
  const otherAt = n.word("slow-wins", "The other usual fixes");
  const earlyAt = n.word("slow-wins", "filtering early");
  const colsAt = n.word("slow-wins", "selecting only the columns");
  const pruneAt = n.word("slow-wins", "pruning partitions");

  const q2At = n.word("explain", "Question two");
  const q2TextAt = n.word("explain", "How do you read");
  const stepAt = n.word("explain", "Each line is a step");
  const indentAt = n.word("explain", "the indented steps run first");
  const feedAt = n.word("explain", "feeding the line above them");
  const compareAt = n.word("explain-rows", "compare estimated rows");
  const pendingAt = n.word("explain-rows", "Fifty thousand pending orders");
  const expectedAt = n.word("explain-rows", "Postgres expected one row");
  const loopAt = n.word("explain-rows", "it picked a nested loop");
  const lookupsAt = n.word("explain-rows", "fifty thousand index lookups");
  const analyzeAt = n.word("explain-fix", "Analyze refreshes the statistics");
  const closeAt = n.word("explain-fix", "estimate becomes fifty thousand");
  const hashAt = n.word("explain-fix", "becomes a hash join");
  const end = n.beat("index-in").to;

  // ── Question 1 ──
  const planTop = y(TOP) + listingHeight(SLOW.query.length, SIZE) + h(26);
  const hits = SLOW.ids.map((id) => Math.floor((id - 1) / 1000));
  const gridTop = y(TOP) + h(40);

  // ── Question 2 ──
  const q2ListTop = y(TOP);
  const q2PlanTop = q2ListTop + listingHeight(EXPLAIN.query.length, 21) + h(24);
  const staleOut = analyzeAt + 6;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={explainAt} level={-35} />
      <Sfx name="el-sprinkle" at={everyAt} level={-33} />
      <Sfx name="el-pop" at={keptAt + 2} level={-32} />
      <Sfx name="el-scratch" at={awayAt + 4} level={-33} />
      <Sfx name="el-whoosh" at={q2At} level={-36} />
      <Sfx name="el-scratch" at={expectedAt + 2} level={-33} />
      <Sfx name="el-pencil" at={analyzeAt + 2} level={-35} />
      <Sfx name="el-pop" at={hashAt + 2} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} out={q2At - 4} size={60}>
          A query is slow. What do you check first?
        </QuestionCard>
        <QuestionCard n={2} at={q2At} textAt={q2TextAt - 2} size={60}>
          How do you read an <QMono>EXPLAIN</QMono> plan?
        </QuestionCard>

        {/* ── 1. The plan of one customer's orders ── */}
        <Note at={planAt} x={X0} y={y(TOP) - h(46)} out={q2At - 4}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>Check the plan first</span>
        </Note>
        <Listing lines={SLOW.query} x={X0} top={y(TOP)} width={640} size={SIZE} at={explainAt - 2} out={q2At - 4} marks={[{ line: "EXPLAIN", at: explainAt + 8 }]} />
        <PlanBox
          lines={SLOW.plan}
          x={X0}
          top={planTop}
          width={800}
          size={PLAN}
          at={reportsAt}
          out={q2At - 4}
          marks={[
            { line: "Seq Scan", text: "Seq Scan", at: seqAt },
            { line: "Seq Scan", text: "actual rows=20.00", at: keptAt },
            { line: "Rows Removed", at: awayAt + 2, color: MARK_RED },
          ]}
        />

        {/* The table, swept as it is read; the twenty kept rows light. */}
        <div style={{ position: "absolute", left: GRID_X, top: gridTop - h(40), ...label(21, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, seqAt, 12) * (1 - ease(frame, q2At - 4, 10)) }}>
          orders, a thousand rows a square
        </div>
        <RowGrid x={GRID_X} top={gridTop} cell={CELL} gap={PITCH - CELL} at={seqAt - 4} sweep={{ from: everyAt, to: everyAt + 50 }} hits={hits} hitAt={keptAt} out={q2At - 4} />
        <div style={{ position: "absolute", left: GRID_X, top: gridTop + 20 * PITCH + h(20), display: "flex", gap: 44, opacity: 1 - ease(frame, q2At - 4, 10) }}>
          <div style={{ opacity: ease(frame, everyAt, 10) }}>
            <div style={{ ...label(21, INK_SOFT) }}>read</div>
            <div style={{ ...headline(48), color: BLUE_INK }}>
              <Counter from={everyAt} to={everyAt + 50} value={SLOW.orders} />
            </div>
          </div>
          <div style={{ opacity: ease(frame, keptAt, 10) }}>
            <div style={{ ...label(21, INK_SOFT) }}>kept</div>
            <div style={{ ...headline(48), color: INK }}>
              <Num>{SLOW.kept}</Num>
            </div>
          </div>
          <div style={{ opacity: ease(frame, awayAt, 10) }}>
            <div style={{ ...label(21, INK_SOFT) }}>thrown away</div>
            <div style={{ ...headline(48), color: ACCENT_INK }}>
              <Num>{thousands(SLOW.removed)}</Num>
            </div>
          </div>
        </div>

        {/* The usual fixes, the index first. */}
        <div style={{ position: "absolute", left: X0, top: planTop + h(186), opacity: 1 - ease(frame, q2At - 4, 10) }}>
          <div style={{ ...note(26, OK_INK), fontWeight: 650, whiteSpace: "nowrap", height: h(52), opacity: ease(frame, indexAt - 2, 12) }}>
            Fix: an index on <QMono>customer_id</QMono>
          </div>
          <div style={{ display: "flex", gap: 14, opacity: ease(frame, otherAt - 2, 12) }}>
            <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>Also:</span>
            <div>
              {[
                { at: earlyAt, text: "filter early" },
                { at: colsAt, text: "select only the columns you need" },
                { at: pruneAt, text: "prune partitions" },
              ].map((fix) => (
                <div key={fix.text} style={{ ...note(24, INK), whiteSpace: "nowrap", height: h(40), opacity: ease(frame, fix.at - 2, 12) }}>
                  {fix.text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── 2. Reading a plan ── */}
        <Note at={pendingAt - 2} x={X0} y={q2ListTop - h(46)}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>
            After <Num>{thousands(EXPLAIN.pending)}</Num> pending orders arrived, before <QMono>ANALYZE</QMono>
          </span>
        </Note>
        <Listing lines={EXPLAIN.query} x={X0} top={q2ListTop} width={680} size={21} at={q2At + 4} />
        <PlanBox
          lines={EXPLAIN.stale}
          x={X0}
          top={q2PlanTop}
          width={1200}
          size={PLAN}
          at={stepAt - 4}
          step={2}
          out={staleOut}
          marks={[
            { line: "Seq Scan on orders o", text: "Seq Scan", at: indentAt + 2, out: compareAt },
            { line: "Index Scan using", text: "Index Scan", at: indentAt + 8, out: compareAt },
            { line: "Nested Loop", text: "Nested Loop", at: feedAt + 2, out: compareAt },
            { line: "Seq Scan on orders o", text: "rows=1)", at: expectedAt, color: MARK_RED },
            { line: "Seq Scan on orders o", text: "actual rows=50000.00", at: expectedAt + 10 },
            { line: "Nested Loop", text: "Nested Loop", at: loopAt, color: MARK_RED },
            { line: "Index Scan using", text: "loops=50000", at: lookupsAt, color: MARK_RED },
          ]}
        />
        <PlanBox
          lines={EXPLAIN.fresh}
          x={X0}
          top={q2PlanTop}
          width={1200}
          size={PLAN}
          at={analyzeAt + 8}
          step={2}
          marks={[
            { line: "Seq Scan on orders o", text: `rows=${EXPLAIN.freshEstimate})`, at: closeAt, color: MARK_OK },
            { line: "Hash Join", text: "Hash Join", at: hashAt, color: MARK_OK },
          ]}
        />

        {/* How to read it, on the right. */}
        <Note at={indentAt} x={RIGHT_X} y={q2ListTop + h(4)} out={compareAt}>
          <div style={{ ...note(24, INK), width: 460 }}>
            Indented steps run first and feed the line above them.
          </div>
        </Note>
        <Note at={compareAt} x={RIGHT_X} y={q2ListTop + h(4)} out={analyzeAt}>
          <div style={{ ...label(21, INK_SOFT) }}>orders it expected</div>
          <div style={{ ...headline(64), color: ACCENT_INK, ...TABULAR }}>{EXPLAIN.staleEstimate}</div>
          <div style={{ ...label(21, INK_SOFT), marginTop: h(14), opacity: ease(frame, expectedAt + 10, 10) }}>orders it got</div>
          <div style={{ ...headline(64), color: BLUE_INK, opacity: ease(frame, expectedAt + 10, 10) }}>
            <Num>{thousands(EXPLAIN.staleActual)}</Num>
          </div>
        </Note>
        <Note at={lookupsAt + 2} x={RIGHT_X} y={q2PlanTop + h(170)} out={analyzeAt}>
          <div style={{ ...note(24, ACCENT_INK), width: 440 }}>
            so a nested loop: <Num>{thousands(EXPLAIN.lookups)}</Num> index lookups
          </div>
        </Note>
        <Note at={analyzeAt} x={RIGHT_X} y={q2ListTop + h(4)}>
          <Listing lines={["ANALYZE orders;"]} x={0} top={0} width={300} size={22} at={analyzeAt} />
          <div style={{ position: "absolute", top: listingHeight(1, 22) + h(24), ...label(21, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, closeAt, 10) }}>
            new estimate
          </div>
          <div style={{ position: "absolute", top: listingHeight(1, 22) + h(54), ...headline(64), color: OK_INK, whiteSpace: "nowrap", opacity: ease(frame, closeAt, 10) }}>
            <Num>{thousands(EXPLAIN.freshEstimate)}</Num>
          </div>
          <div style={{ position: "absolute", top: listingHeight(1, 22) + h(140), ...note(24, OK_INK), whiteSpace: "nowrap", opacity: ease(frame, hashAt, 10) }}>
            so a hash join
          </div>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
