import { Cpu, Gpu, Server } from "lucide-react";
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { RapidFire, Tick, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, label, note, svgText } from "../../editorial/style";
import { ColumnRule, Ink, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { SOFT } from "./data";
import { clamp01, Cross, Digit, Drift, Flow, Headline, Kicker, Line, Mark, Node, OK, OK_INK, pct, Rel, Svg, Tag, X0 } from "./parts";

/** The answers' column. */
const BX = 780;
const BR = 1800;
const LIST_TOP = 380;
const ROW = 64;

type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"] };

// ── 12. Online and offline features ─────────────────────────────────────────

const Features: React.FC<{ c: Ctx }> = ({ c }) => {
  const offAt = c.w("r-features", "Offline features are computed");
  const freshAt = c.w("r-features", "as fresh as the last run");
  const onAt = c.w("r-features", "Online features are computed at request time");
  const lookedAt = c.w("r-features", "looked up in the online store");
  const builtAt = c.w("r-features", "built from the request itself");
  const sessionAt = c.w("r-features", "how recent the session is");
  const sameAt = c.w("r-features", "Keeping the two definitions identical");
  const top = c.y(352);
  const col2 = 1330;
  return (
    <>
      <Line at={offAt} x={BX} y={top} size={26}>
        Offline
      </Line>
      <Line at={offAt + 6} x={BX} y={top + c.h(48)} size={22}>
        Batch jobs over history
      </Line>
      <Line at={freshAt} x={BX} y={top + c.h(86)} size={21} color={INK_SOFT}>
        As fresh as the last run
      </Line>
      <Ink at={offAt + 12} dur={12} style={{ left: BX, top: top + c.h(140), whiteSpace: "nowrap" }}>
        <Tag size={21} style={{ fontFamily: MONO, fontSize: 20 }}>
          txn_count_7d
        </Tag>
      </Ink>
      <ColumnRule x={(BX + 480 + col2) / 2 - 20} top={top} height={c.h(190)} at={onAt} />
      <Line at={onAt} x={col2} y={top} size={26}>
        Online
      </Line>
      <Line at={onAt + 6} x={col2} y={top + c.h(48)} size={22}>
        At request time
      </Line>
      <Line at={lookedAt} x={col2} y={top + c.h(86)} size={21} color={INK_SOFT}>
        Looked up in the online store,
      </Line>
      <Line at={builtAt} x={col2} y={top + c.h(120)} size={21} color={INK_SOFT}>
        or built from the request itself
      </Line>
      <Ink at={sessionAt} dur={12} style={{ left: col2, top: top + c.h(166), whiteSpace: "nowrap" }}>
        <Tag size={21} style={{ fontFamily: MONO, fontSize: 20 }}>
          session_age_s
        </Tag>
      </Ink>
      <Ink at={sameAt} dur={14} style={{ left: BX, top: c.y(640), whiteSpace: "nowrap" }}>
        <span style={{ ...note(24, INK), fontWeight: 500 }}>
          The hard part: <Mark at={sameAt + 6}>the same definition in both</Mark>
        </span>
      </Ink>
    </>
  );
};

// ── 13. Data validation ─────────────────────────────────────────────────────

const ROWS = [
  [42.1, 1.2, null],
  [18.5, 1.4, null],
  [77.0, 1.3, null],
  [30.2, 1250, null],
  [55.9, 1310, null],
] as const;

const Validate: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const checksAt = c.w("r-validate", "Data validation checks each new batch");
  const schemaAt = c.w("r-validate", "for schema");
  const rangesAt = c.w("r-validate", "ranges");
  const distAt = c.w("r-validate", "distributions");
  const completeAt = c.w("r-validate", "and completeness");
  const withoutAt = c.w("r-validate", "Without it");
  const nullAt = c.w("r-validate", "a new null column");
  const unitsAt = c.w("r-validate", "a sensor that changes units");
  const corruptAt = c.w("r-validate", "trains a model on corrupt data");
  const quietAt = c.w("r-validate", "it quietly underperforms");
  const top = c.y(352);
  const colX = [BX + 14, BX + 160, BX + 320];
  const rowY = (i: number) => top + c.h(44) + i * c.h(38);
  const nullLit = ease(frame, nullAt, 10);
  const unitLit = ease(frame, unitsAt, 10);
  const checks = [
    { t: "schema", at: schemaAt, fail: 0 },
    { t: "ranges", at: rangesAt, fail: unitLit },
    { t: "distributions", at: distAt, fail: unitLit },
    { t: "completeness", at: completeAt, fail: nullLit },
  ];
  return (
    <>
      <Ink at={checksAt} dur={12} style={{ left: BX, top, whiteSpace: "nowrap" }}>
        <Rel w={440} h={28}>
          <span style={{ ...label(20, INK_SOFT), position: "absolute", left: colX[0] - BX, fontFamily: MONO, fontSize: 19 }}>amount</span>
          <span style={{ ...label(20, INK_SOFT), position: "absolute", left: colX[1] - BX, fontFamily: MONO, fontSize: 19 }}>sensor_m</span>
          <span style={{ ...label(20, INK_SOFT), position: "absolute", left: colX[2] - BX, fontFamily: MONO, fontSize: 19 }}>region</span>
        </Rel>
      </Ink>
      <div style={{ position: "absolute", left: BX, top: top + 32, width: 440, height: 1, background: HAIRLINE, opacity: ease(frame, checksAt + 4, 12) }} />
      {ROWS.map((r, i) => (
        <Ink key={i} at={checksAt + 4 + i * 3} dur={10} style={{ left: BX, top: rowY(i) }}>
          <Rel w={440} h={30}>
            <span style={{ ...note(21, BLUE_INK), position: "absolute", left: colX[0] - BX }}>
              <Num>{r[0].toFixed(1)}</Num>
            </span>
            <span style={{ ...note(21, i >= 3 && unitLit > 0.5 ? ACCENT_INK : BLUE_INK), position: "absolute", left: colX[1] - BX }}>
              <Num>{r[1]}</Num>
            </span>
            <span style={{ ...note(21, nullLit > 0.5 ? ACCENT_INK : INK_SOFT), position: "absolute", left: colX[2] - BX, fontFamily: MONO, fontSize: 20 }}>null</span>
          </Rel>
        </Ink>
      ))}
      <Line at={nullAt + 4} x={colX[2]} y={rowY(5) + 6} size={20} color={ACCENT_INK}>
        new, all null
      </Line>
      <Line at={unitsAt + 4} x={colX[1]} y={rowY(5) + 6} size={20} color={ACCENT_INK}>
        m became mm
      </Line>
      {/* The four checks, each failing where it catches something. */}
      {checks.map((k, i) => {
        const p = ease(frame, k.at, 10);
        if (p <= 0) return null;
        const failed = k.fail > 0.5;
        return (
          <div key={k.t} style={{ position: "absolute", left: 1360, top: top + c.h(10) + i * c.h(52), display: "flex", alignItems: "center", gap: 12, opacity: p, whiteSpace: "nowrap" }}>
            <span style={{ width: 26, height: 26, display: "inline-flex" }}>{failed ? <Cross at={i === 3 ? nullAt + 8 : unitsAt + 8} size={26} /> : <Tick at={k.at + 4} size={26} color={OK} />}</span>
            <span style={{ ...label(22, failed ? ACCENT_INK : INK), fontWeight: 500 }}>{k.t}</span>
          </div>
        );
      })}
      <Line at={withoutAt} x={BX} y={c.y(680)} size={22}>
        Without it, a model trained on corrupt data
      </Line>
      <Line at={corruptAt + 10} x={BX} y={c.y(680) + c.h(40)} size={22} color={ACCENT_INK}>
        <span style={{ opacity: ease(frame, quietAt, 10) }}>quietly underperforms</span>
      </Line>
      <Ink at={completeAt + 12} dur={12} style={{ left: 1360, top: top + c.h(10) + 4 * c.h(52) + c.h(16), whiteSpace: "nowrap" }}>
        <span style={{ ...note(22, OK_INK), fontWeight: 500 }}>Checked before training</span>
      </Ink>
    </>
  );
};

