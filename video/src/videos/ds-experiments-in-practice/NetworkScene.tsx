import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { mulberry32 } from "../da-statistics-communication/parts";
import { CONTROL, Drift, OK_INK, TREAT, WARM, WARM_INK, X0 } from "./parts";

const GREY = ds("gray", 300);

/** Four groups of five friends; two edges cross between groups. */
const CENTERS = [
  [330, 480],
  [700, 455],
  [350, 700],
  [720, 690],
] as const;
const NODES = CENTERS.flatMap(([cx, cy], g) =>
  Array.from({ length: 5 }, (_, i) => {
    const a = (i / 5) * Math.PI * 2 + g * 0.7;
    return { g, x: cx + Math.cos(a) * 86, y: cy + Math.sin(a) * 74 };
  }),
);
const EDGES: [number, number][] = [
  ...CENTERS.flatMap((_, g) => {
    const b = g * 5;
    return [
      [b, b + 1],
      [b + 1, b + 2],
      [b + 2, b + 3],
      [b + 3, b + 4],
      [b + 4, b],
      [b, b + 2],
      [b + 1, b + 3],
    ] as [number, number][];
  }),
  [3, 7],
  [9, 18],
  [13, 15],
];
const CROSS = new Set([EDGES.length - 3, EDGES.length - 2, EDGES.length - 1]);

/** A user-level split by a seeded coin, and a split by group (groups 0 and 3 new). */
const coin = mulberry32(17);
const USER_SPLIT = NODES.map(() => coin() < 0.5);
const GROUP_SPLIT = NODES.map((nd) => nd.g === 0 || nd.g === 3);

/** Eight hours of a switchback, new or old at random (seeded). */
const hour = mulberry32(5);
const HOURS = Array.from({ length: 8 }, () => hour() < 0.5);

/**
 * Questions 7 and 8. Interference is a mechanism, so it is drawn as one, with
 * no number on it: twenty users in four groups of friends, split user by user;
 * what the new half shares reaches the old half along the edges, and the gap
 * between the arms closes (a sketch, with no scale). Split by group instead
 * and only the two edges between groups still cross. Then a switchback: one
 * pool of riders and drivers, split by the hour, with carryover at each switch.
 */
