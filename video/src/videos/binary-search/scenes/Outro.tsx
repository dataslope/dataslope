import React from "react";
import { useCurrentFrame } from "remotion";
import { Logo } from "../../../components/Logo";
import { useNarration } from "../../../narration/NarrationContext";
import { Pixel, PixelBox, Screen, Sprite, Term } from "../pixel";
import { ARCADE, blink, blinkIn, SIDE, W } from "../theme";

/** NEXT LEVEL: the logo, the hero marmot, and the lesson that goes deeper. */
export const Outro: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const { word } = useNarration();
  const learnAt = word("outro", "Learn");
  const searchAt = word("outro", "search");
  const siteAt = word("outro", "Dataslope");

  return (
    <Screen from={from} to={to}>
      <div style={{ position: "absolute", top: 262, left: 0, width: W, display: "flex", justifyContent: "center", opacity: blinkIn(frame, from, 2, 4) ? 1 : 0 }}>
        <Logo size={64} tone="light" />
      </div>

      <Sprite id="bs-marmot-hero" at={from + 2} width={300} height={345} hopAmp={12} hopPeriod={16} style={{ top: 390, left: (W - 300) / 2 }} />

      <div style={{ position: "absolute", top: 786, left: 0, width: W, textAlign: "center", opacity: blink(frame, learnAt, 16) ? 1 : 0 }}>
        <Pixel size={32} color={ARCADE.yellow}>
          NEXT LEVEL
        </Pixel>
      </div>

      <PixelBox
        border={frame >= siteAt && blink(frame, siteAt, 8) && frame < siteAt + 24 ? ARCADE.yellow : ARCADE.neon}
        px={8}
        style={{ top: 850, left: SIDE, width: W - SIDE * 2, height: 470, opacity: blinkIn(frame, learnAt, 3, 4) ? 1 : 0 }}
      >
        <Term size={54} color={ARCADE.textDim}>
          Mastering Data Structures
        </Term>
        <Term size={54} color={ARCADE.textDim} style={{ marginTop: 4 }}>
          and Algorithms in C++
        </Term>
        <Pixel size={56} color={ARCADE.yellow} drop={ARCADE.drop} style={{ marginTop: 22, opacity: frame >= searchAt ? 1 : 0 }}>
          SEARCHING
        </Pixel>
        <div
          style={{
            marginTop: 24,
            padding: "6px 20px 12px",
            background: frame >= siteAt ? ARCADE.screen : "transparent",
            textAlign: "center",
          }}
        >
          <Term size={64} color={frame >= siteAt ? ARCADE.yellowHi : ARCADE.text}>
            dataslope.com/courses/
          </Term>
          <Term size={64} color={frame >= siteAt ? ARCADE.yellowHi : ARCADE.text}>
            mastering-dsa-cpp/searching
          </Term>
        </div>
      </PixelBox>

      <div style={{ position: "absolute", top: 1352, left: 0, width: W, textAlign: "center", opacity: frame >= siteAt && blink(frame, siteAt, 20) ? 1 : 0 }}>
        <Pixel size={32} color={ARCADE.white}>
          PRESS START
        </Pixel>
      </div>
    </Screen>
  );
};
