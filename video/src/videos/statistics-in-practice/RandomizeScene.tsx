import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, body, fmt, halo, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BALANCE } from "./data";
import { STEP_X, STEP_Y, STEPS } from "./DesignScene";
import { Arrow, Headline, lerp, Marker, Ring, Spot, STAT, STAT_INK, Svg } from "./parts";

/** How far apart the arms sit on a trait, in standard deviations. */
const X: XScale = { lo: 0, hi: 1, x0: 560, x1: 1380 };
const ROW0 = 392;
const PITCH = 44;
const AXIS = 852;
const LABEL_RIGHT = 530;
const rowY = (i: number) => ROW0 + i * PITCH;
/** The arc's next two steps, "Sample size" and "Run to plan": the two
 *  decisions left before anyone clicks. */
const NEXT = [STEPS.indexOf("Sample size"), STEPS.indexOf("Run to plan")];

/**
 * Who sees which button: ten traits on which self-selected groups differ
 * (two of them a real test never sees, which a simulation can), and the coin
 * flip that shrinks every gap to noise, the unseen ones included. That is what
 * licenses "caused". It ends on the arc from DesignScene, the next two steps
 * lit: the two decisions left before anyone clicks.
 */
export const RandomizeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const whoFrom = n.beat("who").from;
  const chooseAt = n.word("who", "choose");
  const differAt = n.word("who", "differ");
  const startsAt = n.word("who", "even starts");
  const apartAt = n.word("traits", "far apart");
  const ageAt = n.word("traits", "Age");
  const incomeAt = n.word("traits", "income");
  const priorAt = n.word("traits", "prior use");
  const nobodyAt = n.word("traits", "never sees");
  const motivationAt = n.word("traits", "motivation");
  const coinAt = n.word("coin", "Flip a coin");
  const shrinksAt = n.word("coin", "shrinks");
  const noiseAt = n.word("coin", "noise");
  const evenAt = n.word("coin", "Even");
  const knowAt = n.word("cause", "doesn't know");
  const everythingAt = n.word("cause", "balances everything");
  const letsAt = n.word("cause", "That's what lets");
  const causedAt = n.word("cause", "CAUSED");
  const changeAt = n.word("cause", "change");
  const twoAt = n.word("size-in", "Two more");
  const decisionsAt = n.word("size-in", "decisions");
  const beforeAt = n.word("size-in", "before");

  const rows = BALANCE.rows;
  // The self-selected gaps arrive as the narration says the groups differ.
  const selfAt = (i: number) => differAt - 4 + i * 3;
  const randAt = (i: number) => shrinksAt - 10 + i * 2.5;
  const named: Record<string, number> = { Age: ageAt, Income: incomeAt, "Prior use": priorAt };
  // The figure leaves for the arc: the two decisions still to make.
  const figDim = 1 - ease(frame, twoAt - 6, 14);
  // Once the point is made, the self-selected gaps step back.
  const ghost = 1 - 0.8 * ease(frame, letsAt - 4, 16);

  return (
    <AbsoluteFill>
      {/* ── Sound: the self-selected gaps, the coin, the gaps collapsing, "caused" ── */}
      <Sfx name="el-sprinkle" at={differAt - 4} level={-33} />
      <Sfx name="el-pop" at={coinAt - 6} level={-30} />
      <Sfx name="el-whoosh" at={shrinksAt - 10} level={-33} />
      <Sfx name="el-tap" at={evenAt - 2} level={-28} />
      <Sfx name="el-pencil" at={causedAt - 6} level={-34} />
      <Sfx name="el-pencil" at={twoAt - 2} level={-35} />

      <Headline lead="Let users choose," turn="and the groups differ." at={whoFrom - 6} turnAt={differAt - 6} out={coinAt - 6} />
      <Headline lead="Flip a coin," turn="and the gaps shrink." at={coinAt - 2} turnAt={shrinksAt - 6} out={knowAt - 6} />
      <Headline lead="The coin" turn="balances everything." at={knowAt - 2} turnAt={everythingAt - 6} out={twoAt - 8} />
      <Headline lead="Two more decisions," turn="before anyone clicks." at={twoAt - 2} turnAt={beforeAt - 6} />

      <Spot id="statistics-in-practice-coin" at={coinAt - 6} out={twoAt - 6} left={1470} top={y(300)} width={290} height={270} />

      <div style={{ position: "absolute", inset: 0, opacity: figDim }}>
        <FigLabel n="2" title="Simulated users: how far apart the two groups sit, on ten traits" at={whoFrom} x={160} y={y(300)} />

        {/* A band along each trait as the narration names it: the three it reads
            out, then the two nobody recorded. */}
        <Svg>
          {rows.map((r, i) => {
            const at = named[r.key] ?? (r.unmeasured ? nobodyAt - 4 + (i - 8) * 6 : undefined);
            if (at === undefined) return null;
            const p = ease(frame, at - 4, 14);
            const off = ease(frame, coinAt - 6, 14);
            if (p <= 0 || off >= 1) return null;
            const x0 = LABEL_RIGHT - 200;
            const x1 = sx(X, r.selected) + 18;
            return (
              <rect
                key={r.key}
                x={x0}
                y={y(rowY(i)) - 19}
                width={(x1 - x0) * p}
                height={38}
                rx={8}
                fill={r.unmeasured ? STAT : HIGHLIGHT}
                opacity={(r.unmeasured ? 0.16 : 0.85) * (1 - off)}
              />
            );
          })}
        </Svg>

        {/* The usual line below which two groups count as balanced. */}
        <Svg opacity={ease(frame, apartAt - 8, 14)}>
          <line
            x1={sx(X, BALANCE.threshold)}
            x2={sx(X, BALANCE.threshold)}
            y1={y(ROW0 - 26)}
            y2={y(AXIS)}
            stroke={INK}
            strokeWidth={1.6}
            strokeDasharray="6 5"
          />
          {rows.map((_, i) => (
            <line key={i} x1={X.x0} x2={X.x1} y1={y(rowY(i))} y2={y(rowY(i))} stroke={HAIRLINE} strokeWidth={1} opacity={0.25} />
          ))}
        </Svg>
        <Ink at={shrinksAt + 6} dur={14} style={{ left: sx(X, BALANCE.threshold) + 10, top: y(AXIS) - 34, whiteSpace: "nowrap" }}>
          <span style={{ ...note(20, INK_SOFT), ...halo }}>{fmt(BALANCE.threshold, 1)}: the usual balance line</span>
        </Ink>
        {/* Age's coin-flipped gap lands a hair past that line: noise as well.
            Set in the gap under its row, off the row's connecting line. */}
        <Ink at={noiseAt + 8} dur={14} style={{ left: sx(X, rows[0].randomised) + 14, top: y(rowY(0)) + 11, whiteSpace: "nowrap" }}>
          <span style={{ ...note(20, BLUE_INK), fontWeight: 600, ...halo }}>a hair over, by chance</span>
        </Ink>
        <Axis
          scale={X}
          base={y(AXIS)}
          ticks={[0, 0.25, 0.5, 0.75, 1]}
          format={(v) => String(v)}
          at={whoFrom + 2}
        />
        <Ink at={startsAt - 4} dur={14} style={{ left: X.x1, top: y(AXIS) + 40, whiteSpace: "nowrap", transform: "translateX(-100%)" }}>
          <span style={{ ...note(20, INK_SOFT) }}>gap between the groups, in standard deviations</span>
        </Ink>

        {/* ── Row labels ── */}
        {rows.map((r, i) => {
          const at = chooseAt - 6 + i * 2;
          return (
            <Ink
              key={r.key}
              at={at}
              dur={12}
              style={{ left: LABEL_RIGHT, top: y(rowY(i)) - 15, whiteSpace: "nowrap", transform: "translateX(-100%)" }}
            >
              <span style={{ ...label(22, r.unmeasured ? STAT_INK : INK), fontStyle: r.unmeasured ? "italic" : "normal", fontWeight: 600 }}>
{r.key}
              </span>
            </Ink>
          );
        })}
        {rows.map((r, i) =>
          r.unmeasured ? (
            <Ink key={r.key} at={nobodyAt - 2 + (i - 8) * 6} dur={14} style={{ left: X.x1 + 24, top: y(rowY(i)) - 14, whiteSpace: "nowrap" }}>
              <span style={{ ...note(20, STAT_INK), fontWeight: 650 }}>unseen in a real test</span>
            </Ink>
          ) : null,
        )}

        {/* ── The gaps: self-selected in red, then randomized in blue ── */}
        <Svg>
          {rows.map((r, i) => {
            const s = ease(frame, selfAt(i), 16);
            if (s <= 0) return null;
            const t = ease(frame, randAt(i), 22);
            const xs = sx(X, r.selected * s);
            const xr = lerp(xs, sx(X, r.randomised), t);
            const yy = y(rowY(i));
            return (
              <g key={r.key}>
                {t > 0 ? <line x1={xr} x2={xs} y1={yy} y2={yy} stroke={INK_SOFT} strokeWidth={1.6} opacity={0.35 * t * ghost} /> : null}
                <circle cx={xs} cy={yy} r={9} fill={STAT} opacity={lerp(1, 0.35, t) * ghost} stroke={PAPER} strokeWidth={1.5} />
                {t > 0 ? <circle cx={xr} cy={yy} r={9} fill={BAR} stroke={PAPER} strokeWidth={1.5} /> : null}
              </g>
            );
          })}
        </Svg>
        <Ring x={sx(X, rows[8].selected)} y={y(rowY(8))} at={motivationAt - 4} />
        <Ring x={sx(X, rows[8].randomised)} y={y(rowY(8))} at={evenAt - 2} color={BAR} />
        <Ring x={sx(X, rows[9].randomised)} y={y(rowY(9))} at={evenAt + 6} color={BAR} />

        {/* Which dot is which: the legend, at the right end of the figure's label. */}
        <div style={{ position: "absolute", left: X.x1, top: y(300), transform: "translateX(-100%)", display: "flex", gap: 26, whiteSpace: "nowrap" }}>
          <Ink at={differAt + 2} dur={12} style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 16, height: 16, borderRadius: 8, background: STAT, display: "inline-block" }} />
            <span style={{ ...note(21, STAT_INK), fontWeight: 650 }}>users chose</span>
          </Ink>
          <Ink at={shrinksAt + 2} dur={12} style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 16, height: 16, borderRadius: 8, background: BAR, display: "inline-block" }} />
            <span style={{ ...note(21, BLUE_INK), fontWeight: 650 }}>a coin chose</span>
          </Ink>
        </div>
      </div>

      {/* ── So the button is the only difference left ── */}
      <div style={{ position: "absolute", inset: 0, opacity: figDim }}>
        <Ink at={causedAt - 10} dur={14} style={{ left: 1480, top: y(566), whiteSpace: "nowrap" }}>
          <span style={{ ...body(30, true), color: INK }}>the button</span>
        </Ink>
        <Arrow from={[1500, y(612)]} to={[1500, y(664)]} at={causedAt - 4} dur={12} width={2.6} />
        <Ink at={changeAt - 6} dur={14} style={{ left: 1480, top: y(674), whiteSpace: "nowrap" }}>
          <span style={{ ...body(30, true), color: STAT_INK }}>the change</span>
        </Ink>
      </div>

      {/* ── The arc again: two steps done, the next two decided now ── */}
      <Svg opacity={ease(frame, twoAt - 2, 14)}>
        <line x1={STEP_X[0]} x2={1500} y1={y(STEP_Y) + 46} y2={y(STEP_Y) + 46} stroke={HAIRLINE} strokeWidth={1.4} />
        {STEPS.map((step, i) => (
          <circle
            key={step}
            cx={STEP_X[i] + 6}
            cy={y(STEP_Y) + 46}
            r={NEXT.includes(i) ? 9 : 6}
            fill={i < NEXT[0] ? INK : NEXT.includes(i) ? STAT : PAPER}
            stroke={NEXT.includes(i) ? STAT : INK}
            strokeWidth={2}
          />
        ))}
      </Svg>
      {STEPS.map((step, i) => (
        <Ink
          key={step}
          at={twoAt - 2 + i * 2}
          dur={12}
          style={{ left: STEP_X[i], top: y(STEP_Y), whiteSpace: "nowrap", display: "flex", gap: 10, opacity: NEXT.includes(i) || i < NEXT[0] ? 1 : 0.55 }}
        >
          <span style={{ ...label(22, STAT_INK), fontWeight: 700 }}>{i + 1}</span>
          <span style={{ ...label(22, INK), fontWeight: 600 }}>
            {NEXT.includes(i) ? <Marker at={decisionsAt - 4 + (i - NEXT[0]) * 6}>{step}</Marker> : step}
          </span>
        </Ink>
      ))}
      {NEXT.map((i, k) => (
        <Ring key={i} x={STEP_X[i] + 6} y={y(STEP_Y) + 46} at={decisionsAt - 2 + k * 6} />
      ))}
    </AbsoluteFill>
  );
};
