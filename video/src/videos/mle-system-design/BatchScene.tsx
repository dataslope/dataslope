import { Clock, Moon, Search, Server } from "lucide-react";
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Flow, Line, Mark, MiniMap, Node, OK, OK_INK, pulse, Q_SIZE, Q_W, Spot, Tag, X0 } from "./parts";

const JOB = { x: X0, w: 240, h: 84 };
const TABLE = { x: 470, w: 340 };
const NOTE_X = 900;
const SERVICE = { x: 470, w: 340, h: 84 };
const ROWS = [
  ["ana", "boots, socks, scarf"],
  ["ben", "tent, stove, lamp"],
  ["cy", "paint, brush, easel"],
] as const;

/**
 * Question 1: two ways a prediction reaches a user, one above the other.
 * Batch: a nightly job fills a table of every user's picks, and a request at
 * 18:00 reads a row sixteen hours old. Online: each request goes to a model
 * service and comes straight back, with what is in the cart, and the service
 * is yours to keep fast, scaled and up. Then how to choose: a stored answer
 * is the fastest thing to serve, so batch is not the slow option; it only
 * fails when the input is not known in advance (a search nobody has typed);
 * and most systems mix the two.
 */
export const BatchScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q1").from;
  const qAt = n.word("q1", "Question one");
  const textAt = n.word("q1", "Batch versus online inference");
  const batchAt = n.word("q1", "Batch scores everything");
  const scheduleAt = n.word("q1", "on a schedule");
  const storesAt = n.word("q1", "stores the answers");
  const usersAt = n.word("q1", "every user's recommendations");
  const overnightAt = n.word("q1", "overnight");
  const cheapAt = n.word("q1", "cheap and simple");
  const staleAt = n.word("q1", "but stale");
  const requestTimeAt = n.word("q1", "known only at request time");
  const onlineAt = n.word("q1-online", "Online scores each request");
  const serviceAt = n.word("q1-online", "a low-latency service");
  const freshAt = n.word("q1-online", "It's fresh");
  const cartAt = n.word("q1-online", "what's in the cart");
  const ownAt = n.word("q1-online", "you own");
  const budgetAt = n.word("q1-online", "the latency budget");
  const scalingAt = n.word("q1-online", "the scaling");
  const uptimeAt = n.word("q1-online", "the uptime");
  const chooseAt = n.word("q1-choose", "choose by freshness and latency");
  const lookupAt = n.word("q1-choose", "only a lookup");
  const heavyAt = n.word("q1-choose", "a heavy model on a tight budget");
  const yesterdayAt = n.word("q1-choose", "yesterday's answer will do");
  const precomputeAt = n.word("q1-choose", "you can't precompute");
  const typedAt = n.word("q1-choose", "nobody has typed yet");
  const mixAt = n.word("q1-choose", "Many systems mix the two");
  const inAt = n.word("q2-in", "Serving online");
  const end = n.beat("q2-in").to;

  const jobMid = y(418);
  const rowY = (i: number) => y(406) + i * h(34);
  const svcMid = y(708);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={scheduleAt} level={-30} />
      <Sfx name="el-sprinkle" at={usersAt} level={-33} />
      <Sfx name="el-pencil" at={staleAt} level={-35} />
      <Sfx name="el-tap" at={onlineAt} level={-30} />
      <Sfx name="el-whoosh" at={serviceAt + 8} level={-36} />
      <Sfx name="el-pop" at={cartAt} level={-30} />
      <Sfx name="el-tap" at={budgetAt} level={-31} />
      <Sfx name="el-tap" at={scalingAt} level={-31} />
      <Sfx name="el-tap" at={uptimeAt} level={-31} />
      <Sfx name="el-tap" at={lookupAt} level={-31} />
      <Sfx name="el-tap" at={precomputeAt} level={-31} />
      <Sfx name="el-scratch" at={typedAt} level={-33} />
      <Sfx name="el-chime" at={mixAt + 10} level={-33} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE} width={Q_W}>
          Batch vs online inference, and how do you choose?
        </QuestionCard>
        <MiniMap
          at={qAt}
          lit={[
            ["prediction", qAt + 10],
            ["features", inAt],
          ]}
        />

        {/* ── Batch: a nightly job fills a table; a request reads its row. ── */}
        <Line at={batchAt} x={X0} y={y(330)} size={26}>
          Batch
        </Line>
        <Node x={JOB.x} y={jobMid - JOB.h / 2} w={JOB.w} h={JOB.h} at={scheduleAt} icon={Moon} title="Nightly Job" sub="runs at 02:00" lit={overnightAt} litOut={overnightAt + 40} />
        <Flow points={[[JOB.x + JOB.w + 3, jobMid], [TABLE.x - 10, jobMid]]} at={storesAt} color={BAR} />
        <Ink at={storesAt + 2} dur={12} style={{ left: TABLE.x + 10, top: y(368), whiteSpace: "nowrap", display: "flex", gap: 0, fontSize: 20 }}>
          <span style={{ ...label(20, INK_SOFT), width: 80 }}>user</span>
          <span style={{ ...label(20, INK_SOFT) }}>top picks</span>
        </Ink>
        <div
          style={{
            position: "absolute",
            left: TABLE.x,
            top: y(368) + 32,
            width: TABLE.w,
            height: 1,
            background: HAIRLINE,
            opacity: ease(frame, storesAt + 4, 12),
          }}
        />
        {ROWS.map(([user, picks], i) => (
          <Ink key={user} at={usersAt + i * 5} dur={12} style={{ left: TABLE.x + 10, top: rowY(i), whiteSpace: "nowrap", display: "flex", fontSize: 21 }}>
            <span style={{ ...note(21, INK), width: 80 }}>{user}</span>
            <span style={{ ...note(21, BLUE_INK) }}>{picks}</span>
          </Ink>
        ))}
        {/* The 18:00 request reads ana's row. */}
        <Flow points={[[NOTE_X - 12, rowY(0) + 14], [TABLE.x + TABLE.w + 8, rowY(0) + 14]]} at={staleAt} color={BAR} />
        <Ink at={staleAt} dur={12} style={{ left: NOTE_X, top: rowY(0) - 2, whiteSpace: "nowrap" }}>
          <span style={{ ...label(22, INK), fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 8, fontSize: 22 }}>
            <Clock size={22} color={INK} strokeWidth={2} />
            Request at 18:00
          </span>
        </Ink>
        <Ink at={staleAt + 6} dur={12} style={{ left: NOTE_X, top: rowY(0) + h(40), whiteSpace: "nowrap" }}>
          <span style={{ ...note(22, INK), fontWeight: 500 }}>
            <Mark at={staleAt + 8}>
              <span style={{ display: "inline-block", transform: `scale(${1 + 0.06 * pulse(frame, yesterdayAt, 22)})` }}>16 h old</span>
            </Mark>
          </span>
        </Ink>
        <Ink at={lookupAt} dur={12} style={{ left: NOTE_X, top: rowY(0) + h(80), whiteSpace: "nowrap" }}>
          <span style={{ ...note(22, BLUE_INK), fontWeight: 500 }}>Lookup: fast</span>
        </Ink>
        <Line at={cheapAt} x={X0} y={y(516)} size={21} color={INK_SOFT}>
          Cheap and simple
        </Line>
        <Line at={requestTimeAt} x={X0} y={y(552)} size={21}>
          Can&apos;t use anything known only at request time
        </Line>

        {/* A search nobody has typed yet: nothing to precompute. */}
        <Ink at={precomputeAt} dur={14} style={{ left: 1330, top: y(372), whiteSpace: "nowrap" }}>
          <div
            style={{
              width: 360,
              height: 58,
              boxSizing: "border-box",
              border: `2px solid ${INK}`,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "0 16px",
            }}
          >
            <Search size={24} color={INK} strokeWidth={2} />
            <span style={{ width: 2, height: 28, background: INK, opacity: Math.floor((frame - precomputeAt) / 15) % 2 === 0 ? 1 : 0 }} />
          </div>
        </Ink>
        <Line at={typedAt} x={1330} y={y(372) + 78} size={22} color={ACCENT_INK}>
          Can&apos;t precompute
        </Line>
        <Line at={typedAt + 8} x={1330} y={y(372) + 78 + h(36)} size={21} color={INK_SOFT}>
          a search nobody has typed yet
        </Line>

        {/* ── Online: each request to a model service and straight back. ── */}
        <Line at={onlineAt} x={X0} y={y(620)} size={26}>
          Online
        </Line>
        <Node x={X0} y={svcMid - SERVICE.h / 2} w={240} h={SERVICE.h} at={onlineAt + 2} title="Request" sub="with its cart" lit={cartAt} litOut={ownAt} />
        <Flow points={[[X0 + 243, svcMid - 14], [SERVICE.x - 3, svcMid - 14]]} at={serviceAt} color={BAR} />
        <Node x={SERVICE.x} y={svcMid - SERVICE.h / 2} w={SERVICE.w} h={SERVICE.h} at={serviceAt} icon={Server} title="Model Service" sub="scores it now" />
        <Flow points={[[SERVICE.x - 3, svcMid + 14], [X0 + 243, svcMid + 14]]} at={serviceAt + 10} color={INK} />
        <Line at={freshAt} x={NOTE_X} y={svcMid - h(36)} size={22}>
          Fresh, and can use context
        </Line>
        <Line at={heavyAt} x={NOTE_X} y={svcMid + h(4)} size={22} color={INK}>
          Must compute inside the budget
        </Line>
        <Spot id="cart" at={cartAt} x={1460} y={y(628)} w={170} />
        <Ink at={ownAt} dur={12} style={{ left: SERVICE.x, top: svcMid + SERVICE.h / 2 + h(30), whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 12, fontSize: 21 }}>
          <span style={{ ...note(21, INK_SOFT) }}>Yours to own:</span>
          <span style={{ opacity: ease(frame, budgetAt, 10) }}>
            <Tag size={21}>latency budget</Tag>
          </span>
          <span style={{ opacity: ease(frame, scalingAt, 10) }}>
            <Tag size={21}>scaling</Tag>
          </span>
          <span style={{ opacity: ease(frame, uptimeAt, 10) }}>
            <Tag size={21}>uptime</Tag>
          </span>
        </Ink>

        {/* ── How to choose, and the mix most systems use. ── */}
        <Line at={chooseAt} x={X0} y={y(852)} size={24}>
          Choose by freshness and latency
        </Line>
        <Ink at={mixAt} dur={14} style={{ left: X0, top: y(852) + h(46), whiteSpace: "nowrap" }}>
          <span style={{ ...note(24, OK_INK), fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 12, fontSize: 24 }}>
            <Tick at={mixAt + 6} size={26} color={OK} />
            Hybrid: features cached in batch, light scoring online
          </span>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
