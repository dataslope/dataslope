import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { SANS } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { FAMILY, METRICS } from "./data";
import { at, Axes, CONTROL, Curve, Drift, OK, OK_INK, PanelTitle, type Scale, TREAT, WARM, WARM_INK, X0 } from "./parts";

const LEFT = { x0: 190, x1: 720, top: 420, base: 800 };
const RIGHT = { x0: 900, x1: 1370, top: 420, base: 800 };
const LEGEND_X = 1420;

/** log10, for the p-value axis. */
const lg = (v: number) => Math.log10(v);

/**
 * Question 6. Left, the page's curve: the chance of at least one false alarm
 * in k tests at 5%, 64% at twenty. Right, ten simulated metrics (three with a
 * real effect) by rank against three cut-offs on a log scale: 0.05 keeps five,
 * two of them false; Bonferroni's 0.005 keeps two and drops a real one;
 * Benjamini-Hochberg's staircase (rank k's bar is k/10 of 0.05) keeps every
 * rank up to the last one under its bar, the three real ones. On a log scale
 * ranks 3 to 5 sit within a few pixels of their steps, so the deciding
 * comparisons are also printed beside the legend, and the kept ranks are
 * ringed and fenced off.
 */
export const ManyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("many").from;
  const qAt = n.word("many", "Question six");
  const textAt = n.word("many", "What is the multiple comparisons problem");
  const eachAt = n.word("many", "Each test at a five percent level");
  const oneAt = n.word("many", "one in twenty chance");
  const twentyAt = n.word("many", "Read twenty metrics");
  const sixtyAt = n.word("many", "sixty-four percent");
  const tenAt = n.word("many-fix", "Here are ten simulated metrics");
  const realAt = n.word("many-fix", "three of them really moved");
  const fiveAt = n.word("many-fix", "Five come in under point oh five");
  const falseAt = n.word("many-fix", "two of those are false alarms");
  const bonfAt = n.word("many-fix", "Bonferroni divides");
  const keepsTwoAt = n.word("many-fix", "keeps two");
  const dropsAt = n.word("many-fix", "it drops a real one");
  const bhAt = n.word("many-bh", "Benjamini-Hochberg controls");
  const fdrAt = n.word("many-bh", "the false discovery rate");
  const ruleAt = n.word("many-bh", "It gives the smallest p-value a bar");
  const keepAt = n.word("many-bh", "keeps everything up to the last one under its bar");
  const keepsThreeAt = n.word("many-bh", "the three real ones");
  const primaryAt = n.word("many-end", "name one primary metric");
  const end = n.beat("many-end").to;

  // Left: 1 - 0.95^k.
  const kx: Scale = { lo: 0, hi: 20.5, a: LEFT.x0, b: LEFT.x1 };
  const ky: Scale = { lo: 0, hi: 0.7, a: y(LEFT.base), b: y(LEFT.top) };
  const fam = FAMILY.k.map((k, i) => [k, FAMILY.p[i]] as [number, number]);

  // Right: p by rank, log scale.
  const rx: Scale = { lo: 0.4, hi: 10.6, a: RIGHT.x0, b: RIGHT.x1 };
  const ry: Scale = { lo: lg(0.0003), hi: lg(1.5), a: y(RIGHT.base), b: y(RIGHT.top) };
  const py = (p: number) => at(ry, lg(p));
  const m = METRICS.m;
  const cut = 0.05;
  const bonf = METRICS.bonferroniCut;
  const stair = Array.from({ length: m }, (_, i) => [i + 1, ((i + 1) / m) * cut] as const);
  const stairPath = stair
    .map(([r, v], i) => {
      const x0 = at(rx, r - 0.5);
      const x1 = at(rx, r + 0.5);
      return `${i ? "L" : "M"}${x0.toFixed(1)},${py(v).toFixed(1)} L${x1.toFixed(1)},${py(v).toFixed(1)}`;
    })
    .join(" ");
  const cutP = ease(frame, fiveAt, 14);
  const bonfP = ease(frame, bonfAt + 4, 14);
  const bhP = ease(frame, ruleAt + 2, 26);
  // Benjamini-Hochberg keeps every rank up to the last one under its bar.
  const lastKept = Math.max(0, ...METRICS.rows.filter((r) => r.p <= r.bar).map((r) => r.rank));
  const fenceX = (at(rx, lastKept) + at(rx, lastKept + 1)) / 2;
  const fence = ease(frame, keepAt + 4, 14);
  const fenceTop = py(METRICS.rows[lastKept - 1]?.p ?? cut) + 36;
  const deciding = METRICS.rows.filter((r) => r.rank >= lastKept && r.rank <= lastKept + 2);
  const rightIn = ease(frame, tenAt - 4, 12);
  const leftDim = ease(frame, tenAt, 14) * 0.55;

  const legend = [
    { color: INK, dash: "6 5", text: `under 0.05: keeps ${METRICS.counts.raw}, ${METRICS.counts.rawFalse} false`, at: fiveAt + 4, ink: INK },
    { color: WARM, dash: undefined, text: `Bonferroni (0.05 ÷ ${m}): keeps ${METRICS.counts.bonferroni}`, at: keepsTwoAt, ink: WARM_INK },
    // Named as the narration names it, so its notes below have a heading;
    // what it keeps arrives with the answer.
    { color: OK, dash: undefined, text: "Benjamini-Hochberg", tail: `: keeps ${METRICS.counts.bh}`, tailAt: keepsThreeAt, at: bhAt, ink: OK_INK },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={twentyAt + 2} level={-36} />
      <Sfx name="el-tap" at={sixtyAt} level={-35} />
      <Sfx name="el-pop" at={tenAt} level={-37} />
      <Sfx name="el-scratch" at={falseAt} level={-35} />
      <Sfx name="el-pencil" at={bonfAt + 4} level={-37} />
      <Sfx name="el-pencil" at={ruleAt + 2} level={-37} />
      <Sfx name="el-pop" at={keepAt + 6} level={-37} />
      <Sfx name="el-pop" at={primaryAt} level={-36} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} size={62}>
          What is the multiple comparisons problem?
        </QuestionCard>
        <Note at={eachAt} x={X0} y={y(300)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            each test at 5%: <span style={{ opacity: ease(frame, oneAt, 10) }}>a one-in-twenty chance of a false alarm</span>
          </span>
        </Note>

        {/* Left: how fast "at least one" climbs. */}
        <div style={{ opacity: 1 - leftDim }}>
          <PanelTitle x={LEFT.x0 - 20} y={y(LEFT.top) - 54} at={twentyAt - 6}>
            chance of at least one false alarm
          </PanelTitle>
          <Axes x={kx} y={ky} xTicks={[1, 5, 10, 15, 20]} yTicks={[0, 0.2, 0.4, 0.6]} yFormat={(v) => `${Math.round(v * 100)}%`} xTitle="metrics read" at={twentyAt - 8} />
          <Curve points={fam} x={kx} y={ky} at={twentyAt} dur={Math.max(18, sixtyAt - twentyAt)} color={ACCENT} />
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            <circle cx={at(kx, 1)} cy={at(ky, FAMILY.p[0])} r={7 * ease(frame, twentyAt, 8)} fill={ACCENT} />
            <circle cx={at(kx, 20)} cy={at(ky, FAMILY.at20)} r={9 * ease(frame, sixtyAt, 8)} fill={ACCENT} />
          </svg>
          <Note at={twentyAt + 2} x={at(kx, 1) + 16} y={at(ky, FAMILY.p[0]) - 6}>
            <span style={{ ...label(21, ACCENT_INK), fontWeight: 700, ...TABULAR }}>5%</span>
          </Note>
          <Note at={sixtyAt} x={at(kx, 20) - 90} y={at(ky, FAMILY.at20) - 48}>
            <span style={{ ...note(28, ACCENT_INK), fontWeight: 800, ...TABULAR }}>{Math.round(FAMILY.at20 * 100)}%</span>
          </Note>
        </div>

        {/* Right: ten metrics against three cut-offs. */}
        <div style={{ opacity: rightIn }}>
          <PanelTitle x={RIGHT.x0 - 20} y={y(RIGHT.top) - 54} at={tenAt}>
            ten simulated metrics, by p-value
          </PanelTitle>
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            <line x1={RIGHT.x0} x2={RIGHT.x1} y1={y(RIGHT.base)} y2={y(RIGHT.base)} stroke={INK} strokeWidth={1.6} />
            {[0.001, 0.01, 0.1, 1].map((v) => (
              <g key={v}>
                <line x1={RIGHT.x0} x2={RIGHT.x1} y1={py(v)} y2={py(v)} stroke={INK_SOFT} strokeWidth={1} strokeDasharray="2 6" opacity={0.45} />
                <text x={RIGHT.x0 - 12} y={py(v) + 7} textAnchor="end" style={{ fontFamily: SANS, fontSize: 19, fill: INK_SOFT, fontVariantNumeric: "tabular-nums" }}>
                  {v}
                </text>
              </g>
            ))}
            {METRICS.rows.map((r) => (
              <text key={r.rank} x={at(rx, r.rank)} y={y(RIGHT.base) + 28} textAnchor="middle" style={{ fontFamily: SANS, fontSize: 19, fill: INK_SOFT, fontVariantNumeric: "tabular-nums" }}>
                {r.rank}
              </text>
            ))}
            <text x={RIGHT.x1} y={y(RIGHT.base) + 56} textAnchor="end" style={{ fontFamily: SANS, fontSize: 19, fontWeight: 650, fill: INK_SOFT }}>
              rank, smallest p first
            </text>

            {/* The three cut-offs. */}
            <line x1={RIGHT.x0} x2={RIGHT.x0 + (RIGHT.x1 - RIGHT.x0) * cutP} y1={py(cut)} y2={py(cut)} stroke={INK} strokeWidth={2} strokeDasharray="6 5" />
            <line x1={RIGHT.x0} x2={RIGHT.x0 + (RIGHT.x1 - RIGHT.x0) * bonfP} y1={py(bonf)} y2={py(bonf)} stroke={WARM} strokeWidth={3} />
            <path d={stairPath} fill="none" stroke={OK} strokeWidth={3} pathLength={1} strokeDasharray={`${bhP} 1`} />

            {/* The metrics. */}
            {METRICS.rows.map((r, i) => {
              const s = ease(frame, tenAt + 2 + i * 1.5, 8);
              const real = ease(frame, realAt + i * 0.5, 10);
              const fa = !r.real && r.raw ? ease(frame, falseAt, 10) : 0;
              const dropped = r.real && !r.bonferroni ? ease(frame, dropsAt, 10) : 0;
              const fill = r.real && real > 0.5 ? TREAT : CONTROL;
              return (
                <g key={r.rank}>
                  <circle cx={at(rx, r.rank)} cy={py(r.p)} r={11 * s} fill={fill} />
                  {fa > 0 ? <circle cx={at(rx, r.rank)} cy={py(r.p)} r={19} fill="none" stroke={ACCENT} strokeWidth={3} opacity={fa} /> : null}
                  {dropped > 0 ? <circle cx={at(rx, r.rank)} cy={py(r.p)} r={19} fill="none" stroke={WARM} strokeWidth={3} strokeDasharray="4 4" opacity={dropped} /> : null}
                  {r.bh ? <circle cx={at(rx, r.rank)} cy={py(r.p)} r={22} fill="none" stroke={OK} strokeWidth={3} opacity={ease(frame, keepAt + 4 + r.rank * 2, 10)} /> : null}
                </g>
              );
            })}

            {/* What Benjamini-Hochberg keeps: everything left of the fence,
                drawn below the rings and down between the rank labels. */}
            <line x1={fenceX} x2={fenceX} y1={fenceTop} y2={fenceTop + (y(RIGHT.base) + 40 - fenceTop) * fence} stroke={OK} strokeWidth={2.5} strokeDasharray="7 6" />
          </svg>
          <Note at={keepAt + 12} x={fenceX + 12} y={y(RIGHT.base) - h(86)}>
            <span style={{ ...label(21, OK_INK), fontWeight: 750, whiteSpace: "nowrap" }}>← keeps ranks 1–{lastKept}</span>
          </Note>
          <Note at={realAt + 2} x={RIGHT.x0 + 10} y={y(RIGHT.top) + 4}>
            <span style={{ ...label(20, BLUE_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
              <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: 7, background: TREAT, marginRight: 8 }} />
              really moved
              <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: 7, background: CONTROL, margin: "0 8px 0 22px" }} />
              didn't
            </span>
          </Note>
        </div>

        {/* What each cut-off keeps. */}
        {legend.map((l, i) => (
          <Note key={l.text} at={l.at} x={LEGEND_X} y={y(440) + i * 76}>
            <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <svg width={44} height={10} style={{ overflow: "visible", flexShrink: 0 }}>
                <line x1={0} x2={44} y1={5} y2={5} stroke={l.color} strokeWidth={l.dash ? 2 : 3} strokeDasharray={l.dash} />
              </svg>
              {/* No TABULAR: it spaces out the hyphen in "Benjamini-Hochberg". */}
              <span style={{ ...note(22, l.ink), fontWeight: 700, whiteSpace: "nowrap" }}>
                {l.text}
                {"tail" in l ? <span style={{ opacity: ease(frame, l.tailAt ?? l.at, 10) }}>{l.tail}</span> : null}
              </span>
            </span>
          </Note>
        ))}
        <Note at={dropsAt + 2} x={LEGEND_X + 56} y={y(440) + 76 + 34}>
          <span style={{ ...label(19, WARM_INK), fontWeight: 700, whiteSpace: "nowrap" }}>safe, but it drops a real one</span>
        </Note>
        <Note at={fdrAt + 2} x={LEGEND_X + 56} y={y(440) + 152 + 34} width={370}>
          <span style={{ ...label(19, OK_INK), fontWeight: 700 }}>controls the false discovery rate: the expected share of false hits</span>
        </Note>

        {/* The rule, and the three ranks that decide it. */}
        <Note at={ruleAt + 4} x={LEGEND_X + 56} y={y(440) + 152 + 104}>
          <span style={{ ...label(20, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            rank <i>k</i>'s bar: <i>k</i>/{m} × {cut}
          </span>
        </Note>
        {deciding.map((r, i) => {
          const under = r.p <= r.bar;
          return (
            <Note key={r.rank} at={keepAt - 6 + i * 4} x={LEGEND_X + 56} y={y(440) + 152 + 138 + i * 30}>
              <span style={{ display: "grid", gridTemplateColumns: "80px 84px 28px 74px auto", alignItems: "baseline", ...label(20, under ? OK_INK : INK_SOFT), fontWeight: under ? 750 : 600, whiteSpace: "nowrap" }}>
                <span>rank {r.rank}</span>
                <span style={TABULAR}>{r.p.toFixed(4)}</span>
                <span style={{ textAlign: "center" }}>{under ? "≤" : ">"}</span>
                <span style={TABULAR}>{r.bar.toFixed(3)}</span>
                <span>{under ? "kept" : "over"}</span>
              </span>
            </Note>
          );
        })}
        <Note at={primaryAt - 2} x={LEGEND_X} y={y(788)} width={380}>
          <span style={{ ...note(26, OK_INK), fontWeight: 750 }}>Better still: name one primary metric before the test starts.</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