// ── 14. GPU or CPU ──────────────────────────────────────────────────────────

const GpuCpu: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const largeAt = c.w("r-gpu", "GPUs win on large, parallel work");
  const nnAt = c.w("r-gpu", "batched neural networks");
  const lightAt = c.w("r-gpu", "For a light model");
  const cpuAt = c.w("r-gpu", "a CPU is faster");
  const overheadAt = c.w("r-gpu", "the GPU's launch overhead would dominate");
  const top = c.y(352);
  const COLS = [{ x: 1250, t: "GPU", icon: Gpu }, { x: 1560, t: "CPU", icon: Cpu }] as const;
  const rows = [top + c.h(110), top + c.h(270)];
  return (
    <>
      {COLS.map((col, i) => (
        <Node key={col.t} x={col.x} y={top} w={220} h={64} at={largeAt + i * 6} icon={col.icon} title={col.t} />
      ))}
      <Line at={largeAt} x={BX} y={rows[0]} size={22}>
        Large, parallel work
      </Line>
      <Ink at={nnAt} dur={12} style={{ left: BX, top: rows[0] + c.h(42), width: 420, display: "flex", flexWrap: "wrap", gap: 10, fontSize: 20 }}>
        {["batched neural networks", "transformers", "images", "video"].map((t) => (
          <Tag key={t} size={20}>
            {t}
          </Tag>
        ))}
      </Ink>
      <Ink at={largeAt + 8} dur={12} style={{ left: COLS[0].x, top: rows[0], whiteSpace: "nowrap" }}>
        <span style={{ ...note(22, OK_INK), fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 10, fontSize: 22 }}>
          <Tick at={largeAt + 12} size={24} color={OK} />
          Wins
        </span>
      </Ink>
      <div style={{ position: "absolute", left: BX, top: rows[1] - c.h(26), width: BR - BX, height: 1, background: HAIRLINE, opacity: ease(frame, lightAt - 4, 12) }} />
      <Line at={lightAt} x={BX} y={rows[1]} size={22}>
        A light model, one request
      </Line>
      <Ink at={lightAt + 8} dur={12} style={{ left: BX, top: rows[1] + c.h(42), whiteSpace: "nowrap" }}>
        <Tag size={20}>a tree ensemble</Tag>
      </Ink>
      <Ink at={overheadAt} dur={12} style={{ left: COLS[0].x, top: rows[1], whiteSpace: "nowrap" }}>
        <span style={{ ...note(22, INK), fontWeight: 500 }}>
          <Mark at={overheadAt + 4}>Launch overhead</Mark>
        </span>
      </Ink>
      <Line at={overheadAt + 8} x={COLS[0].x} y={rows[1] + c.h(36)} size={21} color={INK_SOFT}>
        dominates
      </Line>
      <Ink at={cpuAt} dur={12} style={{ left: COLS[1].x, top: rows[1], whiteSpace: "nowrap" }}>
        <span style={{ ...note(22, OK_INK), fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 10, fontSize: 22 }}>
          <Tick at={cpuAt + 4} size={24} color={OK} />
          Faster
        </span>
      </Ink>
    </>
  );
};

