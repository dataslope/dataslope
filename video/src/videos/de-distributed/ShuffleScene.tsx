import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER, svgText } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { count, type Dept, DEPT_INK, LADDER, NET_LEVEL } from "./data";
import { Arrow, Curve, Disk, diskHeight, Drift, Machine, Mark, MARK_BAD, OK_INK, Svg } from "./parts";

const MAP_X = 120;
const BOX_W = 170;
const BOX_H = 44;
const ROW_TOPS = [322, 378, 434];
const DISK_X = 330;
const DISK_W = 48;
const DISK_H = diskHeight(DISK_W);
const RED_X = 780;
const KEYS: Dept[] = ["Eng", "Ops", "Sales"];

const NAME_R = 450;
const BAR_X = 470;
const BAR_W = 760;
const LO = Math.log10(0.2);
const HI = Math.log10(3e7);
const LAD_TOP = 606;
const LAD_PITCH = 37;
const SCALED_X = 1580;
/** How far left of the row names the highlight band starts. */
const BAND_L = 262;

const xOf = (ns: number) => BAR_X + ((Math.log10(ns) - LO) / (HI - LO)) * BAR_W;
const nsText = (ns: number) => `${ns < 1 ? String(ns) : count(ns)} ns`;

/**
 * Question 7. A shuffle in small: three map tasks write to local disk, and
 * three reduce tasks, one per key, fetch from every one of them over the
 * network. Then the page's latency chart, redrawn from its levels on the same
 * log scale with its own "if L1 took one second" column, except its last row:
 * the chart's 10 ms "network round trip" is the disk seek of the table it
 * cites, so this draws that table's data-center round trip (check.mjs). An
 * SSD read is a thousand times memory, the round trip five thousand.
 */
