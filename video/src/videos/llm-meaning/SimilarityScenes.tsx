import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { arrowHead, type Pt } from "../../components/arrow";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, halo, INK, INK_SOFT, label, note, PAPER, TABULAR } from "../../editorial/style";
import { FigLabel, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO, SANS } from "../../theme/fonts";
import { COSINE, num, SEARCH } from "./data";
import {
  Arrow,
  DATA,
  DATA_TINT,
  Fade,
  FAINT,
  FIG_Y,
  Headline,
  Kicker,
  lerp,
  LINE,
  Mark,
  POINT,
  POINT_INK,
  pulse,
  Spot,
  Svg,
  Tag,
  TokenChip,
  X0,
} from "./parts";

// ═══ Scene 4: a ruler counts length; cosine measures the angle ═════════════

/** A vector drawn from the plot's origin, its line growing on `at`. */
const Vector: React.FC<{
  o: Pt;
  tip: Pt;
  at: number;
  color?: string;
  width?: number;
  dash?: string;
  opacity?: number;
  glow?: number;
}> = ({ o, tip, at, color = DATA, width = 4, dash, opacity = 1, glow = 0 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 18);
  if (p <= 0) return null;
  const end: Pt = [lerp(o[0], tip[0], p), lerp(o[1], tip[1], p)];
  return (
    <Svg opacity={opacity}>
      {glow > 0 ? (
        <line x1={o[0]} y1={o[1]} x2={end[0]} y2={end[1]} stroke={`color-mix(in srgb, ${POINT} 35%, transparent)`} strokeWidth={width + 12 * glow} strokeLinecap="round" />
      ) : null}
      <line x1={o[0]} y1={o[1]} x2={end[0]} y2={end[1]} stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={dash} />
      {p > 0.3 ? (
        <path d={arrowHead([o, end], 20, 12, { filled: true })} fill={color} stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      ) : null}
    </Svg>
  );
};

/** A reading in the right-hand column: a label, then its value inked on `valueAt`. */
const Reading: React.FC<{ x: number; y: number; at: number; valueAt: number; name: string; value: string; color?: string }> = ({
  x,
  y,
  at,
  valueAt,
  name,
  value,
  color = INK,
}) => {
  const frame = useCurrentFrame();
  return (
    <Fade at={at} style={{ left: x, top: y, display: "flex", alignItems: "baseline", gap: 18, whiteSpace: "nowrap" }}>
      <span style={{ ...label(24, INK_SOFT), width: 190 }}>{name}</span>
      <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 40, color, opacity: ease(frame, valueAt, 10), ...TABULAR }}>{value}</span>
    </Fade>
  );
};

