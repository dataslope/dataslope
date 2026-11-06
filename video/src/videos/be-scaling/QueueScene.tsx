import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Ink, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Flow, Line, Mark, MiniMap, Node, OK, OK_INK, Q_SIZE, Q_W, Spot, Svg, X0 } from "./parts";

const ROW = 450;
const CLIENT = { x: X0, w: 150, h: 70 };
const REDIRECT = { x: 340, w: 220, h: 80 };
const QUEUE = { x: 640, w: 400, h: 64 };
const WORKER = { x: 1110, w: 170, h: 58, mids: [400, 500] };
const STORE = { x: 1380, w: 320 };
const TOKEN = { w: 40, h: 34, step: 46 };
/** A click's ID, as a small solid chip. */
const chip = (fill: string): React.CSSProperties => ({ ...label(20, PAPER), fontWeight: 700, padding: "4px 8px", borderRadius: 7, background: fill });

/**
 * Question 8: a click counted in the database inside the redirect, and a
 * viral link's spike landing there; then the click queued instead, workers
 * draining it at their own pace while a burst only lengthens it. Then the
 * price: a worker that crashes before its ack gets the click again, and the
 * count and the seen IDs in one transaction let the repeat change nothing.
 */
export const QueueScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q8").from;
  const qAt = n.word("q8", "Question eight");
  const textAt = n.word("q8", "When do you introduce a message queue");
  const insideAt = n.word("q8", "doesn't need to finish inside the request");
  const countingAt = n.word("q8", "Counting clicks in the database");
  const waitAt = n.word("q8", "makes every redirect wait on a write");
  const spikeAt = n.word("q8", "a viral link's whole spike");
  const queueAt = n.word("q8-queue", "Queue each click instead");
  const returnsAt = n.word("q8-queue", "The redirect returns at once");
  const drainAt = n.word("q8-queue", "workers drain the queue");
  const burstAt = n.word("q8-queue", "a burst just makes it longer");
  const slowAt = n.word("q8-queue", "Slow work");
  const emailAt = n.word("q8-queue", "like email or video transcoding");
  const priceAt = n.word("q8-once", "The price is at-least-once delivery");
  const crashAt = n.word("q8-once", "a worker that crashes before acknowledging");
  const againAt = n.word("q8-once", "gets the click again");
  const idemAt = n.word("q8-once", "make the consumer idempotent");
  const idAt = n.word("q8-once", "give each click an ID");
  const txAt = n.word("q8-once", "record the ID in the same transaction");
  const repeatAt = n.word("q8-once", "a repeat changes nothing");
  const behindAt = n.word("q8-once", "The totals now run a little behind");
  const end = n.beat("q8-once").to;

  const mid = y(ROW);
  const queueIn = ease(frame, queueAt, 14);
  const oldOut = queueAt;

  // ── The stream: clicks arrive, a burst among them, and drain at a steady
  // rate; each click's arrival and departure are fixed frames. ──
  const arrivals: number[] = [];
  for (let f = drainAt - 30; f < priceAt; f += 26) arrivals.push(f);
  for (let k = 0; k < 7; k++) arrivals.push(burstAt + k * 3);
  arrivals.sort((a, b) => a - b);
  const departures: number[] = [];
  arrivals.forEach((a, i) => departures.push(Math.max(a + 30, (departures[i - 1] ?? 0) + 20)));
  const right = QUEUE.x + QUEUE.w - 10;
  const tokens = arrivals.map((a, i) => {
    if (frame < a || frame > departures[i] + 10) return null;
    // Slots ahead of this click that are still queued, eased as each leaves.
    let ahead = 0;
    for (let j = 0; j < i; j++) if (frame >= arrivals[j]) ahead += 1 - ease(frame, departures[j], 10);
    const target = right - TOKEN.w - ahead * TOKEN.step;
    const x = QUEUE.x + 6 + (target - QUEUE.x - 6) * ease(frame, a, 14);
    const leave = ease(frame, departures[i], 10);
    return { i, x: x + leave * 60, o: Math.min(ease(frame, a, 6), 1 - leave) };
  });

  // ── The crash: click 47 into worker 1, which dies before its ack; the click
  // comes round again to worker 2, and the transaction skips it. ──
  const crash = ease(frame, crashAt, 10);
  const again = ease(frame, againAt, 18);
  const recorded = ease(frame, txAt + 8, 10);
  const repeat = ease(frame, repeatAt, 12);
  const storeTop = y(368);
  const storeH = y(620) - storeTop;

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={countingAt} level={-31} />
      <Sfx name="el-scratch" at={spikeAt + 4} level={-32} />
      <Sfx name="el-pop" at={queueAt} level={-30} />
      <Sfx name="el-whoosh" at={returnsAt} level={-36} />
      <Sfx name="el-sprinkle" at={burstAt} level={-32} />
      <Sfx name="el-scratch" at={crashAt} level={-31} />
      <Sfx name="el-whoosh" at={againAt} level={-36} />
      <Sfx name="el-tap" at={txAt + 8} level={-30} />
      <Sfx name="el-tap" at={repeatAt} level={-30} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={8} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE} width={Q_W}>
          When do you introduce a message queue?
        </QuestionCard>
        <MiniMap at={qAt} stage={6} lit={[["store", qAt], ["queue", queueAt]]} grow={{ queue: queueAt }} />
        <Line at={insideAt} x={X0} y={y(334)} size={22} weight={650} color={INK_SOFT}>
          when work doesn&apos;t need to finish inside the request
        </Line>

        {/* ── The request path ── */}
        <Node x={CLIENT.x} y={mid - CLIENT.h / 2} w={CLIENT.w} h={CLIENT.h} at={countingAt - 4} tone="plain" title="client" size={22} />
        <Node x={REDIRECT.x} y={mid - REDIRECT.h / 2} w={REDIRECT.w} h={REDIRECT.h} at={countingAt - 2} tone="plain" title="redirect" size={22} />
        <Flow points={[[CLIENT.x + CLIENT.w + 6, mid - 12], [REDIRECT.x - 8, mid - 12]]} at={countingAt} color={BAR} />
        {/* Before: the count is written inside the request. */}
        <Flow points={[[REDIRECT.x + REDIRECT.w + 6, mid], [STORE.x - 8, mid]]} at={countingAt + 6} color={ACCENT} dur={20} out={oldOut} />
        <Ink at={waitAt} dur={12} out={oldOut} style={{ left: REDIRECT.x + REDIRECT.w + 60, top: mid - 46, whiteSpace: "nowrap" }}>
          <span style={{ ...label(21, ACCENT_INK), fontWeight: 700 }}>count +1, and the redirect waits for it</span>
        </Ink>
        <Node
          x={STORE.x}
          y={storeTop}
          w={STORE.w}
          h={storeH}
          at={countingAt + 8}
          tone={ease(frame, idAt, 10) > 0.5 ? "ok" : "data"}
          dashed={ease(frame, txAt, 10) > 0.5}
          fill={PAPER}
        >
          <div style={{ position: "absolute", top: 14, left: 0, right: 0, textAlign: "center", ...label(22, ease(frame, txAt, 10) > 0.5 ? OK_INK : BLUE_INK), fontWeight: 700 }}>
            {ease(frame, txAt, 10) > 0.5 ? "one transaction" : "database"}
          </div>
          <div style={{ position: "absolute", top: 58, left: 22, ...note(22, INK), whiteSpace: "nowrap" }}>
            clicks: <b><Num>{1203 + (recorded > 0.5 ? 1 : 0)}</Num></b>
          </div>
          <div style={{ position: "absolute", top: 104, left: 22, ...note(21, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, idAt, 10) }}>
            seen IDs: <Num>45 46</Num>
            <span style={{ color: OK_INK, fontWeight: 700, opacity: recorded }}> 47</span>
          </div>
        </Node>
        {/* A viral link's spike, arriving at the database. */}
        <Svg opacity={ease(frame, spikeAt, 10) * (1 - ease(frame, oldOut, 10))}>
          <path
            d={`M${STORE.x},${storeTop + storeH + 110} l60,0 l14,-6 l14,4 l14,-60 l10,58 l14,-4 l20,6 l40,0 l40,2 l90,0`}
            fill="none"
            stroke={ACCENT}
            strokeWidth={3}
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={`${ease(frame, spikeAt, 20)} 1`}
          />
        </Svg>
        <Line at={spikeAt + 6} x={STORE.x} y={storeTop + storeH + 124} size={20} color={ACCENT_INK} weight={650} out={oldOut}>
          a viral link&apos;s whole spike
        </Line>

        {/* ── After: the click is queued; workers drain it. ── */}
        <Svg opacity={queueIn}>
          <rect x={QUEUE.x} y={mid - QUEUE.h / 2} width={QUEUE.w} height={QUEUE.h} rx={12} fill={`color-mix(in srgb, ${BAR} 6%, ${PAPER})`} stroke={BAR} strokeWidth={2.5} />
        </Svg>
        <Ink at={queueAt + 4} dur={12} style={{ left: QUEUE.x, top: mid - QUEUE.h / 2 - 40, whiteSpace: "nowrap" }}>
          <span style={{ ...label(22, BLUE_INK), fontWeight: 700 }}>queue</span>
        </Ink>
        <Flow points={[[REDIRECT.x + REDIRECT.w + 6, mid], [QUEUE.x - 8, mid]]} at={queueAt + 4} color={BAR} />
        {tokens.map((t) =>
          t ? (
            <div
              key={t.i}
              style={{
                position: "absolute",
                left: t.x,
                top: mid - TOKEN.h / 2,
                width: TOKEN.w,
                height: TOKEN.h,
                borderRadius: 7,
                background: BAR,
                opacity: t.o,
              }}
            />
          ) : null,
        )}
        {WORKER.mids.map((m, i) => {
          const dead = i === 0 ? crash : 0;
          return (
            <React.Fragment key={i}>
              <Node
                x={WORKER.x}
                y={y(m) - WORKER.h / 2}
                w={WORKER.w}
                h={WORKER.h}
                at={drainAt + i * 4}
                tone={dead > 0.5 ? "bad" : "plain"}
                title={dead > 0.5 ? "crashed" : "worker"}
                size={21}
              />
              <Flow points={[[WORKER.x + WORKER.w + 6, y(m)], [STORE.x - 8, y(m)]]} at={drainAt + 6 + i * 4} color={BAR} width={2.2} head={12} out={i === 0 ? crashAt : undefined} />
              <Flow points={[[right + 14, mid + (i ? 10 : -10)], [right + 30, mid + (i ? 10 : -10)], [right + 30, y(m)], [WORKER.x - 8, y(m)]]} at={drainAt + 4 + i * 4} color={BAR} width={2} head={11} />
            </React.Fragment>
          );
        })}
        <Line at={drainAt + 8} x={WORKER.x} y={y(WORKER.mids[1]) + WORKER.h / 2 + h(16)} size={20} color={INK_SOFT}>
          at their own pace
        </Line>
        <Flow points={[[REDIRECT.x + REDIRECT.w / 2, mid + REDIRECT.h / 2 + 6], [REDIRECT.x + REDIRECT.w / 2, mid + 110], [CLIENT.x + CLIENT.w / 2, mid + 110], [CLIENT.x + CLIENT.w / 2, mid + CLIENT.h / 2 + 8]]} at={returnsAt} color={OK} width={2.6} />
        <Ink at={returnsAt + 8} dur={12} style={{ left: CLIENT.x + CLIENT.w / 2 + 16, top: mid + 122, whiteSpace: "nowrap" }}>
          <span style={{ ...label(21, OK_INK), fontWeight: 700 }}>returns at once</span>
        </Ink>
        <Ink at={burstAt} dur={12} style={{ left: QUEUE.x, top: mid + QUEUE.h / 2 + 18, whiteSpace: "nowrap" }}>
          <span style={{ ...note(21, INK), fontWeight: 600 }}>
            <Mark at={burstAt + 2}>a burst only makes it longer</Mark>
          </span>
        </Ink>
        <Line at={slowAt} x={QUEUE.x} y={mid + QUEUE.h / 2 + h(66)} size={21} color={INK_SOFT}>
          slow work goes the same way
          <span style={{ color: INK, fontWeight: 650, opacity: ease(frame, emailAt, 10) }}>: email, video transcoding</span>
        </Line>
        <Spot id="conveyor" at={queueAt} x={1590} y={y(730)} w={180} />

        {/* ── The price: at-least-once, and the idempotent consumer. ── */}
        {/* Click 47: into worker 1, which dies; round again to worker 2. */}
        {crash > 0 && again < 1 ? (
          <div style={{ position: "absolute", left: WORKER.x + WORKER.w + 16, top: y(WORKER.mids[0]) - 17, ...chip(ACCENT), opacity: crash * (1 - again) }}>
            <Num>47</Num>
          </div>
        ) : null}
        {again > 0 ? (
          <div
            style={{
              position: "absolute",
              left: WORKER.x + WORKER.w + 16 + (STORE.x + 60 - WORKER.x - WORKER.w - 16) * ease(frame, txAt, 16),
              top: y(WORKER.mids[1]) - 17,
              ...chip(OK),
              opacity: again * (1 - ease(frame, txAt + 14, 8)),
            }}
          >
            <Num>47</Num>
          </div>
        ) : null}
        <Line at={priceAt} x={X0} y={y(712)} size={22} weight={700}>
          At-least-once delivery
          <span style={{ fontWeight: 500, color: INK_SOFT, opacity: ease(frame, crashAt, 10) }}>: a worker that crashes before its ack</span>
          <span style={{ fontWeight: 500, color: ACCENT_INK, opacity: ease(frame, againAt, 10) }}> gets the click again</span>
        </Line>
        <Line at={idemAt} x={X0} y={y(712) + h(46)} size={22} weight={700} color={OK_INK}>
          An idempotent consumer
          <span style={{ fontWeight: 500, color: INK, opacity: ease(frame, idAt, 10) }}>: each click has an ID,</span>
          <span style={{ fontWeight: 500, color: INK, opacity: ease(frame, txAt, 10) }}> recorded in the same transaction as the count</span>
        </Line>
        <Line at={repeatAt} x={X0} y={y(712) + h(92)} size={22} weight={650} color={OK_INK}>
          a repeat of 47 changes nothing
        </Line>
        <Line at={behindAt} x={X0} y={y(712) + h(138)} size={22} color={INK_SOFT}>
          the totals run a little behind
        </Line>
        {repeat > 0 ? (
          <div
            style={{
              position: "absolute",
              left: STORE.x + 30,
              top: storeTop + storeH - 52,
              ...label(20, OK_INK),
              fontWeight: 700,
              whiteSpace: "nowrap",
              opacity: repeat,
            }}
          >
            47 again: seen, skipped
          </div>
        ) : null}
      </Drift>
    </AbsoluteFill>
  );
};
