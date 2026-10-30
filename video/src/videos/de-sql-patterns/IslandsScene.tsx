import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK_INK, QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, INK, INK_SOFT, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ISLANDS } from "./data";
import { colsOf, DataTable, Drift, geoOf, lineOf, Listing, MARK, MARK_BAD, MARK_OK, rowsAt, TableName, X0 } from "./parts";

const TOP = 320;
const LIST_X = 600;
const LIST_W = 560;
const SIZE = 18;
const RESULT_X = 1180;

/** One blue tint per island, lightest first: data, told apart by tone. */
const TINTS = [ds("blue", 100), ds("blue", 200), ds("blue", 300)].map((c) => `color-mix(in srgb, ${c} 85%, transparent)`);

/**
 * Question 9 on the page's daily_logins: user 1's nine logins, numbered by
 * date, with the key the page's query builds (the date minus the number, in
 * days), tinted by island as the key holds still inside each run. The page's
 * query beside it, and user 1's three islands: 3, 2 and 4 days. Then the
 * catch, the video's own second login on January 2: the number moves and the
 * date doesn't, the key goes wrong, and the first two streaks come out as one
 * that never happened (January 1 to 6, 4 rows). Deduplicating the days first
 * puts the three islands back.
 */
export const IslandsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("islands").from;
  const qAt = n.word("islands", "Question");
  const textAt = n.word("islands", "What is the gaps-and-islands problem");
  const runsAt = n.word("islands", "runs of consecutive rows");
  const gapsAt = n.word("islands", "between the breaks");
  const numberAt = n.word("islands-key", "Number each user's logins");
  const subtractAt = n.word("islands-key", "subtract that number");
  const insideAt = n.word("islands-key", "Inside a run");
  const stillAt = n.word("islands-key", "the difference holds still");
  const keyAt = n.word("islands-group", "the island's key");
  const groupAt = n.word("islands-group", "Group by it");
  const threeAt = n.word("islands-group", "three days, two, then four");
  const catchAt = n.word("islands-dupe", "One catch");
  const secondAt = n.word("islands-dupe", "a second login on the same day");
  const bumpsAt = n.word("islands-dupe", "bumps the number");
  const addAt = n.word("islands-dupe", "Add one on the second");
  const mergeAt = n.word("islands-dupe", "two streaks merge");
  const dedupAt = n.word("islands-dupe", "Deduplicate the days first");
  const clearAt = n.beat("anti").from - 8 - 30;
  const end = n.beat("anti-in").to;

  // ── User 1's logins and their keys ──
  const K = ISLANDS.keys;
  const kg = geoOf(K, X0, y(TOP), h, { rowH: 48, bodySize: 22, headSize: 20, extra: ISLANDS.dupKeys.rows });
  const grp = K.cols.indexOf("grp");
  const rnCol = K.cols.indexOf("rn");
  const keys = [...new Set(K.rows.map((r) => r[grp]))];
  const islandOf = (r: readonly string[]) => keys.indexOf(r[grp]);
  const steps = (beatFrom: number, beatTo: number, count: number) => (k: number) => beatFrom + ((beatTo - beatFrom) * k) / Math.max(1, count - 1);
  const rowStep = steps(stillAt, keyAt - 6, K.rows.length);

  // The duplicate: the same table, one row longer, in the first's place.
  const D = ISLANDS.dupKeys;
  const dupRow = D.rows.findIndex((r, i) => i > 0 && r[0] === D.rows[i - 1][0]);
  const out = catchAt - 4;

  // ── The page's query and its result ──
  const Q = ISLANDS.page;
  const R = ISLANDS.userOne;
  const rg = geoOf(R, RESULT_X, y(TOP), h, { rowH: 50, bodySize: 21, headSize: 19, extra: ISLANDS.dupIslands.rows });
  const W = ISLANDS.dupIslands;
  const wrong = W.rows.flatMap((r, i) => (R.rows.some((s) => s.join() === r.join()) ? [] : [i]));
  const startCol = R.cols.indexOf("island_start");
  // The duplicate's rows whose key puts them in one of those false islands:
  // each key's dates and count, matched against the wrong result rows.
  const falseKeys = new Set(
    [...new Set(D.rows.map((r) => r[grp]))].filter((key) => {
      const dates = D.rows.filter((r) => r[grp] === key).map((r) => r[0]);
      return wrong.some((i) => W.rows[i][startCol] === dates[0] && W.rows[i][startCol + 1] === dates[dates.length - 1] && Number(W.rows[i][startCol + 2]) === dates.length);
    }),
  );
  const brokenRows = D.rows.flatMap((r, i) => (falseKeys.has(r[grp]) ? [i] : []));
  const dedupSelect = /SELECT DISTINCT [^)]*?(?= FROM)/.exec(ISLANDS.dedupedFrom)?.[0];
  if (!dedupSelect) throw new Error("the fix's FROM has no SELECT DISTINCT");

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={numberAt + 6} level={-34} />
      <Sfx name="el-pencil" at={subtractAt + 6} level={-34} />
      <Sfx name="el-sprinkle" at={stillAt + 2} level={-36} />
      <Sfx name="el-pop" at={threeAt} level={-34} />
      <Sfx name="el-scratch" at={mergeAt + 2} level={-34} />
      <Sfx name="el-pop" at={dedupAt + 6} level={-34} />

      <Drift from={from} to={end + 40}>
        <AbsoluteFill style={{ opacity: 1 - ease(frame, clearAt, 36) }}>
          <QuestionCard n={9} at={qAt - 4} textAt={textAt - 4} size={60}>
            What is the gaps-and-islands problem?
          </QuestionCard>

          {/* ── User 1's logins, numbered, and the key ── */}
          <TableName g={kg} at={runsAt - 4} out={out}>
            user 1&rsquo;s logins
          </TableName>
          <DataTable
            g={kg}
            cols={colsOf(K, { rn: { at: numberAt + 2, ink: BLUE_INK }, grp: { at: subtractAt + 2, ink: BLUE_INK } })}
            at={runsAt - 4}
            out={out}
            rows={rowsAt(K.rows, runsAt)}
            bands={K.rows.map((r, row) => ({ row, at: rowStep(row), color: TINTS[islandOf(r) % TINTS.length] }))}
            marks={[
              ...K.rows.map((_, row) => ({ row, col: rnCol, at: insideAt + row, out: stillAt })),
              ...K.rows.map((_, row) => ({ row, col: 0, at: insideAt + row, out: stillAt })),
            ]}
          />
          <Note at={gapsAt} x={kg.right + 14} y={kg.rowTop(3) - h(18)} out={out}>
            <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>gap</span>
          </Note>
          <Note at={gapsAt + 6} x={kg.right + 14} y={kg.rowTop(5) - h(18)} out={out}>
            <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>gap</span>
          </Note>

          <TableName g={kg} at={catchAt} >
            the same, with a second login on Jan 2
          </TableName>
          <DataTable
            g={kg}
            cols={colsOf(D, { rn: { ink: BLUE_INK }, grp: { ink: BLUE_INK } })}
            at={catchAt}
            rows={D.rows.map((cells, i) => ({ cells, at: i === dupRow ? secondAt + 2 : catchAt + 2 + i, grow: i === dupRow }))}
            bands={[{ row: dupRow, at: secondAt + 8, color: MARK }]}
            marks={[
              { row: dupRow, col: rnCol, at: bumpsAt + 2, out: addAt },
              { row: dupRow, col: 0, at: bumpsAt + 6, out: addAt },
              ...brokenRows.map((row, k) => ({ row, col: grp, at: mergeAt - 2 + k * 2, color: MARK_BAD })),
            ]}
          />

          {/* ── The page's query ── */}
          <Listing
            lines={Q.lines}
            x={LIST_X}
            top={y(TOP)}
            width={LIST_W}
            size={SIZE}
            at={numberAt - 4}
            marks={[
              { line: lineOf(Q.lines, "ROW_NUMBER() OVER ("), at: numberAt + 4 },
              { line: lineOf(Q.lines, "login_date - ROW_NUMBER"), at: subtractAt + 2 },
              { line: lineOf(Q.lines, "GROUP BY user_id, grp"), at: groupAt + 2, color: MARK_OK },
            ]}
          />

          {/* ── User 1's islands ── */}
          <TableName g={rg} at={groupAt + 4} out={out}>
            user 1&rsquo;s islands
          </TableName>
          <DataTable
            g={rg}
            cols={colsOf(R, { streak_days: { ink: BLUE_INK } })}
            at={groupAt + 4}
            out={out}
            rows={rowsAt(R.rows, groupAt + 8, 4)}
            bands={R.rows.map((_, row) => ({ row, at: threeAt + row * 6, color: TINTS[row % TINTS.length] }))}
          />
          <TableName g={rg} at={mergeAt - 2} out={dedupAt + 2}>
            with the duplicate
          </TableName>
          <DataTable
            g={rg}
            cols={colsOf(W, { streak_days: { ink: BLUE_INK } })}
            at={mergeAt - 2}
            out={dedupAt + 2}
            rows={rowsAt(W.rows, mergeAt + 2, 3)}
            marks={wrong.flatMap((row, k) => [
              { row, col: startCol, at: mergeAt + 10 + k * 4, color: MARK_BAD },
              { row, col: startCol + 1, at: mergeAt + 12 + k * 4, color: MARK_BAD },
            ])}
          />
          <Note at={mergeAt + 14} x={RESULT_X} y={rg.rowTop(3) + h(20)} out={dedupAt + 2}>
            <span style={{ ...note(24, ACCENT_INK), whiteSpace: "nowrap" }}>
              Jan <Num>{Number(W.rows[wrong[0]][startCol].slice(8))}</Num> to <Num>{Number(W.rows[wrong[0]][startCol + 1].slice(8))}</Num>: a streak that never happened
            </span>
          </Note>
          <TableName g={rg} at={dedupAt + 2}>
            deduplicated first
          </TableName>
          <DataTable
            g={rg}
            cols={colsOf(ISLANDS.dedupedIslands, { streak_days: { ink: BLUE_INK } })}
            at={dedupAt + 2}
            rows={rowsAt(ISLANDS.dedupedIslands.rows, dedupAt + 6, 3)}
            bands={ISLANDS.dedupedIslands.rows.map((_, row) => ({ row, at: dedupAt + 16 + row * 3, color: MARK_OK }))}
          />
          <Note at={dedupAt + 8} x={RESULT_X} y={rg.rowTop(3) + h(20)}>
            <div style={{ ...note(23, OK_INK), whiteSpace: "nowrap" }}>
              <QMono>{dedupSelect}</QMono> first
            </div>
            <div style={{ ...note(23, INK), whiteSpace: "nowrap", marginTop: 8 }}>back to three islands</div>
          </Note>
          <Note at={threeAt + 10} x={RESULT_X} y={rg.rowTop(3) + h(20)} out={out}>
            <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
              <Num>{ISLANDS.userOne.rows.length}</Num> islands from <Num>{K.rows.length}</Num> logins
            </span>
          </Note>
          <Note at={keyAt} x={X0} y={kg.rowTop(K.rows.length) + h(18)} out={out}>
            <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
              <QMono>grp</QMono>: one per island
            </span>
          </Note>
        </AbsoluteFill>
      </Drift>
    </AbsoluteFill>
  );
};
