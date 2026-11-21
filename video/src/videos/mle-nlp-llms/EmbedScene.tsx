import { Package, User, WholeWord } from "lucide-react";
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { label } from "../../editorial/style";
import { ColumnRule } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { BAR, ColHead, DATA_FILL, Drift, Flow, GOLD, HIGHLIGHT, INK, INK_SOFT, lerp, Line, Mark, Q_SIZE, Svg, X0 } from "./parts";

/** A cell's shade for an illustrative value in 0..1. */
const SHADE = [ds("blue", 100), ds("blue", 200), ds("blue", 300), ds("blue", 400), ds("blue", 500), ds("blue", 600)];
const shade = (v: number) => SHADE[Math.max(0, Math.min(SHADE.length - 1, Math.floor(v * SHADE.length)))];
const val = (r: number, c: number) => {
  const s = Math.sin(r * 12.9898 + c * 78.233 + 1.7) * 43758.5453;
  return s - Math.floor(s);
};

const TABLE = { x: 660, ids: 5, cells: 8, cell: 34, gap: 3 };
const LIT = 2;
/** The 2-D space at the right: items as dots, two similar ones close together. */
const SPACE = { x: 1240, w: 520 };
const DOTS: readonly [number, number][] = [
  [0.08, 0.2], [0.2, 0.62], [0.33, 0.3], [0.47, 0.82], [0.58, 0.18], [0.7, 0.55], [0.86, 0.3], [0.92, 0.78], [0.14, 0.9], [0.4, 0.55],
];
const PAIR: readonly [number, number][] = [
  [0.66, 0.42],
  [0.73, 0.48],
];

/** The word2vec panel's sentence, its centre word, and the window around it. */
const SENT = ["the", "storm", "made", "the", "river", "rise", "fast"];
const CENTRE = 4;

/**
 * Question 2. What an embedding is: a learned dense vector (a row of cells)
 * for a word, a user or a product, placed so similar things sit close, and
 * in a model a lookup table, one row per id, the row lit as its id comes in.
 * Then how word2vec and GloVe learn them, side by side: a window sliding
 * over a sentence with its centre word predicting its neighbours, and a
 * word-by-word count grid factorized into two thin matrices. Both end with
 * one fixed vector per word.
 */
