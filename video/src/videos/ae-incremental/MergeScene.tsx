import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK_INK, QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { MERGE, PAGE_MERGE } from "./data";
import { type Col, Count, DataTable, Drift, MARK, MARK_BAD, MARK_OK, SqlListing, tableGeometry, TableName, type TableRow, X0 } from "./parts";

const SIZE = 19;
const STAGED_X = X0;
const DIM_X = 640;
const BLIND_X = 1200;
const NOTE_X = 1010;
/** Layout values (through `y()`). */
const ROW_C = { listing: 248, dbt: 262, tables: 520 };

/** A timestamp as a date: every one here is midnight. */
const day = (rows: string[][], col: number) => rows.map((r) => r.map((v, j) => (j === col ? v.slice(0, 10) : v)));

/**
 * Question 6. The page's MERGE: matched on the key (ON), a match updates, no
 * match inserts. On the video's own rows, staged_customers (Ben renamed
 * Benedict, Dee new) merged into dim_customer (Ada, Ben, Cy): Ben updated,
 * Dee inserted, four rows; merged again, both matched, nothing inserted,
 * the same four. The same batch inserted blindly, twice: seven rows. Then
 * where dbt runs it (a merge-style strategy keyed on unique_key, which one
 * depending on the adapter), and what it cannot do: a row deleted at the
 * source never reaches the batch, so the target keeps it.
 */
