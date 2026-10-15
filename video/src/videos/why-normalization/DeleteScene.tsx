import React from "react";
import { AbsoluteFill } from "remotion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { MONO } from "../../theme/fonts";
import { DELETE_SQL, F, FLAT_COLS, FLAT_ROWS, LOOKUP_COLS, LOOKUP_ROWS, LOOKUP_SQL } from "./data";
import {
  BODY_Y,
  DbTable,
  Fig,
  FIG_Y,
  HEAD_H,
  Headline,
  Listing,
  listingHeight,
  MARK_BAD,
  RIGHT_X,
  ROW_H,
  TABLE_Y,
  tableGeometry,
  X0,
} from "./kit";

const SIZE = 28;
const LOOKUP_W = 640;

/**
 * The deletion anomaly: Grace's only order is deleted, her row goes, and a
 * lookup afterwards finds nothing left of her.
 */
export const DeleteScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const open = n.beat("delete").from - 10;
  const graceAt = n.word("delete", "Grace cancels");
  const onlyAt = n.word("delete", "only order");
  const deleteAt = n.word("gone", "Delete that row");
  const nameAt = n.word("gone", "her name");
  const goAt = n.word("gone", "go with it");
  const forgotAt = n.word("gone", "forgotten");

  const grace = FLAT_ROWS.length - 1;
  const g = tableGeometry({
    x: X0,
    top: y(TABLE_Y),
    cols: FLAT_COLS,
    rows: FLAT_ROWS,
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });

  // The lookup, in the right column: its statement, then its empty result.
  const lookupTop = y(BODY_Y);
  const resultTop = lookupTop + listingHeight(LOOKUP_SQL.length, SIZE) + h(34);
  const rg = tableGeometry({
    x: RIGHT_X,
    top: resultTop,
    cols: LOOKUP_COLS,
    rows: LOOKUP_ROWS,
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });

  return (
    <AbsoluteFill>
      <Headline
        kicker="Deletion anomaly"
        lead="Delete the order,"
        turn="lose the customer."
        at={open}
        underlineAt={forgotAt}
      />

      <Fig n="4" at={open + 6} y={y(FIG_Y)}>
        Cancelling Grace&apos;s only order
      </Fig>
      <Listing
        lines={DELETE_SQL}
        x={X0}
        top={y(BODY_Y)}
        width={g.width}
        size={SIZE}
        at={open + 4}
        lineAt={[graceAt - 2, graceAt + 6]}
        marks={[{ line: 1, at: onlyAt }]}
      />

      <DbTable
        g={g}
        cols={FLAT_COLS}
        rows={FLAT_ROWS.map((cells, i) => ({
          cells,
          at: open + 8 + i * 3,
          ...(i === grace ? { strikeAt: deleteAt + 2, collapseAt: goAt } : {}),
        }))}
        at={open + 6}
        numeric={[F.id]}
        bands={[{ row: grace, at: onlyAt + 2, color: MARK_BAD }]}
      />

      <Ink at={nameAt - 10} dur={14} style={{ left: RIGHT_X, top: y(FIG_Y) + 2 }}>
        <span style={label(21, INK_SOFT)}>Then, looking for Grace</span>
      </Ink>
      <Listing
        lines={LOOKUP_SQL}
        x={RIGHT_X}
        top={lookupTop}
        width={LOOKUP_W}
        size={SIZE}
        at={nameAt - 8}
        lineAt={[nameAt - 4, nameAt, nameAt + 4]}
      />
      <DbTable g={rg} cols={LOOKUP_COLS} rows={[]} at={forgotAt - 6} />
      <Note at={forgotAt} x={RIGHT_X + 20} y={rg.bottom(0) + h(14)} from="up">
        <div style={{ display: "flex", alignItems: "baseline", gap: 18, whiteSpace: "nowrap" }}>
          <span style={{ fontFamily: MONO, fontSize: 24, color: INK_SOFT }}>(0 rows)</span>
          <span style={note(22, ACCENT_INK)}>Her name and email are gone.</span>
        </div>
      </Note>
    </AbsoluteFill>
  );
};
