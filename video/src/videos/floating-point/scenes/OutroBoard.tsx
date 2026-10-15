import React from "react";
import { useCurrentFrame } from "remotion";
import { Logo } from "../../../components/Logo";
import { ease } from "../../../components/motion";
import { useNarration } from "../../../narration/NarrationContext";
import { Chalk, Drawing, Hand, INK, Mono } from "../chalk";
import { box, check, line } from "../rough";

const URL = "dataslope.com/courses/python-basics/numbers";

/** Board 7: the takeaway, and where the lesson lives. */
export const OutroBoard: React.FC = () => {
  const frame = useCurrentFrame();
  const { word } = useNarration();
  const floats = word("outro", "Floats");
  const they = word("outro", "They");
  const binary = word("outro", "binary");
  const learn = word("outro", "Learn more");
  const numbers = word("outro", "Numbers");
  const lesson = word("outro", "lesson");
  const dataslope = word("outro", "Dataslope");
  const logo = ease(frame, dataslope, 14);

  return (
    <>
      <Hand at={floats} x={128} y={92} size={112} weight={700} speed={0.9}>
        Floats aren&apos;t broken.
      </Hand>
      <Hand at={they} x={128} y={232} size={112} color={INK.yellow} weight={700} speed={0.9}>
        They just think in binary.
      </Hand>
      <Chalk strokes={[line(130, 370, 1150, 362, 701, { bow: -5, wobble: 3 })]} at={binary + 6} dur={12} color={INK.blue} width={6} />

      <Chalk strokes={box(130, 448, 1040, 360, 711)} at={learn} dur={18} width={5} />
      <Hand at={numbers - 4} x={176} y={470} size={44} color={INK.dim} speed={1.4}>
        the lesson
      </Hand>
      <Hand at={numbers} x={176} y={518} size={84} weight={700} speed={0.8}>
        Numbers
      </Hand>
      <Hand at={numbers + 8} x={488} y={548} size={48} color={INK.blue} speed={1.2}>
        in Python Basics
      </Hand>
      <Mono at={lesson} x={176} y={648} size={32} color={INK.yellow} speed={2.6} parts={URL} />
      <div
        style={{
          position: "absolute",
          left: 176,
          top: 722,
          opacity: logo,
          transform: `translateY(${(1 - logo) * 14}px)`,
        }}
      >
        <Logo size={46} tone="light" />
      </div>

      {/* Class dismissed: the URL underlined, the claim ticked. */}
      <Chalk strokes={[line(172, 700, 176 + URL.length * 19.2, 696, 721, { bow: -2 })]} at={dataslope + 8} dur={12} color={INK.yellow} width={4} />
      <Chalk strokes={check(1040, 118, 64, 731)} at={dataslope + 30} dur={8} color={INK.green} width={7} />
      <Drawing id="fp-marmot" at={floats + 4} x={1290} y={330} w={450} h={520} flip dur={22} />
    </>
  );
};
