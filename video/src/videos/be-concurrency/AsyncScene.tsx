import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ASYNC, ms } from "./data";
import { Band, Drift, Flow, lerp, OK, OK_INK, X0 } from "./parts";
import { type Axis, msX, MsAxis, WaitBar } from "./timeline";

/** The event loop: a ring, its coroutines riding it, the one on top running. */
const RING = { x: 380, y: 590, r: 140 };
const DISC = 28;
const NAMES = ["a", "b", "c", "d"];
/** The timeline of the page's two fetches. */
export const AXIS: Axis = { x: 860, perMs: 30 };
const ROW_A = 404;
const ROW_B = 474;
const ROW_H = 48;
/** Python's list, as print() writes it. */
export const pyList = (xs: readonly string[]) => `[${xs.map((x) => `'${x}'`).join(", ")}]`;
/** gather's results in words, from the run: "a, then b". */
const GATHERED = ASYNC.awaiting.results.map((r) => r.split(" ")[0]).join(", then ");

/**
 * Question 7. One thread, an event loop: coroutines ride it, the one on top
 * runs, and one that awaits the network steps off while the next runs. The
 * page's two fetches, run (data.ts): their waits overlap, b finishes first,
 * the pair takes the longer wait, and gather still returns a, then b. Under
 * the loop, the OS says which sockets are ready, and the parked coroutine is
 * woken back onto the ring. The ring holds still, dimmed, while the
 * timeline is read, so its own a to d never race the timeline's a and b.
 * Nothing interrupts a coroutine (said so, not "no preemption", which
 * question 6 used for Coffman's condition), so one that never awaits holds
 * the loop. And what it is for: thousands of sockets on one thread.
 */
