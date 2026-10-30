import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { RATE } from "./data";
import { colsOf, DataTable, Drift, ErrorBox, geoOf, lineOf, Listing, listingHeight, MARK_BAD, MARK_OK, OK_INK, rowsAt, Strike, X0 } from "./parts";

const TOP = 330;
const PG_SIZE = 20;
const DATA_X = 960;
const DUCK_SIZE = 19;
/** The compact result rows both panels use. */
const ROWS = { rowH: 36, headH: 38, bodySize: 22, headSize: 19 } as const;

/**
 * Question 3, on the page's funnel. Right: its first six variants as data,
 * two with no sessions. Left, in Postgres: the bare division, refused with
 * "division by zero"; then the same query with NULLIF, where the error was,
 * and its result with C and F null (and why a COALESCE to zero would lie).
 * Right again, as the narration names DuckDB: its bare division already
 * returns null, so NULLIF is the portable habit rather than DuckDB's need.
 * Then integer division in Postgres, 0 for A and B until the * 1.0.
 */
export const RateScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("rate").from;
  const qAt = n.word("rate", "Question");
  const textAt = n.word("rate", "How do you compute a rate");
  const fourAt = n.word("rate", "Four variants");
  const pgAt = n.word("rate", "In Postgres, dividing by that zero");
  const errorAt = n.word("rate", "is an error");
  const wrapAt = n.word("rate-nullif", "Wrap the denominator");
  const nullAt = n.word("rate-nullif", "turns a zero into a null");
  const cAt = n.word("rate-nullif", "variant C gets a null rate");
  const duckAt = n.word("rate-nullif", "DuckDB returns null there anyway");
  const coalesceAt = n.word("rate-nullif", "don't patch it with coalesce");
  const intAt = n.word("rate-int", "Then watch integer division");
  const aAt = n.word("rate-int", "a hundred twenty conversions");
  const thousandAt = n.word("rate-int", "a thousand sessions");
  const zeroAt = n.word("rate-int", "is zero");
  const multAt = n.word("rate-int", "Multiply by one point oh first");
  const twelveAt = n.word("rate-int", "point one two");
  const end = n.beat("cohort-in").to;

  // ── Right: the page's funnel, its first six variants ──
  const F = RATE.funnel;
  const sessions = F.cols.indexOf("sessions");
  const conversions = F.cols.indexOf("conversions");
  const empty = F.rows.flatMap((r, i) => (Number(r[sessions]) === 0 ? [i] : []));
  const fg = geoOf(F, DATA_X, y(TOP) + h(40), h, ROWS);

  // ── Right, later: DuckDB's bare division on C and F ──
  const D = RATE.duckBare;
  const duckLabelY = fg.rowTop(F.rows.length) + h(28);
  const duckTop = duckLabelY + h(36);
  const duckW = 570;
  const dg = geoOf(D, DATA_X + duckW + 24, duckTop, h, ROWS);

  // ── Left: Postgres, the bare division, then NULLIF where the error was ──
  const pgTop = y(TOP) + h(40);
  const P = RATE.pgFixed;
  const pRate = P.cols.indexOf("rate");
  const pNulls = P.rows.flatMap((r, i) => (r[pRate] === "null" ? [i] : []));
  const pg = geoOf(P, X0, pgTop + listingHeight(P.lines.length, PG_SIZE) + h(18), h, ROWS);

  // ── Left, last: integer division ──
  const T = RATE.pgTruncated;
  const tTop = pgTop + listingHeight(T.lines.length, PG_SIZE) + h(18);
  const tg = geoOf(T, X0, tTop, h, { rowH: 42, extra: RATE.pgFixed.rows.slice(0, 2) });
  const fixedA = RATE.pgFixed.rows.map((r) => r[1]);

  return (
    <AbsoluteFill>
      <Sfx name="el-scratch" at={errorAt + 2} level={-32} />
      <Sfx name="el-pencil" at={wrapAt + 6} level={-34} />
      <Sfx name="el-pop" at={cAt + 4} level={-32} />
      <Sfx name="el-scratch" at={zeroAt + 2} level={-32} />
      <Sfx name="el-pop" at={twelveAt} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} size={60}>
          How do you compute a rate without dividing by zero?
        </QuestionCard>

        {/* ── Right: the data ── */}
        <div style={{ position: "absolute", left: DATA_X, top: y(TOP), ...label(21, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, fourAt - 4, 12) }}>
          The page&rsquo;s funnel: {RATE.noSessions} of {RATE.variants} variants have no sessions
        </div>
        <DataTable
          g={fg}
          cols={colsOf(F, { sessions: { ink: BLUE_INK }, conversions: { ink: BLUE_INK } })}
          at={fourAt - 2}
          rows={rowsAt(F.rows, fourAt + 2)}
          marks={[
            ...empty.map((row, k) => ({ row, col: sessions, at: fourAt + 14 + k * 4, out: intAt, color: MARK_BAD })),
            { row: 0, col: conversions, at: aAt + 2 },
            { row: 0, col: sessions, at: thousandAt + 2 },
          ]}
        />

        {/* ── Right: DuckDB, once the narration names it ── */}
        <Note at={duckAt - 2} x={DATA_X} y={duckLabelY} out={intAt}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            In DuckDB, with no <QMono>NULLIF</QMono>:
          </span>
        </Note>
        <Listing lines={D.lines} x={DATA_X} top={duckTop} width={duckW} size={DUCK_SIZE} at={duckAt} out={intAt} marks={[{ line: 0, at: duckAt + 10 }]} />
        <DataTable
          g={dg}
          cols={colsOf(D, { rate: { ink: BLUE_INK } })}
          at={duckAt + 8}
          out={intAt}
          rows={rowsAt(D.rows, duckAt + 12, 3)}
          marks={D.rows.map((_, row) => ({ row, col: 1, at: duckAt + 22 + row * 3, color: MARK_OK }))}
        />
        <Note at={duckAt + 24} x={DATA_X} y={duckTop + listingHeight(D.lines.length, DUCK_SIZE) + h(16)} out={intAt}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            null already: <QMono>NULLIF</QMono> is the habit that travels
          </span>
        </Note>

        {/* ── Left: Postgres ── */}
        <div style={{ position: "absolute", left: X0, top: y(TOP), ...label(21, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, pgAt - 4, 12) }}>
          The same table, in {RATE.pgVersion.startsWith("PostgreSQL") ? RATE.pgVersion : `Postgres ${RATE.pgVersion}`}
        </div>
        <Listing lines={RATE.pgBare.lines} x={X0} top={pgTop} width={640} size={PG_SIZE} at={pgAt - 2} out={wrapAt - 2} marks={[{ line: 0, at: pgAt + 8 }]} />
        <ErrorBox
          x={X0}
          top={pgTop + listingHeight(RATE.pgBare.lines.length, PG_SIZE) + h(18)}
          width={640}
          at={errorAt - 2}
          out={wrapAt - 2}
          kind={RATE.pgBare.kind}
          message={RATE.pgBare.message}
          size={22}
        />
        {/* The fix, where the error was: NULLIF, and the query runs. */}
        <Listing
          lines={P.lines}
          x={X0}
          top={pgTop}
          width={760}
          size={PG_SIZE}
          at={wrapAt}
          out={intAt}
          marks={[{ line: lineOf(P.lines, "NULLIF"), at: wrapAt + 8, color: MARK_OK }]}
        />
        <DataTable
          g={pg}
          cols={colsOf(P, { rate: { ink: BLUE_INK } })}
          at={nullAt - 2}
          out={intAt}
          rows={rowsAt(P.rows, nullAt + 2)}
          marks={pNulls.map((row, k) => ({ row, col: pRate, at: cAt + 4 + k * 4, color: MARK_OK }))}
        />
        <Note at={coalesceAt} x={pg.right + 40} y={pg.rowTop(2)} out={intAt}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <Strike at={coalesceAt + 10} top="0.68em">
              <QMono>COALESCE(rate, 0)</QMono>
            </Strike>
            <br />
            <span style={{ color: ACCENT_INK }}>C has no rate, not a rate of 0</span>
          </span>
        </Note>

        <Listing lines={T.lines} x={X0} top={pgTop} width={640} size={PG_SIZE} at={intAt + 2} marks={[{ line: 0, at: zeroAt - 6 }]} />
        <DataTable
          g={tg}
          cols={colsOf(T, { rate: { ink: BLUE_INK } })}
          at={intAt + 6}
          rows={rowsAt(T.rows, intAt + 10, 3)}
          marks={T.rows.map((_, row) => ({ row, col: 1, at: zeroAt + row * 3, out: twelveAt, color: MARK_BAD }))}
          // A swap's color is the new value's ink, so it takes OK_INK: the
          // 24%-alpha MARK_OK band color left 0.1200 barely readable. The new
          // value lands as the narration says it.
          swaps={T.rows.map((_, row) => ({ row, col: 1, at: twelveAt + row * 3, value: fixedA[row], color: OK_INK }))}
        />
        <Note at={multAt} x={tg.right + 28} y={tg.rowTop(0)}>
          <span style={{ ...note(26, OK_INK), whiteSpace: "nowrap" }}>
            <QMono>conversions * 1.0 / …</QMono>
          </span>
        </Note>
        <Note at={zeroAt + 2} x={tg.right + 28} y={tg.rowTop(1) + h(8)} out={twelveAt}>
          <span style={{ ...note(24, ACCENT_INK), whiteSpace: "nowrap" }}>120 / 1000 truncates to 0</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};