// ── 15. Knowledge distillation ──────────────────────────────────────────────

const Distill: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const studentAt = c.w("r-distill", "trains a small student");
  const teacherAt = c.w("r-distill", "a large teacher's probabilities");
  const labelsAt = c.w("r-distill", "not just the labels");
  const nineAt = c.w("r-distill", "Shown one held-out nine");
  const p9At = c.w("r-distill", "sixty-five percent nine");
  const p3At = c.w("r-distill", "thirty-five percent three");
  const looksAt = c.w("r-distill", "nines can look like threes");
  const hardAt = c.w("r-distill", "the hard label says only nine");
  const top = c.y(352);
  const mid = top + 44;
  const chartTop = c.y(520);
  const chartH = c.h(190);
  const base = chartTop + chartH;
  const bars = (x0: number, probs: readonly number[], at: number, lit: number[]) =>
    probs.map((v, d) => {
      const p = ease(frame, at + d, 14);
      const hh = v * chartH * p;
      const on = lit.includes(d);
      return (
        <React.Fragment key={d}>
          <rect x={x0 + d * 36} y={base - hh} width={26} height={hh} rx={3} fill={on ? BAR : ds("blue", 200)} />
          <text x={x0 + d * 36 + 13} y={base + 26} textAnchor="middle" style={svgText({ ...label(19, d === 9 || (d === 3 && x0 < 1300) ? INK : INK_SOFT) })}>
            {d}
          </text>
        </React.Fragment>
      );
    });
  const hard = Array.from({ length: 10 }, (_, d) => (d === 9 ? 1 : 0));
  const T = { x: BX, w: 300 };
  const S = { x: 1500, w: 200 };
  return (
    <>
      <Node x={T.x} y={mid - 50} w={T.w} h={100} at={teacherAt} title="Teacher" sub="large: our digit network" />
      <Flow points={[[T.x + T.w + 3, mid], [S.x - 3, mid]]} at={teacherAt + 8} color={BAR} />
      <Line at={teacherAt + 10} x={(T.x + T.w + S.x) / 2} y={mid - 44} size={21} color={BLUE_INK} align="center" width={420}>
        its probabilities
      </Line>
      <Line at={labelsAt} x={(T.x + T.w + S.x) / 2} y={mid + 14} size={21} color={INK_SOFT} align="center" width={420}>
        not just the labels
      </Line>
      <Node x={S.x} y={mid - 34} w={S.w} h={68} at={studentAt} title="Student" sub="small" size={22} />
      <Digit image={SOFT.image} px={13} x={BX} y={chartTop + 6} at={nineAt} />
      <Line at={nineAt + 4} x={BX} y={chartTop + 6 + 104 + 14} size={20} color={INK_SOFT}>
        a held-out nine
      </Line>
      <Line at={nineAt + 6} x={960} y={chartTop - c.h(44)} size={21}>
        Teacher&apos;s probabilities
      </Line>
      <Svg opacity={ease(frame, nineAt + 6, 10)}>
        {bars(960, SOFT.probs, nineAt + 8, [3, 9])}
        <line x1={956} x2={960 + 10 * 36} y1={base} y2={base} stroke={INK_SOFT} strokeWidth={1.5} />
      </Svg>
      <Ink at={p9At} dur={10} style={{ left: 960 + 9 * 36 - 34, top: base - SOFT.probs[9] * chartH - 34, whiteSpace: "nowrap" }}>
        <span style={{ ...label(21, BLUE_INK), fontWeight: 500 }}>
          <Num>{pct(SOFT.probs[9])}</Num>
        </span>
      </Ink>
      <Ink at={p3At} dur={10} style={{ left: 960 + 3 * 36 - 34, top: base - SOFT.probs[3] * chartH - 34, whiteSpace: "nowrap" }}>
        <span style={{ ...label(21, BLUE_INK), fontWeight: 500 }}>
          <Num>{pct(SOFT.probs[3])}</Num>
        </span>
      </Ink>
      <ColumnRule x={1390} top={chartTop - c.h(44)} height={chartH + c.h(80)} at={hardAt} />
      <Line at={hardAt} x={1440} y={chartTop - c.h(44)} size={21}>
        The hard label
      </Line>
      <Svg opacity={ease(frame, hardAt, 10)}>
        {bars(1440, hard, hardAt + 2, [9])}
        <line x1={1436} x2={1440 + 10 * 36} y1={base} y2={base} stroke={INK_SOFT} strokeWidth={1.5} />
      </Svg>
      <Ink at={looksAt} dur={14} style={{ left: 960, top: base + c.h(62), whiteSpace: "nowrap" }}>
        <span style={{ ...note(22, INK), fontWeight: 500 }}>
          <Mark at={looksAt + 4}>Nines can look like threes</Mark>
        </span>
      </Ink>
      <Line at={hardAt + 8} x={1440} y={base + c.h(62)} size={22} color={INK_SOFT}>
        Only nine
      </Line>
    </>
  );
};

