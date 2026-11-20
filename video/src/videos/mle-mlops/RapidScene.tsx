import { BellRing, CalendarClock, Layers, type LucideIcon, TrendingDown } from "lucide-react";
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { BAR, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BadgeRow, BLOCK, BLOCK_SOFT, Box, Drift, Flow, Headline, Kicker, Line, LIT_LINE, Mark, OK_INK, Svg, X0 } from "./parts";

/** Where the answers go: right of the list. */
const R_X = 800;
const LIST_TOP = 330;
const ROW = 58;

type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"] };

// ── 13. The model registry ──────────────────────────────────────────────────

const Registry: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const at0 = c.w("r-registry", "A model registry");
  const metaAt = c.w("r-registry", "with their metadata");
  const tags = [
    { text: "data version", at: c.w("r-registry", "the data version") },
    { text: "hyperparameters", at: c.w("r-registry", "hyperparameters") },
    { text: "evaluation metrics", at: c.w("r-registry", "evaluation metrics") },
    { text: "deployment history", at: c.w("r-registry", "deployment history") },
  ];
  const promoAt = c.w("r-registry", "enforces promotion");
  const prodAt = c.w("r-registry", "to production");
  const lookupAt = c.w("r-registry", "turns a rollback into a lookup");
  const rebuildAt = c.w("r-registry", "rather than a rebuild");
  const top = c.y(350);
  const bh = c.h(70);
  const promote = ease(frame, prodAt, 20);
  return (
    <>
      {["v1", "v2", "v3"].map((v, i) => (
        <Box key={v} x={R_X + i * 190} y={top} w={170} h={bh} at={at0 + i * 4} title={v} sub="artifact" size={24} lit={i === 2 ? metaAt : undefined} litOut={i === 2 ? promoAt : undefined} />
      ))}
      <Svg opacity={ease(frame, at0, 10)}>
        <line x1={R_X - 10} x2={R_X + 3 * 190 - 10} y1={top + bh + 10} y2={top + bh + 10} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      </Svg>
      <Line at={metaAt - 2} x={R_X} y={top + bh + c.h(40)} size={23} color={INK}>
        Each with its metadata:
      </Line>
      <BadgeRow x={R_X} y={top + bh + c.h(86)} size={22} gap={12} items={tags.slice(0, 2).map((t) => ({ text: t.text, at: t.at - 2 }))} />
      <BadgeRow x={R_X} y={top + bh + c.h(136)} size={22} gap={12} items={tags.slice(2).map((t) => ({ text: t.text, at: t.at - 2 }))} />
      {/* Promotion, staging to production. */}
      <Line at={promoAt - 2} x={R_X} y={c.y(660)} size={23} color={INK}>
        Promotion:
      </Line>
      <Box x={R_X + 150} y={c.y(648)} w={160} h={c.h(56)} at={promoAt + 2} title="Staging" size={22} />
      <Flow points={[[R_X + 314, c.y(648) + c.h(28)], [R_X + 377, c.y(648) + c.h(28)]]} at={prodAt - 4} head={12} />
      <Box x={R_X + 380} y={c.y(648)} w={180} h={c.h(56)} at={prodAt - 2} title="Production" size={22} tone="plain" to="ok" toAt={prodAt + 8} />
      <div style={{ position: "absolute", left: R_X + 150 + 30 + 230 * promote, top: c.y(648) - 30, ...label(20, INK_SOFT), opacity: ease(frame, promoAt + 6, 10) }}>v3</div>
      <Line at={lookupAt - 2} x={R_X} y={c.y(760)} size={26} color={OK_INK}>
        <Mark at={lookupAt + 6}>A rollback is a lookup</Mark>
        <span style={{ opacity: ease(frame, rebuildAt - 2, 10) }}>, not a rebuild</span>
      </Line>
    </>
  );
};

// ── 14. Retraining triggers ─────────────────────────────────────────────────

