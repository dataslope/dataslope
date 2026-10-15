import React from "react";
import { useNarration } from "../../../narration/NarrationContext";
import { Chalk, charW, Drawing, Hand, INK, Mono } from "../chalk";
import { box, brace, ellipse, line } from "../rough";

const CODE = 58;
const CW = charW(CODE);
const X = 170;
const ROW = [262, 352, 548, 636];

const RESULT = "0.30000000000000004";

/** Board 1: a chalk-drawn Python prompt. The sum comes out wrong, the
 *  comparison says False, and the marmot steps in to say it isn't a bug. */
export const PromptBoard: React.FC = () => {
  const { word } = useNarration();

  const ask = word("hook", "Ask");
  const one = word("hook", "point one");
  const plus = word("hook", "plus");
  const two = word("hook", "point two");
  const get = word("surprise", "You get");
  const zeros = word("surprise", "15 zeros");
  const four = word("surprise", "four");
  const ask2 = word("surprise", "Ask if");
  const equals = word("surprise", "equals");
  const three2 = word("surprise", "point three", { nth: 2 });
  const no = word("surprise", "False");
  const bug = word("not-bug", "bug");
  const js = word("not-bug", "JavaScript");
  const c = word("not-bug", "C");
  const java = word("not-bug", "Java");
  const same = word("not-bug", "same");

  const langs: [string, number][] = [
    ["JavaScript", js],
    ["C", c],
    ["Java", java],
  ];

  return (
    <>
      {/* Already being written on the first frame. */}
      <Hand at={-5} x={128} y={58} size={60} color={INK.dim} speed={1.6}>
        Why 0.1 + 0.2 isn&apos;t 0.3
      </Hand>
      <Chalk strokes={[line(126, 132, 690, 126, 11, { bow: -3 })]} at={14} dur={12} color={INK.yellow} width={5} />

      {/* The prompt, drawn as a window: frame, title bar, three dots. */}
      <Chalk strokes={box(120, 170, 1010, 590, 21)} at={-2} dur={26} width={6} />
      <Chalk strokes={[line(122, 236, 1128, 232, 22, { wobble: 2 })]} at={22} dur={10} width={5} />
      <Chalk
        strokes={[ellipse(1046, 203, 10, 10, 31, { turns: 1 }), ellipse(1078, 203, 10, 10, 32, { turns: 1 }), ellipse(1110, 203, 10, 10, 33, { turns: 1 })]}
        at={28}
        dur={8}
        color={INK.dim}
        width={4}
      />
      <Hand at={24} x={150} y={176} size={46} color={INK.dim} speed={1.2}>
        python3
      </Hand>

      <Mono
        at={ask}
        x={X}
        y={ROW[0]}
        size={CODE}
        parts={[
          { text: ">>> ", color: INK.dim, speed: 2 },
          { text: "0.1", at: one },
          { text: " + ", at: plus },
          { text: "0.2", at: two },
        ]}
      />
      <Mono at={get} x={X} y={ROW[1]} size={CODE} color={INK.yellow} speed={1.3} parts={RESULT} />
      {/* The fifteen zeros, braced and counted. */}
      <Chalk strokes={[brace(X + 3 * CW + 4, X + 18 * CW - 4, ROW[1] + 74, 22, 41)]} at={zeros} dur={10} width={4} />
      <Hand at={zeros + 6} x={X + 10.5 * CW} y={ROW[1] + 100} size={44} align="center" speed={1.2}>
        15 zeros
      </Hand>
      {/* …and the four that shouldn't be there. */}
      <Chalk strokes={[ellipse(X + 18.55 * CW, ROW[1] + 36, 27, 44, 51, { tilt: 0.05 })]} at={four} dur={12} color={INK.red} width={6} />

      <Mono
        at={ask2}
        x={X}
        y={ROW[2]}
        size={CODE}
        parts={[
          { text: ">>> ", color: INK.dim, speed: 2 },
          { text: "0.1 + 0.2", speed: 1.6 },
          { text: " == ", at: equals, speed: 1.5 },
          { text: "0.3", at: three2 },
        ]}
      />
      <Mono at={no} x={X} y={ROW[3]} size={CODE} color={INK.red} speed={0.9} weight={700} parts="False" />
      <Chalk
        strokes={[
          line(X - 6, ROW[3] + 76, X + 5 * CW + 12, ROW[3] + 72, 61, { bow: -2 }),
          line(X + 4, ROW[3] + 90, X + 5 * CW + 2, ROW[3] + 88, 62, { bow: -2 }),
        ]}
        at={no + 7}
        dur={10}
        color={INK.red}
        width={5}
      />

      {/* Not a bug: the same digits from three other languages. */}
      <Hand at={bug - 4} x={1236} y={160} size={78} color={INK.yellow} weight={700} rotate={-3} speed={1}>
        not a bug!
      </Hand>
      <Chalk strokes={[line(1238, 258, 1560, 246, 71, { bow: -4 })]} at={bug + 8} dur={8} color={INK.yellow} width={5} />
      {langs.map(([name, at], i) => (
        <React.Fragment key={name}>
          <Hand at={at} x={1240} y={286 + i * 64} size={54} weight={700} speed={1.2}>
            {name}
          </Hand>
          <Mono at={at + 4} x={1480} y={302 + i * 64} size={26} color={INK.yellow} speed={3} parts={RESULT} />
        </React.Fragment>
      ))}
      <Drawing id="fp-marmot" at={bug} x={1370} y={498} w={360} h={415} flip dur={20} />
      {/* The three answers, ringed together. */}
      <Chalk strokes={[ellipse(1630, 372, 178, 104, 81, { turns: 1.06, tilt: -0.04 })]} at={same} dur={14} color={INK.green} width={5} />
    </>
  );
};
