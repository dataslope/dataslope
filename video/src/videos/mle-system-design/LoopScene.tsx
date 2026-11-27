import { Clock, NotebookText } from "lucide-react";
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, INK, label, note } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Cross, Drift, Flow, Line, MiniMap, Node, OK, OK_INK, Q_SIZE, Q_W, Tag, X0 } from "./parts";

const MODEL = { x: 300, w: 230 };
const PRED = { x: 680, w: 240 };
const OUT = { x: 1100, w: 280 };
const BH = 84;

/**
 * Question 8: the label is the outcome a prediction led to, logged beside
 * it, and the loop closes into training. Three things bend it: labels come
 * days late, a blocked transaction's outcome is never seen, and the model's
 * actions shape what it sees next. The fix: log the decision too, and keep a
 * random holdout the model does not decide, whose outcomes reach training
 * unbent.
 */
export const LoopScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("q8").from;
  const qAt = n.word("q8", "Question eight");
  const textAt = n.word("q8", "What is label collection");
  const launchAt = n.word("q8", "After launch");
  const outcomeAt = n.word("q8", "the outcome the prediction led to");
  const clickAt = n.word("q8", "a click");
  const purchaseAt = n.word("q8", "a purchase");
  const fraudAt = n.word("q8", "a confirmed fraud");
  const loggingAt = n.word("q8", "Logging it beside the prediction");
  const closesAt = n.word("q8", "closes the loop");
  const bendAt = n.word("q8-risks", "Three things bend that loop");
  const lateAt = n.word("q8-risks", "Labels arrive late");
  const daysAt = n.word("q8-risks", "days after the click");
  const letAt = n.word("q8-risks", "outcomes the model let happen");
  const blockedAt = n.word("q8-risks", "a transaction it blocked");
  const neverAt = n.word("q8-risks", "never shows whether it was fraud");
  const actionsAt = n.word("q8-risks", "its actions change the data");
  const decidedAt = n.word("q8-explore", "log what the model decided");
  const sliceAt = n.word("q8-explore", "a small random slice");
  const onlyAt = n.word("q8-explore", "the only ones the model didn't choose");
  const end = n.beat("q8-explore").to;

  const mid = y(470);
  const top = mid - BH / 2;
  const bottom = mid + BH / 2;
  const blockMid = y(632);
  const back = y(800);
  const lane = y(366);
  const reqX = 186;

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={launchAt} level={-31} />
      <Sfx name="el-tap" at={outcomeAt} level={-30} />
      <Sfx name="el-tap" at={clickAt} level={-32} />
      <Sfx name="el-tap" at={purchaseAt} level={-32} />
      <Sfx name="el-tap" at={fraudAt} level={-32} />
      <Sfx name="el-pencil" at={closesAt} level={-34} />
      <Sfx name="el-tap" at={lateAt} level={-31} />
      <Sfx name="el-scratch" at={neverAt} level={-33} />
      <Sfx name="el-pencil" at={actionsAt} level={-35} />
      <Sfx name="el-tap" at={decidedAt} level={-31} />
      <Sfx name="el-pencil" at={sliceAt} level={-35} />
      <Sfx name="el-chime" at={onlyAt + 16} level={-33} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={8} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE} width={Q_W}>
          What is label collection, and how do feedback loops work?
        </QuestionCard>
        <MiniMap at={qAt} store lit={[["labels", qAt + 10]]} />

        {/* ── The loop: a prediction, its outcome, logged, into training ── */}
        <Line at={launchAt} x={X0} y={mid - 16} size={24}>
          Requests
        </Line>
        <Flow points={[[X0 + 112, mid], [MODEL.x - 3, mid]]} at={launchAt + 4} color={BAR} />
        <Node x={MODEL.x} y={top} w={MODEL.w} h={BH} at={launchAt} title="Model" />
        <Flow points={[[MODEL.x + MODEL.w + 3, mid], [PRED.x - 3, mid]]} at={launchAt + 6} color={BAR} />
        <Node x={PRED.x} y={top} w={PRED.w} h={BH} at={launchAt + 8} title="Prediction" />
        <Flow points={[[PRED.x + PRED.w + 3, mid], [OUT.x - 3, mid]]} at={outcomeAt} color={INK} lit={lateAt} litOut={letAt} />
        <Node x={OUT.x} y={top} w={OUT.w} h={BH} at={outcomeAt + 4} title="Outcome" sub="the label" lit={onlyAt} />
        {[
          { t: "a click", at: clickAt },
          { t: "a purchase", at: purchaseAt },
          { t: "a confirmed fraud", at: fraudAt },
        ].map((k, i) => (
          <Ink key={k.t} at={k.at} dur={10} style={{ left: OUT.x + OUT.w + 40, top: top - 14 + i * 44, whiteSpace: "nowrap" }}>
            <Tag size={20}>{k.t}</Tag>
          </Ink>
        ))}
        {/* Logged beside the prediction, and into training. */}
        <Flow points={[[OUT.x + OUT.w - 60, bottom + 3], [OUT.x + OUT.w - 60, back - 64]]} at={loggingAt} color={INK} />
        <Node x={OUT.x} y={back - 61} w={OUT.w} h={122} at={loggingAt + 4} icon={NotebookText} title="Log" sub="prediction and outcome">
          <span style={{ ...note(20, OK_INK), fontWeight: 500, opacity: ease(frame, decidedAt, 12) }}>and the decision</span>
        </Node>
        <Flow points={[[OUT.x - 3, back], [MODEL.x + MODEL.w + 3, back]]} at={closesAt} dur={20} color={INK} />
        <Node x={MODEL.x} y={back - BH / 2} w={MODEL.w} h={BH} at={closesAt + 8} title="Training" />
        <Flow points={[[MODEL.x + MODEL.w / 2, back - BH / 2 - 3], [MODEL.x + MODEL.w / 2, bottom + 3]]} at={closesAt + 14} color={INK} />

        {/* ── Three things bend it ── */}
        <Ink at={lateAt} dur={12} style={{ left: PRED.x + PRED.w + 26, top: mid - 54, whiteSpace: "nowrap" }}>
          <span style={{ ...label(22, INK), fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 8, fontSize: 22 }}>
            <Clock size={22} color={INK} strokeWidth={2} />
            {frame < daysAt ? "late" : "days later"}
          </span>
        </Ink>
        <Flow points={[[PRED.x + PRED.w / 2, bottom + 3], [PRED.x + PRED.w / 2, blockMid - 33]]} at={letAt} color={INK} />
        <Node x={PRED.x} y={blockMid - 30} w={PRED.w} h={60} at={blockedAt} tone="bad" title="Blocked" size={22} />
        <Flow points={[[PRED.x + PRED.w + 3, blockMid], [PRED.x + PRED.w + 96, blockMid]]} at={blockedAt + 8} color={ACCENT} dash="7 6" head={0} />
        <div style={{ position: "absolute", left: PRED.x + PRED.w + 100, top: blockMid - 13 }}>
          <Cross at={neverAt} size={26} />
        </div>
        <Line at={neverAt + 4} x={PRED.x + PRED.w + 140} y={blockMid - 16} size={22} color={ACCENT_INK}>
          never seen
        </Line>
        {/* Its actions change what it sees next. */}
        <Flow
          points={[
            [PRED.x + PRED.w / 2, top - 3],
            [PRED.x + PRED.w / 2, lane],
            [reqX, lane],
            [reqX, mid - 24],
          ]}
          at={actionsAt}
          dur={22}
          color={INK}
          dash="7 6"
          out={sliceAt}
        />
        <Line at={actionsAt + 10} x={(reqX + PRED.x + PRED.w / 2) / 2} y={lane - 44} size={22} align="center" width={600} out={sliceAt}>
          Its actions shape what it sees next
        </Line>

        {/* ── The fix: a random holdout the model doesn't decide ── */}
        <Flow
          points={[
            [reqX, mid - 24],
            [reqX, lane],
            [OUT.x + 60, lane],
            [OUT.x + 60, top - 3],
          ]}
          at={sliceAt}
          dur={26}
          color={OK}
          width={3}
        />
        <Line at={sliceAt + 14} x={(reqX + OUT.x) / 2} y={lane - 44} size={22} color={OK_INK} align="center" width={700}>
          Random holdout: the model doesn&apos;t decide
        </Line>
        <Ink at={onlyAt} dur={12} style={{ left: X0, top: y(892), whiteSpace: "nowrap" }}>
          <span style={{ ...note(22, OK_INK), fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 10, fontSize: 22 }}>
            <Tick at={onlyAt + 4} size={24} color={OK} />
            The only outcomes the model didn&apos;t choose
          </span>
        </Ink>
        <Line at={bendAt} x={X0} y={y(632) - 16} size={22} out={decidedAt}>
          Three things bend it
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
