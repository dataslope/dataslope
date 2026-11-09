import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, type Pt } from "../../components/arrow";
import { ease, pop } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, label, note, svgText } from "../../editorial/style";
import { Ink, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { HEADROOM } from "./data";
import { Drift, Flow, Line, Mark, MiniMap, Node, OK, OK_INK, Q_SIZE, Q_W, Svg, VRule, X0 } from "./parts";

const V = { x: X0 + 20, w: 140 };
const H_X = 600;
const SRV = { w: 120, h: 86, gap: 40 };
const LBX = { x: 790, w: 220, h: 66 };
const SHARED = { x: 740, w: 340, h: 62 };
/** The chart: mean wait against load. */
const C = { x0: 1370, x1: 1790, top: 592, base: 830, max: 20 };

/**
 * Question 1: a server grown taller until it meets its ceiling (vertical),
 * against servers multiplied behind a load balancer (horizontal), with the
 * session handed to a shared store. The shortener's servers are already
 * stateless, so they multiply; and how many is the page's queue chart, the
 * wait at 50, 90 and 99 percent load, read off as it is said.
 */
export const ScaleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q1").from;
  const qAt = n.word("q1", "Question one");
  const textAt = n.word("q1", "Horizontal versus vertical");
  const vertAt = n.word("q1", "Vertical is a bigger machine");
  const bigAt = n.word("q1", "a bigger machine");
  const simpleAt = n.word("q1", "simple");
  const ceilAt = n.word("q1", "a ceiling");
  const oneAt = n.word("q1", "one machine that can fail");
  const horizAt = n.word("q1-horiz", "Horizontal is more machines");
  const behindAt = n.word("q1-horiz", "behind the load balancer");
  const unlimitedAt = n.word("q1-horiz", "nearly unlimited");
  const redundantAt = n.word("q1-horiz", "and redundant");
  const anyAt = n.word("q1-horiz", "any server can handle any request");
  const statelessAt = n.word("q1-horiz", "keep the app tier stateless");
  const sessionAt = n.word("q1-horiz", "session state");
  const sharedAt = n.word("q1-horiz", "shared cache or database");
  const theseAt = n.word("q1-ours", "These redirect servers");
  const moreAt = n.word("q1-ours", "more of them");
  const howAt = n.word("q1-headroom", "How many more");
  const fullAt = n.word("q1-headroom", "none runs near full");
  const modelAt = n.word("q1-headroom", "simplest queue model");
  const fiftyAt = n.word("q1-headroom", "fifty percent load");
  const ninetyAt = n.word("q1-headroom", "nine at ninety percent");
  const nn99At = n.word("q1-headroom", "ninety-nine at ninety-nine");
  const roomAt = n.word("q1-buy", "Headroom");
  const end = n.beat("q1-buy").to;

  // ── Vertical: one box grows until it meets the ceiling. ──
  const base = y(860);
  const ceiling = y(462);
  const grow = ease(frame, bigAt, 30);
  const boxH = h(110) + (base - ceiling - 44 - h(110)) * grow;
  const ceilRed = ease(frame, ceilAt, 10);
  const ring = ease(frame, oneAt, 18);
  const vDim = theseAt - 4;

  // ── Horizontal: the box multiplies into a row behind a load balancer. ──
  const rowY = y(610);
  const srvX = (i: number) => H_X + i * (SRV.w + SRV.gap);
  const lbY = y(452);
  const sharedY = y(760);
  const multiply = (i: number) => (i === 0 ? horizAt : behindAt + 2 + i * 4);
  // The session token: from the first server down into the shared store.
  const tok = ease(frame, sessionAt + 2, 26);
  const tokX = srvX(0) + SRV.w / 2 + (SHARED.x + 60 - srvX(0) - SRV.w / 2) * tok;
  const tokY = rowY + SRV.h / 2 + 4 + (sharedY + 8 - rowY - SRV.h / 2 - 4) * tok;

  // ── Ours: the redirect servers, two then a longer row. ──
  const oursTop = y(392);
  const ourX = (i: number) => 1300 + i * 66;
  const ourAt = (i: number) => (i < 2 ? theseAt + i * 3 : moreAt + (i - 2) * 3);

  // ── The chart. ──
  const cx = (rho: number) => C.x0 + rho * (C.x1 - C.x0);
  const cy = (wait: number) => y(C.base) - (Math.min(wait, C.max) / C.max) * (y(C.base) - y(C.top));
  const chartAt = howAt + 6;
  const curveP = ease(frame, modelAt, 40);
  const pts = HEADROOM.curve.filter((d) => d.rho <= 0.985);
  const path = pts.map((d, i) => `${i ? "L" : "M"}${cx(d.rho).toFixed(1)},${cy(d.wait).toFixed(1)}`).join(" ");
  const mark = (rho: number) => HEADROOM.marks.find((m) => m.rho === rho) as { rho: number; wait: number };
  const m50 = mark(0.5);
  const m90 = mark(0.9);
  const m99 = mark(0.99);
  const shade = ease(frame, roomAt, 14);
  const up99: Pt[] = Array.from({ length: 30 }, (_, i) => [cx(m99.rho), y(C.top) + 64 - i * 2.4] as Pt);

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={bigAt} level={-36} />
      <Sfx name="el-tap" at={ceilAt} level={-30} />
      <Sfx name="el-pencil" at={oneAt} level={-34} />
      <Sfx name="el-sprinkle" at={behindAt + 6} level={-32} />
      <Sfx name="el-whoosh" at={sessionAt + 2} level={-37} />
      <Sfx name="el-sprinkle" at={moreAt} level={-32} />
      <Sfx name="el-pencil" at={modelAt} level={-35} />
      <Sfx name="el-tap" at={fiftyAt} level={-31} />
      <Sfx name="el-tap" at={ninetyAt} level={-31} />
      <Sfx name="el-tap" at={nn99At} level={-29} />
      <Sfx name="el-pencil" at={roomAt} level={-34} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE} width={Q_W}>
          Horizontal vs vertical scaling, which do you reach for?
        </QuestionCard>
        <MiniMap at={qAt} stage={0} lit="app" grow={{ apps: moreAt }} />

        {/* ── Vertical ── */}
        <Line at={vertAt} x={X0} y={y(340)} size={24} weight={500} dim={vDim}>
          Vertical: a bigger machine
        </Line>
        <Line at={simpleAt} x={X0} y={y(388)} size={22} color={INK_SOFT} dim={vDim}>
          simple<span style={{ opacity: ease(frame, ceilAt, 10), color: ACCENT_INK }}>, but a ceiling</span>
          <span style={{ opacity: ease(frame, oneAt, 10), color: ACCENT_INK }}>, and one machine</span>
        </Line>
        <Svg opacity={(ease(frame, vertAt, 12)) * (1 - ease(frame, vDim, 12) * 0.65)}>
          <line x1={X0} x2={X0 + 400} y1={ceiling} y2={ceiling} stroke={ceilRed > 0.5 ? ACCENT : INK_SOFT} strokeWidth={2.4} strokeDasharray="10 8" />
          <text x={X0 + 400} y={ceiling + 32} textAnchor="end" style={svgText({ ...label(21, ceilRed > 0.5 ? ACCENT_INK : INK_SOFT), fontWeight: 500 })}>
            ceiling
          </text>
        </Svg>
        <Node x={V.x} y={base - boxH} w={V.w} h={boxH} at={vertAt} tone="data" title="server" dim={vDim} />
        <Svg opacity={1 - ease(frame, vDim, 12) * 0.65}>
          {ring > 0 ? (
            <rect
              x={V.x - 14}
              y={base - boxH - 14}
              width={V.w + 28}
              height={boxH + 28}
              rx={22}
              fill="none"
              stroke={ACCENT}
              strokeWidth={3}
              pathLength={1}
              strokeDasharray={`${ring} 1`}
            />
          ) : null}
        </Svg>

        {/* ── Horizontal ── */}
        <Line at={horizAt} x={H_X} y={y(340)} size={24} weight={500}>
          Horizontal: more machines behind the load balancer
        </Line>
        <Line at={unlimitedAt} x={H_X} y={y(388)} size={22} color={INK_SOFT}>
          nearly unlimited<span style={{ opacity: ease(frame, redundantAt, 10) }}>, and redundant</span>
        </Line>
        <Node x={LBX.x} y={lbY} w={LBX.w} h={LBX.h} at={behindAt} tone="plain" title="load balancer" size={22} />
        {[0, 1, 2, 3].map((i) => (
          <React.Fragment key={i}>
            <Node
              x={srvX(i)}
              y={rowY}
              w={SRV.w}
              h={SRV.h}
              at={multiply(i)}
              tone={ease(frame, statelessAt, 10) > 0.5 ? "ok" : "data"}
              title="server"
              size={21}
              sub={<span style={{ opacity: ease(frame, statelessAt + i * 3, 10) }}>stateless</span>}
            />
            <Flow
              points={[
                [LBX.x + LBX.w / 2 + (i - 1.5) * 34, lbY + LBX.h + 4],
                [LBX.x + LBX.w / 2 + (i - 1.5) * 34, lbY + LBX.h + 26],
                [srvX(i) + SRV.w / 2, lbY + LBX.h + 26],
                [srvX(i) + SRV.w / 2, rowY - 8],
              ]}
              at={Math.max(multiply(i), behindAt + 4)}
              color={BAR}
              width={2.2}
              head={12}
            />
            <Flow
              points={[
                [srvX(i) + SRV.w / 2, rowY + SRV.h + 4],
                [srvX(i) + SRV.w / 2, rowY + SRV.h + 24],
                [SHARED.x + SHARED.w / 2 + (i - 1.5) * 50, rowY + SRV.h + 24],
                [SHARED.x + SHARED.w / 2 + (i - 1.5) * 50, sharedY - 8],
              ]}
              at={sharedAt + i * 3}
              color={OK}
              width={2}
              head={11}
            />
          </React.Fragment>
        ))}
        <Node x={SHARED.x} y={sharedY} w={SHARED.w} h={SHARED.h} at={sharedAt - 6} tone="ok" title="shared cache or database" size={21} />
        {tok > 0 && tok < 1 ? (
          <div
            style={{
              position: "absolute",
              left: tokX - 44,
              top: tokY - 15,
              padding: "2px 10px 3px",
              borderRadius: 8,
              background: OK,
              ...label(19, PAPER),
              fontWeight: 500,
            }}
          >
            session
          </div>
        ) : null}
        <Line at={anyAt} x={H_X} y={y(856)} size={22} color={INK}>
          <Mark at={anyAt + 2}>only if any server can handle any request</Mark>
        </Line>

        {/* The three columns' separators. */}
        <VRule x={560} top={y(340)} bottom={y(890)} at={horizAt} />
        <VRule x={1257} top={y(338)} bottom={y(890)} at={theseAt} />

        {/* ── Ours: the redirect servers are stateless already. ── */}
        <Line at={theseAt} x={1300} y={y(338)} size={22} weight={500} color={OK_INK}>
          Our redirect servers: stateless already
        </Line>
        {Array.from({ length: 8 }, (_, i) => {
          const at = ourAt(i);
          const p = pop(frame, at, fps, 14);
          return p > 0.001 ? (
            <div
              key={i}
              style={{
                position: "absolute",
                left: ourX(i),
                top: oursTop,
                width: 54,
                height: 44,
                boxSizing: "border-box",
                borderRadius: 8,
                border: `2.5px solid ${OK}`,
                background: `color-mix(in srgb, ${OK} 12%, ${PAPER})`,
                opacity: Math.min(1, p),
                transform: `scale(${0.8 + 0.2 * Math.min(1, p)})`,
              }}
            />
          ) : null;
        })}

        {/* ── The chart: the simplest queue's mean wait against load. ── */}
        <Line at={chartAt} x={C.x0 - 70} y={y(512)} size={21} weight={500} color={INK_SOFT}>
          The simplest queue: mean wait, in service times
        </Line>
        <Svg opacity={ease(frame, chartAt, 12)}>
          <defs>
            <clipPath id="be-scaling-wait">
              <rect x={C.x0} y={y(C.top) - 2} width={C.x1 - C.x0} height={y(C.base) - y(C.top) + 4} />
            </clipPath>
          </defs>
          {/* Headroom: the last tenth before full, where the wait climbs from 9 to 99. */}
          {shade > 0 ? (
            <rect x={cx(0.9)} y={y(C.top)} width={(cx(0.99) - cx(0.9)) * shade} height={y(C.base) - y(C.top)} fill={HIGHLIGHT} opacity={0.75} />
          ) : null}
          {[0, 10, 20].map((v) => (
            <g key={v}>
              <line x1={C.x0} x2={C.x1} y1={cy(v)} y2={cy(v)} stroke={INK_SOFT} strokeWidth={v ? 1 : 1.6} opacity={v ? 0.25 : 1} />
              <text x={C.x0 - 12} y={cy(v) + 7} textAnchor="end" style={svgText(note(20, INK_SOFT))}>
                {v}×
              </text>
            </g>
          ))}
          {[0, 0.5, 1].map((r) => (
            <text key={r} x={cx(r)} y={y(C.base) + 30} textAnchor={r === 1 ? "end" : r === 0 ? "start" : "middle"} style={svgText(note(20, INK_SOFT))}>
              {Math.round(r * 100)}%{r === 1 ? " load" : ""}
            </text>
          ))}
          <g clipPath="url(#be-scaling-wait)">
            <path d={path} fill="none" stroke={BAR} strokeWidth={3} pathLength={1} strokeDasharray={`${curveP} 1`} />
          </g>
          {/* The three readings, each as it is said. */}
          {[
            [m50, fiftyAt, "1× at 50%"],
            [m90, ninetyAt, "9× at 90%"],
          ].map(([m, at, t]) => {
            const mm = m as { rho: number; wait: number };
            const p = ease(frame, at as number, 10);
            return p > 0 ? (
              <g key={String(t)} opacity={p}>
                <line x1={cx(mm.rho)} x2={cx(mm.rho)} y1={y(C.base)} y2={cy(mm.wait)} stroke={INK_SOFT} strokeWidth={1.2} strokeDasharray="4 4" />
                <circle cx={cx(mm.rho)} cy={cy(mm.wait)} r={7} fill={ACCENT} />
                <text x={cx(mm.rho) - 14} y={cy(mm.wait) - 14} textAnchor="end" style={svgText({ ...note(24, ACCENT_INK), fontWeight: 500 })}>
                  {t as string}
                </text>
              </g>
            ) : null;
          })}
          {ease(frame, nn99At, 10) > 0 ? (
            <g opacity={ease(frame, nn99At, 10)}>
              <line x1={cx(m99.rho)} x2={cx(m99.rho)} y1={y(C.base)} y2={y(C.top) - 6} stroke={ACCENT} strokeWidth={2.4} />
              <path d={arrowHead(up99, 14, 8, { filled: true })} fill={ACCENT} />
              <text x={cx(m99.rho) - 18} y={y(C.top) - 8} textAnchor="end" style={svgText({ ...note(23, ACCENT_INK), fontWeight: 500 })}>
                99× at 99%, off the top
              </text>
            </g>
          ) : null}
        </Svg>
        <Ink at={roomAt + 6} dur={14} style={{ left: C.x0 - 70, top: y(C.base) + h(56), whiteSpace: "nowrap" }}>
          <span style={{ ...note(23, INK), fontWeight: 500 }}>
            <Mark at={roomAt + 8}>Headroom:</Mark> run where the wait is still flat
          </span>
        </Ink>
        <Ink at={fullAt} dur={14} style={{ left: 1300, top: oursTop + 70, whiteSpace: "nowrap" }}>
          <span style={{ ...note(21, BLUE_INK), fontWeight: 500 }}>
            enough that <Num>none</Num> runs near full
          </span>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