export const ShuffleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("shuffle").from;
  const qAt = n.word("shuffle", "Question seven");
  const textAt = n.word("shuffle", "What is a shuffle");
  const movesAt = n.word("shuffle", "It moves rows");
  const keyAt = n.word("shuffle", "every row with one key");
  const mapAt = n.word("shuffle", "Map tasks write their output");
  const diskAt = n.word("shuffle", "local disk");
  const fetchAt = n.word("shuffle", "reduce tasks fetch it");
  const netAt = n.word("shuffle", "over the network");
  const ssdAt = n.word("shuffle-ladder", "An SSD read");
  // The chart draws in over the pause before its first word.
  const chartAt = ssdAt - 14;
  const thousandAt = n.word("shuffle-ladder", "a thousand times as long as memory");
  const rtAt = n.word("shuffle-ladder", "a round trip inside the data center");
  const fiveThousandAt = n.word("shuffle-ladder", "five thousand times");
  const secondAt = n.word("shuffle-ladder", "If the fastest cache took one second");
  const daysAt = n.word("shuffle-ladder", "almost six days");
  const fewerAt = n.word("shuffle-tune", "fewer shuffles");
  const lessAt = n.word("shuffle-tune", "less data in each");
  const end = n.beat("shuffle-tune").to;

  const boxH = h(BOX_H);
  const mid = (k: number) => y(ROW_TOPS[k]) + boxH / 2;
  const rowY = (i: number) => y(LAD_TOP + i * LAD_PITCH);
  const rowH = h(LAD_PITCH) - 10;
  const idx = (name: string) => LADDER.levels.findIndex((l) => l.name === name);
  const MEM = idx("Main memory");
  const SSD = idx("NVMe SSD read");
  const NET = idx(NET_LEVEL);
  const L1 = idx("L1 cache");
  const ratioOf = (i: number) => (i === SSD ? LADDER.ssdOverMemory : i === NET ? LADDER.networkOverMemory : null);
  // A gridline stops for any row whose figure is printed across it, so no
  // dotted rule runs through a label. Widths are estimated from the text at
  // the label's 20px (about 10.5px a character, the ratio's bold included).
  const gridRuns = (x: number): [number, number][] => {
    const skips = LADDER.levels
      .map((l, i) => {
        const r = ratioOf(i);
        const text = nsText(l.ns) + (r === null ? "" : ` · ${count(r)} × memory`);
        const x0 = xOf(l.ns) + 14 - 6;
        const x1 = xOf(l.ns) + 14 + text.length * 10.5 + 6;
        return x >= x0 && x <= x1 ? [rowY(i) - 6, rowY(i) + rowH + 6] : null;
      })
      .filter((v): v is number[] => v !== null);
    const runs: [number, number][] = [];
    let from = rowY(0) - 6;
    for (const [a, b] of skips) {
      if (a > from) runs.push([from, a]);
      from = Math.max(from, b);
    }
    const end = rowY(LADDER.levels.length - 1) + rowH + 4;
    if (end > from) runs.push([from, end]);
    return runs;
  };
  const mark = (at: number, out?: number) => ease(frame, at, 10) * (out === undefined ? 1 : 1 - ease(frame, out, 10));

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={keyAt} level={-36} />
      <Sfx name="el-tap" at={diskAt} level={-36} />
      <Sfx name="el-whoosh" at={netAt} level={-36} />
      <Sfx name="el-sprinkle" at={chartAt + 4} level={-37} />
      <Sfx name="el-tap" at={thousandAt} level={-35} />
      <Sfx name="el-tap" at={fiveThousandAt} level={-35} />
      <Sfx name="el-pop" at={daysAt} level={-35} />
      <Sfx name="el-chime" at={fewerAt} level={-36} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={7} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is a shuffle, and why is it expensive?
        </QuestionCard>

        {/* ── A shuffle in small ── */}
        {KEYS.map((k, i) => (
          <React.Fragment key={k}>
            <Machine x={RED_X} top={y(ROW_TOPS[i])} width={BOX_W} height={boxH} at={keyAt + i * 3} />
            <Note at={keyAt + 2 + i * 3} x={RED_X} y={mid(i) - 14} width={BOX_W} style={{ textAlign: "center" }}>
              <span style={{ ...label(22, DEPT_INK[k]), fontWeight: 600 }}>{k}</span>
            </Note>
          </React.Fragment>
        ))}
        <Note at={movesAt} x={RED_X} y={y(ROW_TOPS[0]) - h(40)}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>
            one partition per key<span style={{ opacity: ease(frame, fetchAt, 10) }}>: reduce tasks</span>
          </span>
        </Note>
        {[0, 1, 2].map((m) => (
          <React.Fragment key={m}>
            <Machine x={MAP_X} top={y(ROW_TOPS[m])} width={BOX_W} height={boxH} at={mapAt + m * 3} />
            <Note at={mapAt + 2 + m * 3} x={MAP_X} y={mid(m) - 14} width={BOX_W} style={{ textAlign: "center" }}>
              <span style={{ ...label(22, INK), fontWeight: 650 }}>map task {m + 1}</span>
            </Note>
            <Arrow from={[MAP_X + BOX_W + 6, mid(m)]} to={[DISK_X - 8, mid(m)]} at={diskAt + m * 3} dur={8} width={1.8} head={10} />
            <Disk x={DISK_X} top={mid(m) - DISK_H / 2} at={diskAt + 4 + m * 3} w={DISK_W} />
            {KEYS.map((_, r) => (
              <Curve
                key={r}
                from={[DISK_X + DISK_W + 8, mid(m)]}
                to={[RED_X - 10, mid(r)]}
                at={fetchAt + 2 + m * 3 + r}
                dur={16}
                color={ease(frame, netAt, 8) > 0.5 ? ACCENT : INK_SOFT}
                width={1.6}
                head={10}
              />
            ))}
          </React.Fragment>
        ))}
        <Note at={diskAt + 4} x={DISK_X - 30} y={y(ROW_TOPS[2]) + boxH + h(20)}>
          <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>serialized to local disk</span>
        </Note>
        <Note at={netAt} x={600} y={y(ROW_TOPS[2]) + boxH + h(20)}>
          <span style={{ ...label(21, ACCENT_INK), fontWeight: 600, whiteSpace: "nowrap" }}>the network</span>
        </Note>
        <Note at={fewerAt - 2} x={1080} y={y(ROW_TOPS[0]) + h(16)}>
          <span style={{ ...note(27, OK_INK), fontWeight: 600, display: "block", lineHeight: 1.3, whiteSpace: "nowrap" }}>
            Tuning Spark:
            <br />
            fewer shuffles<span style={{ opacity: ease(frame, lessAt, 10) }}>, less data in each</span>
          </span>
        </Note>

        {/* ── The page's latency chart ── */}
        <Note at={chartAt} x={MAP_X} y={y(LAD_TOP) - h(50)}>
          <span style={{ ...label(23, INK), whiteSpace: "nowrap" }}>
            Latency, order of magnitude <span style={{ color: INK_SOFT, fontWeight: 500 }}>(nanoseconds, log scale)</span>
          </span>
        </Note>
        <Note at={secondAt - 2} x={SCALED_X} y={y(LAD_TOP) - h(64)}>
          <span style={{ ...label(21, INK_SOFT), display: "block", lineHeight: 1.25, whiteSpace: "nowrap" }}>
            if the fastest cache
            <br />
            took one second
          </span>
        </Note>
        {[MEM, SSD, NET].map((i) => {
          const at = i === MEM ? thousandAt : i === SSD ? ssdAt : rtAt;
          const o = mark(at - 2, i === MEM ? secondAt : undefined);
          return o > 0 ? (
            <div key={i} style={{ position: "absolute", left: NAME_R - BAND_L, top: rowY(i) - 4, width: BAND_L + (SCALED_X - NAME_R) + 160, height: rowH + 8, background: HIGHLIGHT, opacity: o * 0.45, borderRadius: 4 }} />
          ) : null;
        })}
        <Svg>
          {[1, 100, 1e4, 1e6].map((t) => (
            <g key={t} opacity={ease(frame, chartAt + 6, 12)}>
              {gridRuns(xOf(t)).map(([a, b]) => (
                <line key={a} x1={xOf(t)} x2={xOf(t)} y1={a} y2={b} stroke={INK_SOFT} strokeWidth={1} strokeDasharray="2 6" opacity={0.5} />
              ))}
              <text x={xOf(t)} y={rowY(LADDER.levels.length - 1) + rowH + 28} textAnchor="middle" style={svgText({ ...label(19, INK_SOFT), fontWeight: 500 })}>
                {t >= 1e6 ? `${t / 1e6}M` : t >= 1000 ? `${t / 1000}k` : String(t)}
              </text>
            </g>
          ))}
          {LADDER.levels.map((l, i) => {
            const p = ease(frame, chartAt + 4 + i * 3, 14);
            const hot = l.ns >= 1e5;
            const x2 = BAR_X + (xOf(l.ns) - BAR_X) * p;
            return (
              <g key={l.name}>
                <rect x={BAR_X} y={rowY(i)} width={Math.max(0, x2 - BAR_X)} height={rowH} fill={`color-mix(in srgb, ${hot ? ACCENT : BAR} 45%, ${PAPER})`} rx={2} />
                <circle cx={x2} cy={rowY(i) + rowH / 2} r={5 * p} fill={hot ? ACCENT : BAR} />
              </g>
            );
          })}
        </Svg>
        {LADDER.levels.map((l, i) => {
          const at = chartAt + 4 + i * 3;
          const hot = l.ns >= 1e5;
          const ratio = i === SSD ? { at: thousandAt, n: LADDER.ssdOverMemory } : i === NET ? { at: fiveThousandAt, n: LADDER.networkOverMemory } : null;
          return (
            <React.Fragment key={l.name}>
              <Note at={at} x={NAME_R} y={rowY(i) + rowH / 2 - 14} align="right">
                <span style={{ ...label(21, i === MEM || hot ? INK : INK_SOFT), whiteSpace: "nowrap" }}>{l.name}</span>
              </Note>
              <Note at={at + 8} x={xOf(l.ns) + 14} y={rowY(i) + rowH / 2 - 14}>
                <span style={{ ...note(20, hot ? ACCENT_INK : INK_SOFT), whiteSpace: "nowrap" }}>
                  <Num>{nsText(l.ns)}</Num>
                  {ratio ? (
                    <span style={{ opacity: ease(frame, ratio.at, 10), fontWeight: 600 }}>
                      {" · "}
                      <Num>{count(ratio.n)}</Num> × memory
                    </span>
                  ) : null}
                </span>
              </Note>
              <Note at={secondAt + 2 + i * 2} x={SCALED_X} y={rowY(i) + rowH / 2 - 14}>
                <span style={{ ...note(21, i === NET ? ACCENT_INK : i === L1 ? INK : INK_SOFT), fontWeight: i === NET || i === L1 ? 700 : 500, whiteSpace: "nowrap" }}>
                  {/* The network's "almost six days" takes the trap's red
                      highlight, where a ring once sat round it. */}
                  {i === NET ? (
                    <span style={{ display: "inline-block", marginLeft: "-0.14em" }}>
                      <Mark at={daysAt} color={MARK_BAD}>
                        <Num>{l.scaled}</Num>
                      </Mark>
                    </span>
                  ) : (
                    <Num>{l.scaled}</Num>
                  )}
                </span>
              </Note>
            </React.Fragment>
          );
        })}
      </Drift>
    </AbsoluteFill>
  );
};
