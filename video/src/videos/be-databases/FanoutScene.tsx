import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK, OK_INK, QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { FANOUT, thousands } from "./data";
import { Drift, Flow, Listing, Spot, X0 } from "./parts";

const TOP = 336;
const CHIP_W = 92;
const CHIP_H = 44;
const GAP_X = 10;
const GAP_Y = 12;
const COLS = 6;
const R_X = 880;
/** How far each repeated copy of an order sits behind the one in front. */
const STACK = 7;

const money = (v: number) => thousands(Math.floor(v)) + (v % 1).toFixed(2).slice(1);

/** One order as a chip: its amount, in mono. */
const Chip: React.FC<{ x: number; y: number; amount: number; tone: "data" | "bad" | "ok" | "sara"; opacity: number; behind?: boolean }> = ({ x, y, amount, tone, opacity, behind }) => {
  const line = tone === "bad" ? ACCENT : tone === "ok" ? OK : tone === "sara" ? inkOf.yellow : BAR;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: CHIP_W,
        height: CHIP_H,
        boxSizing: "border-box",
        borderRadius: 7,
        border: `2px solid ${line}`,
        background: tone === "sara" ? `color-mix(in srgb, ${inkOf.yellow} 22%, ${PAPER})` : `color-mix(in srgb, ${line} 9%, ${PAPER})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: MONO,
        fontSize: 19,
        fontWeight: 600,
        color: INK,
        fontVariantLigatures: "none",
        opacity,
      }}
    >
      {behind ? null : money(amount)}
    </div>
  );
};

/**
 * Question 6. Left: the page's 24 orders as chips, their amounts summing to
 * 2,661.50. Joined to order_items, each order repeats once per item: the
 * same 24 positions on the right, each now a stack of its copies, 48 rows,
 * and the sum 5,451.75 in red; Sara's two orders, three items each, are
 * picked out (304.00 becoming 912.00). The fix counts the items per order
 * first (the CTE), the stacks fold back into one chip each with its item
 * count, and the sum is 2,661.50 again, in green. Row counts stand beside
 * each step.
 */
export const FanoutScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("fanout").from;
  const qAt = n.word("fanout", "Question six");
  const textAt = n.word("fanout", "Why can a join inflate a sum");
  const oneManyAt = n.word("fanout", "Joining to a one-to-many table");
  const ordersAt = n.word("fanout-run", "the page's twenty-four orders");
  const itemsAt = n.word("fanout-run", "to their line items");
  const eachAt = n.word("fanout-run", "each order repeats once per item");
  const rowsAt = n.word("fanout-run", "forty-eight rows");
  const doublesAt = n.word("fanout-run", "the revenue more than doubles");
  const saraAt = n.word("fanout-run", "Sara's three hundred four dollars");
  const nineAt = n.word("fanout-run", "nine hundred twelve");
  const bothAt = n.word("fanout-run", "both her orders have three items");
  const fixAt = n.word("fanout-fix", "Fix it by aggregating the many side");
  const countAt = n.word("fanout-fix", "count the items per order");
  const thenAt = n.word("fanout-fix", "then join");
  const oneRowAt = n.word("fanout-fix", "One row per order");
  const rightAt = n.word("fanout-fix", "the revenue is right again");
  const multAt = n.word("fanout-check", "The error multiplies");
  const sampleAt = n.word("fanout-check", "a small sample can hide it");
  const checkAt = n.word("fanout-check", "Check the row count");
  const end = n.beat("fanout-check").to;

  const top = y(TOP);
  const pos = (i: number) => ({ x: (i % COLS) * (CHIP_W + GAP_X), y: Math.floor(i / COLS) * (CHIP_H + GAP_Y + 6) });
  const gridH = 4 * (CHIP_H + GAP_Y + 6) - GAP_Y;
  const sumY = top + gridH + h(26);
  const saras = FANOUT.list.map((o, i) => (o.name === "Sara" ? i : -1)).filter((i) => i >= 0);
  const fold = ease(frame, oneRowAt - 4, 16);
  const saraLit = ease(frame, saraAt, 10) * (1 - ease(frame, fixAt - 2, 10));
  const fixedLines = FANOUT.fixedQuery.slice(0, FANOUT.fixedQuery.findIndex((l) => l.startsWith(")")) + 1);
  const leftW = COLS * (CHIP_W + GAP_X) - GAP_X;
  const listTop = sumY + h(96);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={ordersAt} level={-34} />
      <Sfx name="el-pencil" at={itemsAt + 2} level={-35} />
      <Sfx name="el-sprinkle" at={eachAt + 2} level={-33} />
      <Sfx name="el-pop" at={doublesAt} level={-30} />
      <Sfx name="el-tap" at={saraAt + 2} level={-33} />
      <Sfx name="el-scratch" at={nineAt + 2} level={-33} />
      <Sfx name="el-pencil" at={countAt + 2} level={-35} />
      <Sfx name="el-whoosh" at={oneRowAt - 2} level={-36} />
      <Sfx name="el-chime" at={rightAt + 2} level={-33} />
      <Sfx name="el-tap" at={checkAt + 4} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} size={58}>
          Why can a join inflate a <QMono>SUM</QMono>, and how do you fix it?
        </QuestionCard>

        {/* ── The orders ── */}
        <Note at={oneManyAt} x={X0} y={top - h(48)}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>
            <SmallCode>orders</SmallCode>: <span style={{ color: BLUE_INK }}><Num>{FANOUT.orders}</Num> rows</span>
          </span>
        </Note>
        {FANOUT.list.map((o, i) => {
          const p = pos(i);
          const lit = saras.includes(i) ? saraLit : 0;
          return <Chip key={o.id} x={X0 + p.x} y={top + p.y} amount={o.amount} tone={lit > 0.5 ? "sara" : "data"} opacity={ease(frame, oneManyAt + i * 0.8, 8)} />;
        })}
        <Note at={ordersAt + 4} x={X0} y={sumY}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <SmallCode>SUM(amount)</SmallCode> = <b style={{ color: BLUE_INK }}>{money(Number(FANOUT.total))}</b>
          </span>
        </Note>

        {/* ── Joined to its items ── */}
        <Flow points={[[X0 + leftW + 22, top + gridH / 2], [R_X - 22, top + gridH / 2]]} at={itemsAt} color={INK} width={2.6} />
        <Note at={itemsAt + 4} x={X0 + leftW + 6} y={top + gridH / 2 - h(46)}>
          <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>join items</span>
        </Note>
        <Note at={rowsAt - 4} x={R_X} y={top - h(48)}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>
            joined:{" "}
            <span style={{ color: fold > 0.5 ? OK_INK : ACCENT_INK }}>
              <Num>{fold > 0.5 ? FANOUT.orders : FANOUT.joinedRows}</Num> rows
            </span>
            <span style={{ ...label(22, INK_SOFT), opacity: ease(frame, oneRowAt, 10) }}>, one per order</span>
          </span>
        </Note>
        {FANOUT.list.map((o, i) => {
          const p = pos(i);
          const lit = saras.includes(i) ? saraLit : 0;
          const tone = lit > 0.5 ? "sara" : fold > 0.5 ? "ok" : "bad";
          return (
            <React.Fragment key={o.id}>
              {Array.from({ length: o.items }, (_, k) => {
                const copy = o.items - 1 - k;
                const show = ease(frame, eachAt + i * 0.9 + copy * 4, 8);
                if (show <= 0) return null;
                const off = copy * STACK * (1 - fold);
                return <Chip key={k} x={R_X + p.x + off} y={top + p.y - off} amount={o.amount} tone={copy > 0 ? "bad" : tone} opacity={copy > 0 ? show * (1 - fold) : show} behind={copy > 0} />;
              })}
              {/* The item count, once the items are counted first. */}
              <div
                style={{
                  position: "absolute",
                  left: R_X + p.x + CHIP_W - 14,
                  top: top + p.y - 12,
                  ...label(19, PAPER),
                  fontWeight: 700,
                  background: OK,
                  borderRadius: 999,
                  padding: "0 7px",
                  lineHeight: 1.3,
                  opacity: ease(frame, oneRowAt + 4 + i * 0.6, 8),
                }}
              >
                ×{o.items}
              </div>
            </React.Fragment>
          );
        })}
        <Note at={doublesAt} x={R_X} y={sumY} out={rightAt - 2}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <SmallCode>SUM(amount)</SmallCode> = <b style={{ color: ACCENT_INK }}>{money(Number(FANOUT.inflatedTotal))}</b>
          </span>
        </Note>
        <Note at={rightAt} x={R_X} y={sumY}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <SmallCode>SUM(amount)</SmallCode> = <b style={{ color: OK_INK }}>{money(Number(FANOUT.fixedTotal))}</b>
          </span>
        </Note>
        <Spot art="coins" at={doublesAt} out={fixAt - 4} left={1600} top={top + h(30)} width={170} />

        {/* ── Sara ── */}
        <Note at={saraAt + 2} x={X0} y={listTop} out={fixAt - 4}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <b style={{ background: `color-mix(in srgb, ${inkOf.yellow} 30%, transparent)`, padding: "0 6px", borderRadius: 4, margin: "0 0.1em" }}>Sara</b>, two orders:{" "}
            {saras.map((i) => money(FANOUT.list[i].amount)).join(" + ")} = <b style={{ color: BLUE_INK }}>{FANOUT.sara.right}</b>
          </span>
        </Note>
        <Note at={nineAt} x={R_X} y={listTop} out={fixAt - 4}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <span style={{ opacity: ease(frame, bothAt, 10) }}>three items each, so three copies each: </span>
            <b style={{ color: ACCENT_INK }}>{FANOUT.sara.wrong}</b>
          </span>
        </Note>

        {/* ── The fix: count the items per order, then join ── */}
        <Listing lines={fixedLines} x={X0} top={listTop - h(10)} width={leftW} size={20} at={fixAt} marks={[{ line: "COUNT", at: countAt + 2 }, { line: "GROUP BY", at: countAt + 8 }]} />
        <Note at={thenAt} x={R_X} y={listTop}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            then join: <b style={{ color: OK_INK }}>one row per order</b>
          </span>
        </Note>

        {/* ── Row counts, step by step ── */}
        <Note at={multAt} x={R_X} y={listTop + h(56)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            the error multiplies<span style={{ opacity: ease(frame, sampleAt, 10) }}>: a small sample can hide it</span>
          </span>
        </Note>
        <Note at={checkAt} x={R_X} y={listTop + h(112)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap", display: "inline-flex", alignItems: "baseline", gap: "0.4em", fontSize: 24 }}>
            <b>Row counts:</b>
            <span style={{ color: BLUE_INK, fontWeight: 650 }}>
              <Num>{FANOUT.orders}</Num>
            </span>
            <span style={{ color: INK_SOFT }}>→</span>
            <span style={{ color: ACCENT_INK, fontWeight: 650 }}>
              <Num>{FANOUT.joinedRows}</Num>
            </span>
            <span style={{ color: INK_SOFT }}>→</span>
            <span style={{ color: OK_INK, fontWeight: 650 }}>
              <Num>{FANOUT.orders}</Num>
            </span>
            <span style={{ color: INK_SOFT, fontWeight: 500 }}>before and after every join</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};

/** A table or column name inside a label. */
const SmallCode: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontFamily: MONO, fontSize: "0.9em", fontWeight: 600, fontVariantLigatures: "none" }}>{children}</span>
);
