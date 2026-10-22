import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BOUNDARY, RATIOS } from "./data";
import { colsOf, DataTable, Drift, geoOf, Listing, listingHeight, MARK_BAD, MARK_OK, Mono, rowsAt, TableName, X0 } from "./parts";

const TOP = 330;
const LIST_X = 1170;
const LIST_SIZE = 16;
const BAD = `color-mix(in srgb, ${ACCENT_INK} 22%, transparent)`;

/**
 * Question 3, led by the page's date-boundary example: its nine orders, each
 * marked with which filter keeps it, beside its query and its two totals
 * (405.50 against 840.50, the assistant missing 51.8% of January). Then the
 * video's own two days, where averaging two rates gives 26% and pooling them
 * 2.5%, and the rest of the page's list.
 */
export const MistakesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("mistakes").from;
  const qAt = n.word("mistakes", "Question");
  const textAt = n.word("mistakes", "What mistakes do");
  const sameAt = n.word("mistakes-same", "The same ones people make");
  const boundaryAt = n.word("mistakes-same", "the date boundary");
  const betweenAt = n.word("mistakes-between", "between the first and the thirty-first");
  const midnightAt = n.word("mistakes-between", "midnight at its start");
  const goneAt = n.word("mistakes-between", "the rest of that day is gone");
  const totalAt = n.word("mistakes-totals", "Its total is");
  const halfOpenAt = n.word("mistakes-totals", "A half-open range");
  const eightFortyAt = n.word("mistakes-totals", "eight forty fifty");
  const halfAt = n.word("mistakes-totals", "more than half the month");
  const ratiosAt = n.word("mistakes-ratios", "averaging ratios");
  const daysAt = n.word("mistakes-ratios", "One day converts");
  const averageAt = n.word("mistakes-ratios", "Average the two rates");
  const twentySixAt = n.word("mistakes-ratios", "twenty-six percent");
  const divideAt = n.word("mistakes-ratios", "Divide all conversions");
  const twoFiveAt = n.word("mistakes-ratios", "two point five");
  const fanAt = n.word("mistakes-rest", "fan-out");
  const rulesAt = n.word("mistakes-rest", "the business rules");
  const inventedAt = n.word("mistakes-rest", "invented columns");
  const loudAt = n.word("mistakes-rest", "fail loudly");
  const silentAt = n.word("mistakes-rest", "The silent ones");
  const end = n.beat("mistakes-rest").to;
  const outA = ratiosAt - 4;

  // ── The date boundary ──
  const K = BOUNDARY.kept;
  const kg = geoOf(K, X0, y(TOP), h, { rowH: 42, headH: 42, bodySize: 21, headSize: 19 });
  const col = (name: string) => K.cols.indexOf(name);
  const status = col("status");
  const asst = col("assistant");
  const half = col("half_open");
  const lost = K.rows.flatMap((r, i) => (r[asst] === "false" && r[half] === "true" ? [i] : []));
  const cancelled = K.rows.findIndex((r) => r[status] !== "completed");
  const P = BOUNDARY.page;
  const listH = listingHeight(P.lines.length, LIST_SIZE);
  const pg = geoOf(P, LIST_X, y(TOP) + listH + h(22), h, { rowH: 50 });

  // ── Averaging ratios ──
  const D = RATIOS.days;
  const dg = geoOf(D, X0, y(TOP), h, { rowH: 46 });
  const avgTop = dg.rowTop(D.rows.length) + h(36);
  const avgH = listingHeight(RATIOS.averaged.lines.length, 19);
  const poolTop = avgTop + avgH + h(30);
  const ag = geoOf(RATIOS.averaged, 1020, avgTop + h(8), h, { rowH: 46 });
  const og = geoOf(RATIOS.pooled, 1020, poolTop + h(8), h, { rowH: 46 });
  const restX = 1240;

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
        <Note at={sameAt - 2} x={X0} y={y(TOP) - h(62)} out={outA}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>the ones people make, said with more confidence</span>
        </Note>

        {/* ── The date boundary, on the page's nine orders ── */}
        <TableName g={kg} at={boundaryAt - 4} out={outA}>
          orders
        </TableName>
        <DataTable
          g={kg}
          cols={colsOf(K, { assistant: { at: betweenAt, ink: BLUE_INK }, half_open: { at: halfOpenAt, ink: BLUE_INK } })}
          at={boundaryAt - 4}
          out={outA}
          rows={K.rows.map((cells, i) => ({ cells, at: boundaryAt + i * 2, dimAt: i === cancelled ? totalAt - 4 : undefined }))}
          bands={lost.map((row, k) => ({ row, at: goneAt + k * 4, color: BAD }))}
          marks={[
            ...lost.map((row, k) => ({ row, col: asst, at: goneAt + 6 + k * 4, color: MARK_BAD })),
            ...lost.map((row, k) => ({ row, col: half, at: halfOpenAt + 12 + k * 4, color: MARK_OK })),
          ]}
        />
        <Note at={midnightAt - 2} x={X0} y={kg.rowTop(K.rows.length) + h(20)} out={outA}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap", ...TABULAR }}>
            <Mono>&apos;2026-01-31&apos;</Mono> means <Mono color={ACCENT_INK}>{BOUNDARY.cutoff}</Mono>
          </span>
        </Note>
        <Note at={totalAt + 2} x={X0} y={kg.rowTop(K.rows.length) + h(60)} out={outA}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>order 5 is cancelled: out of both totals</span>
        </Note>

        <Listing
          lines={P.lines}
          x={LIST_X}
          top={y(TOP)}
          width={640}
          size={LIST_SIZE}
          at={betweenAt - 4}
          out={outA}
          marks={[
            { line: 2, at: betweenAt + 8, color: MARK_BAD },
            { line: 5, at: halfOpenAt + 4, color: MARK_OK },
          ]}
        />
        <DataTable
          g={pg}
          cols={colsOf(P)}
          at={totalAt - 4}
          out={outA}
          rows={rowsAt(P.rows, totalAt)}
          marks={[
            { row: 0, col: 0, at: totalAt + 8, color: MARK_BAD },
            { row: 0, col: 1, at: eightFortyAt, color: MARK_OK },
          ]}
        />
        <Note at={halfAt - 2} x={LIST_X} y={pg.rowTop(1) + h(24)} out={outA}>
          <span style={{ ...note(26, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>
            the assistant misses {BOUNDARY.missed}% of January
          </span>
        </Note>

        {/* ── Averaging ratios: the video's own two days ── */}
        <TableName g={dg} at={daysAt - 4}>
          daily
        </TableName>
        <DataTable g={dg} cols={colsOf(D)} at={daysAt - 4} rows={rowsAt(D.rows, daysAt, 6)} />
        <Note at={daysAt + 4} x={dg.right + 30} y={dg.rowTop(0)}>
          <span style={{ ...label(19, INK_SOFT), whiteSpace: "nowrap" }}>the video&apos;s own example</span>
        </Note>
        <Listing lines={RATIOS.averaged.lines} x={X0} top={avgTop} width={860} size={19} at={averageAt - 4} marks={[{ line: 0, at: twentySixAt - 4, color: MARK_BAD }]} />
        <DataTable g={ag} cols={colsOf(RATIOS.averaged)} at={averageAt + 4} rows={rowsAt(RATIOS.averaged.rows, twentySixAt - 2)} marks={[{ row: 0, col: 0, at: twentySixAt + 4, color: MARK_BAD }]} />
        <Listing lines={RATIOS.pooled.lines} x={X0} top={poolTop} width={860} size={19} at={divideAt - 4} marks={[{ line: 0, at: twoFiveAt - 4, color: MARK_OK }]} />
        <DataTable g={og} cols={colsOf(RATIOS.pooled)} at={divideAt + 4} rows={rowsAt(RATIOS.pooled.rows, twoFiveAt - 2)} marks={[{ row: 0, col: 0, at: twoFiveAt + 4, color: MARK_OK }]} />

        {/* ── The rest of the list ── */}
        <Note at={fanAt - 2} x={restX} y={y(TOP)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>fan-out (Part 1)</span>
        </Note>
        <Note at={rulesAt - 2} x={restX} y={y(TOP) + h(48)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>business rules it couldn&apos;t know</span>
        </Note>
        <Note at={inventedAt - 2} x={restX} y={y(TOP) + h(96)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            invented columns <span style={{ color: INK_SOFT, opacity: ease(frame, loudAt - 2, 10) }}>(they fail loudly)</span>
          </span>
        </Note>
        <Note at={silentAt - 2} x={restX} y={y(TOP) + h(156)}>
          <span style={{ ...note(28, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>the silent ones are the danger</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
