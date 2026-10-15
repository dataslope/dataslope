import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../../components/motion";
import { Scene } from "../../../components/Scene";
import { useNarration } from "../../../narration/NarrationContext";
import { ds } from "../../../theme/brand";
import { SPELLED } from "../data";
import { chipHue, CONTENT_W, SIDE, TOP, W } from "../theme";
import { AnswerPill, chipWidth, Clay, flicker, Headlines, IdTag, Mono, NeonText, Terminal, TokenChip, Typed } from "../ui";

const TERM_TOP = 470;
const TERM_H = 520;
const INNER = CONTENT_W - 6;
const SIZE = 40;
const GAP = 7;
const CHIP_W = chipWidth(" s", SIZE);
const ROW_W = SPELLED.length * CHIP_W + (SPELLED.length - 1) * GAP;
const R_IDX = SPELLED.flatMap((t, i) => (t.text === " r" ? [i] : []));

/**
 * The fair half: spelled out with spaces, the same word is ten tokens, one
 * per letter, and the three R's are three separate ids anyone can count.
 */
export const Spell: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { word } = useNarration();
  const newer = word("spell", "Newer");
  const right = word("spell", "right");
  const spell = word("spell", "Spell");
  const outEnd = word("spell", "out", { edge: "end" });
  const every = word("spell", "every");
  const own = word("spell", "own");

  const rAt = R_IDX.map((_, k) => own + k * 6);
  const count = rAt.filter((at) => frame >= at).length;

  // The hook's two answers, settled: the strawberry and a green "AI 3" hold
  // the middle of the frame, then step down out of the terminal's way.
  const m = ease(frame, spell, 16);
  const lerp = (a: number, b: number) => a + (b - a) * m;
  const berryW = lerp(320, 210);
  const pulse = rAt.reduce((v, at) => Math.max(v, frame >= at && frame < at + 8 ? Math.sin(((frame - at) / 8) * Math.PI) : 0), 0);

  return (
    <Scene from={from} to={to} fade={6}>
      <Headlines
        end={to + 1000}
        top={TOP - 6}
        items={[
          [
            newer,
            <div key="a" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <Mono size={36} color={ds("gray", 300)}>newer models</Mono>
              <NeonText size={84} hue="green">often get it right</NeonText>
            </div>,
          ],
          [
            spell,
            <div key="b" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <Mono size={36} color={ds("gray", 300)}>one letter at a time</Mono>
              <NeonText size={84} hue="yellow">spell it out</NeonText>
            </div>,
          ],
        ]}
      />

      <Terminal top={TERM_TOP} height={TERM_H} title="GPT-4o tokenizer" subtitle="10 tokens" on={flicker(frame, spell + 6)}>
        <div style={{ position: "absolute", left: 34, top: 34 }}>
          <Typed
            text={[
              { text: "> ", color: ds("yellow", 300) },
              { text: 'encode(" s t r a w b e r r y")' },
            ]}
            from={spell}
            to={outEnd}
            size={36}
            glow={ds("blue", 400)}
            cursor={frame < every ? "always" : "none"}
          />
        </div>
        <div style={{ position: "absolute", left: (INNER - ROW_W) / 2, top: 150, width: ROW_W, height: 200 }}>
          {SPELLED.map((t, i) => {
            const at = every + i * 2;
            if (frame < at) return null;
            const k = R_IDX.indexOf(i);
            const lit = k >= 0 && frame >= rAt[k] ? pop(frame, rAt[k], fps, 10) : 0;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: i * (CHIP_W + GAP),
                  top: -lit * 30,
                  width: CHIP_W,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <TokenChip text={t.text} hue={lit > 0 ? "yellow" : chipHue(i)} size={SIZE} on={flicker(frame, at)} />
                <IdTag id={t.id} at={at + 2} size={22} hue={lit > 0 ? "yellow" : chipHue(i)} />
              </div>
            );
          })}
        </div>
        {count > 0 ? (
          <Mono
            size={30}
            color={ds("yellow", 300)}
            glow={ds("yellow", 400)}
            style={{ position: "absolute", left: 0, width: INNER, textAlign: "center", top: 330 }}
          >
            {`" r" is id ${SPELLED[R_IDX[0]].id}, three times`}
          </Mono>
        ) : null}
      </Terminal>

      <Clay
        id="tok-strawberry"
        at={newer}
        left={lerp((W - 320) / 2, SIDE + 80)}
        top={lerp(560, 1030)}
        width={berryW}
        height={berryW * 1.286}
        rim="red"
        seed={17}
        bob={6}
      />
      <AnswerPill
        who="AI"
        value="3"
        hue="green"
        on={flicker(frame, right)}
        left={lerp(W / 2 - 110, 430)}
        top={lerp(1010, 1110)}
        scale={1.15 - 0.15 * m + pulse * 0.12}
      />
      {count > 0 ? (
        <NeonText size={40} hue="yellow" weight={500} style={{ position: "absolute", left: 660, top: 1140, opacity: flicker(frame, rAt[0]) }}>
          {`R tokens: ${count}`}
        </NeonText>
      ) : null}
    </Scene>
  );
};
