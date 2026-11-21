import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK_INK, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { DBT_MODEL, DUP_KEY, FILTER, LATE, STRATEGY } from "./data";
import {
  Cell,
  type CellTone,
  CELL,
  type Col,
  Count,
  DataTable,
  Drift,
  type ListingLine,
  MARK_BAD,
  MARK_OK,
  PgError,
  SmallMono,
  Spot,
  SqlListing,
  tableGeometry,
  type TableRow,
  X0,
} from "./parts";

/** The model's config, as dbt.mdx writes it. */
const CONFIG = DBT_MODEL.slice(DBT_MODEL.findIndex((l) => l === "{{"), DBT_MODEL.findIndex((l) => l === "}}") + 1);
/** The key's own setting in that config, which the append run goes without. */
const KEY_SETTING = ", unique_key='event_id'";
const CONFIG_LINE = CONFIG.find((l) => l.includes(KEY_SETTING));
if (!CONFIG_LINE) throw new Error("dbt.mdx's config no longer sets unique_key='event_id'");
const TL = 300;
const P = 44;
/** The column of event `id`. */
const X = (id: number) => TL + (id - 0.5) * P;
/** Layout values (through `y()`). */
const ROW_C = { answer: 267, config: 320, spot: 368, dup: 544, batch: 583, base: 715, bottom: 769 };
const LEDGER_X = 1240;
/** The uniqueness test, clear of the error box on its left and of the
 *  table's count on its right. */
const TEST_X = 980;

/**
 * Question 4. What `unique_key` is for (an update-or-replace strategy
 * matching an incoming row to the one in the table), on the overlap window's
 * run: fct_events drawn as one column per event, a row's copies stacked.
 * Appended, the seven re-read rows stack doubles on 21 to 24: 31 rows for 27
 * events, 38 after a retry. Keyed on event_id (the key pops in), a merge
 * updates four and inserts three: 27, and 27 again; delete-then-insert the
 * same. The three results collect in a table on the right. Then the key is not
 * checked: the source sends 27 twice and the merge inserts both, silently;
 * the next run's merge fails in Postgres's words, and a uniqueness test finds
 * the duplicate.
 */
