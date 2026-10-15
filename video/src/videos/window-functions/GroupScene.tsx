import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, headline, INK_SOFT, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import {
  GROUP_ROW,
  GROUP_SQL,
  GROUPED,
  ILLUSTRATIONS,
  PARTITIONS,
  PARTS,
  regionOf,
  ROWS_SQL,
  TABLE,
  TOTAL,
  VIDEO,
} from "./data";
import {
  BODY_Y,
  CellText,
  cellBox,
  COL_W,
  Fig,
  FIG_Y,
  HeadText,
  Headline,
  LIST_SIZE,
  LIST_W,
  Listing,
  listingHeight,
  MARK,
  Mono,
  RowCount,
  Rules,
  useTable,
  Wash,
  X0,
} from "./kit";

/**
 * Rows, ask, group, lost: the six sales as a table, then the same table under
 * GROUP BY, its rows sliding together until each region is one row.
 */
export const GroupScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();

  // The page opens just ahead of the first word, so a longer lead-in moves it too.
  const open = Math.max(0, n.beat("rows").from - 13);
  const sixAt = n.word("rows", "six sales");
  const regionsAt = n.word("rows", "two regions");
  const daysAt = n.word("rows", "three days");
  const askAt = n.word("ask", "Say");
  const groupAt = n.word("group", "GROUP BY");
  const foldAt = n.word("group", "folding");
  const inAt = n.word("lost", "Six rows go in");
  const outAt = n.word("lost", "two come out");
  const goneAt = n.word("lost", "single sales are gone");
  const compareAt = n.word("lost", "no longer compare");

  const top = y(BODY_Y);
  const g = useTable(TABLE.columns, top);
  const [REGION, DAY, AMOUNT] = [0, 1, 2];

  // The fold, in four overlapping moves: the day column lifts away, the rows
  // slide onto their region's row, the amounts become the total, and the
  // total's column closes the gap the days left.
  const dayGone = ease(frame, foldAt - 2, 12);
  const move = ease(frame, foldAt + 2, 24);
  const others = ease(frame, foldAt + 4, 18);
  const merge = ease(frame, foldAt + 18, 12);
  const shift = ease(frame, foldAt + 22, 16);
  const amountX = g.colX[AMOUNT] - shift * COL_W.day;
  const bodyRows = TABLE.rows.length + (GROUPED.rows.length - TABLE.rows.length) * move;
  const rowAt = (i: number) => sixAt - 2 + i * 3;

  const listTop = top;
  const groupListBottom = listTop + listingHeight(GROUP_SQL.length, LIST_SIZE);
  const press = pop(frame, foldAt - 10, fps, 16);

  return (
    <AbsoluteFill>
      <Headline
        kicker="Window functions in SQL"
        line1="Each region's total,"
        line2="beside every sale."
        at={open + 2}
        mark={{ kind: "strike", at: compareAt - 2 }}
      />

      <Fig n="1" at={open + 8} y={y(FIG_Y)} out={groupAt - 8}>
        Six sales, from the lesson&apos;s table
      </Fig>
      <Fig n="2" at={groupAt - 2} y={y(FIG_Y)}>
        The same rows, <Mono>GROUP BY region</Mono>
      </Fig>

      <Listing
        lines={ROWS_SQL}
        x={X0}
        top={listTop}
        width={LIST_W}
        at={open + 6}
        lineAt={[open + 10, open + 14, open + 18]}
        out={groupAt - 8}
      />
      <Listing
        lines={GROUP_SQL}
        x={X0}
        top={listTop}
        width={LIST_W}
        at={groupAt - 2}
        lineAt={GROUP_SQL.map((_, i) => groupAt + i * 5)}
        marks={[{ line: 2, at: foldAt - 8 }]}
      />

      {/* "two regions", "three days": each column lit while it is named. */}
      <Wash g={g} from={0} to={TABLE.rows.length - 1} col={REGION} color={MARK} at={regionsAt - 2} out={daysAt - 4} />
      <Wash g={g} from={0} to={TABLE.rows.length - 1} col={DAY} color={MARK} at={daysAt - 2} out={askAt} />

      <Rules g={g} rows={bodyRows} at={sixAt - 10} width={g.width - shift * COL_W.day} />
      <Ink at={sixAt - 6} dur={12} style={cellBox(g, REGION, top + 2, g.headH - 2)}>
        <HeadText>{TABLE.columns[REGION]}</HeadText>
      </Ink>
      <Ink at={sixAt - 6} dur={12} style={{ ...cellBox(g, DAY, top + 2, g.headH - 2), opacity: 1 - dayGone }}>
        <HeadText>{TABLE.columns[DAY]}</HeadText>
      </Ink>
      <Ink at={sixAt - 6} dur={12} style={{ ...cellBox(g, AMOUNT, top + 2, g.headH - 2, amountX), opacity: 1 - merge }}>
        <HeadText>{TABLE.columns[AMOUNT]}</HeadText>
      </Ink>
      {merge > 0 ? (
        <div style={{ position: "absolute", ...cellBox(g, AMOUNT, top + 2, g.headH - 2, amountX), opacity: merge }}>
          <HeadText>{GROUPED.columns[1]}</HeadText>
        </div>
      ) : null}

      {TABLE.rows.map((row, i) => {
        const region = regionOf(row);
        const lead = PARTITIONS.find((p) => p.region === region)?.first === i;
        const pos = i + (GROUP_ROW[region] - i) * move;
        const rt = g.rowTop(pos);
        const fade = lead ? 1 : 1 - others;
        if (fade <= 0) return null;
        return (
          <React.Fragment key={i}>
            <Ink at={rowAt(i)} dur={12} style={{ ...cellBox(g, REGION, rt, g.rowH), opacity: fade }}>
              <CellText col="region" value={row[REGION]} />
            </Ink>
            <Ink at={rowAt(i)} dur={12} style={{ ...cellBox(g, DAY, rt, g.rowH), opacity: fade * (1 - dayGone) }}>
              <CellText col="day" value={row[DAY]} />
            </Ink>
            <Ink
              at={rowAt(i)}
              dur={12}
              style={{ ...cellBox(g, AMOUNT, rt, g.rowH, amountX), opacity: fade * (lead ? 1 - merge : 1) }}
            >
              <CellText col="amount" value={row[AMOUNT]} />
            </Ink>
            {lead && merge > 0 ? (
              <div style={{ position: "absolute", ...cellBox(g, AMOUNT, rt, g.rowH, amountX), opacity: merge }}>
                <CellText col="total" value={TOTAL[region]} weight={650} />
              </div>
            ) : null}
          </React.Fragment>
        );
      })}

      <div style={{ position: "absolute", left: g.x + 14, top: g.rowTop(bodyRows) + 12 }}>
        <Ink at={sixAt + 18} dur={12} style={{ left: 0, top: 0, opacity: 1 - merge }}>
          <RowCount n={TABLE.rows.length} />
        </Ink>
        {merge > 0 ? (
          <div style={{ position: "absolute", left: 0, top: 0, opacity: merge }}>
            <RowCount n={GROUPED.rows.length} />
          </div>
        ) : null}
      </div>

      {/* What each total folded together, beside the row it became. */}
      {GROUPED.rows.map((row, i) => (
        <Note
          key={row[0]}
          at={foldAt + 34 + i * 4}
          dim={goneAt}
          x={g.colX[AMOUNT] - COL_W.day + COL_W.amount + 28}
          y={g.rowTop(i) + g.rowH / 2 - 15}
        >
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>{PARTS[regionOf(row)].join(" + ")}</span>
        </Note>
      ))}

      {/* Six in, two out: the row counts, under the query that did it. */}
      <div
        style={{
          position: "absolute",
          left: X0,
          top: groupListBottom + h(44),
          display: "flex",
          flexDirection: "column",
          gap: h(14),
        }}
      >
        <Ink at={inAt - 2} dur={16} style={{ position: "relative", ...headline(62), whiteSpace: "nowrap" }}>
          {TABLE.rows.length} rows in,
        </Ink>
        <Ink
          at={outAt - 2}
          dur={16}
          style={{ position: "relative", ...headline(62, true), color: ACCENT_INK, whiteSpace: "nowrap" }}
        >
          {GROUPED.rows.length} rows out.
        </Ink>
      </div>

      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="window-functions-press"
          style={{
            position: "absolute",
            left: 1470,
            top: y(470),
            width: 320,
            height: h(270),
            opacity: press,
            transform: `translateY(${bob(frame, 4, 110) + (1 - press) * 26}px)`,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
