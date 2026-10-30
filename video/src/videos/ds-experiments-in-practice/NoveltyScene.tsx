import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { NOVELTY } from "./data";
import { at, Axes, Curve, Drift, OK_INK, type Scale, WARM, WARM_INK, X0 } from "./parts";

const PLOT = { x0: 210, x1: 1180, top: 440, base: 810 };
const SKETCH = { x0: 1380, x1: 1780, mid: 580, amp: 90 };

/**
 * Question 5. Two changes' weekly lift from the page's chart
 * (charts/novelty-effect-fades.mjs, the numbers DA Part 7 drew): one starts at
 * 14.1% and is under 1% by week eight, the other holds near 4. Read in week
 * one, the fading one wins. Primacy is its mirror, drawn as a sketch with no
 * numbers because the page has none; then the two defences: run past the
 * first weeks, and compare new users (who never saw the old version, so
 * nothing is new or strange to them) with returning ones.
 */
export const NoveltyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("novelty").from;
  const qAt = n.word("novelty", "Question five");
  const textAt = n.word("novelty", "What are novelty and primacy effects");
  const newAt = n.word("novelty", "People click on something because it's new");
  const realAt = n.word("novelty", "That lift is real");
  const lastAt = n.word("novelty", "it doesn't last");
  const upAt = n.word("novelty", "up fourteen percent in week one");
  const underAt = n.word("novelty", "under one percent by week eight");
  const plainAt = n.word("novelty", "a plainer change holds at about four");
  const readAt = n.word("novelty", "Read in week one");
  const wrongAt = n.word("novelty", "you'd ship the wrong one");
  const primacyAt = n.word("primacy", "Primacy runs the other way");
  const resistAt = n.word("primacy", "people resist at first");
  const learnAt = n.word("primacy", "until they learn it");
  const pastAt = n.word("primacy-fix", "run past the first weeks");
  const compareAt = n.word("primacy-fix", "compare new users");
  const neverAt = n.word("primacy-fix", "who never saw the old version");
  const returningAt = n.word("primacy-fix", "with returning ones");
  const end = n.beat("primacy-fix").to;

  const x: Scale = { lo: 0.6, hi: 8.4, a: PLOT.x0, b: PLOT.x1 };
  const yS: Scale = { lo: 0, hi: 16, a: y(PLOT.base), b: y(PLOT.top) };
  const pts = (vals: number[]) => vals.map((v, i) => [i + 1, v] as [number, number]);
  const read = ease(frame, readAt, 12) * (1 - ease(frame, pastAt, 12));
  const past = ease(frame, pastAt, 14);
  const wrong = ease(frame, wrongAt, 12);
  const novInk = wrong > 0.5 ? ACCENT_INK : WARM_INK;

  // Primacy, sketched: a dip below zero that recovers above it.
  const sk = Array.from({ length: 41 }, (_, i) => {
    const t = i / 40;
    const v = 1 - 2.2 * Math.exp(-4 * t) + 0.25 * t;
    return [SKETCH.x0 + t * (SKETCH.x1 - SKETCH.x0), y(SKETCH.mid) - v * h(SKETCH.amp)] as const;
  });
  const skP = ease(frame, resistAt - 2, 34);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={upAt} level={-36} />
      <Sfx name="el-pencil" at={plainAt} level={-37} />
      <Sfx name="el-scratch" at={wrongAt} level={-34} />
      <Sfx name="el-pencil" at={resistAt} level={-37} />
      <Sfx name="el-pop" at={compareAt} level={-36} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} size={58}>
          What are novelty and primacy effects, and how do you handle them?
        </QuestionCard>
        <Note at={newAt} x={X0} y={y(330)}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
            New gets clicked because it's new.{" "}
            <span style={{ opacity: ease(frame, realAt, 10) }}>The lift is real</span>
            <span style={{ opacity: ease(frame, lastAt, 10), color: ACCENT_INK }}>, and it doesn't last.</span>
          </span>
        </Note>

        {/* Weeks 1 and 2: where tests get read, and what to run past. */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <rect x={at(x, 0.6)} y={y(PLOT.top)} width={(at(x, 1.4) - at(x, 0.6)) * Math.max(read, 0)} height={y(PLOT.base) - y(PLOT.top)} fill={HIGHLIGHT} opacity={0.7} />
          <rect x={at(x, 0.6)} y={y(PLOT.top)} width={(at(x, 2.5) - at(x, 0.6)) * past} height={y(PLOT.base) - y(PLOT.top)} fill={ds("gray", 300)} opacity={0.35} />
        </svg>
        <Axes
          x={x}
          y={yS}
          xTicks={[1, 2, 3, 4, 5, 6, 7, 8]}
          yTicks={[0, 4, 8, 12, 16]}
          yFormat={(v) => `${v}%`}
          xTitle="week of the experiment"
          yTitle="lift over control"
          at={upAt - 10}
        />
        <Curve points={pts(NOVELTY.novelty)} x={x} y={yS} at={upAt} dur={Math.max(20, underAt - upAt + 6)} color={wrong > 0.5 ? ACCENT : WARM} dots={5} />
        <Curve points={pts(NOVELTY.durable)} x={x} y={yS} at={plainAt} dur={26} color={BAR} dots={5} />
        <Note at={upAt + 4} x={at(x, 1) + 18} y={at(yS, NOVELTY.novelty[0]) - 16}>
          <span style={{ ...label(23, novInk), fontWeight: 750, ...TABULAR }}>+{NOVELTY.novelty[0].toFixed(1)}%</span>
        </Note>
        <Note at={underAt} x={at(x, 8) + 14} y={at(yS, NOVELTY.novelty[7]) - 6}>
          <span style={{ ...label(22, novInk), fontWeight: 750, whiteSpace: "nowrap", ...TABULAR }}>+{NOVELTY.novelty[7].toFixed(1)}%</span>
        </Note>
        <Note at={plainAt + 18} x={at(x, 8) + 14} y={at(yS, NOVELTY.durable[7]) - 24}>
          <span style={{ ...label(22, BLUE_INK), fontWeight: 750, whiteSpace: "nowrap", ...TABULAR }}>+{NOVELTY.durable[7].toFixed(1)}%</span>
        </Note>
        <Note at={plainAt + 8} x={at(x, 3.2)} y={at(yS, NOVELTY.durable[2]) - h(48)}>
          <span style={{ ...label(21, BLUE_INK), fontWeight: 650, whiteSpace: "nowrap" }}>a plainer change</span>
        </Note>
        {/* Each band carries its own label: week one while it is the one
            read, then the first weeks once they are what to run past. */}
        <Note at={readAt + 2} x={at(x, 1.5)} y={y(PLOT.top) - h(6)} out={pastAt}>
          <span style={{ ...label(21, INK), fontWeight: 700, whiteSpace: "nowrap" }}>read in week one</span>
        </Note>
        <Note at={pastAt + 4} x={at(x, 0.6) + 10} y={y(PLOT.top) - h(6)}>
          <span style={{ ...label(21, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>run past these weeks</span>
        </Note>
        <Note at={wrongAt} x={at(x, 2.2)} y={at(yS, 11)}>
          <span style={{ ...note(27, ACCENT_INK), fontWeight: 750, whiteSpace: "nowrap" }}>→ you'd ship the wrong one</span>
        </Note>

        {/* Primacy: the mirror, as a sketch. */}
        <Note at={primacyAt} x={SKETCH.x0} y={y(SKETCH.mid) - h(190)}>
          <span style={{ ...note(27, INK), fontWeight: 700, whiteSpace: "nowrap" }}>Primacy, the other way</span>
        </Note>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, primacyAt + 2, 10) }}>
          <line x1={SKETCH.x0} x2={SKETCH.x1} y1={y(SKETCH.mid)} y2={y(SKETCH.mid)} stroke={INK} strokeWidth={1.4} />
          <path
            d={sk.map(([a, b], i) => `${i ? "L" : "M"}${a.toFixed(1)},${b.toFixed(1)}`).join(" ")}
            fill="none"
            stroke={WARM}
            strokeWidth={3}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={`${skP} 1`}
          />
        </svg>
        <Note at={primacyAt + 6} x={SKETCH.x1 - 140} y={y(SKETCH.mid) + h(12)}>
          <span style={{ ...label(19, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>a sketch, no data</span>
        </Note>
        <Note at={resistAt + 4} x={SKETCH.x0 + 20} y={y(SKETCH.mid) + h(118)}>
          <span style={{ ...label(21, WARM_INK), fontWeight: 700, whiteSpace: "nowrap" }}>resist at first</span>
        </Note>
        <Note at={learnAt} x={SKETCH.x1 - 200} y={y(SKETCH.mid) - h(150)}>
          <span style={{ ...label(21, WARM_INK), fontWeight: 700, whiteSpace: "nowrap" }}>until they learn it</span>
        </Note>

        {/* The defences, for both. */}
        <Note at={pastAt} x={SKETCH.x0} y={y(752)}>
          <span style={{ ...note(25, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>run past the first weeks</span>
        </Note>
        <Note at={compareAt} x={SKETCH.x0} y={y(794)}>
          <span style={{ ...note(25, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            compare new users
            <br />
            <span style={{ opacity: ease(frame, returningAt - 2, 10) }}>with returning ones</span>
          </span>
        </Note>
        <Note at={neverAt} x={SKETCH.x0} y={y(864)}>
          <span style={{ ...label(20, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>(new users never saw the old version)</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