// ── 16. Cutting serving latency ─────────────────────────────────────────────

const Latency: React.FC<{ c: Ctx }> = ({ c }) => {
  const findAt = c.w("r-latency", "find where the time goes");
  const levers = [
    { t: "A compressed model: quantized, distilled", at: c.w("r-latency", "a compressed model") },
    { t: "Batching under load", at: c.w("r-latency", "batching under load") },
    { t: "A cache for repeated inputs", at: c.w("r-latency", "a cache for repeated inputs") },
    { t: "A faster runtime or hardware", at: c.w("r-latency", "a faster runtime or hardware") },
    { t: "The model beside its callers", at: c.w("r-latency", "the model placed beside its callers") },
    { t: "A simpler model where it can't wait", at: c.w("r-latency", "a simpler model on the paths") },
  ];
  const top = c.y(352);
  return (
    <>
      <Ink at={findAt} dur={14} style={{ left: BX, top, whiteSpace: "nowrap" }}>
        <span style={{ ...note(24, INK), fontWeight: 500 }}>
          First, <Mark at={findAt + 4}>find where the time goes</Mark>
        </span>
      </Ink>
      {levers.map((l, i) => (
        <Ink key={l.t} at={l.at} dur={12} style={{ left: BX, top: top + c.h(72) + i * c.h(56), whiteSpace: "nowrap" }}>
          <span style={{ ...note(22, INK), fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 14, fontSize: 22 }}>
            <span style={{ ...label(22, INK_SOFT), width: 22, textAlign: "right" }}>
              <Num>{i + 1}</Num>
            </span>
            {l.t}
          </span>
        </Ink>
      ))}
    </>
  );
};

