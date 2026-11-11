import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Illustration } from "../../components/Illustration";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { DEADLOCK, ILLUSTRATIONS, VIDEO } from "./data";
import { Drift, Flow, lerp, LockGlyph, OK_INK, pulse, THREAD, ThreadName, tint, VRule, X0 } from "./parts";

/** The wait-for picture, in layout units: two locks between two threads. */
const A = { x: 410, y: 350, w: 140, h: 64 };
const B = { x: 410, y: 590, w: 140, h: 64 };
const T1 = { x: 140, y: 470, w: 170, h: 64 };
const T2 = { x: 650, y: 470, w: 170, h: 64 };
/** The four conditions, in the page's order, and the fix that breaks each. */
const CONDITIONS = [
  { name: "Mutual exclusion", gloss: "one holder at a time", fix: "one owner, fed by a queue" },
  { name: "Hold and wait", gloss: "holds one, waits for another", fix: "one coarse lock", more: ", or all at once" },
  { name: "No preemption", gloss: "nothing takes a lock away", fix: "a timeout: release, retry" },
  { name: "Circular wait", gloss: "a cycle, each waiting on the next", fix: "one global order: A before B" },
];
const ROW_X = 1060;
/** The chain's column: each link centred here, 40px clear of the rows. */
const LINK_CX = 985;
const ROW0 = 392;
const ROW_H = 110;
const FIX_X = 1470;

/** The page's trace of a deadlock, in the screen's names ("thread 1 takes A"). */
const named = (s: string) => s.replace(/^T(\d)/, "thread $1");
const STUCK = DEADLOCK.opposite.examples[0];
/** A thread's holds and wait in the stuck schedule, for the thread dump. */
const dumpLine = (t: "T1" | "T2") =>
  `${named(t)} holds ${(STUCK.holds[t] ?? []).join(", ")}, waits for ${STUCK.waitsFor[t]}`;
if (!STUCK || STUCK.waitsFor.T1 !== "B" || STUCK.waitsFor.T2 !== "A") throw new Error("deadlock: results.json's schedule is not the one drawn");

/** A chain link, painted (be-concurrency-link, 810x1518): an upright oval
 *  loop washed in blue. Broken, it is be-concurrency-link-open (772x1473),
 *  the same loop in green with a gap cut through its right side, so the chain
 *  comes apart there. Both are drawn in one box, and `open` cross-fades the
 *  first into the second: the closed link holds until the open one is half
 *  in, so the link never thins out on the way. */
const LINK = { w: 810, h: 1518 } as const;
const linkW = (height: number) => (height * LINK.w) / LINK.h;

const Link: React.FC<{ cx: number; cy: number; height: number; at: number; open: number }> = ({ cx, cy, height, at, open }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  if (p <= 0 || !ILLUSTRATIONS) return null;
  const w = linkW(height);
  const fill: React.CSSProperties = { position: "absolute", left: 0, top: 0, width: w, height };
  return (
    <div style={{ position: "absolute", left: cx - w / 2, top: cy - height / 2, width: w, height, opacity: p, transform: `translateY(${(p - 1) * 10}px)` }}>
      {open < 1 ? <Illustration video={VIDEO} id={`${VIDEO}-link`} style={{ ...fill, opacity: Math.min(1, 2 - 2 * open) }} /> : null}
      {open > 0 ? <Illustration video={VIDEO} id={`${VIDEO}-link-open`} style={{ ...fill, opacity: open }} /> : null}
    </div>
  );
};

/**
 * Questions 5 and 6. Two threads, two locks, taken in opposite orders: the
 * schedule results.json found stuck (both first takes first, 2 of the 6
 * schedules), drawn as who holds and who waits, a cycle. Coffman's four
 * conditions as four links of a chain; break one and it can't happen. Then
 * question 6 breaks each in turn, and the left figure redraws for each fix:
 * one lock order (no schedule deadlocks, 0 of 2: thread 1 holds both, thread
 * 2 waits holding nothing); a timeout (the stuck pair again, then thread 2
 * lets go of B, thread 1 takes it, thread 2 waits to retry); one coarse lock
 * (A and B merge into one lock, one holder, one waiter); one owner fed by a
 * queue (both threads send work into a queue that one owner thread drains).
 * Then keep the critical section short; a thread dump to find one that
 * happens anyway (the stuck schedule's own holds and waits); and the
 * livelock that retrying in step can cause.
 */
