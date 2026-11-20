import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease, map } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { CUSTOMER3, LATEST, QUALIFY } from "./data";
import {
  Chip,
  Box,
  colsOf,
  DataTable,
  Drift,
  ErrorBox,
  Flow,
  geoOf,
  Listing,
  listingCharX,
  listingHeight,
  listingLineMid,
  MARK,
  MARK_GREEN,
  MARK_RED,
  OK_INK,
  QMono,
  rowsAt,
  Spot,
  spotH,
  Stage,
  SyntaxBreak,
  type SynPart,
  TableName,
  tableGeometry,
  X0,
} from "./parts";

const TOP = 330;
const LIST_TOP = 300;
const SIZE = 19;
const R_X = 760;
const KEYS = { left: 1590, width: 180 };

/**
 * Questions 4 and 5 on the page's customer_updates, 24 rows from 12
 * customers. The page's ROW_NUMBER block stays on the left, the answer, and
 * the right column tries the alternatives against it: customer 3's rows
 * numbered from the newest, row 1 kept; the window moved into WHERE and
 * refused; GROUP BY with MAX, which keeps the times and loses the email;
 * the video's own tie, which RANK keeps twice and ROW_NUMBER settles by the
 * engine's choice; the tiebreaker slot; DISTINCT ON. Then QUALIFY: the
 * page's three filters, the logical order as four boxes, the page's
 * snippet refused by Postgres and run in DuckDB, and the engines that have it.
 */
