import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { RACE } from "./data";
import { Band, Drift, Flow, lerp, LockGlyph, OK, OK_INK, pulse, Spot, THREAD, tint, X0 } from "./parts";

const STEP_X = 270;
const CHIP_W = 100;
const SLOT = 110;
const CHIP_H = 58;
const ROWS = [570, 654];
// The grid of every order, on the right.
const G_X = 1016;
const G_TOP = 382;
const COL_W = 198;
const ROW_H = 60;
const SQ = 20;

/** The thread a step letter names: A is thread 1, B thread 2. */
const who = (letter: string) => (letter === "A" ? 0 : 1);

/**
 * The page's model, stepped through one order: each thread reads the
 * counter into its own register, adds one there, and writes the register
 * back. What every step sees, so the chips can say it. The final value is
 * checked against what check.mjs got for the same order.
 */
const trace = (order: readonly string[], start: number) => {
  let shared = start;
  const reg: Record<string, number> = {};
  const seen = order.map((s) => {
    const [w, step] = s.split(" ");
    if (step === "read") reg[w] = shared;
    else if (step === "add") reg[w] += 1;
    else shared = reg[w];
    return { who: w, step, value: step === "write" ? shared : reg[w], after: shared };
  });
  return { seen, result: shared };
};
const LOST = trace(RACE.bothRead.order, RACE.one.start);
if (LOST.result !== RACE.bothRead.result) throw new Error(`race: the chips say ${LOST.result}, results.json ${RACE.bothRead.result}`);
const EVERY = RACE.one.every ?? [];
if (EVERY.length !== RACE.one.orders) throw new Error("race: results.json has no list of every order");
const LOCKED = RACE.locked.every ?? [];

/** One order of the six steps: a square per step in its thread's color, then the counter it leaves. */
const Order: React.FC<{ threads: string; result: number; x: number; y: number; at: number; judged: number; dim: number }> = ({ threads, result, x, y, at, judged, dim }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  if (p <= 0.001) return null;
  const right = result === RACE.one.right;
  const ink = judged > 0.5 ? (right ? OK_INK : ACCENT_INK) : INK;
  return (
    <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "center", gap: 4, fontSize: 22, opacity: Math.min(1, p) * (1 - dim), transform: `scale(${0.85 + 0.15 * Math.min(1, p)})`, transformOrigin: "0 50%" }}>
      {[...threads].map((c, i) => (
        <span key={i} style={{ width: SQ, height: SQ, borderRadius: 4, background: THREAD[who(c)].fill }} />
      ))}
      <span
        style={{
          marginLeft: 10,
          ...label(22, ink),
          fontWeight: 750,
          padding: "0 6px",
          borderRadius: 5,
          background: judged > 0 ? tint(right ? OK : ACCENT, 18 * judged) : "transparent",
        }}
      >
        <Num>{result}</Num>
      </span>
    </div>
  );
};

/**
 * Question 3. A counter at five; two threads each add one, in three steps.
 * Both read five and both write six: one increment lost. Every order the six
 * steps can run in is drawn from results.json: twenty, two leave seven. With
 * the three steps under a lock, two orders are left and both leave seven.
 * Which order runs is timing, so the same test passes and fails.
 */
