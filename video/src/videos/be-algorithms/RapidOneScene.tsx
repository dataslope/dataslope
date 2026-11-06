import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK, RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { TABULAR, label } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { PAGE, PAGE_INPUTS, RAPID } from "./data";
import {
  ACCENT,
  ACCENT_INK,
  BAR,
  BLUE_FILL,
  BLUE_INK,
  Cell,
  Drift,
  HBar,
  HIGHLIGHT,
  Headline,
  INK,
  INK_SOFT,
  Kicker,
  Line,
  Mark,
  OK_INK,
  PAPER,
  Pill,
  Svg,
  X0,
  int,
} from "./parts";

const R_X = 780;
const LIST_TOP = 300;
const ROW = 46;

type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"]; T: number };

/** "[3, 9, 10]" → [3, 9, 10]: a printed Python list of numbers. */
const listOf = (printed: string) => printed.replace(/[[\]\s]/g, "").split(",").map(Number);

/** A row of array cells, each inking in a little after the one before. */
const Row: React.FC<{ values: readonly React.ReactNode[]; x: number; y: number; at: number; tone?: "data" | "ok" | "bad" | "plain" | "look"; w?: number; gap?: number; size?: number }> = ({
  values,
  x,
  y,
  at,
  tone = "data",
  w = 60,
  gap = 8,
  size = 24,
}) => (
  <>
    {values.map((v, i) => (
      <Cell key={i} x={x + i * (w + gap)} y={y} at={at + i * 2} value={v} tone={tone} w={w} h={52} size={size} />
    ))}
  </>
);

// ── 9. Merge sort ────────────────────────────────────────────────────────────

const Merge: React.FC<{ c: Ctx }> = ({ c }) => {
  const halvesAt = c.w("r-merge", "halves");
  const sortsAt = c.w("r-merge", "sorts each half");
  const mergesAt = c.w("r-merge", "merges in linear time");
  const alwaysAt = c.w("r-merge", "n log n always");
  const pythonAt = c.w("r-merge", "Python's sort builds on it");
  const input = PAGE_INPUTS.mergeSort;
  const mid = Math.floor(input.length / 2);
  const left = input.slice(0, mid);
  const right = input.slice(mid);
  const sorted = (a: readonly number[]) => [...a].sort((p, q) => p - q);
  const out = listOf(PAGE.mergeSort[0]);
  const step = c.h(86);
  return (
    <>
      <Row values={input} x={R_X} y={c.T} at={halvesAt - 8} />
      <Row values={left} x={R_X} y={c.T + step} at={halvesAt} />
      <Row values={right} x={R_X + 250} y={c.T + step} at={halvesAt + 4} />
      <Row values={sorted(left)} x={R_X} y={c.T + 2 * step} at={sortsAt} />
      <Row values={sorted(right)} x={R_X + 250} y={c.T + 2 * step} at={sortsAt + 4} />
      <Row values={out} x={R_X} y={c.T + 3 * step} at={mergesAt} tone="ok" />
      {[
        { t: "the input", at: halvesAt - 8, k: 0 },
        { t: "halves", at: halvesAt, k: 1 },
        { t: "each sorted", at: sortsAt, k: 2 },
        { t: "merged in O(n)", at: mergesAt, k: 3 },
      ].map((r) => (
        <Line key={r.t} at={r.at} x={R_X + 7 * 68 + 40} y={c.T + r.k * step + 12} size={23} color={INK_SOFT}>
          {r.t}
        </Line>
      ))}
      <Line at={alwaysAt} x={R_X} y={c.T + 4 * step + c.h(10)} size={25} weight={650}>
        O(n log n) always, stable, O(n) extra memory
      </Line>
      <Line at={pythonAt} x={R_X} y={c.T + 4 * step + c.h(54)} size={24} color={INK_SOFT}>
        Python&apos;s own sort builds on it
      </Line>
    </>
  );
};

