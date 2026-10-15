import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { ease, pop } from "../../components/motion";
import { useNarration } from "../../narration/NarrationContext";
import { colors, ds } from "../../theme/brand";
import { MONO, SANS } from "../../theme/fonts";
import {
  CUSTOMERS,
  LIMIT,
  ORDERS,
  VIDEO,
  WHERE_MIN,
  customerColor,
  groupsKept,
  kept,
  sorted,
  totals,
  type Customer,
} from "./data";

// Panel geometry (1080p CSS px). The query card's map sits to the left.
const PANEL_X = 900;
const PANEL_W = 956;
const TABLE_W = 520;
const TABLE_X = PANEL_X + (PANEL_W - TABLE_W) / 2;
const TABLE_Y = 352;
const ROW_H = 50;
const CARD_W = 210;
const CARD_GAP = 24;
const CARD_X0 = PANEL_X + (PANEL_W - (4 * CARD_W + 3 * CARD_GAP)) / 2;
const CARD_Y = 316;
const CHIP_H = 46;
const CHIP_STEP = 56;
const SUM_Y = CARD_Y + 70 + 3 * CHIP_STEP + 6;
const RESULT_Y = 382;
const RESULT_H = 54;
const RESULT_STEP = 66;

type Box = { x: number; y: number; w: number; h: number };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpBox = (a: Box, b: Box, t: number): Box => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  w: lerp(a.w, b.w, t),
  h: lerp(a.h, b.h, t),
});

const tableRow = (slot: number): Box => ({ x: TABLE_X, y: TABLE_Y + slot * ROW_H, w: TABLE_W, h: ROW_H - 8 });
const cardX = (c: Customer) => CARD_X0 + CUSTOMERS.indexOf(c) * (CARD_W + CARD_GAP);
const chip = (c: Customer, j: number): Box => ({
  x: cardX(c) + 14,
  y: CARD_Y + 70 + j * CHIP_STEP,
  w: CARD_W - 28,
  h: CHIP_H,
});
const sumBox = (c: Customer): Box => ({ x: cardX(c) + 14, y: SUM_Y, w: CARD_W - 28, h: 56 });
const resultRow = (slot: number): Box => ({ x: TABLE_X, y: RESULT_Y + slot * RESULT_STEP, w: TABLE_W, h: RESULT_H });

const STAGES = [
  { beat: "from", step: 1, clause: "FROM", what: "gathers the rows", icon: "sql-eo-from" },
  { beat: "where", step: 2, clause: "WHERE", what: "filters single rows", icon: "sql-eo-where" },
  { beat: "group-by", step: 3, clause: "GROUP BY", what: "forms groups", icon: "sql-eo-group-by" },
  { beat: "having", step: 4, clause: "HAVING", what: "filters whole groups", icon: "sql-eo-having" },
  { beat: "select", step: 5, clause: "SELECT", what: "computes and names columns", icon: "sql-eo-select" },
  { beat: "order-by", step: 8, clause: "ORDER BY", what: "sorts the result", icon: "sql-eo-order-by" },
  { beat: "limit", step: 9, clause: "LIMIT", what: "keeps the first rows", icon: "sql-eo-limit" },
] as const;

