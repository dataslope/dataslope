import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds, inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { FRAME, RUNNING } from "./data";
import {
  colsOf,
  DataTable,
  Drift,
  type FrameStep,
  geoOf,
  Listing,
  listingHeight,
  MARK,
  MARK_BLUE,
  MARK_GREEN,
  MARK_RED,
  OK_INK,
  QMono,
  RowBracket,
  rowsAt,
  Stage,
  X0,
} from "./parts";

const TOP = 320;
const SIZE = 19;
const RESULT_X = 860;
/** The first days shown, before the gap to the last. */
const SHOWN = 8;

/**
 * The page's chart (charts/window-frame-rows-range.mjs) as the definition:
 * fourteen rows ordered by day, days 4 and 5 three rows each, the current
 * row the first of day 5. ROWS stops at the current row; RANGE runs on to
 * the end of its peer group, two rows past it.
 */
const CHART_DAYS = [1, 2, 3, 4, 4, 4, 5, 5, 5, 6, 7, 8, 9, 10];
const CURRENT = 6;
const PEER_END = CHART_DAYS.lastIndexOf(CHART_DAYS[CURRENT]);
const CELL = 44;
const CELL_GAP = 6;
const STRIP_X = 430;

/**
 * Questions 6 and 7. The page's 24 days of amounts: SUM over ROWS BETWEEN
 * UNBOUNDED PRECEDING AND CURRENT ROW, the total climbing beside the rows to
 * 411 while a bracket beside the table grows with it; then a seven-row
 * trailing average, its first six windows short (n_rows 1 to 6, in red).
 * Then ROWS against RANGE: the page's chart as the definition, and Data
 * Analyst Part 4's four payments, two on January 2: ROWS climbs 100, 350,
 * 425; RANGE gives both January 2 rows 425; no frame is RANGE.
 */
