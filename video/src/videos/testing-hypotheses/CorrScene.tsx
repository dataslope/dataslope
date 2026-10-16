import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { fmt, halo, INK, INK_SOFT, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CURVE, USHAPE } from "./data";
import { DATA, DATA_INK, DOT, Greek, Head, Kicker, Label, lerp, pulse, STAT, STAT_INK, Svg } from "./parts";

/** The scatter's box, in frame x and page y. */
const BOX = { x0: 220, x1: 1000, top: 380, bottom: 830 };
/** The correlation scale. */
const S: XScale = { lo: -1, hi: 1, x0: 1140, x1: 1740 };
const S_Y = 470;

/** Ranks, 1 = smallest; ties do not occur in this data. */
const ranks = (v: readonly number[]) => {
  const order = [...v.keys()].sort((a, b) => v[a] - v[b]);
  const r = new Array<number>(v.length);
  order.forEach((idx, k) => (r[idx] = k + 1));
  return r;
};
const RX = ranks(CURVE.x);
const RY = ranks(CURVE.y);

/** The least-squares line through (x, y): Pearson's straight line. */
const fit = (x: readonly number[], y: readonly number[]) => {
  const mx = x.reduce((s, v) => s + v, 0) / x.length;
  const my = y.reduce((s, v) => s + v, 0) / y.length;
  let sxy = 0;
  let sxx = 0;
  x.forEach((v, i) => {
    sxy += (v - mx) * (y[i] - my);
    sxx += (v - mx) ** 2;
  });
  const b = sxy / sxx;
  return { a: my - b * mx, b };
};
const CURVE_FIT = fit(CURVE.x, CURVE.y);
const U_FIT = fit(USHAPE.x, USHAPE.y);

const C = { xlo: 0.5, xhi: 10.5, ylo: -10, yhi: 155 };
const U = { xlo: -5.3, xhi: 5.3, ylo: -4, yhi: 28 };
const R = { lo: 0, hi: 61 };

/**
 * Pearson against Spearman on the lesson's curve that always rises (0.874
 * and 0.986, the points sliding into their ranks), and r of -0.025 on a U
 * that y follows exactly.
 */
