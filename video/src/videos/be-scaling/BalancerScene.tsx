import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Ink, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { HASHING } from "./data";
import { commas, Drift, Flow, Line, Mark, MiniMap, Node, OK, OK_INK, pct, Q_SIZE, Q_W, SERVER, Svg, X0 } from "./parts";

const LB = { x: X0, w: 190, h: 76, mid: 560 };
const SRV = { x: 440, w: 180, h: 60 };
const SRV_MID = [410, 510, 610, 710];
const PANEL_X = [730, 1100, 1470];
/** The key grids: 100 x 100 squares of 4px, one a key. */
const CELL = 4;
const GRID_TOP = 436;
const MOD_X = X0;
const RING_X = 650;
const RING = { cx: 1350, r: 158 };

/** All 10,000 keys as a 100 x 100 grid, each square its server's color:
 *  `from` until a sweep down the grid from `sweepAt` turns it to `to`; from
 *  `dimAt`, the keys that did not move fade, so the moved ones stand out. */
const KeyGrid: React.FC<{ x: number; top: number; from: string; to: string; at: number; sweepAt: number; dimAt: number }> = ({
  x,
  top,
  from,
  to,
  at,
  sweepAt,
  dimAt,
}) => {
  const frame = useCurrentFrame();
  const fill = ease(frame, at, 24) * 100;
  const sweep = ease(frame, sweepAt, 26) * 112;
  const dim = ease(frame, dimAt, 14);
  if (fill <= 0) return null;
  // One path per server, for the moved keys and for the rest.
  const moved: string[][] = [[], [], [], []];
  const kept: string[][] = [[], [], [], []];
  for (let k = 0; k < 10_000; k++) {
    const r = Math.floor(k / 100);
    const c = k % 100;
    if (r > fill) continue;
    // A diagonal wave: rows switch in order, each a little after its left end.
    const switched = r + c * 0.12 < sweep;
    const s = Number(switched ? to[k] : from[k]);
    const seg = `M${x + c * CELL},${top + r * CELL}h3.4v3.4h-3.4z`;
    (switched && from[k] !== to[k] ? moved : kept)[s].push(seg);
  }
  return (
    <Svg>
      {kept.map((segs, s) => (segs.length ? <path key={`k${s}`} d={segs.join("")} fill={SERVER[s]} opacity={1 - 0.8 * dim} /> : null))}
      {moved.map((segs, s) => (segs.length ? <path key={`m${s}`} d={segs.join("")} fill={SERVER[s]} /> : null))}
    </Svg>
  );
};

/**
 * Question 2: a load balancer fanning requests over four servers; the three
 * ways it picks one, each lit as named; a health check taking a dead server
 * out. Then why consistent hashing: the simulation's 10,000 keys, one square
 * each, moved from three servers to four by modulo (74% change color) and on
 * a hash ring (23%, every one to the new server), with the ring beside them.
 */
