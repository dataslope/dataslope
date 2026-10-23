import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Chip, Clear, DATA, Drift, madeUp, OK_INK, Strike, Svg, X0 } from "./parts";

const TREE_X = 640;
const ROW_LABEL_W = 210;
const ROWS = { job: 330, primary: 430, secondary: 530, guard: 630, not: 740 };
const RECIPES = ["lemon pasta", "chickpea curry", "banana bread", "miso soup"];

/** A bookmark, the "saved" mark, drawn at (x, y). */
const Bookmark: React.FC<{ x: number; y: number; size: number; color: string }> = ({ x, y, size, color }) => (
  <path d={`M ${x} ${y} h ${size * 0.7} v ${size} l ${-size * 0.35} ${-size * 0.28} l ${-size * 0.35} ${size * 0.28} Z`} fill={color} />
);

/**
 * Question 5. A "Save for later" button on the left, with the made-up app's
 * saved recipes under it, ticked as they are opened again. On the right, the
 * metrics as a tree from the button's job: the primary metric in green, the
 * secondary ones that explain it, the guardrails, and the click count struck
 * through, because it measures the interaction, not the value.
 */
export const SaveScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("save").from;
  const qAt = n.word("save", "Question");
  const textAt = n.word("save", "How would you define");
  const jobAt = n.word("save-tree", "Start from the job it does");
  const backAt = n.word("save-tree", "bring people back");
  const primaryAt = n.word("save-tree", "the primary metric is");
  const weekAt = n.word("save-tree", "opened again within a week");
  const secondaryAt = n.word("save-tree", "Save rate and saves per user");
  const whyAt = n.word("save-tree", "explain why it moved");
  const guardsAt = n.word("save-tree", "Guardrails catch it stealing");
  const cookAt = n.word("save-tree", "cooking sessions");
  const loadAt = n.word("save-tree", "load time");
  const dontAt = n.word("save-not", "What you don't pick");
  const clicksAt = n.word("save-not", "clicks on the button");
  const interactionAt = n.word("save-not", "That measures the interaction");
  const valueAt = n.word("save-not", "not the value");
  const loopAt = n.word("drop-in", "almost every loop");
  const includesAt = n.word("drop-in", "includes");
  const end = n.beat("drop-in").to;

  const btn = ease(frame, textAt + 4, 14);
  const press = Math.max(0, Math.sin(Math.min(1, Math.max(0, (frame - backAt) / 10)) * Math.PI));
  const tree = ease(frame, jobAt, 20);
  const rowLabel = (text: string, at: number, color: string, top: number) => (
    <Note at={at} x={TREE_X} y={top + h(10)}>
      <span style={{ ...label(20, color), fontWeight: 750, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{text}</span>
    </Note>
  );

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={textAt + 6} level={-34} />
      <Sfx name="el-tap" at={backAt + 2} level={-32} />
      <Sfx name="el-pencil" at={primaryAt} level={-34} />
      <Sfx name="el-tap" at={secondaryAt} level={-36} />
      <Sfx name="el-tap" at={guardsAt} level={-36} />
      <Sfx name="el-scratch" at={clicksAt + 4} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} size={60}>
          How would you define success metrics for a “Save for later” button?
        </QuestionCard>

        <Clear at={includesAt}>
          {/* The button, and what it saves. */}
          <div
            style={{
              position: "absolute",
              left: X0,
              top: y(ROWS.job),
              width: 360,
              height: h(76),
              boxSizing: "border-box",
              borderRadius: 38,
              background: DATA,
              display: "flex",
              alignItems: "center",
              gap: 16,
              paddingLeft: 30,
              opacity: btn,
              transform: `scale(${(0.9 + 0.1 * btn) * (1 - 0.05 * press)})`,
              transformOrigin: "50% 50%",
            }}
          >
            <svg width={26} height={34} style={{ overflow: "visible" }}>
              <Bookmark x={0} y={0} size={32} color={PAPER} />
            </svg>
            <span style={{ ...note(30, PAPER), fontWeight: 700, whiteSpace: "nowrap" }}>Save for later</span>
          </div>
          {RECIPES.map((r, i) => {
            const top = y(ROWS.job) + h(110) + i * h(64);
            const opened = i === 0 || i === 2;
            return (
              <Note key={r} at={backAt + 4 + i * 3} x={X0} y={top}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, width: 360 }}>
                  <svg width={22} height={28} style={{ overflow: "visible", flex: "0 0 22px" }}>
                    <Bookmark x={0} y={0} size={26} color={DATA} />
                  </svg>
                  <span style={{ ...note(26, INK), whiteSpace: "nowrap", flex: 1 }}>{r}</span>
                  {opened ? <Tick at={weekAt + 6 + i * 4} size={28} /> : <span style={{ width: 28 }} />}
                </div>
              </Note>
            );
          })}
          <Note at={weekAt + 14} x={X0} y={y(ROWS.job) + h(110) + 4 * h(64) + h(6)}>
            <span style={{ ...label(21, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>opened again within a week</span>
          </Note>
          <Note at={backAt + 4} x={X0} y={y(ROWS.not) + h(70)}>
            <span style={madeUp()}>recipes made up for this video</span>
          </Note>

          {/* The tree, from the button's job. */}
          <Svg opacity={tree}>
            <line x1={TREE_X - 30} x2={TREE_X - 30} y1={y(ROWS.job) + 20} y2={y(ROWS.job) + 20 + (y(ROWS.not) - y(ROWS.job) + 10) * tree} stroke={INK_SOFT} strokeWidth={2} />
            {[ROWS.primary, ROWS.secondary, ROWS.guard, ROWS.not].map((r, i) => (
              <line key={r} x1={TREE_X - 30} x2={TREE_X - 8} y1={y(r) + 30} y2={y(r) + 30} stroke={INK_SOFT} strokeWidth={2} opacity={ease(frame, [primaryAt, secondaryAt, guardsAt, dontAt][i] - 4, 8)} />
            ))}
          </Svg>
          <Note at={jobAt} x={TREE_X} y={y(ROWS.job) + h(6)}>
            <span style={{ ...note(30, INK), whiteSpace: "nowrap" }}>
              <b>the job:</b> <span style={{ opacity: ease(frame, backAt, 12) }}>bring people back to cook what they saved</span>
            </span>
          </Note>

          {rowLabel("PRIMARY", primaryAt - 2, OK_INK, y(ROWS.primary))}
          <Chip x={TREE_X + ROW_LABEL_W} y={y(ROWS.primary)} at={primaryAt + 4} ink={OK_INK} size={28} lit={loopAt}>
            share of saved recipes opened again within a week
          </Chip>

          {rowLabel("SECONDARY", secondaryAt - 2, INK_SOFT, y(ROWS.secondary))}
          <Chip x={TREE_X + ROW_LABEL_W} y={y(ROWS.secondary)} at={secondaryAt} size={26}>
            save rate
          </Chip>
          <Chip x={TREE_X + ROW_LABEL_W + 190} y={y(ROWS.secondary)} at={secondaryAt + 6} size={26}>
            saves per user
          </Chip>
          <Note at={whyAt} x={TREE_X + ROW_LABEL_W + 440} y={y(ROWS.secondary) + h(10)}>
            <span style={{ ...note(25, INK_SOFT), whiteSpace: "nowrap" }}>explain why it moved</span>
          </Note>

          {rowLabel("GUARDRAILS", guardsAt - 2, INK_SOFT, y(ROWS.guard))}
          <Chip x={TREE_X + ROW_LABEL_W} y={y(ROWS.guard)} at={cookAt - 2} size={26}>
            cooking sessions
          </Chip>
          <Chip x={TREE_X + ROW_LABEL_W + 270} y={y(ROWS.guard)} at={loadAt - 2} size={26}>
            load time
          </Chip>
          <Note at={guardsAt + 4} x={TREE_X + ROW_LABEL_W + 470} y={y(ROWS.guard) + h(10)}>
            <span style={{ ...note(25, INK_SOFT), whiteSpace: "nowrap" }}>catch it stealing from the main flow</span>
          </Note>

          {rowLabel("NOT", dontAt, ACCENT_INK, y(ROWS.not))}
          <Note at={clicksAt - 2} x={TREE_X + ROW_LABEL_W} y={y(ROWS.not)}>
            <div
              style={{
                padding: "8px 16px",
                border: `2.2px solid ${ACCENT}`,
                borderRadius: 10,
                ...note(26, ACCENT_INK),
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              <Strike at={clicksAt + 6}>clicks on the button</Strike>
            </div>
          </Note>
          <Note at={interactionAt} x={TREE_X + ROW_LABEL_W + 330} y={y(ROWS.not) + h(10)}>
            <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
              the interaction, <span style={{ color: OK_INK, fontWeight: 650, opacity: ease(frame, valueAt, 10) }}>not the value</span>
            </span>
          </Note>
        </Clear>
      </Drift>
    </AbsoluteFill>
  );
};