// ── 17. Scaling under variable load ─────────────────────────────────────────

/** The load through the beat (0 to 1 of its length): steady, a spike, then
 *  steady again. */
const loadAt = (u: number) => 0.32 + 0.62 * Math.exp(-(((u - 0.42) / 0.11) ** 2));

const Scale: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const startAt = c.w("r-scale", "under variable load");
  const autoAt = c.w("r-scale", "autoscale replicas");
  const depthAt = c.w("r-scale", "utilization or queue depth");
  const warmAt = c.w("r-scale", "take time to warm up");
  const queueAt = c.w("r-scale", "a request queue in front");
  const waitAt = c.w("r-scale", "lets a spike wait");
  const droppedAt = c.w("r-scale", "instead of being dropped");
  const endAt = n.beat("r-scale").to + 20;
  const top = c.y(352);
  const chart = { x0: BX, x1: BR, top: top + 10, h: c.h(100) };
  // Where "now" is along the load curve, and how much capacity the replicas
  // give: two, then a third once it has warmed up.
  const span = Math.max(1, endAt - startAt);
  const uNow = clamp01((frame - startAt) / span);
  const uOf = (f: number) => clamp01((f - startAt) / span);
  const uReady = uOf(waitAt + 6);
  const capAt = (u: number) => (u < uReady ? 0.6 : 0.9);
  // The queue: what arrives beyond capacity waits, and drains once it can.
  let q = 0;
  const steps = 120;
  for (let i = 1; i <= steps; i++) {
    const u = (i / steps) * uNow;
    q = Math.max(0, q + (loadAt(u) - capAt(u)) * (uNow / steps) * 9);
  }
  const queued = Math.min(30, Math.round(q * 26));
  const pts = Array.from({ length: 81 }, (_, i) => i / 80).map((u) => `${chart.x0 + u * (chart.x1 - chart.x0)},${chart.top + chart.h * (1 - loadAt(u))}`);
  const nowX = chart.x0 + uNow * (chart.x1 - chart.x0);
  const laneY = top + c.h(270);
  const replicaX = 1580;
  const spawned = frame >= warmAt - 12;
  const ready = frame >= waitAt + 6;
  const ry = (i: number) => laneY - c.h(96) + i * c.h(96) - 30;
  return (
    <>
      <Line at={startAt} x={BX} y={top - c.h(34)} size={20} color={INK_SOFT}>
        load over time
      </Line>
      <Svg opacity={ease(frame, startAt, 12)}>
        <polyline points={pts.join(" ")} fill="none" stroke={BAR} strokeWidth={3} strokeLinejoin="round" />
        <line x1={chart.x0} x2={chart.x1} y1={chart.top + chart.h} y2={chart.top + chart.h} stroke={INK_SOFT} strokeWidth={1.2} />
        <line x1={nowX} x2={nowX} y1={chart.top - 6} y2={chart.top + chart.h} stroke={INK} strokeWidth={2} />
        <circle cx={nowX} cy={chart.top + chart.h * (1 - loadAt(uNow))} r={7} fill={INK} />
      </Svg>
      {/* The queue in front, holding what the replicas can't take yet. */}
      <Svg opacity={ease(frame, startAt + 6, 12)}>
        {Array.from({ length: queued }, (_, k) => (
          <circle key={k} cx={replicaX - 64 - k * 16} cy={laneY} r={6} fill={BAR} />
        ))}
        <line x1={BX} x2={replicaX - 48} y1={laneY + 14} y2={laneY + 14} stroke={HAIRLINE} strokeWidth={1} />
      </Svg>
      <Line at={queueAt} x={BX} y={laneY + c.h(26)} size={21} color={INK_SOFT}>
        Request queue
      </Line>
      {[0, 1, 2].map((i) => {
        const isNew = i === 2;
        if (isNew && !spawned) return null;
        const warming = isNew && !ready;
        return (
          <React.Fragment key={i}>
            <Node
              x={replicaX}
              y={ry(i)}
              w={220}
              h={60}
              at={isNew ? warmAt - 12 : startAt + 4 + i * 4}
              icon={Server}
              title={warming ? "Warming Up" : `Replica ${i + 1}`}
              tone={warming ? "quiet" : "plain"}
              dashed={warming}
              size={21}
            />
            {warming ? null : (
              <Flow
                points={i === 1 ? [[replicaX - 40, laneY], [replicaX - 3, laneY]] : [[replicaX - 40, laneY], [replicaX - 40, ry(i) + 30], [replicaX - 3, ry(i) + 30]]}
                at={isNew ? waitAt + 6 : startAt + 8}
                color={BAR}
                head={11}
                width={2}
              />
            )}
          </React.Fragment>
        );
      })}
      <Line at={autoAt} x={BX} y={laneY + c.h(84)} size={22}>
        Autoscale replicas
        <span style={{ color: INK_SOFT, opacity: ease(frame, depthAt, 10) }}> on utilization or queue depth</span>
      </Line>
      <Line at={warmAt} x={BX} y={laneY + c.h(124)} size={22}>
        New replicas take time to warm up
      </Line>
      <Ink at={droppedAt} dur={14} style={{ left: BX, top: laneY + c.h(170), whiteSpace: "nowrap" }}>
        <span style={{ ...note(22, OK_INK), fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 10, fontSize: 22 }}>
          <Tick at={droppedAt + 6} size={24} color={OK} />
          The spike waits in the queue instead of being dropped
        </span>
      </Ink>
    </>
  );
};