export const MergeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("merge").from;
  const qAt = n.word("merge", "Question six");
  const textAt = n.word("merge", "How does a merge");
  const matchesAt = n.word("merge", "It matches each staged row");
  const keyAt = n.word("merge", "on a key");
  const updatesAt = n.word("merge", "A match updates");
  const insertsAt = n.word("merge", "no match inserts");

  const hereAt = n.word("merge-run", "Here Ben has a new name");
  const deeAt = n.word("merge-run", "Dee is new");
  const firstAt = n.word("merge-run", "The first merge updates Ben");
  const insertsDeeAt = n.word("merge-run", "inserts Dee");
  const fourAt = n.word("merge-run", "four customers");

  const againAt = n.word("merge-rerun", "Run the same batch again");
  const bothAt = n.word("merge-rerun", "it matches both");
  const nothingAt = n.word("merge-rerun", "inserts nothing");
  const stillAt = n.word("merge-rerun", "still four");
  const blindAt = n.word("merge-rerun", "A blind insert of that batch");
  const twiceAt = n.word("merge-rerun", "twice");
  const sevenAt = n.word("merge-rerun", "seven rows");

  const dbtAt = n.word("merge-dbt", "a merge-style incremental strategy");
  const uniqueAt = n.word("merge-dbt", "keyed on the unique key");
  const adapterAt = n.word("merge-dbt", "depends on the adapter");

  const deleteAt = n.word("merge-delete", "What a merge can't do is delete");
  const removedAt = n.word("merge-delete", "A row removed from the source");
  const batchAt = n.word("merge-delete", "never reaches the batch");
  const keepsAt = n.word("merge-delete", "the target keeps it");
  const end = n.beat("merge-delete").to;

  const row = (k: keyof typeof ROW_C) => y(ROW_C[k]);
  const top = row("tables");

  // ── The tables ────────────────────────────────────────────────────────────
  const cols: Col[] = [{ name: "customer_id", numeric: true }, { name: "name" }, { name: "updated_at" }];
  const staged = day(MERGE.staged.rows, 2);
  const before = day(MERGE.before.rows, 2);
  const after = day(MERGE.after.rows, 2);
  // Cy's row, deleted at the source: drawn where the batch would carry it.
  const cy = before.find((r) => r[1] === "Cy") ?? before[before.length - 1];
  const stagedRows: TableRow[] = [
    ...staged.map((cells, i) => ({ cells, at: hereAt + 4 + i * 6 })),
    { cells: cy, at: removedAt + 4, strikeAt: batchAt, dimAt: batchAt + 10 },
  ];
  const stagedG = tableGeometry({ x: STAGED_X, top, cols, rows: stagedRows.map((r) => r.cells), headH: 36, rowH: 34, headSize: 20, bodySize: 21, pad: 16 });
  const benRow = before.findIndex((r) => r[0] === "2");
  const cyRow = before.indexOf(cy);
  const dimRows: TableRow[] = [
    ...before.map((cells, i) => ({ cells, at: hereAt + i * 3 })),
    { cells: after[after.length - 1], at: insertsDeeAt + 4, grow: true },
  ];
  const dimG = tableGeometry({ x: DIM_X, top, cols, rows: dimRows.map((r) => r.cells), extra: after, headH: 36, rowH: 34, headSize: 20, bodySize: 21, pad: 16 });
  const blindCols: Col[] = MERGE.blind.cols.map((c) => ({ name: c, numeric: c === "customer_id" }));
  const blindRows: TableRow[] = MERGE.blind.rows.map((cells, i) => ({ cells, at: blindAt + 6 + i * 3 }));
  const blindG = tableGeometry({ x: BLIND_X, top, cols: blindCols, rows: MERGE.blind.rows, headH: 36, rowH: 34, headSize: 20, bodySize: 21, pad: 16 });
  // Rows a blind insert holds more than once.
  const repeated = MERGE.blind.rows.map((r, i) => ({ i, id: r[0] })).filter(({ id }) => MERGE.blind.rows.filter((r) => r[0] === id).length > 1);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={matchesAt} level={-37} />
      <Sfx name="el-tap" at={hereAt + 4} level={-35} />
      <Sfx name="el-tap" at={firstAt + 8} level={-33} />
      <Sfx name="el-tap" at={insertsDeeAt + 4} level={-33} />
      <Sfx name="el-pencil" at={bothAt} level={-37} />
      <Sfx name="el-sprinkle" at={blindAt + 6} level={-35} />
      <Sfx name="el-pencil" at={dbtAt} level={-37} />
      <Sfx name="el-scratch" at={batchAt} level={-35} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} size={56}>
          How does a <QMono>MERGE</QMono> support idempotent upserts?
        </QuestionCard>

        {/* The page's MERGE. */}
        <SqlListing
          lines={PAGE_MERGE}
          x={X0}
          top={row("listing")}
          width={840}
          size={SIZE}
          at={matchesAt - 4}
          step={2}
          marks={[
            { line: "ON t.customer_id", at: keyAt, out: hereAt },
            { line: "WHEN MATCHED", at: updatesAt, out: hereAt },
            { line: "WHEN NOT MATCHED", at: insertsAt, out: hereAt },
            { line: "VALUES (", at: insertsAt + 4, out: hereAt },
            { line: "WHEN MATCHED", at: firstAt, out: againAt, color: MARK_OK },
            { line: "WHEN NOT MATCHED", at: insertsDeeAt, out: againAt, color: MARK_OK },
            { line: "VALUES (", at: insertsDeeAt + 4, out: againAt, color: MARK_OK },
            { line: "WHEN MATCHED", at: bothAt, out: blindAt },
          ]}
        />

        {/* Where dbt runs it. */}
        <Note at={dbtAt} x={NOTE_X} y={row("dbt")}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            A merge-style incremental strategy runs it
            <span style={{ opacity: ease(frame, uniqueAt, 10) }}>
              , keyed on <span style={{ fontFamily: MONO, fontSize: "0.92em", fontWeight: 500 }}>unique_key</span>
            </span>
          </span>
        </Note>
        <Note at={adapterAt} x={NOTE_X} y={row("dbt") + 44}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>Which strategy you get: the adapter, and your config</span>
        </Note>
        <Note at={deleteAt} x={NOTE_X} y={row("dbt") + 112}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap" }}>A merge can&apos;t delete</span>
        </Note>

        {/* staged_customers: the batch. */}
        <TableName g={stagedG} at={hereAt}>
          <span style={{ fontFamily: MONO, fontSize: 21 }}>staged_customers</span>
        </TableName>
        <DataTable
          g={stagedG}
          cols={cols}
          rows={stagedRows}
          at={hereAt}
          marks={[
            { row: 0, col: 1, at: hereAt + 10, color: MARK, out: firstAt },
            { row: 1, col: 1, at: deeAt, color: MARK, out: insertsDeeAt },
          ]}
        />
        <Note at={removedAt + 8} x={STAGED_X} y={stagedG.rowTop(3) + 10}>
          <span style={{ ...note(21, ACCENT_INK), whiteSpace: "nowrap" }}>
            Deleted at the source
            <span style={{ opacity: ease(frame, batchAt, 10) }}>, so not in the batch</span>
          </span>
        </Note>

        {/* dim_customer: merged into, twice. */}
        <TableName g={dimG} at={hereAt}>
          <span style={{ fontFamily: MONO, fontSize: 21 }}>dim_customer</span>
        </TableName>
        <DataTable
          g={dimG}
          cols={cols}
          rows={dimRows}
          at={hereAt}
          swaps={[
            { row: benRow, col: 1, at: firstAt + 8, value: after[benRow][1] },
            { row: benRow, col: 2, at: firstAt + 12, value: after[benRow][2] },
          ]}
          marks={[
            { row: benRow, col: 1, at: firstAt + 14, color: MARK_OK, out: againAt },
            { row: 3, col: 0, at: insertsDeeAt + 10, color: MARK_OK, out: againAt },
            { row: benRow, col: 1, at: bothAt, color: MARK, out: blindAt },
            { row: 3, col: 1, at: bothAt + 4, color: MARK, out: blindAt },
          ]}
          bands={[{ row: cyRow, at: keepsAt, color: MARK_BAD }]}
        />
        <Count
          x={DIM_X}
          y={dimG.rowTop(4) + 14}
          at={fourAt}
          size={23}
          steps={[
            { at: fourAt, text: <><Num>{MERGE.after.rows.length}</Num> rows</>, color: INK },
            { at: nothingAt, text: <>Again: <Num>{MERGE.touched[1]}</Num> matched, none inserted</>, color: INK },
            { at: stillAt, text: <>Again: still <Num>{MERGE.afterRetry.rows.length}</Num> rows</>, color: OK_INK },
          ]}
        />
        <Note at={keepsAt} x={dimG.right + 18} y={dimG.rowTop(cyRow) + 6}>
          <span style={{ ...note(21, ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap" }}>kept</span>
        </Note>

        {/* The same batch, inserted blindly twice. */}
        <TableName g={blindG} at={blindAt}>
          <span style={{ ...label(21, INK) }}>
            A blind <span style={{ fontFamily: MONO, fontSize: "0.92em" }}>INSERT</span>, <span style={{ opacity: ease(frame, twiceAt, 8) }}>twice</span>
          </span>
        </TableName>
        <DataTable
          g={blindG}
          cols={blindCols}
          rows={blindRows}
          at={blindAt + 2}
          marks={repeated.map(({ i }) => ({ row: i, col: 0, at: sevenAt + 4, color: MARK_BAD }))}
        />
        <Count
          x={BLIND_X}
          y={blindG.rowTop(MERGE.blind.rows.length) + 14}
          at={sevenAt}
          size={23}
          steps={[{ at: sevenAt, text: <><Num>{MERGE.blind.rows.length}</Num> rows for <Num>{MERGE.after.rows.length}</Num> customers</>, color: ACCENT_INK }]}
        />
      </Drift>
    </AbsoluteFill>
  );
};
