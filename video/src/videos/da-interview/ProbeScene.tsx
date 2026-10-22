import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Headline, Kicker, Mono, X0 } from "./parts";

const ROW_Y = 330;
const PITCH = 120;

/**
 * The four things interviewers probe, as the role page lists them, each a
 * numbered row with its detail inking in as it is said.
 */
export const ProbeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("probe").from;
  const fourAt = n.word("probe", "four things");
  const rows = [
    { at: n.word("probe", "SQL fluency"), name: "SQL fluency", detail: <>joins, <Mono>GROUP BY</Mono>, <Mono>WHERE</Mono> and <Mono>HAVING</Mono>, <Mono>CASE</Mono>, windows</> },
    { at: n.word("probe", "Framing"), name: "Framing", detail: <>the right grain, nulls handled, nothing counted twice after a join</> },
    { at: n.word("probe", "Communication"), name: "Communication", detail: <>assumptions, caveats, what you&apos;d check next</> },
    { at: n.word("probe", "And tools"), name: "Tools", detail: <>a spreadsheet, and a BI (business intelligence) tool: Tableau, Power BI, Looker</> },
  ];
  const end = n.beat("probe").to;

  return (
    <AbsoluteFill>
      {rows.map((r) => (
        <Sfx key={r.name} name="el-tap" at={r.at} level={-33} />
      ))}

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>What interviewers probe</Kicker>
        <Headline lead="Four things," turn="under all three." at={from + 2} turnAt={fourAt} size={70} />

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
              <span
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  border: `2px solid ${ACCENT_INK}`,
                  background: PAPER,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  ...label(24, ACCENT_INK),
                  ...TABULAR,
                }}
              >
                {i + 1}
              </span>
              <span style={{ ...note(38, INK), fontWeight: 650, width: 360, whiteSpace: "nowrap" }}>{r.name}</span>
              <span style={{ ...note(28, INK_SOFT), whiteSpace: "nowrap", opacity: d }}>{r.detail}</span>
            </div>
          );
        })}
      </Drift>
    </AbsoluteFill>
  );
};
