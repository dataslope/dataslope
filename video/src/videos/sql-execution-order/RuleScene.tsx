import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { useNarration } from "../../narration/NarrationContext";
import { colors, ds } from "../../theme/brand";
import { MONO, SANS } from "../../theme/fonts";
import { STEPS } from "./data";

const LIST_X = 150;
const LIST_Y = 128;
const ITEM_H = 64;
const ITEM_GAP = 12;

/** Which steps can see the alias `total`: the rule, read off the order. */
const MARKS: Record<number, { tone: "bad" | "named" | "ok"; note: string }> = {
  2: { tone: "bad", note: "can't see total" },
  4: { tone: "bad", note: "can't see total" },
  5: { tone: "named", note: "total is named here" },
  8: { tone: "ok", note: "can see total" },
};

const TONE = {
  bad: { ring: ds("red"), fill: ds("red", 50), ink: "var(--ds-red-ink)", glyph: "✕" },
  named: { ring: ds("yellow"), fill: ds("yellow", 100), ink: "var(--ds-amber-ink)", glyph: "★" },
  ok: { ring: ds("green"), fill: ds("green", 50), ink: "var(--ds-green-ink)", glyph: "✓" },
} as const;

export const RuleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const start = n.beat("rule").from;
  const marksAt = n.word("rule", "alias");
  const readAt = n.word("rule", "read");

  return (
    <AbsoluteFill style={{ background: colors.page }}>
      {STEPS.map((s, i) => {
        const appear = pop(frame, start + i * 2, fps, 18);
        const mark = MARKS[s.step];
        const order = [5, 2, 4, 8].indexOf(s.step);
        const pMark = mark ? ease(frame, marksAt + order * 6, 10) : 0;
        const tone = mark ? TONE[mark.tone] : null;
        const ghost = s.step === 6 || s.step === 7;
        return (
          <div
            key={s.step}
            style={{
              position: "absolute",
              left: LIST_X,
              top: LIST_Y + i * (ITEM_H + ITEM_GAP),
              width: 700,
              height: ITEM_H,
              display: "flex",
              alignItems: "center",
              gap: 22,
              opacity: appear * (ghost ? 0.55 : 1),
              transform: `translateX(${(1 - appear) * -40}px)`,
            }}
          >
            <span
              style={{
                width: ITEM_H,
                height: ITEM_H,
                borderRadius: 999,
                flex: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: SANS,
                fontWeight: 800,
                fontSize: 30,
                color: pMark > 0 && tone ? tone.ink : colors.inkSoft,
                background: pMark > 0 && tone ? tone.fill : colors.page,
                border: pMark > 0 && tone ? `5px solid ${tone.ring}` : `3px ${ghost ? "dashed" : "solid"} ${colors.line}`,
              }}
            >
              {s.step}
            </span>
            <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 36, color: colors.ink, width: 230 }}>
              {s.step === 6 ? "window fns" : s.label}
            </span>
            {mark && tone ? (
              <span
                style={{
                  fontFamily: SANS,
                  fontWeight: 700,
                  fontSize: 28,
                  color: tone.ink,
                  opacity: pMark,
                  transform: `translateX(${(1 - pMark) * 20}px)`,
                  whiteSpace: "nowrap",
                }}
              >
                {tone.glyph} {mark.note}
              </span>
            ) : null}
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: 1000,
          top: 330,
          width: 820,
          fontFamily: SANS,
          fontWeight: 800,
          fontSize: 84,
          lineHeight: 1.08,
          letterSpacing: "-0.03em",
          color: colors.ink,
        }}
      >
        <div style={{ opacity: ease(frame, start + 6, 12) }}>Don&apos;t memorize it.</div>
        <div style={{ opacity: ease(frame, readAt, 12), color: colors.accentInk }}>
          Read it off the order.
        </div>
      </div>
    </AbsoluteFill>
  );
};
