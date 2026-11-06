import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Ink, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Band, Block, Drift, Headline, Kicker, OK_INK, SERIES, Spot, tint, X0 } from "./parts";

/** One second of the server's time, in px. */
const SEC = 760;
const ONE = X0 + SEC;
/** A request: a little work, a long wait on the database, a little work. */
const WORK = 0.02;
const WAIT = 0.2;
const REQ = WORK + WAIT + WORK;
const N = 6;
/** When each request starts once they overlap, in seconds. */
const STAGGER = 0.1;
const LANE = 362;
const ROW = 46;
const BAR_H = 34;

/** The sixteen questions, as the chips that preview them. */
const DEEP = ["Concurrency", "Processes", "Races", "The GIL", "Deadlock", "Prevention", "Event loop", "Blocking", "Choosing"];
const QUICK = ["Locks", "Atomic", "Thread-safe", "Livelock", "Starvation", "Pools", "Futures"];

/** One request's bar: work, waiting, work. */
const Request: React.FC<{ w: number }> = ({ w }) => {
  const work = (WORK / REQ) * w;
  return (
    <div style={{ display: "flex", width: w, height: "100%", flexShrink: 0 }}>
      <div style={{ width: work, background: BAR }} />
      <div style={{ flex: 1, background: tint(BAR, 22) }} />
      <div style={{ width: work, background: BAR }} />
    </div>
  );
};

/** A question's chip in the plan: its number over its name, or beside it. */
const Chip: React.FC<{ at: number; x: number; y: number; w: number; h: number; n: number; name: string; big: boolean }> = ({ at, x, y, w, h, n, name, big }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 15);
  if (p <= 0.001) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        boxSizing: "border-box",
        border: `2px solid ${big ? BAR : HAIRLINE}`,
        borderRadius: 10,
        background: big ? tint(BAR, 8) : PAPER,
        display: "flex",
        flexDirection: big ? "column" : "row",
        alignItems: "center",
        justifyContent: "center",
        gap: big ? 2 : "0.4em",
        fontSize: 20,
        opacity: Math.min(1, p),
        transform: `scale(${0.85 + 0.15 * Math.min(1, p)})`,
      }}
    >
      <span style={{ ...label(big ? 24 : 20, big ? ACCENT_INK : INK_SOFT), fontWeight: 700 }}>
        <Num>{n}</Num>
      </span>
      <span style={{ ...label(big ? 21 : 20, INK), fontWeight: 600, whiteSpace: "nowrap" }}>{name}</span>
    </div>
  );
};

