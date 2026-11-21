import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { label, note } from "../../editorial/style";
import { Ink, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { HOOK } from "./data";
import { BAR, BLUE_INK, Dim, Drift, GOLD, Headline, INK, INK_SOFT, Kicker, lerp, Mark, Spot, Vec, X0 } from "./parts";

/** The sentence's chips, in the mono face so every width is known. */
const SIZE = 30;
const ADV = SIZE * 0.6;
const PAD = 15;
const GAP = 16;
const FIG_X = 340;

/** A token's vector: six illustrative values, fixed per token. */
const vecOf = (i: number) => Array.from({ length: 6 }, (_, k) => 0.25 + 0.75 * Math.abs(Math.sin(i * 2.3 + k * 1.7 + 0.4)));

/**
 * The opening: the sentence on screen cut into its real o200k_base tokens
 * (results.json), each token turning into a small vector, then lines from
 * one vector to every other; each stage named at the left as it is said, and
 * marked on "a choice with a cost". Then the round: nineteen numerals,
 * fourteen in the data blue and five quick ones in gray.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const lmAt = n.word("hook", "A language model");
  const seesAt = n.word("hook", "never sees your text");
  const cutAt = n.word("hook", "cut into tokens");
  const vecAt = n.word("hook", "tokens become vectors");
  const attnAt = n.word("hook", "attention lets every vector");
  const everyAt = n.word("hook", "every other");
  const choiceAt = n.word("hook", "a choice with a cost");
  const nineteenAt = n.word("plan", "Nineteen questions");
  const fourteenAt = n.word("plan", "fourteen worked through");
  const fiveAt = n.word("plan", "five quickly");
  const end = n.beat("plan").to;

  // Where each token sits: as plain text, then as chips.
  const pieces = HOOK.pieces;
  const shown = pieces.map((p) => p.trimStart());
  let textX = 0;
  let chipX = 0;
  const slots = pieces.map((p, i) => {
    const lead = p.length - shown[i].length;
    const plain = FIG_X + PAD + (textX + lead) * ADV;
    const w = shown[i].length * ADV + 2 * PAD;
    const chip = FIG_X + chipX;
    textX += p.length;
    chipX += w + GAP;
    return { plain, chip, w };
  });
  const cut = ease(frame, cutAt, 18);
  const centre = (i: number) => slots[i].chip + slots[i].w / 2;

  const rowTop = y(300);
  const base = y(470);
  const arcY = base + 18;
  const FROM = pieces.length - 2; // "text"
  const arc = (a: number, b: number) => {
    const x1 = centre(a);
    const x2 = centre(b);
    const depth = h(24) + 0.14 * Math.abs(x2 - x1);
    return `M${x1},${arcY} Q${(x1 + x2) / 2},${arcY + depth * 2} ${x2},${arcY}`;
  };
  const stages = [
    { text: "tokens", at: cutAt, top: rowTop + 6 },
    { text: "vectors", at: vecAt, top: base - h(54) },
    { text: "attention", at: attnAt, top: arcY + h(40) },
  ];
  const dim = nineteenAt - 4;

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={lmAt + 8} level={-30} />
      <Sfx name="el-tap" at={cutAt + 4} level={-30} />
      <Sfx name="el-sprinkle" at={vecAt + 2} level={-33} />
      <Sfx name="el-pencil" at={attnAt + 2} level={-36} />
      <Sfx name="el-pencil" at={choiceAt + 2} level={-37} />
      <Sfx name="el-sprinkle" at={fourteenAt} level={-33} />
      <Sfx name="el-tap" at={fiveAt + 2} level={-32} />

      <Drift from={0} to={end + 30}>
        <Kicker at={2}>Machine learning engineer interview questions · NLP and LLMs</Kicker>
        <Headline at={seesAt - 6} size={64}>
          A language model never sees your text
        </Headline>

        <Dim at={dim} to={0.4}>
          {/* The sentence, then its tokens as chips. */}
          {pieces.map((p, i) => {
            const s = slots[i];
            const appear = ease(frame, seesAt + 4, 16);
            if (appear <= 0) return null;
            const x = lerp(s.plain - PAD, s.chip, cut);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: x,
                  top: rowTop,
                  width: s.w,
                  boxSizing: "border-box",
                  padding: `${Math.round(SIZE * 0.21) - 2}px 0`,
                  border: `2px solid color-mix(in srgb, ${BAR} ${cut * 100}%, transparent)`,
                  borderRadius: 8,
                  textAlign: "center",
                  fontFamily: MONO,
                  fontSize: SIZE,
                  fontWeight: 500,
                  lineHeight: 1.15,
                  fontVariantLigatures: "none",
                  color: `color-mix(in srgb, ${BLUE_INK} ${cut * 100}%, ${INK})`,
                  whiteSpace: "pre",
                  opacity: appear,
                }}
              >
                {shown[i]}
              </div>
            );
          })}

          {/* Each token a vector. */}
          {pieces.map((_, i) => (
            <Vec key={i} x={centre(i) - 32} y={base} values={vecOf(i)} h={h(64)} bar={8} gap={3} at={vecAt + 4 + i * 2} />
          ))}

          {/* Attention: one vector to every other, then every pair, faintly. */}
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            {pieces.map((_, j) => {
              if (j === FROM) return null;
              const p = ease(frame, attnAt + 4 + Math.abs(j - FROM) * 3, 14);
              if (p <= 0) return null;
              return <path key={j} d={arc(FROM, j)} fill="none" stroke={GOLD} strokeWidth={2.6} strokeLinecap="round" pathLength={1} strokeDasharray={`${p} 1`} />;
            })}
            {pieces.flatMap((_, a) =>
              pieces.map((__, b) => {
                if (b <= a || a === FROM || b === FROM) return null;
                const p = ease(frame, everyAt + 6 + (b - a) * 2, 14);
                if (p <= 0) return null;
                return (
                  <path key={`${a}-${b}`} d={arc(a, b)} fill="none" stroke={GOLD} strokeWidth={1.3} opacity={0.45} pathLength={1} strokeDasharray={`${p} 1`} />
                );
              }),
            )}
          </svg>

          {/* Each stage named as it is said, then marked as a choice. */}
          {stages.map((s, i) => (
            <Ink key={s.text} at={s.at} dur={14} style={{ left: X0, top: s.top, whiteSpace: "nowrap" }}>
              <span style={{ ...label(26, INK_SOFT), fontWeight: 500 }}>
                <Mark at={choiceAt + i * 6}>{s.text}</Mark>
              </span>
            </Ink>
          ))}
        </Dim>

        <Spot id="dolphin" at={lmAt + 8} x={1400} y={y(300)} w={380} />

        {/* The round: nineteen questions, fourteen worked through and five quick. */}
        <Ink at={nineteenAt} dur={14} style={{ left: X0, top: y(690), whiteSpace: "nowrap" }}>
          <span style={{ ...label(26, INK), fontWeight: 500 }}>Nineteen questions</span>
        </Ink>
        {Array.from({ length: 19 }, (_, i) => {
          const at = i < 14 ? fourteenAt + i * 1.5 : fiveAt + (i - 14) * 2;
          const p = pop(frame, at, 30, 14);
          if (p <= 0.001) return null;
          const quick = i >= 14;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: X0 - 10 + i * 58 + (quick ? 34 : 0),
                top: y(744),
                width: 46,
                textAlign: "center",
                ...label(32, quick ? INK_SOFT : BLUE_INK),
                fontWeight: 500,
                opacity: Math.min(1, p),
                transform: `translateY(${(1 - Math.min(1, p)) * 12}px)`,
              }}
            >
              <Num>{i + 1}</Num>
            </div>
          );
        })}
        <Ink at={fourteenAt + 10} dur={14} style={{ left: X0, top: y(744) + 62, whiteSpace: "nowrap" }}>
          <span style={note(23, INK_SOFT)}>worked through</span>
        </Ink>
        <Ink at={fiveAt + 8} dur={14} style={{ left: X0 - 10 + 14 * 58 + 34 + 6, top: y(744) + 62, whiteSpace: "nowrap" }}>
          <span style={note(23, INK_SOFT)}>quick, at the end</span>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
