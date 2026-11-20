import { AppWindow, Bot, BrainCircuit, MessageSquare, SquareTerminal, Ticket } from "lucide-react";
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { Pt } from "../../components/arrow";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { M } from "../../editorial/math";
import { INK, INK_SOFT, label, note } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CHAIN } from "./data";
import {
  along,
  Arrow,
  BAD_INK,
  Box,
  Clear,
  Code,
  DATA,
  Dot,
  Drift,
  GOOD_INK,
  InlineArrow,
  Line,
  Mark,
  MARK_BAD,
  MARK_OK,
  pct,
  type Rect,
  Spot,
  Tag,
  X0,
} from "./parts";

/** One row of a chain: `steps` links, each `perStep`, drawn on `at`, and
 *  what the task comes to at the end. */
const LINK_DX = 54;
const Chain: React.FC<{
  y: number;
  steps: number;
  perStep: number;
  task: number;
  at: number;
  resultAt: number;
  good: boolean;
  exp: string;
}> = ({ y, steps, perStep, task, at, resultAt, good, exp }) => {
  const frame = useCurrentFrame();
  const x0 = X0 + 36;
  const r = ease(frame, resultAt, 12);
  return (
    <>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {Array.from({ length: steps }, (_, i) => {
          const p = ease(frame, at + i * 2, 8);
          if (p <= 0) return null;
          return (
            <ellipse
              key={i}
              cx={x0 + i * LINK_DX}
              cy={y}
              rx={32}
              ry={17}
              fill="none"
              stroke={DATA}
              strokeWidth={5}
              opacity={p}
              transform={`translate(0 ${(1 - p) * 8})`}
            />
          );
        })}
      </svg>
      {Array.from({ length: steps }, (_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: x0 + i * LINK_DX - 26,
            width: 52,
            top: y + 28,
            textAlign: "center",
            ...label(19, INK_SOFT),
            opacity: ease(frame, at + 6 + i * 2, 8),
          }}
        >
          {pct(perStep)}
        </div>
      ))}
      <div
        style={{
          position: "absolute",
          left: x0 + (steps - 1) * LINK_DX + 70,
          top: y - 20,
          display: "flex",
          alignItems: "center",
          gap: 14,
          ...note(30, good ? GOOD_INK : BAD_INK),
          fontWeight: 600,
          whiteSpace: "nowrap",
          opacity: r,
        }}
      >
        <InlineArrow at={resultAt} w={46} color={INK} size={30} />
        <M style={{ color: INK }}>{exp}</M>
        <span style={{ color: INK, fontWeight: 500 }}>≈</span>
        <Mark at={resultAt + 6} color={good ? MARK_OK : MARK_BAD}>
          <Num>{pct(task)}</Num>
        </Mark>
      </div>
    </>
  );
};

/**
 * Question 4. The loop drawn as it is said: the model emits a tool call (a
 * name and JSON arguments), the application runs it, and the result goes
 * back into the context. Then a request rides the loop, its steps counted,
 * and MCP beside it: one tool, many clients. The design around the loop as
 * four chips, and an idempotent tool: one ticket from two calls. Then, on a
 * clean page, reliability compounding: ten links at 95% come to about 60%
 * (red), and the two ways back up, ten at 99% and five at 95% (green).
 */
