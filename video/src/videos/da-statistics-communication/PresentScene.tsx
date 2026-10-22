import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, HAIRLINE, INK, INK_SOFT, PAPER, TABULAR, headline, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { SANS } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { at, Drift, Mark, OK_INK, pulse, type Scale, Strike, Svg, X0 } from "./parts";

/** The page's own example: a lift of about 12%, between 8% and 16%. */
const LIFT = { point: 12, lo: 8, hi: 16, precise: "12.37" };
const SLIDE = { x: 1040, y: 330, w: 760, h: 430 };
const LIST_Y = 330;
const PITCH = 62;

type Item = { text: React.ReactNode; at: number };

/** A list down the left, each line ticked as it is said. */
const Checklist: React.FC<{ items: readonly Item[]; top: number; pitch: number; out?: number }> = ({ items, top, pitch, out }) => {
  const frame = useCurrentFrame();
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (o >= 1) return null;
  return (
    <>
      {items.map((it, i) => {
        const p = ease(frame, it.at - 2, 12);
        if (p <= 0) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: X0,
              top: top + i * pitch,
              display: "flex",
              alignItems: "center",
              gap: 16,
              opacity: p * (1 - o),
              transform: `translateX(${(1 - p) * -14}px)`,
            }}
          >
            <Tick at={it.at + 4} size={26} />
            <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>{it.text}</span>
          </div>
        );
      })}
    </>
  );
};

/**
 * Questions 8, 9 and 10 on one finding, the page's own: customers who saw a
 * new design were 12% more likely to buy, the lift between 8% and 16%. A
 * slide builds on the right as question 8 lists what goes on it; question 9
 * turns the jargon into a sentence; question 10 states what the number
 * rests on and rounds away the false precision.
 */
