import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { fmt, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { ds } from "../../theme/brand";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { SANS } from "../../theme/fonts";
import { Sfx } from "../../sound/Sfx";
import { DIE, num } from "./data";
import { Big, Count, DATA, GOLD_DEEP, GOLD_INK, Headline, Kicker, lerp, Pulse, Spot, STAT, STAT_INK, Svg, Sweep } from "./parts";

/** The pmf: faces 1 to 6, a probability of 1 drawn 760 px tall. */
const PMF = { x0: 240, pitch: 150, barW: 92, base: 690, unit: 760 } as const;
const fxv = (v: number) => PMF.x0 + (v - 1) * PMF.pitch + PMF.pitch / 2;
const RIGHT = 1250;
/** The variance as one bar: each face's chance times its squared distance
 *  from the mean, laid end to end, at this many px per squared unit. */
const VAR = { unit: 150, top: 686, h: 26 } as const;
/** Alternate shades, so neighbouring terms (and the two slivers, 4 and 5)
 *  stay apart. */
const VAR_FILL = [DATA, ds("blue", 300)];

/**
 * Part 5, expectation and spread on the lesson's loaded die: the pmf built
 * face by face, each face weighted and summed to 4.5, the balance point that
 * is neither a face nor the mode, half a million rolls, then the variance,
 * built as the sum it is, and the standard deviation.
 */
export const DieScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const dieFrom = n.beat("die").from;
  const expectedAt = n.word("die", "expected value");
  const spreadWordAt = n.word("spread", "spread");
  const meanSaidAt = n.word("rolls", "four point five");
  const averageAt = n.word("die", "long-run average");
  const loadedAt = n.word("die", "loaded die");
  const sixAt = n.word("die", "six half the time");
  const tenthAt = n.word("die", "a tenth");
  const multiplyAt = n.word("weight", "Multiply");
  const addAt = n.word("weight", "add");
  const fourFiveAt = n.word("weight", "Four point five");
  const beamAt = n.word("balance", "weights on a beam");
  const pictureAt = n.word("balance", "Picture");
  const balancesAt = n.word("balance", "balances");
  const faceAt = n.word("balance", "isn't a face");
  const likeliestAt = n.word("balance", "likeliest");
  const thatsSixAt = n.word("balance", "That's six");
  const rollAt = n.word("rolls", "half a million");
  const comesAt = n.word("rolls", "comes out");
  const varianceAt = n.word("spread", "variance");
  const squaredAt = n.word("spread", "squared distance");
  const threeAt = n.word("spread", "Three point two five");
  const rootAt = n.word("spread", "square root");
  const sdAt = n.word("spread", "one point eight");
  const weighAt = n.word("decide-in", "weigh a decision");
  const decideFrom = n.beat("decide-in").from;
  const stdAt = n.word("spread", "standard deviation");

  const base = y(PMF.base);
  const grow = (v: number) => ease(frame, v === 6 ? sixAt - 4 : tenthAt - 10 + (v - 1) * 3, 16);
  const beam = ease(frame, beamAt - 2, 14);
  const fulcrum = ease(frame, balancesAt - 8, 22);
  const eX = fxv(DIE.expected);
  const fulcrumX = lerp(PMF.x0 + 30, eX, fulcrum);
  // The variance's terms, end to end: where each starts, in px.
  const varStarts = DIE.varTerms.map((_, i) => DIE.varTerms.slice(0, i).reduce((a, b) => a + b, 0) * VAR.unit);
  const termAt = (i: number) => squaredAt - 4 + i * 5;
  const sdBand = ease(frame, stdAt - 2, 16);
  const sdHalf = fxv(1 + DIE.sd) - fxv(1);

  return (
    <AbsoluteFill>
      {/* ── Sound: the bars, the weighted terms, the fulcrum, the rolls, the spread ── */}
      <Sfx name="el-pop" at={sixAt - 4} level={-30} />
      <Sfx name="el-sprinkle" at={tenthAt - 10} level={-34} />
      <Sfx name="el-tap" at={fourFiveAt - 4} level={-28} />
      <Sfx name="el-whoosh" at={balancesAt - 8} level={-34} />
      <Sfx name="el-pencil" at={squaredAt - 4} level={-34} />
      <Sfx name="el-tap" at={sdAt - 4} level={-29} />

      {/* The part's kicker carries on from the scene before, so "its" still
          has the random variable to refer to. */}
      <Kicker at={dieFrom - 40}>Random variables and expected value</Kicker>
      <Headline top={y(150)} first="Expected value:" second="the long-run average." firstAt={dieFrom - 6} secondAt={averageAt - 2} out={decideFrom - 6} />
      <Headline top={y(150)} first="Now, a decision" second="worth weighing." firstAt={decideFrom - 2} secondAt={weighAt - 2} />
      <FigLabel n="8" title="A loaded die: the chance of each face" at={expectedAt - 4} x={PMF.x0} y={y(268)} />
      <Ink at={loadedAt - 2} dur={14} style={{ left: PMF.x0, top: y(318), whiteSpace: "nowrap" }}>
        <span style={note(22, INK_SOFT)}>X is the face rolled</span>
      </Ink>
      <Ink at={expectedAt - 2} dur={14} style={{ left: RIGHT, top: y(318), whiteSpace: "nowrap" }}>
        <span style={label(23, INK_SOFT)}>E[X], the expected value of X</span>
      </Ink>

      {/* ── The pmf ── */}
      <Svg>
        {DIE.values.map((v, i) => {
          const g = grow(v);
          if (g <= 0) return null;
          const bh = h(PMF.unit * DIE.probs[i]) * g;
          // Each bar flashes as its face is weighted by its chance.
          const t = multiplyAt - 2 + i * 4;
          const flash = ease(frame, t, 6) * (1 - ease(frame, t + 8, 10));
          return (
            <g key={v}>
              <rect x={fxv(v) - PMF.barW / 2} y={base - bh} width={PMF.barW} height={bh} fill={DATA} opacity={0.78} />
              {/* The mode, the likeliest roll, ringed in gold: the red is the
                  expected value's, and the two are not the same thing. */}
              {v === DIE.mode ? (
                <rect x={fxv(v) - PMF.barW / 2 - 4} y={base - bh - 4} width={PMF.barW + 8} height={bh + 4} fill="none" stroke={GOLD_DEEP} strokeWidth={4} opacity={ease(frame, likeliestAt - 4, 10)} />
              ) : null}
              {flash > 0 ? <rect x={fxv(v) - PMF.barW / 2} y={base - bh} width={PMF.barW} height={bh} fill={HIGHLIGHT} opacity={flash} /> : null}
            </g>
          );
        })}
        {/* The axis, which becomes a beam. */}
        <rect
          x={PMF.x0}
          y={base}
          width={(PMF.pitch * 6) * ease(frame, expectedAt - 2, 16)}
          height={lerp(2, 12, beam)}
          rx={lerp(0, 4, beam)}
          fill={INK}
        />
        {/* The fulcrum, sliding to where the beam balances. */}
        {fulcrum > 0 ? (
          <path
            d={`M${fulcrumX},${base + lerp(2, 12, beam)} l-26,46 l52,0 Z`}
            fill={STAT}
            opacity={Math.min(1, fulcrum * 2)}
          />
        ) : null}
        {/* One standard deviation either side of the mean, under the beam,
            clear of the "4.5" below the fulcrum. */}
        {sdBand > 0 ? (
          <rect
            x={eX - sdHalf * sdBand}
            y={base + h(126)}
            width={2 * sdHalf * sdBand}
            height={h(22)}
            rx={4}
            fill={STAT}
            opacity={0.28 + 0.25 * ease(frame, sdAt - 2, 8) * (1 - ease(frame, sdAt + 14, 14))}
          />
        ) : null}
        {/* The variance, as the sum it is: each face's chance times its
            squared distance from 4.5, end to end. Faces 1 and 6 carry it. */}
        {DIE.varTerms.map((t, i) => {
          const p = ease(frame, termAt(i), 8);
          if (p <= 0) return null;
          return <rect key={i} x={RIGHT + varStarts[i]} y={y(VAR.top)} width={Math.max(1.5, t * VAR.unit * p)} height={h(VAR.h)} fill={VAR_FILL[i % 2]} />;
        })}
      </Svg>
      {/* Which face each visible term is; 4 and 5 are the two slivers. */}
      {DIE.values.map((v, i) =>
        DIE.varTerms[i] * VAR.unit < 20 ? null : (
          <div
            key={v}
            style={{
              position: "absolute",
              left: RIGHT + varStarts[i] + (DIE.varTerms[i] * VAR.unit) / 2,
              top: y(VAR.top) + h(VAR.h) + 6,
              transform: "translateX(-50%)",
              opacity: ease(frame, termAt(i) + 4, 8),
              ...note(21, INK_SOFT),
              fontWeight: 600,
            }}
          >
            {v}
          </div>
        ),
      )}
      {DIE.values.map((v, i) => (
        <React.Fragment key={v}>
          <div
            style={{
              position: "absolute",
              left: fxv(v),
              top: base + h(28) + 10,
              transform: "translateX(-50%)",
              opacity: ease(frame, expectedAt + 4, 12),
              ...note(24, INK_SOFT),
              fontWeight: 600,
            }}
          >
            {v}
          </div>
          {/* Its probability, then its weighted share. */}
          <div
            style={{
              position: "absolute",
              left: fxv(v),
              top: base - h(PMF.unit * DIE.probs[i]) - 36,
              transform: "translateX(-50%)",
              opacity: grow(v),
              ...note(22, INK),
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            {fmt(DIE.probs[i], 1)}
            <span style={{ color: STAT_INK, opacity: ease(frame, multiplyAt - 2 + i * 3, 10) }}>
              {" "}
              × {v}
            </span>
          </div>
        </React.Fragment>
      ))}
      <Pulse x={fxv(DIE.mode)} y={base - h(PMF.unit * 0.25)} at={thatsSixAt - 4} r={40} color={GOLD_DEEP} />
      <Note at={likeliestAt} x={fxv(DIE.mode) - PMF.barW / 2 - 18} y={base - h(PMF.unit * 0.25) - 15} align="right">
        <span style={{ ...note(22, GOLD_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
          the likeliest roll<span style={{ opacity: ease(frame, thatsSixAt - 4, 10) }}>: six</span>
        </span>
      </Note>
      <Note at={balancesAt + 8} x={eX} y={base + h(60) + 26} from="up">
        <span style={{ ...note(22, STAT_INK), fontWeight: 700, display: "inline-block", transform: "translateX(-50%)", whiteSpace: "nowrap" }}>
          {fmt(DIE.expected, 1)}
          <span style={{ opacity: ease(frame, faceAt - 2, 10), fontWeight: 500, color: INK }}>, not a face</span>
        </span>
      </Note>
      <Spot id="probability-seesaw" at={pictureAt - 2} out={spreadWordAt - 10} left={1280} top={y(650)} width={540} height={220} />

      {/* ── The sum ── */}
      <Ink at={addAt - 4} dur={18} style={{ left: RIGHT, top: y(358), whiteSpace: "nowrap" }}>
        <span style={note(26, INK)}>
          {DIE.terms.map((t, i) => (
            <span key={i}>
              {i ? <span style={{ color: INK_SOFT }}> + </span> : null}
              {fmt(t, 1)}
            </span>
          ))}
        </span>
      </Ink>
      <Ink at={fourFiveAt - 4} dur={16} style={{ left: RIGHT, top: y(398), whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 18 }}>
        <span style={{ ...note(32, INK_SOFT) }}>E[X] =</span>
        <Big size={100} color={STAT_INK} italic>
          {fmt(DIE.expected, 1)}
        </Big>
      </Ink>
      <Ink at={rollAt - 4} dur={14} style={{ left: RIGHT, top: y(524), whiteSpace: "nowrap" }}>
        <span style={note(26, INK)}>
          <Count at={rollAt - 2} dur={30} to={DIE.draws} format={num} style={{ ...note(34, INK), fontWeight: 700 }} /> rolls:{" "}
          <span style={{ opacity: ease(frame, comesAt - 2, 10) }}>
            mean{" "}
            <b>
              <Sweep at={meanSaidAt - 2}>{fmt(DIE.simMean, 3)}</Sweep>
            </b>
          </span>
        </span>
      </Ink>

      {/* ── The spread ── */}
      <Ink at={varianceAt - 4} dur={14} style={{ left: RIGHT, top: y(592), whiteSpace: "nowrap" }}>
        <span style={note(30, INK)}>
          Variance, Var(X){" "}
          <span style={{ opacity: ease(frame, threeAt - 4, 10) }}>
            = <b style={{ color: STAT_INK }}>{fmt(DIE.variance, 2)}</b>
            <span style={{ ...note(22, INK_SOFT) }}> in squared units</span>
          </span>
        </span>
      </Ink>
      <Note at={squaredAt - 6} x={RIGHT} y={y(VAR.top) - 34}>
        <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>each face&apos;s chance × its squared distance from 4.5</span>
      </Note>
      <Ink at={threeAt - 4} dur={16} style={{ left: RIGHT, top: y(VAR.top) + h(VAR.h) + 46, whiteSpace: "nowrap" }}>
        <span style={note(21, INK_SOFT)}>
          {DIE.varTerms.map((t, i) => (
            <span key={i}>
              {i ? " + " : null}
              {fmt(t, 3)}
            </span>
          ))}{" "}
          = <b style={{ color: STAT_INK }}>{fmt(DIE.variance, 2)}</b>
        </span>
      </Ink>
      {/* Its square root, as the band under the beam. */}
      <Ink at={rootAt - 2} dur={14} style={{ left: eX - sdHalf, top: base + h(126) + h(22) + 12, whiteSpace: "nowrap" }}>
        <span style={note(24, INK)}>
          <b style={{ color: STAT_INK }}>
            <Sweep at={sdAt - 2}>±{fmt(DIE.sd, 2)}</Sweep>
          </b>
          : the standard deviation, √{fmt(DIE.variance, 2)}
        </span>
      </Ink>
      {/* The axis label, once the faces are in. */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: ease(frame, expectedAt + 10, 12) * (1 - beam) }}>
        <text x={PMF.x0 + PMF.pitch * 6} y={base + h(28) + 60} textAnchor="end" style={{ fontFamily: SANS, fontSize: 20, fontWeight: 650, fill: INK_SOFT }}>
          face
        </text>
      </svg>
    </AbsoluteFill>
  );
};
