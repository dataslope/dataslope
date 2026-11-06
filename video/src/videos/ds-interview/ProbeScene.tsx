import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, HAIRLINE, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Headline, Kicker, Mono, X0 } from "./parts";

/** Five columns of plain text across the page from X0 to 1800, a hairline
 *  in each gap: 56px, so every rule sits 27px from the text either side. */
const COL_W = 291;
const GAP = 56;
const TOP = 290;

type Item = { at: number; text: React.ReactNode };

/**
 * The five things interviewers probe across the loop, as the role page lists
 * them ("What interviewers probe"), as five columns of plain text ruled
 * apart by hairlines, inking in turn, each filling with its details as they
 * are said. No one round scores
 * all five: a SQL screen does not grade experiment design.
 */
export const ProbeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

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

        {/* The five as a row of columns, held in place before they ink so
            the row never reflows; each rule is as tall as the tallest column
            beside it and inks in with the column to its right. */}
        <div style={{ position: "absolute", left: X0, top: y(TOP), display: "flex", alignItems: "stretch" }}>
          {cols.map((c, i) => {
            const p = ease(frame, c.at - 4, 16);
            return (
              <React.Fragment key={c.name}>
                {i > 0 ? (
                  <div style={{ width: GAP, display: "flex", justifyContent: "center" }}>
                    <div style={{ width: 1, background: HAIRLINE, opacity: p }} />
                  </div>
                ) : null}
                <div style={{ width: COL_W, opacity: p, transform: `translateY(${(1 - p) * 14}px)` }}>
                  <div style={{ ...label(24, BLUE_INK), fontWeight: 700, lineHeight: 1, ...TABULAR }}>{i + 1}</div>
                  <div style={{ ...note(32, INK), fontWeight: 650, lineHeight: 1.15, marginTop: 12, minHeight: 74 }}>{c.name}</div>
                  <div style={{ marginTop: 22 }}>
                    {c.items.map((it, k) => {
                      const q = ease(frame, it.at - 2, 12);
                      return (
                        <div
                          key={k}
                          style={{
                            ...note(26, INK_SOFT),
                            lineHeight: 1.3,
                            marginTop: k ? 18 : 0,
                            opacity: q,
                            transform: `translateX(${(1 - q) * -10}px)`,
                          }}
                        >
                          {it.text}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
