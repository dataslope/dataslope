import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, body, halo, headline, INK, INK_SOFT, label, note, PAPER, TABULAR } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO, SANS } from "../../theme/fonts";
import { COST, QKV } from "./data";
import {
  Arrow,
  clamp01,
  fix,
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

// ═══ Scene 8: query, key and value, made from one token's embedding ════════

const QKV_ROWS = [
  { name: "Query", ask: "What am I looking for?", color: QUERY, ink: QUERY_INK },
  { name: "Key", ask: "What do I offer?", color: KEY, ink: KEY_INK },
  { name: "Value", ask: "What I hand over when I'm picked.", color: VALUE, ink: VALUE_INK },
];
const STRIP_X = 220;
const STRIP_CELLS = 9;
const STRIP_W = 34;
const VX = 720;
const TX = 900;

export const QkvScene: React.FC = () => {
  const n = useNarration();
  const frame = useCurrentFrame();
  const { y } = useLayout();

  const from = n.beat("query-vec").from;
  const embeddingAt = n.word("query-vec", "embedding");
  const threeAt = n.word("query-vec", "three");
  const queryAt = n.word("query-vec", "query");
  const keyAt = n.word("key", "key");
  const valueAt = n.word("value", "value");
  const handAt = n.word("value", "hand over");
  const pickedAt = n.word("value", "picked");

  const nameAt = [queryAt, keyAt, valueAt];
  // The lesson's own numbers for "it": its query, and the key and value of its row.
  const itRow = QKV.tokens.length - 1;
  const vecs = [QKV.trophy.query, QKV.keys[itRow], QKV.values[itRow]];
  const rowTop = (i: number) => y(400 + i * 140);
  const stripTop = rowTop(1);
  const stripMid = stripTop + 21;
  const stripEnd = STRIP_X + STRIP_CELLS * STRIP_W;
  const glow = pulse(frame, embeddingAt, 30);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={from + 4} level={-31} />
      {[0, 1, 2].map((i) => (
        <Sfx key={`a${i}`} name="el-pencil" at={threeAt + i * 4} level={-36} />
      ))}
      {nameAt.map((t, i) => (
        <Sfx key={i} name="el-tap" at={t} level={-25} />
      ))}

      <Kicker at={from - 10}>Attention</Kicker>
      <div style={{ position: "absolute", left: 92, top: y(HEAD_Y), display: "flex", gap: "0.26em", ...headline(72) }}>
        {["Query,", "key,", "value."].map((w, i) => (
          <Ink key={w} at={nameAt[i] - 4} dur={18} style={{ position: "relative", whiteSpace: "nowrap", color: QKV_ROWS[i].ink, fontStyle: i ? "italic" : "normal" }}>
            {w}
          </Ink>
        ))}
      </div>

      {/* ── Fig. 12: one token's embedding becomes three vectors ── */}
      <FigLabel n="12" title="Three vectors, made from the embedding of “it”" at={from} x={X0} y={y(FIG_Y)} />
      <Fade at={from + 2} style={{ left: X0, top: stripTop, display: "flex", alignItems: "center" }}>
        <TokenChip text="it" size={26} />
      </Fade>
      <Fade at={from + 6} style={{ left: STRIP_X, top: stripTop - 2, display: "flex" }}>
        {Array.from({ length: STRIP_CELLS }, (_, i) => (
          <span
            key={i}
            style={{
              width: STRIP_W - 4,
              height: 44,
              marginRight: 4,
              borderRadius: 4,
              border: `1.5px solid ${DATA}`,
              background: `color-mix(in srgb, ${DATA} ${Math.round(22 + 30 * glow)}%, ${PAPER})`,
            }}
          />
        ))}
      </Fade>
      <Note at={embeddingAt - 2} x={STRIP_X} y={stripTop - 40}>
        <Tag size={21} color={BLUE_INK}>
          Its embedding
        </Tag>
      </Note>
      <Fade at={threeAt} style={{ left: VX, top: y(352) }}>
        <Tag size={20}>The lesson&apos;s numbers for it</Tag>
      </Fade>
      {QKV_ROWS.map((r, i) => {
        const top = rowTop(i);
        const named = ease(frame, nameAt[i] - 2, 10);
        return (
          <React.Fragment key={r.name}>
            <Arrow from={[stripEnd + 14, stripMid]} to={[VX - 18, top + 22]} at={threeAt + i * 4} color={r.color} width={2.6} />
            <Fade at={threeAt + i * 4 + 6} style={{ left: VX, top }}>
              <span style={{ position: "relative", display: "inline-block" }}>
                <span style={{ opacity: 1 - named }}>
                  <VectorCells values={[0, 0]} size={24} border={r.color} fill={PAPER} color="transparent" />
                </span>
                <span style={{ position: "absolute", left: 0, top: 0, opacity: named }}>
                  <VectorCells values={vecs[i]} size={24} border={r.color} fill={PAPER} />
                </span>
              </span>
            </Fade>
            <Fade at={nameAt[i] - 4} style={{ left: TX, top: top - 10 }}>
              <div style={{ ...label(26, r.ink) }}>{r.name}</div>
              <div style={{ ...body(34, true), color: INK, marginTop: 6, whiteSpace: "nowrap" }}>
                {i === 2 ? (
                  <>
                    What I <Mark at={handAt}>hand over</Mark> when I&apos;m <Mark at={pickedAt}>picked.</Mark>
                  </>
                ) : (
                  r.ask
                )}
              </div>
            </Fade>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

// ═══ Scene 9: one score worked through, and the blend it makes ═════════════

const T_X = { tok: X0, key: 310, value: 500, score: 700, weight: 890 };
const T_ROW = 78;

/** A number that changes in place through `steps`, each inked on its frame
 *  with a brief flash; nothing shows before the first. */
const Steps: React.FC<{ steps: readonly { at: number; value: number; digits: number }[]; color?: string; size?: number }> = ({
  steps,
  color = INK,
  size = 26,
}) => {
  const frame = useCurrentFrame();
  const shown = [...steps].reverse().find((s) => frame >= s.at);
  if (!shown) return null;
  const p = ease(frame, steps[0].at, 10);
  const flash = Math.max(...steps.map((s) => pulse(frame, s.at, 24)));
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
      {shown.value.toFixed(shown.digits)}
    </span>
  );
};

/** One score written out: the dot product of a query and a key, then the
 *  division by the square root of the dimension. */
const WorkedScore: React.FC<{
  token: string;
  q: readonly number[];
  k: readonly number[];
  dot: number;
  score: number;
  multiplyAt: number;
  addAt: number;
  equalsAt: number;
  nameAt: number;
  rootAt: number;
}> = ({ token, q, k, dot, score, multiplyAt, addAt, equalsAt, nameAt, rootAt }) => {
  const frame = useCurrentFrame();
  const step = (at: number) => ({ opacity: ease(frame, at, 10) });
  const named = ease(frame, nameAt, 12);
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 14, whiteSpace: "nowrap", fontFamily: MONO, fontWeight: 600, fontSize: 26, color: INK, ...TABULAR }}>
      <span style={{ ...label(22, INK_SOFT), fontFamily: undefined }}>{token}:</span>
      <span style={{ position: "relative", display: "inline-flex", gap: 14 }}>
        <span style={step(multiplyAt)}>
          <span style={{ color: QUERY_INK }}>{fix(q[0])}</span> × <span style={{ color: KEY_INK }}>{fix(k[0])}</span>
        </span>
        <span style={step(addAt)}>
          + <span style={{ color: QUERY_INK }}>{fix(q[1])}</span> × <span style={{ color: KEY_INK }}>{fix(k[1])}</span>
        </span>
        <span style={step(equalsAt)}>= {dot.toFixed(2)}</span>
        <span
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "100%",
            marginTop: 6,
            borderTop: `2px solid ${POINT}`,
            opacity: named,
            textAlign: "center",
          }}
        >
          <span style={{ ...label(20, POINT_INK) }}>a dot product</span>
        </span>
      </span>
      <span style={step(rootAt)}>
        ÷ √{QKV.dim} = <span style={{ color: POINT_INK }}>{score.toFixed(3)}</span>
      </span>
    </div>
  );
};

