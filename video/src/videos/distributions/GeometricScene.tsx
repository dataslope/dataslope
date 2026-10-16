import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, note, PAPER } from "../../editorial/style";
import { FigLabel, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { GEOMETRIC } from "./data";
import { ASK, askNote, Bracket, code, Count, DIST, Drift, Head, KBars, lerp, pulse, Svg, VRule } from "./parts";

const X: XScale = { lo: 0.5, hi: 20.5, x0: 160, x1: 1500 };
const BASE = 840;
const TALL = 380;
/** The five calls, one of which closes. */
const CALLS_X = 1560;
const CALLS_Y = 420;

/**
 * Part 1, third scene: calls until the first sale. The geometric
 * distribution falls from its first bar, so its average of five sits far
 * from its likeliest value of one, and a long tail runs past ten.
 */
export const GeometricScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const geoFrom = n.beat("geometric").from;
  const callAt = n.word("geometric", "sales call");
  const fiveAt = n.word("geometric", "one time in five");
  const untilAt = n.word("geometric", "calls until");
  const geometricAt = n.word("geometric", "geometric");
  const averageAt = n.word("five", "On average");
  const callsAt = n.word("five", "five calls");
  const likeliestAt = n.word("five", "likeliest");
  const oneAt = n.word("five", "one");
  const elevenAt = n.word("five", "eleven percent");
  const tenAt = n.word("five", "more than ten");

  const unit = h(TALL) / Math.max(...GEOMETRIC.pmf);
  const base = y(BASE);
  const barAt = (i: number) => lerp(untilAt - 4, geometricAt + 4, i / (GEOMETRIC.k.length - 1));
  const askAt = (k: number) => elevenAt - 4 + (k - GEOMETRIC.moreThan - 1) * 1.2;
  const firstX = sx(X, 1);
  const meanX = sx(X, GEOMETRIC.mean);
  const tailX0 = sx(X, GEOMETRIC.moreThan + 1) - 20;
  const tailX1 = sx(X, 20) + 20;
  const tailY = base - GEOMETRIC.pmf[GEOMETRIC.moreThan] * unit - h(44);
  const glow = pulse(frame, oneAt - 4, 20);

  return (
    <AbsoluteFill>
      {/* ── Sound: the five calls, the bars, the average, the first bar, the tail ── */}
      <Sfx name="el-tap" at={fiveAt} level={-30} />
      <Sfx name="el-sprinkle" at={untilAt - 4} level={-34} />
      <Sfx name="el-pencil" at={callsAt - 4} level={-34} />
      <Sfx name="el-tap" at={oneAt - 4} level={-28} />
      <Sfx name="el-pop" at={elevenAt - 4} level={-30} />

      <Head
        parts={[
          { text: "Tries until the first success:", at: geoFrom - 4 },
          { text: "geometric.", at: geometricAt - 6, italic: true },
        ]}
      />

      <Drift from={geoFrom} to={n.beat("five").to + 50}>
        <FigLabel n="5" title="Calls until the first sale" at={callAt - 6} x={160} y={y(300)} />
        <Note at={fiveAt + 4} x={1500} y={y(304)} align="right">
          <span style={code(21, INK_SOFT)}>geom({GEOMETRIC.p})</span>
        </Note>

        {/* One call in five closes. */}
        <Svg>
          {[0, 1, 2, 3, 4].map((i) => {
            const a = ease(frame, callAt - 2 + i * 3, 8);
            if (a <= 0) return null;
            const red = i === 2 ? ease(frame, fiveAt, 10) : 0;
            return (
              <circle
                key={i}
                cx={CALLS_X + 20 + i * 38}
                cy={y(CALLS_Y)}
                r={13 * a}
                fill={red > 0 ? `color-mix(in srgb, ${ASK} ${red * 100}%, ${PAPER})` : PAPER}
                stroke={red > 0.5 ? ASK : INK_SOFT}
                strokeWidth={2.2}
              />
            );
          })}
        </Svg>
        <Note at={fiveAt + 4} x={CALLS_X} y={y(CALLS_Y + 26)}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>one call in five closes</span>
        </Note>

        <Axis scale={X} base={base} ticks={[1, 5, 10, 15, 20]} at={untilAt - 6} />
        <KBars
          ks={GEOMETRIC.k}
          values={GEOMETRIC.pmf}
          scale={X}
          base={base}
          unit={unit}
          grow={(i) => ease(frame, barAt(i), 10)}
          fill={(i) => {
            const k = GEOMETRIC.k[i];
            if (k === 1 && glow > 0) return `color-mix(in srgb, ${DIST} ${100 - glow * 45}%, ${PAPER})`;
            if (k <= GEOMETRIC.moreThan) return DIST;
            const r = ease(frame, askAt(k), 10);
            return r > 0 ? `color-mix(in srgb, ${ASK} ${r * 100}%, ${DIST})` : DIST;
          }}
        />
        <Svg opacity={ease(frame, oneAt - 4, 10)}>
          <rect
            x={firstX - (sx(X, 1) - sx(X, 0)) * 0.42}
            y={base - GEOMETRIC.pmf[0] * unit - 6}
            width={(sx(X, 1) - sx(X, 0)) * 0.84}
            height={GEOMETRIC.pmf[0] * unit + 6}
            fill="none"
            stroke={INK}
            strokeWidth={2.6}
            rx={3}
          />
        </Svg>
        <Note at={oneAt} x={firstX + 50} y={base - GEOMETRIC.pmf[0] * unit - 18}>
          <span style={{ ...note(23, INK), fontWeight: 650, whiteSpace: "nowrap" }}>1 call, the likeliest</span>
        </Note>
        <VRule x={meanX} bottom={base} top={base - h(TALL - 120)} at={averageAt - 2} />
        <Note at={callsAt - 2} x={meanX + 12} y={base - h(TALL - 110)}>
          <span style={{ ...note(23, INK), fontWeight: 650, whiteSpace: "nowrap" }}>average {GEOMETRIC.mean}</span>
        </Note>
        <Note at={likeliestAt} x={meanX + 12} y={base - h(TALL - 146)}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>but not the likeliest</span>
        </Note>
        <Bracket x0={tailX0} x1={tailX1} y={tailY} at={elevenAt - 2} color={ASK} />
        <Note at={elevenAt} x={(tailX0 + tailX1) / 2 - 130} y={tailY - h(50)}>
          <span style={{ ...askNote(26), whiteSpace: "nowrap" }}>
            more than {GEOMETRIC.moreThan}: <Count at={tenAt - 8} dur={16} to={GEOMETRIC.sfMoreThan * 100} suffix="%" />
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