export const EmbedScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q2").from;
  const qAt = n.word("q2", "Question two");
  const textAt = n.word("q2", "What are word embeddings");
  const denseAt = n.word("q2-a", "learned, dense vector");
  const wordAt = n.word("q2-a", "a word");
  const userAt = n.word("q2-a", "a user");
  const productAt = n.word("q2-a", "a product");
  const nearAt = n.word("q2-a", "land near each other");
  const tableAt = n.word("q2-a", "a lookup table");
  const rowAt = n.word("q2-a", "one row per id");
  const w2vAt = n.word("q2-how", "word2vec learns");
  const givenAt = n.word("q2-how", "given a word");
  const neighAt = n.word("q2-how", "predicts its neighbors");
  const gloveAt = n.word("q2-how", "GloVe counts");
  const factAt = n.word("q2-how", "factorizes that table");
  const bothAt = n.word("q2-how", "Both give each word");
  const fixedAt = n.word("q2-how", "one fixed vector");
  const end = n.beat("q2-how").to;

  const top = y(296);
  const rowH = TABLE.cell + TABLE.gap;
  const rowY = (i: number) => top + i * h(rowH);
  const cellsX = TABLE.x + 80;
  // The dense vector arrives first, on the lit row's line; the table grows around it.
  const grow = ease(frame, tableAt, 16);
  const idIn = ease(frame, rowAt - 4, 16);
  const lit = ease(frame, rowAt + 8, 10);

  const spaceTop = top;
  const spaceH = h(4 * rowH + 10);
  const sx = (u: number) => SPACE.x + u * SPACE.w;
  const sy = (v: number) => spaceTop + v * spaceH;

  // ── word2vec ──
  const panelTop = y(586);
  const chipY = panelTop + h(110);
  const ADV = 22 * 0.6;
  const widths = SENT.map((w) => w.length * ADV + 24);
  const xs = widths.map((_, i) => X0 + widths.slice(0, i).reduce((a, b) => a + b + 12, 0));
  const mid = (i: number) => xs[i] + widths[i] / 2;
  const slide = ease(frame, w2vAt + 4, 26);
  const winFrom = lerp(xs[0] - 8, xs[CENTRE - 2] - 8, slide);
  const winTo = lerp(xs[4] + widths[4] + 8, xs[CENTRE + 2] + widths[CENTRE + 2] + 8, slide);
  const centreLit = ease(frame, givenAt, 10);

  // ── GloVe ──
  const G = { x: 1010, y: panelTop + h(96), n: 6, size: 168 };
  const gc = (G.size - 5 * 3) / 6;
  const fact = ease(frame, factAt, 16);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={denseAt + 4} level={-34} />
      <Sfx name="el-tap" at={wordAt} level={-34} />
      <Sfx name="el-tap" at={userAt} level={-34} />
      <Sfx name="el-tap" at={productAt} level={-34} />
      <Sfx name="el-sprinkle" at={nearAt} level={-35} />
      <Sfx name="el-whoosh" at={tableAt} level={-37} />
      <Sfx name="el-tap" at={rowAt + 8} level={-30} />
      <Sfx name="el-whoosh" at={w2vAt + 4} level={-37} />
      <Sfx name="el-pencil" at={neighAt} level={-36} />
      <Sfx name="el-sprinkle" at={gloveAt + 4} level={-34} />
      <Sfx name="el-whoosh" at={factAt} level={-36} />
      <Sfx name="el-pencil" at={fixedAt} level={-36} />

      <Drift from={from} to={end + 40} scale={0.014}>
        <QuestionCard n={2} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE}>
          What are word embeddings? Contrast word2vec and GloVe.
        </QuestionCard>

        {/* Something discrete: a word, a user, a product. */}
        {[
          { Icon: WholeWord, text: "a word", at: wordAt },
          { Icon: User, text: "a user", at: userAt },
          { Icon: Package, text: "a product", at: productAt },
        ].map(({ Icon, text, at }, i) => {
          const p = pop(frame, at, fps, 14);
          if (p <= 0.001) return null;
          return (
            <div
              key={text}
              style={{
                position: "absolute",
                left: X0 - 10 + i * 125,
                top: top + h(30),
                width: 120,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 14,
                opacity: Math.min(1, p),
                transform: `translateY(${(1 - Math.min(1, p)) * 12}px)`,
              }}
            >
              <Icon size={46} color={INK} strokeWidth={1.8} />
              <span style={{ ...label(22, INK), fontWeight: 500, whiteSpace: "nowrap" }}>{text}</span>
            </div>
          );
        })}

        {/* The lookup table: one row per id, the row lit as its id comes in. */}
        <Svg>
          {lit > 0 ? (
            <rect x={TABLE.x - 12} y={rowY(LIT) - 5} width={80 + TABLE.cells * rowH + 18} height={TABLE.cell + 10} rx={6} fill={HIGHLIGHT} opacity={lit} />
          ) : null}
          {Array.from({ length: TABLE.ids }, (_, r) => {
            const isLit = r === LIT;
            const p = isLit ? ease(frame, denseAt + 2, 14) : grow;
            if (p <= 0) return null;
            return Array.from({ length: TABLE.cells }, (_, c) => {
              const q = isLit ? ease(frame, denseAt + 2 + c * 1.5, 8) : ease(frame, tableAt + Math.abs(r - LIT) * 3 + c, 8);
              if (q <= 0) return null;
              return <rect key={`${r}-${c}`} x={cellsX + c * rowH} y={rowY(r)} width={TABLE.cell} height={TABLE.cell} rx={4} fill={shade(val(r, c))} opacity={q} />;
            });
          })}
        </Svg>
        {Array.from({ length: TABLE.ids }, (_, r) => (
          <div
            key={r}
            style={{
              position: "absolute",
              left: TABLE.x,
              top: rowY(r) + 4,
              width: 64,
              textAlign: "right",
              fontFamily: MONO,
              fontSize: 21,
              fontWeight: 500,
              color: r === LIT ? INK : INK_SOFT,
              opacity: grow,
            }}
          >
            {r}
          </div>
        ))}
        <Line at={tableAt + 6} x={TABLE.x} y={rowY(TABLE.ids) + h(14)} size={21} color={INK_SOFT}>
          id, then its learned vector
        </Line>
        <div
          style={{
            position: "absolute",
            left: lerp(TABLE.x - 150, TABLE.x - 104, idIn),
            top: rowY(LIT) + 1,
            opacity: idIn,
            padding: "2px 10px",
            border: `2px solid ${INK}`,
            borderRadius: 7,
            fontFamily: MONO,
            fontSize: 21,
            fontWeight: 500,
            color: INK,
            whiteSpace: "nowrap",
          }}
        >
          id {LIT}
        </div>

        {/* Similar things land near each other. */}
        <Svg>
          {DOTS.map(([u, v], i) => {
            const p = ease(frame, nearAt - 6 + i * 1.2, 8);
            return p > 0 ? <circle key={i} cx={sx(u)} cy={sy(v)} r={8} fill={DATA_FILL} opacity={p} /> : null;
          })}
          {PAIR.map(([u, v], i) => {
            const p = ease(frame, nearAt + 4, 10);
            return p > 0 ? <circle key={i} cx={sx(u)} cy={sy(v)} r={9} fill={BAR} opacity={p} /> : null;
          })}
          {ease(frame, nearAt + 12, 12) > 0 ? (
            <ellipse
              cx={(sx(PAIR[0][0]) + sx(PAIR[1][0])) / 2}
              cy={(sy(PAIR[0][1]) + sy(PAIR[1][1])) / 2}
              rx={48}
              ry={34}
              fill="none"
              stroke={GOLD}
              strokeWidth={2.6}
              pathLength={1}
              strokeDasharray={`${ease(frame, nearAt + 12, 12)} 1`}
            />
          ) : null}
        </Svg>
        <Line at={nearAt + 14} x={sx(PAIR[1][0]) + 60} y={sy(PAIR[1][1]) - 20} size={21}>
          similar, so near
        </Line>

        {/* ── How word2vec and GloVe learn them ── */}
        <ColHead at={w2vAt} x={X0} y={panelTop} w={780}>
          word2vec: prediction
        </ColHead>
        {SENT.map((w, i) => {
          const p = ease(frame, w2vAt + 2 + i * 1.5, 10);
          if (p <= 0) return null;
          const centre = i === CENTRE;
          const inWin = Math.abs(i - CENTRE) <= 2;
          const ink = centre ? INK : INK;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: xs[i],
                top: chipY,
                width: widths[i],
                boxSizing: "border-box",
                padding: "3px 0",
                textAlign: "center",
                border: `2px solid ${centre ? `color-mix(in srgb, ${GOLD} ${centreLit * 100}%, ${INK})` : INK}`,
                background: centre ? `color-mix(in srgb, ${HIGHLIGHT} ${centreLit * 100}%, transparent)` : undefined,
                borderRadius: 7,
                fontFamily: MONO,
                fontSize: 22,
                fontWeight: 500,
                lineHeight: 1.15,
                color: ink,
                opacity: p * (inWin || slide < 1 ? 1 : 0.45),
              }}
            >
              {w}
            </div>
          );
        })}
        {/* The window, sliding into place. */}
        <Svg opacity={ease(frame, w2vAt + 4, 10)}>
          <path
            d={`M${winFrom},${chipY + h(48)} L${winFrom},${chipY + h(58)} L${winTo},${chipY + h(58)} L${winTo},${chipY + h(48)}`}
            fill="none"
            stroke={INK_SOFT}
            strokeWidth={2}
          />
        </Svg>
        <Line at={w2vAt + 30} x={(xs[CENTRE - 2] + xs[CENTRE + 2] + widths[CENTRE + 2]) / 2} y={chipY + h(70)} size={21} color={INK_SOFT} align="center" width={240}>
          a sliding window
        </Line>
        {/* The centre word predicts its neighbours. */}
        {[CENTRE - 2, CENTRE - 1, CENTRE + 1, CENTRE + 2].map((j, k) => {
          const x1 = mid(CENTRE);
          const x2 = mid(j);
          const lift = h(40) + Math.abs(j - CENTRE) * h(16);
          const top0 = chipY - 8;
          return (
            <Flow
              key={j}
              points={[
                [x1 + (j < CENTRE ? -1 : 1) * (Math.abs(j - CENTRE) === 1 ? 6 : 20), top0],
                [x1 + (j < CENTRE ? -1 : 1) * (Math.abs(j - CENTRE) === 1 ? 6 : 20), top0 - lift],
                [x2, top0 - lift],
                [x2, top0 - 4],
              ]}
              at={neighAt + k * 3}
              head={11}
              width={2}
            />
          );
        })}

        <ColumnRule x={950} top={panelTop} height={h(318)} at={gloveAt} />
        <ColHead at={gloveAt} x={G.x} y={panelTop} w={800}>
          GloVe: co-occurrence counts
        </ColHead>
        <Svg>
          {Array.from({ length: 36 }, (_, k) => {
            const r = Math.floor(k / 6);
            const c = k % 6;
            const p = ease(frame, gloveAt + 6 + (r + c) * 1.2, 8);
            if (p <= 0) return null;
            const v = r === c ? 0.95 : val(Math.min(r, c), Math.max(r, c));
            return <rect key={k} x={G.x + c * (gc + 3)} y={G.y + r * (gc + 3)} width={gc} height={gc} rx={3} fill={shade(v)} opacity={p} />;
          })}
          {/* ≈ a tall thin matrix times a short wide one. */}
          {fact > 0 ? (
            <g opacity={fact}>
              <text x={G.x + G.size + 26} y={G.y + G.size / 2 + 12} style={{ ...label(34, INK), fill: INK }}>
                ≈
              </text>
              {Array.from({ length: 12 }, (_, k) => {
                const r = Math.floor(k / 2);
                const c = k % 2;
                return <rect key={`u${k}`} x={G.x + G.size + 74 + c * (gc + 3)} y={G.y + r * (gc + 3)} width={gc} height={gc} rx={3} fill={shade(val(r + 7, c))} />;
              })}
              {Array.from({ length: 12 }, (_, k) => {
                const r = Math.floor(k / 6);
                const c = k % 6;
                return <rect key={`v${k}`} x={G.x + G.size + 74 + 2 * (gc + 3) + 20 + c * (gc + 3)} y={G.y + r * (gc + 3)} width={gc} height={gc} rx={3} fill={shade(val(r + 11, c))} />;
              })}
            </g>
          ) : null}
        </Svg>
        <Line at={gloveAt + 10} x={G.x} y={G.y + G.size + h(20)} size={21} color={INK_SOFT}>
          word by word, whole corpus
        </Line>
        <Line at={factAt + 8} x={G.x + G.size + 74 + 2 * (gc + 3) + 20} y={G.y + 2 * (gc + 3) + h(22)} size={21} color={INK_SOFT}>
          two thin matrices
        </Line>

        <Line at={bothAt} x={X0} y={y(866)} size={26} weight={500}>
          Both give each word <Mark at={fixedAt + 4}>one fixed vector</Mark>
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
