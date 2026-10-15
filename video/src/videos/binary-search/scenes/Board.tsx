import React from "react";
import { useCurrentFrame } from "remotion";
import { Illustration } from "../../../components/Illustration";
import { useNarration } from "../../../narration/NarrationContext";
import { GUESS_BEATS, HI, LO, MAX_TRIES, rangeAfter, ROUND, TARGET } from "../data";
import {
  ARROW_DOWN,
  ARROW_UP,
  Bitmap,
  CHECK,
  CROSS,
  Pips,
  Pixel,
  PixelBox,
  Screen,
  Sprite,
  VIDEO,
} from "../pixel";
import { ARCADE, blink, blinkIn, roll, SIDE, steps, typed, W } from "../theme";

// The 10x10 board of 1..100, the 100-cell range bar above it, the HUD and
// the readout. One component from "Guessing one at a time" to "Got it", so
// the board never has to be rebuilt between beats.
const CELL = 76;
const GAP = 4;
const BOARD = 10 * CELL + 9 * GAP;
const BX = (W - BOARD) / 2;
const BY = 560;

const HUD_Y = 236;
const BAR_Y = 352;
const READ_Y = 404;
const READ_H = 132;

type CellState = "lit" | "off" | "guess" | "found";

const CELL_LOOK: Record<CellState, { fill: string; hi: string; lo: string; ink: string }> = {
  lit: { fill: ARCADE.lit, hi: ARCADE.litHi, lo: ARCADE.litLo, ink: ARCADE.white },
  off: { fill: ARCADE.panel, hi: ARCADE.panel, lo: ARCADE.panel, ink: ARCADE.dim },
  guess: { fill: ARCADE.yellow, hi: ARCADE.yellowHi, lo: ARCADE.yellowLo, ink: ARCADE.screen },
  found: { fill: ARCADE.green, hi: ARCADE.greenHi, lo: ARCADE.greenLo, ink: ARCADE.screen },
};
const BAR_INK: Record<CellState, string> = {
  lit: ARCADE.lit,
  off: ARCADE.panel,
  guess: ARCADE.yellow,
  found: ARCADE.green,
};

/** Which guess (index into ROUND) switches each number off; -1 for the target. */
const KILLED_BY: number[] = Array.from({ length: HI + 1 }, (_, k) =>
  ROUND.findIndex((_, j) => {
    const r = rangeAfter(j);
    return k < r.lo || k > r.hi;
  }),
);
/** How long a "-50" popup floats, in frames. */
const POPUP = 32;
/** The elimination sweeps out from the guess over eight frames. */
const SWEEP = 8;
const delayFor = (k: number) => {
  const j = KILLED_BY[k];
  const g = ROUND[j];
  const r = rangeAfter(j);
  const far = Math.max(Math.abs(g.lo - g.guess), Math.abs(g.hi - g.guess), 1);
  const inRange = k >= g.lo && k <= g.hi && (k < r.lo || k > r.hi);
  return inRange ? Math.floor((Math.abs(k - g.guess) / (far + 1)) * SWEEP) : 0;
};

type ReadoutKind =
  | { kind: "idle" }
  | { kind: "nope" }
  | { kind: "slow" }
  | { kind: "wait" }
  | { kind: "higher"; at: number }
  | { kind: "lower"; at: number }
  | { kind: "win"; at: number }
  | { kind: "middle"; at: number };

