import type { NarrationScript } from "../../narration/types";

/**
 * "Why 0.1 + 0.2 isn't 0.3", a chalkboard lecture after
 * content/courses/python-basics/numbers.mdx (its "The 0.1 + 0.2 surprise",
 * "When to avoid floats: finance" and "Always construct Decimal from strings"
 * sections, which this agrees with).
 *
 * Every animation in Video.tsx is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts checked by running them (Python 3.13, Node, gcc, Java 21):
 *   - `0.1 + 0.2` prints 0.30000000000000004 (a 3, 15 zeros, a 4) in Python,
 *     JavaScript, C (`%.17g`) and Java; `0.1 + 0.2 == 0.3` is False in all four.
 *   - 1/10 in binary is 0.0 0011 0011 0011…, the block 0011 repeating forever.
 *   - `sys.float_info.mant_dig` is 53; the stored significand of 0.1 is
 *     1.1001…1001 1010 × 2⁻⁴, the tail rounded up (hex 0x1.999999999999ap-4).
 *   - Decimal(0.1) = 0.1000000000000000055511151231257827021181583404541015625
 *     (high), Decimal(0.2) = 0.2000000000000000111… (high),
 *     Decimal(0.3) = 0.2999999999999999888… (low).
 *   - The exact sum of the stored 0.1 and 0.2 rounds to
 *     0.3000000000000000444…, which is math.nextafter(0.3, 1): the float
 *     just above the one 0.3 is stored as.
 *   - math.isclose(0.1 + 0.2, 0.3) is True; round(0.1 + 0.2, 2) prints 0.3;
 *     Decimal("0.1") + Decimal("0.2") == Decimal("0.3") is True; 10 + 20 == 30.
 *   - 3 × 0.3333 = 0.9999.
 *
 * The beat that ends each board pauses a little longer (pauseAfter 0.82):
 * that silence is when the eraser crosses the board, so no sentence is ever
 * spoken over a half-erased slate.
 *
 * Written to be spoken: decimals as a lecturer says them ("point one"), the
 * exact digits left to the board. `math.isclose` and `Decimal` are worth
 * pinning in an ElevenLabs pronunciation dictionary ("math dot is close").
 */
export const script: NarrationScript = {
  id: "floating-point",
  leadIn: 0.7,
  tail: 2.6,
  beats: [
    { id: "hook", text: "Ask Python for point one plus point two.", pauseAfter: 0.3 },
    {
      id: "surprise",
      text: "You get point three, then 15 zeros and a four. Ask if that equals point three, and Python says False.",
      pauseAfter: 0.45,
    },
    {
      id: "not-bug",
      text: "It's not a bug. JavaScript, C and Java all say the same.",
      pauseAfter: 0.82,
    },
    {
      id: "third",
      text: "Here's why. Write one third as a decimal: point three three three, and the threes never end.",
      pauseAfter: 0.3,
    },
    {
      id: "cutoff",
      text: "Keep four digits, and three thirds make point nine nine nine nine. Not one.",
      pauseAfter: 0.82,
    },
    {
      id: "binary",
      text: "Computers write fractions in binary, out of halves, quarters and eighths. In binary, one tenth never ends either: the block zero zero one one repeats forever.",
      pauseAfter: 0.82,
    },
    {
      id: "bits",
      text: "A float keeps 53 significant bits and rounds off the rest.",
      pauseAfter: 0.35,
    },
    {
      id: "stored",
      text: "So the point one it stores is a hair more than one tenth. Here are its exact digits.",
      pauseAfter: 0.82,
    },
    {
      id: "pair",
      text: "Point two is stored a hair high too. But point three is stored a hair low.",
      pauseAfter: 0.45,
    },
    {
      id: "sum",
      text: "Add the two high ones, round again, and you land on the float just above point three. Different floats, so equals says False.",
      pauseAfter: 1.0,
    },
    {
      id: "isclose",
      text: "So never test floats for exact equality. Ask if they're close, with math.isclose.",
      pauseAfter: 0.35,
    },
    {
      id: "round",
      text: "To print one, round it, and you get a clean point three.",
      pauseAfter: 0.35,
    },
    {
      id: "money",
      text: "And for money, build a Decimal from a string, or count whole cents.",
      pauseAfter: 0.82,
    },
    {
      id: "outro",
      text: "Floats aren't broken. They just think in binary. Learn more in the Numbers lesson on Dataslope.",
    },
  ],
};
