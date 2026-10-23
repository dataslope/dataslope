import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BAD, Chip, DATA, DATA_LIGHT, Drift, Mark, MARK_BAD, OK, OK_INK, X0 } from "./parts";

const COL = [X0, 1000];
const ROW = [330, 610];
const PANEL_W = 800;

/** A panel's numbered title. */
const Title: React.FC<{ n: number; x: number; y: number; at: number; children: React.ReactNode }> = ({ n, x, y, at, children }) => (
  <Note at={at} x={x} y={y}>
    <span style={{ ...note(29, INK), fontWeight: 700, whiteSpace: "nowrap" }}>
      <span style={{ ...label(22, ACCENT_INK), fontWeight: 700, marginRight: 14 }}>{n}</span>
      {children}
    </span>
  </Note>
);

/** A rounded tag on the page: a session, an arm, an output. */
const Tag: React.FC<{ x: number; y: number; w: number; at: number; color: string; fill?: number; children?: React.ReactNode }> = ({
  x,
  y,
  w,
  at: from,
  color,
  fill = 14,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 12);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w * (0.5 + 0.5 * p),
        height: 46,
        borderRadius: 10,
        border: `2px solid ${color}`,
        background: `color-mix(in srgb, ${color} ${fill}%, ${PAPER})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...label(19, INK),
        fontWeight: 700,
        whiteSpace: "nowrap",
        overflow: "hidden",
        opacity: p,
      }}
    >
      {children}
    </div>
  );
};

/**
 * Question 5. The usual A/B machinery with four adjustments, one panel each,
 * each drawn as a mechanism: one user's sessions all landing in the same arm;
 * one input fanning out into outputs of different lengths; a test whose model
 * is updated under the same name halfway through, with the version logged on
 * every request; and the guardrails, ending on the warning that better but
 * twice as slow can still lose.
 */
export const AbScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("ab").from;
  const qAt = n.word("ab", "Question");
  const textAt = n.word("ab", "How do you A B test");
  const fourAt = n.word("ab", "four adjustments");
  const userAt = n.word("ab", "Randomize by user");
  const stickyAt = n.word("ab", "keep it sticky across sessions");
  const bothAt = n.word("ab", "nobody sees both arms");
  const varianceAt = n.word("ab", "Expect more variance");
  const outputsAt = n.word("ab", "different outputs");
  const distAt = n.word("ab", "the treatment is a distribution");
  const sizeAt = n.word("ab", "Size the test");
  const aaAt = n.word("ab", "both arms identical");
  const pilotAt = n.word("ab", "from a pilot");
  const pinAt = n.word("ab-pin", "Pin the model version");
  const updateAt = n.word("ab-pin", "update a model under the same name");
  const halfAt = n.word("ab-pin", "the treatment changes halfway through");
  const logAt = n.word("ab-pin", "Log the version on every request");
  const guardAt = n.word("ab-pin", "add guardrails");
  const guards = [
    { text: "latency, p95", at: n.word("ab-pin", "latency at the ninety-fifth percentile"), w: 0 },
    { text: "cost per active user", at: n.word("ab-pin", "cost per active user"), w: 1 },
    { text: "refusals", at: n.word("ab-pin", "refusals"), w: 2 },
    { text: "hand-offs to a human", at: n.word("ab-pin", "hand-offs to a human"), w: 3 },
  ];
  const slowAt = n.word("ab-pin", "Better but twice as slow");
  const lossAt = n.word("ab-pin", "can still be a loss");
  const nextAt = n.word("prev-in", "the model as the measuring tool");
  const end = n.beat("prev-in").to;

  // Panel 3's timeline: a test from start to end, the model updated midway.
  const TL = { x0: COL[0] + 40, x1: COL[0] + 700, y: y(ROW[1]) + 132 };
  const run = ease(frame, pinAt, 30);
  const mid = (TL.x0 + TL.x1) / 2;
  const changed = ease(frame, updateAt + 6, 12);
  const ticks = Array.from({ length: 12 }, (_, i) => TL.x0 + 20 + (i * (TL.x1 - TL.x0 - 40)) / 11);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={userAt} level={-34} />
      <Sfx name="el-tap" at={varianceAt} level={-34} />
      <Sfx name="el-sprinkle" at={outputsAt} level={-36} />
      <Sfx name="el-tap" at={pinAt} level={-34} />
      <Sfx name="el-scratch" at={updateAt + 8} level={-32} />
      <Sfx name="el-pencil" at={logAt + 4} level={-36} />
      {guards.map((g) => (
        <Sfx key={g.text} name="el-pop" at={g.at} level={-36} />
      ))}

      <Drift from={from} to={end + 40}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} size={60}>
          How do you A/B test an LLM feature?
        </QuestionCard>
        <Note at={fourAt - 4} x={X0} y={y(250)}>
          <span style={{ ...note(26, INK_SOFT), whiteSpace: "nowrap" }}>
            the usual machinery, with <Mark at={fourAt + 4}>four adjustments</Mark>
          </span>
        </Note>

        {/* 1. Sticky by user. */}
        <Title n={1} x={COL[0]} y={y(ROW[0])} at={userAt - 2}>
          randomize by user, and keep it sticky
        </Title>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, userAt, 12) }}>
          <circle cx={COL[0] + 40} cy={y(ROW[0]) + 92} r={18} fill={INK} />
          <path d={`M ${COL[0] + 22} ${y(ROW[0]) + 140} Q ${COL[0] + 40} ${y(ROW[0]) + 104} ${COL[0] + 58} ${y(ROW[0]) + 140} Z`} fill={INK} />
        </svg>
        {[0, 1, 2].map((k) => (
          <Tag key={k} x={COL[0] + 110 + k * 170} y={y(ROW[0]) + 94} w={150} at={stickyAt + k * 4} color={OK}>
            session {k + 1}: B
          </Tag>
        ))}
        <Note at={bothAt} x={COL[0] + 110} y={y(ROW[0]) + 160}>
          <span style={{ ...note(24, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>nobody sees both arms</span>
        </Note>

        {/* 2. More variance. */}
        <Title n={2} x={COL[1]} y={y(ROW[0])} at={varianceAt - 2}>
          expect more variance
        </Title>
        <Tag x={COL[1]} y={y(ROW[0]) + 94} w={160} at={varianceAt + 2} color={BLUE_INK}>
          same input
        </Tag>
        {[260, 150, 330].map((w, k) => (
          <Tag key={k} x={COL[1] + 210} y={y(ROW[0]) + 64 + k * 54} w={w} at={outputsAt + k * 4} color={DATA} fill={22}>
            output {k + 1}
          </Tag>
        ))}
        <Note at={distAt} x={COL[1] + 560} y={y(ROW[0]) + 106}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <Mark at={distAt + 6}>
              the treatment is
              <br />a distribution
            </Mark>
          </span>
        </Note>
        <Note at={sizeAt} x={COL[1]} y={y(ROW[0]) + 236}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            size it from an A/A test
            <span style={{ opacity: ease(frame, aaAt - 2, 10) }}> (both arms identical)</span>
            <span style={{ opacity: ease(frame, pilotAt - 2, 10) }}>, or a pilot</span>
          </span>
        </Note>

        {/* 3. Pin the version. */}
        <Title n={3} x={COL[0]} y={y(ROW[1])} at={pinAt - 2}>
          pin the model version
        </Title>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <line x1={TL.x0} x2={TL.x0 + (TL.x1 - TL.x0) * run} y1={TL.y} y2={TL.y} stroke={INK} strokeWidth={2} />
          {run > 0 ? (
            <rect x={TL.x0} y={TL.y - 22} width={(mid - TL.x0) * Math.min(1, run * 2)} height={16} rx={4} fill={DATA_LIGHT} />
          ) : null}
          {changed > 0 ? (
            <>
              <rect x={mid} y={TL.y - 22} width={(TL.x1 - mid) * changed} height={16} rx={4} fill={BAD} opacity={0.75} />
              <line x1={mid} x2={mid} y1={TL.y - 40} y2={TL.y + 14} stroke={ACCENT} strokeWidth={3} strokeDasharray="5 5" opacity={changed} />
            </>
          ) : null}
          {ticks.map((tx, i) => {
            const p = ease(frame, logAt + i * 1.5, 8);
            if (p <= 0) return null;
            return <circle key={i} cx={tx} cy={TL.y + 30} r={8 * p} fill={tx < mid ? DATA : BAD} />;
          })}
        </svg>
        <Note at={pinAt + 4} x={TL.x0} y={TL.y - 70}>
          <span style={{ ...label(19, INK_SOFT), whiteSpace: "nowrap" }}>the test, start to finish, one model name</span>
        </Note>
        <Note at={updateAt + 6} x={mid + 12} y={TL.y - 44} from="right">
          <span style={{ ...label(19, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>updated under the same name</span>
        </Note>
        <Note at={halfAt} x={TL.x0} y={TL.y + 50}>
          <span style={{ ...note(22, ACCENT_INK), whiteSpace: "nowrap" }}>the treatment changes halfway through</span>
        </Note>
        <Note at={logAt + 6} x={TL.x0} y={TL.y + 86}>
          <span style={{ ...note(22, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            <Mark at={logAt + 10}>log the version on every request</Mark>
          </span>
        </Note>

        {/* 4. Guardrails. */}
        <Title n={4} x={COL[1]} y={y(ROW[1])} at={guardAt - 2}>
          add guardrails
        </Title>
        {guards.map((g) => (
          <Chip key={g.text} x={COL[1] + (g.w % 2) * 330} y={y(ROW[1]) + 70 + Math.floor(g.w / 2) * 64} at={g.at - 2} size={23} ink={BLUE_INK}>
            {g.text}
          </Chip>
        ))}
        <Note at={slowAt} x={COL[1]} y={y(ROW[1]) + 210}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            better but twice as slow{" "}
            <span style={{ opacity: ease(frame, lossAt - 2, 10) }}>
              <Mark at={lossAt + 4} color={MARK_BAD}>
                can still be a loss
              </Mark>
            </span>
          </span>
        </Note>

        <Note at={nextAt - 4} x={COL[1]} y={y(ROW[1]) + 266}>
          <span style={{ ...note(22, INK_SOFT), fontStyle: "italic", whiteSpace: "nowrap", maxWidth: PANEL_W }}>
            next: the model as the measuring tool
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
