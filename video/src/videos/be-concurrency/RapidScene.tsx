import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { NextLine, Note, Num } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { POOL, SEMAPHORE } from "./data";
import { Band, Drift, Flow, Headline, Kicker, lerp, LockGlyph, Node, OK, OK_INK, SERIES, Spot, THREAD, tint, X0 } from "./parts";

const R_X = 780;
const LIST_TOP = 330;
const ROW = 56;

type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"] };

/** A body's first line: the term, then what it means. */
const Lead: React.FC<{ at: number; c: Ctx; term: string; children: React.ReactNode }> = ({ at, c, term, children }) => (
  <Note at={at} x={R_X} y={c.y(336)}>
    <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
      <b style={{ color: BLUE_INK }}>{term}</b>: {children}
    </span>
  </Note>
);

/** A thread, as a small colored tag. */
const Tag: React.FC<{ t: number; x: number; y: number; w?: number; h: number; at: number; text?: string; dashed?: boolean; out?: number }> = ({ t, x, y, w = 150, h, at, text, dashed, out }) => (
  <Node x={x} y={y} w={w} h={h} at={at} out={out} fill={tint(THREAD[t].fill, dashed ? 6 : 20)} line={THREAD[t].fill} titleInk={THREAD[t].ink} title={text ?? `thread ${t + 1}`} size={21} dashed={dashed} />
);

// ── 10. Locks, mutexes, semaphores ──────────────────────────────────────────

