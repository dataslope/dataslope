import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { OK_INK, QuestionCard } from "../../editorial/interview";
import { ACCENT_INK, HIGHLIGHT, INK, INK_SOFT, label, note, svgText } from "../../editorial/style";
import { Note, Num, OutlineBadge } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { DBT_MODEL, FILTER, LATE, SQL, STRATEGY, WATERMARK_SQL } from "./data";
import { Cell, type CellTone, Count, Drift, Flow, listingCharX, listingLineMid, Mark, pulse, SmallMono, SqlListing, X0 } from "./parts";

/** dbt.mdx's model, its file-name comment and blank lines set aside (the
 *  file name is the listing's title). */
const MODEL = DBT_MODEL.filter((l) => l.trim() && !l.startsWith("--"));
const SIZE = 19;
/** The timeline's cells, a little under the house size, so the watermark
 *  passes between two of them with room either side. */
const TS = 36;
const MODEL_X = X0;
const MODEL_W = 720;
const SQL_X = 930;
const SQL_W = 690;
/** Vertical positions are layout values (through `y()`). */
const LIST_TOP_C = 276;
const TITLE_C = 243;

// ── The timeline: one column a day, events placed at their event_at ──────────
const TL0 = 360;
const P = 46;
/** The centre of the column for day `d` of January (fractions for times). */
const X = (d: number) => TL0 + (d - 0.5) * P;
/** Lanes, top to bottom: the model's table, its late lane, the source's late
 *  lane, the source (layout values, through `y()`). */
const LANES_C = { fct: 595, fctNew: 634, rawNew: 704, raw: 743, axis: 790, verdict: 829, verdict2: 864, src: 450, own: 483 };
/** Day 24's watermark as `>` draws it (after day 24's column) and as `>=`
 *  draws it (before it). */
const AFTER = (d: number) => X(d) + P / 2;
const BEFORE = (d: number) => X(d) - P / 2;

const ARRIVALS = [
  { id: 25, day: 24 },
  { id: 26, day: 22.5 },
  { id: 27, day: 25 },
];
const date = (ts: string) => ts.slice(0, 10);

/**
 * Questions 2 and 3. The dbt page's model beside the SQL it compiles to (the
 * warehousing page's block), then one timeline of events under them: the
 * model's table (fct_events) above the source (raw_events), each event at
 * its event_at, the watermark a yellow rule. The page's run loads 15 to 24;
 * three events land after it (25 on the watermark's own timestamp, 26 two
 * days late, 27 new). A strict `>` finds 27 alone; `>=` with deduplication
 * adds 25 and skips 24; a three-day overlap, merged, lands all three; a wider
 * window re-reads more and still misses an event later than it. Then
 * `{{ this }}`: the model's own table, and on the first run, when it doesn't
 * exist, the guard is skipped and everything loads.
 */
