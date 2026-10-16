import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, fmt, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { SANS } from "../../theme/fonts";
import { Sfx } from "../../sound/Sfx";
import { DIE, num } from "./data";
import { Big, Count, DATA, Headline, lerp, Pulse, Spot, STAT, STAT_INK, Svg, Sweep } from "./parts";

/** The pmf: faces 1 to 6, a probability of 1 drawn 760 px tall. */
const PMF = { x0: 240, pitch: 150, barW: 92, base: 690, unit: 760 } as const;
const fxv = (v: number) => PMF.x0 + (v - 1) * PMF.pitch + PMF.pitch / 2;
const RIGHT = 1250;

/**
 * Part 5, expectation and spread on the lesson's loaded die: the pmf built
 * face by face, each face weighted and summed to 4.5, the balance point that
 * is neither a face nor the mode, half a million rolls, then the variance and
 * standard deviation.
 */
export const DieScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const expectedAt = n.word("die", "expected value");
  const averageAt = n.word("die", "long-run average");
  const loadedAt = n.word("die", "loaded die");
  const sixAt = n.word("die", "six half the time");
  const tenthAt = n.word("die", "a tenth");
  const multiplyAt = n.word("weight", "Multiply");
  const addAt = n.word("weight", "add");
  const fourFiveAt = n.word("weight", "Four point five");
  const beamAt = n.word("balance", "weights on a beam");
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

  const base = y(PMF.base);
  const grow = (v: number) => ease(frame, v === 6 ? sixAt - 4 : tenthAt - 10 + (v - 1) * 3, 16);
  const beam = ease(frame, beamAt - 2, 14);
  const fulcrum = ease(frame, balancesAt - 8, 22);
  const eX = fxv(DIE.expected);
  const fulcrumX = lerp(PMF.x0 + 30, eX, fulcrum);
  const away = ease(frame, weighAt - 6, 18);

  return (
    <AbsoluteFill style={{ opacity: 1 - away * 0.35 }}>
      {/* ── Sound: the bars, the weighted terms, the fulcrum, the rolls, the spread ── */}
      <Sfx name="el-pop" at={sixAt - 4} level={-30} />
      <Sfx name="el-sprinkle" at={tenthAt - 10} level={-34} />
      <Sfx name="el-tap" at={fourFiveAt - 4} level={-28} />
      <Sfx name="el-whoosh" at={balancesAt - 8} level={-34} />
      <Sfx name="el-pop" at={beamAt} level={-31} />
      <Sfx name="el-pencil" at={squaredAt - 4} level={-34} />
      <Sfx name="el-tap" at={sdAt - 4} level={-29} />

      <Headline top={y(150)} first="Expected value:" second="the long-run average." firstAt={expectedAt - 4} secondAt={averageAt - 2} />
      <FigLabel n="7" title="A loaded die: the chance of each face" at={loadedAt - 4} x={PMF.x0} y={y(268)} />

      {/* ── The pmf ── */}
      <Svg>
        {DIE.values.map((v, i) => {
          const g = grow(v);
          if (g <= 0) return null;
          const bh = h(PMF.unit * DIE.probs[i]) * g;
          return <rect key={v} x={fxv(v) - PMF.barW / 2} y={base - bh} width={PMF.barW} height={bh} fill={v === DIE.mode ? STAT : DATA} opacity={0.78} />;
        })}
        {/* The axis, which becomes a beam. */}
        <rect
          x={PMF.x0}
          y={base}
          width={(PMF.pitch * 6) * ease(frame, loadedAt - 4, 16)}
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
        {/* The spread: each face's distance from the mean. */}
        {DIE.values.map((v, i) => {
          const p = ease(frame, squaredAt - 6 + i * 3, 12);
          if (p <= 0) return null;
          const yy = base + h(150) + i * 10;
          return (
            <line key={v} x1={eX} x2={lerp(eX, fxv(v), p)} y1={yy} y2={yy} stroke={v === DIE.mode ? STAT : DATA} strokeWidth={3} strokeLinecap="round" opacity={0.8} />
          );
        })}
      </Svg>
      {DIE.values.map((v, i) => (
        <React.Fragment key={v}>
          <div
            style={{
              position: "absolute",
              left: fxv(v),
              top: base + h(28) + 10,
              transform: "translateX(-50%)",
              opacity: ease(frame, loadedAt, 12),
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
      <Pulse x={fxv(DIE.mode)} y={base - h(PMF.unit * 0.5) - 60} at={thatsSixAt - 4} r={34} />
      <Note at={likeliestAt} x={fxv(DIE.mode) - 70} y={base - h(PMF.unit * 0.5) - 92} align="right">
        <span style={{ ...note(22, STAT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
          the likeliest roll<span style={{ opacity: ease(frame, thatsSixAt - 4, 10) }}>: six</span>
        </span>
      </Note>
      <Note at={balancesAt + 8} x={eX} y={base + h(60) + 26} from="up">
        <span style={{ ...note(22, STAT_INK), fontWeight: 700, display: "inline-block", transform: "translateX(-50%)", whiteSpace: "nowrap" }}>
          {fmt(DIE.expected, 1)}
          <span style={{ opacity: ease(frame, faceAt - 2, 10), fontWeight: 500, color: INK }}>, not a face</span>
        </span>
      </Note>
      <Spot id="probability-seesaw" at={beamAt - 2} out={squaredAt - 8} left={1300} top={y(640)} width={480} height={280} />

      {/* ── The sum ── */}
      <Ink at={addAt - 4} dur={18} style={{ left: RIGHT, top: y(330), whiteSpace: "nowrap" }}>
        <span style={note(26, INK)}>
          {DIE.terms.map((t, i) => (
            <span key={i}>
              {i ? <span style={{ color: INK_SOFT }}> + </span> : null}
              {fmt(t, 1)}
            </span>
          ))}
        </span>
      </Ink>
      <Ink at={fourFiveAt - 4} dur={16} style={{ left: RIGHT, top: y(380), whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 18 }}>
        <span style={{ ...note(32, INK_SOFT) }}>E[X] =</span>
        <Big size={100} color={STAT_INK} italic>
          {fmt(DIE.expected, 1)}
        </Big>
      </Ink>
      <Ink at={rollAt - 4} dur={14} style={{ left: RIGHT, top: y(524), whiteSpace: "nowrap" }}>
        <span style={note(26, INK)}>
          <Count at={rollAt - 2} dur={26} to={DIE.draws} format={num} /> rolls:{" "}
          <span style={{ opacity: ease(frame, comesAt - 2, 10) }}>
            mean <b>{fmt(DIE.simMean, 3)}</b>
          </span>
        </span>
      </Ink>

      {/* ── The spread ── */}
      <Ink at={varianceAt - 4} dur={14} style={{ left: RIGHT, top: y(596), whiteSpace: "nowrap" }}>
        <span style={label(23, INK_SOFT)}>Spread around 4.5</span>
      </Ink>
      <Ink at={threeAt - 4} dur={14} style={{ left: RIGHT, top: y(636), whiteSpace: "nowrap" }}>
        <span style={note(30, INK)}>
          Variance <b style={{ color: STAT_INK }}>{fmt(DIE.variance, 2)}</b>
          <span style={{ ...note(22, INK_SOFT) }}> in squared units</span>
        </span>
      </Ink>
      <Ink at={rootAt - 2} dur={14} style={{ left: RIGHT, top: y(696), whiteSpace: "nowrap" }}>
        <span style={note(30, INK)}>
          Standard deviation{" "}
          <b style={{ color: STAT_INK }}>
            <Sweep at={sdAt - 2}>{fmt(DIE.sd, 2)}</Sweep>
          </b>
        </span>
      </Ink>
      <Note at={squaredAt + 2} x={PMF.x0} y={base + h(150) + 66}>
        <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>each face&apos;s distance from 4.5, squared and weighted by its chance</span>
      </Note>
      <Ink at={weighAt - 4} dur={14} style={{ left: RIGHT, top: y(800), whiteSpace: "nowrap" }}>
        <span style={{ ...body(30, true), color: INK }}>Now, a decision.</span>
      </Ink>
      {/* The axis label, once the faces are in. */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: ease(frame, loadedAt + 6, 12) * (1 - beam) }}>
        <text x={PMF.x0 + PMF.pitch * 6} y={base + h(28) + 60} textAnchor="end" style={{ fontFamily: SANS, fontSize: 20, fontWeight: 650, fill: INK_SOFT }}>
          face
        </text>
      </svg>
    </AbsoluteFill>
  );
};