// ── 10. Heapsort ─────────────────────────────────────────────────────────────

const Heapsort: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const guaranteesAt = c.w("r-heapsort", "Heapsort guarantees n log n");
  const spaceAt = c.w("r-heapsort", "in constant extra space");
  const cacheAt = c.w("r-heapsort", "less cache-friendly than quicksort");
  const suitsAt = c.w("r-heapsort", "It suits tight memory");
  const cells = 15;
  const cw = 54;
  const rowY = c.T + c.h(150);
  const cx = (i: number) => R_X + i * cw + cw / 2;
  // A heap's parent-to-child reads: i to 2i + 1 and 2i + 2, far apart.
  const arcs = Array.from({ length: 7 }, (_, i) => [i, 2 * i + 1] as const);
  const arcP = ease(frame, cacheAt, 20);
  return (
    <>
      <Line at={guaranteesAt} x={R_X} y={c.T} size={26} weight={700}>
        Heapsort: O(n log n) guaranteed
        <span style={{ opacity: ease(frame, spaceAt, 10) }}>, O(1) extra space</span>
      </Line>
      {Array.from({ length: cells }, (_, i) => (
        <Cell key={i} x={R_X + i * cw} y={rowY} at={guaranteesAt + 6 + i} value="" w={cw - 6} h={44} />
      ))}
      <Svg opacity={arcP > 0 ? 1 : 0}>
        {arcs.map(([a, b], k) => {
          const x1 = cx(a);
          const x2 = cx(b);
          const r = (x2 - x1) / 2;
          return (
            <path
              key={k}
              d={`M${x1},${rowY - 6} A${r},${r * 0.8} 0 0 1 ${x2},${rowY - 6}`}
              fill="none"
              stroke={ACCENT}
              strokeWidth={2.2}
              pathLength={1}
              strokeDasharray={`${ease(frame, cacheAt + k * 3, 10)} 1`}
            />
          );
        })}
      </Svg>
      <Line at={cacheAt + 6} x={R_X} y={rowY + c.h(70)} size={24} color={ACCENT_INK} weight={600}>
        Parent to child is a jump across the array: less cache-friendly than quicksort
      </Line>
      <Line at={suitsAt} x={R_X} y={rowY + c.h(118)} size={25} weight={700} color={OK_INK}>
        It suits tight memory
      </Line>
    </>
  );
};

// ── 11. Stable ───────────────────────────────────────────────────────────────

const Stable: React.FC<{ c: Ctx }> = ({ c }) => {
  const keepsAt = c.w("r-stable", "A stable sort keeps ties in order");
  const firstAt = c.w("r-stable", "Sort by first name");
  const lastAt = c.w("r-stable", "then stable-sort by last");
  const hoppersAt = c.w("r-stable", "the two Hoppers stay in first-name order");
  const S = RAPID.stable;
  const rowH = c.h(46);
  const col2 = R_X + 440;
  const hop = (r: readonly string[]) => r[1] === "Hopper";
  return (
    <>
      <Line at={keepsAt} x={R_X} y={c.T} size={25} weight={650}>
        A stable sort keeps ties in their order
      </Line>
      <Line at={firstAt} x={R_X} y={c.T + c.h(60)} size={22} color={INK_SOFT} weight={650}>
        By first name
      </Line>
      <Line at={lastAt} x={col2} y={c.T + c.h(60)} size={22} color={INK_SOFT} weight={650}>
        Then, stably, by last name
      </Line>
      {S.byFirst.map((r, i) => (
        <Line key={`f${i}`} at={firstAt + 4 + i * 3} x={R_X} y={c.T + c.h(104) + i * rowH} size={24} weight={hop(r) ? 700 : 500}>
          {hop(r) ? <Mark at={hoppersAt}>{r.join(" ")}</Mark> : r.join(" ")}
        </Line>
      ))}
      {S.thenLast.map((r, i) => (
        <Line key={`l${i}`} at={lastAt + 4 + i * 3} x={col2} y={c.T + c.h(104) + i * rowH} size={24} weight={hop(r) ? 700 : 500}>
          {hop(r) ? <Mark at={hoppersAt + 4}>{r.join(" ")}</Mark> : r.join(" ")}
        </Line>
      ))}
      <Line at={hoppersAt + 8} x={R_X} y={c.T + c.h(104) + 5 * rowH + c.h(20)} size={24} weight={650} color={OK_INK}>
        The two Hoppers stay Ada, then Grace
      </Line>
    </>
  );
};

