import React from "react";
import { AbsoluteFill } from "remotion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, body, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { MONO } from "../../theme/fonts";
import { F, FLAT_COLS, FLAT_ROWS, UPDATE_SQL, UPDATE_TAG, UPDATED_EMAIL } from "./data";
import {
  BODY_Y,
  Bracket,
  DbTable,
  Fig,
  FIG_Y,
  HEAD_H,
  Headline,
  Listing,
  MARK_BAD,
  RIGHT_X,
  ROW_H,
  TABLE_Y,
  tableGeometry,
  X0,
} from "./kit";

const SIZE = 28;

/**
 * The update anomaly: Ada's new email written to order 1 only, Postgres
 * content with it, and two emails for one customer.
 */
export const UpdateScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const open = n.beat("update").from - 10;
  const adaAt = n.word("update", "Ada changes");
  const emailAt = n.word("update", "her email");
  const rushedAt = n.word("update", "rushed");
  const onlyAt = n.word("update", "only");
  const oneAt = n.word("update", "order one");
  const twoAt = n.word("disagree", "two emails");
  const whichAt = n.word("disagree", "which");

  const g = tableGeometry({
    x: X0,
    top: y(TABLE_Y),
    cols: FLAT_COLS,
    rows: FLAT_ROWS,
    extra: [[null, null, null, UPDATED_EMAIL]],
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });
  const right = g.x + g.width;
  const swapAt = oneAt + 6;

  return (
    <AbsoluteFill>
      <Headline kicker="Update anomaly" lead="Change one copy," turn="the rows disagree." at={open} underlineAt={twoAt} />

      <Fig n="2" at={open + 6} y={y(FIG_Y)}>
        Ada&apos;s new email, written to one row
      </Fig>
      <Listing
        lines={UPDATE_SQL}
        x={X0}
        top={y(BODY_Y)}
        width={g.width}
        size={SIZE}
        at={open + 4}
        lineAt={[adaAt - 2, emailAt, rushedAt]}
        marks={[{ line: 2, at: onlyAt }]}
      />

      {/* Postgres's whole answer: one row changed, nothing else said. */}
      <Ink at={swapAt + 4} dur={14} style={{ left: RIGHT_X, top: y(BODY_Y) + 6 }}>
        <div style={label(21, INK_SOFT)}>Postgres replies</div>
        <div style={{ fontFamily: MONO, fontSize: 34, fontWeight: 600, color: INK, marginTop: 14 }}>{UPDATE_TAG}</div>
        <div style={{ ...note(22, INK_SOFT), marginTop: 14 }}>One row changed, and no warning.</div>
      </Ink>

      <DbTable
        g={g}
        cols={FLAT_COLS}
        rows={FLAT_ROWS.map((cells, i) => ({ cells, at: open + 8 + i * 3 }))}
        at={open + 6}
        numeric={[F.id]}
        swaps={[{ row: 0, col: F.email, at: swapAt, value: UPDATED_EMAIL }]}
        marks={[
          { row: 0, col: F.email, at: twoAt, color: MARK_BAD },
          { row: 1, col: F.email, at: twoAt + 5, color: MARK_BAD },
        ]}
      />
      <Bracket x={right + 18} y0={g.rowTop(0) + 10} y1={g.rowTop(2) - 10} at={twoAt + 6} />
      <Note at={twoAt + 10} x={RIGHT_X} y={g.rowTop(0) + 8}>
        <div style={{ ...body(36), color: ACCENT_INK, whiteSpace: "nowrap" }}>Two emails for Ada.</div>
      </Note>
      <Note at={whichAt - 2} x={RIGHT_X} y={g.rowTop(1) + 8}>
        <div style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>Which one is right? The table can&apos;t say.</div>
      </Note>
    </AbsoluteFill>
  );
};
