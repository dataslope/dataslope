import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Axis, Bars, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, body, headline, INK } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { histogram, peak, PILE, POPULATION, SAMPLE } from "./data";
import { money, POP_FILL, SAMPLE_FILL } from "./parts";
import { useMergedPart } from "../sampling/merged";
import { PartName } from "../sampling/PartName";

const BASE = 840;
const HEIGHT = 380;
const COL_W = 480;
const colX = (c: number) => 150 + c * 570;

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
  // In the merged Unit 5 video the part's name takes the kicker's place, and
  // the headline and figure label step down under it.
  const merged = useMergedPart();
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
      <FigLabel n="1" title="Three distributions, each drawn on its own axis" at={10} x={150} y={y(figY)} />

      {PANELS.map((p, c) => {
        const at = 8 + c * 8;
        const mid = (p.lo + p.hi) / 2;
        return (
          <React.Fragment key={p.title}>
            <Ink at={at - 2} dur={14} style={{ left: colX(c), top: y(360) }}>
              <span style={{ ...body(34, true), color: INK, whiteSpace: "nowrap" }}>{p.title}</span>
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
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};
