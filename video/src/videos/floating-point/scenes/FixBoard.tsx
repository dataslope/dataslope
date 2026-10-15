import React from "react";
import { useNarration } from "../../../narration/NarrationContext";
import { Chalk, charW, Hand, INK, Mono } from "../chalk";
import { arrow, check, cross, line } from "../rough";

const CODE = 40;
const CW = charW(CODE);
const LX = 130;
const CX = 460;
const ROWS = [336, 480, 624, 768];
const DONT = 196;

/** One habit per row: a label, the code, an arrow, the result, a tick. */
const Habit: React.FC<{
  y: number;
  label: string;
  labelAt: number;
  code: { text: string; color?: string }[];
  codeAt: number;
  result: string;
  resultAt: number;
}> = ({ y, label, labelAt, code, codeAt, result, resultAt }) => {
  const len = code.reduce((n, c) => n + c.text.length, 0);
  const ax = CX + len * CW + 22;
  const rx = ax + 82;
  const tx = rx + result.length * CW + 22;
  return (
    <>
      <Hand at={labelAt} x={LX} y={y - 8} size={58} color={INK.blue} weight={700} speed={0.9}>
        {label}
      </Hand>
      <Mono at={codeAt} x={CX} y={y} size={CODE} speed={1.9} parts={code} />
      <Chalk strokes={arrow(ax, y + 26, ax + 60, y + 26, y, { bend: 0, head: 14 })} at={resultAt - 4} dur={5} width={4} />
      <Mono at={resultAt} x={rx} y={y} size={CODE} color={INK.green} weight={700} speed={1.2} parts={result} />
      <Chalk strokes={check(tx, y + 4, 42, y + 1)} at={resultAt + 5} dur={6} color={INK.green} width={6} />
    </>
  );
};

/** Board 6: three habits. Compare with isclose, round for display, and keep
 *  money out of floats with Decimal or whole cents. */
export const FixBoard: React.FC = () => {
  const { word } = useNarration();
  const start = word("isclose", "So");
  const never = word("isclose", "never");
  const test = word("isclose", "test");
  const equality = word("isclose", "exact equality");
  const close = word("isclose", "close");
  const isclose = word("isclose", "math.isclose");
  const print = word("round", "print");
  const roundIt = word("round", "round it");
  const clean = word("round", "clean");
  const money = word("money", "money");
  const decimal = word("money", "Decimal");
  const string = word("money", "string");
  const count = word("money", "count");
  const cents = word("money", "whole cents");

  return (
    <>
      <Hand at={start} x={128} y={56} size={76} color={INK.yellow} weight={700} speed={1}>
        Living with floats
      </Hand>
      <Chalk strokes={[line(126, 146, 640, 140, 601, { bow: -3 })]} at={start + 16} dur={8} color={INK.yellow} width={5} />
      {/* The habit to drop, struck out. */}
      <Hand at={never} x={LX} y={DONT - 8} size={58} color={INK.red} weight={700} speed={0.9}>
        not this
      </Hand>
      <Mono at={test} x={CX} y={DONT} size={CODE} speed={1.6} parts="0.1 + 0.2 == 0.3" />
      <Chalk strokes={[line(CX - 10, DONT + 26, CX + 16 * CW + 10, DONT + 22, 611, { wobble: 2 })]} at={equality} dur={8} color={INK.red} width={6} />
      <Chalk strokes={cross(CX + 16 * CW + 70, DONT + 24, 52, 612)} at={equality + 6} dur={8} color={INK.red} width={6} />

      <Habit
        y={ROWS[0]}
        label="compare"
        labelAt={close - 6}
        code={[{ text: "math.isclose(0.1 + 0.2, 0.3)" }]}
        codeAt={close}
        result="True"
        resultAt={isclose + 6}
      />
      <Habit
        y={ROWS[1]}
        label="display"
        labelAt={print}
        code={[{ text: "round(0.1 + 0.2, 2)" }]}
        codeAt={roundIt}
        result="0.3"
        resultAt={clean}
      />
      <Habit
        y={ROWS[2]}
        label="money"
        labelAt={money}
        code={[{ text: 'Decimal("0.1") + Decimal("0.2")' }]}
        codeAt={decimal}
        result="Decimal('0.3')"
        resultAt={string + 4}
      />
      <Habit
        y={ROWS[3]}
        label="or cents"
        labelAt={count}
        code={[{ text: "10 + 20" }, { text: "   # cents", color: INK.dim }]}
        codeAt={cents - 8}
        result="30"
        resultAt={cents + 4}
      />
    </>
  );
};
