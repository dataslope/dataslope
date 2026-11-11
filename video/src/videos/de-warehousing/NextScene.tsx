import React from "react";
import { AbsoluteFill } from "remotion";
import { NextLine } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Spot } from "./parts";

/** The hamster at a size it can be seen, centred over the Next line. Its art
 *  is 183 by 140. */
const ART = { w: 420, h: 321 };
const LINE_W = 640;

/**
 * The bridge into Part 10 on a page of its own (the owner, 2026-11-11: the
 * hamster and the Next line were squeezed in under the lakehouse panels).
 * The lakehouse page ends on "All of it assumes the data lands on time,
 * every day.", holds through a long pause, and this page opens on "Keeping
 * it running on time is the next round."
 */
export const NextScene: React.FC = () => {
  const n = useNarration();
  const from = n.beat("next-round").from;
  const nextAt = n.word("next-round", "Next:", { nth: 2 });
  const end = n.beat("next-round").to;
  return (
    <AbsoluteFill>
      <Sfx name="el-chime" at={nextAt} level={-34} />
      <Drift from={from} to={end + 40}>
        <Spot id="de-warehousing-hamster" at={from + 2} left={960 - ART.w / 2} top={250} width={ART.w} height={ART.h} />
        <NextLine at={nextAt} x={960 - LINE_W / 2} y={660} width={LINE_W}>
          orchestration and reliability
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
