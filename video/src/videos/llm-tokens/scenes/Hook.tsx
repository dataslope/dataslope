import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../../components/motion";
import { Pattern } from "../../../components/Pattern";
import { Scene } from "../../../components/Scene";
import { useNarration } from "../../../narration/NarrationContext";
import { ds } from "../../../theme/brand";
import { FADE_DOWN, fringe, mix, neon, NIGHT_TOP, SIDE, TOP, W } from "../theme";
import { DISPLAY } from "../fonts";
import { AnswerPill, Clay, flicker, glitch, hash, Typed, VIDEO } from "../ui";
import { LetterRow, R_AT } from "./Letters";

const ANSWER_TOP = 1196;

/**
 * The question, typed as it is asked. The clay strawberry lands, its letters
 * light up as tiles, the three R's rise on "Three", and the AI's answer
 * glitches on "wrong".
 */
export const Hook: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { word } = useNarration();
  const how = word("hook", "How");
  const are = word("hook", "are", { edge: "end" });
  const inAt = word("hook", "in");
  const berryEnd = word("hook", "strawberry", { edge: "end" });
  const berry = word("hook", "strawberry");
  const three = word("hook", "Three");
  const ai = word("hook", "AI");
  const wrong = word("hook", "wrong");

  const litAt = R_AT.map((_, k) => three + k * 5);
  const lit = (i: number) => {
    const k = R_AT.indexOf(i);
    return k < 0 || frame < litAt[k] ? 0 : Math.min(1, pop(frame, litAt[k], fps, 10));
  };
  const count = litAt.filter((at) => frame >= at).length;

  // The AI's answer never settles: digits roll, then it breaks up on "wrong".
  const aiRolling = frame >= ai && frame < wrong;
  const aiValue = aiRolling ? String(Math.floor(hash(Math.floor(frame / 3), 11) * 10)) : "?";
  const burst = glitch(frame, wrong, 14);
  const aiJitter = frame >= wrong ? (hash(frame, 9) - 0.5) * (0.4 + burst * 2) : 0;

  const red = neon("red");
  return (
    <Scene from={from} to={to} fade={6}>
      {/* Neon tubes in the sky, faded into the night below them. */}
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
        <Pattern video={VIDEO} name="neon-band" style={{ width: W, height: 360 }} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: W,
          height: 220,
          background: `linear-gradient(180deg, ${mix(NIGHT_TOP, 60)}, transparent)`,
        }}
      />

      <div style={{ position: "absolute", left: SIDE, top: TOP + 10, filter: fringe(Math.round(burst * 5)) }}>
        <Typed
          text="How many R's are"
          from={how}
          to={are}
          size={86}
          font={DISPLAY}
          weight={700}
          color={ds("gray", 50)}
          glow={ds("blue", 400)}
          cursor={frame < inAt ? "always" : "none"}
        />
        <Typed
          text={[
            { text: "in " },
            { text: "strawberry", color: red.core, glow: red.tube },
            { text: "?" },
          ]}
          from={inAt}
          to={berryEnd}
          size={86}
          font={DISPLAY}
          weight={700}
          color={ds("gray", 50)}
          glow={ds("blue", 400)}
          cursor={frame < inAt ? "none" : "always"}
        />
      </div>

      <Clay
        id="tok-strawberry"
        at={from}
        left={(W - 400) / 2}
        top={505}
        width={400}
        height={515}
        rim="red"
        style={{ filter: `${fringe(Math.round(burst * 10))} drop-shadow(0 0 18px ${mix(ds("red", 400), 38)})` }}
      />

      <LetterRow onAt={berry + 4} lit={lit} />

      <AnswerPill
        who="You"
        value={String(count)}
        hue="green"
        on={flicker(frame, three)}
        left={SIDE + 20}
        top={ANSWER_TOP}
      />
      <AnswerPill
        who="AI"
        value={aiValue}
        hue="red"
        on={flicker(frame, ai)}
        left={W / 2 + 40}
        top={ANSWER_TOP}
        jitter={aiJitter}
      />

      {/* A hard scan tear across the frame on "wrong". */}
      {burst > 0 ? (
        <div
          style={{
            position: "absolute",
            left: (hash(frame, 3) - 0.5) * 120,
            top: 640 + hash(frame, 5) * 520,
            width: W,
            height: 30 + hash(frame, 7) * 60,
            background: mix(ds("red", 400), Math.round(30 * burst)),
            mixBlendMode: "screen",
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: mix(ds("red", 500), Math.round(8 * burst)),
          pointerEvents: "none",
          opacity: ease(frame, wrong, 2),
        }}
      />
    </Scene>
  );
};