export const CosineScene: React.FC = () => {
  const n = useNarration();
  const frame = useCurrentFrame();
  const { y } = useLayout();

  const from = n.beat("ruler").from;
  const rulerAt = n.word("ruler", "ruler");
  const straightAt = n.word("ruler", "Straight-line");
  const rulerAgainAt = n.word("length", "ruler");
  const longAt = n.word("length", "long");
  const lengthAt = n.word("length", "length");
  const commonAt = n.word("length", "common");
  const meansAt = n.word("length", "means");
  const angleAt = n.word("cosine", "angle");
  const cosineAt = n.word("cosine", "cosine");
  const sameAt = n.word("same", "same");
  const fiveAt = n.word("same", "five", { nth: 1 });
  const sevenAt = n.word("same", "five point seven");
  const saysOneAt = n.word("same", "one", { nth: 1 });
  const matchAt = n.word("same", "match");
  const rightAt = n.word("right", "right");
  const zeroAt = n.word("right", "zero");
  const oppositeAt = n.word("right", "opposite");
  const minusAt = n.word("right", "minus");

  // The plot: 80 px a unit, the origin low on the left.
  const U = 72;
  const O: Pt = [380, y(720)];
  const at = (v: readonly number[]): Pt => [O[0] + v[0] * U, O[1] - v[1] * U];
  const short = at(COSINE.short);
  const long = at(COSINE.long);
  const other = at(COSINE.other);
  const opposite = at([-COSINE.short[0], -COSINE.short[1]]);

  // The scale: minus one to one.
  const SX0 = 1050;
  const SX1 = 1750;
  const SY = y(820);
  const sxOf = (v: number) => SX0 + ((v + 1) / 2) * (SX1 - SX0);

  const rulerP = ease(frame, straightAt - 2, 18);
  const rulerFade = ease(frame, angleAt - 4, 14) * 0.55;
  const lenGlow = pulse(frame, longAt - 4, 40) + pulse(frame, sameAt - 2, 34);
  const rays = ease(frame, angleAt - 2, 18);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={rulerAt - 6} level={-35} />
      <Sfx name="el-pencil" at={straightAt - 2} level={-34} />
      <Sfx name="el-pop" at={from + 10} level={-32} />
      <Sfx name="el-tap" at={sevenAt} level={-24} />
      <Sfx name="el-tap" at={saysOneAt} level={-24} />
      <Sfx name="el-pencil" at={rightAt - 4} level={-34} />
      <Sfx name="el-tap" at={zeroAt} level={-25} />
      <Sfx name="el-pencil" at={oppositeAt - 2} level={-35} />
      <Sfx name="el-tap" at={minusAt} level={-25} />

      <Kicker at={from - 10}>Similarity</Kicker>
      <Headline lead="A ruler measures distance." at={from} out={cosineAt - 8} />
      <Headline lead="Cosine similarity" turn="measures the angle." at={cosineAt - 2} turnAt={cosineAt + 10} />

      {/* ── Fig. 6: the lesson's three vectors ── */}
      <FigLabel n="6" title="The lesson's vectors, from one origin" at={from} x={X0} y={y(FIG_Y)} />
      <Svg opacity={ease(frame, from, 14)}>
        <line x1={O[0] - 2.2 * U} x2={O[0] + 5.6 * U} y1={O[1]} y2={O[1]} stroke={LINE} strokeWidth={1.6} />
        <line x1={O[0]} x2={O[0]} y1={O[1] + 2.2 * U} y2={O[1] - 5.5 * U} stroke={LINE} strokeWidth={1.6} />
        <circle cx={O[0]} cy={O[1]} r={5} fill={INK} />
      </Svg>
      {/* "The angle": both arrows run on as faint rays, the same line. */}
      <Svg opacity={rays * 0.9}>
        <line x1={O[0]} y1={O[1]} x2={O[0] + 5.6 * U} y2={O[1] - 5.6 * U} stroke={POINT} strokeWidth={1.6} strokeDasharray="4 7" />
      </Svg>
      <Vector o={O} tip={long} at={rulerAt - 4} glow={lenGlow} />
      <Vector o={O} tip={short} at={rulerAt + 2} color={DATA} width={6} glow={lenGlow} />
      <div style={{ position: "absolute", left: short[0] - 30, top: short[1] - 40, transform: "translateX(-100%)", opacity: ease(frame, rulerAt + 8, 10), ...halo }}>
        <Tag size={21}>short: 1, 1</Tag>
      </div>
      <div style={{ position: "absolute", left: long[0] + 20, top: long[1] - 10, opacity: ease(frame, rulerAt + 4, 10), ...halo }}>
        <Tag size={21}>long: 5, 5</Tag>
      </div>
      {/* The ruler: tip to tip, set off the shared line like a dimension line. */}
      <Svg opacity={1 - rulerFade}>
        {(() => {
          const off = 26 / Math.SQRT2;
          const a: Pt = [short[0] + off, short[1] + off];
          const b: Pt = [long[0] + off, long[1] + off];
          const e: Pt = [lerp(a[0], b[0], rulerP), lerp(a[1], b[1], rulerP)];
          const t = 9 / Math.SQRT2;
          return (
            <g opacity={rulerP > 0 ? 1 : 0}>
              <line x1={a[0]} y1={a[1]} x2={e[0]} y2={e[1]} stroke={INK} strokeWidth={2 + 3 * pulse(frame, rulerAgainAt, 30)} strokeDasharray="8 6" />
              <line x1={a[0] - t} y1={a[1] - t} x2={a[0] + t} y2={a[1] + t} stroke={INK} strokeWidth={2} />
              {rulerP > 0.98 ? <line x1={b[0] - t} y1={b[1] - t} x2={b[0] + t} y2={b[1] + t} stroke={INK} strokeWidth={2} /> : null}
            </g>
          );
        })()}
      </Svg>
      <div
        style={{
          position: "absolute",
          left: (short[0] + long[0]) / 2 + 48,
          top: (short[1] + long[1]) / 2 + 22,
          opacity: ease(frame, sevenAt - 2, 10) * (1 - rulerFade * 0.3),
          ...note(26, INK),
          fontWeight: 650,
          whiteSpace: "nowrap",
          ...halo,
          ...TABULAR,
        }}
      >
        {COSINE.euclid.toFixed(3)} apart
      </div>
      <div style={{ position: "absolute", left: O[0] + 1.6 * U - 150, top: O[1] - 2.6 * U - 30, opacity: ease(frame, angleAt + 6, 10) * (1 - ease(frame, rightAt - 4, 10)), ...halo }}>
        <Tag size={22} color={POINT_INK}>
          angle: 0°
        </Tag>
      </div>
      {/* At a right angle, and pointing the opposite way. */}
      <Vector o={O} tip={other} at={rightAt - 4} color={DATA} width={6} />
      <Svg opacity={ease(frame, rightAt + 6, 10)}>
        {(() => {
          const s = 22;
          const a: Pt = [O[0] + s / Math.SQRT2, O[1] - s / Math.SQRT2];
          const b: Pt = [O[0] + s / Math.SQRT2, O[1] + s / Math.SQRT2];
          const c: Pt = [O[0] + s * Math.SQRT2, O[1]];
          return <path d={`M${a[0]},${a[1]} L${c[0]},${c[1]} L${b[0]},${b[1]}`} fill="none" stroke={POINT} strokeWidth={2.2} />;
        })()}
      </Svg>
      <div style={{ position: "absolute", left: other[0] + 22, top: other[1] - 6, opacity: ease(frame, rightAt + 4, 10), ...halo }}>
        <Tag size={21}>other: 1, −1</Tag>
      </div>
      <Vector o={O} tip={opposite} at={oppositeAt - 2} color={INK_SOFT} width={4} dash="9 7" />
      <div style={{ position: "absolute", left: opposite[0] - 20, top: opposite[1] + 8, transform: "translateX(-100%)", opacity: ease(frame, oppositeAt + 6, 10), ...halo }}>
        <Tag size={21}>opposite: −1, −1</Tag>
      </div>

      {/* The right-hand column: why length misleads, then the two readings. */}
      <Note at={lengthAt - 4} x={1050} y={y(360)} width={520}>
        <div style={{ ...body(32), color: INK }}>
          In an embedding, length mostly tracks <Mark at={commonAt}>how common</Mark> a word is,{" "}
          <span style={{ opacity: ease(frame, meansAt - 6, 10) }}>not what it means.</span>
        </div>
      </Note>
      <Reading x={1050} y={y(530)} at={sevenAt - 6} valueAt={sevenAt} name="Ruler" value={COSINE.euclid.toFixed(3)} />
      <Reading x={1050} y={y(600)} at={saysOneAt - 6} valueAt={saysOneAt} name="Cosine" value={COSINE.cosLong.toFixed(1)} color={POINT_INK} />
      <Note at={fiveAt} out={sevenAt - 8} x={1050} y={y(560)}>
        <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
          Same direction; one is {COSINE.lengthRatio.toFixed(0)} times longer.
        </span>
      </Note>
      <Note at={matchAt - 2} x={1390} y={y(600) + 10}>
        <span style={{ ...note(26, POINT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>a perfect match</span>
      </Note>

      {/* ── Fig. 7: the cosine scale ── */}
      <FigLabel n="7" title="Cosine similarity, from minus one to one" at={saysOneAt - 4} x={SX0} y={y(700)} />
      <Svg opacity={ease(frame, saysOneAt - 2, 14)}>
        <line x1={SX0} x2={SX1} y1={SY} y2={SY} stroke={INK} strokeWidth={2} />
        {[-1, 0, 1].map((v) => (
          <g key={v}>
            <line x1={sxOf(v)} x2={sxOf(v)} y1={SY - 8} y2={SY + 8} stroke={INK} strokeWidth={1.6} />
            <text x={sxOf(v)} y={SY + 38} textAnchor="middle" style={{ fontFamily: SANS, fontSize: 22, fontWeight: 600, fill: INK_SOFT, ...TABULAR }}>
              {num(v, 0)}
            </text>
          </g>
        ))}
      </Svg>
      {(
        [
          [COSINE.cosLong, saysOneAt, "same direction"],
          [COSINE.cosOther, zeroAt, "unrelated"],
          [COSINE.cosOpposite, minusAt, "opposite"],
        ] as const
      ).map(([v, t, name]) => {
        const p = ease(frame, t - 2, 12);
        if (p <= 0) return null;
        return (
          <React.Fragment key={name}>
            <Svg opacity={p}>
              <circle cx={sxOf(v)} cy={SY} r={11 + 6 * pulse(frame, t, 24)} fill={POINT} />
            </Svg>
            <div
              style={{
                position: "absolute",
                left: sxOf(v),
                top: SY - 58,
                transform: `translateX(-50%) translateY(${(1 - p) * 8}px)`,
                opacity: p,
                ...note(22, POINT_INK),
                fontWeight: 650,
                whiteSpace: "nowrap",
              }}
            >
              {name}
            </div>
          </React.Fragment>
        );
      })}
      <Spot id="llm-meaning-compass" at={angleAt - 6} left={1610} top={y(320)} width={200} height={240} />
    </AbsoluteFill>
  );
};


// ═══ Scene 5: the lesson's semantic search ═════════════════════════════════

const DOC_X = X0;
/** A theme score as the lesson writes it: 0.9, 0.85, 0.0. */
const theme = (v: number) => (String(v).includes(".") ? String(v) : `${v}.0`);
const THEME_X = [880, 1020, 1160, 1300];
const SCORE_X = 1480;
const DOC_ROW = 64;

export const SearchScene: React.FC = () => {
  const n = useNarration();
  const frame = useCurrentFrame();
  const { y } = useLayout();

  const from = n.beat("search").from;
  const searchAt = n.word("search", "search");
  const fiveAt = n.word("search", "Five");
  const themesAt = n.word("search", "themes");
  const askAt = n.word("query", "ask");
  const financiallyAt = n.word("query", "financially");
  const topAt = n.word("hit", "Top");
  const earningsAt = n.word("hit", "earnings");
  const pointAt = n.word("hit", "point");
  const wordAt = n.word("hit", "word");
  const questionAt = n.word("hit", "question");
  const searchWordAt = n.word("meaning", "search");
  const meaningAt = n.word("meaning", "meaning");
  const textAt = n.word("meaning", "text");

  const top0 = y(420);
  const rank = (text: string) => SEARCH.ranked.findIndex((r) => r.text === text);
  const sort = ease(frame, topAt - 2, 22);
  const rowY = (i: number, text: string) => top0 + lerp(i, rank(text), sort) * DOC_ROW;
  const QY = y(830);

  return (
    <AbsoluteFill>
      {SEARCH.docs.map((_, i) => (
        <Sfx key={i} name="el-tap" at={fiveAt + i * 4} level={-28} />
      ))}
      <Sfx name="el-pencil" at={askAt - 2} level={-34} />
      <Sfx name="el-whoosh" at={topAt - 2} level={-33} />
      <Sfx name="el-tap" at={pointAt} level={-23} />
      <Sfx name="el-chime" at={n.beat("hit").to + 6} level={-33} />

      <Kicker at={from - 10}>Similarity</Kicker>
      <Headline lead="A working search," turn="in five documents." at={from} turnAt={fiveAt} out={meaningAt - 8} />
      <Headline lead="It runs on meaning," turn="not on text." at={meaningAt - 4} turnAt={textAt - 2} />

      <FigLabel n="8" title="The lesson's documents, scored on four themes" at={searchAt} x={X0} y={y(FIG_Y)} />
      <Fade at={themesAt - 4} style={{ left: 0, top: y(366), width: 1920 }}>
        {SEARCH.axes.map((ax, i) => (
          <span key={ax} style={{ position: "absolute", left: THEME_X[i], transform: "translateX(-50%)", ...label(21, INK_SOFT), opacity: ease(frame, themesAt - 4 + i * 4, 10) }}>
            {ax}
          </span>
        ))}
        <span style={{ position: "absolute", left: SCORE_X, transform: "translateX(-50%)", ...label(21, POINT_INK), opacity: ease(frame, topAt - 4, 10) }}>
          Cosine
        </span>
      </Fade>
      <Svg opacity={ease(frame, fiveAt - 4, 12)}>
        <line x1={X0} x2={1600} y1={top0 - 12} y2={top0 - 12} stroke={INK} strokeWidth={1.6} />
        <line x1={X0} x2={1600} y1={top0 + 5 * DOC_ROW + 4} y2={top0 + 5 * DOC_ROW + 4} stroke={LINE} strokeWidth={1.4} />
      </Svg>
      {SEARCH.docs.map((d, i) => {
        const p = ease(frame, fiveAt - 2 + i * 4, 12);
        if (p <= 0) return null;
        const top = rowY(i, d.text);
        const isTop = d.text === SEARCH.top;
        const hi = isTop ? ease(frame, earningsAt - 2, 12) + 1.4 * pulse(frame, searchWordAt, 30) : 0;
        return (
          <div key={d.text} style={{ position: "absolute", left: 0, top, width: 1920, height: DOC_ROW, opacity: p }}>
            {hi > 0 ? (
              <div
                style={{
                  position: "absolute",
                  left: X0 - 14,
                  top: 4,
                  width: 1600 - X0 + 28,
                  height: DOC_ROW - 8,
                  background: `color-mix(in srgb, ${POINT} ${Math.round(hi * 10)}%, transparent)`,
                  borderRadius: 8,
                }}
              />
            ) : null}
            <span style={{ position: "absolute", left: DOC_X, top: 14, ...note(26, INK), fontWeight: isTop && hi > 0.5 ? 650 : 500, whiteSpace: "nowrap" }}>
              {d.text}
            </span>
            {d.vec.map((v, j) => (
              <span
                key={j}
                style={{
                  position: "absolute",
                  left: THEME_X[j],
                  top: 14,
                  transform: "translateX(-50%)",
                  fontFamily: MONO,
                  fontWeight: 600,
                  fontSize: 25,
                  color: v === 0 ? FAINT : INK,
                  opacity: ease(frame, themesAt - 2 + j * 4, 10),
                }}
              >
                {theme(v)}
              </span>
            ))}
            <span
              style={{
                position: "absolute",
                left: SCORE_X,
                top: 12,
                transform: "translateX(-50%)",
                fontFamily: MONO,
                fontWeight: 700,
                fontSize: 27,
                color: isTop ? POINT_INK : INK,
                opacity: ease(frame, topAt - 2 + rank(d.text) * 3, 10),
                ...TABULAR,
              }}
            >
              {isTop ? <Mark at={pointAt}>{d.score.toFixed(3)}</Mark> : d.score.toFixed(3)}
            </span>
          </div>
        );
      })}

      {/* The question, as the lesson's query vector. */}
      <Fade at={askAt - 4} style={{ left: 0, top: QY, width: 1920 }}>
        <span style={{ position: "absolute", left: X0, top: -40, ...label(21, INK_SOFT) }}>Query</span>
        <span style={{ position: "absolute", left: DOC_X, top: 4, ...body(32), fontStyle: "italic", color: INK, whiteSpace: "nowrap" }}>
          How did the company perform <Mark at={financiallyAt}>financially?</Mark>
        </span>
        {SEARCH.query.map((v, j) => (
          <span
            key={j}
            style={{
              position: "absolute",
              left: THEME_X[j],
              top: 10,
              transform: "translateX(-50%)",
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: 25,
              color: v === 0 ? FAINT : POINT_INK,
              opacity: ease(frame, askAt + 6 + j * 3, 10),
            }}
          >
            {theme(v)}
          </span>
        ))}
      </Fade>
      <Svg opacity={ease(frame, askAt - 4, 12)}>
        <line x1={X0} x2={1600} y1={QY - 52} y2={QY - 52} stroke={INK} strokeWidth={1.6} />
        {/* "Not one word in common with the question": the question, outlined. */}
        <rect
          x={X0 - 14}
          y={QY - 6}
          width={1600 - X0 + 28}
          height={58}
          rx={8}
          fill="none"
          stroke={POINT}
          strokeWidth={2.4}
          opacity={pulse(frame, questionAt - 4, 40)}
        />
      </Svg>
      <Note at={wordAt - 4} x={1640} y={top0 + 10}>
        <div style={{ ...note(24, POINT_INK), fontWeight: 650, width: 220, whiteSpace: "normal" }}>No word in common with the query</div>
      </Note>
    </AbsoluteFill>
  );
};

// ═══ Scene 6: where similarity breaks, and the second pass ═════════════════

const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      position: "absolute",
      padding: "18px 26px 20px",
      background: PAPER,
      border: `2px solid ${INK}`,
      borderRadius: 12,
      boxShadow: `0 6px 18px -10px color-mix(in srgb, ${INK} 40%, transparent)`,
      ...body(34),
      color: INK,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </div>
);

const Box: React.FC<{ x: number; y: number; w: number; at: number; title: string; children?: React.ReactNode; accent?: boolean }> = ({
  x,
  y,
  w,
  at,
  title,
  children,
  accent = false,
}) => (
  <Fade at={at} style={{ left: x, top: y, width: w }}>
    <div
      style={{
        border: `2px solid ${accent ? POINT : INK}`,
        borderRadius: 12,
        padding: "14px 18px 16px",
        background: accent ? `color-mix(in srgb, ${POINT} 6%, ${PAPER})` : PAPER,
      }}
    >
      <div style={{ ...label(22, accent ? POINT_INK : INK) }}>{title}</div>
      {children ? <div style={{ marginTop: 10 }}>{children}</div> : null}
    </div>
  </Fade>
);

export const BlindScene: React.FC = () => {
  const n = useNarration();
  const frame = useCurrentFrame();
  const { y } = useLayout();

  const from = n.beat("blind").from;
  const blindAt = n.word("blind", "blind");
  const drugAt = n.word("blind", "drug", { nth: 1 });
  const notAt = n.word("blind", "not");
  const landAt = n.word("blind", "land");
  const topOfAt = n.word("blind", "top");
  const closeAt = n.word("rerank", "Close");
  const usefulAt = n.word("rerank", "useful");
  const secondAt = n.word("rerank", "second");
  const readsAt = n.word("rerank", "reads");
  const hitsAt = n.word("rerank", "hits");
  const vectorAt = n.word("sim-in", "vector");
  const problemAt = n.word("sim-in", "problem");
  const nothingAt = n.word("sim-in", "nothing");
  const neighboursAt = n.word("sim-in", "neighbours");

  const land = ease(frame, landAt - 2, 26);
  const cardsTop = y(420);

  // The second pass, laid out left to right under the cards.
  const PY = y(470);
  const pipeX = [1010, 1290, 1570];

  // The teaser: one word alone, then the words around it.
  const TY = y(800);
  const around = ease(frame, neighboursAt - 4, 18);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={drugAt} level={-26} />
      <Sfx name="el-tap" at={notAt} level={-24} />
      <Sfx name="el-whoosh" at={landAt - 2} level={-33} />
      <Sfx name="el-pencil" at={secondAt - 4} level={-34} />
      <Sfx name="el-pop" at={nothingAt} level={-31} />

      <Kicker at={from - 10}>Similarity</Kicker>
      <Headline lead="Where it breaks." at={from} out={closeAt - 8} />
      <Headline lead="Close isn't true," turn="or always useful." at={closeAt - 2} turnAt={usefulAt - 4} />

      {/* The two figures step back as the narration turns to the next problem. */}
      <div style={{ position: "absolute", inset: 0, opacity: 1 - 0.55 * ease(frame, vectorAt - 2, 16) }}>
      {/* ── Fig. 9: two sentences, nearly the same vector ── */}
      <FigLabel n="9" title="The lesson's negation problem" at={blindAt - 2} x={X0} y={y(FIG_Y)} />
      <Fade at={drugAt - 4} style={{ left: 0, top: 0 }}>
        <Card style={{ left: X0, top: cardsTop }}>The drug is effective.</Card>
      </Fade>
      <Fade at={notAt - 8} style={{ left: 0, top: 0 }}>
        <Card style={{ left: lerp(X0 + 40, X0 + 30, land), top: lerp(cardsTop + 150, cardsTop + 56, land) }}>
          The drug is <span style={{ color: POINT_INK, fontWeight: 650, textDecoration: `underline 3px ${POINT}`, textUnderlineOffset: 6 }}>not</span>{" "}
          effective.
        </Card>
      </Fade>
      <Note at={topOfAt} x={X0} y={cardsTop + 176}>
        <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>Almost the same direction, opposite meanings.</span>
      </Note>

      {/* ── Fig. 10: a second pass reads what the search found ── */}
      <FigLabel n="10" title="A second pass reads the top hits" at={secondAt - 6} x={pipeX[0]} y={y(FIG_Y)} />
      <Box x={pipeX[0]} y={PY} w={230} at={secondAt - 4} title="Nearest by cosine">
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ height: 14, marginTop: i ? 10 : 2, borderRadius: 4, background: DATA_TINT, border: `1.5px solid ${DATA}`, width: `${92 - i * 14}%` }} />
        ))}
      </Box>
      <Box x={pipeX[1]} y={PY} w={230} at={readsAt - 4} title="A second pass" accent>
        <div style={{ ...note(22, INK_SOFT) }}>reads each one</div>
      </Box>
      <Box x={pipeX[2]} y={PY} w={200} at={hitsAt} title="The answer">
        <div style={{ height: 14, marginTop: 2, borderRadius: 4, background: DATA_TINT, border: `1.5px solid ${DATA}`, width: "88%" }} />
      </Box>
      <Arrow from={[pipeX[0] + 236, PY + 56]} to={[pipeX[1] - 8, PY + 56]} at={readsAt - 4} />
      <Arrow from={[pipeX[1] + 236, PY + 56]} to={[pipeX[2] - 8, PY + 56]} at={hitsAt} />
      </div>

      {/* The turn: one word that means nothing on its own. */}
      <Svg>
        <line x1={X0} x2={X0 + (1800 - X0) * ease(frame, problemAt - 4, 22)} y1={TY - 40} y2={TY - 40} stroke={INK_SOFT} strokeWidth={1.6} />
      </Svg>
      <div style={{ position: "absolute", left: 0, top: TY, width: 1920, display: "flex", justifyContent: "center", alignItems: "center", gap: 16 }}>
        <span style={{ fontFamily: MONO, fontSize: 30, fontWeight: 600, color: INK_SOFT, opacity: around * 0.85, whiteSpace: "pre" }}>
          The trophy didn&apos;t fit in the suitcase because
        </span>
        <span style={{ opacity: ease(frame, nothingAt - 4, 12), transform: `scale(${1 + 0.08 * pulse(frame, nothingAt, 26)})` }}>
          <TokenChip text="it" size={34} border={POINT} color={POINT_INK} />
        </span>
        <span style={{ fontFamily: MONO, fontSize: 30, fontWeight: 600, color: INK_SOFT, opacity: around * 0.85, whiteSpace: "pre" }}>
          was too big.
        </span>
      </div>
    </AbsoluteFill>
  );
};
