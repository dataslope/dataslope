import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { Pt } from "../../components/arrow";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { halo, INK, INK_SOFT, label, TABULAR } from "../../editorial/style";
import { FigLabel } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO, SANS } from "../../theme/fonts";
import { KEYS, SUITCASE, three, TOKENS, TROPHY, two, VALUES } from "./data";
import {
  Cells,
  Fade,
  FIG_Y,
  Headline,
  KEY,
  KEY_INK,
  Kicker,
  lerp,
  LINE,
  Mono,
  POINT,
  POINT_INK,
  pulse,
  QUERY,
  QUERY_INK,
  Svg,
  Swap,
  TokenChip,
  VALUE,
  VALUE_INK,
  VecArrow,
  X0,
} from "./parts";

// ═══ Scene 4: the blend of the values, and the query turned to suitcase ════

const M = { chip: 600, key: 752, dot: 905, score: 1015, weight: 1135 };
const NUM = 28;
const A = TROPHY;
const B = SUITCASE;

/** "(10, 0)" */
const pair = (v: readonly number[], f = (x: number) => String(x)) => `(${v.map(f).join(", ")})`;
const blendLines = (a: typeof A) => {
  const w = a.rows.map((r) => three(r.weight));
  return [
    `${w[0]} × ${pair(VALUES[0])} + ${w[1]} × ${pair(VALUES[1])}`,
    `+ ${w[2]} × ${pair(VALUES[2])} = ${pair(a.output2, (x) => x.toFixed(2))}`,
  ];
};

