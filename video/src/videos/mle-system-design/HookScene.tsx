import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BigMap, Drift, Headline, Kicker, Spot, X0 } from "./parts";

const CHIP = 50;
const CHIP_GAP = 12;
const GIRAFFE_H = 500;

/**
 * The opening: a model in a notebook is still a file (the notebook, a file
 * under it), and the system it needs is drawn around it as each part is
 * named: features at request time, an answer inside a latency budget, labels
 * back. The giraffe at the right; then the round, seventeen numerals, the
 * eleven worked through in blue and the six quick ones in grey.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("hook").from;
  const modelAt = n.word("hook", "A model");
  const notebookAt = n.word("hook", "notebook");
  const fileAt = n.word("hook", "just a file");
  const featuresAt = n.word("hook", "features at request time");
  const answerAt = n.word("hook", "an answer inside a latency budget");
  const backAt = n.word("hook", "labels coming back");
  const designAt = n.word("plan", "Designing that system");
  const seventeenAt = n.word("plan", "Seventeen questions");
  const elevenAt = n.word("plan", "eleven worked through");
  const sixAt = n.word("plan", "six quickly");
  const end = n.beat("plan").to;

  const chipX = (i: number) => X0 - 12 + i * (CHIP + CHIP_GAP) + (i >= 11 ? 30 : 0);
  const chipsTop = y(800);
  const chipAt = (i: number) => (i < 11 ? elevenAt + i * 2 : sixAt + (i - 11) * 3);
  const gW = Math.round((GIRAFFE_H * 547) / 1023);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={modelAt + 6} level={-30} />
      <Sfx name="el-pop" at={notebookAt} level={-31} />
      <Sfx name="el-tap" at={fileAt} level={-31} />
      <Sfx name="el-tap" at={featuresAt} level={-30} />
      <Sfx name="el-tap" at={answerAt} level={-30} />
      <Sfx name="el-pencil" at={backAt} level={-35} />
      <Sfx name="el-sprinkle" at={elevenAt} level={-32} />
      <Sfx name="el-tap" at={sixAt} level={-31} />

      <Drift from={from} to={end + 30}>
        <Kicker at={from - 10}>Machine learning engineer interview questions · ML system design</Kicker>
        <Headline lead="A model in a notebook" turn="is still just a file" at={modelAt - 2} turnAt={fileAt} size={64} />

        <BigMap
          notebookAt={notebookAt}
          modelAt={fileAt + 4}
          featuresAt={featuresAt}
          answerAt={answerAt}
          backAt={backAt}
          lit={{ features: designAt, answer: designAt + 6, back: designAt + 12, until: seventeenAt }}
        />

        <Spot id="giraffe" at={modelAt + 6} x={1440} y={y(300)} w={gW} />

        {/* The round: seventeen questions. */}
        <Ink at={seventeenAt} dur={14} style={{ left: X0, top: y(752), whiteSpace: "nowrap" }}>
          <span style={{ ...label(24, INK), fontWeight: 500 }}>Seventeen questions</span>
        </Ink>
        {Array.from({ length: 17 }, (_, i) => {
          const p = ease(frame, chipAt(i), 10);
          if (p <= 0) return null;
          const quick = i >= 11;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: chipX(i),
                top: chipsTop,
                width: CHIP,
                textAlign: "center",
                ...label(30, quick ? INK_SOFT : BLUE_INK),
                fontWeight: 500,
                opacity: p,
                transform: `translateY(${(1 - p) * 10}px)`,
              }}
            >
              <Num>{i + 1}</Num>
            </div>
          );
        })}
        <Ink at={elevenAt + 10} dur={14} style={{ left: X0, top: chipsTop + 52, whiteSpace: "nowrap" }}>
          <span style={{ ...note(21, INK_SOFT) }}>Worked through</span>
        </Ink>
        <Ink at={sixAt + 8} dur={14} style={{ left: chipX(11) + 6, top: chipsTop + 52, whiteSpace: "nowrap" }}>
          <span style={{ ...note(21, INK_SOFT) }}>Quick</span>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
