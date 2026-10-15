import React from "react";
import { useNarration } from "../../../narration/NarrationContext";
import { Chalk, charW, Hand, INK, Mono } from "../chalk";
import { arrow, ellipse, line, type Stroke } from "../rough";

const RX0 = 160;
const RX1 = 1760;
const RY = 330;
/** x of a fraction of the way along the ruler. */
const at = (f: number) => RX0 + (RX1 - RX0) * f;

const BIN = 54;
const BCW = charW(BIN);
const BX = 400;
const BY = 618;
const GROUPS = 9;
const DIGITS = "0.0" + "0011".repeat(GROUPS);
const groupX = (k: number): [number, number] => [BX + (3 + 4 * k) * BCW, BX + (7 + 4 * k) * BCW];

const tick = (f: number, h: number, seed: number): Stroke => line(at(f), RY - h / 2, at(f) + 1, RY + h / 2, seed, { wobble: 1 });

const UNDERLINES = [INK.blue, INK.teal, INK.purple, INK.green];

/** Board 3: binary fractions are halves, quarters, eighths, the marks of a
 *  ruler. One tenth falls between them all, and its digits repeat forever. */
export const BinaryBoard: React.FC = () => {
  const { word } = useNarration();
  const start = word("binary", "Computers");
  const binary = word("binary", "binary");
  const halves = word("binary", "halves");
  const quarters = word("binary", "quarters");
  const eighths = word("binary", "eighths");
  const tenth = word("binary", "one tenth");
  const never = word("binary", "never ends");
  const block = word("binary", "zero zero one one");
  const repeats = word("binary", "repeats");
  const forever = word("binary", "forever");

  return (
    <>
      <Hand at={start} x={128} y={64} size={70} color={INK.blue} weight={700} speed={1.1}>
        Binary fractions
      </Hand>
      <Chalk strokes={[line(126, 146, 560, 140, 301, { bow: -3 })]} at={start + 12} dur={8} color={INK.blue} width={5} />

      {/* A ruler: every mark on it is a binary fraction. */}
      <Chalk strokes={[line(RX0, RY, RX1, RY, 311, { wobble: 2 }), tick(0, 70, 312), tick(1, 70, 313)]} at={binary} dur={14} width={6} />
      <Mono at={binary + 8} x={RX0 - 12} y={RY + 44} size={40} color={INK.dim} parts="0" />
      <Mono at={binary + 10} x={RX1 - 12} y={RY + 44} size={40} color={INK.dim} parts="1" />

      <Chalk strokes={[tick(0.5, 120, 321)]} at={halves} dur={6} width={7} />
      <Hand at={halves + 2} x={at(0.5)} y={196} size={58} align="center" speed={0.8}>
        1/2
      </Hand>
      <Chalk strokes={[tick(0.25, 92, 331), tick(0.75, 92, 332)]} at={quarters} dur={8} width={6} />
      <Hand at={quarters + 2} x={at(0.25)} y={212} size={52} align="center" speed={0.8}>
        1/4
      </Hand>
      <Chalk strokes={[0.125, 0.375, 0.625, 0.875].map((f, i) => tick(f, 66, 341 + i))} at={eighths} dur={10} width={5} />
      <Hand at={eighths + 2} x={at(0.125)} y={226} size={46} align="center" speed={0.8}>
        1/8
      </Hand>
      <Chalk
        strokes={[1, 3, 5, 7, 9, 11, 13, 15].map((k, i) => tick(k / 16, 40, 351 + i))}
        at={eighths + 14}
        dur={12}
        color={INK.dim}
        width={4}
      />

      {/* One tenth: written out, and pointed at its place between the marks. */}
      <Hand at={tenth} x={128} y={BY - 18} size={80} weight={700} speed={0.8}>
        1/10 =
      </Hand>
      <Chalk strokes={arrow(232, BY - 22, at(0.1) - 2, RY + 26, 361, { bend: -0.1, head: 18 })} at={tenth + 8} dur={10} color={INK.yellow} width={6} />
      <Mono at={never} x={BX} y={BY} size={BIN} speed={0.85} parts={DIGITS} />
      <Chalk
        strokes={[ellipse((groupX(0)[0] + groupX(0)[1]) / 2, BY + 34, 76, 44, 371, { turns: 1.08 })]}
        at={block}
        dur={12}
        color={INK.yellow}
        width={6}
      />
      {Array.from({ length: GROUPS - 1 }, (_, i) => {
        const [x0, x1] = groupX(i + 1);
        return (
          <Chalk
            key={i}
            strokes={[line(x0 + 6, BY + 76, x1 - 6, BY + 76, 381 + i, { bow: 6, wobble: 1.5 })]}
            at={repeats + i * 3}
            dur={6}
            color={UNDERLINES[i % UNDERLINES.length]}
            width={5}
          />
        );
      })}
      <Chalk strokes={arrow(BX + DIGITS.length * BCW + 10, BY + 34, 1880, BY + 30, 391, { bend: 0.02 })} at={forever - 4} dur={8} color={INK.yellow} width={6} />
      <Hand at={forever - 2} x={1560} y={BY + 96} size={62} color={INK.yellow} rotate={-3} speed={0.9}>
        forever
      </Hand>
    </>
  );
};
