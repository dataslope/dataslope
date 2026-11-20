import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease, map } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, INK, INK_SOFT } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { LISTING, MATERIALIZE } from "./data";
import {
  Arrow,
  BOX_H,
  Code,
  CodeLine,
  Cross,
  Drift,
  Graph,
  type GNode,
  Line,
  lineOf,
  Listing,
  listingCharX,
  listingHeight,
  listingLineMid,
  listingWidth,
  Mark,
  MARK_GREEN,
  OK_INK,
  PlanBox,
  planHeight,
  VRule,
  X0,
} from "./parts";

const PLAN_SIZE = 19;
const CODE_SIZE = 20;
const PLAN_X = 590;
const COUNT_X = 1240;

/** A materialization's name, on a line of its own. */
const Name: React.FC<{ at: number; x: number; y: number; color?: string; children: React.ReactNode }> = ({ at, x, y, color = INK, children }) => (
  <Line at={at} x={x} y={y} size={30} color={color} weight={600}>
    {children}
  </Line>
);

/**
 * Questions 5 and 6. Question 5: the page's dim_customer, one row per
 * customer from 24 events, as each materialization. A view stores the
 * query: its plan as Postgres printed it regroups all 24 events on every
 * read, and a 25th, for a 13th customer, shows at once (12 to 13). A table
 * stores the result: one Seq Scan over 12 stored rows, which misses the new
 * customer (12, yellow) until the next run rebuilds it (13). Incremental and
 * ephemeral take a line each; then the warehousing page's rule, and the
 * concept check's case, which is a table. Question 6: the page's ephemeral
 * model, its config line marked; its SELECT moves into a CTE at the top of a
 * model that refs it, and nothing is created in the warehouse. Two models
 * that ref it each carry a copy; a third and a fourth copy it again, in red;
 * and it can be neither queried nor tested on its own.
 */