export const RunningScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Question 6 ──
  const from = n.beat("running").from;
  const qAt = n.word("running", "Question six");
  const textAt = n.word("running", "How do you compute a running total");
  const asked = n.word("running", "what does the frame control") + 4;
  const sumAt = n.word("running-sum", "Sum over");
  const orderedAt = n.word("running-sum", "ordered by day");
  const rowsBetweenAt = n.word("running-sum", "rows between unbounded preceding");
  const upAt = n.word("running-sum", "everything from the start up to here");
  const daysAt = n.word("running-sum", "twenty-four days");
  const tenAt = n.word("running-sum", "climbs from ten");
  const elevenAt = n.word("running-sum", "four hundred eleven");
  const avgAt = n.word("running-move", "Average over six preceding");
  const sevenAt = n.word("running-move", "seven-row trailing average");
  const fewerAt = n.word("running-move", "The first six windows");
  const flagAt = n.word("running-move", "flag them or leave them out");

  // ── Question 7 ──
  const q7At = n.word("frame", "Question seven");
  const q7TextAt = n.word("frame", "What is the difference");
  const physAt = n.word("frame-def", "Rows counts physical rows");
  const valuesAt = n.word("frame-def", "Range counts values");
  const tieAt = n.word("frame-def", "rows that tie come in together");
  const sameDayAt = n.word("frame-def", "two payments land on the same day");
  const rowsAt0 = n.word("frame-rows", "With rows");
  const totals = [n.word("frame-rows", "a hundred"), n.word("frame-rows", "three fifty"), n.word("frame-rows", "four twenty-five")];
  const rangeAt = n.word("frame-range", "With range");
  const onceAt = n.word("frame-range", "count at once");
  const bothAt = n.word("frame-range", "both read four twenty-five");
  const leaveAt = n.word("frame-default", "Leave the frame out");
  const youGetAt = n.word("frame-default", "you get range");
  const restAt = n.word("frame-default", "the total including the rest of the day");
  const soFarAt = n.word("frame-default", "not the total so far");
  const writeAt = n.word("frame-pick", "So write rows");
  const spanAt = n.word("frame-pick", "Save range for a span of values");
  const end = n.beat("frame-pick").to;
  const out6 = q7At - 4;

  // ── 6. The running total ──
  const R = RUNNING.query;
  const gapRow = (cols: number) => ["…", ...Array(cols - 1).fill("")];
  const shownOf = (t: { rows: readonly (readonly string[])[]; cols: readonly string[] }) => [
    ...t.rows.slice(0, SHOWN),
    gapRow(t.cols.length),
    t.rows[t.rows.length - 1],
  ];
  const rShown = shownOf(R);
  const rt = R.cols.indexOf("running_total");
  const rTable = { cols: R.cols, rows: rShown.map((r, i) => r.map((v, j) => (j === rt && i < SHOWN ? "" : j === rt && i === rShown.length - 1 ? "" : v))) };
  const rg = geoOf({ cols: R.cols, rows: rShown }, RESULT_X, y(TOP), h, { rowH: 44 });
  const last = rShown.length - 1;
  const climbStep = Math.max(3, (elevenAt - tenAt - 6) / SHOWN);
  const climb = rShown.flatMap((r, i) => (i === SHOWN ? [] : [{ row: i, col: rt, at: i === last ? elevenAt : upAt + 4 + i * climbStep, value: r[rt] }]));
  const runSteps: FrameStep[] = [
    { at: upAt + 2, from: 0, to: 0 },
    ...Array.from({ length: SHOWN - 1 }, (_, k) => ({ at: upAt + 4 + (k + 1) * climbStep, from: 0, to: k + 1 })),
    { at: elevenAt, from: 0, to: last },
  ];

  // ── 6. The trailing average ──
  const T = RUNNING.trailing;
  const tShown = shownOf(T);
  const tg = geoOf({ cols: T.cols, rows: tShown }, RESULT_X, y(TOP), h, { rowH: 44 });
  const nr = T.cols.indexOf("n_rows");
  const av = T.cols.indexOf("avg_7");
  const short = tShown.flatMap((r, i) => (i < SHOWN && Number(r[nr]) < 7 ? [i] : []));
  const full = tShown.findIndex((r) => r[nr] === "7");
  const trailSteps: FrameStep[] = [
    { at: avgAt + 6, from: Math.max(0, full - 6), to: full },
    { at: sevenAt + 4, from: full - 5, to: full + 1 },
    { at: fewerAt, from: 0, to: 0 },
    { at: fewerAt + 10, from: 0, to: 2 },
    { at: fewerAt + 20, from: 0, to: short[short.length - 1] },
  ];

  // ── 7. The definition, the page's chart ──
  const dayY = y(318);
  const rowsY = dayY + h(36);
  const rangeY = rowsY + h(52);
  const stripH = h(34);
  const cellX = (i: number) => STRIP_X + i * (CELL + CELL_GAP);
  const curX = cellX(CURRENT) + CELL / 2;

  // ── 7. The payments ──
  const PR = FRAME.rows;
  const lowTop = y(510);
  const pg = geoOf(PR, 930, lowTop, h, { rowH: 50 });
  const tc = PR.cols.indexOf("total");
  const peers = PR.rows.flatMap((r, i) => (r[1] === PR.rows[1][1] ? [i] : []));
  const toRange = PR.rows.flatMap((r, row) => (r[tc] !== FRAME.range.rows[row][tc] ? [{ row, col: tc, at: onceAt + 6, value: FRAME.range.rows[row][tc] }] : []));
  const listW = 760;
  const notesY = lowTop + listingHeight(PR.lines.length, SIZE) + h(28);
  const pickY = pg.rowTop(PR.rows.length) + h(36);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={rowsBetweenAt + 2} level={-35} />
      <Sfx name="el-sprinkle" at={upAt + 4} level={-35} />
      <Sfx name="el-pop" at={elevenAt + 2} level={-32} />
      <Sfx name="el-whoosh" at={avgAt - 4} level={-36} />
      <Sfx name="el-scratch" at={fewerAt + 4} level={-34} />
      <Sfx name="el-pencil" at={physAt + 2} level={-35} />
      <Sfx name="el-pencil" at={valuesAt + 2} level={-35} />
      <Sfx name="el-pop" at={sameDayAt + 2} level={-32} />
      {totals.map((t, i) => (
        <Sfx key={i} name="el-tap" at={t} level={-33} />
      ))}
      <Sfx name="el-pop" at={onceAt + 6} level={-32} />
      <Sfx name="el-scratch" at={restAt + 2} level={-34} />
      <Sfx name="el-chime" at={writeAt + 4} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} out={out6} size={60}>
          How do you compute a running total, and what does the frame control?
        </QuestionCard>
        <QuestionCard n={7} at={q7At} textAt={q7TextAt - 2} size={60}>
          What is the difference between <QMono>ROWS</QMono> and <QMono>RANGE</QMono> frames?
        </QuestionCard>

        {/* ── 6. The running total, then the trailing average ── */}
        <Stage from={asked - 6} to={out6}>
          <Listing
            lines={R.lines}
            x={X0}
            top={y(TOP)}
            size={SIZE}
            at={asked - 6}
            out={avgAt - 2}
            marks={[
              { line: "SUM(amt) OVER (", at: sumAt + 2, out: rowsBetweenAt },
              { line: "ORDER BY day", nth: 1, at: orderedAt, out: rowsBetweenAt },
              { line: "ROWS BETWEEN UNBOUNDED PRECEDING", at: rowsBetweenAt + 2 },
            ]}
          />
          <DataTable
            g={rg}
            cols={colsOf(R, { running_total: { at: sumAt + 4, ink: BLUE_INK, numeric: true } })}
            at={asked - 4}
            out={avgAt - 2}
            rows={rowsAt(rTable.rows, asked)}
            swaps={climb}
            marks={[{ row: last, col: rt, at: elevenAt + 4, color: MARK_GREEN }]}
          />
          <RowBracket g={rg} steps={runSteps} out={avgAt - 2} />
          <Note at={daysAt} x={rg.right + 40} y={rg.rowTop(0) + h(4)} out={avgAt - 2}>
            <span style={{ ...note(25, INK), whiteSpace: "nowrap", ...TABULAR }}>{R.rows.length} days</span>
          </Note>
          <Note at={elevenAt + 6} x={rg.right + 40} y={rg.rowTop(last) + h(4)} out={avgAt - 2}>
            <span style={{ ...note(25, OK_INK), whiteSpace: "nowrap", ...TABULAR }}>{RUNNING.last} on the last day</span>
          </Note>

          <Listing
            lines={T.lines}
            x={X0}
            top={y(TOP)}
            size={SIZE}
            at={avgAt - 2}
            marks={[
              { line: "ROUND(AVG(amt) OVER w", at: avgAt + 4 },
              { line: "ROWS BETWEEN 6 PRECEDING", at: avgAt + 10 },
              { line: "COUNT(*) OVER w", at: fewerAt, color: MARK_RED },
            ]}
          />
          <DataTable
            g={tg}
            cols={colsOf(T, { n_rows: { ink: BLUE_INK }, avg_7: { ink: BLUE_INK } })}
            at={avgAt}
            rows={rowsAt(tShown, avgAt + 2, 1)}
            marks={[
              { row: full, col: av, at: sevenAt + 2, out: fewerAt },
              { row: full, col: nr, at: sevenAt + 2, out: fewerAt },
              ...short.map((row, k) => ({ row, col: nr, at: fewerAt + 6 + k * 3, color: MARK_RED })),
            ]}
          />
          <RowBracket g={tg} steps={trailSteps} />
          <Note at={fewerAt + 8} x={tg.right + 40} y={tg.rowTop(1) + h(4)}>
            <span style={{ ...note(25, ACCENT_INK), whiteSpace: "nowrap", ...TABULAR }}>The first {short.length}: fewer than 7 rows</span>
          </Note>
          <Note at={flagAt} x={tg.right + 40} y={tg.rowTop(1) + h(50)}>
            <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>Flag them, or leave them out</span>
          </Note>
        </Stage>

        {/* ── 7. The definition: ROWS stops, RANGE runs on through the peers ── */}
        <Stage from={q7At + 8}>
          <Note at={physAt - 6} x={STRIP_X - 70} y={dayY}>
            <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>day</span>
          </Note>
          {CHART_DAYS.map((d, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: cellX(i),
                top: dayY,
                width: CELL,
                textAlign: "center",
                ...label(20, i >= CURRENT && i <= PEER_END ? INK : INK_SOFT),
                ...TABULAR,
                opacity: ease(frame, physAt - 6 + i, 8),
              }}
            >
              {d}
            </div>
          ))}
          {[
            { y: rowsY, at: physAt, text: "ROWS UNBOUNDED PRECEDING", to: CURRENT, note: "Positions, up to here" },
            { y: rangeY, at: valuesAt, text: "RANGE UNBOUNDED PRECEDING", to: PEER_END, note: "Values: the rest of the day comes too" },
          ].map((s) => (
            <React.Fragment key={s.text}>
              <Note at={s.at - 4} x={X0 - 16} y={s.y + stripH / 2 - 14}>
                <span style={{ fontFamily: MONO, fontSize: 19, fontWeight: 500, color: INK, whiteSpace: "pre", fontVariantLigatures: "none" }}>{s.text}</span>
              </Note>
              {CHART_DAYS.map((_, i) => {
                const inside = i <= s.to;
                const peer = i > CURRENT && i <= s.to;
                const p = ease(frame, s.at + 2 + i * 1.5, 8);
                const fill = peer ? ACCENT : BAR;
                return (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: cellX(i),
                      top: s.y,
                      width: CELL,
                      height: stripH,
                      borderRadius: 4,
                      background: inside ? `color-mix(in srgb, ${fill} ${peer ? 70 : 55}%, ${PAPER})` : ds("gray", 100),
                      opacity: p,
                    }}
                  />
                );
              })}
              <Note at={s.at + 20} x={cellX(CHART_DAYS.length - 1) + CELL + 40} y={s.y + stripH / 2 - 15}>
                <span style={{ ...note(22, s.to > CURRENT ? ACCENT_INK : INK), whiteSpace: "nowrap" }}>{s.note}</span>
              </Note>
            </React.Fragment>
          ))}
          {/* The peers of the current row: one day's values, outlined. */}
          <div
            style={{
              position: "absolute",
              left: cellX(CURRENT) - 6,
              top: dayY - h(6),
              width: cellX(PEER_END) - cellX(CURRENT) + CELL + 12,
              height: rangeY + stripH - dayY + h(12),
              boxSizing: "border-box",
              border: `2.5px solid ${inkOf.yellow}`,
              borderRadius: 8,
              opacity: ease(frame, tieAt, 10),
            }}
          />
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, physAt - 2, 10) }}>
            <path d={`M${curX},${rangeY + stripH + h(16)} L${curX},${rangeY + stripH + h(30)}`} stroke={INK} strokeWidth={2} />
          </svg>
          <Note at={physAt} x={curX - 60} y={rangeY + stripH + h(34)}>
            <span style={{ ...label(20, INK), whiteSpace: "nowrap" }}>current row</span>
          </Note>

          {/* ── The four payments ── */}
          <Listing
            lines={PR.lines}
            x={X0}
            top={lowTop}
            width={listW}
            size={SIZE}
            at={rowsAt0 - 4}
            out={rangeAt - 2}
            marks={[{ line: "ROWS BETWEEN", at: rowsAt0 + 6 }]}
          />
          <Listing
            lines={FRAME.range.lines}
            x={X0}
            top={lowTop}
            width={listW}
            size={SIZE}
            at={rangeAt - 2}
            out={leaveAt - 2}
            marks={[{ line: "RANGE BETWEEN", at: rangeAt + 6 }]}
          />
          <Listing
            lines={FRAME.defaulted.lines}
            x={X0}
            top={lowTop}
            width={listW}
            size={SIZE}
            at={leaveAt - 2}
            marks={[{ line: "OVER (ORDER BY day)", text: "OVER (ORDER BY day)", at: youGetAt, color: MARK_RED }]}
          />
          <DataTable
            g={pg}
            cols={colsOf(PR, { total: { at: rowsAt0, ink: BLUE_INK } })}
            at={sameDayAt - 4}
            rows={rowsAt(PR.rows, sameDayAt)}
            bands={peers.map((row) => ({ row, at: sameDayAt + 6, color: MARK, out: rowsAt0 }))}
            swaps={toRange}
            marks={[
              ...totals.map((at, row) => ({ row, col: tc, at, out: rangeAt, color: MARK_BLUE })),
              ...peers.map((row, k) => ({ row, col: tc, at: bothAt + k * 4, out: leaveAt, color: MARK })),
              ...peers.map((row, k) => ({ row, col: tc, at: restAt + k * 4, color: MARK_RED })),
            ]}
          />
          <RowBracket
            g={pg}
            steps={[
              { at: totals[0] - 2, from: 0, to: 0 },
              { at: totals[1] - 2, from: 0, to: 1 },
              { at: totals[2] - 2, from: 0, to: 2 },
              { at: onceAt, from: 0, to: 2, current: 1 },
            ]}
          />
          <Note at={restAt + 6} x={X0} y={notesY}>
            <span style={{ ...note(24, ACCENT_INK), whiteSpace: "nowrap" }}>No frame: the total including the rest of the day</span>
          </Note>
          <Note at={soFarAt} x={X0} y={notesY + h(42)}>
            <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>not the total so far</span>
          </Note>
          <Note at={writeAt} x={pg.x} y={pickY}>
            <span style={{ ...note(24, OK_INK), whiteSpace: "nowrap" }}>
              Running total: <QMono>ROWS</QMono> and an <QMono>ORDER BY</QMono> that breaks ties
            </span>
          </Note>
          <Note at={spanAt} x={pg.x} y={pickY + h(46)}>
            <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
              <QMono>RANGE</QMono>: a span of values, like the last 7 days
            </span>
          </Note>
        </Stage>
      </Drift>
    </AbsoluteFill>
  );
};
