import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { headline, HIGHLIGHT, INK } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { FILTER_LINE, JOIN_LINE, nullRows, ON, SQL_LINES, VANISHED } from "./data";
import {
  Fig,
  joinCols,
  KEPT_INK,
  KEPT_WASH,
  Listing,
  listingHeight,
  Mono,
  NULL_INK,
  noteText,
  rowCount,
  STAGE,
  Table,
} from "./kit";

/**
 * Fix and on: the same test, moved from WHERE into the ON clause. It now
 * chooses which orders match, so the customers with none come back.
 */
export const OnScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const start = n.beat("fix").from;
  /** Everything carried over from Fig. 3 is already printed when the cut lands. */
  const pre = start - 40;
  const moveAt = n.word("fix", "move");
  const onAt = n.word("fix", "ON clause");
  const decidesAt = n.word("on", "only decides");
  const backAt = n.word("on", "come back");
  const nullsAt = n.word("on", "with NULLs");

  const top = y(STAGE.top);
  const lines = SQL_LINES.where;
  const listBottom = top + listingHeight(lines.length, STAGE.codeSize);
  const swapAt = onAt - 6;
  // The ON clause runs from its ON line to the moved condition.
  const onLine = SQL_LINES.on.findIndex((l) => l.trimStart().startsWith("ON "));
  const onSpan = FILTER_LINE - onLine + 1;
  const indent = SQL_LINES.on[onLine].length - SQL_LINES.on[onLine].trimStart().length;
  const onChars = Math.max(...SQL_LINES.on.slice(onLine, FILTER_LINE + 1).map((l) => l.length)) - indent;

  const back = nullRows(ON.rows);
  const rowScale = ON.rows.map((_, i) => (back.includes(i) ? ease(frame, backAt - 2, 14) : 1));
  const shown = rowScale.filter((s) => s > 0.5).length;

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 116, top: y(104), display: "flex", gap: "0.26em", ...headline(56) }}>
        <Ink at={start - 14} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
          Move it into <Mono weight={600}>ON</Mono>,
        </Ink>
        <Ink
          at={backAt - 2}
          dur={18}
          style={{ position: "relative", ...headline(56, true), color: KEPT_INK, whiteSpace: "nowrap" }}
        >
          and they come back.
        </Ink>
      </div>
      <Fig n="4" at={start - 8} x={STAGE.listX} y={y(196)}>
        The same test, moved into the join condition
      </Fig>

      <Listing
        lines={lines}
        x={STAGE.listX}
        top={top}
        width={STAGE.listW}
        size={STAGE.codeSize}
        at={pre}
        lineAt={lines.map(() => pre)}
        swaps={[{ line: FILTER_LINE, text: SQL_LINES.on[FILTER_LINE], at: swapAt }]}
        marks={[
          { line: FILTER_LINE, at: pre, out: moveAt, color: HIGHLIGHT },
          { line: onLine, lines: onSpan, start: indent, chars: onChars, at: onAt + 8, color: KEPT_WASH },
        ]}
        strikes={[{ line: JOIN_LINE, start: 0, chars: 4, at: pre, out: swapAt + 10 }]}
      />

      <Table
        x={STAGE.tableX}
        top={top}
        size={STAGE.tableSize}
        at={pre}
        cols={joinCols(ON.fields)}
        rows={ON.rows}
        rowAt={ON.rows.map((_, i) => (back.includes(i) ? backAt + 4 + back.indexOf(i) * 4 : pre))}
        rowScale={rowScale}
        marks={[
          ...back.map((row, k) => ({ row, at: backAt + 8 + k * 4, color: KEPT_WASH })),
          ...back.flatMap((row, k) => [1, 2].map((col) => ({ row, col, at: nullsAt + k * 4 + col * 2, ring: true }))),
        ]}
        footer={{ text: rowCount(shown), at: pre }}
      />

      <div style={{ position: "absolute", left: STAGE.listX, top: listBottom + h(44), display: "flex", flexDirection: "column", gap: 14 }}>
        <Ink at={decidesAt - 2} dur={14} style={{ position: "relative" }}>
          <span style={noteText(24, INK)}>
            In <Mono>ON</Mono>, the test only picks which orders match.
          </span>
        </Ink>
        <Ink at={backAt + 6} dur={14} style={{ position: "relative" }}>
          <span style={noteText(24)}>
            {VANISHED.join(" and ")} match none, so their order columns are <Mono color={NULL_INK} weight={700}>NULL</Mono>.
          </span>
        </Ink>
      </div>
    </AbsoluteFill>
  );
};