export const CorrScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const corrFrom = n.beat("corr").from;
  const minusAt = n.word("corr", "minus one");
  const pearsonAt = n.word("corr", "Pearson's");
  const straightAt = n.word("corr", "straight line");
  const closeAt = n.word("corr", "how close");
  const thoughAt = n.word("ushape", "though");
  const curveAt = n.word("curve", "curve");
  const eightAt = n.word("curve", "point eight seven");
  const spearmanAt = n.word("curve", "Spearman's");
  const ranksAt = n.word("curve", "ranks");
  const risingAt = n.word("curve", "keeps rising");
  const nineAt = n.word("curve", "Point nine nine");
  const nearAt = n.word("ushape", "near zero");
  const noRelAt = n.word("ushape", "no relationship");
  const uAt = n.word("ushape", "U-shape");
  const minusZeroAt = n.word("ushape", "minus point zero three");
  const dependsAt = n.word("ushape", "depends entirely");

  const top = y(BOX.top);
  const bottom = y(BOX.bottom);
  const px = (v: number, lo: number, hi: number) => BOX.x0 + ((v - lo) / (hi - lo)) * (BOX.x1 - BOX.x0);
  const py = (v: number, lo: number, hi: number) => bottom - ((v - lo) / (hi - lo)) * (bottom - top);

  const toRank = ease(frame, ranksAt - 4, 24);
  const curveOut = ease(frame, n.beat("ushape").from - 2, 16);
  const uIn = (i: number) => ease(frame, noRelAt - 4 + (i / USHAPE.x.length) * 24, 8);
  // Drawn across the rest of the sentence, so the finished U arrives with its last word.
  const parabola = ease(frame, dependsAt - 4, Math.max(24, n.beat("ushape").to - dependsAt + 8));
  const scaleIn = ease(frame, minusAt - 4, 16);
  // Where the scale's marker sits: r, then rho, then the U's r.
  const marker = frame < nineAt - 4 ? CURVE.pearson : frame < minusZeroAt - 6 ? lerp(CURVE.pearson, CURVE.spearman, ease(frame, nineAt - 4, 16)) : lerp(CURVE.spearman, USHAPE.r, ease(frame, minusZeroAt - 6, 20));
  const markerIn = ease(frame, eightAt - 4, 12);
  const markGlow = pulse(frame, eightAt, 24) + pulse(frame, nineAt, 24) + pulse(frame, minusZeroAt, 24);
  const fitIn = ease(frame, closeAt - 2, 24) * (1 - toRank);
  const uFitIn = ease(frame, minusZeroAt - 4, 16);

  return (
    <AbsoluteFill>
      {/* ── Sound: the scale, the points, the ranks, the U, the parabola ── */}
      <Sfx name="el-pencil" at={minusAt - 4} level={-35} />
      <Sfx name="el-sprinkle" at={pearsonAt - 4} level={-33} />
      <Sfx name="el-tap" at={eightAt - 4} level={-29} />
      <Sfx name="el-whoosh" at={ranksAt - 4} level={-33} />
      <Sfx name="el-sprinkle" at={noRelAt - 4} level={-33} />
      <Sfx name="el-pencil" at={dependsAt - 4} level={-34} />

      <Kicker at={corrFrom - 10}>Correlation, and when to go nonparametric</Kicker>
      <Head a="Do they move" b="together?" at={corrFrom - 6} bAt={pearsonAt - 6} />

      {/* ── The scale, minus one to one ── */}
      <Svg opacity={scaleIn}>
        <line x1={S.x0} x2={S.x0 + (S.x1 - S.x0) * scaleIn} y1={y(S_Y)} y2={y(S_Y)} stroke={INK} strokeWidth={2} />
        {[-1, 0, 1].map((v) => (
          <line key={v} x1={sx(S, v)} x2={sx(S, v)} y1={y(S_Y) - 8} y2={y(S_Y) + 8} stroke={INK} strokeWidth={2} />
        ))}
        {markerIn > 0 ? <circle cx={sx(S, marker)} cy={y(S_Y)} r={(11 + 4 * Math.min(1, markGlow)) * markerIn} fill={STAT} stroke={PAPER} strokeWidth={2} /> : null}
      </Svg>
      {[-1, 0, 1].map((v) => (
        <div key={v} style={{ position: "absolute", left: sx(S, v), top: y(S_Y) + 18, transform: "translateX(-50%)", opacity: scaleIn, ...note(22, INK_SOFT) }}>
          {v < 0 ? "−1" : v}
        </div>
      ))}
      <Ink at={minusAt - 4} dur={14} style={{ left: S.x0, top: y(S_Y) - 84, whiteSpace: "nowrap" }}>
        <Label size={22} color={INK_SOFT}>
          A correlation
        </Label>
      </Ink>
      {/* The three readings, one under another. */}
      {[
        { at: eightAt - 2, node: <>Pearson&apos;s r: {fmt(CURVE.pearson, 2)}</>, color: STAT_INK, note: "on the rising curve" },
        {
          at: spearmanAt - 2,
          node: (
            <>
              Spearman&apos;s <Greek>ρ</Greek>: <span style={{ opacity: ease(frame, nineAt - 2, 10) }}>{fmt(CURVE.spearman, 2)}</span>
            </>
          ),
          color: DATA_INK,
          note: "on its ranks",
        },
        { at: minusZeroAt - 2, node: <>r on the U: {fmt(USHAPE.r, 2).replace("-", "−")}</>, color: STAT_INK, note: "yet y follows x exactly" },
      ].map((r, i) => (
        <React.Fragment key={i}>
          <Ink at={r.at} dur={14} style={{ left: S.x0, top: y(S_Y) + 90 + i * 100, whiteSpace: "nowrap" }}>
            <span style={{ ...note(32, r.color), fontWeight: 700 }}>{r.node}</span>
          </Ink>
          <Ink at={r.at + 10} dur={14} style={{ left: S.x0, top: y(S_Y) + 90 + i * 100 + 44, whiteSpace: "nowrap" }}>
            <Label size={21} color={INK_SOFT} weight={520}>
              {r.note}
            </Label>
          </Ink>
        </React.Fragment>
      ))}

      {/* ── Fig. 18: the scatter ── */}
      <FigLabel n="19" title="Two numbers, one point per row" at={corrFrom} x={160} y={y(300)} />
      <Svg>
        <line x1={BOX.x0} x2={BOX.x1} y1={bottom} y2={bottom} stroke={INK} strokeWidth={1.6} opacity={ease(frame, corrFrom + 2, 12)} />
        <line x1={BOX.x0} x2={BOX.x0} y1={bottom} y2={top} stroke={INK} strokeWidth={1.6} opacity={ease(frame, corrFrom + 2, 12)} />
        {/* The rising curve, sliding into its ranks. */}
        {curveOut < 1
          ? CURVE.x.map((xv, i) => {
              const a = ease(frame, pearsonAt - 4 + i * 0.5, 6);
              if (a <= 0) return null;
              const cx = lerp(px(xv, C.xlo, C.xhi), px(RX[i], R.lo, R.hi), toRank);
              const cy = lerp(py(CURVE.y[i], C.ylo, C.yhi), py(RY[i], R.lo, R.hi), toRank);
              return <circle key={i} cx={cx} cy={cy} r={7 * a} fill={toRank > 0.5 ? DATA : DOT} stroke={PAPER} strokeWidth={1.2} opacity={1 - curveOut} />;
            })
          : null}
        {fitIn > 0 && curveOut < 1 ? (
          <line
            x1={px(C.xlo, C.xlo, C.xhi)}
            y1={py(CURVE_FIT.a + CURVE_FIT.b * C.xlo, C.ylo, C.yhi)}
            x2={px(lerp(C.xlo, C.xhi, fitIn), C.xlo, C.xhi)}
            y2={py(CURVE_FIT.a + CURVE_FIT.b * lerp(C.xlo, C.xhi, fitIn), C.ylo, C.yhi)}
            stroke={STAT}
            strokeWidth={2.6}
            strokeDasharray="8 6"
            opacity={1 - curveOut}
          />
        ) : null}
        {/* The U. */}
        {USHAPE.x.map((xv, i) => {
          const a = uIn(i);
          if (a <= 0) return null;
          return <circle key={`u${i}`} cx={px(xv, U.xlo, U.xhi)} cy={py(USHAPE.y[i], U.ylo, U.yhi)} r={4.5 * a} fill={DOT} opacity={0.8} />;
        })}
        {uFitIn > 0 ? (
          <line
            x1={px(U.xlo, U.xlo, U.xhi)}
            y1={py(U_FIT.a + U_FIT.b * U.xlo, U.ylo, U.yhi)}
            x2={px(lerp(U.xlo, U.xhi, uFitIn), U.xlo, U.xhi)}
            y2={py(U_FIT.a + U_FIT.b * lerp(U.xlo, U.xhi, uFitIn), U.ylo, U.yhi)}
            stroke={STAT}
            strokeWidth={2.6}
            strokeDasharray="8 6"
          />
        ) : null}
        {parabola > 0 ? (
          <polyline
            points={Array.from({ length: 81 }, (_, k) => {
              const xv = -5 + (10 * k) / 80;
              return `${px(xv, U.xlo, U.xhi).toFixed(1)},${py(xv * xv, U.ylo, U.yhi).toFixed(1)}`;
            }).join(" ")}
            fill="none"
            stroke={DATA}
            strokeWidth={3.2}
            pathLength={1}
            strokeDasharray={`${parabola} 1`}
          />
        ) : null}
      </Svg>
      <Note at={straightAt + 4} x={BOX.x1 - 10} y={bottom - 50} align="right" out={ranksAt - 4}>
        <Label size={21} color={STAT_INK} style={halo}>
          Pearson&apos;s straight line
        </Label>
      </Note>
      <Note at={curveAt} x={BOX.x0} y={top - 44} out={ranksAt - 4}>
        <Label size={21} color={INK_SOFT} weight={520} style={halo}>
          a curve that always rises
        </Label>
      </Note>
      <Note at={risingAt - 4} x={BOX.x0} y={top - 44} out={nearAt - 4}>
        <Label size={21} color={DATA_INK} style={halo}>
          the same points, as ranks
        </Label>
      </Note>
      <Note at={thoughAt - 2} x={px(0, U.xlo, U.xhi)} y={py(U_FIT.a, U.ylo, U.yhi) - 40} from="up">
        <span style={{ display: "inline-block", transform: "translateX(-50%)" }}>
          <Label size={21} color={STAT_INK} style={halo}>
            the best straight line: flat
          </Label>
        </span>
      </Note>
      <Note at={uAt} x={BOX.x0} y={top - 44}>
        <Label size={21} color={INK_SOFT} weight={520} style={halo}>
          a U: y is x squared, plus a little noise
        </Label>
      </Note>
    </AbsoluteFill>
  );
};
