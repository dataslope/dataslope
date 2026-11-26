import { Activity, Database } from "lucide-react";
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, INK, INK_SOFT, label, note } from "../../editorial/style";
import { ColumnRule, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Flow, Line, Mark, MARK_OK, MiniMap, Node, OK, OK_INK, Q_SIZE, Q_W, seeded, Spot, Svg, Tag, X0 } from "./parts";

const STORE = { x: X0, w: 290 };
const MODEL = { x: 560, w: 340 };
const DECIDE = { x: 1120, w: 300 };
/** The labels timeline: transactions over the past weeks, frauds whose
 *  chargebacks land weeks later, and the cut-off for training. */
const TL = { x0: 140, x1: 1060, cut: 830 };
const FRAUDS = [
  { x: 230, back: 480 },
  { x: 420, back: 680 },
  { x: 640, back: 900 },
];
const FRESH = 985;

/**
 * Question 9, a fraud detection system sketched: the features, velocity lit
 * (the card spot beside it); gradient boosting or a network over the card's
 * history, online at authorization in under 100 ms, the velocity counts from
 * the online store, and a threshold set by what each error costs. Then the
 * labels: chargebacks land weeks late, so training stops where labels are
 * complete, or a fraud with no chargeback yet is learned as honest. Then what
 * to watch: precision and recall as labels arrive, drift before they do.
 */
