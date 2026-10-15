import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, headline, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { COLOR, COLOR_INK, DEPTS, type Group, NAME } from "./data";
import { Gridlines, RateScale, Swatch } from "./parts";

const PX0 = 300;
const PX1 = 1300;
/** Rows start below the column header and the label row, with room for
 *  department A's highlight band between them. */
const ROW_Y = (i: number) => 316 + i * 98;
const GAP_X = 1440;
const px = (rate: number) => PX0 + (PX1 - PX0) * rate;
/** Dot area grows with the number of applicants. */
const radius = (applied: number) => 4 + Math.sqrt(applied) * 0.58;

/** "+20.3" or "−2.9", with a real minus sign. */
const signed = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(x).toFixed(1)}`;

/**
 * Split, four, two: the same applicants, one department at a time. Each
 * department is a row; women's dot sits right of men's in four of them.
 */
export const DeptScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y } = useLayout();
  const start = n.beat("split").from;
  const rowsAt = n.word("split", "one at a time");
  const fourAt = n.word("four", "four of the six");
  const deptAAt = n.word("four", "department A");
  const otherAt = n.word("two", "other two");
  const bandA = ease(frame, deptAAt - 4, 10) * (1 - ease(frame, otherAt - 6, 10));

  return (
    <AbsoluteFill>
      {/* One line in two inks; the second half follows the first in the flow. */}
      <div style={{ position: "absolute", left: 116, top: y(104), display: "flex", gap: "0.26em", ...headline(56) }}>
        <Ink at={start - 14} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
          One department at a time,
        </Ink>
        <Ink
          at={fourAt - 2}
          dur={18}
          style={{ position: "relative", ...headline(56, true), color: ACCENT_INK, whiteSpace: "nowrap" }}
        >
          women lead in four of six.
        </Ink>
      </div>
      <FigLabel n="2" title="Share admitted, by department" at={start - 8} x={120} y={y(196)} />
      <Note at={start} x={1800} y={y(196) + 2} align="right" from="right">
        <span style={{ ...note(22, INK_SOFT), display: "inline-flex", alignItems: "center", gap: 10 }}>
          <Swatch group="men" /> {NAME.men}
          <span style={{ width: 14 }} />
          <Swatch group="women" /> {NAME.women}
          <span style={{ width: 14 }} />
          dot area: applicants
        </span>
      </Note>

      <Gridlines x0={PX0} x1={PX1} top={y(248)} bottom={y(846)} at={start} />
      <RateScale x0={PX0} x1={PX1} top={y(858)} at={start + 4} />

      {/* Department A, while the narration reads its numbers out. */}
      <div
        style={{
          position: "absolute",
          left: 100,
          width: 1720,
          top: y(ROW_Y(0)) - 42,
          height: 84,
          background: HIGHLIGHT,
          opacity: bandA * 0.45,
        }}
      />

      <Ink at={fourAt - 4} dur={14} style={{ left: GAP_X, top: y(240) }}>
        <span style={label(20, INK_SOFT)}>Women minus men</span>
      </Ink>

      {DEPTS.map((d, i) => {
        const cy = y(ROW_Y(i));
        const at = rowsAt + i * 7;
        const row = ease(frame, at, 12);
        const lead: Group = d.women.rate > d.men.rate ? "women" : "men";
        const trail: Group = lead === "women" ? "men" : "women";
        // The larger dot is drawn first so the smaller one stays visible.
        const order: Group[] = d.men.applied >= d.women.applied ? ["men", "women"] : ["women", "men"];
        const gapAt = d.gap > 0 ? fourAt + 8 + i * 4 : otherAt + 4 + i * 3;
        // A label that would run into the 0% line goes above its dot instead.
        const trailX = px(d[trail].rate) - radius(d[trail].applied) - 10;
        const trailAbove = trailX < PX0 + 56;
        return (
          <React.Fragment key={d.dept}>
            <Ink at={at - 4} dur={12} style={{ left: 128, top: cy - 30 }}>
              <span style={headline(44)}>{d.dept}</span>
            </Ink>
            <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: row }}>
              <line
                x1={px(Math.min(d.men.rate, d.women.rate))}
                x2={px(Math.min(d.men.rate, d.women.rate)) + Math.abs(px(d.women.rate) - px(d.men.rate)) * row}
                y1={cy}
                y2={cy}
                stroke={INK}
                strokeWidth={2}
              />
              {order.map((g, k) => (
                <circle
                  key={g}
                  cx={px(d[g].rate)}
                  cy={cy}
                  r={radius(d[g].applied) * pop(frame, at + k * 3, fps, 14)}
                  fill={COLOR[g]}
                  stroke={PAPER}
                  strokeWidth={2}
                />
              ))}
            </svg>
            {/* Each pair's labels open away from each other. */}
            <Note
              at={at + 6}
              x={trailAbove ? px(d[trail].rate) : trailX}
              y={trailAbove ? cy - radius(d[trail].applied) - 32 : cy - 14}
              align={trailAbove ? "left" : "right"}
              style={trailAbove ? { transform: "translateX(-50%)" } : undefined}
            >
              <span style={{ ...note(21, COLOR_INK[trail]), fontWeight: 600 }}>{Math.round(d[trail].rate * 100)}%</span>
            </Note>
            <Note at={at + 6} x={px(d[lead].rate) + radius(d[lead].applied) + 10} y={cy - 14}>
              <span style={{ ...note(21, COLOR_INK[lead]), fontWeight: 600 }}>{Math.round(d[lead].rate * 100)}%</span>
            </Note>

            <Note at={gapAt} x={GAP_X} y={cy - 19}>
              <span
                style={{
                  ...note(28, COLOR_INK[lead]),
                  fontWeight: 650,
                  padding: "0 8px",
                  marginLeft: -8,
                  background: d.gap > 0 ? HIGHLIGHT : "transparent",
                }}
              >
                {signed(d.gap)}
              </span>
              <span style={{ ...note(20, INK_SOFT), marginLeft: 8 }}>points</span>
            </Note>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};
