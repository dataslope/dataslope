import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CUPED } from "./data";
import { at, Axes, Drift, Mark, OK, OK_INK, type Scale, Svg } from "./parts";

const BOX = { left: 190, right: 1010, top: 380, bottom: 820 };
const COL_X = 1140;
const BAR_W = 560;
const VAR_MAX = 9;

/** The name, with each of its initials marked as it is read. */
const WORDS = [
  ["C", "ontrolled-experiment"],
  ["U", "sing"],
  ["P", "re-"],
  ["E", "xperiment"],
  ["D", "ata"],
] as const;

/**
 * Question 11, on the page's own CUPED block: 500 users' pre-period value
 * against their value during the test, the fitted slope theta through the
 * means, then every point lowered by theta times its distance from the
 * pre-period average, so the cloud flattens onto the same mean. The
 * variance falls from 8.09 to 3.52; the mean does not move.
 */
export const CupedScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("cuped").from;
  const qAt = n.word("cuped", "Question");
  const textAt = n.word("cuped", "What is CUPED");
  const standsAt = n.word("cuped", "It stands for");
  const nameAt = n.word("cuped", "Controlled-experiment Using");
  const dataAt = n.word("cuped", "Pre-Experiment Data");
  const beforeAt = n.word("cuped", "What a user did before the test");
  const predictsAt = n.word("cuped", "predicts a lot");
  const subtractAt = n.word("cuped", "So subtract the part");
  const thetaAt = n.word("cuped", "theta times");
  const pageAt = n.word("cuped-var", "On the page's five hundred users");
  const fromAt = n.word("cuped-var", "eight point oh nine");
  const toAt = n.word("cuped-var", "three point five two");
  const averageAt = n.word("cuped-var", "The average stays");
  const noiseAt = n.word("cuped-var", "Only the noise shrinks");
  const halfAt = n.word("cuped-var", "less than half the users");
  const end = n.beat("cuped-var").to;

  const xs: Scale = { lo: -2, hi: 20, a: BOX.left, b: BOX.right };
  const ys: Scale = { lo: -2, hi: 16, a: y(BOX.bottom), b: y(BOX.top) };
  const shown = ease(frame, beforeAt - 2, 20);
  const adjust = ease(frame, thetaAt + 6, 36);
  const fit = ease(frame, predictsAt, 16);
  const slope = CUPED.theta * (1 - adjust);
  const lineAt = (x: number) => CUPED.meanY + slope * (x - CUPED.meanX);
  const meanP = ease(frame, averageAt - 2, 14);
  const letterAts = [nameAt, nameAt + 10, dataAt - 6, dataAt, dataAt + 10];

  const bars = [
    { text: "variance of Y", v: CUPED.varY, at: fromAt, color: BAR, ink: BLUE_INK },
    { text: "after CUPED", v: CUPED.varAdj, at: toAt, color: OK, ink: OK_INK },
  ];
  const xb = (v: number) => COL_X + (v / VAR_MAX) * BAR_W;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={standsAt} level={-36} />
      <Sfx name="el-sprinkle" at={beforeAt} level={-38} />
      <Sfx name="el-whoosh" at={thetaAt + 6} level={-36} />
      <Sfx name="el-pop" at={toAt} level={-32} />
      <Sfx name="el-chime" at={halfAt} level={-36} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={11} at={qAt - 4} textAt={textAt - 4} size={58}>
          What is CUPED, and how does it reduce variance?
        </QuestionCard>

        <Note at={standsAt} x={BOX.left - 70} y={y(286)}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            {WORDS.map(([cap, rest], i) => (
              <span key={cap} style={{ marginRight: i === 2 ? 0 : 10 }}>
                <b style={{ color: OK_INK, opacity: 0.4 + 0.6 * ease(frame, letterAts[i], 8) }}>{cap}</b>
                {rest}
              </span>
            ))}
          </span>
        </Note>

        <Axes
          x={xs}
          y={ys}
          xTicks={[0, 5, 10, 15, 20]}
          yTicks={[0, 5, 10, 15]}
          xTitle="each user before the test"
          yTitle="the same user during it"
          at={beforeAt - 6}
        />
        <Svg opacity={shown}>
          {CUPED.points.map(([x, yv, adj], i) => (
            <circle key={i} cx={at(xs, x)} cy={at(ys, yv + (adj - yv) * adjust)} r={4.2} fill={BAR} opacity={0.5} />
          ))}
        </Svg>
        <Svg opacity={fit}>
          <line
            x1={at(xs, 0.5)}
            x2={at(xs, 19.5)}
            y1={at(ys, lineAt(0.5))}
            y2={at(ys, lineAt(19.5))}
            stroke={INK}
            strokeWidth={3}
          />
        </Svg>
        <Svg opacity={meanP}>
          <line x1={BOX.left} x2={BOX.right} y1={at(ys, CUPED.meanY)} y2={at(ys, CUPED.meanY)} stroke={OK} strokeWidth={2.4} strokeDasharray="8 6" />
        </Svg>
        <Note at={predictsAt + 4} x={at(xs, -1)} y={at(ys, 15)} out={thetaAt + 6}>
          <span style={{ ...label(21, INK), fontWeight: 700, whiteSpace: "nowrap", ...TABULAR }}>slope θ = {CUPED.theta}</span>
        </Note>

        {/* The adjustment, then what it buys. */}
        <Note at={subtractAt} x={COL_X} y={y(380)}>
          <span style={{ ...label(20, INK_SOFT), fontWeight: 700, whiteSpace: "nowrap" }}>subtract what the pre-period predicts</span>
          <div style={{ fontFamily: MONO, fontSize: 25, fontWeight: 600, color: INK, marginTop: 10, whiteSpace: "pre", fontVariantLigatures: "none" }}>
            {"Y_adj = Y − "}
            <Mark at={thetaAt}>{"θ(X − X̄)"}</Mark>
          </div>
        </Note>
        <Note at={pageAt} x={COL_X} y={y(500)}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap", ...TABULAR }}>the page&apos;s {CUPED.n} users</span>
        </Note>
        {bars.map((b, i) => {
          const p = ease(frame, b.at - 4, 14);
          if (p <= 0) return null;
          const top = y(540) + i * h(90);
          return (
            <React.Fragment key={b.text}>
              <div style={{ position: "absolute", left: COL_X, top, ...note(23, INK), fontWeight: 650, whiteSpace: "nowrap", opacity: p }}>{b.text}</div>
              <div
                style={{ position: "absolute", left: COL_X, top: top + h(34), width: (xb(b.v) - COL_X) * p, height: h(34), background: b.color, opacity: 0.85, borderRadius: 3 }}
              />
              <Note at={b.at} x={xb(b.v) + 12} y={top + h(34)}>
                <span style={{ ...note(27, b.ink), fontWeight: 700, whiteSpace: "nowrap", ...TABULAR }}>{b.v.toFixed(2)}</span>
              </Note>
            </React.Fragment>
          );
        })}
        <Note at={averageAt} x={COL_X} y={y(740)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap", ...TABULAR }}>
            average {CUPED.meanY.toFixed(2)} → {CUPED.meanAdj.toFixed(2)}, <b style={{ color: OK_INK }}>unchanged</b>
          </span>
        </Note>
        <Note at={noiseAt} x={COL_X} y={y(786)}>
          <span style={{ ...note(26, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>only the noise shrinks:</span>
        </Note>
        <Note at={halfAt - 2} x={COL_X} y={y(826)}>
          <span style={{ ...note(26, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>same power, under half the users</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
