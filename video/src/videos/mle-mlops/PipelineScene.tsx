import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, INK, INK_SOFT, note, PAPER } from "../../editorial/style";
import { SANS } from "../../theme/fonts";
import { Num, OutlineBadge } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { GATE } from "./data";
import { Box, CornerLoop, Drift, Flow, Line, Mark, OK_INK, pct, Phase, Q_SIZE, Q_W, Spot, Svg, X0 } from "./parts";

/** The page's pipeline, left to right. */
const STAGES = [
  { title: "Validate data", w: 220 },
  { title: "Test transforms", w: 240 },
  { title: "Train", sub: "on versioned data", w: 210 },
  { title: "Evaluation gate", w: 240 },
  { title: "Register", sub: "and promote", w: 210 },
  { title: "Staged rollout", sub: "shadow, canary, full", w: 260 },
];
const GAP = 52;
const PIPE_TOP = 372;
const PIPE_H = 84;
const xsOf = () => {
  let x = X0;
  return STAGES.map((s) => {
    const at = x;
    x += s.w + GAP;
    return at;
  });
};
const XS = xsOf();
const TRAIN = 2;
const GATE_I = 3;
/** The bars: 0 to 100% across this width, from BAR_X. */
const BAR_X = 330;
const BAR_W = 620;
const BAR_H = 32;
const PROD = ds("blue", 300);
const CAND = ds("blue", 500);

/**
 * Questions 4 and 5: the pipeline the page draws, box by box as it is named;
 * the three things that trigger it; the gate that must be beaten on a fixed
 * holdout, stopping a regression a retrain would otherwise ship. Then what
 * "beat" has to mean: a simulated retrain on last month's data wins overall,
 * 77% to 75%, and falls from 79% to 46% on one customer in twenty, worse
 * than a coin flip. So the gate also sets a floor on every slice.
 */
