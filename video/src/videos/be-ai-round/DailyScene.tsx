import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, HAIRLINE, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Ink, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { METR } from "./data";
import { Clear, Drift, line, Mark, Spot, Strike, X0 } from "./parts";

const BIN_Y = 372;
const BIN_W = 392;
const BIN_GAP = 20;
/** METR's two results, on one axis of time taken: zero, and a percent in px. */
const ZERO = 800;
const PCT = 18;
const MEASURED_V = 452;
const FELT_V = 552;
const BAR_H = 64;

/** The page's two numbers, as it gives them: 19% longer, about 20% faster. */
const MEASURED = METR.measured;
const FELT = METR.felt;

/**
 * Question 7, the behavioral one. A vague answer struck; then the concrete
 * workflow as four bins that fill as they are read (what you hand over, what
 * you keep, how you verify, the time it was wrong). Then measuring rather
 * than assuming: METR's 2025 trial as two bars on opposite sides of zero,
 * 19% longer measured and about 20% faster felt, the gap between them
 * bracketed as the lesson that lasts, with METR's caveat about early-2025
 * tools.
 */
export const DailyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("daily").from;
  const qAt = n.word("daily", "Question seven");
  const textAt = n.word("daily", "How do you use AI tools");
  const vagueAt = n.word("daily", "A vague answer");
  const copilotAt = n.word("daily", "like I use Copilot a lot");
  const poorlyAt = n.word("daily", "scores poorly");
  const concreteAt = n.word("daily-concrete", "Give a concrete workflow");
  const bins = [
    {
      title: "Hand it",
      at: n.word("daily-concrete", "What you hand to the assistant"),
      items: [
        { text: "boilerplate", at: n.word("daily-concrete", "boilerplate") },
        { text: "test scaffolding", at: n.word("daily-concrete", "test scaffolding") },
        { text: "unfamiliar APIs", at: n.word("daily-concrete", "unfamiliar APIs") },
        { text: "first drafts", at: n.word("daily-concrete", "first drafts") },
      ],
    },
    {
      title: "Keep it",
      at: n.word("daily-concrete", "What you don't"),
      items: [
        { text: "security-sensitive code", at: n.word("daily-concrete", "security-sensitive code") },
        { text: "the core design", at: n.word("daily-concrete", "the core design") },
      ],
    },
    {
      title: "Verify",
      at: n.word("daily-concrete", "How you verify what it writes"),
      items: [{ text: "how you check what it writes", at: n.word("daily-concrete", "How you verify what it writes") + 8 }],
    },
    {
      title: "The time it was wrong",
      at: n.word("daily-concrete", "one specific time it was wrong"),
      items: [
        { text: "one specific time", at: n.word("daily-concrete", "one specific time it was wrong") + 6 },
        { text: "and how you caught it", at: n.word("daily-concrete", "how you caught it") },
      ],
    },
  ];
  const measureAt = n.word("daily-metr", "you measure rather than assume");
  const metrAt = n.word("daily-metr", "In METR's twenty twenty-five randomized trial");
  const longerAt = n.word("daily-metr", "took nineteen percent longer");
  const allowedAt = n.word("daily-metr", "on tasks where AI was allowed");
  const estimatingAt = n.word("daily-metr", "while estimating afterward");
  const fasterAt = n.word("daily-metr", "about twenty percent faster");
  const sinceAt = n.word("daily-caveat", "METR has since said");
  const speedupAt = n.word("daily-caveat", "points toward a speedup");
  const lessonAt = n.word("daily-caveat", "The lesson that lasts");
  const gapAt = n.word("daily-caveat", "the size of the gap");
  const end = n.beat("daily-caveat").to;

  const binTop = y(BIN_Y);
  const measuredTop = y(MEASURED_V);
  const feltTop = y(FELT_V);
  const barH = h(BAR_H);
  const m = ease(frame, longerAt, 18);
  const f = ease(frame, fasterAt, 18);
  const axis = ease(frame, metrAt + 6, 14);
  const gap = ease(frame, gapAt, 16);
  const gapY = feltTop + barH + h(40);

  return (
    <AbsoluteFill>
      <Sfx name="el-scratch" at={poorlyAt} level={-32} />
      {bins.map((b) => (
        <Sfx key={b.title} name="el-pop" at={b.at} level={-34} />
      ))}
      {bins.flatMap((b) => b.items).map((it) => (
        <Sfx key={it.text} name="el-tap" at={it.at} level={-37} />
      ))}
      <Sfx name="el-whoosh" at={measureAt} level={-37} />
      <Sfx name="el-tap" at={longerAt + 10} level={-30} />
      <Sfx name="el-pop" at={fasterAt} level={-30} />
      <Sfx name="el-pencil" at={gapAt} level={-34} />
      <Sfx name="el-chime" at={gapAt + 30} level={-34} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={7} at={qAt - 4} textAt={textAt - 4} kicker="Question 7, the behavioral one" size={58}>
          How do you use AI tools in your day-to-day work?
        </QuestionCard>

        <Clear at={measureAt - 6}>
          {/* A vague answer, struck. */}
          <Note at={vagueAt} x={X0} y={y(262)}>
            <span style={line(28, INK)}>
              <span style={{ opacity: ease(frame, copilotAt - 2, 10) }}>
                <Strike at={poorlyAt}>&ldquo;I use Copilot a lot.&rdquo;</Strike>
              </span>
              <span style={{ color: ACCENT_INK, fontWeight: 700, opacity: ease(frame, poorlyAt, 10) }}> A vague answer scores poorly.</span>
            </span>
          </Note>

          {/* A concrete workflow, in four bins. */}
          <Note at={concreteAt} x={X0} y={binTop - 46}>
            <span style={{ ...label(23, INK), fontWeight: 700, whiteSpace: "nowrap" }}>A concrete workflow</span>
          </Note>
          {bins.map((b, i) => {
            const p = ease(frame, b.at - 2, 12);
            if (p <= 0) return null;
            return (
              <div
                key={b.title}
                style={{
                  position: "absolute",
                  left: X0 + i * (BIN_W + BIN_GAP),
                  top: binTop,
                  width: BIN_W,
                  boxSizing: "border-box",
                  borderTop: `1px solid ${HAIRLINE}`,
                  padding: "18px 0 0",
                  opacity: p,
                  transform: `translateY(${(1 - p) * 12}px)`,
                }}
              >
                <div style={{ ...note(28, INK), fontWeight: 750, marginBottom: 18, whiteSpace: "nowrap" }}>{b.title}</div>
                {b.items.map((it) => (
                  <div key={it.text} style={{ ...note(26, INK), marginBottom: 12, whiteSpace: "nowrap", opacity: ease(frame, it.at - 2, 10) }}>
                    {it.text}
                  </div>
                ))}
              </div>
            );
          })}
        </Clear>

        {/* Measure rather than assume: METR's trial. */}
        <Note at={measureAt} x={X0} y={y(262)}>
          <span style={line(28, INK)}>
            <Mark at={measureAt + 8}>Measure rather than assume.</Mark>
          </span>
        </Note>
        <Note at={metrAt} x={X0} y={y(318)}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>
            METR&apos;s 2025 randomized trial: <Num>{METR.developers}</Num> experienced open-source developers, <Num>{METR.tasks}</Num> tasks
          </span>
        </Note>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: axis }}>
          <line x1={ZERO} x2={ZERO} y1={measuredTop - h(30)} y2={feltTop + barH + h(18)} stroke={INK} strokeWidth={2} />
        </svg>
        <Note at={metrAt + 10} x={ZERO} y={measuredTop - h(30) - 34} width={0}>
          <div style={{ position: "absolute", left: -100, width: 200, ...note(20, INK_SOFT), textAlign: "center", whiteSpace: "nowrap" }}>no change</div>
        </Note>
        {/* Measured: took longer. */}
        <div style={{ position: "absolute", left: ZERO, top: measuredTop, width: MEASURED * PCT * m, height: barH, background: BAR, borderRadius: "0 6px 6px 0" }} />
        <Note at={longerAt + 8} x={ZERO + MEASURED * PCT + 18} y={measuredTop + barH / 2 - 17}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <b>
              <Num>{MEASURED}</Num>% longer
            </b>
            <span style={{ opacity: ease(frame, allowedAt, 10) }}>, measured, with AI allowed</span>
          </span>
        </Note>
        {/* Felt: faster. */}
        <div
          style={{
            position: "absolute",
            left: ZERO - FELT * PCT * f,
            top: feltTop,
            width: FELT * PCT * f,
            height: barH,
            boxSizing: "border-box",
            border: `2.5px dashed ${INK_SOFT}`,
            borderRight: "none",
            background: `color-mix(in srgb, ${INK_SOFT} 12%, ${PAPER})`,
            borderRadius: "6px 0 0 6px",
            opacity: f > 0 ? 1 : 0,
          }}
        />
        <Note at={estimatingAt} x={ZERO - FELT * PCT - 18} y={feltTop + barH / 2 - 17} align="right">
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            felt<span style={{ opacity: ease(frame, fasterAt - 2, 10) }}>
              , <b>about <Num>{FELT}</Num>% faster</b>
            </span>
          </span>
        </Note>
        <Spot id="be-ai-round-speedometer" at={fasterAt} left={1570} top={y(590)} width={160} height={159} />

        {/* The gap between the two, bracketed. */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: gap }}>
          <path
            d={`M${ZERO - FELT * PCT},${gapY - 12} L${ZERO - FELT * PCT},${gapY} L${ZERO + MEASURED * PCT},${gapY} L${ZERO + MEASURED * PCT},${gapY - 12}`}
            fill="none"
            stroke={INK}
            strokeWidth={2}
            pathLength={1}
            strokeDasharray={`${gap} 1`}
          />
        </svg>
        <Note at={gapAt + 6} x={ZERO - 260} y={gapY + 12} width={520}>
          <div style={{ ...note(24, INK), fontWeight: 700, textAlign: "center", whiteSpace: "nowrap" }}>
            <Mark at={gapAt + 12}>the gap: felt faster, measured slower</Mark>
          </div>
        </Note>
        <Note at={sinceAt} x={X0} y={y(800)}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
            METR has since said the result reflects early-2025 tools
            <span style={{ opacity: ease(frame, speedupAt - 2, 10) }}>; its later data points toward a speedup.</span>
          </span>
        </Note>
        <Ink at={lessonAt} dur={14} style={{ left: X0, top: y(846) }}>
          <span style={{ ...note(23, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            The lesson that lasts: the gap between how fast a tool feels and how fast it is.
          </span>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