// ── 12. In place or out of place ─────────────────────────────────────────────

const InPlace: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const inAt = c.w("r-inplace", "In place means constant extra memory");
  const stackAt = c.w("r-inplace", "or log n of stack");
  const quickAt = c.w("r-inplace", "quicksort, with random pivots");
  const outAt = c.w("r-inplace", "Out of place grows with the input");
  const mergeAt = c.w("r-inplace", "merge sort");
  const values = PAGE_INPUTS.mergeSort;
  const b2 = c.T + c.h(250);
  return (
    <>
      <Line at={inAt} x={R_X} y={c.T} size={25} weight={700}>
        In place: O(1) extra<span style={{ opacity: ease(frame, stackAt, 10) }}>, or O(log n) of stack</span>
      </Line>
      <Row values={values} x={R_X} y={c.T + c.h(52)} at={inAt + 4} />
      <Line at={quickAt} x={R_X} y={c.T + c.h(122)} size={24} color={BLUE_INK} weight={650}>
        quicksort, with random pivots
      </Line>
      <Line at={outAt} x={R_X} y={b2} size={25} weight={700}>
        Out of place: extra memory grows with the input
      </Line>
      <Row values={values} x={R_X} y={b2 + c.h(52)} at={outAt + 4} />
      <Row values={values.map(() => "")} x={R_X} y={b2 + c.h(52) + 62} at={outAt + 10} tone="plain" />
      <Line at={outAt + 14} x={R_X + 7 * 68 + 24} y={b2 + c.h(52) + 74} size={22} color={INK_SOFT}>
        a buffer as big as the input
      </Line>
      <Line at={mergeAt} x={R_X} y={b2 + c.h(52) + 140} size={24} color={BLUE_INK} weight={650}>
        merge sort
      </Line>
    </>
  );
};

// ── 13. The Master Theorem ───────────────────────────────────────────────────

const Master: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const solvesAt = c.w("r-master", "The Master Theorem solves");
  const combiningAt = c.w("r-master", "the work of combining");
  const piecesAt = c.w("r-master", "the number of smallest pieces");
  const tieAt = c.w("r-master", "For merge sort they tie");
  const nlognAt = c.w("r-master", "so n log n");
  const levels = 5;
  const W = 640;
  const rowY = (k: number) => c.T + c.h(110) + k * c.h(58);
  return (
    <>
      <Line at={solvesAt} x={R_X} y={c.T} size={25} weight={650}>
        Merge sort: <span style={{ fontFamily: MONO, fontWeight: 600 }}>T(n) = 2 T(n/2) + n</span>
      </Line>
      {Array.from({ length: levels }, (_, k) => {
        const parts = 2 ** k;
        const pw = W / parts;
        return (
          <React.Fragment key={k}>
            {Array.from({ length: parts }, (_, i) => (
              <Cell key={i} x={R_X + i * pw} y={rowY(k)} at={solvesAt + 6 + k * 4} value="" w={Math.max(4, pw - 6)} h={c.h(38)} tone={k === levels - 1 ? "look" : "data"} />
            ))}
            <Line at={combiningAt + k * 2} x={R_X + W + 30} y={rowY(k) + 6} size={22} color={INK_SOFT}>
              {k === levels - 1 ? "smallest pieces: n" : <>combine: <b style={{ color: INK }}>n</b></>}
            </Line>
          </React.Fragment>
        );
      })}
      <Line at={piecesAt} x={R_X} y={rowY(levels) + c.h(4)} size={24}>
        Combining costs n a level; the smallest pieces number n
      </Line>
      <Line at={tieAt} x={R_X} y={rowY(levels) + c.h(48)} size={25} weight={700} color={OK_INK}>
        They tie: n a level, log n levels<span style={{ opacity: ease(frame, nlognAt, 10) }}>, so O(n log n)</span>
      </Line>
    </>
  );
};

