import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ASYNC, ms } from "./data";
import { Band, Drift, Flow, lerp, Node, OK, OK_INK, tint, X0 } from "./parts";
import { type Axis, msX, MsAxis, WaitBar } from "./timeline";

const AXIS: Axis = { x: 300, perMs: 30 };
const RIGHT_X = 1350;
// The awaiting run (question 7), small, then the blocking one under it.
const GHOST = [352, 392];
const GHOST_H = 30;
const ROWS = [458, 520];
const ROW_H = 46;
// The server: the loop as a lane, the blocking call on it, requests behind.
const LANE_Y = 700;
const LANE_H = 58;
const CALL_W = 300;
const REQS = 6;
const POOL = { x: 1300, y: 676, w: 460, h: 112 };

/**
 * Question 8. The page's two fetches again, with a's await replaced by a
 * blocking sleep (data.ts): a holds the one thread for its whole wait, b
 * starts only after it, a finishes first and the pair takes the sum. In a
 * server: every request behind that one call stalls. The fix: an
 * async-native library, or the call handed to a pool and its result awaited.
 */
export const BlockScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("block").from;
  const qAt = n.word("block", "Question eight");
  const textAt = n.word("block", "Why can't you just call");
  const oneThreadAt = n.word("block", "the loop is one thread");
  const neverAt = n.word("block", "a blocking call never yields");
  const swapAt = n.word("block-run", "Swap a's await for a blocking sleep");
  const holdsAt = n.word("block-run", "a holds the thread");
  const bCantAt = n.word("block-run", "b can't even start its wait");
  const aFirstAt = n.word("block-run", "This time a finishes first");
  const thirtyAt = n.word("block-run", "the pair takes thirty");
  const addUpAt = n.word("block-run", "the waits add up");
  const serverAt = n.word("block-server", "In a server");
  const stallsAt = n.word("block-server", "stalls every request on the loop");
  const httpAt = n.word("block-server", "A synchronous HTTP request");
  const heavyAt = n.word("block-server", "a heavy computation");
  const libsAt = n.word("block-fix", "Use async-native libraries");
  const poolAt = n.word("block-fix", "hand the blocking work to a thread or process pool");
  const awaitAt = n.word("block-fix", "await its result");
  const end = n.beat("block-fix").to;

  const msA = ASYNC.delays.a * 1000;
  const msB = ASYNC.delays.b * 1000;
  const overlapped = ASYNC.overlapped.total * 1000;
  const serial = ASYNC.serial.total * 1000;
  const [first, second] = ASYNC.blocking.finished;
  const rowY = (name: string) => y(name === "a" ? ROWS[0] : ROWS[1]);
  const rowH = h(ROW_H);

  // The server.
  const laneY = y(LANE_Y);
  const laneH = h(LANE_H);
  const moved = ease(frame, poolAt + 8, 22);
  const flow = ease(frame, awaitAt + 6, 40);
  const stalled = ease(frame, stallsAt, 10) * (1 - flow);
  const callX = lerp(AXIS.x, POOL.x + 24, moved);
  const callY = lerp(laneY, y(POOL.y) + h(46), moved);
  const callText = frame >= heavyAt ? "a heavy computation" : frame >= httpAt ? "a sync HTTP request" : "time.sleep(…)";

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={swapAt + 6} level={-35} />
      <Sfx name="el-tap" at={aFirstAt} level={-30} />
      <Sfx name="el-scratch" at={thirtyAt} level={-32} />
      <Sfx name="el-pencil" at={serverAt} level={-35} />
      <Sfx name="el-scratch" at={stallsAt + 2} level={-32} />
      <Sfx name="el-whoosh" at={poolAt + 8} level={-35} />
      <Sfx name="el-chime" at={awaitAt + 10} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={8} at={qAt - 4} textAt={textAt - 4} size={54}>
          Why can&apos;t you just call a blocking function inside a coroutine?
        </QuestionCard>
        <Note at={oneThreadAt} x={X0} y={y(290)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            The loop is one thread<span style={{ opacity: ease(frame, neverAt, 10) }}>, and a blocking call <b style={{ color: ACCENT_INK }}>never yields</b></span>
          </span>
        </Note>

        {/* Question 7's run, kept small for comparison. */}
        {[
          { name: "a", wait: msA },
          { name: "b", wait: msB },
        ].map((f, i) => (
          <React.Fragment key={f.name}>
            <Note at={swapAt - 4} x={AXIS.x - 40} y={y(GHOST[i]) + h(GHOST_H) / 2 - 13}>
              <span style={{ fontFamily: MONO, fontSize: 21, fontWeight: 700, color: INK_SOFT }}>{f.name}</span>
            </Note>
            <WaitBar axis={AXIS} y={y(GHOST[i])} h={h(GHOST_H)} start={0} stop={f.wait} at={swapAt - 4} color={ds("gray", 400)} dur={12} />
          </React.Fragment>
        ))}
        <Note at={swapAt} x={RIGHT_X} y={y(GHOST[0]) + h(6)}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
            awaiting: about <Num>{overlapped}</Num> ms
          </span>
        </Note>

        {/* The blocking run. */}
        {["a", "b"].map((name) => (
          <Note key={name} at={swapAt + 2} x={AXIS.x - 44} y={rowY(name) + rowH / 2 - 17}>
            <span style={{ fontFamily: MONO, fontSize: 26, fontWeight: 700, color: BLUE_INK }}>{name}</span>
          </Note>
        ))}
        <WaitBar axis={AXIS} y={rowY("a")} h={rowH} start={0} stop={msA} at={holdsAt} color={ACCENT} solid>
          <span style={{ ...label(21, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>blocking sleep: holds the thread</span>
        </WaitBar>
        <WaitBar axis={AXIS} y={rowY("b")} h={rowH} start={msA} stop={msA + msB} at={bCantAt + 8} color={BAR}>
          <span style={{ ...label(21, BLUE_INK), fontWeight: 650, whiteSpace: "nowrap" }}>await, {ms(msB / 1000)}</span>
        </WaitBar>
        <Note at={bCantAt + 2} x={AXIS.x + 12} y={rowY("b") + rowH / 2 - 14} out={bCantAt + 8}>
          <span style={{ ...label(20, INK_SOFT), fontWeight: 600, whiteSpace: "nowrap" }}>can&apos;t start yet</span>
        </Note>
        <Note at={aFirstAt} x={msX(AXIS, msA) + 14} y={rowY(first) + rowH / 2 - 15}>
          <span style={{ ...label(21, INK), fontWeight: 700, whiteSpace: "nowrap" }}>✓ {first} done, first</span>
        </Note>
        <Note at={thirtyAt - 4} x={msX(AXIS, msA + msB) + 14} y={rowY(second) + rowH / 2 - 15}>
          <span style={{ ...label(21, INK), fontWeight: 700, whiteSpace: "nowrap" }}>✓ {second} done</span>
        </Note>
        <MsAxis axis={AXIS} y={rowY("b") + rowH + h(26)} to={serial} at={swapAt + 4} />
        <Note at={thirtyAt} x={RIGHT_X} y={rowY("a") + h(4)}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            blocking: <Num>{serial}</Num> ms
          </span>
        </Note>
        <Note at={addUpAt} x={RIGHT_X} y={rowY("a") + h(44)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>the waits add up instead of overlapping</span>
        </Note>

        {/* In a server: one call, and every request on the loop behind it. */}
        <Note at={serverAt} x={X0} y={laneY + laneH / 2 - 15}>
          <span style={{ ...label(21, INK), fontWeight: 700, whiteSpace: "nowrap" }}>the loop</span>
        </Note>
        <div
          style={{
            position: "absolute",
            left: AXIS.x - 10,
            top: laneY - 8,
            width: 920,
            height: laneH + 16,
            borderRadius: 10,
            background: ds("gray", 50),
            border: `1.5px solid ${HAIRLINE}`,
            boxSizing: "border-box",
            opacity: ease(frame, serverAt, 12),
          }}
        />
        {Array.from({ length: REQS }, (_, k) => {
          const at = serverAt + 4 + k * 3;
          const p = ease(frame, at, 10);
          if (p <= 0) return null;
          // Once the loop runs again, the requests are served and leave.
          const done = ease(frame, awaitAt + 6 + k * 5, 14);
          const x = AXIS.x + CALL_W + 30 + k * 96 - done * 60;
          return (
            <div
              key={k}
              style={{
                position: "absolute",
                left: x,
                top: laneY + 7,
                width: 84,
                height: laneH - 14,
                borderRadius: 8,
                boxSizing: "border-box",
                border: `2.5px solid ${done > 0.5 ? OK : stalled > 0.5 ? ds("gray", 400) : BAR}`,
                background: done > 0.5 ? tint(OK, 16) : stalled > 0.5 ? ds("gray", 100) : tint(BAR, 12),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: p * (1 - done * 0.9),
              }}
            >
              <span style={{ ...label(20, done > 0.5 ? OK_INK : stalled > 0.5 ? INK_SOFT : BLUE_INK), fontWeight: 700 }}>req {k + 1}</span>
            </div>
          );
        })}
        <div
          style={{
            position: "absolute",
            left: callX,
            top: callY + 4,
            width: CALL_W,
            height: laneH - 8,
            borderRadius: 8,
            boxSizing: "border-box",
            border: `2.5px solid ${moved > 0.5 ? INK : ACCENT}`,
            background: moved > 0.5 ? PAPER : tint(ACCENT, 30),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: ease(frame, serverAt + 2, 10),
          }}
        >
          <span style={{ ...label(21, moved > 0.5 ? INK : ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>{callText}</span>
        </div>
        <Note at={stallsAt} x={AXIS.x} y={laneY + laneH + h(26)} out={awaitAt - 2}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            One call, and <Band at={stallsAt + 6}>every request</Band> on the loop stalls until it returns
          </span>
        </Note>

        {/* The fix. */}
        <Node x={POOL.x} y={y(POOL.y)} w={POOL.w} h={h(POOL.h)} at={poolAt} tone="plain" fill={PAPER} align="left" justify="flex-start">
          <span style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap", marginTop: 10 }}>
            a thread or process pool <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 600 }}>(run_in_executor)</span>
          </span>
        </Node>
        <Flow points={[[POOL.x + CALL_W / 2 + 24, y(POOL.y) + h(POOL.h) + 6], [POOL.x + CALL_W / 2 + 24, laneY + laneH + h(70)], [AXIS.x + 120, laneY + laneH + h(70)], [AXIS.x + 120, laneY + laneH + 12]]} at={awaitAt} color={OK} width={2.6} dash="8 6" />
        <Note at={awaitAt + 6} x={AXIS.x + 150} y={laneY + laneH + h(92)}>
          <span style={{ ...note(23, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>await its result: the loop runs on</span>
        </Note>
        <Note at={libsAt} x={POOL.x} y={y(612)}>
          <span style={{ ...note(23, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>The fix: async-native libraries, or</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
