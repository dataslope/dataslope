import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { INK, label } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import {
  C,
  CUSTOMER_COLS,
  CUSTOMERS,
  CUSTOMERS_AFTER,
  FIX_SQL,
  ILLUSTRATIONS,
  O,
  ORDER_COLS,
  ORDERS,
  POINTS_AT,
  VIDEO,
} from "./data";
import {
  DbTable,
  Fig,
  FIG_Y,
  HEAD_H,
  Headline,
  KEY_INK,
  KeyArrow,
  Listing,
  MARK_KEY,
  Mono,
  ROW_H,
  tableGeometry,
  X0,
} from "./kit";

/** Table names sit on this line; the tables start under it. */
const CAPTION_Y = 352;
const TABLES_Y = 398;
/** The customers table's left edge: room between the two for the arrows. */
const CUSTOMERS_X = 840;
const FIX_Y = 690;
const FIX_SIZE = 24;
const FIX_W = 1080;

/**
 * The cure: the same facts in two tables, a foreign key from each order to
 * its customer, and the three changes from Figs. 2 to 4 made again, safely.
 */
export const SplitScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();

  const open = n.beat("split").from - 10;
  const fixesAt = n.word("split", "fixes");
  const splitAt = n.word("split", "splitting");
  const onceAt = n.word("customers", "once");
  const idAt = n.word("fk", "customer ID");
  const keyAt = n.word("fk", "foreign key");
  const pointAt = n.word("fk", "pointing");
  const placeAt = n.word("home", "exactly one place");
  const adaAt = n.word("fixed", "Ada's");
  const updateAt = n.word("fixed", "update");
  const alanAt = n.word("fixed", "Alan");
  const signAt = n.word("fixed", "sign up");
  const deletingAt = n.word("fixed", "deleting");
  const ordersAt = n.word("fixed", "Grace's order");
  const leavesAt = n.word("fixed", "leaves Grace");

  const og = tableGeometry({
    x: X0,
    top: y(TABLES_Y),
    cols: ORDER_COLS,
    rows: ORDERS,
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });
  const cg = tableGeometry({
    x: CUSTOMERS_X,
    top: y(TABLES_Y),
    cols: CUSTOMER_COLS,
    rows: CUSTOMERS_AFTER,
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });
  const grace = ORDERS.length - 1;
  const box = pop(frame, placeAt - 6, fps, 16);

  return (
    <AbsoluteFill>
      <Headline kicker="Normalization" lead="One fact," turn="one place." at={open} underlineAt={placeAt} />
      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="why-normalization-mailbox"
          style={{
            position: "absolute",
            left: 1490,
            top: y(84),
            width: 310,
            height: 330,
            opacity: box,
            transform: `translateY(${bob(frame, 4, 100) + (1 - box) * 26}px)`,
          }}
        />
      ) : null}

      <Fig n="5" at={open + 6} y={y(FIG_Y)}>
        The same orders, split in two
      </Fig>

      {/* Each table's name, and the key that joins them. */}
      <Ink at={fixesAt} dur={14} style={{ left: og.x, top: y(CAPTION_Y) }}>
        <span style={label(24, INK)}>
          <Mono>orders</Mono>
        </span>
      </Ink>
      <Ink
        at={keyAt - 2}
        dur={14}
        style={{ left: og.xs[O.customer], top: y(CAPTION_Y) + 2, width: og.widths[O.customer], textAlign: "right" }}
      >
        <span style={{ ...label(21, KEY_INK), whiteSpace: "nowrap", paddingRight: 20 }}>foreign key</span>
      </Ink>
      <Ink at={splitAt} dur={14} style={{ left: cg.x, top: y(CAPTION_Y) }}>
        <span style={label(24, INK)}>
          <Mono>customers</Mono>
        </span>
      </Ink>

      <DbTable
        g={og}
        cols={ORDER_COLS}
        rows={ORDERS.map((cells, i) => ({
          cells,
          at: fixesAt + 4 + i * 4,
          ...(i === grace ? { strikeAt: ordersAt, collapseAt: ordersAt + 16 } : {}),
        }))}
        at={fixesAt}
        numeric={[O.id, O.customer]}
        colInk={{ [O.customer]: KEY_INK }}
        marks={ORDERS.map((_, i) => ({ row: i, col: O.customer, at: idAt + i * 4, color: MARK_KEY }))}
      />
      <DbTable
        g={cg}
        cols={CUSTOMER_COLS}
        rows={[
          ...CUSTOMERS.map((cells, i) => ({ cells, at: splitAt + 4 + i * 4 })),
          { cells: CUSTOMERS_AFTER[CUSTOMERS.length], at: signAt, grow: true },
        ]}
        at={splitAt}
        numeric={[C.id]}
        colInk={{ [C.id]: KEY_INK }}
        marks={[{ row: 0, col: C.email, at: onceAt }]}
        swaps={[{ row: 0, col: C.email, at: updateAt, value: CUSTOMERS_AFTER[0][C.email] ?? "" }]}
        bands={[{ row: 1, at: leavesAt }]}
      />

      {/* Each order names its customer's row: drawn as it is said. */}
      {ORDERS.map((_, i) => (
        <KeyArrow
          key={i}
          from={[og.x + og.width + 10, og.rowMid(i)]}
          to={[cg.x - 6, cg.rowMid(POINTS_AT[i])]}
          at={pointAt + i * 5}
          out={i === grace ? ordersAt : undefined}
        />
      ))}

      <Listing
        lines={FIX_SQL}
        x={X0}
        top={y(FIX_Y)}
        width={FIX_W}
        size={FIX_SIZE}
        at={adaAt - 8}
        lineAt={[adaAt - 4, alanAt - 4, deletingAt - 4]}
        marks={[
          { line: 0, at: adaAt, out: alanAt - 2 },
          { line: 1, at: alanAt, out: deletingAt - 2 },
          { line: 2, at: deletingAt },
        ]}
      />
    </AbsoluteFill>
  );
};