// ── 14. Recursion or iteration ───────────────────────────────────────────────

const Recursion: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const fitsAt = c.w("r-recursion", "Recursion fits trees");
  const frameAt = c.w("r-recursion", "every call takes a stack frame");
  const stopsAt = c.w("r-recursion", "Python stops at a thousand");
  const loopAt = c.w("r-recursion", "A loop with an explicit stack avoids that");
  const limit = RAPID.recursionLimit;
  const grow = ease(frame, frameAt, Math.max(20, stopsAt - frameAt + 6));
  const colH = c.h(420);
  const colTop = c.T + c.h(60);
  const shown = Math.round(grow * limit);
  return (
    <>
      <Line at={fitsAt} x={R_X} y={c.T} size={25} weight={650}>
        Each call takes a stack frame
      </Line>
      <div style={{ position: "absolute", left: R_X, top: colTop + colH * (1 - grow), width: 120, height: colH * grow, background: `repeating-linear-gradient(0deg, ${BAR} 0 3px, ${PAPER} 3px 5px)`, borderRadius: 4, opacity: grow > 0 ? 1 : 0 }} />
      <Line at={frameAt} x={R_X + 150} y={colTop + colH - 34} size={24} weight={650}>
        <span style={TABULAR}>{int(shown)}</span> frames
      </Line>
      <Line at={stopsAt} x={R_X + 150} y={colTop} size={24} weight={700} color={ACCENT_INK}>
        <Num>{int(limit)}</Num>: Python stops, RecursionError
      </Line>
      <Line at={loopAt} x={R_X + 150} y={colTop + c.h(150)} size={24} weight={700} color={OK_INK}>
        A loop with an explicit stack
      </Line>
      <Line at={loopAt + 8} x={R_X + 150} y={colTop + c.h(192)} size={23} color={INK_SOFT}>
        keeps the stack on the heap: no frame limit
      </Line>
    </>
  );
};

// ── 15. Divide and conquer, or DP ────────────────────────────────────────────

/** fib(n)'s call tree, as nodes with their argument, depth first. */
const fibTree = (n: number, depth = 0, x = 0.5, span = 0.5) => {
  const out: { n: number; depth: number; x: number; parent?: number }[] = [];
  const walk = (m: number, d: number, px: number, sp: number, parent?: number) => {
    const me = out.length;
    out.push({ n: m, depth: d, x: px, parent });
    if (m < 2) return;
    walk(m - 1, d + 1, px - sp / 2, sp / 2, me);
    walk(m - 2, d + 1, px + sp / 2, sp / 2, me);
  };
  walk(n, depth, x, span);
  return out;
};