export const AsyncScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("async").from;
  const qAt = n.word("async", "Question seven");
  const textAt = n.word("async", "What is async await");
  const coopAt = n.word("async", "cooperative concurrency");
  const loopAt = n.word("async", "Coroutines run on an event loop");
  const awaitsAt = n.word("async", "When one awaits a network call");
  const handsAt = n.word("async", "it hands control back");
  const osAt = n.word("async-os", "asks the operating system");
  const readyAt = n.word("async-os", "which sockets are ready");
  const wakeAt = n.word("async-os", "wakes the coroutines");
  const fetchesAt = n.word("async-run", "Two fetches");
  const aWaitsAt = n.word("async-run", "a waits twenty milliseconds");
  const bWaitsAt = n.word("async-run", "b waits ten");
  const overlapAt = n.word("async-run", "The waits overlap");
  const bFirstAt = n.word("async-run", "b finishes first");
  const twentyAt = n.word("async-run", "about twenty");
  const gatheredAt = n.word("async-run", "Gathered together");
  const orderAt = n.word("async-run", "in the order you asked");
  const noPreAt = n.word("async-nopre", "Nothing interrupts a running coroutine");
  const onlyAt = n.word("async-coop", "only switch at an await");
  const neverAt = n.word("async-coop", "a coroutine that never awaits");
  const starvesAt = n.word("async-coop", "starves every other one");
  const shinesAt = n.word("async-scale", "Where it shines");
  const thousandsAt = n.word("async-scale", "thousands of sockets");
  const end = n.beat("async-scale").to;

  const { a: waitA, b: waitB } = ASYNC.delays;
  const msA = waitA * 1000;
  const msB = waitB * 1000;
  const total = ASYNC.overlapped.total * 1000;
  const sum = ASYNC.serial.total * 1000;
  const firstDone = ASYNC.awaiting.finished[0];

  // The ring turns until a coroutine that never awaits takes it.
  const cx = RING.x;
  const cy = y(RING.y);
  const hogStart = neverAt + 4;
  const hogEnd = shinesAt;
  const hog = ease(frame, hogStart, 14) * (1 - ease(frame, hogEnd, 14));
  // It also holds still while the timeline beside it is read.
  const held = (f: number, s0: number, s1: number) => Math.max(0, Math.min(f, s1) - s0);
  const turn = (Math.max(0, frame - loopAt) - held(frame, fetchesAt, noPreAt) - held(frame, hogStart, hogEnd + 14)) / (fps * 9);
  const ringDim = 1 - 0.6 * ease(frame, fetchesAt, 12) * (1 - ease(frame, noPreAt - 4, 12));
  // a steps off to wait on the network, and comes back when the OS says its
  // socket is ready.
  const park = ease(frame, awaitsAt + 6, 16) * (1 - ease(frame, wakeAt, 16));
  const PARK = { x: 650, y: y(RING.y - 120) };

  const disc = (k: number) => {
    const ang = -Math.PI / 2 + (k * Math.PI) / 2 - turn * 2 * Math.PI;
    let x = cx + RING.r * Math.cos(ang);
    let yy = cy + RING.r * Math.sin(ang);
    if (k === 0) {
      x = lerp(x, PARK.x, park);
      yy = lerp(yy, PARK.y, park);
    }
    // Nearness to the top slot: that one is running.
    const top = Math.max(0, Math.cos(ang + Math.PI / 2));
    return { x, y: yy, top: k === 0 ? top * (1 - park) : top };
  };
  const sockets = ease(frame, thousandsAt, 20);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={loopAt} level={-35} />
      <Sfx name="el-whoosh" at={awaitsAt + 6} level={-36} />
      <Sfx name="el-pencil" at={fetchesAt + 4} level={-35} />
      <Sfx name="el-tap" at={bFirstAt} level={-30} />
      <Sfx name="el-tap" at={gatheredAt + 4} level={-30} />
      <Sfx name="el-scratch" at={hogStart} level={-32} />
      <Sfx name="el-sprinkle" at={thousandsAt} level={-31} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={7} at={qAt - 4} textAt={textAt - 4} size={58}>
          What is async/await, and how does the event loop work?
        </QuestionCard>
        <Note at={coopAt} x={X0} y={y(290)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            <Band at={coopAt + 6}>Cooperative</Band> concurrency, on one thread
          </span>
        </Note>

        {/* The loop. */}
        <div style={{ opacity: ringDim }}>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, loopAt - 4, 14) }}>
          <circle cx={cx} cy={cy} r={RING.r} fill="none" stroke={ds("gray", 300)} strokeWidth={10} />
          {/* The sockets one thread can serve. */}
          {Array.from({ length: 96 }, (_, k) => {
            const ang = (k / 96) * 2 * Math.PI;
            const rr = RING.r + 46 + (k % 3) * 9;
            const p = ease(frame, thousandsAt + (k % 24), 8) * sockets;
            return p > 0 ? <circle key={k} cx={cx + rr * Math.cos(ang)} cy={cy + rr * Math.sin(ang)} r={4} fill={BAR} opacity={p * 0.75} /> : null;
          })}
        </svg>
        <Note at={loopAt} x={cx - 110} y={cy - 32} width={220} style={{ textAlign: "center" }}>
          <div style={{ ...label(24, INK), fontWeight: 500, whiteSpace: "nowrap" }}>event loop</div>
          <div style={{ ...label(20, INK_SOFT), fontWeight: 500, whiteSpace: "nowrap", marginTop: 2 }}>one thread</div>
        </Note>
        <Note at={loopAt + 10} x={cx - 60} y={cy - RING.r - 92} width={120} style={{ textAlign: "center" }} out={thousandsAt - 4}>
          <span style={{ ...label(20, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>running</span>
        </Note>
        {NAMES.map((name, k) => {
          const d = disc(k);
          const p = ease(frame, loopAt + 4 + k * 4, 10);
          if (p <= 0) return null;
          const starved = ease(frame, starvesAt, 12) * (1 - ease(frame, hogEnd, 14));
          const run = d.top > 0.92 && hog < 0.5 ? 1 : 0;
          return (
            <div
              key={name}
              style={{
                position: "absolute",
                left: d.x - DISC,
                top: d.y - DISC,
                width: DISC * 2,
                height: DISC * 2,
                borderRadius: DISC,
                boxSizing: "border-box",
                border: `3px solid ${run ? OK : BAR}`,
                background: run ? OK : PAPER,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: p * (1 - 0.6 * starved),
                transform: `scale(${0.6 + 0.4 * p})`,
              }}
            >
              <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 500, color: run ? PAPER : BLUE_INK }}>{name}</span>
            </div>
          );
        })}
        {/* The one that never awaits: it sits on top and the ring stops. */}
        {hog > 0 ? (
          <div
            style={{
              position: "absolute",
              left: lerp(cx - 260, cx, hog) - DISC - 6,
              top: cy - RING.r - DISC - 6,
              width: DISC * 2 + 12,
              height: DISC * 2 + 12,
              borderRadius: DISC + 6,
              boxSizing: "border-box",
              border: `3px solid ${ACCENT}`,
              background: ACCENT,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: hog,
            }}
          >
            <span style={{ ...label(20, PAPER), fontWeight: 500 }}>CPU</span>
          </div>
        ) : null}
        <Note at={handsAt} x={PARK.x - 40} y={PARK.y + DISC + 10} out={wakeAt + 10}>
          <span style={{ ...label(20, BLUE_INK), fontWeight: 500, whiteSpace: "nowrap" }}>awaiting the network</span>
        </Note>
        {/* Under the loop: the OS says which sockets are ready, and a goes back on. */}
        <Note at={osAt} x={PARK.x - 40} y={PARK.y - DISC - 52} out={fetchesAt - 6}>
          <span style={{ ...label(21, INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            the loop asks the OS<span style={{ opacity: ease(frame, readyAt, 10) }}>: which sockets are ready?</span>
          </span>
        </Note>
        <Flow points={[[PARK.x - DISC - 8, PARK.y + 12], [cx + RING.r * 0.87 + DISC + 6, cy - RING.r * 0.5 - 4]]} at={wakeAt} color={OK} width={2.8} head={13} out={wakeAt + 50} />
        <Note at={wakeAt + 4} x={PARK.x + DISC + 12} y={PARK.y - 14} out={wakeAt + 50}>
          <span style={{ ...label(20, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>ready: woken</span>
        </Note>
        </div>
        <Note at={noPreAt} x={X0} y={y(800)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <b>Nothing interrupts it</b>: it switches <Band at={onlyAt}>only at an await</Band>
          </span>
        </Note>
        <Note at={neverAt + 6} x={X0} y={y(842)} out={hogEnd}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            a loop that never awaits<span style={{ opacity: ease(frame, starvesAt, 10) }} >: every other one starves</span>
          </span>
        </Note>
        <Note at={thousandsAt + 6} x={X0} y={y(842)}>
          <span style={{ ...note(24, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>Where it shines: thousands of sockets, one thread</span>
        </Note>

        {/* The page's two fetches. */}
        <Note at={fetchesAt} x={AXIS.x} y={y(330)}>
          <span style={{ ...label(22, INK), fontWeight: 500, whiteSpace: "nowrap" }}>Two fetches, gathered: the page&apos;s block, run</span>
        </Note>
        {[
          { name: "a", row: ROW_A, wait: msA, at: aWaitsAt },
          { name: "b", row: ROW_B, wait: msB, at: bWaitsAt },
        ].map((f) => (
          <React.Fragment key={f.name}>
            <Note at={fetchesAt + 4} x={AXIS.x - 46} y={y(f.row) + h(ROW_H) / 2 - 17}>
              <span style={{ fontFamily: MONO, fontSize: 26, fontWeight: 500, color: BLUE_INK }}>{f.name}</span>
            </Note>
            <WaitBar axis={AXIS} y={y(f.row)} h={h(ROW_H)} start={0} stop={f.wait} at={f.at} color={BAR}>
              <span style={{ ...label(21, BLUE_INK), fontWeight: 500, whiteSpace: "nowrap" }}>await, {ms(f.wait / 1000)}</span>
            </WaitBar>
            <Note at={f.name === firstDone ? bFirstAt : twentyAt - 6} x={msX(AXIS, f.wait) + 14} y={y(f.row) + h(ROW_H) / 2 - 15}>
              <span style={{ ...label(21, INK), fontWeight: 500, whiteSpace: "nowrap" }}>
                ✓ {f.name} done{f.name === firstDone ? ", first" : ""}
              </span>
            </Note>
          </React.Fragment>
        ))}
        <MsAxis axis={AXIS} y={y(ROW_B + ROW_H + 30)} to={sum} at={fetchesAt + 6} />
        {/* The pair: the longer wait. */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, overlapAt, 12) }}>
          {[0, total].map((t) => (
            <line key={t} x1={msX(AXIS, t)} x2={msX(AXIS, t)} y1={y(626)} y2={y(626) + 16} stroke={OK} strokeWidth={2.4} />
          ))}
          <line x1={msX(AXIS, 0)} x2={msX(AXIS, 0) + (msX(AXIS, total) - msX(AXIS, 0)) * ease(frame, overlapAt, 18)} y1={y(626) + 8} y2={y(626) + 8} stroke={OK} strokeWidth={2.4} />
        </svg>
        <Note at={twentyAt - 2} x={AXIS.x} y={y(652)}>
          <span style={{ ...note(24, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            The pair takes about <Num>{total}</Num> ms, not <Num>{sum}</Num>
          </span>
        </Note>
        <Note at={gatheredAt} x={AXIS.x} y={y(712)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            Gathered, the results come back <Band at={orderAt}>{GATHERED}</Band>
          </span>
        </Note>
        <Note at={orderAt + 4} x={AXIS.x} y={y(756)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>in the order asked, whichever finished first</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
