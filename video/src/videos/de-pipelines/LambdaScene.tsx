import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Flow, Node, OK, OK_INK, Pill, pulse, X0 } from "./parts";

const LAYER_X = 470;
const LAYER_W = 400;
const SERVE_X = 980;
const SERVE_W = 250;
const NOTE_X = 1300;

/**
 * Question 8. Lambda on top: events split into a batch layer and a speed
 * layer, each carrying its own copy of the logic, merged by a serving layer.
 * Kappa underneath: one streaming job reading the event log, and history
 * reprocessed by replaying the log through the same code. Then when each
 * fits.
 */
export const LambdaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("lambda").from;
  const qAt = n.word("lambda", "Question eight");
  const textAt = n.word("lambda", "What is a Lambda versus Kappa");
  const twoAt = n.word("lambda", "Lambda runs two paths side by side");
  const batchAt = n.word("lambda", "a batch layer");
  const accurateAt = n.word("lambda", "accurate over all of history");
  const speedAt = n.word("lambda", "a speed layer");
  const servingAt = n.word("lambda", "A serving layer merges them");
  const costAt = n.word("lambda", "The cost");
  const twiceAt = n.word("lambda", "written twice");
  const stepAt = n.word("lambda", "kept in step");
  const kappaAt = n.word("kappa", "Kappa keeps one streaming path");
  const reprocessAt = n.word("kappa", "To reprocess history");
  const replayAt = n.word("kappa", "replay the event log");
  const kafkaAt = n.word("kappa", "in Kafka say");
  const sameAt = n.word("kappa", "through the same code");
  const simplerAt = n.word("kappa-when", "Kappa is simpler");
  const semanticsAt = n.word("kappa-when", "handle batch semantics");
  const reachesAt = n.word("kappa-when", "the log reaches back far enough");
  const fallbackAt = n.word("kappa-when", "Lambda is the fallback");
  const end = n.beat("kappa-when").to;

  // Lambda.
  const bY = y(340);
  const sY = y(480);
  const LH = 92;
  const eY = (bY + sY + LH) / 2 - 42;
  const serveY = (bY + sY + LH) / 2 - 46;
  const ev = { x: X0, w: 220 };
  // Kappa.
  const kY = y(730);
  const KH = 92;
  const log = { x: X0, w: 260 };
  const job = { x: LAYER_X + 40, w: 330 };
  const loopY = kY + KH + h(48);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={batchAt} level={-35} />
      <Sfx name="el-pop" at={speedAt} level={-35} />
      <Sfx name="el-pop" at={servingAt} level={-35} />
      <Sfx name="el-tap" at={twiceAt} level={-34} />
      <Sfx name="el-pop" at={kappaAt + 4} level={-35} />
      <Sfx name="el-whoosh" at={replayAt + 2} level={-36} />
      <Sfx name="el-tap" at={simplerAt} level={-35} />
      <Sfx name="el-tap" at={fallbackAt} level={-35} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={8} at={qAt - 4} textAt={textAt - 4} size={62}>
          What is a Lambda versus Kappa architecture?
        </QuestionCard>

        {/* Lambda: two paths, merged. */}
        <Note at={twoAt} x={X0} y={bY - h(4)}>
          <span style={{ ...label(32, INK), fontWeight: 800 }}>Lambda</span>
        </Note>
        <Node x={ev.x} y={eY + h(30)} w={ev.w} h={84} at={twoAt + 4} title="events" />
        <Flow points={[[ev.x + ev.w + 6, eY + h(30) + 30], [LAYER_X - 60, eY + h(30) + 30], [LAYER_X - 60, bY + LH / 2], [LAYER_X - 8, bY + LH / 2]]} at={batchAt - 2} color={BAR} />
        <Flow points={[[ev.x + ev.w + 6, eY + h(30) + 54], [LAYER_X - 60, eY + h(30) + 54], [LAYER_X - 60, sY + LH / 2], [LAYER_X - 8, sY + LH / 2]]} at={speedAt - 2} color={BAR} />
        <Node x={LAYER_X} y={bY} w={LAYER_W} h={LH} at={batchAt} title="batch layer" sub={<span style={{ opacity: ease(frame, accurateAt, 10) }}>accurate over all of history</span>} />
        <Node x={LAYER_X} y={sY} w={LAYER_W} h={LH} at={speedAt} title="speed layer" sub="fresh results" />
        <Flow points={[[LAYER_X + LAYER_W + 6, bY + LH / 2], [SERVE_X - 50, bY + LH / 2], [SERVE_X - 50, serveY + 30], [SERVE_X - 8, serveY + 30]]} at={servingAt - 2} color={BAR} />
        <Flow points={[[LAYER_X + LAYER_W + 6, sY + LH / 2], [SERVE_X - 50, sY + LH / 2], [SERVE_X - 50, serveY + 62], [SERVE_X - 8, serveY + 62]]} at={servingAt} color={BAR} />
        <Node x={SERVE_X} y={serveY} w={SERVE_W} h={92} at={servingAt + 2} tone="plain" title="serving layer" sub="merges both" />
        {/* The logic, once in each layer. */}
        {[bY, sY].map((ly, i) => (
          <Pill key={i} x={LAYER_X + LAYER_W - 108} y={ly - 18} at={twiceAt + i * 6} tone="bad" size={19} solid>
            logic
          </Pill>
        ))}
        <Note at={costAt} x={NOTE_X} y={bY + h(10)}>
          <span style={{ ...note(25, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            The cost: every piece of logic
            <br />
            <span style={{ opacity: ease(frame, twiceAt, 10) }}>written twice</span>
            <span style={{ opacity: ease(frame, stepAt, 10) }}>, and kept in step</span>
          </span>
        </Note>

        {/* Kappa: one path, and a replay. */}
        <Note at={kappaAt} x={X0} y={kY - h(64)}>
          <span style={{ ...label(32, INK), fontWeight: 800 }}>Kappa</span>
        </Note>
        <Node x={log.x} y={kY} w={log.w} h={KH} at={kappaAt + 2} title="event log" sub={<span style={{ opacity: ease(frame, kafkaAt, 10) }}>in Kafka, say</span>} />
        <Flow points={[[log.x + log.w + 6, kY + KH / 2], [job.x - 8, kY + KH / 2]]} at={kappaAt + 6} color={BAR} />
        <Node x={job.x} y={kY} w={job.w} h={KH} at={kappaAt + 8} tone="plain" title="one streaming job" sub="one copy of the logic" lit={pulse(frame, sameAt + 4, 26)} />
        <Flow points={[[job.x + job.w + 6, kY + KH / 2], [SERVE_X - 8, kY + KH / 2]]} at={kappaAt + 12} color={BAR} />
        <Node x={SERVE_X} y={kY} w={SERVE_W} h={KH} at={kappaAt + 14} tone="plain" title="serving" />
        {/* Reprocessing: replay the log from its start through the same job. */}
        <Flow
          points={[
            [log.x + 50, kY + KH + 6],
            [log.x + 50, loopY],
            [job.x + job.w / 2, loopY],
            [job.x + job.w / 2, kY + KH + 8],
          ]}
          at={replayAt}
          dur={22}
          color={OK}
          width={3}
          dash="9 7"
          tail
        />
        <Note at={reprocessAt} x={log.x + 70} y={loopY + h(10)}>
          <span style={{ ...note(24, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            reprocess: replay from the start<span style={{ opacity: ease(frame, sameAt, 10) }}>, same code</span>
          </span>
        </Note>

        {/* When each fits. */}
        <Note at={simplerAt} x={NOTE_X} y={kY - h(20)}>
          <div style={{ ...note(25, OK_INK), fontWeight: 750, whiteSpace: "nowrap" }}>Kappa is simpler, when</div>
          <div style={{ ...note(23, INK), whiteSpace: "nowrap", marginTop: 6, opacity: ease(frame, semanticsAt, 10) }}>the engine handles batch semantics</div>
          <div style={{ ...note(23, INK), whiteSpace: "nowrap", marginTop: 2, opacity: ease(frame, reachesAt, 10) }}>and the log reaches back far enough</div>
        </Note>
        <Note at={fallbackAt} x={NOTE_X} y={kY + h(110)}>
          <span style={{ ...note(24, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>Lambda: the fallback when it can't</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
