import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, PAPER, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, ElbowArrow, Mark, OK, OK_INK, pulse, Svg, Tagline } from "./parts";

const PANELS = [130, 710, 1290];
const PANEL_W = 500;
const TOP = 352;

// ── The CNN: a 7x7 picture and a 3x3 filter sliding over it ──
const GRID = 7;
const CELL = 40;
const GX = PANELS[0] + 10;
const GY = 430;
/** The picture: a diagonal stroke and a block, so the filter has something to find. */
const INKED = new Set(["1,1", "2,2", "3,3", "4,4", "5,5", "1,5", "2,5", "1,4", "4,1", "5,1", "5,2"]);
const OUT = GRID - 2;
const OCELL = 30;
const OX = GX + GRID * CELL + 44;

// ── The RNN and the transformer: five tokens each ──
const TOKENS = 5;
const TOK_W = 74;
const TOK_GAP = 22;
const TOK_Y = 720;

/**
 * Question 11, three panels drawn as each is described. A CNN's 3x3 filter
 * sliding over a small picture, filling a smaller grid as it goes; an RNN
 * reading five tokens one step at a time, its hidden state carried along
 * and fading behind it; a transformer joining every token to every other at
 * once.
 */
export const ArchScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("arch").from;
  const qAt = n.word("arch", "Question eleven");
  const textAt = n.word("arch", "When do you use a C N N");
  const cnnAt = n.word("arch", "A convolutional neural network");
  const slidesAt = n.word("arch", "slides one small filter across a grid");
  const sameAt = n.word("arch", "the same pattern everywhere");
  const imagesAt = n.word("arch", "images and audio");
  const rnnAt = n.word("arch-rnn", "A recurrent neural network");
  const stepAt = n.word("arch-rnn", "one step at a time");
  const hiddenAt = n.word("arch-rnn", "carrying a hidden state forward");
  const slowAt = n.word("arch-rnn", "but it's slow");
  const forgetsAt = n.word("arch-rnn", "forgets over long spans");
  const lstmAt = n.word("arch-rnn", "Gated versions like the L S T M");
  const tfAt = n.word("arch-tf", "A transformer relates");
  const onceAt = n.word("arch-tf", "every position to every other at once");
  const longAt = n.word("arch-tf", "handles long-range context");
  const backboneAt = n.word("arch-tf", "the backbone of modern language models");
  const end = n.beat("arch-tf").to;

  // The filter visits the 25 positions in raster order, every 5 frames, and starts over.
  const visits = Math.max(0, Math.floor((frame - slidesAt) / 5));
  const pos = visits % (OUT * OUT);
  const pass = Math.floor(visits / (OUT * OUT));
  const fr = Math.floor(pos / OUT);
  const fc = pos % OUT;
  const filterOn = ease(frame, slidesAt - 2, 8);
  const found = (r: number, c: number) => {
    let s = 0;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (INKED.has(`${r + i},${c + j}`)) s++;
    return s;
  };
  const filled = (r: number, c: number) => pass > 0 || r * OUT + c <= pos;

  const tokX = (panel: number, i: number) => PANELS[panel] + 30 + i * (TOK_W + TOK_GAP);
  // The RNN reads one token every 12 frames from "one step at a time", then starts over.
  const rnnT = frame - stepAt;
  const rnnStep = rnnT < 0 ? -1 : Math.floor(rnnT / 12) % (TOKENS + 3);
  const arcs = ease(frame, onceAt - 2, 18);
  const glow = 0.5 + 0.5 * Math.sin((frame - onceAt) / 9);

  const titles = [
    { at: cnnAt, head: "CNN", what: "convolutional neural network" },
    { at: rnnAt, head: "RNN", what: "recurrent neural network" },
    { at: tfAt, head: "transformer", what: "" },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={cnnAt} level={-36} />
      <Sfx name="el-pencil" at={rnnAt} level={-36} />
      {Array.from({ length: TOKENS }, (_, i) => (
        <Sfx key={i} name="el-tap" at={stepAt + i * 12} level={-42} />
      ))}
      <Sfx name="el-sprinkle" at={onceAt} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={11} at={qAt - 4} textAt={textAt - 4} size={58}>
          When do you use a CNN, an RNN, or a transformer?
        </QuestionCard>

        {titles.map((t, i) => (
          <Note key={t.head} at={t.at - 2} x={PANELS[i]} y={y(TOP)}>
            <span style={{ ...note(30, INK), fontWeight: 700, whiteSpace: "nowrap" }}>{t.head}</span>
            {t.what ? <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>{`  ${t.what}`}</span> : null}
          </Note>
        ))}

        {/* ── CNN ── */}
        <Svg opacity={ease(frame, cnnAt, 12)}>
          {Array.from({ length: GRID * GRID }, (_, k) => {
            const r = Math.floor(k / GRID);
            const c = k % GRID;
            return (
              <rect
                key={k}
                x={GX + c * CELL}
                y={y(GY) + r * CELL}
                width={CELL - 3}
                height={CELL - 3}
                rx={3}
                fill={INKED.has(`${r},${c}`) ? BAR : `color-mix(in srgb, ${INK_SOFT} 12%, ${PAPER})`}
                opacity={INKED.has(`${r},${c}`) ? 0.8 : 1}
              />
            );
          })}
          {filterOn > 0 ? (
            <rect
              x={GX + fc * CELL - 3}
              y={y(GY) + fr * CELL - 3}
              width={3 * CELL + 3}
              height={3 * CELL + 3}
              rx={5}
              fill="none"
              stroke={OK}
              strokeWidth={3.4}
              opacity={filterOn}
            />
          ) : null}
          {Array.from({ length: OUT * OUT }, (_, k) => {
            const r = Math.floor(k / OUT);
            const c = k % OUT;
            if (!filled(r, c) || filterOn <= 0) return null;
            const v = found(r, c) / 4;
            return (
              <rect
                key={`o${k}`}
                x={OX + c * OCELL}
                y={y(GY) + CELL + r * OCELL}
                width={OCELL - 3}
                height={OCELL - 3}
                rx={2}
                fill={`color-mix(in srgb, ${OK} ${Math.round(Math.min(1, v) * 85)}%, ${PAPER})`}
                stroke={r === fr && c === fc && pass === 0 ? OK : "none"}
                strokeWidth={2}
              />
            );
          })}
        </Svg>
        <Tagline x={OX} y={y(GY) + CELL - h(34)} at={slidesAt + 4} size={19}>
          what it found
        </Tagline>
        <Note at={sameAt - 2} x={PANELS[0]} y={y(GY) + GRID * CELL + h(24)}>
          <span style={{ ...note(23, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>one filter, the same weights everywhere</span>
        </Note>
        <Note at={imagesAt - 2} x={PANELS[0]} y={y(GY) + GRID * CELL + h(64)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            for <Mark at={imagesAt + 2}>images and audio</Mark>
          </span>
        </Note>

        {/* ── RNN ── */}
        <Svg opacity={ease(frame, rnnAt, 12)}>
          {Array.from({ length: TOKENS }, (_, i) => {
            const x = tokX(1, i);
            const read = rnnStep >= i ? 1 : 0;
            const ago = Math.max(0, rnnStep - i);
            const fade = rnnStep >= i ? Math.max(0.15, 1 - ago * 0.28 * ease(frame, forgetsAt, 12)) : 0;
            const hx = x + TOK_W / 2;
            const hy = y(TOK_Y) - h(150);
            return (
              <g key={i}>
                <rect x={x} y={y(TOK_Y)} width={TOK_W} height={h(54)} rx={6} fill={PAPER} stroke={read ? BAR : INK_SOFT} strokeWidth={2} />
                <line x1={hx} x2={hx} y1={y(TOK_Y) - 4} y2={hy + 30} stroke={INK_SOFT} strokeWidth={1.6} opacity={read ? 1 : 0.35} />
                <circle cx={hx} cy={hy} r={28} fill={`color-mix(in srgb, ${BAR} ${Math.round(fade * 70)}%, ${PAPER})`} stroke={BAR} strokeWidth={2} opacity={0.4 + 0.6 * read} />
                {i < TOKENS - 1 ? (
                  <line x1={hx + 30} x2={hx + TOK_W + TOK_GAP - 30} y1={hy} y2={hy} stroke={rnnStep > i ? BAR : INK_SOFT} strokeWidth={2.4} opacity={0.5 + 0.5 * (rnnStep > i ? 1 : 0)} />
                ) : null}
              </g>
            );
          })}
        </Svg>
        {Array.from({ length: TOKENS }, (_, i) => (
          <Tagline key={i} x={tokX(1, i) + TOK_W / 2} y={y(TOK_Y) + h(12)} width={TOK_W} align="center" at={rnnAt + i * 2} size={20} color={BLUE_INK}>
            {`t${i + 1}`}
          </Tagline>
        ))}
        <Tagline x={PANELS[1] + 30} y={y(TOK_Y) - h(214)} at={hiddenAt} size={20} color={BLUE_INK}>
          the hidden state, carried forward
        </Tagline>
        <Note at={slowAt - 2} x={PANELS[1]} y={y(TOK_Y) + h(76)}>
          <span style={{ ...note(23, ACCENT_INK), whiteSpace: "nowrap" }}>
            slow, step by step; <span style={{ opacity: ease(frame, forgetsAt - 2, 10) }}>forgets over long spans</span>
          </span>
        </Note>
        <Note at={lstmAt - 2} x={PANELS[1]} y={y(TOK_Y) + h(114)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>LSTM, long short-term memory: forgets less</span>
        </Note>

        {/* ── Transformer ── */}
        <Svg opacity={ease(frame, tfAt, 12)}>
          {Array.from({ length: TOKENS }, (_, i) =>
            Array.from({ length: TOKENS }, (_, j) => {
              if (j <= i) return null;
              const x1 = tokX(2, i) + TOK_W / 2;
              const x2 = tokX(2, j) + TOK_W / 2;
              const top = y(TOK_Y) - 20 - (j - i) * h(48);
              return (
                <path
                  key={`${i}-${j}`}
                  d={`M${x1},${y(TOK_Y) - 4} C${x1},${top} ${x2},${top} ${x2},${y(TOK_Y) - 4}`}
                  fill="none"
                  stroke={OK}
                  strokeWidth={2 + 1.2 * glow * ease(frame, longAt, 12)}
                  pathLength={1}
                  strokeDasharray={`${arcs} 1`}
                  opacity={0.75}
                />
              );
            }),
          )}
          {Array.from({ length: TOKENS }, (_, i) => (
            <rect key={i} x={tokX(2, i)} y={y(TOK_Y)} width={TOK_W} height={h(54)} rx={6} fill={PAPER} stroke={arcs > 0 ? OK : INK_SOFT} strokeWidth={2} />
          ))}
        </Svg>
        {Array.from({ length: TOKENS }, (_, i) => (
          <Tagline key={i} x={tokX(2, i) + TOK_W / 2} y={y(TOK_Y) + h(12)} width={TOK_W} align="center" at={tfAt + i * 2} size={20} color={BLUE_INK}>
            {`t${i + 1}`}
          </Tagline>
        ))}
        <Note at={onceAt + 4} x={PANELS[2]} y={y(TOK_Y) + h(76)}>
          <span style={{ ...note(23, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>every pair at once, in parallel</span>
        </Note>
        <Note at={backboneAt - 2} x={PANELS[2]} y={y(TOK_Y) + h(114)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>the backbone of modern language models</span>
        </Note>
        <Svg opacity={pulse(frame, longAt, 24)}>
          <rect x={PANELS[2] + 10} y={y(TOK_Y) - h(230)} width={PANEL_W - 20} height={h(300)} rx={10} fill="none" stroke={OK} strokeWidth={2} strokeDasharray="6 6" />
        </Svg>
        <div style={{ position: "absolute", left: PANELS[1] - 30, top: y(TOP) + 10, width: 1, height: h(520), background: `color-mix(in srgb, ${INK_SOFT} 35%, transparent)`, opacity: ease(frame, rnnAt, 10) }} />
        <div style={{ position: "absolute", left: PANELS[2] - 30, top: y(TOP) + 10, width: 1, height: h(520), background: `color-mix(in srgb, ${INK_SOFT} 35%, transparent)`, opacity: ease(frame, tfAt, 10) }} />
        <ElbowArrow points={[[GX + GRID * CELL + 8, y(GY) + CELL + (OUT * OCELL) / 2], [OX - 8, y(GY) + CELL + (OUT * OCELL) / 2]]} at={slidesAt + 2} color={INK_SOFT} width={2} head={10} />
      </Drift>
    </AbsoluteFill>
  );
};
