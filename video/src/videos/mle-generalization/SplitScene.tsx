import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Lock } from "lucide-react";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, label, TABULAR } from "../../editorial/style";
import { ds } from "../../theme/brand";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { SPLIT } from "./data";
import { at, Drift, Fade, line, LIT_INK, LIT_LINE, pct, pulse, Q_SIZE, Say, type Scale, StraightArrow, Svg, X0 } from "./parts";

const BAR_L = X0;
const BAR_R = 1720;
const HX: Scale = { lo: 0.2, hi: 0.8, a: 280, b: 1460 };
const BIN = 0.025;

/** Counts per 0.025 of accuracy (forty rows score in steps of 1/40). */
const bins = (vals: readonly number[]) => {
  const m = new Map<number, number>();
  for (const v of vals) {
    const k = Math.round(v / BIN);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].map(([k, c]) => [k * BIN, c] as const);
};

/**
 * Question 5 on the page's own split (120 / 40 / 40), then what choosing on
 * validation does to a score: coin-flip labels, fifty settings, the best kept.
 * One repeat as fifty dots, then two hundred repeats as two histograms, the
 * winners on validation centred near 64% and the same winners on test near
 * 50%. What tuning on the test set ships, and the bar read as a timeline.
 */
export const SplitScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("split").from;
  const qAt = n.word("split", "Question five");
  const textAt = n.word("split", "Why split data");
  const trainAt = n.word("split", "Train fits");
  const valAt = n.word("split", "validation chooses");
  const testAt = n.word("split", "test is touched once");
  const honestAt = n.word("split", "an honest final estimate");
  const chooseAt = n.word("split-sim", "Choosing");
  const coinAt = n.word("split-sim", "coin flips");
  const worthAt = n.word("split-sim", "worth fifty percent");
  const fiftyAt = n.word("split-sim", "Try fifty settings");
  const bestAt = n.word("split-sim", "keep the best");
  const repeatsAt = n.word("split-result", "Over two hundred repeats");
  const sixtyAt = n.word("split-result", "sixty-four percent");
  const testFiftyAt = n.word("split-result", "fifty on the test set");
  const tuneAt = n.word("split-prod", "Tune on the test set");
  const reportAt = n.word("split-prod", "you report sixty-four");
  const shipAt = n.word("split-prod", "ship fifty");
  const timeAt = n.word("split-prod", "split by time");
  const pastAt = n.word("split-prod", "train on the past");
  const afterAt = n.word("split-prod", "what came after");
  const end = n.beat("split-prod").to;

  const total = SPLIT.sizes.reduce((a, b) => a + b, 0);
  const segW = SPLIT.sizes.map((s) => ((BAR_R - BAR_L) * s) / total);
  const segX = segW.map((_, i) => BAR_L + segW.slice(0, i).reduce((a, b) => a + b, 0));
  const segs = [
    { name: "Train", size: SPLIT.sizes[0], role: "fits the parameters", at: trainAt, fill: ds("blue", 500) },
    { name: "Validation", size: SPLIT.sizes[1], role: "chooses models and settings", at: valAt, fill: ds("blue", 300) },
    { name: "Test", size: SPLIT.sizes[2], role: "touched once", at: testAt, fill: ds("blue", 200) },
  ];
  const barTop = y(330);
  const barH = h(54);
  const rolesOut = chooseAt - 6;

  // ── One repeat: fifty settings as fifty dots ──
  const dotBase = y(650);
  const pitch = h(13);
  const counts = new Map<number, number>();
  const dots = SPLIT.first.val.map((v, i) => {
    const k = Math.round(v / BIN);
    const c = counts.get(k) ?? 0;
    counts.set(k, c + 1);
    return { x: at(HX, k * BIN), y: dotBase - h(8) - c * pitch, at: fiftyAt + i * 0.5, best: v === SPLIT.first.winnerVal };
  });
  const best = dots.find((d) => d.best) ?? dots[0];
  const dotsOut = repeatsAt - 6;

  // ── Two hundred repeats: two histograms ──
  const rows = [
    { name: "The winner, on validation", vals: SPLIT.winnerVal, base: y(612), color: ACCENT, ink: ACCENT_INK, mean: SPLIT.meanWinnerVal, at: repeatsAt, meanAt: sixtyAt, prod: "Reported", prodAt: reportAt },
    { name: "The same winner, on test", vals: SPLIT.winnerTest, base: y(830), color: BAR, ink: BLUE_INK, mean: SPLIT.meanWinnerTest, at: testFiftyAt - 6, meanAt: testFiftyAt, prod: "In production", prodAt: shipAt },
  ];
  const unit = h(140) / 53;
  const binW = ((HX.b - HX.a) * BIN) / (HX.hi - HX.lo);
  const halfX = at(HX, 0.5);

  return (
    <AbsoluteFill>
      {segs.map((s) => (
        <Sfx key={s.name} name="el-tap" at={s.at} level={-32} />
      ))}
      <Sfx name="el-tap" at={coinAt} level={-32} />
      <Sfx name="el-sprinkle" at={fiftyAt} level={-36} />
      <Sfx name="el-pop" at={bestAt + 2} level={-30} />
      <Sfx name="el-whoosh" at={repeatsAt} level={-37} />
      <Sfx name="el-tap" at={sixtyAt} level={-30} />
      <Sfx name="el-tap" at={testFiftyAt + 4} level={-30} />
      <Sfx name="el-pencil" at={timeAt} level={-35} />
      <Sfx name="el-chime" at={end + 6} level={-34} />

      <Drift from={from} to={end + 40} scale={0.016}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE}>
          Why split data into train / validation / test?
        </QuestionCard>

        {/* ── The page's split, each part named as said ── */}
        {segs.map((s, i) => {
          const p = ease(frame, s.at - 4, 16);
          return (
            <React.Fragment key={s.name}>
              <div style={{ position: "absolute", left: segX[i] + 2, top: barTop, width: Math.max(0, (segW[i] - 4) * p), height: barH, background: s.fill, borderRadius: 4 }} />
              <Say at={s.at - 2} x={segX[i] + 4} y={barTop - h(48)}>
                <span style={line(28, INK)}>
                  {s.name} <span style={{ ...TABULAR, color: BLUE_INK }}>{s.size}</span>
                </span>
              </Say>
              <Say at={s.at + 4} x={segX[i] + 4} y={barTop + barH + h(16)} out={rolesOut}>
                <span style={{ ...line(24, INK_SOFT), display: "inline-flex", alignItems: "center", gap: "0.35em" }}>
                  {s.name === "Test" ? <Lock size={24} strokeWidth={2.2} color={INK} /> : null}
                  {s.role}
                </span>
              </Say>
            </React.Fragment>
          );
        })}
        <Say at={honestAt - 2} x={segX[2] + 4} y={barTop + barH + h(56)} out={rolesOut}>
          <span style={line(24, INK_SOFT)}>for an honest final estimate</span>
        </Say>

        {/* ── One repeat: fifty settings, the best kept ── */}
        <Fade from={chooseAt - 4} out={dotsOut}>
          <Say at={coinAt - 2} x={X0} y={y(452)}>
            <span style={line(26, INK)}>
              Labels made coin flips<span style={{ opacity: ease(frame, fiftyAt - 2, 10) }}>: fifty settings, each scored on the 40 validation rows</span>
            </span>
          </Say>
          <Svg opacity={ease(frame, coinAt, 12)}>
            <line x1={HX.a - 20} x2={HX.b + 20} y1={dotBase} y2={dotBase} stroke={INK} strokeWidth={1.6} />
            {[0.3, 0.4, 0.5, 0.6, 0.7].map((v) => (
              <line key={v} x1={at(HX, v)} x2={at(HX, v)} y1={dotBase} y2={dotBase + 8} stroke={INK} strokeWidth={1.4} />
            ))}
            <line x1={halfX} x2={halfX} y1={dotBase} y2={dotBase - h(190) * ease(frame, worthAt, 16)} stroke={INK_SOFT} strokeWidth={2.4} strokeDasharray="7 6" />
            {dots.map((d, i) => {
              const s = ease(frame, d.at, 8);
              return s > 0 ? <circle key={i} cx={d.x} cy={d.y} r={6 * s} fill={BAR} opacity={0.85} /> : null;
            })}
            <circle cx={best.x} cy={best.y} r={(14 + 5 * pulse(frame, bestAt, 20)) * ease(frame, bestAt, 10)} fill="none" stroke={LIT_LINE} strokeWidth={3.4} />
          </Svg>
          {[0.3, 0.4, 0.5, 0.6, 0.7].map((v) => (
            <Say key={v} at={coinAt + 4} x={at(HX, v)} y={dotBase + h(14)} width={80} align="center">
              <span style={{ ...label(21, INK_SOFT), ...TABULAR }}>{pct(v)}</span>
            </Say>
          ))}
          <Say at={worthAt} x={halfX + 14} y={dotBase - h(214)}>
            <span style={line(23, INK_SOFT)}>every model’s true worth</span>
          </Say>
          <Say at={bestAt + 4} x={best.x + 22} y={best.y - h(44)}>
            <span style={line(24, LIT_INK)}>
              best: <span style={TABULAR}>{pct(SPLIT.first.winnerVal, 1)}</span>
            </span>
          </Say>
          <Say at={coinAt + 6} x={HX.b + 30} y={dotBase - 14}>
            <span style={line(22, INK_SOFT)}>validation accuracy</span>
          </Say>
        </Fade>

        {/* ── Two hundred repeats ── */}
        <Fade from={repeatsAt - 4}>
          <Svg opacity={ease(frame, repeatsAt, 12)}>
            <line x1={halfX} x2={halfX} y1={rows[0].base - h(150)} y2={rows[1].base} stroke={INK_SOFT} strokeWidth={2.4} strokeDasharray="7 6" />
          </Svg>
          {rows.map((r) => {
            const g = ease(frame, r.at, 20);
            return (
              <React.Fragment key={r.name}>
                <Say at={r.at - 2} x={X0} y={r.base - h(150)}>
                  <span style={line(24, r.ink)}>{r.name}</span>
                </Say>
                <Svg>
                  <line x1={HX.a - 20} x2={HX.b + 20} y1={r.base} y2={r.base} stroke={INK} strokeWidth={1.6} opacity={ease(frame, r.at - 2, 10)} />
                  {bins(r.vals).map(([v, c]) => (
                    <rect key={v} x={at(HX, v) - binW / 2 + 3} y={r.base - c * unit * g} width={binW - 6} height={c * unit * g} fill={r.color} rx={3} />
                  ))}
                  <line
                    x1={at(HX, r.mean)}
                    x2={at(HX, r.mean)}
                    y1={r.base + 4}
                    y2={r.base - h(146) * ease(frame, r.meanAt, 14)}
                    stroke={INK}
                    strokeWidth={2.6}
                  />
                </Svg>
                <Say at={r.meanAt} x={at(HX, r.mean) + 12} y={r.base - h(150)}>
                  <span style={line(26, r.ink)}>
                    average <span style={TABULAR}>{pct(r.mean)}</span>
                  </span>
                </Say>
                <Say at={r.prodAt} x={HX.b + 50} y={r.base - h(70)}>
                  <span style={{ ...line(28, r.ink), ...TABULAR }}>
                    {r.prod}: {pct(r.mean)}
                  </span>
                </Say>
              </React.Fragment>
            );
          })}
          {[0.3, 0.4, 0.5, 0.6, 0.7].map((v) => (
            <Say key={v} at={testFiftyAt} x={at(HX, v)} y={rows[1].base + h(12)} width={80} align="center">
              <span style={{ ...label(21, INK_SOFT), ...TABULAR }}>{pct(v)}</span>
            </Say>
          ))}
          <Say at={tuneAt - 2} x={HX.b + 50} y={rows[0].base - h(150)}>
            <span style={line(24, INK_SOFT)}>Tuned on test:</span>
          </Say>
        </Fade>

        {/* ── When the data has time in it: the bar is a timeline ── */}
        <StraightArrow from={[BAR_L, barTop + barH + h(26)]} to={[BAR_R + 40, barTop + barH + h(26)]} at={timeAt} color={INK} width={2.4} />
        <Say at={pastAt - 2} x={BAR_L} y={barTop + barH + h(38)}>
          <span style={line(22, INK_SOFT)}>past</span>
        </Say>
        <Say at={afterAt - 2} x={BAR_R + 40} y={barTop + barH + h(38)} width={200} align="right">
          <span style={line(22, INK_SOFT)}>after</span>
        </Say>
      </Drift>
    </AbsoluteFill>
  );
};
