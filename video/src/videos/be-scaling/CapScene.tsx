import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Line, Mark, MiniMap, Node, Q_SIZE, Q_W, Svg, VRule, X0 } from "./parts";

/** The page's grid: two rows (the network's state), two columns (the choice). */
const G = { head: X0, col: [420, 800], colW: 360, top: 400, rowH: 104, gap: 12 };
/** The shortener, split by a partition, at the right. */
const P = { left: 1290, cut: 1560, right: 1640, top: 420, pacelc: 1420 };

/** A cell of the grid: a tinted box that inks its text in. */
const Cell: React.FC<{ x: number; y: number; w: number; h: number; at: number; fill: string; lit?: number; children: React.ReactNode }> = ({
  x,
  y,
  w,
  h,
  at,
  fill,
  lit = 0,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: 10,
        background: lit > 0 ? `color-mix(in srgb, ${HIGHLIGHT} ${lit * 100}%, ${fill})` : fill,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        opacity: p,
        ...note(24, INK),
        fontWeight: 500,
      }}
    >
      {children}
    </div>
  );
};

/**
 * Question 7: the page's CAP grid, the healthy row and then the partitioned
 * one, read as said. Then the shortener's own operations, each placed in the
 * column its answer chooses, beside the design split by a partition; and
 * PACELC, the healthy row's own trade.
 */