export const AgentScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("q4").from;
  const qAt = n.word("q4", "Question four");
  const textAt = n.word("q4", "What is an agent");
  const modelAt = n.word("q4", "lets a model request");
  const callAt = n.word("q4", "a structured call");
  const argsAt = n.word("q4", "JSON arguments");
  const appAt = n.word("q4", "the application runs it");
  const backAt = n.word("q4", "puts the result back");

  const loopAt = n.word("q4-loop", "An agent is that loop");
  const doneAt = n.word("q4-loop", "decides it's done");
  const mcpAt = n.word("q4-loop", "The Model Context Protocol");
  const openAt = n.word("q4-loop", "an open standard");
  const manyAt = n.word("q4-loop", "serves many clients");

  const designAt = n.word("q4-design", "the design around the loop");
  const chips = [
    { text: "Step and cost budget", at: n.word("q4-design", "a budget on steps") },
    { text: "Timeouts and retries", at: n.word("q4-design", "timeouts and retries") },
    { text: "Permissions scoped to the user", at: n.word("q4-design", "permissions scoped") },
    { text: "A trace of every step", at: n.word("q4-design", "a trace of every step") },
  ];

  const idemAt = n.word("q4-idem", "idempotent tools");
  const twiceAt = n.word("q4-idem", "run twice");
  const sameAt = n.word("q4-idem", "Filing the same ticket twice");
  const oneAt = n.word("q4-idem", "leave one ticket");

  const relAt = n.word("q4-compound", "Then reliability");
  const compAt = n.word("q4-compound", "which compounds");
  const perAt = n.word("q4-compound", "ninety-five percent");
  const sixtyAt = n.word("q4-compound", "about sixty percent");
  const ninetyNineAt = n.word("q4-fewer", "ninety-nine percent reliable");
  const ninetyAt = n.word("q4-fewer", "reach ninety");
  const fiveAt = n.word("q4-fewer", "cut the task to five steps");
  const sevenAt = n.word("q4-fewer", "seventy-seven");
  const fewerAt = n.word("q4-fewer", "Fewer, more reliable steps");
  const end = n.beat("q5-in").to;

  // The loop, in screen pixels: model left, application right, the call
  // over the top and the result under it.
  const model: Rect = { cx: 300, cy: y(470), w: 230, h: 76 };
  const app: Rect = { cx: 1030, cy: y(470), w: 270, h: 76 };
  const call: Rect = { cx: 665, cy: y(350), w: 500, h: 62 };
  const result: Rect = { cx: 665, cy: y(590), w: 340, h: 62 };
  const g = 8;
  const up: Pt[] = [
    [model.cx, model.cy - model.h / 2 - g],
    [model.cx, call.cy],
    [call.cx - call.w / 2 - g, call.cy],
  ];
  const over: Pt[] = [
    [call.cx + call.w / 2 + g, call.cy],
    [app.cx, call.cy],
    [app.cx, app.cy - app.h / 2 - g],
  ];
  const down: Pt[] = [
    [app.cx, app.cy + app.h / 2 + g],
    [app.cx, result.cy],
    [result.cx + result.w / 2 + g, result.cy],
  ];
  const home: Pt[] = [
    [result.cx - result.w / 2 - g, result.cy],
    [model.cx, result.cy],
    [model.cx, model.cy + model.h / 2 + g],
  ];
  // The whole loop, for the dot that rides it.
  const ring: Pt[] = [
    [model.cx, model.cy],
    [model.cx, call.cy],
    [app.cx, call.cy],
    [app.cx, result.cy],
    [model.cx, result.cy],
    [model.cx, model.cy],
  ];
  const lap = Math.max(30, Math.round((doneAt - loopAt) / 3));
  const ride = frame - loopAt;
  const laps = ride < 0 ? 0 : Math.min(3, Math.floor(ride / lap));
  const riding = ride >= 0 && ride < 3 * lap;
  const step = ride < 0 ? 1 : Math.min(3, laps + 1);

  // MCP: one tool, three clients.
  const tool: Rect = { cx: 1420, cy: y(500), w: 230, h: 64 };
  const clients = [
    { title: "Chat App", icon: MessageSquare, cy: y(410) },
    { title: "IDE", icon: SquareTerminal, cy: y(500) },
    { title: "Support Bot", icon: Bot, cy: y(590) },
  ];
  const clearAt = relAt - 6;

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={modelAt + 2} level={-31} />
      <Sfx name="el-pencil" at={callAt} level={-36} />
      <Sfx name="el-pop" at={appAt + 2} level={-31} />
      <Sfx name="el-pencil" at={backAt + 2} level={-36} />
      <Sfx name="el-whoosh" at={loopAt + 2} level={-37} />
      <Sfx name="el-pop" at={mcpAt + 4} level={-32} />
      {chips.map((c) => (
        <Sfx key={c.text} name="el-tap" at={c.at} level={-31} />
      ))}
      <Sfx name="el-tap" at={idemAt + 2} level={-31} />
      <Sfx name="el-tap" at={twiceAt + 2} level={-32} />
      <Sfx name="el-pop" at={oneAt + 2} level={-31} />
      <Sfx name="el-whoosh" at={clearAt} level={-37} />
      <Sfx name="el-pop" at={compAt} level={-30} />
      <Sfx name="el-sprinkle" at={perAt} level={-37} />
      <Sfx name="el-tap" at={sixtyAt + 2} level={-30} />
      <Sfx name="el-sprinkle" at={ninetyNineAt} level={-37} />
      <Sfx name="el-tap" at={ninetyAt + 2} level={-31} />
      <Sfx name="el-sprinkle" at={fiveAt} level={-37} />
      <Sfx name="el-tap" at={sevenAt + 2} level={-31} />
      <Sfx name="el-chime" at={fewerAt + 30} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} size={58}>
          What is an agent, and how does tool calling work?
        </QuestionCard>

        <Clear at={clearAt}>
          {/* The loop, drawn as it is said. */}
          <Box r={model} at={modelAt} title="Model" icon={BrainCircuit} />
          <Arrow points={up} at={callAt - 4} />
          <Box
            r={call}
            at={callAt}
            mono
            size={24}
            title={
              <>
                file_ticket(<span style={{ opacity: ease(frame, argsAt - 2, 10) }}>{'{"priority": "high"}'}</span>)
              </>
            }
          />
          <Line x={call.cx} width={420} align="center" y={call.cy + 44} at={argsAt} size={21} color={INK_SOFT}>
            tool name + JSON arguments
          </Line>
          <Arrow points={over} at={appAt - 4} />
          <Box r={app} at={appAt} title="Application" icon={AppWindow} sub="runs it" />
          <Arrow points={down} at={backAt - 6} color={DATA} />
          <Box r={result} at={backAt} title="Ticket 4127 filed" tone="data" size={24} />
          <Line x={result.cx} width={420} align="center" y={result.cy - 74} at={backAt + 4} size={21} color={INK_SOFT}>
            the result, back into the context
          </Line>
          <Arrow points={home} at={backAt + 4} color={DATA} />

          {/* The loop, repeated: a step counter and a dot going round. */}
          {riding ? <Dot at={along(ring, (ride % lap) / lap)} color={DATA} r={8} /> : null}
          <Line x={(model.cx + app.cx) / 2} width={200} align="center" y={model.cy - 16} at={loopAt} size={24} weight={600}>
            {frame >= doneAt ? (
              <span>done</span>
            ) : (
              <>
                step <Num>{step}</Num>
              </>
            )}
          </Line>

          {/* MCP: one integration serves many clients. */}
          <Line x={tool.cx - tool.w / 2} y={y(330)} at={mcpAt} size={24} weight={600}>
            MCP: <span style={{ fontWeight: 500 }}>one integration, many clients</span>
          </Line>
          <Box r={tool} at={openAt} title="Ticket Tool" icon={Ticket} size={24} />
          {clients.map((c, i) => (
            <React.Fragment key={c.title}>
              <Arrow
                points={[
                  [tool.cx + tool.w / 2 + 8, tool.cy],
                  [tool.cx + tool.w / 2 + 35, tool.cy],
                  [tool.cx + tool.w / 2 + 35, c.cy],
                  [1610 - 8, c.cy],
                ]}
                at={manyAt + i * 4}
                head={0}
                radius={12}
              />
              <Box r={{ cx: 1710, cy: c.cy, w: 200, h: 56 }} at={manyAt + 4 + i * 4} title={c.title} icon={c.icon} size={22} />
            </React.Fragment>
          ))}

          {/* The design around the loop. */}
          <Line x={X0} y={y(680)} at={designAt} size={22} color={INK_SOFT}>
            The design around the loop
          </Line>
          <div style={{ position: "absolute", left: X0, top: y(680) + 44, display: "flex", gap: 18, fontSize: 26 }}>
            {chips.map((c) => (
              <Tag key={c.text} at={c.at - 2} size={26}>
                {c.text}
              </Tag>
            ))}
          </div>

          {/* An idempotent tool: two calls, one ticket. */}
          <div style={{ position: "absolute", left: X0, top: y(800), display: "flex", alignItems: "center", gap: 16, fontSize: 26 }}>
            <span style={{ ...note(26, GOOD_INK), fontWeight: 600, opacity: ease(frame, idemAt - 2, 10) }}>Idempotent tools</span>
            <span style={{ width: 12 }} />
            <Tag at={sameAt - 2} size={26}>
              <Code>file_ticket</Code>
            </Tag>
            <Tag at={twiceAt} size={26}>
              <Code>file_ticket</Code> <span style={{ color: INK_SOFT }}>retry</span>
            </Tag>
            <span style={{ opacity: ease(frame, oneAt - 6, 8) }}>
              <InlineArrow at={oneAt - 6} size={26} />
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 10, ...note(26, GOOD_INK), fontWeight: 600, opacity: ease(frame, oneAt, 10) }}>
              <Tick at={oneAt + 2} size={26} />
              One ticket
            </span>
          </div>
        </Clear>

        {/* Reliability compounds. */}
        <Line x={X0} y={y(318)} at={relAt + 12} size={30} weight={600}>
          Reliability compounds
        </Line>
        <Spot id="mle-llm-evals-chain" at={compAt} left={1500} top={y(318) - 8} width={240} height={112} />
        <Chain
          y={y(446)}
          steps={CHAIN.page.steps}
          perStep={CHAIN.page.perStep}
          task={CHAIN.page.task}
          at={perAt - 6}
          resultAt={sixtyAt}
          good={false}
          exp="0.95^{10}"
        />
        <Chain
          y={y(596)}
          steps={CHAIN.reliable.steps}
          perStep={CHAIN.reliable.perStep}
          task={CHAIN.reliable.task}
          at={ninetyNineAt - 6}
          resultAt={ninetyAt}
          good
          exp="0.99^{10}"
        />
        <Chain
          y={y(746)}
          steps={CHAIN.shorter.steps}
          perStep={CHAIN.shorter.perStep}
          task={CHAIN.shorter.task}
          at={fiveAt}
          resultAt={sevenAt}
          good
          exp="0.95^5"
        />
        <Line x={X0} y={y(840)} at={fewerAt} size={30}>
          <Mark at={fewerAt + 8}>Fewer, more reliable steps</Mark> beat a clever long chain
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