export const FilterScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();

  const { y } = useLayout();
  const LIST_TOP = y(LIST_TOP_C);
  const FCT = y(LANES_C.fct);
  const FCT_NEW = y(LANES_C.fctNew);
  const RAW_NEW = y(LANES_C.rawNew);
  const RAW = y(LANES_C.raw);
  const AXIS = y(LANES_C.axis);
  const VERDICT = y(LANES_C.verdict);
  const VERDICT2 = y(LANES_C.verdict2);
  const RULE_TOP = FCT - 8;
  const RULE_BOT = RAW + TS + 8;

  const from = n.beat("filter").from;
  const qAt = n.word("filter", "Question two");
  const textAt = n.word("filter", "How does an incremental model");
  const modelAt = n.word("filter", "new rows", { edge: "end" });
  const watermarkAt = n.word("filter", "With a watermark");
  const loadedAt = n.word("filter", "the latest timestamp already loaded");
  const guardAt = n.word("filter", "a guard adds one condition");
  const newerAt = n.word("filter", "only source rows newer");
  const ownAt = n.word("filter", "the model's own table");

  const pageAt = n.word("filter-run", "On the page's tables");
  const holdsAt = n.word("filter-run", "the model holds events");
  const sourceAt = n.word("filter-run", "the source has twenty-four");
  const loadsAt = n.word("filter-run", "The filter loads the ten");
  const afterAt = n.word("filter-run", "after the watermark");

  const landAt = n.word("filter-arrive", "Then three more land");
  const fiveAt = n.word("filter-arrive", "Event twenty-five");
  const sixAt = n.word("filter-arrive", "Twenty-six happened");
  const lateAt = n.word("filter-arrive", "arrived late");
  const sevenAt = n.word("filter-arrive", "Twenty-seven is simply new");

  const strictAt = n.word("filter-strict", "A strict greater-than");
  const onlyAt = n.word("filter-strict", "finds only twenty-seven");
  const neverAt = n.word("filter-strict", "never loaded");
  const errorsAt = n.word("filter-strict", "nothing errors");

  const gteAt = n.word("filter-gte", "Greater-than-or-equal");
  const dedupAt = n.word("filter-gte", "plus deduplication");
  const comesAt = n.word("filter-gte", "twenty-five comes in");
  const skipAt = n.word("filter-gte", "read again, is skipped");
  const missedAt = n.word("filter-gte", "it's still missed");

  const overlapAt = n.word("filter-overlap", "re-read an overlap window");
  const threeDaysAt = n.word("filter-overlap", "the last three days");
  const keyAt = n.word("filter-overlap", "merge on a stable key");
  const sevenRowsAt = n.word("filter-overlap", "The window reads seven rows");
  const allAt = n.word("filter-overlap", "all three new ones land");

  const wideAt = n.word("filter-width", "as wide as your data arrives late");
  const moreAt = n.word("filter-width", "re-reads more");
  const slipsAt = n.word("filter-width", "an event later than the window");

  const seqAt = n.word("filter-seq", "a change sequence");
  const behindAt = n.word("filter-seq", "nothing can land behind the watermark");

  const microAt = n.word("filter-micro", "the microbatch strategy");
  const handsAt = n.word("filter-micro", "takes the filter out of your hands");
  const setAt = n.word("filter-micro", "set an event time");
  const sizeAt = n.word("filter-micro", "a batch size");
  const batchAt = n.word("filter-micro", "one idempotent batch per day");
  const lookbackAt = n.word("filter-micro", "re-processes lookback batches");
  const backfillAt = n.word("filter-micro", "backfills any date range");

  const thisAt = n.word("this", "Question three");
  const thisTextAt = n.word("this", "What is the");
  const tableAt = n.word("this", "the model's own table");
  const maxAt = n.word("this", "takes its maximum from");
  const firstAt = n.word("this-first", "On the very first run");
  const notYetAt = n.word("this-first", "doesn't exist yet");
  const falseAt = n.word("this-first", "returns false");
  const skippedAt = n.word("this-first", "the guard is skipped");
  const everythingAt = n.word("this-first", "loads everything");
  const end = n.beat("this-first").to;

  // ── Cells ────────────────────────────────────────────────────────────────
  type Copy = { id: number; day: number; lane: "main" | "new"; at: number; move?: number; tones?: { at: number; tone: CellTone }[]; out?: number; label?: string; dashed?: boolean };
  const loaded = FILTER.found.rows.map((r) => Number(r[0]));
  const fctY = (lane: "main" | "new") => (lane === "main" ? FCT : FCT_NEW);
  const rawY = (lane: "main" | "new") => (lane === "main" ? RAW : RAW_NEW);
  const reset = thisAt;
  const goneAt = notYetAt;
  const copies: Copy[] = [
    // The page's table: fct_events through January 14.
    ...Array.from({ length: FILTER.before.target }, (_, i) => ({
      id: i + 1,
      day: i + 1,
      lane: "main" as const,
      at: loadedAt + i * 0.8,
      out: goneAt,
      // "Through January fourteenth": the last one loaded.
      tones: i + 1 === FILTER.before.target ? [{ at: holdsAt, tone: "look" as const }, { at: loadsAt, tone: "plain" as const }] : undefined,
    })),
    // The page's run: 15 to 24 cross.
    ...loaded.map((id, i) => ({ id, day: id, lane: "main" as const, at: loadsAt + 4 + i * 2.5, move: loadsAt + 4 + i * 2.5, out: goneAt })),
    // `>`: 27. `>=`: 25. The overlap: 26.
    { id: 27, day: 25, lane: "new", at: onlyAt, move: onlyAt, tones: [{ at: onlyAt + 6, tone: "ok" }, { at: reset, tone: "plain" }], out: goneAt },
    { id: 25, day: 24, lane: "new", at: comesAt, move: comesAt, tones: [{ at: comesAt + 6, tone: "ok" }, { at: reset, tone: "plain" }], out: goneAt },
    { id: 26, day: 22.5, lane: "new", at: allAt, move: allAt, tones: [{ at: allAt + 6, tone: "ok" }, { at: reset, tone: "plain" }], out: goneAt },
    // The first run: everything.
    ...Array.from({ length: 24 }, (_, i) => ({ id: i + 1, day: i + 1, lane: "main" as const, at: everythingAt + i * 0.5, move: everythingAt + i * 0.5 })),
    ...ARRIVALS.map((a, k) => ({ id: a.id, day: a.day, lane: "new" as const, at: everythingAt + 6 + k * 2, move: everythingAt + 6 + k * 2 })),
  ];
  const rawTones = (id: number): { at: number; tone: CellTone }[] => {
    const t: { at: number; tone: CellTone }[] = [];
    if (id === 25) t.push({ at: fiveAt, tone: "look" }, { at: neverAt, tone: "bad" }, { at: comesAt, tone: "plain" });
    if (id === 26) t.push({ at: sixAt, tone: "look" }, { at: neverAt, tone: "bad" }, { at: allAt, tone: "plain" });
    if (id === 27) t.push({ at: sevenAt, tone: "look" }, { at: onlyAt, tone: "plain" });
    // "The source has twenty-four": its last.
    if (id === 24) t.push({ at: sourceAt, tone: "look" }, { at: loadsAt, tone: "plain" }, { at: skipAt, tone: "off" });
    if (id >= 21 && id <= 23) t.push({ at: sevenRowsAt, tone: "off" });
    if (id >= 18 && id <= 20) t.push({ at: moreAt, tone: "off" });
    if (t.length) t.push({ at: microAt, tone: "plain" });
    return t;
  };

  // ── The watermark: a rule, then a band behind it ─────────────────────────
  const ruleX = (() => {
    const steps: [number, number][] = [
      [loadedAt, AFTER(14)],
      // Once the ten have crossed.
      [afterAt + 20, AFTER(24)],
      [gteAt, BEFORE(24)],
    ];
    let x = steps[0][1];
    for (let i = 1; i < steps.length; i++) x = x + (steps[i][1] - x) * ease(frame, steps[i][0], 18);
    return x;
  })();
  // No watermark while microbatch filters by period; back for `{{ this }}`.
  const ruleP = ease(frame, loadedAt, 14) * (1 - ease(frame, goneAt, 12)) * (1 - ease(frame, microAt, 12) + ease(frame, thisAt, 12));
  const bandLeft = BEFORE(24) - (BEFORE(24) - BEFORE(21)) * ease(frame, overlapAt, 18) - (BEFORE(21) - BEFORE(18)) * ease(frame, wideAt, 18);
  const bandP = ease(frame, overlapAt, 10) * (1 - ease(frame, microAt, 12));
  // Microbatch: a batch per day, and the last few re-processed.
  const dividersP = ease(frame, batchAt, 16) * (1 - ease(frame, reset, 12));
  const lookbackP = ease(frame, lookbackAt, 12) * (1 - ease(frame, reset, 12));
  const wmText = frame < afterAt + 26 ? date(FILTER.watermarkBefore) : date(FILTER.watermarkAfter);

  // `{{ this }}` in the model, and the arrow to the table it names.
  const thisLine = MODEL.findIndex((l) => l.includes("{{ this }}"));
  const thisCol = MODEL[thisLine].indexOf("{{ this }}");
  const thisMidX = listingCharX(MODEL_X, thisCol + 5, SIZE);
  const thisBottom = listingLineMid(LIST_TOP, thisLine, SIZE) + 16;
  const guardLine = MODEL.findIndex((l) => l.includes("is_incremental()"));
  const guardEnd = listingCharX(MODEL_X, MODEL[guardLine].length, SIZE);

  // The compiled SQL: the filter's line changes in place, and the overlap
  // opens a line under it. ORDER BY, which only sorts the page's output, is
  // left out: this is the statement the model runs.
  const compiled = [
    WATERMARK_SQL[0],
    WATERMARK_SQL[1],
    { text: WATERMARK_SQL[2], swaps: [{ at: gteAt, text: SQL.AT_LEAST[2] }] },
    { text: SQL.OVERLAP[3], growAt: overlapAt + 2 },
  ];

  const rows = (k: number) => (
    <>
      <Num>{k}</Num> rows
    </>
  );

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={modelAt} level={-37} />
      <Sfx name="el-pencil" at={watermarkAt} level={-37} />
      <Sfx name="el-sprinkle" at={loadedAt} level={-36} />
      <Sfx name="el-sprinkle" at={pageAt} level={-36} />
      <Sfx name="el-whoosh" at={loadsAt + 4} level={-37} />
      <Sfx name="el-tap" at={landAt} level={-33} />
      <Sfx name="el-tap" at={landAt + 5} level={-34} />
      <Sfx name="el-tap" at={landAt + 10} level={-34} />
      <Sfx name="el-tap" at={onlyAt} level={-33} />
      <Sfx name="el-scratch" at={neverAt} level={-35} />
      <Sfx name="el-whoosh" at={gteAt} level={-38} />
      <Sfx name="el-tap" at={comesAt} level={-33} />
      <Sfx name="el-whoosh" at={overlapAt} level={-37} />
      <Sfx name="el-tap" at={allAt} level={-32} />
      <Sfx name="el-whoosh" at={wideAt} level={-38} />
      <Sfx name="el-scratch" at={slipsAt + 6} level={-36} />
      <Sfx name="el-whoosh" at={microAt} level={-38} />
      <Sfx name="el-sprinkle" at={batchAt} level={-37} />
      <Sfx name="el-pencil" at={tableAt} level={-36} />
      <Sfx name="el-scratch" at={notYetAt} level={-37} />
      <Sfx name="el-sprinkle" at={everythingAt} level={-35} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={2} at={qAt - 4} textAt={textAt - 4} out={thisAt - 8} size={56}>
          How does an incremental model actually filter new rows?
        </QuestionCard>
        <QuestionCard n={3} at={thisAt - 2} textAt={thisTextAt - 2} size={56}>
          What is the <SmallMono>{"{{ this }}"}</SmallMono> variable in dbt?
        </QuestionCard>

        {/* ── The model, and the SQL it runs ── */}
        <Note at={modelAt - 2} x={MODEL_X} y={y(TITLE_C)}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>
            The dbt model, <SmallMono color={INK}>models/fct_events.sql</SmallMono>
          </span>
        </Note>
        <SqlListing
          lines={MODEL}
          x={MODEL_X}
          top={LIST_TOP}
          width={MODEL_W}
          size={SIZE}
          at={modelAt}
          step={2}
          marks={[
            { line: "{% if is_incremental() %}", at: guardAt, out: pageAt },
            { line: "{% endif %}", at: guardAt + 4, out: pageAt },
            { line: "WHERE event_at >", at: newerAt, out: pageAt },
            { line: "WHERE event_at >", text: "{{ this }}", at: tableAt, out: firstAt },
            { line: "WHERE event_at >", text: "MAX(event_at)", at: maxAt, out: firstAt },
          ]}
          dims={[
            { line: "{% if is_incremental() %}", at: skippedAt },
            { line: "WHERE event_at >", at: skippedAt + 3 },
            { line: "{% endif %}", at: skippedAt + 6 },
          ]}
        />
        <Note at={watermarkAt - 2} x={SQL_X} y={y(TITLE_C)}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>What it runs, compiled</span>
        </Note>
        <SqlListing
          lines={compiled}
          x={SQL_X}
          top={LIST_TOP}
          width={SQL_W}
          size={SIZE}
          at={watermarkAt}
          marks={[
            { line: "WHERE event_at >", text: "(SELECT MAX(event_at) FROM fct_events)", at: loadedAt, out: newerAt },
            { line: "WHERE event_at >", text: ">", at: strictAt, out: gteAt - 2 },
            { line: "WHERE event_at >", text: ">=", at: gteAt + 8, out: overlapAt },
            { line: "INTERVAL", text: "- INTERVAL '3 days'", at: overlapAt + 14, out: microAt },
          ]}
        />
        <Note at={newerAt} x={SQL_X} y={y(LANES_C.src)}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>
            <SmallMono color={INK}>{"{{ source('raw', 'events') }}"}</SmallMono> is <SmallMono color={INK}>raw_events</SmallMono>
          </span>
        </Note>
        <Note at={ownAt} x={SQL_X} y={y(LANES_C.own)}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>
            <SmallMono color={INK}>{"{{ this }}"}</SmallMono> is <SmallMono color={INK}>fct_events</SmallMono>
          </span>
        </Note>
        {/* The first run: the check is false. */}
        <Note at={falseAt} x={guardEnd + 22} y={listingLineMid(LIST_TOP, guardLine, SIZE) - 15}>
          <OutlineBadge tone="ink" size={20} style={{ fontFamily: MONO }}>
            false
          </OutlineBadge>
        </Note>

        {/* ── The timeline ── */}
        {/* The overlap window, behind the cells. */}
        {bandP > 0 ? (
          <div
            style={{
              position: "absolute",
              left: bandLeft,
              top: RULE_TOP,
              width: BEFORE(24) - bandLeft,
              height: RULE_BOT - RULE_TOP,
              background: HIGHLIGHT,
              borderRadius: 4,
              opacity: bandP * 0.8,
            }}
          />
        ) : null}
        {/* Microbatch: one batch a day, the latest few re-processed. */}
        {lookbackP > 0 ? (
          <div
            style={{
              position: "absolute",
              left: BEFORE(23),
              top: RULE_TOP,
              width: AFTER(25) - BEFORE(23),
              height: RULE_BOT - RULE_TOP,
              background: HIGHLIGHT,
              borderRadius: 4,
              opacity: lookbackP * 0.8,
            }}
          />
        ) : null}
        <Note at={lookbackAt + 4} x={BEFORE(23) + 6} y={RULE_TOP - 34} out={reset}>
          <span style={{ ...label(20, inkOf.yellow), fontWeight: 600, whiteSpace: "nowrap" }}>lookback</span>
        </Note>
        {dividersP > 0 ? (
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: dividersP }}>
            {/* Between the days of each table's own lane only: the late lanes
                hold 26, which sits between two days. */}
            {Array.from({ length: 24 }, (_, i) =>
              [FCT, RAW].map((laneTop) => (
                <line
                  key={`${i}-${laneTop}`}
                  x1={AFTER(i + 1)}
                  x2={AFTER(i + 1)}
                  y1={laneTop - 6}
                  y2={laneTop - 6 + (TS + 12) * ease(frame, batchAt + i * 0.8, 10)}
                  stroke={INK_SOFT}
                  strokeWidth={1}
                  strokeDasharray="3 4"
                />
              )),
            )}
          </svg>
        ) : null}
        <Note at={threeDaysAt} x={(bandLeft + BEFORE(24)) / 2 - 36} y={RULE_TOP - 34} out={wideAt - 4}>
          <span style={{ ...label(20, inkOf.yellow), fontWeight: 600, whiteSpace: "nowrap" }}>3 days</span>
        </Note>
        {/* The watermark. */}
        {ruleP > 0 ? (
          <>
            <div style={{ position: "absolute", left: ruleX - 1.5, top: RULE_TOP, width: 3, height: RULE_BOT - RULE_TOP, borderRadius: 2, background: inkOf.yellow, opacity: ruleP }} />
            <div style={{ position: "absolute", left: ruleX + 10, top: RULE_TOP - 34, opacity: ruleP, ...label(20, INK), whiteSpace: "nowrap" }}>
              <span style={{ color: inkOf.yellow, fontWeight: 600 }}>watermark</span> <span style={{ fontFamily: MONO, fontSize: 19, fontWeight: 500 }}>{wmText}</span>
            </div>
          </>
        ) : null}

        {/* The tables' names and counts. */}
        <Note at={loadedAt} x={X0} y={FCT + 6}>
          <span style={{ fontFamily: MONO, fontSize: 21, fontWeight: 500, color: INK, whiteSpace: "nowrap" }}>
            <Mark at={tableAt + 14} out={notYetAt}>
              <span style={{ display: "inline-block", transform: `scale(${1 + 0.05 * pulse(frame, maxAt, 18)})` }}>fct_events</span>
            </Mark>
          </span>
        </Note>
        <Note at={pageAt} x={X0} y={RAW + 6}>
          <span style={{ fontFamily: MONO, fontSize: 21, fontWeight: 500, color: INK, whiteSpace: "nowrap" }}>raw_events</span>
        </Note>
        <Count
          x={262}
          y={FCT + 8}
          at={loadedAt + 6}
          out={goneAt}
          size={20}
          steps={[
            { at: loadedAt, text: rows(FILTER.before.target) },
            { at: afterAt + 20, text: rows(FILTER.after.target) },
            { at: onlyAt + 6, text: rows(STRATEGY.strictAppend.first.target) },
            { at: comesAt + 6, text: rows(STRATEGY.atLeastMerge.first.target) },
            { at: allAt + 6, text: rows(STRATEGY.overlapMerge.first.target), color: OK_INK },
            { at: reset, text: rows(STRATEGY.overlapMerge.first.target) },
          ]}
        />
        <Count
          x={262}
          y={FCT + 8}
          at={everythingAt + 20}
          size={20}
          steps={[{ at: everythingAt + 20, text: rows(STRATEGY.overlapMerge.first.source) }]}
        />
        <Count
          x={262}
          y={RAW + 8}
          at={pageAt + 6}
          size={20}
          steps={[
            { at: pageAt, text: rows(FILTER.before.source) },
            { at: landAt + 10, text: rows(STRATEGY.overlapMerge.first.source) },
          ]}
        />
        {/* On the first run there is no table: its lanes, dashed. */}
        {(() => {
          const p = ease(frame, notYetAt + 6, 12) * (1 - ease(frame, everythingAt, 12));
          if (p <= 0) return null;
          return (
            <>
              <div
                style={{
                  position: "absolute",
                  left: X(1) - TS / 2 - 10,
                  top: FCT - 10,
                  width: X(25) - X(1) + TS + 20,
                  height: FCT_NEW + TS - FCT + 20,
                  boxSizing: "border-box",
                  border: `2px dashed ${INK_SOFT}`,
                  borderRadius: 8,
                  opacity: p,
                }}
              />
              <div style={{ position: "absolute", left: X(13) - 70, top: FCT + 26, ...note(24, INK_SOFT), fontWeight: 500, whiteSpace: "nowrap", opacity: p }}>Not there yet</div>
            </>
          );
        })()}

        {/* raw_events. */}
        {Array.from({ length: FILTER.before.source }, (_, i) => (
          <Cell key={`r${i}`} size={TS} x={X(i + 1)} y={RAW} at={pageAt + i * 0.8} label={i + 1} tones={rawTones(i + 1)} />
        ))}
        {ARRIVALS.map((a, k) => (
          <Cell key={`a${a.id}`} size={TS} x={X(a.day)} y={RAW_NEW} at={landAt + k * 5} label={a.id} tones={rawTones(a.id)} />
        ))}
        {/* An event later than even the wide window. */}
        <Cell size={TS} x={X(16)} y={RAW_NEW} at={slipsAt + 6} out={microAt} label="?" dashed tones={[{ at: slipsAt + 6, tone: "bad" }]} />

        {/* fct_events: what is there, and what crosses. */}
        {copies.map((c, k) => {
          const moveP = c.move === undefined ? 1 : ease(frame, c.move, 16);
          const top = rawY(c.lane) + (fctY(c.lane) - rawY(c.lane)) * moveP;
          return <Cell key={`f${k}`} size={TS} x={X(c.day)} y={top} at={c.at} out={c.out} label={c.id} tones={c.tones} />;
        })}

        {/* The time axis. */}
        <Note at={pageAt} x={X0} y={AXIS}>
          <span style={{ fontFamily: MONO, fontSize: 19, fontWeight: 500, color: INK_SOFT, whiteSpace: "nowrap" }}>event_at</span>
        </Note>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, pageAt, 12) }}>
          {[1, 7, 14, 21, 25].map((d) => (
            <text key={d} x={X(d)} y={AXIS + 18} textAnchor="middle" style={svgText({ ...label(19, INK_SOFT), fontWeight: 500 })}>
              Jan {d}
            </text>
          ))}
        </svg>

        {/* ── What each step says ── */}
        <Note at={loadsAt} x={X0} y={VERDICT} out={landAt - 4}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            The filter loads the <Num>{loaded.length}</Num> after the watermark: <Num>{loaded[0]}</Num> to <Num>{loaded[loaded.length - 1]}</Num>
          </span>
        </Note>
        <Note at={fiveAt} x={X0} y={VERDICT} out={strictAt - 4}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <b>25</b> at the watermark&apos;s own time
            <span style={{ opacity: ease(frame, sixAt, 10) }}>
              <span style={{ color: INK_SOFT, margin: "0 0.5em" }}>·</span>
              <b>26</b> from {date(LATE.arrived.rows[1][1])}
              <span style={{ opacity: ease(frame, lateAt, 10) }}>, arrived late</span>
            </span>
            <span style={{ opacity: ease(frame, sevenAt, 10) }}>
              <span style={{ color: INK_SOFT, margin: "0 0.5em" }}>·</span>
              <b>27</b> new
            </span>
          </span>
        </Note>
        <Note at={strictAt} x={X0} y={VERDICT} out={gteAt - 4}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <span style={{ fontFamily: MONO, fontWeight: 600, fontVariantLigatures: "none" }}>&gt;</span> finds only <b>{LATE.strict.join(", ")}</b>
            <span style={{ color: ACCENT_INK, opacity: ease(frame, neverAt, 10) }}>
              <span style={{ color: INK_SOFT, margin: "0 0.5em" }}>·</span>
              25 and 26 never loaded
              <span style={{ opacity: ease(frame, errorsAt, 10) }}>, and no error</span>
            </span>
          </span>
        </Note>
        <Note at={gteAt} x={X0} y={VERDICT} out={overlapAt - 4}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <span style={{ fontFamily: MONO, fontWeight: 600, fontVariantLigatures: "none" }}>&gt;=</span>
            <span style={{ opacity: ease(frame, dedupAt, 10) }}> plus deduplication</span>
            <span style={{ opacity: ease(frame, comesAt, 10) }}>
              : <b style={{ color: OK_INK }}>25 in</b>
            </span>
            <span style={{ opacity: ease(frame, skipAt, 10), color: INK_SOFT }}>, 24 re-read and skipped</span>
            <span style={{ color: ACCENT_INK, opacity: ease(frame, missedAt, 10) }}>
              <span style={{ color: INK_SOFT, margin: "0 0.5em" }}>·</span>
              26 still missed
            </span>
          </span>
        </Note>
        <Note at={overlapAt} x={X0} y={VERDICT} out={microAt - 4}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            A three-day overlap
            <span style={{ opacity: ease(frame, keyAt, 10) }}>
              , merged on <span style={{ fontFamily: MONO, fontSize: "0.92em", fontWeight: 500 }}>event_id</span>
            </span>
            <span style={{ opacity: ease(frame, sevenRowsAt, 10) }}>
              : <Num>{LATE.overlap.length}</Num> rows read
            </span>
            <span style={{ color: OK_INK, fontWeight: 600, opacity: ease(frame, allAt, 10) }}>
              , <Num>{STRATEGY.overlapMerge.first.target}</Num> of <Num>{STRATEGY.overlapMerge.first.source}</Num>
            </span>
          </span>
        </Note>
        <Note at={wideAt} x={X0} y={VERDICT2} out={seqAt - 4}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            As wide as data arrives late
            <span style={{ opacity: ease(frame, moreAt, 10), color: INK_SOFT }}>: more re-read every run</span>
            <span style={{ opacity: ease(frame, slipsAt, 10), color: ACCENT_INK }}>
              <span style={{ color: INK_SOFT, margin: "0 0.5em" }}>·</span>
              Later than the window: still missed
            </span>
          </span>
        </Note>
        <Note at={seqAt} x={X0} y={VERDICT2} out={setAt - 4}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            Or: <Mark at={seqAt + 6}>a change sequence that only grows</Mark>
            <span style={{ color: INK_SOFT, opacity: ease(frame, behindAt, 10) }}>, so nothing lands behind the watermark</span>
          </span>
        </Note>

        <Note at={microAt - 2} x={X0} y={VERDICT} out={thisAt - 6}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            Since dbt 1.9, microbatch
            <span style={{ opacity: ease(frame, handsAt, 10) }}> writes the filter for you</span>
            <span style={{ opacity: ease(frame, batchAt, 10) }}>
              : <Mark at={batchAt + 6}>one idempotent batch per day</Mark>
            </span>
            <span style={{ opacity: ease(frame, lookbackAt, 10) }}>, lookback batches re-run</span>
            <span style={{ opacity: ease(frame, backfillAt, 10) }}>, any date range backfilled</span>
          </span>
        </Note>
        <Note at={setAt - 2} x={X0} y={VERDICT2} out={thisAt - 6}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            <SmallMono color={INK}>incremental_strategy=&apos;microbatch&apos;</SmallMono>
            <span style={{ margin: "0 0.5em" }}>·</span>
            <SmallMono color={INK}>event_time</SmallMono>
            <span style={{ opacity: ease(frame, sizeAt, 10) }}>
              <span style={{ margin: "0 0.5em" }}>·</span>
              <SmallMono color={INK}>batch_size=&apos;day&apos;</SmallMono>
            </span>
            <span style={{ opacity: ease(frame, lookbackAt, 10) }}>
              <span style={{ margin: "0 0.5em" }}>·</span>
              <SmallMono color={INK}>lookback</SmallMono>
            </span>
            <span style={{ opacity: ease(frame, backfillAt, 10) }}>
              <span style={{ margin: "0 0.5em" }}>·</span>
              <SmallMono color={INK}>--event-time-start</SmallMono>, <SmallMono color={INK}>--event-time-end</SmallMono>
            </span>
          </span>
        </Note>

        {/* ── {{ this }}: the model's own table ── */}
        <Flow points={[[thisMidX - 30, thisBottom], [X0 + 70, FCT - 14]]} at={tableAt + 4} out={notYetAt} color={inkOf.yellow} width={2.6} />
        <Note at={everythingAt} x={X0} y={VERDICT}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            First run: <span style={{ fontFamily: MONO, fontSize: "0.92em", fontWeight: 500 }}>is_incremental()</span> is false, so every source row loads
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