const DivideDp: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const dcAt = c.w("r-dc", "Divide and conquer splits into independent subproblems");
  const mergeAt = c.w("r-dc", "like merge sort");
  const dpAt = c.w("r-dc", "Dynamic programming reuses the answers of overlapping ones");
  const fib = fibTree(5);
  const W = 520;
  const fx = R_X + 480;
  const ly = (d: number) => c.T + c.h(90) + d * c.h(66);
  const repeated = (m: number) => fib.filter((f) => f.n === m).length > 1 && m >= 2;
  const tint: Record<number, string> = { 3: HIGHLIGHT, 2: `color-mix(in srgb, ${OK} 40%, ${PAPER})` };
  return (
    <>
      <Line at={dcAt} x={R_X} y={c.T} size={24} weight={650}>
        Divide and conquer: independent
      </Line>
      {[0, 1, 2].map((k) =>
        Array.from({ length: 2 ** k }, (_, i) => (
          <Cell key={`${k}-${i}`} x={R_X + i * (380 / 2 ** k)} y={ly(k)} at={dcAt + 4 + k * 4} value="" w={380 / 2 ** k - 8} h={c.h(40)} />
        )),
      )}
      <Line at={mergeAt} x={R_X} y={ly(3) + c.h(4)} size={23} color={INK_SOFT}>
        merge sort: no piece is solved twice
      </Line>
      <Line at={dpAt} x={fx} y={c.T} size={24} weight={650}>
        Dynamic programming: overlapping
      </Line>
      <Svg opacity={ease(frame, dpAt + 4, 12)}>
        {fib.map((f, i) =>
          f.parent === undefined ? null : (
            <line key={i} x1={fx + fib[f.parent].x * W} y1={ly(fib[f.parent].depth) + 16} x2={fx + f.x * W} y2={ly(f.depth) - 16} stroke={INK_SOFT} strokeWidth={1.4} />
          ),
        )}
      </Svg>
      {fib.map((f, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: fx + f.x * W - 26,
            top: ly(f.depth) - 16,
            width: 52,
            height: 32,
            borderRadius: 16,
            border: `2px solid ${repeated(f.n) ? INK : BAR}`,
            background: repeated(f.n) ? tint[f.n] ?? BLUE_FILL : BLUE_FILL,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            ...label(20, INK),
            ...TABULAR,
            opacity: ease(frame, dpAt + 4 + f.depth * 3, 8),
          }}
        >
          {f.n}
        </div>
      ))}
      <Line at={dpAt + 20} x={fx} y={ly(5) + c.h(4)} size={23} color={INK_SOFT}>
        fib(5): the same calls again; reuse the answers
      </Line>
    </>
  );
};

// ── 16. Memoization or tabulation ────────────────────────────────────────────

const Memo: React.FC<{ c: Ctx }> = ({ c }) => {
  const memoAt = c.w("r-memo", "Memoization recurses and caches");
  const tabAt = c.w("r-memo", "Tabulation fills a table bottom-up");
  const naiveAt = c.w("r-memo", "Naive Fibonacci of thirty makes");
  const memoizedAt = c.w("r-memo", "memoized, fifty-nine");
  const fibs = Array.from({ length: 11 }, (_, i) => i).reduce<number[]>((acc, i) => [...acc, i < 2 ? i : acc[i - 1] + acc[i - 2]], []);
  const last = Number(PAGE.memo[1]);
  return (
    <>
      <Line at={memoAt} x={R_X} y={c.T} size={24} weight={650}>
        Memoization: recurse, and cache each answer (top-down)
      </Line>
      <Line at={tabAt} x={R_X} y={c.T + c.h(50)} size={24} weight={650}>
        Tabulation: fill a table from the bottom up
      </Line>
      <Row values={[...fibs.slice(0, 10), last]} x={R_X} y={c.T + c.h(102)} at={tabAt + 4} w={56} gap={6} size={21} />
      <Line at={tabAt + 26} x={R_X} y={c.T + c.h(166)} size={21} color={INK_SOFT}>
        fib(0) to fib(10): the page prints <Num>{last}</Num>
      </Line>
      <Line at={naiveAt} x={R_X} y={c.T + c.h(226)} size={23} weight={650}>
        Calls to compute fib(30)
      </Line>
      <HBar x={R_X} y={c.T + c.h(266)} w={700} max={RAPID.fibNaiveCalls} value={RAPID.fibNaiveCalls} at={naiveAt + 6} color={ACCENT} ink={ACCENT_INK} label="Naive" valueText={<Num>{int(RAPID.fibNaiveCalls)}</Num>} size={22} barH={22} />
      <HBar x={R_X} y={c.T + c.h(338)} w={700} max={RAPID.fibNaiveCalls} value={RAPID.fibMemoCalls} at={memoizedAt} color={OK} ink={OK_INK} label="Memoized" valueText={<Num>{RAPID.fibMemoCalls}</Num>} size={22} barH={22} />
    </>
  );
};

