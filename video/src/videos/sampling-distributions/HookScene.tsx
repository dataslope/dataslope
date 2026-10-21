import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Axis, Bars, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, body, headline, INK, INK_SOFT, note } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { histogram, peak, PILE, POPULATION, SAMPLE } from "./data";
import { money, POP_FILL, SAMPLE_FILL } from "./parts";
import { useFigNumber, useMergedPart } from "../sampling/merged";
import { PartName } from "../sampling/PartName";
import { Marker, swell } from "../sampling/emphasis";

const BASE = 840;
const HEIGHT = 380;
const COL_W = 470;
/** Panel to panel. The first panel starts at the page's left edge (120,
 *  under the kicker, the headline and Fig. 1's label) and stays there when
 *  the panels are pulled apart; the other two move right. */
const GAP = 560;
const colX = (c: number) => 120 + c * GAP;
/** How far each panel moves per column on "pull them apart". */
const PART = 34;

/** Each panel on its own axis, scaled to its own peak: drawn this way, the
 *  three look like one shape three times, which is the confusion. */
const PANELS = [
  {
    title: "The population",
    hist: POPULATION.hist,
    color: POP_FILL,
    lo: 0,
    hi: 100,
    ticks: [0, 25, 50, 75, 100],
  },
  {
    title: "One sample",
    hist: histogram(SAMPLE.values, 0, 100, 10),
    color: SAMPLE_FILL,
    lo: 0,
    hi: 100,
    ticks: [0, 25, 50, 75, 100],
  },
  {
    title: "The sampling distribution",
    hist: histogram(PILE.means, 40, 60, 0.5),
    color: ACCENT,
    lo: 40,
    hi: 60,
    ticks: [40, 45, 50, 55, 60],
  },
].map((p, c) => {
  const scale: XScale = { lo: p.lo, hi: p.hi, x0: colX(c), x1: colX(c) + COL_W };
  return { ...p, scale, unit: HEIGHT / peak(p.hist) };
});

/**
 * Hook: the three distributions side by side, each on an axis of its own.
 * They look alike, which is the trap the rest of the video takes apart.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const threeAt = n.word("hook", "three distributions");
  const alikeAt = n.word("hook", "alike");
  const answeringAt = n.word("hook", "Answering");
  const sideAt = n.word("hook", "side by side");
  const mixingAt = n.word("apart", "mixing");
  const intervalsAt = n.word("apart", "confidence intervals");
  const misreadAt = n.word("apart", "misread");
  const pullAt = n.word("apart", "pull them apart");
  // "Side by side, they look alike": an "about equal" sign between the
  // panels (one sample of forty is ragged, so "=" would claim more than the
  // picture shows; the likeness is the shared hump and width each has on its
  // own axis),
  // struck through when the narration pulls them apart, as they part.
  const same = ease(frame, alikeAt - 4, 12);
  const strike = ease(frame, pullAt, 14);
  const part = ease(frame, pullAt + 2, 24);
  // In the merged Unit 5 video the part's name takes the kicker's place, and
  // the headline and figure label step down under it.
  const merged = useMergedPart();
  const fig = useFigNumber();
  const headY = merged ? 150 : 112;
  const figY = merged ? 266 : 244;

  return (
    <AbsoluteFill>
      {/* ── Sound (merged video only; the standalone has sfx off): each panel's bars ── */}
      {PANELS.map((p, c) => (
        <Sfx key={p.title} name="el-pop" at={8 + c * 8} level={-30} />
      ))}

      {merged ? (
        <Ink at={2} dur={14} style={{ left: 120, top: y(112) }}>
          <PartName alone />
        </Ink>
      ) : null}
      {/* One line in two inks: the second half follows the first in the flow. */}
      <div style={{ position: "absolute", left: 116, top: y(headY), display: "flex", gap: "0.26em", ...headline(72) }}>
        <Ink at={threeAt - 4} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
          Three distributions
        </Ink>
        <Ink
          at={alikeAt - 4}
          dur={18}
          style={{ position: "relative", ...headline(72, true), color: ACCENT_INK, whiteSpace: "nowrap" }}
        >
          that look alike.
        </Ink>
      </div>
      <FigLabel n={fig(1)} title="Three distributions, each drawn on its own axis" at={answeringAt - 4} x={colX(0)} y={y(figY)} />

      {PANELS.map((p, c) => {
        const at = 8 + c * 8;
        const mid = (p.lo + p.hi) / 2;
        return (
          <div key={p.title} style={{ position: "absolute", inset: 0, transform: `translateX(${c * PART * part}px)` }}>
            <Ink at={at - 2} dur={14} style={{ left: colX(c), top: y(360) }}>
              <span
                style={{
                  ...body(34, true),
                  color: INK,
                  whiteSpace: "nowrap",
                  display: "inline-block",
                  transformOrigin: "left center",
                  transform: `scale(${swell(frame, sideAt - 2 + c * 5, 0.1, 18)})`,
                }}
              >
                {p.title}
              </span>
            </Ink>
            <Bars
              counts={p.hist.counts}
              lo={p.hist.lo}
              bin={p.hist.bin}
              scale={p.scale}
              base={y(BASE)}
              unit={h(p.unit)}
              color={p.color}
              gap={p.hist.bin === 10 ? 3 : 2}
              grow={(i) =>
                ease(frame, at + (Math.abs(p.hist.lo + (i + 0.5) * p.hist.bin - mid) / (p.hi - p.lo)) * 26, 14)
              }
            />
            <Axis
              scale={p.scale}
              base={y(BASE)}
              ticks={p.ticks}
              format={money}
              at={at - 2}
            />
          </div>
        );
      })}

      {/* "They look alike", and then "pull them apart". */}
      {[0, 1].map((c) => {
        // Centered in the gap between two panels, which moves as they part.
        const cx = colX(c) + COL_W + (GAP - COL_W) / 2 + (c + 0.5) * PART * part;
        const cy = y(BASE - HEIGHT * 0.42);
        return same > 0 ? (
          <div
            key={c}
            style={{
              position: "absolute",
              left: cx - 40,
              top: cy - 40,
              width: 80,
              height: 80,
              opacity: same,
              transform: `scale(${0.7 + 0.3 * same})`,
            }}
          >
            <span style={{ ...headline(64), color: INK_SOFT, position: "absolute", left: 0, right: 0, top: 4, textAlign: "center" }}>≈</span>
            <svg width={80} height={80} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
              <line
                x1={56}
                y1={14}
                x2={24}
                y2={70}
                stroke={ACCENT}
                strokeWidth={4}
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray={`${strike} 1`}
                opacity={strike > 0 ? 1 : 0}
              />
            </svg>
          </div>
        ) : null;
      })}

      {/* Why it matters, at the right end of the figure's label row. */}
      <Ink at={mixingAt - 2} dur={14} style={{ right: 1920 - 1800, top: y(figY), whiteSpace: "nowrap" }}>
        <span style={note(22, INK_SOFT)}>
          Mix them up,{" "}
          <span style={{ opacity: ease(frame, intervalsAt - 2, 12) }}>
            and confidence intervals get <Marker at={misreadAt}>misread</Marker>.
          </span>
        </span>
      </Ink>
    </AbsoluteFill>
  );
};
