import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { fmt, halo, INK, INK_SOFT, note, PAPER } from "../../editorial/style";
import { FigLabel, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { NULL_P, TWENTY } from "./data";
import { DATA, DOT, Head, Kicker, Label, pulse, Spot, STAT, STAT_INK, Svg } from "./parts";

/** The 5,000 null p-values, in twenty bins of 0.05. */
const HX: XScale = { lo: 0, hi: 1, x0: 160, x1: 860 };
const H_BASE = 600;
const H_TALL = 220;
const H_MAX = 300;
/** The twenty tests, one row each. */
const TX: XScale = { lo: 0, hi: 1, x0: 1080, x1: 1760 };
const T_ROW0 = 372;
const T_DY = 23;
const T_BASE = T_ROW0 + 20 * T_DY;
const HIT = TWENTY.hits[0];

/**
 * When the null is true a p-value is uniform: the lesson's 5,000 null runs
 * fill twenty bins evenly, and of twenty tests of pure noise, one lands under
 * 0.05, test 14, at 0.033. Keep only that one and you have p-hacked.
 */
export const UniformScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const uniformFrom = n.beat("uniform").from;
  const randomAt = n.word("uniform", "random number");
  const trueAt = n.word("uniform", "true");
  const pAt = n.word("uniform", "p-value");
  const hereAt = n.word("fourteen", "Here");
  const zeroToOneAt = n.word("uniform", "zero to one");
  const equallyAt = n.word("uniform", "equally likely");
  const twentyAt = n.word("twenty", "twenty tests");
  const nothingAt = n.word("twenty", "nothing");
  const oneUnderAt = n.word("twenty", "one under");
  const fiveAt = n.word("twenty", "point zero five");
  const fourteenAt = n.word("fourteen", "fourteen");
  const luckAt = n.word("hacked", "luck");
  const pointAt = n.word("fourteen", "point");
  const onlyAt = n.word("hacked", "only");
  const discoveryAt = n.word("hacked", "discovery");
  const hackingAt = n.word("hacked", "p-hacking");

  const hy = (c: number) => y(H_BASE) - h(H_TALL) * (c / H_MAX);
  const ends = pulse(frame, zeroToOneAt, 22);
  const firstBin = ease(frame, oneUnderAt - 4, 12);
  const rowAt = (i: number) => twentyAt + 2 + i * 3.2;
  const others = 1 - 0.8 * ease(frame, onlyAt - 2, 14);
  const hitGlow = pulse(frame, fourteenAt - 2, 24) + pulse(frame, luckAt - 2, 24);
  const lineGlow = pulse(frame, fiveAt - 2, 24);
  const hitBig = ease(frame, onlyAt, 14);

  return (
    <AbsoluteFill>
      {/* ── Sound: the bins, the twenty tests landing, the one that fires ── */}
      <Sfx name="el-sprinkle" at={randomAt - 4} level={-33} />
      <Sfx name="el-pencil" at={equallyAt - 2} level={-35} />
      <Sfx name="el-sprinkle" at={rowAt(0)} level={-33} />
      <Sfx name="el-pop" at={fourteenAt - 2} level={-29} />
      <Sfx name="el-tap" at={hackingAt - 4} level={-28} />

      <Kicker at={uniformFrom - 10}>Looking many times</Kicker>
      <Head a="When nothing is real," b="p is a random number." at={uniformFrom - 6} bAt={randomAt - 4} out={hackingAt - 8} />
      <Head a="Keep the winner:" b="that's p-hacking." at={hackingAt - 4} bAt={hackingAt + 4} />

      {/* ── Fig. 8: 5,000 p-values from a world with no effect ── */}
      <FigLabel n="8" title={`${fmt(NULL_P.runs, 0)} tests with no effect: their p-values`} at={trueAt - 4} x={HX.x0} y={y(300)} />
      <Axis scale={HX} base={y(H_BASE)} ticks={[0, 0.25, 0.5, 0.75, 1]} format={(v) => (v === 0 || v === 1 ? String(v) : fmt(v, 2))} at={pAt - 4} />
      <Svg>
        {NULL_P.bins.map((c, i) => {
          const g = ease(frame, randomAt - 4 + i * 1.6, 12);
          if (g <= 0) return null;
          const x0 = sx(HX, i / 20) + 1.5;
          const x1 = sx(HX, (i + 1) / 20) - 1.5;
          const top = y(H_BASE) - (y(H_BASE) - hy(c)) * g;
          return <rect key={i} x={x0} y={top} width={x1 - x0} height={y(H_BASE) - top} fill={i === 0 && firstBin > 0.5 ? STAT : DATA} opacity={0.8} />;
        })}
        {/* What "equally likely" predicts: every bin at 250. */}
        {ease(frame, equallyAt - 2, 16) > 0 ? (
          <line
            x1={HX.x0}
            x2={HX.x0 + (HX.x1 - HX.x0) * ease(frame, equallyAt - 2, 18)}
            y1={hy(NULL_P.runs / 20)}
            y2={hy(NULL_P.runs / 20)}
            stroke={INK}
            strokeWidth={2.2}
            strokeDasharray="8 6"
          />
        ) : null}
      </Svg>
      {[0, 1].map((v) => (
        <div
          key={v}
          style={{
            position: "absolute",
            left: sx(HX, v),
            top: y(H_BASE) + 40,
            transform: `translateX(-50%) scale(${1 + 0.3 * ends})`,
            opacity: ends > 0.05 ? 1 : 0,
            ...note(24, STAT_INK),
            fontWeight: 700,
          }}
        >
          {v}
        </div>
      ))}
      <Note at={equallyAt + 4} x={HX.x1} y={hy(NULL_P.runs / 20) - 44} align="right">
        <Label size={22} style={halo}>
          every value equally likely
        </Label>
      </Note>
      <Note at={oneUnderAt} x={sx(HX, 0.05) + 8} y={hy(NULL_P.bins[0]) - 80}>
        <Label size={22} color={STAT_INK} style={halo}>
          under 0.05: about 1 in 20
        </Label>
      </Note>

      <Spot id="testing-hypotheses-jellybeans" at={twentyAt - 6} left={330} top={y(690)} width={230} height={230} />

      {/* ── Fig. 9: twenty tests of pure noise ── */}
      <FigLabel n="9" title="Twenty tests of nothing, and the 0.05 line" at={twentyAt - 6} x={TX.x0 - 60} y={y(300)} />
      <Axis scale={TX} base={y(T_BASE)} ticks={[0, 0.25, 0.5, 0.75, 1]} format={(v) => (v === 0 || v === 1 ? String(v) : fmt(v, 2))} at={twentyAt - 4} />
      <Svg>
        {/* The 0.05 line. */}
        {ease(frame, twentyAt - 2, 14) > 0 ? (
          <line
            x1={sx(TX, 0.05)}
            x2={sx(TX, 0.05)}
            y1={y(T_BASE)}
            y2={y(T_BASE) - (y(T_BASE) - y(T_ROW0 - 18)) * ease(frame, twentyAt - 2, 16)}
            stroke={STAT}
            strokeWidth={2 + 2 * lineGlow}
            strokeDasharray="5 4"
          />
        ) : null}
        {ease(frame, hereAt - 2, 10) > 0 ? (
          <rect
            x={TX.x0}
            y={y(T_ROW0 + HIT * T_DY) - 12}
            width={(TX.x1 - TX.x0) * ease(frame, hereAt - 2, 10)}
            height={24}
            fill={STAT}
            opacity={0.16}
          />
        ) : null}
        {TWENTY.p.map((p, i) => {
          const a = ease(frame, rowAt(i), 8);
          if (a <= 0) return null;
          const hit = i === HIT;
          const cx = sx(TX, p);
          const cy = y(T_ROW0 + i * T_DY);
          const r = (hit ? 9 + 3 * hitGlow + 3 * hitBig : 7) * a;
          return (
            <g key={i} opacity={hit ? 1 : others}>
              <line x1={TX.x0} x2={TX.x1} y1={cy} y2={cy} stroke={INK} strokeWidth={0.8} opacity={0.12} />
              <circle cx={cx} cy={cy} r={r} fill={hit ? STAT : DOT} stroke={PAPER} strokeWidth={1.4} />
            </g>
          );
        })}
      </Svg>
      {/* Row numbers: every fifth, but none next to the one that fires, which is labelled itself. */}
      {[0, 4, 9, 14, 19].filter((i) => Math.abs(i - HIT) > 1).map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            right: 1920 - TX.x0 + 18,
            top: y(T_ROW0 + i * T_DY) - 13,
            opacity: ease(frame, rowAt(i), 8) * others,
            ...note(19, INK_SOFT),
          }}
        >
          {i + 1}
        </div>
      ))}
      <div
        style={{
          position: "absolute",
          right: 1920 - TX.x0 + 18,
          top: y(T_ROW0 + HIT * T_DY) - 15,
          opacity: ease(frame, fourteenAt - 4, 10),
          ...note(22, STAT_INK),
          fontWeight: 700,
        }}
      >
        test {HIT + 1}
      </div>
      {/* On the hit's own row, past the 0.05 line: no other dot shares it. */}
      <Note at={pointAt - 2} x={sx(TX, 0.05) + 24} y={y(T_ROW0 + HIT * T_DY) - 16}>
        <span style={{ ...note(24, STAT_INK), fontWeight: 700, ...halo, whiteSpace: "nowrap" }}>
          p = {fmt(TWENTY.p[HIT], 3)}
          <span style={{ ...note(22, STAT_INK), fontWeight: 520, opacity: ease(frame, discoveryAt - 4, 12) }}>
            {" "}· reported as a discovery
          </span>
        </span>
      </Note>
      <Note at={nothingAt} x={TX.x1} y={y(T_BASE) + 44} align="right">
        <Label size={21} color={INK_SOFT} weight={520}>
          p-value
        </Label>
      </Note>
    </AbsoluteFill>
  );
};
