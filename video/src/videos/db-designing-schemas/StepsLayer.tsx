import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, body } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { lerp, PathArrow, RAIL, StepList } from "./parts";

/**
 * The eight steps (the-design-process). They build large beside the opening
 * headline, one per step the narration names, with the loop back from review
 * to requirements; then, as the case study opens, the list shrinks into a rail
 * at the right of the page, where it lights the step the store is on until
 * the store is finished. One layer across those scenes, so the list never
 * cross-fades with itself.
 */
export const StepsLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const named = [
    n.word("steps", "Gather"),
    n.word("steps", "entities"),
    n.word("steps", "facts"),
    n.word("steps", "relate"),
    n.word("steps", "keys"),
    n.word("steps", "constraints"),
    n.word("steps", "normalize"),
    n.word("steps", "test"),
  ];
  const breaksAt = n.word("loop", "breaks");
  const loopAt = n.word("loop", "Loop back");
  const reviseAt = n.word("loop", "revise");
  const railFrom = n.beat("reqs").from - 16;
  // The step in hand, eased from one to the next as the narration reaches it.
  const turns = [
    n.beat("entities").from,
    n.beat("facts").from,
    n.beat("relate").from,
    n.beat("keys").from,
    n.beat("rules").from,
    n.beat("copy").from,
    n.beat("review").from,
  ];
  const active = turns.reduce((a, t) => a + ease(frame, t - 6, 14), 0);

  const m = ease(frame, railFrom, 26);
  const x = lerp(1090, 1528, m);
  const top = lerp(y(318), y(326), m);
  const scale = lerp(1.32, 1, m);

  // The loop: from step eight's number, out to the left, up, and back into step one.
  const r = RAIL.dot / 2;
  const loop = [
    [-6, 7 * RAIL.pitch + r],
    [-44, 7 * RAIL.pitch + r],
    [-44, r],
    [-6, r],
  ] as const;
  const loopOut = railFrom;

  return (
    <AbsoluteFill>
      {named.map((t, i) => (
        <Sfx key={i} name="el-tap" at={t} level={-29 - (i % 2)} />
      ))}
      <Sfx name="el-pencil" at={loopAt} level={-33} />
      <Sfx name="el-whoosh" at={railFrom} level={-34} />
      {turns.map((t, i) => (
        <Sfx key={`t${i}`} name="el-tap" at={t - 6} level={-30} />
      ))}

      <div style={{ position: "absolute", left: x, top, transform: `scale(${scale})`, transformOrigin: "0 0", width: RAIL.width, height: 8 * RAIL.pitch }}>
        <StepList named={named} railFrom={railFrom} active={active} flash={{ step: 7, at: breaksAt - 2 }} />
        <PathArrow points={loop} at={loopAt - 2} dur={22} out={loopOut} color={ACCENT_INK} width={2.4} radius={14} />
        <div
          style={{
            position: "absolute",
            right: RAIL.width + 56,
            top: 3.5 * RAIL.pitch,
            opacity: ease(frame, reviseAt - 4, 12) * (1 - ease(frame, loopOut, 10)),
            ...body(28, true),
            color: ACCENT_INK,
            whiteSpace: "nowrap",
          }}
        >
          revise
        </div>
      </div>
    </AbsoluteFill>
  );
};
