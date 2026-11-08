import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Ink, NextLine, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { FEED, TRAFFIC } from "./data";
import { commas, Drift, Flow, Line, Mark, Node, OK, OK_INK, Q_SIZE, Q_W, roundTo, Spot, VRule, X0 } from "./parts";

const PUSH = { poster: { x: X0, w: 150, h: 64 }, feed: { x: 470, w: 250, h: 52 }, mids: [392, 456, 520, 584] };
const PULL = { x: 1000, grid: { cols: 20, rows: 15, cell: 12, gap: 3 }, feed: { x: 1520, w: 250, h: 64, mid: 488 } };
const POST_ID = 81;

/** The grown design, for the close: x positions and row centres. */
const GROWN = {
  client: { x: X0, w: 140 },
  limit: { x: 320, w: 170 },
  lb: { x: 540, w: 190 },
  app: { x: 800, w: 150, h: 40, first: 404, step: 58, n: 6 },
  cache: { x: 1060, w: 210, mid: 430 },
  queue: { x: 1060, w: 210, mid: 560 },
  store: { x: 1360, w: 34, gap: 9, mid: 690, h: 70 },
  mid: 560,
};

/**
 * Question 12, the close: the news feed, where fan-out is the whole question.
 * Push copies each post's ID into every follower's feed (cheap to read, a
 * write storm for a celebrity); pull assembles a feed from everyone followed
 * (cheap to post, three hundred reads a load); feeds are read far more than
 * posted, so push, mixed with pull for celebrities. Then the shortener grown
 * for ten times its traffic, every arrow between its boxes an API.
 */
