import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, halo, headline, INK, INK_SOFT, label, note, PAPER, TABULAR } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO, SANS } from "../../theme/fonts";
import { COST, QKV, WEIGHTS } from "./data";
import {
  clamp01,
  PathArrow,
  DATA,
  DATA_TINT,
  Fade,
  FAINT,
  FIG_Y,
  HEAD_Y,
  Headline,
  KEY,
  KEY_INK,
  Kicker,
  lerp,
  LINE,
  Mark,
  POINT,
  POINT_INK,
  pulse,
  QUERY,
  QUERY_INK,
  Spot,
  Svg,
  Tag,
  TokenChip,
  VALUE,
  VALUE_INK,
  VectorCells,
  X0,
} from "./parts";

// ═══ Scene 7: the trophy and the suitcase ══════════════════════════════════

const S1 = "The trophy didn't fit in the suitcase because it was too big.";
const S2 = "The trophy didn't fit in the suitcase because it was too small.";
const SIZE = 30;
/** JetBrains Mono advances 0.6 em per character, so a word's place in the
 *  sentence is its character index times this, in any page face. */
const CW = SIZE * 0.6;
const wordX = (s: string, w: string, from = 0) => {
  const i = s.indexOf(w, from);
  return { x0: X0 + i * CW, mid: X0 + (i + w.length / 2) * CW, i };
};

/** A sentence in mono, with highlighter marks under chosen words. */
const Sentence: React.FC<{ s: string; marks: { word: string; at: number; color?: string }[] }> = ({ s, marks }) => {
  const parts: React.ReactNode[] = [];
  let i = 0;
  const sorted = marks.map((m) => ({ ...m, i: s.indexOf(` ${m.word}`) + 1 })).sort((a, b) => a.i - b.i);
  for (const m of sorted) {
    parts.push(s.slice(i, m.i));
    parts.push(
      <Mark key={m.word} at={m.at} color={m.color}>
        {m.word}
      </Mark>,
    );
    i = m.i + m.word.length;
  }
  parts.push(s.slice(i));
  return <span style={{ fontFamily: MONO, fontSize: SIZE, fontWeight: 600, color: INK, whiteSpace: "pre" }}>{parts}</span>;
};