const Retrain: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const fourAt = c.w("r-retrain", "four triggers");
  const triggers: { icon: LucideIcon; text: string; at: number }[] = [
    { icon: CalendarClock, text: "A schedule", at: c.w("r-retrain", "a schedule") },
    { icon: BellRing, text: "A drift alert", at: c.w("r-retrain", "a drift alert") },
    { icon: TrendingDown, text: "Accuracy or a proxy below a threshold", at: c.w("r-retrain", "live accuracy or a proxy") },
    { icon: Layers, text: "Enough new labeled data", at: c.w("r-retrain", "enough new labeled data") },
  ];
  const ctAt = c.w("r-retrain", "Continuous training automates them");
  const gateAt = c.w("r-retrain", "the same gate");
  const rolloutAt = c.w("r-retrain", "and staged rollout");
  const rowY = (i: number) => c.y(360) + i * c.h(70);
  const RT = { x: 1420, w: 200 };
  const midY = (rowY(0) + rowY(3)) / 2 + 16;
  const bh = c.h(58);
  return (
    <>
      {triggers.map((t, i) => {
        const p = ease(frame, t.at - 2, 12);
        const l = Math.min(ease(frame, t.at, 8), 1 - ease(frame, triggers[i + 1]?.at ?? ctAt, 10));
        const Icon = t.icon;
        return (
          <React.Fragment key={t.text}>
            <div style={{ position: "absolute", left: R_X, top: rowY(i), display: "flex", alignItems: "center", gap: 14, fontSize: 24, opacity: p, whiteSpace: "nowrap" }}>
              <Icon size={28} strokeWidth={2.1} color={INK} style={{ flex: "none" }} />
              <span style={{ ...note(24, INK), position: "relative", display: "inline-block", margin: "0 0.14em" }}>
                <span style={{ position: "absolute", left: "-0.14em", right: "-0.14em", top: "0.04em", bottom: "-0.06em", background: HIGHLIGHT, borderRadius: "0.14em", opacity: l }} />
                <span style={{ position: "relative" }}>{t.text}</span>
              </span>
            </div>
            <Flow points={[[1330, rowY(i) + 16], [1356, rowY(i) + 16]]} at={t.at + 2} head={0} width={2} />
          </React.Fragment>
        );
      })}
      <Flow points={[[1356, rowY(0) + 15], [1356, rowY(3) + 17]]} at={triggers[0].at} dur={30} head={0} width={2} />
      <Flow points={[[1356, midY], [RT.x - 3, midY]]} at={triggers[3].at + 4} head={12} />
      <Box x={RT.x} y={midY - bh / 2} w={RT.w} h={bh} at={fourAt} title="Retrain" size={24} />
      <Flow points={[[RT.x + RT.w / 2, midY + bh / 2 + 4], [RT.x + RT.w / 2, midY + bh / 2 + c.h(56) - 3]]} at={gateAt - 4} head={12} />
      <Box x={RT.x} y={midY + bh / 2 + c.h(56)} w={RT.w} h={bh} at={gateAt - 2} title="Gate" size={24} lit={gateAt} />
      <Flow points={[[RT.x + RT.w / 2, midY + bh * 1.5 + c.h(56) + 4], [RT.x + RT.w / 2, midY + bh * 1.5 + c.h(112) - 3]]} at={rolloutAt - 4} head={12} />
      <Box x={RT.x} y={midY + bh * 1.5 + c.h(112)} w={RT.w} h={bh} at={rolloutAt - 2} title="Staged rollout" size={23} lit={rolloutAt} />
      <Line at={ctAt - 2} x={R_X} y={rowY(4) + c.h(30)} size={25} color={OK_INK}>
        Continuous training automates them
      </Line>
      <Line at={gateAt - 4} x={R_X} y={rowY(4) + c.h(76)} size={22} color={INK_SOFT}>
        every version through the same gate and rollout
      </Line>
    </>
  );
};

// ── 15. Blue/green ──────────────────────────────────────────────────────────

