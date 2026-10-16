import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, body, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Bracket, Headline, Kicker, lerp, Marker, Ring, STAT, STAT_INK, Strike, Svg } from "./parts";

/** The arc of an A/B test, in the lesson's order. */
export const STEPS = ["Hypothesis and metric", "Randomize", "Sample size", "Run to plan", "Analyze", "Decide"];
export const STEP_X = [160, 445, 680, 905, 1135, 1345];
export const STEP_Y = 318;
/** Ten metrics a team might track. Illustrative: the lesson names the count,
 *  not the metrics. */
const METRICS = [
  "Conversion",
  "Revenue",
  "Clicks",
  "Time on page",
  "Cart size",
  "Bounce rate",
  "Returns",
  "Sign-ups",
  "Scroll depth",
  "Page views",
];
const MOVER = METRICS.indexOf("Scroll depth");

/**
 * Part 2 opens: the A/B test's arc, nearly all of it decided before the first
 * user; one hypothesis (the checkout button), one primary metric, and the
 * forking paths that ten metrics would bring back.
 */
export const DesignScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const designFrom = n.beat("design").from;
  const experimentAt = n.word("design", "experiment");
  const decidedAt = n.word("design", "decided");
  const firstAt = n.word("design", "first user");
  const oneAt = n.word("hypothesis", "One hypothesis");
  const buttonAt = n.word("hypothesis", "checkout button");
  const rateAt = n.word("hypothesis", "conversion rate");
  const metricAt = n.word("metric", "one metric");
  const nowAt = n.word("metric", "chosen now");
  const tenAt = n.word("metric", "Track ten");
  const cheerAt = n.word("metric", "cheer");
  const movesAt = n.word("metric", "moves");
  const forkingAt = n.word("metric", "forking paths");
  const thenAt = n.word("who-in", "Then");
  const experimentInAt = n.word("who-in", "experiment");

  const stepAt = (i: number) => lerp(experimentAt - 6, decidedAt - 2, i / (STEPS.length - 1));
  const lowerDim = 1 - 0.6 * ease(frame, thenAt - 4, 14);
  const hot = ease(frame, cheerAt - 2, 10);

  return (
    <AbsoluteFill>
      {/* ── Sound: the six steps, the buttons, the metric pinned, the chips, the strike ── */}
      <Sfx name="el-pencil" at={experimentAt - 6} level={-34} />
      <Sfx name="el-pop" at={buttonAt - 4} level={-30} />
      <Sfx name="el-tap" at={metricAt - 4} level={-28} />
      <Sfx name="el-sprinkle" at={tenAt - 4} level={-34} />
      <Sfx name="el-scratch" at={forkingAt - 4} level={-30} />

      <Kicker at={designFrom - 10}>An A/B test, end to end</Kicker>
      <Headline lead="Almost all of it" turn="is decided first." at={designFrom - 6} turnAt={decidedAt - 6} />

      {/* ── The arc ── */}
      <Svg opacity={ease(frame, experimentAt - 6, 30)}>
        <line
          x1={STEP_X[0]}
          x2={lerp(STEP_X[0], 1500, ease(frame, experimentAt - 6, 34))}
          y1={y(STEP_Y) + 46}
          y2={y(STEP_Y) + 46}
          stroke={HAIRLINE}
          strokeWidth={1.4}
        />
      </Svg>
      {STEPS.map((s, i) => {
        const at = stepAt(i);
        const hl = i === 1 ? ease(frame, experimentInAt - 6, 12) : 0;
        return (
          <React.Fragment key={s}>
            <Ink at={at} dur={12} style={{ left: STEP_X[i], top: y(STEP_Y), whiteSpace: "nowrap", display: "flex", gap: 10 }}>
              <span style={{ ...label(22, ACCENT_INK), fontWeight: 700 }}>{i + 1}</span>
              <span style={{ ...label(22, INK), fontWeight: 600 }}>
                {i === 1 ? (
                  <Marker at={experimentInAt - 6} color={HIGHLIGHT}>
                    {s}
                  </Marker>
                ) : (
                  s
                )}
              </span>
            </Ink>
            <Svg opacity={Math.min(1, pop(frame, at, fps, 14))}>
              <circle cx={STEP_X[i] + 6} cy={y(STEP_Y) + 46} r={lerp(6, 9, hl)} fill={i < 3 ? INK : PAPER} stroke={INK} strokeWidth={2} />
            </Svg>
          </React.Fragment>
        );
      })}
      <Ring x={STEP_X[1] + 6} y={y(STEP_Y) + 46} at={experimentInAt - 4} />
      <Bracket x0={STEP_X[0] - 4} x1={STEP_X[3] - 40} y={y(STEP_Y) + 74} at={firstAt - 6} up />
      <Ink at={firstAt - 2} dur={14} style={{ left: STEP_X[0], top: y(STEP_Y) + 84, whiteSpace: "nowrap" }}>
        <span style={{ ...note(21, INK_SOFT) }}>decided before the first user arrives</span>
      </Ink>

      <div style={{ position: "absolute", inset: 0, opacity: lowerDim }}>
        {/* ── One hypothesis ── */}
        <Ink at={oneAt - 4} dur={14} style={{ left: 160, top: y(490), whiteSpace: "nowrap" }}>
          <span style={label(22, INK_SOFT)}>One hypothesis</span>
        </Ink>
        <Ink at={buttonAt - 8} dur={22} style={{ left: 160, top: y(526), width: 720 }}>
          <span style={{ ...body(42), color: INK }}>
            The new checkout button raises the <Marker at={rateAt - 4}>conversion rate</Marker>.
          </span>
        </Ink>
        {(["A", "B"] as const).map((g, i) => {
          const p = Math.min(1.06, pop(frame, buttonAt - 2 + i * 8, fps, 14));
          if (p <= 0.001) return null;
          return (
            <div
              key={g}
              style={{
                position: "absolute",
                left: 1010 + i * 330,
                top: y(500),
                opacity: Math.min(1, p),
                transform: `scale(${0.85 + 0.15 * p})`,
                transformOrigin: "50% 50%",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <span style={label(21, INK_SOFT)}>{g === "A" ? "A: the old button" : "B: the new one"}</span>
              <span
                style={{
                  ...label(26, g === "A" ? INK : PAPER),
                  display: "inline-block",
                  width: 240,
                  textAlign: "center",
                  padding: "16px 0",
                  borderRadius: g === "A" ? 6 : 30,
                  background: g === "A" ? `color-mix(in srgb, ${INK_SOFT} 22%, ${PAPER})` : BAR,
                  border: g === "A" ? `2px solid ${HAIRLINE}` : "none",
                }}
              >
                Buy now
              </span>
            </div>
          );
        })}

        {/* ── One metric, chosen now ── */}
        <Ink at={metricAt - 4} dur={14} style={{ left: 160, top: y(690), whiteSpace: "nowrap" }}>
          <span style={label(22, INK_SOFT)}>One primary metric</span>
        </Ink>
        <Ink at={metricAt + 2} dur={18} style={{ left: 160, top: y(726), whiteSpace: "nowrap" }}>
          <span style={{ ...body(42), color: INK }}>Conversion rate</span>
        </Ink>
        <Ink at={nowAt - 4} dur={14} style={{ left: 480, top: y(740), whiteSpace: "nowrap" }}>
          <span style={{ ...note(22, STAT_INK), fontWeight: 650 }}>chosen now, before any data</span>
        </Ink>

        {/* Ten metrics, and the one that happened to move. */}
        <Ink at={tenAt - 6} dur={14} style={{ left: 1010, top: y(690), whiteSpace: "nowrap" }}>
          <span style={label(22, INK_SOFT)}>Or track ten</span>
        </Ink>
        <div style={{ position: "absolute", left: 1010, top: y(726), width: 780, display: "flex", flexWrap: "wrap", gap: "12px 14px" }}>
          {METRICS.map((m, k) => {
            const p = Math.min(1.06, pop(frame, tenAt - 4 + k * 3, fps, 14));
            const mover = k === MOVER;
            return (
              <div
                key={m}
                style={{
                  opacity: Math.min(1, Math.max(0, p)) * (mover ? 1 : 1 - 0.45 * hot),
                  transform: `scale(${0.8 + 0.2 * Math.max(0, p)})`,
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    ...note(21, mover && hot > 0 ? STAT_INK : INK),
                    fontWeight: mover ? 650 : 500,
                    display: "inline-block",
                    padding: "5px 14px",
                    borderRadius: 20,
                    border: `1.6px solid ${mover && hot > 0 ? STAT : HAIRLINE}`,
                    background: mover ? `color-mix(in srgb, ${HIGHLIGHT} ${Math.round(hot * 100)}%, ${PAPER})` : PAPER,
                  }}
                >
                  {mover ? <Strike at={forkingAt - 4}>{m}</Strike> : m}
                </span>
              </div>
            );
          })}
        </div>
        <Ink at={movesAt - 2} dur={14} style={{ left: 1010, top: y(870), whiteSpace: "nowrap" }}>
          <span style={{ ...note(22, STAT_INK), fontWeight: 650 }}>and cheer the one that moved</span>
        </Ink>
      </div>
    </AbsoluteFill>
  );
};
