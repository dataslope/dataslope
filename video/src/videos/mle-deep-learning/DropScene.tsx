import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { I, MathRun } from "../../editorial/math";
import { note, TABULAR } from "../../editorial/style";
import { ColumnRule, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { DROPOUT } from "./data";
import { ACCENT_INK, BAR, BLUE_INK, Drift, GREY_INK, INK, INK_SOFT, Line, Mark, OK_INK, Pixels, Svg } from "./parts";

const UNITS = 12;
const U_X = 250;
const U_PITCH = 42;
const U_R = 14;
const R_X = 880;
const CALL_X = 1010;
const CALL_PITCH = 78;

/** Which of the twelve units each training step drops: half, at random
 *  (a fixed draw, so every frame shows the same steps). */
const DROPPED: number[][] = [
  [0, 2, 3, 7, 9, 10],
  [1, 2, 5, 6, 8, 11],
  [0, 3, 4, 6, 9, 11],
];

/** Schematic weights for L2's pull toward zero: illustration, not data. */
const L2_W = [0.8, -0.55, 0.35, -0.9, 0.6, -0.25, 0.7, -0.45];

/**
 * Question 9. Dropout as three training steps of a twelve-unit layer, half
 * dropped each time and the survivors drawn thicker (scaled up), then the
 * same layer at inference, whole. The bug: a digit classifier trained with
 * dropout and served with it left on answers one 8 differently across ten
 * calls (eight 8s at 48% to 93%, two 1s), and one test image in ten changes
 * its answer, while accuracy only slips from 98% to 97%. Then L2's pull
 * toward zero and early stopping's best epoch, drawn as schematics.
 */
export const DropScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q9").from;
  const qAt = n.word("q9", "Question nine");
  const textAt = n.word("q9", "Explain dropout");
  const zeroesAt = n.word("q9-a", "Dropout zeroes");
  const shareAt = n.word("q9-a", "a fifth to a half");
  const relyAt = n.word("q9-a", "none can rely");
  const scaledAt = n.word("q9-a", "scaled up in training");
  const offAt = n.word("q9-a", "it's simply off");
  const leaveAt = n.word("q9-bug", "Leave it on");
  const tenAt = n.word("q9-bug", "Ten calls on one image");
  const eightSayAt = n.word("q9-bug", "eight say eight");
  const pctAt = n.word("q9-bug", "forty-eight to ninety-three percent");
  const twoAt = n.word("q9-bug", "two say one");
  const acrossAt = n.word("q9-bug", "Across the test set");
  const tenthAt = n.word("q9-bug", "one image in ten");
  const yetAt = n.word("q9-dash", "Yet accuracy only slips");
  const dashAt = n.word("q9-dash", "no dashboard flags it");
  const checkAt = n.word("q9-dash", "Check that serving runs");
  const oneOutAt = n.word("q9-dash", "one input gets one output");
  const l2At = n.word("q9-l2", "L2 penalizes squared weights");
  const pullAt = n.word("q9-l2", "pulling them toward zero");
  const sgdAt = n.word("q9-l2", "With plain SGD");
  const adamAt = n.word("q9-l2", "with Adam it isn't");
  const decayAt = n.word("q9-l2", "decay the weights directly");
  const earlyAt = n.word("q9-l2", "Early stopping keeps");
  const bestAt = n.word("q9-l2", "the best validation epoch");
  const allAt = n.word("q9-l2", "all three limit");
  const end = n.beat("cnn-in").to;

  // ── Dropout: three training steps, then inference ──
  const stepY = (k: number) => y(350) + k * h(64);
  const steps = [...DROPPED.map((d, k) => ({ name: `Step ${k + 1}`, drop: d, at: zeroesAt + k * 10 })), { name: "Inference", drop: [] as number[], at: offAt }];
  const thick = ease(frame, scaledAt, 12);

  // ── The ten calls ──
  const calls = DROPOUT.image.calls;

  // ── L2's pull, and early stopping ──
  const shrink = ease(frame, pullAt, 30);
  const L2_X = 130;
  const L2_BASE = y(790);
  const ES_X0 = 1330;
  const ES_X1 = 1760;
  const ES_TOP = y(735);
  const ES_BOT = y(840);
  const val = (t: number) => 0.35 + 1.6 * (t - 0.45) ** 2;
  const esPts = Array.from({ length: 41 }, (_, i) => {
    const t = i / 40;
    return [ES_X0 + t * (ES_X1 - ES_X0), ES_BOT - val(t) * (ES_BOT - ES_TOP)] as const;
  });
  const esP = ease(frame, earlyAt, 24);
  const bestT = 0.45;
  const bestX = ES_X0 + bestT * (ES_X1 - ES_X0);
  const bestY = ES_BOT - val(bestT) * (ES_BOT - ES_TOP);

  return (
    <AbsoluteFill>
      {steps.map((s, k) => (
        <Sfx key={k} name="el-tap" at={s.at} level={-32} />
      ))}
      <Sfx name="el-pop" at={tenAt} level={-31} />
      <Sfx name="el-sprinkle" at={eightSayAt} level={-34} />
      <Sfx name="el-tap" at={twoAt} level={-29} />
      <Sfx name="el-pop" at={tenthAt} level={-31} />
      <Sfx name="el-tap" at={checkAt} level={-30} />
      <Sfx name="el-whoosh" at={pullAt} level={-36} />
      <Sfx name="el-pencil" at={earlyAt} level={-35} />
      <Sfx name="el-chime" at={allAt + 30} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={9} at={qAt - 4} textAt={textAt - 4} size={62}>
          Explain dropout, L2, and early stopping as regularizers.
        </QuestionCard>

        {/* ── Dropout, step by step ── */}
        {steps.map((s, k) => (
          <React.Fragment key={s.name}>
            <Line at={s.at - 2} x={120} y={stepY(k) - 15} size={22} color={k === 3 ? INK : INK_SOFT}>
              {s.name}
            </Line>
            <Svg>
              {Array.from({ length: UNITS }, (_, u) => {
                const p = ease(frame, s.at + u * 0.8, 8);
                if (p <= 0) return null;
                const dropped = s.drop.includes(u);
                const cx = U_X + u * U_PITCH;
                return (
                  <circle
                    key={u}
                    cx={cx}
                    cy={stepY(k)}
                    r={U_R * p}
                    fill="none"
                    stroke={dropped ? GREY_INK : INK}
                    strokeWidth={dropped ? 1.6 : k < 3 ? 2 + 2.4 * thick : 2}
                    strokeDasharray={dropped ? "3 4" : undefined}
                    opacity={dropped ? 0.55 : 1}
                  />
                );
              })}
            </Svg>
          </React.Fragment>
        ))}
        <Line at={shareAt} x={120} y={stepY(3) + h(46)} size={24} color={INK}>
          Commonly <Num>0.2</Num> to <Num>0.5</Num> dropped
          <span style={{ opacity: ease(frame, relyAt, 10) }}>, so no unit relies on another</span>
        </Line>
        <Line at={scaledAt} x={120} y={stepY(3) + h(90)} size={24} color={INK}>
          Survivors scaled by{" "}
          <MathRun>
            1 / (1 − <I>p</I>)
          </MathRun>
          <span style={{ opacity: ease(frame, offAt, 10) }}>, so inference just turns it off</span>
        </Line>

        <ColumnRule x={R_X - 46} top={y(320)} height={y(640) - y(320)} at={leaveAt} />

        {/* ── Left on: ten calls, one image ── */}
        <Pixels values={DROPOUT.image.pixels} x={R_X} y={y(330)} cell={11} gap={0} at={leaveAt} />
        <Line at={leaveAt + 4} x={R_X} y={y(330) + 8 * 11 + h(12)} size={20} color={INK_SOFT}>
          A test <Num>{DROPOUT.image.label}</Num>
        </Line>
        <Line at={leaveAt + 4} x={CALL_X} y={y(320)} size={24} color={OK_INK}>
          Evaluation mode: <Num>{DROPOUT.image.evalClass}</Num> at <Num>{Math.round(DROPOUT.image.evalP * 100)}</Num>%, every call
        </Line>
        <Line at={tenAt} x={CALL_X} y={y(370)} size={22} color={INK_SOFT}>
          Dropout left on, ten calls:
        </Line>
        {calls.map((c, k) => {
          const p = ease(frame, tenAt + 8 + k * 3, 8);
          const wrong = c.class !== DROPOUT.image.label;
          const lit = ease(frame, wrong ? twoAt : eightSayAt, 10);
          return (
            <React.Fragment key={k}>
              <div
                style={{
                  position: "absolute",
                  left: CALL_X + k * CALL_PITCH,
                  width: 60,
                  top: y(412),
                  textAlign: "center",
                  ...note(34, wrong ? (lit > 0.5 ? ACCENT_INK : INK) : lit > 0.5 ? BLUE_INK : INK),
                  fontWeight: 600,
                  opacity: p,
                }}
              >
                {c.class}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: CALL_X + k * CALL_PITCH - 10,
                  width: 80,
                  top: y(412) + h(48),
                  textAlign: "center",
                  ...note(20, INK_SOFT),
                  ...TABULAR,
                  opacity: ease(frame, pctAt + k * 2, 8),
                }}
              >
                {Math.round(c.p * 100)}%
              </div>
            </React.Fragment>
          );
        })}
        <Line at={acrossAt} x={R_X} y={y(540)} size={24} color={INK}>
          Across the <Num>{DROPOUT.test}</Num> test digits:{" "}
          <span style={{ color: ACCENT_INK, opacity: ease(frame, tenthAt, 10) }}>
            <Num>1</Num> in <Num>10</Num> changes its answer within <Num>10</Num> calls
          </span>
        </Line>
        <Line at={yetAt} x={R_X} y={y(588)} size={24} color={INK}>
          Accuracy: <Num>{Math.round(DROPOUT.evalAcc * 100)}</Num>% → <Num>{Math.round(DROPOUT.onAcc * 100)}</Num>%
          <span style={{ color: INK_SOFT, opacity: ease(frame, dashAt, 10) }}>, so no dashboard flags it</span>
        </Line>
        <Line at={checkAt} x={R_X} y={y(636)} size={24} color={OK_INK}>
          Serve in evaluation mode: <Mark at={oneOutAt}>one input, one output</Mark>
        </Line>

        {/* ── L2: a pull toward zero ── */}
        <Line at={l2At} x={120} y={y(690)} size={24} color={INK}>
          L2: add{" "}
          <MathRun>
            <I>λ</I> Σ <I>w</I>²
          </MathRun>{" "}
          to the loss
        </Line>
        <Svg>
          <g opacity={ease(frame, l2At, 12)}>
            <line x1={L2_X - 10} x2={L2_X + L2_W.length * 34} y1={L2_BASE} y2={L2_BASE} stroke={INK} strokeWidth={1.4} />
            {L2_W.map((w, k) => {
              const v = w * (1 - 0.6 * shrink);
              const hh = Math.abs(v) * h(60);
              return <rect key={k} x={L2_X + k * 34} y={v > 0 ? L2_BASE - hh : L2_BASE} width={24} height={hh} rx={2} fill={BAR} />;
            })}
          </g>
        </Svg>
        <Line at={sgdAt} x={480} y={y(735)} size={22} color={INK_SOFT}>
          Plain SGD: the same as weight decay
        </Line>
        <Line at={adamAt} x={480} y={y(778)} size={22} color={INK}>
          Adam: <Mark at={decayAt}>decay the weights directly</Mark> (AdamW)
        </Line>

        {/* ── Early stopping: the best validation epoch ── */}
        <Line at={earlyAt - 2} x={ES_X0 - 30} y={y(690)} size={24} color={INK}>
          Early stopping
          <span style={{ color: INK_SOFT }}>: validation loss by epoch</span>
        </Line>
        <Svg>
          <g opacity={ease(frame, earlyAt, 10)}>
            <line x1={ES_X0} x2={ES_X1} y1={ES_BOT + 10} y2={ES_BOT + 10} stroke={INK} strokeWidth={1.4} />
            <path
              d={esPts.map(([a, b], i) => `${i ? "L" : "M"}${a.toFixed(1)},${b.toFixed(1)}`).join(" ")}
              fill="none"
              stroke={BAR}
              strokeWidth={3}
              pathLength={1}
              strokeDasharray={`${esP} 1`}
            />
            <text x={ES_X1} y={ES_BOT + 38} textAnchor="end" style={{ ...note(20, INK_SOFT), fill: INK_SOFT }}>
              epoch
            </text>
          </g>
          {ease(frame, bestAt, 10) > 0 ? (
            <g opacity={ease(frame, bestAt, 10)}>
              <line x1={bestX} x2={bestX} y1={bestY} y2={ES_BOT + 10} stroke={OK} strokeWidth={2} strokeDasharray="4 5" />
              <circle cx={bestX} cy={bestY} r={8} fill={OK} />
            </g>
          ) : null}
        </Svg>
        <Line at={bestAt + 4} x={bestX - 14} width={260} align="right" y={bestY + 6} size={22} color={OK_INK}>
          Keep these weights
        </Line>

        <Line at={allAt} x={120} y={y(880)} size={26} color={INK}>
          All three limit what a network can memorize
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
