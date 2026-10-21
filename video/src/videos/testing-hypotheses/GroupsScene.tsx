import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { body, fmt, halo, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ANOVA, jitter, PAIRWISE, WAREHOUSES } from "./data";
import { Count, DOT, Head, Kicker, Label, Mark, pct, pulse, RAW, Spot, STAT, STAT_INK, Svg } from "./parts";

/** Five groups in a ring, drawn centred on the page until F arrives, then slid here. */
const RING = { x: 440, y: 560, r: 170 };
const NODES = Array.from({ length: 5 }, (_, i) => {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
  return { x: RING.x + RING.r * Math.cos(a), y: RING.y + RING.r * Math.sin(a), name: "ABCDE"[i] };
});
const PAIRS: [number, number][] = [];
for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) PAIRS.push([i, j]);

/** The warehouses: hours to fulfil an order. */
const W: XScale = { lo: 14, hi: 40, x0: 1000, x1: 1740 };
const ROW_Y = [600, 685, 770];
const AXIS = 830;
/** How far right of its home the ring sits while it is the only figure. */
const RING_SHIFT = 520;
const JIT = WAREHOUSES.map((_, k) => jitter(900 + k, 40));

/**
 * Ten pairwise tests of five identical groups fire 32% of the time; ANOVA
 * asks once, with F as the spread between the means over the spread within
 * the groups, and on the lesson's three warehouses finds F = 12.2 without
 * naming the slow one.
 */
