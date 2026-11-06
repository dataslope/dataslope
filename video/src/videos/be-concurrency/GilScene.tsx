import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, HAIRLINE, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Ink, Note, Num } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BYTECODE } from "./data";
import { Band, Drift, KeyGlyph, lineOf, Listing, listingHeight, LockGlyph, MARK_OK, Node, OK, OK_INK, Spot, Strike, THREAD, tint, X0 } from "./parts";

const LANE_X = 250;
const SLICE = 75;
const LANE_H = 46;
const CPU_LANES = [372, 436, 500];
const IO_LANES = [664, 728];
/** Who holds the GIL in each slice of the CPU-bound run. */
const CPU_TURNS = [0, 1, 2, 0, 1, 2, 0, 1, 2, 0];
/**
 * The IO-bound run, slice by slice: who holds the key and runs, and who is
 * off waiting on the network meanwhile (it gave the key up to wait).
 */
const IO_RUNS: { t: number; from: number; len: number; wait: number }[] = [
  { t: 0, from: 0, len: 1, wait: 4 },
  { t: 1, from: 1, len: 1, wait: 4 },
  { t: 0, from: 5, len: 1, wait: 3 },
  { t: 1, from: 6, len: 1, wait: 3 },
];
/** The interpreter's objects, each with its reference count. */
const OBJECTS = [
  { name: "a list", refs: 3 },
  { name: "a string", refs: 1 },
  { name: "an int", refs: 7 },
  { name: "a dict", refs: 2 },
];
const BOX = { x: 1110, top: 372, w: 680, h: 250 };

/** A slice of a thread's lane: running with the key, or waiting pale. */
const Slice: React.FC<{ t: number; x: number; y: number; w: number; h: number; at: number; kind: "run" | "wait" | "block"; dim?: number; text?: string }> = ({ t, x, y, w, h, at, kind, dim = 0, text }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 8);
  if (p <= 0) return null;
  const th = THREAD[t];
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: (w - 4) * p,
        height: h,
        boxSizing: "border-box",
        borderRadius: 6,
        border: kind === "run" ? `2.5px solid ${th.fill}` : `1.5px dashed ${kind === "wait" ? th.fill : HAIRLINE}`,
        background: kind === "run" ? tint(th.fill, 34) : kind === "wait" ? tint(th.fill, 8) : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        opacity: 1 - dim,
      }}
    >
      {kind === "run" && w > 60 ? <KeyGlyph size={30} color={th.ink} /> : null}
      {text ? <span style={{ ...label(20, th.ink), fontWeight: 600, whiteSpace: "nowrap", opacity: ease(frame, at + 6, 10) }}>{text}</span> : null}
    </div>
  );
};

/**
 * Question 4. The GIL as one key: only the thread holding it runs bytecode.
 * Why one: every object's reference count, guarded by one lock around the
 * interpreter instead of one per object. What it costs: CPU-bound threads
 * just take turns; IO-bound ones hand the key over while they wait. Why the
 * counter still races: its one line is four instructions (a real compile,
 * data.ts). And processes: one interpreter and one GIL each.
 */
