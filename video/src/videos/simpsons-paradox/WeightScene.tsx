import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, body, headline, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { ds, type Step } from "../../theme/brand";
import { COLOR, COLOR_INK, type Dept, DEPTS, EASY_SHARE, type Group, pct, share, TOTAL, WOMEN_AT_MEN_MIX } from "./data";
import { Gridlines, RateScale } from "./parts";

const SCALE = { x0: 420, x1: 1620 };
const BAR_H = 92;
const ROWS = [
  { mix: "women" as Group, top: 404, rate: TOTAL.women.rate, head: "Where women applied", sub: "the mix they actually sent" },
  { mix: "men" as Group, top: 596, rate: WOMEN_AT_MEN_MIX, head: "Where men applied", sub: "the men's mix instead" },
];
const px = (rate: number) => SCALE.x0 + (SCALE.x1 - SCALE.x0) * rate;
const shade = (d: Dept): Step => (d.rate >= 0.5 ? 300 : d.rate >= 0.3 ? 500 : d.rate >= 0.2 ? 700 : 900);

/** A group's application mix as a thin strip, shaded like Fig. 3's key. */
const MixStrip: React.FC<{ group: Group; x: number; top: number; width: number }> = ({ group, x, top, width }) => {
  let left = x;
  return (
    <>
      {DEPTS.map((d) => {
        const w = width * share(d, group);
        const seg = (
          <div
            key={d.dept}
            style={{ position: "absolute", left, top, width: Math.max(0, w - 2), height: 14, background: ds("gray", shade(d)) }}
          />
        );
        left += w;
        return seg;
      })}
    </>
  );
};

/**
 * Average, leaned, swap: the women's own department rates, averaged over two
 * different mixes of applications. Over the men's mix they come out ahead of
 * the men.
 */
export const WeightScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const start = n.beat("average").from;
  const weightedAt = n.word("average", "weighted");
  const leanedAt = n.word("leaned", "hardest");
  const mixAt = n.word("swap", "men's mix");
  const fiftyTwoAt = n.word("swap", "fifty-two");
  const aheadAt = n.word("swap", "Ahead");
  const growAt = [start + 10, fiftyTwoAt - 14];
  const menX = px(TOTAL.men.rate);

  return (
    <AbsoluteFill>
      <Ink at={start - 14} dur={20} style={{ left: 116, top: y(104), ...headline(56), whiteSpace: "nowrap" }}>
        A total is an average.
      </Ink>
      <Ink
        at={mixAt - 4}
        dur={18}
        style={{ left: 116, top: y(170), ...headline(56, true), color: ACCENT_INK, whiteSpace: "nowrap" }}
      >
        Move the weights, move the total.
      </Ink>
      <FigLabel n="4" title="Women's own department rates, averaged two ways" at={start - 6} x={120} y={y(270)} />

      <Gridlines x0={SCALE.x0} x1={SCALE.x1} top={y(372)} bottom={y(716)} at={start} />
      <RateScale x0={SCALE.x0} x1={SCALE.x1} top={y(728)} at={start + 4} />

      {ROWS.map((r, i) => {
        const top = y(r.top);
        const at = i === 0 ? weightedAt - 6 : mixAt - 4;
        const grow = ease(frame, growAt[i], 22);
        const w = (px(r.rate) - SCALE.x0) * grow;
        return (
          <React.Fragment key={r.mix}>
            <Ink at={at} dur={14} style={{ left: 120, top: top + 2, whiteSpace: "nowrap" }}>
              <div style={{ ...body(28), color: INK, lineHeight: 1.15 }}>{r.head}</div>
              <div style={{ ...note(20, INK_SOFT), marginTop: 4 }}>{r.sub}</div>
            </Ink>
            <Note at={at + 6} x={120} y={top + 82}>
              <MixStrip group={r.mix} x={0} top={0} width={240} />
            </Note>
            <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
              <rect
                x={SCALE.x0}
                y={top}
                width={w}
                height={h(BAR_H)}
                fill={i === 0 ? COLOR.women : ds("orange", 400)}
              />
            </svg>
            {i === 0 ? (
              // Inside the bar's end, clear of the men's line.
              <Note at={growAt[0] + 14} x={SCALE.x0 + w - 16} y={top + h(BAR_H) / 2 - 31} align="right">
                <span style={{ ...headline(52), color: PAPER }}>{pct(r.rate)}</span>
              </Note>
            ) : (
              <Note at={fiftyTwoAt + 2} x={SCALE.x0 + w + 20} y={top + h(BAR_H) / 2 - 31}>
                <span style={{ display: "flex", alignItems: "baseline", gap: 14, whiteSpace: "nowrap" }}>
                  <span style={{ ...headline(56), color: COLOR_INK.women }}>{pct(r.rate)}</span>
                </span>
              </Note>
            )}
          </React.Fragment>
        );
      })}

      {/* The leaning: almost all of the women's weight sat on C to F. */}
      <Note at={leanedAt - 2} x={SCALE.x0 + 14} y={y(ROWS[0].top) + h(BAR_H) + 12}>
        <span style={note(22, COLOR_INK.women)}>
          <b>{pct(1 - EASY_SHARE.women, 0)}</b> of the weight on C to F, the four hardest
        </span>
      </Note>

      {/* The men's rate, as a line both bars are read against. */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: ease(frame, weightedAt, 14) }}>
        <line
          x1={menX}
          x2={menX}
          y1={y(364)}
          y2={y(364) + (y(708) - y(364)) * ease(frame, weightedAt, 18)}
          stroke={COLOR.men}
          strokeWidth={3}
          strokeDasharray="9 7"
        />
      </svg>
      <Note at={weightedAt + 6} x={menX} y={y(328)} align="left" style={{ transform: "translateX(-50%)" }}>
        <span style={{ ...label(21, COLOR_INK.men), whiteSpace: "nowrap" }}>Men, {pct(TOTAL.men.rate)}</span>
      </Note>
      <Note at={aheadAt} x={px(WOMEN_AT_MEN_MIX) + 190} y={y(ROWS[1].top) + h(BAR_H) / 2 - 14}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
          {((WOMEN_AT_MEN_MIX - TOTAL.men.rate) * 100).toFixed(1)} points ahead of the men
        </span>
      </Note>
    </AbsoluteFill>
  );
};