const BlueGreen: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const twoAt = c.w("r-bluegreen", "two full environments");
  const servesAt = c.w("r-bluegreen", "Blue serves");
  const warmAt = c.w("r-bluegreen", "warms up");
  const flipAt = c.w("r-bluegreen", "traffic flips in one switch");
  const backAt = c.w("r-bluegreen", "flips back if anything breaks");
  const downAt = c.w("r-bluegreen", "Near-zero downtime");
  const instantAt = c.w("r-bluegreen", "instant rollback");
  const costAt = c.w("r-bluegreen", "for the cost of running both");
  const canaryAt = c.w("r-bluegreen", "A canary is the gradual version");
  const env = { x: 1180, w: 300, h: c.h(84) };
  const blueY = c.y(350);
  const greenY = c.y(500);
  const tr = { x: R_X, w: 170, y: c.y(425) };
  const toGreen = ease(frame, flipAt, 8) * (1 - ease(frame, backAt + 6, 8));
  const live = toGreen > 0.5 ? greenY : blueY;
  const trMid = tr.y + env.h / 2;
  return (
    <>
      <Box x={tr.x} y={tr.y} w={tr.w} h={env.h} at={twoAt - 4} title="Traffic" size={24} />
      <Box x={env.x} y={blueY} w={env.w} h={env.h} at={twoAt} title="Blue (current)" sub={<span style={{ opacity: ease(frame, servesAt, 10) }}>{toGreen > 0.5 ? "standing by" : "serving"}</span>} size={24} lit={toGreen > 0.5 ? undefined : servesAt} litOut={flipAt} />
      <Box x={env.x} y={greenY} w={env.w} h={env.h} at={twoAt + 6} title="Green (new)" sub={<span style={{ opacity: ease(frame, warmAt - 4, 10) }}>{toGreen > 0.5 ? "serving" : frame >= backAt + 6 ? "new model" : "new model, warming up"}</span>} size={24} lit={flipAt} litOut={backAt + 6} />
      {/* The one switch, redrawn on each flip. */}
      <Flow key={live} points={[[tr.x + tr.w + 4, trMid], [1000, trMid], [1000, live + env.h / 2], [env.x - 3, live + env.h / 2]]} at={live === blueY ? (frame < flipAt ? servesAt : backAt + 6) : flipAt} dur={8} color={BAR} width={5} head={16} radius={14} />
      <Line at={flipAt + 4} x={tr.x} y={tr.y + env.h + c.h(20)} size={21} color={INK_SOFT}>
        One switch
        <span style={{ opacity: ease(frame, backAt, 10) }}>, and back</span>
      </Line>
      <Line at={downAt - 2} x={R_X} y={c.y(660)} size={24} color={OK_INK}>
        Near-zero downtime
        <span style={{ opacity: ease(frame, instantAt - 2, 10) }}>, instant rollback</span>
      </Line>
      <Line at={costAt - 2} x={R_X} y={c.y(660) + c.h(46)} size={24} color={INK}>
        Cost: running both
      </Line>
      <Line at={canaryAt - 2} x={R_X} y={c.y(660) + c.h(110)} size={24} color={INK}>
        <Mark at={canaryAt + 4}>A canary is the gradual version</Mark>
      </Line>
    </>
  );
};

// ── 16. Experiment tracking ─────────────────────────────────────────────────

