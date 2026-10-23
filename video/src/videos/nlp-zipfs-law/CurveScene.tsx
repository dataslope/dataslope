import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { fmt, INK, INK_SOFT, label, note, PAPER, TABULAR } from "../../editorial/style";
import { FigLabel } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { EMMA, pct } from "./data";
import { Bracket, DATA, DATA_INK, DATA_WASH, Headline, LAW, lerp, Mark, pulse, Spot, Svg, Tag } from "./kit";

/** The plot box, shared by the plain and the log view. */
const CX0 = 250;
const CX1 = 1700;
const CW = CX1 - CX0;
/** Plain count axis: 0 to 5,600. */
const LIN_TOP = 5600;
const LIN_TICKS = [0, 1000, 2000, 3000, 4000, 5000];
/** Log count axis: about 0.6 to 12,000; log rank axis: 1 to 10,000. */
const LO = -0.22;
const HI = 4.08;
const DECADES = 4;
const LOG_TICKS = [1, 10, 100, 1000, 10000];
/** Rank-axis tick steps for the plain view as it zooms out. */
const STEPS = [5, 10, 20, 50, 100, 200, 500, 1000, 2000];
/** Bars shown before the zoom, and where the first zoom stops. */
const FIRST = 20;
const SECOND = 100;
/** The slope triangle on the 1/rank line: one decade of rank. */
const TRI_FROM = 10;
const TRI_TO = 100;

type Run = readonly [number, number, number];

/** The curve as runs of equal counts: [first rank, last rank, count]. */
const RUNS: Run[] = (() => {
  const c = EMMA.curve;
  const runs: Run[] = [];
  for (let i = 0; i < c.length; ) {
    if (i + 1 < c.length && c[i + 1][1] === c[i][1]) {
      runs.push([c[i][0], c[i + 1][0], c[i][1]]);
      i += 2;
    } else {
      runs.push([c[i][0], c[i][0], c[i][1]]);
      i += 1;
    }
  }
  return runs;
})();

const niceRank = (v: number) => fmt(v, 0);

/**
 * Parts 1 and 2: every word in Emma, ranked. Fig. 1 builds the top twenty as
 * bars on plain axes, widens to a hundred (the cliff), then zooms the rank
 * axis out to all 7,079 ranks with the window's last rank counting beside
 * it; a bracket marks the 53% used once or twice, flat on the floor. Then
 * both axes morph onto log scales (Fig. 2): the same counts straighten, the
 * dashed 1/rank line is drawn through them, a triangle shows ten times the
 * rank for a tenth the count, and the first thousand ranks are picked out
 * with their fitted slope.
 */
