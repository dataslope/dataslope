import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, label, svgText } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { LADDER } from "./data";
import { Drift, Headline, int, Kicker, Line, Mark, X0 } from "./parts";

/** The log axis: 0.1 ns to a millisecond. */
const LO = -1;
const HI = 6;
const AX0 = 520;
const AX1 = 1440;
const lx = (ns: number) => AX0 + ((Math.log10(ns) - LO) / (HI - LO)) * (AX1 - AX0);
const NAME_RIGHT = 494;
const ROW = 62;
const BAR_H = 30;

/** What each row is called on screen: the chart's names, with the network
 *  row said the way the narration says it. */
const nameOf = (name: string) => (name === "Network round trip" ? "Round trip in the data center" : name);

/**
 * Question 2, the one picture to keep: charts/memory-latency-ladder.mjs's
 * levels, read from its source (check.mjs), as bars on a log axis. Main
 * memory, an SSD read a thousand times slower, a round trip inside the data
 * center five times slower again; so a request's network hops are counted
 * first.
 */
export const LadderScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("q2-ladder").from;
  const pictureAt = n.word("q2-ladder", "keep one picture in your head");
  const costsAt = n.word("q2-ladder", "what each level of memory and network costs");
  const memAt = n.word("q2-ladder", "Main memory");
  const hundredAt = n.word("q2-ladder", "a hundred nanoseconds");
  const ssdAt = n.word("q2-ladder", "An SSD read");
  const thousandAt = n.word("q2-ladder", "a thousand times that");
  const rttAt = n.word("q2-ladder", "A round trip inside the data center");
  const fiveAt = n.word("q2-ladder", "five times more again");
  const countAt = n.word("q2-ladder", "count the network hops");
  const end = n.beat("q2-ladder").to;

  const levels = LADDER.levels;
  const top = y(312);
  const rowY = (i: number) => top + i * ROW;
  const litAt: Record<string, number> = { "Main memory": memAt, "NVMe SSD read": ssdAt, "Network round trip": rttAt };
  const factor: Record<string, { text: string; at: number }> = {
    "NVMe SSD read": { text: `× ${int(LADDER.ssdOverMemory)}`, at: thousandAt },
    "Network round trip": { text: `× ${LADDER.rttOverSsd}`, at: fiveAt },
  };
  const axisY = rowY(levels.length - 1) + ROW / 2 + 12;
  const band = ease(frame, countAt, 14);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={costsAt} level={-37} />
      <Sfx name="el-tap" at={memAt} level={-34} />
      <Sfx name="el-tap" at={ssdAt} level={-34} />
      <Sfx name="el-tap" at={rttAt} level={-34} />
      <Sfx name="el-pencil" at={countAt} level={-35} />

      <Drift from={from} to={end + 30}>
        <Kicker at={from}>Question 2 · Back-of-the-envelope numbers</Kicker>
        <Headline lead="What each level costs" at={pictureAt - 6} size={70} />

        {/* The row the narration ends on, banded. */}
        <div
          style={{
            position: "absolute",
            left: X0 - 10,
            top: rowY(levels.length - 1) - ROW / 2 + 4,
            width: 1704 * band,
            height: ROW - 8,
            background: HIGHLIGHT,
            borderRadius: 6,
            opacity: band > 0 ? 0.7 : 0,
          }}
        />

        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {levels.map((l, i) => {
            const at = litAt[l.name];
            const grow = ease(frame, (at ?? costsAt + i * 4) - 2, 16);
            const lit = at === undefined ? 0 : ease(frame, at, 10);
            const x1 = AX0 + (lx(l.ns) - AX0) * grow;
            return (
              <rect
                key={l.name}
                x={AX0}
                y={rowY(i) - BAR_H / 2}
                width={Math.max(0, x1 - AX0)}
                height={BAR_H}
                rx={3}
                fill={lit > 0 ? `color-mix(in srgb, ${BAR} ${Math.round(lit * 100)}%, ${ds("gray", 300)})` : ds("gray", 300)}
              />
            );
          })}
          {/* The axis. */}
          <line x1={AX0} x2={AX1} y1={axisY} y2={axisY} stroke={INK} strokeWidth={1.4} opacity={ease(frame, costsAt, 12)} />
          {[
            { ns: 1, text: "1 ns" },
            { ns: 1e3, text: "1 µs" },
            { ns: 1e6, text: "1 ms" },
          ].map((t) => (
            <g key={t.text} opacity={ease(frame, costsAt + 6, 12)}>
              <line x1={lx(t.ns)} x2={lx(t.ns)} y1={axisY} y2={axisY + 7} stroke={INK} strokeWidth={1.2} />
              <text x={lx(t.ns)} y={axisY + 32} textAnchor="middle" style={svgText({ ...label(20, INK_SOFT), fontWeight: 500 })}>
                {t.text}
              </text>
            </g>
          ))}
          <text x={AX1} y={axisY + 62} textAnchor="end" style={svgText({ ...label(20, INK_SOFT) })} opacity={ease(frame, costsAt + 10, 12)}>
            log scale
          </text>
        </svg>

        {levels.map((l, i) => {
          const at = litAt[l.name];
          const lit = at === undefined ? 0 : ease(frame, at, 10);
          const appear = at ?? costsAt + i * 4;
          const f = factor[l.name];
          const ink = lit > 0.5 ? INK : INK_SOFT;
          return (
            <React.Fragment key={l.name}>
              <Line x={NAME_RIGHT} y={rowY(i) - 16} at={appear} size={25} weight={lit > 0.5 ? 700 : 500} color={ink} align="right">
                {nameOf(l.name)}
              </Line>
              <Line x={lx(l.ns) + 16} y={rowY(i) - 16} at={appear + 10} size={25} weight={lit > 0.5 ? 700 : 500} color={lit > 0.5 ? BLUE_INK : INK_SOFT}>
                <Num>{l.ns < 1 ? l.ns : int(l.ns)}</Num> ns
                {f ? (
                  <span style={{ marginLeft: "0.5em", opacity: ease(frame, f.at, 10), color: INK }}>
                    <Mark at={f.at} color={HIGHLIGHT}>
                      <Num>{f.text}</Num>
                    </Mark>
                  </span>
                ) : null}
              </Line>
            </React.Fragment>
          );
        })}

        <Line x={X0} y={axisY + 104} at={countAt + 4} size={30} weight={600}>
          Count the network hops in a request first.
        </Line>
        <Line x={X0} y={axisY + 150} at={hundredAt} size={24} color={INK_SOFT}>
          Orders of magnitude, from the page&apos;s latency chart
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