// ── 17. Classic DP problems ──────────────────────────────────────────────────

const Classic: React.FC<{ c: Ctx }> = ({ c }) => {
  const knowAt = c.w("r-classic", "Know coin change");
  const stateAt = c.w("r-classic", "each teaches a way to define the state");
  const problems = [
    { name: "coin change", state: "fewest coins for each amount", at: knowAt },
    { name: "longest common subsequence", state: "a prefix of each string", at: c.w("r-classic", "longest common subsequence") },
    { name: "knapsack", state: "items so far, capacity left", at: c.w("r-classic", "knapsack") },
    { name: "edit distance", state: "a prefix of each string", at: c.w("r-classic", "edit distance") },
    { name: "word break", state: "can this prefix be split?", at: c.w("r-classic", "word break") },
  ];
  return (
    <>
      {problems.map((p, i) => (
        <React.Fragment key={p.name}>
          <Pill x={R_X} y={c.T + i * c.h(76)} at={p.at - 2} tone="data" size={23}>
            {p.name}
          </Pill>
          <Line at={stateAt + i * 4} x={R_X + 420} y={c.T + i * c.h(76) + 8} size={23} color={INK_SOFT}>
            state: {p.state}
          </Line>
        </React.Fragment>
      ))}
      <Line at={stateAt} x={R_X} y={c.T + 5 * c.h(76) + c.h(12)} size={25} weight={700}>
        Each teaches a way to <Mark at={stateAt + 6}>define the state</Mark>
      </Line>
    </>
  );
};

// ── 18. Greedy ───────────────────────────────────────────────────────────────

