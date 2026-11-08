import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, label, note, svgText } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { TTL } from "./data";
import { Drift, Line, Mark, MiniMap, OK_INK, pct, Q_SIZE, Q_W, Spot, StepRow, Svg, VRule, X0 } from "./parts";

/** The TTL chart: shares of reads against the TTL on a log axis. */
const C = { x0: 960, x1: 1760, top: 410, base: 790, max: 0.5, lo: 1, hi: 600 };

/** One of the two copies of a link: its name over what it points at, as
 *  plain text. */
const Copy: React.FC<{ x: number; y: number; at: number; name: string; value: React.ReactNode; out?: number }> = ({ x, y, at, name, value, out }) => (
  <Ink at={at} dur={14} out={out} style={{ left: x, top: y, whiteSpace: "nowrap" }}>
    <div style={{ ...label(23, BLUE_INK), fontWeight: 500 }}>{name}</div>
    <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 500, color: INK, marginTop: 10 }}>{value}</div>
  </Ink>
);

/**
 * Question 4: two copies of one link that drift apart, and the TTL's two ways
 * to fail; the page's model of both against the TTL, crossing near fifteen
 * seconds. Then the shortener's own case (a link taken down: delete after the
 * commit, never before) and the two write policies.
 */
export const InvalidateScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q4").from;
  const qAt = n.word("q4", "Question four");
  const textAt = n.word("q4", "Why is cache invalidation hard");
  const copiesAt = n.word("q4", "two copies of the truth");
  const driftAt = n.word("q4", "they drift");
  const ttlAt = n.word("q4", "Set the TTL");
  const longAt = n.word("q4", "too long");
  const shortAt = n.word("q4", "too short");
  const modelsAt = n.word("q4-model", "The page models a key");
  const leastAt = n.word("q4-model", "The least bad TTL");
  const crossAt = n.word("q4-model", "the two failures cross");
  const fifteenAt = n.word("q4-model", "about fifteen seconds");
  const missAt = n.word("q4-model", "six percent of reads miss");
  const staleAt = n.word("q4-model", "six percent are stale");
  const barelyAt = n.word("q4-ours", "A short link barely changes");
  const takenAt = n.word("q4-ours", "taken down for abuse");
  const deleteAt = n.word("q4-ours", "delete its cached entry");
  const commitsAt = n.word("q4-ours", "after the database commits");
  const firstAt = n.word("q4-ours", "Delete it first");
  const betweenAt = n.word("q4-ours", "a read in between");
  const backAt = n.word("q4-ours", "puts the old value back");
  const backstopAt = n.word("q4-ours", "The TTL stays as a backstop");
  const throughAt = n.word("q4-write", "Write-through updates both together");
  const costAt = n.word("q4-write", "consistent at a cost on every write");
  const behindAt = n.word("q4-write", "Write-behind batches writes");
  const crashAt = n.word("q4-write", "a crash loses");
  const end = n.beat("q4-write").to;

  const phaseOut = barelyAt - 6;
  const drifted = ease(frame, driftAt, 12);

  // ── The chart. ──
  const lx = (t: number) => C.x0 + ((Math.log(t) - Math.log(C.lo)) / (Math.log(C.hi) - Math.log(C.lo))) * (C.x1 - C.x0);
  const ly = (v: number) => y(C.base) - (v / C.max) * (y(C.base) - y(C.top));
  const chartIn = ease(frame, modelsAt, 14);
  const missP = ease(frame, modelsAt + 10, 36);
  const staleP = ease(frame, modelsAt + 30, 36);
  const line = (key: "miss" | "stale") => TTL.rows.map((r, i) => `${i ? "L" : "M"}${lx(r.ttl).toFixed(1)},${ly(r[key]).toFixed(1)}`).join(" ");
  const cross = TTL.cross;
  const crossP = ease(frame, crossAt, 14);

  // ── Phase B: the shortener's link taken down. ──
  const wtY = y(764);
  const wbY = y(846);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={copiesAt} level={-31} />
      <Sfx name="el-tap" at={driftAt + 2} level={-31} />
      <Sfx name="el-pencil" at={modelsAt + 10} level={-35} />
      <Sfx name="el-pencil" at={modelsAt + 30} level={-35} />
      <Sfx name="el-tap" at={fifteenAt} level={-30} />
      <Sfx name="el-tap" at={takenAt + 4} level={-31} />
      <Sfx name="el-tap" at={commitsAt} level={-31} />
      <Sfx name="el-tap" at={commitsAt + 10} level={-31} />
      <Sfx name="el-tap" at={firstAt} level={-31} />
      <Sfx name="el-tap" at={betweenAt} level={-31} />
      <Sfx name="el-scratch" at={backAt} level={-31} />
      <Sfx name="el-pop" at={backstopAt} level={-30} />
      <Sfx name="el-tap" at={throughAt} level={-31} />
      <Sfx name="el-scratch" at={crashAt} level={-31} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE} width={Q_W}>
          Why is cache invalidation hard?
        </QuestionCard>
        <MiniMap at={qAt} stage={3} lit="cache" />

        {/* ── Two copies of the truth, drifting apart. ── */}
        <Copy
          x={X0}
          y={y(352)}
          at={copiesAt}
          name="cache"
          value={<span style={{ color: drifted > 0.5 ? ACCENT_INK : INK }}>aMoY42 → page A</span>}
          out={phaseOut}
        />
        <Copy
          x={X0 + 360}
          y={y(352)}
          at={copiesAt + 6}
          name="database"
          value={
            <span style={{ background: drifted > 0.5 ? HIGHLIGHT : "transparent", padding: "0 4px", borderRadius: 4 }}>
              aMoY42 → page {drifted > 0.5 ? "B" : "A"}
            </span>
          }
          out={phaseOut}
        />
        <Line at={driftAt + 6} x={X0} y={y(352) + 72 + h(24)} size={22} color={INK_SOFT} out={phaseOut}>
          the database changed; the cache still says the old value
        </Line>
        <Line at={ttlAt} x={X0} y={y(600)} size={23} weight={500} out={phaseOut}>
          The TTL, the time to live:
        </Line>
        <Line at={longAt} x={X0} y={y(650)} size={23} out={phaseOut}>
          <b style={{ color: ACCENT_INK }}>too long</b>, and users see stale data
        </Line>
        <Line at={shortAt} x={X0} y={y(700)} size={23} out={phaseOut}>
          <b style={{ color: ACCENT_INK }}>too short</b>, and you lose the cache&apos;s benefit
        </Line>

        <VRule x={800} top={y(352)} bottom={y(730)} at={modelsAt} out={phaseOut} />

        {/* ── The page's model: misses and stale reads against the TTL. ── */}
        <Line at={modelsAt} x={C.x0 - 60} y={y(352)} size={21} weight={500} color={INK_SOFT} out={phaseOut}>
          The page&apos;s model: a key read once a second, changed every two minutes
        </Line>
        <Svg opacity={chartIn * (1 - ease(frame, phaseOut, 10))}>
          <defs>
            <clipPath id="be-scaling-ttl">
              <rect x={C.x0} y={y(C.top) - 2} width={C.x1 - C.x0} height={y(C.base) - y(C.top) + 4} />
            </clipPath>
          </defs>
          {[0, 0.25, 0.5].map((v) => (
            <g key={v}>
              <line x1={C.x0} x2={C.x1} y1={ly(v)} y2={ly(v)} stroke={INK_SOFT} strokeWidth={v ? 1 : 1.6} opacity={v ? 0.25 : 1} />
              <text x={C.x0 - 12} y={ly(v) + 7} textAnchor="end" style={svgText(note(20, INK_SOFT))}>
                {Math.round(v * 100)}%
              </text>
            </g>
          ))}
          {[1, 5, 30, 60, 600].map((t) => (
            <text key={t} x={lx(t)} y={y(C.base) + 30} textAnchor={t === 1 ? "start" : t === 600 ? "end" : "middle"} style={svgText(note(20, INK_SOFT))}>
              {t >= 60 ? `${t / 60} min` : `${t} s`}
            </text>
          ))}
          <text x={(C.x0 + C.x1) / 2} y={y(C.base) + 64} textAnchor="middle" style={svgText({ ...label(20, INK_SOFT), fontWeight: 500 })}>
            TTL (log scale)
          </text>
          <g clipPath="url(#be-scaling-ttl)">
            <path d={line("miss")} fill="none" stroke={BAR} strokeWidth={3} pathLength={1} strokeDasharray={`${missP} 1`} />
            <path d={line("stale")} fill="none" stroke={ACCENT} strokeWidth={3} pathLength={1} strokeDasharray={`${staleP} 1`} />
          </g>
          <text x={lx(580)} y={ly(0.07)} textAnchor="end" style={svgText({ ...label(21, BLUE_INK), fontWeight: 500, opacity: missP })}>
            reads that miss
          </text>
          <text x={lx(580)} y={ly(0.33)} textAnchor="end" style={svgText({ ...label(21, ACCENT_INK), fontWeight: 500, opacity: staleP })}>
            <tspan x={lx(580)}>reads that</tspan>
            <tspan x={lx(580)} dy={26}>
              are stale
            </tspan>
          </text>
          {crossP > 0 ? (
            <g opacity={crossP}>
              <line x1={lx(cross.ttl)} x2={lx(cross.ttl)} y1={y(C.base)} y2={ly(0.4)} stroke={INK} strokeWidth={1.4} strokeDasharray="5 4" />
              <circle cx={lx(cross.ttl)} cy={ly(cross.miss)} r={7} fill={INK} />
            </g>
          ) : null}
        </Svg>
        <Ink at={fifteenAt} dur={14} out={phaseOut} style={{ left: lx(cross.ttl) - 150, top: ly(0.4) - 40, width: 300, textAlign: "center", whiteSpace: "nowrap" }}>
          <span style={{ ...note(23, INK), fontWeight: 500 }}>
            <Mark at={leastAt}>about {Math.round(cross.ttl)} s</Mark>
            <span style={{ color: BLUE_INK, opacity: ease(frame, missAt, 10) }}> {pct(cross.miss)} miss</span>
            <span style={{ color: ACCENT_INK, opacity: ease(frame, staleAt, 10) }}>, {pct(cross.stale)} stale</span>
          </span>
        </Ink>

        {/* ── The shortener: a link taken down for abuse. ── */}
        <Line at={barelyAt} x={X0} y={y(340)} size={23} weight={500}>
          A short link barely changes: a long TTL,
          <span style={{ color: ACCENT_INK, opacity: ease(frame, takenAt, 10) }}> until one is taken down for abuse</span>
        </Line>
        <Line at={deleteAt} x={X0} y={y(420)} size={21} weight={500} color={OK_INK}>
          delete the cached entry after the database commits
        </Line>
        <StepRow
          x={X0}
          y={y(454)}
          steps={[
            { text: "mark it taken down", at: takenAt + 4 },
            { text: "commit", at: commitsAt, color: OK_INK },
            { text: "delete the cached entry", at: commitsAt + 10, color: OK_INK, lit: [commitsAt + 10, firstAt] },
          ]}
        />
        <Line at={firstAt} x={X0} y={y(560)} size={21} weight={500} color={ACCENT_INK}>
          delete it first, and a read in between puts the old value back
        </Line>
        <StepRow
          x={X0}
          y={y(594)}
          steps={[
            { text: "delete the cached entry", at: firstAt },
            { text: "a read reloads the old value", at: betweenAt, lit: [betweenAt, backAt] },
            { text: "commit", at: betweenAt + 18 },
            { text: "the cache holds the old value", at: backAt, color: ACCENT_INK },
          ]}
        />
        <Spot id="timer" at={backstopAt} x={1560} y={y(366)} w={150} />
        <Line at={backstopAt + 4} x={X0} y={y(690)} size={22} weight={500}>
          The TTL stays as a backstop: a stale entry still expires
        </Line>

        {/* ── Write-through and write-behind. ── */}
        <Ink at={throughAt} dur={14} style={{ left: X0, top: wtY, whiteSpace: "nowrap" }}>
          <span style={{ ...note(23, INK), display: "inline-flex", alignItems: "center", gap: 16 }}>
            <b style={{ width: 190 }}>Write-through</b>
            <span>
              <b style={{ color: BLUE_INK }}>cache</b> and <b style={{ color: BLUE_INK }}>database</b> written together
              <span style={{ color: INK_SOFT, opacity: ease(frame, costAt, 10) }}>: consistent, at a cost on every write</span>
            </span>
          </span>
        </Ink>
        <Ink at={behindAt} dur={14} style={{ left: X0, top: wbY, whiteSpace: "nowrap" }}>
          <span style={{ ...note(23, INK), display: "inline-flex", alignItems: "center", gap: 16 }}>
            <b style={{ width: 190 }}>Write-behind</b>
            <span style={{ position: "relative", display: "inline-flex", gap: 5 }}>
              {[0, 1, 2, 3, 4].map((k) => (
                <span key={k} style={{ width: 22, height: 22, borderRadius: 4, background: `color-mix(in srgb, ${BAR} 60%, ${PAPER})` }} />
              ))}
              <svg width={130} height={40} style={{ position: "absolute", left: -6, top: -9, overflow: "visible", opacity: ease(frame, crashAt, 8) }}>
                <line x1={4} y1={4} x2={126} y2={36} stroke={ACCENT} strokeWidth={4} strokeLinecap="round" />
                <line x1={4} y1={36} x2={126} y2={4} stroke={ACCENT} strokeWidth={4} strokeLinecap="round" />
              </svg>
            </span>
            <span>
              batched, for speed
              <span style={{ color: ACCENT_INK, fontWeight: 500, opacity: ease(frame, crashAt, 10) }}>: a crash loses what it hadn&apos;t written</span>
            </span>
          </span>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
