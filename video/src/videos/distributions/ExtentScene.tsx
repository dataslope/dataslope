import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { fmt, halo, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Leader, NextLine, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { jitter, normalPdf, RANGE } from "./data";
import {
  areaD,
  ASK,
  ASK_FILL,
  askNote,
  Bracket,
  Centered,
  code,
  Count,
  Curve,
  curveD,
  DIST,
  Drift,
  Head,
  pulse,
  Svg,
  VRule,
} from "./parts";

const X: XScale = { lo: 20, hi: 220, x0: 160, x1: 1760 };
const BASE = 640;
const TALL = 280;
const STRIP_Y = 720;
const JIT = 22;
const JITTER = jitter(91, RANGE.n);
const FAR_X = 1240;
const FAR_Y = 400;

/**
 * Part 4's close: a fitted normal only knows where its data was. Four
 * hundred values run from 34.7 to 116.8; above 100 the model's four percent
 * has data behind it, above 200 its answer is the assumed shape alone. Then
 * the bridge to Unit 5: a fit is only as good as how the sample was drawn.
 */
export const ExtentScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const extentFrom = n.beat("extent").from;
  const knowsAt = n.word("extent", "only knows");
  const valuesAt = n.word("extent", "four hundred values");
  const runAt = n.word("extent", "run from");
  const seventeenEnd = n.word("extent", "seventeen", { edge: "end" });
  const aboveAt = n.word("inside", "Above a hundred");
  const fourAt = n.word("inside", "four percent");
  const backAt = n.word("inside", "back it up");
  const twoHundredAt = n.word("outside", "Above two hundred");
  const pointAt = n.word("outside", "zero point");
  const zerosAt = n.word("outside", "twenty-three zeros");
  const threeAt = n.word("outside", "a three");
  const nothingAt = n.word("shape", "Nothing out there");
  const shapeAt = n.word("shape", "assumed shape");
  const goodAt = n.word("next", "as good as");
  const drawnAt = n.word("next", "how the sample");
  const settle = ease(frame, n.beat("next").to + 8, 30) * 0.45;

  const pdf = (v: number) => normalPdf(v, RANGE.loc, RANGE.scale);
  const base = y(BASE);
  const unit = h(TALL) / pdf(RANGE.loc);
  const py = (v: number) => base - v * unit;
  const stripY = y(STRIP_Y);
  const maxX = sx(X, RANGE.max);
  const minX = sx(X, RANGE.min);
  const nearX = sx(X, RANGE.near);
  const farX = sx(X, RANGE.far);
  const noData = ease(frame, seventeenEnd - 6, 16);
  const noDataGlow = pulse(frame, nothingAt - 4, 30);
  const tailGlow = pulse(frame, shapeAt - 6, 30) + pulse(frame, goodAt - 6, 24) * 0.5;
  // The far tail's number, written out a zero at a time.
  const zeros = Math.round(RANGE.farZeros * ease(frame, zerosAt - 4, 34));
  const digitsIn = frame >= threeAt - 3;

  return (
    <AbsoluteFill>
      {/* ── Sound: the values, the range, the near tail, the zeros typing out,
           the line to the next unit ── */}
      <Sfx name="el-sprinkle" at={valuesAt - 4} level={-34} />
      <Sfx name="el-pencil" at={runAt - 2} level={-35} />
      <Sfx name="el-pop" at={aboveAt - 2} level={-30} />
      <Sfx name="el-tap" at={zerosAt - 4} level={-31} />
      <Sfx name="el-tap" at={threeAt - 3} level={-28} />
      <Sfx name="el-pencil" at={drawnAt - 10} level={-34} />

      <Head
        parts={[
          { text: "A fit only knows", at: extentFrom - 4 },
          { text: "where its data was.", at: knowsAt + 4, italic: true },
        ]}
      />

      <Drift from={extentFrom} to={n.beat("next").to + 60} amount={0.02}>
        <div style={{ position: "absolute", inset: 0, opacity: 1 - settle }}>
        <FigLabel n="16" title={`${RANGE.n} values, and the normal fitted to them`} at={extentFrom} x={160} y={y(300)} />

        {/* Where there is no data. */}
        <Svg opacity={noData * (0.55 + noDataGlow * 0.45)}>
          <defs>
            <pattern id="dist-nodata" width={14} height={14} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1={0} y1={0} x2={0} y2={14} stroke={INK_SOFT} strokeWidth={1.4} opacity={0.35} />
            </pattern>
          </defs>
          <rect x={maxX + 6} y={y(350)} width={X.x1 - maxX - 6} height={stripY + h(JIT + 10) - y(350)} fill="url(#dist-nodata)" />
        </Svg>
        <Note at={seventeenEnd} x={X.x1 - 10} y={y(356)} align="right">
          <span style={{ ...label(22, INK_SOFT), opacity: 0.7 + noDataGlow * 0.3 }}>no data out here</span>
        </Note>

        {/* The two tails being asked about. */}
        <Svg opacity={ease(frame, aboveAt - 4, 14)}>
          <path d={areaD(pdf, RANGE.near, 220, X, py)} fill={ASK_FILL} />
        </Svg>
        <VRule x={nearX} bottom={base} top={base - h(TALL - 40)} at={aboveAt - 4} color={ASK} dash="6 5" />

        <Curve d={curveD(pdf, 20, 220, X, py)} at={extentFrom - 2} dur={30} color={ASK} width={3.4} />
        {/* The part of the curve no observation ever reached. */}
        <Svg opacity={tailGlow}>
          <path d={curveD(pdf, RANGE.max, 220, X, py)} fill="none" stroke={ASK} strokeWidth={7} strokeLinecap="round" />
        </Svg>
        <Axis scale={X} base={base} ticks={[40, 60, 80, 100, 120, 140, 160, 180, 200]} at={extentFrom} />

        {/* The four hundred values. */}
        <Svg>
          {RANGE.values.map((v, i) => {
            const a = ease(frame, valuesAt - 4 + (i / RANGE.n) * 30, 6);
            if (a <= 0) return null;
            const red = v > RANGE.near ? ease(frame, backAt - 6, 12) : 0;
            return (
              <circle
                key={i}
                cx={sx(X, v)}
                cy={stripY + h((JITTER[i] - 0.5) * 2 * JIT)}
                r={4 * a}
                fill={red > 0 ? `color-mix(in srgb, ${ASK} ${red * 100}%, ${DIST})` : DIST}
                opacity={0.8}
              />
            );
          })}
        </Svg>
        <Bracket x0={minX} x1={maxX} y={stripY + h(JIT + 16)} at={runAt} color={INK} />
        {[
          { x: minX, v: RANGE.min, at: runAt + 4 },
          { x: maxX, v: RANGE.max, at: seventeenEnd - 8 },
        ].map((e) => (
          <Centered key={e.v} x={e.x} y={stripY + h(JIT + 26)} opacity={ease(frame, e.at, 10)} style={{ ...note(22, INK), fontWeight: 650 }}>
            {fmt(e.v, 1)}
          </Centered>
        ))}
        <Centered x={(minX + maxX) / 2} y={stripY + h(JIT + 26)} opacity={ease(frame, runAt + 10, 10)} style={note(21, INK_SOFT)}>
          the data
        </Centered>

        {/* Above a hundred: an answer the data can check. */}
        <Note at={fourAt - 6} x={nearX + 14} y={base - h(TALL - 30)}>
          <div style={{ ...askNote(26), whiteSpace: "nowrap", ...halo }}>
            above {RANGE.near}: <Count at={fourAt - 6} dur={14} to={RANGE.sfNear * 100} digits={2} suffix="%" />
          </div>
          <div style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap", marginTop: 4, opacity: ease(frame, backAt - 2, 10), ...halo }}>
            {RANGE.dataAboveNear} of the {RANGE.n} values are up there
          </div>
        </Note>

        {/* Above two hundred: an answer nothing observed can check. */}
        <Leader
          points={[
            [farX, y(FAR_Y) + 40],
            [farX, base - 6],
          ]}
          at={twoHundredAt}
          dur={10}
          color={ASK}
          dot
        />
        <Note at={twoHundredAt} x={FAR_X} y={y(FAR_Y) - 14}>
          <span style={{ ...askNote(24), whiteSpace: "nowrap", background: PAPER, padding: "0 6px" }}>above {RANGE.far}:</span>
        </Note>
        <div
          style={{
            position: "absolute",
            left: FAR_X,
            top: y(FAR_Y) + 18,
            opacity: ease(frame, pointAt - 4, 8),
            ...code(26, INK),
            background: PAPER,
            padding: "2px 6px",
          }}
        >
          0.{"0".repeat(zeros)}
          <span style={{ color: ASK, opacity: digitsIn ? 1 : 0 }}>{RANGE.farDigits}</span>
        </div>
        <Note at={shapeAt - 4} x={FAR_X} y={y(FAR_Y) + 66}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap", background: PAPER, padding: "0 6px" }}>
            all of it from the assumed shape
          </span>
        </Note>

        </div>
        <NextLine at={drawnAt - 6} x={1140} y={y(866)} width={620}>
          how the sample was drawn.
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
