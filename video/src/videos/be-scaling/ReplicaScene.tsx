import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { Drift, Flow, Line, Mark, MiniMap, Node, OK, OK_INK, Q_SIZE, Q_W, Svg, VRule, X0 } from "./parts";

const LEADER = { x: 330, w: 230, h: 80, mid: 490 };
const FOLLOW = { x: 760, w: 240, h: 84, mids: [400, 580] };
const READS_X = 1170;
/** The timeline: a leader row and a follower row, time running right. */
const T = { x0: 330, x1: 1240, leader: 744, follower: 828, create: 400, copy: 820, open: 560, window: 940 };
/** The failover log, at the right. */
const LOG = { x: 1340, cell: 50, gap: 8 };

/**
 * Question 5: leader-follower replication, writes in and copies streamed out,
 * reads fanned over the followers, then a follower promoted when the leader
 * dies. Below, the catch on a timeline (a link read on a follower before its
 * copy arrives: not found) and its fix (that user's reads go to the leader
 * for a while); at the right, a lagging follower promoted without its last
 * two writes.
 */
export const ReplicaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q5").from;
  const qAt = n.word("q5", "Question five");
  const textAt = n.word("q5", "What is database replication");
  const copiesAt = n.word("q5", "Copies of the data");
  const writesAt = n.word("q5", "writes go to the leader");
  const streamAt = n.word("q5", "stream to read-only followers");
  const scalesAt = n.word("q5", "That scales reads");
  const diesAt = n.word("q5", "if the leader dies");
  const promotedAt = n.word("q5", "a follower is promoted");
  const lagAt = n.word("q5-lag", "The catch is replication lag");
  const createsAt = n.word("q5-lag", "Someone creates a link");
  const opensAt = n.word("q5-lag", "opens it at once");
  const landsAt = n.word("q5-lag", "the read lands on a follower");
  const notFoundAt = n.word("q5-lag", "not found");
  const whileAt = n.word("q5-fix", "for a short while after a user writes");
  const leaderAt = n.word("q5-fix", "send their reads to the leader");
  const asyncAt = n.word("q5-fix", "with asynchronous replication");
  const laggingAt = n.word("q5-fix", "promoting a lagging follower");
  const losesAt = n.word("q5-fix", "loses the writes it never received");
  const end = n.beat("q5-fix").to;

  const lMid = y(LEADER.mid);
  const fMid = FOLLOW.mids.map((m) => y(m));
  const dead = ease(frame, diesAt, 10);
  const promoted = ease(frame, promotedAt, 14);
  const dimTop = lagAt - 4;
  const tx = (v: number) => v;
  const lRow = y(T.leader);
  const fRow = y(T.follower);
  const lag = ease(frame, lagAt + 6, 24);
  const fixed = ease(frame, leaderAt, 14);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={writesAt} level={-31} />
      <Sfx name="el-sprinkle" at={streamAt + 4} level={-32} />
      <Sfx name="el-pencil" at={scalesAt} level={-35} />
      <Sfx name="el-scratch" at={diesAt} level={-31} />
      <Sfx name="el-chime" at={promotedAt + 6} level={-33} />
      <Sfx name="el-tap" at={createsAt} level={-31} />
      <Sfx name="el-tap" at={landsAt + 10} level={-31} />
      <Sfx name="el-scratch" at={notFoundAt} level={-32} />
      <Sfx name="el-whoosh" at={leaderAt} level={-36} />
      <Sfx name="el-scratch" at={losesAt} level={-32} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE} width={Q_W}>
          What is database replication and what does it buy you?
        </QuestionCard>
        <MiniMap at={qAt} stage={4} lit="store" grow={{ followers: streamAt }} />

        {/* ── Leader and followers ── */}
        <Line at={copiesAt} x={X0} y={y(340)} size={22} weight={500} color={INK_SOFT} dim={dimTop}>
          copies of the data on several nodes
        </Line>
        <Ink at={writesAt - 2} dur={12} style={{ left: X0, top: lMid - 44, whiteSpace: "nowrap", opacity: 1 - ease(frame, dimTop, 12) * 0.65 }}>
          <span style={{ ...label(21, BLUE_INK), fontWeight: 500 }}>writes</span>
        </Ink>
        <Flow points={[[X0, lMid], [LEADER.x - 8, lMid]]} at={writesAt} color={BAR} dim={dimTop} />
        <Node
          x={LEADER.x}
          y={lMid - LEADER.h / 2}
          w={LEADER.w}
          h={LEADER.h}
          at={writesAt}
          tone={dead > 0.5 ? "bad" : "data"}
          title={dead > 0.5 ? "leader ✕" : "leader"}
          dim={dimTop}
        />
        {fMid.map((m, i) => (
          <React.Fragment key={i}>
            <Flow
              points={[
                [LEADER.x + LEADER.w + 6, lMid + (i ? 12 : -12)],
                [LEADER.x + LEADER.w + 70, lMid + (i ? 12 : -12)],
                [LEADER.x + LEADER.w + 70, m],
                [FOLLOW.x - 8, m],
              ]}
              at={streamAt + i * 4}
              color={BAR}
              dash="9 7"
              out={diesAt}
            />
            <Node
              x={FOLLOW.x}
              y={m - FOLLOW.h / 2}
              w={FOLLOW.w}
              h={FOLLOW.h}
              at={streamAt + 4 + i * 4}
              tone={i === 0 && promoted > 0.5 ? "ok" : "data"}
              title={i === 0 && promoted > 0.5 ? "new leader" : "follower"}
              sub="read-only"
              lit={i === 0 ? promoted * 0.6 : 0}
              dim={dimTop}
            />
            <Flow points={[[READS_X, m + (i ? -4 : 4)], [FOLLOW.x + FOLLOW.w + 8, m + (i ? -4 : 4)]]} at={scalesAt + 4 + i * 4} color={BAR} width={2.2} head={12} dim={dimTop} />
          </React.Fragment>
        ))}
        <Ink at={scalesAt + 2} dur={12} style={{ left: READS_X - 70, top: fMid[0] - 50, whiteSpace: "nowrap", opacity: 1 - ease(frame, dimTop, 12) * 0.65 }}>
          <span style={{ ...label(21, BLUE_INK), fontWeight: 500 }}>reads</span>
        </Ink>
        <Line at={scalesAt + 8} x={FOLLOW.x + FOLLOW.w + 30} y={fMid[1] + 44} size={22} color={INK} weight={500} dim={dimTop}>
          scales reads
        </Line>
        <Line at={promotedAt + 6} x={FOLLOW.x} y={fMid[0] - FOLLOW.h / 2 - h(44)} size={21} color={OK_INK} weight={500} dim={dimTop}>
          promoted when the leader dies
        </Line>

        {/* ── The catch: replication lag, on a timeline. ── */}
        <Line at={lagAt} x={X0} y={y(668)} size={23} weight={500} color={INK}>
          <Mark at={lagAt + 2}>Replication lag</Mark>
        </Line>
        <Svg opacity={ease(frame, lagAt, 12)}>
          {[lRow, fRow].map((r, i) => (
            <line key={i} x1={T.x0} x2={T.x1} y1={r} y2={r} stroke={INK_SOFT} strokeWidth={1.6} />
          ))}
          {/* The follower's copy arrives late: the lag, shaded. */}
          <rect x={tx(T.create)} y={fRow - 16} width={(tx(T.copy) - tx(T.create)) * lag} height={32} fill={HIGHLIGHT} opacity={0.85} />
          {/* That user's reads go to the leader for a while after the write. */}
          <rect x={tx(T.create)} y={lRow - 16} width={(tx(T.window) - tx(T.create)) * fixed} height={32} fill={`color-mix(in srgb, ${OK} 30%, ${PAPER})`} />
          <circle cx={tx(T.create)} cy={lRow} r={9} fill={BAR} opacity={ease(frame, createsAt, 8)} />
          <circle cx={tx(T.copy)} cy={fRow} r={9} fill={BAR} opacity={ease(frame, lagAt + 28, 8)} />
          <line x1={tx(T.create)} x2={tx(T.copy)} y1={lRow + 10} y2={fRow - 18} stroke={BAR} strokeWidth={1.6} strokeDasharray="6 5" opacity={ease(frame, lagAt + 24, 10)} />
        </Svg>
        {["leader", "follower"].map((t, i) => (
          <Ink key={t} at={lagAt + 2} dur={12} style={{ left: X0, top: (i ? fRow : lRow) - 15, whiteSpace: "nowrap" }}>
            <span style={{ ...label(21, INK_SOFT), fontWeight: 500 }}>{t}</span>
          </Ink>
        ))}
        <Ink at={createsAt} dur={12} style={{ left: tx(T.create) - 60, top: lRow - 56, whiteSpace: "nowrap" }}>
          <span style={{ ...note(21, BLUE_INK), fontWeight: 500 }}>
            create <span style={{ fontFamily: MONO }}>aMoY42</span>
          </span>
        </Ink>
        {/* The read: to the follower, not found; then, fixed, to the leader. */}
        <Flow points={[[tx(T.open), fRow + 70], [tx(T.open), fRow + 22]]} at={landsAt} color={ACCENT} width={2.6} head={13} out={leaderAt} />
        <Ink at={opensAt} dur={12} out={leaderAt} style={{ left: tx(T.open) + 18, top: fRow + 40, whiteSpace: "nowrap" }}>
          <span style={{ ...note(21, INK), fontWeight: 500 }}>
            open it
            <span style={{ color: ACCENT_INK, opacity: ease(frame, notFoundAt, 8) }}>: not found</span>
          </span>
        </Ink>
        <Flow points={[[tx(T.open) + 120, fRow + 70], [tx(T.open) + 120, fRow + 40], [tx(T.open) + 40, fRow + 40], [tx(T.open) + 40, lRow + 22]]} at={leaderAt + 4} color={OK} width={2.6} head={13} />
        <Ink at={leaderAt + 10} dur={12} style={{ left: tx(T.open) + 140, top: fRow + 40, whiteSpace: "nowrap" }}>
          <span style={{ ...note(21, OK_INK), fontWeight: 500 }}>this user&apos;s reads go to the leader: found</span>
        </Ink>
        <Line at={whileAt} x={tx(T.window) - 300} y={lRow - 56} size={21} color={OK_INK} weight={500}>
          for a short while after a write
        </Line>

        <VRule x={1257} top={y(340)} bottom={y(640)} at={asyncAt} />

        {/* ── A lagging follower, promoted. ── */}
        <Line at={asyncAt} x={LOG.x} y={y(352)} size={22} weight={500} color={INK}>
          Asynchronous: promote a lagging follower
        </Line>
        {["leader", "follower"].map((t, r) => (
          <React.Fragment key={t}>
            <Ink at={laggingAt + r * 4} dur={12} style={{ left: LOG.x, top: y(402) + r * h(74), whiteSpace: "nowrap" }}>
              <span style={{ ...label(20, INK_SOFT), fontWeight: 500 }}>{t}</span>
            </Ink>
            {Array.from({ length: 6 }, (_, k) => {
              const missing = r === 1 && k >= 4;
              const p = ease(frame, laggingAt + r * 4 + k * 2, 8);
              return p > 0 ? (
                <div
                  key={k}
                  style={{
                    position: "absolute",
                    left: LOG.x + 110 + k * (LOG.cell + LOG.gap),
                    top: y(398) + r * h(74),
                    width: LOG.cell,
                    height: 34,
                    boxSizing: "border-box",
                    borderRadius: 4,
                    border: missing ? `2.5px dashed ${ACCENT}` : `2px solid ${BAR}`,
                    background: missing ? PAPER : `color-mix(in srgb, ${BAR} 18%, ${PAPER})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    ...label(19, missing ? ACCENT_INK : BLUE_INK),
                    fontWeight: 500,
                    opacity: p,
                  }}
                >
                  w{k + 1}
                </div>
              ) : null;
            })}
          </React.Fragment>
        ))}
        <Line at={losesAt} x={LOG.x} y={y(402) + h(148)} size={21} color={ACCENT_INK} weight={500}>
          promoted: w5 and w6 are lost
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