export const GilScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("gil").from;
  const qAt = n.word("gil", "Question four");
  const textAt = n.word("gil", "What is the GIL");
  const cpyAt = n.word("gil", "In CPython");
  const gilAt = n.word("gil", "the global interpreter lock");
  const singleAt = n.word("gil", "a single lock");
  const oneAt = n.word("gil", "only one thread run Python bytecode");
  const memAt = n.word("gil-why", "keep memory management thread-safe");
  const countsAt = n.word("gil-why", "Every object counts its references");
  const oneLockAt = n.word("gil-why", "one lock around the interpreter");
  const withoutAt = n.word("gil-why", "without a lock on every object");
  const noSpeedAt = n.word("gil-cost", "no speedup to CPU-bound Python");
  const turnsAt = n.word("gil-cost", "They just take turns");
  const ioAt = n.word("gil-cost", "They still help IO-bound work");
  const releasesAt = n.word("gil-cost", "releases the GIL while it waits");
  const notSafeAt = n.word("gil-race", "it doesn't make the counter safe");
  const oneInstrAt = n.word("gil-race", "one bytecode instruction at a time");
  const fourAt = n.word("gil-race", "compiles to four");
  const loadAt = n.word("gil-race", "load the counter");
  const loadOneAt = n.word("gil-race", "load the one");
  const addAt = n.word("gil-race", "add");
  const storeAt = n.word("gil-race", "store");
  const nothingAt = n.word("gil-race", "Nothing promises the four run together");
  const stillAt = n.word("gil-race", "the lock is still needed");
  const procAt = n.word("gil-proc", "use processes instead");
  const ownAt = n.word("gil-proc", "its own interpreter and its own GIL");
  const parAt = n.word("gil-proc", "really do run in parallel");
  const end = n.beat("gil-proc").to;

  // The first page (the key, why, what it costs) gives way to the second.
  const page1Out = notSafeAt - 2;
  const cpuY = CPU_LANES.map((v) => y(v));
  const ioY = IO_LANES.map((v) => y(v));
  const laneH = h(LANE_H);

  // The listing: the line, then what it compiles to.
  const SRC = [BYTECODE.source];
  const OPS = BYTECODE.instructions;
  const SIZE = 26;
  const srcTop = y(330);
  const opsTop = y(462);
  const opsH = listingHeight(OPS.length, SIZE);
  const opAt = [loadAt, loadOneAt, addAt, storeAt];
  const opLines = [lineOf(OPS, "LOAD_GLOBAL"), lineOf(OPS, "LOAD_SMALL_INT"), lineOf(OPS, "BINARY_OP"), lineOf(OPS, "STORE_GLOBAL")];
  const lineAt = OPS.map((_, i) => opAt[opLines.indexOf(i)] - 2);
  const LIST_W = 520;
  const brX = X0 + LIST_W + 30;
  const bracket = ease(frame, nothingAt - 6, 14);

  // Processes: three rows, each its own interpreter and key.
  const P_X = 1130;
  const pRow = (j: number) => y(330) + j * h(126);
  const runP = ease(frame, parAt, 40);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={oneAt} level={-32} />
      <Sfx name="el-tap" at={oneLockAt + 6} level={-30} />
      <Sfx name="el-scratch" at={withoutAt + 4} level={-32} />
      <Sfx name="el-pencil" at={ioAt} level={-35} />
      <Sfx name="el-pencil" at={fourAt} level={-35} />
      <Sfx name="el-scratch" at={nothingAt} level={-32} />
      <Sfx name="el-tap" at={stillAt + 4} level={-30} />
      <Sfx name="el-whoosh" at={procAt} level={-35} />
      <Sfx name="el-chime" at={parAt + 10} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} size={58}>
          What is the GIL and why does it exist?
        </QuestionCard>

        {/* ── Page 1: one key ─────────────────────────────────────────── */}
        <Note at={cpyAt} x={X0} y={y(290)} out={page1Out}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            CPython&apos;s <b style={{ color: BLUE_INK }}>global interpreter lock</b>
            <span style={{ opacity: ease(frame, oneAt, 10) }}>: only its holder runs Python bytecode</span>
          </span>
        </Note>
        {cpuY.map((ly, i) => (
          <React.Fragment key={i}>
            <Note at={gilAt + i * 3} x={X0} y={ly + laneH / 2 - 14} out={page1Out}>
              <span style={{ ...label(21, THREAD[i].ink), fontWeight: 700, whiteSpace: "nowrap" }}>thread {i + 1}</span>
            </Note>
            {CPU_TURNS.map((t, k) => (
              <Slice key={k} t={i} x={LANE_X + k * SLICE} y={ly} w={SLICE} h={laneH} at={oneAt + k * 7} kind={t === i ? "run" : "block"} dim={ease(frame, page1Out, 10)} />
            ))}
          </React.Fragment>
        ))}
        <Note at={noSpeedAt} x={X0} y={y(560)} out={page1Out}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            CPU-bound: they <Band at={turnsAt}>take turns</Band>, so no speedup
          </span>
        </Note>
        {ioY.map((ly, i) => (
          <Note key={i} at={ioAt + i * 3} x={X0} y={ly + laneH / 2 - 14} out={page1Out}>
            <span style={{ ...label(21, THREAD[i].ink), fontWeight: 700, whiteSpace: "nowrap" }}>thread {i + 1}</span>
          </Note>
        ))}
        {IO_RUNS.map((r, k) => (
          <React.Fragment key={k}>
            <Slice t={r.t} x={LANE_X + r.from * SLICE} y={ioY[r.t]} w={SLICE * r.len} h={laneH} at={ioAt + 4 + k * 10} kind="run" dim={ease(frame, page1Out, 10)} />
            <Slice t={r.t} x={LANE_X + (r.from + r.len) * SLICE} y={ioY[r.t]} w={SLICE * r.wait} h={laneH} at={ioAt + 10 + k * 10} kind="wait" dim={ease(frame, page1Out, 10)} text={k < 2 ? "waiting on the network" : "waiting"} />
          </React.Fragment>
        ))}
        <Note at={releasesAt + 6} x={X0} y={y(800)} out={page1Out}>
          <span style={{ ...note(24, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>IO-bound: the waits overlap, so threads still help</span>
        </Note>

        {/* Why one lock: every object's reference count. */}
        <Spot id="key" at={singleAt} out={memAt - 8} left={1360} top={y(400)} width={210} height={h(190)} />
        <Node x={BOX.x} y={y(BOX.top)} w={BOX.w} h={h(BOX.h)} at={memAt} tone="plain" fill={PAPER} out={page1Out} lit={ease(frame, oneLockAt + 4, 10)} line={frame >= oneLockAt + 4 ? OK : INK} />
        <Note at={memAt + 4} x={BOX.x + 24} y={y(BOX.top) + h(14)} out={page1Out}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>the interpreter: memory management</span>
        </Note>
        {OBJECTS.map((o, k) => {
          const x = BOX.x + 30 + k * 160;
          return (
            <React.Fragment key={o.name}>
              <Node x={x} y={y(BOX.top + 70)} w={140} h={h(100)} at={countsAt + k * 4} tone="data" out={page1Out}>
                <span style={{ ...label(21, BLUE_INK), fontWeight: 700, whiteSpace: "nowrap" }}>{o.name}</span>
                <span style={{ ...label(20, INK_SOFT), fontWeight: 600, whiteSpace: "nowrap" }}>
                  refs: <Num>{o.refs}</Num>
                </span>
              </Node>
              <Ink at={withoutAt - 4 + k * 3} dur={10} out={page1Out} style={{ left: x + 54, top: y(BOX.top + 186) }}>
                <span style={{ position: "relative", display: "inline-block" }}>
                  <LockGlyph size={30} color={ds("gray", 400)} />
                  <svg width={40} height={40} style={{ position: "absolute", left: -5, top: -5, overflow: "visible" }}>
                    <line x1={2} y1={38} x2={2 + 36 * ease(frame, withoutAt + 6 + k * 3, 8)} y2={38 - 36 * ease(frame, withoutAt + 6 + k * 3, 8)} stroke={ACCENT} strokeWidth={3.5} strokeLinecap="round" />
                  </svg>
                </span>
              </Ink>
            </React.Fragment>
          );
        })}
        <Ink at={oneLockAt + 4} dur={10} out={page1Out} style={{ left: BOX.x + BOX.w - 52, top: y(BOX.top) - 22 }}>
          <span style={{ display: "inline-block", background: PAPER, padding: 4, borderRadius: 8 }}>
            <LockGlyph size={40} color={OK} />
          </span>
        </Ink>
        <Note at={oneLockAt} x={BOX.x} y={y(BOX.top + BOX.h + 26)} out={page1Out}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: OK_INK }}>one lock around the interpreter</b>
            <span style={{ opacity: ease(frame, withoutAt, 10) }}>, not one on every object</span>
          </span>
        </Note>

        {/* ── Page 2: four instructions, then processes ───────────────── */}
        <Note at={notSafeAt} x={X0} y={y(290)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            And it doesn&apos;t make <Strike at={nothingAt + 4}>the counter safe</Strike>
          </span>
        </Note>
        <Listing lines={SRC} x={X0} top={srcTop} width={LIST_W} size={SIZE + 2} at={notSafeAt + 4} />
        <Note at={fourAt - 4} x={X0} y={srcTop + listingHeight(1, SIZE + 2) + h(16)}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>
            compiles to <Num>{BYTECODE.count}</Num> instructions (Python 3.14, read with dis)
          </span>
        </Note>
        <Listing
          lines={OPS}
          x={X0}
          top={opsTop}
          width={LIST_W}
          size={SIZE}
          at={fourAt}
          lineAt={lineAt}
          marks={opLines.map((line, k) => ({ line, at: opAt[k], out: opAt[k + 1] ?? nothingAt - 6 }))}
        />
        {/* A bracket: the four, one at a time, with nothing holding them together. */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: bracket }}>
          <path d={`M${brX},${opsTop + 8} h14 V${opsTop + opsH - 8} h-14`} fill="none" stroke={ACCENT} strokeWidth={2.6} strokeLinejoin="round" />
        </svg>
        <Note at={oneInstrAt} x={brX + 36} y={opsTop + h(6)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>The GIL runs one at a time</span>
        </Note>
        <Note at={nothingAt} x={brX + 36} y={opsTop + h(52)}>
          <span style={{ ...note(23, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            nothing promises
            <br />
            the four run together
          </span>
        </Note>
        <Note at={stillAt} x={brX + 36} y={opsTop + h(150)}>
          <span style={{ ...note(23, OK_INK), fontWeight: 700, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "0.4em" }}>
            <LockGlyph size={24} color={OK} />
            <span style={{ background: MARK_OK, padding: "0 4px", borderRadius: 4 }}>the lock is still needed</span>
          </span>
        </Note>

        <Note at={procAt} x={P_X} y={y(290)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            CPU-bound: <b style={{ color: OK_INK }}>processes</b>
          </span>
        </Note>
        {[0, 1, 2].map((j) => (
          <React.Fragment key={j}>
            <Node x={P_X} y={pRow(j) + h(46)} w={660} h={h(66)} at={procAt + 4 + j * 4} tone="plain" fill={PAPER} align="left" justify="center">
              <span style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 21 }}>
                <span style={{ ...label(21, INK), fontWeight: 700, whiteSpace: "nowrap" }}>process {j + 1}</span>
                <span style={{ ...label(21, INK_SOFT), fontWeight: 600, whiteSpace: "nowrap", opacity: ease(frame, ownAt + j * 3, 10) }}>own interpreter, own GIL</span>
                <span style={{ opacity: ease(frame, ownAt + 6 + j * 3, 10) }}>
                  <KeyGlyph size={30} color={THREAD[j].ink} />
                </span>
              </span>
            </Node>
            <div
              style={{
                position: "absolute",
                left: P_X + 450,
                top: pRow(j) + h(46) + h(66) / 2 - 7,
                width: 190 * runP,
                height: 14,
                borderRadius: 7,
                background: THREAD[j].fill,
                opacity: runP > 0 ? 1 : 0,
              }}
            />
          </React.Fragment>
        ))}
        <Note at={parAt + 8} x={P_X} y={pRow(3) + h(36)}>
          <span style={{ ...note(24, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>so they really do run in parallel</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
