import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, body, HAIRLINE, headline, HIGHLIGHT, INK, INK_SOFT, label, TABULAR } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { RISK } from "./data";
import { Drift, Headline, Kicker, Svg, X0 } from "./kit";

/** The lesson's five factors, in its order, worded as the narration says them. */
const FACTORS = ["Rare", "Specific", "Several parts", "Past the cutoff", "Assumes an answer"] as const;
const CX = (k: number) => 790 + k * 180;
const SCORE_X = 1730;
const HEAD_Y = 300;
const ROW_Y = (r: number) => 410 + r * 112;
const ROW_H = 70;

/**
 * Risk, score: where the risk concentrates, the lesson's rough risk score
 * run as written (one point per factor), its four cases filled in column by
 * column as the narration names each factor.
 */
export const RiskScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();
  const start = n.beat("risk").from;
  const climbsAt = n.word("risk", "climbs");
  const factorAt = [
    n.word("risk", "rare"),
    n.word("risk", "specific"),
    n.word("risk", "several parts"),
    n.word("risk", "training cutoff"),
    n.word("risk", "assumes"),
  ];
  const capitalAt = n.word("score", "capital of France");
  const zeroAt = n.word("score", "zero out of five");
  const studyAt = n.word("score", "name of the study");
  const fourAt = n.word("score", "Four");
  const end = n.beat("hedge").from;

  // Scores ink from the first case to the last; the two the narration reads are marked.
  const scoreAt = [zeroAt, zeroAt + 14, zeroAt + 24, fourAt - 2];
  const bandOf = (r: number) =>
    r === 0
      ? ease(frame, capitalAt - 4, 10) * (1 - ease(frame, studyAt - 6, 10))
      : r === RISK.length - 1
        ? ease(frame, studyAt - 4, 10)
        : 0;

  return (
    <AbsoluteFill>
      {FACTORS.map((_, k) => (
        <Sfx key={k} name="el-tap" at={factorAt[k]} level={-31} />
      ))}
      <Sfx name="el-pencil" at={capitalAt - 4} level={-36} />
      <Sfx name="el-pop" at={fourAt - 2} level={-30} />

      <Kicker at={start - 6}>Why models hallucinate</Kicker>
      <Headline lead="The risk isn't spread evenly." turn="It climbs." at={start - 4} turnAt={climbsAt - 2} />
      <FigLabel n="9" title="A rough risk score: one point per factor (the lesson's block, run as written)" at={start} x={X0} y={y(232)} />

      <Drift from={start} to={end} amount={0.012} origin="40% 60%">
        {/* Column heads, each as the narration names it. */}
        {FACTORS.map((f, k) => (
          <Ink key={f} at={factorAt[k] - 4} dur={12} style={{ left: CX(k) - 85, width: 170, top: y(HEAD_Y), textAlign: "center" }}>
            <span style={{ ...label(22, INK), fontWeight: 650, display: "inline-block", lineHeight: 1.2 }}>{f}</span>
          </Ink>
        ))}
        <Ink at={zeroAt - 6} dur={12} style={{ left: SCORE_X - 70, width: 140, top: y(HEAD_Y), textAlign: "center" }}>
          <span style={{ ...label(22, INK), fontWeight: 650 }}>Score</span>
        </Ink>

        {RISK.map((r, i) => {
          const top = y(ROW_Y(i));
          const rh = h(ROW_H);
          return (
            <React.Fragment key={r.case}>
              <div
                style={{
                  position: "absolute",
                  left: X0 - 16,
                  width: 1720,
                  top: top - 8,
                  height: rh + 16,
                  background: HIGHLIGHT,
                  opacity: bandOf(i) * 0.5,
                }}
              />
              <Ink at={start + 4 + i * 5} dur={14} style={{ left: X0, top: top + rh / 2 - 22, width: 560 }}>
                <span style={{ ...body(31), color: INK }}>{r.case}</span>
              </Ink>
              <Svg opacity={ease(frame, start + 8, 12)}>
                <line x1={X0} x2={1800} y1={top + rh + 20} y2={top + rh + 20} stroke={HAIRLINE} strokeWidth={0.8} />
              </Svg>
              {r.flags.map((f, k) => {
                const s = pop(frame, factorAt[k] - 2 + i * 3, fps, 14);
                if (s <= 0.001) return null;
                return (
                  <Svg key={k}>
                    <circle
                      cx={CX(k)}
                      cy={top + rh / 2}
                      r={f ? 17 * Math.min(1.1, s) : 9}
                      fill={f ? ACCENT : "none"}
                      stroke={f ? "none" : INK_SOFT}
                      strokeWidth={1.6}
                      opacity={Math.min(1, s)}
                    />
                  </Svg>
                );
              })}
              <Ink at={scoreAt[i]} dur={12} style={{ left: SCORE_X - 70, width: 140, top: top + rh / 2 - 30, textAlign: "center" }}>
                <span style={{ ...headline(48), color: r.score === 0 ? INK : ACCENT_INK, ...TABULAR }}>
                  {r.score}
                  <span style={{ ...label(22, INK_SOFT), marginLeft: 6 }}>of 5</span>
                </span>
              </Ink>
            </React.Fragment>
          );
        })}
      </Drift>
    </AbsoluteFill>
  );
};
