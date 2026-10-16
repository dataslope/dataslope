import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, body, headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Leader, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { CUSTOMERS, ILLUSTRATIONS, ORDER_CUSTOMER_IDS, TRAP_ROWS, TRAP_SQL, VIDEO } from "./data";
import {
  Fig,
  Listing,
  Mono,
  rowTop,
  SqlValue,
  Table,
  tableGeometry,
  Underline,
  UNKNOWN_INK,
  UNKNOWN_WASH,
} from "./kit";

const LEFT = 120;
const LIST_W = 700;
const CODE = 28;
const CELL = 28;
/** Layout rows, before `y()`. */
const FIG_Y = 380;
const RULE_Y = 426;
const RESULT_LABEL_Y = 752;
const RESULT_Y = 788;
/** The two tables the query reads, right of the listing. */
const CUST_X = 900;
const ORD_X = 1240;
const NOTE_X = 1512;

/**
 * Hook to culprit: the query that should find the customers with no orders,
 * the two tables it reads, the empty result Postgres hands back, and the one
 * NULL in the orders table that causes it.
 */
export const TrapScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y } = useLayout();

  // The page opens just ahead of the first word, so a longer lead-in moves it too.
  const open = Math.max(0, n.beat("hook").from - 13);
  const neverAt = n.word("hook", "never placed");
  const queryAt = n.word("hook", "This query");
  const graceAt = n.word("expect", "Grace");
  const maeAt = n.word("expect", "Mae");
  const expectAt = n.word("expect", "expect two names");
  const returnsAt = n.word("expect", "returns");
  const noRowsAt = n.word("expect", "no rows");
  const errorAt = n.word("expect", "no error");
  const guestAt = n.word("culprit", "guest order");
  const accountAt = n.word("culprit", "no account");
  const idAt = n.word("culprit", "customer id");
  const nullAt = n.word("culprit", "NULL");

  const top = y(RULE_Y);
  const g = tableGeometry(CELL);
  const nullRow = ORDER_CUSTOMER_IDS.indexOf(null);
  const nullMid = rowTop(top, nullRow, CELL) + g.rowH / 2;
  const basket = pop(frame, noRowsAt - 4, fps, 16);

  return (
    <AbsoluteFill>
      <Ink at={open} dur={14} style={{ left: LEFT + 4, top: y(112) }}>
        <span style={label(21, ACCENT_INK)}>Working with NULL in Postgres</span>
      </Ink>
      <Ink
        at={open + 2}
        dur={22}
        style={{
          left: LEFT - 4,
          top: y(150),
          ...headline(88),
          whiteSpace: "nowrap",
        }}
      >
        Who has never ordered?
      </Ink>
      <Ink
        at={noRowsAt - 2}
        dur={20}
        style={{
          left: LEFT - 4,
          top: y(238),
          ...headline(88, true),
          whiteSpace: "nowrap",
        }}
      >
        <Underline at={noRowsAt + 10} color={ACCENT}>
          Nobody,
        </Underline>{" "}
        says Postgres.
      </Ink>
      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="snt-empty-basket"
          style={{
            position: "absolute",
            left: 1400,
            top: y(96),
            width: 400,
            height: 250,
            opacity: basket,
            transform: `translateY(${bob(frame, 4, 110) + (1 - basket) * 28}px)`,
          }}
        />
      ) : null}

      <Fig n="1" at={neverAt - 4} x={LEFT} y={y(FIG_Y)}>
        The query, and the two tables it reads
      </Fig>
      <Listing
        lines={TRAP_SQL}
        x={LEFT}
        top={top}
        width={LIST_W}
        size={CODE}
        at={queryAt - 10}
        lineAt={TRAP_SQL.map((_, i) => queryAt - 6 + i * 4)}
        marks={[{ line: 3, at: idAt - 2, start: 9, chars: 11, color: UNKNOWN_WASH }]}
      />

      <Table
        x={CUST_X}
        top={top}
        title={{ text: "customers", top: y(FIG_Y) }}
        size={CELL}
        at={neverAt + 6}
        cols={[
          { title: "id", width: 84, align: "right" },
          { title: "name", width: 170 },
        ]}
        rows={CUSTOMERS.map((c) => [<SqlValue key="id" value={c.id} />, <SqlValue key="name" value={c.name} />])}
        rowAt={CUSTOMERS.map((_, i) => neverAt + 12 + i * 3)}
        marks={[
          { row: 1, at: graceAt - 2 },
          { row: 3, at: maeAt - 2 },
        ]}
      />
      <Table
        x={ORD_X}
        top={top}
        title={{ text: "orders", top: y(FIG_Y) }}
        size={CELL}
        at={neverAt + 12}
        cols={[{ title: "customer_id", width: 230, align: "right" }]}
        rows={ORDER_CUSTOMER_IDS.map((v) => [<SqlValue key="v" value={v} />])}
        rowAt={ORDER_CUSTOMER_IDS.map((_, i) => neverAt + 18 + i * 3)}
        marks={[{ row: nullRow, at: guestAt - 4, ring: true }]}
      />
      {/* The culprit, named beside its cell. */}
      <Leader
        points={[
          [NOTE_X - 10, nullMid],
          [ORD_X + 230 - 2, nullMid],
        ]}
        at={accountAt - 4}
        dur={10}
        color={UNKNOWN_INK}
      />
      <Note at={accountAt - 2} x={NOTE_X} y={nullMid - 30} width={290}>
        <div style={{ ...note(21, INK), fontWeight: 600 }}>A guest order</div>
        <div style={{ ...note(20, INK_SOFT) }}>placed with no account</div>
      </Note>
      <Note at={nullAt - 2} x={NOTE_X} y={nullMid + 40} width={290} from="up">
        <span style={note(20, INK_SOFT)}>
          so its <Mono color={INK}>customer_id</Mono> is{" "}
          <Mono color={UNKNOWN_INK} weight={700}>
            NULL
          </Mono>
        </span>
      </Note>

      {/* What came back, against what was expected. */}
      <Ink at={returnsAt - 6} dur={14} style={{ left: LEFT + 4, top: y(RESULT_LABEL_Y) }}>
        <span style={label(21, INK_SOFT)}>What Postgres returns</span>
      </Ink>
      <Table
        x={LEFT}
        top={y(RESULT_Y)}
        size={CELL}
        at={returnsAt - 4}
        cols={[{ title: "name", width: 250 }]}
        rows={TRAP_ROWS.map((v) => [<SqlValue key="v" value={v} />])}
        footer={{
          text: `(${TRAP_ROWS.length} rows)`,
          at: noRowsAt,
          color: ACCENT_INK,
        }}
      />
      <Ink at={expectAt - 4} dur={18} style={{ left: 440, top: y(RESULT_Y) + 4, width: 560 }}>
        <div style={{ ...body(32, true), color: INK }}>We expected Grace and Mae.</div>
      </Ink>
      <Note at={errorAt - 2} x={440} y={y(RESULT_Y) + 60} from="up">
        <span style={note(21, INK_SOFT)}>No error, and no warning.</span>
      </Note>
    </AbsoluteFill>
  );
};
