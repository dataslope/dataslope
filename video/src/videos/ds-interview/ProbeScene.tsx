import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, HAIRLINE, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Headline, Kicker, Mono, X0 } from "./parts";

const COL_W = 316;
const GAP = 20;
const TOP = 290;
const COL_H = 460;

type Item = { at: number; text: React.ReactNode };

/**
 * The five things interviewers probe across the loop, as the role page lists
 * them ("What interviewers probe"), standing as five columns that rise in
 * turn, each filling with its details as they are said. No one round scores
 * all five: a SQL screen does not grade experiment design.
 */
export const ProbeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("probe").from;
  const fiveAt = n.word("probe", "probe five things");
  const cols: { at: number; name: string; items: Item[] }[] = [
    {
      at: n.word("probe-list", "Statistics and probability"),
      name: "Statistics & probability",
      items: [
        { at: n.word("probe-list", "distributions"), text: "distributions" },
        { at: n.word("probe-list", "tests and intervals"), text: "tests and intervals" },
      ],
    },
    {
      at: n.word("probe-list", "Modeling"),
      name: "Modeling",
      items: [
        { at: n.word("probe-list", "the bias and variance trade-off"), text: "the bias–variance trade-off" },
        { at: n.word("probe-list", "regularization"), text: "regularization" },
        { at: n.word("probe-list", "validation"), text: "validation" },
        { at: n.word("probe-list", "the metric you pick"), text: "the metric you pick" },
      ],
    },
    {
      at: n.word("probe-list", "Experimentation"),
      name: "Experimentation",
      items: [
        { at: n.word("probe-list", "the design"), text: "the design" },
        { at: n.word("probe-list", "its power"), text: "its power" },
        { at: n.word("probe-list", "the pitfalls"), text: "the pitfalls" },
      ],
    },
    {
      at: n.word("probe-list", "Coding"),
      name: "Coding",
      items: [
        { at: n.word("probe-list", "in pandas"), text: <Mono>pandas</Mono> },
        { at: n.word("probe-list", "NumPy"), text: <Mono>NumPy</Mono> },
        { at: n.word("probe-list", "and SQL"), text: <Mono>SQL</Mono> },
      ],
    },
    {
      at: n.word("probe-list", "And communication"),
      name: "Communication",
      items: [
        { at: n.word("probe-list", "explaining a model and its caveats"), text: "explaining a model and its caveats" },
        { at: n.word("probe-list", "to someone who doesn't build them"), text: "to someone who doesn't build them" },
      ],
    },
  ];
  const end = n.beat("probe-list").to;

  return (
    <AbsoluteFill>
      {cols.map((c) => (
        <Sfx key={c.name} name="el-tap" at={c.at} level={-33} />
      ))}

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>What interviewers probe</Kicker>
        <Headline lead="Five things," turn="probed across the loop." at={from + 2} turnAt={fiveAt} size={70} />

        {cols.map((c, i) => {
          const p = ease(frame, c.at - 4, 16);
          if (p <= 0) return null;
          const x = X0 + i * (COL_W + GAP);
          return (
            <div
              key={c.name}
              style={{
                position: "absolute",
                left: x,
                top: y(TOP),
                width: COL_W,
                height: h(COL_H) * p,
                boxSizing: "border-box",
                border: `1.5px solid ${HAIRLINE}`,
                borderRadius: 12,
                background: PAPER,
                overflow: "hidden",
                padding: "24px 24px 0",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  border: `2px solid ${BLUE_INK}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  ...label(22, BLUE_INK),
                  ...TABULAR,
                }}
              >
                {i + 1}
              </div>
              <div style={{ ...note(32, INK), fontWeight: 650, lineHeight: 1.15, marginTop: 18, minHeight: 74 }}>{c.name}</div>
              <div style={{ marginTop: 18 }}>
                {c.items.map((it, k) => {
                  const q = ease(frame, it.at - 2, 12);
                  return (
                    <div
                      key={k}
                      style={{ ...note(26, INK_SOFT), lineHeight: 1.3, marginBottom: 14, opacity: q, transform: `translateX(${(1 - q) * -10}px)` }}
                    >
                      {it.text}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </Drift>
    </AbsoluteFill>
  );
};