export const RaceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("race").from;
  const qAt = n.word("race", "Question three");
  const textAt = n.word("race", "What is a race condition");
  const timingAt = n.word("race", "depends on the timing");
  const classicAt = n.word("race", "The classic case is a counter");
  const counterWordAt = n.word("race", "a counter");
  const twoAt = n.word("race", "two threads each add one to");
  const readAt = n.word("race-steps", "read the value");
  const addAt = n.word("race-steps", "add one");
  const writeAt = n.word("race-steps", "write it back");
  const fiveAt = n.word("race-lost", "The counter is at five");
  const bothReadAt = n.word("race-lost", "Both threads read five");
  const bothAddAt = n.word("race-lost", "both add one");
  const bothWriteAt = n.word("race-lost", "both write six");
  const lostAt = n.word("race-lost", "one is lost");
  const countAt = n.word("race-count", "Count every order");
  const twentyAt = n.word("race-count", "there are twenty");
  const sevenAt = n.word("race-count", "Only two of them give seven");
  const eighteenAt = n.word("race-count", "The other eighteen lose an update");
  const fixAt = n.word("race-lock", "The fix is a lock");
  const sectionAt = n.word("race-lock", "one critical section");
  const ordersAt = n.word("race-lock", "two orders are left");
  const bothSevenAt = n.word("race-lock", "both give seven");
  const pauseAt = n.word("race-hides", "where a thread happens to pause");
  const passAt = n.word("race-hides", "pass today");
  const failAt = n.word("race-hides", "fail tomorrow");
  const sameAt = n.word("race-hides", "no change to the code");
  const end = n.beat("race-hides").to;

  const rowY = ROWS.map((v) => y(v));
  const chipH = h(CHIP_H);
  // Chip placement: the steps in a row per thread, then in the losing order
  // on one timeline, then fused under the lock.
  const toOrder = ease(frame, bothReadAt - 6, 20);
  const toFuse = ease(frame, fixAt + 4, 18);
  const fused = ease(frame, sectionAt, 12);
  const slotOf = (t: number, s: number) => RACE.bothRead.order.indexOf(`${"AB"[t]} ${RACE.steps[s]}`);
  const stepAt = [readAt, addAt, writeAt];
  const shownAt = [bothReadAt, bothAddAt, bothWriteAt];

  // The counter: five, then the writes land; seven once the lock is in.
  const counter = frame >= bothSevenAt ? RACE.locked.right : frame >= bothWriteAt + 6 ? LOST.result : RACE.one.start;
  const counterTone = frame >= bothSevenAt ? "ok" : frame >= lostAt ? "bad" : "data";
  const counterInk = counterTone === "ok" ? OK_INK : counterTone === "bad" ? ACCENT_INK : BLUE_INK;
  const gridOut = ease(frame, fixAt + 2, 12);
  const judge7 = ease(frame, sevenAt, 10);
  const judge6 = ease(frame, eighteenAt, 10);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={bothWriteAt + 6} level={-29} />
      <Sfx name="el-scratch" at={lostAt} level={-31} />
      <Sfx name="el-sprinkle" at={countAt + 4} level={-31} />
      <Sfx name="el-whoosh" at={fixAt + 4} level={-35} />
      <Sfx name="el-tap" at={bothSevenAt} level={-29} />
      <Sfx name="el-tap" at={passAt + 2} level={-31} />
      <Sfx name="el-scratch" at={failAt + 2} level={-31} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} size={58}>
          What is a race condition?
        </QuestionCard>
        <Note at={timingAt - 4} x={X0} y={y(290)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            The result depends on the <Band at={timingAt + 2}>timing</Band> of operations on shared state
          </span>
        </Note>

        {/* The shared counter. */}
        <Note at={classicAt} x={X0} y={y(356)}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 650 }}>the counter</span>
        </Note>
        <div
          style={{
            position: "absolute",
            left: X0,
            top: y(390),
            opacity: ease(frame, classicAt, 10),
            transform: `scale(${1 + 0.12 * Math.max(pulse(frame, fiveAt, 18), pulse(frame, bothWriteAt + 6, 18))})`,
            transformOrigin: "0 50%",
          }}
        >
          <span style={{ ...label(64, counterInk), fontWeight: 750, lineHeight: 1 }}>
            <Num>{counter}</Num>
          </span>
        </div>
        <Spot id="tally-counter" at={counterWordAt} out={countAt - 10} left={1330} top={y(400)} width={210} height={h(190)} />

        {/* Two threads, three steps each. */}
        {[0, 1].map((t) => (
          <Note key={t} at={twoAt + t * 4} x={X0} y={rowY[t] + chipH / 2 - 14}>
            <span style={{ ...label(21, THREAD[t].ink), fontWeight: 600, whiteSpace: "nowrap" }}>thread {t + 1}</span>
          </Note>
        ))}
        {[0, 1].map((t) =>
          RACE.steps.map((step, s) => {
            const at = Math.max(twoAt + 6 + t * 4, stepAt[s] - 2);
            const p = ease(frame, at, 10);
            if (p <= 0) return null;
            const slot = slotOf(t, s);
            const seen = LOST.seen[slot];
            const xRow = STEP_X + s * SLOT;
            const xOrder = STEP_X + slot * SLOT;
            const xFuse = STEP_X + s * CHIP_W;
            const x = lerp(lerp(xRow, xOrder, toOrder), xFuse, toFuse);
            const th = THREAD[t];
            const valued = ease(frame, shownAt[s] + t * 6, 10) * (1 - toFuse);
            const lost = t === 0 && s === 2 ? ease(frame, lostAt, 10) * (1 - toFuse) : 0;
            return (
              <div
                key={`${t}${s}`}
                style={{
                  position: "absolute",
                  left: x,
                  top: rowY[t],
                  width: CHIP_W - (toFuse > 0 ? 0 : 8),
                  height: chipH,
                  boxSizing: "border-box",
                  borderRadius: toFuse > 0.5 ? 0 : 8,
                  border: `2.5px solid ${lost > 0 ? ACCENT : th.fill}`,
                  background: tint(lost > 0 ? ACCENT : th.fill, 20),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.3em",
                  fontSize: 21,
                  opacity: p * (1 - fused),
                }}
              >
                <span style={{ ...label(21, th.ink), fontWeight: 600 }}>{step}</span>
                {valued > 0 ? (
                  <span style={{ ...label(21, lost > 0 ? ACCENT_INK : BLUE_INK), fontWeight: 750, opacity: valued }}>
                    <Num>{seen.value}</Num>
                  </span>
                ) : null}
              </div>
            );
          }),
        )}
        {/* Under the lock: one block per thread. */}
        {[0, 1].map((t) => (
          <div
            key={t}
            style={{
              position: "absolute",
              left: STEP_X,
              top: rowY[t],
              width: 3 * CHIP_W,
              height: chipH,
              boxSizing: "border-box",
              borderRadius: 8,
              border: `2.5px solid ${THREAD[t].fill}`,
              background: tint(THREAD[t].fill, 20),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              opacity: fused,
            }}
          >
            <LockGlyph size={24} color={INK} />
            <span style={{ ...label(21, THREAD[t].ink), fontWeight: 600, whiteSpace: "nowrap" }}>read, add, write</span>
          </div>
        ))}
        <Flow points={[[STEP_X, y(736)], [STEP_X + 6 * SLOT - 10, y(736)]]} at={bothReadAt} color={INK_SOFT} width={2} head={13} out={fixAt} />
        <Note at={bothReadAt + 4} x={STEP_X + 6 * SLOT + 6} y={y(736) - 15} out={fixAt}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 650 }}>time</span>
        </Note>
        <Note at={lostAt} x={STEP_X} y={y(762)} out={fixAt}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 600, whiteSpace: "nowrap" }}>
            Two increments, and the counter reads <Num>{LOST.result}</Num>: one is lost
          </span>
        </Note>
        <Note at={sectionAt + 4} x={STEP_X} y={y(736)}>
          <span style={{ ...note(24, OK_INK), fontWeight: 600, whiteSpace: "nowrap" }}>One critical section: a lock around all three</span>
        </Note>

        {/* Every order the six steps can run in. */}
        <Note at={countAt} x={G_X} y={y(326)} out={fixAt + 2}>
          <span style={{ ...label(22, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            Every order of the six steps<span style={{ opacity: ease(frame, twentyAt, 10) }}>
              : <Num>{RACE.one.orders}</Num>
            </span>
          </span>
        </Note>
        {EVERY.map((o, k) => (
          <Order
            key={o.threads}
            threads={o.threads}
            result={o.result}
            x={G_X + (k % 4) * COL_W}
            y={y(G_TOP) + Math.floor(k / 4) * h(ROW_H)}
            at={countAt + 4 + k * 2}
            judged={o.result === RACE.one.right ? judge7 : judge6}
            dim={gridOut}
          />
        ))}
        <Note at={sevenAt} x={G_X} y={y(G_TOP) + 5 * h(ROW_H) + h(10)} out={fixAt + 2}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: OK_INK }}>
              <Num>{RACE.one.rightOrders}</Num> give <Num>{RACE.one.right}</Num>
            </b>
            <span style={{ opacity: judge6 }}>
              , <b style={{ color: ACCENT_INK }}>
                <Num>{RACE.one.orders - RACE.one.rightOrders}</Num> give <Num>{LOST.result}</Num>
              </b>
            </span>
          </span>
        </Note>
        {/* With the lock: two orders, both right. */}
        <Note at={ordersAt - 2} x={G_X} y={y(326)}>
          <span style={{ ...label(22, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            With the lock: <Num>{RACE.locked.orders}</Num> orders
          </span>
        </Note>
        {LOCKED.map((o, k) => {
          const at = ordersAt + 2 + k * 6;
          const p = ease(frame, at, 12);
          if (p <= 0) return null;
          const judged = ease(frame, bothSevenAt, 10);
          return (
            <div key={o.threads} style={{ position: "absolute", left: G_X, top: y(G_TOP) + k * h(76), display: "flex", alignItems: "center", gap: 8, fontSize: 22, opacity: p }}>
              {[...o.threads].map((c, i) => (
                <span
                  key={i}
                  style={{
                    width: 150,
                    height: h(48),
                    borderRadius: 7,
                    border: `2.5px solid ${THREAD[who(c)].fill}`,
                    background: tint(THREAD[who(c)].fill, 20),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    ...label(21, THREAD[who(c)].ink),
                    fontWeight: 600,
                  }}
                >
                  thread {who(c) + 1}
                </span>
              ))}
              <span style={{ marginLeft: 12, ...label(24, judged > 0.5 ? OK_INK : INK), fontWeight: 750, padding: "0 6px", borderRadius: 5, background: tint(OK, 18 * judged) }}>
                <Num>{o.result}</Num>
              </span>
            </div>
          );
        })}

        {/* The same test, two days. */}
        <Note at={pauseAt} x={X0} y={y(846)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            Which order runs is timing:
            <b style={{ color: OK_INK, opacity: ease(frame, passAt, 10) }}> ✓ today: pass</b>
            <span style={{ color: INK_SOFT, opacity: ease(frame, failAt, 10) }}> · </span>
            <b style={{ color: ACCENT_INK, opacity: ease(frame, failAt, 10) }}>✕ tomorrow: fail</b>
            <span style={{ color: INK_SOFT, opacity: ease(frame, sameAt, 10) }}> · same code, no change</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
