import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, label, note, svgText } from "../../editorial/style";
import { ColumnRule, Ink, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { BATCHING } from "./data";
import { clamp01, commas, Drift, Fade, Line, Mark, MiniMap, OK, OK_INK, Q_W, QueueLane, seeded, Svg, X0 } from "./parts";

const B = BATCHING;
const C = B.chart;
/** The chart's frame: batch size on a log axis, each curve a multiple of batch 1. */
const CH = { x0: 220, x1: 1160, top: 360, bottom: 800, max: 14 };
const GRID = { x: 1480, cols: 8, rows: 4, cell: 30, gap: 7 };
/** The two simulation panels. */
const LEFT = { x: X0, right: 690 };
const RIGHTP = { x: 1010, right: 1590 };

/** A latency histogram's shape: a lognormal, drawn, with its 95th and 99th
 *  percentiles where a lognormal puts them. */
const MU = 0;
const SIGMA = 0.55;
const lognormal = (v: number) => (v <= 0 ? 0 : Math.exp(-((Math.log(v) - MU) ** 2) / (2 * SIGMA * SIGMA)) / (v * SIGMA * Math.sqrt(2 * Math.PI)));
const P95 = Math.exp(MU + 1.6449 * SIGMA);
const P99 = Math.exp(MU + 2.3263 * SIGMA);
const BINS = 36;
const VMAX = 4.2;

/**
 * Questions 5 and 6. Latency is one request's time, judged at the tail;
 * throughput is requests a second across the system. Then batching on the
 * page's cost model (a fixed 2.8 ms a pass plus 0.31 ms a request): batch 32
 * gets 7.8 times batch 1's throughput for 4.1 times the latency per pass,
 * and past that throughput flattens while latency climbs. Then one GPU,
 * simulated at 1,000 requests a second: one at a time, the queue grows by
 * 680 a second; taking what has queued, up to 32, it keeps up. At low load a
 * 5 ms wait to fill a batch is pure latency; and replicas add throughput.
 */
export const ServingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q5").from;
  const qAt = n.word("q5", "Questions five and six");
  const textAt = n.word("q5", "What is throughput versus latency");
  const q6At = n.word("q5", "and how does request batching");
  const latencyAt = n.word("q5", "Latency is one request's time");
  const tailAt = n.word("q5", "judged at the tail");
  const p95At = n.word("q5", "the ninety-fifth");
  const p99At = n.word("q5", "ninety-ninth percentile");
  const throughputAt = n.word("q5", "Throughput is requests per second");
  const systemAt = n.word("q5", "across the system");
  const idleAt = n.word("q5-gpu", "leaves most of a GPU idle");
  const fixedAt = n.word("q5-gpu", "every pass has a fixed cost");
  const modelAt = n.word("q5-gpu", "In a simple cost model");
  const perReqAt = n.word("q5-gpu", "a little per request");
  const kneeAt = n.word("q5-gpu", "a batch of thirty-two");
  const eightAt = n.word("q5-gpu", "about eight times the throughput");
  const fourAt = n.word("q5-gpu", "four times the latency per pass");
  const pastAt = n.word("q5-gpu", "Past that");
  const climbAt = n.word("q5-gpu", "latency keeps climbing");
  const simAt = n.word("q5-sim", "Simulate one GPU");
  const oneAt = n.word("q5-sim", "One at a time");
  const capAt = n.word("q5-sim", "three hundred and twenty a second");
  const growsAt = n.word("q5-sim", "the line grows");
  const queuedAt = n.word("q5-sim", "Taking whatever has queued");
  const keepsAt = n.word("q5-sim", "it keeps up");
  const p99SimAt = n.word("q5-sim", "ninety-nine percent finish");
  const waitAt = n.word("q5-wait", "Serving frameworks also wait");
  const lightAt = n.word("q5-wait", "At a hundred requests a second");
  const threeAt = n.word("q5-wait", "from three milliseconds");
  const toEightAt = n.word("q5-wait", "to eight");
  const pureAt = n.word("q5-wait", "waiting is pure latency");
  const capItAt = n.word("q5-wait", "so cap it");
  const replicasAt = n.word("q5-wait", "add replicas");
  const slowerAt = n.word("q5-wait", "no replica gets slower");
  const end = n.beat("q5-wait").to;

  // ── The chart's scales ──
  const xs = (b: number) => CH.x0 + (Math.log2(b) / 7) * (CH.x1 - CH.x0);
  const ys = (v: number) => y(CH.bottom) - (v / CH.max) * (y(CH.bottom) - y(CH.top));
  const kneeX = xs(32);
  // How far along the batch axis each curve has drawn: to 32 on "thirty-two",
  // then on to 128 on "Past that".
  const reach = 1 + 4 * ease(frame, kneeAt, 30) + 2 * ease(frame, pastAt, 30);
  const curvePath = (key: "throughputX" | "latencyX") => {
    const pts: string[] = [];
    for (let i = 0; i < C.curve.length; i++) {
      const p = C.curve[i];
      const lb = Math.log2(p.b);
      if (lb > reach) {
        const prev = C.curve[i - 1];
        const f = (reach - Math.log2(prev.b)) / (lb - Math.log2(prev.b));
        const v = prev[key] + (p[key] - prev[key]) * f;
        pts.push(`L${CH.x0 + (reach / 7) * (CH.x1 - CH.x0)},${ys(v)}`);
        break;
      }
      pts.push(`${i ? "L" : "M"}${xs(p.b)},${ys(p[key])}`);
    }
    return pts.join(" ");
  };
  const knee = C.curve.find((p) => p.b === 32)!;
  const big = C.curve[C.curve.length - 1];
  const coresLit = Math.round(1 + 31 * ease(frame, kneeAt, 24));
  const gridOn = ease(frame, idleAt, 12);

  // ── The latency histogram ──
  const binW = 740 / BINS;
  const peak = lognormal(Math.exp(MU - SIGMA * SIGMA));
  const histBottom = y(640);
  const histH = h(200);

  // ── Throughput: requests crossing a line ──
  const flow = seeded(5);
  const streams = Array.from({ length: 24 }, (_, i) => ({ lane: i % 3, phase: flow() * 90, speed: 4.2 + flow() * 1.2, k: i }));

  const replicas = ease(frame, replicasAt, 18);
  const heavyRight = RIGHTP.right;

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={latencyAt} level={-31} />
      <Sfx name="el-pencil" at={tailAt} level={-35} />
      <Sfx name="el-tap" at={throughputAt} level={-31} />
      <Sfx name="el-tap" at={idleAt} level={-31} />
      <Sfx name="el-tap" at={modelAt} level={-31} />
      <Sfx name="el-sprinkle" at={kneeAt} level={-32} />
      <Sfx name="el-pencil" at={kneeAt + 4} level={-36} />
      <Sfx name="el-tap" at={eightAt} level={-30} />
      <Sfx name="el-tap" at={fourAt} level={-30} />
      <Sfx name="el-pencil" at={pastAt} level={-36} />
      <Sfx name="el-whoosh" at={simAt} level={-36} />
      <Sfx name="el-scratch" at={growsAt} level={-33} />
      <Sfx name="el-tap" at={keepsAt} level={-30} />
      <Sfx name="el-chime" at={p99SimAt + 24} level={-33} />
      <Sfx name="el-tap" at={threeAt} level={-31} />
      <Sfx name="el-tap" at={toEightAt} level={-30} />
      <Sfx name="el-tap" at={capItAt} level={-31} />
      <Sfx name="el-whoosh" at={replicasAt} level={-35} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={5} kicker="Questions 5 and 6" at={qAt - 4} textAt={textAt - 4} size={48} width={Q_W}>
          What is throughput vs latency in model serving,{" "}
          <span style={{ opacity: ease(frame, q6At, 14) }}>and how does request batching improve GPU throughput?</span>
        </QuestionCard>
        <MiniMap at={qAt} store lit={[["model", qAt + 10]]} />

        {/* ── The two definitions ── */}
        <Fade out={idleAt - 4}>
          <Line at={latencyAt} x={X0} y={y(330)} size={26}>
            Latency
          </Line>
          <Line at={latencyAt + 6} x={X0} y={y(330) + h(44)} size={22} color={INK_SOFT}>
            One request&apos;s time, judged at the tail
          </Line>
          <Svg opacity={ease(frame, latencyAt + 8, 14)}>
            {Array.from({ length: BINS }, (_, i) => {
              const v = ((i + 0.5) / BINS) * VMAX;
              const hh = (lognormal(v) / peak) * histH * ease(frame, latencyAt + 8 + i * 0.6, 12);
              const tail = v > P95 ? ease(frame, tailAt, 14) : 0;
              return (
                <rect
                  key={i}
                  x={X0 + i * binW + 1}
                  y={histBottom - hh}
                  width={binW - 3}
                  height={hh}
                  rx={2}
                  fill={`color-mix(in srgb, ${ds("yellow", 500)} ${tail * 100}%, ${ds("blue", 300)})`}
                />
              );
            })}
            {[
              { v: P95, at: p95At, t: "p95" },
              { v: P99, at: p99At, t: "p99" },
            ].map((m) => {
              const p = ease(frame, m.at, 12);
              const xx = X0 + (m.v / VMAX) * 740;
              return (
                <g key={m.t} opacity={p}>
                  <line x1={xx} x2={xx} y1={histBottom - histH * 0.62} y2={histBottom + 4} stroke={INK} strokeWidth={2} strokeDasharray="5 4" />
                  <text x={xx} y={histBottom - histH * 0.62 - 12} textAnchor="middle" style={svgText({ ...label(21, INK), fontWeight: 500 })}>
                    {m.t}
                  </text>
                </g>
              );
            })}
            <line x1={X0} x2={X0 + 740} y1={histBottom} y2={histBottom} stroke={INK_SOFT} strokeWidth={1.5} />
          </Svg>
          <Line at={latencyAt + 12} x={X0} y={histBottom + h(14)} size={20} color={INK_SOFT}>
            latency of each request
          </Line>

          <ColumnRule x={935} top={y(330)} height={histBottom + h(44) - y(330)} at={throughputAt} />
          <Line at={throughputAt} x={1010} y={y(330)} size={26}>
            Throughput
          </Line>
          <Line at={throughputAt + 6} x={1010} y={y(330) + h(44)} size={22} color={INK_SOFT}>
            Requests per second, across the system
          </Line>
          <Svg opacity={ease(frame, systemAt, 14)}>
            {streams.map((s) => {
              const span = 760;
              const pos = ((frame - systemAt) * s.speed + s.phase * 8 + s.k * 33) % span;
              const xx = 1010 + pos;
              const yy = y(500) + s.lane * h(44);
              const edge = Math.min(clamp01(pos / 40), clamp01((span - pos) / 40));
              return <circle key={s.k} cx={xx} cy={yy} r={7} fill={BAR} opacity={edge} />;
            })}
            <line x1={1390} x2={1390} y1={y(470)} y2={y(470) + h(150)} stroke={INK} strokeWidth={2.4} />
          </Svg>
          <Line at={systemAt + 8} x={1390} y={y(470) + h(166)} size={20} color={INK_SOFT} align="center" width={320}>
            counted as they finish
          </Line>
        </Fade>

        {/* ── Batching on the cost model ── */}
        <Fade at={idleAt} out={simAt - 4}>
          <Line at={idleAt} x={GRID.x} y={y(330)} size={22}>
            One GPU, one pass
          </Line>
          {Array.from({ length: GRID.cols * GRID.rows }, (_, i) => {
            const col = i % GRID.cols;
            const row = Math.floor(i / GRID.cols);
            const on = i < coresLit;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: GRID.x + col * (GRID.cell + GRID.gap),
                  top: y(380) + row * (GRID.cell + GRID.gap),
                  width: GRID.cell,
                  height: GRID.cell,
                  borderRadius: 4,
                  background: on ? BAR : ds("gray", 200),
                  opacity: gridOn,
                }}
              />
            );
          })}
          <Line at={idleAt + 6} x={GRID.x} y={y(380) + 4 * (GRID.cell + GRID.gap) + h(10)} size={21} color={INK_SOFT}>
            {coresLit < 32 ? (
              <>
                batch of <Num>1</Num>: mostly idle
              </>
            ) : (
              <>
                batch of <Num>32</Num>: busy
              </>
            )}
          </Line>
          <Line at={modelAt} x={GRID.x} y={y(600)} size={22}>
            A simple cost model
          </Line>
          <Line at={fixedAt + 4} x={GRID.x} y={y(600) + h(40)} size={22} color={BLUE_INK}>
            <Num>{B.model.passMs.toFixed(1)}</Num> ms a pass
          </Line>
          <Line at={perReqAt} x={GRID.x} y={y(600) + h(76)} size={22} color={BLUE_INK}>
            + <Num>{B.model.perRequestMs.toFixed(2)}</Num> ms a request
          </Line>

          <Line at={modelAt} x={CH.x0} y={y(330) - h(6)} size={22}>
            Each as a multiple of batch <Num>1</Num>
          </Line>
          <Svg opacity={ease(frame, modelAt, 14)}>
            {[0, 5, 10].map((v) => (
              <g key={v}>
                <line x1={CH.x0} x2={CH.x1} y1={ys(v)} y2={ys(v)} stroke={HAIRLINE} strokeWidth={1} opacity={0.5} />
                <text x={CH.x0 - 14} y={ys(v) + 7} textAnchor="end" style={svgText({ ...label(20, INK_SOFT) })}>
                  {v}×
                </text>
              </g>
            ))}
            {C.curve.map((p) => (
              <text key={p.b} x={xs(p.b)} y={y(CH.bottom) + 30} textAnchor="middle" style={svgText({ ...label(20, INK_SOFT) })}>
                {p.b}
              </text>
            ))}
            {/* Past the knee: the flattening and the climb. */}
            <rect x={kneeX} y={ys(CH.max)} width={(CH.x1 - kneeX) * ease(frame, pastAt, 16)} height={ys(0) - ys(CH.max)} fill={HIGHLIGHT} opacity={0.45} />
            <path d={curvePath("throughputX")} fill="none" stroke={BAR} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
            <path d={curvePath("latencyX")} fill="none" stroke={INK} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
            {[
              { v: knee.throughputX, c: BAR, at: eightAt },
              { v: knee.latencyX, c: INK, at: fourAt },
            ].map((k, i) => (
              <circle key={i} cx={kneeX} cy={ys(k.v)} r={8 * ease(frame, k.at, 10)} fill={k.c} />
            ))}
          </Svg>
          <Line at={modelAt + 8} x={(CH.x0 + CH.x1) / 2} y={y(CH.bottom) + h(48)} size={20} color={INK_SOFT} align="center" width={300}>
            batch size
          </Line>
          <Ink at={eightAt} dur={12} style={{ left: kneeX - 250, top: ys(knee.throughputX) - 58, width: 236, textAlign: "right", whiteSpace: "nowrap" }}>
            <span style={{ ...note(22, BLUE_INK), fontWeight: 500 }}>
              <Num>{C.kneeThroughputX.toFixed(1)}</Num>× throughput
            </span>
          </Ink>
          <Ink at={fourAt} dur={12} style={{ left: kneeX + 18, top: ys(knee.latencyX) + 6, whiteSpace: "nowrap" }}>
            <span style={{ ...note(22, INK), fontWeight: 500 }}>
              <Num>{C.kneeLatencyX.toFixed(1)}</Num>× latency per pass
            </span>
          </Ink>
          <Ink at={pastAt + 20} dur={12} style={{ left: CH.x1 + 16, top: ys(big.throughputX) - 16, whiteSpace: "nowrap" }}>
            <span style={{ ...note(21, BLUE_INK), fontWeight: 500 }}>throughput flattens</span>
          </Ink>
          <Ink at={climbAt} dur={12} style={{ left: CH.x1 + 16, top: ys(big.latencyX) - 16, whiteSpace: "nowrap" }}>
            <span style={{ ...note(21, INK), fontWeight: 500 }}>latency climbs</span>
          </Ink>
        </Fade>

        {/* ── One GPU, simulated at 1,000 requests a second ── */}
        <Fade at={simAt} out={end + 60}>
          <Line at={simAt} x={X0} y={y(318)} size={21} color={INK_SOFT} out={waitAt - 4}>
            Simulation: one GPU on that cost model, <Num>{commas(B.heavy.rate)}</Num> requests a second, random arrivals
          </Line>
          <ColumnRule x={950} top={y(406)} height={h(470)} at={queuedAt} />
        </Fade>
        <Fade at={oneAt} out={waitAt - 4}>
          <Line at={oneAt} x={LEFT.x} y={y(410)} size={26}>
            One at a time
          </Line>
          <QueueLane x={LEFT.x} right={LEFT.right} mid={y(550)} start={oneAt} at={oneAt} maxBatch={1} seed={11} />
          <Line at={capAt} x={LEFT.x} y={y(670)} size={22}>
            Capacity: <Num>{Math.round(B.capacityOne)}</Num> a second
          </Line>
          <Line at={growsAt} x={LEFT.x} y={y(670) + h(42)} size={22} color={ACCENT_INK}>
            +<Num>{Math.round(B.heavy.backlogGrowth)}</Num> waiting every second
          </Line>
        </Fade>
        <Fade at={queuedAt}>
          <Line at={queuedAt} x={RIGHTP.x} y={y(410)} size={26}>
            Batches of up to <Num>{B.heavy.batched.maxBatch}</Num>
          </Line>
          <Fade out={replicasAt}>
            <QueueLane x={RIGHTP.x} right={heavyRight} mid={y(550)} start={oneAt} at={queuedAt} maxBatch={32} seed={11} />
          </Fade>
          <Line at={queuedAt + 8} x={RIGHTP.x} y={y(670)} size={22} out={replicasAt - 6}>
            Whatever has queued, in one pass
          </Line>
          <Ink at={p99SimAt} dur={12} out={replicasAt - 6} style={{ left: RIGHTP.x, top: y(670) + h(42), whiteSpace: "nowrap" }}>
            <span style={{ ...note(22, OK_INK), fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 10, fontSize: 22 }}>
              <Tick at={p99SimAt + 4} size={24} color={OK} />
              <span>
                <Num>99</Num>% finish within <Num>{Math.round(B.heavy.batched.p99)}</Num> ms
              </span>
            </span>
          </Ink>
          {/* Once one GPU's batches are full: replicas, each its own queue. */}
          {[0, 1, 2].map((i) => (
            <Fade key={i} at={replicasAt + i * 6} dur={14}>
              <QueueLane
                x={RIGHTP.x + 280}
                right={heavyRight}
                mid={y(496) + i * h(108) + (1 - replicas) * 20}
                start={replicasAt - 200 + i * 37}
                at={replicasAt + i * 6}
                maxBatch={32}
                seed={23 + i * 7}
                gap={1.5}
                label={`GPU ${i + 1}`}
              />
            </Fade>
          ))}
          <Ink at={slowerAt} dur={12} style={{ left: RIGHTP.x, top: y(496) + 2 * h(108) + h(70), whiteSpace: "nowrap" }}>
            <span style={{ ...note(22, OK_INK), fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 10, fontSize: 22 }}>
              <Tick at={slowerAt + 4} size={24} color={OK} />
              More throughput, and no replica gets slower
            </span>
          </Ink>
        </Fade>

        {/* ── At low load, a wait to fill a batch is pure latency ── */}
        <Fade at={waitAt}>
          <Line at={waitAt} x={LEFT.x} y={y(410)} size={26}>
            Wait to fill a batch
          </Line>
          <Line at={lightAt} x={LEFT.x} y={y(410) + h(46)} size={22} color={INK_SOFT}>
            At <Num>{B.light.rate}</Num> requests a second, the median request
          </Line>
          {[
            { k: "no wait", v: B.light.batched.p50, at: threeAt, c: ds("blue", 300), mark: false },
            { k: "5 ms wait", v: B.light.batchedWait.p50, at: toEightAt, c: ds("yellow", 500), mark: true },
          ].map((r, i) => {
            const p = ease(frame, r.at, 16);
            if (p <= 0) return null;
            const top = y(550) + i * h(64);
            return (
              <React.Fragment key={r.k}>
                <div style={{ position: "absolute", left: LEFT.x, top, width: 130, ...label(22, INK), fontWeight: 500, opacity: Math.min(1, p * 2) }}>{r.k}</div>
                <div style={{ position: "absolute", left: LEFT.x + 140, top: top + 1, width: r.v * 52 * p, height: 30, background: r.c, borderRadius: 4 }} />
                <div style={{ position: "absolute", left: LEFT.x + 140 + r.v * 52 * p + 14, top, ...note(22, INK), fontWeight: 500, whiteSpace: "nowrap", opacity: p }}>
                  {r.mark ? (
                    <Mark at={r.at + 10}>
                      <Num>{Math.round(r.v)}</Num> ms
                    </Mark>
                  ) : (
                    <>
                      <Num>{Math.round(r.v)}</Num> ms
                    </>
                  )}
                </div>
              </React.Fragment>
            );
          })}
          <Line at={pureAt} x={LEFT.x} y={y(712)} size={22}>
            At low load, waiting is pure latency
          </Line>
          <Ink at={capItAt} dur={12} style={{ left: LEFT.x, top: y(712) + h(42), whiteSpace: "nowrap" }}>
            <span style={{ ...note(22, OK_INK), fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 10, fontSize: 22 }}>
              <Tick at={capItAt + 4} size={24} color={OK} />
              Cap the wait
            </span>
          </Ink>
        </Fade>
      </Drift>
    </AbsoluteFill>
  );
};
