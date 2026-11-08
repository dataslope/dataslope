import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK, OK_INK, QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, HAIRLINE, INK, INK_SOFT, PAPER, body, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Clear, ColumnRule, Cross, Drift, line, Mark, Spot, Strike, X0 } from "./parts";

const RED_X = 1010;
/** The rule between the two columns, centred between the longest row on
 *  the left (about x 850) and the right column. */
const RULE_X = 930;
const ROW_Y = 374;
const ROW_H = 58;
const BLOCK = 66;
const BLOCK_GAP = 10;
const PAST_Y = 742;

/** One row of a list, with its mark drawn on `at`. */
const Row: React.FC<{ x: number; y: number; at: number; ok: boolean; dim?: number; children: React.ReactNode }> = ({ x, y, at, ok, dim, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at - 2, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.55;
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        display: "flex",
        alignItems: "center",
        gap: 16,
        fontSize: 24,
        opacity: p * (1 - d),
        transform: `translateX(${(1 - p) * -12}px)`,
      }}
    >
      {ok ? <Tick at={at + 4} size={26} /> : <Cross at={at + 4} size={24} />}
      <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>{children}</span>
    </div>
  );
};

/** A solution as a row of six blocks, `built` of them filled. */
const Blocks: React.FC<{ x: number; y: number; at: number; built: number; fill: string; line: string }> = ({ x, y, at, built, fill, line: stroke }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {Array.from({ length: 6 }, (_, i) => {
        const p = ease(frame, at + i * 3, 10);
        if (p <= 0) return null;
        const solid = i < built;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + i * (BLOCK + BLOCK_GAP),
              top: y,
              width: BLOCK,
              height: BLOCK * 0.78,
              boxSizing: "border-box",
              borderRadius: 8,
              border: `2.2px ${solid ? "solid" : "dashed"} ${solid ? stroke : HAIRLINE}`,
              background: solid ? fill : PAPER,
              opacity: p,
              transform: `scale(${0.85 + 0.15 * p})`,
            }}
          />
        );
      })}
    </>
  );
};

/**
 * Question 1: what an AI-allowed round grades. Whether you drove (the steering
 * wheel), in Canva's words and in Google's three skills; then the page's
 * five signals, ticked in green as each is named, beside its four red flags;
 * then the prep guide's advice, drawn: part of a solution built by hand and
 * explained, beside a whole one that can't be, struck.
 */
