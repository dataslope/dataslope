import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { arrowHead, type Cubic, cubicPath, sampleCubic } from "../../components/arrow";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, body, HAIRLINE, headline, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { HASH } from "./data";
import { Bars, Code, Drift, lineOf, Listing, listingHeight, Mark, MARK_BAD, MARK_OK, OK, OK_INK, Source, Title, X0 } from "./parts";

/**
 * Question 6. The figure is the course video ListVsSet's (list-vs-set/
 * MechanismScene.tsx), copied and re-cued to this video's beats, moved down
 * under the question card, and recolored to this series' meanings: the list's
 * scan in the trap's red, the set's jump in the right answer's green. Its
 * numbers are ListVsSet's (2,097,152 buckets; 5.53 ms against 22.8 ns in
 * CPython 3.13). Then the follow-up, counted in Pyodide: deduplicating
 * against a list of seen keys is 12,497,500 comparisons for 5,000 keys and
 * 49,995,000 for 10,000, four times as many; against a set, none.
 */

const LIST = ACCENT;
const LIST_INK = ACCENT_INK;
const SET = OK;
const SET_INK = OK_INK;

const LEFT = 120;
const RIGHT = 1800;
const CELL_W = 140;
const STEP = 154;
const ELLIPSIS = 104;
const CELL_H = 74;
const CODE = 30;
const SIZE = 22;

type Slot = { kind: "cell"; value: number | null; index: number; x: number } | { kind: "gap"; x: number };
const lay = (runs: readonly (readonly { value: number | null; index: number }[])[]): Slot[] => {
  const out: Slot[] = [];
  let x = LEFT;
  runs.forEach((run, r) => {
    if (r > 0) {
      out.push({ kind: "gap", x });
      x += ELLIPSIS + (STEP - CELL_W);
    }
    for (const c of run) {
      out.push({ kind: "cell", ...c, x });
      x += STEP;
    }
  });
  return out;
};
const run = (from: number, to: number, filledBelow = Infinity) =>
  Array.from({ length: to - from + 1 }, (_, k) => ({ value: from + k < filledBelow ? from + k : null, index: from + k }));

const LAST = 999_999;
const LIST_SLOTS = lay([run(0, 6), run(LAST - 2, LAST)]);
const BUCKETS = lay([run(0, 3), run(LAST - 1, LAST + 2, LAST + 1), run(HASH.slots - 1, HASH.slots - 1, LAST + 1)]);
const cellsOf = (slots: Slot[]) => slots.filter((s): s is Extract<Slot, { kind: "cell" }> => s.kind === "cell");
const LIST_CELLS = cellsOf(LIST_SLOTS);
const BUCKET_CELLS = cellsOf(BUCKETS);
const TARGET_BUCKET = BUCKET_CELLS.find((c) => c.index === LAST)!;

/** Layout rows, before `y()`. */
const A_TITLE = 318;
const A_CELLS = 372;
const RULE = 472;
const B_TITLE = 490;
const PIPE = 548;
const B_CELLS = 676;
const TIME_Y = 790;

const literal = (v: number) => v.toLocaleString("en-US").replace(/,/g, "_");
const commas = (v: number) => Math.round(v).toLocaleString("en-US");

