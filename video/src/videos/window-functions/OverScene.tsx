import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, headline } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { OVER_SQL, PARTITIONS, WINDOWED } from "./data";
import {
  BODY_Y,
  CellText,
  cellBox,
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
  PartitionBar,
  REGION_WASH,
  Ring,
  RowCount,
  Rules,
  useTable,
  Wash,
  X0,
} from "./kit";

/**
 * Over, partition, same: the same SUM written as a window function. Every row
 * stays, each region's rows are lit as one partition, and the region's total
 * is written beside each of them.
 */
export const OverScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const open = n.beat("over").from - 8;
  const windowAt = n.word("over", "window function");
  const keepsAt = n.word("over", "keeps every one");
  const partitionAt = n.word("partition", "OVER PARTITION BY region");
  const shareAt = n.word("partition", "share this row's region");
  const writesAt = n.word("partition", "writes the total");
  const besideAt = n.word("partition", "beside each one");
  const northAt = n.word("same", "Three hundred fifty-five");
  const nothingAt = n.word("same", "Nothing collapsed");

  const top = y(BODY_Y);
  const g = useTable(WINDOWED.columns, top);
  const TOTAL_COL = WINDOWED.columns.indexOf("region_total");
  const rows = WINDOWED.rows.length;
  const rowAt = (i: number) => keepsAt - 2 + i * 3;
  /** The new column fills one partition at a time. */
  const totalAt = (i: number) => {
    const p = PARTITIONS.findIndex((q) => i >= q.first && i <= q.last);
    return writesAt + p * 12 + (i - PARTITIONS[p].first) * 3;
  };
  const listBottom = top + listingHeight(OVER_SQL.length, LIST_SIZE);
  const fresh = ease(frame, writesAt - 4, 10) * (1 - ease(frame, nothingAt + 10, 14));

  return (
    <AbsoluteFill>
      <Headline
        kicker="The same sum, as a window function"
        line1="Each region's total,"
        line2="beside every sale."
        at={open + 2}
        mark={{ kind: "under", at: besideAt - 2 }}
      />
      <Fig n="3" at={open + 6} y={y(FIG_Y)}>
        <Mono>SUM(amount) OVER (PARTITION BY region)</Mono>
      </Fig>

      <Listing
        lines={OVER_SQL}
        x={X0}
        top={top}
        width={LIST_W}
        at={open + 4}
        lineAt={[open + 8, windowAt - 2, windowAt + 3, windowAt + 8, open + 12, open + 16]}
        marks={[
          { line: 1, at: partitionAt - 6, start: 2, chars: 16 },
          { line: 2, at: partitionAt + 4, start: 4, chars: 19 },
        ]}
      />

      {/* Each region's rows, lit as one partition. */}
      {PARTITIONS.map((p) => (
        <React.Fragment key={p.region}>
          <Wash g={g} from={p.first} to={p.last} color={REGION_WASH[p.region]} at={shareAt + (p.first ? 6 : 0)} dur={16} />
          <PartitionBar g={g} from={p.first} to={p.last} region={p.region} at={shareAt + (p.first ? 6 : 0)} />
        </React.Fragment>
      ))}
      {/* The new column, while it is new. */}
      {fresh > 0 ? (
        <div
          style={{
            position: "absolute",
            left: g.colX[TOTAL_COL],
            top: top + 3,
            width: g.x + g.width - g.colX[TOTAL_COL],
            height: g.rowTop(rows) - top - 6,
            background: MARK,
            opacity: fresh * 0.75,
          }}
        />
      ) : null}

      <Rules g={g} rows={rows} at={keepsAt - 10} />
      {WINDOWED.columns.map((c, ci) => (
        <Ink
          key={c}
          at={ci === TOTAL_COL ? writesAt - 6 : keepsAt - 6}
          dur={12}
          style={cellBox(g, ci, top + 2, g.headH - 2)}
        >
          <HeadText color={ci === TOTAL_COL ? ACCENT_INK : undefined}>{c}</HeadText>
        </Ink>
      ))}
      {WINDOWED.rows.map((row, i) =>
        row.map((v, ci) => (
          <Ink
            key={`${i}-${ci}`}
            at={ci === TOTAL_COL ? totalAt(i) : rowAt(i)}
            dur={12}
            style={cellBox(g, ci, g.rowTop(i), g.rowH)}
          >
            <CellText col={WINDOWED.columns[ci]} value={v} weight={ci === TOTAL_COL ? 650 : undefined} />
          </Ink>
        )),
      )}
      <Ink at={nothingAt - 2} dur={12} style={{ left: g.x + 14, top: g.rowTop(rows) + 12 }}>
        <RowCount n={rows} />
      </Ink>

      {/* "Three hundred fifty-five, on all three North rows." */}
      <Ring g={g} from={PARTITIONS[0].first} to={PARTITIONS[0].last} col={TOTAL_COL} at={northAt - 2} out={nothingAt + 18} />

      <Ink
        at={nothingAt - 2}
        dur={18}
        style={{ left: X0, top: listBottom + h(44), ...headline(62), whiteSpace: "nowrap" }}
      >
        {rows} rows in, <span style={{ ...headline(62, true), color: ACCENT_INK }}>{rows} rows out.</span>
      </Ink>
    </AbsoluteFill>
  );
};