export const FeedScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q12").from;
  const qAt = n.word("q12", "Question twelve");
  const textAt = n.word("q12", "Design a news feed");
  const pushAt = n.word("q12", "Fan-out on write, or push");
  const copiesAt = n.word("q12", "copies each new post's ID");
  const everyAt = n.word("q12", "every follower's precomputed feed");
  const lookupAt = n.word("q12", "reading one is a cheap lookup");
  const perAt = n.word("q12-storm", "Its cost is per follower");
  const twoHAt = n.word("q12-storm", "two hundred followers, two hundred writes");
  const celebAt = n.word("q12-storm", "A celebrity with fifty million followers");
  const fiftyAt = n.word("q12-storm", "fifty million writes from one post");
  const stormAt = n.word("q12-storm", "a write storm");
  const pullAt = n.word("q12-pull", "Fan-out on read, or pull");
  const buildsAt = n.word("q12-pull", "builds the feed on request");
  const cheapAt = n.word("q12-pull", "Posting is cheap");
  const followAt = n.word("q12-pull", "follow three hundred accounts");
  const loadAt = n.word("q12-pull", "every load reads three hundred timelines");
  const readAt = n.word("q12-why", "Feeds are read far more often than people post");
  const winsAt = n.word("q12-why", "push usually wins");
  const onceAt = n.word("q12-why", "once per post");
  const everyLoadAt = n.word("q12-why", "not on every load");
  const mixAt = n.word("q12-hybrid", "real systems mix them");
  const ordinaryAt = n.word("q12-hybrid", "push for ordinary accounts");
  const celebsAt = n.word("q12-hybrid", "pull for celebrities");
  const mergedAt = n.word("q12-hybrid", "merged at read time");
  const fiveAt = n.word("q12-hybrid", "Follow five celebrities");
  const sixAt = n.word("q12-hybrid", "a load is six reads");
  const noPostAt = n.word("q12-hybrid", "no post costs fifty million writes");
  const designAt = n.word("next", "That's the design");
  const grownAt = n.word("next", "grown for ten times the traffic");
  const apiAt = n.word("next-api", "through an API");
  const nextAt = n.word("next-api", "Next:");
  const end = n.beat("next-api").to;

  const feedOut = designAt - 8;
  const posterMid = y(488);
  const fMid = PUSH.mids.map((m) => y(m));
  const drop = (i: number) => ease(frame, everyAt + i * 4, 12);
  const lookup = ease(frame, lookupAt, 10);
  const why = ease(frame, winsAt, 10);
  const hybridIn = mixAt - 4;

  // ── Pull: 300 followed accounts' timelines, read on request. ──
  const g = PULL.grid;
  const gridTop = y(392);
  const cellAt = (k: number) => buildsAt + (k % 20) * 0.6 + Math.floor(k / 20) * 0.4;
  const gather = ease(frame, loadAt, 20);

  // ── Hybrid: the precomputed list and five celebrity timelines. ──
  const hyTop = y(712);

  // ── The close: the grown design. ──
  const G = GROWN;
  const gm = y(G.mid);
  const appMid = (k: number) => y(G.app.first) + k * h(G.app.step);
  const lit = (k: number) => Math.min(ease(frame, designAt + k * 5, 8), 1 - ease(frame, designAt + k * 5 + 22, 10));
  const api = ease(frame, apiAt, 12);
  const edge = BAR;
  const edgeW = 2.4;
  const tenfold = roundTo(TRAFFIC.peak, 2);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={textAt + 6} level={-30} />
      <Sfx name="el-sprinkle" at={everyAt} level={-32} />
      <Sfx name="el-tap" at={lookupAt} level={-31} />
      <Sfx name="el-tap" at={twoHAt} level={-31} />
      <Sfx name="el-scratch" at={stormAt} level={-31} />
      <Sfx name="el-sprinkle" at={buildsAt} level={-32} />
      <Sfx name="el-tap" at={loadAt + 6} level={-30} />
      <Sfx name="el-tap" at={winsAt} level={-30} />
      <Sfx name="el-sprinkle" at={fiveAt} level={-32} />
      <Sfx name="el-chime" at={sixAt + 8} level={-33} />
      <Sfx name="el-whoosh" at={designAt - 4} level={-36} />
      <Sfx name="el-sprinkle" at={designAt + 6} level={-33} />
      <Sfx name="el-pencil" at={apiAt} level={-34} />
      <Sfx name="el-pencil" at={nextAt} level={-34} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={12} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE} width={Q_W} out={feedOut}>
          Design a news feed, fan-out on write or on read?
        </QuestionCard>
        <Spot id="newspaper" at={textAt + 6} x={1610} y={y(130)} w={170} out={feedOut} />

        {/* ── Push: each post's ID into every follower's feed. ── */}
        <Line at={pushAt} x={X0} y={y(330)} size={24} weight={600} out={feedOut}>
          <Mark at={winsAt} out={hybridIn} color={`color-mix(in srgb, ${OK} 30%, transparent)`}>
            Fan-out on write: push
          </Mark>
        </Line>
        <Node x={PUSH.poster.x} y={posterMid - PUSH.poster.h / 2} w={PUSH.poster.w} h={PUSH.poster.h} at={pushAt + 4} tone="plain" title="poster" size={22} out={feedOut} />
        {fMid.map((m, i) => (
          <React.Fragment key={i}>
            <Flow
              points={[
                [PUSH.poster.x + PUSH.poster.w + 6, posterMid + (i - 1.5) * 10],
                [PUSH.poster.x + PUSH.poster.w + 60, posterMid + (i - 1.5) * 10],
                [PUSH.poster.x + PUSH.poster.w + 60, m],
                [PUSH.feed.x - 8, m],
              ]}
              at={copiesAt + i * 3}
              color={BAR}
              width={2.2}
              head={12}
              out={feedOut}
            />
            <Node
              x={PUSH.feed.x}
              y={m - PUSH.feed.h / 2}
              w={PUSH.feed.w}
              h={PUSH.feed.h}
              at={pushAt + 8 + i * 3}
              tone={i === 0 && lookup > 0.5 ? "ok" : "data"}
              title={`follower ${i + 1}'s feed`}
              size={20}
              out={feedOut}
            />
            {drop(i) > 0 && frame < feedOut + 10 ? (
              <div
                style={{
                  position: "absolute",
                  left: PUSH.feed.x + PUSH.feed.w + 14,
                  top: m - 16 - (1 - drop(i)) * 20,
                  padding: "3px 9px",
                  borderRadius: 7,
                  background: BAR,
                  ...label(19, PAPER),
                  fontWeight: 600,
                  opacity: drop(i) * (1 - ease(frame, feedOut, 10)),
                }}
              >
                post <Num>{POST_ID}</Num>
              </div>
            ) : null}
          </React.Fragment>
        ))}
        <Line at={lookupAt} x={X0} y={y(640)} size={22} color={OK_INK} weight={650} out={feedOut}>
          reading a feed: one cheap lookup
        </Line>
        <Line at={perAt} x={X0} y={y(690)} size={22} out={hybridIn}>
          cost per post: one write per follower
        </Line>
        <Line at={twoHAt} x={X0} y={y(736)} size={22} out={hybridIn}>
          <Num>{FEED.ordinaryFollowers}</Num> followers: <b><Num>{FEED.pushWritesOrdinary}</Num> writes</b>
        </Line>
        <Line at={celebAt} x={X0} y={y(782)} size={22} color={ACCENT_INK} out={hybridIn}>
          <Num>{commas(FEED.celebrityFollowers)}</Num> followers:
          <b style={{ opacity: ease(frame, fiftyAt, 10) }}>
            {" "}
            <Num>{commas(FEED.pushWritesCelebrity)}</Num> writes
          </b>
          <b style={{ opacity: ease(frame, stormAt, 10) }}>, a write storm</b>
        </Line>

        <VRule x={910} top={y(330)} bottom={y(716)} at={pullAt} out={hybridIn} />

        {/* ── Pull: the feed built on request from everyone followed. ── */}
        <Line at={pullAt} x={PULL.x} y={y(330)} size={24} weight={600} out={feedOut}>
          Fan-out on read: pull
        </Line>
        {Array.from({ length: g.cols * g.rows }, (_, k) => {
          const p = ease(frame, cellAt(k), 6);
          if (p <= 0 || frame > feedOut + 10) return null;
          const c = k % g.cols;
          const r = Math.floor(k / g.cols);
          return (
            <div
              key={k}
              style={{
                position: "absolute",
                left: PULL.x + c * (g.cell + g.gap),
                top: gridTop + r * (g.cell + g.gap),
                width: g.cell,
                height: g.cell,
                borderRadius: 2,
                background: gather > 0.5 ? ACCENT : BAR,
                opacity: p * (1 - ease(frame, feedOut, 10)) * (gather > 0 ? 1 : 0.7),
              }}
            />
          );
        })}
        <Line at={followAt} x={PULL.x} y={gridTop + g.rows * (g.cell + g.gap) + h(16)} size={20} color={INK_SOFT} out={feedOut}>
          <Num>{FEED.following}</Num> accounts followed, a timeline each
        </Line>
        <Flow points={[[PULL.x + g.cols * (g.cell + g.gap) + 10, y(PULL.feed.mid)], [PULL.feed.x - 8, y(PULL.feed.mid)]]} at={buildsAt + 10} color={gather > 0.5 ? ACCENT : BAR} width={2.4 + gather * 2} out={feedOut} />
        <Node x={PULL.feed.x} y={y(PULL.feed.mid) - PULL.feed.h / 2} w={PULL.feed.w} h={PULL.feed.h} at={buildsAt + 12} tone="data" title="your feed" sub="built on request" size={22} out={feedOut} />
        <Line at={cheapAt} x={PULL.feed.x} y={y(PULL.feed.mid) + PULL.feed.h / 2 + h(20)} size={20} color={INK_SOFT} out={feedOut}>
          posting is cheap
        </Line>
        <Line at={loadAt + 6} x={PULL.x} y={y(690)} size={22} weight={600} color={ACCENT_INK} out={hybridIn}>
          every load: <Num>{FEED.pullReads}</Num> reads
        </Line>

        {/* ── Why push usually wins. ── */}
        <Line at={readAt} x={X0} y={y(850)} size={22} weight={650} out={hybridIn}>
          Feeds are read far more often than people post:
          <span style={{ color: OK_INK, opacity: ease(frame, onceAt, 10) }}> push works once per post</span>
          <span style={{ color: ACCENT_INK, opacity: ease(frame, everyLoadAt, 10) }}>, pull on every load</span>
        </Line>
        {why > 0 ? (
          <div style={{ position: "absolute", left: X0 - 40, top: y(330) + 2, opacity: why * (1 - ease(frame, feedOut, 10)) }}>
            <Tick at={winsAt + 4} size={28} />
          </div>
        ) : null}

        {/* ── The hybrid: push for most, pull for celebrities, merged. ── */}
        <Line at={mixAt} x={X0} y={hyTop - h(14)} size={23} weight={600} color={OK_INK} out={feedOut}>
          Real systems mix them
          <span style={{ color: INK, fontWeight: 500, opacity: ease(frame, ordinaryAt, 10) }}>: push for ordinary accounts,</span>
          <span style={{ color: INK, fontWeight: 500, opacity: ease(frame, celebsAt, 10) }}> pull for celebrities,</span>
          <span style={{ color: INK, fontWeight: 500, opacity: ease(frame, mergedAt, 10) }}> merged at read time</span>
        </Line>
        <Node x={X0} y={hyTop + h(40)} w={250} h={56} at={ordinaryAt + 4} tone="ok" title="precomputed list" size={21} out={feedOut} />
        {Array.from({ length: FEED.celebritiesFollowed }, (_, i) => (
          <Node key={i} x={X0 + 290 + i * 120} y={hyTop + h(40)} w={104} h={56} at={fiveAt + 4 + i * 3} tone="ok" title={`celeb ${i + 1}`} size={21} out={feedOut} />
        ))}
        <Line at={sixAt} x={X0 + 290 + 5 * 120 + 30} y={hyTop + h(40) + 12} size={22} weight={600} color={OK_INK} out={feedOut}>
          1 + <Num>{FEED.celebritiesFollowed}</Num> = <Num>{FEED.hybridReads}</Num> reads, not <Num>{FEED.pullReads}</Num>
        </Line>
        <Line at={noPostAt} x={X0} y={hyTop + h(40) + 80} size={21} color={INK_SOFT} out={feedOut}>
          and a celebrity&apos;s post is no longer pushed: no post costs <Num>{commas(FEED.pushWritesCelebrity)}</Num> writes
        </Line>

        {/* ── The close: the shortener, grown for ten times the traffic. ── */}
        <Ink at={grownAt - 6} dur={16} style={{ left: X0, top: y(300), whiteSpace: "nowrap" }}>
          <span style={{ ...note(34, INK), fontWeight: 600 }}>
            The design, grown: <span style={{ color: BLUE_INK }}><Num>{commas(tenfold)}</Num> redirects a second</span>
          </span>
        </Ink>
        <Node x={G.client.x} y={gm - 32} w={G.client.w} h={64} at={designAt} tone="plain" title="client" size={21} lit={lit(0)} />
        <Node x={G.limit.x} y={gm - 32} w={G.limit.w} h={64} at={designAt + 2} tone="plain" title="rate limiter" size={21} lit={lit(1)} />
        <Node x={G.lb.x} y={gm - 32} w={G.lb.w} h={64} at={designAt + 4} tone="plain" title="load balancer" size={21} lit={lit(2)} />
        {Array.from({ length: G.app.n }, (_, k) => (
          <Node key={k} x={G.app.x} y={appMid(k) - G.app.h / 2} w={G.app.w} h={G.app.h} at={designAt + 6 + k} tone="plain" title="app" size={19} lit={lit(3)} />
        ))}
        <Node x={G.cache.x + 12} y={y(G.cache.mid) - 32 + 12} w={G.cache.w} h={64} at={designAt + 12} tone="data" lit={lit(4)} />
        <Node x={G.cache.x} y={y(G.cache.mid) - 32} w={G.cache.w} h={64} at={designAt + 12} tone="data" title="cache + replica" size={21} lit={lit(4)} />
        <Node x={G.queue.x} y={y(G.queue.mid) - 32} w={G.queue.w} h={64} at={designAt + 14} tone="data" title="queue + workers" size={21} lit={lit(5)} />
        {Array.from({ length: 8 }, (_, k) => (
          <Node key={k} x={G.store.x + k * (G.store.w + G.store.gap)} y={y(G.store.mid) - G.store.h / 2} w={G.store.w} h={G.store.h} at={designAt + 16 + k} tone="data" lit={lit(6)} />
        ))}
        <Ink at={designAt + 20} dur={12} style={{ left: G.store.x, top: y(G.store.mid) + G.store.h / 2 + 12, whiteSpace: "nowrap" }}>
          <span style={{ ...label(20, BLUE_INK), fontWeight: 600 }}>8 shards, each with followers</span>
        </Ink>
        {/* Every arrow between them. */}
        <Flow points={[[G.client.x + G.client.w + 6, gm], [G.limit.x - 8, gm]]} at={designAt + 4} color={edge} width={edgeW} glow={api} head={12} />
        <Flow points={[[G.limit.x + G.limit.w + 6, gm], [G.lb.x - 8, gm]]} at={designAt + 6} color={edge} width={edgeW} glow={api} head={12} />
        {Array.from({ length: G.app.n }, (_, k) => (
          <Flow
            key={k}
            points={[
              [G.lb.x + G.lb.w + 6, gm + (k - 2.5) * 6],
              [G.lb.x + G.lb.w + 30, gm + (k - 2.5) * 6],
              [G.lb.x + G.lb.w + 30, appMid(k)],
              [G.app.x - 8, appMid(k)],
            ]}
            at={designAt + 8 + k}
            color={edge}
            width={edgeW - 0.4} glow={api}
            head={10}
          />
        ))}
        <Flow points={[[G.app.x + G.app.w + 6, appMid(0)], [G.app.x + G.app.w + 40, appMid(0)], [G.app.x + G.app.w + 40, y(G.cache.mid)], [G.cache.x - 8, y(G.cache.mid)]]} at={designAt + 14} color={edge} width={edgeW} glow={api} head={12} />
        <Flow points={[[G.app.x + G.app.w + 6, appMid(2) + 14], [G.queue.x - 8, appMid(2) + 14]]} at={designAt + 16} color={edge} width={edgeW} glow={api} head={12} />
        <Flow points={[[G.app.x + G.app.w + 6, appMid(5)], [G.store.x - 8, appMid(5)]]} at={designAt + 18} color={edge} width={edgeW} glow={api} head={12} />
        <Flow
          points={[
            [G.queue.x + G.queue.w + 6, y(G.queue.mid)],
            [G.queue.x + G.queue.w + 40, y(G.queue.mid)],
            [G.queue.x + G.queue.w + 40, y(G.store.mid) - G.store.h / 2 - 30],
            [G.store.x + 4 * (G.store.w + G.store.gap) - G.store.gap / 2, y(G.store.mid) - G.store.h / 2 - 30],
            [G.store.x + 4 * (G.store.w + G.store.gap) - G.store.gap / 2, y(G.store.mid) - G.store.h / 2 - 8],
          ]}
          at={designAt + 20}
          color={edge}
          width={edgeW} glow={api}
          head={12}
        />
        <Ink at={apiAt + 4} dur={14} style={{ left: G.cache.x + G.cache.w + 50, top: y(G.cache.mid) - 18, whiteSpace: "nowrap" }}>
          <span style={{ ...note(22, INK), fontWeight: 600 }}>
            every arrow: <Mark at={apiAt + 6}>an API</Mark>
          </span>
        </Ink>
        <NextLine at={nextAt} x={X0} y={y(820)} width={900}>
          API design
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
