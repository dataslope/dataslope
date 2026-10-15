import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, body, headline, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { ds, type Step } from "../../theme/brand";
import {
  COLOR_INK,
  type Dept,
  DEPTS,
  EASY,
  EASY_RATE,
  EASY_SHARE,
  type Group,
  GROUPS,
  HARD_RATE,
  NAME,
  pct,
  share,
  TOTAL,
  VIDEO,
} from "./data";

const BX0 = 360;
const BX1 = 1400;
const BAR_TOP = { men: 330, women: 540 };
const BAR_H = 96;
const HUE = { men: "blue", women: "orange" } as const;

/** Darker is harder to get into: each department's shade from its admission
 *  rate, for both groups together. */
const step = (d: Dept): Step => (d.rate >= 0.5 ? 300 : d.rate >= 0.3 ? 500 : d.rate >= 0.2 ? 700 : 900);
const onLight = (d: Dept) => step(d) === 300;

/** Each department's left edge and width along a group's bar. */
const segments = (g: Group) => {
  let x = BX0;
  return DEPTS.map((d) => {
    const w = (BX1 - BX0) * share(d, g);
    const seg = { d, x, w };
    x += w;
    return seg;
  });
};

/**
 * Question, where, men-mix, women-mix: the same 4,526 applicants by where they
 * applied. The men's bar is mostly the two departments that admitted most
 * people; the women's is mostly the four that turned most away.
 */
export const MixScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();
  const start = n.beat("question").from;
  const worseAt = n.word("question", "worse overall");
  const whereAt = n.word("where", "where");
  const menAt = n.word("men-mix", "A and B");
  const twoInThreeAt = n.word("men-mix", "two in three");
  const womenAt = n.word("women-mix", "other four");
  const awayAt = n.word("women-mix", "turned most");
  const doors = pop(frame, whereAt - 2, fps, 16);

  const bracket = (g: Group, from: number, to: number, at: number) => {
    const p = ease(frame, at, 14);
    const above = g === "men";
    const yy = above ? y(BAR_TOP.men) - 14 : y(BAR_TOP.women) + h(BAR_H) + 14;
    const tick = above ? 10 : -10;
    return (
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: p > 0 ? 1 : 0 }}>
        <path
          d={`M${from},${yy + tick} L${from},${yy} L${from + (to - from) * p},${yy}${p >= 1 ? ` L${to},${yy + tick}` : ""}`}
          fill="none"
          stroke={COLOR_INK[g]}
          strokeWidth={2.4}
        />
      </svg>
    );
  };
  const men = segments("men");
  const women = segments("women");
  const easyEnd = men.filter((s) => EASY.includes(s.d.dept)).reduce((x, s) => Math.max(x, s.x + s.w), BX0);
  const hardStart = women.find((s) => !EASY.includes(s.d.dept))?.x ?? BX0;

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 116, top: y(104), display: "flex", gap: "0.26em", ...headline(56) }}>
        <Ink at={start - 14} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
          Better in most departments,
        </Ink>
        <Ink
          at={worseAt - 2}
          dur={18}
          style={{ position: "relative", ...headline(56, true), color: ACCENT_INK, whiteSpace: "nowrap" }}
        >
          worse overall?
        </Ink>
      </div>
      <FigLabel n="3" title="Where each group applied, share of its applicants" at={whereAt - 8} x={120} y={y(196)} />

      {GROUPS.map((g, gi) => {
        const top = y(BAR_TOP[g]);
        const segs = g === "men" ? men : women;
        return (
          <React.Fragment key={g}>
            <Ink at={whereAt - 4 + gi * 4} dur={14} style={{ left: 120, top: top + 6 }}>
              <div style={{ ...body(34), color: INK }}>{NAME[g]}</div>
              <div style={{ ...note(20, INK_SOFT), marginTop: 2 }}>
                {TOTAL[g].applied.toLocaleString("en-US")} applicants
              </div>
            </Ink>
            {segs.map(({ d, x, w }, i) => {
              const grow = ease(frame, whereAt + gi * 6 + i * 3, 14);
              const roomy = w >= 40;
              return (
                <React.Fragment key={d.dept}>
                  <div
                    style={{
                      position: "absolute",
                      left: x,
                      top,
                      width: Math.max(0, w - 3) * grow,
                      height: h(BAR_H),
                      background: ds(HUE[g], step(d)),
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: x,
                      width: roomy ? w - 3 : undefined,
                      // A sliver too thin to hold its letter is labelled just outside the bar.
                      top: roomy ? top + h(BAR_H) / 2 - 20 : g === "men" ? top - 34 : top + h(BAR_H) + 6,
                      textAlign: roomy ? "center" : "left",
                      opacity: ease(frame, whereAt + gi * 6 + i * 3 + 8, 10),
                      ...label(roomy ? 26 : 20, roomy ? (onLight(d) ? INK : PAPER) : INK_SOFT),
                      fontWeight: 700,
                    }}
                  >
                    {d.dept}
                  </div>
                </React.Fragment>
              );
            })}
          </React.Fragment>
        );
      })}

      {/* Half of the men: A and B. */}
      {bracket("men", BX0, easyEnd - 3, menAt - 4)}
      <Note at={menAt} x={BX0} y={y(BAR_TOP.men) - 82}>
        <span style={{ ...label(22, COLOR_INK.men) }}>{pct(EASY_SHARE.men, 0)} applied to A or B</span>
        <span style={{ ...note(22, INK_SOFT), marginLeft: 12, opacity: ease(frame, twoInThreeAt - 2, 12) }}>
          which admitted {pct(EASY_RATE, 0)} of applicants
        </span>
      </Note>

      {/* Ninety-three percent of the women: C to F. */}
      {bracket("women", hardStart, BX1 - 3, womenAt - 4)}
      <Note at={womenAt} x={hardStart} y={y(BAR_TOP.women) + h(BAR_H) + 32}>
        <span style={{ ...label(22, COLOR_INK.women) }}>
          {pct(1 - EASY_SHARE.women, 0)} applied to C, D, E or F
        </span>
        <span style={{ ...note(22, INK_SOFT), marginLeft: 12, opacity: ease(frame, awayAt - 2, 12) }}>
          which admitted {pct(HARD_RATE, 0)}
        </span>
      </Note>

      {/* The key: what the shades mean. */}
      <Note at={whereAt + 20} x={BX0} y={y(790)}>
        <div style={{ display: "flex", alignItems: "center", gap: 22, whiteSpace: "nowrap" }}>
          <span style={label(20, INK_SOFT)}>Darker is harder to get into. Admitted, both groups:</span>
          {DEPTS.map((d) => (
            <span key={d.dept} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 18, height: 18, background: ds("gray", step(d)), display: "inline-block" }} />
              <span style={{ ...note(21, INK), fontWeight: 650 }}>{d.dept}</span>
              <span style={note(21, INK_SOFT)}>{pct(d.rate, 0)}</span>
            </span>
          ))}
        </div>
      </Note>

      <Illustration
        video={VIDEO}
        id="sp-doors"
        style={{
          position: "absolute",
          left: 1470,
          top: y(300),
          width: 330,
          height: 360,
          opacity: doors,
          transform: `translateY(${bob(frame, 4, 100) + (1 - doors) * 24}px)`,
        }}
      />
    </AbsoluteFill>
  );
};
