import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, normalPdf, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { body, halo, headline, HAIRLINE, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { COVERAGE, jitter } from "./data";
import { DATA, EST, EST_INK, Headline, lerp, pulse, Spot, Svg } from "./parts";

/** The population, and the strip its first sample falls onto. */
const XP: XScale = { lo: 55, hi: 145, x0: 160, x1: 1240 };
const POP_BASE = 410;
const POP_H = 110;
const STRIP = 456;
/** The hundred intervals, on an axis zoomed about the same 100. */
const XI: XScale = { lo: 86, hi: 114, x0: 160, x1: 1240 };
const ROW0 = 562;
const PITCH = 2.72;
const AXIS = 846;
const COL = 1340;
/** The one the narration calls yours: a hit near the middle of the stack. */
const YOURS = 37;

const JIT = jitter(70, COVERAGE.n);

/**
 * Part 1, the coverage simulation: a population with a known mean, one
 * sample of forty becoming one interval, then a hundred of them; the six
 * misses; the 95% as a property of the recipe; and "yours" as one line whose
 * color you cannot see.
 */
export const CoverageScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const coverageFrom = n.beat("coverage").from;
  const godAt = n.word("coverage", "god");
  const populationAt = n.word("coverage", "population");
  const hundredAt = n.word("coverage", "hundred");
  const drawAt = n.word("draw", "Draw");
  const buildAt = n.word("draw", "build");
  const againAt = n.word("draw", "again");
  const timesAt = n.word("draw", "hundred times");
  const ninetyFourAt = n.word("hits", "Ninety-four");
  const catchAt = n.word("hits", "catch");
  const sixAt = n.word("hits", "Six");
  const missAt = n.word("hits", "miss");
  const sameAt = n.word("unlucky", "same");
  const unluckyAt = n.word("unlucky", "unlucky");
  const recipeAt = n.word("recipe", "recipe");
  const recipeFrom = n.beat("recipe").from;
  const firstNinetyFiveAt = n.word("recipe", "ninety-five");
  const drewAt = n.word("unlucky", "drew");
  const everyoneAt = n.word("wrong-in", "everyone");
  const wrongEndAt = n.word("wrong-in", "wrong", { edge: "end" });
  const againAndAt = n.word("recipe", "again and again");
  const ninetyFiveAt = n.word("recipe", "ninety-five", { nth: 2 });
  const truthAt = n.word("recipe", "truth");
  const yourAt = n.word("yours", "Your");
  const oneAt = n.word("yours", "ONE");
  const holdsAt = n.word("yours", "holds");
  const seeAt = n.word("yours", "see");
  const sentenceAt = n.word("wrong-in", "sentence");
  const wrongAt = n.word("wrong-in", "wrong");

  // ── Timing of the build: the first interval slowly, then the rest ──
  const collapse = ease(frame, buildAt - 2, 12);
  const firstAt = buildAt + 8;
  const fastFrom = againAt + 2;
  const fastTo = Math.max(fastFrom + 40, timesAt + 16);
  const rowAt = (i: number) => (i === 0 ? firstAt : lerp(fastFrom, fastTo, (i - 1) / (COVERAGE.count - 2)));
  const drawn = COVERAGE.intervals.filter((_, i) => frame >= rowAt(i)).length;

  const red = ease(frame, missAt - 4, 12);
  const yoursOn = ease(frame, yourAt - 4, 14);
  const hidden = ease(frame, seeAt - 4, 18);
  const truthX = sx(XI, COVERAGE.mu);
  const rowY = (i: number) => y(ROW0) + h(i * PITCH);
  const first = COVERAGE.intervals[0];

  const popPath = (() => {
    const p = ease(frame, populationAt - 6, 20);
    const peak = normalPdf(COVERAGE.mu, COVERAGE.mu, COVERAGE.sigma);
    const pts: string[] = [];
    for (let i = 0; i <= 140; i++) {
      const v = XP.lo + ((XP.hi - XP.lo) * i) / 140;
      const yy = y(POP_BASE) - h(POP_H) * (normalPdf(v, COVERAGE.mu, COVERAGE.sigma) / peak) * p;
      pts.push(`${i ? "L" : "M"}${sx(XP, v).toFixed(1)},${yy.toFixed(1)}`);
    }
    return pts.join(" ");
  })();
  const popOut = 1 - 0.75 * hidden;

  return (
    <AbsoluteFill>
      {/* ── Sound: the forty values, the first interval, the hundred, the misses, the rings ── */}
      <Sfx name="el-sprinkle" at={drawAt - 2} level={-33} />
      <Sfx name="el-tap" at={firstAt} level={-28} />
      <Sfx name="el-sprinkle" at={fastFrom} level={-34} />
      <Sfx name="el-pop" at={missAt - 4} level={-30} />
      <Sfx name="el-pop" at={recipeAt - 6} level={-30} />
      <Sfx name="el-whoosh" at={seeAt - 4} level={-34} />

      {/* ── Headlines ── */}
      <Headline at={coverageFrom - 4} second={godAt + 6} out={ninetyFourAt - 8} size={64} italic="the truth is known.">
        Play god:
      </Headline>
      <Headline at={ninetyFourAt - 4} second={sixAt - 4} out={recipeFrom - 6} size={64} italic="Six miss.">
        Ninety-four catch it.
      </Headline>
      <Headline at={firstNinetyFiveAt - 4} second={recipeAt - 4} size={64} italic="the recipe.">
        The 95% describes
      </Headline>

      {/* ── Fig. 3: the population ── */}
      <FigLabel n="3" title={`A population whose true mean is ${COVERAGE.mu}`} at={populationAt - 8} x={160} y={y(250)} />
      <Svg opacity={popOut}>
        <path d={`${popPath} L${XP.x1},${y(POP_BASE)} L${XP.x0},${y(POP_BASE)} Z`} fill={DATA} opacity={0.12} />
        <path d={popPath} fill="none" stroke={DATA} strokeWidth={2.6} />
        <line x1={XP.x0} x2={XP.x1} y1={y(POP_BASE)} y2={y(POP_BASE)} stroke={INK} strokeWidth={1.4} opacity={ease(frame, populationAt - 6, 12)} />
        {/* The first sample: forty values, gathered into one interval. */}
        {COVERAGE.first.map((v, j) => {
          const a = ease(frame, drawAt - 2 + j * 0.3, 6);
          if (a <= 0 || collapse >= 1) return null;
          return (
            <circle
              key={j}
              cx={lerp(sx(XP, v), sx(XP, first.mean), collapse)}
              cy={lerp(y(STRIP) + h((JIT[j] - 0.5) * 22), rowY(0), collapse * collapse)}
              r={5 * a}
              fill={DATA}
              stroke={PAPER}
              strokeWidth={1}
              opacity={1 - collapse * 0.5}
            />
          );
        })}
      </Svg>

      {/* ── Fig. 4: a hundred intervals ── */}
      <FigLabel n="4" title={`A 95% interval from each sample of ${COVERAGE.n}`} at={buildAt - 6} x={160} y={y(500)} />
      <Axis scale={XI} base={y(AXIS)} ticks={[86, 93, 100, 107, 114]} at={buildAt - 4} />
      <Svg>
        {COVERAGE.intervals.map((iv, i) => {
          const at = rowAt(i);
          const p = ease(frame, at, i === 0 ? 14 : 6);
          if (p <= 0) return null;
          const mid = sx(XI, iv.mean);
          const a = lerp(mid, sx(XI, iv.lo), p);
          const b = lerp(mid, sx(XI, iv.hi), p);
          const miss = !iv.covers;
          const mine = i === YOURS;
          const lit = miss ? 1 + 0.8 * (pulse(frame, sameAt - 2, 20) + pulse(frame, drewAt - 2, 20)) : mine ? 1 + 0.6 * pulse(frame, oneAt - 2, 20) : 1;
          // Before "miss" every line is ink; after, the misses take the accent.
          // Once the truth is hidden, every line goes back to ink: you can't
          // see which yours is.
          const tint = miss ? red * (1 - hidden) : 0;
          const dim = yoursOn * (mine ? 0 : 0.7);
          return (
            <g key={i} opacity={1 - dim}>
              <line x1={a} x2={b} y1={rowY(i)} y2={rowY(i)} stroke={INK} strokeWidth={(mine ? lerp(1.4, 4, yoursOn) : 1.4) * lit} opacity={0.55 + 0.45 * (mine ? yoursOn : 0)} />
              {tint > 0 ? <line x1={a} x2={b} y1={rowY(i)} y2={rowY(i)} stroke={EST} strokeWidth={2.6 * lit} opacity={tint} /> : null}
            </g>
          );
        })}
        {/* The misses, marked with a cross as well as a color. */}
        {COVERAGE.missRows.map((i) => {
          const iv = COVERAGE.intervals[i];
          const t = red * (1 - hidden) * (1 - yoursOn * 0.7);
          if (t <= 0) return null;
          const end = iv.covers ? 0 : iv.hi < COVERAGE.mu ? sx(XI, iv.hi) + 14 : sx(XI, iv.lo) - 14;
          const cy = rowY(i);
          return (
            <g key={i} stroke={EST} strokeWidth={2.4} opacity={t} strokeLinecap="round">
              <line x1={end - 5} x2={end + 5} y1={cy - 5} y2={cy + 5} />
              <line x1={end - 5} x2={end + 5} y1={cy + 5} y2={cy - 5} />
            </g>
          );
        })}
        {/* The truth: one fixed line through both figures, until it is hidden. */}
        <line
          x1={truthX}
          x2={truthX}
          y1={y(AXIS)}
          y2={lerp(y(AXIS), y(POP_BASE - POP_H - 18), ease(frame, hundredAt - 4, 18))}
          stroke={INK}
          strokeWidth={2.2}
          strokeDasharray="7 6"
          opacity={1 - hidden}
        />
      </Svg>
      <Note at={hundredAt} x={truthX + 12} y={y(POP_BASE - POP_H * 0.45)} out={seeAt - 4}>
        <span style={{ ...note(22, INK), fontWeight: 650, ...halo, whiteSpace: "nowrap" }}>true mean</span>
      </Note>
      <Note at={yourAt} x={sx(XI, COVERAGE.intervals[YOURS].hi) + 16} y={rowY(YOURS) - 15}>
        <span style={{ ...note(22, INK), fontWeight: 700, ...halo, whiteSpace: "nowrap" }}>
          yours
          <span style={{ fontWeight: 500, color: INK_SOFT, opacity: ease(frame, seeAt, 12) }}>: in, or out?</span>
        </span>
      </Note>
      <Note at={seeAt + 6} x={truthX} y={y(POP_BASE + 14)} from="up">
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap", display: "inline-block", transform: "translateX(-50%)" }}>
          in real life, the true mean is hidden
        </span>
      </Note>

      {/* ── Right column: the tally ── */}
      <div style={{ position: "absolute", left: COL, top: y(250), opacity: ease(frame, buildAt - 4, 12) }}>
        <div style={label(21, INK_SOFT)}>Intervals drawn</div>
        <div style={{ ...headline(88), fontVariantNumeric: "tabular-nums lining-nums", marginTop: 4 }}>{drawn}</div>
      </div>
      <Ink at={ninetyFourAt - 4} dur={14} style={{ left: COL, top: y(400), width: 420 }}>
        <div style={{ height: 1, background: HAIRLINE, marginBottom: 14 }} />
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <span style={{ ...headline(60), fontVariantNumeric: "tabular-nums lining-nums" }}>{COVERAGE.hits}</span>
          <span style={{ ...body(28, true), color: INK, opacity: ease(frame, catchAt - 2, 10) }}>catch the true mean</span>
        </div>
      </Ink>
      <Ink at={sixAt - 4} dur={14} style={{ left: COL, top: y(500), width: 420 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <span style={{ ...headline(60), color: EST_INK, fontVariantNumeric: "tabular-nums lining-nums" }}>{COVERAGE.misses}</span>
          <span style={{ ...body(28, true), color: EST_INK }}>miss it</span>
        </div>
      </Ink>
      <Note at={unluckyAt - 2} x={COL} y={y(580)}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>Same recipe, unlucky samples.</span>
      </Note>
      <Note at={ninetyFiveAt - 2} x={COL} y={y(620)}>
        <span style={{ ...note(22, INK), fontWeight: 650, whiteSpace: "nowrap" }}>Again and again: about 95 in 100.</span>
      </Note>
      <Spot id="estimation-ring-toss" at={againAndAt - 4} out={sentenceAt - 12} left={COL + 40} top={y(668)} width={200} height={206} />
      <Ink at={sentenceAt - 4} dur={18} style={{ left: COL, top: y(700), width: 430 }}>
        <span style={{ ...body(32, true), color: INK }}>
          “A 95% chance it’s in{" "}
          <span style={{ color: EST_INK, opacity: ease(frame, everyoneAt - 2, 10) }}>this</span> one”?
        </span>
        <div style={{ height: 3, marginTop: 4, background: EST, width: `${100 * ease(frame, wrongEndAt - 2, 18)}%`, borderRadius: 2, opacity: ease(frame, wrongAt - 2, 4) }} />
      </Ink>
      {/* Keep the stack from going still while "truth" lands. */}
      <Svg opacity={pulse(frame, truthAt - 2, 22) * (1 - hidden)}>
        <line x1={truthX} x2={truthX} y1={y(AXIS)} y2={rowY(0) - 6} stroke={INK} strokeWidth={4.5} strokeDasharray="7 6" />
      </Svg>
      <Svg opacity={pulse(frame, holdsAt - 2, 20)}>
        <circle cx={sx(XI, COVERAGE.intervals[YOURS].mean)} cy={rowY(YOURS)} r={9} fill="none" stroke={INK} strokeWidth={2} />
      </Svg>
    </AbsoluteFill>
  );
};