export const KeyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("key").from;
  const qAt = n.word("key", "Question four");
  const textAt = n.word("key", "What is the unique key config");
  const tellsAt = n.word("key", "It tells a strategy");
  const matchAt = n.word("key", "how to match an incoming row");
  const tableAt = n.word("key", "the one already in the table");

  const appendedAt = n.word("key-append", "rows are appended");
  const readAt = n.word("key-append", "The overlap window read seven events");
  const fourAt = n.word("key-append", "four of them already loaded");
  const holdsAt = n.word("key-append", "the table now holds");
  const retryAt = n.word("key-append", "Retry the run");
  const thirtyEightAt = n.word("key-append", "it's thirty-eight");

  const keyAt = n.word("key-merge", "Set the unique key");
  const updatesAt = n.word("key-merge", "a merge updates the four");
  const insertsAt = n.word("key-merge", "inserts the three");
  const twentySevenAt = n.word("key-merge", "twenty-seven rows");
  const againAt = n.word("key-merge", "twenty-seven again on a retry");
  const deleteAt = n.word("key-merge", "Delete, then insert");
  const tooAt = n.word("key-merge", "gets there too");

  const uncheckedAt = n.word("key-dup", "the key isn't checked");
  const twiceAt = n.word("key-dup", "Had the source sent event twenty-seven twice");
  const bothAt = n.word("key-dup", "insert both copies");
  const noErrorAt = n.word("key-dup", "without an error");
  const nextRunAt = n.word("key-dup-fail", "On the next run");
  const refusesAt = n.word("key-dup-fail", "refuses the merge outright");
  const testAt = n.word("key-test", "put a uniqueness test on the key");
  const end = n.beat("key-test").to;

  const row = (k: keyof typeof ROW_C) => y(ROW_C[k]);
  const BASE = row("base");
  const level = (k: number) => BASE - k * (CELL + 6);
  const BATCH = row("batch");
  const batch = LATE.overlap;
  const loadedBefore = FILTER.after.target;
  const already = batch.filter((id) => id <= loadedBefore);
  const fresh = batch.filter((id) => id > loadedBefore);

  // ── fct_events, a column per event ────────────────────────────────────────
  type Copy = { id: number; level: number; at: number; drop?: number; from?: number; out?: number; tones?: { at: number; tone: CellTone }[] };
  const mergeOut = twiceAt - 6;
  const copies: Copy[] = [
    // The table after the page's run.
    ...Array.from({ length: loadedBefore }, (_, i) => {
      const id = i + 1;
      const updated = already.includes(id);
      return {
        id,
        level: 0,
        at: tableAt + i * 0.8,
        tones: updated
          ? [
              { at: fourAt, tone: "look" as CellTone },
              { at: holdsAt, tone: "plain" as CellTone },
              { at: updatesAt, tone: "look" as CellTone },
              { at: mergeOut, tone: "plain" as CellTone },
              { at: bothAt, tone: "look" as CellTone },
            ]
          : undefined,
      };
    }),
    // Appended: the seven drop onto whatever is there.
    ...batch.map((id, k) => ({
      id,
      level: already.includes(id) ? 1 : 0,
      at: holdsAt + k * 2,
      drop: holdsAt + k * 2,
      out: keyAt,
      tones: already.includes(id) ? [{ at: holdsAt + k * 2 + 10, tone: "bad" as CellTone }] : undefined,
    })),
    // Retried: every one of them again.
    ...batch.map((id, k) => ({
      id,
      level: already.includes(id) ? 2 : 1,
      at: retryAt + 4 + k * 2,
      drop: retryAt + 4 + k * 2,
      out: keyAt,
      tones: [{ at: retryAt + 14 + k * 2, tone: "bad" as CellTone }],
    })),
    // Merged on event_id: the three it doesn't have, inserted.
    ...fresh.map((id, k) => ({
      id,
      level: 0,
      at: insertsAt + k * 3,
      drop: insertsAt + k * 3,
      out: mergeOut,
      tones: [{ at: insertsAt + k * 3 + 10, tone: "ok" as CellTone }],
    })),
    // The source sends 27 twice: the same merge inserts both.
    ...fresh.map((id, k) => ({
      id,
      level: 0,
      at: bothAt + k * 3,
      drop: bothAt + k * 3,
      tones: [{ at: bothAt + k * 3 + 10, tone: (id === 27 ? "bad" : "ok") as CellTone }],
    })),
    { id: 27, level: 1, at: bothAt + 10, drop: bothAt + 10, from: row("dup"), tones: [{ at: bothAt + 20, tone: "bad" }] },
  ];

  // ── What each strategy left, run and retried ──────────────────────────────
  const ledgerCols: Col[] = [{ name: "strategy" }, { name: "rows", numeric: true }, { name: "on retry", numeric: true }];
  const S = STRATEGY;
  const ledgerRows: TableRow[] = [
    { cells: ["append", String(S.overlapAppend.first.target), ""], at: holdsAt + 14 },
    { cells: ["merge", String(S.overlapMerge.first.target), ""], at: twentySevenAt },
    { cells: ["delete+insert", String(S.overlapDeleteInsert.first.target), String(S.overlapDeleteInsert.retry.target)], at: deleteAt + 4 },
  ];
  const ledgerG = tableGeometry({
    x: LEDGER_X,
    top: row("config"),
    cols: ledgerCols,
    rows: ledgerRows.map((r) => r.cells),
    extra: [["", String(S.overlapAppend.retry.target), String(S.overlapMerge.retry.target)]],
    headH: 40,
    rowH: 40,
    headSize: 20,
    bodySize: 22,
  });

  const testCols: Col[] = DUP_KEY.test.found.cols.map((c) => ({ name: c, numeric: true }));
  const testRows: TableRow[] = DUP_KEY.test.found.rows.map((r) => ({ cells: r, at: testAt + 10 }));
  const testG = tableGeometry({ x: TEST_X, top: row("bottom") + 44, cols: testCols, rows: testRows.map((r) => r.cells), headH: 36, rowH: 36, headSize: 20, bodySize: 22 });

  const counts = (
    first: number,
    distinct: number,
  ) => (
    <>
      <Num>{first}</Num> rows for <Num>{distinct}</Num> events
    </>
  );

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={tableAt} level={-36} />
      <Sfx name="el-sprinkle" at={readAt} level={-36} />
      <Sfx name="el-tap" at={holdsAt} level={-33} />
      <Sfx name="el-tap" at={retryAt + 4} level={-33} />
      <Sfx name="el-pop" at={keyAt} level={-30} />
      <Sfx name="el-tap" at={insertsAt} level={-33} />
      <Sfx name="el-tap" at={deleteAt + 4} level={-35} />
      <Sfx name="el-tap" at={twiceAt + 6} level={-33} />
      <Sfx name="el-tap" at={bothAt} level={-33} />
      <Sfx name="el-scratch" at={refusesAt} level={-34} />
      <Sfx name="el-pencil" at={testAt + 4} level={-36} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} size={52}>
          What is the <SmallMono>unique_key</SmallMono> config on an incremental model, and what does it control?
        </QuestionCard>
        <Note at={tellsAt} x={X0} y={row("answer")}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            For a strategy that updates or replaces rows:
            <span style={{ opacity: ease(frame, matchAt, 10) }}> which incoming row is which row already in the table</span>
          </span>
        </Note>

        {/* The config, and the key it names. */}
        <SqlListing
          lines={CONFIG.map((l): ListingLine =>
            l === CONFIG_LINE
              ? // "Without it": the append run's config has no key; "Set the
                // unique key" puts it back.
                { text: l, swaps: [{ at: appendedAt, text: l.replace(KEY_SETTING, "") }, { at: keyAt, text: l }] }
              : l,
          )}
          x={X0}
          top={row("config")}
          width={720}
          size={19}
          at={matchAt}
          marks={[{ line: "unique_key", text: "unique_key='event_id'", at: keyAt + 4 }]}
        />
        <Spot art="key" at={keyAt} left={940} top={row("spot")} width={150} />

        {/* The three strategies' results. */}
        <DataTable
          g={ledgerG}
          cols={ledgerCols}
          rows={ledgerRows}
          at={holdsAt + 10}
          swaps={[
            { row: 0, col: 2, at: thirtyEightAt, value: String(S.overlapAppend.retry.target) },
            { row: 1, col: 2, at: againAt, value: String(S.overlapMerge.retry.target) },
          ]}
          marks={[
            { row: 0, col: 1, at: holdsAt + 18, color: MARK_BAD },
            { row: 0, col: 2, at: thirtyEightAt + 4, color: MARK_BAD },
            { row: 1, col: 1, at: twentySevenAt + 4, color: MARK_OK },
            { row: 1, col: 2, at: againAt + 4, color: MARK_OK },
            { row: 2, col: 1, at: tooAt, color: MARK_OK },
            { row: 2, col: 2, at: tooAt + 4, color: MARK_OK },
          ]}
        />

        {/* Which strategy the run below is. */}
        <Count
          x={X0}
          y={row("dup") + 4}
          at={appendedAt}
          size={23}
          steps={[
            { at: appendedAt, text: <>No key: <b>append</b></>, color: INK },
            { at: keyAt, text: <>Keyed on <span style={{ fontFamily: MONO, fontSize: "0.92em" }}>event_id</span>: <b>merge</b></>, color: INK },
            { at: twiceAt, text: <>The same <b>merge</b>, a duplicate in the batch</>, color: INK },
          ]}
        />

        {/* The run's batch: the overlap window, seven rows. */}
        <Note at={readAt} x={X0} y={BATCH + 6}>
          <span style={{ fontFamily: MONO, fontSize: 21, fontWeight: 500, color: INK, whiteSpace: "nowrap" }}>batch</span>
        </Note>
        {batch.map((id, k) => (
          <Cell
            key={`b${id}`}
            x={X(id)}
            y={BATCH}
            at={readAt + k * 2}
            label={id}
            tones={already.includes(id) ? [{ at: fourAt, tone: "look" }, { at: holdsAt, tone: "plain" }] : []}
          />
        ))}
        <Cell x={X(27)} y={row("dup")} at={twiceAt + 6} label={27} tones={[{ at: twiceAt + 6, tone: "bad" }]} />
        <Note at={readAt + 6} x={X(27) + 44} y={BATCH + 6} out={twiceAt - 4}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            <Num>{batch.length}</Num> read
            <span style={{ opacity: ease(frame, fourAt, 10) }}>
              , <Num>{already.length}</Num> already loaded
            </span>
          </span>
        </Note>
        <Note at={twiceAt + 8} x={X(27) + 44} y={row("dup") + 6}>
          <span style={{ ...note(22, ACCENT_INK), whiteSpace: "nowrap" }}>27, sent twice</span>
        </Note>

        {/* fct_events. */}
        <Note at={tableAt} x={X0} y={BASE + 6}>
          <span style={{ fontFamily: MONO, fontSize: 21, fontWeight: 500, color: INK, whiteSpace: "nowrap" }}>fct_events</span>
        </Note>
        {copies.map((c, k) => {
          const p = c.drop === undefined ? 1 : ease(frame, c.drop, 14);
          const top = (c.from ?? BATCH) + (level(c.level) - (c.from ?? BATCH)) * p;
          return <Cell key={`c${k}`} x={X(c.id)} y={top} at={c.at} out={c.out} label={c.id} tones={c.tones} />;
        })}
        <Count
          x={X(27) + 44}
          y={BASE + 6}
          at={tableAt + 20}
          size={22}
          steps={[
            { at: tableAt, text: <><Num>{loadedBefore}</Num> rows</> },
            { at: holdsAt + 12, text: counts(S.overlapAppend.first.target, S.overlapAppend.first.distinct), color: ACCENT_INK },
            { at: thirtyEightAt, text: counts(S.overlapAppend.retry.target, S.overlapAppend.retry.distinct), color: ACCENT_INK },
            { at: keyAt, text: <><Num>{loadedBefore}</Num> rows</> },
            { at: twentySevenAt, text: counts(S.overlapMerge.first.target, S.overlapMerge.first.distinct), color: OK_INK },
            { at: mergeOut, text: <><Num>{loadedBefore}</Num> rows</> },
            { at: bothAt + 22, text: counts(DUP_KEY.first.target, DUP_KEY.first.distinct), color: ACCENT_INK },
          ]}
        />
        <Note at={noErrorAt} x={X(27) + 44} y={BASE + 40}>
          <span style={{ ...note(22, ACCENT_INK), whiteSpace: "nowrap" }}>and no error</span>
        </Note>
        <Note at={uncheckedAt} x={X0} y={row("bottom")} out={nextRunAt - 4}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <span style={{ fontFamily: MONO, fontSize: "0.92em", fontWeight: 500 }}>unique_key</span> is a match rule, not a check
          </span>
        </Note>

        {/* The next run, and the test that would have caught it. */}
        <Note at={nextRunAt} x={X0} y={row("bottom")}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>The next run&apos;s merge</span>
        </Note>
        <PgError x={X0} top={row("bottom") + 40} width={760} at={refusesAt} message={DUP_KEY.error} size={20} />
        <Note at={testAt} x={TEST_X} y={row("bottom")}>
          <span style={{ ...label(21, INK), whiteSpace: "nowrap" }}>
            A <span style={{ fontFamily: MONO, fontSize: "0.92em", fontWeight: 500, color: OK_INK }}>unique</span> test on <span style={{ fontFamily: MONO, fontSize: "0.92em", fontWeight: 500 }}>event_id</span> finds it
          </span>
        </Note>
        <DataTable g={testG} cols={testCols} rows={testRows} at={testAt + 6} marks={[{ row: 0, col: 0, at: testAt + 18, color: MARK_BAD }]} />
      </Drift>
    </AbsoluteFill>
  );
};