export const MatScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("mat").from;
  const q5At = n.word("mat", "Question five");
  const text5At = n.word("mat", "Compare the materializations");
  const dimAt = n.word("mat-view", "Take the page's customer dimension");
  const perAt = n.word("mat-view", "one row per customer");
  const twentyFourAt = n.word("mat-view", "grouped from twenty-four events");
  const viewAt = n.word("mat-view", "As a view");
  const queryAt = n.word("mat-view", "only the query is stored");
  const regroupAt = n.word("mat-view", "every read regroups all twenty-four");
  const cheapAt = n.word("mat-view", "cheap to build");
  const slowerAt = n.word("mat-view", "slower to read");
  const currentAt = n.word("mat-view", "always current");
  const newAt = n.word("mat-view", "a new customer's event shows up at once");
  const onceAt = n.word("mat-view", "shows up at once");
  const tableAt = n.word("mat-table", "As a table");
  const perRunAt = n.word("mat-table", "computed once per run");
  const twelveAt = n.word("mat-table", "A read is twelve stored rows");
  const fastAt = n.word("mat-table", "which is fast");
  const missesAt = n.word("mat-table", "the table misses that new customer");
  const nextRunAt = n.word("mat-table", "until the next run");
  const everythingAt = n.word("mat-table", "every run recomputes everything");
  const incrAt = n.word("mat-incr", "Incremental keeps the table");
  const onlyAt = n.word("mat-incr", "only new or changed rows");
  const appendAt = n.word("mat-incr", "for large tables that mostly append");
  const ephAt = n.word("mat-eph", "ephemeral isn't stored at all");
  const chooseAt = n.word("mat-pick", "Choose by read frequency");
  const costAt = n.word("mat-pick", "compute cost");
  const volumeAt = n.word("mat-pick", "data volume");
  const habitAt = n.word("mat-pick", "not habit");
  const expensiveAt = n.word("mat-pick", "An expensive model");
  const allDayAt = n.word("mat-pick", "read all day");
  const nightlyAt = n.word("mat-pick", "changes nightly");
  const shouldAt = n.word("mat-pick", "should be a table");
  const q6At = n.word("eph", "Question six");
  const text6At = n.word("eph", "What is an ephemeral model");
  const cteAt = n.word("eph", "dbt compiles it as a CTE");
  const commonAt = n.word("eph", "a common table expression");
  const insideAt = n.word("eph", "inside every model that refs it");
  const nothingAt = n.word("eph", "Nothing is created in the warehouse");
  const useAt = n.word("eph-when", "Use one for intermediate logic");
  const twiceAt = n.word("eph-when", "referenced once or twice");
  const manyAt = n.word("eph-when", "Referenced by many models");
  const copiedAt = n.word("eph-when", "copied into each");
  const queryItAt = n.word("eph-when", "you can't query it");
  const testItAt = n.word("eph-when", "or test it on its own");
  const end = n.beat("eph-when").to;

  const q5Out = q6At - 8;
  const q5 = 1 - ease(frame, q5Out, 10);

  // ── Question 5 ──
  const headY = y(290);
  const viewY = y(352);
  const viewPlanTop = viewY + h(38);
  const viewPlan = frame >= onceAt + 6 ? MATERIALIZE.viewPlanAfter : MATERIALIZE.viewPlan;
  const tableY = viewPlanTop + planHeight(viewPlan.length, PLAN_SIZE) + h(34);
  const tablePlanTop = tableY + h(38);
  const restY = tablePlanTop + planHeight(MATERIALIZE.tablePlan.length, PLAN_SIZE) + h(32);
  const pickY = restY + h(98);
  const LINE = h(32);
  const rebuilt = frame >= nextRunAt + 16;

  // ── Question 6 ──
  const eph = LISTING.ephemeral;
  const ephTop = y(300);
  const ephW = listingWidth(eph, CODE_SIZE);
  const selectFrom = lineOf(eph, "SELECT");
  const moved = eph.slice(selectFrom).map((l) => l.replace("{{ source('raw', 'orders') }}", "raw.orders"));
  const inlined = ["WITH int_orders_cleaned AS (", ...moved.map((l) => `    ${l}`), ")", "SELECT * FROM int_orders_cleaned"];
  const R_X = 860;
  const inTop = ephTop + h(36);
  const fly = ease(frame, insideAt + 2, 22);
  const landAt = insideAt + 24;
  const inOut = useAt - 2;
  const whY = inTop + listingHeight(inlined.length, CODE_SIZE) + h(64);

  // Question 6, when: the models that ref it, each with a copy.
  const modelsTop = y(318);
  const MODEL_PITCH = h(84);
  const copies = [
    { at: twiceAt, bad: false },
    { at: twiceAt + 8, bad: false },
    { at: manyAt + 4, bad: true },
    { at: manyAt + 12, bad: true },
  ];
  const ephMid = ephTop + listingHeight(eph.length, CODE_SIZE) / 2;
  const copyLine = ["WITH int_orders_cleaned AS ( … )"];
  const copyW = listingWidth(copyLine, CODE_SIZE);
  const cantY = ephTop + listingHeight(eph.length, CODE_SIZE) + h(52);

  const modelNodes: GNode[] = copies.map((c, i) => ({
    id: `model-${i + 1}`,
    title: `Model ${i + 1}`,
    sans: true,
    slot: { x: R_X + 40, cy: modelsTop + i * MODEL_PITCH + BOX_H / 2, w: 150 },
    at: c.at,
  }));

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={dimAt + 2} level={-32} />
      <Sfx name="el-pencil" at={viewAt + 4} level={-35} />
      <Sfx name="el-tap" at={newAt} level={-31} />
      <Sfx name="el-chime" at={onceAt + 8} level={-34} />
      <Sfx name="el-pencil" at={tableAt + 4} level={-35} />
      <Sfx name="el-tap" at={missesAt + 4} level={-32} />
      <Sfx name="el-tap" at={nextRunAt + 16} level={-31} />
      <Sfx name="el-tap" at={incrAt} level={-33} />
      <Sfx name="el-tap" at={ephAt} level={-33} />
      <Sfx name="el-chime" at={shouldAt + 4} level={-33} />
      <Sfx name="el-pencil" at={cteAt} level={-35} />
      <Sfx name="el-whoosh" at={insideAt + 2} level={-35} />
      <Sfx name="el-tap" at={nothingAt + 2} level={-32} />
      {copies.map((c, i) => (
        <Sfx key={i} name="el-tap" at={c.at} level={-33} />
      ))}
      <Sfx name="el-scratch" at={copiedAt} level={-34} />
      <Sfx name="el-tap" at={queryItAt + 4} level={-32} />
      <Sfx name="el-tap" at={testItAt + 4} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={5} at={q5At - 4} textAt={text5At - 4} out={q6At - 8} size={56}>
          Compare the materializations: view, table, incremental, ephemeral.
        </QuestionCard>
        <QuestionCard n={6} at={q6At} textAt={text6At - 2} size={56}>
          What is an ephemeral model, and when should you use it?
        </QuestionCard>

        {frame < q5Out + 12 ? (
          <div style={{ position: "absolute", inset: 0, opacity: q5 }}>
            {/* The model, and the event that arrives. */}
            <Line at={dimAt} x={X0} y={headY}>
              <Code>dim_customer</Code>
              <span style={{ opacity: ease(frame, perAt, 10) }}>: one row per customer</span>
              <span style={{ opacity: ease(frame, twentyFourAt, 10) }}>
                , from <b style={{ color: BLUE_INK }}><Num>{MATERIALIZE.events}</Num></b> events
              </span>
            </Line>
            <Line at={newAt} x={COUNT_X} y={headY}>
              <Mark at={newAt + 4}>
                New event: customer <Num>{MATERIALIZE.viewAfter}</Num>
              </Mark>
            </Line>

            {/* View. */}
            <Name at={viewAt} x={X0} y={viewY}>
              View
            </Name>
            <Line at={queryAt} x={X0} y={viewY + h(48)}>
              Stores only the query
            </Line>
            <Line at={cheapAt} x={X0} y={viewY + h(48) + LINE} color={INK_SOFT}>
              Cheap to build<span style={{ opacity: ease(frame, slowerAt, 10) }}>, slower to read</span>
            </Line>
            <Line at={currentAt} x={X0} y={viewY + h(48) + 2 * LINE} color={OK_INK} weight={600}>
              Always current
            </Line>
            <Line at={regroupAt - 6} x={PLAN_X} y={viewY + 4} size={22} color={INK_SOFT}>
              Every read
            </Line>
            <PlanBox
              lines={viewPlan}
              x={PLAN_X}
              top={viewPlanTop}
              width={590}
              size={PLAN_SIZE}
              at={regroupAt - 4}
              hot={
                frame >= onceAt + 6
                  ? [
                      { text: `rows=${MATERIALIZE.viewAfter}`, color: OK_INK },
                      { text: `rows=${MATERIALIZE.events + 1}`, color: BLUE_INK },
                    ]
                  : [
                      { text: `rows=${MATERIALIZE.customers}`, color: BLUE_INK },
                      { text: `rows=${MATERIALIZE.events}`, color: BLUE_INK },
                    ]
              }
              marks={frame >= onceAt + 6 ? [] : [{ line: "Seq Scan", text: `rows=${MATERIALIZE.events}`, at: regroupAt + 8, out: cheapAt }]}
            />
            <Line at={viewAt + 6} x={COUNT_X} y={viewY + 4} size={22} color={INK_SOFT}>
              Customers it returns
            </Line>
            <Line at={viewAt + 10} x={COUNT_X} y={viewY + h(44)} size={30}>
              <Num>{MATERIALIZE.customers}</Num>
              <span style={{ opacity: ease(frame, onceAt + 6, 10) }}>
                {" "}→ <b style={{ color: OK_INK }}><Num>{MATERIALIZE.viewAfter}</Num></b>
              </span>
            </Line>
            <Line at={onceAt + 12} x={COUNT_X} y={viewY + h(44) + h(46)} color={INK_SOFT}>
              At once
            </Line>

            {/* Table. */}
            <Name at={tableAt} x={X0} y={tableY}>
              Table
            </Name>
            <Line at={perRunAt} x={X0} y={tableY + h(48)}>
              Computed once per run
            </Line>
            <Line at={fastAt} x={X0} y={tableY + h(48) + LINE} color={INK_SOFT}>
              Fast reads<span style={{ opacity: ease(frame, everythingAt, 10) }}>, recomputed every run</span>
            </Line>
            <Line at={twelveAt - 6} x={PLAN_X} y={tableY + 4} size={22} color={INK_SOFT}>
              Every read
            </Line>
            {/* The table's read, and the same read once the next run has
                rebuilt it: its plan moves with its count. */}
            <PlanBox
              lines={rebuilt ? MATERIALIZE.tablePlanRebuilt : MATERIALIZE.tablePlan}
              x={PLAN_X}
              top={tablePlanTop}
              width={590}
              size={PLAN_SIZE}
              at={twelveAt - 4}
              hot={rebuilt ? [{ text: `rows=${MATERIALIZE.tableRebuilt}`, color: OK_INK }] : [{ text: `rows=${MATERIALIZE.customers}`, color: BLUE_INK }]}
              marks={[{ line: "Seq Scan", text: `rows=${MATERIALIZE.customers}`, at: twelveAt + 8, out: missesAt }]}
            />
            <Line at={tableAt + 6} x={COUNT_X} y={tableY + 4} size={22} color={INK_SOFT}>
              Customers it returns
            </Line>
            <Line at={missesAt + 4} x={COUNT_X} y={tableY + h(44)} size={30}>
              <Mark at={missesAt + 8}>
                <Num>{MATERIALIZE.tableAfter}</Num>
              </Mark>
              <span style={{ opacity: ease(frame, nextRunAt + 16, 10) }}>
                {" "}→ <b style={{ color: OK_INK }}><Num>{MATERIALIZE.tableRebuilt}</Num></b>
              </span>
            </Line>
            <Line at={nextRunAt} x={COUNT_X} y={tableY + h(44) + h(46)} color={INK_SOFT}>
              {rebuilt ? "After the next run" : "Until the next run"}
            </Line>

            {/* Incremental and ephemeral, a line each. */}
            <Line at={incrAt} x={X0} y={restY} size={24}>
              <b>Incremental</b>: keeps the table<span style={{ opacity: ease(frame, onlyAt, 10) }}>, processes only new or changed rows</span>
            </Line>
            <Line at={appendAt} x={X0} y={restY + h(36)} color={INK_SOFT}>
              For large tables that mostly append
            </Line>
            <VRule x={1180} top={restY} bottom={restY + h(64)} at={ephAt} />
            <Line at={ephAt} x={COUNT_X} y={restY} size={24}>
              <b>Ephemeral</b>: not stored at all
            </Line>

            {/* The rule, and the concept check's case. */}
            <Line at={chooseAt} x={X0} y={pickY} size={24}>
              Choose by <Mark at={chooseAt + 6}>read frequency,</Mark> <Mark at={costAt}>compute cost</Mark> and{" "}
              <Mark at={volumeAt}>data volume,</Mark>
              <span style={{ opacity: ease(frame, habitAt, 10) }}> not habit</span>
            </Line>
            <Line at={expensiveAt} x={X0} y={pickY + h(44)} size={24}>
              Expensive<span style={{ opacity: ease(frame, allDayAt, 10) }}>, read all day</span>
              <span style={{ opacity: ease(frame, nightlyAt, 10) }}>, source changes nightly</span>
              <span style={{ opacity: ease(frame, shouldAt, 10) }}>
                {" "}→ <Mark at={shouldAt + 4} color={MARK_GREEN}><b style={{ color: OK_INK }}>a table</b></Mark>
              </span>
            </Line>
          </div>
        ) : null}

        {/* ── Question 6 ── */}
        <Listing
          lines={eph}
          x={X0}
          top={ephTop}
          width={ephW}
          size={CODE_SIZE}
          at={text6At + 8}
          marks={[{ line: "config(", text: "materialized='ephemeral'", at: cteAt + 2 }]}
        />
        <Line at={commonAt} x={R_X} y={ephTop - h(4)} size={22} color={INK_SOFT} out={inOut}>
          Inside a model that refs it
        </Line>
        <Listing
          lines={inlined}
          x={R_X}
          top={inTop}
          width={listingWidth(inlined, CODE_SIZE)}
          size={CODE_SIZE}
          at={insideAt - 4}
          lineAt={inlined.map((l, i) => (i === 0 ? insideAt : i <= moved.length ? landAt : i === moved.length + 1 ? insideAt + 4 : insideAt + 8))}
          marks={[{ line: "WITH int_orders_cleaned", text: "WITH int_orders_cleaned AS (", at: landAt + 4, out: nothingAt + 30 }]}
          out={inOut}
        />
        {/* The SELECT, on its way into the CTE. */}
        {fly > 0 && fly < 1
          ? moved.map((l, i) => {
              const sx = listingCharX(X0, 0, CODE_SIZE);
              const sy = listingLineMid(ephTop, selectFrom + i, CODE_SIZE);
              const tx = listingCharX(R_X, 4, CODE_SIZE);
              const ty = listingLineMid(inTop, 1 + i, CODE_SIZE);
              return (
                <div key={i} style={{ position: "absolute", left: map(fly, [0, 1], [sx, tx]), top: map(fly, [0, 1], [sy, ty]) - 18, height: 36, display: "flex", alignItems: "center", opacity: 0.9 }}>
                  <CodeLine line={l} size={CODE_SIZE} />
                </div>
              );
            })
          : null}
        <Line at={nothingAt} x={R_X} y={whY} size={22} color={INK_SOFT} out={inOut}>
          In the warehouse
        </Line>
        <Graph
          nodes={[{ id: "int_orders_cleaned", slot: { x: R_X, cy: whY + h(40) + BOX_H / 2, w: 268 }, at: nothingAt + 4, base: "off", dashed: true, out: inOut }]}
          edges={[]}
        />
        <Line at={nothingAt + 10} x={R_X + 296} y={whY + h(40) + BOX_H / 2 - 15} color={INK_SOFT} out={inOut}>
          Not created
        </Line>

        {/* When: once or twice, not by many. */}
        <Graph nodes={modelNodes} edges={[]} />
        {copies.map((c, i) => {
          const cy = modelsTop + i * MODEL_PITCH + BOX_H / 2;
          return (
            <React.Fragment key={i}>
              <Arrow points={c.bad ? [[R_X - 20, ephMid + 8], [R_X - 20, cy], [R_X + 34, cy]] : [[X0 + ephW + 10, ephMid], [R_X - 20, ephMid], [R_X - 20, cy], [R_X + 34, cy]]} at={c.at - 4} dur={12} color={c.bad ? ACCENT : INK} />
              <Listing
                lines={copyLine}
                x={R_X + 230}
                top={cy - listingHeight(1, CODE_SIZE) / 2}
                width={copyW}
                size={CODE_SIZE}
                at={c.at + 4}
                rule={c.bad ? ACCENT : INK}
                ink={c.bad ? { 0: ACCENT_INK } : {}}
              />
            </React.Fragment>
          );
        })}
        <Line at={useAt} x={R_X + 40} y={modelsTop - h(52)} size={22} color={INK_SOFT}>
          Models that ref it, each with its own copy
        </Line>
        <Line at={copiedAt} x={R_X + 230} y={modelsTop + 4 * MODEL_PITCH - h(4)} color={ACCENT_INK} weight={600}>
          The same CTE, copied into each
        </Line>
        {[
          { t: "Can't query it", at: queryItAt },
          { t: "Can't test it on its own", at: testItAt },
        ].map((c, i) => (
          <React.Fragment key={c.t}>
            <div style={{ position: "absolute", left: X0, top: cantY + i * h(44) + 4, opacity: ease(frame, c.at + 2, 8) }}>
              <Cross at={c.at + 4} size={24} />
            </div>
            <Line at={c.at + 2} x={X0 + 40} y={cantY + i * h(44)} size={24}>
              {c.t}
            </Line>
          </React.Fragment>
        ))}
      </Drift>
    </AbsoluteFill>
  );
};
