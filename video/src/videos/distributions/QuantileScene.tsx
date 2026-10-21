import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { body, fmt, halo, INK, INK_SOFT, label, note, PAPER, TABULAR } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { expCdf, expPdf, QUANTILE } from "./data";
import { areaD, Arrow, ASK, ASK_FILL, askNote, Centered, clamp01, code, curveD, DIST, Drift, Head, lerp, pulse, Svg, YTicks } from "./parts";

const X: XScale = { lo: 0, hi: 1000, x0: 200, x1: 1280 };
const BASE = 820;
const TALL = 440;
const PANEL_X = 1400;
/** The density inset: the same response times, whose area left of a moment
 *  is the curve's height at that moment. */
const IN: XScale = { lo: 0, hi: 1000, x0: PANEL_X, x1: PANEL_X + 360 };
const IN_BASE = 560;
const IN_TALL = 140;

/**
 * Part 2's close: the question turned round. The share of requests finished
 * by each moment, read across from 95% and down to 599 ms: a quantile, the
 * CDF read backwards.
 */
export const QuantileScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const quantileFrom = n.beat("quantile").from;
  const responseAt = n.word("quantile", "response times");
  const timeAt = n.word("quantile", "the time");
  const avgAt = n.word("quantile", "two hundred milliseconds");
  const ninetyAt = n.word("quantile", "ninety-five percent");
  const plotAt = n.word("across", "Plot");
  const areaAt = n.word("across", "area to its left");
  const densityEnd = n.word("across", "density", { edge: "end" });
  const acrossAt = n.word("across", "Go across");
  const downAt = n.word("across", "down");
  const msAt = n.word("across", "five hundred");
  const quantileAt = n.word("cutoff", "quantile");
  const backwardsAt = n.word("cutoff", "backwards");
  const cutoffAt = n.word("cutoff", "cutoff");
  const promiseAt = n.word("cutoff", "promise");
  const andAt = n.word("normal-in", "And");

  const scale = QUANTILE.scale;
  const f = (x: number) => expCdf(x, scale);
  const base = y(BASE);
  const py = (v: number) => base - v * h(TALL);
  // The curve is revealed up to the tracer, so the dot always sits on its
  // end; the inset's area fills to the same moment.
  const draw = ease(frame, plotAt - 4, densityEnd - plotAt + 10);
  const cursor = lerp(0, 1000, draw);
  const pdf = (x: number) => expPdf(x, scale);
  const inBase = y(IN_BASE);
  const ipy = (v: number) => inBase - (v / pdf(0)) * h(IN_TALL);
  const inset = ease(frame, responseAt - 2, 20);
  const areaGlow = pulse(frame, areaAt - 4, 26);
  const readout = 1 - clamp01((f(cursor) - 0.85) / 0.05);
  const asked = ease(frame, acrossAt - 2, 14);
  const qx = sx(X, QUANTILE.ppf);
  const qy = py(QUANTILE.p);
  const across = ease(frame, acrossAt - 2, 18);
  const down = ease(frame, downAt - 2, 16);
  const dim = ease(frame, andAt - 4, 14) * 0.3;

  return (
    <AbsoluteFill>
      {/* ── Sound: the curve drawn, across, down, the answer landing ── */}
      <Sfx name="el-pencil" at={plotAt - 4} level={-34} />
      <Sfx name="el-whoosh" at={acrossAt - 2} level={-34} />
      <Sfx name="el-tap" at={msAt - 4} level={-28} />
      <Sfx name="el-pop" at={quantileAt - 4} level={-31} />

      <Head parts={[{ text: "Ask for the value instead.", at: quantileFrom - 4 }]} out={quantileAt - 8} />
      <Head
        parts={[
          { text: "A quantile:", at: quantileAt - 4 },
          { text: "the area, read backwards.", at: backwardsAt - 8, italic: true },
        ]}
      />

      <Drift from={quantileFrom} to={n.beat("normal-in").to + 40}>
        <div style={{ position: "absolute", inset: 0, opacity: 1 - dim }}>
          <FigLabel n="8" title="Response times: the share of requests finished by each moment" at={responseAt - 6} x={160} y={y(300)} />
          <Note at={responseAt + 4} x={X.x1} y={y(346)} align="right">
            <span style={code(21, INK_SOFT)}>expon(scale={scale})</span>
          </Note>
          <YTicks ticks={[0.25, 0.5, 0.75]} py={py} x0={X.x0} x1={X.x1} at={responseAt} format={(v) => `${Math.round(v * 100)}%`} />
          <Axis scale={X} base={base} ticks={[0, 200, 400, 600, 800, 1000]} at={responseAt} format={(v) => (v === 1000 ? "1,000 ms" : String(v))} />

          {/* The average, for scale. */}
          <Svg opacity={ease(frame, avgAt - 2, 12) * 0.7}>
            <line x1={sx(X, scale)} x2={sx(X, scale)} y1={base} y2={base - h(70)} stroke={INK} strokeWidth={2} strokeDasharray="6 6" />
          </Svg>
          <Note at={avgAt + 4} x={sx(X, scale) + 12} y={base - h(60)}>
            <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap", ...halo }}>average {scale} ms</span>
          </Note>

          {/* What's asked: the time ninety-five percent beat. */}
          <Svg opacity={ease(frame, ninetyAt - 2, 12) * (1 - across)}>
            <line x1={X.x0} x2={X.x1} y1={qy} y2={qy} stroke={ASK} strokeWidth={1.6} strokeDasharray="6 6" opacity={0.7} />
          </Svg>
          <Note at={ninetyAt} x={X.x0 + 16} y={qy - 40} out={acrossAt - 2}>
            <span style={{ ...askNote(22), whiteSpace: "nowrap" }}>95% of requests done by... when?</span>
          </Note>
          <Note at={timeAt} x={X.x0 + 16} y={qy + 14} out={plotAt}>
            <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>a time, not a chance</span>
          </Note>

          {draw > 0 ? (
            <Svg>
              <defs>
                <clipPath id="dist-quantile-reveal">
                  <rect x={0} y={0} width={sx(X, cursor) + 1} height={1080} />
                </clipPath>
              </defs>
              <path
                d={curveD(f, 0, 1000, X, py)}
                fill="none"
                stroke={DIST}
                strokeWidth={3.2}
                strokeLinejoin="round"
                strokeLinecap="round"
                clipPath="url(#dist-quantile-reveal)"
              />
            </Svg>
          ) : null}
          {draw > 0 && draw < 1 ? (
            <>
              <Svg>
                <circle cx={sx(X, cursor)} cy={py(f(cursor))} r={7} fill={DIST} stroke={PAPER} strokeWidth={2} />
              </Svg>
              <div
                style={{
                  position: "absolute",
                  left: sx(X, cursor) + 14,
                  top: py(f(cursor)) + 12,
                  opacity: readout,
                  ...note(22, INK),
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  ...halo,
                }}
              >
                by <span style={TABULAR}>{Math.round(cursor)}</span> ms: <span style={TABULAR}>{Math.round(f(cursor) * 100)}</span>%
              </div>
            </>
          ) : null}

          {/* Across from 95%, then down. */}
          <Svg>
            {across > 0 ? <line x1={X.x0} x2={lerp(X.x0, qx, across)} y1={qy} y2={qy} stroke={ASK} strokeWidth={3} /> : null}
          </Svg>
          <Arrow from={[qx, qy]} to={[qx, base - 4]} at={downAt - 2} dur={16} color={ASK} width={3} />
          <Svg opacity={down}>
            <circle cx={qx} cy={qy} r={6} fill={ASK} />
          </Svg>
          <Centered x={X.x0 - 54} y={qy - 14} opacity={ease(frame, acrossAt - 4, 10)} style={{ ...askNote(22), background: PAPER, padding: "0 4px" }}>
            95%
          </Centered>
          <Note at={msAt - 4} x={qx + 14} y={base - h(80)}>
            <span style={{ ...askNote(34), whiteSpace: "nowrap" }}>{fmt(QUANTILE.ppf, 0)} ms</span>
          </Note>

          {/* The density the curve sums up: its area left of the tracer is the
              curve's height there, and 95% of it is what 599 ms reads back. */}
          <Ink at={responseAt - 2} dur={14} style={{ left: PANEL_X, top: y(IN_BASE - IN_TALL - 56), whiteSpace: "nowrap" }}>
            <span style={label(21, INK_SOFT)}>The density of response times</span>
          </Ink>
          <Svg opacity={inset}>
            {draw > 0 ? (
              <path
                d={areaD(pdf, 0, cursor, IN, ipy, 80)}
                fill={`color-mix(in srgb, ${DIST} ${22 + areaGlow * 28}%, transparent)`}
                opacity={1 - asked}
              />
            ) : null}
            {asked > 0 ? <path d={areaD(pdf, 0, QUANTILE.ppf, IN, ipy, 80)} fill={ASK_FILL} opacity={asked} /> : null}
            <path d={curveD(pdf, 0, 1000, IN, ipy, 80)} fill="none" stroke={DIST} strokeWidth={2.6} strokeLinejoin="round" />
            <line x1={IN.x0} x2={IN.x1} y1={inBase + 0.5} y2={inBase + 0.5} stroke={INK} strokeWidth={1.4} />
            {draw > 0 && draw < 1 ? (
              <line x1={sx(IN, cursor)} x2={sx(IN, cursor)} y1={inBase} y2={ipy(pdf(cursor)) - 6} stroke={DIST} strokeWidth={2} />
            ) : null}
            {asked > 0 ? (
              <line x1={sx(IN, QUANTILE.ppf)} x2={sx(IN, QUANTILE.ppf)} y1={inBase} y2={ipy(pdf(QUANTILE.ppf)) - 10} stroke={ASK} strokeWidth={2.2} opacity={asked} />
            ) : null}
          </Svg>
          <Note at={areaAt - 2} x={PANEL_X} y={inBase + 14} out={acrossAt - 4}>
            <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>shaded: the share finished</span>
          </Note>
          <Note at={msAt - 2} x={PANEL_X} y={inBase + 14}>
            <span style={{ ...askNote(21), whiteSpace: "nowrap" }}>95% of the area lies left of {fmt(QUANTILE.ppf, 0)} ms</span>
          </Note>

          {/* The two directions. */}
          <Ink at={quantileAt - 2} dur={14} style={{ left: PANEL_X, top: y(620), whiteSpace: "nowrap" }}>
            <span style={label(22, INK_SOFT)}>Two directions</span>
          </Ink>
          <Ink at={quantileAt + 4} dur={14} style={{ left: PANEL_X, top: y(658), whiteSpace: "nowrap" }}>
            <span style={code(24, INK)}>cdf</span>
            <span style={{ ...note(23, INK_SOFT), marginLeft: 12 }}>a time → a share</span>
          </Ink>
          <Ink at={backwardsAt - 6} dur={14} style={{ left: PANEL_X, top: y(700), whiteSpace: "nowrap" }}>
            <span style={code(24, ASK)}>ppf</span>
            <span style={{ ...note(23, INK), marginLeft: 12, fontWeight: 600 }}>a share → a time</span>
          </Ink>
          <Ink at={backwardsAt + 6} dur={14} style={{ left: PANEL_X, top: y(744), whiteSpace: "nowrap" }}>
            <span style={code(22, INK_SOFT)}>
              ppf({QUANTILE.p}) = {fmt(QUANTILE.ppf, 1)}
            </span>
          </Ink>
          <Ink at={cutoffAt - 4} dur={14} style={{ left: PANEL_X, top: y(800), whiteSpace: "nowrap" }}>
            <span style={{ ...body(30, true), color: INK }}>a cutoff, or a promise:</span>
          </Ink>
          <Ink at={promiseAt + 6} dur={14} style={{ left: PANEL_X, top: y(846), whiteSpace: "nowrap" }}>
            <span style={{ ...askNote(23) }}>95% within {fmt(QUANTILE.ppf, 0)} ms</span>
          </Ink>
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