export const DeadScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("dead").from;
  const qAt = n.word("dead", "Question five");
  const textAt = n.word("dead", "What is a deadlock");
  const setAt = n.word("dead", "A deadlock is a set of threads");
  const foreverAt = n.word("dead", "waiting forever");
  const holdsAt = n.word("dead", "something another one holds");
  const twoAt = n.word("dead-ex", "Two threads, two locks");
  const firstAt = n.word("dead-ex", "The first takes A");
  const wantsBAt = n.word("dead-ex", "then wants B");
  const secondAt = n.word("dead-ex", "The second takes B");
  const wantsAAt = n.word("dead-ex", "then wants A");
  const ifBothAt = n.word("dead-ex", "If both take their first lock");
  const eachAt = n.word("dead-ex", "each waits on the other");
  const coffAt = n.word("dead-four", "Coffman's four conditions");
  const condAt = [
    n.word("dead-four", "Mutual exclusion"),
    n.word("dead-four", "Hold and wait"),
    n.word("dead-four", "No preemption"),
    n.word("dead-four", "And circular wait"),
  ];
  const breakAt = n.word("dead-break", "Break any one");
  const q6At = n.word("prevent", "Question six");
  const q6TextAt = n.word("prevent", "How do you prevent deadlocks");
  const orderAt = n.word("prevent-order", "Circular wait is the usual target");
  const globalAt = n.word("prevent-order", "one global order");
  const getsAt = n.word("prevent-order", "whichever thread gets A also gets B");
  const nothingAt = n.word("prevent-order", "the other waits holding nothing");
  const noSchedAt = n.word("prevent-order", "No schedule deadlocks");
  const timeoutAt = n.word("prevent-timeout", "take a lock with a timeout");
  const givesUpAt = n.word("prevent-timeout", "gives up");
  const releasesAt = n.word("prevent-timeout", "releases its first");
  const triesAt = n.word("prevent-timeout", "tries again");
  const coarseAt = n.word("prevent-hold", "one coarse lock instead of several");
  const noHoldAt = n.word("prevent-hold", "no thread holds one while it waits");
  const allAt = n.word("prevent-all", "take every lock you need at once");
  const shareAt = n.word("prevent-share", "share nothing");
  const queueAt = n.word("prevent-share", "through a queue");
  const shortAt = n.word("prevent-short", "keep critical sections short");
  const lowAt = n.word("prevent-short", "contention stays low");
  const detectAt = n.word("prevent-detect", "If one happens anyway");
  const dumpAt = n.word("prevent-detect", "a thread dump");
  const whomAt = n.word("prevent-detect", "who's waiting on whom");
  const catchAt = n.word("prevent-live", "One catch");
  const lockstepAt = n.word("prevent-live", "retry in lockstep");
  const liveAt = n.word("prevent-live", "That's livelock");
  const end = n.beat("prevent-live").to;

  // Each condition is broken by its fix, in the order question 6 takes them.
  const fixAt = [shareAt, coarseAt, timeoutAt, globalAt];
  // The left figure, fix by fix. One order: thread 1 holds both locks. It
  // lasts until the timeout, which replays the stuck pair and resolves it.
  const ordered = ease(frame, getsAt, 18) * (1 - ease(frame, timeoutAt, 12));
  const released = ease(frame, releasesAt, 14);
  const t1GetsB = ease(frame, releasesAt + 12, 14);
  // One coarse lock: A and B close into one. Then one owner and a queue.
  const merge = ease(frame, coarseAt, 18);
  const shared = ease(frame, shareAt - 4, 12);
  const stuck = ease(frame, eachAt, 12) * (1 - ordered) * (1 - released);

  // Page positions.
  const box = (b: { x: number; y: number; w: number; h: number }) => ({ x: b.x, y: y(b.y), w: b.w, h: h(b.h) });
  const a = box(A);
  const b = box(B);
  const t1 = box(T1);
  const t2 = box(T2);
  const aMid = a.y + a.h / 2;
  const bMid = b.y + b.h / 2;
  const t1c = t1.x + t1.w / 2;
  const t2c = t2.x + t2.w / 2;
  const draw = (at: number) => ease(frame, at, 14);
  const path = (pts: [number, number][]) => pts.map(([px, py], i) => `${i ? "L" : "M"}${px},${py}`).join(" ");
  // Holds: thread 1 holds A; B is held by thread 2, then (in one order) by thread 1.
  const holdsA = path([[t1c, t1.y], [t1c, aMid], [a.x, aMid]]);
  const t2HoldsB = path([[t2c, t2.y + t2.h], [t2c, bMid], [b.x + b.w, bMid]]);
  const t1HoldsB = path([[t1c, t1.y + t1.h], [t1c, bMid], [b.x, bMid]]);
  const waitColor = stuck > 0.5 ? ACCENT : INK_SOFT;
  // The threads' row: the merged lock, and the queue, sit on it between them.
  const midY = t1.y + t1.h / 2;
  const t1Edge = t1c + 70;
  const t2Edge = t2c - 66;
  const midX = a.x + a.w / 2;
  const t2B = draw(secondAt + 4) * (1 - released);
  const t1B = Math.max(ease(frame, getsAt, 18) * (1 - ease(frame, timeoutAt, 12)), t1GetsB);
  const lockFade = 1 - merge;
  const QUEUE = { x: midX - 84, w: 168, h: h(50) };
  const carry = (k: number) => {
    const t = frame - (queueAt + 10 + k * 22);
    return t < 0 ? -1 : (t % 44) / 44;
  };

  const rowY = (i: number) => y(ROW0) + i * h(ROW_H);
  // One link per row, a little taller than the row so the four meet end to
  // end as a chain; each is centred on its condition's two lines of text.
  const linkH = h(ROW_H + 6);
  const broken = CONDITIONS.map((_, i) => (i === 3 ? Math.max(ease(frame, breakAt + 4, 14), ease(frame, fixAt[3], 14)) : ease(frame, fixAt[i] + 4, 14)));
  const shrink = ease(frame, shortAt + 8, 30);
  // Livelock: two threads step toward each other, both back off, again, in step.
  const liveT = Math.max(0, frame - lockstepAt);
  const sway = ease(frame, lockstepAt, 8) * Math.abs(Math.sin((liveT / 26) * Math.PI));

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={firstAt} level={-31} />
      <Sfx name="el-tap" at={secondAt} level={-31} />
      <Sfx name="el-scratch" at={eachAt} level={-31} />
      <Sfx name="el-sprinkle" at={coffAt} level={-33} />
      <Sfx name="el-tap" at={breakAt + 4} level={-29} />
      <Sfx name="el-pencil" at={globalAt} level={-35} />
      <Sfx name="el-whoosh" at={getsAt} level={-35} />
      <Sfx name="el-chime" at={noSchedAt + 4} level={-33} />
      {[timeoutAt, coarseAt, shareAt].map((at) => (
        <Sfx key={at} name="el-tap" at={at + 4} level={-31} />
      ))}
      <Sfx name="el-whoosh" at={shortAt + 8} level={-36} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} size={58} out={q6At - 4}>
          What is a deadlock, and what four conditions cause it?
        </QuestionCard>
        <QuestionCard n={6} at={q6At} textAt={q6TextAt - 2} size={58}>
          How do you prevent deadlocks in practice?
        </QuestionCard>

        <Note at={setAt} x={X0} y={y(290)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            Threads, each <b style={{ color: ACCENT_INK, opacity: ease(frame, foreverAt, 10) }}>waiting forever</b> for what another holds
          </span>
        </Note>

        {/* Who holds, who waits. */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: lockFade }}>
          <path d={holdsA} fill="none" stroke={THREAD[0].fill} strokeWidth={4} pathLength={1} strokeDasharray={`${draw(firstAt + 4)} 1`} />
          <path d={t2HoldsB} fill="none" stroke={THREAD[1].fill} strokeWidth={4} pathLength={1} strokeDasharray={`${t2B} 1`} opacity={1 - ordered} />
          <path d={t1HoldsB} fill="none" stroke={THREAD[0].fill} strokeWidth={4} pathLength={1} strokeDasharray={`${t1B} 1`} />
        </svg>
        <Flow points={[[t1c, t1.y + t1.h + 4], [t1c, bMid], [b.x - 8, bMid]]} at={wantsBAt} color={waitColor} dash="9 7" width={3} out={getsAt} />
        <Flow points={[[t2c, t2.y - 4], [t2c, aMid], [a.x + a.w + 8, aMid]]} at={wantsAAt} color={waitColor} dash="9 7" width={3} out={givesUpAt + 4} />
        {/* The timeout: the stuck pair again, thread 2 gives up B, thread 1 takes it, thread 2 waits to retry. */}
        <Flow points={[[t1c, t1.y + t1.h + 4], [t1c, bMid], [b.x - 8, bMid]]} at={timeoutAt + 4} color={ACCENT} dash="9 7" width={3} out={releasesAt + 10} />
        <Flow points={[[t2c, t2.y - 4], [t2c, aMid], [a.x + a.w + 8, aMid]]} at={triesAt} color={INK_SOFT} dash="9 7" width={3} out={coarseAt - 4} />
        <Note at={timeoutAt + 6} x={t2c + 64} y={t2.y + t2.h / 2 - 15} out={coarseAt - 4}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35em", fontSize: 20, transform: `scale(${1 + 0.18 * pulse(frame, givesUpAt, 20)})` }}>
            <svg width={18} height={26} viewBox="0 0 18 26" style={{ display: "block" }}>
              <path d="M2,2 H16 L9,13 L16,24 H2 L9,13 Z" fill="none" stroke={frame >= givesUpAt ? ACCENT : INK_SOFT} strokeWidth={2.2} strokeLinejoin="round" />
              <path d={`M9,13 L${9 - 5 * ease(frame, timeoutAt + 6, 40)},24 H${9 + 5 * ease(frame, timeoutAt + 6, 40)} Z`} fill={frame >= givesUpAt ? ACCENT : INK_SOFT} />
            </svg>
            <span style={{ ...label(20, frame >= givesUpAt ? ACCENT_INK : INK_SOFT), fontWeight: 500, whiteSpace: "nowrap" }}>timeout</span>
          </span>
        </Note>

        {/* One coarse lock: thread 1 holds it, thread 2 waits for it. */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - shared }}>
          <path d={`M${t1Edge},${midY} H${midX - 82}`} fill="none" stroke={THREAD[0].fill} strokeWidth={4} pathLength={1} strokeDasharray={`${ease(frame, coarseAt + 14, 14)} 1`} />
        </svg>
        <Flow points={[[t2Edge, midY], [midX + 90, midY]]} at={coarseAt + 22} color={INK_SOFT} dash="9 7" width={3} out={shareAt - 4} />
        <Note at={coarseAt + 10} x={midX - 80} y={midY - 17} width={160} out={shareAt - 4} style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10 }}>
          <LockGlyph size={30} color={THREAD[0].fill} />
          <span style={{ ...label(23, INK), fontWeight: 500, whiteSpace: "nowrap" }}>lock AB</span>
        </Note>

        {/* One owner, fed by a queue: nobody else touches the state, so nobody locks. */}
        <Flow points={[[t1Edge, midY], [QUEUE.x - 10, midY]]} at={queueAt - 6} color={THREAD[0].fill} width={3} head={13} />
        <Flow points={[[t2Edge, midY], [QUEUE.x + QUEUE.w + 10, midY]]} at={queueAt - 2} color={THREAD[1].fill} width={3} head={13} />
        <Flow points={[[midX, midY + QUEUE.h / 2 + 6], [midX, bMid - 26]]} at={queueAt + 6} color={BAR} width={3} head={13} />
        <div
          style={{
            position: "absolute",
            left: QUEUE.x,
            top: midY - QUEUE.h / 2,
            width: QUEUE.w,
            height: QUEUE.h,
            boxSizing: "border-box",
            border: `1.5px solid ${HAIRLINE}`,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            opacity: ease(frame, shareAt + 2, 12),
          }}
        >
          {[0, 1, 2].map((k) => (
            <span key={k} style={{ width: 30, height: 26, borderRadius: 5, background: tint(THREAD[k % 2].fill, 45), border: `2px solid ${THREAD[k % 2].fill}`, boxSizing: "border-box", opacity: ease(frame, queueAt + 4 + k * 5, 8) }} />
          ))}
        </div>
        <Note at={shareAt + 4} x={midX - 100} y={midY - QUEUE.h / 2 - 36} width={200} style={{ textAlign: "center" }}>
          <span style={{ ...label(20, INK_SOFT), fontWeight: 500, whiteSpace: "nowrap" }}>a queue</span>
        </Note>
        {[0, 1].map((k) => {
          const c = carry(k);
          if (c < 0 || frame >= shortAt + 60) return null;
          const fromX = k === 0 ? t1Edge + 6 : t2Edge - 20;
          const toX = k === 0 ? QUEUE.x - 24 : QUEUE.x + QUEUE.w + 10;
          return <div key={k} style={{ position: "absolute", left: lerp(fromX, toX, c), top: midY - 7, width: 14, height: 14, borderRadius: 3, background: THREAD[k].fill, border: `2px solid ${PAPER}`, opacity: Math.min(1, 4 * (1 - c)) }} />;
        })}
        <ThreadName t={2} x={midX} y={bMid - 15} at={shareAt + 6} size={23} center>
          owner thread: the state
        </ThreadName>
        {/* The locks: a padlock in its holder's color, and its name. */}
        {[
          { b: a, name: "lock A", at: holdsAt, holder: draw(firstAt + 4) > 0.5 ? 0 : -1 },
          { b, name: "lock B", at: holdsAt + 4, holder: ordered > 0.5 || t1GetsB > 0.5 ? 0 : t2B > 0.5 ? 1 : -1 },
        ].map((l) => (
          <Note
            key={l.name}
            at={l.at}
            x={l.b.x}
            y={lerp(l.b.y + l.b.h / 2 - 17, midY - 17, merge)}
            width={l.b.w}
            from="up"
            out={coarseAt + 8}
            style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10 }}
          >
            <span style={{ transform: `scale(${1 + 0.2 * pulse(frame, twoAt + 10, 18)})` }}>
              <LockGlyph size={30} color={l.holder < 0 ? INK : THREAD[l.holder].fill} />
            </span>
            <span style={{ ...label(23, INK), fontWeight: 500, whiteSpace: "nowrap" }}>{l.name}</span>
          </Note>
        ))}
        {[t1, t2].map((t, i) => (
          <ThreadName key={i} t={i} x={t.x + t.w / 2} y={t.y + t.h / 2 - 15} at={setAt + 6 + i * 4} size={23} center />
        ))}
        <Note at={wantsBAt} x={X0} y={y(686)} out={shareAt}>
          <span style={{ ...label(20, INK_SOFT), fontWeight: 500, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "0.5em", fontSize: 20 }}>
            <svg width={36} height={10}>
              <line x1={0} y1={5} x2={36} y2={5} stroke={INK_SOFT} strokeWidth={4} />
            </svg>
            <span>holds</span>
            <svg width={36} height={10} style={{ marginLeft: 14 }}>
              <line x1={0} y1={5} x2={36} y2={5} stroke={INK_SOFT} strokeWidth={3} strokeDasharray="8 6" />
            </svg>
            <span>waits for</span>
          </span>
        </Note>

        {/* The schedule, from results.json, then the one-order version. */}
        <Note at={ifBothAt} x={X0} y={y(726)} out={getsAt - 2}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>{STUCK.trace.map(named).join(", then ")}:</span>
        </Note>
        <Note at={eachAt} x={X0} y={y(766)} out={getsAt - 2}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap" }}>each waits on the other, for good</span>
        </Note>
        <Note at={eachAt + 16} x={X0} y={y(806)} out={getsAt - 2}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            <Num>{DEADLOCK.opposite.deadlock}</Num> of the <Num>{DEADLOCK.opposite.schedules}</Num> possible schedules end this way
          </span>
        </Note>
        <Note at={nothingAt} x={X0} y={y(726)} out={timeoutAt - 4}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>Both take A first: the loser waits holding nothing</span>
        </Note>
        <Note at={noSchedAt} x={X0} y={y(766)} out={timeoutAt - 4}>
          <span style={{ ...note(24, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            <Num>{DEADLOCK.sameOrder.deadlock}</Num> of <Num>{DEADLOCK.sameOrder.schedules}</Num> schedules deadlock
          </span>
        </Note>

        <Note at={releasesAt} x={X0} y={y(726)} out={coarseAt - 4}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            Thread 2 times out and lets go of B<span style={{ opacity: ease(frame, triesAt, 10) }}>, then tries again</span>
          </span>
        </Note>
        <Note at={noHoldAt} x={X0} y={y(726)} out={shareAt - 4}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>One lock for both: nobody holds one and waits</span>
        </Note>
        <Note at={allAt} x={X0} y={y(766)} out={shareAt - 4}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>or take every lock you need at once</span>
        </Note>
        <Note at={queueAt + 6} x={X0} y={y(726)} out={shortAt - 4}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>Threads send work; only the owner touches the state</span>
        </Note>

        {/* Keep critical sections short. */}
        <Note at={shortAt} x={X0} y={y(726)} out={detectAt - 4}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            Keep critical sections short<span style={{ opacity: ease(frame, lowAt, 10) }}>: less contention</span>
          </span>
        </Note>
        <div
          style={{
            position: "absolute",
            left: X0,
            top: y(772),
            width: 600 - 420 * shrink,
            height: h(26),
            borderRadius: 4,
            background: tint(BAR, 30),
            border: `2px solid ${BAR}`,
            boxSizing: "border-box",
            opacity: ease(frame, shortAt + 2, 10) * (1 - ease(frame, detectAt - 4, 10)),
          }}
        />
        {/* Found one anyway: the thread dump of the stuck schedule. */}
        <Note at={detectAt} x={X0} y={y(672)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            Found one anyway? <b style={{ color: BLUE_INK, opacity: ease(frame, dumpAt, 10) }}>A thread dump</b>
            <span style={{ opacity: ease(frame, whomAt, 10) }}> shows who waits on whom:</span>
          </span>
        </Note>
        {(["T1", "T2"] as const).map((t, i) => (
          <Note key={t} at={whomAt + 4 + i * 6} x={X0} y={y(712 + i * 36)}>
            <span style={{ ...note(22, THREAD[i].ink), fontWeight: 500, whiteSpace: "nowrap" }}>{dumpLine(t)}</span>
          </Note>
        ))}
        <Note at={whomAt + 20} x={X0 + 470} y={y(730)}>
          <span style={{ ...note(22, ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap" }}>a cycle</span>
        </Note>
        <Note at={whomAt + 30} x={X0} y={y(786)}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>(databases find their own and abort one transaction)</span>
        </Note>
        {/* Retrying in lockstep. */}
        <Note at={catchAt} x={X0} y={y(828)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            Retried in lockstep: <b style={{ color: ACCENT_INK, opacity: ease(frame, liveAt, 10) }}>livelock (question 13)</b>
          </span>
        </Note>
        <div style={{ position: "absolute", left: 700 - 26 * sway, top: y(828) + 4, width: 24, height: 24, borderRadius: 12, background: THREAD[0].fill, opacity: ease(frame, lockstepAt, 10) }} />
        <div style={{ position: "absolute", left: 758 + 26 * sway, top: y(828) + 4, width: 24, height: 24, borderRadius: 12, background: THREAD[1].fill, opacity: ease(frame, lockstepAt, 10) }} />

        {/* Coffman's four, as a chain. */}
        <Note at={coffAt} x={LINK_CX - linkW(linkH) / 2} y={y(290)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            Coffman&apos;s four conditions<span style={{ opacity: ease(frame, coffAt + 20, 10) }}>: all have to hold</span>
          </span>
        </Note>
        {CONDITIONS.map((c, i) => {
          const cy = rowY(i) + h(30);
          return (
            <React.Fragment key={c.name}>
              <Link cx={LINK_CX} cy={cy} height={linkH} at={condAt[i] - 2} open={broken[i]} />
              <Note at={condAt[i]} x={ROW_X} y={rowY(i)}>
                <div style={{ ...note(25, broken[i] > 0.5 ? OK_INK : INK), fontWeight: 500, whiteSpace: "nowrap" }}>{c.name}</div>
                <div style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap", marginTop: 4 }}>{c.gloss}</div>
              </Note>
              <Note at={fixAt[i]} x={FIX_X} y={rowY(i) + h(14)}>
                <span style={{ ...note(22, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
                  {c.fix}
                  {c.more ? <span style={{ opacity: ease(frame, allAt, 10) }}>{c.more}</span> : null}
                </span>
              </Note>
            </React.Fragment>
          );
        })}
        <VRule x={FIX_X - 32} top={rowY(0)} height={rowY(3) + h(70) - rowY(0)} at={globalAt} />
        <Note at={breakAt} x={ROW_X} y={rowY(4) + h(6)}>
          <span style={{ ...note(24, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>Break any one, and it can&apos;t happen</span>
        </Note>
        <Note at={queueAt} x={FIX_X} y={rowY(0) + h(48)}>
          <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>no other thread needs the lock</span>
        </Note>
        <Note at={orderAt + 4} x={FIX_X} y={rowY(3) + h(48)}>
          <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>the usual target</span>
        </Note>
        <Note at={releasesAt} x={FIX_X} y={rowY(2) + h(48)}>
          <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>gives up, lets go of the first</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
