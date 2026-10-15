import React from "react";
import { useNarration } from "../../../narration/NarrationContext";
import { Chalk, charW, Drawing, Hand, INK, Mono } from "../chalk";
import { arrow, ellipse, line } from "../rough";

const BIG = 84;
const BW = charW(BIG);
const DX = 920;
const DY = 250;
const SUM = 66;
const SW = charW(SUM);
const SX = 900;

/** Board 2: one third never ends in decimal, and cutting it short costs you:
 *  three of the shortened thirds add up to 0.9999. */
export const ThirdBoard: React.FC = () => {
  const { word } = useNarration();
  const why = word("third", "Here's why");
  const third = word("third", "one third");
  const decimal = word("third", "decimal");
  const point = word("third", "point three");
  const t1 = word("third", "three", { nth: 1 });
  const t2 = word("third", "three", { nth: 2 });
  const t3 = word("third", "three", { nth: 3 });
  const never = word("third", "never end");
  const keep = word("cutoff", "Keep");
  const digits = word("cutoff", "digits");
  const thirds = word("cutoff", "three thirds");
  const make = word("cutoff", "make");
  const nine = word("cutoff", "point nine");
  const notOne = word("cutoff", "Not one");

  const rows = ["  0.3333", "+ 0.3333", "+ 0.3333"];

  return (
    <>
      <Drawing id="fp-thirds" at={why} x={100} y={190} w={460} h={420} dur={24} />
      <Hand at={third} x={640} y={236} size={112} weight={700} speed={0.6}>
        1/3 =
      </Hand>
      <Mono
        at={point}
        x={DX}
        y={DY}
        size={BIG}
        parts={[
          { text: "0.", speed: 1 },
          { text: "3", at: t1 },
          { text: "3", at: t2 },
          { text: "3", at: t3 },
          { text: "3", at: t3 + 7, speed: 0.45 },
          { text: "33333333333", speed: 0.45, dimAt: digits, dimTo: 0.16 },
        ]}
      />
      <Hand at={decimal} x={644} y={150} size={52} color={INK.blue} speed={1}>
        in decimal
      </Hand>
      <Chalk strokes={arrow(1786, 300, 1890, 296, 201, { bend: 0.02, head: 20 })} at={never} dur={10} color={INK.yellow} width={6} />
      <Hand at={never + 4} x={1530} y={372} size={60} color={INK.yellow} rotate={-3} speed={0.9}>
        never ends…
      </Hand>

      {/* Keep four digits: a cut, and everything after it rubbed out. */}
      <Chalk strokes={[line(DX + 6 * BW + 2, 228, DX + 6 * BW - 4, 372, 211, { wobble: 3 })]} at={keep} dur={8} color={INK.red} width={7} />
      <Hand at={keep + 4} x={DX + 6 * BW + 18} y={176} size={48} color={INK.red} speed={1}>
        keep 4 digits
      </Hand>

      {/* Three slices, three rows. */}
      <Chalk strokes={arrow(560, 560, 870, 560, 221, { bend: -0.12 })} at={thirds - 4} dur={10} width={5} />
      {rows.map((r, i) => (
        <Mono key={i} at={thirds + i * 5} x={SX} y={436 + i * 78} size={SUM} speed={2} parts={r} />
      ))}
      <Chalk strokes={[line(SX - 8, 680, SX + 8 * SW + 10, 676, 231, { bow: -2 })]} at={make} dur={8} width={6} />
      <Mono at={nine} x={SX} y={696} size={SUM} color={INK.yellow} speed={1.1} parts="  0.9999" />
      <Chalk strokes={[ellipse(SX + 5 * SW, 736, 122, 54, 241)]} at={notOne} dur={12} color={INK.red} width={6} />
      <Hand at={notOne + 2} x={1290} y={684} size={90} color={INK.red} weight={700} rotate={-4} speed={0.7}>
        not 1!
      </Hand>
    </>
  );
};
