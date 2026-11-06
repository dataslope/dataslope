import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK, OK_INK, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { LOCK } from "./data";
import { DataTable, Drift, Flow, Listing, listingHeight, MARK_BAD, MARK_OK, Mark, Node, PgError, tableGeometry, X0 } from "./parts";

const HEAD_Y = 302;
const R_X = 980;
const ROW_W = 330;
const SLIDER_Y = 790;

/** A padlock, drawn: a shackle over a body. */
const Padlock: React.FC<{ x: number; y: number; at: number; color?: string }> = ({ x, y, at, color = INK }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10);
  if (p <= 0) return null;
  return (
    <svg width={40} height={44} style={{ position: "absolute", left: x, top: y - (1 - p) * 14, opacity: p, overflow: "visible" }}>
      <path d="M11,20 V13 a9,9 0 0 1 18,0 V20" fill="none" stroke={color} strokeWidth={3.5} />
      <rect x={5} y={19} width={30} height={22} rx={4} fill={color} />
      <circle cx={20} cy={29} r={3} fill={PAPER} />
    </svg>
  );
};

/** One account row, as a box: its id and balance. */
const AccountRow: React.FC<{ x: number; y: number; h: number; id: number; balance: number; at: number; tone?: "data" | "ok" | "held" }> = ({ x, y, h, id, balance, at, tone = "data" }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  if (p <= 0) return null;
  // A row of the table, set as text over a hairline; held or granted, a
  // highlight band behind it.
  const band = tone === "ok" ? `color-mix(in srgb, ${OK} 22%, ${PAPER})` : tone === "held" ? HIGHLIGHT : "transparent";
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: ROW_W,
        height: h,
        boxSizing: "border-box",
        borderBottom: `1px solid ${HAIRLINE}`,
        background: band,
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "0 18px",
        fontSize: 22,
        opacity: p,
      }}
    >
      <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>account {id}</span>
      <span style={{ fontFamily: MONO, fontSize: 22, color: BLUE_INK, fontWeight: 600 }}>{balance}</span>
    </div>
  );
};

/**
 * Question 10, two panels. Left, pessimistic: SELECT … FOR UPDATE locks
 * account 1 (a padlock) and another transaction that wants it waits. Then
 * the run: a parked transaction holds account 1, the NOWAIT request is
 * refused with Postgres's error, and account 2 is granted. Right,
 * optimistic: the row's version beside it and the write that checks it,
 * then the run, statement by statement, as a table: both clients read
 * version 3, B's write makes it 4, A's write still expecting 3 returns no
 * row, A rereads and retries, version 5. Last, a slider from rare to
 * frequent conflicts: optimistic at one end, pessimistic at the other.
 */