export const GroupsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const groupsFrom = n.beat("groups").from;
  const fiveAt = n.word("groups", "Five groups");
  const tenAt = n.word("groups", "ten pairs");
  const sameAt = n.word("groups", "same process");
  const thirtyAt = n.word("groups", "thirty-two");
  const significantAt = n.word("groups", "significant");
  const manyAt = n.word("once", "many-looks");
  const trialsAt = n.word("groups", "trials");
  const againAt = n.word("once", "again");
  const anovaAt = n.word("once", "ANOVA");
  const anyAt = n.word("once", "any");
  const fAt = n.word("ftest", "F statistic");
  const betweenAt = n.word("ftest", "between");
  const withinAt = n.word("ftest", "within");
  const groupMeansAt = n.word("ftest", "group means");
  const noDiffAt = n.word("fone", "no real difference");
  const nearOneAt = n.word("fone", "near one");
  const wareAt = n.word("warehouses", "warehouses'");
  const twelveAt = n.word("warehouses", "twelve");
  const differsAt = n.word("warehouses", "differs");
  const whichAt = n.word("warehouses", "which");

  const ry = (yy: number) => y(yy);
  const nodeIn = (i: number) => ease(frame, fiveAt - 4 + i * 3, 10);
  const edgeAt = (k: number) => tenAt - 2 + k * 3.2;
  const flash = pulse(frame, againAt - 2, 26) + pulse(frame, significantAt - 2, 26);
  const edgesOut = ease(frame, anovaAt - 2, 16);
  const ring = ease(frame, anyAt - 6, 20);
  const ringLeave = ease(frame, wareAt - 8, 16);
  const ringHome = ease(frame, fAt - 10, 22);
  const stripIn = (k: number) => ease(frame, wareAt - 2 + k * 6, 14);
  const south = pulse(frame, differsAt - 2, 30);
  const means = WAREHOUSES.map((g) => sx(W, g.mean));
  const between = ease(frame, twelveAt - 18, 14);

  return (
    <AbsoluteFill>
      {/* ── Sound: ten edges, the 32%, the one ring, the three warehouses, the alarm ── */}
      {PAIRS.map((_, k) => (k % 2 === 0 ? <Sfx key={k} name="el-tap" at={edgeAt(k)} level={-31} /> : null))}
      <Sfx name="el-tap" at={thirtyAt - 2} level={-28} />
      <Sfx name="el-pencil" at={anyAt - 6} level={-34} />
      <Sfx name="el-sprinkle" at={wareAt - 2} level={-33} />
      <Sfx name="el-pop" at={whichAt - 6} level={-30} />

      <Kicker at={groupsFrom - 10}>ANOVA and chi-square</Kicker>
      <Head a="Ten pairs," b="ten chances." at={groupsFrom - 6} bAt={tenAt - 2} out={anovaAt - 8} />
      <Head a="ANOVA asks" b="once." at={anovaAt - 4} bAt={anyAt - 4} />
      <Ink at={anovaAt + 8} dur={14} style={{ left: 96, top: y(150) + 96, whiteSpace: "nowrap" }}>
        <Label size={22} color={INK_SOFT} weight={520}>
          analysis of variance
        </Label>
      </Ink>

      {/* ── Five groups and every pair between them ── */}
      <div style={{ position: "absolute", inset: 0, opacity: 1 - ringLeave, transform: `translateX(${RING_SHIFT * (1 - ringHome)}px)` }}>
        <Svg>
          {PAIRS.map(([i, j], k) => {
            const p = ease(frame, edgeAt(k), 10);
            if (p <= 0 || edgesOut >= 1) return null;
            const a = NODES[i];
            const b = NODES[j];
            return (
              <line
                key={k}
                x1={a.x}
                y1={ry(a.y)}
                x2={a.x + (b.x - a.x) * p}
                y2={ry(a.y) + (ry(b.y) - ry(a.y)) * p}
                stroke={STAT}
                strokeWidth={2.4 + 2 * flash}
                opacity={(0.65 + 0.35 * flash) * (1 - edgesOut)}
              />
            );
          })}
          {ring > 0 ? (
            <circle
              cx={RING.x}
              cy={ry(RING.y)}
              r={RING.r + 70}
              fill="none"
              stroke={INK}
              strokeWidth={3}
              pathLength={1}
              strokeDasharray={`${ring} 1`}
              transform={`rotate(-90 ${RING.x} ${ry(RING.y)})`}
            />
          ) : null}
          {NODES.map((nd, i) => {
            const a = nodeIn(i);
            if (a <= 0) return null;
            // All five in one ink: nothing tells them apart.
            return <circle key={i} cx={nd.x} cy={ry(nd.y)} r={34 * a} fill={RAW} stroke={PAPER} strokeWidth={3} />;
          })}
        </Svg>
        {NODES.map((nd, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: nd.x,
              top: ry(nd.y) - 15,
              transform: "translateX(-50%)",
              opacity: nodeIn(i),
              ...label(24, INK),
            }}
          >
            {nd.name}
          </div>
        ))}
        <Note at={sameAt - 2} x={160} y={ry(RING.y + RING.r + 110)}>
          <Label size={22} color={INK_SOFT} weight={520}>
            all five drawn from the same process
          </Label>
        </Note>
        <Note at={thirtyAt - 4} x={160} y={ry(RING.y + RING.r + 110) + 40}>
          <span
            style={{
              ...note(26, STAT_INK),
              fontWeight: 700,
              whiteSpace: "nowrap",
              display: "inline-block",
              transform: `scale(${1 + 0.06 * pulse(frame, trialsAt, 24)})`,
              transformOrigin: "0 50%",
            }}
          >
            some pair fires in <Count at={thirtyAt - 4} to={PAIRWISE.rate} dur={20} format={(v) => pct(v, 0)} /> of{" "}
            {fmt(PAIRWISE.trials, 0)} trials
          </span>
        </Note>
        <Note at={manyAt - 2} x={160} y={ry(RING.y + RING.r + 110) + 84}>
          <Label size={21} color={INK_SOFT} weight={520}>
            the many-looks problem, again
          </Label>
        </Note>
        <Note at={anyAt + 6} x={RING.x} y={ry(RING.y - RING.r - 130)} from="up">
          <span style={{ display: "inline-block", transform: "translateX(-50%)" }}>
            <Label size={24}>one test of all five</Label>
          </span>
        </Note>
      </div>

      {/* ── F: between over within ── */}
      <Ink at={fAt - 4} dur={16} style={{ left: W.x0, top: y(310), whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 22 }}>
        <span style={{ ...body(64, true), color: INK }}>F =</span>
        <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <span style={{ ...body(32, true), color: STAT_INK, opacity: ease(frame, betweenAt - 4, 12) }}>
            <Mark at={groupMeansAt}>spread between the group means</Mark>
          </span>
          <span style={{ width: 470, height: 3, background: INK }} />
          <span style={{ ...body(32, true), color: INK, opacity: ease(frame, withinAt - 4, 12) }}>spread within the groups</span>
        </span>
      </Ink>
      {/* The baseline that makes twelve mean something. */}
      <Ink at={noDiffAt - 2} dur={14} style={{ left: W.x0, top: y(310) + 112, whiteSpace: "nowrap" }}>
        <Label size={24} color={INK_SOFT} weight={520}>
          no real difference:{" "}
          <span style={{ color: INK, opacity: ease(frame, nearOneAt - 4, 12) }}>
            F ≈ 1
          </span>
        </Label>
      </Ink>

      {/* ── Fig. 19: the three warehouses ── */}
      <FigLabel n="19" title="Delivery hours, three warehouses" at={wareAt - 4} x={W.x0} y={y(455)} />
      <Axis scale={W} base={y(AXIS)} ticks={[15, 20, 25, 30, 35, 40]} at={wareAt - 4} />
      <Note at={wareAt} x={W.x1} y={y(AXIS) + 40} align="right">
        <Label size={21} color={INK_SOFT} weight={520}>
          hours to fulfil an order
        </Label>
      </Note>
      <Svg>
        {WAREHOUSES.map((g, k) => {
          const a = stripIn(k);
          if (a <= 0) return null;
          const yy = y(ROW_Y[k]);
          // All three swell together: ANOVA says something differs, not which.
          const glow = south;
          return (
            <g key={g.name}>
              {g.values.map((v, j) => (
                <circle key={j} cx={sx(W, v)} cy={yy + h((JIT[k][j] - 0.5) * 36)} r={5.5 * a} fill={DOT} opacity={0.7 + 0.3 * glow} />
              ))}
              {/* Within, at the scale of a mean: SD / sqrt(n) either side. F compares
                  the spread of the means with this, which is why 12 is large. */}
              <g opacity={ease(frame, wareAt + 12 + k * 4, 10)}>
                {(() => {
                  const se = g.sd / Math.sqrt(g.values.length);
                  const x0 = sx(W, g.mean - se);
                  const x1 = sx(W, g.mean + se);
                  const yb = yy + h(30);
                  return (
                    <>
                      <line x1={x0} x2={x1} y1={yb} y2={yb} stroke={INK} strokeWidth={3} />
                      <line x1={x0} x2={x0} y1={yb - 7} y2={yb + 7} stroke={INK} strokeWidth={2.4} />
                      <line x1={x1} x2={x1} y1={yb - 7} y2={yb + 7} stroke={INK} strokeWidth={2.4} />
                    </>
                  );
                })()}
              </g>
              <line x1={means[k]} x2={means[k]} y1={yy - h(26)} y2={yy + h(26)} stroke={STAT} strokeWidth={4 + 2 * glow} strokeLinecap="round" opacity={ease(frame, wareAt + 8 + k * 4, 10)} />
            </g>
          );
        })}
        {/* Between: how far apart the three means sit. */}
        {between > 0 ? (
          <line
            x1={Math.min(...means)}
            x2={Math.min(...means) + (Math.max(...means) - Math.min(...means)) * between}
            y1={y(ROW_Y[0]) - h(52)}
            y2={y(ROW_Y[0]) - h(52)}
            stroke={STAT}
            strokeWidth={3}
          />
        ) : null}
      </Svg>
      {WAREHOUSES.map((g, k) => (
        <div
          key={g.name}
          style={{ position: "absolute", right: 1920 - W.x0 + 20, top: y(ROW_Y[k]) - 15, opacity: stripIn(k), ...label(24, INK) }}
        >
          {g.name}
        </div>
      ))}
      <Note at={twelveAt - 16} x={Math.min(...means) - 12} y={y(ROW_Y[0]) - h(52) - 14} align="right">
        <Label size={21} color={STAT_INK}>
          between
        </Label>
      </Note>
      <Note at={wareAt + 24} x={W.x0} y={y(AXIS) + 72}>
        <Label size={21} color={INK} weight={520}>
          black bars: the spread within, at the scale of a mean (SD ÷ √{WAREHOUSES[0].values.length})
        </Label>
      </Note>
      <Note at={twelveAt - 4} x={W.x1} y={y(ROW_Y[0]) - h(52) - 52} align="right">
        <span style={{ ...note(34, STAT_INK), fontWeight: 700, ...halo, whiteSpace: "nowrap" }}>F = {fmt(ANOVA.F, 1)}</span>
      </Note>
      <Spot id="testing-hypotheses-alarm" at={whichAt - 6} left={240} top={y(470)} width={260} height={260} />
      <Note at={whichAt - 2} x={170} y={y(470) + 290}>
        <span style={{ ...body(32, true), color: INK }}>Something differs. Not which.</span>
      </Note>
    </AbsoluteFill>
  );
};