export const Board: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const { word, beat } = useNarration();

  // ── Cues ──
  const scanFrom = word("linear", "one");
  const scanTo = word("linear", "all");
  const resetAt = beat("trick").from - 4;
  const rangeAt = word("trick", "always");
  const midAt = word("trick", "middle");
  const pickAt = beat("pick").from - 4;
  const secretAt = word("pick", String(TARGET));
  const nth = new Map<string, number>();
  const guesses = ROUND.map((g, i) => {
    const b = GUESS_BEATS[i];
    const at = word(b, String(g.guess));
    let answerAt = Infinity;
    if (g.answer !== "win") {
      const key = `${b}:${g.answer}`;
      const n = (nth.get(key) ?? 0) + 1;
      nth.set(key, n);
      answerAt = word(b, g.answer, { nth: n });
    }
    return { ...g, at, answerAt };
  });
  const firstAt = guesses[0].at;
  const modalOut = firstAt - 10;
  const winAt = word("win", "Got");

  // ── Linear scan: one cell per guess, all the way to 100 ──
  const linear = frame < resetAt;
  const scanned =
    frame < scanFrom
      ? 0
      : Math.min(HI, Math.ceil(((frame - scanFrom + 1) / Math.max(1, scanTo - scanFrom)) * HI));

  // Index of the latest guess made, -1 before the round.
  const current = guesses.reduce((v, g, i) => (frame >= g.at ? i : v), -1);

  const stateOf = (k: number): CellState => {
    if (linear) {
      // Powers on a row every two frames as the scene comes up.
      if (frame < from + 2 * Math.floor((k - 1) / 10)) return "off";
      if (k < scanned) return "off";
      if (k === scanned) return scanned === HI ? "found" : "guess";
      return "lit";
    }
    // The board relights a row per frame after the scan.
    if (frame < resetAt + Math.floor((k - 1) / 10)) return "off";
    if (current < 0) {
      return k === ROUND[0].guess && frame >= midAt && blink(frame, midAt, 8) ? "guess" : "lit";
    }
    const j = KILLED_BY[k];
    if (j >= 0 && frame >= guesses[j].answerAt + delayFor(k)) return "off";
    const g = guesses[current];
    if (k === g.guess) {
      if (g.answer === "win") return frame >= winAt ? "found" : blink(frame, g.at, 6) ? "guess" : "lit";
      return "guess";
    }
    return "lit";
  };

  // ── HUD values ──
  const tries = linear ? scanned : current + 1;
  const over = tries > MAX_TRIES;
  let left = HI - LO + 1;
  if (linear) {
    left = scanned === 0 ? 100 : HI - scanned + 1;
  } else {
    guesses.forEach((g, j) => {
      if (frame < g.answerAt) return;
      const r = rangeAfter(j);
      left = roll(frame, g.answerAt, g.left, r.hi - r.lo + 1, 8, 4);
    });
  }

  // ── Readout ──
  let guessLabel = "GUESS";
  let guessText = "";
  let answer: ReadoutKind = { kind: "idle" };
  if (linear) {
    if (scanned > 0) {
      guessText = String(scanned);
      answer = scanned === HI ? { kind: "slow" } : { kind: "nope" };
    }
  } else if (current < 0) {
    guessLabel = "RANGE";
    guessText = frame >= rangeAt ? `${LO}-${HI}` : "";
    answer = frame >= midAt ? { kind: "middle", at: midAt } : { kind: "idle" };
  } else {
    const g = guesses[current];
    guessText = String(g.guess).slice(0, typed(frame, g.at, 2, 2));
    if (g.answer === "win") answer = frame >= winAt ? { kind: "win", at: winAt } : { kind: "wait" };
    else if (frame >= g.answerAt) answer = { kind: g.answer, at: g.answerAt };
    else answer = { kind: "wait" };
  }

  const hudIn = blinkIn(frame, from, 2, 4);
  const showSecret = frame >= modalOut + 6;

  return (
    <Screen from={from} to={to}>
      {/* HUD */}
      <div style={{ opacity: hudIn ? 1 : 0 }}>
        <PixelBox style={{ top: HUD_Y, left: SIDE, width: 360, height: 100 }} border={over ? ARCADE.red : ARCADE.neon}>
          <Pixel size={24} color={ARCADE.textDim}>
            GUESSES
          </Pixel>
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 8 }}>
            <Pixel
              size={40}
              color={over ? ARCADE.red : ARCADE.yellow}
              style={{ opacity: over && tries === HI && !blink(frame, scanTo, 8) ? 0.25 : 1 }}
            >
              {`${tries}/${MAX_TRIES}`}
            </Pixel>
            {over ? null : <Pips count={MAX_TRIES} filled={tries} size={16} gap={6} on={ARCADE.yellow} off={ARCADE.dim} />}
          </div>
        </PixelBox>
        <PixelBox style={{ top: HUD_Y, left: SIDE + 380, width: 250, height: 100 }}>
          <Pixel size={24} color={ARCADE.textDim}>
            LEFT
          </Pixel>
          <Pixel size={40} color={ARCADE.white} style={{ marginTop: 10 }}>
            {left}
          </Pixel>
        </PixelBox>
        <PixelBox style={{ top: HUD_Y, left: SIDE + 650, width: 250, height: 100 }}>
          <Pixel size={24} color={ARCADE.textDim}>
            SECRET
          </Pixel>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6 }}>
            {showSecret ? (
              <>
                <Illustration video={VIDEO} id="bs-chest" style={{ width: 48, height: 47 }} />
                <Pixel size={40} color={ARCADE.yellow} style={{ opacity: blinkIn(frame, modalOut + 6, 3, 4) ? 1 : 0 }}>
                  {TARGET}
                </Pixel>
              </>
            ) : (
              <Pixel size={40} color={ARCADE.dim} style={{ marginTop: 4 }}>
                --
              </Pixel>
            )}
          </div>
        </PixelBox>
      </div>

      {/* The range bar: the same 100 numbers as one row. */}
      <div style={{ position: "absolute", top: BAR_Y, left: (W - 898) / 2, display: "flex", gap: 2 }}>
        {Array.from({ length: HI }, (_, i) => (
          <div key={i} style={{ width: 7, height: 36, background: BAR_INK[stateOf(i + 1)] }} />
        ))}
      </div>

      {/* Readout: what was guessed, and the answer. */}
      <PixelBox style={{ top: READ_Y, left: SIDE, width: 400, height: READ_H }}>
        <Pixel size={24} color={ARCADE.textDim}>
          {guessLabel}
        </Pixel>
        <Pixel size={64} color={ARCADE.yellow} style={{ marginTop: 14 }}>
          {guessText || "\u00a0"}
        </Pixel>
      </PixelBox>
      <AnswerBox answer={answer} frame={frame} />

      {/* The board. */}
      {Array.from({ length: HI }, (_, i) => {
        const k = i + 1;
        const look = CELL_LOOK[stateOf(k)];
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: BX + (i % 10) * (CELL + GAP),
              top: BY + Math.floor(i / 10) * (CELL + GAP),
              width: CELL,
              height: CELL,
              background: look.fill,
              boxShadow: `inset 5px 5px 0 ${look.hi}, inset -5px -5px 0 ${look.lo}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Pixel size={24} color={look.ink}>
              {k}
            </Pixel>
          </div>
        );
      })}

      {/* Score-style popups: "-50" rises over the dark half of the board. */}
      {guesses.map((g, j) => {
        const t = frame - (g.answerAt + 4);
        if (g.answer === "win" || t < 0 || t >= POPUP) return null;
        const gone = KILLED_BY.filter((kj, k) => k > 0 && kj === j).length;
        return (
          <div
            key={g.guess}
            style={{
              position: "absolute",
              // Always over the top half, which is dark from the first answer on.
              left: BX + BOARD / 2 - 150,
              top: BY + 2 * (CELL + GAP) - Math.floor(t / 4) * 8,
              width: 300,
              textAlign: "center",
              opacity: t > POPUP - 8 && t % 4 < 2 ? 0 : 1,
            }}
          >
            <Pixel size={64} color={ARCADE.white} drop={ARCADE.drop}>
              {`-${gone}`}
            </Pixel>
          </div>
        );
      })}

      <PickModal frame={frame} from={pickAt} secretAt={secretAt} out={modalOut} />
    </Screen>
  );
};

/** The right-hand readout: NOPE, TOO SLOW, MIDDLE, ???, HIGHER, LOWER, GOT IT. */
const AnswerBox: React.FC<{ answer: ReadoutKind; frame: number }> = ({ answer, frame }) => {
  const tone =
    answer.kind === "higher" || answer.kind === "win"
      ? ARCADE.green
      : answer.kind === "lower" || answer.kind === "nope" || answer.kind === "slow"
        ? ARCADE.red
        : answer.kind === "middle" || answer.kind === "wait"
          ? ARCADE.yellow
          : ARCADE.neon;
  const shown = "at" in answer ? blinkIn(frame, answer.at, 3, 4) : true;
  let body: React.ReactNode = null;
  if (answer.kind === "higher" || answer.kind === "lower") {
    const up = answer.kind === "higher";
    body = (
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <Bitmap
          rows={up ? ARROW_UP : ARROW_DOWN}
          px={7}
          inks={{ "#": tone, "+": up ? ARCADE.greenLo : ARCADE.redLo }}
        />
        <Pixel size={48} color={tone}>
          {up ? "HIGHER" : "LOWER"}
        </Pixel>
      </div>
    );
  } else if (answer.kind === "win") {
    body = (
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <Bitmap rows={CHECK} px={7} inks={{ "#": tone }} />
        <Pixel size={48} color={tone}>
          GOT IT
        </Pixel>
      </div>
    );
  } else if (answer.kind === "nope") {
    body = (
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <Bitmap rows={CROSS} px={6} inks={{ "#": tone }} />
        <Pixel size={48} color={tone}>
          NOPE
        </Pixel>
      </div>
    );
  } else if (answer.kind === "slow") {
    body = (
      <Pixel size={48} color={tone} style={{ opacity: blink(frame, 0, 8) ? 1 : 0.3 }}>
        TOO SLOW
      </Pixel>
    );
  } else if (answer.kind === "middle") {
    body = (
      <Pixel size={48} color={tone}>
        {`MID ${ROUND[0].guess}`}
      </Pixel>
    );
  } else if (answer.kind === "wait") {
    body = (
      <Pixel size={48} color={tone} style={{ opacity: blink(frame, 0, 10) ? 1 : 0.35 }}>
        ???
      </Pixel>
    );
  }
  return (
    <PixelBox
      style={{ top: READ_Y, left: SIDE + 420, width: 480, height: READ_H }}
      border={answer.kind === "idle" ? ARCADE.neon : tone}
    >
      <Pixel size={24} color={ARCADE.textDim}>
        {answer.kind === "middle" ? "ALWAYS GUESS" : "ANSWER"}
      </Pixel>
      <div style={{ marginTop: 14, height: 64, display: "flex", alignItems: "center", opacity: shown ? 1 : 0 }}>
        {body}
      </div>
    </PixelBox>
  );
};

/** "Say you picked 77": the board dims, the chest drops in with the secret,
 *  then shrinks into the HUD's SECRET slot in hard steps. */
const PickModal: React.FC<{ frame: number; from: number; secretAt: number; out: number }> = ({
  frame,
  from,
  secretAt,
  out,
}) => {
  if (frame < from || frame >= out + 8) return null;
  const dim = steps(frame, from, 6, 3);
  const leave = steps(frame, out, 8, 4);
  // From the modal's centre to the SECRET slot's, in four jumps.
  const dx = (SIDE + 650 + 125 - W / 2) * leave;
  const dy = (HUD_Y + 50 - 900) * leave;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: READ_Y - 8,
          width: W,
          height: BY + BOARD + 8 - (READ_Y - 8),
          background: `color-mix(in srgb, ${ARCADE.screen} ${Math.round(dim * 88 * (1 - leave))}%, transparent)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: W,
          height: 1800,
          transform: `translate(${dx}px, ${dy}px) scale(${1 - 0.9 * leave})`,
          transformOrigin: `${W / 2}px 900px`,
        }}
      >
        <div style={{ position: "absolute", top: 600, left: 0, width: W, textAlign: "center", opacity: blinkIn(frame, from, 2, 4) ? 1 : 0 }}>
          <Pixel size={40} color={ARCADE.white} drop={ARCADE.litLo}>
            SECRET NUMBER
          </Pixel>
        </div>
        <Sprite id="bs-chest" at={from + 2} width={400} height={393} hopAmp={8} hopPeriod={12} style={{ top: 690, left: (W - 400) / 2 }} />
        <PixelBox
          border={ARCADE.yellow}
          fill={ARCADE.panel}
          px={8}
          style={{ top: 1110, left: (W - 300) / 2, width: 300, height: 170, opacity: frame >= secretAt ? 1 : 0 }}
        >
          <Pixel size={96} color={ARCADE.yellow} drop={ARCADE.drop} style={{ opacity: blinkIn(frame, secretAt, 3, 4) ? 1 : 0 }}>
            {TARGET}
          </Pixel>
        </PixelBox>
      </div>
    </>
  );
};
