import React from "react";
import { AbsoluteFill } from "remotion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, INK, INK_SOFT, TABULAR, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { FANOUT, PLAN, VECTOR } from "./data";
import {
  Code,
  colsOf,
  DataTable,
  Drift,
  geoOf,
  Headline,
  KeyArrow,
  Kicker,
  Listing,
  listingHeight,
  Mark,
  MARK_BAD,
  MARK_OK,
  Spot,
  Strike,
  TableName,
  X0,
} from "./parts";

const TOP = 330;
const SIZE = 22;
const MERGED_X = 780;

/**
 * The opening: a merge that runs without a word and returns six rows from
 * four, its revenue 265 → 375 (the video's own frames, settled at question 6).
 * Then the plan, counted the pandas way: fourteen questions grouped by pace,
 * nine worked and five quick, beside the badger. The bridge strikes a loop.
 */
export const HookScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hook").from;
  const mergeAt = n.word("hook", "This merge runs");
  const warnAt = n.word("hook", "without a single warning");
  const fourAt = n.word("hook", "Four orders go in");
  const sixAt = n.word("hook", "six come out");
  const revAt = n.word("hook", "Revenue was");
  const nowAt = n.word("hook", "Now it's three hundred seventy-five");
  const whyAt = n.word("hook", "nothing on the screen says why");
  const runsAt = n.word("plan", "it runs, and it's wrong");
  const fourteenAt = n.word("plan", "fourteen questions");
  const nineAt = n.word("plan", "Nine are worked");
  const fiveAt = n.word("plan", "five go quickly");
  const backAt = n.word("plan", "The merge comes back");
  const loopAt = n.word("vector-in", "nobody wants to see a loop");
  const end = n.beat("vector-in").to;
  const out = fourteenAt - 6;

  const listH = listingHeight(FANOUT.merged.lines.length, SIZE);
  const tablesTop = y(TOP) + listH + h(70);
  const og = geoOf(FANOUT.orders, X0, tablesTop, h, { rowH: 50 });
  const M = FANOUT.merged;
  const mg = geoOf(M, MERGED_X, tablesTop, h, { rowH: 50 });
  // The rows the merge added: the second copy of each of customer 2's orders.
  const order = M.cols.indexOf("order_id");
  const extra = M.rows.flatMap((r, i) => (i > 0 && M.rows[i - 1][order] === r[order] ? [i] : []));
  const amount = M.cols.indexOf("amount");
  const [nBefore, sumBefore] = FANOUT.before;
  const [nAfter, sumAfter] = FANOUT.after;

  // The plan: fourteen questions as a Series, where the hook's frames were.
  const pg = geoOf(PLAN, X0, y(TOP) + listingHeight(PLAN.lines.length, SIZE) + h(40), h, { rowH: 56, bodySize: 30 });
  const loopLine = VECTOR.loop.lines[1];

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={mergeAt + 4} level={-34} />
      <Sfx name="el-whoosh" at={sixAt} level={-34} />
      <Sfx name="el-scratch" at={nowAt + 6} level={-32} />
      <Sfx name="el-pop" at={fourteenAt + 4} level={-34} />
      <Sfx name="el-scratch" at={loopAt + 8} level={-34} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>Data scientist interview prep</Kicker>
        <Headline lead="Four orders in," turn="six out." at={fourAt - 4} turnAt={sixAt - 2} out={runsAt - 6} />
        <Headline lead="It runs," turn="and it's wrong." at={runsAt} turnAt={runsAt + 12} />

        {/* ── The merge that runs ── */}
        <Listing lines={M.lines} x={X0} top={y(TOP)} width={1260} size={SIZE} at={mergeAt - 4} out={out} />
        <Note at={warnAt + 4} x={X0 + 1290} y={y(TOP) + 18} out={out}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>no error, no warning</span>
        </Note>

        <TableName g={og} at={fourAt - 4} out={out}>
          orders
        </TableName>
        <DataTable
          g={og}
          cols={colsOf(FANOUT.orders, { amount: { ink: BLUE_INK } })}
          at={fourAt - 4}
          out={out}
          rows={FANOUT.orders.rows.map((cells, i) => ({ cells, at: fourAt + i * 2 }))}
        />
        <KeyArrow from={[og.right + 14, og.rowMid(1)]} to={[mg.x - 14, mg.rowMid(1)]} at={sixAt - 8} out={out} />
        <TableName g={mg} at={sixAt - 4} out={out}>
          merged
        </TableName>
        <DataTable
          g={mg}
          cols={colsOf(M, { amount: { ink: BLUE_INK } })}
          at={sixAt - 4}
          out={out}
          rows={M.rows.map((cells, i) => ({ cells, at: sixAt + i * 3 }))}
          bands={extra.map((row) => ({ row, at: nowAt + 4, color: MARK_BAD }))}
          marks={extra.map((row) => ({ row, col: amount, at: nowAt + 8, color: MARK_BAD }))}
        />
        <Note at={revAt} x={X0} y={og.rowTop(FANOUT.orders.rows.length) + h(18)} out={out}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap", ...TABULAR }}>
            {nBefore} rows, revenue {sumBefore}
          </span>
        </Note>
        <Note at={nowAt} x={MERGED_X} y={mg.rowTop(M.rows.length) + h(18)} out={out}>
          <span style={{ ...note(26, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>
            {nAfter} rows, revenue <Mark at={whyAt}>{sumAfter}</Mark>
          </span>
        </Note>

        {/* ── The plan: fourteen questions, by pace ── */}
        <Listing lines={PLAN.lines} x={X0} top={y(TOP)} width={760} size={SIZE} at={fourteenAt - 2} />
        <DataTable
          g={pg}
          cols={colsOf(PLAN)}
          at={fourteenAt}
          rows={PLAN.rows.map((cells, i) => ({ cells, at: fourteenAt + 4 + i * 4 }))}
          bands={[
            { row: 0, at: nineAt, color: MARK_OK },
            { row: 1, at: fiveAt },
          ]}
        />
        <Note at={backAt} x={X0} y={pg.rowTop(PLAN.rows.length) + h(36)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            the merge: <Mark at={backAt + 8}>question 6</Mark>
          </span>
        </Note>
        <Note at={loopAt - 2} x={X0} y={pg.rowTop(PLAN.rows.length) + h(110)}>
          <Strike at={loopAt + 8}>
            <Code line={loopLine} size={24} />
          </Strike>
        </Note>

        <Spot id="ds-python-pandas-badger" at={fourteenAt + 8} left={1060} top={y(300)} width={720} height={540} />
      </Drift>
    </AbsoluteFill>
  );
};
