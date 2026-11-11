import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { badgeStyle } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Headline, Kicker, X0 } from "./parts";
import { Mono } from "./mono";

const ROW_Y = 330;
const PITCH = 120;

/**
 * The four things interviewers probe across the loop, as the role page lists
 * them, each a numbered row with its detail inking in as it is said. Numbered
 * on a blue disc, the house badge with no ring, blue like the loop's "1 of
 * 3": red is kept for the trap.
 */
export const ProbeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("probe").from;
  const fourAt = n.word("probe", "four things");
  const rows = [
    { at: n.word("probe", "SQL fluency"), name: "SQL fluency", detail: <>Joins, <Mono>GROUP BY</Mono>, <Mono>WHERE</Mono> vs <Mono>HAVING</Mono>, <Mono>CASE</Mono>, window functions</> },
    { at: n.word("probe", "Framing"), name: "Framing", detail: <>The right grain (what one row is), nulls handled, nothing counted twice after a join</> },
    { at: n.word("probe", "Communication"), name: "Communication", detail: <>Assumptions, caveats, what you&apos;d check next</> },
    { at: n.word("probe", "And tools"), name: "Tools", detail: <>A spreadsheet, and a BI (business intelligence) tool: Tableau, Power BI, Looker</> },
  ];
  const end = n.beat("probe").to;

  return (
    <AbsoluteFill>
      {rows.map((r) => (
        <Sfx key={r.name} name="el-tap" at={r.at} level={-33} />
      ))}

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>What interviewers probe</Kicker>
        <Headline lead="Four things," turn="across the three parts." at={from + 2} turnAt={fourAt} size={70} />

        {rows.map((r, i) => {
          const p = ease(frame, r.at - 2, 14);
          const d = ease(frame, r.at + 6, 16);
          if (p <= 0) return null;
          return (
            <div
              key={r.name}
              style={{
                position: "absolute",
                left: X0,
                top: y(ROW_Y) + i * h(PITCH),
                display: "flex",
                alignItems: "baseline",
                gap: 28,
                opacity: p,
                transform: `translateX(${(1 - p) * -16}px)`,
              }}
            >
              {/* The number on a tinted disc, at 35px: within 12% of the
                  name's 38, so the line keeps one size. */}
              <span
                style={{
                  ...label(35, BLUE_INK),
                  ...badgeStyle("blue", 35),
                  width: 60,
                  height: 60,
                  flex: "none",
                  padding: 0,
                  borderRadius: 30,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  ...TABULAR,
                }}
              >
                {i + 1}
              </span>
              <span style={{ ...note(38, INK), fontWeight: 500, width: 360, whiteSpace: "nowrap" }}>{r.name}</span>
              <span style={{ ...note(28, INK_SOFT), whiteSpace: "nowrap", opacity: d }}>{r.detail}</span>
            </div>
          );
        })}
      </Drift>
    </AbsoluteFill>
  );
};
