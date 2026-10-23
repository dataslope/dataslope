import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BAR, HIGHLIGHT, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Headline, Kicker, pulse, Spot, X0 } from "./parts";

const PROMPT_Y = 330;
const PROMPT_PITCH = 92;
const SNIPPET_X = 760;
const BAR_Y = 650;
const SEG_W = 40;
const SEG_GAP = 6;
/** Questions worked through on real queries; the rest go at speed. */
const WORKED = 12;
const TOTAL = 20;

/**
 * The opening, in its own words and figure rather than Parts 1 to 3's
 * numbered tiles: the three follow-ups an interviewer asks after the first
 * SQL screen, each answered by a different function over the same OVER
 * clause, which lights up as the narration names the one tool. Then the
 * twenty questions as a bar of twenty segments, twelve worked through and
 * eight at speed, the first lighting on the bridge into question 1.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hook").from;
  const clearAt = n.word("hook", "Clear the first SQL screen");
  const prompts = [
    { at: n.word("hook", "Rank these"), text: "Rank these.", fn: "RANK()" },
    { at: n.word("hook", "Compare each day"), text: "Compare each day with the one before.", fn: "LAG(amount)" },
    { at: n.word("hook", "Keep only the latest row"), text: "Keep only the latest row per customer.", fn: "ROW_NUMBER()" },
  ];
  const toolAt = n.word("hook", "one tool");
  const windowAt = n.word("hook", "the window function");
  const twentyAt = n.word("plan", "twenty questions");
  const twelveAt = n.word("plan", "work through twelve");
  const speedAt = n.word("plan", "the last eight at speed");
  const startAt = n.word("window-in", "Start with");
  const end = n.beat("window-in").to;

  const segX = (i: number) => X0 + i * (SEG_W + SEG_GAP) + (i >= WORKED ? 18 : 0);

  return (
    <AbsoluteFill>
      {prompts.map((p) => (
        <Sfx key={p.text} name="el-tap" at={p.at} level={-32} />
      ))}
      <Sfx name="el-pencil" at={toolAt + 4} level={-34} />
      <Sfx name="el-sprinkle" at={twentyAt} level={-34} />
      <Sfx name="el-pop" at={startAt + 2} level={-34} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>Data analyst interview prep</Kicker>
        <Headline lead="After the first screen:" turn="the window function." at={clearAt - 6} turnAt={windowAt - 4} size={70} />

        <Spot id="da-advanced-sql-penguin" at={from + 4} left={1150} top={y(290)} width={640} height={460} />

        {/* ── Three follow-ups, one clause ── */}
        {prompts.map((p, i) => {
          const pIn = ease(frame, p.at - 2, 12);
          const fnIn = ease(frame, p.at + 8, 12);
          const lit = ease(frame, toolAt + i * 4, 12);
          const top = y(PROMPT_Y + i * PROMPT_PITCH);
          return (
            <React.Fragment key={p.text}>
              <div
                style={{
                  position: "absolute",
                  left: X0,
                  top,
                  ...note(30, INK),
                  whiteSpace: "nowrap",
                  opacity: pIn,
                  transform: `translateX(${(1 - pIn) * -16}px)`,
                }}
              >
                {p.text}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: SNIPPET_X,
                  top: top + 2,
                  fontFamily: MONO,
                  fontSize: 28,
                  fontWeight: 600,
                  color: INK,
                  whiteSpace: "pre",
                  fontVariantLigatures: "none",
                  opacity: fnIn,
                }}
              >
                {p.fn}{" "}
                <span style={{ position: "relative", display: "inline-block" }}>
                  <span
                    style={{
                      position: "absolute",
                      inset: "0.02em -0.18em",
                      background: HIGHLIGHT,
                      borderRadius: 3,
                      clipPath: `inset(0 ${(1 - lit) * 100}% 0 0)`,
                    }}
                  />
                  <span style={{ position: "relative", color: BAR }}>OVER (…)</span>
                </span>
              </div>
            </React.Fragment>
          );
        })}

        {/* ── Twenty questions: twelve worked through, eight at speed ── */}
        {Array.from({ length: TOTAL }, (_, i) => {
          const p = ease(frame, twentyAt - 4 + i * 1.2, 10);
          if (p <= 0) return null;
          const worked = i < WORKED;
          const tone = worked ? ease(frame, twelveAt + i, 10) : ease(frame, speedAt + (i - WORKED), 10);
          const first = i === 0 ? ease(frame, startAt, 10) : 0;
          const fade = i === 0 ? 0 : ease(frame, startAt + 4, 14) * 0.5;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: segX(i),
                top: y(BAR_Y),
                width: SEG_W,
                height: h(34),
                borderRadius: 5,
                background:
                  first > 0
                    ? `color-mix(in srgb, ${ds("yellow", 400)} ${first * 100}%, ${BAR})`
                    : worked
                      ? `color-mix(in srgb, ${BAR} ${30 + 70 * tone}%, ${ds("gray", 200)})`
                      : `color-mix(in srgb, ${ds("blue", 200)} ${30 + 70 * tone}%, ${ds("gray", 200)})`,
                opacity: p * (1 - fade),
                transform: `scaleY(${p}) scale(${1 + 0.12 * pulse(frame, startAt, 16) * (i === 0 ? 1 : 0)})`,
              }}
            />
          );
        })}
        <div
          style={{
            position: "absolute",
            left: segX(0),
            top: y(BAR_Y) + h(50),
            ...note(28, INK),
            whiteSpace: "nowrap",
            ...TABULAR,
            opacity: ease(frame, twelveAt - 2, 12) * (1 - ease(frame, startAt + 4, 14) * 0.5),
          }}
        >
          <b>12</b> worked through on real queries
        </div>
        <div
          style={{
            position: "absolute",
            left: segX(WORKED),
            top: y(BAR_Y) + h(50),
            ...note(28, INK_SOFT),
            whiteSpace: "nowrap",
            ...TABULAR,
            opacity: ease(frame, speedAt - 2, 12) * (1 - ease(frame, startAt + 4, 14) * 0.5),
          }}
        >
          <b>8</b> at speed
        </div>
        <div
          style={{
            position: "absolute",
            left: segX(0),
            top: y(BAR_Y) - h(44),
            ...label(22, INK_SOFT),
            whiteSpace: "nowrap",
            opacity: ease(frame, twentyAt - 2, 12),
          }}
        >
          20 questions
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
