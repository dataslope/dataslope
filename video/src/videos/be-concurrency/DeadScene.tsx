import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Illustration } from "../../components/Illustration";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { DEADLOCK, ILLUSTRATIONS, VIDEO } from "./data";
import { Drift, Flow, LockGlyph, OK_INK, pulse, THREAD, ThreadName, tint, VRule, X0 } from "./parts";

/** The wait-for picture, in layout units: two locks between two threads. */
const A = { x: 410, y: 350, w: 140, h: 64 };
const B = { x: 410, y: 590, w: 140, h: 64 };
const T1 = { x: 140, y: 470, w: 170, h: 64 };
const T2 = { x: 650, y: 470, w: 170, h: 64 };
/** The four conditions, in the page's order, and the fix that breaks each. */
const CONDITIONS = [
  { name: "Mutual exclusion", gloss: "one holder at a time", fix: "one owner, fed by a queue" },
  { name: "Hold and wait", gloss: "holds one, waits for another", fix: "one coarse lock" },
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
 * question 6 breaks each in turn: one lock order (no schedule deadlocks, 0
 * of 2), a timeout, one coarse lock, one owner fed by a queue. And keep the
 * critical section short; and the livelock that retrying in step can cause.
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
  const releasesAt = n.word("prevent-timeout", "releases its first");
  const coarseAt = n.word("prevent-hold", "one coarse lock instead of several");
  const shareAt = n.word("prevent-share", "share nothing");
  const queueAt = n.word("prevent-share", "through a queue");
  const shortAt = n.word("prevent-short", "keep critical sections short");
  const lowAt = n.word("prevent-short", "contention stays low");
  const catchAt = n.word("prevent-live", "One catch");
  const lockstepAt = n.word("prevent-live", "retry in lockstep");
  const liveAt = n.word("prevent-live", "That's livelock");
  const end = n.beat("prevent-live").to;

  // Each condition is broken by its fix, in the order question 6 takes them.
  const fixAt = [shareAt, coarseAt, timeoutAt, globalAt];
  const ordered = ease(frame, getsAt, 18);
  const stuck = ease(frame, eachAt, 12) * (1 - ordered);

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
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <path d={holdsA} fill="none" stroke={THREAD[0].fill} strokeWidth={4} pathLength={1} strokeDasharray={`${draw(firstAt + 4)} 1`} />
          <path d={t2HoldsB} fill="none" stroke={THREAD[1].fill} strokeWidth={4} pathLength={1} strokeDasharray={`${draw(secondAt + 4)} 1`} opacity={1 - ordered} />
          <path d={t1HoldsB} fill="none" stroke={THREAD[0].fill} strokeWidth={4} pathLength={1} strokeDasharray={`${ordered} 1`} />
        </svg>
        <Flow points={[[t1c, t1.y + t1.h + 4], [t1c, bMid], [b.x - 8, bMid]]} at={wantsBAt} color={waitColor} dash="9 7" width={3} out={getsAt} />
        <Flow points={[[t2c, t2.y - 4], [t2c, aMid], [a.x + a.w + 8, aMid]]} at={wantsAAt} color={waitColor} dash="9 7" width={3} />
        {/* The locks: a padlock in its holder's color, and its name. */}
        {[
          { b: a, name: "lock A", at: holdsAt, holder: draw(firstAt + 4) > 0.5 ? 0 : -1 },
          { b, name: "lock B", at: holdsAt + 4, holder: ordered > 0.5 ? 0 : draw(secondAt + 4) > 0.5 ? 1 : -1 },
        ].map((l) => (
          <Note key={l.name} at={l.at} x={l.b.x} y={l.b.y + l.b.h / 2 - 17} width={l.b.w} from="up" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10 }}>
            <span style={{ transform: `scale(${1 + 0.2 * pulse(frame, twoAt + 10, 18)})` }}>
              <LockGlyph size={30} color={l.holder < 0 ? INK : THREAD[l.holder].fill} />
            </span>
            <span style={{ ...label(23, INK), fontWeight: 600, whiteSpace: "nowrap" }}>{l.name}</span>
          </Note>
        ))}
        {[t1, t2].map((t, i) => (
          <ThreadName key={i} t={i} x={t.x + t.w / 2} y={t.y + t.h / 2 - 15} at={setAt + 6 + i * 4} size={23} center />
        ))}
        <Note at={wantsBAt} x={X0} y={y(686)}>
          <span style={{ ...label(20, INK_SOFT), fontWeight: 600, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "0.5em", fontSize: 20 }}>
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
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 600, whiteSpace: "nowrap" }}>each waits on the other, for good</span>
        </Note>
        <Note at={eachAt + 16} x={X0} y={y(806)} out={getsAt - 2}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            <Num>{DEADLOCK.opposite.deadlock}</Num> of the <Num>{DEADLOCK.opposite.schedules}</Num> possible schedules end this way
          </span>
        </Note>
        <Note at={nothingAt} x={X0} y={y(726)} out={shortAt - 4}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>Both take A first: the loser waits holding nothing</span>
        </Note>
        <Note at={noSchedAt} x={X0} y={y(766)} out={shortAt - 4}>
          <span style={{ ...note(24, OK_INK), fontWeight: 600, whiteSpace: "nowrap" }}>
            <Num>{DEADLOCK.sameOrder.deadlock}</Num> of <Num>{DEADLOCK.sameOrder.schedules}</Num> schedules deadlock
          </span>
        </Note>

        {/* Keep critical sections short. */}
        <Note at={shortAt} x={X0} y={y(726)}>
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
            borderRadius: 6,
            background: tint(BAR, 30),
            border: `2px solid ${BAR}`,
            boxSizing: "border-box",
            opacity: ease(frame, shortAt + 2, 10),
          }}
        />
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
                <div style={{ ...note(25, broken[i] > 0.5 ? OK_INK : INK), fontWeight: 600, whiteSpace: "nowrap" }}>{c.name}</div>
                <div style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap", marginTop: 4 }}>{c.gloss}</div>
              </Note>
              <Note at={fixAt[i]} x={FIX_X} y={rowY(i) + h(14)}>
                <span style={{ ...note(22, OK_INK), fontWeight: 600, whiteSpace: "nowrap" }}>{c.fix}</span>
              </Note>
            </React.Fragment>
          );
        })}
        <VRule x={FIX_X - 32} top={rowY(0)} height={rowY(3) + h(70) - rowY(0)} at={globalAt} />
        <Note at={breakAt} x={ROW_X} y={rowY(4) + h(6)}>
          <span style={{ ...note(24, OK_INK), fontWeight: 600, whiteSpace: "nowrap" }}>Break any one, and it can&apos;t happen</span>
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