/**
 * The quick round: six questions down the left, each answer on the right
 * while it is read.
 */
export const RapidScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: n.word, y, h };

  const from = n.beat("rapid-in").from;
  const sixAt = n.word("rapid-in", "Six more");
  // The last answer stays up until the cut into the close.
  const end = n.beat("close").from - 2;

  const items: RapidItem[] = [
    { n: 12, label: "Online and offline features", at: n.word("r-features", "Offline features are computed"), body: <Features c={c} /> },
    { n: 13, label: "Data validation", at: n.word("r-validate", "Data validation checks"), body: <Validate c={c} /> },
    { n: 14, label: "GPU or CPU", at: n.word("r-gpu", "GPUs win"), body: <GpuCpu c={c} /> },
    { n: 15, label: "Knowledge distillation", at: n.word("r-distill", "Knowledge distillation"), body: <Distill c={c} /> },
    { n: 16, label: "Cutting serving latency", at: n.word("r-latency", "To cut serving latency"), body: <Latency c={c} /> },
    { n: 17, label: "Scaling under variable load", at: n.word("r-scale", "under variable load"), body: <Scale c={c} /> },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-chime" at={sixAt} level={-32} />
      {items.map((it) => (
        <Sfx key={it.n} name="el-tap" at={it.at} level={-32} />
      ))}

      <Drift from={from} to={end + 30}>
        <Kicker at={sixAt - 6}>Quick round</Kicker>
        <Headline lead="Six more," turn="quickly" at={sixAt} turnAt={sixAt + 8} size={64} />
        <RapidFire items={items} x={X0} top={y(LIST_TOP)} rowH={h(ROW)} width={560} at={sixAt + 6} end={end} />
      </Drift>
    </AbsoluteFill>
  );
};