export const CapScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q7").from;
  const qAt = n.word("q7", "Question seven");
  const textAt = n.word("q7", "Explain the CAP theorem");
  const partitionAt = n.word("q7", "During a network partition");
  const consistentAt = n.word("q7", "every read seeing the latest write");
  const availableAt = n.word("q7", "every working node still answering");
  const refusesAt = n.word("q7", "each side either refuses");
  const answersAt = n.word("q7", "or answers and risks stale data");
  const choiceAt = n.word("q7-ours", "a choice per operation");
  const labelAt = n.word("q7-ours", "not a label for the database");
  const redirectAt = n.word("q7-ours", "A redirect answers");
  const notFoundAt = n.word("q7-ours", "a brand-new link isn't found yet");
  const takenAt = n.word("q7-ours", "one just taken down still works");
  const mintAt = n.word("q7-ours", "New keys can be minted on both sides");
  const blockAt = n.word("q7-ours", "its own block of IDs");
  const aliasAt = n.word("q7-ours", "a custom alias must be unique");
  const majorityAt = n.word("q7-ours", "the side without a majority refuses it");
  const healthyAt = n.word("q7-pacelc", "on a healthy network");
  const waitAt = n.word("q7-pacelc", "waiting for replicas to confirm a write");
  const tradesAt = n.word("q7-pacelc", "trades latency for consistency");
  const pacelcAt = n.word("q7-pacelc", "the second half of PACELC");
  const end = n.beat("q7-pacelc").to;

  const row = (r: number) => y(G.top) + r * (h(G.rowH) + G.gap);
  const rowH = h(G.rowH);
  const healthyFill = `color-mix(in srgb, ${BAR} 12%, ${PAPER})`;
  const partFill = `color-mix(in srgb, ${ACCENT} 12%, ${PAPER})`;
  const topLit = Math.max(Math.min(ease(frame, availableAt + 6, 10), 1 - ease(frame, refusesAt - 2, 10)), ease(frame, tradesAt, 10));
  const bottomLit = Math.min(ease(frame, refusesAt, 10), 1 - ease(frame, choiceAt, 10));
  const waiting = ease(frame, waitAt, 10);

  // The operations, each in its column, under the grid.
  const opsTop = row(2) + h(30);
  const cpX = G.col[0];
  const apX = G.col[1];

  // The partition: three nodes, two on the majority side.
  const pTop = y(P.top);
  const cutP = ease(frame, choiceAt + 4, 18);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={partitionAt} level={-35} />
      <Sfx name="el-tap" at={consistentAt} level={-31} />
      <Sfx name="el-tap" at={availableAt} level={-31} />
      <Sfx name="el-tap" at={refusesAt} level={-30} />
      <Sfx name="el-tap" at={answersAt} level={-30} />
      <Sfx name="el-scratch" at={choiceAt + 4} level={-33} />
      <Sfx name="el-tap" at={redirectAt} level={-31} />
      <Sfx name="el-tap" at={mintAt} level={-31} />
      <Sfx name="el-tap" at={aliasAt} level={-31} />
      <Sfx name="el-tap" at={tradesAt} level={-30} />
      <Sfx name="el-pencil" at={pacelcAt} level={-35} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={7} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE} width={Q_W}>
          Explain the CAP theorem.
        </QuestionCard>
        <MiniMap at={qAt} stage={6} lit="store" />

        {/* ── The grid ── */}
        {[
          ["stay consistent", "every read sees the latest write", consistentAt],
          ["stay available", "every working node answers", availableAt],
        ].map(([t, sub, at], i) => (
          <Ink key={i} at={(at as number) - 6} dur={14} style={{ left: G.col[i], top: y(G.top) - h(84), width: G.colW, textAlign: "center" }}>
            <div style={{ ...label(24, INK), fontWeight: 500 }}>{t as string}</div>
            <div style={{ ...note(24, INK_SOFT), marginTop: 4, whiteSpace: "nowrap" }}>{sub as string}</div>
          </Ink>
        ))}
        {["network healthy", "during a partition"].map((t, r) => (
          <Ink key={t} at={partitionAt + r * 6} dur={14} style={{ left: G.head, top: row(r), height: rowH, display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
            <span style={{ ...label(24, r ? ACCENT_INK : INK), fontWeight: 500 }}>{t}</span>
          </Ink>
        ))}
        <Cell x={G.col[0]} y={row(0)} w={G.col[1] + G.colW - G.col[0]} h={rowH} at={availableAt + 6} fill={healthyFill} lit={topLit}>
          <span>
            {waiting > 0.5 ? (
              <>
                waiting on replicas:<span style={{ color: BLUE_INK, opacity: ease(frame, tradesAt, 10) }}> latency or consistency</span>
              </>
            ) : (
              "consistent and available"
            )}
          </span>
        </Cell>
        <Cell x={G.col[0]} y={row(1)} w={G.colW} h={rowH} at={refusesAt} fill={partFill} lit={bottomLit}>
          refuse
        </Cell>
        <Cell x={G.col[1]} y={row(1)} w={G.colW} h={rowH} at={answersAt} fill={partFill} lit={bottomLit}>
          answer, maybe stale
        </Cell>

        {/* ── The shortener, per operation ── */}
        <Line at={choiceAt} x={G.head} y={opsTop} size={22} weight={500}>
          A choice per operation
        </Line>
        <Line at={labelAt} x={G.head} y={opsTop + h(36)} size={20} color={INK_SOFT}>
          not a label for the database
        </Line>
        {/* Available: the redirect and the new key, each with its notes under it. */}
        <Line at={redirectAt} x={apX} y={opsTop} size={22} weight={500} color={BLUE_INK}>
          redirect
        </Line>
        <Line at={notFoundAt} x={apX} y={opsTop + h(34)} size={20} color={INK_SOFT}>
          at worst, a new link not found yet,
        </Line>
        <Line at={takenAt} x={apX} y={opsTop + h(62)} size={20} color={INK_SOFT}>
          a taken-down link still working
        </Line>
        <Line at={mintAt} x={apX} y={opsTop + h(124)} size={22} weight={500} color={BLUE_INK}>
          new key
        </Line>
        <Line at={blockAt} x={apX} y={opsTop + h(158)} size={20} color={INK_SOFT}>
          each server mints from
        </Line>
        <Line at={blockAt + 4} x={apX} y={opsTop + h(186)} size={20} color={INK_SOFT}>
          its own block of IDs
        </Line>
        {/* Consistent: the custom alias. */}
        <Line at={aliasAt} x={cpX} y={opsTop + h(124)} size={22} weight={500} color={BLUE_INK}>
          custom alias
        </Line>
        <Line at={aliasAt + 6} x={cpX} y={opsTop + h(158)} size={20} color={INK_SOFT}>
          must be unique, so
        </Line>
        <Line at={majorityAt} x={cpX} y={opsTop + h(186)} size={20} color={ACCENT_INK} weight={500}>
          the minority side refuses it
        </Line>
        <VRule x={1225} top={y(316)} bottom={y(900)} at={choiceAt + 2} />

        {/* ── The design, split by a partition ── */}
        <Line at={choiceAt + 2} x={P.left} y={pTop - h(60)} size={21} weight={500} color={INK_SOFT}>
          The shortener, split by a partition
        </Line>
        {[
          [P.left, 0, "node A"],
          [P.left, 1, "node B"],
          [P.right, 0, "node C"],
        ].map(([x, r, t], i) => (
          <Node key={i} x={x as number} y={pTop + (r as number) * h(96)} w={170} h={68} at={choiceAt + 4 + i * 3} tone="data" title={t as string} size={21} />
        ))}
        <Svg opacity={cutP}>
          <path
            d={`M${P.cut},${pTop - 14} l-14,${h(44)} l28,${h(44)} l-28,${h(44)} l28,${h(44)} l-14,${h(30)}`}
            fill="none"
            stroke={ACCENT}
            strokeWidth={3.2}
            strokeDasharray="10 7"
            pathLength={1}
          />
        </Svg>
        <Line at={choiceAt + 10} x={P.left} y={pTop + h(190)} size={20} color={INK_SOFT}>
          majority side
        </Line>
        <Line at={choiceAt + 12} x={P.right} y={pTop + h(190)} size={20} color={INK_SOFT}>
          minority side
        </Line>
        <Line at={majorityAt + 4} x={P.right} y={pTop + h(96)} size={20} color={ACCENT_INK} weight={500}>
          alias: refused
        </Line>

        {/* ── PACELC ── */}
        <Ink at={healthyAt} dur={14} style={{ left: P.pacelc, top: y(700), whiteSpace: "nowrap" }}>
          <span style={{ ...label(24, INK_SOFT), fontWeight: 500 }}>and on a healthy network</span>
        </Ink>
        <Ink at={pacelcAt} dur={16} style={{ left: P.pacelc, top: y(744), whiteSpace: "nowrap" }}>
          <span style={{ ...label(40, INK), fontWeight: 500, letterSpacing: "0.02em" }}>
            PAC
            <span style={{ color: BLUE_INK }}>ELC</span>
          </span>
        </Ink>
        <Line at={pacelcAt + 6} x={P.pacelc} y={y(744) + h(62)} size={20} color={INK_SOFT}>
          partition: availability or consistency
        </Line>
        <Line at={pacelcAt + 10} x={P.pacelc} y={y(744) + h(96)} size={20} color={INK}>
          <Mark at={pacelcAt + 14}>else:</Mark> latency or consistency
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
