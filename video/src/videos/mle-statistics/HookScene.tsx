import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MODELS } from "./data";
import { Drift, Headline, Kicker, Mark, Spot, X0 } from "./parts";

const ROW_Y = [330, 412] as const;
const LABEL_W = 290;
const NUM_W = 44;
const NUM_GAP = 10;
const QUICK_GAP = 34;

/**
 * The opening: the decision the first nine questions turn on. Two models'
 * scores on the same 2,000 examples, in neutral ink (neither is the answer
 * yet), "Ship it?", the zebra; then the round as seventeen numerals, twelve
 * worked through in blue and five quick ones in grey.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("hook").from;
  const newAt = n.word("hook", "Your new model");
  const ninetyOneAt = n.word("hook", "ninety-one percent");
  const oldAt = n.word("hook", "The model in production");
  const halfAt = n.word("hook", "ninety and a half");
  const sameAt = n.word("hook", "on the same examples");
  const shipAt = n.word("hook", "Ship it?");
  const likeAt = n.word("plan", "a number like that");
  const seventeenAt = n.word("plan", "Seventeen questions");
  const twelveAt = n.word("plan", "twelve worked through");
  const decisionAt = n.word("plan", "mostly on this decision");
  const quickAt = n.word("plan", "five quick ones");
  const end = n.beat("plan").to;

  const rows = [
    { name: "New model", value: MODELS.new, at: newAt, valueAt: ninetyOneAt },
    { name: "Old model", value: MODELS.old, at: oldAt, valueAt: halfAt },
  ];
  const numX = (i: number) => X0 + i * (NUM_W + NUM_GAP) + (i >= 12 ? QUICK_GAP : 0);
  const numTop = y(758);
  const numAt = (i: number) => (i < 12 ? twelveAt + i * 1.5 : quickAt + (i - 12) * 2);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={from + 10} level={-30} />
      <Sfx name="el-tap" at={ninetyOneAt} level={-30} />
      <Sfx name="el-tap" at={halfAt} level={-30} />
      <Sfx name="el-pencil" at={likeAt + 2} level={-35} />
      <Sfx name="el-sprinkle" at={twelveAt} level={-32} />
      <Sfx name="el-sprinkle" at={quickAt} level={-33} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>Machine learning engineer interview questions</Kicker>
        <Headline lead="Statistics and probability" at={from + 4} size={66} />

        {/* The two scores, in the same ink: neither is the answer yet. */}
        {rows.map((r, i) => (
          <Ink key={r.name} at={r.at} dur={16} style={{ left: X0, top: y(ROW_Y[i]), whiteSpace: "nowrap" }}>
            <div style={{ display: "flex", alignItems: "baseline", fontSize: 42 }}>
              <span style={{ ...note(42, INK), fontWeight: 500, width: LABEL_W }}>{r.name}</span>
              <span style={{ ...note(42, INK), fontWeight: 600, opacity: ease(frame, r.valueAt - 2, 10) }}>
                {i === 0 ? (
                  <Mark at={likeAt}>
                    <Num>{(r.value * 100).toFixed(1)}%</Num>
                  </Mark>
                ) : (
                  <Num>{(r.value * 100).toFixed(1)}%</Num>
                )}
              </span>
            </div>
          </Ink>
        ))}
        <Ink at={sameAt} dur={16} style={{ left: X0, top: y(500), whiteSpace: "nowrap" }}>
          <span style={{ ...note(28, INK_SOFT) }}>
            On the same <Num>{MODELS.n.toLocaleString("en-US")}</Num> test examples
          </span>
        </Ink>
        <Ink at={shipAt} dur={18} style={{ left: X0 - 4, top: y(574), whiteSpace: "nowrap" }}>
          <span style={{ ...headline(80) }}>Ship it?</span>
        </Ink>

        <Spot id="zebra" at={from + 10} x={1270} y={y(296)} w={500} />

        {/* The round: seventeen questions. */}
        <Ink at={seventeenAt} dur={14} style={{ left: X0, top: y(706), whiteSpace: "nowrap" }}>
          <span style={{ ...label(26, INK), fontWeight: 600 }}>Seventeen questions</span>
        </Ink>
        {Array.from({ length: 17 }, (_, i) => {
          const p = ease(frame, numAt(i), 10);
          if (p <= 0) return null;
          const quick = i >= 12;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: numX(i),
                top: numTop,
                width: NUM_W,
                textAlign: "center",
                ...label(30, quick ? INK_SOFT : BLUE_INK),
                fontWeight: 600,
                opacity: p,
                transform: `translateY(${(1 - p) * 10}px)`,
              }}
            >
              <Num>{i + 1}</Num>
            </div>
          );
        })}
        <Ink at={decisionAt} dur={14} style={{ left: X0 + 4, top: numTop + 56, whiteSpace: "nowrap" }}>
          <span style={{ ...note(22, INK_SOFT) }}>Worked through, mostly on this decision</span>
        </Ink>
        <Ink at={quickAt + 6} dur={14} style={{ left: numX(12) + 6, top: numTop + 56, whiteSpace: "nowrap" }}>
          <span style={{ ...note(22, INK_SOFT) }}>Quick</span>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