export const GradeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("grade").from;
  const qAt = n.word("grade", "Question one");
  const textAt = n.word("grade", "In an AI-allowed round");
  const notAt = n.word("grade", "Not whether working code exists");
  const endAt = n.word("grade", "at the end");
  const droveAt = n.word("grade", "Whether you drove");
  const canvaAt = n.word("grade-canva", "Canva's write-up");
  const quoteAt = n.word("grade-canva", "didn't just prompt AI");
  const struggledAt = n.word("grade-canva", "The ones who struggled");
  const steerAt = n.word("grade-canva", "the judgment to steer the tool");
  const abilityAt = n.word("grade-canva", "not the ability to code");
  const googleAt = n.word("grade-canva", "Google's twenty twenty-six pilot rubric");
  const skills = [
    { text: "writing prompts", at: n.word("grade-canva", "writing prompts") },
    { text: "validating the output", at: n.word("grade-canva", "validating the output") },
    { text: "debugging", at: n.word("grade-canva", "and debugging") },
  ];
  const signalsAt = n.word("grade-signals", "What scores well");
  const signals = [
    { text: "You plan before you prompt", at: n.word("grade-signals", "you plan before you prompt") },
    { text: "You break the work into small, well-specified requests", at: n.word("grade-signals", "You break the work") },
    { text: "You read every line it writes", at: n.word("grade-signals", "You read every line") },
    { text: "You run it, test it and probe the edges", at: n.word("grade-signals", "You run it") },
    { text: "When it's wrong, you say so", at: n.word("grade-signals", "And when it's wrong") },
  ];
  const redAt = n.word("grade-red", "The red flags");
  const flags = [
    { text: "Accepting code you can't explain", at: n.word("grade-red", "accepting code you can't explain") },
    { text: "Letting the assistant choose the design", at: n.word("grade-red", "letting the assistant choose the design") },
    { text: "Long silences while it generates", at: n.word("grade-red", "long silences") },
    { text: "Prompting for things faster to type", at: n.word("grade-red", "prompting for things") },
  ];
  const guideAt = n.word("grade-past", "One prep guide's advice");
  const partAt = n.word("grade-past", "solve part of the problem by hand");
  const presentAt = n.word("grade-past", "than to present a solution");
  const cantAt = n.word("grade-past", "you can't explain");
  const end = n.beat("grade-past").to;

  const pastY = y(PAST_Y);
  const blocksW = 6 * BLOCK + 5 * BLOCK_GAP;
  const strike = ease(frame, cantAt + 6, 12);

  return (
    <AbsoluteFill>
      <Sfx name="el-scratch" at={endAt + 4} level={-33} />
      <Sfx name="el-pop" at={droveAt} level={-30} />
      <Sfx name="el-whoosh" at={canvaAt} level={-37} />
      {skills.map((s) => (
        <Sfx key={s.text} name="el-tap" at={s.at} level={-34} />
      ))}
      {[...signals, ...flags].map((s) => (
        <Sfx key={s.text} name="el-tap" at={s.at + 4} level={-35} />
      ))}
      <Sfx name="el-pencil" at={partAt} level={-35} />
      <Sfx name="el-scratch" at={cantAt + 6} level={-31} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} size={58} width={1300}>
          In an AI-allowed round, what are interviewers actually grading?
        </QuestionCard>

        {/* Whether you drove. */}
        <Clear at={signalsAt - 8}>
          <Ink at={notAt - 2} dur={16} style={{ left: X0, top: y(306) }}>
            <span style={line(30, INK_SOFT)}>
              <Strike at={endAt + 4}>Not whether working code exists at the end.</Strike>
            </span>
          </Ink>
          <Ink at={droveAt - 2} dur={14} style={{ left: X0 + 660, top: y(306) }}>
            <span style={{ ...line(30, INK), fontWeight: 500 }}>
              Whether <Mark at={droveAt + 6}>you drove.</Mark>
            </span>
          </Ink>
          <Spot id="be-ai-round-steering-wheel" at={droveAt} left={1590} top={y(150)} width={190} height={181} />

          {/* Canva's write-up, as a pull quote with its source. */}
          <Ink at={canvaAt} dur={18} style={{ left: X0, top: y(398), width: 1330 }}>
            <div style={{ ...body(34, true), color: INK, lineHeight: 1.22 }}>
              The strong candidates{" "}
              <span style={{ opacity: ease(frame, quoteAt - 2, 12) }}>&ldquo;didn&rsquo;t just prompt AI and accept whatever it generated.&rdquo;</span>
            </div>
          </Ink>
          <Note at={canvaAt + 10} x={X0} y={y(452)}>
            <span style={{ ...label(24, INK_SOFT), whiteSpace: "nowrap" }}>Canva&apos;s write-up of its first AI-assisted interviews, June 2025</span>
          </Note>
          <Note at={struggledAt} x={X0} y={y(548)}>
            <span style={line(28, INK)}>
              The ones who struggled lacked <Mark at={steerAt + 4}>the judgment to steer the tool</Mark>
              <span style={{ opacity: ease(frame, abilityAt - 2, 10) }}>, not the ability to code.</span>
            </span>
          </Note>
          <Note at={googleAt} x={X0} y={y(636)}>
            <span style={{ ...label(24, INK), fontWeight: 500, whiteSpace: "nowrap" }}>
              Google pilot rubric, 2026: <span style={{ fontWeight: 500 }}>the same three skills</span>
            </span>
          </Note>
          <div style={{ position: "absolute", left: X0, top: y(676), display: "flex", alignItems: "baseline", gap: 18, fontSize: 28 }}>
            {skills.map((s, i) => {
              const p = ease(frame, s.at - 2, 12);
              return (
                <React.Fragment key={s.text}>
                  {i > 0 ? <span style={{ ...note(28, INK_SOFT), opacity: p }}>·</span> : null}
                  <span style={{ ...note(28, INK), fontWeight: 500, whiteSpace: "nowrap", opacity: p, transform: `translateY(${(1 - p) * 10}px)` }}>{s.text}</span>
                </React.Fragment>
              );
            })}
          </div>
        </Clear>

        {/* What scores well, and the red flags. */}
        <Ink at={signalsAt - 2} dur={12} style={{ left: X0, top: y(ROW_Y - 54) }}>
          <span style={{ ...label(24, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>What scores well</span>
        </Ink>
        {signals.map((s, i) => (
          <Row key={s.text} x={X0} y={y(ROW_Y + i * ROW_H)} at={s.at} ok dim={guideAt}>
            {s.text}
          </Row>
        ))}
        <Ink at={redAt - 2} dur={12} style={{ left: RED_X, top: y(ROW_Y - 54) }}>
          <span style={{ ...label(24, ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap" }}>Red flags</span>
        </Ink>
        {flags.map((s, i) => (
          <Row key={s.text} x={RED_X} y={y(ROW_Y + i * ROW_H)} at={s.at} ok={false} dim={guideAt}>
            {s.text}
          </Row>
        ))}

        <ColumnRule x={RULE_X} top={y(ROW_Y - 54)} height={y(ROW_Y + 4 * ROW_H) + 34 - y(ROW_Y - 54)} at={redAt} dim={guideAt} />
        <ColumnRule x={RULE_X} top={pastY} height={BLOCK * 0.78 + h(18) + 32} at={presentAt} />

        {/* One prep guide's advice: part of it by hand, explained, beats a
            whole solution you can't explain. */}
        <Note at={guideAt} x={X0} y={pastY - h(56)}>
          <span style={{ ...label(24, INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            One prep guide&apos;s advice <span style={{ color: INK_SOFT, fontWeight: 500 }}>(interviewing.io)</span>
          </span>
        </Note>
        <Blocks x={X0} y={pastY} at={partAt} built={3} fill={`color-mix(in srgb, ${OK} 22%, ${PAPER})`} line={OK} />
        <Note at={partAt + 12} x={X0} y={pastY + BLOCK * 0.78 + h(18)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            part of it, by hand: <b style={{ color: OK_INK }}>explained</b>
          </span>
        </Note>
        <Blocks x={RED_X} y={pastY} at={presentAt} built={6} fill={`color-mix(in srgb, ${INK_SOFT} 18%, ${PAPER})`} line={INK_SOFT} />
        <div
          style={{
            position: "absolute",
            left: RED_X - 10,
            top: pastY + BLOCK * 0.39 - 2,
            width: (blocksW + 20) * strike,
            height: 4,
            borderRadius: 2,
            background: ACCENT,
            transform: "rotate(-2deg)",
            transformOrigin: "0 50%",
            opacity: strike > 0 ? 1 : 0,
          }}
        />
        <Note at={cantAt} x={RED_X} y={pastY + BLOCK * 0.78 + h(18)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            a whole solution: <b style={{ color: ACCENT_INK }}>can&apos;t explain</b>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
