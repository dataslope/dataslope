import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, halo, HAIRLINE, headline, INK, INK_SOFT, label, note, PAPER, TABULAR } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { count, kTokens, MONEY, RECALL } from "./data";
import { Drift, Headline, Illustrative, Kicker, Svg, tint, X0 } from "./kit";

/** Fig. 14: one block per turn. */
const BLOCK_Y = 304;
const BLOCK_W = 84;
const BLOCK_PITCH = 94;
const BLOCK_H = 56;
/** Fig. 15: recall against position, 0 to 100% of the context. */
const CX0 = 300;
const CX1 = 1380;
const R_LO = 0.55;
const R_HI = 1.0;
const C_TOP = 494;
const C_BASE = 830;
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
 * Costs, middle, permission: what a full window costs in money (a 500,000
 * token document resent over ten turns) and in attention (the lesson's
 * stylized "lost in the middle" recall), and the lesson's rule.
 */
export const CostScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y } = useLayout();
  const start = n.beat("costs").from;
  const everyTurnAt = n.word("costs", "every turn");
  const tenAt = n.word("costs", "ten turns");
  const fiveMAt = n.word("costs", "five million");
  const cacheAt = n.word("costs", "cache");
  const readAt = n.word("middle", "read it all");
  const startAt = n.word("middle", "the start");
  const endAt = n.word("middle", "the end");
  const sagsAt = n.word("middle", "middle sags");
  const lostAt = n.word("middle", "lost in the middle");
  const biggerAt = n.word("permission", "bigger window");
  const notAt = n.word("permission", "not a recommendation");

  // The blocks land one turn at a time, from "every turn" to "ten turns".
  const blockAt = (j: number) => everyTurnAt + ((tenAt - everyTurnAt) * j) / (MONEY.turns - 1);
  const landed = Array.from({ length: MONEY.turns }, (_, j) => (frame >= blockAt(j) ? 1 : 0)).reduce<number>((a, b) => a + b, 0);

  const xAt = (at: number) => CX0 + ((CX1 - CX0) * at) / 100;
  const yAt = (r: number) => y(C_BASE) - ((y(C_BASE) - y(C_TOP)) * (r - R_LO)) / (R_HI - R_LO);
  const pts = RECALL.map((p) => [xAt(p.at), yAt(p.recall)] as const);
  const curve = ease(frame, readAt - 2, 40);
  const worst = RECALL.reduce((a, b) => (b.recall < a.recall ? b : a));
  const first = RECALL[0];
  const last = RECALL[RECALL.length - 1];

  return (
    <AbsoluteFill>
      {Array.from({ length: MONEY.turns }, (_, j) => (
        <Sfx key={j} name="el-tap" at={blockAt(j)} level={-33} />
      ))}
      <Sfx name="el-pencil" at={readAt - 2} level={-35} />
      <Sfx name="el-pop" at={sagsAt - 2} level={-31} />

      <Drift from={start} to={n.beat("square").from} amount={0.012} origin="45% 60%">
      <Kicker at={start - 6}>Context windows</Kicker>
      <Headline lead="Filling it isn't free." at={start - 4} out={biggerAt - 8} />
      <Headline lead="A bigger window is permission," turn="not a recommendation." at={biggerAt - 4} turnAt={notAt - 2} size={56} />

      {/* Fig. 14: the same document, billed again on every turn. */}
      <FigLabel n="14" title="One 500,000-token document, resent on every turn" at={start} x={X0} y={y(240)} />
      {Array.from({ length: MONEY.turns }, (_, j) => {
        const s = pop(frame, blockAt(j), fps, 14);
        if (s <= 0.001) return null;
        return (
          <div
            key={j}
            style={{
              position: "absolute",
              left: X0 + j * BLOCK_PITCH,
              top: y(BLOCK_Y),
              width: BLOCK_W,
              height: BLOCK_H,
              boxSizing: "border-box",
              background: tint(BAR, 24),
              borderBottom: `4px solid ${BAR}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: Math.min(1, s),
              transform: `translateY(${(1 - Math.min(1, s)) * -16}px)`,
              ...note(21, BLUE_INK),
              fontWeight: 650,
            }}
          >
            {kTokens(MONEY.document)}
          </div>
        );
      })}
      <Note at={blockAt(0)} x={X0} y={y(BLOCK_Y) + BLOCK_H + 10}>
        <span style={note(20, INK_SOFT)}>turn 1</span>
      </Note>
      <Note at={blockAt(MONEY.turns - 1)} x={X0 + (MONEY.turns - 1) * BLOCK_PITCH + BLOCK_W} y={y(BLOCK_Y) + BLOCK_H + 10} align="right">
        <span style={note(20, INK_SOFT)}>turn {MONEY.turns}</span>
      </Note>
      {/* The running bill: true at every moment, the blocks on screen times 500,000. */}
      {landed > 0 ? (
        <div style={{ position: "absolute", left: X0 + MONEY.turns * BLOCK_PITCH + 40, top: y(BLOCK_Y) - 40, whiteSpace: "nowrap" }}>
          <div style={{ ...label(21, INK_SOFT), marginBottom: 6 }}>Input tokens billed</div>
          <span style={{ ...headline(60), color: frame >= fiveMAt - 2 ? ACCENT_INK : INK, ...TABULAR }}>
            {count(landed * MONEY.document)}
          </span>
        </div>
      ) : null}
      <Note at={cacheAt - 2} x={X0 + MONEY.turns * BLOCK_PITCH + 40} y={y(BLOCK_Y) + 64}>
        <span style={note(20, INK_SOFT)}>unless a cache steps in</span>
      </Note>

      {/* Fig. 15: recall by position, the lesson's stylized U. */}
      <FigLabel n="15" title="How often a fact is recalled, by where it sits in a long context" at={readAt - 6} x={X0} y={y(424)} />
      <Svg opacity={ease(frame, readAt - 4, 12)}>
        {R_TICKS.map((r) => (
          <line key={r} x1={CX0} x2={CX1} y1={yAt(r)} y2={yAt(r)} stroke={HAIRLINE} strokeWidth={r === R_HI ? 0.8 : 0.8} strokeDasharray="2 5" />
        ))}
        <line x1={CX0} x2={CX1} y1={y(C_BASE)} y2={y(C_BASE)} stroke={INK} strokeWidth={1.6} />
        <path
          d={smooth(pts)}
          fill="none"
          stroke={BAR}
          strokeWidth={3.2}
          pathLength={1}
          strokeDasharray={`${curve} 1`}
        />
        {RECALL.map((p, i) => {
          const at = readAt + 4 + i * 5;
          const isWorst = p === worst;
          const s = ease(frame, at, 10);
          return <circle key={p.position} cx={pts[i][0]} cy={pts[i][1]} r={isWorst ? 7 : 5.5} fill={isWorst ? ACCENT : BAR} stroke={PAPER} strokeWidth={2} opacity={s} />;
        })}
      </Svg>
      {R_TICKS.map((r) => (
        <div key={r} style={{ position: "absolute", right: 1920 - CX0 + 14, top: yAt(r) - 13, opacity: ease(frame, readAt - 2, 12), ...note(20, INK_SOFT) }}>
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
            opacity: ease(frame, readAt, 12),
            ...note(20, INK_SOFT),
          }}
        >
          {p.position}
        </div>
      ))}
      <Ink at={readAt + 4} dur={12} style={{ left: CX0, top: y(C_BASE) + 46, width: CX1 - CX0, textAlign: "center" }}>
        <span style={label(20)}>Where the fact sits in the context</span>
      </Ink>
      <Note at={startAt - 2} x={pts[0][0] + 14} y={pts[0][1] - 44}>
        <span style={{ ...note(23, BLUE_INK), fontWeight: 650, ...halo }}>{Math.round(first.recall * 100)}%</span>
      </Note>
      <Note at={endAt - 2} x={pts[pts.length - 1][0] - 14} y={pts[pts.length - 1][1] - 44} align="right">
        <span style={{ ...note(23, BLUE_INK), fontWeight: 650, ...halo }}>{Math.round(last.recall * 100)}%</span>
      </Note>
      <Note at={sagsAt - 2} x={xAt(worst.at)} y={yAt(worst.recall) + 20} from="up" style={{ transform: "translateX(-50%)" }}>
        <span style={{ ...note(23, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap", ...halo }}>
          {Math.round(worst.recall * 100)}% halfway through
        </span>
      </Note>
      <Ink at={lostAt - 2} dur={18} style={{ left: xAt(worst.at) - 200, width: 400, top: yAt(0.86), textAlign: "center" }}>
        <span style={{ ...headline(40, true), color: ACCENT_INK }}>Lost in the middle</span>
      </Ink>
      <Note at={readAt + 30} x={1450} y={y(560)} width={400}>
        <Illustrative>Stylized heights, from the lesson. The U shape is the finding that replicates.</Illustrative>
      </Note>
      </Drift>
    </AbsoluteFill>
  );
};