export const CurveScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("hook").from;
  const emmaAt = n.word("hook", "Emma");
  const rankAt = n.word("hook", "rank");
  const toAt = n.word("top", "to");
  const fiveAt = n.word("top", "five thousand");
  const plainAt = n.word("cliff", "plain axes");
  const countsAt = n.word("cliff", "counts");
  const cliffEnd = n.word("cliff", "cliff", { edge: "end" });
  const keepAt = n.word("scroll", "keep going");
  const ninetyEnd = n.word("scroll", "seventy-nine", { edge: "end" });
  const halfAt = n.word("tail", "More than half");
  const floorAt = n.word("tail", "floor");
  const onceAt = n.word("tail", "once or twice");
  const switchAt = n.word("switch", "switch");
  const logAt = n.word("switch", "log scale");
  const tenAt = n.word("switch", "ten times");
  const straightensAt = n.word("straight", "straightens");
  const zipfAt = n.word("straight", "Zipf's law");
  const overAt = n.word("law", "one over the rank");
  const furtherAt = n.word("law", "ten times further");
  const tenthAt = n.word("law", "a tenth");
  const slopeAt = n.word("slope", "slope of minus one");
  const thousandAt = n.word("slope", "first thousand");
  const pointAt = n.word("slope", "minus one point one");

  const CY0 = y(400);
  const CY1 = y(830);
  const CH = CY1 - CY0;

  // ── The rank window of the plain view: 20, then 100, then every rank ──
  const z1 = ease(frame, countsAt, Math.max(12, cliffEnd - countsAt));
  const z2Dur = Math.max(30, ninetyEnd - keepAt);
  const z2 = ease(frame, keepAt, z2Dur);
  const win = Math.exp(lerp(Math.log(FIRST), Math.log(SECOND), z1) + (Math.log(EMMA.distinct) - Math.log(SECOND)) * z2);

  // ── Plain to log ──
  const t = ease(frame, logAt, 46);
  const linX = (edge: number) => CX0 + (edge / win) * CW;
  const logX = (rank: number) => CX0 + (Math.log10(Math.max(1, rank)) / DECADES) * CW;
  const linY = (c: number) => CY1 - (c / LIN_TOP) * CH;
  const logY = (c: number) => CY1 - ((Math.log10(Math.max(c, 10 ** LO)) - LO) / (HI - LO)) * CH;
  /** A slot edge (rank k spans edges k-1 to k), placed for the morph. */
  const ex = (edge: number) => lerp(linX(edge), logX(edge + 0.5), t);
  /** A point at a rank (the middle of its slot on the plain axis). */
  const px = (rank: number) => lerp(linX(rank - 0.5), logX(rank), t);
  const py = (c: number) => lerp(linY(c), logY(c), t);

  // The step curve, clipped to the runs that start inside the window.
  const visible = RUNS.filter(([a]) => a - 1 <= win + 1);
  const top: string[] = [];
  for (const [a, b, c] of visible) {
    top.push(`${ex(a - 1).toFixed(1)},${py(c).toFixed(1)}`, `${ex(b).toFixed(1)},${py(c).toFixed(1)}`);
  }
  const lastEdge = Math.min(visible[visible.length - 1][1], EMMA.distinct);
  const fillPath = `M${ex(0).toFixed(1)},${CY1} L${top.join(" L")} L${ex(lastEdge).toFixed(1)},${CY1} Z`;
  const linePath = `M${top.join(" L")}`;

  // ── Building the first twenty bars ──
  const barIn = (k: number) => ease(frame, rankAt - 2 + (k - 1) * 2, 12);
  const buildEnd = rankAt - 2 + (FIRST - 1) * 2 + 12;
  const built = frame >= buildEnd ? 1 : 0;
  const pitch = CW / win;
  const gap = pitch * 0.28;
  const gapCount = gap > 0.6 ? Math.min(Math.ceil(win), 420) : 0;

  // ── Plain-view rank ticks, cross-fading as the window widens ──
  const tickSets = STEPS.map((s) => {
    const k = win / s;
    const o = Math.min(ease(k, 2, 1), 1 - ease(k, 8, 1)) * ease(frame, countsAt + 6, 12) * (1 - ease(frame, logAt - 4, 12));
    const ticks: number[] = [];
    if (o > 0.01) for (let v = s; v < win; v += s) if (linX(v - 0.5) < CX1 - 90) ticks.push(v);
    return { s, o, ticks };
  });
  const counterOn = ease(frame, keepAt - 2, 8);
  const wordsOut = 1 - ease(frame, countsAt, 12);

  // ── Axes ──
  const axesIn = ease(frame, from - 4, 16);
  const linTicksO = 1 - ease(frame, logAt - 4, 14);
  const logTicksO = ease(frame, logAt + 26, 16);

  // ── The 1/rank line and its triangle ──
  const lawY = (rank: number) => logY(EMMA.lineC / rank);
  const lawFrom = EMMA.lineC / 10 ** HI;
  const lawTo = 10 ** DECADES;
  const lawP = ease(frame, straightensAt, 34);
  const triH = ease(frame, furtherAt, 16);
  const triV = ease(frame, tenthAt, 14);
  const A: readonly [number, number] = [logX(TRI_FROM), lawY(TRI_FROM)];
  const C: readonly [number, number] = [logX(TRI_TO), lawY(TRI_TO)];
  const D: readonly [number, number] = [A[0], C[1]];

  // The first thousand ranks, picked out under the curve.
  const fitP = ease(frame, thousandAt - 2, 24);
  const fitTop: string[] = [];
  for (const [a, b, c] of RUNS) {
    if (a > EMMA.fitRanks) break;
    fitTop.push(`${logX(a - 0.5).toFixed(1)},${logY(c).toFixed(1)}`, `${logX(Math.min(b, EMMA.fitRanks) + 0.5).toFixed(1)},${logY(c).toFixed(1)}`);
  }

  // ── The bracket over the words used once or twice (plain view, full window) ──
  const twiceX0 = CX0 + ((EMMA.firstOnceOrTwiceRank - 1) / EMMA.distinct) * CW;
  const bracketY = CY1 - 34;
  const tailOut = switchAt - 4;

  // "to" and its count ride the first bar, then the first point.
  const firstX = Math.max(px(1), CX0 + 40);
  const firstTop = py(EMMA.top[0].count);

  return (
    <AbsoluteFill>
      {/* ── Sound ── */}
      <Sfx name="el-pop" at={emmaAt} level={-30} />
      <Sfx name="el-sprinkle" at={rankAt} level={-32} />
      <Sfx name="el-tap" at={fiveAt} level={-27} />
      <Sfx name="el-whoosh" at={countsAt} level={-33} />
      <Sfx name="el-whoosh" at={keepAt} level={-32} />
      <Sfx name="el-tap" at={ninetyEnd - 2} level={-27} />
      <Sfx name="el-pencil" at={halfAt} level={-34} />
      <Sfx name="el-whoosh" at={logAt} level={-31} />
      <Sfx name="el-pencil" at={straightensAt} level={-34} />
      <Sfx name="el-tap" at={zipfAt} level={-28} />
      <Sfx name="el-pencil" at={furtherAt} level={-35} />
      <Sfx name="el-pencil" at={tenthAt} level={-35} />
      <Sfx name="el-tap" at={pointAt} level={-28} />

      {/* ── Headlines ── */}
      <Headline at={from - 2} lead="Every word in Emma," turn="ranked." turnAt={rankAt} out={plainAt - 6} />
      <Headline at={plainAt - 2} lead="A cliff," turn="then a flat floor." turnAt={keepAt} out={switchAt - 6} />
      <Headline at={switchAt} lead="On log scales," turn="a straight line." turnAt={straightensAt} />

      <Spot id="nlp-counting-words-novel" at={emmaAt - 4} out={switchAt - 4} left={1500} top={y(116)} width={300} height={193} />

      {/* ── Figure labels: the same counts, plain then log ── */}
      <FigLabel n="1" title="Emma's words, ranked by count, on plain axes" at={from} x={96} y={y(290)} out={logAt - 6} />
      <FigLabel n="2" title="The same counts, on log scales" at={logAt + 4} x={96} y={y(290)} />

      <Svg opacity={axesIn}>
        <defs>
          <clipPath id="zipf-plot">
            <rect x={CX0 - 2} y={CY0 - 60} width={CW + 4} height={CH + 61} />
          </clipPath>
        </defs>
        {/* The counts: an area on plain axes that becomes a line on log ones. */}
        <g clipPath="url(#zipf-plot)" opacity={built}>
          <path d={fillPath} fill={DATA} opacity={1 - t} />
          {/* Paper between the bars while they are wide enough to tell apart. */}
          {Array.from({ length: gapCount + 1 }, (_, k) => (
            <rect key={k} x={linX(k) - gap / 2} y={CY0 - 60} width={gap} height={CY1 - CY0 + 59} fill={PAPER} />
          ))}
          {t > 0 ? <path d={linePath} fill="none" stroke={DATA} strokeWidth={3.2} strokeLinejoin="round" opacity={t} /> : null}
        </g>
        {/* Bars rising one by one, drawn over the area until it is all built. */}
        {built < 1
          ? EMMA.top.map((r, i) => {
              const p = barIn(i + 1);
              if (p <= 0) return null;
              const x0 = linX(i) + gap / 2;
              const hgt = (CY1 - linY(r.count)) * p;
              return <rect key={r.word} x={x0} y={CY1 - hgt} width={pitch - gap} height={hgt} fill={DATA} />;
            })
          : null}
        {/* The first thousand ranks, washed under the curve on log axes. */}
        {fitP > 0 ? (
          <path
            d={`M${fitTop.join(" L")}`}
            fill="none"
            stroke={DATA_WASH}
            strokeWidth={16}
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{ clipPath: `inset(0 ${(1 - fitP) * 100}% 0 0)` }}
          />
        ) : null}
        {fitP > 0 ? (
          <path d={`M${fitTop.join(" L")}`} fill="none" stroke={DATA} strokeWidth={3.2} strokeLinejoin="round" style={{ clipPath: `inset(0 ${(1 - fitP) * 100}% 0 0)` }} />
        ) : null}

        {/* Axes. */}
        <line x1={CX0 - 14} x2={CX1} y1={CY1 + 0.5} y2={CY1 + 0.5} stroke={INK} strokeWidth={1.6} />
        <line x1={CX0 - 14} x2={CX0 - 14} y1={CY0 - 20} y2={CY1} stroke={INK} strokeWidth={1.6} />
        <g opacity={linTicksO}>
          {LIN_TICKS.map((v) => (
            <line key={v} x1={CX0 - 22} x2={CX0 - 14} y1={linY(v)} y2={linY(v)} stroke={INK} strokeWidth={1.3} />
          ))}
        </g>
        <g opacity={logTicksO}>
          {LOG_TICKS.map((v) => (
            <g key={v}>
              <line x1={CX0 - 22} x2={CX0 - 14} y1={logY(v)} y2={logY(v)} stroke={INK} strokeWidth={1.3} />
              <line x1={logX(v)} x2={logX(v)} y1={CY1 + 1} y2={CY1 + 9} stroke={INK} strokeWidth={1.3} />
            </g>
          ))}
        </g>

        {/* One over the rank: dashed, through the middle of ranks 1 to 1,000. */}
        {lawP > 0 ? (
          <line
            x1={logX(lawFrom)}
            y1={lawY(lawFrom)}
            x2={lerp(logX(lawFrom), logX(lawTo), lawP)}
            y2={lerp(lawY(lawFrom), lawY(lawTo), lawP)}
            stroke={LAW}
            strokeWidth={2.4}
            strokeDasharray="10 8"
          />
        ) : null}
        {/* Ten times the rank, a tenth the count. */}
        {triH > 0 ? <line x1={D[0]} y1={D[1]} x2={lerp(D[0], C[0], triH)} y2={D[1]} stroke={INK} strokeWidth={2} /> : null}
        {triV > 0 ? <line x1={A[0]} y1={A[1]} x2={A[0]} y2={lerp(A[1], D[1], triV)} stroke={INK} strokeWidth={2} /> : null}
      </Svg>

      {/* ── Count-axis numbers ── */}
      {LIN_TICKS.map((v) => (
        <div
          key={`l${v}`}
          style={{ position: "absolute", left: CX0 - 30, top: linY(v), transform: "translate(-100%, -50%)", opacity: axesIn * linTicksO, ...note(20, INK_SOFT), ...TABULAR }}
        >
          {fmt(v, 0)}
        </div>
      ))}
      {LOG_TICKS.map((v, i) => (
        <React.Fragment key={`g${v}`}>
          <div style={{ position: "absolute", left: CX0 - 30, top: logY(v), transform: "translate(-100%, -50%)", opacity: logTicksO, ...note(20, INK_SOFT), ...TABULAR }}>
            <Mark at={tenAt + i * 5} out={straightensAt}>{fmt(v, 0)}</Mark>
          </div>
          <div style={{ position: "absolute", left: logX(v), top: CY1 + 14, transform: "translateX(-50%)", opacity: logTicksO, ...note(20, INK_SOFT), ...TABULAR }}>
            <Mark at={tenAt + i * 5} out={straightensAt}>{fmt(v, 0)}</Mark>
          </div>
        </React.Fragment>
      ))}
      <Tag x={CX0 - 14} y={CY0 - 58} at={from + 4} size={20} weight={600}>
        times it appears
        <span style={{ opacity: ease(frame, logAt + 20, 12) }}>, log scale</span>
      </Tag>
      <Tag x={CX1} y={CY1 + 62} at={from + 6} align="right" size={20} weight={600}>
        rank<span style={{ opacity: ease(frame, logAt + 20, 12) }}>, log scale</span>
      </Tag>

      {/* ── Plain-view rank axis: the top words, then numbers as it widens ── */}
      {EMMA.top.map((r, i) => (
        <div
          key={r.word}
          style={{
            position: "absolute",
            left: linX(i + 0.5),
            top: CY1 + 12,
            transform: "translateX(-50%)",
            opacity: barIn(i + 1) * wordsOut,
            ...label(20, INK),
            fontWeight: 600,
          }}
        >
          {i === 0 ? <Mark at={toAt - 2}>{r.word}</Mark> : r.word}
        </div>
      ))}
      <div style={{ position: "absolute", left: linX(0.5), top: CY1 + 14, transform: "translateX(-50%)", opacity: ease(frame, countsAt + 6, 10) * linTicksO, ...note(20, INK_SOFT), ...TABULAR }}>
        1
      </div>
      {tickSets.map(({ s, o, ticks }) =>
        o > 0.01
          ? ticks.map((v) => (
              <React.Fragment key={`${s}-${v}`}>
                <Svg opacity={o}>
                  <line x1={linX(v - 0.5)} x2={linX(v - 0.5)} y1={CY1 + 1} y2={CY1 + 8} stroke={INK} strokeWidth={1.2} />
                </Svg>
                <div style={{ position: "absolute", left: linX(v - 0.5), top: CY1 + 14, transform: "translateX(-50%)", opacity: o, ...note(20, INK_SOFT), ...TABULAR }}>
                  {niceRank(v)}
                </div>
              </React.Fragment>
            ))
          : null,
      )}
      {/* The last rank in the window, counting as the axis widens. */}
      <div
        style={{
          position: "absolute",
          left: CX1,
          top: CY1 + 14,
          transform: "translateX(-50%)",
          opacity: counterOn * linTicksO,
          ...note(20, DATA_INK),
          fontWeight: 650,
          ...TABULAR,
        }}
      >
        <Mark at={ninetyEnd - 2}>{fmt(Math.round(win), 0)}</Mark>
      </div>
      <Svg opacity={counterOn * linTicksO}>
        <line x1={CX1} x2={CX1} y1={CY1 - 8} y2={CY1 + 9} stroke={DATA} strokeWidth={3} />
      </Svg>

      {/* "to" and its count. */}
      <Tag
        x={firstX + lerp(14, 22, t)}
        y={firstTop - 40 + lerp(0, 6, t)}
        at={fiveAt - 2}
        out={straightensAt - 6}
        size={21}
        color={DATA_INK}
        weight={650}
        style={{ background: PAPER, padding: "0 6px" }}
      >
        to: <span style={TABULAR}>{fmt(EMMA.top[0].count, 0)}</span>
      </Tag>

      {/* ── More than half the words, flat on the floor ── */}
      <Bracket x0={twiceX0} x1={CX1} y={bracketY} at={halfAt - 2} out={tailOut} color={INK} up={false} />
      <Tag x={(twiceX0 + CX1) / 2} y={bracketY - 66} at={halfAt} out={tailOut} align="center" size={22} color={INK} weight={650}>
        more than half the words: <span style={TABULAR}>{pct(EMMA.onceOrTwiceShare)}</span>
      </Tag>
      <Tag x={(twiceX0 + CX1) / 2} y={bracketY - 36} at={onceAt - 2} out={tailOut} align="center" size={21} color={INK_SOFT} weight={600}>
        used <Mark at={onceAt}>once or twice</Mark>
      </Tag>
      <Svg opacity={0.14 * pulse(frame, floorAt - 4, 40) * (1 - t)}>
        <rect x={twiceX0} y={CY1 - 20} width={CX1 - twiceX0} height={20} fill={DATA} />
      </Svg>

      {/* ── The law, on log axes ── */}
      <Tag x={logX(900)} y={lawY(900) - 104} at={zipfAt - 2} size={24} color={INK} weight={700} style={{ background: PAPER, padding: "0 6px" }}>
        Zipf&apos;s law
      </Tag>
      <Tag x={logX(900)} y={lawY(900) - 70} at={overAt - 2} size={21} color={INK_SOFT} weight={600} style={{ background: PAPER, padding: "0 6px" }}>
        count falls as one over the rank
        <span style={{ opacity: ease(frame, slopeAt, 12) }}>
          : slope <span style={TABULAR}>−1</span>
        </span>
      </Tag>
      <Tag x={(D[0] + C[0]) / 2} y={D[1] + 12} at={furtherAt + 4} align="center" size={21} color={INK} weight={600}>
        <Mark at={furtherAt + 2}>10×</Mark> the rank
      </Tag>
      <Tag x={A[0] - 14} y={(A[1] + D[1]) / 2 - 14} at={tenthAt + 2} align="right" size={21} color={INK} weight={600}>
        <Mark at={tenthAt + 2}>a tenth</Mark> the count
      </Tag>
      <Tag x={logX(24)} y={logY(5200) - 30} at={thousandAt} size={21} color={DATA_INK} weight={650}>
        Emma, ranks 1 to <span style={TABULAR}>{fmt(EMMA.fitRanks, 0)}</span>
        <span style={{ opacity: ease(frame, pointAt - 2, 12) }}>
          : slope <Mark at={pointAt}>{EMMA.slope.toFixed(2).replace("-", "−")}</Mark>
        </span>
      </Tag>
    </AbsoluteFill>
  );
};
