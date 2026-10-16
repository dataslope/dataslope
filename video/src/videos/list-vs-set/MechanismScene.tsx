import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, type Cubic, cubicPath, sampleCubic } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useNarration } from "../../narration/NarrationContext";
import { useLayout } from "../../editorial/layout";
import { body, HAIRLINE, headline, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { ILLUSTRATIONS, TABLE_SLOTS, VIDEO } from "./data";
import { Code, commas, Fig, LIST, LIST_INK, Mono, SET, SET_INK } from "./kit";

const LEFT = 120;
const RIGHT = 1800;
const CELL_W = 140;
const STEP = 154;
const ELLIPSIS = 104;
const CELL_H = 80;
const CODE = 30;

/** A row of cells with gaps ("…") between runs, laid out left to right. */
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
/** The list: its first seven items, then its last three. */
const LIST_SLOTS = lay([run(0, 6), run(LAST - 2, LAST)]);
/** The set's table: 2,097,152 buckets, of which 0 to 999,999 are filled. */
const BUCKETS = lay([run(0, 3), run(LAST - 1, LAST + 2, LAST + 1), run(TABLE_SLOTS - 1, TABLE_SLOTS - 1, LAST + 1)]);
const cellsOf = (slots: Slot[]) => slots.filter((s): s is Extract<Slot, { kind: "cell" }> => s.kind === "cell");
const LIST_CELLS = cellsOf(LIST_SLOTS);
const BUCKET_CELLS = cellsOf(BUCKETS);
const TARGET_BUCKET = BUCKET_CELLS.find((c) => c.index === LAST)!;

/** Layout rows, before `y()`. */
const A_TITLE = 170;
const A_CELLS = 252;
const A_NOTE = 372;
/** Until panel b arrives, panel a sits this much lower, nearer the page's middle. */
const A_DROP = 170;
const RULE = 446;
const B_TITLE = 474;
const PIPE = 548;
const B_CELLS = 700;
const FOOT = 812;

/** A value as Python prints it in source: 999_999. */
const literal = (v: number) => v.toLocaleString("en-US").replace(/,/g, "_");

/**
 * How each one answers: the list compares from the front until it reaches
 * the last item; the set hashes the value and goes to the one bucket that
 * holds it.
 */
export const MechanismScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();

  const start = n.beat("scan").from;
  const ideaAt = n.word("scan", "no idea");
  const frontAt = n.word("scan", "front");
  const millionFrom = n.beat("million").from;
  const comparisonsAt = n.word("million", "million comparisons");
  const notThereAt = n.word("million", "not there");
  const allAt = n.word("million", "all million");
  const tableAt = n.word("hash", "hash table");
  // Panel a rises to the top half as panel b arrives under it.
  const rise = ease(frame, tableAt - 22, 26);
  const ya = (v: number) => y(v) + h(A_DROP) * (1 - rise);
  const functionAt = n.word("hash", "hash function");
  const resultAt = n.word("hash", "result");
  const bucketAt = n.word("hash", "one bucket");
  const twoMillionAt = n.word("hash", "two million");
  const straightAt = n.word("jump", "straight");
  const thatBucketAt = n.word("jump", "that bucket");
  const oneAt = n.word("jump", "one comparison");

  // ── The scan: a crawl over the first seven, a run across the gap, and a
  //    crawl over the last three. The counter, the marker and the tints are
  //    all read off one number: how many comparisons have been made. ──
  const crawl = 7;
  const tick = 7;
  const crawlFrom = frontAt - 4;
  const crawlEnd = crawlFrom + crawl * tick;
  const landAt = Math.max(crawlEnd + 40, comparisonsAt - 4);
  const ffTo = landAt - 2 * tick;
  const ffFrom = Math.min(Math.max(crawlEnd + 4, millionFrom - 6), ffTo - 24);
  const TAIL = LAST - 1; // 999,998 comparisons: the marker is on 999_997
  let count = 0;
  if (frame >= crawlFrom) count = Math.min(crawl, Math.floor((frame - crawlFrom) / tick) + 1);
  if (frame >= ffFrom) {
    const p = interpolate(frame, [ffFrom, ffTo], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    count = Math.round(crawl * (TAIL / crawl) ** (p * p * (3 - 2 * p)));
  }
  if (frame >= ffTo) count = Math.min(LAST + 1, TAIL + Math.floor((frame - ffTo) / tick));
  // The marker sits on the item being compared, item `count - 1`; across the
  // gap it moves as the logarithm of the count, which is what the run is.
  const cellX = (item: number) => LIST_CELLS.find((c) => c.index === item)?.x;
  const gapFrom = LIST_CELLS[crawl - 1].x;
  const gapTo = cellX(TAIL - 1) ?? gapFrom;
  const markerX =
    count === 0
      ? LIST_CELLS[0].x
      : (cellX(count - 1) ??
        gapFrom + (gapTo - gapFrom) * (Math.log(count / crawl) / Math.log((TAIL - 1) / crawl)));
  const lastX = LIST_CELLS[LIST_CELLS.length - 1].x;
  const markerIn = ease(frame, crawlFrom - 6, 8);
  const found = ease(frame, landAt, 10);

  // ── The set ──
  const jump = ease(frame, straightAt - 4, 18);
  const landed = ease(frame, thatBucketAt - 2, 10);
  const catalog = pop(frame, tableAt - 6, fps, 15);

  const resultX = LEFT + 13 * CODE * 0.6 + 104;
  const pipeY = y(PIPE);
  const arcFrom: [number, number] = [resultX + 3 * CODE * 0.6, pipeY + 52];
  const arcTo: [number, number] = [TARGET_BUCKET.x + CELL_W / 2, y(B_CELLS) - 42];
  const arcCtrl: [number, number] = [arcTo[0] - 120, arcTo[1] - 110];
  const arcCurve: Cubic = [arcFrom, [arcFrom[0] + 40, arcFrom[1] + 130], arcCtrl, arcTo];
  const arc = cubicPath(arcCurve);
  // The head follows the last 15 px of the curve where it lands
  // (components/arrow.ts). A fixed downward V met the curve at an angle and
  // read as a tick.
  const head = arrowHead(sampleCubic(arcCurve), 15, 9);

  return (
    <AbsoluteFill>
      <Fig n="2" at={start - 14} x={LEFT} y={y(104)}>
        How each one looks for <Mono>999_999</Mono>
      </Fig>

      {/* ── a: the list ── */}
      <RowTitle at={start - 8} y={ya(A_TITLE)} letter="a" color={LIST_INK} title="The list walks it, front to back" />
      <Counter at={frontAt - 2} y={ya(A_TITLE)} value={count} color={LIST_INK} hot={ease(frame, comparisonsAt - 2, 8)} />
      {LIST_SLOTS.map((s, i) => {
        const at = start - 6 + i * 1.5;
        if (s.kind === "gap") return <Gap key={i} x={s.x} y={ya(A_CELLS)} at={at} />;
        // A cell is tinted once the scan has compared it.
        const compared = count >= s.index + 1;
        const isLast = s.index === LAST;
        return (
          <Cell
            key={i}
            x={s.x}
            y={ya(A_CELLS)}
            at={at}
            value={s.value}
            tint={isLast ? found * 0.42 : compared ? 0.14 : 0}
            color={LIST}
          />
        );
      })}
      {markerIn > 0 && found < 1 ? (
        <div
          style={{
            position: "absolute",
            left: markerX - 7,
            top: ya(A_CELLS) - 7,
            width: CELL_W + 14,
            height: CELL_H + 14,
            border: `3px solid ${LIST}`,
            borderRadius: 6,
            opacity: markerIn * (1 - found),
          }}
        />
      ) : null}
      <Note at={ideaAt} x={LEFT} y={ya(A_CELLS) + CELL_H + 20} out={notThereAt - 6}>
        <span style={note(22, INK_SOFT)}>Nothing records where a value is, so each item is checked in turn.</span>
      </Note>
      <Note at={landAt + 2} x={lastX + CELL_W} y={ya(A_CELLS) + CELL_H + 20} align="right" out={notThereAt - 6}>
        <span style={{ ...note(22, LIST_INK), fontWeight: 650 }}>found at the very end</span>
      </Note>
      <Ink at={notThereAt - 2} dur={16} style={{ left: LEFT, top: ya(A_NOTE), display: "flex", alignItems: "baseline", gap: "0.6em", whiteSpace: "nowrap" }}>
        <Code line="-1 in big_list" size={CODE} />
        <span style={note(24, INK_SOFT)}>
          not there: all <b style={{ color: LIST_INK, opacity: ease(frame, allAt - 2, 8) }}>1,000,000</b> compared, then{" "}
          <Mono color="var(--ds-purple-700)">False</Mono>
        </span>
      </Ink>

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
      <RowTitle at={tableAt - 8} y={y(B_TITLE)} letter="b" color={SET_INK} title="The set hashes the value, then jumps" />
      <Counter at={oneAt - 4} y={y(B_TITLE)} value={frame >= oneAt - 2 ? 1 : 0} color={SET_INK} hot={ease(frame, oneAt, 8)} />

      {/* hash(999_999) → 999999 → bucket 999,999 of 2,097,152 */}
      <Ink at={functionAt - 2} dur={16} style={{ left: LEFT, top: pipeY, height: 52, display: "flex", alignItems: "center" }}>
        <Code line="hash(999_999)" size={CODE} />
      </Ink>
      <Arrow x={LEFT + 13 * CODE * 0.6 + 24} y={pipeY + 26} length={60} at={resultAt - 4} />
      <Ink at={resultAt} dur={12} style={{ left: resultX, top: pipeY, height: 52, display: "flex", alignItems: "center" }}>
        <Code line="999999" size={CODE} />
      </Ink>
      <Ink
        at={bucketAt - 2}
        dur={16}
        style={{ left: resultX + 6 * CODE * 0.6 + 40, top: pipeY, height: 52, display: "flex", alignItems: "center", gap: "0.45em", whiteSpace: "nowrap" }}
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
          {commas(TABLE_SLOTS)}
        </span>
      </Ink>

      {BUCKETS.map((s, i) => {
        const at = tableAt - 2 + i * 1.5;
        if (s.kind === "gap") return <Gap key={i} x={s.x} y={y(B_CELLS)} at={at} />;
        const isTarget = s.index === LAST;
        return (
          <React.Fragment key={i}>
            <Ink at={at} dur={12} style={{ left: s.x, top: y(B_CELLS) - 34, width: CELL_W, textAlign: "center" }}>
              <span style={{ ...note(19, isTarget && landed > 0 ? SET_INK : INK_SOFT), fontWeight: isTarget ? 650 : 500 }}>
                {commas(s.index)}
              </span>
            </Ink>
            <Cell
              x={s.x}
              y={y(B_CELLS)}
              at={at}
              value={s.value}
              tint={isTarget ? landed * 0.42 : 0}
              color={SET}
              dashed={s.value === null}
            />
          </React.Fragment>
        );
      })}
      {jump > 0 ? (
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <path
            d={arc}
            fill="none"
            stroke={SET}
            strokeWidth={3}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={`${jump} 1`}
          />
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
      <Note at={thatBucketAt + 10} x={LEFT} y={y(FOOT)}>
        <span style={note(21, INK_SOFT)}>
          A whole number hashes to itself, so here every value sits in the bucket of the same number.
        </span>
      </Note>

      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="lvs-card-catalog"
          style={{
            position: "absolute",
            left: 1510,
            top: y(500),
            width: 270,
            height: 150,
            opacity: catalog,
            transform: `translateY(${bob(frame + 20, 4, 96) + (1 - catalog) * 24}px)`,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

/** A panel's letter and title, in one line. */
const RowTitle: React.FC<{ at: number; y: number; letter: string; color: string; title: string }> = ({
  at,
  y,
  letter,
  color,
  title,
}) => (
  <Ink at={at} dur={16} style={{ left: LEFT, top: y, whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 14 }}>
    <span style={label(22, color)}>{letter}</span>
    <span style={{ ...body(34, true), color: INK }}>{title}</span>
  </Ink>
);

/** "comparisons 1,000,000", at the right end of a panel's title line. */
const Counter: React.FC<{ at: number; y: number; value: number; color: string; hot: number }> = ({
  at,
  y,
  value,
  color,
  hot,
}) => (
  <Note at={at} x={RIGHT} y={y - 10} align="right" from="right">
    <div style={{ display: "flex", alignItems: "baseline", gap: 16, justifyContent: "flex-end" }}>
      <span style={label(21, INK_SOFT)}>comparisons</span>
      <span
        style={{
          ...headline(52),
          color,
          fontVariantNumeric: "tabular-nums lining-nums",
          minWidth: "4.6em",
          textAlign: "right",
          transform: `scale(${1 + hot * 0.06 * (1 - hot)})`,
          transformOrigin: "100% 70%",
        }}
      >
        {commas(value)}
      </span>
    </div>
  </Note>
);

/** One item of the list, or one bucket of the table. */
const Cell: React.FC<{
  x: number;
  y: number;
  at: number;
  value: number | null;
  tint: number;
  color: string;
  dashed?: boolean;
}> = ({ x, y, at, value, tint, color, dashed }) => {
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
        color: "var(--ds-orange-700)",
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

/** A short hairline arrow, drawn left to right. */
const Arrow: React.FC<{ x: number; y: number; length: number; at: number }> = ({ x, y, length, at }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10);
  if (p <= 0) return null;
  const end = x + length * p;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      <line x1={x} x2={end} y1={y} y2={y} stroke={INK} strokeWidth={2} />
      <path d={arrowHead([[x, y], [end, y]], 10, 7)} fill="none" stroke={INK} strokeWidth={2} />
    </svg>
  );
};