export const PresentScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("present").from;
  const qAt = n.word("present", "Question");
  const textAt = n.word("present", "How do you present");
  const leadAt = n.word("present-lead", "Lead with the answer");
  const methodAt = n.word("present-lead", "not the method");
  const titleAt = n.word("present-lead", "takeaway in the title");
  const chartAt = n.word("present-lead", "one clear chart");
  const caveatAt = n.word("present-close", "Say the caveats plainly");
  const refundsAt = n.word("present-close", "this excludes refunds");
  const recommendAt = n.word("present-close", "what you recommend");
  const appendixAt = n.word("present-close", "goes in the appendix");
  const q9At = n.word("plain", "Question nine");
  const q9TextAt = n.word("plain", "How do you explain");
  const anchorAt = n.word("plain", "Anchor it");
  const twelveAt = n.word("plain", "twelve percent more likely");
  const jargonAt = n.word("plain-jargon", "Drop the jargon");
  const insteadAt = n.word("plain-jargon", "Instead of");
  const sayAt = n.word("plain-jargon", "we're highly confident");
  const rangeAt = n.word("plain-jargon", "between eight and sixteen");
  const tieAt = n.word("plain-jargon", "tie it to the decision");
  const q10At = n.word("uncertain", "Question ten");
  const q10TextAt = n.word("uncertain", "How do you communicate");
  const restsAt = n.word("uncertain", "what the number rests on");
  const daysAt = n.word("uncertain", "the last ninety days");
  const pointAt = n.word("uncertain", "Give a range");
  const assumeAt = n.word("uncertain", "Name the assumptions");
  const preciseAt = n.word("uncertain-precise", "falsely precise");
  const twelveThreeAt = n.word("uncertain-precise", "Twelve point three seven");
  const aboutAt = n.word("uncertain-precise", "is about twelve");
  const end = n.beat("uncertain-precise").to;

  // The slide.
  const sx = SLIDE.x;
  const sy = y(SLIDE.y);
  const sw = SLIDE.w;
  const sh = h(SLIDE.h);
  const slideP = ease(frame, titleAt - 8, 16);
  const pad = 40;
  const axis: Scale = { lo: 0, hi: 20, a: sx + pad + 20, b: sx + sw - pad - 20 };
  const chartY = sy + h(210);
  const chartP = ease(frame, chartAt, 18);
  const rangeP = ease(frame, chartAt + 10, 16);
  const swell = 1 + 0.35 * pulse(frame, rangeAt, 20) + 0.35 * pulse(frame, pointAt, 20);
  const out8 = q9At - 4;
  const out9 = q10At - 4;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={titleAt} level={-34} />
      <Sfx name="el-pencil" at={chartAt} level={-34} />
      <Sfx name="el-tap" at={recommendAt} level={-34} />
      <Sfx name="el-scratch" at={insteadAt + 4} level={-32} />
      <Sfx name="el-pop" at={sayAt + 4} level={-32} />
      <Sfx name="el-scratch" at={twelveThreeAt + 6} level={-32} />
      <Sfx name="el-pop" at={aboutAt + 2} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={8} at={qAt - 4} textAt={textAt - 4} out={out8} size={60}>
          How do you present a finding to a non-technical stakeholder?
        </QuestionCard>
        <QuestionCard n={9} at={q9At} textAt={q9TextAt - 2} out={out9} size={60}>
          How do you explain a complex statistical finding in plain language?
        </QuestionCard>
        <QuestionCard n={10} at={q10At} textAt={q10TextAt - 2} size={60}>
          How do you communicate uncertainty in a data finding?
        </QuestionCard>

        {/* ── The slide ── */}
        {/* The appendix, behind the slide. */}
        <div
            style={{
              position: "absolute",
              left: sx + 36,
              top: sy + 36,
              width: sw,
              height: sh,
              border: `1.5px solid ${HAIRLINE}`,
              borderRadius: 10,
              background: PAPER,
              opacity: ease(frame, appendixAt - 4, 14),
              transform: `translate(${(1 - ease(frame, appendixAt - 4, 14)) * -24}px, ${(1 - ease(frame, appendixAt - 4, 14)) * -24}px)`,
            }}
          >
            <div style={{ position: "absolute", right: 22, bottom: 14, ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>Appendix: the method</div>
          </div>
        <div
          style={{
            position: "absolute",
            left: sx,
            top: sy,
            width: sw,
            height: sh,
            boxSizing: "border-box",
            border: `1.5px solid ${HAIRLINE}`,
            borderRadius: 10,
            background: PAPER,
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            opacity: slideP,
            transform: `translateY(${(1 - slideP) * 16}px)`,
          }}
        />
        <Note at={titleAt - 2} x={sx + pad} y={sy + h(34)} width={sw - 2 * pad}>
          <span style={{ ...headline(38) }}>
            The new design lifts purchases by about {LIFT.point}%
          </span>
        </Note>
        <Svg opacity={chartP}>
          <line x1={axis.a} x2={axis.a + (axis.b - axis.a) * chartP} y1={chartY + 40} y2={chartY + 40} stroke={INK} strokeWidth={1.5} />
          {[0, 5, 10, 15, 20].map((t) => (
            <g key={t}>
              <line x1={at(axis, t)} x2={at(axis, t)} y1={chartY + 40} y2={chartY + 47} stroke={INK} strokeWidth={1.2} />
              <text
                x={at(axis, t)}
                y={chartY + 70}
                textAnchor="middle"
                style={{ fontFamily: SANS, fontSize: 19, fontWeight: 500, fill: INK_SOFT, fontVariantNumeric: "tabular-nums" }}
              >
                {t}%
              </text>
            </g>
          ))}
          <line
            x1={at(axis, LIFT.lo)}
            x2={at(axis, LIFT.lo) + (at(axis, LIFT.hi) - at(axis, LIFT.lo)) * rangeP}
            y1={chartY}
            y2={chartY}
            stroke={BAR}
            strokeWidth={10 * swell}
            strokeLinecap="round"
            opacity={0.45}
          />
          <circle cx={at(axis, LIFT.point)} cy={chartY} r={13 * Math.min(1, rangeP * 1.4)} fill={BAR} />
        </Svg>
        <Note at={chartAt + 12} x={at(axis, LIFT.point) - 200} width={400} y={chartY - h(56)} from="up" style={{ textAlign: "center" }}>
          <span style={{ ...label(21, INK), whiteSpace: "nowrap", ...TABULAR }}>
            lift in purchases: {LIFT.lo}% to {LIFT.hi}%
          </span>
        </Note>
        <Note at={refundsAt - 2} x={sx + pad} y={sy + sh - h(118)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            Excludes refunds.<span style={{ opacity: ease(frame, daysAt - 2, 10) }}> Based on the last 90 days.</span>
          </span>
        </Note>
        <Note at={recommendAt - 2} x={sx + pad} y={sy + sh - h(76)}>
          <span style={{ ...note(25, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            <Mark at={tieAt + 4} out={q10At}>
              Recommendation: ship the new design to everyone.
            </Mark>
          </span>
        </Note>

        {/* ── Question 8: what goes on it ── */}
        <Checklist
          top={y(LIST_Y)}
          pitch={h(PITCH)}
          out={out8}
          items={[
            {
              at: leadAt,
              text: (
                <>
                  Lead with the answer,{" "}
                  <span style={{ opacity: ease(frame, methodAt - 2, 10) }}>
                    not the <Strike at={methodAt + 4}>method</Strike>
                  </span>
                </>
              ),
            },
            { at: titleAt, text: "The takeaway is the title" },
            { at: chartAt, text: "One clear chart, not a table" },
            { at: caveatAt, text: "Caveats, said plainly" },
            { at: recommendAt, text: "End with a recommendation" },
            { at: appendixAt, text: "The method: in the appendix" },
          ]}
        />

        {/* ── Question 9: a number people can picture, in plain words ── */}
        <Note at={anchorAt - 2} x={X0} y={y(LIST_Y)} out={out9} width={860}>
          <span style={{ ...note(30, INK) }}>
            &ldquo;Customers who saw the new design were{" "}
            <Mark at={twelveAt}>
              {LIFT.point}% more likely to buy
            </Mark>
            .&rdquo;
          </span>
        </Note>
        <Note at={jargonAt - 2} x={X0} y={y(LIST_Y) + h(130)} out={out9}>
          <span style={{ ...note(28, ACCENT_INK), whiteSpace: "nowrap", ...TABULAR }}>
            <Strike at={insteadAt + 4}>
              95% confidence interval: [{LIFT.lo}%, {LIFT.hi}%]
            </Strike>
          </span>
        </Note>
        <Note at={sayAt - 2} x={X0} y={y(LIST_Y) + h(200)} out={out9} width={860}>
          <span style={{ ...note(30, OK_INK), fontWeight: 600 }}>
            &ldquo;We&apos;re highly confident the true lift is between {LIFT.lo}% and {LIFT.hi}%.&rdquo;
          </span>
        </Note>
        <Note at={tieAt - 2} x={X0} y={y(LIST_Y) + h(330)} out={out9}>
          <span style={{ ...note(26, INK_SOFT), whiteSpace: "nowrap" }}>then tie it to the decision →</span>
        </Note>

        {/* ── Question 10: what it rests on, and no false precision ── */}
        <Checklist
          top={y(LIST_Y)}
          pitch={h(PITCH)}
          items={[
            { at: restsAt, text: "What it rests on: the last 90 days" },
            { at: pointAt, text: "A range, not just a point" },
            { at: assumeAt, text: "The assumptions, and how far it moves" },
          ]}
        />
        <Note at={preciseAt - 2} x={X0} y={y(LIST_Y) + 3 * h(PITCH) + h(40)}>
          <span style={{ ...note(26, INK_SOFT), whiteSpace: "nowrap" }}>no false precision:</span>
        </Note>
        <Note at={twelveThreeAt - 2} x={X0} y={y(LIST_Y) + 3 * h(PITCH) + h(86)}>
          <span style={{ ...note(34, ACCENT_INK), fontWeight: 600, whiteSpace: "nowrap", ...TABULAR }}>
            <Strike at={twelveThreeAt + 8}>{LIFT.precise}% lift</Strike>
          </span>
        </Note>
        <Note at={aboutAt - 2} x={X0 + 300} y={y(LIST_Y) + 3 * h(PITCH) + h(86)}>
          <span style={{ ...note(34, OK_INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>
            about {LIFT.point}% ({LIFT.lo}% to {LIFT.hi}%)
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
