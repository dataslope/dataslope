import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BOUNDARY, RATIOS } from "./data";
import { colsOf, DataTable, Drift, geoOf, Listing, listingHeight, MARK, MARK_BAD, MARK_OK, Mono, OK_INK, rowsAt, TableName, X0 } from "./parts";

const TOP = 350;
const LIST_X = 1120;
const LIST_SIZE = 20;
const BAD = `color-mix(in srgb, ${ACCENT_INK} 22%, transparent)`;
/** The averaged-ratio listings, and the results right of them. */
const RATIO_W = 700;
const RATIO_SIZE = 19;
/** The list of all five mistakes, right of the ratios. */
const REST_X = 1160;

/** The line of a listing that holds `text`, so a mark follows the SQL. */
const lineOf = (lines: readonly string[], text: string, from = 0) => {
  const i = lines.findIndex((l, k) => k >= from && l.includes(text));
  if (i < 0) throw new Error(`no line holds ${text}`);
  return i;
};

/**
 * Question 3, led by the page's date-boundary example: its nine orders, each
 * marked with which filter keeps it, beside the page's query and its two
 * totals (405.50 against 840.50: the assistant misses 51.8% of January's
 * revenue, all of it orders on the 31st), and why the half-open range is the
 * fix at any precision. Then the video's own two days, where averaging two
 * rates gives 26% and pooling them 2.5%, and the page's whole list, the four
 * silent mistakes bracketed apart from the loud one. A running label names
 * the worked mistake.
 */
