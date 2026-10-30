import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, PAPER, TABULAR, headline, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { DASHBOARD } from "./data";
import { Drift, LineSet, PanelTitle, Verdict, YTicks } from "./parts";

const GRID = { x: 200, y: 340, w: 168, hgt: 128, gap: 14 };
const CREEP = { x0: 1100, x1: 1660, base: 760, top: 440, hi: 45 };
const CARD = { y: 360, w: 620, hgt: 310 };
const CARDS_X = [220, 1080];

/**
 * Questions 11 and 12. A dashboard grid whose key metric is made the biggest
 * tile, top left, then shaded by the page's reading-order chart. Those shares
 * are a model of the shape, not a measurement (the chart spec says so), so the
 * grid shows the shape only, darker where the model puts more attention, and
 * says it is a model: no share or ratio from it is printed or spoken. Panels
 * added against panels opened over two years: 41 against 6. Then a dashboard
 * and a report side by side, by what each is for and what each drives.
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
  const modelAt = n.word("dash-attn", "a simple model of reading order");
  const fasterAt = n.word("dash-attn", "falls faster down the page");
  const severalAt = n.word("dash-attn", "worth several");
  const consistentAt = n.word("dash-keep", "Keep scales and colors consistent");
  const freshAt = n.word("dash-keep", "how fresh the data is");
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
  const decisionsAt = n.word("report-use", "Dashboards drive day-to-day decisions");
  const deeperAt = n.word("report-use", "reports drive deeper analysis");
  const end = n.beat("story-in").to;

  const out11 = q12At - 4;
  const D = DASHBOARD;
  const maxShare = Math.max(...D.cells.map((c) => c.share));
  const slotShare = (r: number, c: number) => D.cells.find((d) => d.r === r && d.c === c)!.share / maxShare;
  const cellX = (c: number) => GRID.x + c * (GRID.w + GRID.gap);
  const cellY = (r: number) => y(GRID.y) + r * h(GRID.hgt + GRID.gap);
  // "Biggest and top left": the key metric widens across two slots, and the
  // rest of its row moves along one, the last slot of it giving way.
  const big = ease(frame, biggestAt, 16);
  const shade = ease(frame, modelAt, 20);
  // "That's where eyes land": the key metric, ringed while the narration is on it.
  const ring = ease(frame, eyesAt - 2, 12) * (1 - ease(frame, consistentAt - 4, 12));
  const months = D.added.map((_, i) => (i % 6 === 5 ? String(i + 1) : ""));
  const cBase = y(CREEP.base);
  const cTop = y(CREEP.top);
  const lastY = (v: number) => cBase - (v / CREEP.hi) * (cBase - cTop);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={onlyAt} level={-34} />
      <Sfx name="el-pop" at={biggestAt} level={-32} />
      <Sfx name="el-tap" at={severalAt} level={-34} />
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

        {/* ── Question 11: the key metric biggest and top left, then the model's shape ── */}
        {D.cells.map((c, i) => {
          const lead = c.r === 0 && c.c === 0;
          // Row 0 moves along one slot as the key metric widens; its last slot goes.
          const moves = c.r === 0 && c.c > 0;
          const gone = c.r === 0 && c.c === 3 ? big : 0;
          const p = ease(frame, onlyAt + i * 1.5, 10) * (1 - ease(frame, out11, 10)) * (1 - gone);
          if (p <= 0) return null;
          const col = moves ? c.c + big : c.c;
          // Shaded by the slot it ends up in.
          const share = lead ? 1 : slotShare(c.r, Math.min(3, moves ? c.c + 1 : c.c));
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: cellX(col),
                top: cellY(c.r),
                width: lead ? GRID.w + big * (GRID.w + GRID.gap) : GRID.w,
                height: h(GRID.hgt),
                boxSizing: "border-box",
                border: `1.5px solid ${HAIRLINE}`,
                borderRadius: 8,
                background: `color-mix(in srgb, ${BAR} ${8 + 70 * share * shade}%, ${PAPER})`,
                boxShadow: lead && ring > 0 ? `0 0 0 ${5 * ring}px ${HIGHLIGHT}` : undefined,
                opacity: p,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {lead ? <span style={{ ...headline(22 + 12 * big), color: INK, whiteSpace: "nowrap" }}>key metric</span> : null}
            </div>
          );
        })}
        <Note at={modelAt} x={GRID.x} y={cellY(3) + h(4)} out={out11}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>darker: more attention, in a simple model, not a measurement</span>
        </Note>
        <Note at={fasterAt - 2} x={GRID.x} y={cellY(3) + h(42)} out={out11}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            attention falls faster <b>down</b> the page than across it
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
          {
            title: "Dashboard",
            at: dashAt,
            lines: [
              { at: dashAt + 6, text: "a living view, for monitoring" },
              { at: nowAt, text: "“What's happening now?”" },
              { at: decisionsAt + 4, text: "drives day-to-day decisions", strong: true },
            ],
          },
          {
            title: "Report",
            at: reportAt,
            lines: [
              { at: reportAt + 6, text: "answers one question" },
              { at: narrativeAt, text: "narrative and context" },
              { at: topAt, text: "read from top to bottom" },
              { at: deeperAt, text: "drives deeper analysis", strong: true },
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
                <div key={l.text} style={{ ...note(28, INK), fontWeight: "strong" in l ? 650 : undefined, marginTop: 22, opacity: ease(frame, l.at - 2, 12), whiteSpace: "nowrap" }}>
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
