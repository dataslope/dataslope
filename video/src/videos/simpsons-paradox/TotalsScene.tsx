import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, body, headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { COLOR, COLOR_INK, GROUPS, NAME, pct, TOTAL, VIDEO } from "./data";
import { Gridlines, RateScale } from "./parts";

/** Fig. 1's bars run 0 to 100% across this span. */
const SCALE = { x0: 420, x1: 1620 };
const ROW_TOP = { men: 470, women: 604 };
const BAR_H = 84;

/**
 * Hook and totals: the pooled admission rates, the comparison that made
 * Berkeley look biased.
 */
export const TotalsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();
  const awayAt = n.word("hook", "turning women away", { edge: "end" });
  const envelopesAt = n.word("hook", "Berkeley's");
  const figAt = n.word("totals", "six largest");
  const growAt = { men: n.word("totals", "forty-five"), women: n.word("totals", "thirty percent") };
  const envelopes = pop(frame, envelopesAt - 4, fps, 16);

  return (
    <AbsoluteFill>
      <Ink at={2} dur={14} style={{ left: 96, top: y(112) }}>
        <span style={label(20, ACCENT_INK)}>Berkeley, 1973</span>
      </Ink>
      <Ink at={4} dur={20} style={{ left: 92, top: y(150), ...headline(88), whiteSpace: "nowrap" }}>
        Women were admitted
      </Ink>
      <Ink at={10} dur={20} style={{ left: 92, top: y(242), ...headline(88, true), whiteSpace: "nowrap" }}>
        <span style={{ position: "relative" }}>
          less often.
          {/* Sized in em and to the words, so it underlines them in any face. */}
          <svg
            viewBox="0 0 380 30"
            style={{ position: "absolute", left: -6, top: "0.93em", width: "calc(100% + 12px)", height: "auto", overflow: "visible" }}
          >
            <path
              d="M4,18 C80,8 190,6 372,14"
              fill="none"
              stroke={ACCENT}
              strokeWidth={5}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={`${ease(frame, awayAt - 8, 14)} 1`}
              opacity={frame > awayAt - 8 ? 1 : 0}
            />
          </svg>
        </span>
      </Ink>
      <Illustration
        video={VIDEO}
        id="sp-applications"
        style={{
          position: "absolute",
          left: 1380,
          top: y(100),
          width: 400,
          height: 290,
          opacity: envelopes,
          transform: `translateY(${bob(frame, 5, 110) + (1 - envelopes) * 30}px)`,
        }}
      />

      <FigLabel n="1" title="Share of applicants admitted, six largest departments" at={figAt - 6} x={160} y={y(384)} />
      <Gridlines
        x0={SCALE.x0}
        x1={SCALE.x1}
        top={y(452)}
        bottom={y(ROW_TOP.women + BAR_H + 14)}
        at={figAt}
      />
      <RateScale x0={SCALE.x0} x1={SCALE.x1} top={y(ROW_TOP.women + BAR_H + 24)} at={figAt + 4} />

      {GROUPS.map((g) => {
        const t = TOTAL[g];
        const grow = ease(frame, growAt[g] - 4, 22);
        const w = (SCALE.x1 - SCALE.x0) * t.rate * grow;
        const top = y(ROW_TOP[g]);
        return (
          <React.Fragment key={g}>
            <Ink at={figAt + (g === "men" ? 2 : 6)} dur={14} style={{ left: 160, top: top + 4 }}>
              <div style={{ ...body(34), color: INK }}>{NAME[g]}</div>
              <div style={{ ...note(20, INK_SOFT), marginTop: 2 }}>{t.applied.toLocaleString("en-US")} applied</div>
            </Ink>
            <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
              <rect x={SCALE.x0} y={top} width={w} height={h(BAR_H)} fill={COLOR[g]} />
            </svg>
            <Note at={growAt[g] + 10} x={SCALE.x0 + w + 22} y={top + h(BAR_H) / 2 - 32}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 14, whiteSpace: "nowrap" }}>
                <span style={{ ...headline(56), color: COLOR_INK[g] }}>{pct(t.rate)}</span>
                <span style={note(21, INK_SOFT)}>{t.admitted.toLocaleString("en-US")} admitted</span>
              </div>
            </Note>
          </React.Fragment>
        );
      })}

      <Note at={growAt.women + 20} x={160} y={y(792)}>
        <span style={note(20, INK_SOFT)}>
          Source: Bickel, Hammel and O&apos;Connell, <i>Science</i>, 1975. The six departments took 4,526
          applications.
        </span>
      </Note>
    </AbsoluteFill>
  );
};
