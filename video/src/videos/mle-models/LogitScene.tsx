import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { I, MathRun } from "../../editorial/math";
import { INK, INK_SOFT } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { colors } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { LOGIT } from "./data";
import { at, Axes, type Box, Curve, DATA, Drift, Line, Mark, Q_SIZE, scales, Svg, X0, POINT } from "./parts";

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
const logit = (p: number) => Math.log(p / (1 - p));

/**
 * Question 4. The score (the weighted features plus a bias, the log odds)
 * through the sigmoid into a probability, trained on log loss. Then the
 * page's block as it prints, its first two probabilities found on the curve,
 * and why it is the baseline in production.
 */
export const LogitScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("logit").from;
  const qAt = n.word("logit", "Question four");
  const textAt = n.word("logit", "How does logistic regression work?");
  const weightsAt = n.word("logit", "It weights the features into a score");
  const oddsAt = n.word("logit", "the log odds");
  const sigAt = n.word("logit", "the sigmoid squeezes that");
  const probAt = n.word("logit", "into a probability");
  const trainAt = n.word("logit", "Training minimizes");
  const lossAt = n.word("logit", "or log loss");
  const runAt = n.word("logit-run", "On the page's data");
  const accAt = n.word("logit-run", "seventy-five percent");
  const probsAt = n.word("logit-run", "probabilities like");
  const p1At = n.word("logit-run", "point nine six");
  const p2At = n.word("logit-run", "point one nine");
  const classAt = n.word("logit-prod", "It's a classifier despite its name");
  const baseAt = n.word("logit-prod", "a strong baseline");
  const dotAt = n.word("logit-prod", "one dot product to serve");
  const readAt = n.word("logit-prod", "weights you can read");
  const threshAt = n.word("logit-prod", "a threshold set separately");
  const costAt = n.word("logit-prod", "from the cost of each error");
  const end = n.beat("logit-prod").to;

  // Its top 22 px under the formula's line, its bottom where it was, so the
  // axis title clears "Probability: p = σ(z)" above it.
  const box: Box = { left: X0 + 60, top: y(462), width: 700, height: h(278) };
  const { x: sx, y: sy } = scales(box, [-6, 6], [0, 1]);
  const curve = Array.from({ length: 121 }, (_, i) => {
    const z = -6 + i * 0.1;
    return [z, sigmoid(z)] as const;
  });
  const picks = [
    { p: LOGIT.first5[0], at: p1At },
    { p: LOGIT.first5[1], at: p2At },
  ];
  const R = 1000;
  const mono = (size: number): React.CSSProperties => ({ fontFamily: MONO, fontSize: size, fontWeight: 500, color: INK, whiteSpace: "pre", fontVariantLigatures: "none" });
  const [acc, probs] = LOGIT.printed;
  const head = probs.slice(0, probs.indexOf("[") + 1);
  const vals = probs.slice(probs.indexOf("[") + 1, -1).split(/(\s+)/);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={weightsAt} level={-31} />
      <Sfx name="el-pencil" at={sigAt} level={-35} />
      <Sfx name="el-tap" at={runAt + 4} level={-31} />
      {picks.map((pk) => (
        <Sfx key={pk.p} name="el-pop" at={pk.at} level={-32} />
      ))}
      <Sfx name="el-tap" at={dotAt} level={-31} />
      <Sfx name="el-tap" at={readAt} level={-31} />
      <Sfx name="el-tap" at={threshAt} level={-31} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE}>
          How does logistic regression work?
        </QuestionCard>

        {/* ── Score, sigmoid, probability ── */}
        <Line at={weightsAt - 2} x={X0} y={y(300)} size={30}>
          Score:{" "}
          <MathRun>
            <I>z</I> = <I>w</I> · <I>x</I> + <I>b</I>
          </MathRun>
          <span style={{ color: INK_SOFT, opacity: ease(frame, oddsAt, 10) }}>, the log odds</span>
        </Line>
        <Line at={probAt - 4} x={X0} y={y(358)} size={30}>
          Probability:{" "}
          <MathRun>
            <I>p</I> = <I>σ</I>(<I>z</I>) = 1 / (1 + <I>e</I>
            <sup style={{ fontSize: "0.68em" }}>
              −<I>z</I>
            </sup>
            )
          </MathRun>
        </Line>
        <Axes x={sx} y={sy} xTicks={[-6, -3, 0, 3, 6]} yTicks={[0, 0.5, 1]} xTitle="Score, z" yTitle="Probability" at={sigAt - 6} />
        <Curve points={curve} x={sx} y={sy} at={sigAt} dur={26} color={DATA} width={3.6} />
        {picks.map((pk) => {
          const z = logit(pk.p);
          const p = ease(frame, pk.at - 2, 10);
          return (
            <Svg key={pk.p} opacity={p}>
              <line x1={at(sx, z)} x2={at(sx, z)} y1={at(sy, 0)} y2={at(sy, pk.p)} stroke={INK_SOFT} strokeWidth={1.4} strokeDasharray="3 5" />
              <circle cx={at(sx, z)} cy={at(sy, pk.p)} r={9} fill={POINT} stroke={colors.page} strokeWidth={2} />
            </Svg>
          );
        })}
        {picks.map((pk, i) => (
          <Line key={pk.p} at={pk.at} x={at(sx, logit(pk.p)) + (i ? 18 : -18)} y={at(sy, pk.p) - (i ? -6 : 48)} size={22} align={i ? "left" : "right"} width={i ? undefined : 120}>
            {pk.p.toFixed(3)}
          </Line>
        ))}
        <Line at={trainAt - 2} x={X0} y={y(846)} size={28}>
          Training minimizes <Mark at={lossAt}>log loss</Mark>, binary cross-entropy
        </Line>

        {/* ── The page's block, as it prints ── */}
        <Line at={runAt - 2} x={R} y={y(300)} size={22} color={INK_SOFT}>
          The page&apos;s block, {LOGIT.testRows} held-out rows
        </Line>
        <div
          style={{
            position: "absolute",
            left: R,
            top: y(346),
            padding: "18px 24px",
            borderRadius: 8,
            background: colors.surface,
            opacity: ease(frame, runAt, 12),
          }}
        >
          <div style={{ ...mono(22), opacity: ease(frame, accAt - 4, 10) }}>
            <Mark at={accAt}>{acc}</Mark>
          </div>
          <div style={{ ...mono(22), marginTop: 12, opacity: ease(frame, probsAt - 4, 10) }}>
            {head}
            {vals.map((v, i) =>
              i === 0 ? (
                <Mark key={i} at={p1At}>
                  {v}
                </Mark>
              ) : i === 2 ? (
                <Mark key={i} at={p2At}>
                  {v}
                </Mark>
              ) : (
                <span key={i}>{v}</span>
              ),
            )}
            ]
          </div>
        </div>

        {/* ── Why it is the baseline ── */}
        <Line at={classAt - 2} x={R} y={y(520)} size={28}>
          A classifier, despite its name
        </Line>
        <Line at={baseAt - 2} x={R} y={y(574)} size={28}>
          A strong baseline:
        </Line>
        {[
          { at: dotAt, text: "One dot product to serve" },
          { at: readAt, text: "Weights you can read" },
          { at: threshAt, text: "A threshold, set separately" },
        ].map((t, i) => (
          <Line key={t.text} at={t.at - 2} x={R + 30} y={y(636) + i * h(50)} size={26}>
            {t.text}
          </Line>
        ))}
        <Line at={costAt - 2} x={R + 30} y={y(636) + 3 * h(50) - h(8)} size={24} color={INK_SOFT}>
          from the cost of each error
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
