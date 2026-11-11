import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, label } from "../../editorial/style";
import { Ink, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { RESHARD, SHARDS } from "./data";
import { commas, Drift, lerp, Line, Mark, MiniMap, Node, OK, OK_INK, pct, Q_SIZE, Q_W, Svg, VRule, X0 } from "./parts";

const TABLE = { x: X0, w: 260, top: 382, h: 200 };
/** Eight servers, one piece each: the eight shards the simulation uses. */
const SERVER = { x0: 600, step: 108, w: 96, h: 120 };
const PIECES = 8;
const PIECE_W = 78;
const COL = { w: 54, gap: 18 };
const DATE_X = X0;
const HASH_X = 880;
const BASE = 880;
const COL_H = 140;

/**
 * Question 6: one table split into pieces (partitioning), then the pieces
 * moved onto their own servers (sharding). The shard key decides the rest:
 * by creation date, today's shard takes every new link; by a hash of the key,
 * the simulation's million keys land evenly on eight. Then the price: one
 * user's links are on all eight, and a second copy keyed by user answers it.
 */
export const ShardScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q6").from;
  const qAt = n.word("q6", "Question six");
  const textAt = n.word("q6", "What is sharding");
  const partAt = n.word("q6", "Partitioning splits one large table");
  const piecesAt = n.word("q6", "into pieces");
  const shardAt = n.word("q6", "Sharding puts the pieces");
  const serversAt = n.word("q6", "separate database servers");
  const keyAt = n.word("q6", "by a shard key");
  const scaleAt = n.word("q6", "to scale writes and storage");
  const dateAt = n.word("q6-key", "Shard by creation date");
  const todayAt = n.word("q6-key", "today's shard takes every new link");
  const hotAt = n.word("q6-key", "a hot spot");
  const hashAt = n.word("q6-key", "Shard by a hash of the short key");
  const simAt = n.word("q6-key", "in a simulation");
  const millionAt = n.word("q6-key", "a million keys land on eight shards");
  const withinAt = n.word("q6-key", "within one percent");
  const ninthAt = n.word("q6-ring", "Add a ninth shard");
  const modAt = n.word("q6-ring", "modulo moves eighty-nine percent");
  const ringAt = n.word("q6-ring", "a hash ring, as in question two");
  const redirectAt = n.word("q6-cost", "A redirect touches one shard");
  const listAt = n.word("q6-cost", "listing one user's links");
  const allAt = n.word("q6-cost", "asks all eight");
  const priceAt = n.word("q6-cost", "cross-shard queries are the price");
  const copyAt = n.word("q6-cost", "Keep a second copy keyed by user");
  const end = n.beat("q6-cost").to;

  const split = ease(frame, piecesAt, 16);
  const move = ease(frame, serversAt, 26);
  const pieceH = (h(TABLE.h) - (PIECES - 1) * 6) / PIECES;
  const tableTop = y(TABLE.top);
  const srvTop = y(392);

  // ── The two shard keys: eight columns each. ──
  const base = y(BASE);
  const colX = (x0: number, i: number) => x0 + i * (COL.w + COL.gap);
  const maxCount = Math.max(...SHARDS.counts);
  const dateFill = ease(frame, todayAt, 40);
  const hashFill = (i: number) => ease(frame, millionAt + i * 2, 18);
  const one = SHARDS.counts.length - 3;
  const redirectLit = Math.min(ease(frame, redirectAt, 8), 1 - ease(frame, listAt, 8));
  /** One user's links, a red dot each, stacked on the shard that holds it. */
  const dotStep = 12.5;
  const evenY = base - h(COL_H) * (SHARDS.keys / SHARDS.shards / maxCount);

  return (
    <AbsoluteFill>
      <Sfx name="el-scratch" at={piecesAt} level={-33} />
      <Sfx name="el-whoosh" at={serversAt} level={-35} />
      <Sfx name="el-sprinkle" at={todayAt} level={-32} />
      <Sfx name="el-tap" at={hotAt} level={-30} />
      <Sfx name="el-sprinkle" at={millionAt} level={-32} />
      <Sfx name="el-tap" at={withinAt} level={-31} />
      <Sfx name="el-tap" at={redirectAt} level={-31} />
      <Sfx name="el-sprinkle" at={allAt} level={-32} />
      <Sfx name="el-tap" at={copyAt + 4} level={-31} />
      <Sfx name="el-tap" at={modAt} level={-31} />
      <Sfx name="el-tap" at={ringAt} level={-31} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE} width={Q_W}>
          What is sharding, and how does it differ from partitioning?
        </QuestionCard>
        <MiniMap at={qAt} stage={5} lit="store" grow={{ shards: serversAt }} />

        {/* ── Partitioning, then sharding ── */}
        <Line at={partAt} x={X0} y={y(334)} size={22} weight={500} dim={serversAt + 26}>
          Partitioning: one table, in pieces
        </Line>
        {Array.from({ length: PIECES }, (_, i) => {
          const p = ease(frame, partAt, 12);
          if (p <= 0) return null;
          const stacked = tableTop + i * (h(TABLE.h) / PIECES);
          const apart = tableTop + i * (pieceH + 6);
          const x = lerp(TABLE.x, SERVER.x0 + i * SERVER.step + (SERVER.w - PIECE_W) / 2, move);
          const top = lerp(lerp(stacked, apart, split), srvTop + 18, move);
          const w = lerp(TABLE.w, PIECE_W, move);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x,
                top,
                width: w,
                height: lerp(lerp(h(TABLE.h) / PIECES, pieceH, split), 34, move),
                boxSizing: "border-box",
                border: `2px solid ${BAR}`,
                borderRadius: lerp(0, 6, split),
                background: `color-mix(in srgb, ${BAR} ${12 + i * 4}%, ${PAPER})`,
                opacity: p,
                display: "flex",
                alignItems: "center",
                paddingLeft: 10,
                ...label(19, BLUE_INK),
                fontWeight: 500,
              }}
            >
              {i === 0 && split < 0.5 ? "links" : ""}
            </div>
          );
        })}
        {Array.from({ length: PIECES }, (_, i) => (
          <Node
            key={i}
            x={SERVER.x0 + i * SERVER.step}
            y={srvTop}
            w={SERVER.w}
            h={SERVER.h}
            at={serversAt + i * 2}
            tone="plain"
            fill="transparent"
            size={20}
          >
            <span style={{ ...label(20, INK_SOFT), fontWeight: 500, marginTop: 64 }}>
              <Num>{i + 1}</Num>
            </span>
          </Node>
        ))}
        <Line at={shardAt} x={SERVER.x0} y={y(334)} size={22} weight={500}>
          Sharding: the pieces on <Num>{PIECES}</Num> separate servers
          <span style={{ opacity: ease(frame, keyAt, 10) }}>
            , by a <Mark at={keyAt + 2}>shard key</Mark>
          </span>
        </Line>
        <Line at={scaleAt} x={SERVER.x0} y={srvTop + SERVER.h + h(22)} size={22} color={OK_INK} weight={500}>
          scales writes and storage past one machine
        </Line>

        {/* ── By creation date: today's shard takes every new link. ── */}
        <Line at={dateAt} x={DATE_X} y={y(640)} size={22} weight={500}>
          Shard by creation date
        </Line>
        <Line at={todayAt + 6} x={DATE_X} y={y(640) + h(34)} size={20} color={INK_SOFT}>
          today&apos;s new links, by shard
        </Line>
        <Svg opacity={ease(frame, dateAt, 12)}>
          {Array.from({ length: 8 }, (_, i) => {
            const x = colX(DATE_X, i);
            const last = i === 7;
            const top = last ? base - h(COL_H) * dateFill : base - 3;
            return <rect key={i} x={x} y={top} width={COL.w} height={base - top} fill={last ? ACCENT : `color-mix(in srgb, ${BAR} 40%, ${PAPER})`} rx={3} />;
          })}
          <line x1={DATE_X} x2={colX(DATE_X, 7) + COL.w} y1={base + 1} y2={base + 1} stroke={INK_SOFT} strokeWidth={1.4} />
        </Svg>
        <Ink at={hotAt} dur={12} style={{ left: colX(DATE_X, 7) - 140, top: base - h(COL_H) - 6, whiteSpace: "nowrap" }}>
          <span style={{ ...label(22, ACCENT_INK), fontWeight: 500 }}>a hot spot</span>
        </Ink>
        <Ink at={todayAt + 10} dur={12} style={{ left: colX(DATE_X, 7) - 30, top: base + 10, whiteSpace: "nowrap" }}>
          <span style={{ ...label(20, INK_SOFT), fontWeight: 500 }}>today</span>
        </Ink>

        <VRule x={779} top={y(640)} bottom={y(BASE) + 36} at={hashAt} />

        {/* ── By a hash of the key: the simulation's million keys, even. ── */}
        <Line at={hashAt} x={HASH_X} y={y(640)} size={22} weight={500}>
          Shard by a hash of the short key
        </Line>
        <Line at={simAt} x={HASH_X} y={y(640) + h(34)} size={20} color={INK_SOFT}>
          simulation: <Num>{commas(SHARDS.keys)}</Num> keys on {SHARDS.shards} shards
          <b style={{ color: OK_INK, opacity: ease(frame, withinAt, 10) }}>, each within 1% of an eighth</b>
        </Line>
        <Svg opacity={ease(frame, hashAt, 12)}>
          {SHARDS.counts.map((c, i) => {
            const x = colX(HASH_X, i);
            const top = base - h(COL_H) * (c / maxCount) * hashFill(i);
            const solid = i === one && redirectLit > 0 ? HIGHLIGHT : OK;
            const fill = i === one && redirectLit > 0 ? solid : `color-mix(in srgb, ${solid} 70%, ${PAPER})`;
            return <rect key={i} x={x} y={top} width={COL.w} height={base - top} fill={fill} rx={3} opacity={i === one ? 1 : 1 - 0.5 * redirectLit} />;
          })}
          {/* One user's links, a dot each on the shard that holds it: every shard has some. */}
          {SHARDS.userPerShard.map((count, i) =>
            Array.from({ length: count }, (_, k) => {
              const p = ease(frame, allAt + i * 2 + k, 6);
              return p > 0 ? (
                <circle key={`${i}-${k}`} cx={colX(HASH_X, i) + COL.w / 2} cy={base - 9 - k * dotStep} r={5.2 * p} fill={ACCENT} stroke={PAPER} strokeWidth={1.6} />
              ) : null;
            }),
          )}
          <line x1={HASH_X} x2={colX(HASH_X, 7) + COL.w} y1={base + 1} y2={base + 1} stroke={INK_SOFT} strokeWidth={1.4} />
          <line
            x1={HASH_X - 10}
            x2={colX(HASH_X, 7) + COL.w + 10}
            y1={evenY}
            y2={evenY}
            stroke={INK}
            strokeWidth={1.6}
            strokeDasharray="6 5"
            opacity={ease(frame, withinAt, 10)}
          />
        </Svg>
        {/* A ninth shard: what moves, by modulo and on a hash ring. */}
        <Line at={ninthAt} x={1490} y={y(744)} size={21} weight={500} color={INK}>
          add a ninth shard:
        </Line>
        <Line at={modAt} x={1490} y={y(744) + h(36)} size={21} weight={500} color={ACCENT_INK}>
          modulo moves <Num>{pct(RESHARD.shareMod)}</Num>
        </Line>
        <Line at={ringAt} x={1490} y={y(744) + h(72)} size={21} weight={500} color={OK_INK}>
          a hash ring moves <Num>{pct(RESHARD.shareRing)}</Num>
        </Line>

        {/* One redirect lights one shard; one user's links light all eight. */}
        <Ink at={redirectAt} dur={10} out={listAt} style={{ left: colX(HASH_X, one) - 40, top: base + 10, whiteSpace: "nowrap" }}>
          <span style={{ ...label(21, INK), fontWeight: 500 }}>a redirect</span>
        </Ink>
        <Ink at={allAt} dur={12} style={{ left: HASH_X, top: base + 10, whiteSpace: "nowrap" }}>
          <span style={{ ...label(21, ACCENT_INK), fontWeight: 500 }}>
            one user&apos;s <Num>{SHARDS.userLinks}</Num> links, a dot each: all <Num>{SHARDS.userShards}</Num> shards
            <span style={{ color: INK_SOFT, fontWeight: 500, opacity: ease(frame, priceAt, 10) }}>, the price of a cross-shard query</span>
          </span>
        </Ink>
        <Node x={1500} y={y(392)} w={240} h={92} at={copyAt + 4} tone="ok" title="links by user" sub="a second copy" size={22} />
        <Line at={copyAt + 10} x={1500} y={y(392) + 92 + h(18)} size={20} color={OK_INK} weight={500}>
          one shard for that page
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
