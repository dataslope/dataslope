import React from "react";
import { useCurrentFrame } from "remotion";
import { ds } from "../../../theme/brand";
import { MONO } from "../../../theme/fonts";
import { glowBox, glowText, mix, neon, W } from "../theme";
import { flicker, hash } from "../ui";

export const WORD = "strawberry";
export const R_AT = [2, 7, 8];

export const TILE = 80;
export const TILE_GAP = 6;
export const ROW_W = WORD.length * TILE + (WORD.length - 1) * TILE_GAP;
export const ROW_LEFT = (W - ROW_W) / 2;
/** The row the hook counts on and the next scene blurs: same place in both,
 *  so the cut between them reads as one shot. */
export const ROW_TOP = 1060;

const GLYPHS = "abcdefghijklmnopqrstuvwxyz";

/**
 * "strawberry" one letter per neon tile: what a person sees. Tiles light
 * from `onAt` (staggered), `lit(i)` turns a tile yellow and lifts it, and
 * `blur` / `scrambleAt` take the letters away again.
 */
export const LetterRow: React.FC<{
  onAt: number;
  lit?: (i: number) => number;
  blur?: number;
  scrambleAt?: number;
  strike?: number;
  dim?: number;
}> = ({ onAt, lit = () => 0, blur = 0, scrambleAt, strike = 0, dim = 0 }) => {
  const frame = useCurrentFrame();
  const blue = neon("blue");
  const yellow = neon("yellow");
  return (
    <div
      style={{
        position: "absolute",
        left: ROW_LEFT,
        top: ROW_TOP,
        width: ROW_W,
        height: TILE * 1.3,
        opacity: 1 - dim,
      }}
    >
      {[...WORD].map((ch, i) => {
        const on = flicker(frame, onAt + i * 2);
        const l = lit(i);
        const scrambling = scrambleAt !== undefined && frame >= scrambleAt;
        const shown = scrambling
          ? GLYPHS[Math.floor(hash(Math.floor(frame / 2), i) * GLYPHS.length)]
          : ch;
        const tube = l > 0 ? yellow.tube : blue.tube;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: i * (TILE + TILE_GAP),
              top: -l * 26,
              width: TILE,
              height: TILE * 1.3,
              boxSizing: "border-box",
              borderRadius: 16,
              border: `3px solid ${mix(tube, 40 + 60 * l)}`,
              background: l > 0 ? mix(ds("yellow", 600), 22 * l) : mix(ds("blue", 600), 10),
              boxShadow: l > 0 ? glowBox(yellow.tube, 0.5 + 0.5 * l) : undefined,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: 66,
              color: l > 0 ? yellow.core : blue.core,
              textShadow: glowText(tube, 0.55),
              opacity: on,
              filter: blur > 0 ? `blur(${blur}px)` : undefined,
            }}
          >
            {shown}
          </div>
        );
      })}
      {strike > 0 ? (
        <div
          style={{
            position: "absolute",
            left: -20,
            top: TILE * 0.62,
            width: (ROW_W + 40) * strike,
            height: 9,
            borderRadius: 5,
            background: ds("red", 300),
            boxShadow: glowBox(ds("red", 400), 0.8),
            transform: "rotate(-4deg)",
            transformOrigin: "0 50%",
          }}
        />
      ) : null}
    </div>
  );
};
