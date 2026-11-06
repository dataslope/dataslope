import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { Pt } from "../../components/arrow";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ART, Arrow, Drift, Headline, Kicker, Mark, Spot, X0 } from "./parts";

/** The two changes the prompt stands for (index.mdx, "How AI has changed this
 *  interview"): fewer take-homes, more live design with "why?" follow-ups. */
const CARD_W = 520;
const CARD_H = 112;
const CHIPS = [
  { n: 1, word: "Start", cue: "how to start" },
  { n: 2, word: "Estimate", cue: "what to estimate" },
  { n: 3, word: "Diagram", cue: "the first diagram" },
  { n: 4, word: "Failure", cue: "what can take it down" },
  { n: 5, word: "Edge", cue: "what goes in front of it" },
] as const;
const CHIP_W = 236;
const CHIP_GAP = 58;

/** An up or down arrow, drawn on `at`. */
const Trend: React.FC<{ x: number; y: number; up: boolean; at: number; color: string }> = ({ x, y, up, at, color }) => {
  const half = 28;
  const pts: Pt[] = up ? [[x, y + half], [x, y - half]] : [[x, y - half], [x, y + half]];
  return <Arrow points={pts} at={at} dur={12} color={color} width={4} head={18} />;
};

/**
 * The opening: the prompt itself as the headline, and the crow on its
 * signpost. Prompts like it are where interviews have grown (index.mdx):
 * fewer take-home projects, more live design discussion with "why?" after
 * every choice. Then the plan: five questions, one design carried through
 * all of them, each named in a word on a chip as it is said.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const designAt = n.word("hook", "Design a URL shortener");
  const promptsAt = n.word("hook", "Prompts like this one");
  const grownAt = n.word("hook", "where interviews have grown");
  const fewerAt = n.word("hook", "fewer take-home projects");
  const moreAt = n.word("hook", "more live design discussion");
  const whyAt = n.word("hook", "asked why");
  const fiveAt = n.word("plan", "Five questions");
  const oneAt = n.word("plan", "one design");
  const carriedAt = n.word("plan", "carried through all of them");
  const chipAt = CHIPS.map((c) => n.word("plan", c.cue));
  const end = n.beat("plan").to;

  const cardsTop = y(392);
  const dimCards = ease(frame, fiveAt, 14) * 0.5;
  const chipY = y(748);
  const chipH = 58;
  const chipX = (i: number) => X0 + i * (CHIP_W + CHIP_GAP);
  const thread = ease(frame, carriedAt, 30);
  const lastChip = chipX(CHIPS.length - 1) + 120;
  const crowW = 470;
  const crowH = Math.round((crowW * ART.crow[1]) / ART.crow[0]);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={designAt} level={-36} />
      <Sfx name="el-tap" at={fewerAt} level={-34} />
      <Sfx name="el-tap" at={moreAt} level={-34} />
      <Sfx name="el-pencil" at={whyAt} level={-37} />
      <Sfx name="el-pencil" at={carriedAt} level={-37} />
      {chipAt.map((a, i) => (
        <Sfx key={i} name="el-tap" at={a} level={-35} />
      ))}

      <Drift from={0} to={end + 30}>
        <Kicker at={Math.max(0, designAt - 10)}>Backend engineer interview questions · Approaching system design</Kicker>
        <Headline lead="Design a URL shortener." at={designAt} size={84} />
        <Spot id="crow" at={designAt + 6} left={1316} top={y(250)} width={crowW} height={crowH} />

        <Ink at={grownAt} dur={14} style={{ left: X0, top: y(330) }}>
          <span style={{ ...note(25, INK_SOFT), fontWeight: 600, whiteSpace: "nowrap", opacity: 1 - dimCards }}>
            Where interviews have grown
          </span>
        </Ink>

        {/* Fewer take-homes, more live design. */}
        {[
          { x: X0, at: fewerAt, up: false, text: <>Take-home projects</>, color: INK_SOFT, ink: INK_SOFT, trend: "fewer", trendInk: INK_SOFT },
          {
            x: X0 + CARD_W + 50,
            at: moreAt,
            up: true,
            text: (
              <>
                Live design, with{" "}
                <Mark at={whyAt} color={HIGHLIGHT}>
                  &ldquo;why?&rdquo;
                </Mark>
              </>
            ),
            color: BAR,
            ink: INK,
            trend: "more",
            trendInk: BLUE_INK,
          },
        ].map((c, i) => {
          const p = ease(frame, (i === 0 ? promptsAt : grownAt) + 4, 14);
          return (
            <React.Fragment key={i}>
              <div
                style={{
                  position: "absolute",
                  left: c.x + 64,
                  top: cardsTop + CARD_H / 2 - 40,
                  opacity: p * (1 - dimCards),
                  transform: `translateY(${(1 - p) * 14}px)`,
                }}
              >
                <span style={{ ...note(31, c.ink), fontWeight: 650, whiteSpace: "nowrap" }}>{c.text}</span>
              </div>
              <Ink at={c.at + 2} dur={12} style={{ left: c.x + 64, top: cardsTop + CARD_H / 2 + 12 }}>
                <span style={{ ...label(22, c.trendInk), whiteSpace: "nowrap", opacity: 1 - dimCards }}>{c.trend}</span>
              </Ink>
              <div style={{ position: "absolute", inset: 0, opacity: 1 - dimCards }}>
                <Trend x={c.x + 22} y={cardsTop + CARD_H / 2} up={c.up} at={c.at} color={c.color} />
              </div>
            </React.Fragment>
          );
        })}

        {/* The plan: five questions on one design. */}
        <Ink at={fiveAt} dur={14} style={{ left: X0, top: chipY - 76 }}>
          <span style={{ ...note(28, INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            Five questions,{" "}
            <span style={{ color: BLUE_INK, opacity: ease(frame, oneAt, 10) }}>one design</span>
          </span>
        </Ink>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <line x1={X0} x2={X0 + (lastChip - X0) * thread} y1={chipY + chipH + 6} y2={chipY + chipH + 6} stroke={BAR} strokeWidth={3} opacity={thread > 0 ? 1 : 0} />
        </svg>
        {CHIPS.map((c, i) => {
          const at = chipAt[i];
          const p = ease(frame, at - 2, 12);
          const next = chipAt[i + 1] ?? end + 20;
          const lit = Math.min(ease(frame, at, 8), 1 - ease(frame, next, 10));
          if (p <= 0) return null;
          return (
            <div
              key={c.n}
              style={{
                position: "absolute",
                left: chipX(i),
                top: chipY,
                height: chipH,
                display: "flex",
                alignItems: "center",
                fontSize: 30,
                opacity: p,
                transform: `translateY(${(1 - p) * 10}px)`,
              }}
            >
              <span style={{ position: "relative", display: "inline-block", margin: "0 0.14em", whiteSpace: "nowrap" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "-0.14em",
                    right: "-0.14em",
                    top: "0.04em",
                    bottom: "-0.06em",
                    background: HIGHLIGHT,
                    borderRadius: "0.14em",
                    opacity: lit,
                  }}
                />
                <span style={{ position: "relative", ...note(30, ACCENT_INK), fontWeight: 700 }}>{c.n}</span>
                <span style={{ position: "relative", ...note(30, INK), fontWeight: 650 }}> {c.word}</span>
              </span>
            </div>
          );
        })}
      </Drift>
    </AbsoluteFill>
  );
};
