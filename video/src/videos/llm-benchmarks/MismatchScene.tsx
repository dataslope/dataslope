import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { A, A_INK, Arrow, B, Check, Cross, Drift, Headline, Marked, OK, OK_INK, Spot, Svg, Tag, TRAP, TRAP_INK, X0 } from "./parts";

const SRC = { x: X0, y: 420, w: 420 };
const DST_X = 720;
const DST = { coding: 372, invoices: 486 };
const BOARD_Y = 622;
const BOARD_STEP = 52;
const Q_Y = [404, 514, 624, 734];

/**
 * Pitfall four, construct mismatch (Fig. 8): SWE-bench's task carries over
 * to agentic coding and not to reading invoices, and a model third on every
 * leaderboard can still be the best for your task. Then the part's four
 * questions for any row of a launch table (Fig. 9), the last one marked as
 * the one only your own test answers.
 */
export const MismatchScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("mismatch").from;
  const constructAt = n.word("mismatch", "construct mismatch");
  const measuresAt = n.word("mismatch", "measures");
  const theBenchmarkAt = n.word("mismatch", "the benchmark");
  const sweAt = n.word("transfer", "SWE-bench");
  const codingAt = n.word("transfer", "agentic coding");
  const jobAt = n.word("transfer", "job");
  const nothingAt = n.word("transfer", "almost nothing");
  const invoicesAt = n.word("transfer", "invoices");
  const thirdAt = n.word("third", "third");
  const bestAt = n.word("third", "best");
  const leaderboardAt = n.word("third", "leaderboard");
  const askAt = n.word("checklist", "Ask");
  const qAt = [
    n.word("checklist", "three points"),
    n.word("checklist", "seen"),
    n.word("checklist", "harness"),
    n.word("checklist", "task"),
  ];
  const lastAt = n.word("own-in", "last answer");
  const noAt = n.word("own-in", "no");
  const findAt = n.word("own-in", "find out");

  const out8 = askAt - 8;
  const boardDim = ease(frame, leaderboardAt, 14) * 0.5;
  const questions = [
    { q: "All within three points?", tag: "saturation" },
    { q: "Could the model have seen it?", tag: "contamination" },
    { q: "Whose harness ran it?", tag: "selective reporting" },
    { q: "Does the task look like yours?", tag: "construct mismatch" },
  ];

  return (
    <AbsoluteFill>
      {/* ── Sound: the spot, the two arrows, the rank, the four questions ── */}
      <Sfx name="el-pop" at={measuresAt - 6} level={-30} />
      <Sfx name="el-pencil" at={codingAt - 4} level={-34} />
      <Sfx name="el-scratch" at={invoicesAt + 4} level={-34} />
      <Sfx name="el-tap" at={bestAt} level={-27} />
      {qAt.map((at, i) => (
        <Sfx key={i} name="el-tap" at={at - 2} level={-28} />
      ))}

      <Headline at={from - 6} second={measuresAt - 8} italic="A benchmark measures the benchmark." size={56}>
        Four, construct mismatch.
      </Headline>
      <Spot id="llm-benchmarks-sorter" at={theBenchmarkAt - 4} left={1390} top={y(330)} width={420} height={280} />

      <Drift from={from} to={askAt} amount={0.014} origin="30% 50%">
        <FigLabel n="8" title="Does the score carry over?" at={constructAt - 2} out={out8} x={X0} y={y(296)} />
        {/* SWE-bench's task, and where it does and doesn't carry. */}
        <Tag at={sweAt - 4} out={out8} x={SRC.x} y={y(SRC.y) - 24} width={SRC.w}>
          SWE-bench: fix a GitHub issue
        </Tag>
        <Tag at={codingAt - 2} out={out8} x={DST_X} y={y(DST.coding) - 24} color={OK}>
          <span style={{ color: OK_INK }}>agentic coding</span>
        </Tag>
        <Tag at={invoicesAt - 4} out={out8} x={DST_X} y={y(DST.invoices) - 24} color={TRAP} dashed>
          <span style={{ color: TRAP_INK }}>reading your invoices</span>
        </Tag>
        <Arrow from={[SRC.x + SRC.w + 10, y(SRC.y) - 6]} to={[DST_X - 12, y(DST.coding)]} at={codingAt - 6} out={out8} color={OK} />
        <Arrow from={[SRC.x + SRC.w + 10, y(SRC.y) + 6]} to={[DST_X - 12, y(DST.invoices)]} at={nothingAt - 4} out={out8} color={TRAP} dash="7 6" />
        <Svg opacity={1 - ease(frame, out8, 10)}>
          <Check x={DST_X + 236} y={y(DST.coding)} at={jobAt - 2} size={24} />
          <Cross x={DST_X + 300} y={y(DST.invoices)} at={invoicesAt + 6} size={20} />
        </Svg>

        {/* Third on every leaderboard. */}
        <Ink at={thirdAt - 8} dur={12} out={out8} style={{ left: X0, top: y(BOARD_Y) - 46, whiteSpace: "nowrap" }}>
          <span style={label(22, INK_SOFT)}>every public leaderboard</span>
        </Ink>
        {[0, 1, 2].map((k) => {
          const ry = y(BOARD_Y) + k * BOARD_STEP;
          const mine = k === 2;
          return (
            <React.Fragment key={k}>
              <Ink at={thirdAt - 6 + k * 3} dur={10} out={out8} style={{ left: X0, top: ry, whiteSpace: "nowrap", opacity: 1 - (mine ? 0 : boardDim) }}>
                <span style={{ ...label(24, mine ? A_INK : INK_SOFT), fontWeight: 700 }}>{["1st", "2nd", "3rd"][k]}</span>
              </Ink>
              <Svg opacity={ease(frame, thirdAt - 4 + k * 3, 12) * (1 - ease(frame, out8, 10)) * (1 - (mine ? 0 : boardDim))}>
                <rect x={X0 + 80} y={ry + 4} width={[420, 390, 370][k]} height={26} rx={3} fill={mine ? A : B} />
              </Svg>
            </React.Fragment>
          );
        })}
        <Tag at={bestAt - 2} out={out8} x={X0 + 500} y={y(BOARD_Y) + 2 * BOARD_STEP - 6} color={OK}>
          <span style={{ color: OK_INK }}>can still be the best for your task</span>
        </Tag>
      </Drift>

      {/* ── Fig. 9: the four questions for any row ── */}
      <FigLabel n="9" title="Four questions for any row of a launch table" at={askAt - 2} x={X0} y={y(296)} />
      {questions.map((q, i) => {
        const at = qAt[i] - 8;
        const ry = y(Q_Y[i]);
        const last = i === 3;
        return (
          <React.Fragment key={q.q}>
            <Ink at={at} dur={12} style={{ left: X0, top: ry - 20, whiteSpace: "nowrap" }}>
              <span style={{ ...label(32, A_INK), fontWeight: 700, display: "inline-block", width: 48 }}>{i + 1}</span>
              <span style={{ ...body(40), color: INK }}>{last ? <Marked at={lastAt - 2}>{q.q}</Marked> : q.q}</span>
            </Ink>
            <Ink at={at + 8} dur={12} style={{ left: 780, top: ry - 10, whiteSpace: "nowrap" }}>
              <span style={{ ...note(22, INK_SOFT) }}>{q.tag}</span>
            </Ink>
          </React.Fragment>
        );
      })}
      {/* "If the last answer is no": only your own test can answer it. */}
      <Ink at={noAt - 2} dur={12} style={{ left: 1010, top: y(Q_Y[3]) - 22, whiteSpace: "nowrap" }}>
        <span style={{ ...body(40, true), color: TRAP_INK }}>No?</span>
      </Ink>
      <Arrow from={[1100, y(Q_Y[3]) + 2]} to={[1210, y(Q_Y[3]) + 2]} at={findAt - 6} dur={12} color={INK} />
      <Ink at={findAt - 2} dur={14} style={{ left: 1230, top: y(Q_Y[3]) - 18, whiteSpace: "nowrap" }}>
        <span style={{ ...label(26, INK), fontWeight: 700, padding: "4px 12px", background: PAPER }}>find out yourself</span>
      </Ink>
    </AbsoluteFill>
  );
};