export const LockScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("lock").from;
  const qAt = n.word("lock", "Question ten");
  const textAt = n.word("lock", "What is an optimistic versus pessimistic");
  const pessAt = n.word("lock", "Pessimistic locks first");
  const forUpdateAt = n.word("lock", "select for update");
  const untilAt = n.word("lock", "locks the row until commit");
  const otherAt = n.word("lock", "any other transaction");
  const waitsAt = n.word("lock", "waits");
  const holdsAt = n.word("lock-pess-run", "another transaction holds account one");
  const notWaitAt = n.word("lock-pess-run", "Asked not to wait");
  const refusesAt = n.word("lock-pess-run", "Postgres refuses");
  const freeAt = n.word("lock-pess-run", "Account two is free");
  const optAt = n.word("lock-opt", "Optimistic takes no lock");
  const versionAt = n.word("lock-opt", "Read a version number");
  const onlyIfAt = n.word("lock-opt", "write only if it hasn't changed");
  const twoAt = n.word("lock-opt-run", "Two clients read version three");
  const oneWritesAt = n.word("lock-opt-run", "One writes");
  const fourAt = n.word("lock-opt-run", "the version becomes four");
  const othersAt = n.word("lock-opt-run", "The other's write");
  const nothingAt = n.word("lock-opt-run", "changes nothing");
  const rereadsAt = n.word("lock-opt-run", "It rereads");
  const retriesAt = n.word("lock-opt-run", "and retries");
  const winsAt = n.word("lock-choose", "Optimistic wins when conflicts are rare");
  const retryAt = n.word("lock-choose", "costs only a retry");
  const pessWinsAt = n.word("lock-choose", "Pessimistic wins when they're frequent");
  const pileAt = n.word("lock-choose", "retries would pile up");
  const end = n.beat("lock-choose").to;

  // ── Left: pessimistic ──
  const rowsTop = y(HEAD_Y) + h(58);
  const rowH = h(50);
  const row2 = rowsTop + rowH + h(16);
  const lockTop = row2 + rowH + h(32);
  const holder = LOCK.holder.filter((l) => l.includes("FOR UPDATE"));
  const waiter = { x: X0 + ROW_W + 110, w: 220, y: rowsTop - h(4), h: h(58) };

  // ── Right: optimistic ──
  const writeTop = y(HEAD_Y) + h(104);
  const seqTop = writeTop + listingHeight(LOCK.write.length, 20) + h(64);
  const show = (r: Record<string, number> | null) => (r ? `stock ${r.stock}, version ${r.version}` : "0 rows");
  const seqRows: { cells: string[]; at: number }[] = [
    { cells: ["A", "SELECT", show(LOCK.readA)], at: twoAt + 2 },
    { cells: ["B", "SELECT", show(LOCK.readA)], at: twoAt + 8 },
    { cells: ["B", "UPDATE … version = 3", show(LOCK.writeB)], at: oneWritesAt },
    { cells: ["A", "UPDATE … version = 3", show(LOCK.writeA)], at: othersAt },
    { cells: ["A", "SELECT", show(LOCK.rereadA)], at: rereadsAt },
    { cells: ["A", "UPDATE … version = 4", show(LOCK.retryA)], at: retriesAt },
  ];
  const sg = tableGeometry({
    x: R_X,
    top: seqTop,
    cols: [{ name: "client" }, { name: "statement" }, { name: "returned" }],
    rows: seqRows.map((r) => r.cells),
    headH: h(40),
    rowH: h(42),
    headSize: 20,
    bodySize: 21,
  });

  // ── The slider: rare to frequent conflicts ──
  const sy = y(SLIDER_Y);
  const sx0 = X0 + 40;
  const sx1 = X0 + 700;
  const knob = sx0 + (sx1 - sx0) * (0.1 + 0.8 * ease(frame, pessWinsAt, 24));
  const sliderIn = ease(frame, winsAt - 4, 14);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={forUpdateAt} level={-35} />
      <Sfx name="el-tap" at={untilAt + 4} level={-33} />
      <Sfx name="el-tap" at={waitsAt} level={-34} />
      <Sfx name="el-scratch" at={refusesAt + 2} level={-33} />
      <Sfx name="el-pop" at={freeAt + 2} level={-31} />
      <Sfx name="el-pencil" at={versionAt} level={-35} />
      <Sfx name="el-tap" at={twoAt + 4} level={-34} />
      <Sfx name="el-tap" at={fourAt} level={-34} />
      <Sfx name="el-scratch" at={nothingAt} level={-33} />
      <Sfx name="el-pop" at={retriesAt + 4} level={-31} />
      <Sfx name="el-whoosh" at={pessWinsAt} level={-35} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={10} at={qAt - 4} textAt={textAt - 4} size={58}>
          What is an optimistic vs pessimistic locking strategy?
        </QuestionCard>

        {/* ── Left: pessimistic, centred until the optimistic side arrives ── */}
        <div style={{ position: "absolute", inset: 0, transform: `translateX(${(1 - ease(frame, optAt - 12, 24)) * 460}px)` }}>
        <Note at={pessAt} x={X0} y={y(HEAD_Y)}>
          <span style={{ ...label(26, INK), fontWeight: 700, whiteSpace: "nowrap" }}>Pessimistic: lock first</span>
        </Note>
        <AccountRow x={X0} y={rowsTop} h={rowH} id={1} balance={100} at={forUpdateAt} tone={ease(frame, untilAt, 8) > 0.5 ? "held" : "data"} />
        <AccountRow x={X0} y={row2} h={rowH} id={2} balance={LOCK.otherRow?.balance ?? 0} at={forUpdateAt + 4} tone={ease(frame, freeAt + 4, 8) > 0.5 ? "ok" : "data"} />
        <Padlock x={X0 + ROW_W - 56} y={rowsTop + rowH / 2 - 22} at={untilAt} />
        <Listing lines={holder} x={X0} top={lockTop} width={740} size={20} at={forUpdateAt - 4} out={holdsAt - 2} marks={[{ line: "FOR UPDATE", text: "FOR UPDATE", at: forUpdateAt + 8 }]} />
        <Node x={waiter.x} y={waiter.y} w={waiter.w} h={waiter.h} at={otherAt} tone="plain" bare title="another transaction" size={22} out={holdsAt - 2} />
        <Flow points={[[waiter.x - 10, waiter.y + waiter.h / 2], [X0 + ROW_W + 14, waiter.y + waiter.h / 2]]} at={otherAt + 4} color={INK_SOFT} width={2.4} dash="7 6" out={holdsAt - 2} />
        <Note at={waitsAt} x={waiter.x} y={waiter.y + waiter.h + h(10)} out={holdsAt - 2}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            <b>waits</b> until commit
          </span>
        </Note>
        {/* The run: account 1 held by a parked transaction, NOWAIT refused. */}
        <Note at={holdsAt} x={X0 + ROW_W + 40} y={rowsTop + h(8)}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>held by another transaction</span>
        </Note>
        <Listing lines={LOCK.nowait} x={X0} top={lockTop} width={740} size={20} at={notWaitAt - 2} marks={[{ line: "NOWAIT", text: "NOWAIT", at: notWaitAt + 6 }]} />
        <PgError x={X0} top={lockTop + listingHeight(LOCK.nowait.length, 20) + h(10)} width={704} at={refusesAt} message={LOCK.refused} size={19} />
        <Note at={freeAt + 4} x={X0 + ROW_W + 40} y={row2 + h(8)}>
          <span style={{ ...note(22, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>granted at once</span>
        </Note>

        </div>

        {/* ── Right: optimistic ── */}
        <Note at={optAt} x={R_X} y={y(HEAD_Y)}>
          <span style={{ ...label(26, INK), fontWeight: 700, whiteSpace: "nowrap" }}>Optimistic: no lock, a version</span>
        </Note>
        <Note at={versionAt} x={R_X} y={y(HEAD_Y) + h(52)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap", fontSize: 23 }}>
            the row: stock <b>{LOCK.readA?.stock}</b>,{" "}
            <Mark at={versionAt + 6}>
              <b>version {LOCK.readA?.version}</b>
            </Mark>
          </span>
        </Note>
        <Listing lines={LOCK.write} x={R_X} top={writeTop} width={800} size={20} at={onlyIfAt - 4} marks={[{ line: "AND version", text: "version = 3", at: onlyIfAt + 6 }]} />
        <DataTable
          g={sg}
          cols={[{ name: "client", ink: BLUE_INK }, { name: "statement" }, { name: "returned" }]}
          rows={seqRows}
          at={twoAt - 2}
          marks={[
            { row: 2, col: 2, at: fourAt, color: `color-mix(in srgb, ${BAR} 18%, transparent)` },
            { row: 3, col: 2, at: nothingAt, color: MARK_BAD },
            { row: 5, col: 2, at: retriesAt + 6, color: MARK_OK },
          ]}
        />

        {/* ── Rare or frequent conflicts ── */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: sliderIn }}>
          <line x1={sx0} x2={sx1} y1={sy} y2={sy} stroke={HAIRLINE} strokeWidth={4} strokeLinecap="round" />
          <circle cx={knob} cy={sy} r={13} fill={inkOf.yellow} stroke={PAPER} strokeWidth={3} />
        </svg>
        <Note at={winsAt - 4} x={sx0 - 20} y={sy - h(60)}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>conflicts rare</span>
        </Note>
        <Note at={pessWinsAt - 4} x={sx1 + 20} y={sy - h(60)} align="right">
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>frequent</span>
        </Note>
        <Note at={winsAt + 4} x={sx0 - 20} y={sy + h(26)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: OK_INK }}>optimistic</b>
            <span style={{ opacity: ease(frame, retryAt, 10) }}>: a conflict costs one retry</span>
          </span>
        </Note>
        <Note at={pessWinsAt + 8} x={sx1 + 20} y={sy + h(66)} align="right">
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            <span style={{ opacity: ease(frame, pileAt, 10) }}>retries would pile up: </span>
            <b style={{ color: OK_INK }}>pessimistic</b>
          </span>
        </Note>
        <Note at={nothingAt + 4} x={sg.right + 24} y={sg.rowTop(3) + h(8)}>
          <span style={{ ...note(21, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>stale</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
