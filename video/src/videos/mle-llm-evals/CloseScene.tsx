import React from "react";
import { AbsoluteFill } from "remotion";
import { useLayout } from "../../editorial/layout";
import { headline, INK, INK_SOFT } from "../../editorial/style";
import { Ink, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { PRACTICE } from "./data";
import { Drift, Kicker, Line, Mark, Spot, X0 } from "./parts";

/** The pelican, back where the video opened. */
const BIRD = { left: 1450, top: 300, w: 320, h: 479 };

/**
 * The close of the series. The two questions every round on the track asks,
 * inked one after the other as the headline in the serif, with the pelican
 * back beside them; then where to practise, as two short lines. No "Next"
 * line: the series ends here.
 */
export const CloseScene: React.FC = () => {
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("close").from;
  const roundAt = n.word("close", "every round on this track");
  const holdAt = n.word("close", "will it hold up");
  const knowAt = n.word("close", "how would you know");
  const findAt = n.word("close-practice", "To find the rounds");
  const checksAt = n.word("close-practice", "each page's concept checks");
  const bankAt = n.word("close-practice", "the hundred and ten");
  const end = n.beat("close-practice").to;

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={from + 4} level={-31} />
      <Sfx name="el-pencil" at={holdAt + 2} level={-35} />
      <Sfx name="el-pencil" at={knowAt + 2} level={-35} />
      <Sfx name="el-tap" at={checksAt + 2} level={-31} />
      <Sfx name="el-tap" at={bankAt + 2} level={-31} />

      <Drift from={from} to={end + 80}>
        <Kicker at={from - 4}>Machine learning engineer interview questions</Kicker>
        <Spot id="mle-llm-evals-pelican" at={from + 2} left={BIRD.left} top={y(BIRD.top)} width={BIRD.w} height={BIRD.h} amp={4} />

        <Line x={X0 - 4} y={y(250)} at={roundAt - 4} size={28} color={INK_SOFT}>
          From bias and variance to agents, every round asks
        </Line>
        <Ink at={holdAt} dur={20} style={{ left: 92, top: y(320), whiteSpace: "nowrap", ...headline(80) }}>
          Will it hold up on data it hasn&apos;t seen?
        </Ink>
        <Ink at={knowAt} dur={20} style={{ left: 92, top: y(320) + 104, whiteSpace: "nowrap", ...headline(80), color: INK }}>
          How would you know?
        </Ink>

        <Line x={X0 - 4} y={y(640)} at={findAt} size={26} color={INK_SOFT}>
          To find the rounds that still need work
        </Line>
        <Line x={X0 - 4} y={y(640) + 56} at={checksAt} size={32} weight={600}>
          Concept checks on every topic page
        </Line>
        <Line x={X0 - 4} y={y(640) + 116} at={bankAt} size={32} weight={600} style={{ marginLeft: "-0.14em" }}>
          <Mark at={bankAt + 8}>
            <Num>{PRACTICE.bank}</Num> multiple-choice questions
          </Mark>{" "}
          <span style={{ color: INK_SOFT, fontWeight: 500 }}>that close the track</span>
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
