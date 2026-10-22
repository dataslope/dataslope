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
import { colsOf, DataTable, Drift, ErrorBox, geoOf, Listing, listingHeight, MARK_BAD, MARK_OK, OK_INK, rowsAt, Strike, X0 } from "./parts";

const TOP = 340;
const PG_SIZE = 20;
const DUCK_X = 960;
const DUCK_SIZE = 18;

/**
 * Question 3, on the page's funnel. Its first six variants, two with no
 * sessions; the bare division in Postgres, refused with "division by zero";
 * the page's NULLIF query in DuckDB, C and F coming back null (and why a
 * COALESCE to zero would lie); then integer division in Postgres, 0 for A
 * and B until the * 1.0.
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
  const zeroAt = n.word("rate-int", "is zero");
  const multAt = n.word("rate-int", "Multiply by one point oh first");
  const twelveAt = n.word("rate-int", "point one two");
  const end = n.beat("cohort-in").to;

  // ── DuckDB, right: the page's query and its first six variants ──
  const S = RATE.safe;
  const rate = S.cols.indexOf("conversion_rate");
  const sessions = S.cols.indexOf("sessions");
  const empty = S.rows.flatMap((r, i) => (Number(r[sessions]) === 0 ? [i] : []));
  const sTop = y(TOP) + h(40) + listingHeight(S.lines.length, DUCK_SIZE) + h(18);
  const sg = geoOf(S, DUCK_X, sTop, h, { rowH: 38, headH: 40, bodySize: 22, headSize: 19 });

  // ── Postgres, left: the bare division, then integer division ──
  const pgTop = y(TOP) + h(40);
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

        {/* ── Right: DuckDB ── */}
        <div style={{ position: "absolute", left: DUCK_X, top: y(TOP), ...label(21, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, fourAt - 4, 12) }}>
          The page&rsquo;s funnel, in DuckDB: {RATE.noSessions} of {RATE.variants} variants have no sessions
        </div>
        <Listing
          lines={S.lines}
          x={DUCK_X}
          top={y(TOP) + h(40)}
          width={840}
          size={DUCK_SIZE}
          at={wrapAt - 4}
          marks={[{ line: 4, at: wrapAt + 6, color: MARK_OK }]}
        />
        <DataTable
          g={sg}
          cols={colsOf(S, { conversion_rate: { at: nullAt, ink: BLUE_INK } })}
          at={fourAt - 2}
          rows={rowsAt(S.rows, fourAt + 2)}
          marks={[
            ...empty.map((row, k) => ({ row, col: sessions, at: fourAt + 14 + k * 4, out: wrapAt, color: MARK_BAD })),
            ...empty.map((row, k) => ({ row, col: rate, at: cAt + 4 + k * 4, color: MARK_OK })),
          ]}
        />
        <Note at={duckAt} x={DUCK_X} y={sg.rowTop(S.rows.length) + h(12)} out={intAt}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            DuckDB&rsquo;s bare <QMono>0 / 0</QMono> is already null; <QMono>NULLIF</QMono> is the habit that travels
          </span>
        </Note>

        {/* ── Left: Postgres ── */}
        <div style={{ position: "absolute", left: X0, top: y(TOP), ...label(21, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, pgAt - 4, 12) }}>
          The same table, in {RATE.pgVersion.startsWith("PostgreSQL") ? RATE.pgVersion : `Postgres ${RATE.pgVersion}`}
        </div>
        <Listing lines={RATE.pgBare.lines} x={X0} top={pgTop} width={640} size={PG_SIZE} at={pgAt - 2} out={intAt} marks={[{ line: 0, at: pgAt + 8 }]} />
        <ErrorBox
          x={X0}
          top={pgTop + listingHeight(RATE.pgBare.lines.length, PG_SIZE) + h(18)}
          width={640}
          at={errorAt - 2}
          out={intAt}
          kind={RATE.pgBare.kind}
          message={RATE.pgBare.message}
          size={22}
        />
        <Note at={coalesceAt} x={X0} y={pgTop + h(250)} out={intAt}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <Strike at={coalesceAt + 10}>
              <QMono>COALESCE(rate, 0)</QMono>
            </Strike>
            <span style={{ color: ACCENT_INK }}> &nbsp;C has no rate, not a rate of 0</span>
          </span>
        </Note>

        <Listing lines={T.lines} x={X0} top={pgTop} width={640} size={PG_SIZE} at={intAt + 2} marks={[{ line: 0, at: zeroAt - 6 }]} />
        <DataTable
          g={tg}
          cols={colsOf(T, { rate: { ink: BLUE_INK } })}
          at={intAt + 6}
          rows={rowsAt(T.rows, intAt + 10, 3)}
          marks={T.rows.map((_, row) => ({ row, col: 1, at: zeroAt + row * 3, out: multAt + 6, color: MARK_BAD }))}
          swaps={T.rows.map((_, row) => ({ row, col: 1, at: multAt + 10 + row * 3, value: fixedA[row], color: MARK_OK }))}
        />
        <Note at={multAt} x={tg.right + 28} y={tg.rowTop(0)}>
          <span style={{ ...note(26, OK_INK), whiteSpace: "nowrap" }}>
            <QMono>conversions * 1.0 / …</QMono>
          </span>
        </Note>
        <Note at={zeroAt + 2} x={tg.right + 28} y={tg.rowTop(1) + h(8)} out={multAt}>
          <span style={{ ...note(24, ACCENT_INK), whiteSpace: "nowrap" }}>120 / 1000 truncates to 0</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};