export const BalancerScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q2").from;
  const qAt = n.word("q2", "Question two");
  const textAt = n.word("q2", "What is a load balancer");
  const sitsAt = n.word("q2", "It sits in front of the pool");
  const spreadsAt = n.word("q2", "spreads requests");
  const overAt = n.word("q2", "no one server is overwhelmed");
  const rrAt = n.word("q2-algos", "Round-robin");
  const lcAt = n.word("q2-algos", "Least-connections");
  const fewestAt = n.word("q2-algos", "fewest open connections");
  const slowAt = n.word("q2-algos", "copes with slow requests");
  const chAt = n.word("q2-algos", "Consistent hashing");
  const everyAt = n.word("q2-algos", "every time");
  const hotAt = n.word("q2-algos", "cache their own hot links");
  const healthAt = n.word("q2-health", "health checks");
  const deadAt = n.word("q2-health", "a dead server");
  const availAt = n.word("q2-health", "highly available");
  const whyAt = n.word("q2-mod", "Why consistent");
  const simAt = n.word("q2-mod", "Simulate ten thousand short keys");
  const fourthAt = n.word("q2-mod", "Add a fourth");
  const switchAt = n.word("q2-mod", "switch to modulo four");
  const sevAt = n.word("q2-mod", "seventy-four percent");
  const coldAt = n.word("q2-mod", "a cold cache");
  const ringAt = n.word("q2-ring", "On a hash ring");
  const pointsAt = n.word("q2-ring", "a hundred points a server");
  const twentyAt = n.word("q2-ring", "only twenty-three percent move");
  const newAt = n.word("q2-ring", "all of them to the new server");
  const end = n.beat("q2-ring").to;

  const phaseOut = whyAt - 4;
  const lbMid = y(LB.mid);
  const srvTop = (i: number) => y(SRV_MID[i]) - SRV.h / 2;
  const dead = ease(frame, deadAt, 10);
  const panelTop = y(360);

  // ── Round-robin: eight numbered requests dealt in turn over four servers. ──
  const rrCol = (c: number) => PANEL_X[0] + 16 + c * 78;
  const rrBase = y(700);
  // ── Least-connections: open connections per server. ──
  const OPEN = [5, 2, 4, 6];
  const lcPick = OPEN.indexOf(Math.min(...OPEN));
  const lcRow = (i: number) => y(470) + i * h(52);
  const lcNew = ease(frame, fewestAt + 6, 12);
  // ── Consistent hashing: one key to the same server, twice. ──
  const key = HASHING.sample[0];

  // ── The ring diagram. ──
  const ringCy = y(GRID_TOP) + 200;
  const ringOn = ease(frame, ringAt, 14);
  const pointP = (i: number, s: number) => (s === 3 ? ease(frame, twentyAt + (i % 40) * 0.4, 8) : ease(frame, pointsAt + (i % 60) * 0.4, 8));

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={spreadsAt} level={-35} />
      <Sfx name="el-sprinkle" at={rrAt} level={-32} />
      <Sfx name="el-tap" at={fewestAt + 6} level={-31} />
      <Sfx name="el-tap" at={chAt + 8} level={-31} />
      <Sfx name="el-tap" at={everyAt} level={-31} />
      <Sfx name="el-scratch" at={deadAt} level={-32} />
      <Sfx name="el-sprinkle" at={simAt} level={-31} />
      <Sfx name="el-whoosh" at={switchAt} level={-36} />
      <Sfx name="el-tap" at={sevAt} level={-29} />
      <Sfx name="el-sprinkle" at={ringAt} level={-31} />
      <Sfx name="el-whoosh" at={twentyAt} level={-36} />
      <Sfx name="el-tap" at={newAt} level={-29} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={2} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE} width={Q_W}>
          What is a load balancer and how does it distribute traffic?
        </QuestionCard>
        <MiniMap at={qAt} stage={1} lit="lb" />

        {/* ── A load balancer in front of four servers. ── */}
        <Node x={LB.x} y={lbMid - LB.h / 2} w={LB.w} h={LB.h} at={sitsAt} tone="plain" title="load balancer" size={22} out={phaseOut} />
        {SRV_MID.map((_, i) => {
          const gone = i === 2 ? dead : 0;
          return (
            <React.Fragment key={i}>
              <Node
                x={SRV.x}
                y={srvTop(i)}
                w={SRV.w}
                h={SRV.h}
                at={sitsAt + 4 + i * 3}
                tone={gone > 0.5 ? "bad" : "data"}
                title={gone > 0.5 ? "server 3 ✕" : `server ${i + 1}`}
                size={21}
                out={phaseOut}
              />
              <Flow
                points={[
                  [LB.x + LB.w + 6, lbMid + (i - 1.5) * 12],
                  [LB.x + LB.w + 50, lbMid + (i - 1.5) * 12],
                  [LB.x + LB.w + 50, y(SRV_MID[i])],
                  [SRV.x - 8, y(SRV_MID[i])],
                ]}
                at={spreadsAt + i * 4}
                color={BAR}
                width={2.2 + (i === 2 ? 0 : dead * 1.2)}
                head={12}
                out={i === 2 ? deadAt + 4 : phaseOut}
              />
            </React.Fragment>
          );
        })}
        <Line at={overAt} x={X0} y={y(770)} size={22} color={INK_SOFT} out={phaseOut}>
          so no one server is overwhelmed
        </Line>
        <Line at={healthAt} x={X0} y={y(820)} size={22} out={phaseOut}>
          <Mark at={healthAt}>health checks</Mark> pull a dead server out
        </Line>
        <Line at={availAt} x={X0} y={y(870)} size={22} color={OK_INK} weight={650} out={phaseOut}>
          a stateless pool stays highly available
        </Line>

        {/* ── The three ways to pick a server, each lit as named. ── */}
        {[
          ["Round-robin", rrAt, "deals them in turn"],
          ["Least-connections", lcAt, "fewest open connections"],
          ["Consistent hashing", chAt, "the same key, the same server"],
        ].map(([name, at, sub], i) => (
          <React.Fragment key={i}>
            <Ink at={(at as number) - 2} dur={14} out={phaseOut} style={{ left: PANEL_X[i], top: panelTop, whiteSpace: "nowrap" }}>
              <span style={{ ...label(23, INK), fontWeight: 700 }}>
                <Mark at={at as number} out={i < 2 ? ([lcAt, chAt][i] as number) : phaseOut - 10}>
                  {name as string}
                </Mark>
              </span>
            </Ink>
            <Ink at={(at as number) + 4} dur={14} out={phaseOut} style={{ left: PANEL_X[i], top: panelTop + 40, whiteSpace: "nowrap" }}>
              <span style={note(20, INK_SOFT)}>{sub as string}</span>
            </Ink>
          </React.Fragment>
        ))}

        {/* Round-robin: requests 1 to 8, dealt across the four in turn. */}
        {[0, 1, 2, 3].map((c) => (
          <Node key={c} x={rrCol(c)} y={rrBase} w={60} h={40} at={rrAt} tone="plain" title={String(c + 1)} size={20} out={phaseOut} />
        ))}
        {Array.from({ length: 8 }, (_, k) => {
          const at = rrAt + 4 + k * 4;
          const p = ease(frame, at, 8);
          const o = ease(frame, phaseOut, 10);
          if (p <= 0 || o >= 1) return null;
          const c = k % 4;
          const level = Math.floor(k / 4);
          const top = rrBase - 14 - (level + 1) * 40 - (1 - p) * 30;
          return (
            <div
              key={k}
              style={{
                position: "absolute",
                left: rrCol(c) + 6,
                top,
                width: 48,
                height: 32,
                borderRadius: 7,
                background: `color-mix(in srgb, ${BAR} 14%, ${PAPER})`,
                border: `2px solid ${BAR}`,
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...label(20, BLUE_INK),
                fontWeight: 700,
                opacity: p * (1 - o),
              }}
            >
              <Num>{k + 1}</Num>
            </div>
          );
        })}

        {/* Least-connections: open connections a server; the new request takes the shortest. */}
        {OPEN.map((open, i) => {
          const p = ease(frame, lcAt + 2 + i * 3, 12);
          const o = ease(frame, phaseOut, 10);
          if (p <= 0 || o >= 1) return null;
          const pick = i === lcPick ? lcNew : 0;
          return (
            <div key={i} style={{ position: "absolute", left: PANEL_X[1], top: lcRow(i), display: "flex", alignItems: "center", gap: 12, opacity: p * (1 - o), fontSize: 20 }}>
              <span style={{ ...label(20, INK_SOFT), width: 18, textAlign: "right" }}>
                <Num>{i + 1}</Num>
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                {Array.from({ length: open }, (_, k) => (
                  <span key={k} style={{ width: 26, height: 26, borderRadius: 5, background: pick > 0.5 ? HIGHLIGHT : `color-mix(in srgb, ${BAR} 55%, ${PAPER})` }} />
                ))}
                {i === lcPick ? (
                  <span style={{ width: 26, height: 26, borderRadius: 5, background: OK, opacity: pick, transform: `translateX(${(1 - pick) * 60}px)` }} />
                ) : null}
              </div>
            </div>
          );
        })}
        <Line at={fewestAt + 10} x={PANEL_X[1]} y={lcRow(3) + h(60)} size={20} color={OK_INK} weight={650} out={phaseOut}>
          the new request goes to server {lcPick + 1}
        </Line>
        <Line at={slowAt} x={PANEL_X[1]} y={lcRow(3) + h(104)} size={20} color={INK_SOFT} out={phaseOut}>
          copes with slow requests
        </Line>

        {/* Consistent hashing: the same key reaches the same server, every time. */}
        {[chAt + 6, everyAt].map((at, r) => (
          <React.Fragment key={r}>
            <Ink at={at} dur={12} out={phaseOut} style={{ left: PANEL_X[2], top: y(476) + r * h(84), whiteSpace: "nowrap" }}>
              <span style={{ ...note(22, INK), display: "inline-flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontFamily: MONO, color: BLUE_INK, fontWeight: 700 }}>
                  {key.key}
                </span>
                <span style={{ color: INK_SOFT }}>→</span>
                <span style={{ fontWeight: 700, color: INK }}>server {key.ring4 + 1}</span>
              </span>
            </Ink>
          </React.Fragment>
        ))}
        <Line at={hotAt} x={PANEL_X[2]} y={y(660)} size={20} color={INK_SOFT} out={phaseOut}>
          for servers that cache
        </Line>
        <Line at={hotAt + 4} x={PANEL_X[2]} y={y(660) + 30} size={20} color={INK_SOFT} out={phaseOut}>
          their own hot links
        </Line>

        {/* ── Why consistent: the simulation. ── */}
        <Line at={simAt} x={X0} y={y(340)} size={22} weight={650} color={INK}>
          Simulation: <Num>{commas(HASHING.keys)}</Num> short keys, one square each, colored by the server it lands on
        </Line>
        <Line at={simAt + 6} x={MOD_X} y={y(392)} size={22} weight={700}>
          Hash modulo the server count: 3, then 4
        </Line>
        <KeyGrid x={MOD_X} top={y(GRID_TOP)} from={HASHING.grid.mod3} to={HASHING.grid.mod4} at={simAt + 6} sweepAt={switchAt} dimAt={sevAt} />
        <Line at={sevAt + 4} x={MOD_X} y={y(GRID_TOP) + 416} size={23} weight={700} color={ACCENT_INK}>
          {pct(HASHING.shareMod)} moved
          <span style={{ color: INK, fontWeight: 500, opacity: ease(frame, coldAt, 10) }}>, each to a cold cache</span>
        </Line>
        <Line at={ringAt} x={RING_X} y={y(392)} size={22} weight={700}>
          Hash ring, {HASHING.pointsPerServer} points a server
        </Line>
        <KeyGrid x={RING_X} top={y(GRID_TOP)} from={HASHING.grid.ring3} to={HASHING.grid.ring4} at={ringAt + 2} sweepAt={twentyAt} dimAt={newAt} />
        <Line at={newAt} x={RING_X} y={y(GRID_TOP) + 416} size={23} weight={700} color={OK_INK}>
          {pct(HASHING.shareRing)} moved, all to the new server
        </Line>

        {/* The ring itself: each server's points around it. */}
        <Svg opacity={ringOn}>
          <circle cx={RING.cx} cy={ringCy} r={RING.r} fill="none" stroke={INK_SOFT} strokeWidth={1.6} />
          {HASHING.ringPoints.map(([at, s], i) => {
            const p = pointP(i, s);
            if (p <= 0) return null;
            const a = at * Math.PI * 2 - Math.PI / 2;
            const r0 = RING.r - 12;
            const r1 = RING.r + 12 + (s === 3 ? 6 : 0);
            return (
              <line
                key={i}
                x1={RING.cx + Math.cos(a) * r0}
                y1={ringCy + Math.sin(a) * r0}
                x2={RING.cx + Math.cos(a) * (r0 + (r1 - r0) * p)}
                y2={ringCy + Math.sin(a) * (r0 + (r1 - r0) * p)}
                stroke={SERVER[s]}
                strokeWidth={s === 3 ? 2.6 : 2}
              />
            );
          })}
        </Svg>
        <Ink at={ringAt + 6} dur={14} style={{ left: RING.cx - 110, top: ringCy - 34, width: 220, textAlign: "center" }}>
          <span style={{ ...note(20, INK_SOFT) }}>
            a key goes to the next
            <br />
            point clockwise
          </span>
        </Ink>
        {/* Which color is which server. */}
        {[0, 1, 2, 3].map((s) => {
          const at = s < 3 ? simAt + 8 + s * 3 : fourthAt;
          return (
            <Ink key={s} at={at} dur={12} style={{ left: 1580, top: y(GRID_TOP) + 40 + s * 40, whiteSpace: "nowrap" }}>
              <span style={{ ...note(21, s === 3 ? INK : INK_SOFT), display: "inline-flex", alignItems: "center", gap: 10, fontWeight: s === 3 ? 700 : 500 }}>
                <span style={{ width: 20, height: 20, borderRadius: 4, background: SERVER[s] }} />
                server {s + 1}
                {s === 3 ? ", added" : ""}
              </span>
            </Ink>
          );
        })}
      </Drift>
    </AbsoluteFill>
  );
};
