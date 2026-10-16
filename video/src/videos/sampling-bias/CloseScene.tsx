import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { body, fmt, halo, headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink, NextLine, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CLOSE, shapeOf, TRUE_MEAN, type Spread } from "./data";
import { Arrow, Bracket, between, EASY, EASY_INK, RANDOM_INK, TruthLine } from "./parts";

/** The averages' axis, as in Fig. 2. */
const X: XScale = { lo: 66, hi: 84, x0: 160, x1: 1760 };
const BASE = 860;
/** px of height per unit of density per score point: the narrow pile's
 *  peak comes out about 400 px tall, the wide one's about 80. */
const K = 134;
const ZS = Array.from({ length: 161 }, (_, i) => -4 + i * 0.05);
const SHAPES = {
  wide: shapeOf(CLOSE.wide, ZS),
  narrow: shapeOf(CLOSE.narrow, ZS),
  moved: shapeOf(CLOSE.moved, ZS),
};
const BIAS_Y = 392;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Spreads morph on a log scale, so the squeeze reads as steady. */
const lerpLog = (a: number, b: number, t: number) => Math.exp(lerp(Math.log(a), Math.log(b), t));

type State = { center: number; spread: number; lo: number; hi: number; shape: number[] };
const stateOf = (s: Spread, shape: number[]): State => ({ center: s.center, spread: s.spread, lo: s.lo, hi: s.hi, shape });
const mix = (a: State, b: State, t: number): State => ({
  center: lerp(a.center, b.center, t),
  spread: lerpLog(a.spread, b.spread, t),
  lo: lerp(a.lo - a.center, b.lo - b.center, t) + lerp(a.center, b.center, t),
  hi: lerp(a.hi - a.center, b.hi - b.center, t) + lerp(a.center, b.center, t),
  shape: a.shape.map((v, i) => lerp(v, b.shape[i], t)),
});
const WIDE = stateOf(CLOSE.wide, SHAPES.wide);
const NARROW = stateOf(CLOSE.narrow, SHAPES.narrow);
const MOVED = stateOf(CLOSE.moved, SHAPES.moved);

/**
 * "Two ways to miss": one pile of the easy way's averages, squeezed by more
 * data and left where it was, then moved onto the truth by a better method.
 */
