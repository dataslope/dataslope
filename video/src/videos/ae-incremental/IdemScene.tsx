import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK_INK, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { ColumnRule, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { REBUILD } from "./data";
import { Cell, type Col, Count, DataTable, Drift, Mark, MARK_RED, PgError, SqlListing, tableGeometry, type TableRow, X0 } from "./parts";

/** The page's rebuild, one statement to a step, as it runs (the final SELECT,
 *  which only shows the table, is the result tables on the right). */
const BLOCK = REBUILD.block.slice(0, -1).flatMap((stmt) => stmt.split("\n"));
const SIZE = 19;
const TABLE_X = [840, 1200];
/** Layout values (through `y()`). */
const ROW_C = { def: 236, why: 276, fig: 330, blindRows: 378, failLabel: 627, fail: 661, back: 717, two: 778 };

/**
 * Question 5. Idempotent: run it again, the same result; it matters because
 * pipelines retry. The page's customer_events loaded into dim_customer by a
 * blind INSERT, run twice: 12 rows, then 24. The page's rebuild instead, its
 * transaction marked (Postgres has no CREATE OR REPLACE TABLE), run twice:
 * two 12-row results, one fingerprint. A rebuild whose CREATE fails after
 * the DROP rolls back, and the old table is there, 12 rows. Then the two
 * routes, side by side: rebuild while small, merge on a key once it isn't.
 */
export const IdemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("idem").from;
  const qAt = n.word("idem", "Question five");
  const textAt = n.word("idem", "What is an idempotent rebuild");
  const meansAt = n.word("idem", "Idempotent means");
  const sameAt = n.word("idem", "the same result");
  const retryAt = n.word("idem", "pipelines retry");
  const crashAt = n.word("idem", "a job that crashes after writing");

  const blindAt = n.word("idem-blind", "Load the page's customer dimension");
  const insertAt = n.word("idem-blind", "with a blind insert");
  const doublesAt = n.word("idem-blind", "a retry doubles it");
  const twelveAt = n.word("idem-blind", "twelve customers");
  const twentyFourAt = n.word("idem-blind", "twenty-four rows");

  const rebuildAt = n.word("idem-rebuild", "Rebuild it from the source");
  const noReplaceAt = n.word("idem-rebuild", "Postgres has no create or replace table");
  const dropsAt = n.word("idem-rebuild", "drops and recreates it");
  const txnAt = n.word("idem-rebuild", "inside one transaction");
  const twiceAt = n.word("idem-rebuild", "Run it twice");
  const identicalAt = n.word("idem-rebuild", "identical");

  const failAt = n.word("idem-fail", "if a rebuild fails after the drop");
  const rollsAt = n.word("idem-fail", "the transaction rolls back");
  const stillAt = n.word("idem-fail", "the old table is still there");
  const allAt = n.word("idem-fail", "all twelve rows");

  const routesAt = n.word("idem-two", "Those are the two routes");
  const smallAt = n.word("idem-two", "Rebuild from the source");
  const mergeAt = n.word("idem-two", "merge on a key");
  const end = n.beat("idem-two").to;

  const row = (k: keyof typeof ROW_C) => y(ROW_C[k]);
  const blindOut = rebuildAt - 6;

  // ── The blind insert: twelve customers, then twelve again ─────────────────
  const ids = REBUILD.first.rows.map((r) => Number(r[0]));
  const CX = (i: number) => 330 + i * 46;

  // ── The rebuild's two results ─────────────────────────────────────────────
  const asDate = (rows: string[][]) => rows.map((r) => [r[0], r[1].slice(0, 10)]);
  const cols: Col[] = [{ name: "customer_id", numeric: true }, { name: "updated_at" }];
  const results = [REBUILD.first, REBUILD.second].map((r, k) => {
    const cells = asDate(r.rows);
    const at = k === 0 ? dropsAt + 20 : twiceAt + 6;
    const rows: TableRow[] = cells.map((c, i) => ({ cells: c, at: at + 4 + i * 1.2 }));
    const g = tableGeometry({ x: TABLE_X[k], top: row("fig") + 40, cols, rows: cells, headH: 34, rowH: 26, headSize: 19, bodySize: 19, pad: 14 });
    return { at, rows, g };
  });
  const fingerprintTop = results[0].g.rowTop(ids.length) + 22;

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={insertAt} level={-36} />
      <Sfx name="el-sprinkle" at={doublesAt + 4} level={-35} />
      <Sfx name="el-pencil" at={rebuildAt} level={-37} />
      <Sfx name="el-sprinkle" at={results[0].at + 4} level={-37} />
      <Sfx name="el-sprinkle" at={results[1].at + 4} level={-37} />
      <Sfx name="el-chime" at={identicalAt} level={-33} />
      <Sfx name="el-scratch" at={failAt + 6} level={-35} />
      <Sfx name="el-tap" at={stillAt} level={-33} />
      <Sfx name="el-pencil" at={routesAt} level={-37} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} size={56}>
          What is an idempotent rebuild, and why does it matter?
        </QuestionCard>
        <Note at={meansAt - 2} x={X0} y={row("def")}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            Idempotent: run the build again, get <Mark at={sameAt}>the same result</Mark>
          </span>
        </Note>
        <Note at={retryAt - 2} x={X0} y={row("why")}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
            Pipelines retry
            <span style={{ opacity: ease(frame, crashAt, 10) }}>: a job that crashed after writing runs again</span>
          </span>
        </Note>

        {/* ── A blind insert, retried ── */}
        <Note at={blindAt} x={X0} y={row("fig")} out={blindOut}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>
            The page&apos;s <span style={{ fontFamily: MONO, fontSize: "0.92em", fontWeight: 500 }}>customer_events</span> into{" "}
            <span style={{ fontFamily: MONO, fontSize: "0.92em", fontWeight: 500 }}>dim_customer</span>
            <span style={{ opacity: ease(frame, insertAt, 10) }}>, by a blind INSERT</span>
          </span>
        </Note>
        {[0, 1].map((run) => (
          <React.Fragment key={run}>
            <Note at={run === 0 ? insertAt : doublesAt} x={X0} y={row("blindRows") + run * 50 + 6} out={blindOut}>
              <span style={{ ...note(21, run ? ACCENT_INK : INK_SOFT), whiteSpace: "nowrap" }}>{run ? "Retry" : "Run"}</span>
            </Note>
            {ids.map((id, i) => (
              <Cell
                key={`${run}-${id}`}
                x={CX(i)}
                y={row("blindRows") + run * 50}
                at={(run === 0 ? insertAt + 4 : doublesAt + 4) + i * 1.2}
                out={blindOut}
                label={id}
                tones={run ? [{ at: doublesAt + 18, tone: "bad" }] : []}
              />
            ))}
          </React.Fragment>
        ))}
        <Count
          x={CX(ids.length - 1) + 50}
          y={row("blindRows") + 6}
          at={twelveAt}
          out={blindOut}
          size={24}
          steps={[
            { at: twelveAt, text: <><Num>{REBUILD.blind[0]}</Num> rows</>, color: INK },
            { at: twentyFourAt, text: <><Num>{REBUILD.blind[1]}</Num> rows for <Num>{REBUILD.customers}</Num> customers</>, color: ACCENT_INK },
          ]}
        />

        {/* ── The page's rebuild, twice ── */}
        <Note at={rebuildAt} x={X0} y={row("fig")}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>
            Rebuilt from the source
            <span style={{ color: INK_SOFT, opacity: ease(frame, noReplaceAt, 10) }}>, in one transaction</span>
          </span>
        </Note>
        <SqlListing
          lines={BLOCK}
          x={X0}
          top={row("fig") + 40}
          width={620}
          size={SIZE}
          at={rebuildAt + 2}
          step={2}
          marks={[
            { line: "BEGIN;", at: txnAt, out: failAt },
            { line: "COMMIT;", at: txnAt + 4, out: failAt },
            { line: "DROP TABLE", at: dropsAt, out: txnAt },
            { line: "CREATE TABLE", at: dropsAt + 8, out: txnAt },
            { line: "CREATE TABLE", at: failAt + 4, out: routesAt, color: MARK_RED },
          ]}
        />
        {results.map((r, k) => (
          <React.Fragment key={k}>
            <Note at={r.at} x={TABLE_X[k]} y={row("fig")}>
              <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>{k === 0 ? "Run" : "Run again"}</span>
            </Note>
            <DataTable g={r.g} cols={cols} rows={r.rows} at={r.at} />
          </React.Fragment>
        ))}
        <ColumnRule x={(results[0].g.right + TABLE_X[1]) / 2} top={row("fig")} height={results[0].g.rowTop(ids.length) - row("fig")} at={results[1].at} />
        <Note at={identicalAt - 4} x={TABLE_X[0]} y={fingerprintTop}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            <Num>{REBUILD.customers}</Num> rows each, one md5 fingerprint:{" "}
            <b style={{ color: REBUILD.identical ? OK_INK : ACCENT_INK }}>{REBUILD.identical ? "identical" : "different"}</b>
          </span>
        </Note>

        {/* ── A rebuild that fails after its DROP ── */}
        <Note at={failAt} x={X0} y={row("failLabel")} out={routesAt - 4}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>A rebuild whose CREATE fails, after the DROP</span>
        </Note>
        <PgError x={X0} top={row("fail")} width={680} at={failAt + 6} out={routesAt - 4} message={REBUILD.failError} size={19} />
        <Note at={rollsAt} x={X0} y={row("back")} out={routesAt - 4}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            <span style={{ fontFamily: MONO, fontSize: "0.92em", fontWeight: 500 }}>ROLLBACK</span>
            <span style={{ opacity: ease(frame, stillAt, 10) }}>
              : <span style={{ fontFamily: MONO, fontSize: "0.92em", fontWeight: 500 }}>dim_customer</span> is still there
            </span>
            <b style={{ color: OK_INK, opacity: ease(frame, allAt, 10) }}>
              , <Num>{REBUILD.rowsAfterFail}</Num> rows{REBUILD.rolledBack ? ", the same fingerprint" : ""}
            </b>
          </span>
        </Note>

        {/* ── The two routes ── */}
        <Note at={smallAt - 2} x={X0} y={row("two")}>
          <div style={{ ...note(26, INK), fontWeight: 600, whiteSpace: "nowrap" }}>Rebuild from the source</div>
          <div style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap", marginTop: 8 }}>while the table is small enough</div>
        </Note>
        <ColumnRule x={760} top={row("two")} height={74} at={mergeAt - 2} />
        <Note at={mergeAt - 2} x={800} y={row("two")}>
          <div style={{ ...note(26, INK), fontWeight: 600, whiteSpace: "nowrap" }}>
            Merge on a key
          </div>
          <div style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap", marginTop: 8 }}>once it isn&apos;t</div>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