export const NetworkScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("network").from;
  const qAt = n.word("network", "Question seven");
  const textAt = n.word("network", "What are network effects and interference");
  const assumesAt = n.word("network", "A standard test assumes");
  const sutvaAt = n.word("network", "That's SUTVA");
  const stableAt = n.word("network", "the stable unit treatment value assumption");
  const halfAt = n.word("network", "Give a sharing feature to half the users");
  const reachAt = n.word("network", "reaches the other half");
  const treatedAt = n.word("network", "control gets treated too");
  const shrinkAt = n.word("network", "the difference shrinks");
  const groupsAt = n.word("network", "randomize groups that rarely touch");
  const friendsAt = n.word("network", "clusters of friends");
  const citiesAt = n.word("network", "or whole cities");
  const q8At = n.word("switchback", "Question eight");
  const q8TextAt = n.word("switchback", "What is a switchback experiment");
  const poolAt = n.word("switchback", "riders and drivers share one pool");
  const cantAt = n.word("switchback", "you can't split users");
  const timeAt = n.word("switchback", "Split time instead");
  const hourAt = n.word("switchback", "for an hour");
  const randomAt = n.word("switchback", "switching at random");
  const carryAt = n.word("switchback", "Leave room for carryover");
  const spillAt = n.word("switchback", "one hour spills into the next");
  const end = n.beat("switchback").to;

  const graphOut = q8At - 4;
  const nodesIn = ease(frame, assumesAt, 14);
  const split = ease(frame, halfAt + 6, 12);
  const regroup = ease(frame, groupsAt + 2, 16);
  const hulls = ease(frame, groupsAt, 14);
  const leakFrom = reachAt;
  const leakTo = groupsAt;
  const tinted = ease(frame, treatedAt, 14) * (1 - regroup);
  const isNew = (i: number) => (regroup > 0.5 ? GROUP_SPLIT[i] : USER_SPLIT[i]);
  const exposed = NODES.map((_, i) => !USER_SPLIT[i] && EDGES.some(([a, b]) => (a === i && USER_SPLIT[b]) || (b === i && USER_SPLIT[a])));

  // The two arms' outcomes, as a sketch: the gap closes as control is treated.
  const BARS = { x: 1100, base: 800, top: 520, w: 120, gap: 70 };
  const barsIn = ease(frame, halfAt + 10, 14);
  const ctrl = 0.38 + 0.24 * ease(frame, shrinkAt - 6, 20) - 0.24 * regroup;
  const treat = 0.86;
  const bh = (v: number) => (y(BARS.base) - y(BARS.top)) * v;

  // Switchback.
  const TL = { x0: 830, y: 560, w: 112, gap: 6, hgt: 92 };
  const blocksFrom = hourAt - 6;
  const blocksTo = Math.max(blocksFrom + 40, randomAt + 10);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={halfAt + 6} level={-36} />
      <Sfx name="el-scratch" at={treatedAt} level={-36} />
      <Sfx name="el-pencil" at={groupsAt + 2} level={-36} />
      <Sfx name="el-pop" at={poolAt} level={-37} />
      <Sfx name="el-tap" at={hourAt} level={-37} />
      <Sfx name="el-pencil" at={carryAt + 2} level={-36} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={7} at={qAt - 4} textAt={textAt - 4} out={q8At - 4} size={62}>
          What are network effects and interference?
        </QuestionCard>
        <QuestionCard n={8} at={q8At} textAt={q8TextAt - 2} size={62}>
          What is a switchback experiment?
        </QuestionCard>

        {/* Question 7: the users, their ties, and what leaks along them. */}
        <div style={{ opacity: 1 - ease(frame, graphOut, 10) }}>
          <Note at={assumesAt} x={X0} y={y(300)}>
            <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>assumed: one user's treatment can't change another user's outcome</span>
          </Note>
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: nodesIn }}>
            {/* The groups, once they are what gets split. */}
            {CENTERS.map(([cx, cy], g) => (
              <ellipse
                key={g}
                cx={cx}
                cy={y(cy)}
                rx={138 * hulls}
                ry={h(104) * hulls}
                fill={g === 0 || g === 3 ? TREAT : CONTROL}
                fillOpacity={0.1 * regroup}
                stroke={INK}
                strokeWidth={1.5}
                strokeDasharray="5 6"
                opacity={hulls}
              />
            ))}
            {EDGES.map(([a, b], i) => {
              const crossLit = CROSS.has(i) ? regroup : 0;
              return (
                <line
                  key={i}
                  x1={NODES[a].x}
                  y1={y(NODES[a].y)}
                  x2={NODES[b].x}
                  y2={y(NODES[b].y)}
                  stroke={crossLit > 0 ? WARM : INK_SOFT}
                  strokeWidth={1.6 + crossLit * 1.4}
                  opacity={0.55 + 0.45 * crossLit}
                />
              );
            })}
            {/* What the new half shares, travelling to the old half. */}
            {frame > leakFrom && frame < leakTo + 10
              ? EDGES.flatMap(([a, b], i) => {
                  const fromNew = USER_SPLIT[a] && !USER_SPLIT[b] ? [a, b] : USER_SPLIT[b] && !USER_SPLIT[a] ? [b, a] : null;
                  if (!fromNew) return [];
                  const [s, t] = fromNew;
                  const period = 34;
                  const ph = (((frame - leakFrom + i * 7) % period) + period) % period / period;
                  const o = ease(frame, leakFrom, 8) * (1 - ease(frame, leakTo, 10));
                  return [
                    <circle
                      key={i}
                      cx={NODES[s].x + (NODES[t].x - NODES[s].x) * ph}
                      cy={y(NODES[s].y) + (y(NODES[t].y) - y(NODES[s].y)) * ph}
                      r={6}
                      fill={TREAT}
                      opacity={o}
                    />,
                  ];
                })
              : null}
            {NODES.map((nd, i) => {
              const color = split > 0 ? (isNew(i) ? TREAT : CONTROL) : GREY;
              const mix = regroup > 0 && regroup < 1 ? 1 : split;
              const ring = exposed[i] ? tinted : 0;
              return (
                <g key={i}>
                  {ring > 0 ? <circle cx={nd.x} cy={y(nd.y)} r={21} fill="none" stroke={TREAT} strokeWidth={4} opacity={ring} /> : null}
                  <circle cx={nd.x} cy={y(nd.y)} r={15} fill={mix > 0 ? `color-mix(in srgb, ${color} ${Math.min(1, mix) * 100}%, ${GREY})` : GREY} stroke={PAPER} strokeWidth={2} />
                </g>
              );
            })}
          </svg>
          <Note at={halfAt + 8} x={X0} y={y(860)}>
            <span style={{ ...label(21, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
              <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: 7, background: TREAT, marginRight: 8 }} />
              gets the sharing feature
              <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: 7, background: CONTROL, margin: "0 8px 0 24px" }} />
              control
            </span>
          </Note>

          {/* SUTVA, named. */}
          <Note at={sutvaAt} x={1080} y={y(370)}>
            <span style={{ ...note(30, INK), fontWeight: 800, whiteSpace: "nowrap" }}>SUTVA</span>
            <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, stableAt, 10) }}>: the stable unit treatment value assumption</span>
          </Note>

          {/* The two arms, sketched: the gap closes. */}
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: barsIn }}>
            <line x1={BARS.x - 30} x2={BARS.x + 2 * BARS.w + BARS.gap + 30} y1={y(BARS.base)} y2={y(BARS.base)} stroke={INK} strokeWidth={1.6} />
            <rect x={BARS.x} y={y(BARS.base) - bh(treat)} width={BARS.w} height={bh(treat)} fill={TREAT} rx={3} />
            <rect x={BARS.x + BARS.w + BARS.gap} y={y(BARS.base) - bh(ctrl)} width={BARS.w} height={bh(ctrl)} fill={CONTROL} rx={3} />
            <line
              x1={BARS.x + 2 * BARS.w + BARS.gap + 22}
              x2={BARS.x + 2 * BARS.w + BARS.gap + 22}
              y1={y(BARS.base) - bh(treat)}
              y2={y(BARS.base) - bh(ctrl)}
              stroke={ease(frame, shrinkAt, 10) > 0.5 && regroup < 0.5 ? ACCENT : INK}
              strokeWidth={3}
            />
            <line x1={BARS.x + BARS.w} x2={BARS.x + 2 * BARS.w + BARS.gap + 30} y1={y(BARS.base) - bh(treat)} y2={y(BARS.base) - bh(treat)} stroke={INK} strokeWidth={1} strokeDasharray="3 5" />
          </svg>
          {["new", "control"].map((t, i) => (
            <div
              key={t}
              style={{ position: "absolute", left: BARS.x + i * (BARS.w + BARS.gap) - 20, width: BARS.w + 40, top: y(BARS.base) + h(10), textAlign: "center", ...label(21, INK_SOFT), fontWeight: 700, opacity: barsIn }}
            >
              {t}
            </div>
          ))}
          <Note at={halfAt + 14} x={BARS.x - 30} y={y(BARS.top) - h(64)}>
            <span style={{ ...label(19, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>outcome, a sketch with no scale</span>
          </Note>
          <Note at={treatedAt + 2} x={BARS.x + 2 * BARS.w + BARS.gap + 40} y={y(BARS.base) - bh(0.5) - h(20)} out={groupsAt + 4}>
            <span style={{ ...note(24, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>control gets treated too</span>
          </Note>
          <Note at={shrinkAt + 2} x={BARS.x + 2 * BARS.w + BARS.gap + 40} y={y(BARS.base) - bh(0.5) + h(20)} out={groupsAt + 4}>
            <span style={{ ...note(24, ACCENT_INK), whiteSpace: "nowrap" }}>so the difference shrinks</span>
          </Note>
          <Note at={groupsAt + 4} x={BARS.x + 2 * BARS.w + BARS.gap + 40} y={y(BARS.base) - bh(0.62)} width={380}>
            <span style={{ ...note(25, OK_INK), fontWeight: 700 }}>randomize groups that rarely touch</span>
          </Note>
          <Note at={friendsAt} x={BARS.x + 2 * BARS.w + BARS.gap + 40} y={y(BARS.base) - bh(0.62) + h(80)} width={380}>
            <span style={{ ...note(24, OK_INK) }}>
              clusters of friends<span style={{ opacity: ease(frame, citiesAt, 10) }}>, or whole cities</span>
            </span>
          </Note>
        </div>

        {/* Question 8: one pool, split by the hour. */}
        <div style={{ opacity: ease(frame, poolAt - 6, 12) }}>
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            <circle cx={400} cy={y(570)} r={h(170)} fill="none" stroke={INK} strokeWidth={2} strokeDasharray="6 6" />
            {Array.from({ length: 16 }, (_, i) => {
              const r = mulberry32(100 + i);
              const a = r() * Math.PI * 2;
              const d = Math.sqrt(r()) * h(130);
              const x = 400 + Math.cos(a + frame / 90) * d;
              const yy = y(570) + Math.sin(a + frame / 90) * d;
              return i % 2 ? (
                <circle key={i} cx={x} cy={yy} r={10} fill={BLUE_INK} />
              ) : (
                <rect key={i} x={x - 9} y={yy - 9} width={18} height={18} rx={3} fill={WARM} />
              );
            })}
          </svg>
          <Note at={poolAt + 4} x={250} y={y(570) + h(184)}>
            <span style={{ ...label(21, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
              <span style={{ color: BLUE_INK }}>● riders</span> and <span style={{ color: WARM_INK }}>■ drivers</span>, one pool
            </span>
          </Note>
          <Note at={cantAt} x={250} y={y(570) - h(214)}>
            <span style={{ ...note(25, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>can't split users</span>
          </Note>
        </div>
        <Note at={timeAt} x={TL.x0} y={y(TL.y) - h(110)}>
          <span style={{ ...note(28, OK_INK), fontWeight: 750, whiteSpace: "nowrap" }}>Split time instead: the whole city, hour by hour</span>
        </Note>
        {HOURS.map((isNewHour, i) => {
          const at = blocksFrom + (i / (HOURS.length - 1)) * (blocksTo - blocksFrom);
          const p = ease(frame, at, 10);
          if (p <= 0) return null;
          const x = TL.x0 + i * (TL.w + TL.gap);
          const switched = i > 0 && HOURS[i - 1] !== isNewHour;
          const carry = switched ? ease(frame, carryAt + i * 2, 10) : 0;
          return (
            <React.Fragment key={i}>
              <div
                style={{
                  position: "absolute",
                  left: x,
                  top: y(TL.y),
                  width: TL.w,
                  height: h(TL.hgt),
                  borderRadius: 6,
                  background: isNewHour ? TREAT : CONTROL,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  ...label(22, isNewHour ? PAPER : INK),
                  fontWeight: 750,
                  opacity: p,
                  transform: `translateY(${(1 - p) * 12}px)`,
                }}
              >
                {isNewHour ? "new" : "old"}
              </div>
              {carry > 0 ? (
                <div
                  style={{
                    position: "absolute",
                    left: x,
                    top: y(TL.y),
                    width: 30 * carry,
                    height: h(TL.hgt),
                    borderRadius: "6px 0 0 6px",
                    background: `repeating-linear-gradient(135deg, ${ACCENT} 0 4px, transparent 4px 9px)`,
                    opacity: 0.7,
                  }}
                />
              ) : null}
            </React.Fragment>
          );
        })}
        <Note at={blocksFrom + 4} x={TL.x0} y={y(TL.y) + h(TL.hgt) + h(14)}>
          <span style={{ ...label(20, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>
            one hour each<span style={{ opacity: ease(frame, randomAt, 10) }}>, new or old at random</span>
          </span>
        </Note>
        <Note at={carryAt + 4} x={TL.x0} y={y(TL.y) + h(TL.hgt) + h(60)}>
          <span style={{ ...note(25, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            carryover<span style={{ opacity: ease(frame, spillAt, 10), fontWeight: 500 }}>: one hour spills into the next</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
