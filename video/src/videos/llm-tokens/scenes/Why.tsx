import React from "react";
import { useCurrentFrame } from "remotion";
import { Scene } from "../../../components/Scene";
import { useNarration } from "../../../narration/NarrationContext";
import { ds } from "../../../theme/brand";
import { MONO } from "../../../theme/fonts";
import { QUESTION, STRAWBERRY_IN_QUESTION } from "../data";
import { glowBox, glowText, mix, neon, W } from "../theme";
import { Clay, flicker, hash, Headlines, IdTag, Mono, NeonText } from "../ui";
import { R_AT, WORD } from "./Letters";

const SLOT = 78;
const SLOT_GAP = 8;
const SLOTS_W = WORD.length * SLOT + (WORD.length - 1) * SLOT_GAP;
const SLOTS_TOP = 700;
const GLYPHS = "abcdefghijklmnopqrstuvwxyz";

/**
 * All the model holds is the id. To count the R's it has to rebuild the
 * spelling from memory, letter by uncertain letter, while the robot's lens
 * finds nothing on the token itself to look at.
 */
export const Why: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const { word } = useNarration();
  const so = word("why", "So");
  const recall = word("why", "recall");
  const spelledEnd = word("why", "spelled", { edge: "end" });
  const instead = word("why", "instead");
  const looking = word("why", "looking");

  const token = QUESTION[STRAWBERRY_IN_QUESTION];
  const yellow = neon("yellow");
  const purple = neon("purple");
  const step = (spelledEnd - recall) / WORD.length;

  return (
    <Scene from={from} to={to} fade={6}>
      <Headlines
        end={to + 1000}
        items={[
          [so, <NeonText key="a" size={84} hue="blue">Count the R&apos;s?</NeonText>],
          [recall, <NeonText key="b" size={84} hue="purple">Recall the spelling</NeonText>],
          [instead, <NeonText key="c" size={84} hue="red">Nothing to look at</NeonText>],
        ]}
      />

      <Mono size={30} color={ds("gray", 400)} style={{ position: "absolute", left: 0, width: W, textAlign: "center", top: 420 }}>
        what the model holds
      </Mono>
      <div
        style={{
          position: "absolute",
          left: (W - 460) / 2,
          top: 470,
          width: 460,
          height: 150,
          boxSizing: "border-box",
          borderRadius: 75,
          border: `6px solid ${yellow.tube}`,
          background: yellow.fill,
          boxShadow: glowBox(yellow.tube, 1),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: flicker(frame, from),
        }}
      >
        <IdTag id={token.id} at={from} size={100} />
      </div>

      {/* The spelling, rebuilt from memory: each letter wavers before it settles. */}
      <div style={{ position: "absolute", left: (W - SLOTS_W) / 2, top: SLOTS_TOP, width: SLOTS_W, height: SLOT * 1.3 }}>
        {[...WORD].map((ch, i) => {
          const at = Math.round(recall + i * step);
          const settled = frame >= at + 6;
          const shown =
            frame < at ? "?" : settled ? ch : GLYPHS[Math.floor(hash(frame, i + 30) * GLYPHS.length)];
          const isR = R_AT.includes(i) && frame >= spelledEnd + 4;
          // Recalled, not read: the letters drift a little and never sit still.
          const wobble = frame >= at ? Math.sin((frame + i * 9) / 5) * (frame >= looking ? 5 : 2) : 0;
          const tube = frame < at ? ds("gray", 600) : isR ? yellow.tube : purple.tube;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: i * (SLOT + SLOT_GAP),
                top: wobble,
                width: SLOT,
                height: SLOT * 1.3,
                boxSizing: "border-box",
                borderRadius: 16,
                border: `3px ${frame < at ? "dashed" : "solid"} ${mix(tube, 80)}`,
                background: frame < at ? "transparent" : mix(isR ? ds("yellow", 600) : ds("purple", 600), 16),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: MONO,
                fontWeight: 700,
                fontSize: 60,
                color: frame < at ? ds("gray", 500) : isR ? yellow.core : purple.core,
                textShadow: frame < at ? undefined : glowText(tube, 0.5),
                opacity: frame < at ? 0.7 : 0.75 + 0.25 * hash(Math.floor(frame / 4), i),
              }}
            >
              {shown}
            </div>
          );
        })}
      </div>
      <Mono
        size={30}
        color={purple.core}
        glow={purple.tube}
        style={{
          position: "absolute",
          left: 0,
          width: W,
          textAlign: "center",
          top: SLOTS_TOP + SLOT * 1.3 + 22,
          opacity: flicker(frame, recall),
        }}
      >
        from memory, not from the input
      </Mono>

      <Clay id="tok-robot" at={so} left={(W - 380) / 2} top={900} width={380} height={423} seed={23} bob={8} />
    </Scene>
  );
};