export const BlendScene: React.FC = () => {
  const n = useNarration();
  const frame = useCurrentFrame();
  const { y } = useLayout();

  const from = n.beat("scores").from;
  const queryAt = n.word("scores", "query");
  const everyKeyAt = n.word("scores", "every key");
  const scoreWordAt = n.word("scores", "score");
  const multiplyAt = n.word("dot", "Multiply");
  const addAt = n.word("dot", "add");
  const dotProductAt = n.word("dot", "dot product");
  const cosineAt = n.word("dot", "cosine");
  const dividingAt = n.word("dot", "dividing");
  const thenAt = n.word("scale", "Then");
  const scaleVectorAt = n.word("scale", "vector");
  const thatAt = n.word("scale", "That");
  const weightsPronounAt = n.word("weights", "pronoun's");
  const dividedAt = n.word("scale", "divided");
  const rootAt = n.word("scale", "square root");
  const smallAt = n.word("scale", "small");
  const softmaxAt = n.word("softmax", "Softmax");
  const weightsWordAt = n.word("softmax", "weights");
  const oneAt = n.word("softmax", "one");
  const pointAt = n.word("weights", "Point four six");
  const trophyWAt = n.word("weights", "trophy");
  const newAt = n.word("blend", "new");
  const blendAt = n.word("blend", "blend");
  const valuesAt = n.word("blend", "values");
  const towardAt = n.word("blend", "toward");
  const blendPronounsAt = n.word("blend", "pronoun's");
  const pointQAt = n.word("flip", "Point");
  const suitcaseAt = n.word("flip", "suitcase");
  const followsAt = n.word("flip", "follows");
  const differentAt = n.word("flip", "different", { nth: 1 });
  const flipQuestionAt = n.word("flip", "question");
  const answerAt = n.word("flip", "answer");

  const A = QKV.trophy;
  const B = QKV.suitcase;
  const swapQ = pointQAt + 6;
  const swapS = suitcaseAt + 4;
  const swapW = followsAt - 6;
  const dotsAt = addAt + 10;

  const QY = y(370);
  const HY = y(460);
  const rowTop = (i: number) => y(505) + i * T_ROW;
  const workY = rowTop(3) + 12;

  // Fig. 14: the plane of values, 0 to 10 on each axis.
  const PX0 = 1150;
  const PY0 = y(860);
  const PU = 44;
  const P = (v: readonly number[]) => [PX0 + v[0] * PU, PY0 - v[1] * PU] as const;
  const move = ease(frame, swapW, 30);
  const out = [lerp(A.output[0], B.output[0], move), lerp(A.output[1], B.output[1], move)];
  const w = A.weights.map((x, i) => lerp(x, B.weights[i], move));
  const [ox, oy] = P(out);
  const blendP = ease(frame, blendAt - 4, 18);
  const flipLine = ease(frame, swapS, 12);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={queryAt} level={-26} />
      <Sfx name="el-pencil" at={multiplyAt} level={-35} />
      {[0, 1, 2].map((i) => (
        <Sfx key={i} name="el-tap" at={dotsAt + i * 4} level={-29} />
      ))}
      <Sfx name="el-tap" at={rootAt} level={-26} />
      {[0, 1, 2].map((i) => (
        <Sfx key={`w${i}`} name="el-tap" at={weightsWordAt + i * 4} level={-29} />
      ))}
      <Sfx name="el-tap" at={pointAt} level={-24} />
      <Sfx name="el-pop" at={blendAt} level={-29} />
      <Sfx name="el-tap" at={swapQ} level={-25} />
      <Sfx name="el-whoosh" at={swapW} level={-33} />

      <Kicker at={from - 10}>Attention</Kicker>
      <Headline lead="A score for every key." at={from} out={dotProductAt - 8} />
      <Headline lead="A dot product," turn="then softmax." at={dotProductAt - 4} turnAt={softmaxAt - 2} out={pointQAt - 8} />
      <Headline lead="A different question," turn="a different blend." at={pointQAt - 4} turnAt={differentAt - 2} />

      {/* ── Fig. 13: the lesson's keys, values and query, and the scores they make ── */}
      <FigLabel n="13" title="The lesson's real vectors, three tokens of two numbers" at={from} x={X0} y={y(FIG_Y)} />
      <Fade at={from + 2} style={{ left: X0, top: QY, display: "flex", alignItems: "center", gap: 20 }}>
        <span style={{ ...label(24, QUERY_INK) }}>
          Query, from <span style={{ fontFamily: MONO, fontWeight: 600 }}>it</span>
        </span>
        <span
          style={{
            borderRadius: 8,
            boxShadow: `0 0 0 ${5 * (pulse(frame, swapQ, 26) + pulse(frame, queryAt, 26) + pulse(frame, flipQuestionAt, 26) + pulse(frame, scaleVectorAt - 6, 26))}px color-mix(in srgb, ${POINT} 40%, transparent)`,
          }}
        >
          <VectorCells values={frame < swapQ + 5 ? A.query : B.query} size={26} border={QUERY} fill={PAPER} />
        </span>
        <span style={{ opacity: ease(frame, swapQ + 4, 10), ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>pointed at suitcase</span>
      </Fade>
      <Fade at={from + 6} style={{ left: 0, top: HY, width: 1100 }}>
        <span style={{ position: "absolute", left: T_X.tok, ...label(21, INK_SOFT) }}>Token</span>
        <span style={{ position: "absolute", left: T_X.key, ...label(21, KEY_INK) }}>Key</span>
        <span style={{ position: "absolute", left: T_X.value, ...label(21, VALUE_INK) }}>Value</span>
        <span style={{ position: "absolute", left: T_X.score, ...label(21, INK_SOFT), opacity: ease(frame, scoreWordAt - 2, 10) }}>
          Score
          <span style={{ marginLeft: 10, color: POINT_INK, opacity: ease(frame, dividedAt, 10) }}>÷ √{QKV.dim}</span>
        </span>
        <span style={{ position: "absolute", left: T_X.weight, ...label(21, INK_SOFT), opacity: ease(frame, weightsWordAt - 2, 10) }}>Weight</span>
      </Fade>
      <Svg opacity={ease(frame, from + 6, 12)}>
        <line x1={X0} x2={1010} y1={HY + 36} y2={HY + 36} stroke={INK} strokeWidth={1.6} />
        {/* "Then it's divided": the score column, outlined. */}
        <rect
          x={T_X.score - 14}
          y={rowTop(0) + 2}
          width={150}
          height={3 * T_ROW - 10}
          rx={8}
          fill="none"
          stroke={POINT}
          strokeWidth={2.4}
          opacity={pulse(frame, thenAt - 2, 40)}
        />
      </Svg>
      {QKV.tokens.map((t, i) => {
        const p = ease(frame, from + 8 + i * 4, 12);
        if (p <= 0) return null;
        const keyGlow = pulse(frame, everyKeyAt + i * 4, 22) + pulse(frame, scaleVectorAt + i * 3, 26);
        const weightHot = i === 0 ? ease(frame, pointAt - 2, 10) * (1 - ease(frame, swapW, 10)) : i === 1 ? ease(frame, swapW + 4, 10) : 0;
        return (
          <div key={t} style={{ position: "absolute", left: 0, top: rowTop(i), width: 1100, height: T_ROW, opacity: p }}>
            {i === 0 ? (
              <div
                style={{
                  position: "absolute",
                  left: X0 - 12,
                  top: 0,
                  width: 1010 - X0 + 24,
                  height: T_ROW - 10,
                  borderRadius: 8,
                  background: `color-mix(in srgb, ${POINT} ${Math.round(10 * ease(frame, weightsPronounAt - 2, 12) * (1 - ease(frame, swapW, 12)))}%, transparent)`,
                }}
              />
            ) : null}
            <div style={{ position: "absolute", left: T_X.tok, top: 8 }}>
              <TokenChip text={t} size={24} />
            </div>
            <div
              style={{
                position: "absolute",
                left: T_X.key,
                top: 6,
                borderRadius: 8,
                boxShadow: keyGlow > 0 ? `0 0 0 ${4 * keyGlow}px color-mix(in srgb, ${KEY} 45%, transparent)` : undefined,
              }}
            >
              <VectorCells values={QKV.keys[i]} size={23} border={KEY} fill={PAPER} />
            </div>
            <div style={{ position: "absolute", left: T_X.value, top: 6 }}>
              <VectorCells values={QKV.values[i]} size={23} cell={70} border={VALUE} fill={PAPER} />
            </div>
            <span style={{ position: "absolute", left: T_X.score, top: 14 }}>
              <Steps
                steps={[
                  { at: dotsAt + i * 4, value: A.dots[i], digits: 2 },
                  { at: rootAt + i * 3, value: A.scores[i], digits: 3 },
                  { at: swapS + i * 3, value: B.scores[i], digits: 3 },
                ]}
              />
            </span>
            <span
              style={{
                position: "absolute",
                left: T_X.weight,
                top: 14,
                borderRadius: 6,
                boxShadow: i === 0 ? `0 0 0 ${5 * pulse(frame, trophyWAt, 30)}px color-mix(in srgb, ${POINT} 35%, transparent)` : undefined,
              }}
            >
              <Steps
                steps={[
                  { at: weightsWordAt + i * 4, value: A.weights[i], digits: 3 },
                  { at: swapW + i * 3, value: B.weights[i], digits: 3 },
                ]}
                color={weightHot > 0.5 ? POINT_INK : INK}
              />
            </span>
          </div>
        );
      })}
      <Svg opacity={ease(frame, oneAt - 4, 10)}>
        <line x1={T_X.weight - 10} x2={T_X.weight + 110} y1={rowTop(3) - 6} y2={rowTop(3) - 6} stroke={INK} strokeWidth={1.4} />
      </Svg>
      <Fade at={oneAt - 2} style={{ left: T_X.weight - 74, top: rowTop(3) + 2, display: "flex", gap: 14, alignItems: "baseline" }}>
        <span style={{ ...label(21, INK_SOFT) }}>Total</span>
        <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 26, color: INK, ...TABULAR }}>
          {A.weightSum.toFixed(3)}
        </span>
      </Fade>

      {/* One score written out: trophy's, then suitcase's once the query turns. */}
      <div style={{ position: "absolute", left: X0, top: workY + 52, opacity: 1 - flipLine }}>
        <WorkedScore
          token="trophy"
          q={A.query}
          k={QKV.keys[0]}
          dot={A.dots[0]}
          score={A.scores[0]}
          multiplyAt={multiplyAt}
          addAt={addAt}
          equalsAt={addAt + 8}
          nameAt={dotProductAt}
          rootAt={rootAt}
        />
      </div>
      <div style={{ position: "absolute", left: X0, top: workY + 52, opacity: flipLine }}>
        <WorkedScore
          token="suitcase"
          q={B.query}
          k={QKV.keys[1]}
          dot={B.dots[1]}
          score={B.scores[1]}
          multiplyAt={swapS}
          addAt={swapS}
          equalsAt={swapS}
          nameAt={swapS}
          rootAt={swapS}
        />
      </div>
      <Note at={newAt - 2} x={X0} y={workY + 150}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <span style={{ ...label(24, POINT_INK) }}>
            New vector for <span style={{ fontFamily: MONO, fontWeight: 600 }}>it</span>
          </span>
          <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 28, color: POINT_INK, ...TABULAR }}>
            {(move < 0.5 ? A.output : B.output).map((v) => v.toFixed(3)).join(", ")}
          </span>
        </div>
      </Note>

      {/* The tie to cosine, while the right half waits for the blend. */}
      <Note at={cosineAt - 2} out={blendPronounsAt - 8} x={1100} y={y(400)} width={640}>
        <div style={{ ...body(34), color: INK }}>
          Cosine similarity is this <Mark at={cosineAt + 4}>dot product</Mark>,{" "}
          <Mark at={dividingAt}>divided by both vectors&apos; lengths.</Mark>
        </div>
      </Note>
      <Note at={thatAt - 2} out={blendPronounsAt - 8} x={1100} y={y(560)} width={640}>
        <div style={{ ...note(26, INK_SOFT) }}>
          Dividing by √{QKV.dim}, the square root of the vector size, <Mark at={smallAt - 2}>keeps the scores small</Mark> as vectors grow.
        </div>
      </Note>

      {/* ── Fig. 14: the blend, in the plane of the values ── */}
      <FigLabel n="14" title="The new vector, a blend of the values" at={blendPronounsAt - 4} x={1100} y={y(FIG_Y)} />
      <Svg opacity={ease(frame, blendPronounsAt - 2, 14)}>
        <line x1={PX0} x2={PX0 + 10.6 * PU} y1={PY0} y2={PY0} stroke={LINE} strokeWidth={1.6} />
        <line x1={PX0} x2={PX0} y1={PY0} y2={PY0 - 10.6 * PU} stroke={LINE} strokeWidth={1.6} />
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
        {blendP > 0 && pulse(frame, answerAt, 30) > 0 ? (
          <circle cx={ox} cy={oy} r={18 + 18 * pulse(frame, answerAt, 30)} fill="none" stroke={POINT} strokeWidth={2.6} opacity={pulse(frame, answerAt, 30)} />
        ) : null}
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
            value of <span style={{ fontFamily: MONO, fontWeight: 600 }}>{t}</span>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: ox + 44, top: oy - 64, opacity: blendP, ...label(22, POINT_INK), whiteSpace: "nowrap", ...halo }}>
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
  const itselfAt = n.word("square", "itself");
  const tenAt = n.word("ten", "Ten");
  const hundredAt = n.word("ten", "hundred");
  const doubleAt = n.word("ten", "Double");
  const fourAt = n.word("ten", "four");
  const workAt = n.word("ten", "work");
  const soAt = n.word("attn-in", "So");
  const putAt = n.word("attn-in", "put");

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
      <Headline lead="Every token scores every token." at={priceAt - 2} out={doubleAt - 8} />

      {/* ── Fig. 16: heads side by side, layers stacked ── */}
      <FigLabel n="15" title="Heads side by side, layers stacked" at={from} x={X0} y={y(FIG_Y)} />
      <Svg>
        {[0, 1, 2, 3].map((r) =>
          [0, 1, 2, 3].map((c) => (
            <HeadBox
              key={`${r}-${c}`}
              x={HX + c * (HW + GAP)}
              y={baseY - HH - r * (HH + GAP) - 10 * pulse(frame, putAt + (3 - r) * 4 + c * 2, 22)}
              kind={(c + r) % 4}
              at={layerAt(r) + c * 4}
              w={HW}
              h={HH}
            />
          )),
        )}
      </Svg>
      {/* How to read a head: rows are the token doing the looking, columns the token looked at. */}
      <Fade at={sideAt + 6} style={{ left: HX, top: baseY + 4 }}>
        <Tag size={20}>to →</Tag>
      </Fade>
      <Fade at={sideAt + 6} style={{ left: HX - 34, top: baseY - HH / 2 - 14, transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}>
        <Tag size={20}>from</Tag>
      </Fade>
      <Fade at={headsAt} style={{ left: HX, top: baseY + 38, width: 4 * HW + 3 * GAP, textAlign: "center" }}>
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
      <FigLabel n="16" title="Every token scores every token, itself included" at={everyAt - 4} x={GX} y={y(FIG_Y)} />
      <Svg opacity={ease(frame, everyAt - 2, 12) * (1 - 0.5 * ease(frame, soAt, 16))}>
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
        {/* "Itself included": the diagonal, each token scoring itself. */}
        {Array.from({ length: small.n }, (_, k) => (
          <rect
            key={`d${k}`}
            x={GX + k * CELL + 1.5}
            y={GY + k * CELL + 1.5}
            width={CELL - 3}
            height={CELL - 3}
            rx={2}
            fill="none"
            stroke={POINT}
            strokeWidth={2.4}
            opacity={ease(frame, itselfAt - 2 + k * 1.5, 8)}
          />
        ))}
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
        <div style={{ ...note(28, POINT_INK), fontWeight: 650, ...TABULAR, whiteSpace: "nowrap" }}>
          <Mark at={workAt}>{big.scores} scores</Mark>
        </div>
      </div>
    </AbsoluteFill>
  );
};