export const TrophyScene: React.FC = () => {
  const n = useNarration();
  const frame = useCurrentFrame();
  const { y } = useLayout();

  const from = n.beat("trophy").from;
  const itAt = n.word("trophy", "it");
  const bigAt = n.word("trophy", "big", { nth: 1 });
  const whatAt = n.word("trophy", "What");
  const theTrophyAt = n.word("trophy", "The trophy", { nth: 2 });
  const smallAt = n.word("small", "small");
  const suitcaseAt = n.word("small", "suitcase");
  const changedAt = n.word("pronoun", "changed");
  const aroundAt = n.word("pronoun", "around");
  const attentionAt = n.word("attention", "Attention");
  const pullsAt = n.word("attention", "pulls");
  const relevantAt = n.word("attention", "relevant");

  const R1 = y(500);
  const R2 = y(720);
  const it1 = wordX(S1, " it ").mid + CW / 2;
  const tr = wordX(S1, "trophy").mid;
  const sc = wordX(S2, "suitcase").mid;
  const ring = pulse(frame, changedAt - 6, 36);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={from + 8} level={-31} />
      <Sfx name="el-pencil" at={theTrophyAt - 6} level={-34} />
      <Sfx name="el-tap" at={smallAt} level={-25} />
      <Sfx name="el-pencil" at={suitcaseAt - 6} level={-34} />

      <Kicker at={from - 10}>Attention</Kicker>
      <Headline lead="One word," turn="two meanings." at={from} turnAt={smallAt - 4} out={attentionAt - 8} />
      <Headline lead="Attention:" turn="tokens weigh each other." at={attentionAt - 4} turnAt={pullsAt} />

      <FigLabel n="11" title="The lesson's two sentences" at={from} x={X0} y={y(FIG_Y)} />
      <Fade at={from} style={{ left: X0, top: R1 }}>
        <Sentence s={S1} marks={[{ word: "big", at: bigAt }, { word: "it", at: itAt, color: `color-mix(in srgb, ${POINT} 26%, transparent)` }]} />
      </Fade>
      <Fade at={smallAt - 6} style={{ left: X0, top: R2 }}>
        <Sentence s={S2} marks={[{ word: "small", at: smallAt }, { word: "it", at: smallAt + 6, color: `color-mix(in srgb, ${POINT} 26%, transparent)` }]} />
      </Fade>
      {/* "The pronoun never changed": the same token in both. */}
      <Svg opacity={ring}>
        {[R1, R2].map((r) => (
          <rect key={r} x={it1 - CW * 1.6} y={r - 6} width={CW * 3.2} height={SIZE + 22} rx={10} fill="none" stroke={POINT} strokeWidth={2.6} />
        ))}
      </Svg>
      <PathArrow
        points={[
          [it1, R1 - 8],
          [it1, R1 - 84],
          [tr, R1 - 84],
          [tr, R1 - 12],
        ]}
        radius={36}
        at={theTrophyAt - 4}
        color={POINT}
      />
      <PathArrow
        points={[
          [it1, R2 - 8],
          [it1, R2 - 70],
          [sc, R2 - 70],
          [sc, R2 - 12],
        ]}
        radius={30}
        at={suitcaseAt - 4}
        color={POINT}
      />
      <Note at={theTrophyAt + 2} x={X0} y={R1 + 56}>
        <span style={{ ...note(24, POINT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>it: the trophy</span>
      </Note>
      <Note at={suitcaseAt + 2} x={X0} y={R2 + 56}>
        <span style={{ ...note(24, POINT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>it: the suitcase</span>
      </Note>
      <Note at={aroundAt - 2} x={X0 + 300} y={R2 + 56}>
        <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>Same token; the words around it decide.</span>
      </Note>
      <Note at={attentionAt} x={X0} y={y(870)} width={1240}>
        <div style={{ ...body(32), color: INK }}>
          Each token <Mark at={pullsAt}>pulls in information</Mark> from the others, weighted by{" "}
          <Mark at={relevantAt}>how relevant</Mark> each one is.
        </div>
      </Note>
      <Spot id="llm-meaning-trophy" at={whatAt - 6} left={1420} top={y(470)} width={360} height={354} />
    </AbsoluteFill>
  );
};

// ═══ Scene 8: query, key, value, and the lesson's weights ══════════════════

const QKV_CARDS = [
  { name: "Query", ask: "What am I looking for?", color: QUERY, ink: QUERY_INK },
  { name: "Key", ask: "What do I offer?", color: KEY, ink: KEY_INK },
  { name: "Value", ask: "What I hand over when I'm picked.", color: VALUE, ink: VALUE_INK },
];

const W_X = { tok: 960, score: 1170, bar: 1300 };
const W_ROW = 58;
const BAR_PX = 520;

export const QkvScene: React.FC = () => {
  const n = useNarration();
  const frame = useCurrentFrame();
  const { y } = useLayout();

  const from = n.beat("query-vec").from;
  const threeAt = n.word("query-vec", "three");
  const queryAt = n.word("query-vec", "query");
  const keyAt = n.word("key", "key");
  const valueAt = n.word("value", "value");
  const comparedAt = n.word("scores", "compared");
  const everyKeyAt = n.word("scores", "every key");
  const scoreAt = n.word("scores", "score", { nth: 1 });
  const softmaxAt = n.word("scores", "Softmax");
  const weightsAt = n.word("scores", "weights");
  const oneAt = n.word("scores", "add up to one");
  const exampleAt = n.word("weights", "example");
  const sevenAt = n.word("weights", "point seven two");

  const cardAt = [queryAt, keyAt, valueAt];
  const top0 = y(410);
  const itRow = WEIGHTS.tokens.length - 1;
  const grow = (i: number) => ease(frame, softmaxAt + 6 + i * 3, 16);

  return (
    <AbsoluteFill>
      {cardAt.map((t, i) => (
        <Sfx key={i} name="el-tap" at={t} level={-25} />
      ))}
      <Sfx name="el-pencil" at={everyKeyAt} level={-35} />
      {WEIGHTS.tokens.map((_, i) => (
        <Sfx key={`w${i}`} name="el-tap" at={softmaxAt + 6 + i * 3} level={-31} />
      ))}
      <Sfx name="el-tap" at={sevenAt} level={-23} />

      <Kicker at={from - 10}>Attention</Kicker>
      <div style={{ position: "absolute", left: 92, top: y(HEAD_Y), display: "flex", gap: "0.26em", ...headline(72) }}>
        {["Query,", "key,", "value."].map((w, i) => (
          <Ink key={w} at={cardAt[i] - 4} dur={18} style={{ position: "relative", whiteSpace: "nowrap", color: QKV_CARDS[i].ink, fontStyle: i ? "italic" : "normal" }}>
            {w}
          </Ink>
        ))}
      </div>

      {/* ── Fig. 12: three vectors per token ── */}
      <FigLabel n="12" title="Every token makes three vectors" at={threeAt - 4} x={X0} y={y(FIG_Y)} />
      {QKV_CARDS.map((c, i) => (
        <Fade key={c.name} at={cardAt[i] - 4} style={{ left: X0, top: y(410 + i * 150), width: 680 }}>
          <div style={{ display: "flex", alignItems: "stretch", gap: 22 }}>
            <div style={{ width: 8, borderRadius: 4, background: c.color }} />
            <div>
              <div style={{ ...label(26, c.ink) }}>{c.name}</div>
              <div style={{ ...body(34, true), color: INK, marginTop: 8, whiteSpace: "nowrap" }}>{c.ask}</div>
            </div>
          </div>
        </Fade>
      ))}

      {/* ── Fig. 13: the lesson's weights from "it" ── */}
      <FigLabel n="13" title="Attention from “it”, in the lesson's example" at={comparedAt - 4} x={W_X.tok} y={y(FIG_Y)} />
      <Fade at={comparedAt - 2} style={{ left: 0, top: y(360), width: 1920 }}>
        <span style={{ position: "absolute", left: W_X.tok, ...label(21, INK_SOFT) }}>Token</span>
        <span style={{ position: "absolute", left: W_X.score, ...label(21, INK_SOFT), opacity: ease(frame, scoreAt - 2, 10) }}>Score</span>
        <span style={{ position: "absolute", left: W_X.bar, ...label(21, INK_SOFT), opacity: ease(frame, weightsAt - 2, 10) }}>Weight</span>
      </Fade>
      {WEIGHTS.tokens.map((t, i) => {
        const p = ease(frame, comparedAt + i * 2, 12);
        if (p <= 0) return null;
        const top = top0 + i * W_ROW;
        const isIt = i === itRow;
        const isTrophy = t === "trophy";
        const keyMark = isIt ? 0 : ease(frame, everyKeyAt - 2 + i * 2, 10);
        const g = grow(i);
        const w = WEIGHTS.weights[i];
        const hot = isTrophy ? ease(frame, sevenAt - 2, 10) : 0;
        return (
          <div key={t} style={{ position: "absolute", left: 0, top, width: 1920, height: W_ROW, opacity: p }}>
            <div style={{ position: "absolute", left: W_X.tok, top: 4 }}>
              <TokenChip text={t} size={23} border={isIt ? QUERY : keyMark > 0.5 ? KEY : INK} color={isIt ? QUERY_INK : INK} />
            </div>
            <span
              style={{
                position: "absolute",
                left: W_X.score,
                top: 12,
                fontFamily: MONO,
                fontWeight: 600,
                fontSize: 24,
                color: INK,
                opacity: ease(frame, scoreAt + i * 2, 10),
                ...TABULAR,
              }}
            >
              {WEIGHTS.raw[i].toFixed(1)}
            </span>
            {g > 0 ? (
              <>
                <div
                  style={{
                    position: "absolute",
                    left: W_X.bar,
                    top: 12,
                    width: Math.max(2, w * BAR_PX * g),
                    height: 30,
                    background: hot > 0 ? `color-mix(in srgb, ${POINT} ${Math.round(hot * 100)}%, ${DATA})` : DATA,
                    borderRadius: 3,
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    left: W_X.bar + w * BAR_PX * g + 14,
                    top: 12,
                    fontFamily: MONO,
                    fontWeight: 700,
                    fontSize: 24,
                    color: isTrophy && hot > 0.5 ? POINT_INK : INK,
                    opacity: g,
                    ...TABULAR,
                  }}
                >
                  {w.toFixed(3)}
                </span>
              </>
            ) : null}
          </div>
        );
      })}
      <Svg opacity={ease(frame, oneAt - 4, 10)}>
        <line x1={W_X.bar} x2={W_X.bar + BAR_PX} y1={top0 + 7 * W_ROW + 6} y2={top0 + 7 * W_ROW + 6} stroke={INK} strokeWidth={1.6} />
      </Svg>
      <Fade at={oneAt - 2} style={{ left: W_X.bar, top: top0 + 7 * W_ROW + 18, display: "flex", gap: 16, alignItems: "baseline" }}>
        <span style={{ ...label(22, INK_SOFT) }}>Total</span>
        <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 26, color: INK, ...TABULAR }}>{WEIGHTS.sum.toFixed(1)}</span>
      </Fade>
      <Note at={exampleAt - 2} x={W_X.tok} y={top0 + 7 * W_ROW + 74}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>Scores set by hand in the lesson</span>
      </Note>
    </AbsoluteFill>
  );
};

// ═══ Scene 9: the real arithmetic, and the blend it makes ══════════════════

const T_X = { tok: X0, key: 310, value: 500, score: 720, weight: 860 };
const T_ROW = 82;

/** A number that changes in place: the old value, then the new one inked on
 *  `swapAt`, with a brief flash. */
const Swap: React.FC<{ a: number; b: number; swapAt: number; digits?: number; color?: string; at: number; size?: number }> = ({
  a,
  b,
  swapAt,
  digits = 3,
  color = INK,
  at,
  size = 26,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10);
  const s = ease(frame, swapAt, 10);
  const flash = pulse(frame, swapAt, 24);
  if (p <= 0) return null;
  return (
    <span
      style={{
        fontFamily: MONO,
        fontWeight: 700,
        fontSize: size,
        color,
        opacity: p,
        background: flash > 0 ? `color-mix(in srgb, ${POINT} ${Math.round(flash * 22)}%, transparent)` : undefined,
        borderRadius: 4,
        ...TABULAR,
      }}
    >
      {(s < 0.5 ? a : b).toFixed(digits)}
    </span>
  );
};

export const BlendScene: React.FC = () => {
  const n = useNarration();
  const frame = useCurrentFrame();
  const { y } = useLayout();

  const from = n.beat("real").from;
  const arithmeticAt = n.word("real", "arithmetic");
  const twoAt = n.word("real", "two-number");
  const queryAt = n.word("dot", "query");
  const keyAt = n.word("dot", "key");
  const scoreAt = n.word("dot", "score");
  const weightsAt = n.word("dot", "weights");
  const pointAt = n.word("dot", "Point four six");
  const newAt = n.word("blend", "new");
  const blendAt = n.word("blend", "blend");
  const valuesAt = n.word("blend", "values");
  const towardAt = n.word("blend", "toward");
  const pointQAt = n.word("flip", "Point");
  const suitcaseAt = n.word("flip", "suitcase");
  const followsAt = n.word("flip", "follows");
  const differentAt = n.word("flip", "different", { nth: 1 });

  const A = QKV.trophy;
  const B = QKV.suitcase;
  const swapQ = pointQAt + 6;
  const swapS = suitcaseAt + 4;
  const swapW = followsAt - 6;

  const QY = y(390);
  const HY = y(500);
  const rowTop = (i: number) => y(550) + i * T_ROW;

  // Fig. 15: the plane of values, 0 to 10 on each axis.
  const PX0 = 1150;
  const PY0 = y(860);
  const PU = 44;
  const P = (v: readonly number[]) => [PX0 + v[0] * PU, PY0 - v[1] * PU] as const;
  const move = ease(frame, swapW, 30);
  const out = [lerp(A.output[0], B.output[0], move), lerp(A.output[1], B.output[1], move)];
  const w = A.weights.map((x, i) => lerp(x, B.weights[i], move));
  const [ox, oy] = P(out);
  const blendP = ease(frame, blendAt - 4, 18);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={queryAt} level={-26} />
      {[0, 1, 2].map((i) => (
        <Sfx key={i} name="el-tap" at={scoreAt + i * 4} level={-29} />
      ))}
      <Sfx name="el-tap" at={pointAt} level={-23} />
      <Sfx name="el-pop" at={blendAt} level={-29} />
      <Sfx name="el-tap" at={swapQ} level={-25} />
      <Sfx name="el-whoosh" at={swapW} level={-33} />

      <Kicker at={from - 10}>Attention</Kicker>
      <Headline lead="The real arithmetic," turn="on two numbers." at={from} turnAt={twoAt - 2} out={pointQAt - 8} />
      <Headline lead="A different question," turn="a different blend." at={pointQAt - 4} turnAt={differentAt - 2} />

      {/* ── Fig. 14: the lesson's keys, values and query ── */}
      <FigLabel n="14" title="The lesson's real vectors" at={from} x={X0} y={y(FIG_Y)} />
      <Fade at={arithmeticAt - 4} style={{ left: X0, top: QY, display: "flex", alignItems: "center", gap: 20 }}>
        <span style={{ ...label(24, QUERY_INK) }}>
          Query, from <span style={{ fontFamily: MONO, fontWeight: 600 }}>it</span>
        </span>
        <span style={{ borderRadius: 8, boxShadow: `0 0 0 ${4 * pulse(frame, swapQ, 26)}px color-mix(in srgb, ${POINT} 40%, transparent)` }}>
          <VectorCells values={frame < swapQ + 5 ? A.query : B.query} size={26} border={QUERY} fill={PAPER} />
        </span>
        <span style={{ opacity: ease(frame, swapQ + 4, 10), ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>pointed at suitcase</span>
      </Fade>
      <Fade at={arithmeticAt} style={{ left: 0, top: HY, width: 1100 }}>
        <span style={{ position: "absolute", left: T_X.tok, ...label(21, INK_SOFT) }}>Token</span>
        <span style={{ position: "absolute", left: T_X.key, ...label(21, KEY_INK) }}>Key</span>
        <span style={{ position: "absolute", left: T_X.value, ...label(21, VALUE_INK) }}>Value</span>
        <span style={{ position: "absolute", left: T_X.score, ...label(21, INK_SOFT), opacity: ease(frame, scoreAt - 2, 10) }}>Score</span>
        <span style={{ position: "absolute", left: T_X.weight, ...label(21, INK_SOFT), opacity: ease(frame, weightsAt - 2, 10) }}>Weight</span>
      </Fade>
      <Svg opacity={ease(frame, arithmeticAt, 12)}>
        <line x1={X0} x2={1000} y1={HY + 36} y2={HY + 36} stroke={INK} strokeWidth={1.6} />
      </Svg>
      {QKV.tokens.map((t, i) => {
        const p = ease(frame, arithmeticAt + 2 + i * 4, 12);
        if (p <= 0) return null;
        const keyGlow = pulse(frame, keyAt + i * 4, 22);
        const weightHot = i === 0 ? ease(frame, pointAt - 2, 10) * (1 - ease(frame, swapW, 10)) : i === 1 ? ease(frame, swapW + 4, 10) : 0;
        return (
          <div key={t} style={{ position: "absolute", left: 0, top: rowTop(i), width: 1100, height: T_ROW, opacity: p }}>
            <div style={{ position: "absolute", left: T_X.tok, top: 8 }}>
              <TokenChip text={t} size={24} />
            </div>
            <div style={{ position: "absolute", left: T_X.key, top: 6, borderRadius: 8, boxShadow: keyGlow > 0 ? `0 0 0 ${4 * keyGlow}px color-mix(in srgb, ${KEY} 45%, transparent)` : undefined }}>
              <VectorCells values={QKV.keys[i]} size={23} border={KEY} fill={PAPER} />
            </div>
            <div style={{ position: "absolute", left: T_X.value, top: 6 }}>
              <VectorCells values={QKV.values[i]} size={23} cell={70} border={VALUE} fill={PAPER} />
            </div>
            <span style={{ position: "absolute", left: T_X.score, top: 14 }}>
              <Swap a={A.scores[i]} b={B.scores[i]} at={scoreAt + i * 4} swapAt={swapS + i * 3} />
            </span>
            <span style={{ position: "absolute", left: T_X.weight, top: 14 }}>
              <Swap a={A.weights[i]} b={B.weights[i]} at={weightsAt + 4 + i * 4} swapAt={swapW + i * 3} color={weightHot > 0.5 ? POINT_INK : INK} />
            </span>
          </div>
        );
      })}
      <Note at={newAt - 2} x={X0} y={rowTop(3) + 24}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <span style={{ ...label(24, POINT_INK) }}>
            New vector for <span style={{ fontFamily: MONO, fontWeight: 600 }}>it</span>
          </span>
          <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 28, color: POINT_INK, ...TABULAR }}>
            {(move < 0.5 ? A.output : B.output).map((v) => v.toFixed(3)).join(", ")}
          </span>
        </div>
      </Note>

      {/* ── Fig. 15: the blend, in the plane of the values ── */}
      <FigLabel n="15" title="The new vector, a blend of the values" at={valuesAt - 6} x={1100} y={y(FIG_Y)} />
      <Svg opacity={ease(frame, valuesAt - 4, 14)}>
        <line x1={PX0} x2={PX0 + 10.6 * PU} y1={PY0} y2={PY0} stroke={LINE} strokeWidth={1.6} />
        <line x1={PX0} x2={PX0} y1={PY0} y2={PY0 - 10.6 * PU} stroke={LINE} strokeWidth={1.6} />
        <line x1={PX0} y1={PY0} x2={PX0 + 10 * PU} y2={PY0 - 10 * PU} stroke={FAINT} strokeWidth={1.4} strokeDasharray="5 7" />
        {[0, 5, 10].map((v) => (
          <g key={v}>
            <text x={PX0 + v * PU} y={PY0 + 30} textAnchor="middle" style={{ fontFamily: SANS, fontSize: 20, fontWeight: 500, fill: INK_SOFT }}>
              {v}
            </text>
            {v ? (
              <text x={PX0 - 14} y={PY0 - v * PU + 7} textAnchor="end" style={{ fontFamily: SANS, fontSize: 20, fontWeight: 500, fill: INK_SOFT }}>
                {v}
              </text>
            ) : null}
          </g>
        ))}
        {/* The pull of each value, as thick as its weight. */}
        {blendP > 0
          ? QKV.values.map((v, i) => {
              const [vx, vy] = P(v);
              return (
                <line
                  key={i}
                  x1={ox}
                  y1={oy}
                  x2={lerp(ox, vx, blendP)}
                  y2={lerp(oy, vy, blendP)}
                  stroke={VALUE}
                  strokeWidth={2 + 18 * w[i]}
                  strokeLinecap="round"
                  opacity={0.45}
                />
              );
            })
          : null}
        {QKV.values.map((v, i) => {
          const [vx, vy] = P(v);
          return <circle key={i} cx={vx} cy={vy} r={11} fill={VALUE} />;
        })}
        {blendP > 0 ? <circle cx={ox} cy={oy} r={13 + 5 * pulse(frame, towardAt, 24)} fill={POINT} /> : null}
      </Svg>
      {QKV.tokens.map((t, i) => {
        const [vx, vy] = P(QKV.values[i]);
        const right = i === 2;
        return (
          <div
            key={t}
            style={{
              position: "absolute",
              left: i === 0 ? vx + 18 : right ? vx + 16 : vx + 22,
              top: i === 0 ? vy - 46 : right ? vy + 14 : vy - 16,
              opacity: ease(frame, valuesAt - 2 + i * 3, 10),
              ...label(21, VALUE_INK),
              whiteSpace: "nowrap",
              ...halo,
            }}
          >
            {t}&apos;s value
          </div>
        );
      })}
      <div style={{ position: "absolute", left: ox + 22, top: oy - 44, opacity: blendP, ...label(22, POINT_INK), whiteSpace: "nowrap", ...halo }}>
        new vector
      </div>
    </AbsoluteFill>
  );
};

// ═══ Scene 10: heads, layers, and the square of the length ═════════════════

/** A seeded mini attention pattern for one head: which cells light. Purely
 *  schematic: it says "each head attends differently", not any real weights. */
const HEAD_KINDS = [
  (r: number, c: number) => r === c,
  (r: number, c: number) => c === r - 1 || (r === 0 && c === 0),
  (_r: number, c: number) => c === 0,
  (r: number, c: number) => c <= r && (r + c) % 2 === 0,
];

const HeadBox: React.FC<{ x: number; y: number; kind: number; at: number; w: number; h: number }> = ({ x, y, kind, at, w, h }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  if (p <= 0) return null;
  const N = 5;
  const cell = Math.min((w - 24) / N, (h - 20) / N);
  return (
    <g opacity={p} transform={`translate(${x}, ${y + (1 - p) * 10})`}>
      <rect width={w} height={h} rx={10} fill={PAPER} stroke={INK} strokeWidth={1.8} />
      {Array.from({ length: N * N }, (_, k) => {
        const r = Math.floor(k / N);
        const c = k % N;
        const on = HEAD_KINDS[kind](r, c);
        return (
          <rect
            key={k}
            x={(w - cell * N) / 2 + c * cell + 1.5}
            y={(h - cell * N) / 2 + r * cell + 1.5}
            width={cell - 3}
            height={cell - 3}
            rx={2}
            fill={on ? DATA : DATA_TINT}
          />
        );
      })}
    </g>
  );
};

export const HeadsScene: React.FC = () => {
  const n = useNarration();
  const frame = useCurrentFrame();
  const { y } = useLayout();

  const from = n.beat("heads").from;
  const sideAt = n.word("heads", "side by side");
  const headsAt = n.word("heads", "heads");
  const ownAt = n.word("heads", "own");
  const stacksAt = n.word("heads", "stacks");
  const dozensAt = n.word("heads", "dozens");
  const priceAt = n.word("square", "price");
  const everyAt = n.word("square", "every", { nth: 1 });
  const tenAt = n.word("square", "Ten");
  const hundredAt = n.word("square", "hundred");
  const doubleAt = n.word("square", "Double");
  const fourAt = n.word("square", "four");
  const piecesAt = n.word("attn-in", "pieces");

  // Fig. 16: four heads across, four layers up.
  const HX = X0 + 40;
  const HW = 140;
  const HH = 104;
  const GAP = 22;
  const baseY = y(850);
  const layerAt = (r: number) => (r === 0 ? sideAt : stacksAt + (r - 1) * 6);

  // Fig. 17: the score grid, cells of a fixed size, so twice the tokens is four times the area.
  const [small, big] = COST;
  const CELL = 27;
  const GX = 1120;
  const GY = y(400);
  const fill10 = ease(frame, tenAt - 2, 26);
  const fill20 = ease(frame, doubleAt - 2, 30);

  return (
    <AbsoluteFill>
      {[0, 1, 2, 3].map((c) => (
        <Sfx key={c} name="el-tap" at={sideAt + c * 4} level={-29} />
      ))}
      <Sfx name="el-whoosh" at={stacksAt} level={-34} />
      <Sfx name="el-pencil" at={tenAt - 2} level={-34} />
      <Sfx name="el-tap" at={hundredAt} level={-24} />
      <Sfx name="el-pencil" at={doubleAt - 2} level={-33} />
      <Sfx name="el-tap" at={fourAt} level={-24} />

      <Kicker at={from - 10}>Attention</Kicker>
      <Headline lead="Many heads," turn="many layers." at={from} turnAt={stacksAt - 4} out={priceAt - 8} />
      <Headline lead="Twice the text," turn="four times the work." at={doubleAt - 4} turnAt={fourAt - 2} />
      <Headline lead="Every token scores every other." at={priceAt - 2} out={doubleAt - 8} />

      {/* ── Fig. 16: heads side by side, layers stacked ── */}
      <FigLabel n="16" title="Heads side by side, layers stacked" at={from} x={X0} y={y(FIG_Y)} />
      <Svg>
        {[0, 1, 2, 3].map((r) =>
          [0, 1, 2, 3].map((c) => (
            <HeadBox
              key={`${r}-${c}`}
              x={HX + c * (HW + GAP)}
              y={baseY - HH - r * (HH + GAP) - 10 * pulse(frame, piecesAt + (3 - r) * 4 + c * 2, 22)}
              kind={c}
              at={layerAt(r) + c * 4}
              w={HW}
              h={HH}
            />
          )),
        )}
      </Svg>
      <Fade at={headsAt} style={{ left: HX, top: baseY + 16, width: 4 * HW + 3 * GAP, textAlign: "center" }}>
        <Tag size={22}>Heads, side by side</Tag>
      </Fade>
      <Fade at={dozensAt - 2} style={{ left: HX + 4 * (HW + GAP) + 6, top: baseY - 4 * (HH + GAP) + 10 }}>
        <div style={{ ...note(30, FAINT), lineHeight: 1 }}>⋮</div>
      </Fade>
      <Fade at={dozensAt - 2} style={{ left: HX + 4 * (HW + GAP) + 6, top: baseY - 2 * (HH + GAP) }}>
        <Tag size={22}>Dozens of layers</Tag>
      </Fade>
      <Note at={ownAt - 2} x={HX} y={baseY - 4 * (HH + GAP) - 40}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>Each head, its own idea of relevant</span>
      </Note>

      {/* ── Fig. 17: every token against every other ── */}
      <FigLabel n="17" title="Every token scores every other one" at={everyAt - 4} x={GX} y={y(FIG_Y)} />
      <Svg opacity={ease(frame, everyAt - 2, 12)}>
        {Array.from({ length: big.n * big.n }, (_, k) => {
          const r = Math.floor(k / big.n);
          const c = k % big.n;
          const inner = r < small.n && c < small.n;
          const order = inner ? (r + c) / (2 * small.n) : (r + c - small.n) / (2 * big.n);
          const p = inner ? clamp01((fill10 - order * 0.7) / 0.3) : clamp01((fill20 - order * 0.7) / 0.3);
          return (
            <rect
              key={k}
              x={GX + c * CELL + 1.5}
              y={GY + r * CELL + 1.5}
              width={CELL - 3}
              height={CELL - 3}
              rx={2}
              fill={inner ? DATA : `color-mix(in srgb, ${DATA} 55%, ${PAPER})`}
              opacity={p}
            />
          );
        })}
        <rect x={GX} y={GY} width={small.n * CELL} height={small.n * CELL} fill="none" stroke={INK} strokeWidth={2} opacity={fill10} />
        <rect x={GX} y={GY} width={big.n * CELL} height={big.n * CELL} fill="none" stroke={INK} strokeWidth={2} opacity={fill20} />
      </Svg>
      <div style={{ position: "absolute", left: GX, top: GY - 52, opacity: fill10 }}>
        <span style={{ ...note(28, INK), fontWeight: 650, ...TABULAR }}>
          {small.n} tokens: <Mark at={hundredAt}>{small.scores} scores</Mark>
        </span>
      </div>
      <div style={{ position: "absolute", left: GX + big.n * CELL + 24, top: GY + big.n * CELL - 70, opacity: ease(frame, fourAt - 2, 10) }}>
        <div style={{ ...note(28, INK), fontWeight: 650, ...TABULAR, whiteSpace: "nowrap" }}>{big.n} tokens:</div>
        <div style={{ ...note(28, POINT_INK), fontWeight: 650, ...TABULAR, whiteSpace: "nowrap" }}>{big.scores} scores</div>
      </div>
    </AbsoluteFill>
  );
};