export const FraudScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q9").from;
  const qAt = n.word("q9", "Question nine");
  const textAt = n.word("q9", "Sketch a fraud detection ML system");
  const featuresAt = n.word("q9", "Features first");
  const amountAt = n.word("q9", "the amount");
  const merchantAt = n.word("q9", "the merchant category");
  const sinceAt = n.word("q9", "time since the last transaction");
  const deviceAt = n.word("q9", "device and location");
  const velocityAt = n.word("q9", "and velocity");
  const hourAt = n.word("q9", "in the last hour");
  const boostAt = n.word("q9-serve", "The model is gradient boosting");
  const nnAt = n.word("q9-serve", "a neural network over the card's history");
  const onlineAt = n.word("q9-serve", "It runs online, at authorization");
  const msAt = n.word("q9-serve", "in under a hundred milliseconds");
  const storeAt = n.word("q9-serve", "come from the online store");
  const thresholdAt = n.word("q9-serve", "Its threshold is set by cost");
  const missedAt = n.word("q9-serve", "a missed fraud");
  const labelsAt = n.word("q9-labels", "Labels are chargebacks");
  const lateAt = n.word("q9-labels", "they arrive late");
  const trainAt = n.word("q9-labels", "train only on transactions old enough");
  const honestAt = n.word("q9-labels", "fresh fraud is learned as honest");
  const monitorAt = n.word("q9-watch", "monitor precision and recall");
  const driftAt = n.word("q9-watch", "drift in the velocity features");
  const end = n.beat("q9-watch").to;

  const chips = [
    { t: "amount", at: amountAt },
    { t: "merchant category", at: merchantAt },
    { t: "time since last", at: sinceAt },
    { t: "device and location", at: deviceAt },
    { t: "velocity: 1 h, 24 h", at: velocityAt, lit: true },
  ];
  const chipY = y(372);
  const mid = y(520);
  const axis = y(840);
  const dots = React.useMemo(() => {
    const u = seeded(19);
    return Array.from({ length: 30 }, (_, i) => TL.x0 + 30 + i * 30 + (u() - 0.5) * 12).filter(
      (x) => FRAUDS.every((f) => Math.abs(f.x - x) > 14) && Math.abs(FRESH - x) > 14,
    );
  }, []);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={amountAt} level={-32} />
      <Sfx name="el-tap" at={merchantAt} level={-32} />
      <Sfx name="el-tap" at={sinceAt} level={-32} />
      <Sfx name="el-tap" at={deviceAt} level={-32} />
      <Sfx name="el-tap" at={velocityAt} level={-31} />
      <Sfx name="el-pop" at={velocityAt + 4} level={-30} />
      <Sfx name="el-tap" at={boostAt} level={-31} />
      <Sfx name="el-whoosh" at={onlineAt} level={-36} />
      <Sfx name="el-pencil" at={storeAt} level={-35} />
      <Sfx name="el-tap" at={thresholdAt} level={-31} />
      <Sfx name="el-sprinkle" at={labelsAt} level={-33} />
      <Sfx name="el-pencil" at={lateAt} level={-35} />
      <Sfx name="el-tap" at={trainAt} level={-31} />
      <Sfx name="el-scratch" at={honestAt} level={-33} />
      <Sfx name="el-tap" at={monitorAt} level={-31} />
      <Sfx name="el-tap" at={driftAt} level={-31} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={9} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE} width={Q_W}>
          Sketch a fraud detection ML system.
        </QuestionCard>
        <MiniMap
          at={qAt}
          store
          lit={[
            ["features", featuresAt],
            ["model", boostAt],
            ["labels", labelsAt],
            ["prediction", monitorAt],
          ]}
        />

        {/* ── The features ── */}
        <Line at={featuresAt} x={X0} y={y(318)} size={24}>
          Features
        </Line>
        <Ink at={amountAt} dur={10} style={{ left: X0, top: chipY, whiteSpace: "nowrap", fontSize: 22 }}>
          <div style={{ position: "relative", display: "flex", gap: 14, fontSize: 22 }}>
            {chips.map((c) => (
              <span key={c.t} style={{ opacity: ease(frame, c.at, 10), transform: `translateY(${(1 - ease(frame, c.at, 10)) * 8}px)`, display: "inline-block" }}>
                {c.lit ? (
                  <Mark at={hourAt}>
                    <Tag size={22}>{c.t}</Tag>
                  </Mark>
                ) : (
                  <Tag size={22}>{c.t}</Tag>
                )}
              </span>
            ))}
            {/* A bracket under the whole row, so the arrow into the model
                leaves from every feature rather than from the chip above it. */}
            <div
              style={{
                position: "absolute",
                left: 2,
                right: 2,
                top: 56 - 12,
                height: 12,
                boxSizing: "border-box",
                borderLeft: `2px solid ${BAR}`,
                borderRight: `2px solid ${BAR}`,
                borderBottom: `2px solid ${BAR}`,
                borderRadius: "0 0 4px 4px",
                opacity: ease(frame, boostAt - 4, 10),
              }}
            />
          </div>
        </Ink>
        <Spot id="card" at={velocityAt + 4} x={1260} y={y(318)} w={170} />

        {/* ── Serving: at authorization, in under 100 ms ── */}
        <Flow points={[[MODEL.x + MODEL.w / 2, chipY + 56], [MODEL.x + MODEL.w / 2, mid - 45]]} at={boostAt} color={BAR} />
        <Node x={MODEL.x} y={mid - 42} w={MODEL.w} h={84} at={boostAt} title="Model" sub="at authorization" lit={onlineAt} litOut={storeAt} />
        <Ink at={boostAt + 6} dur={12} style={{ left: MODEL.x, top: mid + 42 + h(22), whiteSpace: "nowrap" }}>
          <Tag size={21}>gradient boosting</Tag>
        </Ink>
        <Ink at={nnAt} dur={12} style={{ left: MODEL.x, top: mid + 42 + h(22) + 44, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 12, fontSize: 21 }}>
          <span style={{ ...note(21, INK_SOFT) }}>or</span>
          <Tag size={21}>a neural network over the card&apos;s history</Tag>
        </Ink>
        <Flow points={[[MODEL.x + MODEL.w + 3, mid], [DECIDE.x - 3, mid]]} at={onlineAt + 6} color={BAR} />
        <Ink at={msAt} dur={12} style={{ left: MODEL.x + MODEL.w + 40, top: mid - 52, whiteSpace: "nowrap" }}>
          <span style={{ ...note(22, INK), fontWeight: 500 }}>
            <Mark at={msAt + 4}>under 100 ms</Mark>
          </span>
        </Ink>
        <Node x={DECIDE.x} y={mid - 42} w={DECIDE.w} h={84} at={onlineAt + 10} title="Approve or Decline" size={22} />
        <Node x={STORE.x} y={mid - 42} w={STORE.w} h={84} at={storeAt} icon={Database} title="Online Store" sub="velocity counts" size={22} />
        <Flow points={[[STORE.x + STORE.w + 3, mid], [MODEL.x - 3, mid]]} at={storeAt + 6} color={BAR} />
        <Line at={thresholdAt} x={DECIDE.x} y={mid + 42 + h(22)} size={21}>
          Threshold, set by cost:
        </Line>
        <Line at={missedAt} x={DECIDE.x} y={mid + 42 + h(22) + 32} size={21} color={INK_SOFT}>
          a missed fraud vs a good customer declined
        </Line>

        {/* ── Labels: chargebacks, weeks late ── */}
        <Line at={labelsAt} x={X0} y={y(700)} size={24}>
          Labels: chargebacks, weeks late
        </Line>
        <Svg opacity={ease(frame, labelsAt, 12)}>
          <line x1={TL.x0} x2={TL.x1} y1={axis} y2={axis} stroke={INK_SOFT} strokeWidth={2} />
          {dots.map((x, i) => (
            <circle key={i} cx={x} cy={axis} r={6 * ease(frame, labelsAt + i * 0.6, 8)} fill={BAR} />
          ))}
          {FRAUDS.map((f, i) => {
            const p = ease(frame, lateAt + i * 6, 18);
            const top = axis - h(70);
            return (
              <g key={i}>
                <circle cx={f.x} cy={axis} r={8} fill={INK} />
                <path
                  d={`M${f.x},${axis - 12} C${f.x},${top} ${f.back},${top} ${f.back},${axis - 12}`}
                  fill="none"
                  stroke={INK}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  opacity={p}
                  style={{ clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` }}
                />
                <rect x={f.back - 4} y={axis - 14} width={8} height={28} rx={2} fill={INK} opacity={ease(frame, lateAt + i * 6 + 14, 6)} />
              </g>
            );
          })}
          <circle cx={FRESH} cy={axis} r={8} fill={INK} />
          <circle cx={FRESH} cy={axis} r={17} fill="none" stroke={ACCENT} strokeWidth={2.5} opacity={ease(frame, honestAt, 12)} />
          {/* Train only where every label has landed. */}
          <line x1={TL.cut} x2={TL.cut} y1={axis - h(84)} y2={axis + h(40)} stroke={INK} strokeWidth={2} strokeDasharray="6 5" opacity={ease(frame, trainAt, 12)} />
          <path
            d={`M${TL.x0},${axis + h(30)} L${TL.x0},${axis + h(42)} L${TL.cut - 8},${axis + h(42)} L${TL.cut - 8},${axis + h(30)}`}
            fill="none"
            stroke={OK}
            strokeWidth={2.6}
            opacity={ease(frame, trainAt + 6, 12)}
          />
        </Svg>
        <div style={{ position: "absolute", left: TL.x0, top: axis + h(30), width: (TL.cut - 8 - TL.x0) * ease(frame, trainAt + 6, 16), height: h(12), background: MARK_OK, opacity: 0.6 }} />
        <Line at={labelsAt + 6} x={TL.x0} y={axis + h(54)} size={20} color={INK_SOFT}>
          weeks ago
        </Line>
        <Line at={labelsAt + 6} x={TL.x1} y={axis + h(54)} size={20} color={INK_SOFT} align="right" width={120}>
          today
        </Line>
        {/* The key: a fraud, and its chargeback. */}
        <Ink at={lateAt + 10} dur={12} style={{ left: 640, top: y(700) + 4, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 10, fontSize: 20 }}>
          <span style={{ width: 16, height: 16, borderRadius: 8, background: INK, display: "inline-block" }} />
          <span style={{ ...label(20, INK_SOFT), marginRight: 16 }}>fraud</span>
          <span style={{ width: 8, height: 24, borderRadius: 2, background: INK, display: "inline-block" }} />
          <span style={{ ...label(20, INK_SOFT) }}>its chargeback</span>
        </Ink>
        <Line at={trainAt + 10} x={(TL.x0 + TL.cut) / 2} y={axis + h(54)} size={21} color={OK_INK} align="center" width={300}>
          Train on these
        </Line>
        <Line at={honestAt} x={FRESH} y={axis - h(70)} size={21} color={ACCENT_INK} align="center" width={200}>
          looks honest
        </Line>

        {/* ── What to watch ── */}
        <ColumnRule x={1150} top={y(700)} height={h(200)} at={monitorAt} />
        <Line at={monitorAt} x={1200} y={y(700)} size={24}>
          Monitor
        </Line>
        {[
          { t: "Precision and recall", s: "as the labels arrive", at: monitorAt + 4 },
          { t: "Drift in velocity features", s: "before they do", at: driftAt },
        ].map((m, i) => (
          <React.Fragment key={m.t}>
            <Ink at={m.at} dur={12} style={{ left: 1200, top: y(700) + h(54) + i * h(76), whiteSpace: "nowrap" }}>
              <span style={{ ...label(22, INK), fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 10, fontSize: 22 }}>
                <Activity size={22} color={INK} strokeWidth={2} />
                {m.t}
              </span>
            </Ink>
            <Line at={m.at + 6} x={1232} y={y(700) + h(54) + i * h(76) + 32} size={20} color={INK_SOFT}>
              {m.s}
            </Line>
          </React.Fragment>
        ))}
      </Drift>
    </AbsoluteFill>
  );
};
