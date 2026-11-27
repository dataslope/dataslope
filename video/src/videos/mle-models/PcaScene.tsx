import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, label, svgText, TABULAR } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { PCA } from "./data";
import { ACCENT, ACCENT_INK, at, type Box, CLASS, DATA, Drift, Fade, Flow, Frame, Line, Mark, OK, OK_INK, pct, POINT, Q_SIZE, scales, Svg, X0 } from "./parts";

/**
 * Question 10. A cloud and its two principal directions, long and short.
 * Then the page's block: ten variance shares, two components keeping 42.4%,
 * the last two keeping nothing. Then the trap, on the same cloud coloured by
 * its label: the long direction is noise, the short one carries the label.
 */
export const PcaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("pca").from;
  const qAt = n.word("pca", "Question ten");
  const textAt = n.word("pca", "What is PCA");
  const dirAt = n.word("pca", "finds the directions of greatest variance");
  const rightAt = n.word("pca", "each at right angles");
  const projAt = n.word("pca", "projects the data onto the first few");
  const whyAt = n.word("pca", "to compress, plot or decorrelate it");
  const runFrom = n.beat("pca-run").from;
  const tenAt = n.word("pca-run", "On the page's ten scaled features");
  const twoAt = n.word("pca-run", "two components keep forty-two percent");
  const noneAt = n.word("pca-run", "the last two keep none");
  const combAt = n.word("pca-run", "combinations of others");
  const trapFrom = n.beat("pca-trap").from;
  const signalAt = n.word("pca-trap", "variance isn't signal");
  const simAt = n.word("pca-trap", "In this simulation");
  const firstAt = n.word("pca-trap", "the first component holds ninety-seven percent");
  const coinAt = n.word("pca-trap", "barely better than a coin flip");
  const otherAt = n.word("pca-trap", "The other three percent");
  const ninetyAt = n.word("pca-trap", "at ninety-one");
  const neverAt = n.word("pca-trap", "PCA never sees the label");
  const end = n.beat("bag-in").to;

  // The cloud, in equal units on both axes.
  const box: Box = { left: X0 + 40, top: y(320), width: 700, height: h(470) };
  const unit = box.width / 19;
  const half = box.height / unit / 2;
  const { x: sx, y: sy } = scales(box, [-9.5, 9.5], [-half, half]);
  const t = PCA.trap;
  const colored = ease(frame, simAt, 16);
  const ox = at(sx, 0);
  const oy = at(sy, 0);
  const len = (i: number) => 8 * Math.sqrt(t.ratio[i] / t.ratio[0]);
  const tip = (i: number): [number, number] => [at(sx, t.components[i][0] * len(i)), at(sy, t.components[i][1] * len(i))];

  // The page's ten shares.
  const R = 960;
  const bx = R;
  const bw = 72;
  const bBase = y(820);
  const bH = h(400);
  const bMax = 0.33;
  const axisEnd = bx + 10 * (bw + 8) - 8;

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={from + 10} level={-35} />
      <Sfx name="el-whoosh" at={dirAt + 4} level={-36} />
      <Sfx name="el-whoosh" at={rightAt} level={-36} />
      <Sfx name="el-pop" at={twoAt} level={-32} />
      <Sfx name="el-tap" at={noneAt} level={-31} />
      <Sfx name="el-sprinkle" at={simAt} level={-34} />
      <Sfx name="el-tap" at={coinAt} level={-30} />
      <Sfx name="el-tap" at={ninetyAt} level={-30} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={10} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE}>
          What is PCA, and what does it do?
        </QuestionCard>

        {/* ── A cloud and its directions ── */}
        <Frame box={box} at={from + 6} />
        <Svg>
          {t.x.map((v, i) => {
            const p = ease(frame, from + 10 + (i / t.x.length) * 18, 8);
            if (p <= 0) return null;
            const c = colored > 0 ? `color-mix(in srgb, ${CLASS[t.label[i]]} ${colored * 100}%, ${DATA})` : DATA;
            return <circle key={i} cx={at(sx, v)} cy={at(sy, t.y[i])} r={3.6 * p} fill={c} opacity={0.75} />;
          })}
        </Svg>
        <Flow points={[[ox, oy], tip(0)]} at={dirAt + 4} color={INK} width={3.4} head={18} />
        <Flow points={[[ox, oy], tip(1)]} at={rightAt} color={INK} width={3.4} head={14} />
        <Line at={dirAt + 10} x={tip(0)[0] + 14} y={tip(0)[1] - 40} size={24}>
          1st
        </Line>
        <Line at={rightAt + 4} x={tip(1)[0] - 66} y={tip(1)[1] - 34} size={24}>
          2nd
        </Line>

        {/* ── What it does ── */}
        <Fade at={dirAt - 4} out={runFrom - 6}>
          <Line at={dirAt - 2} x={R} y={y(320)} size={28}>
            Directions of greatest variance
          </Line>
          <Line at={rightAt - 2} x={R} y={y(366)} size={24} color={INK_SOFT}>
            Each at right angles to those before
          </Line>
          <Line at={projAt - 2} x={R} y={y(420)} size={28}>
            Project onto the first few
          </Line>
          <Line at={whyAt - 2} x={R} y={y(466)} size={24} color={INK_SOFT}>
            To compress, plot or decorrelate
          </Line>

        </Fade>

        {/* ── The page's ten shares of variance ── */}
        <Fade at={runFrom - 4} out={trapFrom - 6}>
          <Line at={tenAt - 2} x={R} y={y(320)} size={24} color={INK_SOFT}>
            The page&apos;s 10 scaled features: variance per component
          </Line>
          {/* Why scaled: PCA follows variance, so units would decide it. */}
          <Line at={tenAt + 24} x={R} y={y(362)} size={22} color={INK_SOFT}>
            Scaled first: raw, the widest unit would take the 1st component
          </Line>
          <Svg opacity={ease(frame, tenAt, 12)}>
            <line x1={bx - 6} x2={bx + 10 * (bw + 8)} y1={bBase + 0.5} y2={bBase + 0.5} stroke={INK} strokeWidth={1.6} />
            {PCA.full.map((v, i) => {
              const p = ease(frame, tenAt + 4 + i * 2, 14);
              const lit = i < 2 ? ease(frame, twoAt, 12) : 0;
              const bh = (v / bMax) * bH * p;
              return (
                <g key={i}>
                  <rect x={bx + i * (bw + 8)} y={bBase - bh} width={bw} height={bh} rx={3} fill={lit > 0 ? `color-mix(in srgb, ${ds("blue", 700)} ${lit * 100}%, ${DATA})` : DATA} />
                  <text x={bx + i * (bw + 8) + bw / 2} y={bBase + 28} textAnchor="middle" style={{ ...svgText(label(20, INK_SOFT)), ...TABULAR }}>
                    {i + 1}
                  </text>
                  {i < 2 ? (
                    <text x={bx + i * (bw + 8) + bw / 2} y={bBase - bh - 12} textAnchor="middle" opacity={lit} style={{ ...svgText(label(21, INK)), ...TABULAR }}>
                      {pct(v, 1)}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </Svg>
          <Svg opacity={ease(frame, noneAt, 10)}>
            {[8, 9].map((i) => (
              <rect key={i} x={bx + i * (bw + 8) - 4} y={bBase - 12} width={bw + 8} height={16} rx={4} fill={POINT} opacity={0.75} />
            ))}
          </Svg>
          <Line at={twoAt + 4} x={bx + 2 * (bw + 8) + 20} y={bBase - bH * 0.78} size={28}>
            Two components: <Mark at={twoAt + 8}>{pct(PCA.total, 1)}</Mark>
          </Line>
          <Line at={noneAt} x={axisEnd} y={bBase - h(200)} size={24} color={INK} align="right" width={420}>
            Last two: 0%
          </Line>
          <Line at={combAt - 2} x={axisEnd} y={bBase - h(160)} size={22} color={INK_SOFT} align="right" width={420}>
            Combinations of other columns
          </Line>
        </Fade>

        {/* ── The trap ── */}
        <Fade at={trapFrom - 4}>
          <Line at={signalAt - 4} x={R} y={y(320)} size={34}>
            <Mark at={signalAt}>Variance isn&apos;t signal</Mark>
          </Line>
          <Line at={simAt - 2} x={R} y={y(392)} size={24} color={INK_SOFT}>
            The simulated cloud, coloured by its label
          </Line>
          <Line at={firstAt - 2} x={R} y={y(480)} size={28}>
            1st: {pct(t.ratio[0])} of the variance
          </Line>
          <Line at={coinAt - 2} x={R} y={y(526)} size={28} color={ACCENT_INK}>
            Predicts the label at {pct(t.first, 1)}
          </Line>
          <Line at={otherAt - 2} x={R} y={y(610)} size={28}>
            2nd: {pct(t.ratio[1])} of the variance
          </Line>
          <Line at={ninetyAt - 2} x={R} y={y(656)} size={28} color={OK_INK}>
            Predicts the label at {pct(t.second)}
          </Line>
          <Line at={neverAt - 2} x={R} y={y(750)} size={28}>
            PCA never sees the label
          </Line>
        </Fade>
        <Svg opacity={ease(frame, coinAt, 10)}>
          <circle cx={tip(0)[0]} cy={tip(0)[1]} r={14} fill="none" stroke={ACCENT} strokeWidth={3} />
        </Svg>
        <Svg opacity={ease(frame, ninetyAt, 10)}>
          <circle cx={tip(1)[0]} cy={tip(1)[1]} r={14} fill="none" stroke={OK} strokeWidth={3} />
        </Svg>
      </Drift>
    </AbsoluteFill>
  );
};
