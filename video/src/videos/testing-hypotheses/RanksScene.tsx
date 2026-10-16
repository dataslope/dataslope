import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { body, fmt, halo, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, NextLine, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { jitter, MWU } from "./data";
import { Bracket, DATA, DATA_INK, DOT, Head, Label, lerp, Mark, pulse, STAT, STAT_INK, STAT_WASH, Svg } from "./parts";

/** Minutes to resolve a ticket. */
const X: XScale = { lo: 0, hi: 420, x0: 260, x1: 1740 };
const ROWS = [420, 520];
const AXIS = 590;
/** The rank line: 1 to 80, evenly spaced. */
const RANK_Y = 760;
const RX0 = 260;
const RX1 = 1740;

const ALL = [...MWU.a.map((v, i) => ({ v, g: 0, i })), ...MWU.b.map((v, i) => ({ v, g: 1, i }))];
const ORDER = [...ALL.keys()].sort((p, q) => ALL[p].v - ALL[q].v);
const RANK = new Array<number>(ALL.length);
ORDER.forEach((idx, k) => (RANK[idx] = k + 1));
const meanRank = (g: number) => {
  const r = ALL.map((d, k) => (d.g === g ? RANK[k] : 0)).filter(Boolean);
  return r.reduce((s, v) => s + v, 0) / r.length;
};
const MEAN_RANK = [meanRank(0), meanRank(1)];
const JIT = [jitter(611, 40), jitter(612, 40)];
const isOutlier = (d: { i: number }) => d.i < MWU.outliers;
const rankX = (r: number) => RX0 + ((r - 1) / (ALL.length - 1)) * (RX1 - RX0);
const OUT_RANKS = ALL.map((d, k) => (isOutlier(d) ? RANK[k] : 0)).filter(Boolean);
/** The closing axis: the effect, with zero on it. */
const E: XScale = { lo: -2, hi: 4, x0: 260, x1: 1660 };
const E_BASE = 600;

/**
 * Two support queues, each with three monster tickets: the outliers swell
 * Welch's standard error until it sees nothing (p = 0.72), while
 * Mann-Whitney, on ranks, finds the shift (p = 0.033). Then the bridge to
 * Unit 8: a test says whether an effect could be zero, not how big it is.
 */
export const RanksScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const ranksFrom = n.beat("ranks").from;
  const queuesAt = n.word("ranks", "support queues");
  const monsterAt = n.word("ranks", "monster");
  const hoursAt = n.word("ranks", "hours");
  const swellAt = n.word("welch", "swell");
  const welchAt = n.word("welch", "Welch's");
  const nothingAt = n.word("welch", "nothing");
  const sevenAt = n.word("welch", "point seven two");
  const mannAt = n.word("mwu", "Mann-Whitney");
  const ranksAt = n.word("mwu", "ranks");
  const shiftAt = n.word("mwu", "shift");
  const p033At = n.word("mwu", "point zero three three");
  const farAt = n.word("line", "how far out");
  const standsAt = n.word("line", "stands in line");
  const doesntAt = n.word("line", "doesn't");
  const onlyWhereAt = n.word("line", "only where");
  const everyAt = n.word("next", "Every test");
  const answersAt = n.word("next", "answers");
  const couldAt = n.word("next", "could");
  const meansAt = n.word("next", "means");
  const zeroAt = n.word("next", "zero");
  const bigAt = n.word("next", "how big");
  const seemsAt = n.word("next", "seems");

  const toRanks = (k: number) => ease(frame, ranksAt - 6 + (RANK[k] / ALL.length) * 18, 18);
  const outGlow = pulse(frame, hoursAt - 4, 26) + pulse(frame, doesntAt - 2, 26) + pulse(frame, standsAt - 2, 30);
  const farGlow = pulse(frame, farAt, 26);
  const meanIn = ease(frame, swellAt - 6, 14);
  const rankMeans = ease(frame, shiftAt - 4, 16);
  const close = ease(frame, everyAt - 6, 18);
  const fade = 1 - close;
  const pin = ease(frame, zeroAt - 6, 14);
  const axisIn = ease(frame, answersAt - 4, 18);
  const zeroGlow = pulse(frame, zeroAt, 26);

  return (
    <AbsoluteFill>
      {/* ── Sound: the queues, the outliers, the means, the slide into ranks, the close ── */}
      <Sfx name="el-sprinkle" at={queuesAt - 4} level={-33} />
      <Sfx name="el-pop" at={monsterAt - 2} level={-29} />
      <Sfx name="el-tap" at={sevenAt - 4} level={-29} />
      <Sfx name="el-whoosh" at={ranksAt - 6} level={-33} />
      <Sfx name="el-tap" at={p033At - 4} level={-28} />
      <Sfx name="el-pencil" at={seemsAt - 8} level={-34} />

      <Head a="Outliers" b="swell the noise." at={ranksFrom - 6} bAt={swellAt - 4} out={mannAt - 8} />
      <Head a="Ranks" b="see the shift." at={mannAt - 4} bAt={shiftAt - 6} out={everyAt - 8} />
      <Head a="Could the effect be zero?" at={couldAt - 6} />

      <div style={{ position: "absolute", inset: 0, opacity: fade }}>
        <FigLabel n="20" title="Two support queues: minutes to resolve each ticket" at={ranksFrom} x={160} y={y(290)} />
        <Axis scale={X} base={y(AXIS)} ticks={[0, 60, 120, 180, 240, 300, 360, 420]} at={ranksFrom + 2} opacity={1 - 0.6 * ease(frame, ranksAt - 6, 16)} />
        {["Queue A", "Queue B"].map((t, g) => (
          <div key={t} style={{ position: "absolute", left: 120, top: y(ROWS[g]) - 15, opacity: ease(frame, queuesAt - 4 + g * 6, 12), ...label(22, g ? DATA_INK : INK) }}>
            {t}
          </div>
        ))}
        <Svg>
          {/* However far out on the minutes, only the last places on the rank line. */}
          {ease(frame, farAt - 2, 12) > 0 ? (
            <rect
              x={sx(X, 270)}
              y={y(ROWS[0]) - h(50)}
              width={(sx(X, 420) - sx(X, 270)) * ease(frame, farAt - 2, 12)}
              height={y(ROWS[1]) - y(ROWS[0]) + h(100)}
              fill={STAT_WASH}
              opacity={0.8}
            />
          ) : null}
          {ease(frame, onlyWhereAt - 2, 12) > 0 ? (
            <rect
              x={rankX(Math.min(...OUT_RANKS)) - 12}
              y={y(RANK_Y) - 36}
              width={(rankX(Math.max(...OUT_RANKS)) - rankX(Math.min(...OUT_RANKS)) + 24) * ease(frame, onlyWhereAt - 2, 12)}
              height={72}
              fill={STAT_WASH}
              opacity={0.9}
              rx={8}
            />
          ) : null}
        </Svg>
        <Svg>
          {/* Each queue's mean, dragged right by its three monsters. */}
          {[MWU.meanA, MWU.meanB].map((m, g) =>
            meanIn > 0 ? (
              <line
                key={g}
                x1={sx(X, m)}
                x2={sx(X, m)}
                y1={y(ROWS[g]) - h(34) * meanIn}
                y2={y(ROWS[g]) + h(34) * meanIn}
                stroke={STAT}
                strokeWidth={4}
                strokeLinecap="round"
                opacity={1 - ease(frame, ranksAt - 6, 12)}
              />
            ) : null,
          )}
          {ALL.map((d, k) => {
            const a = ease(frame, queuesAt - 4 + d.g * 6 + d.i * 0.25, 6);
            if (a <= 0) return null;
            const t = toRanks(k);
            const fx = sx(X, d.v);
            const fy = y(ROWS[d.g]) + h((JIT[d.g][d.i] - 0.5) * 36);
            const tx = rankX(RANK[k]);
            const ty = y(RANK_Y) + (d.g ? 14 : -14);
            const out = isOutlier(d);
            const glow = out ? Math.min(1, outGlow) : 0;
            return (
              <circle
                key={k}
                cx={lerp(fx, tx, t)}
                cy={lerp(fy, ty, t)}
                r={(out ? 8 + 4 * glow : 6.5) * a}
                fill={d.g ? DATA : DOT}
                stroke={out && glow > 0.05 ? STAT : PAPER}
                strokeWidth={out ? 1.6 + 2 * glow : 1.2}
              />
            );
          })}
          {/* The rank line, and each queue's average rank. */}
          {ease(frame, ranksAt - 6, 14) > 0 ? (
            <line x1={RX0} x2={RX0 + (RX1 - RX0) * ease(frame, ranksAt - 6, 18)} y1={y(RANK_Y) + 34} y2={y(RANK_Y) + 34} stroke={INK} strokeWidth={1.6} />
          ) : null}
          {MEAN_RANK.map((r, g) =>
            rankMeans > 0 ? (
              <line
                key={g}
                x1={rankX(r)}
                x2={rankX(r)}
                y1={y(RANK_Y) + (g ? 2 : -46) }
                y2={y(RANK_Y) + (g ? 2 : -46) + 44 * rankMeans}
                stroke={g ? DATA_INK : INK}
                strokeWidth={4}
                strokeLinecap="round"
              />
            ) : null,
          )}
        </Svg>
        {[1, 20, 40, 60, 80].map((r) => (
          <div
            key={r}
            style={{
              position: "absolute",
              left: rankX(r),
              top: y(RANK_Y) + 46,
              transform: "translateX(-50%)",
              opacity: ease(frame, ranksAt, 12),
              ...note(20, INK_SOFT),
            }}
          >
            {r}
          </div>
        ))}
        <Note at={ranksAt + 6} x={RX1} y={y(RANK_Y) + 84} align="right">
          <Label size={21} color={INK_SOFT} weight={520}>
            rank, shortest to longest
          </Label>
        </Note>
        <Note at={monsterAt + 4} x={sx(X, 280) - 16} y={y(ROWS[0]) - 76} align="right">
          <Label size={22} color={STAT_INK} style={halo}>
            three tickets each that ran for hours
          </Label>
        </Note>
        <Note at={nothingAt - 4} x={sx(X, 110)} y={y(ROWS[1]) + 46}>
          <span style={{ ...note(26, INK), fontWeight: 650, ...halo, whiteSpace: "nowrap" }}>
            means {fmt(MWU.meanA, 0)} and {fmt(MWU.meanB, 0)}: Welch&apos;s t-test, p = <Mark at={sevenAt - 2}>{fmt(MWU.welchP, 2)}</Mark>
          </span>
        </Note>
        <Note at={welchAt - 2} x={sx(X, MWU.meanB) + 12} y={y(ROWS[0]) - 24}>
          <Label size={21} color={STAT_INK} style={halo}>
            the means
          </Label>
        </Note>
        <Note at={p033At - 4} x={rankX(MEAN_RANK[1]) + 16} y={y(RANK_Y) - 4}>
          <span style={{ ...note(26, DATA_INK), fontWeight: 700, ...halo, whiteSpace: "nowrap" }}>
            Mann-Whitney, p = {fmt(MWU.mwuP, 3)}
          </span>
        </Note>
        <Note at={shiftAt} x={rankX(MEAN_RANK[0]) - 14} y={y(RANK_Y) - 62} align="right">
          <Label size={21} color={INK_SOFT} weight={520} style={halo}>
            average ranks, A and B
          </Label>
        </Note>
        <Note at={standsAt - 4} x={RX1} y={y(RANK_Y) - 76} align="right">
          <span style={{ ...label(22, STAT_INK), ...halo, display: "inline-block", transform: `scale(${1 + 0.06 * farGlow})`, transformOrigin: "100% 50%" }}>
            the six monsters: ranks {Math.min(...OUT_RANKS)} to {Math.max(...OUT_RANKS)}
          </span>
        </Note>
      </div>

      {/* ── The close: the question every test asks, and the one it can't ── */}
      {close > 0 ? (
        <Svg opacity={close * axisIn}>
          <line x1={E.x0} x2={E.x0 + (E.x1 - E.x0) * axisIn} y1={y(E_BASE)} y2={y(E_BASE)} stroke={INK} strokeWidth={1.6} />
          <line x1={sx(E, 0)} x2={sx(E, 0)} y1={y(E_BASE) - 6} y2={y(E_BASE) + 8} stroke={INK} strokeWidth={2} />
          {pin > 0 ? (
            <>
              <line x1={sx(E, 0)} x2={sx(E, 0)} y1={y(E_BASE)} y2={y(E_BASE) - h(150) * pin} stroke={STAT} strokeWidth={4} strokeLinecap="round" />
              <circle cx={sx(E, 0)} cy={y(E_BASE) - h(150) * pin} r={11 + 4 * zeroGlow} fill={STAT} stroke={PAPER} strokeWidth={2} />
            </>
          ) : null}
        </Svg>
      ) : null}
      <div style={{ position: "absolute", left: sx(E, 0), top: y(E_BASE) + 18, transform: "translateX(-50%)", opacity: close * axisIn }}>
        <Label size={26}>0</Label>
      </div>
      <Note at={answersAt + 2} x={E.x1} y={y(E_BASE) + 18} align="right">
        <Label size={21} color={INK_SOFT}>
          the effect
        </Label>
      </Note>
      <Note at={zeroAt + 2} x={sx(E, 0) - 24} y={y(E_BASE) - h(150) - 18} align="right">
        <Label size={24} color={STAT_INK}>
          what a test asks
        </Label>
      </Note>
      <Bracket x0={sx(E, 0)} x1={sx(E, 2.2)} y={y(E_BASE) - h(60)} at={bigAt - 6} color={DATA} width={3} up />
      <Note at={bigAt - 2} x={sx(E, 1.1)} y={y(E_BASE) - h(60) - 50} from="up">
        <span style={{ display: "inline-block", transform: "translateX(-50%)" }}>
          <Label size={24} color={DATA_INK}>
            how big?
          </Label>
        </span>
      </Note>
      <Note at={meansAt - 4} x={sx(E, 2.4)} y={y(E_BASE) - h(60) - 50}>
        <Label size={24} color={INK_SOFT}>
          and what does it mean?
        </Label>
      </Note>
      <Ink at={everyAt + 4} dur={18} style={{ left: 160, top: y(300), whiteSpace: "nowrap" }}>
        <span style={{ ...body(36, true), color: INK_SOFT }}>The one narrow question every test here answers.</span>
      </Ink>
      <NextLine at={seemsAt - 4} x={160} y={y(780)} width={640}>
        how big is the effect?
      </NextLine>
    </AbsoluteFill>
  );
};
