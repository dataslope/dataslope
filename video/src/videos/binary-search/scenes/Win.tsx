import React from "react";
import { useCurrentFrame } from "remotion";
import { useNarration } from "../../../narration/NarrationContext";
import { MAX_TRIES, ROUND, TARGET } from "../data";
import { Bitmap, MarchBand, Pips, Pixel, PixelBox, Screen, SPARKLE, Sprite } from "../pixel";
import { ARCADE, blink, blinkIn, W } from "../theme";

/** Sparkles around the trophy: position, size and blink phase. */
const SPARKS = [
  { x: 170, y: 600, px: 10, phase: 0, ink: ARCADE.yellow },
  { x: 850, y: 640, px: 8, phase: 3, ink: ARCADE.white },
  { x: 230, y: 900, px: 7, phase: 5, ink: ARCADE.white },
  { x: 800, y: 930, px: 11, phase: 2, ink: ARCADE.yellow },
  { x: 120, y: 760, px: 6, phase: 6, ink: ARCADE.green },
  { x: 900, y: 800, px: 6, phase: 1, ink: ARCADE.green },
];

/** GOT IT: the trophy, the number, and seven of seven tries used. */
export const Win: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const { word } = useNarration();
  const tryAt = word("win", "try");
  const tries = ROUND.length;

  return (
    <Screen from={from} to={to} fade={4} fadeIn={2}>
      <MarchBand name="win-band" top={236} height={108} tile={36} dir={1} from={from} />
      <MarchBand name="win-band" top={1250} height={108} tile={36} dir={-1} from={from} />

      <div style={{ position: "absolute", top: 384, left: 0, width: W, textAlign: "center", opacity: blinkIn(frame, from, 3, 4) ? 1 : 0 }}>
        <Pixel size={104} color={ARCADE.yellow} drop={ARCADE.drop}>
          GOT IT!
        </Pixel>
      </div>

      {SPARKS.map((s, i) =>
        blink(frame, from + s.phase, 8) ? (
          <Bitmap
            key={i}
            rows={SPARKLE}
            px={s.px}
            inks={{ "#": s.ink }}
            style={{ position: "absolute", left: s.x, top: s.y }}
          />
        ) : null,
      )}

      <Sprite id="bs-trophy" at={from} width={440} height={413} hopAmp={10} hopPeriod={10} style={{ top: 560, left: (W - 440) / 2 }} />

      <div
        style={{
          position: "absolute",
          top: 1030,
          left: 0,
          width: W,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 36,
        }}
      >
        <PixelBox
          border={ARCADE.green}
          fill={ARCADE.panel}
          px={8}
          style={{ position: "relative", width: 220, height: 150 }}
        >
          <Pixel size={80} color={ARCADE.green}>
            {TARGET}
          </Pixel>
        </PixelBox>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, opacity: blinkIn(frame, tryAt, 3, 4) ? 1 : 0 }}>
          <Pixel size={40} color={ARCADE.white}>
            {`TRY ${tries}/${MAX_TRIES}`}
          </Pixel>
          <Pips count={MAX_TRIES} filled={tries} size={30} gap={10} on={ARCADE.yellow} />
        </div>
      </div>
    </Screen>
  );
};
