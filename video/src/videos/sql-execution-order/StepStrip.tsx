import React from "react";
import { colors, ds } from "../../theme/brand";
import { MONO, SANS } from "../../theme/fonts";
import { STEPS } from "./data";

export type StepMark = {
  step: number;
  tone: "bad" | "ok" | "named";
  /** 0 → 1 as the mark appears. */
  p: number;
  label?: string;
};

const TONE = {
  bad: { ring: ds("red"), fill: ds("red", 50), ink: "var(--ds-red-ink)" },
  ok: { ring: ds("green"), fill: ds("green", 50), ink: "var(--ds-green-ink)" },
  named: { ring: ds("yellow"), fill: ds("yellow", 100), ink: "var(--ds-amber-ink)" },
} as const;

const GAP = 166;

/** The nine steps as a horizontal strip, with marks on the ones the
 *  narration is talking about. Returns the x of a step's center for arrows. */
export const stepX = (left: number, step: number) => left + (step - 1) * GAP + 50;

export const StepStrip: React.FC<{
  left: number;
  top: number;
  marks: StepMark[];
  opacity: number;
}> = ({ left, top, marks, opacity }) => (
  <div style={{ position: "absolute", left, top, opacity }}>
    {STEPS.map((s) => {
      // A mark fading out (or a spring settling) is off below a sliver.
      const mark = marks.find((m) => m.step === s.step && m.p > 0.04);
      const tone = mark ? TONE[mark.tone] : null;
      const ghost = s.step === 6 || s.step === 7;
      return (
        <div
          key={s.step}
          style={{
            position: "absolute",
            left: (s.step - 1) * GAP,
            top: 0,
            width: 100,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: 999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: SANS,
              fontWeight: 800,
              fontSize: 34,
              color: tone ? tone.ink : ghost ? colors.inkFaint : colors.inkSoft,
              background: tone ? tone.fill : colors.page,
              border: tone
                ? `5px solid ${tone.ring}`
                : `3px ${ghost ? "dashed" : "solid"} ${colors.line}`,
              transform: `scale(${1 + (mark ? mark.p * 0.14 : 0)})`,
            }}
          >
            {s.step}
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 22,
              fontWeight: 600,
              whiteSpace: "nowrap",
              color: tone ? tone.ink : ghost ? colors.inkFaint : colors.inkSoft,
            }}
          >
            {s.label}
          </div>
          {mark?.label ? (
            <div
              style={{
                position: "absolute",
                top: -58,
                padding: "4px 14px",
                borderRadius: 999,
                background: tone?.ring,
                color: mark.tone === "named" ? colors.ink : colors.page,
                fontFamily: MONO,
                fontWeight: 700,
                fontSize: 24,
                whiteSpace: "nowrap",
                opacity: mark.p,
                transform: `translateY(${(1 - mark.p) * -16}px)`,
              }}
            >
              {mark.label}
            </div>
          ) : null}
        </div>
      );
    })}
  </div>
);