/** The trace: one table of orders, reshaped by each clause in turn. */
export const TracePanel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();

  const rowsIn = n.word("from", "gathers");
  const strikeAt = n.word("where", "Anything");
  const goneAt = n.word("where", "gone");
  const groupAt = n.word("group-by", "group");
  const sumAt = n.word("having", "whole");
  const thirtyAt = n.word("having", "thirty");
  const outAt = n.word("having", "out");
  const selectAt = n.word("select", "SELECT");
  const totalAt = n.word("select", "total");
  const sortAt = n.word("order-by", "sorts");
  const topAt = n.word("limit", "top");
  const twoAt = n.word("limit", "two");

  const pStrike = ease(frame, strikeAt, 10);
  const pDrop = ease(frame, goneAt, 14);
  const pGroup = ease(frame, groupAt, 20);
  const pSum = ease(frame, sumAt, 12);
  const pDeeMark = ease(frame, thirtyAt, 8);
  const pDeeOut = ease(frame, outAt, 16);
  const pCollapse = ease(frame, selectAt, 14);
  const pResult = ease(frame, selectAt + 8, 20);
  const pTotal = ease(frame, totalAt, 12);
  const pSort = ease(frame, sortAt, 20);
  const pCut = ease(frame, topAt, 12);
  const pKeep = ease(frame, twoAt, 10);
  const panelIn = ease(frame, n.beat("trace-intro").from + 10, 16);

  const count =
    frame < rowsIn ? null
    : frame < goneAt ? `${ORDERS.length} rows`
    : frame < groupAt ? `${kept.length} rows`
    : frame < outAt ? `${totals.length} groups`
    : frame < selectAt ? `${groupsKept.length} groups`
    : frame < topAt ? `${groupsKept.length} rows`
    : `${LIMIT} rows`;

  const stage = [...STAGES].reverse().find((s) => frame >= n.beat(s.beat).from - 6);
  const stageIn = stage ? pop(frame, n.beat(stage.beat).from - 6, fps, 16) : 0;
  const groupPositions = new Map<number, number>();
  for (const c of CUSTOMERS) kept.filter((o) => o.customer === c).forEach((o, j) => groupPositions.set(o.id, j));

  return (
    <div style={{ position: "absolute", inset: 0, opacity: panelIn }}>
      {/* Stage header: which clause is running and what it does. */}
      {stage ? (
        <div
          key={stage.beat}
          style={{
            position: "absolute",
            left: PANEL_X,
            top: 104,
            width: PANEL_W,
            height: 180,
            display: "flex",
            alignItems: "center",
            gap: 28,
            opacity: stageIn,
            transform: `translateY(${(1 - stageIn) * 24}px)`,
          }}
        >
          <Illustration video={VIDEO} id={stage.icon} style={{ width: 150, height: 150 }} />
          <div style={{ fontFamily: SANS, color: colors.ink }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: colors.accentInk, letterSpacing: "0.04em" }}>
              STEP {stage.step}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 58, fontWeight: 700, lineHeight: 1.1 }}>{stage.clause}</div>
            <div style={{ fontSize: 32, color: colors.inkSoft }}>{stage.what}</div>
          </div>
          {count ? (
            <div
              style={{
                marginLeft: "auto",
                padding: "10px 22px",
                borderRadius: 999,
                background: colors.surface,
                border: `2px solid ${colors.line}`,
                fontFamily: SANS,
                fontWeight: 700,
                fontSize: 28,
                color: colors.inkSoft,
              }}
            >
              {count}
            </div>
          ) : null}
        </div>
      ) : null}
      {stage?.beat === "order-by" ? (
        <div
          style={{
            position: "absolute",
            left: TABLE_X,
            top: RESULT_Y + 3 * RESULT_STEP + 18,
            fontFamily: SANS,
            fontSize: 26,
            color: colors.inkFaint,
            opacity: ease(frame, n.beat("order-by").from, 12),
          }}
        >
          Steps 6 and 7 had nothing to do here.
        </div>
      ) : null}

      {/* FROM / WHERE: the table header. */}
      <TableHeader
        y={TABLE_Y - 44}
        right="amount"
        opacity={ease(frame, rowsIn, 10) * (1 - pGroup)}
      />

      {/* GROUP BY / HAVING: one card per customer. */}
      {totals.map((g) => {
        const dee = g.total <= 50;
        const out = dee ? pDeeOut : 0;
        const o = pGroup * (1 - pCollapse) * (1 - out);
        if (o <= 0) return null;
        return (
          <div
            key={g.customer}
            style={{
              position: "absolute",
              left: cardX(g.customer),
              top: CARD_Y + out * 60,
              width: CARD_W,
              height: SUM_Y - CARD_Y + 70,
              borderRadius: 22,
              background: colors.page,
              border: `3px solid ${dee && pDeeMark > 0 ? ds("red") : colors.line}`,
              opacity: o,
            }}
          >
            <div
              style={{
                margin: "14px 14px 0",
                height: 42,
                borderRadius: 999,
                background: customerColor(g.customer),
                color: colors.page,
                fontFamily: SANS,
                fontWeight: 800,
                fontSize: 26,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {g.customer}
            </div>
            <div
              style={{
                position: "absolute",
                left: 14,
                right: 14,
                top: SUM_Y - CARD_Y,
                height: 56,
                borderRadius: 14,
                background: dee && pDeeMark > 0 ? ds("red", 100) : ds("yellow", 100),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                fontFamily: MONO,
                fontWeight: 700,
                fontSize: 30,
                color: dee && pDeeMark > 0 ? colors.badInk : colors.ink,
                opacity: pSum,
              }}
            >
              <span style={{ fontSize: 22, color: colors.inkSoft }}>SUM</span>
              {g.total}
              {dee ? <span style={{ fontFamily: SANS, fontSize: 24, opacity: pDeeMark }}>≤ 50</span> : null}
            </div>
          </div>
        );
      })}

      {/* The ten orders, from table rows to group chips. */}
      {ORDERS.map((o, i) => {
        const keep = o.amount > WHERE_MIN;
        const compact = kept.findIndex((k) => k.id === o.id);
        let box = tableRow(i);
        let opacity = pop(frame, rowsIn + i * 2, fps, 18);
        if (keep) {
          box = lerpBox(box, tableRow(compact), pDrop);
          box = lerpBox(box, chip(o.customer, groupPositions.get(o.id) ?? 0), pGroup);
          box = lerpBox(box, sumBox(o.customer), pCollapse * 0.7);
          opacity *= 1 - pCollapse;
          if (o.customer === "dee") {
            box = { ...box, y: box.y + pDeeOut * 60 };
            opacity *= 1 - pDeeOut;
          }
        } else {
          opacity *= 1 - pDrop;
        }
        if (opacity <= 0) return null;
        return (
          <div
            key={o.id}
            style={{
              position: "absolute",
              left: box.x,
              top: box.y,
              width: box.w,
              height: box.h,
              borderRadius: 12,
              background: !keep && pStrike > 0 ? ds("red", 50) : colors.surface,
              border: `2px solid ${colors.line}`,
              display: "flex",
              alignItems: "center",
              padding: "0 18px",
              fontFamily: MONO,
              fontSize: 28,
              fontWeight: 600,
              color: colors.ink,
              opacity,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
                // Gone early in the move, so labels don't smear mid-flight.
                opacity: 1 - Math.min(1, pGroup * 2.5),
                width: (1 - pGroup) * 220,
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ width: 16, height: 16, borderRadius: 99, background: customerColor(o.customer) }} />
              {o.customer}
            </span>
            <span style={{ marginLeft: "auto", marginRight: pGroup > 0.5 ? "auto" : 0 }}>{o.amount}</span>
            {!keep ? (
              <span
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  height: 4,
                  borderRadius: 2,
                  width: `calc(${pStrike * 100}% - 24px)`,
                  background: ds("red"),
                }}
              />
            ) : null}
          </div>
        );
      })}

      {/* SELECT / ORDER BY / LIMIT: the result table. */}
      <TableHeader
        y={RESULT_Y - 50}
        right="total"
        rightMark={pTotal}
        opacity={pResult}
      />
      {groupsKept.map((g, slot) => {
        const sortedSlot = sorted.findIndex((s) => s.customer === g.customer);
        let box = lerpBox(sumBox(g.customer), resultRow(slot), pResult);
        box = lerpBox(box, resultRow(sortedSlot), pSort);
        const cut = sortedSlot >= LIMIT;
        const opacity = pResult * (cut ? 1 - 0.7 * pCut : 1);
        return (
          <div
            key={g.customer}
            style={{
              position: "absolute",
              left: box.x,
              top: box.y,
              width: box.w,
              height: box.h,
              borderRadius: 14,
              background: colors.page,
              border: `3px solid ${!cut && pKeep > 0 ? ds("green") : colors.line}`,
              display: "flex",
              alignItems: "center",
              padding: "0 22px",
              fontFamily: MONO,
              fontSize: 32,
              fontWeight: 700,
              color: colors.ink,
              opacity,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
              <span style={{ width: 18, height: 18, borderRadius: 99, background: customerColor(g.customer) }} />
              {g.customer}
            </span>
            <span style={{ marginLeft: "auto" }}>{g.total}</span>
          </div>
        );
      })}
      {/* LIMIT's cut line, between the rows it keeps and the rest. */}
      <div
        style={{
          position: "absolute",
          left: TABLE_X - 30,
          top: RESULT_Y + LIMIT * RESULT_STEP - 7,
          width: (TABLE_W + 60) * pCut,
          borderTop: `4px dashed ${ds("red")}`,
          opacity: pCut,
        }}
      />
    </div>
  );
};

const TableHeader: React.FC<{ y: number; right: string; rightMark?: number; opacity: number }> = ({
  y,
  right,
  rightMark = 0,
  opacity,
}) =>
  opacity <= 0 ? null : (
    <div
      style={{
        position: "absolute",
        left: TABLE_X,
        top: y,
        width: TABLE_W,
        display: "flex",
        padding: "0 22px",
        fontFamily: MONO,
        fontSize: 26,
        fontWeight: 600,
        color: colors.inkSoft,
        opacity,
      }}
    >
      <span>customer</span>
      <span
        style={{
          marginLeft: "auto",
          padding: "0 8px",
          borderRadius: 6,
          background: `color-mix(in srgb, ${ds("yellow")} ${rightMark * 70}%, transparent)`,
          color: rightMark > 0.5 ? colors.ink : colors.inkSoft,
        }}
      >
        {right}
      </span>
    </div>
  );
