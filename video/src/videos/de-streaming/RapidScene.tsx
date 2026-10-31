import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { NextLine, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { COMPACTION } from "./data";
import { Box, Cell, Drift, ElbowArrow, Headline, Kicker, Lane, OK, OK_INK, QUIET, Spot, Strike, USER_INK, X0 } from "./parts";

const R_X = 800;
const LIST_TOP = 340;
const ROW = 64;

type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"] };

// ── 13. Log compaction ──────────────────────────────────────────────────────

const Compaction: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const startAt = c.w("r-compact", "Log compaction keeps");
  const latestAt = c.w("r-compact", "the latest value for each key");
  const olderAt = c.w("r-compact", "clears out older ones");
  const ageAt = c.w("r-compact", "instead of expiring by age");
  const snapAt = c.w("r-compact", "a snapshot of current state");
  const profileAt = c.w("r-compact", "each user's latest profile");
  const rebuildAt = c.w("r-compact", "to rebuild state from");
  const retentionAt = c.w("r-compact", "alongside time-based retention");
  const STEP = 124;
  const W = 110;
  const logY = c.y(400);
  const keptY = c.y(560);
  const cx = (off: number) => R_X + off * STEP;
  return (
    <>
      <Note at={startAt} x={R_X} y={c.y(330)}>
        <span style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>profile updates, keyed by user: the log, oldest first</span>
      </Note>
      {COMPACTION.log.map((r) => {
        const p = ease(frame, startAt + 2 + r.offset * 2, 8);
        const old = r.kept ? 0 : ease(frame, olderAt + 2 + r.offset * 2, 10);
        const keep = r.kept ? ease(frame, latestAt + 2, 10) : 0;
        return (
          <React.Fragment key={r.offset}>
            <div style={{ position: "absolute", left: cx(r.offset), width: W, top: logY - c.h(34), textAlign: "center", ...label(20, INK_SOFT), fontWeight: 650, ...TABULAR, opacity: p }}>
              {r.offset}
            </div>
            <Cell x={cx(r.offset)} y={logY} w={W} h={c.h(50)} user={r.user} size={21} opacity={p * (1 - 0.6 * old)} ring={keep > 0 ? OK : undefined} ringP={keep}>
              <span style={{ fontVariantNumeric: "normal" }}>
                {old > 0.5 ? <Strike at={olderAt + 4 + r.offset * 2}>{`${r.user} v${r.version}`}</Strike> : `${r.user} v${r.version}`}
              </span>
            </Cell>
          </React.Fragment>
        );
      })}
      <Note at={ageAt} x={R_X} y={logY + c.h(66)}>
        <span style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>by key, not by age</span>
      </Note>
      {COMPACTION.log
        .filter((r) => r.kept)
        .map((r) => (
          <Cell key={r.offset} x={cx(r.offset)} y={keptY} w={W} h={c.h(50)} user={r.user} size={21} opacity={ease(frame, snapAt + r.offset, 10)}>
            <span style={{ fontVariantNumeric: "normal" }}>{`${r.user} v${r.version}`}</span>
          </Cell>
        ))}
      <Note at={snapAt} x={R_X} y={keptY + c.h(4)}>
        <span style={{ ...note(24, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
          compacted: <Num>{COMPACTION.kept}</Num> of <Num>{COMPACTION.log.length}</Num>
        </span>
      </Note>
      <Note at={profileAt} x={R_X} y={keptY + c.h(40)}>
        <span style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>each user's latest profile</span>
      </Note>
      <ElbowArrow
        points={[
          [cx(5) + W / 2, keptY + c.h(58)],
          [cx(5) + W / 2, c.y(700)],
        ]}
        at={rebuildAt}
        color={BAR}
        dur={10}
        head={12}
      />
      <Box x={cx(4)} y={c.y(712)} w={2 * STEP + W} h={c.h(58)} at={rebuildAt + 6} size={21}>
        a state store, rebuilt from it
      </Box>
      <Note at={retentionAt} x={R_X} y={c.y(820)}>
        <span style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>alongside time-based retention, not instead of it</span>
      </Note>
    </>
  );
};

// ── 14. Stream joins against batch joins ────────────────────────────────────

const CLICKS = [1.0, 3.2, 5.5, 8.0, 10.4];
const BUYS = [2.0, 6.4, 9.6];
const MATCH: [number, number][] = [
  [2, 1],
  [4, 2],
];

const Join: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const batchAt = c.w("r-join", "A batch join can wait");
  const cantAt = c.w("r-join", "a stream join can't");
  const neverAt = c.w("r-join", "neither side ends");
  const s2sAt = c.w("r-join", "Stream to stream");
  const bufAt = c.w("r-join", "buffers each side's recent events");
  const matchAt = c.w("r-join", "matches across them");
  const expireAt = c.w("r-join", "expire old state");
  const tableAt = c.w("r-join", "Stream to table");
  const looksAt = c.w("r-join", "looks up a table");
  const compactAt = c.w("r-join", "a compacted topic");
  const X1 = 1700;
  const tx = (t: number) => R_X + 120 + (t / 12) * (X1 - R_X - 120);
  const cy = c.y(490);
  const by = c.y(580);
  const winFrom = 4.6;
  const old = ease(frame, expireAt, 12);
  return (
    <>
      <Note at={batchAt} x={R_X} y={c.y(330)}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>batch join: both tables are complete, so it waits for every row</span>
      </Note>
      <Note at={cantAt} x={R_X} y={c.y(372)}>
        <span style={{ ...note(24, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
          stream join: can't wait<span style={{ opacity: ease(frame, neverAt, 10) }}>; neither side ever ends</span>
        </span>
      </Note>
      {[
        { name: "clicks", y: cy, ts: CLICKS },
        { name: "purchases", y: by, ts: BUYS },
      ].map((s) => (
        <React.Fragment key={s.name}>
          <Note at={s2sAt} x={R_X} y={s.y - c.h(15)}>
            <span style={{ ...label(21, INK), fontWeight: 700, whiteSpace: "nowrap" }}>{s.name}</span>
          </Note>
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            <line x1={tx(0)} x2={tx(0) + (tx(12) - tx(0)) * ease(frame, s2sAt, 14)} y1={s.y} y2={s.y} stroke={INK} strokeWidth={1.6} />
            {s.ts.map((t, i) => (
              <circle key={i} cx={tx(t)} cy={s.y} r={9} fill={t < winFrom ? QUIET : BAR} opacity={ease(frame, s2sAt + 4 + i * 2, 8) * (t < winFrom ? 1 - 0.65 * old : 1)} />
            ))}
          </svg>
        </React.Fragment>
      ))}
      {/* The buffer: each side's recent events, inside a time window. */}
      <div
        style={{
          position: "absolute",
          left: tx(winFrom),
          top: cy - c.h(30),
          width: (tx(11.2) - tx(winFrom)) * ease(frame, bufAt, 14),
          height: by - cy + c.h(60),
          boxSizing: "border-box",
          borderRadius: 12,
          border: `2.5px dashed ${BLUE_INK}`,
        }}
      />
      <Note at={bufAt + 6} x={tx(winFrom) + 8} y={cy - c.h(30) - c.h(34)}>
        <span style={{ ...label(20, BLUE_INK), fontWeight: 700, whiteSpace: "nowrap" }}>buffered: the last few seconds of each side</span>
      </Note>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {MATCH.map(([ci, bi], k) => {
          const p = ease(frame, matchAt + k * 5, 10);
          return <line key={k} x1={tx(CLICKS[ci])} y1={cy + 9} x2={tx(CLICKS[ci]) + (tx(BUYS[bi]) - tx(CLICKS[ci])) * p} y2={cy + 9 + (by - cy - 18) * p} stroke={OK} strokeWidth={3} />;
        })}
      </svg>
      <Note at={expireAt} x={tx(0)} y={by + c.h(36)}>
        <span style={{ ...label(20, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>older: expired by the watermark</span>
      </Note>
      {/* Stream to table: an event enriched from a table kept current. */}
      <Cell x={R_X} y={c.y(690)} w={170} h={c.h(52)} user="ava" size={21} opacity={ease(frame, tableAt, 10)}>
        <span style={{ fontVariantNumeric: "normal" }}>click · ava</span>
      </Cell>
      <ElbowArrow
        points={[
          [R_X + 178, c.y(690) + c.h(26)],
          [R_X + 270, c.y(690) + c.h(26)],
        ]}
        at={looksAt}
        color={BAR}
        dur={8}
        head={12}
      />
      <Box x={R_X + 280} y={c.y(660)} w={300} h={c.h(112)} at={looksAt + 2} size={20}>
        <span>users, kept current</span>
        <span style={{ ...label(20, USER_INK.ava), marginTop: 4 }}>ava: plan pro</span>
        <span style={{ ...label(20, USER_INK.ben) }}>ben: plan free</span>
      </Box>
      <Note at={compactAt} x={R_X + 280} y={c.y(660) + c.h(124)}>
        <span style={{ ...label(20, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>often a compacted topic</span>
      </Note>
      <ElbowArrow
        points={[
          [R_X + 588, c.y(690) + c.h(26)],
          [R_X + 680, c.y(690) + c.h(26)],
        ]}
        at={looksAt + 8}
        color={BAR}
        dur={8}
        head={12}
      />
      <Cell x={R_X + 690} y={c.y(690)} w={250} h={c.h(52)} user="ava" size={21} opacity={ease(frame, looksAt + 14, 10)}>
        <span style={{ fontVariantNumeric: "normal" }}>click · ava · pro</span>
      </Cell>
    </>
  );
};

// ── 15. Dead-letter queues ──────────────────────────────────────────────────

const DeadLetter: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const startAt = c.w("r-dlq", "a dead-letter queue catches");
  const kinds = [
    { text: "malformed", at: c.w("r-dlq", "malformed") },
    { text: "off-schema", at: c.w("r-dlq", "off-schema") },
    { text: "failing again and again", at: c.w("r-dlq", "failing again and again") },
  ];
  const flowAt = c.w("r-dlq", "The main stream keeps flowing");
  const stallAt = c.w("r-dlq", "stalling on one poison message");
  const waitAt = c.w("r-dlq", "the bad ones wait");
  const replayAt = c.w("r-dlq", "fixed and replayed");
  const batchAt = c.w("r-dlq", "A batch pipeline");
  const rowsAt = c.w("r-dlq", "bad rows or whole tasks");
  const vanishAt = c.w("r-dlq", "none vanish");
  const lane = { x: R_X, y: c.y(400), w: 480, h: c.h(64) };
  const cons = { x: R_X + 560, w: 200 };
  const sink = { x: R_X + 840, w: 150 };
  const dlq = { x: R_X + 520, y: c.y(560), w: 340, h: c.h(64) };
  const mid = lane.y + lane.h / 2;
  // The poison message sits at the front until it is caught, then drops into
  // the dead-letter queue; the rest stand still behind it, then flow.
  const caught = ease(frame, startAt + 8, 16);
  const flowing = Math.max(0, frame - (startAt + 20));
  const STEP = 70;
  const cells = Array.from({ length: 8 }, (_, k) => {
    const raw = lane.x + 8 + k * STEP + flowing * 2.6;
    const span = 8 * STEP;
    const x = lane.x + 8 + ((raw - lane.x - 8) % span);
    return { k, x };
  });
  const poisonX = lane.x + lane.w - 74;
  return (
    <>
      <Lane x={lane.x} y={lane.y} w={lane.w} h={lane.h} at={startAt - 4} name="topic" />
      {cells.map((cell) => (
        <Cell
          key={cell.k}
          x={cell.x}
          y={lane.y + (lane.h - c.h(46)) / 2}
          w={58}
          h={c.h(46)}
          plain
          opacity={ease(frame, startAt + cell.k, 8) * Math.min(1, Math.max(0, (poisonX - 6 - cell.x) / 60)) * (flowing > 0 || cell.x < poisonX - 64 ? 1 : 0)}
        />
      ))}
      <Cell
        x={poisonX + (dlq.x + 40 - poisonX) * caught}
        y={lane.y + (lane.h - c.h(46)) / 2 + (dlq.y - lane.y) * caught}
        w={58}
        h={c.h(46)}
        plain
        ring={ACCENT}
        ringP={1}
        opacity={ease(frame, startAt - 2, 8)}
      >
        <span style={{ color: ACCENT_INK }}>✕</span>
      </Cell>
      <ElbowArrow
        points={[
          [lane.x + lane.w + 6, mid],
          [cons.x - 6, mid],
        ]}
        at={startAt}
        color={BAR}
        dur={8}
        head={12}
      />
      <Box x={cons.x} y={mid - c.h(36)} w={cons.w} h={c.h(72)} at={startAt}>
        consumer
      </Box>
      <ElbowArrow
        points={[
          [cons.x + cons.w + 6, mid],
          [sink.x - 6, mid],
        ]}
        at={flowAt}
        color={OK}
        dur={8}
        head={12}
      />
      <Box x={sink.x} y={mid - c.h(36)} w={sink.w} h={c.h(72)} at={flowAt}>
        sink
      </Box>
      <Box x={dlq.x} y={dlq.y - c.h(4)} w={dlq.w} h={dlq.h + c.h(8)} at={startAt + 4} color={ACCENT} fill="transparent">
        {null}
      </Box>
      <Note at={startAt + 6} x={dlq.x + 110} y={dlq.y + c.h(16)}>
        <span style={{ ...label(21, ACCENT_INK), fontWeight: 750, whiteSpace: "nowrap" }}>dead-letter queue</span>
      </Note>
      {kinds.map((k, i) => (
        <Note key={k.text} at={k.at - 2} x={R_X} y={c.y(530) + i * c.h(40)}>
          <span style={{ ...note(23, ACCENT_INK), fontWeight: 600, whiteSpace: "nowrap" }}>· {k.text}</span>
        </Note>
      ))}
      <Note at={flowAt} x={lane.x} y={lane.y - c.h(76)}>
        <span style={{ ...note(24, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
          the main stream keeps flowing<span style={{ ...label(20, INK_SOFT), opacity: ease(frame, stallAt, 10) }}>, never stalled by one poison message</span>
        </span>
      </Note>
      <ElbowArrow
        points={[
          [dlq.x, dlq.y + dlq.h / 2],
          [dlq.x - 60, dlq.y + dlq.h / 2],
          [dlq.x - 60, lane.y + lane.h + 10],
        ]}
        at={replayAt}
        color={INK_SOFT}
        dur={14}
        head={12}
      />
      <Note at={waitAt} x={dlq.x} y={dlq.y + dlq.h + c.h(18)}>
        <span style={{ ...label(21, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
          inspect, fix<span style={{ opacity: ease(frame, replayAt, 10) }}>, replay</span>
        </span>
      </Note>
      <Note at={batchAt} x={R_X} y={c.y(720)}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
          in a batch pipeline: <span style={{ opacity: ease(frame, rowsAt, 10) }}>bad rows, or whole tasks, set aside</span>
        </span>
      </Note>
      <Note at={vanishAt - 6} x={R_X} y={c.y(764)}>
        <span style={{ ...note(24, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>a few don't stop everything, and none vanish</span>
      </Note>
    </>
  );
};

/**
 * The quick round: three questions down the left, each answer drawn on the
 * right while it is read; then the bridge into Part 9, with the salmon back.
 */
export const RapidScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: n.word, y, h };

  const from = n.beat("rapid-in").from;
  const leftAt = n.word("rapid-in", "Three left");
  const breathAt = n.word("rapid-in", "one breath each");
  const end = n.beat("next").from - 4;
  const landsAt = n.word("next", "lands somewhere");
  const storedAt = n.word("next", "how it's stored");
  const costsAt = n.word("next", "what reading it costs");
  const nextAt = n.word("next", "Next:");

  const items: RapidItem[] = [
    { n: 13, label: "Log compaction", at: n.word("r-compact", "Log compaction keeps"), body: <Compaction c={c} /> },
    { n: 14, label: "Stream join or batch join", at: n.word("r-join", "A batch join can wait"), body: <Join c={c} /> },
    { n: 15, label: "Dead-letter queues", at: n.word("r-dlq", "a dead-letter queue catches"), body: <DeadLetter c={c} /> },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-chime" at={leftAt} level={-36} />
      {items.map((it) => (
        <Sfx key={it.n} name="el-tap" at={it.at} level={-37} />
      ))}
      <Sfx name="el-scratch" at={n.word("r-compact", "clears out older ones") + 4} level={-37} />
      <Sfx name="el-pencil" at={n.word("r-join", "matches across them")} level={-37} />
      <Sfx name="el-whoosh" at={n.word("r-dlq", "a dead-letter queue catches") + 8} level={-36} />
      <Sfx name="el-pop" at={nextAt} level={-34} />

      <Drift from={from} to={n.beat("next").to + 40}>
        <Kicker at={leftAt}>Quick round</Kicker>
        <Headline lead="Three left." turn="One breath each." at={leftAt} turnAt={breathAt - 2} size={64} />
        <RapidFire items={items} x={X0} top={y(LIST_TOP)} rowH={h(ROW)} width={560} at={leftAt + 6} end={end} />

        {/* The bridge. */}
        <Spot id="de-streaming-salmon" at={landsAt} left={1420} top={y(330)} width={340} height={424} />
        <Note at={landsAt} x={X0} y={y(LIST_TOP) + 3 * h(ROW) + h(50)}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
            Every stream <b style={{ color: BLUE_INK }}>lands somewhere</b>
            <span style={{ opacity: ease(frame, storedAt, 10) }}>, and how it's stored</span>
          </span>
        </Note>
        <Note at={costsAt} x={X0} y={y(LIST_TOP) + 3 * h(ROW) + h(100)}>
          <span style={{ ...note(27, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>decides what reading it costs.</span>
        </Note>
        <NextLine at={nextAt} x={X0} y={y(760)} width={900}>
          data warehousing and storage
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
