import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { Pt } from "../../components/arrow";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, note } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ESTIMATE, KEY, LADDER } from "./data";
import { diagramBoxes, SIDE_A, SIDE_B, sideRoute } from "./diagram";
import { along, Arrow, between, Box, Cross, Drift, Headline, int, Kicker, Line, OK_INK, Ring, Traveller, X0 } from "./parts";

const RX = 1460;
const HOP_MS = LADDER.levels.find((l) => l.name === "Network round trip")!.ns / 1e6;
const SSD_MS = LADDER.levels.find((l) => l.name === "NVMe SSD read")!.ns / 1e6;

/** A round trip along `pts`: out and back over `dur` frames from `from`. */
const RoundTrip: React.FC<{ pts: readonly Pt[]; from: number; dur?: number; color?: string }> = ({ pts, from, dur = 24, color = BAR }) => (
  <Traveller points={[...pts, ...[...pts].reverse().slice(1)]} from={from} to={from + dur} color={color} out={from + dur + 2} r={8} />
);

/**
 * Question 3, the diagram (system-design.mdx's, box by box as it is named):
 * a key-value store, a cache in front of it at a hundred reads to a write,
 * and stateless app servers behind a load balancer, where scaling out is one
 * more. Then one redirect through it on the latency ladder: two round trips
 * on a cache hit, about a millisecond; a miss adds a third and an SSD read,
 * about 1.6 ms (network time only); a miss is drawn hollow, not red, since
 * it is the normal path for a link's first read. The follow-ups: a single
 * counter is a bottleneck and one more thing that can fail, so each server
 * takes a block of a million IDs, which the counter still hands out, once a
 * block (the blocks start at check.mjs's, so the first holds the counted IDs
 * below); counted IDs make consecutive keys (check.mjs encodes the video's
 * own three); and the edges question one raised, custom aliases and expiry.
 */