const Coin: React.FC<{ v: number; x: number; y: number; at: number; tone: "bad" | "ok" }> = ({ v, x, y, at, tone }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10);
  const r = 22 + v * 5;
  const color = tone === "ok" ? OK : ACCENT;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y - r,
        width: 2 * r,
        height: 2 * r,
        borderRadius: "50%",
        border: `3px solid ${color}`,
        background: `color-mix(in srgb, ${color} 14%, ${PAPER})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...label(26, tone === "ok" ? OK_INK : ACCENT_INK),
        ...TABULAR,
        opacity: p,
        transform: `scale(${0.7 + 0.3 * p})`,
      }}
    >
      {v}
    </div>
  );
};

const Greedy: React.FC<{ c: Ctx }> = ({ c }) => {
  const takesAt = c.w("r-greedy", "Greedy takes the best-looking step");
  const safeAt = c.w("r-greedy", "safe only when local choices provably add up");
  const sixAt = c.w("r-greedy", "To make six from coins of one, three and four");
  const threeAt = c.w("r-greedy", "it takes three coins");
  const twoAt = c.w("r-greedy", "Two threes do it");
  const coinX = (coins: readonly number[], i: number) => R_X + 260 + coins.slice(0, i).reduce((s, v) => s + 2 * (22 + v * 5) + 18, 0);
  const g = RAPID.greedy;
  const f = RAPID.fewest;
  const y1 = c.T + c.h(200);
  const y2 = c.T + c.h(310);
  return (
    <>
      <Line at={takesAt} x={R_X} y={c.T} size={24} weight={650}>
        Greedy: the best-looking step each time
      </Line>
      <Line at={safeAt} x={R_X} y={c.T + c.h(44)} size={23} color={INK_SOFT}>
        safe only when local choices provably add up
      </Line>
      <Line at={sixAt} x={R_X} y={c.T + c.h(104)} size={24} weight={650}>
        Make <Num>{g.reduce((s, v) => s + v, 0)}</Num> from coins of 1, 3 and 4
      </Line>
      <Line at={sixAt + 10} x={R_X} y={y1 - 16} size={24} weight={650} color={ACCENT_INK}>
        Greedy
      </Line>
      {g.map((v, i) => (
        <Coin key={`g${i}`} v={v} x={coinX(g, i)} y={y1} at={sixAt + 12 + i * 6} tone="bad" />
      ))}
      <Line at={threeAt} x={coinX(g, g.length) + 20} y={y1 - 16} size={24} weight={700} color={ACCENT_INK}>
        <Num>{g.length}</Num> coins
      </Line>
      <Line at={twoAt} x={R_X} y={y2 - 16} size={24} weight={650} color={OK_INK}>
        Fewest
      </Line>
      {f.map((v, i) => (
        <Coin key={`f${i}`} v={v} x={coinX(f, i)} y={y2} at={twoAt + 4 + i * 6} tone="ok" />
      ))}
      <Line at={twoAt + 10} x={coinX(f, f.length) + 20} y={y2 - 16} size={24} weight={700} color={OK_INK}>
        <Num>{f.length}</Num> coins
      </Line>
    </>
  );
};

// ── 19. Backtracking ─────────────────────────────────────────────────────────

const Backtrack: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const buildsAt = c.w("r-backtrack", "Backtracking builds a candidate step by step");
  const dropsAt = c.w("r-backtrack", "drops a branch the moment it can't succeed");
  const usesAt = c.w("r-backtrack", "N-Queens, Sudoku, permutations");
  const perms = JSON.parse(PAGE.permutations[0]) as number[][];
  const nums = PAGE_INPUTS.permutations;
  const W = 840;
  const lx = (k: number, i: number) => R_X + ((i + 0.5) / k) * W;
  const ly = (d: number) => c.T + c.h(70) + d * c.h(92);
  // Level 1: three first choices; level 2: two each; level 3: the six leaves.
  const level1 = nums.map((v) => [v]);
  const level2 = level1.flatMap((p) => nums.filter((v) => !p.includes(v)).map((v) => [...p, v]));
  const at = (d: number) => buildsAt + 6 + d * 8;
  const node = (path: number[], d: number, i: number, k: number) => (
    <div
      key={`${d}-${i}`}
      style={{
        position: "absolute",
        left: lx(k, i) - 22,
        top: ly(d) - 22,
        width: 44,
        height: 44,
        borderRadius: 22,
        border: `2px solid ${d === 3 ? OK : BAR}`,
        background: d === 3 ? `color-mix(in srgb, ${OK} 14%, ${PAPER})` : BLUE_FILL,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...label(22, d === 3 ? OK_INK : BLUE_INK),
        ...TABULAR,
        opacity: ease(frame, at(d), 8),
      }}
    >
      {path[path.length - 1]}
    </div>
  );
  return (
    <>
      <Line at={buildsAt} x={R_X} y={c.T} size={24} weight={650}>
        Build a candidate step by step; undo a step to try the next
      </Line>
      <Svg>
        {level1.map((_, i) => (
          <line key={`a${i}`} x1={R_X + W / 2} y1={ly(0) + 22} x2={lx(3, i)} y2={ly(1) - 22} stroke={INK_SOFT} strokeWidth={1.4} opacity={ease(frame, at(1), 8)} />
        ))}
        {level2.map((_, i) => (
          <line key={`b${i}`} x1={lx(3, Math.floor(i / 2))} y1={ly(1) + 22} x2={lx(6, i)} y2={ly(2) - 22} stroke={INK_SOFT} strokeWidth={1.4} opacity={ease(frame, at(2), 8)} />
        ))}
        {perms.map((_, i) => (
          <line key={`c${i}`} x1={lx(6, i)} y1={ly(2) + 22} x2={lx(6, i)} y2={ly(3) - 22} stroke={INK_SOFT} strokeWidth={1.4} opacity={ease(frame, at(3), 8)} />
        ))}
      </Svg>
      <div style={{ position: "absolute", left: R_X + W / 2 - 22, top: ly(0) - 22, width: 44, height: 44, borderRadius: 22, border: `2px solid ${INK}`, background: PAPER, opacity: ease(frame, at(0), 8) }} />
      {level1.map((p, i) => node(p, 1, i, 3))}
      {level2.map((p, i) => node(p, 2, i, 6))}
      {perms.map((p, i) => node(p, 3, i, 6))}
      {perms.map((p, i) => (
        <div key={`t${i}`} style={{ position: "absolute", left: lx(6, i) - 60, width: 120, top: ly(3) + 32, textAlign: "center", fontFamily: MONO, fontSize: 20, fontWeight: 600, color: OK_INK, opacity: ease(frame, at(3) + 6, 8) }}>
          {p.join("")}
        </div>
      ))}
      <Line at={dropsAt} x={R_X} y={ly(3) + c.h(76)} size={24}>
        A branch that can&apos;t succeed is dropped at once
      </Line>
      <Line at={usesAt} x={R_X} y={ly(3) + c.h(118)} size={24} weight={650} color={BLUE_INK}>
        N-Queens, Sudoku, permutations
      </Line>
    </>
  );
};

/**
 * The first quick round, questions 9 to 19, numbered on screen only:
 * sorting, recursion and dynamic programming. Each answer is drawn on the
 * right while it is read, from the page's own outputs (merge_sort, the
 * permutations, fib) and the video's counts (the Hoppers, the two Fibonacci
 * call counts, the coins).
 */
export const RapidOneScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: (b, p) => n.word(b, p), y, h, T: y(330) };

  const from = n.beat("rapid-in").from;
  const otherAt = n.word("rapid-in", "The other twenty-four");
  const eachAt = n.word("rapid-in", "one line each");
  const end = n.beat("r-backtrack").to + 30;

  const items: RapidItem[] = [
    { n: 9, label: "Merge sort", beat: "r-merge", body: <Merge c={c} /> },
    { n: 10, label: "When heapsort", beat: "r-heapsort", body: <Heapsort c={c} /> },
    { n: 11, label: "A stable sort", beat: "r-stable", body: <Stable c={c} /> },
    { n: 12, label: "In place or out of place", beat: "r-inplace", body: <InPlace c={c} /> },
    { n: 13, label: "The Master Theorem", beat: "r-master", body: <Master c={c} /> },
    { n: 14, label: "Recursion or iteration", beat: "r-recursion", body: <Recursion c={c} /> },
    { n: 15, label: "Divide and conquer or DP", beat: "r-dc", body: <DivideDp c={c} /> },
    { n: 16, label: "Memoization or tabulation", beat: "r-memo", body: <Memo c={c} /> },
    { n: 17, label: "Classic DP problems", beat: "r-classic", body: <Classic c={c} /> },
    { n: 18, label: "Greedy, and when it's safe", beat: "r-greedy", body: <Greedy c={c} /> },
    { n: 19, label: "Backtracking", beat: "r-backtrack", body: <Backtrack c={c} /> },
  ].map(({ beat, ...item }) => ({ ...item, at: n.beat(beat).from }));

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={from} level={-34} />
      {items.map((item) => (
        <Sfx key={item.n} name="el-tap" at={item.at} level={-34} />
      ))}

      <Drift from={from} to={end + 40} scale={0.012}>
        <Kicker at={from - 8}>Questions 9 to 19 · Sorting and recursion</Kicker>
        <Headline lead="The other twenty-four," turn="one line each." at={otherAt - 4} turnAt={eachAt - 2} />
        <RapidFire items={items} x={X0} top={y(LIST_TOP)} rowH={h(ROW)} width={560} at={eachAt} end={end} />
      </Drift>
    </AbsoluteFill>
  );
};