const Tracking: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const at0 = c.w("r-tracking", "Experiment tracking");
  const toolsAt = c.w("r-tracking", "MLflow");
  const wbAt = c.w("r-tracking", "Weights and Biases");
  const logsAt = c.w("r-tracking", "logs every run's");
  const prodAt = c.w("r-tracking", "which run made the model in production");
  const cols = ["run", "hyperparameters", "metrics", "code version", "artifact"];
  const colW = [80, 220, 140, 180, 140];
  const colX = colW.map((_, i) => R_X + colW.slice(0, i).reduce((a, b) => a + b, 0));
  const top = c.y(450);
  const rowH = c.h(46);
  const pick = 2;
  const link = ease(frame, prodAt, 16);
  const boxMid = c.y(712);
  return (
    <>
      <BadgeRow
        x={R_X}
        y={c.y(350)}
        size={23}
        gap={14}
        items={[
          { text: "MLflow", at: toolsAt - 2 },
          { text: "Weights & Biases", at: wbAt - 2 },
        ]}
      />
      {cols.map((t, i) => (
        <Line key={t} at={logsAt + i * 3} x={colX[i]} y={top - c.h(40)} size={20} color={INK_SOFT}>
          {t}
        </Line>
      ))}
      <Svg opacity={ease(frame, logsAt, 10)}>
        <line x1={R_X} x2={R_X + 760} y1={top - 6} y2={top - 6} stroke={HAIRLINE} strokeWidth={1} />
      </Svg>
      {[0, 1, 2, 3].map((r) => {
        const p = ease(frame, at0 + 8 + r * 5, 10);
        const lit = r === pick ? link : 0;
        return (
          <div key={r} style={{ position: "absolute", left: R_X - 8, top: top + r * rowH, width: 776, height: rowH - 8, borderRadius: 6, background: lit > 0 ? `color-mix(in srgb, ${HIGHLIGHT} ${lit * 100}%, transparent)` : "transparent", opacity: p }}>
            <span style={{ position: "absolute", left: 8, top: (rowH - 8) / 2 - 14, lineHeight: "28px", ...label(21, INK) }}>{r + 1}</span>
            {colW.slice(1).map((w, k) => (
              <span key={k} style={{ position: "absolute", left: colX[k + 1] - R_X + 8, top: (rowH - 8) / 2 - 7, width: w * (0.5 + ((r * 3 + k * 5) % 4) * 0.1), height: 14, borderRadius: 4, background: k === 3 ? BLOCK : BLOCK_SOFT, opacity: ease(frame, logsAt + k * 3, 10) }} />
            ))}
          </div>
        );
      })}
      <Flow
        points={[[R_X + 772, top + pick * rowH + rowH / 2 - 4], [R_X + 812, top + pick * rowH + rowH / 2 - 4], [R_X + 812, boxMid], [R_X + 763, boxMid]]}
        at={prodAt}
        head={12}
        radius={12}
        color={LIT_LINE}
        width={3}
      />
      <Box x={R_X + 540} y={boxMid - c.h(30)} w={220} h={c.h(60)} at={prodAt + 8} title="In production" size={22} />
      <Line at={prodAt - 4} x={R_X} y={boxMid - 34} size={24} color={INK}>
        Without it, nobody can say
      </Line>
      <Line at={prodAt + 2} x={R_X} y={boxMid + 2} size={24} color={INK}>
        which run made the model
      </Line>
    </>
  );
};

// ── 17. Packaging a model ───────────────────────────────────────────────────

