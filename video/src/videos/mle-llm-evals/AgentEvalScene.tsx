import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, label, note, svgText, TABULAR } from "../../editorial/style";
import { I, MathRun } from "../../editorial/math";
import { ColumnRule, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { PASS_K, SOURCES } from "./data";
import {
  BAD_INK,
  Clear,
  Cross,
  DATA,
  Disc,
  Drift,
  Fade,
  GOOD_INK,
  Line,
  Mark,
  MARK_BAD,
  pct,
  POINT,
  Tag,
  X0,
} from "./parts";

const RIGHT_X = 980;
const RULE_X = 920;
/** The chart: k from 1 to 8 across, 0 to 100% up (layout units for y). */
const CH = { x0: 1060, x1: 1700, top: 400, bottom: 770 };

/**
 * Question 5. Outcomes first: three checks ticked as said, checked with
 * code. Beside them, the trajectory: what to inspect, then one run that
 * reaches the outcome through a step that should never be allowed, which an
 * outcome check alone passes. Then, on a clean page, repetition: four
 * attempts at one task (one fails), so pass@4 holds and pass^4 does not; and
 * the two curves for an attempt that succeeds 80% of the time, pass@k rising
 * in the data blue and pass^k falling in ink, ringed at k = 4 and at k = 8.
 */
export const AgentEvalScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("q5").from;
  const qAt = n.word("q5", "Question five");
  const textAt = n.word("q5", "How do you evaluate an agent");
  const outAt = n.word("q5", "Check outcomes");
  const outcomes = [
    { text: "Ticket filed", at: n.word("q5", "did the ticket get filed") },
    { text: "Tests pass", at: n.word("q5", "do the tests pass") },
    { text: "Database in the expected state", at: n.word("q5", "is the database") },
  ];
  const codeAt = n.word("q5-code", "checked with code");
  const existsAt = n.word("q5-code", "the ticket exists");

  const trajAt = n.word("q5-traj", "inspect the trajectory");
  const inspect = [
    { text: "right tool", at: n.word("q5-traj", "the right tool") },
    { text: "valid arguments", at: n.word("q5-traj", "valid arguments") },
    { text: "number of steps", at: n.word("q5-traj", "the number of steps") },
    { text: "cost", at: n.word("q5-traj", "the cost") },
  ];
  const aloneAt = n.word("q5-traj", "An outcome check alone");
  const pathAt = n.word("q5-traj", "by a path");
  const neverAt = n.word("q5-traj", "never allow");

  const repeatAt = n.word("q5-repeat", "Runs aren't deterministic");
  const eachAt = n.word("q5-repeat", "repeat each task");
  const tauAt = n.word("q5-repeat", "The authors of tau-bench");
  const atKAt = n.word("q5-repeat", "pass at k");
  const oneAt = n.word("q5-repeat", "at least one of k attempts");
  const hatKAt = n.word("q5-repeat", "pass hat k");
  const allAt = n.word("q5-repeat", "all k succeed");

  const sayAt = n.word("q5-numbers", "Say each attempt");
  const at4At = n.word("q5-numbers", "Pass at four");
  const ninetyNineAt = n.word("q5-numbers", "over ninety-nine percent");
  const hat4At = n.word("q5-numbers", "Pass hat four");
  const fortyOneAt = n.word("q5-numbers", "forty-one");

  const customerAt = n.word("q5-which", "a customer-facing agent");
  const fastAt = n.word("q5-which", "it falls fast");
  const seventeenAt = n.word("q5-which", "seventeen percent");
  const end = n.beat("q6-in").to;

  const clearAt = repeatAt - 6;
  const ry = (v: number) => y(v);

  // The chart, in screen pixels.
  const top = ry(CH.top);
  const bottom = ry(CH.bottom);
  const xk = (k: number) => CH.x0 + ((k - 1) / 7) * (CH.x1 - CH.x0);
  const yv = (v: number) => bottom + (top - bottom) * v;
  const atK = PASS_K.passAtK;
  const hatK = PASS_K.passHatK;
  const draw = ease(frame, sayAt + 6, 40);
  const pathOf = (vals: readonly number[]) => {
    const pts = vals.map((v, i) => [xk(i + 1), yv(v)] as const);
    return pts.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
  };
  const ring = (k: number, v: number, at: number) => {
    const p = ease(frame, at, 12);
    if (p <= 0) return null;
    return <circle cx={xk(k)} cy={yv(v)} r={14 + 6 * (1 - p)} fill="none" stroke={POINT} strokeWidth={4} opacity={p} />;
  };

  const attempts = [true, true, false, true];

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={outAt + 4} level={-36} />
      {outcomes.map((o) => (
        <Sfx key={o.text} name="el-tap" at={o.at + 4} level={-31} />
      ))}
      <Sfx name="el-tap" at={codeAt + 2} level={-32} />
      {inspect.map((c) => (
        <Sfx key={c.text} name="el-tap" at={c.at} level={-33} />
      ))}
      <Sfx name="el-scratch" at={neverAt + 2} level={-34} />
      <Sfx name="el-whoosh" at={clearAt} level={-37} />
      <Sfx name="el-sprinkle" at={eachAt + 2} level={-36} />
      <Sfx name="el-tap" at={atKAt} level={-31} />
      <Sfx name="el-tap" at={hatKAt} level={-31} />
      <Sfx name="el-pencil" at={sayAt + 6} level={-35} />
      <Sfx name="el-pop" at={ninetyNineAt + 2} level={-31} />
      <Sfx name="el-pop" at={fortyOneAt + 2} level={-31} />
      <Sfx name="el-tap" at={customerAt + 4} level={-31} />
      <Sfx name="el-pop" at={seventeenAt + 2} level={-30} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} size={60}>
          How do you evaluate an agent?
        </QuestionCard>

        <Clear at={clearAt}>
          {/* Outcomes, checked with code. */}
          <Line x={X0} y={y(300)} at={outAt} size={30} weight={600}>
            <Mark at={outAt + 6}>Check outcomes, not prose</Mark>
          </Line>
          {outcomes.map((o, i) => (
            <Line key={o.text} x={X0} y={y(386) + i * 58} at={o.at} size={26}>
              <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <Tick at={o.at + 6} size={26} />
                {o.text}
              </span>
            </Line>
          ))}
          <Line x={X0} y={y(386) + 3 * 58 + 40} at={codeAt} size={26} weight={600}>
            Checked with code, not a judge
          </Line>
          <Line x={X0} y={y(386) + 3 * 58 + 92} at={existsAt} size={22} color={INK_SOFT}>
            The ticket exists with the right fields, or it doesn&apos;t
          </Line>

          {/* The trajectory. */}
          <ColumnRule x={RULE_X} top={y(300)} height={y(700) - y(300)} at={trajAt} />
          <Line x={RIGHT_X} y={y(300)} at={trajAt} size={30} weight={600}>
            Then the trajectory
          </Line>
          <div style={{ position: "absolute", left: RIGHT_X, top: y(386) - 6, display: "flex", gap: 14, fontSize: 24 }}>
            {inspect.map((c) => (
              <Tag key={c.text} at={c.at - 2} size={24}>
                {c.text}
              </Tag>
            ))}
          </div>
          {["Search the docs", "Read another user's tickets", "File the ticket"].map((s, i) => {
            const bad = i === 1;
            const lit = bad ? ease(frame, neverAt, 10) : 0;
            const at = aloneAt + i * 6;
            return (
              <div
                key={s}
                style={{
                  position: "absolute",
                  left: RIGHT_X,
                  top: y(486) + i * 58,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  opacity: ease(frame, at, 10),
                }}
              >
                <Disc n={i + 1} size={38} text={22} tone={lit > 0.5 ? "red" : "gray"} />
                <span style={{ ...note(24, lit > 0.5 ? BAD_INK : INK), fontWeight: 500, whiteSpace: "nowrap" }}>{s}</span>
                {bad && lit > 0 ? <Cross at={neverAt + 2} size={22} /> : null}
              </div>
            );
          })}
          <Line x={RIGHT_X} y={y(486) + 3 * 58 + 6} at={pathAt} size={24} weight={600}>
            <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Tick at={pathAt + 4} size={24} color={INK} />
              Outcome check alone: pass
            </span>
          </Line>
          <Line x={RIGHT_X + 446} y={y(486) + 58 + 3} at={neverAt + 6} size={24} color={BAD_INK} weight={600}>
            <Mark at={neverAt + 10} color={MARK_BAD}>
              A path you&apos;d never allow
            </Mark>
          </Line>
        </Clear>

        {/* Repetition: four attempts at one task, and the two scores. */}
        <Line x={X0} y={y(300)} at={eachAt - 4} size={30} weight={600}>
          Repeat each task
        </Line>
        <div style={{ position: "absolute", left: X0, top: y(372), display: "flex", flexDirection: "column", gap: 14 }}>
          {attempts.map((ok, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 14, opacity: ease(frame, eachAt + 4 + i * 5, 8) }}>
              <span style={{ ...note(24, INK), fontWeight: 500, width: 118 }}>
                Attempt <Num>{i + 1}</Num>
              </span>
              {ok ? <Tick at={eachAt + 8 + i * 5} size={24} /> : <Cross at={eachAt + 8 + i * 5} size={22} />}
            </span>
          ))}
        </div>
        <Line x={X0} y={y(372) + 4 * 46 + 46} at={atKAt - 2} size={26}>
          <b>pass@k:</b>{" "}
          <Fade at={oneAt}>
            at least one of{" "}
            <MathRun>
              <I>k</I>
            </MathRun>{" "}
            succeeds
          </Fade>{" "}
          <span style={{ marginLeft: 10 }}>
            <Tag at={oneAt + 16} tone="green" tinted size={26}>
              pass@4: pass
            </Tag>
          </span>
        </Line>
        <Line x={X0} y={y(372) + 4 * 46 + 104} at={hatKAt - 2} size={26}>
          <b>pass^k:</b>{" "}
          <Fade at={allAt}>
            all{" "}
            <MathRun>
              <I>k</I>
            </MathRun>{" "}
            succeed
          </Fade>{" "}
          <span style={{ marginLeft: 10 }}>
            <Tag at={allAt + 12} tone="red" tinted size={26}>
              pass^4: fail
            </Tag>
          </span>
        </Line>
        <Line x={X0} y={y(372) + 4 * 46 + 162} at={tauAt + 4} size={20} color={INK_SOFT}>
          {SOURCES.tauBench}
        </Line>
        <Line x={X0} y={y(372) + 4 * 46 + 230} at={customerAt} size={28} color={GOOD_INK} weight={600}>
          <Mark at={customerAt + 8}>Customer-facing: pass^k</Mark>
        </Line>

        {/* The two curves, for an attempt that succeeds 80% of the time. */}
        <Line x={CH.x0 - 60} y={y(300) + 6} at={sayAt} size={22} color={INK_SOFT}>
          Each attempt succeeds <Num>{pct(PASS_K.attempt)}</Num>, independently
        </Line>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, tauAt, 14) }}>
          {[0, 0.5, 1].map((v) => (
            <g key={v}>
              <line x1={CH.x0 - 20} x2={CH.x1 + 20} y1={yv(v)} y2={yv(v)} stroke={INK_SOFT} strokeWidth={1} strokeDasharray="2 6" opacity={0.5} />
              <text x={CH.x0 - 34} y={yv(v) + 7} textAnchor="end" style={svgText({ ...label(20, INK_SOFT), ...TABULAR })}>
                {pct(v)}
              </text>
            </g>
          ))}
          <line x1={CH.x0 - 20} x2={CH.x1 + 20} y1={yv(0) + 0.5} y2={yv(0) + 0.5} stroke={INK} strokeWidth={1.6} />
          {PASS_K.k.map((k) => (
            <text key={k} x={xk(k)} y={yv(0) + 32} textAnchor="middle" style={svgText({ ...label(20, INK_SOFT), ...TABULAR })}>
              {k}
            </text>
          ))}
          <text x={CH.x1 + 20} y={yv(0) + 62} textAnchor="end" style={svgText({ ...label(19, INK_SOFT) })}>
            attempts, k
          </text>
          <path d={pathOf(atK)} fill="none" stroke={DATA} strokeWidth={4} strokeLinejoin="round" pathLength={1} strokeDasharray={`${draw} 1`} />
          <path d={pathOf(hatK)} fill="none" stroke={INK} strokeWidth={4} strokeLinejoin="round" pathLength={1} strokeDasharray={`${draw} 1`} />
          {PASS_K.k.map((k, i) => {
            const p = ease(frame, sayAt + 6 + (i / 7) * 40, 8);
            return (
              <g key={k} opacity={p}>
                <circle cx={xk(k)} cy={yv(atK[i])} r={6} fill={DATA} />
                <circle cx={xk(k)} cy={yv(hatK[i])} r={6} fill={INK} />
              </g>
            );
          })}
          {ring(4, atK[3], at4At + 4)}
          {ring(4, hatK[3], hat4At + 4)}
          {ring(8, hatK[7], seventeenAt + 2)}
        </svg>
        {/* The legend, at the right end of the chart's title line. */}
        <div
          style={{
            position: "absolute",
            left: 1520,
            top: y(300) + 6,
            display: "flex",
            gap: 26,
            ...label(21, INK),
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8, color: DATA, opacity: ease(frame, atKAt, 12) }}>
            <span style={{ width: 22, height: 4, background: DATA, borderRadius: 2 }} />
            pass@k
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 8, opacity: ease(frame, hatKAt, 12) }}>
            <span style={{ width: 22, height: 4, background: INK, borderRadius: 2 }} />
            pass^k
          </span>
        </div>
        <Line x={xk(4)} width={200} align="center" y={yv(atK[3]) - 54} at={ninetyNineAt + 4} size={24} weight={600}>
          <Num>{pct(atK[3], 1)}</Num>
        </Line>
        <Line x={xk(4) - 30} align="right" y={yv(hatK[3]) + 8} at={fortyOneAt + 4} size={24} weight={600}>
          <Num>{pct(hatK[3])}</Num>
        </Line>
        <Line x={xk(8) + 26} y={yv(hatK[7]) - 15} at={seventeenAt + 4} size={24} weight={600}>
          <Num>{pct(hatK[7])}</Num>
        </Line>
        <Line x={xk(5)} y={yv(0.62)} at={fastAt} size={22} color={INK_SOFT}>
          pass^k falls fast
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
