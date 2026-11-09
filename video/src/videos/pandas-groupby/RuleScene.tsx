import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, HAIRLINE, headline, INK } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { AGG, ROWS, TOTALS } from "./data";
import { Arrow, Code, ValueCell } from "./kit";

/** The two panels, and the bars inside each. */
const PANELS = [
  { x: 255, code: '.agg("sum")', cue: "agg", caption: "A summary: one row per group.", captionCue: "summary" },
  { x: 1215, code: '.transform("sum")', cue: "transform", caption: "The answer, back on every row.", captionCue: "every row" },
] as const;
const BAR_W = 150;
const PITCH = 46;
const BAR_H = 38;
const OUT_DX = 300;
const CODE_Y = 312;
const BARS_Y = 392;
const CAPTION_Y = 742;

/**
 * The rule, as two shapes side by side: the frame's seven rows go in to both;
 * agg gives back three, transform gives back seven, in the same order.
 */
export const RuleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const start = n.beat("rule").from;
  const barH = h(BAR_H);
  const mid = y(BARS_Y) + (h(PITCH) * (ROWS.length - 1) + barH) / 2;

  return (
    <AbsoluteFill>
      <Ink at={start - 2} dur={22} style={{ left: 118, top: y(146), ...headline(66), whiteSpace: "nowrap" }}>
        Pick the one whose shape you need.
      </Ink>
      <FigLabel n="4" title="The same seven salaries, summed both ways" at={start + 2} x={124} y={y(250)} />
      <div
        style={{
          position: "absolute",
          left: 960,
          top: y(CODE_Y),
          width: 1,
          height: (y(CAPTION_Y + 60) - y(CODE_Y)) * ease(frame, start - 6, 18),
          background: HAIRLINE,
        }}
      />

      {PANELS.map((panel, k) => {
        const at = n.word("rule", panel.cue) - 4;
        const captionAt = n.word("rule", panel.captionCue) - 4;
        const outs =
          k === 0
            ? AGG.map((a, j) => ({ dept: a.dept, value: a.salary, slot: j + (ROWS.length - AGG.length) / 2 }))
            : ROWS.map((r, i) => ({ dept: r.dept, value: TOTALS[i], slot: i }));
        return (
          <React.Fragment key={panel.code}>
            <Ink at={at} dur={14} style={{ left: panel.x, top: y(CODE_Y) }}>
              <Code parts={[{ text: panel.code }]} size={34} />
            </Ink>
            {ROWS.map((r, i) => {
              const a = ease(frame, at + 2 + i * 1.5, 10);
              return (
                <ValueCell
                  key={r.index}
                  dept={r.dept}
                  text={String(r.salary)}
                  pose={{ x: panel.x - (1 - a) * 14, top: y(BARS_Y + i * PITCH), opacity: a }}
                  width={BAR_W}
                  height={barH}
                />
              );
            })}
            <Arrow
              from={[panel.x + BAR_W + 26, mid]}
              to={[panel.x + OUT_DX - 26, mid]}
              at={at + 10}
              color={INK}
            />
            {outs.map((o, j) => {
              const a = ease(frame, at + 16 + j * 2, 12);
              return (
                <ValueCell
                  key={j}
                  dept={o.dept}
                  text={String(o.value)}
                  pose={{ x: panel.x + OUT_DX - (1 - a) * 14, top: y(BARS_Y + o.slot * PITCH), opacity: a }}
                  width={BAR_W}
                  height={barH}
                  strong
                />
              );
            })}
            <Ink at={captionAt} dur={18} style={{ left: panel.x, top: y(CAPTION_Y), ...body(36, true), color: INK, whiteSpace: "nowrap" }}>
              {panel.caption}
            </Ink>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};