const Package: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const serAt = c.w("r-package", "serialize the artifact");
  const pinAt = c.w("r-package", "pin the runtime and dependencies");
  const contAt = c.w("r-package", "build a container");
  const matchAt = c.w("r-package", "so serving matches training");
  const onnxAt = c.w("r-package", "Exporting to ONNX");
  const neutralAt = c.w("r-package", "a framework-neutral format");
  const freesAt = c.w("r-package", "frees it from the training library");
  const fasterAt = c.w("r-package", "opens faster runtimes");
  const box = { x: R_X + 24, w: 340, top: c.y(380), h: c.h(64) };
  const outline = ease(frame, contAt, 20);
  const OL = { x: R_X, y: box.top - c.h(52), w: box.w + 48, h: 2 * box.h + c.h(24) + c.h(74) };
  const OX = R_X + 520;
  return (
    <>
      <Box x={box.x} y={box.top} w={box.w} h={box.h} at={serAt - 2} title="Artifact" sub="serialized" size={23} />
      <Box x={box.x} y={box.top + box.h + c.h(24)} w={box.w} h={box.h} at={pinAt - 2} title="Runtime + dependencies" sub="pinned" size={23} />
      <Svg>
        <rect x={OL.x} y={OL.y} width={OL.w} height={OL.h} rx={8} fill="none" stroke={INK_SOFT} strokeWidth={2} strokeDasharray="10 7" style={{ clipPath: `inset(-4px ${(1 - outline) * 100}% -4px -4px)` }} />
      </Svg>
      <Line at={contAt + 4} x={OL.x + 16} y={OL.y + 10} size={21} color={INK_SOFT}>
        container
      </Line>
      <Line at={matchAt - 2} x={R_X} y={OL.y + OL.h + c.h(30)} size={25} color={OK_INK}>
        <Mark at={matchAt + 6}>Serving matches training</Mark>
      </Line>
      <Line at={onnxAt - 2} x={OX} y={box.top - c.h(40)} size={23} color={INK}>
        Export it:
      </Line>
      <BadgeRow x={OX} y={box.top + c.h(10)} size={24} items={[{ text: "ONNX", at: onnxAt, tone: "blue" }]} />
      <Flow points={[[OX + 110, box.top + c.h(10) + 18], [OX + 220, box.top + c.h(10) + 18]]} at={fasterAt - 4} head={13} />
      <Line at={fasterAt} x={OX + 232} y={box.top + c.h(10) + 2} size={24} color={INK}>
        Faster runtimes
      </Line>
      <Line at={neutralAt - 2} x={OX} y={box.top + c.h(84)} size={22} color={INK_SOFT}>
        A framework-neutral format,
      </Line>
      <Line at={freesAt - 2} x={OX} y={box.top + c.h(84) + 32} size={22} color={INK_SOFT}>
        free of the training library
      </Line>
    </>
  );
};

/**
 * The quick round, questions 13 to 17: the numbered list on the left, ticked
 * as the round goes, each answer on the right: the registry's shelf, the
 * four retraining triggers through the gate, blue/green's one switch, a log
 * of runs linked to the model in production, and a container around a
 * versioned artifact. The last stays up until the close.
 */
export const RapidScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: (b, p) => n.word(b, p), y, h };

  const from = n.beat("rapid-in").from;
  const fiveAt = n.word("rapid-in", "Five more");
  const quickAt = n.word("rapid-in", "quickly");
  const end = n.beat("close").from - 10;

  const items: RapidItem[] = [
    { n: 13, label: "Model registry", beat: "r-registry", body: <Registry c={c} /> },
    { n: 14, label: "Retraining triggers", beat: "r-retrain", body: <Retrain c={c} /> },
    { n: 15, label: "Blue/green deployment", beat: "r-bluegreen", body: <BlueGreen c={c} /> },
    { n: 16, label: "Experiment tracking", beat: "r-tracking", body: <Tracking c={c} /> },
    { n: 17, label: "Packaging a model", beat: "r-package", body: <Package c={c} /> },
  ].map(({ beat, ...item }) => ({ ...item, at: n.beat(beat).from }));
  const lastAt = n.beat("r-package").from;

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={from} level={-35} />
      {items.map((item) => (
        <Sfx key={item.n} name="el-tap" at={item.at} level={-33} />
      ))}

      <Drift from={from} to={end + 30} scale={0.01}>
        <Kicker at={from - 4}>Questions 13 to 17</Kicker>
        <Headline lead="Five more," turn="quickly." at={fiveAt - 4} turnAt={quickAt - 4} size={62} />
        <RapidFire
          items={items.map((it) => (it.n === 17 ? { ...it, body: undefined } : it))}
          x={X0}
          top={y(LIST_TOP)}
          rowH={h(ROW)}
          width={560}
          at={quickAt}
          end={end}
        />
        <FromFrame at={lastAt - 6}>
          <Package c={c} />
        </FromFrame>
      </Drift>
    </AbsoluteFill>
  );
};

/** The last answer: in from its cue, and up until the scene cuts. */
const FromFrame: React.FC<{ at: number; children: React.ReactNode }> = ({ at, children }) => {
  const frame = useCurrentFrame();
  const o = ease(frame, at, 8);
  if (o <= 0) return null;
  return <div style={{ position: "absolute", inset: 0, opacity: o }}>{children}</div>;
};