export const BlendScene: React.FC = () => {
  const n = useNarration();
  const frame = useCurrentFrame();
  const { y } = useLayout();

  const from = n.beat("blend").from;
  const newAt = n.word("blend", "new vector");
  const valuesAt = n.word("blend", "values");
  const scaledAt = n.word("blend", "scaled");
  const weightAt = n.word("blend", "weight");
  const addedAt = n.word("blend", "added");
  const trophysAt = n.word("lands", "trophy's");
  const hardestAt = n.word("lands", "hardest");
  const turnAt = n.word("flip", "turn");
  const towardAt = n.word("flip", "toward suitcase");
  const runAt = n.word("flip", "run it again");
  const winsAt = n.word("swap", "wins");
  const sixAt = n.word("swap", "one point oh six");
  const takesAt = n.word("swap", "takes");
  const fourSevenAt = n.word("swap", "point four seven");
  const swingsAt = n.word("swap", "swings");
  const questionAt = n.word("answer", "question");
  const answerAt = n.word("answer", "answer");

  // ── Fig. 8: the query, turning ──
  const KO: Pt = [170, y(780)];
  const KU = 300;
  const K = (v: readonly number[]): Pt => [KO[0] + v[0] * KU, KO[1] - v[1] * KU];
  const turn = ease(frame, turnAt - 2, 30);
  // Both queries point into the first quadrant, so the angle is atan(y / x).
  const angA = Math.atan(A.query[1] / A.query[0]);
  const angB = Math.atan(B.query[1] / B.query[0]);
  const lenA = Math.hypot(A.query[0], A.query[1]);
  const lenB = Math.hypot(B.query[0], B.query[1]);
  const ang = lerp(angA, angB, turn);
  const len = lerp(lenA, lenB, turn);
  const qTip = K([len * Math.cos(ang), len * Math.sin(ang)]);
  const keyTips = KEYS.map(K);

  // ── Fig. 9: the ledger ──
  const qY = y(385);
  const headY = y(470);
  const rowY = (i: number) => y(530) + i * 80;
  const dotSwap = (i: number) => runAt + 4 + i * 4;
  const scoreSwap = (i: number) => runAt + 16 + i * 4;
  const weightSwap = (i: number) => takesAt - 2 + i * 4;
  const exprY = y(785);
  // Once the query turns, the old weights and blend wait, dimmed, for the new.
  const stale = ease(frame, runAt, 10);
  const dimUntil = (swap: number) => 1 - 0.65 * stale * (1 - ease(frame, swap, 10));

  // ── Fig. 10: the plane of the values, 0 to 10 ──
  const VO: Pt = [1300, y(780)];
  const VU = 36;
  const V = (v: readonly number[]): Pt => [VO[0] + v[0] * VU, VO[1] - v[1] * VU];
  const move = ease(frame, swingsAt - 4, 30);
  const out = [lerp(A.output2[0], B.output2[0], move), lerp(A.output2[1], B.output2[1], move)];
  const w = A.rows.map((r, i) => lerp(r.weight, B.rows[i].weight, move));
  const [ox, oy] = V(out);
  const springs = ease(frame, scaledAt - 2, 20);
  const point = ease(frame, addedAt - 2, 12);
  const ring = pulse(frame, answerAt, 34);
  // "Pulls hardest": the thickest spring, trophy's, swells.
  const hardest = pulse(frame, hardestAt, 30);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={valuesAt - 2} level={-31} />
      <Sfx name="el-pencil" at={scaledAt - 2} level={-35} />
      <Sfx name="el-tap" at={addedAt} level={-23} />
      <Sfx name="el-whoosh" at={turnAt - 2} level={-33} />
      {[0, 1, 2].map((i) => (
        <Sfx key={`d${i}`} name="el-tap" at={dotSwap(i)} level={-29} />
      ))}
      <Sfx name="el-tap" at={fourSevenAt} level={-24} />
      <Sfx name="el-whoosh" at={swingsAt - 4} level={-33} />

      <Kicker at={from - 10}>Attention, by hand</Kicker>
      <Headline lead="The new vector:" turn="a weighted blend." at={from} turnAt={scaledAt - 2} out={turnAt - 8} />
      <Headline lead="Turn the query" turn="toward suitcase." at={turnAt - 4} turnAt={towardAt} out={questionAt - 8} />
      <Headline lead="A different question," turn="a different answer." at={questionAt - 4} turnAt={answerAt - 2} />

      {/* ── Fig. 8: the query and the keys ── */}
      <FigLabel n="8" title="The query and the keys" at={from} x={X0} y={y(FIG_Y)} />
      <Svg opacity={ease(frame, from, 14)}>
        <line x1={KO[0]} x2={KO[0] + 1.14 * KU} y1={KO[1]} y2={KO[1]} stroke={LINE} strokeWidth={1.6} />
        <line x1={KO[0]} x2={KO[0]} y1={KO[1]} y2={KO[1] - 1.12 * KU} stroke={LINE} strokeWidth={1.6} />
        <circle cx={KO[0]} cy={KO[1]} r={4.5} fill={INK} />
      </Svg>
      {KEYS.map((_, i) => (
        <VecArrow key={i} o={KO} tip={keyTips[i]} at={from} color={KEY} width={4} glow={i === 1 ? pulse(frame, winsAt - 2, 30) : 0} />
      ))}
      <VecArrow o={KO} tip={qTip} at={from} color={QUERY} width={5} glow={pulse(frame, turnAt, 30) * 0.8} />
      {TOKENS.map((t, i) => {
        const [x, ty] = keyTips[i];
        const pos = i === 0 ? { left: x + 16, top: ty - 30 } : i === 1 ? { left: x + 16, top: ty - 26 } : { left: x + 2, top: ty - 46 };
        return (
          <Fade key={t} at={from + 4} style={{ ...pos, ...halo }}>
            <span style={{ ...label(21, KEY_INK), whiteSpace: "nowrap" }}>
              <Mono>{t}</Mono>
            </span>
          </Fade>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: qTip[0] + lerp(16, -18, turn),
          top: qTip[1] + lerp(-6, -8, turn),
          transform: `translateX(${lerp(0, -100, turn)}%)`,
          opacity: ease(frame, from + 4, 10),
          ...label(21, QUERY_INK),
          whiteSpace: "nowrap",
          ...halo,
        }}
      >
        query
      </div>

      {/* ── Fig. 9: the scores and weights, for this query ── */}
      <FigLabel n="9" title="Dot products, scores, weights" at={from} x={M.chip} y={y(FIG_Y)} />
      <Fade at={from} style={{ left: M.chip, top: qY, display: "flex", alignItems: "center", gap: 18 }}>
        <span style={{ ...label(22, QUERY_INK), whiteSpace: "nowrap" }}>
          Query, from <Mono>it</Mono>
        </span>
        <span style={{ borderRadius: 8, boxShadow: `0 0 0 ${5 * pulse(frame, towardAt, 26)}px color-mix(in srgb, ${POINT} 40%, transparent)` }}>
          <Cells values={frame < towardAt + 4 ? A.query : B.query} cell={60} size={22} border={QUERY} />
        </span>
      </Fade>
      <Fade at={from + 2} style={{ left: 0, top: headY, width: 1300 }}>
        <span style={{ position: "absolute", left: M.key, ...label(21, KEY_INK) }}>Key</span>
        <span style={{ position: "absolute", left: M.dot, ...label(21, INK_SOFT) }}>Dot</span>
        <span style={{ position: "absolute", left: M.score, ...label(21, INK_SOFT) }}>Scaled</span>
        <span style={{ position: "absolute", left: M.weight, ...label(21, INK_SOFT) }}>Weight</span>
      </Fade>
      {TOKENS.map((t, i) => {
        const hotA = i === 0 ? 1 - ease(frame, runAt, 10) : 0;
        const hotB = i === 1 ? ease(frame, fourSevenAt - 2, 10) : 0;
        const numStyle: React.CSSProperties = { fontFamily: MONO, fontWeight: 700, fontSize: NUM, color: INK, ...TABULAR };
        return (
          <Fade key={t} at={from + 4 + i * 3} style={{ left: 0, top: rowY(i), width: 1300, height: 60 }}>
            <div style={{ position: "absolute", left: M.chip, top: 4 }}>
              <TokenChip text={t} size={22} border={KEY} />
            </div>
            <div style={{ position: "absolute", left: M.key, top: 2 }}>
              <Cells values={KEYS[i]} cell={60} size={22} border={KEY} />
            </div>
            <span
              style={{
                position: "absolute",
                left: M.dot,
                top: 6,
                borderRadius: 6,
                boxShadow: i === 1 ? `0 0 0 ${5 * pulse(frame, sixAt, 30)}px color-mix(in srgb, ${POINT} 35%, transparent)` : undefined,
              }}
            >
              <Swap a={two(A.rows[i].dot)} b={two(B.rows[i].dot)} swapAt={dotSwap(i)} style={numStyle} />
            </span>
            <span style={{ position: "absolute", left: M.score, top: 6 }}>
              <Swap a={three(A.rows[i].score)} b={three(B.rows[i].score)} swapAt={scoreSwap(i)} style={numStyle} />
            </span>
            <span style={{ position: "absolute", left: M.weight, top: 6, opacity: dimUntil(weightSwap(i)) }}>
              <Swap
                a={three(A.rows[i].weight)}
                b={three(B.rows[i].weight)}
                swapAt={weightSwap(i)}
                style={{ ...numStyle, color: hotA > 0.5 || hotB > 0.5 ? POINT_INK : INK }}
              />
            </span>
          </Fade>
        );
      })}
      {/* The blend, written out: each weight times its value, added. */}
      {[0, 1].map((line) => (
        <div
          key={line}
          style={{
            position: "absolute",
            left: M.chip,
            top: exprY + line * 46,
            fontFamily: MONO,
            fontSize: 24,
            fontWeight: 600,
            color: INK,
            whiteSpace: "pre",
            opacity: ease(frame, line ? weightAt : scaledAt - 2, 12) * dimUntil(line ? swingsAt + 20 : swingsAt - 4),
            ...TABULAR,
          }}
        >
          {line ? (
            <>
              <Swap a={blendLines(A)[1].split("=")[0]} b={blendLines(B)[1].split("=")[0]} swapAt={swingsAt - 4} />
              <span style={{ opacity: ease(frame, addedAt - 2, 10), color: POINT_INK, fontWeight: 700 }}>
                = <Swap a={pair(A.output2, (x) => x.toFixed(2))} b={pair(B.output2, (x) => x.toFixed(2))} swapAt={swingsAt + 20} />
              </span>
            </>
          ) : (
            <Swap a={blendLines(A)[0]} b={blendLines(B)[0]} swapAt={swingsAt - 4} />
          )}
        </div>
      ))}

      {/* ── Fig. 10: the new vector, among the values ── */}
      <FigLabel n="10" title="The new vector, among the values" at={newAt - 4} x={1250} y={y(FIG_Y)} />
      <Svg opacity={ease(frame, newAt - 2, 14)}>
        <line x1={VO[0]} x2={VO[0] + 10.3 * VU} y1={VO[1]} y2={VO[1]} stroke={LINE} strokeWidth={1.6} />
        <line x1={VO[0]} x2={VO[0]} y1={VO[1]} y2={VO[1] - 10.6 * VU} stroke={LINE} strokeWidth={1.6} />
        {[0, 5, 10].map((v) => (
          <g key={v}>
            <text x={VO[0] + v * VU} y={VO[1] + 30} textAnchor="middle" style={{ fontFamily: SANS, fontSize: 20, fontWeight: 500, fill: INK_SOFT }}>
              {v}
            </text>
            {v ? (
              <text x={VO[0] - 14} y={VO[1] - v * VU + 7} textAnchor="end" style={{ fontFamily: SANS, fontSize: 20, fontWeight: 500, fill: INK_SOFT }}>
                {v}
              </text>
            ) : null}
          </g>
        ))}
        {/* The pull of each value, as thick as its weight. */}
        {springs > 0
          ? VALUES.map((v, i) => {
              const [vx, vy] = V(v);
              return (
                <line
                  key={i}
                  x1={ox}
                  y1={oy}
                  x2={lerp(ox, vx, springs)}
                  y2={lerp(oy, vy, springs)}
                  stroke={VALUE}
                  strokeWidth={2 + 18 * w[i] + (i === 0 ? 6 * hardest : 0)}
                  strokeLinecap="round"
                  opacity={0.45}
                />
              );
            })
          : null}
        {VALUES.map((v, i) => {
          const [vx, vy] = V(v);
          const p = ease(frame, valuesAt - 2 + i * 3, 10);
          const glow = i === 0 ? pulse(frame, trophysAt, 30) : 0;
          return <circle key={i} cx={vx} cy={vy} r={(11 + 5 * glow) * p} fill={VALUE} />;
        })}
        {ring > 0 && point > 0 ? (
          <circle cx={ox} cy={oy} r={18 + 18 * ring} fill="none" stroke={POINT} strokeWidth={2.6} opacity={Math.min(1, ring)} />
        ) : null}
        {point > 0 ? <circle cx={ox} cy={oy} r={13 * point} fill={POINT} /> : null}
      </Svg>
      {TOKENS.map((t, i) => {
        const [vx, vy] = V(VALUES[i]);
        // Each value named with its coordinates; trophy's to the right of its
        // dot, in two lines, so it never reads as the x axis's title.
        const pos = i === 0 ? { left: vx + 22, top: vy - 54 } : i === 1 ? { left: vx + 20, top: vy - 16 } : { left: vx + 16, top: vy + 8 };
        const at = pair(VALUES[i]);
        return (
          <div key={t} style={{ position: "absolute", ...pos, opacity: ease(frame, valuesAt + i * 3, 10), ...label(21, VALUE_INK), whiteSpace: "nowrap", ...halo }}>
            value of <Mono>{t}</Mono>
            {i === 0 ? <br /> : " "}
            {at}
          </div>
        );
      })}
      <div style={{ position: "absolute", left: ox + 26, top: oy - 58, opacity: point, ...label(22, POINT_INK), whiteSpace: "nowrap", ...halo }}>
        new vector for <Mono>it</Mono>
      </div>
    </AbsoluteFill>
  );
};
