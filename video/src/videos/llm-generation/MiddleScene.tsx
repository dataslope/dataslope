import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, halo, HAIRLINE, headline, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { RECALL } from "./data";
import { Drift, Headline, Illustrative, Kicker, Svg, X0 } from "./kit";

/** Fig. 15: recall against position, 0 to 100% of the context. */
const CX0 = 300;
const CX1 = 1420;
const R_LO = 0.55;
const R_HI = 1.0;
const C_TOP = 340;
const C_BASE = 800;
const R_TICKS = [0.6, 0.7, 0.8, 0.9];

/** A smooth path through points (Catmull-Rom, drawn as cubic Béziers). */
const smooth = (pts: readonly (readonly [number, number])[]) => {
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
};

/**
 * Middle, permission: what a full window costs in attention, the lesson's
 * stylized "lost in the middle" recall (labelled so), and its rule.
 */
export const MiddleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();
  const start = n.beat("middle").from;
  const readAt = n.word("middle", "read it all");
  const startAt = n.word("middle", "the start");
  const endAt = n.word("middle", "the end");
  const sagsAt = n.word("middle", "middle sags");
  const lostAt = n.word("middle", "lost in the middle");
  const biggerAt = n.word("permission", "bigger window");
  const notAt = n.word("permission", "not a recommendation");

  const xAt = (at: number) => CX0 + ((CX1 - CX0) * at) / 100;
  const yAt = (r: number) => y(C_BASE) - ((y(C_BASE) - y(C_TOP)) * (r - R_LO)) / (R_HI - R_LO);
  const pts = RECALL.map((p) => [xAt(p.at), yAt(p.recall)] as const);
  const curve = ease(frame, start + 4, 40);
  const worst = RECALL.reduce((a, b) => (b.recall < a.recall ? b : a));
  const first = RECALL[0];
  const last = RECALL[RECALL.length - 1];

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={start + 4} level={-35} />
      <Sfx name="el-pop" at={sagsAt - 2} level={-31} />
      <Sfx name="el-whoosh" at={biggerAt - 4} level={-36} />

      <Drift from={start} to={n.beat("square").from} amount={0.012} origin="45% 60%">
        <Kicker at={start - 6}>Context windows</Kicker>
        <Headline lead="It doesn't read it all" turn="equally well." at={start - 4} turnAt={readAt + 6} out={biggerAt - 8} />
        <Headline lead="A bigger window is permission," turn="not a recommendation." at={biggerAt - 4} turnAt={notAt - 2} size={56} />

        {/* Fig. 15: recall by position, the lesson's stylized U. */}
        <FigLabel n="15" title="How often a fact is recalled, by where it sits in a long context" at={start - 2} x={X0} y={y(250)} />
        <Svg opacity={ease(frame, start - 2, 12)}>
          {R_TICKS.map((r) => (
            <line key={r} x1={CX0} x2={CX1} y1={yAt(r)} y2={yAt(r)} stroke={HAIRLINE} strokeWidth={0.8} strokeDasharray="2 5" />
          ))}
          <line x1={CX0} x2={CX1} y1={y(C_BASE)} y2={y(C_BASE)} stroke={INK} strokeWidth={1.6} />
          <path d={smooth(pts)} fill="none" stroke={BAR} strokeWidth={3.4} pathLength={1} strokeDasharray={`${curve} 1`} />
          {RECALL.map((p, i) => {
            const isWorst = p === worst;
            return (
              <circle
                key={p.position}
                cx={pts[i][0]}
                cy={pts[i][1]}
                r={isWorst ? 8 : 6}
                fill={isWorst ? ACCENT : BAR}
                stroke={PAPER}
                strokeWidth={2}
                opacity={ease(frame, start + 6 + i * 5, 10)}
              />
            );
          })}
        </Svg>
        {R_TICKS.map((r) => (
          <div key={r} style={{ position: "absolute", right: 1920 - CX0 + 14, top: yAt(r) - 13, opacity: ease(frame, start, 12), ...note(20, INK_SOFT) }}>
            {Math.round(r * 100)}%
          </div>
        ))}
        {RECALL.map((p) => (
          <div
            key={p.position}
            style={{
              position: "absolute",
              left: xAt(p.at) - 50,
              width: 100,
              top: y(C_BASE) + 12,
              textAlign: "center",
              opacity: ease(frame, start + 2, 12),
              ...note(20, INK_SOFT),
            }}
          >
            {p.position}
          </div>
        ))}
        <Ink at={start + 6} dur={12} style={{ left: CX0, top: y(C_BASE) + 46, width: CX1 - CX0, textAlign: "center" }}>
          <span style={label(20)}>Where the fact sits in the context</span>
        </Ink>
        <Note at={startAt - 2} x={pts[0][0] + 16} y={pts[0][1] - 46}>
          <span style={{ ...note(26, BLUE_INK), fontWeight: 650, ...halo }}>{Math.round(first.recall * 100)}%</span>
        </Note>
        <Note at={endAt - 2} x={pts[pts.length - 1][0] - 16} y={pts[pts.length - 1][1] - 46} align="right">
          <span style={{ ...note(26, BLUE_INK), fontWeight: 650, ...halo }}>{Math.round(last.recall * 100)}%</span>
        </Note>
        <Note at={sagsAt - 2} x={xAt(worst.at)} y={yAt(worst.recall) + 22} from="up" style={{ transform: "translateX(-50%)" }}>
          <span style={{ ...note(26, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap", ...halo }}>
            {Math.round(worst.recall * 100)}% halfway through
          </span>
        </Note>
        <Ink at={lostAt - 2} dur={18} style={{ left: xAt(worst.at) - 220, width: 440, top: yAt(0.87), textAlign: "center" }}>
          <span style={{ ...headline(46, true), color: ACCENT_INK }}>Lost in the middle</span>
        </Ink>
        <Note at={start + 30} x={1490} y={y(470)} width={340}>
          <Illustrative>Stylized heights, from the lesson. The U shape is the finding that replicates.</Illustrative>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
