import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { Pt } from "../../components/arrow";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, halo, INK, INK_SOFT, label, TABULAR } from "../../editorial/style";
import { FigLabel, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO, SANS } from "../../theme/fonts";
import { KEYS, one, TOKENS, TROPHY, two } from "./data";
import {
  Cells,
  FAINT,
  Fade,
  FIG_Y,
  Headline,
  KEY,
  KEY_INK,
  Kicker,
  LINE,
  Mark,
  Mono,
  POINT,
  POINT_INK,
  pulse,
  QUERY,
  QUERY_INK,
  Spot,
  Svg,
  Tag,
  TokenChip,
  VecArrow,
  X0,
} from "./parts";

// ═══ Scene 2: the query and the keys as arrows, and the dot product ════════

/** The plot: 400 px a unit, the origin low on the left. */
const U = 400;
/** The ledger's columns. */
const L = { chip: 790, key: 980, expr: 1190, result: 1600 };
const EXPR = 26;

/** Rises on `a`, falls on `b`: a highlight held while a term is spoken. */
const held = (frame: number, a: number, b: number) => ease(frame, a, 6) * (1 - ease(frame, b, 10));

export const DotScene: React.FC = () => {
  const n = useNarration();
  const frame = useCurrentFrame();
  const { y } = useLayout();

  const from = n.beat("arrows").from;
  const arrowsAt = n.word("arrows", "arrows");
  const queryAt = n.word("arrows", "query");
  const keysAt = n.word("arrows", "keys");
  const alongAt = n.word("along", "along");
  const trophysAt = n.word("along", "trophy's");
  const farAt = n.word("along", "far");
  const scoreAt = n.word("multiply", "score");
  const multiplyAt = n.word("multiply", "multiply");
  const matchingAt = n.word("multiply", "matching");
  const addAt = n.word("multiply", "add");
  const oneTimesAt = n.word("multiply", "One times one");
  const pointOneAt = n.word("multiply", "point one times point two");
  const resultAt = n.word("multiply", "One point oh two");
  const suitcaseAt = n.word("others", "Suitcase");
  const threeAt = n.word("others", "point three plus");
  const plusOneAt = n.word("others", "plus point one");
  const fourAt = n.word("others", "so point four");
  const ownAt = n.word("others", "own key");
  const elevenAt = n.word("others", "point one one");
  const multAddAt = n.word("dot", "multiply and add");
  const dotAt = n.word("dot", "dot product");
  const metAt = n.word("cosine", "met");
  const cosineAt = n.word("cosine", "cosine similarity");
  const shrunkAt = n.word("cosine", "shrunk");
  const lengthOneAt = n.word("cosine", "length one");
  const keepsAt = n.word("cosine", "keeps");
  const lengthsAt = n.word("cosine", "lengths");

  // ── Fig. 3 geometry ──
  const O: Pt = [210, y(800)];
  const P = (v: readonly number[]): Pt => [O[0] + v[0] * U, O[1] - v[1] * U];
  const q = P(TROPHY.query);
  const keyTips = KEYS.map(P);
  const keyAt = (i: number) => keysAt - 2 + i * 5;
  const glowKey = (i: number) =>
    (i === 0 ? pulse(frame, trophysAt - 2, 30) + pulse(frame, resultAt, 26) : 0) +
    (i === 1 ? pulse(frame, farAt, 30) + pulse(frame, fourAt, 26) : 0) +
    (i === 2 ? pulse(frame, elevenAt, 26) + pulse(frame, lengthsAt - 2, 36) : 0);
  const circle = ease(frame, shrunkAt - 2, 20);
  const ghost = circle * (1 - ease(frame, keepsAt - 2, 12));
  const itTip = keyTips[2];
  const itUnit: Pt = [O[0] + U * Math.SQRT1_2, O[1] - U * Math.SQRT1_2];

  // ── Fig. 4 rows ──
  const headY = y(385);
  const rowY = (i: number) => y(480) + i * 104;
  /** When each row's two products and its sum ink, and how long each
   *  product's matching pair stays lit. */
  const terms = [
    { show: [oneTimesAt, pointOneAt], lit: [oneTimesAt, pointOneAt, resultAt + 8], sum: resultAt },
    { show: [suitcaseAt + 2, suitcaseAt + 8], lit: [threeAt, plusOneAt, fourAt + 8], sum: fourAt },
    { show: [ownAt, ownAt + 6], lit: [ownAt, ownAt + 14, elevenAt + 8], sum: elevenAt },
  ];
  const lit = (row: number, cell: number) => {
    const t = terms[row].lit;
    return cell === 0 ? held(frame, t[0], t[1]) : held(frame, t[1], t[2]);
  };
  const qLit = [0, 1].map((c) => Math.max(lit(0, c), lit(1, c), lit(2, c)) * 0.9);
  const dotGlow = ease(frame, dotAt - 2, 12);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={queryAt - 2} level={-34} />
      {[0, 1, 2].map((i) => (
        <Sfx key={i} name="el-pencil" at={keyAt(i)} level={-36} />
      ))}
      <Sfx name="el-pop" at={scoreAt - 4} level={-31} />
      <Sfx name="el-tap" at={resultAt} level={-23} />
      <Sfx name="el-tap" at={fourAt} level={-25} />
      <Sfx name="el-tap" at={elevenAt} level={-25} />
      <Sfx name="el-pencil" at={dotAt - 2} level={-34} />
      <Sfx name="el-pencil" at={shrunkAt - 2} level={-36} />

      <Kicker at={from - 10}>Attention, by hand</Kicker>
      <Headline lead="Score each key" turn="against the query." at={from} turnAt={scoreAt - 4} out={multAddAt - 8} />
      <Headline lead="Multiply and add:" turn="the dot product." at={multAddAt - 4} turnAt={dotAt - 2} />

      {/* ── Fig. 3: the query and the keys, as arrows ── */}
      <FigLabel n="3" title="The query and the three keys" at={from} x={X0} y={y(FIG_Y)} />
      <Svg opacity={ease(frame, from, 14)}>
        <line x1={O[0]} x2={O[0] + 1.16 * U} y1={O[1]} y2={O[1]} stroke={LINE} strokeWidth={1.6} />
        <line x1={O[0]} x2={O[0]} y1={O[1]} y2={O[1] - 1.12 * U} stroke={LINE} strokeWidth={1.6} />
        {[0.5, 1].map((v) => (
          <g key={v}>
            <line x1={O[0] + v * U} x2={O[0] + v * U} y1={O[1]} y2={O[1] + 8} stroke={LINE} strokeWidth={1.6} />
            <text x={O[0] + v * U} y={O[1] + 34} textAnchor="middle" style={{ fontFamily: SANS, fontSize: 20, fontWeight: 500, fill: INK_SOFT }}>
              {one(v)}
            </text>
            <line x1={O[0] - 8} x2={O[0]} y1={O[1] - v * U} y2={O[1] - v * U} stroke={LINE} strokeWidth={1.6} />
            <text x={O[0] - 16} y={O[1] - v * U + 7} textAnchor="end" style={{ fontFamily: SANS, fontSize: 20, fontWeight: 500, fill: INK_SOFT }}>
              {one(v)}
            </text>
          </g>
        ))}
        <circle cx={O[0]} cy={O[1]} r={4.5} fill={INK} />
      </Svg>
      {/* "Shrunk to length one": the circle every unit arrow ends on. */}
      <Svg opacity={circle}>
        <path
          d={`M${O[0] + U},${O[1]} A${U},${U} 0 0 0 ${O[0]},${O[1] - U}`}
          fill="none"
          stroke={FAINT}
          strokeWidth={1.8}
          strokeDasharray="6 8"
        />
      </Svg>
      <Fade at={lengthOneAt - 2} out={keepsAt + 10} style={{ left: O[0] + U * 0.74 + 12, top: O[1] - U * 0.74 - 40, ...halo }}>
        <Tag size={21}>length one</Tag>
      </Fade>
      {/* The pronoun's short key, stretched to length one for cosine; attention leaves it short. */}
      <Svg opacity={ghost}>
        <line x1={itTip[0]} y1={itTip[1]} x2={itUnit[0]} y2={itUnit[1]} stroke={KEY} strokeWidth={2.4} strokeDasharray="5 6" />
        <circle cx={itUnit[0]} cy={itUnit[1]} r={8} fill="none" stroke={KEY} strokeWidth={2.4} />
      </Svg>

      {KEYS.map((_, i) => (
        <VecArrow key={i} o={O} tip={keyTips[i]} at={keyAt(i)} color={KEY} width={4.5} glow={glowKey(i)} />
      ))}
      <VecArrow o={O} tip={q} at={queryAt - 2} color={QUERY} width={5} glow={pulse(frame, alongAt - 2, 34) + 0.6 * pulse(frame, cosineAt, 30)} />

      {/* Tip labels. */}
      <Fade at={queryAt + 4} style={{ left: q[0] + 18, top: q[1] - 6, ...halo }}>
        <span style={{ ...label(22, QUERY_INK), whiteSpace: "nowrap" }}>query</span>
      </Fade>
      {TOKENS.map((t, i) => {
        const [x, ty] = keyTips[i];
        const pos =
          i === 0 ? { left: x + 18, top: ty - 30 } : i === 1 ? { left: x + 18, top: ty - 16 } : { left: x + 4, top: ty - 48 };
        return (
          <Fade key={t} at={keyAt(i) + 8} style={{ ...pos, ...halo }}>
            <span style={{ ...label(22, KEY_INK), whiteSpace: "nowrap" }}>
              <Mono>{t}</Mono>
            </span>
          </Fade>
        );
      })}
      <Fade at={lengthsAt - 2} style={{ left: itTip[0] + 20, top: itTip[1] - 96, ...halo }}>
        <Tag size={21} color={KEY_INK}>
          short key, small score
        </Tag>
      </Fade>

      {/* ── Fig. 4: multiply the matching numbers, and add ── */}
      <FigLabel n="4" title="Multiply the matching numbers, and add" at={keysAt - 2} x={L.chip} y={y(FIG_Y)} />
      <Fade at={keysAt - 2} style={{ left: L.chip, top: headY + 10 }}>
        <span style={{ ...label(23, QUERY_INK), whiteSpace: "nowrap" }}>
          Query, from <Mono>it</Mono>
        </span>
      </Fade>
      <Fade at={keysAt - 2} style={{ left: L.key, top: headY }}>
        <Cells values={TROPHY.query} cell={76} border={QUERY} highlight={qLit} />
      </Fade>
      <Fade at={multiplyAt - 2} style={{ left: L.expr, top: headY + 10 }}>
        <span style={{ ...label(23, INK_SOFT), whiteSpace: "nowrap" }}>Multiply, then add</span>
      </Fade>
      <Fade at={dotAt - 2} style={{ left: L.result, top: headY + 10 }}>
        <span style={{ ...label(23, POINT_INK), whiteSpace: "nowrap" }}>Dot product</span>
      </Fade>
      {/* The dot-product column, outlined when it is named. */}
      <Svg opacity={dotGlow * (1 - 0.6 * ease(frame, metAt, 14))}>
        <rect x={L.result - 16} y={rowY(0) - 8} width={150} height={rowY(2) - rowY(0) + 66} rx={10} fill="none" stroke={POINT} strokeWidth={2.4} />
      </Svg>
      {TOKENS.map((t, i) => {
        const row = TROPHY.rows[i];
        const [s0, s1] = terms[i].show;
        const sum = ease(frame, terms[i].sum - 2, 10);
        return (
          <Fade key={t} at={keyAt(i) + 4} style={{ left: 0, top: rowY(i), width: 1920, height: 60 }}>
            <div style={{ position: "absolute", left: L.chip, top: 4 }}>
              <TokenChip text={t} size={24} border={KEY} />
            </div>
            <div style={{ position: "absolute", left: L.key, top: 0 }}>
              <Cells values={KEYS[i]} cell={76} border={KEY} highlight={[lit(i, 0) * 0.9, lit(i, 1) * 0.9]} />
            </div>
            <div
              style={{
                position: "absolute",
                left: L.expr,
                top: 9,
                display: "flex",
                gap: "0.6em",
                fontFamily: MONO,
                fontSize: EXPR,
                fontWeight: 600,
                color: INK,
                whiteSpace: "pre",
                ...TABULAR,
              }}
            >
              <span style={{ opacity: ease(frame, s0 - 2, 10) }}>
                {one(TROPHY.query[0])} × {one(KEYS[i][0])}
              </span>
              <span style={{ opacity: ease(frame, s1 - 2, 10) }}>
                + {one(TROPHY.query[1])} × {one(KEYS[i][1])}
              </span>
            </div>
            <div style={{ position: "absolute", left: L.result - 44, top: 6, opacity: sum, display: "flex", gap: 18, alignItems: "baseline" }}>
              <span style={{ fontFamily: MONO, fontSize: EXPR, fontWeight: 600, color: INK_SOFT }}>=</span>
              <span style={{ fontFamily: MONO, fontSize: 32, fontWeight: 700, color: INK, ...TABULAR }}>{two(row.dot)}</span>
            </div>
          </Fade>
        );
      })}
      <Fade at={matchingAt - 2} out={addAt + 30} style={{ left: L.key, top: rowY(3) - 18 }}>
        <Tag size={21}>first with first, second with second</Tag>
      </Fade>

      {/* Cosine, the course's earlier measure, is this same sum. */}
      <Note at={cosineAt - 4} x={L.chip} y={y(800)} width={760}>
        <div style={{ ...body(32), color: INK }}>
          Cosine similarity: the same sum, on arrows shrunk to <Mark at={lengthOneAt}>length one.</Mark>
        </div>
        <div style={{ ...body(32), color: INK, marginTop: 14, opacity: ease(frame, keepsAt - 4, 12) }}>
          Attention <Mark at={keepsAt}>keeps the lengths.</Mark>
        </div>
      </Note>
      <Spot id="llm-attention-score-lock" at={arrowsAt} left={1590} top={y(745)} width={230} height={180} />
    </AbsoluteFill>
  );
};
