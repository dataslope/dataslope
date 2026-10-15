import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, map, pop } from "../../components/motion";
import { useNarration } from "../../narration/NarrationContext";
import { colors, ds } from "../../theme/brand";
import { MONO, SANS } from "../../theme/fonts";
import { HAVING_MIN, VIDEO } from "./data";
import { SqlLine } from "./Sql";
import { StepStrip, stepX } from "./StepStrip";

const CARD_X = 96;
const CARD_Y = 96;
const CARD_W = 1060;
const ROW_H = 68;
const PAD = 30;
const FONT = 38;
const STRIP_LEFT = 260;
const STRIP_TOP = 650;

/**
 * The classic error, why it happens, and the two fixes, all on one query.
 * The rows are keyed so the broken query turns into the fixed one in place.
 */
export const ErrorScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();

  const start = n.beat("error-setup").from;
  const markTotal = ease(frame, n.word("error-setup", "total"), 10);
  const errorAt = n.word("error", "says");
  const pError = pop(frame, errorAt, fps, 15);
  const stepTwo = ease(frame, n.word("why", "two"), 10);
  const stepFive = ease(frame, n.word("why", "five"), 10);
  const notYet = ease(frame, n.word("why", "isn't"), 12);
  const fixStart = n.beat("fix").from;
  const pStrike = ease(frame, fixStart, 12);
  const havingAt = n.word("fix", "HAVING");
  const pHaving = pop(frame, havingAt, fps, 16);
  const pOrder = pop(frame, n.word("order-ok", "works"), fps, 16);
  const afterAt = n.word("order-ok", "after");
  const pAfter = ease(frame, afterAt, 12);
  const errorOut = ease(frame, fixStart, 12);

  const rows = [
    { key: "select", sql: "SELECT customer, SUM(amount) AS total", slot: 0, show: 1 },
    { key: "from", sql: "FROM orders", slot: 1, show: 1 },
    {
      key: "where",
      sql: `WHERE total > ${HAVING_MIN}`,
      slot: 2,
      show: 1 - ease(frame, havingAt - 4, 12),
      strike: pStrike,
      mark: { text: "total", color: ds("yellow"), p: markTotal },
    },
    { key: "group-by", sql: "GROUP BY customer", slot: map(pHaving, [0, 1], [3, 2]), show: 1 },
    {
      key: "having",
      sql: `HAVING SUM(amount) > ${HAVING_MIN}`,
      slot: 3,
      show: pHaving,
      ok: pHaving,
    },
    {
      key: "order-by",
      sql: "ORDER BY total DESC",
      slot: 4,
      show: pOrder,
      ok: pOrder,
      mark: { text: "total", color: ds("green"), p: pOrder },
    },
  ];
  const lines = 4 + pOrder;
  const cardH = lines * ROW_H + PAD * 2;
  const broken = pError * (1 - errorOut);
  // Once the elephant and the error leave, the fixed query takes the center.
  const cardX = map(ease(frame, havingAt, 18), [0, 1], [CARD_X, (1920 - CARD_W) / 2]);

  return (
    <AbsoluteFill style={{ background: colors.page }}>
      <div
        style={{
          position: "absolute",
          left: cardX,
          top: CARD_Y,
          width: CARD_W,
          height: cardH,
          borderRadius: 26,
          background: colors.codeBg,
          boxShadow: `0 0 0 ${6 * broken}px ${ds("red")}`,
          opacity: ease(frame, start, 10),
        }}
      >
        {rows.map((r) =>
          r.show <= 0 ? null : (
            <div
              key={r.key}
              style={{
                position: "absolute",
                left: PAD + 10,
                right: PAD,
                top: PAD + r.slot * ROW_H,
                height: ROW_H,
                display: "flex",
                alignItems: "center",
                opacity: r.show,
              }}
            >
              <span style={{ position: "relative" }}>
                <SqlLine
                  sql={r.sql}
                  fontSize={FONT}
                  mark={r.mark?.text}
                  markColor={r.mark?.color}
                  markProgress={r.mark?.p}
                  markNth={1}
                />
                {r.strike ? (
                  <span
                    style={{
                      position: "absolute",
                      left: -6,
                      top: "52%",
                      height: 5,
                      borderRadius: 3,
                      width: `calc(${r.strike * 100}% + 12px)`,
                      background: ds("red"),
                    }}
                  />
                ) : null}
              </span>
              {r.ok ? <Check p={r.ok} /> : null}
            </div>
          ),
        )}
      </div>

      {/* What Postgres prints, verbatim (two spaces after ERROR:, as psql). */}
      <div
        style={{
          position: "absolute",
          left: CARD_X,
          top: CARD_Y + 4 * ROW_H + PAD * 2 + 36,
          width: CARD_W,
          padding: "22px 30px",
          borderRadius: 20,
          background: ds("red", 50),
          border: `3px solid ${ds("red")}`,
          fontFamily: MONO,
          fontSize: 34,
          fontWeight: 700,
          color: colors.badInk,
          whiteSpace: "pre",
          opacity: broken,
          transform: `translateY(${(1 - pError) * 30}px)`,
        }}
      >
        {'ERROR:  column "total" does not exist'}
      </div>

      <Illustration
        video={VIDEO}
        id="sql-eo-error"
        style={{
          position: "absolute",
          left: 1220,
          top: 120,
          width: 620,
          height: 460,
          opacity: pError * (1 - errorOut),
          transform: `translateY(${bob(frame, 6) + (1 - pError) * 40}px)`,
        }}
      />

      {/* Why: WHERE runs at 2, total is named at 5, ORDER BY runs at 8. */}
      <StepStrip
        left={STRIP_LEFT}
        top={STRIP_TOP}
        opacity={ease(frame, n.beat("why").from, 12)}
        marks={[
          { step: 2, tone: "bad", p: stepTwo * (1 - pHaving) },
          { step: 5, tone: "named", p: stepFive, label: "total" },
          { step: 4, tone: "ok", p: pHaving, label: "SUM(amount)" },
          { step: 8, tone: "ok", p: pOrder, label: "total" },
        ]}
      />
      <Arrow
        from={stepX(STRIP_LEFT, 2)}
        to={stepX(STRIP_LEFT, 5)}
        top={STRIP_TOP + 150}
        p={notYet * (1 - pHaving)}
        color={ds("red")}
        label="not named yet"
      />
      <Arrow
        from={stepX(STRIP_LEFT, 5)}
        to={stepX(STRIP_LEFT, 8)}
        top={STRIP_TOP + 150}
        p={pAfter}
        color={ds("green")}
        label="already named"
      />
    </AbsoluteFill>
  );
};