export const CloseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const twoFrom = n.beat("two").from;
  const varianceAt = n.word("variance", "Variance");
  const scatterAt = n.word("variance", "scatter");
  const squeezeFrom = n.beat("squeeze").from;
  const shrinksAt = n.word("squeeze", "shrinks");
  const biasAt = n.word("bias", "Bias");
  const centeredAt = n.word("bias", "centered");
  const leavesAt = n.word("bias", "leaves");
  const methodFrom = n.beat("method").from;
  const betterAt = n.word("method", "better");
  const movesAt = n.word("method", "moves");
  const nextAt = n.word("next", "only kept");

  const squeeze = ease(frame, squeezeFrom - 2, 30);
  const move = ease(frame, betterAt - 4, 30);
  const s = move > 0 ? mix(NARROW, MOVED, move) : mix(WIDE, NARROW, squeeze);
  const color = between(move);
  const ink = between(move, true);
  const peak = Math.max(...s.shape) / s.spread;
  const top = BASE - peak * K;

  const points = ZS.map((z, i) => `${sx(X, s.center + z * s.spread).toFixed(1)},${y(BASE - (s.shape[i] / s.spread) * K).toFixed(1)}`);
  const pile = `M${sx(X, s.center + ZS[0] * s.spread)},${y(BASE)} L${points.join(" L")} L${sx(X, s.center + ZS[ZS.length - 1] * s.spread)},${y(BASE)} Z`;
  const grow = ease(frame, twoFrom + 4, 20);
  const ghostPts = ZS.map(
    (z, i) =>
      `${sx(X, NARROW.center + z * NARROW.spread).toFixed(1)},${y(BASE - (NARROW.shape[i] / NARROW.spread) * K).toFixed(1)}`,
  );
  const ghost = `M${ghostPts.join(" L")}`;

  const truthX = sx(X, TRUE_MEAN);
  const centerX = sx(X, s.center);
  const loX = sx(X, s.lo);
  const hiX = sx(X, s.hi);
  const bracketY = top - 26;
  // Numbers are the measured ones at either end of a morph, never a value
  // in between: the label switches at the halfway point.
  const shownSpread = move > 0.5 ? MOVED.spread : squeeze > 0.5 ? NARROW.spread : WIDE.spread;
  const bias = NARROW.center - TRUE_MEAN;
  const perSample = move > 0.5 ? "5,000 customers, at random" : squeeze > 0.5 ? "5,000 customers, the easy way" : "200 customers, the easy way";

  return (
    <AbsoluteFill>
      {/* The pile rises, its spread is marked, it tightens, its bias is drawn,
          and a better method slides it home, where the conclusion rings. */}
      <Sfx name="slide" at={twoFrom + 4} level={-37} />
      <Sfx name="swish" at={scatterAt - 4} level={-34} />
      <Sfx name="tighten" at={squeezeFrom - 2} level={-33} />
      <Sfx name="swish-long" at={biasAt + 2} level={-35} />
      <Sfx name="slide" at={betterAt - 4} level={-33} />
      <Sfx name="chime" at={movesAt - 2} level={-29} />

      <Ink at={twoFrom - 4} dur={18} style={{ left: 92, top: y(150), ...headline(84), whiteSpace: "nowrap" }}>
        Two ways to miss.
      </Ink>
      <Note at={twoFrom + 10} x={96} y={y(258)}>
        <span style={{ ...body(32, true), color: INK }}>
          Each sample: <span key={perSample}>{perSample}</span>
        </span>
      </Note>

      {/* The rule, top right, a line at a time. */}
      <Ink at={shrinksAt + 4} dur={18} style={{ left: 1000, top: y(160), ...body(36), color: INK, whiteSpace: "nowrap" }}>
        More data shrinks the scatter.
      </Ink>
      <Ink at={movesAt - 2} dur={18} style={{ left: 1000, top: y(216), ...body(36, true), color: RANDOM_INK, whiteSpace: "nowrap" }}>
        Only a better method moves the center.
      </Ink>
      <NextLine at={nextAt} x={1000} y={y(278)} width={720}>
        the data that survived.
      </NextLine>

      <FigLabel n="6" title="Where 400 sample averages land" at={twoFrom} x={160} y={y(330)} />
      <Axis scale={X} base={y(BASE)} ticks={[66, 68, 70, 72, 74, 76, 78, 80, 82, 84]} at={twoFrom} />
      <TruthLine x={truthX} bottom={y(BASE)} top={y(BIAS_Y + 6)} at={twoFrom + 4} />
      <div
        style={{
          position: "absolute",
          right: 1920 - truthX + 12,
          top: y(BIAS_Y + 8),
          whiteSpace: "nowrap",
          opacity: ease(frame, twoFrom + 10, 12),
          ...halo,
        }}
      >
        <span style={note(21, INK_SOFT)}>true average </span>
        <span style={{ ...note(22, INK), fontWeight: 700 }}>{fmt(TRUE_MEAN)}</span>
      </div>

      {/* The pile, and once it has moved, where the easy way left it. */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {move > 0 ? (
          <path
            d={ghost}
            fill="none"
            stroke={EASY}
            strokeWidth={2}
            strokeDasharray="5 5"
            opacity={0.7 * ease(frame, betterAt + 6, 14)}
          />
        ) : null}
        <g style={{ transformOrigin: `${centerX}px ${y(BASE)}px`, transform: `scaleY(${grow})` }}>
          <path d={pile} fill={color} fillOpacity={0.85} stroke={color} strokeWidth={1.5} />
        </g>
        {/* Its center, once bias is named. */}
        <line
          x1={centerX}
          x2={centerX}
          y1={y(BIAS_Y)}
          y2={y(top) - 6}
          stroke={color}
          strokeWidth={2}
          strokeDasharray="5 6"
          opacity={ease(frame, centeredAt - 2, 12) * (centerX - truthX > 14 ? 1 : 0)}
        />
      </svg>

      {/* Variance: the width. */}
      <Bracket x0={loX} x1={hiX} y={y(bracketY)} at={scatterAt - 4} color={INK} />
      <div
        style={{
          position: "absolute",
          left: hiX + 18,
          top: y(bracketY) - 30,
          whiteSpace: "nowrap",
          opacity: ease(frame, scatterAt, 12),
          ...halo,
        }}
      >
        <div style={label(21, INK)}>Variance</div>
        <div style={note(22, INK_SOFT)}>
          spread <b style={{ color: INK }}>{fmt(shownSpread)}</b>
        </div>
        <div style={{ ...note(22, RANDOM_INK), marginTop: 4, opacity: ease(frame, betterAt + 18, 12) }}>
          bias <b>+{fmt(MOVED.center - TRUE_MEAN)}</b>
        </div>
      </div>
      <Note at={varianceAt} x={640} y={y(600)} out={biasAt}>
        <div style={{ ...body(30, true), color: INK }}>how far one sample&rsquo;s</div>
        <div style={{ ...body(30, true), color: INK }}>average strays from the next</div>
      </Note>

      {/* Bias: the offset. */}
      <Arrow
        from={[truthX, y(BIAS_Y)]}
        to={[centerX - 2, y(BIAS_Y)]}
        at={biasAt + 2}
        dur={18}
        color={color}
        width={3}
        opacity={centerX - truthX > 30 ? 1 : 0}
      />
      <div
        style={{
          position: "absolute",
          left: Math.max(640, (truthX + centerX) / 2 - 220),
          width: 440,
          top: y(BIAS_Y) - 52,
          textAlign: "center",
          whiteSpace: "nowrap",
          opacity: ease(frame, biasAt + 4, 12) * (1 - ease(frame, betterAt + 8, 10)),
          ...halo,
        }}
      >
        <span style={{ ...label(24, ink) }}>Bias </span>
        <span style={{ ...note(24, ink), fontWeight: 700 }}>
          +{fmt(bias)} points
        </span>
      </div>
      <Note at={movesAt + 2} x={sx(X, NARROW.hi) + 20} y={y(BASE - 140)}>
        <div style={{ ...note(21, EASY_INK), ...halo }}>the easy way,</div>
        <div style={{ ...note(21, EASY_INK), ...halo }}>still at {fmt(NARROW.center)}</div>
      </Note>
      <Note at={leavesAt} x={640} y={y(600)} out={methodFrom}>
        <div style={{ ...body(30, true), color: INK }}>where the averages</div>
        <div style={{ ...body(30, true), color: EASY_INK }}>center, right or wrong</div>
      </Note>
    </AbsoluteFill>
  );
};
