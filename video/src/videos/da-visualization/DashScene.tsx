import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, PAPER, TABULAR, fmt, headline, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { DASHBOARD } from "./data";
import { Drift, LineSet, PanelTitle, Verdict, YTicks } from "./parts";

const GRID = { x: 200, y: 340, w: 168, hgt: 128, gap: 14 };
const CREEP = { x0: 1100, x1: 1660, base: 760, top: 440, hi: 45 };
const CARD = { y: 360, w: 620, hgt: 290 };
const CARDS_X = [220, 1080];

/**
 * Questions 11 and 12. A twelve-slot dashboard shaded by the share of
 * attention each slot gets, from the page's reading-order chart: 20% top left
 * down to 2% bottom right, about 8 times apart. Panels added against panels
 * opened over two years: 41 against 6. Then a dashboard and a report side by
 * side, by what each is for.
 */
export const DashScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("dash").from;
  const qAt = n.word("dash", "Question");
  const textAt = n.word("dash", "What makes a dashboard");
  const onlyAt = n.word("dash", "Only the metrics people act on");
  const biggestAt = n.word("dash", "biggest and top left");
  const eyesAt = n.word("dash-attn", "where eyes land");
  const fadesAt = n.word("dash-attn", "attention fades");
  const eightAt = n.word("dash-attn", "about eight times");
  const consistentAt = n.word("dash-attn", "Keep scales and colors consistent");
  const freshAt = n.word("dash-attn", "how fresh the data is");
  const cutAt = n.word("dash-creep", "cut what doesn't earn its place");
  const addedAt = n.word("dash-creep", "panels only ever get added");
  const fortyAt = n.word("dash-creep", "forty-one panels");
  const sixAt = n.word("dash-creep", "six of them get opened");
  const q12At = n.word("report", "Question twelve");
  const q12TextAt = n.word("report", "What's the difference");
  const dashAt = n.word("report", "A dashboard is a living view");
  const nowAt = n.word("report", "what's happening now");
  const reportAt = n.word("report", "A report answers one question");
  const narrativeAt = n.word("report", "with narrative and context");
  const topAt = n.word("report", "read from top to bottom");
  const end = n.beat("story-in").to;

  const out11 = q12At - 4;
  const D = DASHBOARD;
  const maxShare = Math.max(...D.cells.map((c) => c.share));
  const first = D.cells[0];
  const last = D.cells[D.cells.length - 1];
  const cellX = (c: number) => GRID.x + c * (GRID.w + GRID.gap);
  const cellY = (r: number) => y(GRID.y) + r * h(GRID.hgt + GRID.gap);
  const shade = ease(frame, fadesAt, 20);
  const months = D.added.map((_, i) => (i % 6 === 5 ? String(i + 1) : ""));
  const cBase = y(CREEP.base);
  const cTop = y(CREEP.top);
  const lastY = (v: number) => cBase - (v / CREEP.hi) * (cBase - cTop);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={onlyAt} level={-34} />
      <Sfx name="el-pop" at={eightAt} level={-32} />
      <Sfx name="el-pencil" at={addedAt} level={-34} />
      <Sfx name="el-scratch" at={sixAt} level={-32} />
      <Sfx name="el-tap" at={dashAt} level={-34} />
      <Sfx name="el-tap" at={reportAt} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={11} at={qAt - 4} textAt={textAt - 4} out={out11} size={60}>
          What makes a dashboard effective?
        </QuestionCard>
        <QuestionCard n={12} at={q12At} textAt={q12TextAt - 2} size={60}>
          What&apos;s the difference between a dashboard and a report?
        </QuestionCard>

        {/* ── Question 11: where attention goes ── */}
        {D.cells.map((c, i) => {
          const p = ease(frame, onlyAt + i * 1.5, 10) * (1 - ease(frame, out11, 10));
          if (p <= 0) return null;
          const lead = c.r === 0 && c.c === 0;
          const share = c.share / maxShare;
          const big = lead ? ease(frame, biggestAt, 12) : 0;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: cellX(c.c),
                top: cellY(c.r),
                width: GRID.w,
                height: h(GRID.hgt),
                boxSizing: "border-box",
                border: `1.5px solid ${HAIRLINE}`,
                borderRadius: 8,
                background: `color-mix(in srgb, ${BAR} ${8 + 70 * share * shade}%, ${PAPER})`,
                opacity: p,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {lead ? (
                <span style={{ ...headline(20 + 6 * big), color: INK, whiteSpace: "nowrap" }}>key metric</span>
              ) : null}
              <span style={{ ...label(20, share * shade > 0.55 ? PAPER : INK), opacity: shade, ...TABULAR }}>
                {fmt(c.share * 100, 0)}%
              </span>
            </div>
          );
        })}
        <Note at={eyesAt} x={GRID.x} y={cellY(3) + h(4)} out={out11}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>share of attention by slot</span>
        </Note>
        <Note at={eightAt - 2} x={GRID.x} y={cellY(3) + h(42)} out={out11}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap", ...TABULAR }}>
            top left {fmt(first.share * 100, 0)}%, bottom right {fmt(last.share * 100, 0)}%: about <b>{D.ratio}×</b>
          </span>
        </Note>
        <Note at={consistentAt} x={GRID.x} y={cellY(3) + h(82)} out={out11}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
            consistent scales and colors<span style={{ opacity: ease(frame, freshAt - 2, 10) }}>, and how fresh the data is</span>
          </span>
        </Note>

        <PanelTitle x={CREEP.x0} y={cTop - h(64)} at={cutAt - 2} out={out11}>
          Panels over {D.months} months
        </PanelTitle>
        <YTicks ticks={[0, 15, 30, 45]} x={CREEP.x0} base={cBase} top={cTop} lo={0} hi={CREEP.hi} at={addedAt - 4} out={out11} />
        <LineSet values={D.added} x0={CREEP.x0} x1={CREEP.x1} base={cBase} top={cTop} lo={0} hi={CREEP.hi} at={addedAt - 2} color={ACCENT} dots={false} labels={months} out={out11} edges />
        <LineSet values={D.used} x0={CREEP.x0} x1={CREEP.x1} base={cBase} top={cTop} lo={0} hi={CREEP.hi} at={fortyAt} color={BAR} dots={false} axis={false} out={out11} edges />
        <Note at={fortyAt + 4} x={CREEP.x1 + 14} y={lastY(D.added.at(-1)!) - 14} out={out11}>
          <span style={{ ...label(21, ACCENT_INK), whiteSpace: "nowrap", ...TABULAR }}>{D.added.at(-1)} added</span>
        </Note>
        <Note at={sixAt} x={CREEP.x1 + 14} y={lastY(D.used.at(-1)!) - 14} out={out11}>
          <span style={{ ...label(21, BLUE_INK), whiteSpace: "nowrap", ...TABULAR }}>{D.used.at(-1)} opened</span>
        </Note>
        <Verdict ok x={CREEP.x0} y={cBase + h(50)} at={cutAt} out={out11}>
          cut what doesn&apos;t earn its place
        </Verdict>

        {/* ── Question 12: what each is for ── */}
        {[
          { title: "Dashboard", at: dashAt, lines: [{ at: dashAt + 6, text: "a living view, for monitoring" }, { at: nowAt, text: "“What's happening now?”" }] },
          {
            title: "Report",
            at: reportAt,
            lines: [
              { at: reportAt + 6, text: "answers one question" },
              { at: narrativeAt, text: "narrative and context" },
              { at: topAt, text: "read from top to bottom" },
            ],
          },
        ].map((card, k) => {
          const p = ease(frame, card.at - 4, 14);
          if (p <= 0) return null;
          const x = CARDS_X[k];
          return (
            <div
              key={card.title}
              style={{
                position: "absolute",
                left: x,
                top: y(CARD.y),
                width: CARD.w,
                height: h(CARD.hgt),
                boxSizing: "border-box",
                border: `1.5px solid ${HAIRLINE}`,
                borderRadius: 12,
                padding: "28px 34px",
                background: PAPER,
                opacity: p,
                transform: `translateY(${(1 - p) * 14}px)`,
              }}
            >
              <div style={{ ...headline(44), color: INK }}>{card.title}</div>
              {card.lines.map((l) => (
                <div key={l.text} style={{ ...note(28, INK), marginTop: 22, opacity: ease(frame, l.at - 2, 12), whiteSpace: "nowrap" }}>
                  {l.text}
                </div>
              ))}
            </div>
          );
        })}
      </Drift>
    </AbsoluteFill>
  );
};
