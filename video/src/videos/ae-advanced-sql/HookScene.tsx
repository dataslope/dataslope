import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { Drift, Headline, Kicker, Listing, pulse, Spot, X0 } from "./parts";

const LIST_TOP = 340;
const SIZE = 24;
const ASK_X = 660;
const ASK_PITCH = 76;
const HERO = { left: 1250, top: 300, width: 540 };
const SQUARES_Y = 790;
const SQ = 48;
const SQ_GAP = 10;
const SMALL = 36;
const DEEP = 12;
const QUICK = 7;

/** A model's body, as a dbt project holds it: a select statement over a ref. */
const MODEL = ["SELECT", "  order_date,", "  SUM(amount) AS revenue", "FROM {{ ref('stg_orders') }}", "GROUP BY order_date"];

/**
 * The opening. A model's body, a select statement, and the three things the
 * SQL round asks of it, each inking in beside the clause it is about: which
 * row survives a duplicate (the rows the ref brings in), what a running
 * total includes (the sum), which days go missing (the group by). The
 * giraffe at its window is the video's hero, on the right. Then the
 * promise, counted from what the video does: twelve numbered squares for the
 * questions worked through, seven smaller ones for the quick round, and the
 * first lighting on the turn into question 1.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hook").from;
  const openAt = n.word("hook", "Open any model");
  const selectAt = n.word("hook", "select statement");
  const rowsAt = n.word("hook", "does to rows");
  const asks = [
    { text: "Which row survives a duplicate?", at: n.word("hook", "which one survives a duplicate"), line: "FROM" },
    { text: "What does a running total include?", at: n.word("hook", "what a running total includes"), line: "SUM(amount)" },
    { text: "Which days quietly go missing?", at: n.word("hook", "which days quietly go missing"), line: "GROUP BY" },
  ];
  const nineteenAt = n.word("plan", "Nineteen questions");
  const twelveAt = n.word("plan", "Twelve are worked through");
  const sevenAt = n.word("plan", "seven come quickly");
  const windowAt = n.word("window-in", "start with a window");
  const end = n.beat("window-in").to;

  const listTop = y(LIST_TOP);
  const sqTop = y(SQUARES_Y);
  const sqX = (i: number) => (i < DEEP ? X0 + i * (SQ + SQ_GAP) : X0 + DEEP * (SQ + SQ_GAP) + 22 + (i - DEEP) * (SMALL + 8));
  const squaresEnd = sqX(DEEP + QUICK - 1) + SMALL;
  const heroTop = y(HERO.top);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={from + 10} level={-30} />
      <Sfx name="el-pencil" at={selectAt + 2} level={-35} />
      {asks.map((a) => (
        <Sfx key={a.text} name="el-tap" at={a.at} level={-32} />
      ))}
      <Sfx name="el-sprinkle" at={nineteenAt} level={-33} />
      <Sfx name="el-pop" at={windowAt + 2} level={-32} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>Analytics engineer interview questions</Kicker>
        <Headline lead="Inside every model," turn="a select statement." at={openAt - 4} turnAt={selectAt - 2} size={70} />

        <Spot art="giraffe" at={from + 10} left={HERO.left} top={heroTop} width={HERO.width} />

        {/* ── A model's body ── */}
        <Note at={openAt + 6} x={X0} y={listTop - h(40)}>
          <span style={{ fontFamily: MONO, fontSize: 21, fontWeight: 500, color: INK_SOFT, whiteSpace: "nowrap" }}>models/marts/fct_daily_revenue.sql</span>
        </Note>
        <Listing
          lines={MODEL}
          x={X0}
          top={listTop}
          size={SIZE}
          at={selectAt - 6}
          marks={[
            { line: "SELECT", at: selectAt + 4, out: rowsAt + 10 },
            ...asks.map((a, i) => ({ line: a.line, at: a.at + 2, out: asks[i + 1]?.at ?? nineteenAt })),
          ]}
        />

        {/* ── What the round asks of it ── */}
        {asks.map((a, i) => (
          <Note key={a.text} at={a.at - 2} x={ASK_X} y={listTop + h(14) + i * h(ASK_PITCH)} from="right">
            <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>{a.text}</span>
          </Note>
        ))}

        {/* ── Nineteen questions: twelve worked through, seven quick ── */}
        <Note at={nineteenAt - 2} x={X0} y={sqTop - h(46)}>
          <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>
            <span style={TABULAR}>19</span> questions
          </span>
        </Note>
        {Array.from({ length: DEEP + QUICK }, (_, i) => {
          const deep = i < DEEP;
          const at = nineteenAt - 2 + i * 1.5;
          const p = ease(frame, at, 10);
          if (p <= 0) return null;
          const tone = deep ? ease(frame, twelveAt + i * 1.5, 10) : ease(frame, sevenAt + (i - DEEP) * 2, 10);
          const size = deep ? SQ : SMALL;
          const lit = i === 0 ? ease(frame, windowAt, 10) : 0;
          const glow = i === 0 ? pulse(frame, windowAt, 18) : deep ? pulse(frame, twelveAt + i * 1.5, 16) : pulse(frame, sevenAt + (i - DEEP) * 2, 16);
          const fill = `color-mix(in srgb, ${BAR} ${12 + 78 * tone}%, ${PAPER})`;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: sqX(i),
                top: sqTop + (SQ - size) / 2,
                width: size,
                height: size,
                borderRadius: 4,
                boxSizing: "border-box",
                border: `2px solid ${lit > 0 ? `color-mix(in srgb, ${ds("yellow", 600)} ${lit * 100}%, ${BAR})` : BAR}`,
                background: lit > 0 ? `color-mix(in srgb, ${ds("yellow", 300)} ${lit * 100}%, ${fill})` : fill,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...label(deep ? 21 : 19, lit > 0.5 ? INK : tone > 0.5 ? PAPER : BLUE_INK),
                fontWeight: 500,
                ...TABULAR,
                opacity: p,
                transform: `scale(${(0.7 + 0.3 * p) * (1 + 0.12 * glow)})`,
              }}
            >
              {i + 1}
            </div>
          );
        })}
        <Note at={twelveAt} x={squaresEnd + 34} y={sqTop - h(30)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            <b>12</b> worked through on real queries
          </span>
        </Note>
        <Note at={sevenAt} x={squaresEnd + 34} y={sqTop + h(8)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            <b>7</b> quickly, at the end
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
