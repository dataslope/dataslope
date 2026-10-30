import React from "react";
import { AbsoluteFill } from "remotion";
import { QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, INK, INK_SOFT, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { LATEST, RANK } from "./data";
import {
  colsOf,
  DataTable,
  Drift,
  geoOf,
  lineOf,
  Listing,
  listingHeight,
  Mark,
  MARK,
  MARK_BAD,
  MARK_OK,
  OK_INK,
  rowsAt,
  TableName,
  X0,
} from "./parts";

const TOP = 330;
const SIZE = 21;
const RESULT_X = 1000;
const SUB_X = 800;
const SUB_W = 740;
const SUB_SIZE = 20;
const Q3_RESULT_X = 900;

/**
 * Questions 1, 2 and 3, laid out after da-advanced-sql's RankScene on the
 * Data Engineer page's own tables. The page's 24 players, rows 11 to 17 by
 * row number, where four 80s tie: RANK gives them 13 and skips to 17,
 * DENSE_RANK 10 and goes on to 11. Then the page's 24 events: the first three
 * users' rows numbered from the newest, every row after the first struck, and
 * the subquery that keeps number one (the Postgres way): ten rows. A second
 * event for user 3 at the same moment (the video's own) shows why it is
 * ROW_NUMBER: RANK numbers both 1 and keeps eleven. Then the page's QUALIFY,
 * the same ten rows with no subquery, and the engines that have it.
 */
export const RankScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("rank").from;
  const textAt = n.word("rank", "What's the difference");
  // The table arrives on the question's last words.
  const asked = n.word("rank", "row number") + 4;
  const playersAt = n.word("rank-ties", "twenty-four players");
  const eightyAt = n.word("rank-ties", "tie at eighty");
  const rnAt = n.word("rank-three", "Row number gives each row");
  const arbitraryAt = n.word("rank-three", "broken arbitrarily");
  const rankAt = n.word("rank-three", "Rank lets them share thirteen");
  const seventeenAt = n.word("rank-three", "skips to seventeen");
  const denseAt = n.word("rank-three", "Dense rank shares ten");
  const elevenAt = n.word("rank-three", "on to eleven");
  const q2At = n.word("latest", "Question two");
  const q2TextAt = n.word("latest", "How do you keep only");
  const numberAt = n.word("latest", "Number each user's events");
  const keepAt = n.word("latest", "keep number one");
  const countAt = n.word("latest-count", "Twenty-four events go in");
  const tenAt = n.word("latest-count", "ten rows come out");
  const notRankAt = n.word("latest-tie", "Use row number, not rank");
  const sameAt = n.word("latest-tie", "two events at the same moment");
  const bothAt = n.word("latest-tie", "rank numbers both of them one");
  const twiceAt = n.word("latest-tie", "comes back twice");
  const exactlyAt = n.word("latest-tie", "keeps exactly one");
  const tiebreakAt = n.word("latest-tie", "without a tiebreaker");
  const q3At = n.word("qualify", "Question three");
  const q3TextAt = n.word("qualify", "What is qualify");
  const filtersAt = n.word("qualify", "filters on a window function");
  const havingAt = n.word("qualify", "the way having filters");
  const goesAt = n.word("qualify", "The subquery goes");
  const sameTenAt = n.word("qualify", "the same ten rows");
  const enginesAt = n.word("qualify-where", "DuckDB, BigQuery");
  const notAt = n.word("qualify-where", "Postgres and my sequel don't");
  const bridgeAt = n.beat("order-in").from;
  // The finished page holds through the bridge and fades into the cut.
  const end = n.beat("order-in").to;

  // ── Question 1 ──
  const T = RANK.ties;
  const tg = geoOf(T, RESULT_X, y(TOP) + h(40), h, { rowH: 48 });
  const col = (name: string) => T.cols.indexOf(name);
  const eighties = T.rows.flatMap((r, i) => (r[col("score")] === "80" ? [i] : []));
  const after = T.rows.findIndex((r, i) => i > eighties[eighties.length - 1]);
  const rankTie = T.rows[eighties[0]][col("rnk")];
  const rankNext = T.rows[after][col("rnk")];
  const denseTie = T.rows[eighties[0]][col("dr")];
  const denseNext = T.rows[after][col("dr")];
  const out1 = q2At - 4;
  const notesY = y(TOP) + listingHeight(RANK.lines.length, SIZE) + h(30);

  // ── Question 2 ──
  const N = LATEST.numbered;
  const ng = geoOf(N, X0, y(TOP) - h(10), h, { rowH: 46, bodySize: 22, headSize: 20 });
  const rn = N.cols.indexOf("rn");
  const firsts = N.rows.flatMap((r, i) => (r[rn] === "1" ? [i] : []));
  const S = LATEST.subquery;
  const subH = listingHeight(S.lines.length, SUB_SIZE);
  const out2 = q3At - 4;
  // The tie: user 3's events as RANK numbers them, in the numbered table's place.
  const U = LATEST.userThree;
  const ug = geoOf(U, X0, y(TOP) + h(20), h, { rowH: 48, bodySize: 22, headSize: 20 });
  const urnk = U.cols.indexOf("rnk");
  const ones = U.rows.flatMap((r, i) => (r[urnk] === "1" ? [i] : []));
  const tieNotesY = ug.rowTop(U.rows.length) + h(26);
  // The tie and its notes stay until QUALIFY's listing takes their place, so
  // the last note has time to be read.
  const tieOut = filtersAt - 6;

  // ── Question 3 ──
  const Q = LATEST.qualify;
  const qg = geoOf(Q, Q3_RESULT_X, y(TOP) - h(10), h, { rowH: 42, bodySize: 22, headSize: 20 });
  const qNotesY = y(TOP) + listingHeight(Q.lines.length, SIZE) + h(30);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={eightyAt} level={-34} />
      <Sfx name="el-tap" at={seventeenAt} level={-34} />
      <Sfx name="el-pop" at={elevenAt} level={-34} />
      <Sfx name="el-scratch" at={keepAt + 4} level={-34} />
      <Sfx name="el-pop" at={tenAt} level={-34} />
      <Sfx name="el-scratch" at={twiceAt} level={-34} />
      <Sfx name="el-pop" at={sameTenAt} level={-34} />

      <Drift from={from} to={end + 40}>
        <>
          <QuestionCard n={1} at={from - 8} textAt={textAt - 4} out={out1} size={60}>
            What&apos;s the difference between <QMono>RANK</QMono>, <QMono>DENSE_RANK</QMono>, and <QMono>ROW_NUMBER</QMono>?
          </QuestionCard>
          <QuestionCard n={2} at={q2At} textAt={q2TextAt - 2} out={out2} size={60}>
            How do you keep only the latest row per key?
          </QuestionCard>
          <QuestionCard n={3} at={q3At} textAt={q3TextAt - 2} size={60}>
            What is <QMono>QUALIFY</QMono>, and which engines support it?
          </QuestionCard>

          {/* ── Question 1: the page's ranking, where the 80s tie ── */}
          <Listing lines={RANK.lines} x={X0} top={y(TOP)} width={700} size={SIZE} at={asked - 6} out={out1} />
          <Note at={playersAt} x={RESULT_X} y={y(TOP)} out={out1}>
            <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
              <QMono>players</QMono>, rows <Num>11</Num> to <Num>17</Num> of the page&apos;s <Num>{RANK.rows}</Num>
            </span>
          </Note>
          <DataTable
            g={tg}
            cols={colsOf(T, { rn: { ink: BLUE_INK }, rnk: { ink: BLUE_INK }, dr: { ink: BLUE_INK } })}
            at={asked - 2}
            out={out1}
            rows={rowsAt(T.rows, asked + 2)}
            bands={eighties.map((row) => ({ row, at: eightyAt + 2, out: rnAt, color: MARK }))}
            marks={[
              ...T.rows.map((_, row) => ({ row, col: col("rn"), at: rnAt + 4 + row * 2, out: rankAt })),
              ...[...eighties, after].map((row, k) => ({ row, col: col("rnk"), at: (row === after ? seventeenAt : rankAt + 8) + k * 3, out: denseAt })),
              ...[...eighties, after].map((row, k) => ({ row, col: col("dr"), at: (row === after ? elevenAt : denseAt + 8) + k * 3, color: MARK_OK })),
            ]}
          />
          <Note at={arbitraryAt} x={X0} y={notesY} out={out1}>
            <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
              <QMono>ROW_NUMBER</QMono>: unique, ties broken arbitrarily
            </span>
          </Note>
          <Note at={seventeenAt - 4} x={X0} y={notesY + h(46)} out={out1}>
            <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
              <QMono>RANK</QMono>: ties share, then it <b>skips</b> (<Num>{rankTie}</Num>, then <Num>{rankNext}</Num>)
            </span>
          </Note>
          <Note at={elevenAt - 4} x={X0} y={notesY + h(92)} out={out1}>
            <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
              <QMono>DENSE_RANK</QMono>: ties share, <b>no gap</b> (<Num>{denseTie}</Num>, then <Num>{denseNext}</Num>)
            </span>
          </Note>

          {/* ── Question 2: number from the newest, keep number one ── */}
          <TableName g={ng} at={numberAt - 6} out={notRankAt}>
            events, users 1 to 3 of {LATEST.users}
          </TableName>
          <DataTable
            g={ng}
            cols={colsOf(N, { rn: { ink: BLUE_INK, at: numberAt + 6 } })}
            at={numberAt - 6}
            out={notRankAt}
            rows={N.rows.map((cells, i) => ({
              cells,
              at: numberAt - 2 + i * 2,
              strikeAt: cells[rn] === "1" ? undefined : keepAt + 4 + i * 2,
              strikeColor: INK_SOFT,
            }))}
            bands={firsts.map((row, k) => ({ row, at: keepAt + 8 + k * 3, color: MARK_OK }))}
          />
          <Listing
            lines={S.lines}
            x={SUB_X}
            top={y(TOP)}
            width={SUB_W}
            size={SUB_SIZE}
            at={numberAt - 2}
            out={goesAt - 2}
            marks={[
              { line: lineOf(S.lines, "PARTITION BY user_id"), at: keepAt + 4, out: notRankAt },
              { line: lineOf(S.lines, "WHERE rn = 1"), at: keepAt + 12, color: MARK_OK, out: notRankAt },
              { line: lineOf(S.lines, "ROW_NUMBER()"), at: notRankAt + 2, color: MARK_OK },
            ]}
          />
          <Note at={countAt} x={SUB_X} y={y(TOP) + subH + h(24)} out={notRankAt}>
            <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
              <Num>{LATEST.events}</Num> events in, <Mark at={tenAt}><Num>{S.rows.length}</Num> rows out: one per user</Mark>
            </span>
          </Note>

          {/* The tie: two events for user 3 at one moment. */}
          <TableName g={ug} at={notRankAt + 6} out={tieOut}>
            user 3, with a second event at the same moment
          </TableName>
          <DataTable
            g={ug}
            cols={colsOf(U, { rnk: { ink: BLUE_INK } })}
            at={notRankAt + 6}
            out={tieOut}
            rows={rowsAt(U.rows, notRankAt + 10)}
            bands={ones.map((row) => ({ row, at: sameAt + 10, out: bothAt, color: MARK }))}
            marks={ones.map((row, k) => ({ row, col: urnk, at: bothAt + 4 + k * 4, color: MARK_BAD }))}
          />
          <Note at={twiceAt} x={X0} y={tieNotesY} out={tieOut}>
            <span style={{ ...note(25, ACCENT_INK), whiteSpace: "nowrap" }}>
              <QMono>RANK</QMono> keeps both: <Num>{LATEST.rankKept}</Num> rows, user 3 twice
            </span>
          </Note>
          <Note at={exactlyAt} x={X0} y={tieNotesY + h(44)} out={tieOut}>
            <span style={{ ...note(25, OK_INK), whiteSpace: "nowrap" }}>
              <QMono>ROW_NUMBER</QMono> keeps one: <Num>{LATEST.rowNumberKept}</Num> rows
            </span>
          </Note>
          <Note at={tiebreakAt - 4} x={X0} y={tieNotesY + h(88)} out={tieOut}>
            <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
              which one is arbitrary, unless <QMono>ORDER BY</QMono> breaks the tie
            </span>
          </Note>

          {/* ── Question 3: the same filter, no subquery ── */}
          <Listing
            lines={Q.lines}
            x={X0}
            top={y(TOP)}
            width={660}
            size={SIZE}
            at={filtersAt - 4}
            marks={[{ line: lineOf(Q.lines, "QUALIFY"), at: havingAt, color: MARK_OK }]}
          />
          <DataTable g={qg} cols={colsOf(Q)} at={goesAt - 2} rows={rowsAt(Q.rows, goesAt + 2)} bands={Q.rows.map((_, row) => ({ row, at: sameTenAt + row, color: MARK_OK }))} />
          <Note at={havingAt + 4} x={X0} y={qNotesY}>
            <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
              <Mark at={bridgeAt}>
                like <QMono>HAVING</QMono>, for a window function
              </Mark>
            </span>
          </Note>
          <Note at={sameTenAt} x={X0} y={qNotesY + h(46)}>
            <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
              the subquery&apos;s <Num>{S.rows.length}</Num> rows, with no subquery
            </span>
          </Note>
          <Note at={enginesAt - 2} x={X0} y={qNotesY + h(100)}>
            <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>DuckDB, BigQuery, Snowflake, Databricks</span>
          </Note>
          <Note at={notAt - 2} x={X0} y={qNotesY + h(140)}>
            <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>not Postgres or MySQL: keep the subquery there</span>
          </Note>
        </>
      </Drift>
    </AbsoluteFill>
  );
};