export const PipelineScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q4").from;
  const qAt = n.word("q4", "Questions four and five");
  const textAt = n.word("q4", "How do you design");
  const stageAt = [
    n.word("q4", "validates the new data"),
    n.word("q4", "tests the feature transforms"),
    n.word("q4", "trains on a versioned dataset"),
    n.word("q4", "gates the result"),
    n.word("q4", "promotes it in the registry"),
    n.word("q4", "rolls it out in stages"),
  ];
  const trigAt = [n.word("q4-gate", "Code"), n.word("q4-gate", "data"), n.word("q4-gate", "a schedule")];
  const lookAt = n.word("q4-gate", "The gate looks for you");
  const beatAt = n.word("q4-gate", "must beat the production model");
  const holdoutAt = n.word("q4-gate", "a fixed holdout set");
  const failsAt = n.word("q4-gate", "or the build fails");
  const shipAt = n.word("q4-gate", "quietly ship a regression");
  const simAt = n.word("q4-slice", "Simulate a retrain");
  const oneAt = n.word("q4-slice", "one customer in twenty");
  const winsAt = n.word("q4-slice", "The candidate wins overall");
  const s77At = n.word("q4-slice", "seventy-seven percent");
  const s75At = n.word("q4-slice", "to seventy-five");
  const groupAt = n.word("q4-slice", "On that group");
  const s79At = n.word("q4-slice", "seventy-nine percent");
  const s46At = n.word("q4-slice", "to forty-six");
  const coinAt = n.word("q4-slice", "worse than a coin flip");
  const floorAt = n.word("q4-floor", "a floor on every slice");
  const totalAt = n.word("q4-floor", "not just the total");
  const end = n.beat("q4-floor").to;

  const rise = ease(frame, simAt - 12, 22);
  const top = y(PIPE_TOP) + h(96) * (1 - rise);
  const ph = h(PIPE_H);
  const mid = top + ph / 2;
  const trainX = XS[TRAIN] + STAGES[TRAIN].w / 2;
  const gateX = XS[GATE_I];
  const trigTop = top - h(86);
  const trigXs = [trainX - 110, trainX - 4, trainX + 116];
  const clearA = simAt - 6;

  const rowY = (i: number) => y(i < 2 ? 648 : 806) + (i % 2) * h(44);
  const bars = [
    { name: "production", v: GATE.incumbent.overall, at: s75At, color: PROD },
    { name: "candidate", v: GATE.candidate.overall, at: s77At, color: CAND },
    { name: "production", v: GATE.incumbent.group, at: s79At, color: PROD },
    { name: "candidate", v: GATE.candidate.group, at: s46At, color: ACCENT },
  ];
  const coinX = BAR_X + BAR_W * 0.5;
  const stop = ease(frame, floorAt + 6, 12);

  return (
    <AbsoluteFill>
      {stageAt.map((at, i) => (
        <Sfx key={i} name="el-tap" at={at} level={-32} />
      ))}
      {trigAt.map((at, i) => (
        <Sfx key={i} name="el-tap" at={at} level={-33} />
      ))}
      <Sfx name="el-pencil" at={lookAt} level={-35} />
      <Sfx name="el-scratch" at={shipAt + 14} level={-34} />
      {bars.map((b, i) => (
        <Sfx key={i} name="el-pop" at={b.at} level={-33} />
      ))}
      <Sfx name="el-pop" at={coinAt} level={-30} />
      <Sfx name="el-tap" at={floorAt} level={-29} />
      <Sfx name="el-chime" at={totalAt + 20} level={-33} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={4} kicker="Questions 4 and 5" at={qAt - 4} textAt={textAt - 4} size={Q_SIZE} width={Q_W}>
          How do you design a CI/CD pipeline for ML? And what is an evaluation gate, and why is it essential?
        </QuestionCard>
        <CornerLoop at={qAt} lit="gate" />

        {/* ── The pipeline, box by box ── */}
        {STAGES.map((s, i) => (
          <Box
            key={s.title}
            x={XS[i]}
            y={top}
            w={s.w}
            h={ph}
            at={stageAt[i] - 2}
            title={s.title}
            sub={s.sub}
            size={23}
            lit={i === GATE_I ? lookAt : undefined}
          />
        ))}
        {/* The arrow into the gate gives way to the stopped regression while
            it is on the page. */}
        {STAGES.slice(1).map((_, i) => (
          <Flow
            key={i}
            points={[[XS[i] + STAGES[i].w + 4, mid], [XS[i + 1] - 3, mid]]}
            at={stageAt[i + 1] - 4}
            dur={10}
            head={12}
            opacity={i === TRAIN ? 1 - ease(frame, shipAt + 6, 6) * (1 - ease(frame, clearA, 12)) : 1}
          />
        ))}

        {/* ── What triggers it, and what the gate checks ── */}
        <Phase from={trigAt[0] - 4} to={clearA}>
          {["code", "data", "schedule"].map((t, i) => (
            <React.Fragment key={t}>
              <div style={{ position: "absolute", left: trigXs[i] - 60, top: trigTop, width: 120, display: "flex", justifyContent: "center", opacity: ease(frame, trigAt[i] - 2, 10) }}>
                <OutlineBadge size={21} style={{ fontFamily: SANS }}>
                  {t}
                </OutlineBadge>
              </div>
              <Flow points={[[trigXs[i], trigTop + 40], [trainX + (i - 1) * 64, top - 3]]} at={trigAt[i] + 2} dur={10} head={11} width={2} />
            </React.Fragment>
          ))}
          {/* A retrain's regression, stopped at the gate. */}
          <Flow points={[[XS[TRAIN] + STAGES[TRAIN].w + 4, mid], [gateX - 12, mid]]} at={shipAt + 8} dur={10} color={ACCENT} head={0} width={3.4} />
          <Svg opacity={ease(frame, shipAt + 16, 6)}>
            <line x1={gateX - 10} x2={gateX - 10} y1={mid - 14} y2={mid + 14} stroke={ACCENT} strokeWidth={4} strokeLinecap="round" />
          </Svg>
          <Line at={shipAt + 4} x={XS[TRAIN] + 6} y={top + ph + h(28)} size={22} color={ACCENT_INK}>
            a regression, stopped
          </Line>
        </Phase>
        <Line at={beatAt - 2} x={gateX + 4} y={top + ph + h(28)} size={22} color={INK}>
          Must beat production
        </Line>
        <Line at={holdoutAt - 2} x={gateX + 4} y={top + ph + h(28) + 32} size={22} color={INK}>
          on a fixed holdout set
        </Line>
        <Line at={failsAt - 2} x={gateX + 4} y={top + ph + h(28) + 64} size={22} color={INK_SOFT}>
          or the build fails
        </Line>
        <Line at={floorAt - 2} x={gateX + 4} y={top + ph + h(28) + 104} size={22} color={OK_INK}>
          <Mark at={floorAt + 4}>and a floor on every slice</Mark>
        </Line>

        {/* ── What "beat" means: a simulated retrain, overall and on one group ── */}
        <Phase from={clearA}>
          <Line at={simAt} x={X0} y={y(551)} size={22} color={INK_SOFT}>
            Simulation: retrained on last month, <Num>{GATE.groupRowsMonth}</Num> of its <Num>{GATE.trainMonth.toLocaleString("en-US")}</Num> rows from the group
          </Line>
          <Line at={winsAt - 4} x={X0} y={rowY(0) - h(44)} size={22} color={INK}>
            Overall
          </Line>
          <Line at={groupAt - 4} x={X0} y={rowY(2) - h(44)} size={22} color={INK}>
            One group: <Mark at={oneAt}>1 customer in 20</Mark>
          </Line>
          {bars.map((b, i) => {
            const p = ease(frame, b.at - 2, 16);
            if (p <= 0) return null;
            return (
              <div key={i} style={{ position: "absolute", left: X0, top: rowY(i), height: BAR_H, display: "flex", alignItems: "center", opacity: Math.min(1, p * 3) }}>
                <span style={{ ...note(21, INK_SOFT), width: BAR_X - X0 - 16, textAlign: "right", marginRight: 16, whiteSpace: "nowrap" }}>{b.name}</span>
                {/* The group's 46% sits inside its bar, in the page's white:
                    beside it, the coin flip's line would run through it. */}
                <span style={{ width: BAR_W * b.v * p, height: BAR_H, background: b.color, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "flex-end", boxSizing: "border-box", paddingRight: 12 }}>
                  {i === 3 ? (
                    <span style={{ ...note(23, PAPER), fontWeight: 500, whiteSpace: "nowrap", opacity: ease(frame, b.at + 8, 8) }}>
                      <Num>{pct(b.v)}</Num>
                    </span>
                  ) : null}
                </span>
                {i !== 3 ? (
                  <span style={{ ...note(23, BLUE_INK), fontWeight: 500, marginLeft: 14, whiteSpace: "nowrap", opacity: ease(frame, b.at + 8, 8) }}>
                    <Num>{pct(b.v)}</Num>
                  </span>
                ) : null}
                {i === 1 ? (
                  <span style={{ marginLeft: 14, position: "relative", width: 26, height: 26, display: "inline-block" }}>
                    <span style={{ position: "absolute", inset: 0, opacity: 1 - stop }}>
                      <Tick at={winsAt + 14} size={26} />
                    </span>
                    {stop > 0 ? (
                      <svg width={26} height={26} viewBox="0 0 24 24" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
                        <path d="M5 5 L19 19 M19 5 L5 19" stroke={ACCENT} strokeWidth={3.2} strokeLinecap="round" pathLength={1} strokeDasharray={`${stop} 1`} fill="none" />
                      </svg>
                    ) : null}
                  </span>
                ) : null}
                {i === 1 ? (
                  <span style={{ ...note(21, stop > 0.5 ? ACCENT_INK : OK_INK), marginLeft: 10, whiteSpace: "nowrap", opacity: ease(frame, winsAt + 18, 10) }}>
                    {stop > 0.5 ? "stopped by the floor" : "passes the gate"}
                  </span>
                ) : null}
              </div>
            );
          })}
          {/* A coin flip scores about half on the group, whose labels are half and half. */}
          <Svg opacity={ease(frame, coinAt, 12)}>
            <line x1={coinX} x2={coinX} y1={rowY(2) - h(10)} y2={rowY(3) + BAR_H + h(10)} stroke={INK} strokeWidth={2} strokeDasharray="6 6" />
          </Svg>
          <Line at={coinAt} x={coinX} width={200} align="center" y={rowY(2) - h(46)} size={21} color={INK}>
            coin flip
          </Line>
        </Phase>
      </Drift>

      <Spot id="coin" at={coinAt} x={1310} y={y(700)} w={180} />
    </AbsoluteFill>
  );
};

