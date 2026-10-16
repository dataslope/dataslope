import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { body, fmt, halo, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { expCdf, QUANTILE } from "./data";
import { Arrow, ASK, askNote, Centered, code, Curve, curveD, DIST, Drift, Head, lerp, Svg, YTicks } from "./parts";

const X: XScale = { lo: 0, hi: 1000, x0: 200, x1: 1280 };
const BASE = 820;
const TALL = 440;
const PANEL_X = 1400;

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
  const ninetyAt = n.word("quantile", "ninety-five percent");
  const plotAt = n.word("across", "Plot");
  const momentEnd = n.word("across", "moment", { edge: "end" });
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
  const draw = ease(frame, plotAt - 4, momentEnd - plotAt + 20);
  const cursor = lerp(0, 1000, draw);
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
          <YTicks ticks={[0.25, 0.5, 0.75, 1]} py={py} x0={X.x0} x1={X.x1} at={responseAt} format={(v) => `${Math.round(v * 100)}%`} />
          <Axis scale={X} base={base} ticks={[0, 200, 400, 600, 800, 1000]} at={responseAt} format={(v) => (v === 1000 ? "1,000 ms" : String(v))} />

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

          <Curve d={curveD(f, 0, 1000, X, py)} at={plotAt - 4} dur={momentEnd - plotAt + 20} />
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
                  ...note(22, INK),
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  ...halo,
                }}
              >
                by {Math.round(cursor)} ms: {Math.round(f(cursor) * 100)}%
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

          {/* The two directions. */}
          <Ink at={quantileAt - 2} dur={14} style={{ left: PANEL_X, top: y(470), whiteSpace: "nowrap" }}>
            <span style={label(22, INK_SOFT)}>Two directions</span>
          </Ink>
          <Ink at={quantileAt + 4} dur={14} style={{ left: PANEL_X, top: y(510), whiteSpace: "nowrap" }}>
            <span style={code(24, INK)}>cdf</span>
            <span style={{ ...note(23, INK_SOFT), marginLeft: 12 }}>a time → a share</span>
          </Ink>
          <Ink at={backwardsAt - 6} dur={14} style={{ left: PANEL_X, top: y(556), whiteSpace: "nowrap" }}>
            <span style={code(24, ASK)}>ppf</span>
            <span style={{ ...note(23, INK), marginLeft: 12, fontWeight: 600 }}>a share → a time</span>
          </Ink>
          <Ink at={backwardsAt + 6} dur={14} style={{ left: PANEL_X, top: y(612), whiteSpace: "nowrap" }}>
            <span style={code(22, INK_SOFT)}>
              ppf({QUANTILE.p}) = {fmt(QUANTILE.ppf, 1)}
            </span>
          </Ink>
          <Ink at={cutoffAt - 4} dur={14} style={{ left: PANEL_X, top: y(680), whiteSpace: "nowrap" }}>
            <span style={{ ...body(30, true), color: INK }}>a cutoff,</span>
          </Ink>
          <Ink at={promiseAt - 4} dur={14} style={{ left: PANEL_X, top: y(722), whiteSpace: "nowrap" }}>
            <span style={{ ...body(30, true), color: INK }}>or a promise:</span>
          </Ink>
          <Ink at={promiseAt + 6} dur={14} style={{ left: PANEL_X, top: y(766), whiteSpace: "nowrap" }}>
            <span style={{ ...askNote(23) }}>95% within {fmt(QUANTILE.ppf, 0)} ms</span>
          </Ink>
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