/**
 * The opening: a thousand requests a second, each mostly waiting. Served one
 * after another, a server's second holds only a few of them and the queue
 * grows; overlapped, they all fit. Then the three things they come to share,
 * and the round's sixteen questions.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const thousandAt = n.word("hook", "A thousand requests");
  const waitingAt = n.word("hook", "most of its time waiting");
  const dbAt = n.word("hook", "on a database");
  const serviceAt = n.word("hook", "on another service");
  const serialAt = n.word("hook", "Serve them one after another");
  const idleAt = n.word("hook", "sits idle");
  const queueAt = n.word("hook", "the queue grows");
  const onceAt = n.word("hook-share", "Serve them at once");
  const sharingAt = n.word("hook-share", "they start sharing things");
  const counterAt = n.word("hook-share", "a counter");
  const lockAt = n.word("hook-share", "a lock");
  const connAt = n.word("hook-share", "a connection");
  const bugsAt = n.word("hook-share", "That's where the bugs live");
  const sixteenAt = n.word("plan", "Sixteen questions");
  const nineAt = n.word("plan", "Nine get a figure each");
  const sevenAt = n.word("plan", "seven go quickly");
  const end = n.beat("plan").to;

  const w = REQ * SEC;
  const lane = y(LANE);
  const barH = h(BAR_H);
  const rowY = (i: number) => lane + i * h(ROW);
  // Served one after another, request i starts where i-1 ended; at once, a
  // tenth of a second after the one before.
  const serialX = (i: number) => X0 + i * w;
  const onceX = (i: number) => X0 + i * STAGGER * SEC;
  const barAt = (i: number) => (i === 0 ? thousandAt + 10 : serialAt + 2 + (i - 1) * 6);
  const moveAt = (i: number) => onceAt + 2 + i * 3;
  const serialEnd = serialX(N);
  const overrun = ease(frame, serialAt + 2 + (N - 2) * 6, 12) * (1 - ease(frame, onceAt, 10));
  // The queue: requests still to be served pile up while it plays out.
  const queued = Math.max(0, Math.min(9, Math.floor((frame - queueAt) / 5) + 1));
  const dimAt = sixteenAt - 4;
  const dim = 1 - ease(frame, dimAt, 14) * 0.62;
  const lineTop = y(338);
  const lineBottom = y(640);

  const shared = [
    { id: "tally-counter", name: "a counter", at: counterAt, x: 1000 },
    { id: "padlock", name: "a lock", at: lockAt, x: 1280 },
    { id: "plug", name: "a connection", at: connAt, x: 1560 },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={thousandAt + 4} level={-36} />
      <Sfx name="el-tap" at={barAt(0)} level={-31} />
      <Sfx name="el-sprinkle" at={serialAt + 2} level={-31} />
      <Sfx name="el-whoosh" at={onceAt + 2} level={-34} />
      <Sfx name="el-chime" at={sixteenAt} level={-32} />
      <Sfx name="el-sprinkle" at={nineAt} level={-32} />
      <Sfx name="el-sprinkle" at={sevenAt} level={-33} />

      <Drift from={0} to={end + 30}>
        <Kicker at={thousandAt}>{SERIES} · Concurrency</Kicker>
        <Headline lead="A thousand requests in one second," turn="mostly waiting." at={thousandAt} turnAt={waitingAt} size={62} />

        <div style={{ position: "absolute", inset: 0, opacity: dim }}>
          <Note at={thousandAt + 6} x={X0} y={y(290)}>
            <span style={{ ...label(22, INK), fontWeight: 650, whiteSpace: "nowrap" }}>One server, one second: a bar for each request</span>
          </Note>

          {/* The second itself. */}
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            <line
              x1={ONE}
              x2={ONE}
              y1={lineTop}
              y2={lineTop + (lineBottom - lineTop) * ease(frame, thousandAt + 4, 18)}
              stroke={INK}
              strokeWidth={2}
              strokeDasharray="6 5"
            />
          </svg>
          <Note at={thousandAt + 10} x={ONE + 12} y={y(300)}>
            <span style={{ ...label(21, INK), fontWeight: 650, whiteSpace: "nowrap" }}>1 second</span>
          </Note>

          {/* What a request is made of, over the first bar. */}
          <Note at={waitingAt} x={X0} y={lane - h(38)}>
            <span style={{ ...label(20, BLUE_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
              work, then <span style={{ fontWeight: 500, color: INK_SOFT }}>waiting</span>
              <span style={{ fontWeight: 500, color: INK_SOFT, opacity: ease(frame, dbAt, 10) }}> on a database</span>
              <span style={{ fontWeight: 500, color: INK_SOFT, opacity: ease(frame, serviceAt, 10) }}>, or another service</span>
            </span>
          </Note>

          {/* The requests: one after another, then at once. */}
          {Array.from({ length: N }, (_, i) => (
            <Block
              key={i}
              at={barAt(i)}
              grow={8}
              from={{ x: serialX(i), y: lane, w }}
              to={{ x: onceX(i), y: rowY(i), w }}
              moveAt={moveAt(i)}
              moveDur={24}
              h={barH}
              fill={PAPER}
              radius={5}
              style={{ justifyContent: "flex-start" }}
            >
              <Request w={w} />
            </Block>
          ))}
          {/* Past the second: the part of the lane that overruns it. */}
          <div
            style={{
              position: "absolute",
              left: ONE,
              top: lane - 4,
              width: serialEnd - ONE,
              height: barH + 8,
              background: `color-mix(in srgb, ${ACCENT} 18%, transparent)`,
              borderRadius: 4,
              opacity: overrun,
            }}
          />
          <Note at={serialAt + 2 + (N - 1) * 6} x={serialEnd + 18} y={lane + 2} out={onceAt}>
            <span style={{ ...label(21, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>past the second</span>
          </Note>
          <Note at={idleAt - 2} x={X0} y={y(420)} out={onceAt - 2}>
            <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
              The server sits <Band at={idleAt + 2}>idle</Band> through every wait
            </span>
          </Note>
          <Note at={queueAt - 2} x={X0} y={y(470)} out={onceAt - 2}>
            <span style={{ ...note(24, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", fontSize: 24, gap: "0.5em" }}>
              <span>the queue grows</span>
              <span style={{ display: "inline-flex", gap: 8 }}>
                {Array.from({ length: queued }, (_, k) => (
                  <span key={k} style={{ width: 16, height: 16, borderRadius: 8, background: ACCENT, opacity: ease(frame, queueAt + (k - 1) * 5, 6) }} />
                ))}
              </span>
            </span>
          </Note>
          <Note at={moveAt(N - 1) + 18} x={X0} y={rowY(N) + h(12)}>
            <span style={{ ...note(24, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>At once, all six fit inside the second</span>
          </Note>

          {/* What they share. */}
          {shared.map((s) => (
            <React.Fragment key={s.id}>
              <Spot id={s.id} at={s.at} left={s.x} top={y(372)} width={170} height={h(150)} />
              <Ink at={s.at + 2} dur={12} style={{ left: s.x, top: y(556), width: 170, textAlign: "center" }}>
                <span style={{ ...label(24, INK), fontWeight: 650, whiteSpace: "nowrap" }}>{s.name}</span>
              </Ink>
            </React.Fragment>
          ))}
          <Note at={sharingAt} x={1000} y={y(318)} out={counterAt - 2}>
            <span style={{ ...label(22, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>shared by all of them</span>
          </Note>
          <Note at={bugsAt} x={1000} y={y(626)}>
            <span style={{ ...note(28, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>That&apos;s where the bugs live.</span>
          </Note>
          <Spot id="beetle" at={bugsAt + 8} left={1640} top={y(640)} width={140} height={h(124)} />
          <Spot id="database" at={dbAt} out={onceAt - 6} left={1600} top={y(300)} width={170} height={h(150)} />
        </div>

        {/* The round: nine with a figure, seven quickly. */}
        <Note at={nineAt - 2} x={X0} y={y(694)}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>Sixteen questions: nine with a figure each</span>
        </Note>
        {DEEP.map((name, i) => (
          <Chip key={name} at={sixteenAt + 4 + i * 2} x={X0 + i * 162} y={y(728)} w={150} h={h(80)} n={i + 1} name={name} big />
        ))}
        <Note at={sevenAt - 2} x={X0} y={y(838)}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>and seven quickly, at the end</span>
        </Note>
        {QUICK.map((name, i) => (
          <Chip key={name} at={sevenAt + 2 + i * 2} x={X0 + i * 184} y={y(870)} w={172} h={h(44)} n={10 + i} name={name} big={false} />
        ))}
      </Drift>
    </AbsoluteFill>
  );
};
