import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { NULLS } from "./data";
import { Drift, ElbowArrow, Mono, X0 } from "./parts";

const LIST_Y = 350;
const PITCH = 70;
const FIG_X = 1100;

/** A count in a box: a table's rows before or after a join. */
const Count: React.FC<{ x: number; y: number; at: number; name: string; rows: string; bad?: boolean }> = ({ x, y, at, name, rows, bad = false }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 300,
        padding: "14px 20px",
        boxSizing: "border-box",
        border: `2px solid ${bad ? ACCENT : BLUE_INK}`,
        borderRadius: 10,
        background: bad ? `color-mix(in srgb, ${ACCENT} 8%, ${PAPER})` : PAPER,
        opacity: p,
        transform: `translateY(${(1 - p) * 10}px)`,
      }}
    >
      <div style={{ ...label(20, INK_SOFT) }}>{name}</div>
      <div style={{ ...note(34, bad ? ACCENT_INK : INK), fontWeight: 700, ...TABULAR }}>{rows}</div>
    </div>
  );
};

/**
 * Question 2: the page's seven checks, ticked as they are named, with the
 * page's own fan-out illustration (10,000 orders that come out of a join as
 * 14,000 rows) drawn beside the row-count check, an example beside the
 * filter, NULL and reconcile checks (the NULL trap's 0 rows from check.mjs),
 * and the range check's example beside the last.
 */
export const CheckScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("check").from;
  const qAt = n.word("check", "Question");
  const textAt = n.word("check", "An assistant wrote a query");
  const readAt = n.word("check-read", "Read it as if");
  // The first line arrives as the question ends, so it never sits alone.
  const asked = n.beat("check").to;
  const steps = [
    { at: n.word("check-read", "State the grain"), text: "State the grain: what one row means" },
    { at: n.word("check-read", "Check row counts"), text: "Check row counts across every join" },
    { at: n.word("check-filters", "Read each filter"), text: "Read each filter against the business definition" },
    { at: n.word("check-filters", "null traps"), text: "Look for NULL traps" },
    { at: n.word("check-trust", "reconcile to a total"), text: "Reconcile to a total you trust" },
    { at: n.word("check-trust", "follow three raw rows"), text: "Follow three raw rows by hand" },
    { at: n.word("check-trust", "sanity-check the range"), text: "Sanity-check the range" },
  ];
  const tenAt = n.word("check-read", "Ten thousand orders");
  const fourteenAt = n.word("check-read", "fourteen thousand rows");
  const fanAt = n.word("check-read", "fanning out");
  const revenueAt = n.word("check-filters", "does revenue drop refunds");
  const notInAt = n.word("check-filters", "like NOT IN");
  const financeAt = n.word("check-trust", "like the finance report");
  const hundredAt = n.word("check-range", "over a hundred percent");
  const bugAt = n.word("check-range", "a bug until proven otherwise");
  const end = n.beat("check-range").to;

  const top = y(LIST_Y);
  const pitch = h(PITCH);
  // Level with step 2, and clear above step 3, whose example sits beside it.
  const figTop = top + pitch * 1 - h(32);
  /** Beside step `i`, level with its text. */
  const besideY = (i: number) => top + i * pitch + 3;

  return (
    <AbsoluteFill>
      {steps.map((s) => (
        <Sfx key={s.text} name="el-tap" at={s.at} level={-34} />
      ))}
      <Sfx name="el-scratch" at={fanAt} level={-32} />
      <Sfx name="el-scratch" at={bugAt} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={2} at={qAt - 4} textAt={textAt - 4} size={56}>
          An assistant wrote a query, and your manager wants the number today. How do you check it?
        </QuestionCard>

        <Note at={Math.min(readAt, asked) - 6} x={X0} y={top - h(56)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>read it as if a new colleague wrote it:</span>
        </Note>
        {steps.map((s, i) => {
          const p = ease(frame, s.at - 2, 12);
          if (p <= 0) return null;
          return (
            <div
              key={s.text}
              style={{
                position: "absolute",
                left: X0,
                top: top + i * pitch,
                display: "flex",
                alignItems: "center",
                gap: 16,
                opacity: p,
                transform: `translateX(${(1 - p) * -14}px)`,
              }}
            >
              <span style={{ ...label(22, INK_SOFT), width: 26, textAlign: "right", ...TABULAR }}>{i + 1}</span>
              <Tick at={s.at + 6} size={26} />
              <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>{s.text}</span>
            </div>
          );
        })}

        {/* ── The page's fan-out example, beside its check ── */}
        <Count x={FIG_X} y={figTop} at={tenAt - 2} name="orders" rows="10,000 rows" />
        <ElbowArrow
          points={[
            [FIG_X + 316, figTop + h(42)],
            [FIG_X + 380, figTop + h(42)],
          ]}
          at={fourteenAt - 4}
          color={INK_SOFT}
          width={2.4}
        />
        <Count x={FIG_X + 396} y={figTop} at={fourteenAt - 2} name="after the join" rows="14,000 rows" bad />
        {/* Above its box, so the row under it is free for step 3's example. */}
        <Note at={fanAt - 2} x={FIG_X + 396} y={figTop - h(38)}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>something is fanning out</span>
        </Note>

        {/* ── Examples for the filter, NULL and reconcile checks ── */}
        <Note at={revenueAt - 2} x={FIG_X} y={besideY(2)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>does revenue drop refunds and test accounts?</span>
        </Note>
        <Note at={notInAt - 2} x={FIG_X} y={besideY(3)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
            <Mono color={INK}>NOT IN</Mono> against a column with nulls:{" "}
            <span style={{ color: ACCENT_INK, fontWeight: 650 }}>{NULLS.notIn} rows</span>
          </span>
        </Note>
        <Note at={financeAt - 2} x={FIG_X} y={besideY(4)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>like the finance report</span>
        </Note>

        {/* ── The range check's example ── */}
        <Note at={hundredAt - 2} x={FIG_X} y={top + 6 * pitch - h(4)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            a conversion rate <span style={{ color: ACCENT_INK, fontWeight: 650 }}>over 100%</span>
          </span>
        </Note>
        <Note at={bugAt - 2} x={FIG_X} y={top + 6 * pitch + h(40)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>is a bug until proven otherwise</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
