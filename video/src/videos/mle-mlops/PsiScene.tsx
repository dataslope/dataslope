import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { I, M, MathRun } from "../../editorial/math";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, label, svgText } from "../../editorial/style";
import { ColumnRule, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { PSI, PSI_EDGES, PSI_NOISE } from "./data";
import { BadgeRow, BLOCK_SOFT, CornerLoop, LONG_Q, LONG_W, Drift, Flow, lerp, Line, Mark, OK, OK_INK, pct, Phase, Svg, X0, YELLOW_INK } from "./parts";

const RIGHT_X = 1000;
const RULE_X = 930;

/** Ten buckets of training share 0.1 each, against a window's shares. */
const Buckets: React.FC<{ x: number; y: number; w: number; h: number; trainAt: number; nowAt: number; shares: readonly number[] }> = ({ x, y, w, h, trainAt, nowAt, shares }) => {
  const frame = useCurrentFrame();
  const top = 0.6;
  const bw = w / 10;
  const Y = (v: number) => y + h - (v / top) * h;
  const tp = ease(frame, trainAt, 16);
  const np = ease(frame, nowAt, 16);
  return (
    <Svg opacity={ease(frame, trainAt - 6, 10)}>
      {shares.map((s, i) => {
        const bx = x + i * bw;
        const t = 0.1 * ease(frame, trainAt + i * 2, 12);
        const c = s * np;
        return (
          <React.Fragment key={i}>
            <rect x={bx + 6} y={Y(t)} width={bw / 2 - 8} height={y + h - Y(t)} rx={4} fill={BLOCK_SOFT} />
            {np > 0 ? <rect x={bx + bw / 2 + 2} y={Y(c)} width={bw / 2 - 8} height={y + h - Y(c)} rx={4} fill={BAR} /> : null}
          </React.Fragment>
        );
      })}
      <line x1={x} x2={x + w} y1={y + h} y2={y + h} stroke={INK_SOFT} strokeWidth={1.4} />
      <text x={x} y={y + h + 30} style={svgText(label(20, INK_SOFT))} opacity={tp}>
        ten buckets, each a tenth of training
      </text>
      <g opacity={tp}>
        <rect x={x + w - 330} y={y - 34} width={16} height={16} rx={3} fill={BLOCK_SOFT} />
        <text x={x + w - 306} y={y - 20} style={svgText(label(20, INK_SOFT))}>
          training
        </text>
      </g>
      <g opacity={np}>
        <rect x={x + w - 180} y={y - 34} width={16} height={16} rx={3} fill={BAR} />
        <text x={x + w - 156} y={y - 20} style={svgText(label(20, BLUE_INK))}>
          now
        </text>
      </g>
    </Svg>
  );
};

/**
 * Questions 9 and 10: PSI as a formula over ten training buckets, each term
 * lit as it is said; a slight shift and a large one (the page's own draws,
 * 0.01 and 1.4), and the two conventions on a scale. Then drift without
 * labels: PSI or a KS test on every input and on the predictions, a warning
 * and not proof, and the outcomes that are. Then two things the page's
 * conventions leave out: PSI's noise on small windows (46% false alarms at
 * 100 values, none at 1,000), and the outer buckets, which must stay open.
 */
export const PsiScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q9").from;
  const qAt = n.word("q9", "Questions nine and ten");
  const textAt = n.word("q9", "What is the population stability index");
  const comparesAt = n.word("q9-how", "PSI compares");
  const cutAt = n.word("q9-how", "Cut the training values");
  const addAt = n.word("q9-how", "add up, over the buckets");
  const diffAt = n.word("q9-how", "the difference in share");
  const logAt = n.word("q9-how", "the log of their ratio");
  const slightAt = n.word("q9-example", "a slight shift scores point oh one");
  const largeAt = n.word("q9-example", "a large one, one point four");
  const stableAt = n.word("q9-conv", "Under point one is called stable");
  const actionAt = n.word("q9-conv", "over point two five needs action");
  const convAt = n.word("q9-conv", "those are conventions");
  const lateAt = n.word("q9-labels", "With labels late");
  const ksAt = n.word("q9-labels", "PSI or a Kolmogorov-Smirnov test");
  const inputAt = n.word("q9-labels", "on each input");
  const predAt = n.word("q9-labels", "and on the predictions");
  const warnAt = n.word("q9-labels", "is your early warning");
  const movedAt = n.word("q9-labels", "It can show that something moved");
  const proveAt = n.word("q9-labels", "it can't prove the model got worse");
  const outcomesAt = n.word("q9-labels", "measure outcomes");
  const delayedAt = n.word("q9-labels", "delayed labels");
  const auditsAt = n.word("q9-labels", "audits");
  const sliceAt = n.word("q9-labels", "a small randomized slice");
  const calibAt = n.word("q9-noise", "Calibrate the threshold");
  const noisyAt = n.word("q9-noise", "PSI is noisy on small samples");
  const noDriftAt = n.word("q9-noise", "With no drift at all");
  const hundredAt = n.word("q9-noise", "a window of a hundred values");
  const halfAt = n.word("q9-noise", "almost half the time");
  const thousandAt = n.word("q9-noise", "A window of a thousand");
  const neverAt = n.word("q9-noise", "never, in two thousand tries");
  const openAt = n.word("q9-edges", "leave the outer buckets open");
  const edgesAt = n.word("q9-edges", "Edges cut at the training minimum and maximum");
  const dropAt = n.word("q9-edges", "drop anything beyond them");
  const fifthAt = n.word("q9-edges", "Simulate a fifth of values");
  const closedAt = n.word("q9-edges", "closed edges read point oh three");
  const stableEAt = n.word("q9-edges", "stable");
  const openReadAt = n.word("q9-open", "Open ones read point two five");
  const atLineAt = n.word("q9-open", "right at the line for action");
  const end = n.beat("q9-open").to;

  // ── A and B: the buckets and the formula ──
  const chart = { x: X0 + 10, top: y(420), w: 720, h: h(220) };
  // The window's shares: the large shift as the formula is read, then the
  // slight one and the large one as each is scored.
  const toSlight = ease(frame, slightAt - 2, 18);
  const toLarge = ease(frame, largeAt - 2, 18);
  const shares = PSI.driftedShares.map((d, i) => {
    const s = PSI.stableShares[i];
    return lerp(lerp(d, s, toSlight), d, toLarge);
  });
  // The pages' two conventions (below 0.1 stable, above 0.25 action, since
  // #746) on a scale to 0.4, so the action band reads as more than a sliver.
  const STABLE = 0.1;
  const ACTION = 0.25;
  const TOP = 0.4;
  const scale = { x: RIGHT_X + 20, w: 680, top: y(650) };
  const sx = (v: number) => scale.x + (v / TOP) * scale.w;

  // ── D: the noise ──
  const noise100 = PSI_NOISE.bySize["100"];
  const noise1000 = PSI_NOISE.bySize["1000"];
  const nb = { x: 420, w: 900 };

  // ── E: the edges, as dots of twenty values each ──
  const PER = PSI_EDGES.window / 50;
  const counts = PSI_EDGES.openShares.map((s) => Math.round((s * PSI_EDGES.window) / PER));
  const beyond = Math.round(PSI_EDGES.beyond / PER);
  const own = counts.map((c, i) => (i === 9 ? c - beyond : c));
  const ed = { x: X0 + 40, base: y(700), bw: 80 };
  const wallX = ed.x + 10 * ed.bw;
  const arrive = ease(frame, fifthAt, 24);
  const vanish = ease(frame, closedAt - 10, 16);
  const opened = ease(frame, openReadAt - 8, 20);
  const dot = (bucket: number, k: number) => [ed.x + bucket * ed.bw + 26 + (k % 2) * 26, ed.base - 12 - Math.floor(k / 2) * 24] as const;

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={cutAt + 6} level={-33} />
      <Sfx name="el-tap" at={addAt} level={-33} />
      <Sfx name="el-tap" at={diffAt} level={-33} />
      <Sfx name="el-tap" at={logAt} level={-33} />
      <Sfx name="el-whoosh" at={slightAt} level={-37} />
      <Sfx name="el-whoosh" at={largeAt} level={-37} />
      <Sfx name="el-pencil" at={stableAt} level={-35} />
      <Sfx name="el-tap" at={lateAt} level={-31} />
      <Sfx name="el-tap" at={outcomesAt} level={-30} />
      <Sfx name="el-tap" at={calibAt} level={-31} />
      <Sfx name="el-pop" at={hundredAt + 6} level={-32} />
      <Sfx name="el-tap" at={neverAt} level={-30} />
      <Sfx name="el-pencil" at={edgesAt} level={-35} />
      <Sfx name="el-sprinkle" at={fifthAt} level={-32} />
      <Sfx name="el-scratch" at={closedAt - 8} level={-35} />
      <Sfx name="el-whoosh" at={openReadAt - 8} level={-36} />
      <Sfx name="el-chime" at={end + 10} level={-33} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={9} kicker="Questions 9 and 10" at={qAt - 4} textAt={textAt - 4} size={LONG_Q} width={LONG_W}>
          What is the population stability index? And how do you detect drift when labels are delayed or unavailable?
        </QuestionCard>
        <CornerLoop at={qAt} lit="watch" />

        {/* ── A and B: what PSI adds up, and what it scores ── */}
        <Phase from={comparesAt - 4} to={lateAt - 6}>
          <Line at={comparesAt - 2} x={X0} y={y(330)} size={25} color={INK}>
            One feature: its distribution now, against training
          </Line>
          <Buckets x={chart.x} y={chart.top} w={chart.w} h={chart.h} trainAt={cutAt + 4} nowAt={diffAt - 4} shares={shares} />
          {/* The page's third dependency (bins, sample size, smoothing): a
              bucket the window leaves empty sends the log to infinity, which
              is why the page's compute_psi adds an eps to every count. */}
          <Line at={logAt + 12} x={chart.x} y={chart.top + chart.h + h(64)} size={21} color={INK_SOFT}>
            An empty bucket gets a tiny <M>ε</M>, or <M>ln 0</M> makes PSI infinite
          </Line>
          <ColumnRule x={RULE_X} top={y(410)} height={chart.h + h(70)} at={addAt} />
          <Line at={addAt - 4} x={RIGHT_X} y={y(410)} size={34} color={INK}>
            <MathRun>
              PSI ={" "}
              <Mark at={addAt} out={diffAt}>
                Σ
              </Mark>{" "}
              <Mark at={diffAt} out={logAt}>
                (<I>c</I> − <I>t</I>)
              </Mark>{" "}
              ×{" "}
              <Mark at={logAt} out={slightAt}>
                ln(<I>c</I> / <I>t</I>)
              </Mark>
            </MathRun>
          </Line>
          <Line at={addAt + 10} x={RIGHT_X} y={y(410) + h(64)} size={22} color={INK_SOFT}>
            over the ten buckets; <M>c</M> a bucket&apos;s share now, <M>t</M> in training
          </Line>

          {/* B: two windows scored, and the conventions. */}
          <Line at={slightAt - 2} x={RIGHT_X} y={y(520)} size={25} color={BLUE_INK}>
            Simulation: a slight shift, PSI <b><Num>{PSI.openStable.toFixed(2)}</Num></b>
          </Line>
          <Line at={largeAt - 2} x={RIGHT_X} y={y(520) + h(44)} size={25} color={BLUE_INK}>
            A large shift, PSI <b><Num>{PSI.openDrifted.toFixed(1)}</Num></b>
          </Line>
          <Svg opacity={ease(frame, stableAt - 4, 10)}>
            <line x1={scale.x} x2={scale.x + scale.w} y1={scale.top} y2={scale.top} stroke={INK_SOFT} strokeWidth={1.6} />
            {[0, STABLE, ACTION, TOP].map((v) => (
              <React.Fragment key={v}>
                <line x1={sx(v)} x2={sx(v)} y1={scale.top - 8} y2={scale.top + 8} stroke={INK_SOFT} strokeWidth={1.6} />
                <text x={sx(v)} y={scale.top + 34} textAnchor="middle" style={svgText(label(21, INK_SOFT))}>
                  {v === 0 ? "0" : String(v)}
                </text>
              </React.Fragment>
            ))}
            <rect x={sx(0)} y={scale.top - 5} width={(sx(STABLE) - sx(0)) * ease(frame, stableAt, 14)} height={10} rx={3} fill={BLOCK_SOFT} />
            <rect x={sx(ACTION)} y={scale.top - 5} width={(sx(TOP) - sx(ACTION)) * ease(frame, actionAt, 14)} height={10} rx={3} fill={ACCENT} opacity={0.75} />
          </Svg>
          <Line at={stableAt} x={(sx(0) + sx(STABLE)) / 2} width={220} align="center" y={scale.top - h(46)} size={21} color={INK}>
            stable
          </Line>
          <Line at={actionAt} x={(sx(ACTION) + sx(TOP)) / 2} width={220} align="center" y={scale.top - h(46)} size={21} color={ACCENT_INK}>
            needs action
          </Line>
          <Line at={convAt - 2} x={RIGHT_X} y={scale.top + h(64)} size={23} color={YELLOW_INK}>
            <Mark at={convAt + 4}>Conventions, not significance tests</Mark>
          </Line>
        </Phase>

        {/* ── C: drift without labels ── */}
        <Phase from={lateAt - 4} to={calibAt - 6}>
          <Line at={lateAt - 2} x={X0} y={y(330)} size={25} color={INK}>
            With labels late, test every input
          </Line>
          {["feature 1", "feature 2", "feature 3", "predictions"].map((f, i) => {
            const at = i < 3 ? inputAt + i * 4 : predAt;
            return (
              <React.Fragment key={f}>
                <Line at={at - 2} x={X0} y={y(400) + i * h(60)} size={24} color={i < 3 ? BLUE_INK : INK}>
                  {f}
                </Line>
                <BadgeRow
                  x={X0 + 210}
                  y={y(400) + i * h(60) - 5}
                  size={22}
                  gap={10}
                  items={[
                    { text: "PSI", at: at + 2, tone: "blue" },
                    { text: "KS test", at: at + 6, tone: "blue" },
                  ]}
                />
              </React.Fragment>
            );
          })}
          <Line at={ksAt + 10} x={X0} y={y(400) + 4 * h(60) + h(10)} size={21} color={INK_SOFT}>
            KS: the Kolmogorov-Smirnov test
          </Line>
          <ColumnRule x={RULE_X - 120} top={y(330)} height={4 * h(60) + h(110)} at={warnAt} />
          <Line at={warnAt - 2} x={RIGHT_X - 120} y={y(330)} size={26} color={INK}>
            An early warning
          </Line>
          <Line at={movedAt - 2} x={RIGHT_X - 120} y={y(400)} size={25} color={INK}>
            It shows that something moved
          </Line>
          <Line at={proveAt - 2} x={RIGHT_X - 120} y={y(400) + h(46)} size={25} color={INK}>
            <Mark at={proveAt + 4}>A warning, not proof the model got worse</Mark>
          </Line>
          <Line at={outcomesAt - 2} x={RIGHT_X - 120} y={y(540)} size={26} color={OK_INK}>
            For proof, measure outcomes:
          </Line>
          <BadgeRow
            x={RIGHT_X - 120}
            y={y(540) + h(54)}
            size={23}
            gap={14}
            items={[
              { text: "delayed labels", at: delayedAt - 2, tone: "green" },
              { text: "audits", at: auditsAt - 2, tone: "green" },
              { text: "a small randomized slice", at: sliceAt - 2, tone: "green" },
            ]}
          />
        </Phase>

        {/* ── D: the noise on small windows ── */}
        <Phase from={calibAt - 4} to={openAt - 6}>
          <Line at={calibAt - 2} x={X0} y={y(330)} size={26} color={INK}>
            Calibrate the threshold to your traffic<span style={{ opacity: ease(frame, noisyAt - 2, 10) }}>: PSI is noisy on small samples</span>
          </Line>
          <Line at={noDriftAt - 2} x={X0} y={y(390)} size={22} color={INK_SOFT}>
            Simulation: no drift at all, a reference of <Num>{PSI_NOISE.reference.toLocaleString("en-US")}</Num> values,{" "}
            <Num>{PSI_NOISE.tries.toLocaleString("en-US")}</Num> tries per window
          </Line>
          <Line at={noDriftAt + 6} x={nb.x} y={y(460)} size={21} color={INK_SOFT}>
            share of tries scoring over <Num>0.1</Num>
          </Line>
          {[
            { name: "window of 100", v: noise100.over01, at: hundredAt, color: ACCENT, ink: ACCENT_INK, text: `${pct(noise100.over01)}: false alarms`, sub: `median PSI ${noise100.median.toFixed(2)}` },
            { name: "window of 1,000", v: noise1000.over01, at: thousandAt, color: OK, ink: OK_INK, text: `0 of ${PSI_NOISE.tries.toLocaleString("en-US")}`, sub: `largest PSI ${noise1000.max.toFixed(2)}` },
          ].map((r, i) => {
            const top = y(510) + i * h(90);
            const p = ease(frame, r.at + 4, 18);
            return (
              <React.Fragment key={r.name}>
                <Line at={r.at - 2} x={nb.x - 24} width={300} align="right" y={top + 2} size={24} color={INK}>
                  {r.name}
                </Line>
                <div style={{ position: "absolute", left: nb.x, top, width: nb.w * r.v * p, height: 36, background: r.color, borderRadius: 4, opacity: ease(frame, r.at, 8) }} />
                <Line at={i === 0 ? halfAt - 2 : neverAt - 2} x={nb.x + nb.w * r.v + 18} y={top + 2} size={24} color={r.ink}>
                  {r.text}
                </Line>
                <Line at={(i === 0 ? halfAt : neverAt) + 10} x={nb.x + nb.w * r.v + 18 + (i === 0 ? 260 : 170)} y={top + 4} size={21} color={INK_SOFT}>
                  {r.sub}
                </Line>
              </React.Fragment>
            );
          })}
          <Svg opacity={ease(frame, hundredAt, 10)}>
            <line x1={nb.x} x2={nb.x} y1={y(500)} y2={y(510) + h(90) + 46} stroke={INK_SOFT} strokeWidth={1.4} />
            <line x1={nb.x + nb.w} x2={nb.x + nb.w} y1={y(500)} y2={y(510) + h(90) + 46} stroke={INK_SOFT} strokeWidth={1.4} strokeDasharray="3 5" />
          </Svg>
          <Line at={hundredAt} x={nb.x + nb.w} width={120} align="center" y={y(510) + h(90) + 54} size={21} color={INK_SOFT}>
            100%
          </Line>
          <Line at={hundredAt} x={nb.x} width={80} align="center" y={y(510) + h(90) + 54} size={21} color={INK_SOFT}>
            0
          </Line>
        </Phase>

        {/* ── E: the outer buckets ── */}
        <Phase from={openAt - 4}>
          <Line at={openAt - 2} x={X0} y={y(330)} size={26} color={INK}>
            Leave the outer buckets open
          </Line>
          <Line at={fifthAt - 2} x={X0} y={y(380)} size={22} color={INK_SOFT}>
            Simulation: a window of <Num>{PSI_EDGES.window.toLocaleString("en-US")}</Num>, a fifth beyond the training maximum; each dot is{" "}
            <Num>{PER}</Num> values
          </Line>
          <Svg opacity={ease(frame, edgesAt - 6, 10)}>
            <line x1={ed.x} x2={wallX + 300 * opened} y1={ed.base + 4} y2={ed.base + 4} stroke={INK_SOFT} strokeWidth={1.4} />
            {Array.from({ length: 11 }, (_, i) => (
              <line key={i} x1={ed.x + i * ed.bw} x2={ed.x + i * ed.bw} y1={ed.base - 4} y2={ed.base + 12} stroke={INK_SOFT} strokeWidth={1.4} />
            ))}
            {/* The edge at the training maximum: a wall, until it opens. */}
            <line x1={wallX} x2={wallX} y1={ed.base + 4} y2={ed.base - h(200)} stroke={ACCENT} strokeWidth={4} strokeLinecap="round" opacity={1 - opened} />
            {own.map((c, b) =>
              Array.from({ length: c }, (_, k) => {
                const [cx, cy] = dot(b, k);
                const p = ease(frame, edgesAt + b * 2 + k, 10);
                return <circle key={`${b}-${k}`} cx={cx} cy={cy - (1 - p) * 30} r={9} fill={BAR} opacity={p} />;
              }),
            )}
            {/* The fifth beyond it: dropped by closed edges, counted by open ones. */}
            {Array.from({ length: beyond }, (_, k) => {
              const [lx, ly] = dot(9, own[9] + k);
              const bx = wallX + 60 + (k % 2) * 26;
              const by = ed.base - 12 - Math.floor(k / 2) * 24;
              const cx = lerp(lerp(wallX + 360, bx, arrive), lx, opened);
              const cy = lerp(by, ly, opened);
              const o = arrive * (1 - vanish * (1 - opened));
              const fill = BAR;
              return <circle key={`b${k}`} cx={cx} cy={cy} r={9} fill={fill} opacity={Math.max(o, opened)} />;
            })}
          </Svg>
          <Line at={edgesAt + 4} x={wallX} width={260} align="center" y={ed.base - h(200) - 38} size={21} color={ACCENT_INK}>
            <span style={{ opacity: 1 - opened }}>training maximum</span>
          </Line>
          <Flow points={[[wallX - 2, ed.base + 34], [wallX + 300, ed.base + 34]]} at={openReadAt - 8} dur={18} color={OK} head={14} />
          <Line at={openReadAt} x={wallX + 312} y={ed.base + 14} size={28} color={OK_INK}>
            <M>∞</M>
          </Line>
          <Line at={dropAt - 2} x={wallX + 40} y={ed.base + h(30)} size={21} color={INK_SOFT}>
            <span style={{ opacity: 1 - opened }}>beyond it: not counted</span>
          </Line>
          <Line at={closedAt - 2} x={1390} y={y(500)} size={26} color={ACCENT_INK}>
            Closed edges: <b><Num>{PSI_EDGES.closed.toFixed(2)}</Num></b>
            <span style={{ opacity: ease(frame, stableEAt, 10) }}>, &ldquo;stable&rdquo;</span>
          </Line>
          <Line at={openReadAt - 2} x={1390} y={y(500) + h(50)} size={26} color={OK_INK}>
            Open edges: <b><Num>{PSI_EDGES.open.toFixed(2)}</Num></b>
          </Line>
          <Line at={atLineAt - 2} x={1390} y={y(500) + h(96)} size={23} color={INK}>
            right at the action line, <Num>{ACTION}</Num>
          </Line>
        </Phase>
      </Drift>
    </AbsoluteFill>
  );
};

