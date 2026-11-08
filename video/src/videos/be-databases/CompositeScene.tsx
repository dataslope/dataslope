import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK, OK_INK, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, HAIRLINE, INK, INK_SOFT, PAPER, label, note, svgText } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { inkOf } from "../../theme/brand";
import { COMPOSITE, thousands } from "./data";
import { Drift, Listing, MARK_GREEN, MARK_RED, PlanBox, SmallMono, Spot, Svg, X0 } from "./parts";

const TOP = 306;
const BOOK_ROW = 44;
const STRIP_X = X0;
const STRIP_W = 1680;
const STRIP_Y = 604;
const STRIP_H = 56;
const NOTE_X = 1440;

/** The phone book, sorted by last name, then first. */
const BOOK: [string, string][] = [
  ["Baker", "Ada"],
  ["Baker", "Tom"],
  ["Hill", "Ada"],
  ["Hill", "Jo"],
  ["Lovelace", "Ada"],
  ["Lovelace", "Ben"],
  ["Lovelace", "Kit"],
  ["Moss", "Ada"],
  ["Moss", "Eli"],
];

/** The plan lines a figure shows: the lines holding what it is about, and
 *  the first "Buffers:" line (the pages the whole plan touched). */
const pick = (plan: readonly string[], keep: readonly string[]) => {
  const buffers = plan.findIndex((l) => l.trim().startsWith("Buffers:"));
  return plan.filter((l, i) => i === buffers || keep.some((k) => l.includes(k)));
};

/**
 * Question 4. A composite index sorts by its first column, then its second
 * within each value of the first, like a phone book: the book as a list,
 * last name then first, its left prefix served (every Lovelace, Ada
 * Lovelace) and every Ada scattered. Then the orders index, drawn as a strip
 * of entries in index order under the statements and plans Postgres ran:
 * on (customer_id, created_at), customer 42's twenty entries are one run and
 * its newest ten are read backwards, 13 pages and no Sort; one day across
 * customers is scattered through every run, so the plan reads the table;
 * swapped to (created_at, customer_id), the same ten are scattered through
 * time and the backward walk reads 1,837 pages; then the rule; then
 * (status, created_at), four runs of statuses and the five index searches
 * Postgres 18's skip scan made, with no heap fetches.
 */
