import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, INK, INK_SOFT, PAPER, TABULAR, body, label, note } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { LOGINS } from "./data";
import { daysBetween, DayStrip, Drift, Headline, Kicker, MARK, pulse, Spot, stripGeometry, X0 } from "./parts";

const STRIP_Y = 330;
const CELL = 84;
const GAP = 10;
const ASK_Y = 610;
const CHIPS_Y = 660;
const CHIP = 44;
const CHIP_GAP = 8;
/** Questions worked through on real queries; the rest at speed. */
const WORKED = 11;
const TOTAL = 22;

/**
 * The opening: user 1's logins from the page's daily_logins, thirteen days
 * of January as a strip of cells. The four empty days are pointed at, the
 * three streaks bracketed with their lengths, then three questions the strip
 * raises (missing days, streak lengths, the latest login) light their part of
 * it. The same thirteen days come back for the moving average, the spine and
 * the islands. Then the promise, as numbered chips: eleven on real queries,
 * eleven quickly; the first lights on the bridge into question 1.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hook").from;
  const loginsAt = n.word("hook", "one user's logins");
  const fourAt = n.word("hook", "Four days have no login");
  const streaksAt = n.word("hook", "three streaks");
  const missingAt = n.word("hook-ask", "Which days are missing");
  const longAt = n.word("hook-ask", "How long is each streak");
  const latestAt = n.word("hook-ask", "Which login is the latest");
  const roundAt = n.word("hook-ask", "the sequel round");
  const twentyTwoAt = n.word("plan", "twenty-two of them");
  const elevenAt = n.word("plan", "Eleven get worked through");
  const quickAt = n.word("plan", "The other eleven");
  const firstAt = n.word("rank-in", "numbering rows");
  const end = n.beat("rank-in").to;

  const days = daysBetween(LOGINS.days[0], LOGINS.days[LOGINS.days.length - 1], LOGINS.days);
  const g = stripGeometry(X0, y(STRIP_Y), days.length, CELL, GAP, h(74));
  const missing = days.flatMap((d, i) => (d.present ? [] : [i]));
  const indexOf = (date: string) => days.findIndex((d) => d.date === date);
  const last = days.length - 1;
  const askOut = twentyTwoAt - 10;
  // The streaks bracketed in turn, then pointed at again on their question.
  const spans = LOGINS.islands.map((isl, k) => ({
    from: indexOf(isl.start),
    to: indexOf(isl.end),
    at: streaksAt + 4 + k * 6,
    color: BAR,
    ink: BLUE_INK,
    label: `${isl.days} days`,
  }));
  const chipX = (i: number) => X0 + i * (CHIP + CHIP_GAP) + (i >= WORKED ? 22 : 0);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={loginsAt + 2} level={-34} />
      <Sfx name="el-tap" at={fourAt + 2} level={-34} />
      {spans.map((s, k) => (
        <Sfx key={k} name="el-pencil" at={s.at} level={-36} />
      ))}
      <Sfx name="el-pop" at={latestAt + 4} level={-34} />
      <Sfx name="el-pop" at={elevenAt} level={-34} />
      <Sfx name="el-pop" at={firstAt + 2} level={-34} />

      <Drift from={from} to={end + 40}>
        {/* The page opens on the kicker and headline at frame 0, not on white. */}
        <Kicker at={-14}>Data engineer interview prep</Kicker>
        <Headline lead="Thirteen days," turn="three questions." at={-20} turnAt={missingAt - 4} size={70} />

        <Spot id="de-sql-patterns-koala" at={from + 10} left={1390} top={y(290)} width={440} height={441} />

        <Ink at={loginsAt - 2} dur={12} style={{ left: X0, top: g.top - h(44), whiteSpace: "nowrap" }}>
          <span style={label(21, INK_SOFT)}>
            User 1&rsquo;s logins, from the page&rsquo;s <span style={{ fontFamily: MONO, fontWeight: 600 }}>daily_logins</span>
          </span>
        </Ink>
        <DayStrip
          g={g}
          days={days}
          at={loginsAt}
          marks={[
            ...missing.map((index, k) => ({ index, at: fourAt + 2 + k * 3, out: streaksAt, color: MARK })),
            ...missing.map((index, k) => ({ index, at: missingAt + 2 + k * 2, out: longAt, color: MARK })),
            { index: last, at: latestAt + 2, out: askOut + 20, color: MARK },
          ]}
          spans={spans}
        />
        {/* The latest login, ringed on its question. */}
        <div
          style={{
            position: "absolute",
            left: g.left(last) - 8,
            top: g.top - 8,
            width: g.cell + 16,
            height: g.cellH + 16,
            boxSizing: "border-box",
            borderRadius: 14,
            border: `3px solid ${ds("yellow", 600)}`,
            opacity: ease(frame, latestAt + 2, 10) * (1 - ease(frame, askOut + 20, 12)),
            transform: `scale(${1 + 0.08 * pulse(frame, latestAt + 2, 18)})`,
          }}
        />

        {/* ── The three questions the strip raises ── */}
        {[
          { at: missingAt, text: "Which days are missing?" },
          { at: longAt, text: "How long is each streak?" },
          { at: latestAt, text: "Which login is the latest?" },
        ].map((q, i) => (
          <Ink key={q.text} at={q.at - 2} dur={14} out={askOut} style={{ left: X0, top: y(ASK_Y) + i * h(54), whiteSpace: "nowrap" }}>
            <span style={{ ...body(36), color: INK }}>{q.text}</span>
          </Ink>
        ))}
        <Ink at={roundAt} dur={14} out={askOut} style={{ left: X0 + 560, top: y(ASK_Y) + h(54), whiteSpace: "nowrap" }}>
          <span style={{ ...note(26, INK_SOFT) }}>the SQL round of a data engineering interview</span>
        </Ink>

        {/* ── Twenty-two questions: eleven on real queries, eleven quickly ── */}
        <div
          style={{
            position: "absolute",
            left: X0,
            top: y(CHIPS_Y) - h(48),
            ...label(22, INK_SOFT),
            whiteSpace: "nowrap",
            opacity: ease(frame, twentyTwoAt - 2, 12),
          }}
        >
          <span style={TABULAR}>{TOTAL}</span> questions
        </div>
        {Array.from({ length: TOTAL }, (_, i) => {
          const p = ease(frame, twentyTwoAt - 2 + i * 1.2, 10);
          if (p <= 0) return null;
          const worked = i < WORKED;
          const tone = worked ? ease(frame, elevenAt + i * 2, 10) : ease(frame, quickAt + (i - WORKED), 10);
          const first = i === 0 ? ease(frame, firstAt, 10) : 0;
          const fade = i === 0 ? 0 : ease(frame, firstAt + 4, 14) * 0.5;
          const fill = first > 0 ? ds("yellow", 400) : worked ? `color-mix(in srgb, ${BAR} ${25 + 75 * tone}%, ${PAPER})` : PAPER;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: chipX(i),
                top: y(CHIPS_Y),
                width: CHIP,
                height: CHIP,
                borderRadius: CHIP / 2,
                background: fill,
                border: `2px solid ${worked || first > 0 ? "transparent" : `color-mix(in srgb, ${BAR} ${40 + 60 * tone}%, ${PAPER})`}`,
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...label(19, worked && tone > 0.5 && first === 0 ? PAPER : INK),
                fontWeight: 700,
                ...TABULAR,
                opacity: p * (1 - fade),
                transform: `scale(${p * (1 + 0.15 * pulse(frame, firstAt, 16) * (i === 0 ? 1 : 0))})`,
              }}
            >
              {i + 1}
            </div>
          );
        })}
        <div
          style={{
            position: "absolute",
            left: chipX(0),
            top: y(CHIPS_Y) + h(62),
            ...note(26, INK),
            whiteSpace: "nowrap",
            opacity: ease(frame, elevenAt - 2, 12) * (1 - ease(frame, firstAt + 4, 14) * 0.5),
          }}
        >
          <b style={TABULAR}>{WORKED}</b> on real queries, in DuckDB
        </div>
        <div
          style={{
            position: "absolute",
            left: chipX(WORKED),
            top: y(CHIPS_Y) + h(62),
            ...note(26, INK_SOFT),
            whiteSpace: "nowrap",
            opacity: ease(frame, quickAt - 2, 12) * (1 - ease(frame, firstAt + 4, 14) * 0.5),
          }}
        >
          <b style={TABULAR}>{TOTAL - WORKED}</b> quickly, at the end
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