export const HashScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hash").from;
  const qAt = n.word("hash", "Question six");
  const textAt = n.word("hash", "Why are dict and set lookups");
  const asked = n.beat("hash").to;
  const ideaAt = n.word("hash-scan", "A list doesn't know where a value lives");
  const frontAt = n.word("hash-scan", "compares from the front");
  const comparisonsAt = n.word("hash-scan", "a million comparisons");
  const tableAt = n.word("hash-jump", "Dicts and sets are hash tables");
  const functionAt = n.word("hash-jump", "Hashing the value");
  const bucketAt = n.word("hash-jump", "picks one bucket");
  const twoMillionAt = n.word("hash-jump", "out of two million");
  const straightAt = n.word("hash-jump", "Python goes straight there");
  const oneAt = n.word("hash-jump", "one comparison");
  const timedAt = n.word("hash-time", "Timed in CPython");
  const msAt = n.word("hash-time", "five and a half milliseconds");
  const nsAt = n.word("hash-time", "twenty-three nanoseconds");
  const loopAt = n.word("hash-loop", "It matters inside a loop");
  const dedupAt = n.word("hash-loop", "Deduplicate ten thousand records");
  const fiftyAt = n.word("hash-loop", "fifty million comparisons");
  const doubleAt = n.word("hash-loop", "Double the records");
  const fourAt = n.word("hash-loop", "four times as many");
  const squaredAt = n.word("hash-loop", "order n squared");
  const setAt = n.word("hash-loop", "A set makes it one lookup a record");
  const end = n.beat("dedup-in").to;
  const outMech = loopAt - 4;

  // ── The scan, as in ListVsSet: a crawl over the first seven, a run across
  //    the gap, and a crawl over the last three, all read off one count. ──
  const crawl = 7;
  const tick = 6;
  const crawlFrom = frontAt - 2;
  const crawlEnd = crawlFrom + crawl * tick;
  const landAt = Math.max(crawlEnd + 30, comparisonsAt - 2);
  const ffTo = landAt - 2 * tick;
  const ffFrom = Math.min(crawlEnd + 4, ffTo - 20);
  const TAIL = LAST - 1;
  let count = 0;
  if (frame >= crawlFrom) count = Math.min(crawl, Math.floor((frame - crawlFrom) / tick) + 1);
  if (frame >= ffFrom) {
    const p = interpolate(frame, [ffFrom, ffTo], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    count = Math.round(crawl * (TAIL / crawl) ** (p * p * (3 - 2 * p)));
  }
  if (frame >= ffTo) count = Math.min(LAST + 1, TAIL + Math.floor((frame - ffTo) / tick));
  const cellX = (item: number) => LIST_CELLS.find((c) => c.index === item)?.x;
  const gapFrom = LIST_CELLS[crawl - 1].x;
  const gapTo = cellX(TAIL - 1) ?? gapFrom;
  const markerX =
    count === 0
      ? LIST_CELLS[0].x
      : (cellX(count - 1) ?? gapFrom + (gapTo - gapFrom) * (Math.log(count / crawl) / Math.log((TAIL - 1) / crawl)));
  const markerIn = ease(frame, crawlFrom - 6, 8);
  const found = ease(frame, landAt, 10);

  // ── The set ──
  const jump = ease(frame, straightAt - 2, 16);
  const landed = ease(frame, oneAt - 6, 10);
  const resultX = LEFT + 13 * CODE * 0.6 + 104;
  const pipeY = y(PIPE);
  const arcFrom: [number, number] = [resultX + 3 * CODE * 0.6, pipeY + 50];
  const arcTo: [number, number] = [TARGET_BUCKET.x + CELL_W / 2, y(B_CELLS) - 40];
  const arcCtrl: [number, number] = [arcTo[0] - 120, arcTo[1] - 90];
  const arcCurve: Cubic = [arcFrom, [arcFrom[0] + 40, arcFrom[1] + 100], arcCtrl, arcTo];
  const arc = cubicPath(arcCurve);
  const head = arrowHead(sampleCubic(arcCurve), 15, 9);

  // ── The loop ──
  const DL = HASH.loop;
  const DS = HASH.setLoop;
  const dlH = listingHeight(DL.length, SIZE);
  const barsY = y(330) + dlH + h(90);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={frontAt} level={-38} />
      <Sfx name="el-tap" at={landAt} level={-33} />
      <Sfx name="el-pencil" at={straightAt} level={-35} />
      <Sfx name="el-tap" at={oneAt} level={-33} />
      <Sfx name="el-whoosh" at={fiftyAt - 6} level={-36} />
      <Sfx name="el-pop" at={fourAt} level={-33} />
      <Sfx name="el-pop" at={setAt + 4} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} size={60}>
          Why are dict and set lookups <span style={{ fontStyle: "italic" }}>O</span>(1), and when does that matter?
        </QuestionCard>

        <div style={{ position: "absolute", inset: 0, opacity: 1 - ease(frame, outMech, 12) }}>
          {/* ── a: the list ── */}
          <RowTitle at={ideaAt - 4} y={y(A_TITLE)} letter="a" color={LIST_INK} title="A list compares from the front" />
          <Counter at={frontAt - 2} y={y(A_TITLE)} value={count} color={LIST_INK} />
          {LIST_SLOTS.map((s, i) => {
            const at = asked - 4 + i * 1.5;
            if (s.kind === "gap") return <Gap key={i} x={s.x} y={y(A_CELLS)} at={at} />;
            const compared = count >= s.index + 1;
            const isLast = s.index === LAST;
            return (
              <Cell key={i} x={s.x} y={y(A_CELLS)} at={at} value={s.value} tint={isLast ? found * 0.42 : compared ? 0.14 : 0} color={LIST} />
            );
          })}
          {markerIn > 0 && found < 1 ? (
            <div
              style={{
                position: "absolute",
                left: markerX - 7,
                top: y(A_CELLS) - 7,
                width: CELL_W + 14,
                height: CELL_H + 14,
                border: `3px solid ${LIST}`,
                borderRadius: 6,
                opacity: markerIn * (1 - found),
              }}
            />
          ) : null}

          <div
            style={{
              position: "absolute",
              left: LEFT,
              top: y(RULE),
              width: (RIGHT - LEFT) * ease(frame, tableAt - 12, 16),
              height: 1,
              background: HAIRLINE,
            }}
          />

          {/* ── b: the set ── */}
          <RowTitle at={tableAt - 6} y={y(B_TITLE)} letter="b" color={SET_INK} title="A set hashes the value, then jumps" />
          <Counter at={oneAt - 6} y={y(B_TITLE)} value={frame >= oneAt - 4 ? 1 : 0} color={SET_INK} />
          <Ink at={functionAt - 2} dur={16} style={{ left: LEFT, top: pipeY, height: 50, display: "flex", alignItems: "center" }}>
            <Code line="hash(999_999)" size={CODE} />
          </Ink>
          <Arrow x={LEFT + 13 * CODE * 0.6 + 24} y={pipeY + 25} length={60} at={bucketAt - 4} />
          <Ink at={bucketAt} dur={12} style={{ left: resultX, top: pipeY, height: 50, display: "flex", alignItems: "center" }}>
            <Code line="999999" size={CODE} />
          </Ink>
          <Ink
            at={bucketAt + 2}
            dur={16}
            style={{ left: resultX + 6 * CODE * 0.6 + 40, top: pipeY, height: 50, display: "flex", alignItems: "center", gap: "0.45em", whiteSpace: "nowrap" }}
          >
            <span style={{ ...body(30, true), color: INK }}>bucket 999,999</span>
            <span style={{ ...body(30, true), color: INK_SOFT }}>of</span>
            <span style={{ position: "relative", ...headline(34), color: SET_INK, fontVariantNumeric: "tabular-nums lining-nums" }}>
              <span
                style={{
                  position: "absolute",
                  left: "-0.1em",
                  right: `calc(${1 - ease(frame, twoMillionAt - 2, 12)} * (100% + 0.2em) - 0.1em)`,
                  top: "0.08em",
                  bottom: "0.02em",
                  background: HIGHLIGHT,
                  zIndex: -1,
                }}
              />
              {commas(HASH.slots)}
            </span>
          </Ink>
          {BUCKETS.map((s, i) => {
            const at = tableAt + i * 1.5;
            if (s.kind === "gap") return <Gap key={i} x={s.x} y={y(B_CELLS)} at={at} />;
            const isTarget = s.index === LAST;
            return (
              <React.Fragment key={i}>
                <Ink at={at} dur={12} style={{ left: s.x, top: y(B_CELLS) - 32, width: CELL_W, textAlign: "center" }}>
                  <span style={{ ...note(19, isTarget && landed > 0 ? SET_INK : INK_SOFT), fontWeight: isTarget ? 650 : 500 }}>
                    {commas(s.index)}
                  </span>
                </Ink>
                <Cell x={s.x} y={y(B_CELLS)} at={at} value={s.value} tint={isTarget ? landed * 0.42 : 0} color={SET} dashed={s.value === null} />
              </React.Fragment>
            );
          })}
          {jump > 0 ? (
            <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
              <path d={arc} fill="none" stroke={SET} strokeWidth={3} strokeLinecap="round" pathLength={1} strokeDasharray={`${jump} 1`} />
              <path
                d={head}
                fill="none"
                stroke={SET}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={ease(frame, straightAt + 10, 6)}
              />
            </svg>
          ) : null}

          {/* ── The times, ListVsSet's ── */}
          <Note at={timedAt} x={LEFT} y={y(TIME_Y)}>
            <span style={{ display: "flex", gap: 34, alignItems: "baseline", whiteSpace: "nowrap" }}>
              <span style={{ ...note(30, LIST_INK), fontWeight: 650, opacity: ease(frame, msAt - 2, 10) }}>
                list <span style={{ fontVariantNumeric: "tabular-nums" }}>{HASH.listMs.toFixed(2)}</span> ms
              </span>
              <span style={{ ...note(30, SET_INK), fontWeight: 650, opacity: ease(frame, nsAt - 2, 10) }}>
                set <span style={{ fontVariantNumeric: "tabular-nums" }}>{HASH.setNs.toFixed(1)}</span> ns
              </span>
              <Source>a million numbers, timed in CPython 3.13 (the course video List or set?)</Source>
            </span>
          </Note>
        </div>

        {/* ── When it matters: "have I seen this?" inside a loop ── */}
        <Note at={loopAt} x={X0} y={y(330) - h(40)}>
          <Title color={LIST_INK}>seen as a list</Title>
        </Note>
        <Listing
          lines={DL}
          x={X0}
          top={y(330)}
          width={760}
          size={SIZE}
          at={loopAt + 2}
          marks={[{ line: lineOf(DL, "not in seen"), at: dedupAt + 4, color: MARK_BAD }]}
        />
        <Note at={setAt - 4} x={1000} y={y(330) - h(40)}>
          <Title color={SET_INK}>seen as a set</Title>
        </Note>
        <Listing
          lines={DS}
          x={1000}
          top={y(330)}
          width={760}
          size={SIZE}
          at={setAt - 2}
          marks={[{ line: lineOf(DS, "not in seen"), at: setAt + 6, color: MARK_OK }]}
        />
        <Note at={fiftyAt - 8} x={X0} y={barsY - h(44)}>
          <Title>comparisons, deduplicating distinct keys</Title>
        </Note>
        <Bars
          x={X0}
          top={barsY}
          width={860}
          rowH={h(58)}
          nameW={330}
          bars={[
            { name: "list, 10,000 keys", value: HASH.list10k, num: commas(HASH.list10k), color: LIST, ink: LIST_INK, at: fiftyAt - 6 },
            { name: "list, 5,000 keys", value: HASH.list5k, num: commas(HASH.list5k), color: LIST, ink: LIST_INK, at: doubleAt - 2 },
            { name: "set, 10,000 keys", value: HASH.set10k, num: commas(HASH.set10k), color: SET, ink: SET_INK, at: setAt + 2 },
          ]}
        />
        <Note at={fourAt} x={X0 + 330 + 860 * (HASH.list5k / HASH.list10k) + 260} y={barsY + h(58) + h(10)}>
          <span style={{ ...note(28, LIST_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            twice the keys, four times the work:{" "}
            <Mark at={squaredAt}>
              <span style={{ fontStyle: "italic" }}>O</span>(<span style={{ fontStyle: "italic" }}>n</span>²)
            </Mark>
          </span>
        </Note>
        <Note at={setAt + 10} x={X0 + 330 + 160} y={barsY + 2 * h(58) + h(10)}>
          <span style={{ ...note(26, SET_INK), fontWeight: 650, whiteSpace: "nowrap" }}>one hash lookup per record</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};

/** A panel's letter and title, in one line. */
const RowTitle: React.FC<{ at: number; y: number; letter: string; color: string; title: string }> = ({ at, y, letter, color, title }) => (
  <Ink at={at} dur={16} style={{ left: LEFT, top: y, whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 14 }}>
    <span style={label(22, color)}>{letter}</span>
    <span style={{ ...body(32, true), color: INK }}>{title}</span>
  </Ink>
);

/** "comparisons 1,000,000", at the right end of a panel's title line. */
const Counter: React.FC<{ at: number; y: number; value: number; color: string }> = ({ at, y, value, color }) => (
  <Note at={at} x={RIGHT} y={y - 8} align="right" from="right">
    <div style={{ display: "flex", alignItems: "baseline", gap: 16, justifyContent: "flex-end" }}>
      <span style={label(21, INK_SOFT)}>comparisons</span>
      <span style={{ ...headline(46), color, fontVariantNumeric: "tabular-nums lining-nums", minWidth: "4.6em", textAlign: "right" }}>
        {commas(value)}
      </span>
    </div>
  </Note>
);

/** One item of the list, or one bucket of the table. */
const Cell: React.FC<{ x: number; y: number; at: number; value: number | null; tint: number; color: string; dashed?: boolean }> = ({
  x,
  y,
  at,
  value,
  tint,
  color,
  dashed,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: CELL_W,
        height: CELL_H,
        boxSizing: "border-box",
        border: dashed ? `1.5px dashed ${HAIRLINE}` : `1.5px solid ${INK}`,
        borderRadius: 4,
        background:
          tint > 0
            ? `color-mix(in srgb, ${color} ${Math.round(tint * 100)}%, ${PAPER})`
            : dashed
              ? "transparent"
              : `color-mix(in srgb, ${INK} 3%, ${PAPER})`,
        opacity: p,
        transform: `translateY(${(1 - p) * 10}px)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: MONO,
        fontSize: 26,
        color: inkOf.orange,
      }}
    >
      {value === null ? "" : literal(value)}
    </div>
  );
};

/** "…" between two runs of cells. */
const Gap: React.FC<{ x: number; y: number; at: number }> = ({ x, y, at }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: ELLIPSIS,
        height: CELL_H,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...headline(48),
        color: INK_SOFT,
        opacity: ease(frame, at, 12),
      }}
    >
      …
    </div>
  );
};

/** A short arrow, drawn left to right. */
const Arrow: React.FC<{ x: number; y: number; length: number; at: number }> = ({ x, y, length, at }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10);
  if (p <= 0) return null;
  const end = x + length * p;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      <line x1={x} x2={end} y1={y} y2={y} stroke={INK} strokeWidth={2} />
      <path
        d={arrowHead(
          [
            [x, y],
            [end, y],
          ],
          10,
          7,
        )}
        fill="none"
        stroke={INK}
        strokeWidth={2}
      />
    </svg>
  );
};
