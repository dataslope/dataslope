import React from "react";
import { AbsoluteFill } from "remotion";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { C, CUSTOMER_COLS, CUSTOMERS_AFTER, J, JOIN_COLS, JOIN_ROWS, JOIN_SQL } from "./data";
import {
  BODY_Y,
  DbTable,
  Fig,
  FIG_Y,
  HEAD_H,
  Headline,
  KEY_INK,
  Listing,
  listingHeight,
  Mono,
  RIGHT_X,
  ROW_H,
  tableGeometry,
  X0,
} from "./kit";

const SIZE = 26;
const LISTING_W = 780;
/** The stored customers table, on the right. */
const STORED_X = RIGHT_X + 40;

/**
 * Reading it back: a join rebuilds the wide view on demand. Ada's email
 * appears on two rows of the result and on one row of what is stored.
 */
export const JoinScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const open = n.beat("join").from - 10;
  const joinAt = n.word("join", "A join");
  const rebuildsAt = n.word("join", "rebuilds");
  const repeatsAt = n.word("join", "repeats");
  const storedAt = n.word("join", "stored only once");

  const listTop = y(BODY_Y);
  const resultTop = listTop + listingHeight(JOIN_SQL.length, SIZE) + h(48);
  const rg = tableGeometry({ x: X0, top: resultTop, cols: JOIN_COLS, rows: JOIN_ROWS, headH: h(HEAD_H), rowH: h(ROW_H) });
  const sg = tableGeometry({
    x: STORED_X,
    top: y(BODY_Y) + h(46),
    cols: CUSTOMER_COLS,
    rows: CUSTOMERS_AFTER,
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });

  return (
    <AbsoluteFill>
      <Headline kicker="Reading it back" lead="Shown twice," turn="stored once." at={open} underlineAt={storedAt} />

      <Fig n="6" at={open + 6} y={y(FIG_Y)}>
        The wide view, rebuilt by a join
      </Fig>
      <Listing
        lines={JOIN_SQL}
        x={X0}
        top={listTop}
        width={LISTING_W}
        size={SIZE}
        at={open + 4}
        lineAt={[joinAt - 6, joinAt - 2, joinAt + 2, joinAt + 6]}
      />
      <DbTable
        g={rg}
        cols={JOIN_COLS}
        rows={JOIN_ROWS.map((cells, i) => ({ cells, at: rebuildsAt + 2 + i * 5 }))}
        at={rebuildsAt - 2}
        numeric={[J.id]}
        marks={JOIN_ROWS.map((_, i) => ({ row: i, col: J.email, at: repeatsAt + i * 5 }))}
      />

      <Ink at={open + 8} dur={14} style={{ left: sg.x, top: y(BODY_Y) }}>
        <span style={{ ...label(24, INK), whiteSpace: "nowrap" }}>
          <Mono>customers</Mono>, as stored
        </span>
      </Ink>
      <DbTable
        g={sg}
        cols={CUSTOMER_COLS}
        rows={CUSTOMERS_AFTER.map((cells, i) => ({ cells, at: open + 10 + i * 3 }))}
        at={open + 8}
        numeric={[C.id]}
        colInk={{ [C.id]: KEY_INK }}
        marks={[{ row: 0, col: C.email, at: storedAt }]}
      />
      <Note at={storedAt + 6} x={sg.x} y={sg.bottom(CUSTOMERS_AFTER.length) + h(30)} from="up">
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
          Two rows of the result, one row of <Mono>customers</Mono>
        </span>
      </Note>
    </AbsoluteFill>
  );
};
