import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, INK, INK_SOFT, label, note, PAPER, TABULAR } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { TOKENS } from "./data";
import {
  Arrow,
  Bracket,
  Chip,
  HBar,
  FIG_Y,
  Headline,
  INPUT,
  INPUT_INK,
  lerp,
  OUTPUT,
  OUTPUT_INK,
  pulse,
  Spot,
  X0,
} from "./parts";

const BOX = { x: 700, w: 210, top: 440, bottom: 620 };
const HEAD_Y = 378;
const LEFT_ROWS = [452, 530];
const RIGHT_X = 990;
const RIGHT_ROW = 492;
const COUNT_Y = 646;
const METER_W = 240;

/**
 * Why output costs more: the prompt goes through the model in one pass, all
 * its tokens together; the answer comes out one token at a time, each one a
 * pass of its own. The tokens are o200k_base pieces of a support question
 * and its answer (measure.py).
 */
export const WhyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const whyFrom = n.beat("why").from;
  const dearerAt = n.word("why", "cost");
  const outputAt = n.word("why", "output");
  const computationAt = n.word("why", "computation");
  const promptAt = n.word("parallel", "prompt");
  const onceAt = n.word("parallel", "all at once");
  const passAt = n.word("parallel", "pass");
  const answerAt = n.word("serial", "answer");
  const oneAt = n.word("serial", "one token");
  const ownAt = n.word("serial", "own pass");
  const modelAt = n.word("serial", "model");
  const weightAt = n.word("weights", "every weight");
  const elevenAt = n.word("weights", "eleven tokens");
  const oneTokAt = n.word("weights", "or one");
  const waitsAt = n.word("weights", "waits");
  const fiveAt = n.word("gap", "Five");
  const gapAt = n.word("gap", "gap");

  const prompt = TOKENS.prompt;
  const answer = TOKENS.answer;
  const split = prompt.findIndex((t) => t.piece === "?") + 1;
  const rows = [prompt.slice(0, split), prompt.slice(split)];

  // The answer: token k comes out at outAt(k), after its own pass.
  const outAt = (k: number) => Math.round(lerp(oneAt, modelAt, k / (answer.length - 1)));
  const passesDone = answer.filter((_, k) => frame >= outAt(k)).length;

  // The model box lights once for the whole prompt, then once per answer token.
  const inFlash = pulse(frame, onceAt + 6, 20);
  const outFlash = Math.max(0, ...answer.map((_, k) => pulse(frame, outAt(k) - 8, 12)));
  const boxY0 = y(BOX.top);
  const boxY1 = y(BOX.bottom);
  const midY = (boxY0 + boxY1) / 2;
  const boxIn = ease(frame, outputAt, 14);

  return (
    <AbsoluteFill>
      {/* ── Sound: the prompt going in, each answer token, the bracket ── */}
      <Sfx name="el-pop" at={dearerAt - 8} level={-31} />
      <Sfx name="el-whoosh" at={onceAt} level={-33} />
      {answer.map((_, k) => (
        <Sfx key={k} name="el-tap" at={outAt(k) - 2} level={-29 - (k % 2)} />
      ))}
      <Sfx name="el-pencil" at={gapAt - 4} level={-35} />

      <Headline at={whyFrom - 6} second={computationAt - 4} italic="The computation.">
        Why does output cost more?
      </Headline>
      <Spot id="scales" at={dearerAt - 8} left={1500} top={y(60)} width={300} height={214} />

      <FigLabel n="3" title="Reading takes one pass, writing takes one per token" at={outputAt - 4} x={X0} y={y(FIG_Y)} />

      {/* The model. */}
      <div
        style={{
          position: "absolute",
          left: BOX.x,
          top: boxY0,
          width: BOX.w,
          height: boxY1 - boxY0,
          boxSizing: "border-box",
          borderRadius: 14,
          border: `3px solid ${INK}`,
          background: `color-mix(in srgb, ${inFlash > outFlash ? INPUT : OUTPUT} ${Math.round(Math.max(inFlash, outFlash) * 30)}%, ${PAPER})`,
          opacity: boxIn,
          transform: `scale(${1 + Math.max(inFlash, outFlash) * 0.04})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={label(30, INK)}>model</span>
      </div>

      {/* Reading: every prompt token goes in together. */}
      <Ink at={promptAt - 6} dur={12} style={{ left: X0, top: y(HEAD_Y), whiteSpace: "nowrap" }}>
        <span style={{ ...label(25, INPUT_INK), fontWeight: 700 }}>Reading the prompt</span>
      </Ink>
      {rows.map((row, r) => (
        <div key={r} style={{ position: "absolute", left: X0, top: y(LEFT_ROWS[r]), display: "flex", gap: 6 }}>
          {row.map((t, i) => {
            const k = r * split + i;
            const at = promptAt - 2 + k * 2;
            const p = ease(frame, at, 8);
            return (
              <span key={k} style={{ opacity: p, transform: `translateY(${(1 - p) * 8}px)` }}>
                <Chip piece={t.piece} color={INPUT} glow={pulse(frame, onceAt - 2, 22)} />
              </span>
            );
          })}
        </div>
      ))}
      <Arrow from={[BOX.x - 110, midY]} to={[BOX.x - 12, midY]} at={onceAt - 2} dur={10} color={INPUT} width={3} />
      <Note at={passAt - 4} x={X0} y={y(COUNT_Y)}>
        <span style={{ ...note(27, INK), fontWeight: 600, ...TABULAR, whiteSpace: "nowrap" }}>
          {prompt.length} tokens, 1 pass
        </span>
      </Note>

      {/* Writing: one token out per pass. */}
      <Ink at={answerAt - 4} dur={12} style={{ left: RIGHT_X, top: y(HEAD_Y), whiteSpace: "nowrap" }}>
        <span style={{ ...label(25, OUTPUT_INK), fontWeight: 700 }}>Writing the answer</span>
      </Ink>
      <Arrow from={[BOX.x + BOX.w + 12, midY]} to={[RIGHT_X - 12, midY]} at={oneAt - 10} dur={10} color={OUTPUT} width={3} />
      <div style={{ position: "absolute", left: RIGHT_X, top: y(RIGHT_ROW), display: "flex", gap: 6 }}>
        {answer.map((t, k) => {
          const p = ease(frame, outAt(k), 8);
          return (
            <span key={k} style={{ opacity: p, transform: `translateX(${(1 - p) * -24}px)` }}>
              <Chip piece={t.piece} color={OUTPUT} glow={pulse(frame, outAt(k), 16)} />
            </span>
          );
        })}
      </div>
      {passesDone > 0 ? (
        <div style={{ position: "absolute", left: RIGHT_X, top: y(COUNT_Y), whiteSpace: "nowrap" }}>
          <span style={{ ...note(27, INK), fontWeight: 600, ...TABULAR }}>
            {passesDone} {passesDone === 1 ? "token" : "tokens"}, {passesDone} {passesDone === 1 ? "pass" : "passes"}
          </span>
        </div>
      ) : null}
      <Note at={ownAt} x={RIGHT_X} y={y(COUNT_Y) + 44} out={weightAt - 6}>
        <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>each through the whole model</span>
      </Note>

      {/* What a pass costs: every weight moved, for eleven tokens of work or one. */}
      <Note at={weightAt - 2} x={X0} y={y(COUNT_Y) + 44}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>every weight moved once</span>
      </Note>
      <Note at={weightAt + 4} x={RIGHT_X} y={y(COUNT_Y) + 44}>
        <span style={{ ...note(24, INK), ...TABULAR, whiteSpace: "nowrap" }}>every weight moved {answer.length} times</span>
      </Note>
      {[
        { x: X0, share: 1, color: INPUT, at: elevenAt - 4, value: `${prompt.length} tokens` },
        { x: RIGHT_X, share: 1 / prompt.length, color: OUTPUT, at: oneTokAt - 2, value: "1 token" },
      ].map((m) => (
        <React.Fragment key={m.x}>
          <Note at={m.at - 4} x={m.x} y={y(COUNT_Y) + 88}>
            <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>work per pass</span>
          </Note>
          <div
            style={{
              position: "absolute",
              left: m.x + 160,
              top: y(COUNT_Y) + 92,
              width: METER_W,
              height: 22,
              boxSizing: "border-box",
              borderRadius: 4,
              border: `2px dashed color-mix(in srgb, ${INK} 40%, transparent)`,
              opacity: ease(frame, m.at - 4, 10),
              transform: m.share < 1 ? `scale(${1 + pulse(frame, waitsAt - 4, 24) * 0.06})` : undefined,
            }}
          />
          <HBar x={m.x + 160} y={y(COUNT_Y) + 92} w={METER_W * m.share} h={22} at={m.at} dur={14} fill={m.color} radius={4} />
          <Note at={m.at + 6} x={m.x + 160 + METER_W + 14} y={y(COUNT_Y) + 88}>
            <span style={{ ...note(22, INK), ...TABULAR, whiteSpace: "nowrap" }}>{m.value}</span>
          </Note>
        </React.Fragment>
      ))}
      <Note at={waitsAt - 4} x={RIGHT_X + 160 + METER_W + 110} y={y(COUNT_Y) + 88}>
        <span style={{ ...note(22, OUTPUT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>the rest waits</span>
      </Note>

      {/* The gap the price reflects. */}
      <Bracket x0={X0} x1={1760} y={y(COUNT_Y) + 148} at={fiveAt - 2} color={INK_SOFT} up />
      <Ink at={gapAt - 6} dur={16} style={{ left: 640, top: y(COUNT_Y) + 166, whiteSpace: "nowrap" }}>
        <span style={{ ...body(36, true), color: INK }}>Five times the price: a real gap in the work.</span>
      </Ink>
    </AbsoluteFill>
  );
};
