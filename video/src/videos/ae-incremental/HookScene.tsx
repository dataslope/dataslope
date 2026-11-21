import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { inkOf } from "../../theme/brand";
import { COST, thousands } from "./data";
import { costScale, CostChart, Drift, Headline, Kicker, pulse, Spot, spotH, X0 } from "./parts";

/** The cost chart's frame, shared with question 1, which opens on the same
 *  chart in the same place so the cut between them leaves it standing. Top
 *  and bottom are layout values (through `y()`). */
export const CHART = { x0: 230, x1: 1000, top: 330, bottom: 620, labelY: 270, labelX: 1040 };

const SQ = 50;
const SQ_GAP = 12;
const PLAN_Y = 740;

/**
 * The opening. The dbt page's chart, from its model: a table that gains
 * 8,000 rows a day, rebuilt every night, so each run reprocesses everything
 * that ever landed; by day 730 that is 6,040,000 rows to add one day's
 * 8,000, marked beside it. The snail, the video's hero, arrives on "only the
 * new ones". Then the seven questions as numbered squares, lit by the three
 * things they ask: which rows are new (2 and 3), what makes a rerun safe (4
 * to 6), why the full rebuild stays (7).
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hook").from;
  const tableAt = n.word("hook", "Take a table");
  const dayAt = n.word("hook", "eight thousand rows a day");
  const rebuildAt = n.word("hook", "Rebuild all of it");
  const twoAt = n.word("hook", "two years in");
  const sixAt = n.word("hook", "over six million rows");
  const addAt = n.word("hook", "to add eight thousand");
  const snailAt = n.word("hook-snail", "An incremental model");
  const newAt = n.word("hook-snail", "only the new ones");
  const sevenAt = n.word("plan", "Seven questions");
  const themes = [
    { text: "Which rows count as new", qs: [2, 3], at: n.word("plan", "which rows count as new") },
    { text: "What makes a rerun safe", qs: [4, 5, 6], at: n.word("plan", "what makes a rerun safe") },
    { text: "Why the full rebuild stays", qs: [7], at: n.word("plan", "why the full rebuild") },
  ];
  const end = n.beat("plan").to;

  const top = y(CHART.top);
  const bottom = y(CHART.bottom);
  const s = costScale(CHART.x0, CHART.x1, top, bottom);
  const snailW = 380;
  const snailTop = (s.ly(COST.fullAtEnd) + s.ly(COST.daily)) / 2 - spotH("snail", snailW) / 2;
  const sqTop = y(PLAN_Y);
  const sqX = (i: number) => X0 + i * (SQ + SQ_GAP);
  const lit = (q: number) => {
    const t = themes.find((th) => th.qs.includes(q));
    return t ? ease(frame, t.at + (t.qs.indexOf(q) * 3), 10) : 0;
  };

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={tableAt} level={-36} />
      <Sfx name="el-whoosh" at={rebuildAt} level={-36} />
      <Sfx name="el-tap" at={sixAt} level={-33} />
      <Sfx name="el-tap" at={addAt} level={-33} />
      <Sfx name="el-pop" at={snailAt} level={-30} />
      <Sfx name="el-sprinkle" at={sevenAt} level={-34} />
      {themes.map((t) => (
        <Sfx key={t.text} name="el-tap" at={t.at} level={-36} />
      ))}

      {/* The dbt page's chart, one run's rows day by day: outside the slow
          push, so question 1 can open on it standing exactly where it is. */}
        <Note at={tableAt} x={X0} y={y(CHART.labelY)}>
          <span style={{ ...note(24, INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            Rows one run processes
            <span style={{ ...label(22, INK_SOFT), fontWeight: 500, opacity: ease(frame, dayAt, 10) }}>
              {" "}
              · a model: <Num>{thousands(COST.daily)}</Num> new rows a day, log scale
            </span>
          </span>
        </Note>
        <CostChart x0={CHART.x0} x1={CHART.x1} top={top} bottom={bottom} at={tableAt + 4} fullAt={rebuildAt} dayAt={twoAt} dotAt={addAt} />
        <Note at={sixAt} x={CHART.labelX} y={s.ly(COST.fullAtEnd) - 15}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            Full rebuild: <Num>{thousands(COST.fullAtEnd)}</Num>
          </span>
        </Note>
        <Note at={addAt} x={CHART.labelX} y={s.ly(COST.daily) - 15}>
          <span style={{ ...note(24, BLUE_INK), fontWeight: 500, whiteSpace: "nowrap", opacity: 1 }}>
            <span style={{ display: "inline-block", transform: `scale(${1 + 0.06 * pulse(frame, newAt, 20)})`, transformOrigin: "0 50%" }}>
              One day&apos;s rows: <Num>{thousands(COST.daily)}</Num>
            </span>
          </span>
        </Note>


      <Drift from={from} to={end + 40}>
        <Kicker at={from}>Analytics engineer interview questions</Kicker>
        <Headline lead="Eight thousand new rows," turn="six million reprocessed." at={from + 4} turnAt={sixAt - 4} size={64} />

        <Spot art="snail" at={snailAt} left={1420} top={snailTop} width={snailW} />

        {/* ── Seven questions, lit by what they ask ── */}
        <Note at={sevenAt - 4} x={X0} y={sqTop - h(48)}>
          <span style={{ ...label(23, INK), fontWeight: 500, whiteSpace: "nowrap" }}>Seven questions</span>
        </Note>
        {Array.from({ length: 7 }, (_, i) => {
          const at = sevenAt + i * 2;
          const p = ease(frame, at, 10);
          if (p <= 0) return null;
          const l = lit(i + 1);
          const color = l > 0 ? `color-mix(in srgb, ${inkOf.yellow} ${Math.round(l * 100)}%, ${INK})` : INK;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: sqX(i),
                top: sqTop,
                width: SQ,
                height: SQ,
                borderRadius: 5,
                boxSizing: "border-box",
                border: `2px solid ${color}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...label(22, color),
                fontWeight: 500,
                ...TABULAR,
                opacity: p,
                transform: `scale(${(0.7 + 0.3 * p) * (1 + 0.1 * pulse(frame, themes.find((t) => t.qs.includes(i + 1))?.at ?? -99, 16))})`,
              }}
            >
              {i + 1}
            </div>
          );
        })}
        <div
          style={{
            position: "absolute",
            left: sqX(7) + 40,
            top: sqTop,
            height: SQ,
            display: "flex",
            alignItems: "center",
            fontSize: 24,
            whiteSpace: "nowrap",
          }}
        >
          {themes.map((t, i) => (
            <span key={t.text} style={{ ...note(24, INK), opacity: ease(frame, t.at - 2, 10) }}>
              {i > 0 ? <span style={{ color: INK_SOFT, margin: "0 0.55em" }}>·</span> : null}
              <span style={{ color: inkOf.yellow, fontWeight: 600 }}>
                {t.qs.length > 1 ? `${t.qs[0]}–${t.qs[t.qs.length - 1]}` : t.qs[0]}
              </span>{" "}
              {t.text}
            </span>
          ))}
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