export const DiagramScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();
  const B = diagramBoxes(y);

  const from = n.beat("q3-diagram").from;
  const storeAt = n.word("q3-diagram", "a key-value store");
  const byKeyAt = n.word("q3-diagram", "every lookup is by key");
  const cacheAt = n.word("q3-diagram", "Put a cache in front of it");
  const ratioAt = n.word("q3-diagram", "reads outnumber writes a hundred to one");
  const appsAt = n.word("q3-diagram", "keep the app servers");
  const statelessAt = n.word("q3-diagram", "stateless");
  const lbAt = n.word("q3-diagram", "behind a load balancer");
  const addAt = n.word("q3-diagram", "scaling out is just adding one");
  const followAt = n.word("q3-path", "Follow one redirect through it");
  const hitAt = n.word("q3-path", "On a cache hit");
  const tripsAt = n.word("q3-path", "two round trips inside the data center");
  const msAt = n.word("q3-path", "about a millisecond by the ladder");
  const missAt = n.word("q3-path", "A miss adds a third");
  const storeTripAt = n.word("q3-path", "to the store");
  const ssdAt = n.word("q3-path", "and an SSD read");
  const sixAt = n.word("q3-path", "about one point six milliseconds");
  const askAt = n.word("q3-counter", "One counter that every server asks");
  const bottleAt = n.word("q3-counter", "is a bottleneck");
  const failAt = n.word("q3-counter", "one more thing that can fail");
  const blockAt = n.word("q3-blocks", "Hand each server a block of IDs instead");
  const millionAt = n.word("q3-blocks", "a million at a time");
  const ownAt = n.word("q3-blocks", "it counts on its own");
  const stillAt = n.word("q3-coord", "The counter still hands out the blocks");
  const onceAt = n.word("q3-coord", "asked once per million IDs");
  const gapAt = n.word("q3-coord", "a server that dies just leaves a gap");
  const consecAt = n.word("q3-guess", "counted IDs make consecutive keys");
  const walkAt = n.word("q3-guess", "anyone can walk through everyone's links");
  const scrambleAt = n.word("q3-guess", "scramble the ID before encoding it");
  const useHashAt = n.word("q3-guess", "or use the hash");
  const aliasAt = n.word("q3-edges", "Custom aliases share the key space");
  const freeAt = n.word("q3-edges", "stored only if free");
  const expiryAt = n.word("q3-edges", "expiry is a column the redirect checks");
  const end = n.beat("q3-edges").to;

  // The edges, as the boxes stand.
  const e = {
    clientLb: between(B.client, B.lb),
    lbApp1: between(B.lb, B.app1),
    lbApp2: between(B.lb, B.app2),
    app1Cache: between(B.app1, B.cache),
    app2Cache: between(B.app2, B.cache),
    app1Store: sideRoute(B.app1, B.store, SIDE_A),
    app2Store: sideRoute(B.app2, B.store, SIDE_B),
  };
  const ghost = { ...B.cache, cy: B.app1.cy, w: 200, h: 82 };
  const ghostOut = followAt - 10;
  const counter = { cx: 960, cy: B.app1.cy, w: 130, h: 62 };
  // The counter stays: blocks take it off every request's path, so its red
  // goes, and it is drawn handing the blocks out.
  const counterCalm = blockAt + 10;

  // One redirect: a hit, then a miss.
  const hit = [hitAt, hitAt + 26] as const;
  // LB to app and back, app to cache and back (the miss lands as the dot
  // reaches the cache), then the third trip, to the store, on its words.
  const miss = [missAt, missAt + 18, Math.max(storeTripAt - 6, missAt + 38)] as const;
  const missMark = ease(frame, miss[1] + 9, 8) * (1 - ease(frame, sixAt + 30, 12));
  // The sums beside the diagram give way to the counter's; the times on the
  // diagram itself hold until the counter is named a bottleneck.
  const sumsOut = askAt - 4;
  const pathOut = bottleAt;

  // The app servers' second line: stateless, then where their block of IDs
  // starts (a block is a million, said beside it).
  const ids = ease(frame, blockAt + 6, 12);
  const sub = (lo: number) => (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span style={{ opacity: ease(frame, statelessAt, 10) * (1 - ids) }}>stateless</span>
      <span style={{ position: "absolute", left: "50%", top: 0, transform: "translateX(-50%)", whiteSpace: "nowrap", color: OK_INK, fontWeight: 500, opacity: ids }}>
        from <Num>{int(lo)}</Num>
      </span>
    </span>
  );

  const keysY = y(306);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={storeAt} level={-34} />
      <Sfx name="el-pop" at={cacheAt + 4} level={-34} />
      <Sfx name="el-pop" at={appsAt + 4} level={-34} />
      <Sfx name="el-pop" at={lbAt + 4} level={-34} />
      <Sfx name="el-tap" at={addAt + 4} level={-36} />
      <Sfx name="el-whoosh" at={hit[0]} level={-38} />
      <Sfx name="el-tap" at={msAt} level={-34} />
      <Sfx name="el-whoosh" at={miss[0]} level={-38} />
      <Sfx name="el-tap" at={miss[1] + 9} level={-37} />
      <Sfx name="el-tap" at={sixAt} level={-34} />
      <Sfx name="el-pop" at={askAt + 4} level={-34} />
      <Sfx name="el-pencil" at={bottleAt} level={-36} />
      <Sfx name="el-scratch" at={failAt + 4} level={-35} />
      <Sfx name="el-chime" at={blockAt + 6} level={-36} />
      <Sfx name="el-tap" at={stillAt + 4} level={-36} />
      <Sfx name="el-tap" at={aliasAt} level={-36} />
      <Sfx name="el-tap" at={consecAt} level={-35} />
      <Sfx name="el-pencil" at={walkAt + 6} level={-36} />
      <Sfx name="el-chime" at={scrambleAt + 4} level={-37} />

      <Drift from={from} to={end + 30}>
        <Kicker at={from}>Question 3 · A URL shortener</Kicker>
        <Headline lead="The first diagram" at={from + 4} size={64} />

        {/* The store, the cache in front of it, the app tier, the balancer. */}
        <Box r={B.store} at={storeAt} title="Key-value store" tone="data" />
        <Line x={B.store.cx} y={B.store.cy + B.store.h / 2 + 22} at={byKeyAt} size={22} color={INK_SOFT} align="center" width={360}>
          every lookup is by key
        </Line>
        <Box r={B.cache} at={cacheAt + 4} title="Cache" tone="data" tones={[{ at: miss[1] + 9, tone: "quiet" }, { at: sixAt + 30, tone: "data" }]} />
        <Line x={B.cache.cx + B.cache.w / 2 + 30} y={B.cache.cy - 15} at={ratioAt} size={22} color={BLUE_INK} weight={500}>
          <Num>{ESTIMATE.assumptions.readsPerWrite}</Num> reads : <Num>1</Num> write
        </Line>
        {(["app1", "app2"] as const).map((k, i) => (
          <Box
            key={k}
            r={B[k]}
            at={appsAt + 4 + i * 4}
            title="App server"
            sub={sub(KEY.blocks[i].lo)}
            tones={[{ at: ownAt, tone: "ok" }]}
          />
        ))}
        <Arrow points={e.app1Cache} at={appsAt + 12} />
        <Arrow points={e.app2Cache} at={appsAt + 16} />
        <Arrow points={e.app1Store} at={appsAt + 14} dur={18} />
        <Arrow points={e.app2Store} at={appsAt + 18} dur={18} />
        <Box r={B.lb} at={lbAt + 4} title="Load balancer" />
        <Arrow points={e.lbApp1} at={lbAt + 10} />
        <Arrow points={e.lbApp2} at={lbAt + 12} />
        <Box r={B.client} at={lbAt + 10} title="Client" tone="quiet" />
        <Arrow points={e.clientLb} at={lbAt + 14} dur={10} />

        {/* Scaling out: one more. */}
        <Box r={ghost} at={addAt + 4} title="App server" sub="one more" dashed tone="quiet" out={ghostOut} />
        <Arrow points={between(B.lb, ghost)} at={addAt + 8} dash="6 6" color={INK_SOFT} out={ghostOut} />

        {/* One redirect: a hit, then a miss. */}
        <Traveller points={e.clientLb} from={followAt} to={followAt + 12} color={BAR} r={8} out={followAt + 14} />
        <RoundTrip pts={e.lbApp1} from={hit[0]} dur={26} />
        <RoundTrip pts={e.app1Cache} from={hit[1]} dur={26} />
        <Line x={B.app1.cx + 20} y={B.lb.cy - 2} at={hit[0] + 14} out={pathOut} size={22} weight={500} color={BLUE_INK}>
          <Num>{HOP_MS}</Num> ms
        </Line>
        <Line x={B.app1.cx + 56} y={B.cache.cy - 4} at={hit[1] + 14} out={pathOut} size={22} weight={500} color={BLUE_INK} align="right">
          <Num>{HOP_MS}</Num> ms
        </Line>
        <RoundTrip pts={e.lbApp1} from={miss[0]} dur={18} />
        <RoundTrip pts={e.app1Cache} from={miss[1]} dur={18} />
        <RoundTrip pts={e.app1Store} from={miss[2]} dur={40} />
        {missMark > 0 ? (
          // Beside the arrow the missed lookup took, app server to cache: a
          // miss is the normal path, so it is named, not crossed out.
          <div style={{ position: "absolute", left: along(e.app1Cache, 0.5)[0] + 16, top: along(e.app1Cache, 0.5)[1] - 34, opacity: missMark, ...note(22, INK), fontWeight: 600 }}>
            miss
          </div>
        ) : null}
        <Line x={SIDE_A - 18} y={(B.app1.cy + B.store.cy) / 2 - 16} at={miss[2] + 18} out={pathOut} size={22} weight={500} color={BLUE_INK} align="right">
          + <Num>{HOP_MS}</Num> ms
        </Line>
        <Line x={SIDE_A - 18} y={B.store.cy - 16} at={ssdAt} out={pathOut} size={22} weight={500} color={BLUE_INK} align="right">
          SSD read + <Num>{SSD_MS}</Num> ms
        </Line>

        {/* The sums, beside it. */}
        <Line x={RX} y={y(296)} at={hitAt} out={sumsOut} size={26} weight={500}>
          Cache hit
        </Line>
        <Line x={RX} y={y(296) + 48} at={tripsAt} out={sumsOut} size={26} weight={500} color={OK_INK}>
          <Num>2</Num> round trips
          <span style={{ opacity: ease(frame, msAt, 10) }}>
            {" "}
            ≈ <Num>{LADDER.path.hitMs}</Num> ms
          </span>
        </Line>
        <Line x={RX} y={y(296) + 128} at={missAt} out={sumsOut} size={26} weight={500}>
          Cache miss
        </Line>
        <Line x={RX} y={y(296) + 176} at={sixAt} out={sumsOut} size={26} weight={500} color={INK}>
          <Num>3</Num> trips + SSD ≈ <Num>{LADDER.path.missMs}</Num> ms
        </Line>
        <Line x={RX} y={y(296) + 228} at={sixAt + 8} out={sumsOut} size={21} color={INK_SOFT}>
          network time only, from the ladder
        </Line>

        {/* The counter, and the blocks that replace it. */}
        <Box r={counter} at={askAt} title="counter" tone="bad" tones={[{ at: counterCalm, tone: "plain" }]} />
        <Arrow points={[[B.app1.cx + B.app1.w / 2 + 8, counter.cy], [counter.cx - counter.w / 2 - 8, counter.cy]]} at={askAt + 6} dur={8} head={11} color={ACCENT} out={counterCalm} />
        <Arrow points={[[B.app2.cx - B.app2.w / 2 - 8, counter.cy], [counter.cx + counter.w / 2 + 8, counter.cy]]} at={askAt + 8} dur={8} head={11} color={ACCENT} out={counterCalm} />
        <Ring r={counter} at={bottleAt} pad={12} out={counterCalm} />
        {frame >= failAt + 4 && frame < counterCalm + 10 ? (
          <div style={{ position: "absolute", left: counter.cx + counter.w / 2 - 6, top: counter.cy - counter.h / 2 - 26, opacity: 1 - ease(frame, counterCalm, 10) }}>
            <Cross at={failAt + 4} size={28} />
          </div>
        ) : null}
        {/* Now it hands each server a block, once a million IDs. */}
        <Arrow points={[[counter.cx - counter.w / 2 - 8, counter.cy], [B.app1.cx + B.app1.w / 2 + 8, counter.cy]]} at={stillAt + 4} dur={10} head={11} dash="5 5" color={INK_SOFT} />
        <Arrow points={[[counter.cx + counter.w / 2 + 8, counter.cy], [B.app2.cx - B.app2.w / 2 - 8, counter.cy]]} at={stillAt + 6} dur={10} head={11} dash="5 5" color={INK_SOFT} />
        <Line x={RX} y={y(296)} at={askAt + 8} size={26} weight={500}>
          One shared counter
        </Line>
        <Line x={RX} y={y(296) + 48} at={bottleAt} size={26} weight={500} color={ACCENT_INK} dim={blockAt}>
          a bottleneck
        </Line>
        <Line x={RX} y={y(296) + 96} at={failAt} size={26} weight={500} color={ACCENT_INK} dim={blockAt}>
          and one more thing to fail
        </Line>
        <Line x={RX} y={y(296) + 176} at={blockAt} size={26} weight={500} color={OK_INK}>
          A block of IDs per server
        </Line>
        <Line x={RX} y={y(296) + 224} at={millionAt} size={26} weight={500} color={OK_INK}>
          <Num>{int(KEY.idBlock)}</Num> at a time
        </Line>
        <Line x={RX} y={y(296) + 300} at={stillAt} size={24} weight={500}>
          The counter hands them out,
        </Line>
        <Line x={RX} y={y(296) + 340} at={onceAt} size={24} weight={500} color={INK_SOFT}>
          asked once per <Num>{int(KEY.idBlock)}</Num> IDs
        </Line>
        <Line x={RX} y={y(296) + 380} at={gapAt} size={24} weight={500} color={INK_SOFT}>
          a dead server leaves a gap
        </Line>

        {/* Counted IDs, consecutive keys. */}
        <Line x={X0} y={keysY} at={consecAt} size={25} weight={500}>
          Counted IDs, consecutive keys
        </Line>
        {KEY.counted.map((c, i) => (
          <Line key={c.id} x={X0} y={keysY + 56 + i * 52} at={consecAt + 6 + i * 4} size={24}>
            <Num>{int(c.id)}</Num>
            <span style={{ color: INK_SOFT }}> → </span>
            <span style={{ fontFamily: MONO, fontWeight: 500, fontSize: 24 }}>
              {c.key.slice(0, -1)}
              <span style={{ color: frame >= walkAt ? ACCENT_INK : INK }}>{c.key.slice(-1)}</span>
            </span>
          </Line>
        ))}
        <Line x={X0} y={keysY + 228} at={walkAt + 6} size={23} weight={500} color={ACCENT_INK} width={360}>
          anyone can walk through them
        </Line>
        <Line x={X0} y={keysY + 290} at={scrambleAt} size={23} weight={500} color={OK_INK}>
          Scramble the ID first,
        </Line>
        <Line x={X0} y={keysY + 330} at={useHashAt} size={23} weight={500} color={OK_INK}>
          or use the hash
        </Line>

        {/* Question one's edges, answered. */}
        <Line x={X0} y={keysY + 412} at={aliasAt} size={23} weight={500} width={380}>
          Custom aliases: the same keys,
        </Line>
        <Line x={X0} y={keysY + 452} at={freeAt} size={23} weight={500} color={INK_SOFT} width={380}>
          stored only if free
        </Line>
        <Line x={X0} y={keysY + 512} at={expiryAt} size={23} weight={500} width={380}>
          Expiry: a column
        </Line>
        <Line x={X0} y={keysY + 552} at={expiryAt + 8} size={23} weight={500} color={INK_SOFT} width={380}>
          the redirect checks
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
