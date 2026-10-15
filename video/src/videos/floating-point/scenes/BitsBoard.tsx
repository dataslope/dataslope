import React from "react";
import { useNarration } from "../../../narration/NarrationContext";
import { Chalk, charW, Drawing, Hand, INK, Mono } from "../chalk";
import { arrow, brace, line } from "../rough";

const BIT = 32;
const CW = charW(BIT);
const X = 130;
const Y = 252;
/** 1/10 in binary: 0.000, then 53 significant bits, then the rest. The
 *  first 53 are 1 followed by 1001 thirteen times; the float keeps them and
 *  rounds the tail, which turns the last 1001 into 1010. */
const LEAD = "0.000";
const KEPT = "1" + "1001".repeat(12);
const LAST = "1001";
const ROUNDED = "1010";
const TAIL = "100110011001…";
const cut = X + (LEAD.length + KEPT.length + LAST.length) * CW;
const lastX = X + (LEAD.length + KEPT.length) * CW;

const DEC = 34;
const DW = charW(DEC);
const EXACT = "55511151231257827021181583404541015625";

/** Board 4: the float keeps 53 bits and rounds the rest up, so the 0.1 it
 *  stores is a hair past one tenth, and Decimal shows every digit of it. */
export const BitsBoard: React.FC = () => {
  const { word } = useNarration();
  const start = word("bits", "A float");
  const float = word("bits", "float");
  const fiftyThree = word("bits", "53");
  const rounds = word("bits", "rounds off");
  const rest = word("bits", "rest");
  const stores = word("stored", "stores");
  const hair = word("stored", "a hair more");
  const tenth = word("stored", "one tenth");
  const here = word("stored", "Here");
  const its = word("stored", "its");

  return (
    <>
      <Hand at={start} x={128} y={40} size={62} color={INK.yellow} weight={700} speed={1.2}>
        Inside a float
      </Hand>
      <Drawing id="fp-lens" at={start + 4} x={1452} y={300} w={310} h={445} dur={20} />
      <Mono
        at={float}
        x={X}
        y={Y}
        size={BIT}
        speed={3}
        parts={[
          { text: LEAD, color: INK.dim },
          { text: KEPT },
          { text: LAST, dimAt: stores, dimTo: 0.3 },
          { text: TAIL, color: INK.dim, dimAt: rest, dimTo: 0.14 },
        ]}
      />
      <Chalk strokes={[brace(X + LEAD.length * CW, cut - 2, Y - 6, -26, 401)]} at={fiftyThree} dur={10} width={4} />
      <Hand at={fiftyThree + 2} x={(X + LEAD.length * CW + cut) / 2 + 60} y={146} size={60} align="center" weight={700} speed={1}>
        53 significant bits
      </Hand>
      <Chalk strokes={[line(cut + 2, Y - 18, cut - 2, Y + 62, 411, { wobble: 2 })]} at={rounds} dur={7} color={INK.red} width={6} />
      <Hand at={rounds + 3} x={cut + 18} y={Y - 64} size={44} color={INK.red} speed={1.2}>
        rounded off
      </Hand>

      {/* The tail rounds up: the last four bits go from 1001 to 1010. */}
      <Chalk strokes={[line(lastX - 4, Y + 20, cut + 4, Y + 18, 421, { wobble: 1 })]} at={stores} dur={6} color={INK.red} width={4} />
      <Mono at={stores + 4} x={lastX} y={Y + 46} size={BIT} color={INK.yellow} speed={1} weight={700} parts={ROUNDED} />
      <Hand at={stores + 8} x={lastX - 210} y={Y + 44} size={44} color={INK.yellow} speed={1.2}>
        rounded up
      </Hand>

      {/* A hair past the mark. */}
      <Drawing id="fp-tape" at={hair - 6} x={206} y={407} w={768} h={254} dur={18} drift={3} />
      <Hand at={tenth} x={590} y={664} size={46} align="center" speed={1}>
        1/10
      </Hand>
      <Hand at={hair + 4} x={960} y={404} size={72} color={INK.yellow} weight={700} rotate={-3} speed={0.9}>
        a hair more!
      </Hand>
      <Chalk strokes={arrow(950, 462, 722, 424, 431, { bend: -0.14 })} at={hair + 18} dur={10} color={INK.yellow} width={5} />

      {/* The stored 0.1, every digit of it. */}
      <Mono
        at={here}
        x={X}
        y={720}
        size={DEC}
        parts={[
          { text: ">>> ", color: INK.dim, speed: 2 },
          { text: "Decimal(0.1)", speed: 1.4 },
        ]}
      />
      <Mono
        at={its + 2}
        x={X}
        y={774}
        size={DEC}
        speed={3.2}
        parts={[
          { text: "Decimal('", color: INK.dim },
          { text: "0.1" + "0".repeat(16) },
          { text: EXACT, color: INK.yellow },
          { text: "')", color: INK.dim },
        ]}
      />
      <Chalk
        strokes={[line(X + 28 * DW, 822, X + (28 + EXACT.length) * DW, 818, 441, { bow: 3, wobble: 3 })]}
        at={its + 20}
        dur={8}
        color={INK.yellow}
        width={4}
      />
    </>
  );
};
