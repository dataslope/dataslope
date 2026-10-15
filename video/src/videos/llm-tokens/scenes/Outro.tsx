import React from "react";
import { useCurrentFrame } from "remotion";
import { Logo } from "../../../components/Logo";
import { Pattern } from "../../../components/Pattern";
import { Scene } from "../../../components/Scene";
import { useNarration } from "../../../narration/NarrationContext";
import { ds } from "../../../theme/brand";
import { CONTENT_W, FADE_DOWN, glowBox, mix, neon, SIDE, W } from "../theme";
import { Clay, flicker, Mono, NeonText, Typed, VIDEO } from "../ui";

/** End card: the clay marmot with its strawberry, the logo, and the lesson. */
export const Outro: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const { word } = useNarration();
  const learn = word("outro", "Learn");
  const tokens = word("outro", "tokens");
  const dataslopeEnd = word("outro", "Dataslope", { edge: "end" });
  const yellow = neon("yellow");

  return (
    <Scene from={from} to={to} fade={6}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: W,
          height: 360,
          opacity: 0.55 * flicker(frame, from + 2),
          WebkitMaskImage: FADE_DOWN,
          maskImage: FADE_DOWN,
        }}
      >
        <Pattern video={VIDEO} name="neon-end" style={{ width: W, height: 360 }} />
      </div>

      <Clay id="tok-marmot" at={learn} left={(W - 440) / 2} top={290} width={440} height={555} rim="yellow" seed={2} bob={8} />

      <div style={{ position: "absolute", left: 0, top: 878, width: W, display: "flex", justifyContent: "center", opacity: flicker(frame, learn + 4) }}>
        <Logo size={58} tone="light" />
      </div>

      <div style={{ position: "absolute", left: 0, top: 968, width: W, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: flicker(frame, tokens) }}>
        <Mono size={30} color={ds("purple", 300)} style={{ letterSpacing: "0.12em" }}>
          HOW LLMS WORK
        </Mono>
        <NeonText size={92} hue="blue">Tokens</NeonText>
      </div>

      <div
        style={{
          position: "absolute",
          left: SIDE,
          top: 1146,
          width: CONTENT_W,
          boxSizing: "border-box",
          padding: "22px 36px",
          borderRadius: 26,
          border: `3px solid ${yellow.tube}`,
          background: mix(ds("gray", 900), 86),
          boxShadow: glowBox(yellow.tube, 0.7),
          opacity: flicker(frame, tokens),
        }}
      >
        <Typed
          text={"dataslope.com/courses/\nhow-llms-work/tokens"}
          from={tokens}
          to={dataslopeEnd + 6}
          size={44}
          color={ds("yellow", 300)}
          glow={ds("yellow", 400)}
          style={{ minHeight: 44 * 1.2 * 2 }}
        />
      </div>
    </Scene>
  );
};