export const CompositeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("composite").from;
  const qAt = n.word("composite", "Question four");
  const textAt = n.word("composite", "What is a composite index");
  const sortsAt = n.word("composite", "It sorts by its first column");
  const secondAt = n.word("composite", "then by the second");
  const bookAt = n.word("composite", "like a phone book");
  const lastAt = n.word("composite", "last name");
  const firstAt = n.word("composite", "then first name");
  const everyLoveAt = n.word("composite-prefix", "every Lovelace");
  const adaLoveAt = n.word("composite-prefix", "Ada Lovelace");
  const everyAdaAt = n.word("composite-prefix", "not every Ada");
  const runAt = n.word("composite-run", "An index on customer");
  const fortyTwoAt = n.word("composite-run", "customer forty-two's ten latest orders");
  const thirteenAt = n.word("composite-run", "thirteen pages");
  const newestAt = n.word("composite-run", "already newest first");
  const noSortAt = n.word("composite-run", "with no sort");
  const dayAt = n.word("composite-day", "one day across all customers");
  const tableAt = n.word("composite-day", "reads the table instead");
  const swapAt = n.word("composite-swap", "Swap the two columns");
  const sameAt = n.word("composite-swap", "the same ten orders");
  const eighteenAt = n.word("composite-swap", "over eighteen hundred pages");
  const ruleAt = n.word("composite-rule", "order the columns by your queries");
  const equalityAt = n.word("composite-rule", "equality first");
  const rangeAt = n.word("composite-rule", "then the range or the sort");
  const skipAt = n.word("composite-skip", "added a skip scan");
  const withoutAt = n.word("composite-skip", "without its first column");
  const fewAt = n.word("composite-skip", "few values");
  const statusAt = n.word("composite-skip", "On status, then order time");
  const fiveAt = n.word("composite-skip", "five index searches");
  const neverAt = n.word("composite-skip", "never touched the table");
  const end = n.beat("composite-skip").to;

  // ── Phase A: the phone book ──
  const bookOut = runAt - 8;
  const bookTop = y(TOP) + h(14);
  const rowTop = (i: number) => bookTop + 46 + i * h(BOOK_ROW);
  const rowMid = (i: number) => rowTop(i) + h(BOOK_ROW) / 2;
  const lastX = X0;
  const firstX = X0 + 230;
  const bookW = 420;
  const loves = BOOK.map(([l], i) => (l === "Lovelace" ? i : -1)).filter((i) => i >= 0);
  const adas = BOOK.map(([, f], i) => (f === "Ada" ? i : -1)).filter((i) => i >= 0);
  const adaLove = BOOK.findIndex(([l, f]) => l === "Lovelace" && f === "Ada");

  // ── Phase B: the orders index as a strip ──
  const listTop = y(TOP);
  const stripY = y(STRIP_Y);
  const stripH = h(STRIP_H);
  const planTop = stripY + stripH + h(70);
  // Index order (customer_id, created_at): nine customers' runs, 42 in the
  // middle, twenty entries each.
  const GROUPS = [38, 39, 40, 41, 42, 43, 44, 45, 46];
  const groupW = STRIP_W / GROUPS.length;
  const tick = (g: number, k: number) => STRIP_X + g * groupW + 14 + (k * (groupW - 28)) / 19;
  const g42 = GROUPS.indexOf(42);
  // Customer 42's orders by id, which is their order in time.
  const own = Array.from({ length: 20 }, (_, k) => Number(COMPOSITE.latest.rows[9][0]) - 50000 * (10 - k));
  const timeX = (id: number) => STRIP_X + (id / 1_000_000) * STRIP_W;
  const latestFrom = Number(COMPOSITE.latest.rows[9][0]);
  // Every second customer happens to have an order on the last day (drawn).
  const dayGroups = [0, 2, 3, 5, 7, 8];

  const modeRun = ease(frame, runAt - 2, 12) * (1 - ease(frame, swapAt - 2, 10));
  const modeTime = ease(frame, swapAt, 12) * (1 - ease(frame, skipAt - 2, 10));
  const modeStatus = ease(frame, skipAt + 2, 12);
  const STATUSES = ["paid", "pending", "returned", "shipped"];
  const runW = STRIP_W / STATUSES.length;

  const latestShown = pick(COMPOSITE.latestPlan, ["Limit", "Index Scan Backward"]);
  const reverseShown = pick(COMPOSITE.reversePlan, ["Limit", "Index Scan Backward"]);
  const dayShown = pick(COMPOSITE.dayPlan, ["Aggregate", "Seq Scan", "Rows Removed"]);
  const skipShown = pick(COMPOSITE.skipPlan, ["Aggregate", "Index Only Scan", "Heap Fetches", "Index Searches"]);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={sortsAt + 2} level={-35} />
      <Sfx name="el-pop" at={bookAt} level={-30} />
      <Sfx name="el-tap" at={everyLoveAt + 2} level={-33} />
      <Sfx name="el-tap" at={adaLoveAt + 2} level={-33} />
      <Sfx name="el-scratch" at={everyAdaAt + 4} level={-33} />
      <Sfx name="el-whoosh" at={runAt - 2} level={-36} />
      <Sfx name="el-sprinkle" at={fortyTwoAt + 4} level={-34} />
      <Sfx name="el-pop" at={thirteenAt} level={-32} />
      <Sfx name="el-scratch" at={tableAt + 2} level={-33} />
      <Sfx name="el-whoosh" at={swapAt} level={-35} />
      <Sfx name="el-pop" at={eighteenAt} level={-32} />
      <Sfx name="el-chime" at={equalityAt} level={-33} />
      <Sfx name="el-whoosh" at={skipAt + 2} level={-36} />
      <Sfx name="el-tap" at={fiveAt} level={-33} />
      <Sfx name="el-pop" at={neverAt + 2} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} size={58}>
          What is a composite index and why does column order matter?
        </QuestionCard>

        {/* ── Phase A: the phone book ── */}
        <div style={{ opacity: 1 - ease(frame, bookOut, 10) }}>
          <Svg>
            <g opacity={ease(frame, sortsAt, 12)}>
              <line x1={lastX} x2={lastX + bookW} y1={bookTop} y2={bookTop} stroke={INK} strokeWidth={2} />
              <text x={lastX + 16} y={bookTop + 30} style={svgText(label(21, ease(frame, lastAt, 8) > 0.5 ? INK : INK_SOFT))}>
                last name
              </text>
              <text x={firstX + 16} y={bookTop + 30} style={svgText(label(21, ease(frame, firstAt, 8) > 0.5 ? INK : INK_SOFT))}>
                first name
              </text>
              <line x1={lastX} x2={lastX + bookW} y1={bookTop + 44} y2={bookTop + 44} stroke={HAIRLINE} strokeWidth={1} />
            </g>
            {BOOK.map(([last, first], i) => {
              const p = ease(frame, sortsAt + 4 + i * 2, 10);
              if (p <= 0) return null;
              const love = loves.includes(i) ? ease(frame, everyLoveAt + 2, 10) * (1 - ease(frame, adaLoveAt, 8)) : 0;
              const single = i === adaLove ? ease(frame, adaLoveAt + 2, 10) * (1 - ease(frame, everyAdaAt, 8)) : 0;
              const ada = adas.includes(i) ? ease(frame, everyAdaAt + 4 + adas.indexOf(i) * 3, 8) : 0;
              const band = love > 0 || single > 0 ? `color-mix(in srgb, ${OK} ${24 * Math.max(love, single)}%, transparent)` : ada > 0 ? `color-mix(in srgb, ${ACCENT} ${26 * ada}%, transparent)` : "none";
              // The first column's runs: a bar beside each group.
              const groupStart = i === 0 || BOOK[i - 1][0] !== last;
              const groupLen = BOOK.filter(([l]) => l === last).length;
              return (
                <g key={i} opacity={p}>
                  <rect x={lastX + 4} y={rowTop(i) + 3} width={bookW - 8} height={h(BOOK_ROW) - 6} rx={3} fill={band} />
                  {i > 0 ? <line x1={lastX} x2={lastX + bookW} y1={rowTop(i)} y2={rowTop(i)} stroke={`color-mix(in srgb, ${INK} 14%, transparent)`} /> : null}
                  <text x={lastX + 16} y={rowMid(i) + 8} style={svgText({ ...note(23, groupStart ? INK : INK_SOFT), fontWeight: groupStart ? 650 : 500 })}>
                    {last}
                  </text>
                  <text x={firstX + 16} y={rowMid(i) + 8} style={svgText(note(23, INK))}>
                    {first}
                  </text>
                  {groupStart ? (
                    <line
                      x1={lastX + bookW + 16}
                      x2={lastX + bookW + 16}
                      y1={rowTop(i) + 8}
                      y2={rowTop(i) + groupLen * h(BOOK_ROW) - 8}
                      stroke={BAR}
                      strokeWidth={3}
                      strokeLinecap="round"
                      opacity={ease(frame, secondAt + 4, 10)}
                    />
                  ) : null}
                </g>
              );
            })}
            <line x1={lastX} x2={lastX + bookW} y1={rowTop(BOOK.length)} y2={rowTop(BOOK.length)} stroke={INK} strokeWidth={1.5} opacity={ease(frame, sortsAt + 20, 10)} />
          </Svg>
          <Note at={secondAt + 6} x={lastX + bookW + 40} y={rowTop(0) - h(2)}>
            <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>sorted by last name; within each, by first</span>
          </Note>
          <Note at={everyLoveAt + 2} x={720} y={rowMid(loves[0]) - h(64)}>
            <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
              <b style={{ color: OK_INK }}>every Lovelace:</b> one run
            </span>
          </Note>
          <Note at={adaLoveAt + 2} x={720} y={rowMid(adaLove) - h(14)}>
            <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
              <b style={{ color: OK_INK }}>Ada Lovelace:</b> one row in that run
            </span>
          </Note>
          <Note at={everyAdaAt + 4} x={720} y={rowMid(loves[2]) + h(44)}>
            <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
              <b style={{ color: ACCENT_INK }}>every Ada:</b> scattered through the book
            </span>
          </Note>
        </div>
        <Spot art="phoneBook" at={bookAt} out={runAt - 24} left={1540} top={y(480)} width={200} />

        {/* ── Phase B: the statements, top left and top right ── */}
        <Listing lines={COMPOSITE.create} x={X0} top={listTop} width={720} size={20} at={runAt} out={swapAt - 4} marks={[{ line: "ON orders", text: "(customer_id, created_at)", at: runAt + 10 }]} />
        <Listing lines={COMPOSITE.query} x={960} top={listTop} width={720} size={20} at={fortyTwoAt - 4} out={dayAt - 4} marks={[{ line: "WHERE", at: fortyTwoAt + 6 }, { line: "ORDER BY", at: newestAt }]} />
        <Listing lines={COMPOSITE.dayQuery} x={960} top={listTop} width={720} size={20} at={dayAt} out={swapAt - 4} marks={[{ line: "WHERE", at: dayAt + 8, color: MARK_RED }]} />
        <Listing lines={COMPOSITE.reverse} x={X0} top={listTop} width={720} size={20} at={swapAt} out={skipAt - 4} marks={[{ line: "ON orders", text: "(created_at, customer_id)", at: swapAt + 10 }]} />
        <Listing lines={COMPOSITE.query} x={960} top={listTop} width={720} size={20} at={sameAt - 4} out={skipAt - 4} marks={[{ line: "WHERE", at: sameAt + 4 }]} />
        <Listing lines={COMPOSITE.skip} x={X0} top={listTop} width={720} size={20} at={statusAt - 4} marks={[{ line: "ON orders", text: "(status, created_at)", at: statusAt + 6 }]} />
        <Listing lines={COMPOSITE.dayQuery} x={960} top={listTop} width={720} size={20} at={statusAt} marks={[{ line: "WHERE", at: fiveAt - 4 }]} />

        {/* ── The strip: the index's entries, in index order ── */}
        <Note at={runAt + 4} x={STRIP_X} y={stripY - h(80)} out={swapAt - 2}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            index entries in order: <span style={{ color: INK }}>by customer, then time</span>
          </span>
        </Note>
        <Note at={swapAt + 4} x={STRIP_X} y={stripY - h(80)} out={skipAt - 2}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            index entries in order: <span style={{ color: INK }}>by time, then customer</span>
          </span>
        </Note>
        <Note at={statusAt} x={STRIP_X} y={stripY - h(80)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            index entries in order: <span style={{ color: INK }}>by status, then time</span>
          </span>
        </Note>
        <Svg>
          <rect
            x={STRIP_X}
            y={stripY}
            width={STRIP_W * ease(frame, runAt, 18)}
            height={stripH}
            rx={6}
            fill={`color-mix(in srgb, ${BAR} 8%, ${PAPER})`}
            stroke={`color-mix(in srgb, ${BAR} 45%, ${PAPER})`}
            strokeWidth={1.5}
            opacity={ease(frame, runAt, 6)}
          />

          {/* (customer_id, created_at): one run per customer */}
          <g opacity={modeRun}>
            {GROUPS.map((c, g) => (
              <g key={c}>
                {g > 0 ? <line x1={STRIP_X + g * groupW} x2={STRIP_X + g * groupW} y1={stripY - 6} y2={stripY + stripH + 6} stroke={INK_SOFT} strokeWidth={1.5} /> : null}
                {Array.from({ length: 20 }, (_, k) => {
                  const lit42 = g === g42 ? ease(frame, fortyTwoAt + 4, 10) : 0;
                  const read = g === g42 && k >= 10 ? ease(frame, newestAt + (19 - k) * 2, 6) : 0;
                  const day = dayGroups.includes(g) && k === 19 ? ease(frame, dayAt + 8 + g * 2, 8) : 0;
                  const fill = read > 0 ? inkOf.yellow : day > 0 ? ACCENT : lit42 > 0 ? BAR : `color-mix(in srgb, ${BAR} 45%, ${PAPER})`;
                  return <rect key={k} x={tick(g, k) - 2.5} y={stripY + 10} width={5} height={stripH - 20} rx={2} fill={fill} />;
                })}
                <text x={STRIP_X + g * groupW + groupW / 2} y={stripY + stripH + 30} textAnchor="middle" style={svgText({ ...label(20, g === g42 ? INK : INK_SOFT), fontWeight: g === g42 ? 700 : 600 })}>
                  {c}
                </text>
              </g>
            ))}
            <rect
              x={tick(g42, 0) - 9}
              y={stripY + 3}
              width={tick(g42, 19) - tick(g42, 0) + 18}
              height={stripH - 6}
              rx={5}
              fill="none"
              stroke={inkOf.yellow}
              strokeWidth={2.5}
              opacity={ease(frame, fortyTwoAt + 6, 10) * (1 - ease(frame, dayAt, 10))}
            />
          </g>

          {/* (created_at, customer_id): customer 42 scattered through time */}
          <g opacity={modeTime}>
            {own.map((id, k) => {
              const read = id >= latestFrom ? ease(frame, sameAt + 6 + (19 - k) * 2, 6) : 0;
              return <rect key={id} x={timeX(id) - 2.5} y={stripY + 10} width={5} height={stripH - 20} rx={2} fill={read > 0 ? inkOf.yellow : BAR} />;
            })}
            <rect
              x={timeX(latestFrom) - 6}
              y={stripY + 2}
              width={(STRIP_X + STRIP_W - timeX(latestFrom) + 6) * ease(frame, sameAt + 6, 26)}
              height={stripH - 4}
              rx={5}
              fill={`color-mix(in srgb, ${ACCENT} 18%, transparent)`}
              style={{ transform: `translateX(${(1 - ease(frame, sameAt + 6, 26)) * (STRIP_X + STRIP_W - timeX(latestFrom) + 6)}px)` }}
            />
            <text x={STRIP_X} y={stripY + stripH + 30} style={svgText(label(20, INK_SOFT))}>
              January 2024
            </text>
            <text x={STRIP_X + STRIP_W} y={stripY + stripH + 30} textAnchor="end" style={svgText(label(20, INK_SOFT))}>
              December
            </text>
          </g>

          {/* (status, created_at): four runs, one search into each, and one more */}
          <g opacity={modeStatus}>
            {STATUSES.map((s, r) => (
              <g key={s}>
                {r > 0 ? <line x1={STRIP_X + r * runW} x2={STRIP_X + r * runW} y1={stripY - 6} y2={stripY + stripH + 6} stroke={INK_SOFT} strokeWidth={1.5} /> : null}
                <rect x={STRIP_X + r * runW + 10} y={stripY + 12} width={runW - 46} height={stripH - 24} rx={3} fill={`color-mix(in srgb, ${BAR} 30%, ${PAPER})`} />
                <rect x={STRIP_X + (r + 1) * runW - 30} y={stripY + 8} width={18} height={stripH - 16} rx={3} fill={ease(frame, fiveAt + 4 + r * 4, 8) > 0.5 ? OK : `color-mix(in srgb, ${BAR} 60%, ${PAPER})`} />
                <text x={STRIP_X + r * runW + runW / 2} y={stripY + stripH + 30} textAnchor="middle" style={svgText(label(20, INK_SOFT))}>
                  {s}
                </text>
              </g>
            ))}
          </g>
        </Svg>
        {/* The five searches: a dive into each status's last day, then one
            past the end that finds no fifth status. */}
        <Svg opacity={modeStatus}>
          {Array.from({ length: COMPOSITE.skipSearches }, (_, k) => {
            const x = k < STATUSES.length ? STRIP_X + (k + 1) * runW - 21 : STRIP_X + STRIP_W + 26;
            const p = ease(frame, fiveAt + 2 + k * 4, 8);
            return (
              <g key={k} opacity={p}>
                <line x1={x} x2={x} y1={stripY - h(34)} y2={stripY - h(34) + (h(34) - 6) * p} stroke={OK} strokeWidth={3} />
                <path d={`M${x - 7},${stripY - 16} L${x},${stripY - 4} L${x + 7},${stripY - 16} Z`} fill={OK} />
              </g>
            );
          })}
        </Svg>

        {/* ── The plans, and what each one says ── */}
        <PlanBox lines={latestShown} x={X0} top={planTop} width={1260} size={19} at={fortyTwoAt + 8} out={dayAt - 4} marks={[
          { line: "Index Scan Backward", text: "Index Scan Backward", at: newestAt, color: MARK_GREEN },
          { line: "Buffers", text: "hit=13", at: thirteenAt, color: MARK_GREEN },
        ]} />
        <Note at={thirteenAt} x={NOTE_X} y={planTop + h(4)} out={dayAt - 4}>
          <div style={{ ...note(28, OK_INK), fontWeight: 600, whiteSpace: "nowrap" }}>{COMPOSITE.latestPages} pages</div>
          <div style={{ ...note(24, INK), whiteSpace: "nowrap", marginTop: h(10), opacity: ease(frame, noSortAt, 10) }}>newest first, no Sort node</div>
        </Note>
        <PlanBox lines={dayShown} x={X0} top={planTop} width={1260} size={19} at={dayAt + 4} out={swapAt - 4} marks={[{ line: "Seq Scan", text: "Seq Scan", at: tableAt, color: MARK_RED }]} />
        <Note at={tableAt + 4} x={NOTE_X} y={planTop + h(4)} out={swapAt - 4}>
          <div style={{ ...note(24, ACCENT_INK), fontWeight: 600, whiteSpace: "nowrap" }}>one day, in every run:</div>
          <div style={{ ...note(24, INK), whiteSpace: "nowrap", marginTop: h(6) }}>
            <Num>{thousands(COMPOSITE.dayCount)}</Num> orders, read from the table
          </div>
        </Note>
        <PlanBox lines={reverseShown} x={X0} top={planTop} width={1260} size={19} at={sameAt + 4} out={skipAt - 4} marks={[{ line: "Buffers", text: "hit=13 read=1824", at: eighteenAt, color: MARK_RED }]} />
        <Note at={eighteenAt} x={NOTE_X} y={planTop + h(4)} out={ruleAt - 4}>
          <div style={{ ...note(28, ACCENT_INK), fontWeight: 600, whiteSpace: "nowrap" }}>{thousands(COMPOSITE.reversePages)} pages</div>
          <div style={{ ...note(24, INK), whiteSpace: "nowrap", marginTop: h(10) }}>for the same ten orders</div>
        </Note>
        <Note at={ruleAt} x={NOTE_X} y={planTop + h(4)} out={skipAt - 4}>
          <div style={{ ...note(24, INK), whiteSpace: "nowrap" }}>Order the columns:</div>
          <div style={{ ...note(24, OK_INK), fontWeight: 600, whiteSpace: "nowrap", marginTop: h(8), opacity: ease(frame, equalityAt, 10) }}>equality first,</div>
          <div style={{ ...note(24, OK_INK), fontWeight: 600, whiteSpace: "nowrap", marginTop: h(4), opacity: ease(frame, rangeAt, 10) }}>then range or sort</div>
        </Note>
        <PlanBox lines={skipShown} x={X0} top={planTop} width={1260} size={19} at={statusAt + 4} marks={[
          { line: "Index Only Scan", text: "Index Only Scan", at: withoutAt, color: MARK_GREEN },
          { line: "Index Searches", at: fiveAt, color: MARK_GREEN },
          { line: "Heap Fetches", at: neverAt, color: MARK_GREEN },
        ]} />
        <Note at={skipAt + 2} x={NOTE_X} y={planTop + h(4)}>
          <div style={{ ...note(24, INK), whiteSpace: "nowrap" }}>Postgres: skip scan</div>
          <div style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap", marginTop: h(8), opacity: ease(frame, fewAt, 10) }}>
            when <SmallMono>status</SmallMono> has few values
          </div>
          <div style={{ ...note(24, OK_INK), fontWeight: 600, whiteSpace: "nowrap", marginTop: h(14), opacity: ease(frame, neverAt, 10) }}>never touched the table</div>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
