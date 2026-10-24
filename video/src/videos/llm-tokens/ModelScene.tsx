import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, INK, INK_SOFT, label, note, PAPER, TABULAR } from "../../editorial/style";
import { FigLabel, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { DIST, num, SHOWN_SUM, VOCAB } from "./data";
import { Arrow, ChipFace, Drift, FIG_Y, FOCUS_INK, Headline, Kicker, Mark, pulse, Spot, TOKEN, X0 } from "./parts";

/** The model, a plain box between what it reads and what it returns. */
const BOX = { x: 330, y: 470, w: 300, h: 150 };
/** The context it reads: one token, the lesson's toy loop's first. */
const CTX = { x: X0, y: 520 };
/** The next-token table: one row per token, bars to scale. */
const BARS = { x: 760, chipW: 150, barX: 940, y0: 400, step: 76, perUnit: 1250 };

/**
 * Part 1 opens: one step of a language model. It reads a context (the
 * lesson's toy loop starts from "the") and returns a probability for every
 * token: the lesson's illustrative table, and the 199,996 others that share
 * what is left. Picking one is a separate step, which the die stands for.
 */
export const ModelScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const hookFrom = n.beat("hook").from;
  const modelAt = n.word("hook", "language model");
  const takesAt = n.word("hook", "takes");
  const probAt = n.word("hook", "probability");
  const nextAt = n.word("hook", "next");
  const notOneAt = n.word("vocab", "Not one word");
  const everyAt = n.word("vocab", "every token");
  const thousandAt = n.word("vocab", "two hundred thousand");
  const pickingAt = n.word("pick", "Picking");
  const separateAt = n.word("pick", "separate");
  const knobAt = n.word("pick", "knob");
  const end = n.beat("loop").from;

  const rowY = (i: number) => y(BARS.y0) + i * h(BARS.step);
  const barAt = (i: number) => probAt + 4 + i * 5;
  const rest = Math.round((1 - SHOWN_SUM) * 100) / 100;
  const boxIn = ease(frame, hookFrom + 2, 14);
  const think = pulse(frame, takesAt + 8, 22) + pulse(frame, probAt - 6, 18);

  return (
    <AbsoluteFill>
      {/* ── Sound: the box, the bars landing, the rest of the vocabulary, the die ── */}
      <Sfx name="el-pop" at={hookFrom + 2} level={-31} />
      <Sfx name="el-pencil" at={takesAt - 2} level={-36} />
      {DIST.map((_, i) => (
        <Sfx key={i} name="el-tap" at={barAt(i) + 6} level={-27 - i} />
      ))}
      <Sfx name="el-pencil" at={thousandAt - 2} level={-35} />
      <Sfx name="el-pop" at={pickingAt} level={-29} />

      <Kicker at={hookFrom - 10}>A next-token machine</Kicker>
      <Headline
        lead="Tokens in,"
        turn={<Mark at={nextAt}>probabilities out.</Mark>}
        at={hookFrom - 6}
        turnAt={probAt - 4}
      />

      <Drift from={hookFrom} to={end} amount={0.014} origin="40% 55%">
        <FigLabel n="1" title="One step of a language model" at={hookFrom} x={X0} y={y(FIG_Y)} />
        <Note at={hookFrom + 10} x={X0} y={y(FIG_Y) + 44}>
          <span style={note(21, INK_SOFT)}>Scores as the lesson illustrates them</span>
        </Note>

        {/* What it reads: the lesson's toy loop starts from one word. */}
        <Note at={hookFrom + 4} x={CTX.x} y={y(CTX.y) - 50}>
          <span style={label(21, INK_SOFT)}>It reads</span>
        </Note>
        <div style={{ position: "absolute", left: CTX.x, top: y(CTX.y), opacity: ease(frame, hookFrom + 4, 12) }}>
          <ChipFace text="the" size={32} />
        </div>
        <Arrow from={[CTX.x + 104, y(CTX.y) + 26]} to={[BOX.x - 14, y(CTX.y) + 26]} at={takesAt - 4} dur={12} />

        {/* The model. */}
        <div
          style={{
            position: "absolute",
            left: BOX.x,
            top: y(BOX.y),
            width: BOX.w,
            height: h(BOX.h),
            boxSizing: "border-box",
            borderRadius: 14,
            border: `2.5px solid ${INK}`,
            background: `color-mix(in srgb, ${TOKEN} ${Math.round(think * 14)}%, ${PAPER})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: boxIn,
            transform: `scale(${0.96 + boxIn * 0.04 + think * 0.02})`,
          }}
        >
          <span style={{ ...body(34), color: INK, opacity: ease(frame, modelAt - 2, 12) }}>language model</span>
        </div>
        <Arrow from={[BOX.x + BOX.w + 14, y(CTX.y) + 26]} to={[BARS.x - 18, y(CTX.y) + 26]} at={probAt - 6} dur={12} />

        {/* What it returns: a probability for every token. */}
        <Note at={probAt - 2} x={BARS.x} y={rowY(0) - 50}>
          <span style={label(21, INK_SOFT)}>It returns a probability for each next token</span>
        </Note>
        {DIST.map((d, i) => {
          const p = ease(frame, barAt(i), 14);
          const glow = pulse(frame, everyAt + i * 4, 18) + pulse(frame, notOneAt + 2, 20) * (i === 0 ? 1 : 0);
          return (
            <React.Fragment key={d.token}>
              <div style={{ position: "absolute", left: BARS.x, top: rowY(i), opacity: p }}>
                <ChipFace text={d.token} size={28} width={BARS.chipW} focus={glow} />
              </div>
              <div
                style={{
                  position: "absolute",
                  left: BARS.barX,
                  top: rowY(i) + 8,
                  height: 34,
                  width: d.p * BARS.perUnit * p,
                  background: TOKEN,
                  borderRadius: 3,
                  opacity: 0.85 + glow * 0.15,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: BARS.barX + d.p * BARS.perUnit + 14,
                  top: rowY(i) + 6,
                  ...note(28, INK),
                  ...TABULAR,
                  fontWeight: 600,
                  opacity: ease(frame, barAt(i) + 8, 8),
                }}
              >
                {d.p.toFixed(2)}
              </div>
            </React.Fragment>
          );
        })}
        {/* The rest of the vocabulary: two hundred thousand in all. */}
        <Note at={thousandAt - 2} x={BARS.x} y={rowY(DIST.length) + 6}>
          <div style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            and <span style={{ ...TABULAR, fontWeight: 650, color: FOCUS_INK }}>{num(VOCAB - DIST.length)}</span> more
            tokens, sharing the other {rest.toFixed(2)}
          </div>
          <div style={{ ...note(21, INK_SOFT), marginTop: 10, whiteSpace: "nowrap" }}>
            o200k_base, GPT-4o&apos;s tokenizer, has {num(VOCAB)} tokens in all
          </div>
        </Note>
      </Drift>

      {/* Picking one is a step of its own, and a setting. */}
      <Spot id="llm-tokens-die" at={pickingAt - 4} left={1500} top={y(470)} width={300} height={300} />
      <Note at={separateAt - 2} x={1490} y={y(470) + 330}>
        <div style={{ ...body(30), color: INK, whiteSpace: "nowrap" }}>Picking one:</div>
        <div style={{ ...body(30), color: INK, whiteSpace: "nowrap" }}>a separate step</div>
      </Note>
      <Note at={knobAt - 2} x={1490} y={y(470) + 420}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>and a setting you choose</span>
      </Note>
    </AbsoluteFill>
  );
};
