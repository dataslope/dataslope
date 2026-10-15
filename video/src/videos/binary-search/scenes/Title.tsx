import React from "react";
import { useCurrentFrame } from "remotion";
import { useNarration } from "../../../narration/NarrationContext";
import { MarchBand, Pips, Pixel, Screen, Sprite } from "../pixel";
import { ARCADE, blink, blinkIn, SIDE, steps, W } from "../theme";

const BAR_CELLS = 100;
const BAR_CELL = 7;
const BAR_GAP = 2;
const BAR_W = BAR_CELLS * BAR_CELL + (BAR_CELLS - 1) * BAR_GAP;

/** The attract screen: "GUESS ANY NUMBER", a 100-cell range bar that fills
 *  on "1 to 100", and seven tries that light on "7 tries". */
export const Title: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const { word } = useNarration();
  // Each title word lights yellow while it is spoken, karaoke style.
  const said = [
    { text: "GUESS", at: word("hook", "guess"), end: word("hook", "guess", { edge: "end" }) },
    { text: "ANY", at: word("hook", "any"), end: word("hook", "any", { edge: "end" }) },
    { text: "NUMBER", at: word("hook", "number"), end: word("hook", "number", { edge: "end" }) },
  ];
  const rangeAt = word("hook", "1");
  const rangeEnd = word("hook", "100", { edge: "end" });
  const triesAt = word("hook", "7");

  // The bar fills ten cells at a time between "1" and the end of "100".
  const lit = Math.round(steps(frame, rangeAt, Math.max(1, rangeEnd - rangeAt), 10) * BAR_CELLS);
  const ink = (w: (typeof said)[number]) =>
    frame >= w.at && frame < w.end + 6 ? ARCADE.yellow : ARCADE.white;
  const pips = frame < triesAt ? 0 : Math.min(7, Math.floor((frame - triesAt) / 2) + 1);

  return (
    <Screen from={from} to={to} fadeIn={0}>
      <MarchBand name="title-band" top={0} height={216} tile={36} every={8} from={from} />

      {/* Arcade top line. */}
      <div
        style={{
          position: "absolute",
          top: 250,
          left: SIDE,
          width: W - SIDE * 2,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Pixel size={24} color={ARCADE.red} style={{ opacity: blink(frame, from, 20) ? 1 : 0 }}>
          1UP
        </Pixel>
        <Pixel size={24} color={ARCADE.textDim}>
          CREDIT 1
        </Pixel>
      </div>

      <div style={{ position: "absolute", top: 336, left: 0, width: W, textAlign: "center" }}>
        <Pixel size={88} color={ARCADE.white} drop={ARCADE.litLo}>
          <span style={{ color: ink(said[0]) }}>{said[0].text}</span>{" "}
          <span style={{ color: ink(said[1]) }}>{said[1].text}</span>
        </Pixel>
        <Pixel size={88} color={ink(said[2])} drop={ARCADE.litLo} style={{ marginTop: 18 }}>
          {said[2].text}
        </Pixel>
      </div>

      {/* The range bar: 100 pixel cells, 1 on the left and 100 on the right. */}
      <div style={{ position: "absolute", top: 640, left: (W - BAR_W) / 2, display: "flex", gap: BAR_GAP }}>
        {Array.from({ length: BAR_CELLS }, (_, i) => (
          <div
            key={i}
            style={{
              width: BAR_CELL,
              height: 72,
              background: i < lit ? (i % 10 === 9 ? ARCADE.litHi : ARCADE.lit) : ARCADE.panel,
            }}
          />
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          top: 732,
          left: (W - BAR_W) / 2,
          width: BAR_W,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Pixel size={32} color={ARCADE.text} style={{ opacity: lit > 0 ? 1 : 0 }}>
          1
        </Pixel>
        <Pixel size={32} color={ARCADE.text} style={{ opacity: lit >= BAR_CELLS ? 1 : 0 }}>
          100
        </Pixel>
      </div>

      <div
        style={{
          position: "absolute",
          top: 830,
          left: 0,
          width: W,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 30,
          opacity: blinkIn(frame, triesAt, 3, 4) ? 1 : 0,
        }}
      >
        <Pixel size={72} color={ARCADE.yellow} drop={ARCADE.drop}>
          IN 7 TRIES
        </Pixel>
        <Pips count={7} filled={pips} size={32} gap={16} on={ARCADE.yellow} />
      </div>

      <Sprite
        id="bs-marmot-hero"
        at={from - 8}
        width={300}
        height={345}
        hopAmp={12}
        hopPeriod={16}
        style={{ top: 1000, left: (W - 300) / 2 }}
      />
    </Screen>
  );
};