export const LatestScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Question 4 ──
  const from = n.beat("latest").from;
  const qAt = n.word("latest", "Question four");
  const textAt = n.word("latest", "How do you deduplicate");
  const asked = n.word("latest", "latest record per key") + 2;
  const numberAt = n.word("latest-how", "Number each customer's rows");
  const newestAt = n.word("latest-how", "from the newest");
  const keepAt = n.word("latest-how", "keep row one");
  const updatesAt = n.word("latest-how", "twenty-four updates");
  const twelveAt = n.word("latest-how", "twelve rows come out");
  const wrapAt = n.word("latest-where", "a wrapping query");
  const cantAt = n.word("latest-where", "where can't see a window function");
  const saysAt = n.word("latest-where", "Postgres says so");
  const maxAt = n.word("latest-max", "Group by with max");
  const timeAt = n.word("latest-max", "latest time");
  const losesAt = n.word("latest-max", "loses the email");
  const tieAt = n.word("latest-tie", "The follow-up is a tie");
  const secondAt = n.word("latest-tie", "a second update");
  const sameAt = n.word("latest-tie", "the very same second");
  const rankAt = n.word("latest-tie", "Rank numbers both of them one");
  const thirteenAt = n.word("latest-tie", "thirteen rows come back");
  const rnAt = n.word("latest-tie", "Row number keeps one");
  const choiceAt = n.word("latest-tie", "the engine's choice");
  const breakAt = n.word("latest-break", "Add a tiebreaker");
  const seqAt = n.word("latest-break", "a load sequence number");
  const sameRowAt = n.word("latest-break", "every run keeps the same row");
  const onAt = n.word("latest-on", "distinct on");
  const lineAt1 = n.word("latest-on", "in one line");
  const cloudNoAt = n.word("latest-on", "the big cloud warehouses");

  // ── Question 5 ──
  const q5At = n.word("qualify", "Question five");
  const q5TextAt = n.word("qualify", "What does qualify do");
  const whereAt = n.word("qualify-order", "Where filters raw rows");
  const havingAt = n.word("qualify-order", "Having filters groups");
  const qualAt = n.word("qualify-order", "Qualify filters on");
  const lastAt = n.word("qualify-order", "it runs last");
  const step1At = n.word("qualify-order", "where, then group by");
  const step2At = n.word("qualify-order", "group by and having");
  const step3At = n.word("qualify-order", "then the windows");
  const step4At = n.word("qualify-order", "then qualify");
  const goesAt = n.word("qualify-run", "the wrapping query goes");
  const noQualAt = n.word("qualify-run", "Postgres has no qualify");
  const duckAt = n.word("qualify-run", "runs in DuckDB");
  const sameTwelveAt = n.word("qualify-run", "the same twelve rows");
  const cloudAt = n.word("qualify-who", "Snowflake, BigQuery and Databricks");
  const keepSubAt = n.word("qualify-who", "keep the subquery");
  const frameInAt = n.beat("frame-in").from;
  const end = n.beat("frame-in").to;
  // On the turn back to the frame the page settles back, slowly, into the cut.
  const settle = 1 - 0.6 * map(frame, [frameInAt, n.beat("running").from - 8], [0, 1]);

  const out4 = q5At - 4;

  // ── The page's block, on the left ──
  const L = LATEST.query;
  const listTop = y(LIST_TOP);
  const orderLine = L.lines.findIndex((l) => l.includes("ORDER BY updated_at DESC"));
  const slotX = listingCharX(X0, L.lines[orderLine].length, SIZE);
  const slotY = listingLineMid(listTop, orderLine, SIZE);

  // ── Customer 3, numbered ──
  const C = { cols: ["updated_at", "email", "rn"], rows: CUSTOMER3.page };
  const cg = geoOf(C, R_X, y(TOP), h, { rowH: 50 });
  const countsY = cg.rowTop(C.rows.length) + h(40);

  // ── The window in WHERE ──
  const Wh = LATEST.inWhere;
  const whH = listingHeight(Wh.lines.length, SIZE);

  // ── GROUP BY with MAX, and the email it lost ──
  const M = LATEST.groupMax;
  const mRows = M.rows.map((r) => [...r, ""]);
  const mg = tableGeometry({
    x: R_X,
    top: y(TOP) + listingHeight(M.lines.length, SIZE) + h(20),
    cols: [...M.cols, "email"].map((name) => ({ name })),
    rows: mRows,
    headH: h(36),
    rowH: h(28),
    headSize: 19,
    bodySize: 19,
  });

  // ── The tie ──
  const T = { cols: ["updated_at", "email", "rank", "row_number"], rows: CUSTOMER3.tie };
  const tg = geoOf(T, R_X, y(TOP), h, { rowH: 50 });
  const tieRow = T.rows.findIndex((r) => r[1] === CUSTOMER3.tieEmail);
  const pair = T.rows.flatMap((r, i) => (r[0] === T.rows[tieRow][0] ? [i] : []));
  const rankCol = 2;
  const rnCol = 3;
  const tieNotesY = tg.rowTop(T.rows.length) + h(34);

  // ── DISTINCT ON ──
  const D = LATEST.distinctOn;

  // ── Question 5 ──
  const filters: SynPart[] = [
    { text: "WHERE status = 'paid'", label: "filters raw rows", at: whereAt, hot: { at: whereAt, out: havingAt } },
    { text: "HAVING SUM(amount) > 0", label: "filters aggregated groups", at: havingAt, hot: { at: havingAt, out: qualAt } },
    { text: "QUALIFY rn = 1", label: "filters on the window result", at: qualAt, hot: { at: qualAt } },
  ];
  const stepsY = y(470);
  const stepH = h(60);
  const steps = [
    { w: 170, at: step1At, text: <QMono>WHERE</QMono> },
    {
      w: 330,
      at: step2At,
      text: (
        <>
          <QMono>GROUP BY</QMono>, <QMono>HAVING</QMono>
        </>
      ),
    },
    { w: 190, at: step3At, text: "Windows" },
    { w: 190, at: step4At, text: <QMono>QUALIFY</QMono>, last: true },
  ];
  const STEP_GAP = 80;
  const stepX = steps.map((_, i) => X0 + steps.slice(0, i).reduce((s, st) => s + st.w + STEP_GAP, 0));
  const PG = QUALIFY.postgres;
  const DK = QUALIFY.duckdb;
  const qTop = y(614);
  const qRight = 700;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={numberAt + 4} level={-35} />
      <Sfx name="el-tap" at={keepAt + 2} level={-33} />
      <Sfx name="el-pop" at={twelveAt + 2} level={-32} />
      <Sfx name="el-scratch" at={saysAt + 2} level={-34} />
      <Sfx name="el-scratch" at={losesAt + 6} level={-34} />
      <Sfx name="el-pop" at={sameAt} level={-30} />
      <Sfx name="el-tap" at={rankAt + 4} level={-33} />
      <Sfx name="el-tap" at={rnAt + 4} level={-33} />
      <Sfx name="el-pencil" at={seqAt} level={-35} />
      <Sfx name="el-pop" at={lineAt1} level={-32} />
      <Sfx name="el-pencil" at={whereAt} level={-35} />
      <Sfx name="el-pencil" at={havingAt} level={-35} />
      <Sfx name="el-pencil" at={qualAt} level={-35} />
      {steps.map((s, i) => (
        <Sfx key={i} name="el-tap" at={s.at} level={-34} />
      ))}
      <Sfx name="el-scratch" at={noQualAt + 4} level={-34} />
      <Sfx name="el-pop" at={sameTwelveAt} level={-32} />
      <Sfx name="el-sprinkle" at={cloudAt} level={-34} />

      <Drift from={from} to={end + 40}>
        <AbsoluteFill style={{ opacity: settle }}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} out={out4} size={60}>
          How do you deduplicate to the latest record per key?
        </QuestionCard>
        <QuestionCard n={5} at={q5At} textAt={q5TextAt - 2} size={60}>
          What does <QMono>QUALIFY</QMono> do, and how does it relate to <QMono>WHERE</QMono> and <QMono>HAVING</QMono>?
        </QuestionCard>

        {/* ── 4. The page's block, the answer, on the left ── */}
        <Note at={asked - 2} x={X0} y={listTop - h(38)} out={out4}>
          <span style={{ ...label(21, INK), whiteSpace: "nowrap" }}>The page&rsquo;s block</span>
        </Note>
        <Listing
          lines={L.lines}
          x={X0}
          top={listTop}
          width={560}
          size={SIZE}
          at={asked}
          step={2}
          out={out4}
          marks={[
            { line: "ROW_NUMBER() OVER (", at: numberAt + 2, out: wrapAt },
            { line: "PARTITION BY customer_id", at: numberAt + 10, out: wrapAt },
            { line: "ORDER BY updated_at DESC", at: newestAt, out: wrapAt },
            { line: "WHERE rn = 1", at: keepAt, color: MARK_GREEN },
            { line: "FROM (", at: wrapAt + 2, out: maxAt },
            { line: ") ranked", at: wrapAt + 6, out: maxAt },
          ]}
        />
        {/* The tiebreaker's slot, written onto the ORDER BY. */}
        <Note at={breakAt + 2} x={slotX} y={slotY - 17} out={out4}>
          <span style={{ fontFamily: MONO, fontSize: SIZE, fontWeight: 500, color: INK, whiteSpace: "pre", fontVariantLigatures: "none", lineHeight: "34px" }}>
            ,{" "}
            <span style={{ background: ease(frame, seqAt, 10) > 0 ? HIGHLIGHT : undefined, padding: "2px 4px", borderRadius: 3 }}>&lt;tiebreaker&gt;</span>
          </span>
        </Note>

        {/* ── Customer 3, numbered from the newest ── */}
        <Stage from={numberAt - 2} to={cantAt - 4}>
          <TableName g={cg} at={numberAt - 2}>
            customer 3&rsquo;s rows
          </TableName>
          <DataTable
            g={cg}
            cols={colsOf(C, { rn: { ink: BLUE_INK, at: numberAt + 6 } })}
            at={numberAt - 2}
            rows={C.rows.map((cells, i) => ({ cells, at: numberAt + 2 + i * 3, dimAt: i > 0 ? keepAt + 4 : undefined }))}
            bands={[{ row: 0, at: keepAt + 2, color: MARK_GREEN }]}
          />
          <Note at={updatesAt} x={R_X} y={countsY}>
            <span style={{ ...note(26, INK), whiteSpace: "nowrap", ...TABULAR }}>
              {LATEST.rows} updates from {LATEST.customers} customers
            </span>
          </Note>
          <Note at={twelveAt} x={R_X} y={countsY + h(48)}>
            <span style={{ ...note(26, OK_INK), whiteSpace: "nowrap", ...TABULAR }}>{LATEST.kept} rows out, one per customer</span>
          </Note>
        </Stage>

        {/* ── The window in WHERE, refused ── */}
        <Stage from={cantAt - 4} to={maxAt - 4}>
          <Listing lines={Wh.lines} x={R_X} top={y(TOP)} size={SIZE} at={cantAt - 4} marks={[{ line: "WHERE ROW_NUMBER()", at: cantAt + 6, color: MARK_RED }]} />
          <ErrorBox x={R_X} top={y(TOP) + whH + h(22)} width={640} at={saysAt} kind={Wh.kind} message={Wh.message} size={21} />
        </Stage>

        {/* ── GROUP BY with MAX: the times, not the email ── */}
        <Stage from={maxAt - 4} to={tieAt - 4}>
          <Listing lines={M.lines} x={R_X} top={y(TOP)} size={SIZE} at={maxAt - 4} marks={[{ line: "MAX(updated_at)", at: timeAt }]} />
          <DataTable
            g={mg}
            cols={[{ name: "customer_id", numeric: true }, { name: "updated_at", ink: BLUE_INK }, { name: "email" }]}
            at={maxAt + 6}
            rows={rowsAt(mRows, maxAt + 10, 1)}
          />
          <Note at={losesAt + 8} x={mg.right + 30} y={mg.top + h(4)}>
            <span style={{ ...note(24, ACCENT_INK), whiteSpace: "nowrap" }}>The email that goes with it is gone</span>
          </Note>
        </Stage>

        {/* ── The tie ── */}
        <Stage from={tieAt - 4} to={onAt - 4}>
          <TableName g={tg} at={tieAt}>
            customer 3, with a tie
          </TableName>
          <DataTable
            g={tg}
            cols={[
              { name: "updated_at" },
              { name: "email" },
              { name: "rank", numeric: true, at: rankAt, ink: BLUE_INK },
              { name: "row_number", numeric: true, at: rnAt, ink: BLUE_INK },
            ]}
            at={tieAt}
            rows={T.rows.map((cells, i) => ({ cells, at: i === tieRow ? secondAt + 2 : tieAt + 4 + i * 2, grow: i === tieRow }))}
            marks={[
              ...pair.map((row) => ({ row, col: 0, at: sameAt + 2, out: rankAt })),
              ...pair.map((row, k) => ({ row, col: rankCol, at: rankAt + 10 + k * 3, color: MARK_RED })),
              ...pair.map((row, k) => ({ row, col: rnCol, at: choiceAt + k * 3, color: MARK })),
            ]}
          />
          <Spot art="keys" at={sameAt} left={KEYS.left} top={tg.rowMid(pair[0]) - spotH("keys", KEYS.width) / 2 + h(20)} width={KEYS.width} />
          <Note at={thirteenAt} x={R_X} y={tieNotesY}>
            <span style={{ ...note(25, ACCENT_INK), whiteSpace: "nowrap", ...TABULAR }}>
              <QMono>RANK</QMono>: {LATEST.tieRankCount} rows come back
            </span>
          </Note>
          <Note at={rnAt + 4} x={R_X} y={tieNotesY + h(46)}>
            <span style={{ ...note(25, INK), whiteSpace: "nowrap", ...TABULAR }}>
              <QMono>ROW_NUMBER</QMono>: {LATEST.tieRowNumberCount} rows
              <span style={{ color: INK_SOFT, opacity: ease(frame, choiceAt, 10) }}>, but which of the pair is 1?</span>
            </span>
          </Note>
          <Note at={sameRowAt} x={R_X} y={tieNotesY + h(92)}>
            <span style={{ ...note(25, OK_INK), whiteSpace: "nowrap" }}>With a tiebreaker, every run keeps the same row</span>
          </Note>
        </Stage>

        {/* ── DISTINCT ON ── */}
        <Stage from={onAt - 4} to={out4}>
          <Listing lines={D.lines} x={R_X} top={y(TOP)} size={SIZE} at={onAt - 4} marks={[{ line: "DISTINCT ON (customer_id)", at: lineAt1 }]} />
          <div style={{ position: "absolute", left: R_X, top: y(TOP) + listingHeight(D.lines.length, SIZE) + h(34), display: "flex", alignItems: "center", gap: 12, opacity: ease(frame, lineAt1 + 6, 10) }}>
            <Tick at={lineAt1 + 8} size={26} />
            <span style={{ ...note(25, INK), whiteSpace: "nowrap", ...TABULAR }}>The same {D.rows.length} rows as the page&rsquo;s block</span>
          </div>
          <div style={{ position: "absolute", left: R_X, top: y(TOP) + listingHeight(D.lines.length, SIZE) + h(92), display: "flex", alignItems: "center", gap: 14, fontSize: 24, whiteSpace: "nowrap", opacity: ease(frame, cloudNoAt - 4, 10) }}>
            <span style={{ ...note(24, INK_SOFT) }}>Has it:</span>
            <Chip tone="ink" size={24}>
              Postgres
            </Chip>
            <Chip tone="ink" size={24}>
              DuckDB
            </Chip>
          </div>
          <Note at={cloudNoAt + 4} x={R_X} y={y(TOP) + listingHeight(D.lines.length, SIZE) + h(150)}>
            <span style={{ ...note(25, ACCENT_INK), whiteSpace: "nowrap" }}>The big cloud warehouses don&rsquo;t</span>
          </Note>
        </Stage>

        {/* ── 5. Three filters, and the order they run in ── */}
        <SyntaxBreak parts={filters} x={X0} top={y(TOP) - h(10)} at={q5At + 10} dim={goesAt} />
        {steps.map((s, i) => {
          const x = stepX[i];
          const lit = s.last ? ease(frame, lastAt, 10) * (1 - ease(frame, goesAt, 10)) : 0;
          return (
            <React.Fragment key={i}>
              <Box x={x} y={stepsY} w={s.w} h={stepH} at={s.at - 2} ink={lit > 0.5 ? inkOf.yellow : INK} dim={goesAt}>
                <span style={{ ...label(24, "currentColor"), whiteSpace: "nowrap" }}>{s.text}</span>
              </Box>
              {i > 0 ? (
                <Flow
                  points={[
                    [stepX[i - 1] + steps[i - 1].w + 10, stepsY + stepH / 2],
                    [x - 10, stepsY + stepH / 2],
                  ]}
                  at={s.at - 4}
                  dur={8}
                  width={2.4}
                  head={12}
                  dim={goesAt}
                />
              ) : null}
            </React.Fragment>
          );
        })}

        {/* ── QUALIFY: refused by Postgres, run in DuckDB ── */}
        <Note at={goesAt} x={X0} y={qTop - h(38)}>
          <span style={{ ...label(21, INK), whiteSpace: "nowrap" }}>
            {ease(frame, duckAt, 8) < 0.5 ? "In Postgres" : `In ${QUALIFY.duckdbVersion}`}
          </span>
        </Note>
        <Listing
          lines={PG.lines}
          x={X0}
          top={qTop}
          width={qRight - X0 + 40}
          size={SIZE}
          at={goesAt}
          out={duckAt}
          marks={[{ line: "QUALIFY ROW_NUMBER()", at: goesAt + 10 }]}
        />
        <Listing
          lines={DK.lines}
          x={X0}
          top={qTop}
          width={qRight - X0 + 40}
          size={SIZE}
          at={duckAt}
          lineAt={DK.lines.map((_, i) => (i < PG.lines.length ? duckAt : duckAt + 8))}
          marks={[{ line: "QUALIFY ROW_NUMBER()", at: duckAt + 2, color: MARK_GREEN }]}
        />
        <ErrorBox x={qRight + 100} top={qTop} width={560} at={noQualAt + 4} kind={PG.kind} message={PG.message} size={20} out={duckAt + 4} />
        <div style={{ position: "absolute", left: qRight + 100, top: qTop + h(6), display: "flex", alignItems: "center", gap: 12, opacity: ease(frame, sameTwelveAt - 2, 10) }}>
          <Tick at={sameTwelveAt} size={26} />
          <span style={{ ...note(25, INK), whiteSpace: "nowrap", ...TABULAR }}>{DK.rows.length} rows: the same twelve as the subquery</span>
        </div>
        <Note at={cloudAt - 4} x={qRight + 100} y={qTop + h(76)}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>Has it:</span>
        </Note>
        <div style={{ position: "absolute", left: qRight + 100, top: qTop + h(116), display: "flex", gap: 14, fontSize: 24 }}>
          {QUALIFY.engines.map((e, i) => {
            const p = ease(frame, cloudAt + i * 5, 10);
            return (
              <span key={e} style={{ opacity: p, transform: `translateY(${(1 - p) * 8}px)` }}>
                <Chip tone="ink" size={24}>
                  {e}
                </Chip>
              </span>
            );
          })}
        </div>
        <Note at={keepSubAt - 4} x={qRight + 100} y={qTop + h(186)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            <Chip tone="gray" size={24}>
              Postgres
            </Chip>{" "}
            keep the subquery
          </span>
        </Note>
        </AbsoluteFill>
      </Drift>
    </AbsoluteFill>
  );
};
