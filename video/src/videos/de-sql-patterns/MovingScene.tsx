import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK, OK_INK, QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MOVING, SPINE } from "./data";
import {
  colsOf,
  DataTable,
  daysBetween,
  DayStrip,
  Drift,
  geoOf,
  lineOf,
  Listing,
  MARK,
  MARK_BAD,
  MARK_OK,
  stripGeometry,
  TableName,
  X0,
} from "./parts";

const STRIP_Y = 290;
const CELL = 84;
const GAP = 10;
const LIST_Y = 500;
const LIST_W = 780;
const SIZE = 19;
const SUM_X = 960;

const DAY = 86_400_000;
const dayNum = (iso: string) => Number(iso.slice(8));
const daysAcross = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY) + 1;
const shiftDays = (iso: string, k: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + k * DAY).toISOString().slice(0, 10);

/**
 * Questions 7 and 8 on the video's own metric, on the same thirteen days as
 * the opening (user 1's login days, four missing). The page's answer, ROWS 6
 * PRECEDING, is seven rows: on the 13th its frame reaches back to the 3rd,
 * eleven days (a red bracket under the strip). RANGE of six days covers the
 * 7th to the 13th, where only four rows exist. Then the spine: every date
 * generated, the data left-joined on, the missing days null (the gaps), then
 * zeros with COALESCE; seven rows are seven days again. A small table keeps
 * the 13th's average under each frame as it is said: 152.1, 166.3, 95.0.
 */
