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
 * The five things interviewers score, as the role page lists them, standing
 * as five columns that rise in turn, each filling with its details as they
 * are said.
 */
export const ProbeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("probe").from;
  const fiveAt = n.word("probe", "the same five things");
  const w = (p: string) => n.word("probe", p);
  const cols: { at: number; name: string; items: Item[] }[] = [
    {
      at: w("Statistics and probability"),
      name: "Statistics & probability",
      items: [
        { at: w("distributions"), text: "distributions" },
        { at: w("tests and intervals"), text: "tests and intervals" },
      ],
    },
    {
      at: w("Modeling"),
      name: "Modeling",
      items: [
        { at: w("the bias and variance trade-off"), text: "the bias–variance trade-off" },
        { at: w("regularization"), text: "regularization" },
        { at: w("validation"), text: "validation" },
        { at: w("the metric you pick"), text: "the metric you pick" },
      ],
    },
    {
      at: w("Experimentation"),
      name: "Experimentation",
      items: [
        { at: w("the design"), text: "the design" },
        { at: w("its power"), text: "its power" },
        { at: w("the pitfalls"), text: "the pitfalls" },
      ],
    },
    {
      at: w("Coding"),
      name: "Coding",
      items: [
        { at: w("in pandas"), text: <Mono>pandas</Mono> },
        { at: w("NumPy"), text: <Mono>NumPy</Mono> },
        { at: w("and SQL"), text: <Mono>SQL</Mono> },
      ],
    },
    {
      at: w("And communication"),
      name: "Communication",
      items: [
        { at: w("explaining a model and its caveats"), text: "explaining a model and its caveats" },
        { at: w("to someone who doesn't build them"), text: "to someone who doesn't build them" },
      ],
    },
  ];
  const end = n.beat("probe").to;

  return (
    <AbsoluteFill>
      {cols.map((c) => (
        <Sfx key={c.name} name="el-tap" at={c.at} level={-33} />
      ))}

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>What interviewers score</Kicker>
        <Headline lead="Five things," turn="scored in every round." at={from + 2} turnAt={fiveAt} size={70} />

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
