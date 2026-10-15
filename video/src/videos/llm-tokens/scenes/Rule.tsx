import React from "react";
import { useCurrentFrame } from "remotion";
import { ease } from "../../../components/motion";
import { Scene } from "../../../components/Scene";
import { useNarration } from "../../../narration/NarrationContext";
import { ds } from "../../../theme/brand";
import { MONO } from "../../../theme/fonts";
import { THE } from "../data";
import { glowBox, glowText, mix, neon, TOP, W } from "../theme";
import { chipWidth, flicker, Headlines, Mono, NeonText, TokenChip } from "../ui";

const CHIP = 96;
const CELL = 92;
const CELL_GAP = 14;
const BAR_W = 760;
const BAR_H = 92;

/**
 * The lesson's rule of thumb, drawn: " the" is one token and four
 * characters, and one token covers about three quarters of a word.
 */
export const Rule: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const { word } = useNarration();
  const forAt = word("rule", "For");
  const oneToken = word("rule", "one token");
  const four = word("rule", "four");
  const charsEnd = word("rule", "characters", { edge: "end" });
  const three = word("rule", "three");
  const wordEnd = word("rule", "word", { edge: "end" });

  const chipW = chipWidth(THE.text, CHIP);
  const cellsW = 4 * CELL + 3 * CELL_GAP;
  const fill = ease(frame, three, 16) * 0.75;
  const blue = neon("blue");
  const purple = neon("purple");

  return (
    <Scene from={from} to={to} fade={6}>
      <Headlines
        end={to + 1000}
        top={TOP - 6}
        items={[
          [
            forAt,
            <div key="a" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <Mono size={36} color={ds("gray", 300)}>English prose</Mono>
              <NeonText size={88} hue="blue">Rule of thumb</NeonText>
            </div>,
          ],
        ]}
      />

      {frame >= oneToken ? (
        <>
          <Mono
            size={30}
            color={ds("gray", 400)}
            style={{ position: "absolute", left: 0, width: W, textAlign: "center", top: 450, opacity: flicker(frame, oneToken) }}
          >
            {`1 token, id ${THE.id}`}
          </Mono>
          <div style={{ position: "absolute", left: (W - chipW) / 2, top: 494 }}>
            <TokenChip text={THE.text} hue="blue" size={CHIP} on={flicker(frame, oneToken)} spaceLit={ease(frame, four, 6) * 0.3} />
          </div>
        </>
      ) : null}

      {/* Its four characters, counted. The space is one of them. */}
      <div style={{ position: "absolute", left: (W - cellsW) / 2, top: 706, width: cellsW, height: CELL }}>
        {[..."·the"].map((ch, i) => {
          const at = four + i * 4;
          if (frame < at) return null;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: i * (CELL + CELL_GAP),
                width: CELL,
                height: CELL,
                boxSizing: "border-box",
                borderRadius: 14,
                border: `3px solid ${ds("yellow", 400)}`,
                background: mix(ds("yellow", 600), 16),
                boxShadow: glowBox(ds("yellow", 400), 0.6),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: MONO,
                fontWeight: 700,
                fontSize: 54,
                color: ds("yellow", 300),
                textShadow: glowText(ds("yellow", 400), 0.5),
                opacity: flicker(frame, at),
              }}
            >
              {ch}
              <span style={{ position: "absolute", top: -36, fontSize: 26, color: ds("gray", 400), textShadow: "none" }}>
                {String(i + 1)}
              </span>
            </div>
          );
        })}
      </div>
      {frame >= charsEnd - 6 ? (
        <NeonText size={60} hue="yellow" style={{ position: "absolute", left: 0, width: W, textAlign: "center", top: 824, opacity: flicker(frame, charsEnd - 6) }}>
          about 4 characters
        </NeonText>
      ) : null}

      {/* One word, three quarters of it covered by one token. */}
      {frame >= three ? (
        <div style={{ position: "absolute", left: (W - BAR_W) / 2, top: 960, width: BAR_W, height: BAR_H, opacity: flicker(frame, three) }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              boxSizing: "border-box",
              borderRadius: BAR_H / 2,
              border: `3px dashed ${mix(purple.tube, 70)}`,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              height: BAR_H,
              width: BAR_W * fill,
              boxSizing: "border-box",
              borderRadius: BAR_H / 2,
              border: `5px solid ${blue.tube}`,
              background: blue.fill,
              boxShadow: glowBox(blue.tube, 0.8),
              display: "flex",
              alignItems: "center",
              paddingLeft: 30,
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: 36,
              color: blue.core,
              textShadow: glowText(blue.tube, 0.5),
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            1 token
          </div>
          <div
            style={{
              position: "absolute",
              right: 34,
              top: 0,
              height: BAR_H,
              display: "flex",
              alignItems: "center",
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: 32,
              color: purple.core,
              textShadow: glowText(purple.tube, 0.4),
            }}
          >
            1 word
          </div>
        </div>
      ) : null}
      {frame >= three + 8 ? (
        <NeonText size={60} hue="purple" style={{ position: "absolute", left: 0, width: W, textAlign: "center", top: 1074, opacity: flicker(frame, three + 8) }}>
          about 0.75 of a word
        </NeonText>
      ) : null}

      {frame >= wordEnd - 8 ? (
        <Mono
          size={40}
          color={ds("gray", 100)}
          glow={ds("blue", 400)}
          style={{ position: "absolute", left: 0, width: W, textAlign: "center", top: 1200, opacity: flicker(frame, wordEnd - 8) }}
        >
          1,000 tokens = about 750 words
        </Mono>
      ) : null}
    </Scene>
  );
};
