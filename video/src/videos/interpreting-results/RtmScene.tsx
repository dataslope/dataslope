import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, fmt, halo, HAIRLINE, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { jitter, RTM } from "./data";
import { Arrow, DATA, DATA_INK, Dashed, DOT, Drift, Headline, Kicker, lerp, Marker, RAW, Ring, STAT, STAT_INK, Strike, Svg } from "./parts";

/** Sales, 40 to 170, up the page. */
const LO = 40;
const HI = 170;
const TOP = 372;
const BOTTOM = 860;
const COLS = [500, 980];
const HALF = 110;
const JIT = [jitter(801, RTM.n), jitter(802, RTM.n)];
const NOTE_X = 1340;
/** The lowest month-1 number in the top tenth: where the cut falls. */
const TOP_CUT = Math.min(...RTM.top.map((i) => RTM.month1[i]));

/**
 * Part 3: five hundred salespeople over two months. The top tenth falls, the
 * bottom tenth rises, nobody did anything, and a coaching program would have
 * taken the credit.
 */
export const RtmScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();
  const from = n.beat("rtm").from;

  // ── Cues ──
  const monthAt = n.word("rtm", "Every month");
  const skillAt = n.word("rtm", "skill");
  const luckAt = n.word("rtm", "luck");
  const topAt = n.word("top", "top tenth");
  const monthOneAt = n.word("top", "month one");
  const avgTopAt = n.word("top", "a hundred and thirty-two");
  const sameAt = n.word("next-month", "same people");
  const nextAt = n.word("next-month", "a hundred and thirteen");
  const bottomAt = n.word("bottom", "bottom tenth");
  const seventyAt = n.word("bottom", "seventy");
  const ninetyAt = n.word("bottom", "ninety-five");
  const nobodyAt = n.word("nothing", "Nobody");
  const repeatAt = n.word("nothing", "doesn't repeat");
  const extremeAt = n.word("nothing", "extreme score");
  const luckAgainAt = n.word("nothing", "luck");
  const coachAt = n.word("coach", "Coach");
  const anywayAt = n.word("coach", "anyway");
  const creditAt = n.word("coach", "credit");
  const coachingAt = n.word("coach", "coaching");
  const groupAt = n.word("coach", "bottom group");
  const lookWordAt = n.word("look-in", "look at");
  const controlAt = n.word("control", "control group");
  const aloneAt = n.word("control", "left alone");
  const lookAt = n.word("look-in", "choosing");
  const trapsAt = n.word("look-in", "traps");
  const end = n.beat("look-in").to;

  const top = y(TOP);
  const bottom = y(BOTTOM);
  const py = (v: number) => bottom - ((v - LO) / (HI - LO)) * (bottom - top);
  const xOf = (col: number, i: number) => COLS[col] + (JIT[col][i] - 0.5) * 2 * HALF;
  const months = [RTM.month1, RTM.month2];
  const lit = (i: number) => (RTM.topSet.has(i) ? ease(frame, topAt - 2, 10) : RTM.bottomSet.has(i) ? ease(frame, bottomAt - 2, 10) : 0);
  const linkAt = (i: number) => (RTM.topSet.has(i) ? sameAt - 4 : RTM.bottomSet.has(i) ? bottomAt + 4 : 1e9);
  const groups = [
    { set: RTM.topSet, color: STAT, ink: STAT_INK, before: RTM.topBefore, after: RTM.topAfter, beforeAt: avgTopAt - 4, afterAt: nextAt - 4 },
    { set: RTM.bottomSet, color: DATA, ink: DATA_INK, before: RTM.bottomBefore, after: RTM.bottomAfter, beforeAt: seventyAt - 4, afterAt: ninetyAt - 4 },
  ];

  return (
    <AbsoluteFill>
      {/* ── Sound: two months of dots, each group lit, each average, the middle ── */}
      <Sfx name="el-sprinkle" at={from - 4} level={-33} />
      <Sfx name="el-sprinkle" at={monthAt - 4} level={-34} />
      <Sfx name="el-pencil" at={sameAt - 4} level={-34} />
      <Sfx name="el-pencil" at={bottomAt + 4} level={-34} />
      <Sfx name="el-tap" at={nextAt - 4} level={-28} />
      <Sfx name="el-tap" at={ninetyAt - 4} level={-28} />
      <Sfx name="el-scratch" at={creditAt - 2} level={-31} />

      <Kicker at={from - 10}>Regression to the mean</Kicker>
      <Headline
        top={y(150)}
        out={topAt - 8}
        parts={[
          { text: "Each month:", at: from - 4 },
          { text: "skill, plus luck.", at: skillAt - 6, italic: true },
        ]}
      />
      <Headline
        top={y(150)}
        out={nobodyAt - 8}
        parts={[
          { text: "The best fall,", at: topAt - 4 },
          { text: "the worst rise.", at: bottomAt - 6, italic: true },
        ]}
      />
      <Headline
        top={y(150)}
        out={trapsAt - 4}
        parts={[
          { text: "Nobody did anything.", at: nobodyAt - 4 },
          { text: "Luck doesn't repeat.", at: repeatAt - 8, italic: true },
        ]}
      />

      <div style={{ position: "absolute", inset: 0, opacity: 1 - 0.3 * ease(frame, lookAt - 8, 14) - 0.25 * ease(frame, lookWordAt - 4, 14) }}>
        <Drift from={aloneAt} to={end + 30} amount={0.02} origin={[820, 600]}>
          <FigLabel n="8" title={`${RTM.n} salespeople, two months running`} at={from - 6} x={160} y={y(262)} />
          {["Month 1", "Month 2"].map((t, k) => (
            <Ink key={t} at={(k ? monthAt : from) - 4} dur={12} style={{ left: COLS[k], top: top - 46, whiteSpace: "nowrap" }}>
              <span style={{ ...label(24, INK), display: "inline-block", transform: "translateX(-50%)" }}>{t}</span>
            </Ink>
          ))}
          {/* The value axis. */}
          <Svg opacity={ease(frame, from - 2, 14)}>
            {[50, 75, 100, 125, 150].map((v) => (
              <line key={v} x1={240} x2={1130} y1={py(v)} y2={py(v)} stroke={HAIRLINE} strokeWidth={1} opacity={0.3} />
            ))}
          </Svg>
          {[50, 75, 100, 125, 150].map((v) => (
            <div key={v} style={{ position: "absolute", right: 1920 - 228, top: py(v) - 13, opacity: ease(frame, from, 12), ...note(20, INK_SOFT) }}>
              {v}
            </div>
          ))}

          <Svg>
            {/* Each lit person's month 1 joined to their month 2. */}
            {RTM.month1.map((v, i) => {
              const p = ease(frame, linkAt(i) + (i % 17) * 0.7, 14);
              if (p <= 0) return null;
              const color = RTM.topSet.has(i) ? STAT : DATA;
              const x0 = xOf(0, i);
              const x1 = xOf(1, i);
              return (
                <line key={i} x1={x0} y1={py(v)} x2={lerp(x0, x1, p)} y2={lerp(py(v), py(RTM.month2[i]), p)} stroke={color} strokeWidth={1.4} opacity={0.32} />
              );
            })}
            {months.map((vals, k) =>
              vals.map((v, i) => {
                const a = ease(frame, (k ? monthAt : from) - 4 + (i % 50) * 0.35, 8);
                if (a <= 0) return null;
                const l = lit(i);
                const joined = k === 1 ? ease(frame, linkAt(i) + (i % 17) * 0.7 + 10, 6) : 1;
                const color = RTM.topSet.has(i) ? STAT : DATA;
                return (
                  <g key={`${k}-${i}`}>
                    <circle cx={xOf(k, i)} cy={py(v)} r={4.6 * a} fill={l > 0 ? RAW : DOT} opacity={0.8} />
                    {l > 0 ? <circle cx={xOf(k, i)} cy={py(v)} r={5.2} fill={color} opacity={l * joined} stroke={PAPER} strokeWidth={0.8} /> : null}
                  </g>
                );
              }),
            )}
          </Svg>

          {/* Each group's average, before and after. */}
          {groups.map((g, k) => {
            const a = ease(frame, g.beforeAt, 10);
            const b = ease(frame, g.afterAt, 10);
            return (
              <React.Fragment key={k}>
                <Svg>
                  {a > 0 ? <line x1={COLS[0] - HALF - 18} x2={lerp(COLS[0] - HALF - 18, COLS[0] + HALF + 18, a)} y1={py(g.before)} y2={py(g.before)} stroke={g.color} strokeWidth={5} strokeLinecap="round" /> : null}
                  {b > 0 ? <line x1={COLS[1] - HALF - 18} x2={lerp(COLS[1] - HALF - 18, COLS[1] + HALF + 18, b)} y1={py(g.after)} y2={py(g.after)} stroke={g.color} strokeWidth={5} strokeLinecap="round" /> : null}
                </Svg>
                <Note at={g.beforeAt + 2} x={COLS[0] - HALF - 30} y={py(g.before) - 17} align="right">
                  <span style={{ ...note(26, g.ink), fontWeight: 700, whiteSpace: "nowrap", ...halo }}>{fmt(g.before, 1)}</span>
                </Note>
                <Note at={g.afterAt + 2} x={COLS[1] + HALF + 30} y={py(g.after) - 17}>
                  <span style={{ ...note(26, g.ink), fontWeight: 700, whiteSpace: "nowrap", ...halo }}>
                    {fmt(g.after, 1)}
                    <span style={{ ...note(21, INK_SOFT), marginLeft: 12 }}>
                      {g.after > g.before ? "+" : "−"}
                      {fmt(Math.abs(g.after - g.before), 1)}
                    </span>
                  </span>
                </Note>
                <Arrow
                  from={[COLS[0] + HALF + 30, py(g.before)]}
                  to={[COLS[1] - HALF - 30, py(g.after)]}
                  at={g.afterAt - 2}
                  dur={14}
                  color={g.color}
                  width={3.2}
                />
              </React.Fragment>
            );
          })}
          <Note at={topAt} x={COLS[0] - HALF - 30} y={py(RTM.topBefore) - 54} align="right">
            <span style={{ ...note(21, STAT_INK), fontWeight: 600, whiteSpace: "nowrap" }}>top tenth</span>
          </Note>
          <Note at={bottomAt} x={COLS[0] - HALF - 30} y={py(RTM.bottomBefore) + 18} align="right">
            <span style={{ ...note(21, DATA_INK), fontWeight: 600, whiteSpace: "nowrap" }}>bottom tenth</span>
          </Note>

          {/* The averages, ringed as the narration explains them. */}
          {groups.map((g, k) => (
            <React.Fragment key={k}>
              <Ring x={COLS[0]} y={py(g.before)} at={extremeAt - 2 + k * 6} color={g.color} r0={20} r1={HALF + 20} />
              <Ring x={COLS[1]} y={py(g.after)} at={luckAgainAt - 2 + k * 6} color={g.color} r0={20} r1={HALF + 20} />
            </React.Fragment>
          ))}
          <Ring x={COLS[1]} y={py(RTM.bottomAfter)} at={coachingAt - 2} color={DATA} r0={20} r1={HALF + 30} />
          <Ring x={COLS[0]} y={py(RTM.bottomBefore)} at={groupAt - 2} color={DATA} r0={20} r1={HALF + 30} />

          {/* Where the top tenth starts. */}
          <Dashed x0={COLS[0] - HALF - 20} y0={py(TOP_CUT)} x1={COLS[0] + HALF + 20} y1={py(TOP_CUT)} at={monthOneAt - 4} dur={12} color={STAT} width={3} />

          {/* Where everyone's average sits, both months. */}
          <Dashed x0={240} y0={py(RTM.mean1)} x1={1130} y1={py(RTM.mean1)} at={nobodyAt - 2} dur={20} width={2.4} />
          <Note at={nobodyAt + 8} x={COLS[1] + HALF + 30} y={py(RTM.mean1) - 12}>
            <span style={{ ...note(21, INK), fontWeight: 600, whiteSpace: "nowrap", ...halo }}>everyone, about {Math.round(RTM.mean1)}</span>
          </Note>
        </Drift>

        {/* ── The note beside it ── */}
        <Note at={skillAt - 4} x={NOTE_X + 60} y={y(372)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            sales = <Marker at={skillAt}>skill</Marker> + <Marker at={luckAt - 2}>luck</Marker>
          </span>
          <div style={{ ...note(21, INK_SOFT), marginTop: 8, whiteSpace: "nowrap" }}>new luck every month</div>
        </Note>
        <Note at={coachAt - 4} x={NOTE_X + 60} y={y(640)}>
          <span style={{ ...body(34, true), color: INK, whiteSpace: "nowrap" }}>
            <Strike at={creditAt}>a coaching program?</Strike>
          </span>
        </Note>
        <Note at={anywayAt - 2} x={NOTE_X + 60} y={y(640) + 54}>
          <span style={{ ...note(22, DATA_INK), fontWeight: 600, whiteSpace: "nowrap" }}>
            +{fmt(RTM.bottomAfter - RTM.bottomBefore, 1)} with no program at all
          </span>
        </Note>
        <Note at={controlAt - 2} x={NOTE_X + 60} y={y(780)}>
          <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>The fair comparison</span>
        </Note>
        <Note at={controlAt + 6} x={NOTE_X + 60} y={y(780) + 36}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            a group just as extreme, <Marker at={aloneAt - 2}>left alone</Marker>
          </span>
        </Note>
      </div>
    </AbsoluteFill>
  );
};
