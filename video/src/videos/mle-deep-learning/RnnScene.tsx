import { Clock } from "lucide-react";
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { I, MathRun } from "../../editorial/math";
import { ColumnRule, NextLine, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { RNN } from "./data";
import { ACCENT_INK, Art, BAR, Box, Drift, Fade, Flow, Headline, INK, INK_SOFT, Line, LOOK, OK_INK, Svg, Tag } from "./parts";

/** The unrolled RNN: steps 1, 2, 3, then 49 and 50. */
const STEPS: (number | null)[] = [1, 2, 3, null, 49, 50];
const CELL_X = 150;
const CELL_PITCH = 270;
const CELL_W = 150;
const LSTM_X = 140;
const GRU_X = 1090;
const PANEL_W = 680;
const TOKENS = ["every", "position", "reaches", "every", "other", "in", "one", "step"];
const TOK_X = 120;
const TOK_PITCH = 148;
const TOK_W = 128;

const sub = (base: string, k: React.ReactNode) => (
  <MathRun>
    <I>{base}</I>
    <sub>{k}</sub>
  </MathRun>
);

/** A row of small cells lit one after another, again and again: a sequence
 *  read one step at a time. */
const Stepper: React.FC<{ x: number; top: number; at: number; size: number; n?: number }> = ({ x, top, at, size, n = 8 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10);
  if (p <= 0) return null;
  const lit = Math.floor((frame - at) / 7) % n;
  return (
    <Svg opacity={p}>
      {Array.from({ length: n }, (_, k) => (
        <rect key={k} x={x + k * (size + 12)} y={top} width={size} height={size} rx={5} fill={k === lit ? BAR : "none"} stroke={k === lit ? BAR : INK} strokeWidth={2} />
      ))}
    </Svg>
  );
};

/**
 * Questions 14 and 15, then the bridge. An RNN unrolled over fifty steps,
 * the same weights in every cell and the hidden state passed along; the
 * gradient from step 50 back to step 1 thins through fifty factors (0.5^50
 * under a stated assumption), and the steps light one at a time, which a GPU
 * cannot parallelize. The LSTM's cell state runs straight through, where the
 * gradient meets only the forget gate (0.95^50, assumed); the GRU beside it,
 * two gates and no separate cell, three blocks of weights to four. Both still
 * read one step at a time. Then attention: every token joined to every other
 * at once, the orangutan, and the next part.
 */
export const RnnScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q14").from;
  const qAt = n.word("q14", "Question fourteen");
  const textAt = n.word("q14", "What is an RNN");
  const readsAt = n.word("q14-a", "reads a sequence one step at a time");
  const hiddenAt = n.word("q14-a", "updating one hidden state");
  const sameAt = n.word("q14-a", "the same weights each step");
  const gradAt = n.word("q14-why", "the gradient from step fifty");
  const fiftyAt = n.word("q14-why", "fifty similar factors");
  const halvesAt = n.word("q14-why", "If each halves it");
  const trillionAt = n.word("q14-why", "one part in a thousand trillion");
  const forgotAt = n.word("q14-why", "long-range patterns are forgotten");
  const explodeAt = n.word("q14-why", "they explode");
  const waitAt = n.word("q14-slow", "step fifty can't start");
  const gpuAt = n.word("q14-slow", "a GPU can't work");
  const q15At = n.word("q15", "Question fifteen");
  const q15TextAt = n.word("q15", "How do LSTMs and GRUs");
  const lstmAt = n.word("q15-a", "The LSTM");
  const cellAt = n.word("q15-a", "adds a cell state");
  const additionAt = n.word("q15-a", "mostly by addition");
  const gatesAt = n.word("q15-a", "under input, forget and output gates");
  const alongAt = n.word("q15-a", "Along it");
  const forgetAt = n.word("q15-a", "only the forget gate");
  const ninetyAt = n.word("q15-a", "at point nine five");
  const eightAt = n.word("q15-a", "about eight percent");
  const gruAt = n.word("q15-gru", "The GRU");
  const twoGatesAt = n.word("q15-gru", "uses two gates");
  const threeAt = n.word("q15-gru", "three blocks of weights");
  const similarAt = n.word("q15-gru", "for similar results");
  const limitAt = n.word("q15-limit", "both still read one step at a time");
  const attnAt = n.word("next", "Attention did it better");
  const everyAt = n.word("next", "every position reaches every other");
  const onceAt = n.word("next", "all at once");
  const builtAt = n.word("next", "language models are built on it");
  const nextAt = n.word("next", "Next");
  const end = n.beat("next").to;

  const leave1 = q15At - 6;
  const leave2 = attnAt - 6;

  // ── The unrolled RNN ──
  const cellTop = y(420);
  const CH = h(72);
  const cx = (k: number) => CELL_X + k * CELL_PITCH;
  const run = (k: number) => {
    // Lit one after another while "can't start until step forty-nine is done" is said.
    const t = (frame - waitAt) / 9;
    return t >= k && t < k + 1.6 ? 1 : 0;
  };
  // The gradient, thinning as it travels back from step 50 to step 1.
  const gradY = y(352);
  const travel = ease(frame, gradAt, Math.max(30, fiftyAt - gradAt + 20));

  // ── The LSTM and GRU ──
  const pTop = y(370);
  const pH = h(250);
  const lineY = pTop + h(50);
  const gateTop = pTop + pH - h(86);
  const GH = h(52);

  // ── Attention: every token joined to every other, at once ──
  const tokTop = y(640);
  const arcs = ease(frame, everyAt, 16);
  const pairs: [number, number][] = [];
  for (let i = 0; i < TOKENS.length; i++) for (let j = i + 1; j < TOKENS.length; j++) pairs.push([i, j]);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={readsAt} level={-31} />
      <Sfx name="el-whoosh" at={gradAt} level={-35} />
      <Sfx name="el-pop" at={trillionAt} level={-31} />
      <Sfx name="el-tap" at={waitAt} level={-31} />
      <Sfx name="el-pencil" at={cellAt} level={-35} />
      <Sfx name="el-tap" at={forgetAt} level={-30} />
      <Sfx name="el-pop" at={eightAt} level={-31} />
      <Sfx name="el-pencil" at={gruAt} level={-35} />
      <Sfx name="el-tap" at={threeAt} level={-30} />
      <Sfx name="el-whoosh" at={attnAt} level={-35} />
      <Sfx name="el-sprinkle" at={everyAt} level={-33} />
      <Sfx name="el-pop" at={attnAt + 6} level={-30} />
      <Sfx name="el-chime" at={end + 6} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={14} at={qAt - 4} textAt={textAt - 4} out={leave1} size={62}>
          What is an RNN, and why does it struggle with long sequences?
        </QuestionCard>
        <QuestionCard n={15} at={q15At - 2} textAt={q15TextAt - 4} out={leave2}>
          How do LSTMs and GRUs address that?
        </QuestionCard>

        {/* ── Question 14: one cell, fifty steps ── */}
        <Fade at={readsAt - 6} out={leave1}>
          {STEPS.map((s, k) => {
            const lit = run(k);
            return s === null ? (
              <Line key={k} at={readsAt + k * 3} x={cx(k) + CELL_W / 2 - 20} y={cellTop + CH / 2 - 22} size={32} color={INK_SOFT}>
                …
              </Line>
            ) : (
              <React.Fragment key={k}>
                <Box x={cx(k)} y={cellTop} w={CELL_W} h={CH} at={readsAt + k * 3} size={28} hue={lit > 0 ? "blue" : undefined} hueAt={waitAt}>
                  {sub("h", s)}
                </Box>
                <div style={{ position: "absolute", left: cx(k) + CELL_W / 2 - 18, top: cellTop - h(44), opacity: ease(frame, sameAt + k * 2, 10) }}>
                  <Tag tone="ink" size={20}>
                    <MathRun>
                      <I>W</I>
                    </MathRun>
                  </Tag>
                </div>
                <Flow points={[[cx(k) + CELL_W / 2, cellTop + CH + h(64)], [cx(k) + CELL_W / 2, cellTop + CH + 6]]} at={readsAt + 6 + k * 3} width={2.2} head={12} />
                <Line at={readsAt + 8 + k * 3} x={cx(k) + CELL_W / 2 - 16} y={cellTop + CH + h(70)} size={24} color={INK_SOFT}>
                  {sub("x", s)}
                </Line>
              </React.Fragment>
            );
          })}
          {STEPS.slice(0, -1).map((s, k) =>
            s === null || STEPS[k + 1] === null ? (
              <Flow key={k} points={[[cx(k) + CELL_W + 6, cellTop + CH / 2], [cx(k + 1) - (STEPS[k + 1] === null ? 40 : 8), cellTop + CH / 2]]} at={hiddenAt + k * 3} width={2.2} head={12} noHead={STEPS[k + 1] === null} />
            ) : (
              <Flow key={k} points={[[cx(k) + CELL_W + 6, cellTop + CH / 2], [cx(k + 1) - 8, cellTop + CH / 2]]} at={hiddenAt + k * 3} width={2.2} head={12} />
            ),
          )}
          <Line at={hiddenAt} x={cx(0)} y={cellTop + CH + h(120)} size={22} color={INK_SOFT}>
            One hidden state, passed along; the same weights every step
          </Line>

          {/* The gradient back from step 50, thinning. */}
          <Svg>
            {STEPS.slice(0, -1).map((_, k) => {
              const seg = 4 - k;
              const p = Math.min(1, Math.max(0, travel * 5 - (4 - seg)));
              if (p <= 0) return null;
              const x1 = cx(seg + 1) + CELL_W / 2;
              const x0 = cx(seg) + CELL_W / 2;
              return <line key={k} x1={x1} x2={x1 + (x0 - x1) * p} y1={gradY} y2={gradY} stroke={LOOK} strokeWidth={1 + seg * 1.3} strokeLinecap="round" />;
            })}
          </Svg>
          <Line at={gradAt} x={cx(5) + CELL_W + 14} y={gradY - 16} size={22} color={INK_SOFT}>
            gradient
          </Line>

          <Line at={halvesAt} x={cx(0)} y={y(700)} size={30} color={ACCENT_INK}>
            <MathRun>
              0.5<sup>50</sup> = 8.9 × 10<sup>−16</sup>
            </MathRun>
          </Line>
          <Line at={halvesAt + 6} x={cx(0)} y={y(748)} size={22} color={INK_SOFT}>
            Assumed: each step halves it
          </Line>
          <Line at={forgotAt} x={cx(2)} y={y(706)} size={24} color={INK}>
            Long-range patterns forgotten
            <span style={{ opacity: ease(frame, explodeAt - 4, 10) }}>; above 1, they explode</span>
          </Line>
          {/* One after another: the next can't fall until this one has. */}
          <Sfx name="el-pop" at={waitAt} level={-30} />
          <Art name="dominoes" at={waitAt} left={1490} top={y(724)} h={136} />
          <div style={{ position: "absolute", left: cx(0), top: y(816), opacity: ease(frame, waitAt, 10) }}>
            <Clock size={34} color={INK} strokeWidth={2} />
          </div>
          <Line at={waitAt} x={cx(0) + 54} y={y(816) + 2} size={26} color={INK}>
            Step <Num>50</Num> waits for step <Num>49</Num>
            <span style={{ color: ACCENT_INK, opacity: ease(frame, gpuAt, 10) }}>: no parallel steps on a GPU</span>
          </Line>
        </Fade>

        {/* ── Question 15: the LSTM and the GRU ── */}
        <Fade at={lstmAt - 6} out={leave2}>
          <Line at={lstmAt - 4} x={LSTM_X} y={y(300)} size={26}>
            LSTM<span style={{ color: INK_SOFT }}> · long short-term memory</span>
          </Line>
          <Box x={LSTM_X} y={pTop} w={PANEL_W} h={pH} at={lstmAt}>
            {null}
          </Box>
          {/* The cell state: one line straight through, changed by addition. */}
          <Flow points={[[LSTM_X - 40, lineY], [LSTM_X + PANEL_W + 44, lineY]]} at={cellAt} dur={20} color={BAR} width={5} head={16} />
          <Line at={cellAt + 6} x={LSTM_X + 400} y={lineY + h(12)} size={22} color={INK_SOFT}>
            cell state
          </Line>
          {[
            { name: "forget", x: LSTM_X + 60, op: "×" },
            { name: "input", x: LSTM_X + 260, op: "+" },
            { name: "output", x: LSTM_X + 460, op: "" },
          ].map((g, k) => (
            <React.Fragment key={g.name}>
              <Box x={g.x} y={gateTop} w={150} h={GH} at={gatesAt + k * 4} size={22} hue={g.name === "forget" ? "yellow" : undefined} hueAt={forgetAt}>
                {g.name}
              </Box>
              {g.op ? (
                <>
                  <Flow points={[[g.x + 75, gateTop - 4], [g.x + 75, lineY + 24]]} at={gatesAt + k * 4 + 4} width={2.2} head={12} />
                  <div
                    style={{
                      position: "absolute",
                      left: g.x + 75 - 20,
                      top: lineY - 20,
                      width: 40,
                      height: 40,
                      boxSizing: "border-box",
                      borderRadius: "50%",
                      border: `2px solid ${INK}`,
                      background: "var(--ds-white)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 26,
                      fontWeight: 600,
                      color: INK,
                      opacity: ease(frame, g.op === "+" ? additionAt : gatesAt + 4, 10),
                    }}
                  >
                    {g.op}
                  </div>
                </>
              ) : (
                <Flow points={[[g.x + 155, gateTop + GH / 2], [LSTM_X + PANEL_W + 44, gateTop + GH / 2]]} at={gatesAt + k * 4 + 4} width={2.2} head={12} />
              )}
            </React.Fragment>
          ))}
          {/* The gradient back along the cell line meets one gate. */}
          <Flow points={[[LSTM_X + PANEL_W - 30, lineY - h(30)], [LSTM_X + 30, lineY - h(30)]]} at={alongAt} dur={24} color={LOOK} width={4} head={14} />
          <Line at={ninetyAt} x={LSTM_X} y={pTop + pH + h(30)} size={30} color={OK_INK}>
            <MathRun>
              0.95<sup>50</sup> = 0.077
            </MathRun>
            <span style={{ opacity: ease(frame, eightAt, 10) }}>, about 8% kept</span>
          </Line>
          <Line at={ninetyAt + 6} x={LSTM_X} y={pTop + pH + h(78)} size={22} color={INK_SOFT}>
            Assumed: forget gate at <Num>0.95</Num>
          </Line>
          <Line at={threeAt} x={LSTM_X} y={pTop + pH + h(124)} size={24}>
            <Num>{RNN.lstmBlocks}</Num> blocks of weights: three gates and the candidate
          </Line>

          <ColumnRule x={(LSTM_X + PANEL_W + 44 + GRU_X) / 2} top={y(300)} height={pTop + pH + h(150) - y(300)} at={gruAt} />
          <Line at={gruAt - 4} x={GRU_X} y={y(300)} size={26}>
            GRU<span style={{ color: INK_SOFT }}> · gated recurrent unit</span>
          </Line>
          <Box x={GRU_X} y={pTop} w={PANEL_W - 40} h={pH} at={gruAt}>
            {null}
          </Box>
          <Flow points={[[GRU_X - 26, lineY], [GRU_X + PANEL_W - 10, lineY]]} at={gruAt + 6} dur={18} color={INK} width={2.4} head={13} />
          <Line at={gruAt + 8} x={GRU_X} y={pTop + pH + h(30)} size={24} color={INK}>
            Hidden state only: no separate cell
          </Line>
          {["reset", "update"].map((g, k) => (
            <React.Fragment key={g}>
              <Box x={GRU_X + 80 + k * 220} y={gateTop} w={150} h={GH} at={twoGatesAt + k * 4} size={22}>
                {g}
              </Box>
              <Flow points={[[GRU_X + 155 + k * 220, gateTop - 4], [GRU_X + 155 + k * 220, lineY + 6]]} at={twoGatesAt + k * 4 + 4} width={2.2} head={12} />
            </React.Fragment>
          ))}
          <Line at={threeAt} x={GRU_X} y={pTop + pH + h(124)} size={24}>
            <Num>{RNN.gruBlocks}</Num> blocks
            <span style={{ opacity: ease(frame, similarAt, 10) }}>, similar results</span>
          </Line>

          <Line at={limitAt} x={LSTM_X} y={y(862)} size={24} color={ACCENT_INK}>
            Both still one step at a time
          </Line>
          <Stepper x={LSTM_X + 360} top={y(862) - 4} at={limitAt} size={h(30)} />
          <Stepper x={GRU_X} top={y(862) - 4} at={limitAt + 3} size={h(30)} />
        </Fade>

        {/* ── The bridge: attention, every position at once ── */}
        <Fade at={attnAt - 2}>
          <Headline lead="Every position, one step" at={attnAt} />
          <Art name="orangutan" at={attnAt + 6} left={1340} top={y(300)} h={420} />
          <Svg opacity={arcs}>
            {pairs.map(([i, j]) => {
              const xi = TOK_X + i * TOK_PITCH + TOK_W / 2;
              const xj = TOK_X + j * TOK_PITCH + TOK_W / 2;
              const lift = 40 + (j - i) * 34;
              return <path key={`${i}-${j}`} d={`M${xi},${tokTop - 6} C${xi},${tokTop - lift} ${xj},${tokTop - lift} ${xj},${tokTop - 6}`} fill="none" stroke={LOOK} strokeWidth={2.2} opacity={0.9} />;
            })}
          </Svg>
          {TOKENS.map((t, k) => (
            <Box key={k} x={TOK_X + k * TOK_PITCH} y={tokTop} w={TOK_W} h={h(52)} at={attnAt + k * 2} size={22} hue="yellow" hueAt={onceAt}>
              {t}
            </Box>
          ))}
          <Line at={builtAt} x={TOK_X} y={tokTop + h(80)} size={26} color={OK_INK}>
            All at once: what language models are built on
          </Line>
          <NextLine at={nextAt} x={TOK_X} y={y(800)} width={1100}>
            NLP and LLMs
          </NextLine>
        </Fade>
      </Drift>
    </AbsoluteFill>
  );
};
