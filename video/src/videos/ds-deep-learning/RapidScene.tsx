import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { NextLine, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { SANS } from "../../theme/fonts";
import { EPOCH, INIT } from "./data";
import { at, Axes, Drift, Fade, Headline, Kicker, Mark, OK, OK_INK, type Scale, Spot, Svg, Tagline, WARM, WARM_INK, X0 } from "./parts";

/** Where the answers go: right of the list. */
const R_X = 800;
const R_END = 1780;
const LIST_TOP = 330;
const ROW = 56;

type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"] };

// ── 13. The loss for each output ────────────────────────────────────────────

const Loss: React.FC<{ c: Ctx }> = ({ c }) => {
  const rows = [
    { task: "several classes", out: "softmax", loss: "cross-entropy", at: c.w("r-loss", "A softmax output with cross-entropy") },
    { task: "two classes", out: "sigmoid", loss: "binary cross-entropy", at: c.w("r-loss", "or a sigmoid with binary cross-entropy") },
    { task: "regression", out: "linear", loss: "mean squared error", at: c.w("r-loss", "For regression") },
  ];
  const robustAt = c.w("r-loss", "a robust loss when outliers matter");
  const stallsAt = c.w("r-loss", "Squared error on a sigmoid output stalls");
  const COLS = [R_X + 40, R_X + 330, R_X + 560];
  return (
    <>
      {["task", "output layer", "loss"].map((t, i) => (
        <Tagline key={t} x={COLS[i]} y={c.y(380)} at={rows[0].at - 6} size={21}>
          {t}
        </Tagline>
      ))}
      {rows.map((r, i) => (
        <Note key={r.task} at={r.at - 2} x={COLS[0]} y={c.y(430) + i * c.h(66)}>
          <div style={{ position: "relative", width: 900, ...note(28, INK), whiteSpace: "nowrap" }}>
            <span>{r.task}</span>
            <span style={{ position: "absolute", left: COLS[1] - COLS[0], color: BLUE_INK, fontWeight: 650 }}>{r.out}</span>
            <span style={{ position: "absolute", left: COLS[2] - COLS[0], color: OK_INK, fontWeight: 650 }}>{r.loss}</span>
          </div>
        </Note>
      ))}
      <Note at={robustAt - 2} x={COLS[2]} y={c.y(430) + 3 * c.h(66) - c.h(16)}>
        <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>or a robust loss, for outliers</span>
      </Note>
      <Note at={stallsAt - 2} x={COLS[0]} y={c.y(730)}>
        <span style={{ ...note(26, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
          squared error on a sigmoid output: <Mark at={stallsAt + 6}>stalls once it saturates</Mark>
        </span>
      </Note>
      <Note at={stallsAt + 10} x={COLS[0]} y={c.y(776)}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>saturated: on a flat end of the curve, where the gradient is nearly 0</span>
      </Note>
    </>
  );
};

// ── 14. Initialization ──────────────────────────────────────────────────────

const Init: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const equalAt = c.w("r-init", "Start every weight equal");
  const scaleAt = c.w("r-init", "Start at the wrong scale");
  const oneAt = c.w("r-init", "a weight spread of one");
  const smallAt = c.w("r-init", "point oh one shrinks it");
  const heAt = c.w("r-init", "He initialization");
  const xavierAt = c.w("r-init", "Xavier is the version for tanh");
  const box = { left: R_X + 120, right: R_X + 700, top: 420, bottom: 820 };
  const xs: Scale = { lo: 0, hi: 10, a: box.left, b: box.right };
  const ys: Scale = { lo: -11, hi: 11, a: c.y(box.bottom), b: c.y(box.top) };
  const px = (k: number) => xs.a + (k / 10) * (xs.b - xs.a);
  const py = (v: number) => ys.a + ((Math.log10(v) - ys.lo) / (ys.hi - ys.lo)) * (ys.b - ys.a);
  // Red shrinks and orange blows up, as in question 5's vanishing and
  // exploding gradients.
  const series = [
    { key: "one" as const, color: WARM, at: oneAt, ink: WARM_INK, text: `spread 1: ${(INIT.sd.one[10] / 1e9).toFixed(0)} billion` },
    { key: "small" as const, color: ACCENT, at: smallAt, ink: ACCENT_INK, text: "spread 0.01: almost nothing" },
    { key: "he" as const, color: OK, at: heAt, ink: OK_INK, text: `He: ${INIT.sd.he[10].toFixed(2)}` },
  ];
  return (
    <>
      <Note at={equalAt - 2} x={R_X + 40} y={c.y(330)}>
        <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
          every weight equal: <span style={{ color: ACCENT_INK, fontWeight: 650 }}>the units stay copies</span>
        </span>
      </Note>
      <Axes x={xs} y={ys} xTicks={[0, 2, 4, 6, 8, 10]} xTitle={`ReLU layers, ${INIT.width} wide`} yTitle="the signal's spread" at={scaleAt - 4} />
      {/* The y ticks are powers of ten, drawn here so the exponent can be a
          real superscript: the Unicode ones (10¹⁰) came out about 10 px. */}
      <Svg opacity={ease(frame, scaleAt + 2, 12)}>
        {[-10, -5, 0, 5, 10].map((v) => (
          <g key={v}>
            <line x1={xs.a} x2={xs.b} y1={at(ys, v)} y2={at(ys, v)} stroke={INK_SOFT} strokeWidth={1} strokeDasharray="2 6" opacity={0.5} />
            <text x={xs.a - 14} y={at(ys, v) + 7} textAnchor="end" style={{ fontFamily: SANS, fontSize: 21, fontWeight: 500, fill: INK_SOFT, fontVariantNumeric: "tabular-nums" }}>
              {v === 0 ? (
                "1"
              ) : (
                <>
                  10
                  <tspan dy={-9} style={{ fontSize: 15 }}>
                    {v < 0 ? `−${-v}` : v}
                  </tspan>
                </>
              )}
            </text>
          </g>
        ))}
      </Svg>
      <Svg>
        {series.map((s) =>
          INIT.sd[s.key].map((v, k) => {
            const p = ease(frame, s.at + k * 1.6, 6);
            if (p <= 0) return null;
            const prev = k > 0 ? INIT.sd[s.key][k - 1] : v;
            return (
              <g key={`${s.key}-${k}`}>
                {k > 0 ? (
                  <line x1={px(k - 1)} y1={py(prev)} x2={px(k - 1) + (px(k) - px(k - 1)) * p} y2={py(prev) + (py(v) - py(prev)) * p} stroke={s.color} strokeWidth={3} />
                ) : null}
                <circle cx={px(k)} cy={py(v)} r={5.5 * p} fill={s.color} />
              </g>
            );
          }),
        )}
      </Svg>
      {series.map((s) => (
        <Tagline key={s.key} x={px(10) + 16} y={py(INIT.sd[s.key][10]) - c.h(14)} at={s.at + 16} size={21} color={s.ink}>
          {s.text}
        </Tagline>
      ))}
      <Tagline x={px(10) + 16} y={py(INIT.sd.he[10]) + c.h(16)} at={xavierAt} size={19}>
        Xavier: the same, for tanh
      </Tagline>
    </>
  );
};

// ── 15. Epoch, batch, iteration ─────────────────────────────────────────────

const Epoch: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const epochAt = c.w("r-epoch", "An epoch is one pass");
  const batchAt = c.w("r-epoch", "A batch is the examples behind one update");
  const iterAt = c.w("r-epoch", "an iteration is one update");
  const tenAt = c.w("r-epoch", "Ten thousand examples");
  const makeAt = c.w("r-epoch", "three hundred and thirteen iterations");
  const W = R_END - R_X - 80;
  const bar = { x: R_X + 40, y: c.y(560), h: c.h(64) };
  const full = ease(frame, epochAt, 20);
  const cuts = ease(frame, tenAt + 4, 30);
  // The batch boundaries inside the bar: 312 of them, the last batch the
  // partial one after the last line.
  const shown = Math.floor((EPOCH.iterations - 1) * cuts);
  const seg = W / EPOCH.exact;
  return (
    <>
      <Tagline x={bar.x} y={bar.y - c.h(46)} at={epochAt} size={22} color={INK}>
        one epoch: one pass over the training set
      </Tagline>
      <div style={{ position: "absolute", left: bar.x, top: bar.y, width: W * full, height: bar.h, background: `color-mix(in srgb, ${BAR} 22%, transparent)`, border: `2px solid ${BAR}`, borderRadius: 4, boxSizing: "border-box" }} />
      <Svg>
        {Array.from({ length: shown }, (_, i) => (
          <line key={i} x1={bar.x + (i + 1) * seg} x2={bar.x + (i + 1) * seg} y1={bar.y + 3} y2={bar.y + bar.h - 3} stroke={BAR} strokeWidth={1} opacity={0.7} />
        ))}
        {/* One batch at its true width, a sliver of the bar (it was a 14 px box,
            about five batches wide). */}
        <rect x={bar.x} y={bar.y - 8} width={seg} height={bar.h + 16} fill={OK} opacity={ease(frame, batchAt, 10)} />
      </Svg>
      <Note at={batchAt + 2} x={bar.x} y={bar.y + bar.h + c.h(14)}>
        <span style={{ ...note(24, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>one batch → one update: an iteration</span>
      </Note>
      <Note at={iterAt + 6} x={bar.x} y={bar.y + bar.h + c.h(54)}>
        <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>batch: the examples behind one update; iteration: the update</span>
      </Note>
      <Note at={tenAt - 2} x={bar.x} y={c.y(760)}>
        <span style={{ ...note(28, INK), whiteSpace: "nowrap", ...TABULAR }}>
          {EPOCH.n.toLocaleString("en-US")} examples ÷ {EPOCH.batch} a batch = {EPOCH.exact}, so{" "}
          <Mark at={makeAt}>
            <b>{EPOCH.iterations}</b> iterations
          </Mark>{" "}
          an epoch
        </span>
      </Note>
      <Note at={makeAt + 6} x={bar.x + W} y={bar.y + bar.h + c.h(14)} align="right" width={300}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap", ...TABULAR }}>the last batch holds {EPOCH.lastBatch}</span>
      </Note>
    </>
  );
};

/**
 * The quick round, questions 13 to 15: the numbered list on the left, ticked
 * as the round goes, each answer on the right. The last stays up through the
 * bridge into Part 6.
 */
export const RapidScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: (b, p) => n.word(b, p), y, h };

  const from = n.beat("rapid-in").from;
  const closeAt = n.word("rapid-in", "To close");
  const runAt = n.word("rapid-in", "setting up a training run");
  const nextAt = n.word("next", "Next");
  const end = n.beat("next").from;

  const items: RapidItem[] = [
    { n: 13, label: "Which loss for which output", beat: "r-loss", body: <Loss c={c} /> },
    { n: 14, label: "Why initialization matters", beat: "r-init", body: <Init c={c} /> },
    { n: 15, label: "Epoch, batch and iteration", beat: "r-epoch", body: <Epoch c={c} /> },
  ].map(({ beat, ...item }) => ({ ...item, at: n.beat(beat).from }));
  const lastAt = n.beat("r-epoch").from;

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={from} level={-34} />
      {items.map((item) => (
        <Sfx key={item.n} name="el-tap" at={item.at} level={-34} />
      ))}
      <Sfx name="el-chime" at={end} level={-34} />

      <Drift from={from} to={n.beat("next").to + 40} scale={0.015}>
        <Kicker at={from}>Questions 13 to 15</Kicker>
        <Headline lead="To close," turn="setting up a training run." at={closeAt - 4} turnAt={runAt - 4} size={64} />
        <Spot id="da-sql-stopwatch" video="da-sql" at={from + 6} left={1640} top={y(112)} width={130} height={140} />

        <RapidFire
          items={items.map((it) => (it.n === 15 ? { ...it, body: undefined } : it))}
          x={X0}
          top={y(LIST_TOP) + h(40)}
          rowH={h(ROW)}
          width={620}
          at={runAt}
          end={end}
        />
        <Fade from={lastAt - 6}>
          <Epoch c={c} />
        </Fade>

        <NextLine at={nextAt} x={R_X + 40} y={y(830)} width={900}>
          designing the experiment
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