export const MistakesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("mistakes").from;
  const qAt = n.word("mistakes", "Question");
  const textAt = n.word("mistakes", "What mistakes do");
  const sameAt = n.word("mistakes-same", "The same ones people make");
  const firstAt = n.word("mistakes-same", "The first is the date boundary");
  // The orders arrive as the question ends, so it never sits alone.
  const asked = n.beat("mistakes").to;
  const recallAt = n.word("mistakes-recall", "Remember the opening query");
  const betweenAt = n.word("mistakes-between", "between the first and the thirty-first");
  const midnightAt = n.word("mistakes-between", "midnight at its start");
  const goneAt = n.word("mistakes-between", "the rest of that day is gone");
  const totalAt = n.word("mistakes-totals", "Its total is");
  const halfOpenAt = n.word("mistakes-totals", "A half-open range");
  const eightFortyAt = n.word("mistakes-totals", "eight forty fifty");
  const halfAt = n.word("mistakes-missed", "more than half of January's revenue");
  const lastDayAt = n.word("mistakes-missed", "all of it from the last day");
  const precisionAt = n.word("mistakes-precision", "any timestamp precision");
  const secondAt = n.word("mistakes-precision", "one second to midnight");
  const ratiosAt = n.word("mistakes-ratios", "averaging ratios");
  const daysAt = n.word("mistakes-ratios", "One day converts");
  const averageAt = n.word("mistakes-average", "Average the two rates");
  const twentySixAt = n.word("mistakes-average", "twenty-six percent");
  const countsAt = n.word("mistakes-average", "counts as much");
  const divideAt = n.word("mistakes-average", "Divide all conversions");
  const twoFiveAt = n.word("mistakes-average", "two point five percent");
  const restFrom = n.beat("mistakes-rest").from;
  const fanAt = n.word("mistakes-rest", "fan-out");
  const rulesAt = n.word("mistakes-rest", "the business rules");
  const noErrorAt = n.word("mistakes-rest", "run without an error");
  const inventedAt = n.word("mistakes-rest", "Invented columns");
  const loudAt = n.word("mistakes-rest", "fail loudly");
  const silentAt = n.word("mistakes-silent", "The silent ones");
  const end = n.beat("mistakes-silent").to;
  const outA = ratiosAt - 4;

  // ── The date boundary ──
  const K = BOUNDARY.kept;
  const kg = geoOf(K, X0, y(TOP), h, { rowH: 42, headH: 42, bodySize: 21, headSize: 19 });
  const col = (name: string) => K.cols.indexOf(name);
  const status = col("status");
  const ts = col("order_ts");
  const asst = col("assistant");
  const half = col("half_open");
  const lost = K.rows.flatMap((r, i) => (r[asst] === "false" && r[half] === "true" ? [i] : []));
  const cancelled = K.rows.findIndex((r) => r[status] !== "completed");
  const P = BOUNDARY.page;
  // The assistant's filter, and the FROM and WHERE that make it a query, type
  // in as the opening query is recalled; the half-open filter between them
  // waits for "A half-open range".
  const between = lineOf(P.lines, "BETWEEN");
  const second = lineOf(P.lines, "FILTER", between);
  const halfEnd = lineOf(P.lines, "half_open_total");
  const openLines = P.lines.map((_, i) => i >= second && i <= halfEnd);
  let typed = 0;
  let inserted = 0;
  const listLineAt = openLines.map((late) => (late ? halfOpenAt - 4 + 3 * inserted++ : recallAt + 3 * typed++));
  const geLine = lineOf(P.lines, ">=");
  const ltLine = lineOf(P.lines, "<", geLine + 1);
  const listH = listingHeight(P.lines.length, LIST_SIZE);
  const pg = geoOf(P, LIST_X, y(TOP) + listH + h(22), h, { headH: 42, rowH: 46 });
  const notesTop = kg.rowTop(K.rows.length);
  const last = BOUNDARY.lastSecond.rows[0];
  const lastTime = last[0].slice(11);

  // ── Averaging ratios ──
  const D = RATIOS.days;
  const dg = geoOf(D, X0, y(TOP), h, { rowH: 46 });
  const sessions = D.cols.indexOf("sessions");
  const [small, large] = D.rows.map((r) => Number(r[sessions]).toLocaleString("en-US"));
  const avgTop = dg.rowTop(D.rows.length) + h(36);
  const avgH = listingHeight(RATIOS.averaged.lines.length, RATIO_SIZE);
  const poolTop = avgTop + avgH + h(58);
  const resultX = X0 + RATIO_W + 30;
  const ag = geoOf(RATIOS.averaged, resultX, avgTop + h(8), h, { rowH: 46 });
  const og = geoOf(RATIOS.pooled, resultX, poolTop + h(8), h, { rowH: 46 });
  const allLines = (lines: readonly string[]) => lines.flatMap((l, i) => (l.startsWith("FROM") ? [] : [i]));

  // ── The page's whole list ──
  const pitch = h(54);
  const restTop = y(TOP);
  const rest = [
    { at: restFrom - 12, text: "date boundaries" },
    { at: restFrom - 6, text: "averaging ratios" },
    { at: fanAt - 2, text: "fan-out", silent: true },
    { at: rulesAt - 2, text: "business rules it couldn't know", silent: true },
  ];
  const labelY = restTop + rest.length * pitch + h(4);
  const loudY = labelY + h(64);
  const bracketP = ease(frame, silentAt - 4, 14);

  const running = (at: number, out: number | undefined, k: number, text: string) => (
    <Note at={at} x={X0} y={y(TOP) - h(92)} out={out}>
      <span style={{ ...note(26, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
        <span style={{ ...label(24, INK_SOFT) }}>
          <Num>{k}</Num> ·
        </span>{" "}
        {text}
      </span>
    </Note>
  );

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={betweenAt} level={-34} />
      <Sfx name="el-scratch" at={goneAt + 4} level={-32} />
      <Sfx name="el-pop" at={eightFortyAt} level={-32} />
      <Sfx name="el-scratch" at={twentySixAt} level={-32} />
      <Sfx name="el-pop" at={twoFiveAt} level={-32} />
      <Sfx name="el-tap" at={silentAt} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} size={60}>
          What mistakes do AI-generated queries make most often?
        </QuestionCard>
        <Note at={sameAt - 2} x={X0} y={y(TOP) - h(92)} out={firstAt - 2}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>the ones people make, said with more confidence</span>
        </Note>
        {/* The worked mistake, named while it is on screen. */}
        {running(firstAt + 8, outA, 1, "date boundaries")}
        {/* The second waits until the first has gone, so the two never overlap. */}
        {running(outA + 10, undefined, 2, "averaging ratios")}

        {/* ── The date boundary, on the page's nine orders ── */}
        {/* TableName's own `out` only lifts it (its opacity style overrides
            Ink's fade), so it fades here with the table. */}
        <div style={{ position: "absolute", inset: 0, opacity: 1 - ease(frame, outA, 10) }}>
          <TableName g={kg} at={asked - 6} out={outA}>
            orders
          </TableName>
        </div>
        <DataTable
          g={kg}
          cols={colsOf(K, { assistant: { at: betweenAt, ink: BLUE_INK }, half_open: { at: halfOpenAt, ink: BLUE_INK } })}
          at={asked - 6}
          out={outA}
          rows={K.rows.map((cells, i) => ({ cells, at: asked - 2 + i * 2, dimAt: i === cancelled ? totalAt - 4 : undefined }))}
          bands={lost.map((row, k) => ({ row, at: goneAt + k * 4, color: BAD }))}
          marks={[
            ...lost.map((row, k) => ({ row, col: asst, at: goneAt + 6 + k * 4, color: MARK_BAD })),
            ...lost.map((row, k) => ({ row, col: half, at: halfOpenAt + 12 + k * 4, color: MARK_OK })),
            // "all of it from the last day": the two orders' times on the 31st.
            ...lost.map((row, k) => ({ row, col: ts, at: lastDayAt + k * 4, color: MARK })),
          ]}
        />
        <Note at={midnightAt - 2} x={X0} y={notesTop + h(20)} out={outA}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <Mono>&apos;2026-01-31&apos;</Mono> means <Mono color={ACCENT_INK}>{BOUNDARY.cutoff}</Mono>
          </span>
        </Note>
        <Note at={totalAt + 2} x={X0} y={notesTop + h(60)} out={outA}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>order 5 is cancelled: out of both totals</span>
        </Note>
        {/* Why half-open, not an end one second before midnight (check.mjs's lastSecond). */}
        <Note at={precisionAt - 2} x={X0} y={notesTop + h(100)} out={outA}>
          <span style={{ ...note(23, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            half-open is right at any precision
            <span style={{ ...note(23, INK), fontWeight: 400, opacity: ease(frame, secondAt - 2, 10) }}>
              : an end at <Mono>{last[0].slice(11, 19)}</Mono> still drops <Mono color={ACCENT_INK}>{lastTime}</Mono>
            </span>
          </span>
        </Note>

        <Listing
          lines={P.lines}
          x={LIST_X}
          top={y(TOP)}
          width={640}
          size={LIST_SIZE}
          at={recallAt - 4}
          lineAt={listLineAt}
          out={outA}
          marks={[
            { line: between - 1, at: betweenAt + 8, color: MARK_BAD },
            { line: between, at: betweenAt + 10, color: MARK_BAD },
            { line: geLine, at: halfOpenAt + 12, color: MARK_OK },
            { line: ltLine, at: halfOpenAt + 14, color: MARK_OK },
          ]}
        />
        <DataTable
          g={pg}
          cols={colsOf(P, { half_open_total: { at: halfOpenAt + 6 } })}
          at={totalAt - 4}
          out={outA}
          rows={rowsAt(P.rows, totalAt)}
          marks={[
            { row: 0, col: 0, at: totalAt + 8, color: MARK_BAD },
            { row: 0, col: 1, at: eightFortyAt, color: MARK_OK },
          ]}
        />
        <Note at={halfAt - 2} x={LIST_X} y={pg.rowTop(1) + h(18)} out={outA}>
          <span style={{ ...note(26, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            the assistant misses <Num>{BOUNDARY.missed}%</Num> of January&apos;s revenue
          </span>
        </Note>

        {/* ── Averaging ratios: the video's own two days ── */}
        <TableName g={dg} at={ratiosAt + 4}>
          daily
        </TableName>
        <DataTable g={dg} cols={colsOf(D)} at={ratiosAt + 4} rows={rowsAt(D.rows, daysAt, 6)} />
        <Listing
          lines={RATIOS.averaged.lines}
          x={X0}
          top={avgTop}
          width={RATIO_W}
          size={RATIO_SIZE}
          at={averageAt - 4}
          marks={allLines(RATIOS.averaged.lines).map((line, k) => ({ line, at: twentySixAt - 4 + 2 * k, color: MARK_BAD }))}
        />
        <DataTable g={ag} cols={colsOf(RATIOS.averaged)} at={averageAt + 4} rows={rowsAt(RATIOS.averaged.rows, twentySixAt - 2)} marks={[{ row: 0, col: 0, at: twentySixAt + 4, color: MARK_BAD }]} />
        <Note at={countsAt - 2} x={X0} y={avgTop + avgH + h(12)}>
          <span style={{ ...note(23, ACCENT_INK), fontWeight: 600, whiteSpace: "nowrap" }}>
            a {small}-session day counts as much as a {large}-session one
          </span>
        </Note>
        <Listing
          lines={RATIOS.pooled.lines}
          x={X0}
          top={poolTop}
          width={RATIO_W}
          size={RATIO_SIZE}
          at={divideAt - 4}
          marks={allLines(RATIOS.pooled.lines).map((line, k) => ({ line, at: twoFiveAt - 4 + 2 * k, color: MARK_OK }))}
        />
        <DataTable g={og} cols={colsOf(RATIOS.pooled)} at={divideAt + 4} rows={rowsAt(RATIOS.pooled.rows, twoFiveAt - 2)} marks={[{ row: 0, col: 0, at: twoFiveAt + 4, color: MARK_OK }]} />

        {/* ── The page's whole list: four silent, one loud ── */}
        {rest.map((r, i) => (
          <Note key={r.text} at={r.at} x={REST_X} y={restTop + i * pitch}>
            <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
              <span style={{ ...label(22, INK_SOFT), marginRight: 12 }}>
                <Num>{i + 1}</Num>
              </span>
              {r.text}
              {r.silent ? <span style={{ ...note(22, ACCENT_INK), fontWeight: 650, opacity: ease(frame, noErrorAt - 2, 10) }}> (silent)</span> : null}
            </span>
          </Note>
        ))}
        {/* The bracket: the four that run without an error. */}
        <div
          style={{
            position: "absolute",
            left: REST_X - 26,
            top: restTop + h(4),
            width: 12,
            height: (rest.length * pitch - h(14)) * bracketP,
            borderLeft: `3px solid ${ACCENT}`,
            borderTop: `3px solid ${ACCENT}`,
            borderBottom: bracketP >= 1 ? `3px solid ${ACCENT}` : undefined,
            opacity: bracketP > 0 ? 1 : 0,
          }}
        />
        <Note at={silentAt - 2} x={REST_X} y={labelY}>
          <span style={{ ...note(28, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>the silent ones are the danger</span>
        </Note>
        <Note at={inventedAt - 2} x={REST_X} y={loudY}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <span style={{ ...label(22, INK_SOFT), marginRight: 12 }}>
              <Num>5</Num>
            </span>
            invented columns, wrong-dialect functions
          </span>
        </Note>
        <Note at={loudAt - 2} x={REST_X + 26} y={loudY + h(40)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>they fail loudly: the harmless kind</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
