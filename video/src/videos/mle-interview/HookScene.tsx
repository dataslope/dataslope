import React from "react";
import { AbsoluteFill } from "remotion";
import { useLayout } from "../../editorial/layout";
import { headline, INK, INK_SOFT, label } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Kicker, LEFT_X, Mark, Spot } from "./parts";

/** The prompts, one size, in the headline serif: the classic one under its
 *  label, then the two that are just as common now under theirs, the second
 *  over two lines. Layout units (through y()). */
const SIZE = 56;
const LABEL_1 = 288;
const PROMPT_1 = 326;
const LABEL_2 = 458;
const PROMPT_2 = 496;
const PROMPT_3 = 592;
const PROMPT_3B = PROMPT_3 + 62;
/** The red panda, right of the prompts: 360 by 503, under half its 733 by
 *  1024 pixels, so it stays sharp at 4K. */
const PANDA_X = 1400;
const PANDA_TOP = 280;
const PANDA_W = 360;
const PANDA_H = 503;
/** The coin purse (1024 by 821), small, right of the expensive prompt's
 *  two lines and level with the second, a clear 80px from every word (the
 *  first line ends near x 740, the assistant prompt 85px above it). */
const PURSE_X = 830;
const PURSE_W = 170;
const PURSE_H = 136;

/**
 * The opening, in the LLM page's words: the classic machine learning system
 * design prompt, "Design a fraud detection system.", and the two that are
 * asked just as often now, the coin purse beside "too expensive", with the
 * red panda (this video's hero, and the track's thumbnail animal) beside
 * them from the first frame. The classic prompt stays in full ink: it is
 * still asked, so it is never struck or faded. On "still asks" the
 * highlighter lights it, and on "added" the two new ones: the two kinds of
 * question these videos cover.
 */
export const HookScene: React.FC = () => {
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("hook").from;
  const classicAt = n.word("hook", "Design a fraud detection system");
  const classicLabelAt = n.word("hook", "the classic");
  const nowAt = n.word("hook-now", "Now it's just as often");
  const assistantAt = n.word("hook-now", "design an assistant");
  const featureAt = n.word("hook-now", "this LLM feature");
  const expensiveAt = n.word("hook-now", "too expensive");
  const fixAt = n.word("hook-now", "Fix it");
  const stillAt = n.word("hook-both", "still asks");
  const addedAt = n.word("hook-both", "added");
  const end = n.beat("hook-both").to;

  const prompt: React.CSSProperties = { ...headline(SIZE), whiteSpace: "nowrap" };

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={assistantAt} level={-31} />
      <Sfx name="el-tap" at={featureAt} level={-31} />
      <Sfx name="el-pop" at={expensiveAt} level={-30} />
      <Sfx name="el-pencil" at={stillAt} level={-36} />
      <Sfx name="el-pencil" at={addedAt} level={-36} />

      <Drift from={from} to={end + 40} scale={0.02}>
        {/* Inked before frame 0, so the video's first frame (its poster) is
            not a blank page. */}
        <Kicker at={-14}>Machine learning engineer interview questions</Kicker>

        <Ink at={classicLabelAt} dur={14} style={{ left: LEFT_X, top: y(LABEL_1), whiteSpace: "nowrap", ...label(24, INK_SOFT) }}>
          The classic ML system design prompt
        </Ink>
        {/* Each prompt pulls left by the highlighter's bleed, so its first
            letter stays on the labels' edge. */}
        <Ink at={classicAt} dur={20} style={{ left: LEFT_X, top: y(PROMPT_1), ...prompt }}>
          <span style={{ display: "inline-block", marginLeft: "-0.14em" }}>
            <Mark at={stillAt}>Design a fraud detection system.</Mark>
          </span>
        </Ink>

        <Ink at={nowAt} dur={14} style={{ left: LEFT_X, top: y(LABEL_2), whiteSpace: "nowrap", ...label(24, INK_SOFT) }}>
          Now, just as often
        </Ink>
        <Ink at={assistantAt} dur={20} style={{ left: LEFT_X, top: y(PROMPT_2), ...prompt }}>
          <span style={{ display: "inline-block", marginLeft: "-0.14em" }}>
            <Mark at={addedAt}>Design an assistant over our documents.</Mark>
          </span>
        </Ink>
        <Ink at={featureAt} dur={20} style={{ left: LEFT_X, top: y(PROMPT_3), ...prompt }}>
          <span style={{ display: "inline-block", marginLeft: "-0.14em" }}>
            <Mark at={addedAt + 4}>This LLM feature is too slow</Mark>
          </span>
        </Ink>
        <div style={{ position: "absolute", left: LEFT_X, top: y(PROMPT_3B), display: "flex", gap: "0.26em", ...prompt }}>
          <Ink at={expensiveAt - 6} dur={18} style={{ position: "relative", color: INK }}>
            <span style={{ display: "inline-block", marginLeft: "-0.14em" }}>
              <Mark at={addedAt + 8}>and too expensive.</Mark>
            </span>
          </Ink>
          <Ink at={fixAt} dur={14} style={{ position: "relative", color: INK }}>
            <Mark at={addedAt + 12}>Fix it.</Mark>
          </Ink>
        </div>

        <Spot id="mle-interview-purse" at={expensiveAt} left={PURSE_X} top={y(PROMPT_3B) + 30 - PURSE_H / 2} width={PURSE_W} height={PURSE_H} amp={3} />

        {/* The red panda is there from the first frame (the video's poster)
            and stays to the cut. */}
        <Spot id="mle-interview-red-panda" at={-24} left={PANDA_X} top={y(PANDA_TOP)} width={PANDA_W} height={PANDA_H} amp={4} />
      </Drift>
    </AbsoluteFill>
  );
};
