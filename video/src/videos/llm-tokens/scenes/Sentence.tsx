import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../../components/motion";
import { Scene } from "../../../components/Scene";
import { useNarration } from "../../../narration/NarrationContext";
import { ds } from "../../../theme/brand";
import { QUESTION, STRAWBERRY_IN_QUESTION } from "../data";
import { chipHue, CONTENT_W, fringe } from "../theme";
import { chipWidth, flicker, glitch, IdTag, Mono, NeonText, Terminal, TokenChip, Typed } from "../ui";

const TERM_TOP = 270;
const TERM_H = 1040;
/** Short while the question is read, grown on "whole" for the one token. */
const TERM_H0 = 720;
const INNER = CONTENT_W - 6;
const SIZE = 56;
const GAP = 16;
const ROWS: number[][] = [
  [0, 1, 2, 3, 4],
  [5, 6, 7],
];
const ROW_TOP = [124, 324];
const BIG = 84;

/** Every chip's position, laid out row by row and centred. */
const layout = ROWS.flatMap((row, r) => {
  const ws = row.map((i) => chipWidth(QUESTION[i].text, SIZE));
  const total = ws.reduce((a, b) => a + b, 0) + GAP * (row.length - 1);
  let x = (INNER - total) / 2;
  return row.map((i, k) => {
    const pos = { i, left: x, top: ROW_TOP[r], width: ws[k] };
    x += ws[k] + GAP;
    return pos;
  });
}).sort((a, b) => a.i - b.i);

/**
 * The hook's own question through the same tokenizer: eight tokens, and
 * " strawberry", leading space and all, is one of them, a single id.
 */
export const Sentence: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { word } = useNarration();
  const inside = word("sentence", "Inside");
  const questionEnd = word("sentence", "question", { edge: "end" });
  const leading = word("sentence", "leading");
  const whole = word("sentence", "whole");
  const one = word("sentence", "one");

  const chipsAt = questionEnd - 4;
  const spaceLit = ease(frame, leading, 8);
  const focus = ease(frame, whole, 10);
  const big = frame < whole ? 0 : pop(frame, whole, fps, 12);
  const g = glitch(frame, whole, 9);
  const termH = TERM_H0 + (TERM_H - TERM_H0) * ease(frame, whole - 4, 14);
  const target = layout[STRAWBERRY_IN_QUESTION];
  const bigW = chipWidth(QUESTION[STRAWBERRY_IN_QUESTION].text, BIG);

  return (
    <Scene from={from} to={to} fade={6}>
      <Terminal top={TERM_TOP} height={termH} title="GPT-4o tokenizer" subtitle="8 tokens" on={flicker(frame, from)}>
        <div style={{ position: "absolute", left: 34, top: 36 }}>
          <Typed
            text={[
              { text: "> ", color: ds("yellow", 300) },
              { text: 'encode("How many r\'s are in strawberry?")' },
            ]}
            from={inside}
            to={questionEnd}
            size={31}
            glow={ds("blue", 400)}
            cursor={frame < chipsAt ? "always" : "none"}
          />
        </div>

        {layout.map((p) => {
          const t = QUESTION[p.i];
          const at = chipsAt + p.i * 3;
          if (frame < at) return null;
          const isBerry = p.i === STRAWBERRY_IN_QUESTION;
          return (
            <div key={p.i} style={{ position: "absolute", left: p.left, top: p.top, width: p.width }}>
              <TokenChip
                text={t.text}
                hue={isBerry && frame >= leading ? "yellow" : chipHue(p.i)}
                size={SIZE}
                on={flicker(frame, at)}
                dim={isBerry ? 0 : focus * 0.8}
                spaceLit={isBerry ? spaceLit : 0}
              />
              <IdTag
                id={t.id}
                at={at + 3}
                size={30}
                hue={isBerry ? "yellow" : chipHue(p.i)}
                style={{ marginTop: 12, textAlign: "center", opacity: isBerry ? 1 : 1 - focus * 0.6 }}
              />
            </div>
          );
        })}

        {/* Where the leading space lives: inside the token, as its first character. */}
        {frame >= leading ? (
          <Mono
            size={30}
            color={ds("yellow", 300)}
            glow={ds("yellow", 400)}
            style={{
              position: "absolute",
              left: target.left - 6,
              top: target.top + SIZE * 1.5 + 54,
              opacity: flicker(frame, leading) * (1 - focus),
            }}
          >
            {"^ leading space"}
          </Mono>
        ) : null}

        {/* The one token, pulled out and enlarged, with its id. */}
        {big > 0 ? (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 530,
              width: INNER,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 26,
              transform: `scale(${0.6 + 0.4 * big})`,
              opacity: Math.min(1, big * 1.5),
              filter: fringe(Math.round(g * 8)),
            }}
          >
            <TokenChip text={QUESTION[STRAWBERRY_IN_QUESTION].text} hue="yellow" size={BIG} spaceLit={0.4} style={{ width: bigW }} />
            <IdTag id={QUESTION[STRAWBERRY_IN_QUESTION].id} at={whole + 2} size={110} />
            {frame >= one ? (
              <NeonText size={64} hue="green" style={{ opacity: flicker(frame, one) }}>
                = 1 token
              </NeonText>
            ) : null}
          </div>
        ) : null}
      </Terminal>
    </Scene>
  );
};