export const MovingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("moving").from;
  const qAt = n.word("moving", "Question");
  const textAt = n.word("moving", "How do you compute");
  const usualAt = n.word("moving", "The usual answer");
  const sixAt = n.word("moving", "six preceding");
  const metricAt = n.word("moving-rows", "Here's a metric");
  const missingAt = n.word("moving-rows", "the same four days missing");
  const thirteenthAt = n.word("moving-rows", "On the thirteenth");
  const reachAt = n.word("moving-rows", "reach back to the third");
  const elevenAt = n.word("moving-rows", "eleven days");
  const rangeAt = n.word("moving-range", "Range with an interval");
  const calendarAt = n.word("moving-range", "counts the calendar instead");
  const fourAt = n.word("moving-range", "the four days that exist");
  const avgAt = n.word("moving-range", "averages one sixty-six");
  const skipsAt = n.word("moving-zero", "range skips the missing days");
  const backAt = n.word("moving-zero", "put the days back first");
  const q8At = n.word("spine", "Question eight");
  const q8TextAt = n.word("spine", "How do you detect");
  const generateAt = n.word("spine", "Generate every date");
  const joinAt = n.word("spine", "left join the data onto it");
  const nullAt = n.word("spine-fill", "come back null");
  const gapsAt = n.word("spine-fill", "those are the gaps");
  const zerosAt = n.word("spine-fill", "Coalesce turns them into zeros");
  const againAt = n.word("spine-avg", "seven rows are seven days again");
  const ninetyFiveAt = n.word("spine-avg", "averages ninety-five");
  const calendarTableAt = n.word("spine-avg", "Join a calendar table");
  const bridgeAt = n.beat("islands-in").from;
  const clearAt = n.beat("islands").from - 8 - 30;
  const end = n.beat("islands-in").to;

  // ── The strip: the metric on its thirteen days ──
  const values = new Map(MOVING.days.rows.map((r) => [r[0], r[1]]));
  const first = MOVING.days.rows[0][0];
  const lastDay = MOVING.days.rows[MOVING.days.rows.length - 1][0];
  const days = daysBetween(first, lastDay, values);
  const g = stripGeometry(X0, y(STRIP_Y), days.length, CELL, GAP, h(70));
  const at = (date: string) => days.findIndex((d) => d.date === date);
  const last = days.length - 1;
  const missing = days.flatMap((d, i) => (d.present ? [] : [i]));
  if (missing.map((i) => days[i].date).join() !== SPINE.gaps.join()) throw new Error("the spine's gaps are not the strip's missing days");

  // The 13th under each frame, from the runs.
  const L = MOVING.last;
  const rowsStart = L.rows.frame_start;
  const rangeStart = shiftDays(lastDay, -6);
  if (L.range.frame_start < rangeStart) throw new Error("the RANGE frame reaches further back than six days");
  const spineStart = L.spine.frame_start;
  const covers = (a: string) => `Jan ${dayNum(a)} to ${dayNum(lastDay)}`;
  const summary = {
    cols: ["frame", "covers", "rows", "avg_7"],
    rows: [
      ["ROWS 6 PRECEDING", covers(rowsStart), L.rows.n, L.rows.avg_7],
      ["RANGE 6 DAY", covers(rangeStart), L.range.n, L.range.avg_7],
      ["spine, then ROWS", covers(spineStart), String(daysAcross(spineStart, lastDay)), L.spine.avg_7],
    ],
  };
  const sg = geoOf(summary, SUM_X, y(LIST_Y), h, { rowH: 52, bodySize: 22, headSize: 20 });
  const avg = summary.cols.indexOf("avg_7");
  const rowCol = summary.cols.indexOf("rows");

  // ── The listings: the page's answer, then the spine ──
  const P = MOVING.page;
  const F = SPINE.filled;
  const out7 = q8At - 4;

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={metricAt + 2} level={-34} />
      <Sfx name="el-pencil" at={reachAt} level={-34} />
      <Sfx name="el-scratch" at={elevenAt + 2} level={-34} />
      <Sfx name="el-pencil" at={calendarAt + 4} level={-34} />
      <Sfx name="el-pop" at={generateAt + 4} level={-34} />
      <Sfx name="el-tap" at={zerosAt + 4} level={-34} />
      <Sfx name="el-pencil" at={againAt + 2} level={-34} />
      <Sfx name="el-pop" at={ninetyFiveAt} level={-34} />

      <Drift from={from} to={end + 40}>
        <AbsoluteFill style={{ opacity: 1 - ease(frame, clearAt, 36) }}>
          <QuestionCard n={7} at={qAt - 4} textAt={textAt - 4} out={out7} size={60}>
            How do you compute a 7-day moving average?
          </QuestionCard>
          <QuestionCard n={8} at={q8At} textAt={q8TextAt - 2} size={60}>
            How do you detect and fill gaps in a time series?
          </QuestionCard>

          {/* ── The metric, on the opening's thirteen days ── */}
          <Ink at={metricAt - 2} dur={12} style={{ left: X0, top: g.top - h(40), whiteSpace: "nowrap" }}>
            <span style={label(21, INK_SOFT)}>
              <span style={{ fontFamily: MONO, fontWeight: 600 }}>daily_metrics</span>: the video&rsquo;s own values, on user 1&rsquo;s login days
            </span>
          </Ink>
          <DayStrip
            g={g}
            days={days}
            at={metricAt}
            solidAt={generateAt + 4}
            valueSize={24}
            fills={missing.flatMap((index, k) => [
              { index, at: nullAt + 2 + k * 3, text: "null", color: INK_SOFT, italic: true },
              { index, at: zerosAt + 4 + k * 3, text: "0", color: OK_INK },
            ])}
            marks={[
              ...missing.map((index, k) => ({ index, at: missingAt + 2 + k * 2, out: thirteenthAt, color: MARK })),
              { index: last, at: thirteenthAt + 2, out: q8At, color: MARK },
              ...missing.map((index, k) => ({ index, at: gapsAt + k * 2, out: zerosAt + 4, color: MARK })),
              ...missing.map((index, k) => ({ index, at: zerosAt + 4 + k * 3, out: bridgeAt, color: MARK_OK })),
            ]}
            spans={[
              {
                from: at(rowsStart),
                to: last,
                at: reachAt,
                out: rangeAt,
                color: ACCENT,
                ink: ACCENT_INK,
                label: `${L.rows.n} rows: ${daysAcross(rowsStart, lastDay)} days`,
              },
              {
                from: at(rangeStart),
                to: last,
                at: calendarAt + 2,
                out: q8At,
                color: BAR,
                ink: BLUE_INK,
                label: `${daysAcross(rangeStart, lastDay)} days: ${L.range.n} rows`,
              },
              {
                from: at(spineStart),
                to: last,
                at: againAt,
                color: OK,
                ink: OK_INK,
                label: `${daysAcross(spineStart, lastDay)} rows: ${daysAcross(spineStart, lastDay)} days`,
              },
            ]}
          />

          {/* ── Question 7: the page's answer, ROWS 6 PRECEDING ── */}
          <Listing
            lines={P.lines}
            x={X0}
            top={y(LIST_Y)}
            width={LIST_W}
            size={SIZE}
            at={usualAt - 4}
            out={generateAt - 2}
            marks={[
              { line: lineOf(P.lines, "ROWS BETWEEN"), at: sixAt, out: elevenAt },
              { line: lineOf(P.lines, "ROWS BETWEEN"), at: elevenAt, color: MARK_BAD },
            ]}
          />

          {/* ── The 13th, under each frame ── */}
          <TableName g={sg} at={thirteenthAt + 4}>
            the 13th&rsquo;s seven-day average
          </TableName>
          <DataTable
            g={sg}
            cols={colsOf(summary, { avg_7: { ink: BLUE_INK } })}
            at={thirteenthAt + 4}
            rows={[
              { cells: summary.rows[0], at: reachAt + 4 },
              { cells: summary.rows[1], at: fourAt },
              { cells: summary.rows[2], at: ninetyFiveAt - 4 },
            ]}
            marks={[
              { row: 0, col: avg, at: elevenAt + 4, color: MARK_BAD },
              { row: 1, col: rowCol, at: fourAt + 4, out: avgAt },
              { row: 1, col: avg, at: avgAt + 2, out: skipsAt },
              { row: 1, col: rowCol, at: skipsAt, out: q8At, color: MARK },
              { row: 2, col: avg, at: ninetyFiveAt + 2, color: MARK_OK },
            ]}
          />
          <Note at={calendarAt} x={SUM_X} y={sg.rowTop(3) + h(26)}>
            <div style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>by the calendar:</div>
            <div style={{ fontFamily: MONO, fontSize: 21, fontWeight: 600, color: BLUE_INK, marginTop: 6, whiteSpace: "pre", fontVariantLigatures: "none" }}>
              {MOVING.rangeClause}
            </div>
          </Note>
          <Note at={skipsAt} x={SUM_X} y={sg.rowTop(3) + h(110)} out={q8At}>
            <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
              the missing days are skipped, <b style={{ opacity: ease(frame, backAt - 2, 10) }}>not counted as zero</b>
            </span>
          </Note>

          {/* ── Question 8: a spine of every date, the data left-joined on ── */}
          <Listing
            lines={F.lines}
            x={X0}
            top={y(LIST_Y)}
            width={LIST_W}
            size={SIZE}
            at={generateAt - 2}
            marks={[
              { line: lineOf(F.lines, "FROM generate_series"), at: generateAt + 6 },
              { line: lineOf(F.lines, "LEFT JOIN"), at: joinAt + 2 },
              { line: lineOf(F.lines, "COALESCE"), at: zerosAt + 2, color: MARK_OK },
            ]}
          />
          <Note at={calendarTableAt - 2} x={SUM_X} y={sg.rowTop(3) + h(110)}>
            <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
              no <QMono>generate_series</QMono>? join a calendar table
            </span>
          </Note>
        </AbsoluteFill>
      </Drift>
    </AbsoluteFill>
  );
};
