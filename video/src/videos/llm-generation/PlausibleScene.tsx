import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, body, HAIRLINE, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CONTINUATIONS } from "./data";
import { GOOD, GOOD_INK, Headline, Kicker, pulse, Spot, Svg, Tag, tint, X0 } from "./kit";

const ROW_Y = [384, 510] as const;
const TAG_DY = 58;
const LAMP_X = 1270;
const SLOT_Y = 726;
const SLOTS = ["Names", "Year", "Journal"] as const;

/**
 * Plausible, check, paris, chen, shape: the lesson's one-sentence
 * explanation, its first block's two continuations (one grounded, one
 * invented), and the missing "I know this one" signal.
 */
export const PlausibleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const start = n.beat("plausible").from;
  const contAt = n.word("plausible", "plausible continuations");
  const questionAt = n.word("plausible", "question");
  const answerAt = n.word("plausible", "is an answer");
  const checkAt = n.beat("check").from;
  const parisAt = n.word("paris", "Paris");
  const millionsAt = n.word("paris", "millions");
  const chenAt = n.word("chen", "Chen");
  const fluentAt = n.word("chen", "Just as fluent");
  const neverAt = n.word("chen", "never");
  const citationsAt = n.word("shape", "citations");
  const shapeAt = n.word("shape", "nails the shape");
  const slotAt = [n.word("shape", "names"), n.word("shape", "a year"), n.word("shape", "a journal")];
  const marksAt = n.word("shape", "nothing marks");
  const knowAt = n.word("shape", "actually know");

  const contIn = [parisAt, chenAt];
  const tagIn = [millionsAt, neverAt];

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={start - 2} level={-31} />
      <Sfx name="el-pencil" at={contAt - 4} level={-36} />
      <Sfx name="el-tap" at={parisAt - 2} level={-29} />
      <Sfx name="el-tap" at={chenAt - 2} level={-29} />
      {SLOTS.map((_, k) => (
        <Sfx key={k} name="el-tap" at={slotAt[k] - 2} level={-31} />
      ))}
      <Sfx name="el-pencil" at={marksAt} level={-35} />

      <Kicker at={start - 6}>Why models hallucinate</Kicker>
      <Headline lead="A plausible continuation of a question" turn="is an answer." at={start - 4} turnAt={answerAt - 2} size={54} />
      <Spot id="llm-generation-parrot" at={start - 2} left={1600} top={y(64)} width={240} height={h(260)} />
      <Ink at={checkAt - 2} dur={18} style={{ left: X0, top: y(220) }}>
        <span style={{ ...body(32, true), color: INK }}>Whether a real answer exists is not something it can check.</span>
      </Ink>

      <FigLabel n="7" title="Two continuations, one mechanism (the lesson's first block)" at={contAt - 6} x={X0} y={y(318)} />
      {CONTINUATIONS.map((c, i) => {
        const top = y(ROW_Y[i]);
        const color = c.grounded ? GOOD : ACCENT;
        const swell = pulse(frame, fluentAt - 2 + i * 4, 20);
        return (
          <React.Fragment key={c.prompt}>
            <Ink at={(i === 0 ? contAt : questionAt) - 2} dur={16} style={{ left: X0, top, display: "flex", alignItems: "baseline", whiteSpace: "nowrap" }}>
              <span style={{ ...body(36), color: INK }}>{c.prompt}</span>
              {/* The blank, until the continuation lands in it. */}
              <span
                style={{
                  display: "inline-block",
                  width: "1.6em",
                  marginLeft: "0.3em",
                  borderBottom: `3px solid ${HAIRLINE}`,
                  opacity: 1 - ease(frame, contIn[i] - 4, 6),
                  ...body(36),
                }}
              >
                &nbsp;
              </span>
            </Ink>
            <Ink at={contIn[i] - 2} dur={14} style={{ left: X0, top, whiteSpace: "nowrap" }}>
              <span style={{ ...body(36), color: "transparent" }}>{c.prompt}</span>
              <span
                style={{
                  display: "inline-block",
                  marginLeft: "0.3em",
                  padding: "2px 14px 4px",
                  background: tint(BAR, 20),
                  borderBottom: `4px solid ${BAR}`,
                  ...body(36),
                  color: BLUE_INK,
                  transform: `scale(${1 + swell * 0.04})`,
                  transformOrigin: "0 50%",
                }}
              >
                {c.continuation.trim()}
              </span>
            </Ink>
            <Note at={tagIn[i] - 2} x={X0} y={top + h(TAG_DY)} from="up">
              <Tag color={color} ink={c.grounded ? GOOD_INK : ACCENT_INK}>
                {c.grounded ? "seen millions of times" : "never in its data"}
              </Tag>
            </Note>
            {/* The lamp that would say "I know this one". There is none to light. */}
            <Svg opacity={ease(frame, marksAt - 2 + i * 4, 12)}>
              <circle
                cx={LAMP_X}
                cy={top + 30}
                r={20}
                fill={PAPER}
                stroke={INK_SOFT}
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            </Svg>
          </React.Fragment>
        );
      })}
      <Note at={knowAt - 6} x={LAMP_X + 44} y={(y(ROW_Y[0]) + y(ROW_Y[1])) / 2 + 12}>
        <div style={{ ...note(24, INK), width: 520 }}>
          No mark for <span style={{ fontStyle: "italic" }}>“I actually know this one.”</span>
          <div style={{ ...note(21, INK_SOFT), marginTop: 6 }}>Same fluency either way.</div>
        </div>
      </Note>

      {/* Fig. 8: the shape it has seen millions of times. */}
      <FigLabel n="8" title="The shape of a citation, which it has read millions of times" at={citationsAt - 4} x={X0} y={y(660)} />
      {SLOTS.map((s, k) => {
        const filled = ease(frame, slotAt[k] - 2, 12);
        return (
          <Ink key={s} at={citationsAt + k * 3} dur={12} style={{ left: X0 + k * 300, top: y(SLOT_Y), width: 270, height: h(70) }}>
            <div
              style={{
                width: "100%",
                height: "100%",
                boxSizing: "border-box",
                border: `2px dashed ${filled > 0.5 ? BAR : INK_SOFT}`,
                background: `color-mix(in srgb, ${tint(BAR, 22)} ${filled * 100}%, transparent)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...label(24, filled > 0.5 ? BLUE_INK : INK_SOFT),
              }}
            >
              {s}
            </div>
          </Ink>
        );
      })}
      <Note at={shapeAt - 2} x={X0 + 920} y={y(SLOT_Y) + h(35) - 20}>
        <span style={{ ...note(26, GOOD_INK), fontWeight: 650 }}>The shape is right.</span>
      </Note>
    </AbsoluteFill>
  );
};
