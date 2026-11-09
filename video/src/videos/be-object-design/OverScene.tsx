import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, INK_SOFT, label, note } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ACCENT_INK, Box, Drift, Flow, lerp, Line, Mark, OK_INK, toneAt, VRule, X0 } from "./parts";

const COL_X = [X0, 700, 1280];
const COL_W = 440;
const LAYER = { top: 392, h: 74 };
const THING = { top: 548, h: 64 };

/**
 * Question 8. Three patterns, each wrapped around one thing: a factory with
 * one implementation, a strategy interface with one strategy, an observer
 * list with one listener. Each extra layer is struck. YAGNI. Then the
 * trigger: the second shipping rule arrives beside the first, and only then
 * does the strategy interface earn its place.
 */
export const OverScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("over").from;
  const qAt = n.word("over", "Question eight");
  const textAt = n.word("over", "When does a design pattern become over-engineering?");
  const whenAt = n.word("over", "When it adds indirection");
  const needAt = n.word("over", "without a need to match");
  const factoryAt = n.word("over-ex", "A factory for a class");
  const strategyAt = n.word("over-ex", "A strategy interface with one strategy");
  const observerAt = n.word("over-ex", "An observer with one hard-coded listener");
  const eachAt = n.word("over-ex", "Each is abstraction you have to read through");
  const nobodyAt = n.word("over-ex", "for flexibility nobody uses");
  const variationAt = n.word("over-yagni", "Patterns solve variation you expect");
  const specAt = n.word("over-yagni", "Added speculatively");
  const yagniAt = n.word("over-yagni", "they break YAGNI");
  const gonnaAt = n.word("over-yagni", "you aren't gonna need it");
  const triggerAt = n.word("over-trigger", "name the trigger rather than the pattern");
  const secondAt = n.word("over-trigger", "The second shipping rule");
  const earnsAt = n.word("over-trigger", "the strategy earns its interface");
  const reachAt = n.word("over-trigger", "Reach for a pattern when the duplication");
  const realAt = n.word("over-trigger", "is real");
  const end = n.beat("over-trigger").to;

  const cols = [
    { at: factoryAt, layer: "Factory", thing: "the one implementation" },
    { at: strategyAt, layer: "Strategy interface", thing: "one strategy" },
    { at: observerAt, layer: "Observer list", thing: "one hard-coded listener" },
  ];
  const layerTop = y(LAYER.top);
  const thingTop = y(THING.top);
  const notesOut = triggerAt - 6;
  // Over the trigger, the middle column takes a second rule and keeps its layer.
  const second = ease(frame, secondAt + 4, 16);
  const earned = ease(frame, earnsAt, 14);

  return (
    <AbsoluteFill>
      {cols.map((c) => (
        <Sfx key={c.layer} name="el-tap" at={c.at} level={-32} />
      ))}
      {cols.map((c, i) => (
        <Sfx key={`s${c.layer}`} name="el-scratch" at={eachAt + 6 + i * 6} level={-34} />
      ))}
      <Sfx name="el-pencil" at={yagniAt} level={-35} />
      <Sfx name="el-whoosh" at={secondAt + 4} level={-35} />
      <Sfx name="el-chime" at={earnsAt + 4} level={-33} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={8} at={qAt - 4} textAt={textAt - 4} size={60}>
          When does a design pattern become over-engineering?
        </QuestionCard>
        <Line x={X0} y={y(270)} at={whenAt} size={26}>
          When it adds indirection <Mark at={needAt}>without a need to match</Mark>.
        </Line>

        {cols.map((c, i) => {
          const x = COL_X[i];
          const struck = ease(frame, eachAt + 6 + i * 6, 12);
          const keep = i === 1 ? earned : 0;
          const dim = i === 1 ? undefined : triggerAt;
          const c2 = toneAt(frame, "plain", [
            [eachAt + 6 + i * 6, "bad"],
            ...(i === 1 ? ([[earnsAt, "ok"]] as const) : []),
          ]);
          const thingW = i === 1 ? lerp(COL_W, (COL_W - 20) / 2, second) : COL_W;
          return (
            <React.Fragment key={c.layer}>
              <Box x={x} y={layerTop} w={COL_W} h={LAYER.h} at={c.at} dashed tone="plain" tones={[[eachAt + 6 + i * 6, "bad"], ...(i === 1 ? ([[earnsAt, "ok"]] as const) : [])]} dim={dim}>
                <span style={{ position: "relative", ...label(25, c2.ink), fontWeight: 500, whiteSpace: "nowrap" }}>
                  {c.layer}
                  <span
                    style={{
                      position: "absolute",
                      left: "-0.1em",
                      top: "0.55em",
                      height: 3,
                      width: `calc((100% + 0.2em) * ${struck})`,
                      background: ACCENT,
                      borderRadius: 2,
                      opacity: 1 - keep,
                    }}
                  />
                </span>
                <span style={{ ...note(20, INK_SOFT), fontWeight: 500, whiteSpace: "nowrap", opacity: ease(frame, c.at + 8, 10) }}>
                  {keep > 0.5 ? "earned: two rules" : "a layer to read through"}
                </span>
              </Box>
              <Flow points={[[x + thingW / 2, layerTop + LAYER.h + 6], [x + thingW / 2, thingTop - 8]]} at={c.at + 6} dur={8} width={2.2} head={12} dim={dim} />
              <Box x={x} y={thingTop} w={thingW} h={THING.h} at={whenAt + 6 + i * 5} title={i === 1 && second > 0.5 ? "flat rate" : c.thing} size={22} tone="data" dim={dim} />
              {i === 1 ? (
                <>
                  <Box x={x + (COL_W + 20) / 2 + 30 * (1 - second)} y={thingTop} w={(COL_W - 20) / 2} h={THING.h} at={secondAt + 4} title="by weight" size={22} tone="ok" />
                  <Flow points={[[x + (COL_W * 3) / 4 + 5, layerTop + LAYER.h + 6], [x + (COL_W * 3) / 4 + 5, thingTop - 8]]} at={secondAt + 12} dur={8} width={2.2} head={12} />
                </>
              ) : null}
            </React.Fragment>
          );
        })}

        {[1, 2].map((i) => (
          <VRule key={i} x={(COL_X[i - 1] + COL_W + COL_X[i]) / 2} top={layerTop} bottom={thingTop + THING.h} at={whenAt + 6 + i * 5} />
        ))}

        {/* The cost, and the rule. */}
        <Line x={X0} y={y(660)} at={eachAt} size={26} out={notesOut}>
          Abstraction you have to read through
          <span style={{ opacity: ease(frame, nobodyAt, 10) }}>
            , for <span style={{ color: ACCENT_INK, fontWeight: 500 }}>flexibility nobody uses</span>
          </span>
        </Line>
        <Line x={X0} y={y(660) + 52} at={variationAt} size={26} out={notesOut}>
          Patterns solve variation you expect
          <span style={{ color: INK_SOFT, opacity: ease(frame, specAt, 10) }}>; added speculatively, they break</span>
        </Line>
        <Line x={X0} y={y(660) + 116} at={yagniAt} size={30} weight={500} out={notesOut}>
          YAGNI: <Mark at={gonnaAt}>you aren&apos;t gonna need it</Mark>
        </Line>

        <Line x={X0} y={y(660)} at={triggerAt} size={28} weight={500}>
          Name the trigger, not the pattern
          <span style={{ color: OK_INK, opacity: ease(frame, secondAt, 10) }}>: the second shipping rule</span>
        </Line>
        <Line x={X0} y={y(660) + 56} at={reachAt} size={26}>
          Reach for a pattern when the duplication, or the pressure to change, <Mark at={realAt}>is real</Mark>.
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