const Locks: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const mutexAt = c.w("r-lock", "A mutex allows exactly one holder");
  const semAt = c.w("r-lock", "A semaphore allows up to some number");
  const fiveAt = c.w("r-lock", "say five downloads at once");
  const reAt = c.w("r-lock", "a reentrant lock can be taken again");
  const recAt = c.w("r-lock", "recursive code doesn't deadlock on itself");
  const { limit, downloads, peak } = SEMAPHORE;
  // Twelve downloads through five slots, a wave at a time.
  const WAVE = 26;
  const tau = Math.max(0, frame - fiveAt - 6);
  const wave = Math.floor(tau / WAVE);
  const waves = Math.ceil(downloads / limit);
  const slotY = c.y(548);
  const slotH = c.h(46);
  return (
    <>
      <Note at={mutexAt} x={R_X} y={c.y(336)}>
        <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
          <b style={{ color: BLUE_INK }}>Mutex</b>: exactly one holder
        </span>
      </Note>
      <Note at={mutexAt + 4} x={R_X} y={c.y(392)}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 14, fontSize: 21 }}>
          <LockGlyph size={30} color={INK} />
          <span style={{ ...label(21, THREAD[0].ink), fontWeight: 700, border: `2px solid ${THREAD[0].fill}`, background: tint(THREAD[0].fill, 20), borderRadius: 7, padding: "4px 12px" }}>thread 1 holds it</span>
          <span style={{ ...label(21, THREAD[1].ink), fontWeight: 600, border: `2px dashed ${THREAD[1].fill}`, borderRadius: 7, padding: "4px 12px" }}>thread 2 waits</span>
        </span>
      </Note>

      <Note at={semAt} x={R_X} y={c.y(480)}>
        <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
          <b style={{ color: BLUE_INK }}>Semaphore</b>: up to some number<span style={{ opacity: ease(frame, fiveAt, 10) }}>, say five downloads at once</span>
        </span>
      </Note>
      {Array.from({ length: limit }, (_, s) => {
        const k = wave * limit + s;
        const live = frame >= fiveAt + 6 && wave < waves && k < downloads;
        return (
          <Node key={s} x={R_X + s * 84} y={slotY} w={74} h={slotH} at={fiveAt + s * 2} tone={live ? "data" : "soft"} title={live ? <Num>{k + 1}</Num> : ""} size={22} />
        );
      })}
      <Note at={fiveAt + 10} x={R_X + limit * 84 + 20} y={slotY + slotH / 2 - 15}>
        <span style={{ ...label(21, INK_SOFT), fontWeight: 600, whiteSpace: "nowrap" }}>
          waiting: <Num>{Math.max(0, downloads - Math.min(downloads, (Math.min(wave, waves - 1) + 1) * limit))}</Num>, done: <Num>{Math.min(downloads, Math.min(wave, waves) * limit)}</Num>
        </span>
      </Note>
      <Note at={fiveAt + 24} x={R_X} y={slotY + slotH + c.h(14)}>
        <span style={{ ...note(21, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
          run on asyncio: never more than <Num>{peak}</Num> of the <Num>{downloads}</Num> in flight
        </span>
      </Note>

      <Note at={reAt} x={R_X} y={c.y(668)}>
        <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
          <b style={{ color: BLUE_INK }}>Reentrant lock</b>: its holder can take it again
        </span>
      </Note>
      <Tag t={0} x={R_X} y={c.y(726)} h={c.h(48)} at={reAt + 4} />
      <Flow points={[[R_X + 160, c.y(750)], [R_X + 232, c.y(750)]]} at={reAt + 8} color={THREAD[0].fill} width={2.6} head={13} />
      <Note at={reAt + 10} x={R_X + 244} y={c.y(736)}>
        <LockGlyph size={34} color={INK} />
      </Note>
      <Flow points={[[R_X + 300, c.y(758)], [R_X + 340, c.y(758)], [R_X + 340, c.y(720)], [R_X + 296, c.y(720)]]} at={reAt + 16} color={THREAD[0].fill} width={2.6} head={12} />
      <Note at={recAt} x={R_X + 380} y={c.y(734)}>
        <span style={{ ...note(22, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>again, from a recursive call: no self-deadlock</span>
      </Note>
    </>
  );
};

// ── 11. Atomic operations ───────────────────────────────────────────────────

const Atomic: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const opAt = c.w("r-atomic", "An atomic operation");
  const indivAt = c.w("r-atomic", "one indivisible step");
  const halfAt = c.w("r-atomic", "no other thread can see it half done");
  const notAt = c.w("r-atomic", "Adding one to the counter isn't atomic");
  const casAt = c.w("r-atomic", "Compare-and-swap instructions make it so");
  const lockAt = c.w("r-atomic", "or a lock held around the whole thing");
  const fuse = ease(frame, casAt + 4, 18);
  const rowY = c.y(476);
  const chipH = c.h(56);
  return (
    <>
      <Lead at={opAt} c={c} term="Atomic">
        <Band at={indivAt}>one indivisible step</Band>
      </Lead>
      <Note at={halfAt} x={R_X} y={c.y(392)}>
        <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>no other thread can see it half done</span>
      </Note>
      <Note at={notAt} x={R_X} y={rowY + chipH / 2 - 16}>
        <span style={{ fontFamily: MONO, fontSize: 24, fontWeight: 600, color: INK }}>counter += 1</span>
      </Note>
      {["read", "add", "write"].map((step, s) => {
        const p = ease(frame, notAt + 4 + s * 4, 10);
        if (p <= 0) return null;
        const x = lerp(R_X + 250 + s * 140, R_X + 250 + s * 116, fuse);
        return (
          <div
            key={step}
            style={{
              position: "absolute",
              left: x,
              top: rowY,
              width: lerp(122, 116, fuse),
              height: chipH,
              boxSizing: "border-box",
              border: `2.5px solid ${fuse > 0.5 ? OK : ACCENT}`,
              borderLeftWidth: fuse > 0.9 && s > 0 ? 0 : 2.5,
              borderRightWidth: fuse > 0.9 && s < 2 ? 0 : 2.5,
              borderRadius: fuse > 0.9 ? (s === 0 ? "8px 0 0 8px" : s === 2 ? "0 8px 8px 0" : 0) : 8,
              background: tint(fuse > 0.5 ? OK : ACCENT, 14),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: p,
            }}
          >
            <span style={{ ...label(22, fuse > 0.5 ? OK_INK : ACCENT_INK), fontWeight: 700 }}>{step}</span>
          </div>
        );
      })}
      <Note at={notAt + 14} x={R_X + 250} y={rowY + chipH + c.h(14)} out={casAt + 4}>
        <span style={{ ...note(23, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>three steps, so another thread can land between them</span>
      </Note>
      <Note at={casAt + 10} x={R_X + 250} y={rowY + chipH + c.h(14)}>
        <span style={{ ...note(23, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>compare-and-swap: one instruction</span>
      </Note>
      <Note at={lockAt} x={R_X + 250} y={rowY + chipH + c.h(60)}>
        <span style={{ ...note(23, OK_INK), fontWeight: 650, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "0.4em" }}>
          <LockGlyph size={24} color={OK} />
          <span>or a lock held around the whole thing</span>
        </span>
      </Note>
    </>
  );
};

// ── 12. Thread-safety ───────────────────────────────────────────────────────

const Safe: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const behavesAt = c.w("r-safe", "behaves correctly when many threads call it");
  const avoidAt = c.w("r-safe", "Avoid shared mutable state");
  const guardAt = c.w("r-safe", "guard it with a lock");
  const oneAt = c.w("r-safe", "keep it in one thread");
  const queueAt = c.w("r-safe", "a thread-safe queue");
  const shareAt = c.w("r-safe", "Share by communicating");
  const ways = [
    { at: avoidAt, text: "avoid shared mutable state" },
    { at: guardAt, text: "guard it with a lock" },
    { at: oneAt, text: "keep it in one thread, fed by a queue" },
  ];
  const qX = R_X + 230;
  const ownerX = qX + 300;
  const stateX = ownerX + 270;
  const dY = c.y(626);
  const tagH = c.h(40);
  return (
    <>
      <Lead at={behavesAt} c={c} term="Thread-safe">
        correct when many threads call it at once
      </Lead>
      {ways.map((wy, i) => (
        <Note key={wy.text} at={wy.at} x={R_X} y={c.y(396 + i * 46)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap", fontWeight: i === 2 ? 650 : 500 }}>
            <Num>{i + 1}</Num>. {i === 2 ? <Band at={oneAt + 4}>{wy.text}</Band> : wy.text}
            {i === 2 ? <b style={{ color: OK_INK, opacity: ease(frame, oneAt + 10, 10) }}> (best)</b> : null}
          </span>
        </Note>
      ))}
      {/* One owner thread, fed by a queue. */}
      {[0, 1, 2].map((t) => (
        <React.Fragment key={t}>
          <Tag t={t} x={R_X} y={dY + (t - 1) * c.h(56) - tagH / 2} w={140} h={tagH} at={oneAt + 6 + t * 3} />
          <Flow points={[[R_X + 148, dY + (t - 1) * c.h(56)], [qX - 10, dY + (t - 1) * c.h(16)]]} at={queueAt + t * 3} color={THREAD[t].fill} width={2.4} head={12} />
        </React.Fragment>
      ))}
      <Node x={qX} y={dY - c.h(34)} w={220} h={c.h(68)} at={queueAt} tone="data" align="center">
        <span style={{ display: "flex", gap: 6 }}>
          {[0, 1, 2, 3].map((k) => (
            <span key={k} style={{ width: 30, height: 30, borderRadius: 5, background: k < 3 ? tint(THREAD[k % 3].fill, 50) : PAPER, border: `2px solid ${k < 3 ? THREAD[k % 3].fill : HAIRLINE}`, opacity: ease(frame, queueAt + 8 + k * 4, 8) }} />
          ))}
        </span>
      </Node>
      <Note at={queueAt + 4} x={qX} y={dY + c.h(44)}>
        <span style={{ ...label(20, INK_SOFT), fontWeight: 600, whiteSpace: "nowrap" }}>a thread-safe queue</span>
      </Note>
      <Flow points={[[qX + 228, dY], [ownerX - 10, dY]]} at={queueAt + 10} color={BAR} width={2.6} head={13} />
      <Node x={ownerX} y={dY - c.h(30)} w={190} h={c.h(60)} at={oneAt + 4} tone="ok" title="owner thread" size={22} />
      <Flow points={[[ownerX + 198, dY], [stateX - 10, dY]]} at={oneAt + 10} color={OK} width={2.6} head={13} />
      <Node x={stateX} y={dY - c.h(30)} w={150} h={c.h(60)} at={oneAt + 10} tone="data" title="the state" size={22} />
      <Note at={shareAt} x={R_X} y={c.y(780)}>
        <span style={{ ...note(26, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
          Share by communicating, <span style={{ color: INK_SOFT }}>not by sharing memory.</span>
        </span>
      </Note>
    </>
  );
};

// ── 13. Livelock ────────────────────────────────────────────────────────────

const Live: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const inAt = c.w("r-live", "In a livelock");
  const runningAt = c.w("r-live", "threads keep running but make no progress");
  const stepAt = c.w("r-live", "stepping aside the same way");
  const busyAt = c.w("r-live", "The CPU looks busy");
  const harderAt = c.w("r-live", "harder to spot than a deadlock");
  const backoffAt = c.w("r-live", "Randomized backoff usually breaks it");
  const top = c.y(440);
  const bottom = c.y(620);
  const midY = (top + bottom) / 2;
  const lane = (bottom - top) / 4;
  // In step: both dodge to the same side every half second, and meet again.
  const PERIOD = 30;
  const dodging = ease(frame, stepAt - 6, 8);
  const t = Math.max(0, frame - (stepAt - 6));
  const side = Math.sin((t / PERIOD) * Math.PI);
  const pass = ease(frame, backoffAt + 10, 34);
  // Randomized backoff: one waits, the other goes round.
  const y1 = midY + dodging * lane * side * (1 - pass) - pass * lane;
  const y2 = midY + dodging * lane * side * (1 - pass) + pass * lane;
  const x1 = lerp(1010, 1430, pass);
  const x2 = lerp(1260, 840, pass);
  const busy = ease(frame, busyAt, 12) * (1 - ease(frame, backoffAt + 40, 14));
  return (
    <>
      <Lead at={inAt} c={c} term="Livelock">
        <Band at={runningAt + 6}>running</Band>, but no progress
      </Lead>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, runningAt, 12) }}>
        <line x1={R_X + 20} x2={1520} y1={top} y2={top} stroke={INK_SOFT} strokeWidth={3} />
        <line x1={R_X + 20} x2={1520} y1={bottom} y2={bottom} stroke={INK_SOFT} strokeWidth={3} />
      </svg>
      {[
        { t: 0, x: x1, y: y1 },
        { t: 1, x: x2, y: y2 },
      ].map((f) => (
        <div
          key={f.t}
          style={{
            position: "absolute",
            left: f.x - 30,
            top: f.y - 30,
            width: 60,
            height: 60,
            borderRadius: 30,
            background: THREAD[f.t].fill,
            border: `3px solid ${PAPER}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: ease(frame, runningAt + 2 + f.t * 4, 10),
          }}
        >
          <span style={{ ...label(20, PAPER), fontWeight: 750 }}>T{f.t + 1}</span>
        </div>
      ))}
      {/* The CPU, looking busy. */}
      <Note at={busyAt} x={1600} y={top - c.h(36)}>
        <span style={{ ...label(21, INK_SOFT), fontWeight: 650 }}>CPU</span>
      </Note>
      <div style={{ position: "absolute", left: 1600, top, width: 64, height: bottom - top, borderRadius: 8, border: `2px solid ${HAIRLINE}`, boxSizing: "border-box", opacity: ease(frame, busyAt, 10) }} />
      <div style={{ position: "absolute", left: 1604, top: bottom - 4 - (bottom - top - 8) * busy * (0.9 + 0.1 * Math.sin(frame / 3)), width: 56, height: (bottom - top - 8) * busy * (0.9 + 0.1 * Math.sin(frame / 3)), borderRadius: 5, background: ACCENT, opacity: busy }} />
      <Note at={harderAt} x={R_X} y={c.y(660)}>
        <span style={{ ...note(23, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>the CPU looks busy, so it&apos;s harder to spot than a deadlock</span>
      </Note>
      <Note at={backoffAt} x={R_X} y={c.y(708)}>
        <span style={{ ...note(23, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>randomized backoff: one waits, the other gets past</span>
      </Note>
    </>
  );
};

// ── 14. Starvation ──────────────────────────────────────────────────────────

const Starve: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const isAt = c.w("r-starve", "Starvation is a thread that never gets the resource");
  const priorityAt = c.w("r-starve", "others keep getting priority");
  const lowAt = c.w("r-starve", "a low-priority thread that never wins a lock");
  const fairAt = c.w("r-starve", "Fair locks help");
  const notByAt = c.w("r-starve", "not handing out shared resources by priority");
  const rowY = c.y(470);
  const rowH = c.h(52);
  const LOCK_X = 1640;
  const fair = ease(frame, fairAt + 4, 16);
  // High-priority threads keep arriving and going straight to the lock.
  const GAP = 20;
  const passes = Math.max(0, Math.floor((Math.min(frame, fairAt) - priorityAt) / GAP));
  const lowServed = ease(frame, fairAt + 22, 18);
  return (
    <>
      <Lead at={isAt} c={c} term="Starvation">
        a thread that never gets the resource
      </Lead>
      <Note at={isAt + 6} x={LOCK_X} y={rowY + 6}>
        <LockGlyph size={40} color={INK} />
      </Note>
      {/* The low-priority thread, waiting by the lock. */}
      <div
        style={{
          position: "absolute",
          left: lerp(1260, LOCK_X - 150, lowServed),
          top: rowY + c.h(76) * (1 - lowServed),
          width: 130,
          height: rowH,
          borderRadius: 8,
          boxSizing: "border-box",
          border: `2.5px solid ${lowServed > 0.5 ? OK : ds("gray", 400)}`,
          background: lowServed > 0.5 ? tint(OK, 16) : ds("gray", 100),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: ease(frame, isAt + 4, 10),
        }}
      >
        <span style={{ ...label(21, lowServed > 0.5 ? OK_INK : INK_SOFT), fontWeight: 700 }}>low</span>
      </div>
      {Array.from({ length: 8 }, (_, k) => {
        const at = priorityAt + k * GAP;
        if (at >= fairAt) return null;
        const p = ease(frame, at, 18);
        if (p <= 0) return null;
        const gone = ease(frame, at + 18, 8);
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: lerp(R_X, LOCK_X - 150, p),
              top: rowY,
              width: 130,
              height: rowH,
              borderRadius: 8,
              boxSizing: "border-box",
              border: `2.5px solid ${THREAD[2].fill}`,
              background: tint(THREAD[2].fill, 20),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: (1 - gone) * (1 - fair),
            }}
          >
            <span style={{ ...label(21, THREAD[2].ink), fontWeight: 700 }}>high</span>
          </div>
        );
      })}
      <Note at={lowAt} x={R_X} y={rowY + c.h(82)} out={fairAt}>
        <span style={{ ...note(23, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
          the low-priority thread, passed over <Num>{passes}</Num> times
        </span>
      </Note>
      <Note at={fairAt + 6} x={R_X} y={c.y(640)}>
        <span style={{ ...note(23, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>a fair lock serves in arrival order</span>
      </Note>
      <Note at={notByAt} x={R_X} y={c.y(688)}>
        <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>and don&apos;t hand shared resources out by priority</span>
      </Note>
    </>
  );
};

// ── 15. Thread pools ────────────────────────────────────────────────────────

const Pool: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const fixedAt = c.w("r-pool", "a fixed set of reusable workers");
  const queueAt = c.w("r-pool", "a queue of tasks");
  const skipAt = c.w("r-pool", "skip creating a thread per task");
  const boundAt = c.w("r-pool", "bound how many run at once");
  const mapAt = c.w("r-pool", "Map a function over a list");
  const orderAt = c.w("r-pool", "the results come back in input order");
  const { workers, inputs, results } = POOL;
  const qY = c.y(430);
  const chip = c.h(52);
  const wX = R_X + 520;
  const resY = c.y(640);
  // Tasks go to the workers four at a time; results fill in by input order.
  const slot = (k: number) => k % workers;
  const takeAt = (k: number) => mapAt + 8 + Math.floor(k / workers) * 26 + slot(k) * 3;
  return (
    <>
      <Lead at={fixedAt - 4} c={c} term="Thread pool">
        a fixed set of reusable workers
      </Lead>
      <Note at={queueAt} x={R_X} y={qY - c.h(40)}>
        <span style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>a queue of tasks</span>
      </Note>
      {inputs.map((v, k) => {
        const p = ease(frame, queueAt + 2 + k * 2, 10);
        if (p <= 0) return null;
        const taken = ease(frame, takeAt(k), 12);
        const done = ease(frame, takeAt(k) + 18, 8);
        const x = lerp(R_X + k * 70, wX + slot(k) * 112 + 26, taken);
        return (
          <div
            key={v}
            style={{
              position: "absolute",
              left: x,
              top: qY + c.h(6) * taken,
              width: 58,
              height: chip - c.h(12) * taken,
              borderRadius: 7,
              boxSizing: "border-box",
              border: `2.5px solid ${BAR}`,
              background: tint(BAR, 14),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: p * (1 - done),
            }}
          >
            <span style={{ ...label(21, BLUE_INK), fontWeight: 700 }}>
              <Num>{v}</Num>
            </span>
          </div>
        );
      })}
      {Array.from({ length: workers }, (_, i) => (
        <Node key={i} x={wX + i * 112} y={qY - c.h(8)} w={104} h={chip + c.h(16)} at={fixedAt + 4 + i * 3} tone="plain" fill={PAPER} dashed />
      ))}
      <Note at={fixedAt + 8} x={wX} y={qY + chip + c.h(18)}>
        <span style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>
          <Num>{workers}</Num> workers, reused
          <span style={{ opacity: ease(frame, boundAt, 10) }}>: at most <Num>{workers}</Num> run at once</span>
        </span>
      </Note>
      <Note at={skipAt} x={R_X} y={qY + chip + c.h(18)}>
        <span style={{ ...label(21, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>no new thread per task</span>
      </Note>
      <Note at={mapAt} x={R_X} y={c.y(582)}>
        <span style={{ fontFamily: MONO, fontSize: 23, fontWeight: 600, color: INK, whiteSpace: "nowrap" }}>pool.map(square, range(6))</span>
      </Note>
      <div style={{ position: "absolute", left: R_X, top: resY, display: "flex", alignItems: "center", gap: 10, fontSize: 24 }}>
        <span style={{ fontFamily: MONO, fontSize: 24, fontWeight: 600, color: INK_SOFT, opacity: ease(frame, mapAt + 6, 10) }}>[</span>
        {results.map((r, k) => (
          <span key={k} style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, color: OK_INK, opacity: ease(frame, takeAt(k) + 18, 8) }}>
            {r}
            {k < results.length - 1 ? "," : ""}
          </span>
        ))}
        <span style={{ fontFamily: MONO, fontSize: 24, fontWeight: 600, color: INK_SOFT, opacity: ease(frame, mapAt + 6, 10) }}>]</span>
      </div>
      <Note at={orderAt} x={R_X} y={resY + c.h(50)}>
        <span style={{ ...note(23, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>in input order, the page&apos;s example</span>
      </Note>
    </>
  );
};

// ── 16. Futures ─────────────────────────────────────────────────────────────

/** A claim ticket: a stub with a punched hole, pending (dashed) or redeemed. */
const Ticket: React.FC<{ x: number; y: number; w: number; h: number; ready: number; children: React.ReactNode }> = ({ x, y, w, h, ready, children }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h }}>
    <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <path
        d={`M10,0 H${w - 10} a10,10 0 0 0 10,10 V${h / 2 - 10} a10,10 0 0 0 0,20 V${h - 10} a10,10 0 0 0 -10,10 H10 a10,10 0 0 0 -10,-10 V${h / 2 + 10} a10,10 0 0 0 0,-20 V10 a10,10 0 0 0 10,-10 Z`}
        fill={ready > 0.5 ? tint(OK, 16) : PAPER}
        stroke={ready > 0.5 ? OK : BAR}
        strokeWidth={2.6}
        strokeDasharray={ready > 0.5 ? undefined : "8 5"}
      />
      <circle cx={30} cy={h / 2} r={7} fill="none" stroke={ready > 0.5 ? OK : BAR} strokeWidth={2.4} />
    </svg>
    <div style={{ position: "absolute", inset: 0, paddingLeft: 52, display: "flex", alignItems: "center" }}>{children}</div>
  </div>
);

const Future: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const ticketAt = c.w("r-future", "a future is a claim ticket");
  const notReadyAt = c.w("r-future", "isn't ready yet");
  const startAt = c.w("r-future", "Start the work");
  const onceAt = c.w("r-future", "take the ticket at once");
  const laterAt = c.w("r-future", "collect the value later");
  const blockAt = c.w("r-future", "by blocking on it or awaiting it");
  const axisY = c.y(720);
  const t0 = R_X + 30;
  const tEnd = 1700;
  const work = ease(frame, startAt + 4, 60);
  const ready = ease(frame, laterAt, 10);
  const tX = lerp(t0, 1380, ease(frame, laterAt - 10, 20));
  return (
    <>
      <Lead at={ticketAt} c={c} term="Future">
        a claim ticket for a result <Band at={notReadyAt}>not ready yet</Band>
      </Lead>
      <Flow points={[[t0, axisY], [tEnd, axisY]]} at={startAt} color={INK_SOFT} width={2} head={13} />
      <Note at={startAt + 6} x={tEnd + 8} y={axisY - 15}>
        <span style={{ ...label(21, INK_SOFT), fontWeight: 650 }}>time</span>
      </Note>
      <Note at={startAt} x={t0 - 10} y={c.y(410)}>
        <span style={{ ...label(21, INK), fontWeight: 650, whiteSpace: "nowrap" }}>start the work</span>
      </Note>
      {/* The work runs on, somewhere else. */}
      <div
        style={{
          position: "absolute",
          left: t0 + 200,
          top: c.y(456),
          width: (1300 - t0 - 200) * work,
          height: c.h(40),
          borderRadius: 7,
          background: tint(BAR, 30),
          border: `2px solid ${BAR}`,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          paddingLeft: 12,
          overflow: "hidden",
          opacity: work > 0 ? 1 : 0,
        }}
      >
        <span style={{ ...label(20, BLUE_INK), fontWeight: 650, whiteSpace: "nowrap" }}>the work, running</span>
      </div>
      {/* The ticket: handed over at once, redeemed later. */}
      {frame >= onceAt ? (
        <Ticket x={tX} y={c.y(548)} w={260} h={c.h(84)} ready={ready}>
          <span style={{ ...label(22, ready > 0.5 ? OK_INK : BLUE_INK), fontWeight: 700, whiteSpace: "nowrap" }}>{ready > 0.5 ? "future: the value" : "future: pending"}</span>
        </Ticket>
      ) : null}
      <Note at={onceAt + 4} x={t0} y={axisY + c.h(18)}>
        <span style={{ ...label(21, BLUE_INK), fontWeight: 650, whiteSpace: "nowrap" }}>the ticket, at once</span>
      </Note>
      <Note at={laterAt + 6} x={1380} y={axisY + c.h(18)}>
        <span style={{ ...label(21, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>the value, later</span>
      </Note>
      <Note at={blockAt} x={R_X} y={c.y(808)}>
        <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
          collect it by blocking (<span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600 }}>.result()</span>) or by awaiting it
        </span>
      </Note>
    </>
  );
};

/**
 * The quick round: seven questions down the left, each answer on the right
 * while it is read, then the bridge into designing objects, with the
 * hummingbird back on the page.
 */
export const RapidScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: n.word, y, h };

  const from = n.beat("rapid-in").from;
  const moreAt = n.word("rapid-in", "Seven more");
  const eachAt = n.word("rapid-in", "a sentence or two each");
  const end = n.beat("next").from - 4;
  const allAt = n.word("next", "All of this was about code running");
  const sameAt = n.word("next", "at the same time");
  const hardAt = n.word("next-change", "Just as hard is code");
  const changeAt = n.word("next-change", "keep changing without breaking");
  const nextAt = n.word("next-change", "Next:");

  const items: RapidItem[] = [
    { n: 10, label: "Locks, mutexes, semaphores", at: n.word("r-lock", "Locks, mutexes and semaphores"), body: <Locks c={c} /> },
    { n: 11, label: "Atomic operations", at: n.word("r-atomic", "An atomic operation"), body: <Atomic c={c} /> },
    { n: 12, label: "Thread-safety", at: n.word("r-safe", "Thread-safe code"), body: <Safe c={c} /> },
    { n: 13, label: "Livelock", at: n.word("r-live", "In a livelock"), body: <Live c={c} /> },
    { n: 14, label: "Starvation", at: n.word("r-starve", "Starvation is"), body: <Starve c={c} /> },
    { n: 15, label: "Thread pools", at: n.word("r-pool", "A thread pool keeps"), body: <Pool c={c} /> },
    { n: 16, label: "Futures and promises", at: n.word("r-future", "And a future is"), body: <Future c={c} /> },
  ];
  const listBottom = y(LIST_TOP) + items.length * h(ROW);

  return (
    <AbsoluteFill>
      <Sfx name="el-chime" at={moreAt} level={-32} />
      {items.map((it) => (
        <Sfx key={it.n} name="el-tap" at={it.at} level={-32} />
      ))}
      <Sfx name="el-pencil" at={nextAt} level={-34} />

      <Drift from={from} to={n.beat("next-change").to + 40}>
        <Kicker at={moreAt}>{SERIES} · Quick round</Kicker>
        <Headline lead="Seven more." turn="A sentence or two each." at={moreAt} turnAt={eachAt - 2} size={64} />
        <RapidFire items={items} x={X0} top={y(LIST_TOP)} rowH={h(ROW)} width={560} at={moreAt + 6} end={end} />

        {/* The bridge. */}
        <Spot id="hummingbird" at={allAt + 4} left={1120} top={y(350)} width={640} height={h(420)} />
        <Note at={allAt} x={X0} y={listBottom + h(40)}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
            All of this was code running <b style={{ color: BLUE_INK, opacity: ease(frame, sameAt, 10) }}>at the same time</b>.
          </span>
        </Note>
        <Note at={hardAt} x={X0} y={listBottom + h(88)}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
            Just as hard: code that has to <b style={{ color: BLUE_INK, opacity: ease(frame, changeAt, 10) }}>keep changing without breaking</b>.
          </span>
        </Note>
        <NextLine at={nextAt} x={X0} y={listBottom + h(150)} width={900}>
          designing objects
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
