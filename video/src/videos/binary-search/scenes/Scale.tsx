import React from "react";
import { useCurrentFrame } from "remotion";
import { useNarration } from "../../../narration/NarrationContext";
import { SCALE_ROWS } from "../data";
import { Pips, Pixel, PixelBox, Screen } from "../pixel";
import { ARCADE, blink, blinkIn, SIDE, typed, W } from "../theme";

const ROW_Y = [470, 730, 990];
const ROW_H = 220;
const PIP = 20;
const PIP_GAP = 8;

/** The high-score table: the numbers grow by a factor of ten million, the
 *  tries from 7 to 30. */
export const Scale: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const { word } = useNarration();
  // When each row's label starts typing, and when its tries land.
  const cues = [
    { label: from + 4, tries: from + 10 },
    { label: word("scale", "million"), tries: word("scale", "20") },
    { label: word("scale", "billion"), tries: word("scale", "30") },
  ];

  return (
    <Screen from={from} to={to}>
      <div style={{ position: "absolute", top: 270, left: 0, width: W, textAlign: "center", opacity: blinkIn(frame, from, 2, 4) ? 1 : 0 }}>
        <Pixel size={56} color={ARCADE.yellow} drop={ARCADE.drop}>
          TRIES NEEDED
        </Pixel>
      </div>
      <div
        style={{
          position: "absolute",
          top: 404,
          left: SIDE + 30,
          width: W - SIDE * 2 - 60,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Pixel size={24} color={ARCADE.textDim}>
          NUMBERS
        </Pixel>
        <Pixel size={24} color={ARCADE.textDim}>
          TRIES
        </Pixel>
      </div>

      {SCALE_ROWS.map((row, i) => {
        const c = cues[i];
        if (frame < c.label) return null;
        const chars = typed(frame, c.label, row.label.length, 1);
        const typing = chars < row.label.length;
        const landed = frame >= c.tries;
        const pips = landed ? Math.min(row.tries, frame - c.tries + 1) : 0;
        const fresh = i > 0 && landed && frame < c.tries + 24;
        const latest = i === cues.filter((q) => frame >= q.label).length - 1;
        return (
          <PixelBox
            key={row.n}
            border={fresh && blink(frame, c.tries, 6) ? ARCADE.yellow : ARCADE.neon}
            style={{ top: ROW_Y[i], left: SIDE, width: W - SIDE * 2, height: ROW_H }}
          >
            <div style={{ width: "100%", padding: "0 28px", boxSizing: "border-box" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Pixel size={48} color={ARCADE.white}>
                  {row.label.slice(0, chars)}
                  <span style={{ color: ARCADE.yellow, opacity: latest && (typing || blink(frame, c.label, 12)) ? 1 : 0 }}>_</span>
                </Pixel>
                <Pixel
                  size={72}
                  color={ARCADE.yellow}
                  drop={ARCADE.drop}
                  style={{ opacity: landed && blinkIn(frame, c.tries, 3, 4) ? 1 : 0 }}
                >
                  {row.tries}
                </Pixel>
              </div>
              <div style={{ marginTop: 34 }}>
                <Pips count={row.tries} filled={pips} size={PIP} gap={PIP_GAP} on={ARCADE.yellow} off={ARCADE.panel} />
              </div>
            </div>
          </PixelBox>
        );
      })}
    </Screen>
  );
};
