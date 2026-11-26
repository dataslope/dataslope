import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { Drift, GOLD, INK, INK_SOFT, Line, Q_SIZE, Svg, X0 } from "./parts";

/**
 * Question 11. The life of a model left to right, each stage a filled block
 * whose width stands for its cost (no numbers: the page gives none):
 * pretraining long, then fine-tuning, instruction tuning and RLHF short.
 * Each grows in as it is named, and is underlined in yellow while it is
 * the one being talked about.
 */
export const StagesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q11").from;
  const qAt = n.word("q11", "Question eleven");
  const textAt = n.word("q11", "What is the difference");
  const preAt = n.word("q11-a", "Pretraining is the expensive phase");
  const onceAt = n.word("q11-a", "once per model");
  const ftAt = n.word("q11-a", "Fine-tuning cheaply adapts");
  const smallAt = n.word("q11-a", "a much smaller labeled set");
  const itAt = n.word("q11-a", "Instruction tuning");
  const rlhfAt = n.word("q11-a", "and RLHF");
  const followAt = n.word("q11-a", "follow instructions");
  const prefAt = n.word("q11-a", "match human preferences");
  const evenAt = n.word("lora-in", "Even fine-tuning");
  const cheaperAt = n.word("lora-in", "far cheaper");
  const end = n.beat("lora-in").to;

  const top = y(510);
  const BH = h(110);
  const GAP = 24;
  const STAGES = [
    { title: "Pretraining", w: 700, at: preAt, until: ftAt, fill: ds("blue", 300), lines: [{ t: "Huge, unlabeled text", at: preAt + 10 }, { t: "Expensive, once per model", at: onceAt }] },
    { title: "Fine-tuning", w: 250, at: ftAt, until: itAt, fill: ds("blue", 200), lines: [{ t: "Small, labeled set", at: smallAt }, { t: "One task, cheap", at: smallAt + 10 }] },
    { title: "Instruction tuning", w: 250, at: itAt, until: rlhfAt, fill: ds("teal", 200), lines: [{ t: "Follow instructions", at: followAt }] },
    { title: "RLHF", w: 250, at: rlhfAt, until: evenAt, fill: ds("purple", 200), lines: [{ t: "Match human preferences", at: prefAt }] },
  ];
  let x = X0;
  const placed = STAGES.map((s) => {
    const at = x;
    x += s.w + GAP;
    return { ...s, x: at };
  });

  return (
    <AbsoluteFill>
      {placed.map((s) => (
        <Sfx key={s.title} name="el-whoosh" at={s.at} level={-37} />
      ))}
      <Sfx name="el-tap" at={prefAt + 4} level={-32} />
      <Sfx name="el-whoosh" at={cheaperAt} level={-36} />

      <Drift from={from} to={end + 40} scale={0.014}>
        <QuestionCard n={11} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE}>
          What is the difference between pretraining and fine-tuning?
        </QuestionCard>

        <Line at={preAt} x={X0} y={y(330)} size={21} color={INK_SOFT}>
          Each block&apos;s width: what the stage costs, not to scale
        </Line>

        <Svg>
          {placed.map((s) => {
            const p = ease(frame, s.at, 20);
            if (p <= 0) return null;
            const again = s.title === "Fine-tuning" ? ease(frame, evenAt, 10) : 0;
            const lit = Math.max(again, Math.min(ease(frame, s.at, 10), 1 - ease(frame, s.until, 10)));
            const narrow = s.title === "Fine-tuning" ? 1 - 0.6 * ease(frame, cheaperAt, 20) : 1;
            return (
              <React.Fragment key={s.title}>
                <rect x={s.x} y={top} width={s.w * p * narrow} height={BH} rx={5} fill={s.fill} />
                <rect x={s.x} y={top + BH + 10} width={s.w * p * narrow} height={5} rx={2.5} fill={GOLD} opacity={lit} />
              </React.Fragment>
            );
          })}
        </Svg>
        {placed.map((s) => (
          <React.Fragment key={s.title}>
            <Line at={s.at + 4} x={s.x} y={top - h(46)} size={24} weight={600}>
              {s.title}
            </Line>
            {s.lines.map((l, i) => (
              <Line key={l.t} at={l.at} x={s.x} y={top + BH + h(36) + i * h(38)} size={22} color={i === 0 ? INK : INK_SOFT}>
                {l.t}
              </Line>
            ))}
          </React.Fragment>
        ))}
        <Line at={rlhfAt + 10} x={X0} y={y(800)} size={21} color={INK_SOFT}>
          RLHF: reinforcement learning from human feedback
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
