import React from "react";
import { useCurrentFrame } from "remotion";
import { useNarration } from "../../../narration/NarrationContext";
import { HI, MAX_TRIES, POWERS } from "../data";
import { Bitmap, CHECK, Pixel, Screen } from "../pixel";
import { ARCADE, blink, blinkIn, steps, typed, W } from "../theme";

const BASE = 1300;
const UNIT = 4.5;
const BAR_W = 88;
const BAR_GAP = 30;
const X0 = (W - (POWERS.length * BAR_W + (POWERS.length - 1) * BAR_GAP)) / 2;
const LINE_Y = BASE - HI * UNIT;

/** 2, 4, 8 … 128: seven doublings, and the first one to clear 100. */
export const Why: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const { word } = useNarration();
  const whyAt = word("why", "Why");
  const twoAt = word("why", "Two");
  const seventhEnd = word("why", "seventh", { edge: "end" });
  const valueAt = word("why", "128");
  const coversAt = word("why", "covers");
  const per = Math.max(3, (seventhEnd - twoAt) / POWERS.length);
  const value = String(2 ** MAX_TRIES);

  return (
    <Screen from={from} to={to}>
      <div style={{ position: "absolute", top: 270, left: 0, width: W, textAlign: "center", opacity: blinkIn(frame, whyAt, 3, 4) ? 1 : 0 }}>
        <Pixel size={88} color={ARCADE.yellow} drop={ARCADE.drop}>
          {`WHY ${MAX_TRIES}?`}
        </Pixel>
      </div>

      {/* 2 to the 7th = 128 */}
      <div
        style={{
          position: "absolute",
          top: 430,
          left: 0,
          width: W,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          opacity: frame >= twoAt ? 1 : 0,
        }}
      >
        <Pixel size={80} color={ARCADE.white}>
          2
        </Pixel>
        <Pixel size={40} color={ARCADE.white} style={{ marginTop: -8 }}>
          {MAX_TRIES}
        </Pixel>
        <Pixel size={80} color={ARCADE.white} style={{ marginLeft: 40 }}>
          =
        </Pixel>
        <Pixel size={80} color={frame >= coversAt ? ARCADE.green : ARCADE.yellow} style={{ marginLeft: 40, minWidth: 240 }}>
          {value.slice(0, typed(frame, valueAt, value.length, 2))}
        </Pixel>
      </div>

      {/* The doubling bars. */}
      {POWERS.map((p, i) => {
        const at = twoAt + Math.round(i * per);
        const grow = steps(frame, at, 4, 3);
        if (grow === 0) return null;
        const last = i === POWERS.length - 1;
        const clears = p > HI;
        const judged = frame >= coversAt;
        const fill = judged ? (clears ? ARCADE.green : ARCADE.dim) : last && frame >= valueAt ? ARCADE.yellow : ARCADE.lit;
        const hi = judged ? (clears ? ARCADE.greenHi : ARCADE.dim) : last && frame >= valueAt ? ARCADE.yellowHi : ARCADE.litHi;
        const lo = judged ? (clears ? ARCADE.greenLo : ARCADE.panel) : last && frame >= valueAt ? ARCADE.yellowLo : ARCADE.litLo;
        const h = Math.max(8, Math.round((p * UNIT * grow) / 8) * 8);
        const x = X0 + i * (BAR_W + BAR_GAP);
        return (
          <React.Fragment key={p}>
            <div
              style={{
                position: "absolute",
                left: x,
                top: BASE - h,
                width: BAR_W,
                height: h,
                background: fill,
                boxShadow: `inset 6px 6px 0 ${hi}, inset -6px -6px 0 ${lo}`,
              }}
            />
            <div style={{ position: "absolute", left: x, top: BASE - h - 44, width: BAR_W, textAlign: "center", opacity: grow === 1 ? 1 : 0 }}>
              <Pixel size={24} color={judged && !clears ? ARCADE.textDim : ARCADE.white}>
                {p}
              </Pixel>
            </div>
            <div
              style={{
                position: "absolute",
                left: x,
                top: BASE + 18,
                width: BAR_W,
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-start",
              }}
            >
              <Pixel size={24} color={ARCADE.textDim}>
                2
              </Pixel>
              <Pixel size={16} color={ARCADE.textDim} style={{ marginTop: -6 }}>
                {i + 1}
              </Pixel>
            </div>
            {last && judged ? (
              <Bitmap
                rows={CHECK}
                px={8}
                inks={{ "#": ARCADE.green }}
                style={{ position: "absolute", left: x + (BAR_W - 72) / 2, top: BASE - h - 120, opacity: blinkIn(frame, coversAt, 3, 4) ? 1 : 0 }}
              />
            ) : null}
          </React.Fragment>
        );
      })}

      {/* The 100 line, drawn in blocks. */}
      {frame >= coversAt ? (
        <div style={{ opacity: blinkIn(frame, coversAt, 3, 4) ? 1 : 0 }}>
          <div style={{ position: "absolute", left: X0 - 20, top: LINE_Y - 4, display: "flex", gap: 12 }}>
            {Array.from({ length: 34 }, (_, i) => (
              <div key={i} style={{ width: 12, height: 8, background: ARCADE.yellow }} />
            ))}
          </div>
          <div style={{ position: "absolute", left: X0 - 20, top: LINE_Y - 48 }}>
            <Pixel size={24} color={ARCADE.yellow} style={{ opacity: blink(frame, coversAt, 12) || frame > coversAt + 24 ? 1 : 0 }}>
              {HI}
            </Pixel>
          </div>
        </div>
      ) : null}
    </Screen>
  );
};
