import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { fmt, INK, INK_SOFT, label, note, PAPER, TABULAR } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { QUOTED, usd } from "./data";
import { A, A_INK, Arrow, Check, Drift, FAINT, Headline, Marked, OK, PANEL, pulse, Svg, Tag, track, TRAP, TRAP_INK, X0 } from "./parts";

const BX0 = 440;
const BX1 = 1440;
const ROW_Y = [560, 712];
const ICON_X = X0;
const ICON_W = 220;
const ICON_H = 124;

/**
 * Pitfall three, selective reporting (Fig. 7): what a launch post picks, then
 * ARC Prize's two runs of GPT-6 Astra on ARC-AGI-3 in September 2026: 62.7%
 * in ARC's standard harness and 99.9% in OpenAI's, which kept the model's
 * hidden reasoning between moves, for less money. Same model, same test,
 * same week; only the first number compares.
 */
export const ReportingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("select").from;
  const picksAt = n.word("select", "picks");
  const launchAt = n.word("select", "launch post");
  const arcAt = n.word("astra", "Arc AGI three");
  const benchmarksAt = n.word("select", "its benchmarks");
  const rivalsAt = n.word("select", "its rivals");
  const settingsAt = n.word("select", "its settings");
  const astraAt = n.word("astra", "GPT six Astra");
  const harnessesAt = n.word("astra", "two harnesses");
  const wrappedAt = n.word("astra", "wrapped");
  const modelAt = n.word("astra", "model");
  const standardAt = n.word("astra-scores", "standard");
  const stdScoreAt = n.word("astra-scores", "sixty-two point seven");
  const openaiAt = n.word("astra-scores", "OpenAI's");
  const hiddenAt = n.word("astra-scores", "hidden reasoning");
  const vendorScoreAt = n.word("astra-scores", "ninety-nine point nine");
  const lessAt = n.word("astra-scores", "less money");
  const sameModelAt = n.word("astra-same", "Same model");
  const sameTestAt = n.word("astra-same", "same test");
  const sameWeekAt = n.word("astra-same", "same week");
  const firstAt = n.word("astra-same", "first number");
  const elseAt = n.word("astra-same", "anyone else's");
  const end = n.beat("mismatch").from;

  const X = track(BX0, BX1);
  const runs = [
    { name: "ARC's standard harness", v: QUOTED.astraStandard, usd: QUOTED.astraStandardUsd, nameAt: standardAt - 4, at: stdScoreAt - 6 },
    { name: "OpenAI's own harness", v: QUOTED.astraVendor, usd: QUOTED.astraVendorUsd, nameAt: openaiAt - 4, at: vendorScoreAt - 6 },
  ];
  const vendorDim = ease(frame, elseAt - 2, 14) * 0.55;
  const picks = [
    { text: "its benchmarks", at: benchmarksAt - 2, x: X0 + 250 },
    { text: "its rivals", at: rivalsAt - 2, x: X0 + 486 },
    { text: "its settings", at: settingsAt - 2, x: X0 + 648 },
  ];

  return (
    <AbsoluteFill>
      {/* ── Sound: the picks, the two runs, the three sames ── */}
      {picks.map((p, i) => (
        <Sfx key={i} name="el-tap" at={p.at + 4} level={-28} />
      ))}
      <Sfx name="el-pencil" at={harnessesAt - 2} level={-34} />
      <Sfx name="el-whoosh" at={runs[0].at} level={-33} />
      <Sfx name="el-whoosh" at={runs[1].at} level={-32} />
      {[sameModelAt, sameTestAt, sameWeekAt].map((at, i) => (
        <Sfx key={i} name="el-tap" at={at + 2} level={-29} />
      ))}

      <Headline at={from - 6} second={launchAt - 4} italic="What a launch post picks.">
        Three, selective reporting.
      </Headline>
      {/* The launch post, and what it picks. */}
      <Tag at={launchAt - 2} x={X0} y={y(300)} fill={PANEL}>
        launch post
      </Tag>
      <Arrow from={[X0 + 172, y(300) + 24]} to={[X0 + 238, y(300) + 24]} at={picksAt - 4} dur={10} width={2} />
      {picks.map((p, i) => (
        <Tag key={p.text} at={p.at} x={p.x} y={y(300)} color={i === 2 ? TRAP : INK}>
          <span style={{ color: i === 2 ? TRAP_INK : INK }}>{p.text}</span>
        </Tag>
      ))}
      <FigLabel n="7" title="GPT-6 Astra on ARC-AGI-3, run by ARC Prize, September 2026" at={astraAt - 6} x={X0} y={y(420)} />

      <Drift from={from} to={end} amount={0.012} origin="50% 65%">
        {runs.map((r, i) => {
          const ry = y(ROW_Y[i]);
          const grow = ease(frame, r.at, 22);
          const dim = i === 1 ? vendorDim : 0;
          const iconIn = ease(frame, harnessesAt - 4 + i * 5, 14);
          const swell = pulse(frame, wrappedAt + i * 4, 18);
          return (
            <React.Fragment key={r.name}>
              {/* The harness: code wrapped around the model. */}
              <Svg opacity={iconIn * (1 - dim)}>
                <rect
                  x={ICON_X}
                  y={ry - ICON_H / 2}
                  width={ICON_W}
                  height={ICON_H}
                  rx={14}
                  fill="none"
                  stroke={i === 1 ? TRAP : INK}
                  strokeWidth={2.2 + swell * 1.6}
                  strokeDasharray="7 5"
                />
                <rect
                  x={ICON_X + 50}
                  y={ry - 48}
                  width={ICON_W - 100}
                  height={40}
                  rx={8}
                  fill={A}
                  opacity={ease(frame, modelAt - 2 + i * 3, 10)}
                />
                {/* What the harness carries from move to move: a short notes
                    slip in ARC's, the whole reasoning trace in OpenAI's. */}
                <g opacity={ease(frame, hiddenAt - 4 + i * 6, 12)}>
                  <rect
                    x={ICON_X + ICON_W / 2 - (i === 0 ? 34 : 92)}
                    y={ry + 6}
                    width={i === 0 ? 68 : 184}
                    height={30}
                    rx={5}
                    fill={PAPER}
                    stroke={i === 1 ? TRAP : INK_SOFT}
                    strokeWidth={1.6}
                  />
                  <text x={ICON_X + ICON_W / 2} y={ry + 28} textAnchor="middle" style={{ ...label(19, i === 1 ? TRAP_INK : INK_SOFT), fill: i === 1 ? TRAP_INK : INK_SOFT }}>
                    {i === 0 ? "notes" : "all its reasoning"}
                  </text>
                </g>
                <text
                  x={ICON_X + ICON_W / 2}
                  y={ry - 21}
                  textAnchor="middle"
                  style={{ ...label(21, PAPER), fontWeight: 700, fill: PAPER }}
                  opacity={ease(frame, modelAt + 2 + i * 3, 10)}
                >
                  model
                </text>
              </Svg>
              <Ink at={harnessesAt + i * 5} dur={12} style={{ left: ICON_X, top: ry + ICON_H / 2 + 4, whiteSpace: "nowrap", opacity: 1 - dim }}>
                <span style={note(21, INK_SOFT)}>harness</span>
              </Ink>

              {/* The run's score. */}
              <Ink at={r.nameAt} dur={12} style={{ left: BX0, top: ry - 58, whiteSpace: "nowrap", opacity: 1 - dim }}>
                <span style={{ ...label(24, INK), fontWeight: 650 }}>{r.name}</span>
              </Ink>
              <Svg opacity={(1 - dim)}>
                <rect x={BX0} y={ry - 16} width={(BX1 - BX0) * ease(frame, arcAt - 4 + i * 6, 18)} height={32} rx={3} fill={FAINT} opacity={0.6} />
                <rect x={BX0} y={ry - 16} width={(X(r.v) - BX0) * grow} height={32} rx={3} fill={i === 1 ? TRAP : A} />
              </Svg>
              <Ink at={r.at + 6} dur={10} style={{ left: X(100) + 16, top: ry - 18, whiteSpace: "nowrap", opacity: 1 - dim }}>
                <span style={{ ...note(30, i === 1 ? TRAP_INK : A_INK), fontWeight: 700, ...TABULAR }}>
                  {i === 0 ? <Marked at={firstAt - 2}>{fmt(r.v, 1)}%</Marked> : `${fmt(r.v, 1)}%`}
                </span>
              </Ink>
              <Ink at={lessAt - 4 + i * 6} dur={12} style={{ left: BX0, top: ry + 26, whiteSpace: "nowrap", opacity: 1 - dim }}>
                <span style={note(22, INK_SOFT)}>
                  run cost <span style={{ ...TABULAR, color: INK, fontWeight: 600 }}>{usd(r.usd)}</span>
                </span>
              </Ink>
            </React.Fragment>
          );
        })}
        <Ink at={hiddenAt - 2} dur={12} style={{ left: BX0 + 330, top: y(ROW_Y[1]) - 56, whiteSpace: "nowrap", opacity: 1 - vendorDim }}>
          <span style={note(22, TRAP_INK)}>keeps its hidden reasoning between moves</span>
        </Ink>
        <Ink at={hiddenAt + 4} dur={12} style={{ left: BX0 + 330, top: y(ROW_Y[0]) - 56, whiteSpace: "nowrap" }}>
          <span style={note(22, INK_SOFT)}>keeps only the notes the model chooses</span>
        </Ink>

        {/* Same model, same test, same week. */}
        <div style={{ position: "absolute", left: BX0, top: y(840), display: "flex", gap: 48, whiteSpace: "nowrap" }}>
          {[
            { text: "same model", at: sameModelAt },
            { text: "same test", at: sameTestAt },
            { text: "same week", at: sameWeekAt },
          ].map((s) => (
            <span key={s.text} style={{ display: "inline-flex", alignItems: "center", gap: 10, opacity: ease(frame, s.at, 10) }}>
              <svg width={30} height={30} style={{ overflow: "visible" }}>
                <Check x={14} y={15} at={s.at} size={24} color={OK} />
              </svg>
              <span style={{ ...note(24, INK), fontWeight: 600 }}>{s.text}</span>
            </span>
          ))}
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
