import React from "react";
import { AbsoluteFill } from "remotion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, headline, HIGHLIGHT, INK } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { LEFT, NO_ORDER_IDS, NO_ORDERS, nullRows, SQL_LINES } from "./data";
import { Fig, joinCols, Listing, listingHeight, Mono, NULL_INK, noteText, rowCount, STAGE, Table } from "./kit";

/**
 * Left: the plain LEFT JOIN and the seven rows it returns. Every customer is
 * there, and the two with no orders carry NULLs.
 */
export const JoinScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();
  const start = n.beat("left").from;
  const keepsAt = n.word("left", "keeps");
  const fourAt = n.word("left", "all four customers");
  const noMatchAt = n.word("left", "no order matches");
  const nullAt = n.word("left", "come back NULL");

  const top = y(STAGE.top);
  const lines = SQL_LINES.left;
  const listBottom = top + listingHeight(lines.length, STAGE.codeSize);
  const empty = nullRows(LEFT.rows);

  return (
    <AbsoluteFill>
      {/* One line in two inks; the second half follows the first in the flow. */}
      <div style={{ position: "absolute", left: 116, top: y(104), display: "flex", gap: "0.26em", ...headline(56) }}>
        <Ink at={start - 14} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
          A left join keeps all four,
        </Ink>
        <Ink
          at={fourAt + 4}
          dur={18}
          style={{ position: "relative", ...headline(56, true), color: ACCENT_INK, whiteSpace: "nowrap" }}
        >
          orders or not.
        </Ink>
      </div>
      <Fig n="2" at={start - 8} x={STAGE.listX} y={y(196)}>
        The left join, and the rows Postgres returns
      </Fig>

      <Listing
        lines={lines}
        x={STAGE.listX}
        top={top}
        width={STAGE.listW}
        size={STAGE.codeSize}
        at={start - 10}
        lineAt={lines.map((_, i) => start - 6 + i * 4)}
      />
      <Table
        x={STAGE.tableX}
        top={top}
        size={STAGE.tableSize}
        at={keepsAt - 4}
        cols={joinCols(LEFT.fields)}
        rows={LEFT.rows}
        rowAt={LEFT.rows.map((_, i) => fourAt - 2 + i * 3)}
        marks={[
          ...empty.map((row, k) => ({ row, at: noMatchAt + k * 4, color: HIGHLIGHT })),
          ...empty.flatMap((row, k) => [1, 2].map((col) => ({ row, col, at: nullAt + k * 4 + col * 2, ring: true }))),
        ]}
        footer={{ text: rowCount(LEFT.rows.length), at: fourAt + 24 }}
      />
      <Note at={noMatchAt + 6} x={STAGE.listX} y={listBottom + h(44)} width={STAGE.listW}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={noteText(24, INK)}>
            No order has <Mono>customer_id</Mono> {NO_ORDER_IDS.join(" or ")}, so {NO_ORDERS.join(" and ")} match nothing.
          </span>
          <span style={noteText(24)}>
            They stay, with <Mono color={NULL_INK} weight={700}>NULL</Mono> in every order column.
          </span>
        </div>
      </Note>
    </AbsoluteFill>
  );
};