const Check: React.FC<{ p: number }> = ({ p }) => (
  <span
    style={{
      marginLeft: "auto",
      width: 50,
      height: 50,
      borderRadius: 999,
      background: ds("green"),
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transform: `scale(${p})`,
    }}
  >
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path d="M5 12.5l4.5 4.5L19 7.5" stroke="var(--ds-white)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </span>
);

/** A bracket under the strip from one step to another, drawn left to right. */
const Arrow: React.FC<{ from: number; to: number; top: number; p: number; color: string; label: string }> = ({
  from,
  to,
  top,
  p,
  color,
  label,
}) => {
  if (p <= 0) return null;
  const w = to - from;
  return (
    <div style={{ position: "absolute", left: from, top, width: w, height: 70 }}>
      <svg width={w} height="40" viewBox={`0 0 ${w} 40`} style={{ position: "absolute", top: 0, overflow: "visible" }}>
        <path
          d={`M 0 4 V 22 H ${w} V 4`}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - p}
        />
        <path d={`M ${w - 12} 14 L ${w} 2 L ${w + 12} 14`} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity={p > 0.9 ? 1 : 0} />
      </svg>
      <div
        style={{
          position: "absolute",
          top: 32,
          width: w,
          textAlign: "center",
          fontFamily: SANS,
          fontWeight: 700,
          fontSize: 28,
          color,
          opacity: p,
        }}
      >
        {label}
      </div>
    </div>
  );
};
