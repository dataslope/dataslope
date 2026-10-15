import React from "react";
import { useNarration } from "../../../narration/NarrationContext";
import { Chalk, charW, Drawing, Hand, INK, Mono } from "../chalk";
import { arrow, ellipse, line, type Stroke } from "../rough";

const ROW = 42;
const RW = charW(ROW);
const X = 130;
const VX = X + 180;
const NOTE = VX + 22 * RW;
const rowY = (i: number) => 92 + i * 78;
/** Vertical centre of a row of digits. */
const rowMid = (i: number) => rowY(i) + ROW * 0.62;

const LY = 506;
const A = 640;
const B = 1280;
const LABEL = 26;
const LW = charW(LABEL);
const A_DIGITS = "0.29999999999999998889…";
const B_DIGITS = "0.30000000000000004440…";

const rows = [
  { name: "0.1", value: "0.1000000000000000055…", note: "↑ high", color: INK.yellow },
  { name: "0.2", value: "0.2000000000000000111…", note: "↑ high", color: INK.yellow },
  { name: "0.3", value: "0.2999999999999999888…", note: "↓ low", color: INK.blue },
];

const twoHeaded = (x1: number, x2: number, y: number, seed: number): Stroke[] => {
  const [shaft, ...right] = arrow(x1, y, x2, y, seed, { bend: 0, head: 16 });
  const left = arrow(x2, y, x1, y, seed + 20, { bend: 0, head: 16 }).slice(1);
  return [...left, shaft, ...right];
};

/** Board 5: 0.1 and 0.2 are stored high, 0.3 low. The sum rounds onto the
 *  next float above 0.3's, so the two sides of == are different floats. */
export const SumBoard: React.FC = () => {
  const { word } = useNarration();
  const start = word("pair", "Point two");
  const two = word("pair", "two");
  const high = word("pair", "high");
  const three = word("pair", "point three");
  const low = word("pair", "low");
  const add = word("sum", "Add");
  const two2 = word("sum", "two high");
  const round = word("sum", "round again");
  const land = word("sum", "land");
  const above = word("sum", "just above");
  const point3 = word("sum", "point three");
  const different = word("sum", "Different floats");
  const equals = word("sum", "equals");
  const no = word("sum", "False");

  const at = [start, two, three];
  const noteAt = [start + 10, high, low];

  return (
    <>
      {rows.map((r, i) => (
        <React.Fragment key={r.name}>
          <Mono at={at[i]} x={X} y={rowY(i)} size={ROW} speed={2} parts={r.name} />
          <Chalk strokes={arrow(X + 90, rowMid(i), VX - 18, rowMid(i), 501 + i * 10, { bend: 0, head: 13 })} at={at[i] + 3} dur={5} width={4} />
          <Mono at={at[i] + 6} x={VX} y={rowY(i)} size={ROW} color={r.color} speed={2.4} parts={r.value} />
          <Hand at={noteAt[i]} x={NOTE + 24} y={rowY(i) - 6} size={56} color={r.color} weight={700} speed={0.8}>
            {r.note}
          </Hand>
        </React.Fragment>
      ))}

      {/* A number line, zoomed in until single floats are far apart. */}
      <Chalk strokes={[line(160, LY, 1760, LY + 2, 521, { wobble: 2 })]} at={start + 6} dur={16} width={6} />
      <Hand at={start + 18} x={1620} y={LY + 14} size={40} color={INK.dim} speed={1.2}>
        zoomed in
      </Hand>
      <Chalk strokes={[line(A, LY - 36, A + 1, LY + 36, 522, { wobble: 1 })]} at={low - 6} dur={5} color={INK.blue} width={6} />
      <Chalk strokes={[line(B, LY - 36, B + 1, LY + 36, 523, { wobble: 1 })]} at={add} dur={5} width={6} />
      {/* The two high values, added and rounded, land on the right-hand float. */}
      {/* The two high ones, bracketed, then carried down to where they land. */}
      <Chalk strokes={[line(NOTE + 160, rowY(0) + 4, NOTE + 160, rowY(1) + 52, 530, { wobble: 1, bow: -14 })]} at={two2} dur={6} color={INK.yellow} width={5} />
      <Chalk strokes={arrow(NOTE + 178, (rowMid(0) + rowMid(1)) / 2, B - 8, LY - 44, 531, { bend: -0.2, head: 20 })} at={round} dur={14} color={INK.yellow} width={6} />
      <Chalk strokes={[ellipse(B, LY, 30, 30, 532, { turns: 1.05 })]} at={land} dur={8} color={INK.yellow} width={6} />
      <Hand at={land + 2} x={B + 30} y={LY - 112} size={50} color={INK.yellow} speed={1.2}>
        0.1 + 0.2 lands here
      </Hand>
      <Mono at={land + 6} x={B - (B_DIGITS.length * LW) / 2} y={LY + 46} size={LABEL} color={INK.yellow} speed={3} parts={B_DIGITS} />

      <Hand at={low} x={A} y={LY - 112} size={50} color={INK.blue} align="center" speed={1.2}>
        0.3 is stored here
      </Hand>
      <Chalk strokes={[ellipse(A, LY, 30, 30, 541, { turns: 1.05 })]} at={low + 2} dur={8} color={INK.blue} width={6} />
      <Mono at={low + 6} x={A - (A_DIGITS.length * LW) / 2} y={LY + 46} size={LABEL} color={INK.blue} speed={3} parts={A_DIGITS} />
      {/* Saying "point three" again points back at it. */}
      <Chalk strokes={[ellipse(A, LY, 40, 40, 542, { turns: 1.1 })]} at={point3} dur={8} color={INK.blue} width={4} opacity={0.8} />
      <Hand at={above} x={(A + B) / 2} y={LY + 6} size={40} color={INK.dim} align="center" speed={1.4}>
        the very next float
      </Hand>

      <Chalk strokes={twoHeaded(A + 30, B - 30, LY + 118, 551)} at={different} dur={12} color={INK.red} width={5} />
      <Hand at={different + 4} x={(A + B) / 2} y={LY + 134} size={50} color={INK.red} align="center" speed={1.1}>
        two different floats
      </Hand>
      <Drawing id="fp-scale" at={different} x={1380} y={622} w={360} h={292} dur={18} drift={3} />

      <Mono at={equals - 8} x={X + 30} y={736} size={48} speed={2} parts="0.1 + 0.2 == 0.3" />
      <Mono at={no} x={X + 30} y={806} size={64} color={INK.red} weight={700} speed={0.9} parts="False" />
      <Chalk strokes={[ellipse(X + 30 + 2.5 * charW(64), 846, 132, 58, 561)]} at={no + 4} dur={10} color={INK.red} width={6} />
    </>
  );
};
