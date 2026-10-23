import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { HAIRLINE, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CONTAMINATION } from "./data";
import { A_INK, Arrow, Drift, Headline, Marked, OK, OK_INK, pulse, Spot, Strike, Svg, Tag, TRAP, TRAP_INK, X0 } from "./parts";

const PIPE_Y = 356;
const PIPE = [
  { text: "test questions", x: X0, w: 220 },
  { text: "published", x: X0 + 290, w: 170 },
  { text: "crawled", x: X0 + 530, w: 150 },
  { text: "training data", x: X0 + 750, w: 210 },
];
const TABLE_Y = 470;
const RESULT_X = 640;
const ROW_STEP = 62;
/** Where the table's rules stop, short of the bracket beside it. */
const RULE_X1 = 790;

/**
 * Pitfall two, contamination (Fig. 6): how a test reaches the training data,
 * then benchmark-pitfalls' own table, cut to its first two rows, where a model
 * that memorized the answers and one that can do the work report the same
 * high score. SWE-bench Verified is struck as the case that proved it, and
 * the defense closes the scene: a test the model can't have seen.
 */
export const ContaminationScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("contam").from;
  const testAt = n.word("contam", "Test questions");
  const publishedAt = n.word("contam", "published", { nth: 1 });
  const crawledAt = n.word("contam", "crawled", { nth: 2 });
  const trainingAt = n.word("contam", "training data");
  const memorizedAt = n.word("memory", "memorized");
  const workAt = n.word("memory", "do the work");
  const sameAt = n.word("memory", "same high score");
  const sankAt = n.word("swe-drop", "sank");
  const sweAt = n.word("swe-drop", "SWE-bench Verified");
  const februaryAt = n.word("swe-drop", "February");
  const reciteAt = n.word("swe-drop", "recite");
  const defenseAt = n.word("defense", "defense");
  const seenAt = n.word("defense", "seen");
  const privateAt = n.word("defense", "private");
  const newerAt = n.word("defense", "newer");
  const end = n.beat("select").from;

  const chipAt = [testAt - 4, publishedAt - 2, crawledAt - 2, trainingAt - 2];
  const rows = CONTAMINATION.slice(0, 2);
  const rowAt = [memorizedAt - 4, workAt - 6];
  const rowY = (i: number) => y(TABLE_Y + 60 + i * ROW_STEP);

  return (
    <AbsoluteFill>
      {/* ── Sound: each step of the leak, the two rows, the strike ── */}
      {chipAt.map((at, i) => (
        <Sfx key={i} name="el-tap" at={at + 4} level={-28 - (i % 2)} />
      ))}
      <Sfx name="el-pop" at={memorizedAt - 4} level={-30} />
      <Sfx name="el-pencil" at={sameAt - 2} level={-34} />
      <Sfx name="el-scratch" at={sankAt} level={-34} />
      <Sfx name="el-tap" at={privateAt - 2} level={-28} />
      <Sfx name="el-tap" at={newerAt - 2} level={-28} />

      <Headline at={from - 6}>Two, contamination.</Headline>
      <FigLabel n="6" title="What the score can see" at={from - 2} x={X0} y={y(296)} />

      <Drift from={from} to={end} amount={0.012} origin="35% 55%">
        {/* How a test leaks: published, crawled, trained on. */}
        {PIPE.map((c, i) => (
          <React.Fragment key={c.text}>
            <Tag at={chipAt[i]} x={c.x} y={y(PIPE_Y) - 4} width={c.w} color={i === 3 ? TRAP : INK}>
              <span style={{ color: i === 3 ? TRAP_INK : INK }}>{c.text}</span>
            </Tag>
            {i > 0 ? (
              <Arrow from={[PIPE[i - 1].x + PIPE[i - 1].w + 8, y(PIPE_Y) + 22]} to={[c.x - 10, y(PIPE_Y) + 22]} at={chipAt[i] - 6} dur={8} width={2} />
            ) : null}
          </React.Fragment>
        ))}

        {/* benchmark-pitfalls' table, its first two rows. */}
        <Ink at={memorizedAt - 8} dur={12} style={{ left: X0, top: y(TABLE_Y) - 4, width: 900 }}>
          <div style={{ position: "relative", height: 30 }}>
            <span style={{ ...label(22, INK_SOFT), position: "absolute", left: 0 }}>situation</span>
            <span style={{ ...label(22, INK_SOFT), position: "absolute", left: RESULT_X - X0 }}>reported result</span>
          </div>
        </Ink>
        <Svg opacity={ease(frame, memorizedAt - 6, 12)}>
          <line x1={X0} x2={RULE_X1} y1={y(TABLE_Y) + 32} y2={y(TABLE_Y) + 32} stroke={INK} strokeWidth={2} />
        </Svg>
        {rows.map((r, i) => (
          <React.Fragment key={r.situation}>
            <Ink at={rowAt[i]} dur={12} style={{ left: X0, top: rowY(i) - 16, whiteSpace: "nowrap" }}>
              <span style={{ ...note(26, INK), fontWeight: 600 }}>{r.situation}</span>
            </Ink>
            <Ink at={rowAt[i] + 8} dur={12} style={{ left: RESULT_X, top: rowY(i) - 16, whiteSpace: "nowrap" }}>
              <span
                style={{
                  ...note(26, A_INK),
                  fontWeight: 700,
                  display: "inline-block",
                  transform: `scale(${1 + pulse(frame, sameAt + i * 4, 18) * 0.06})`,
                  transformOrigin: "0 50%",
                }}
              >
                <Marked at={sameAt - 2 + i * 4}>{r.reported}</Marked>
              </span>
            </Ink>
            <Svg opacity={ease(frame, rowAt[i] + 4, 12)}>
              <line x1={X0} x2={RULE_X1} y1={rowY(i) + 34} y2={rowY(i) + 34} stroke={HAIRLINE} strokeWidth={1} />
            </Svg>
          </React.Fragment>
        ))}
        <Svg opacity={ease(frame, sameAt + 2, 12)}>
          <path
            d={`M${RULE_X1 + 10},${rowY(0) - 6} L${RULE_X1 + 26},${rowY(0) - 6} L${RULE_X1 + 26},${rowY(1) + 14} L${RULE_X1 + 10},${rowY(1) + 14}`}
            fill="none"
            stroke={INK}
            strokeWidth={2}
          />
        </Svg>
        <Ink at={sameAt + 4} dur={14} style={{ left: RULE_X1 + 44, top: (rowY(0) + rowY(1)) / 2 - 14, whiteSpace: "nowrap" }}>
          <span style={{ ...note(23, INK), fontWeight: 600 }}>the same number</span>
        </Ink>

        {/* The case that proved it. */}
        <Ink at={sweAt - 4} dur={12} style={{ left: X0, top: y(690), whiteSpace: "nowrap" }}>
          <span style={{ ...label(26, INK), fontWeight: 700 }}>
            <Strike at={sweAt + 10}>SWE-bench Verified</Strike>
          </span>
        </Ink>
        <Ink at={februaryAt - 2} dur={12} style={{ left: X0 + 300, top: y(690) + 3, whiteSpace: "nowrap" }}>
          <span style={note(23, INK_SOFT)}>OpenAI stopped reporting it, February 2026</span>
        </Ink>
        <Ink at={reciteAt - 2} dur={12} style={{ left: X0, top: y(690) + 40, whiteSpace: "nowrap" }}>
          <span style={note(23, INK)}>models could recite some of its fixes from memory</span>
        </Ink>

        {/* The defense. */}
        <Ink at={defenseAt - 4} dur={14} style={{ left: X0, top: y(808), whiteSpace: "nowrap" }}>
          <span style={{ ...note(26, INK), fontWeight: 600 }}>
            The defense: a test it <Marked at={seenAt - 2}>can&apos;t have seen</Marked>
          </span>
        </Ink>
        <Tag at={privateAt - 2} x={X0 + 640} y={y(808) - 8} color={OK}>
          <span style={{ color: OK_INK }}>kept private</span>
        </Tag>
        <Tag at={newerAt - 2} x={X0 + 840} y={y(808) - 8} color={OK}>
          <span style={{ color: OK_INK }}>newer than its training</span>
        </Tag>
      </Drift>

      <Spot id="llm-benchmarks-elephant" at={memorizedAt - 6} left={1260} top={y(400)} width={540} height={360} />
    </AbsoluteFill>
  );
};
