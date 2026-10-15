import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, headline, HIGHLIGHT, INK, label } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { CUSTOMERS, ILLUSTRATIONS, NO_ORDER_IDS, NO_ORDERS, ORDER_CUSTOMER_IDS, ORDERS, VIDEO } from "./data";
import { Fig, Mono, noteText, Table, tableGeometry, Underline } from "./kit";

const SIZE = 28;
const CUST_X = 120;
const ORD_X = 480;
const NOTE_X = 1060;
const TABLE_TOP = 474;

/**
 * Hook and tables: the promise a LEFT JOIN makes, and the lesson's four
 * customers with every order they placed. Linus and Mae have none.
 */
export const KeepScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y } = useLayout();

  // The page opens just ahead of the first word, so a longer lead-in moves it too.
  const open = Math.max(0, n.beat("hook").from - 13);
  const filterAt = n.word("hook", "One small filter");
  const breakAt = n.word("hook", "break");
  const figAt = n.word("tables", "Here");
  const custAt = n.word("tables", "four customers");
  const ordAt = n.word("tables", "their orders");
  const linusAt = n.word("tables", "Linus");
  const neverAt = n.word("tables", "never ordered");
  const boxes = pop(frame, custAt - 6, fps, 16);

  const top = y(TABLE_TOP);
  const g = tableGeometry(SIZE);
  const noOrderRows = CUSTOMERS.rows.flatMap((r, i) => (NO_ORDERS.includes(r[1] as string) ? [i] : []));

  return (
    <AbsoluteFill>
      <Ink at={open} dur={14} style={{ left: 96, top: y(112) }}>
        <span style={label(21, ACCENT_INK)}>Outer joins in Postgres</span>
      </Ink>
      <Ink at={open + 2} dur={22} style={{ left: 92, top: y(150), ...headline(80), whiteSpace: "nowrap" }}>
        A left join keeps every row.
      </Ink>
      <Ink at={filterAt - 4} dur={22} style={{ left: 92, top: y(236), ...headline(80, true), whiteSpace: "nowrap" }}>
        One filter can quietly <Underline at={breakAt - 2} color={ACCENT}>break it.</Underline>
      </Ink>
      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="ljt-mailboxes"
          style={{
            position: "absolute",
            left: 1420,
            top: y(92),
            width: 400,
            height: 270,
            opacity: boxes,
            transform: `translateY(${bob(frame, 4, 110) + (1 - boxes) * 30}px)`,
          }}
        />
      ) : null}

      <Fig n="1" at={figAt - 6} x={CUST_X} y={y(372)}>
        Four of the lesson&apos;s customers, and every order they placed
      </Fig>
      {[
        { x: CUST_X, name: "customers", at: custAt - 4 },
        { x: ORD_X, name: "orders", at: ordAt - 4 },
      ].map((t) => (
        <Ink key={t.name} at={t.at} dur={14} style={{ left: t.x + 14, top: y(TABLE_TOP - 44) }}>
          <span style={{ fontFamily: MONO, fontSize: 24, fontWeight: 600, color: INK }}>{t.name}</span>
        </Ink>
      ))}
      <Table
        x={CUST_X}
        top={top}
        size={SIZE}
        at={custAt}
        cols={CUSTOMERS.fields.map((f, i) => ({ title: f, width: i === 0 ? 90 : 170, align: i === 0 ? "right" : "left" }))}
        rows={CUSTOMERS.rows}
        marks={noOrderRows.map((row, k) => ({ row, at: linusAt + k * 4, color: HIGHLIGHT }))}
      />
      <Table
        x={ORD_X}
        top={top}
        size={SIZE}
        at={ordAt}
        cols={ORDERS.fields.map((f, i) => ({ title: f, width: [110, 210, 160][i], align: "right" }))}
        rows={ORDERS.rows}
        marks={ORDERS.rows.map((_, row) => ({ row, col: 1, at: neverAt + row * 2, color: HIGHLIGHT }))}
      />
      <Note at={neverAt + 4} x={NOTE_X} y={top + g.headH + 4} width={720}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <span style={noteText(24, INK)}>
            Every order&apos;s <Mono>customer_id</Mono> is {ORDER_CUSTOMER_IDS.join(" or ")}.
          </span>
          <span style={noteText(24)}>
            Nothing points at {NO_ORDER_IDS.join(" or ")}: {NO_ORDERS.join(" and ")} have no orders.
          </span>
        </div>
      </Note>
    </AbsoluteFill>
  );
};
