import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK, RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { TABULAR, label } from "../../editorial/style";
import { NextLine, Num } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { PAGE, PAGE_INPUTS, RAPID } from "./data";
import {
  ACCENT,
  ACCENT_INK,
  Art,
  BAR,
  BLUE_FILL,
  BLUE_INK,
  Cell,
  Drift,
  Edge,
  Flow,
  GraphNode,
  HIGHLIGHT,
  Headline,
  INK,
  INK_SOFT,
  Kicker,
  Line,
  Mark,
  OK_INK,
  PAPER,
  Svg,
  VRule,
  X0,
  int,
} from "./parts";
import { M } from "../../editorial/math";

const R_X = 780;
const LIST_TOP = 292;
const ROW = 43;

type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"]; T: number };
type P = readonly [number, number];

// ── 20. Array or linked list ─────────────────────────────────────────────────

const ArrayList: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const indexAt = c.w("r-array", "An array indexes in constant time");
  const shiftsAt = c.w("r-array", "a middle insert shifts the rest");
  const listAt = c.w("r-array", "A linked list splices in constant time");
  const walkAt = c.w("r-array", "finding it is a walk");
  const jumpAt = c.w("r-array", "indexes in constant time") + 6;
  const cachesAt = c.w("r-array", "caches well");
  const cw = 68;
  // Indexing jumps straight to one cell; caching reads neighbours together,
  // a sweep along the row.
  const lit = (i: number) => (frame >= jumpAt && frame < cachesAt && i === 5) || (frame >= cachesAt + i * 3 && frame < cachesAt + i * 3 + 10);
  const shift = ease(frame, shiftsAt + 4, 14);
  const ins = ease(frame, shiftsAt + 16, 10);
  const lTop = c.T + c.h(240);
  const nodeX = (i: number) => R_X + i * 170;
  const splice = ease(frame, listAt + 10, 14);
  const walk = ease(frame, walkAt, 24);
  return (
    <>
      <Line at={indexAt} x={R_X} y={c.T} size={24} weight={500}>
        Array: index in <M>O(1)</M>, cache-friendly
        <span style={{ opacity: ease(frame, shiftsAt, 10), color: ACCENT_INK }}>; a middle insert shifts the rest</span>
      </Line>
      {Array.from({ length: 7 }, (_, i) => (
        <Cell key={i} x={R_X + i * cw} y={c.T + c.h(50)} at={indexAt + i * 2} value="" w={cw - 8} h={50} dx={i >= 3 ? cw * shift : 0} tone={i >= 3 && shift > 0 ? "bad" : lit(i) ? "look" : "data"} />
      ))}
      <Cell x={R_X + 3 * cw} y={c.T + c.h(50)} at={shiftsAt + 16} value="" w={cw - 8} h={50} tone="look" opacity={ins} />
      <Line at={listAt} x={R_X} y={lTop - c.h(52)} size={24} weight={500}>
        Linked list: splice in <M>O(1)</M>, given the node
        <span style={{ opacity: ease(frame, walkAt, 10), color: ACCENT_INK }}>; finding it is a walk</span>
      </Line>
      {[0, 1, 2, 3].map((i) => (
        <React.Fragment key={i}>
          <Cell x={nodeX(i)} y={lTop} at={listAt + i * 3} value="" w={90} h={50} />
          {i < 3 ? <Flow points={[[nodeX(i) + 94, lTop + 25], [nodeX(i + 1) - 6, lTop + 25]]} at={listAt + i * 3 + 2} color={BAR} width={2.2} head={12} opacity={i === 1 ? 1 - splice : 1} /> : null}
        </React.Fragment>
      ))}
      {/* The new node, spliced between the second and third. */}
      <Cell x={nodeX(1) + 40} y={lTop + c.h(100)} at={listAt + 10} value="" w={90} h={50} tone="look" opacity={splice} />
      <Flow points={[[nodeX(1) + 45, lTop + 54], [nodeX(1) + 70, lTop + c.h(100) - 6]]} at={listAt + 18} color={OK} width={2.4} head={12} />
      <Flow points={[[nodeX(1) + 134, lTop + c.h(100) + 2], [nodeX(2) + 30, lTop + 56]]} at={listAt + 22} color={OK} width={2.4} head={12} />
      {walk > 0 && walk < 1 ? <div style={{ position: "absolute", left: nodeX(0) + 45 - 10 + walk * (nodeX(3) - nodeX(0)), top: lTop - 26, width: 20, height: 20, borderRadius: 10, background: HIGHLIGHT, border: `2px solid ${INK}` }} /> : null}
    </>
  );
};

// ── 21. BST ──────────────────────────────────────────────────────────────────

const Bst: React.FC<{ c: Ctx }> = ({ c }) => {
  const bstAt = c.w("r-bst", "A binary search tree");
  const ruleAt = c.w("r-bst", "keeps smaller keys to the left of each node");
  const largerAt = c.w("r-bst", "larger ones to the right");
  const heightAt = c.w("r-bst", "so an operation costs its height");
  const orderAt = c.w("bst-heights", "A thousand keys inserted in order");
  const shuffledAt = c.w("bst-heights", "shuffled, twenty-one");
  const avlAt = c.w("bst-heights", "AVL and red-black trees stay at log n");
  const frame = useCurrentFrame();
  const colH = c.h(340);
  const base = c.T + c.h(480);
  const scale = colH / RAPID.bstSortedHeight;
  const tall = RAPID.bstSortedHeight * scale * ease(frame, orderAt + 4, Math.max(24, shuffledAt - orderAt - 10));
  const short = RAPID.bstShuffledHeight * scale * ease(frame, shuffledAt, 10);
  return (
    <>
      {/* The rule first: it is what a BST is, and why in-order comes out sorted. */}
      <Line at={bstAt} x={R_X} y={c.T} size={24} weight={500}>
        A BST: at every node,{" "}
        <span style={{ opacity: ease(frame, ruleAt + 4, 10) }}>
          <Mark at={ruleAt + 8}>smaller keys left</Mark>
        </span>
        <span style={{ opacity: ease(frame, largerAt, 10) }}>
          , <Mark at={largerAt + 4}>larger keys right</Mark>
        </span>
      </Line>
      <Line at={heightAt} x={R_X} y={c.T + c.h(46)} size={24} weight={500}>
        An operation costs the tree&apos;s height.
        <span style={{ opacity: ease(frame, orderAt, 10) }}>
          {" "}
          Height, <Num>{int(RAPID.bstKeys)}</Num> keys:
        </span>
      </Line>
      <div style={{ position: "absolute", left: R_X + 40, top: base - tall, width: 70, height: tall, background: ACCENT, borderRadius: 3 }} />
      <div style={{ position: "absolute", left: R_X + 260, top: base - Math.max(3, short), width: 70, height: Math.max(3, short), background: OK, borderRadius: 3, opacity: short > 0 ? 1 : 0 }} />
      <Svg opacity={ease(frame, orderAt, 10)}>
        <line x1={R_X} x2={R_X + 400} y1={base + 1} y2={base + 1} stroke={INK} strokeWidth={1.6} />
      </Svg>
      <Line at={orderAt + 10} x={R_X + 130} y={base - tall - 4} size={24} weight={500} color={ACCENT_INK}>
        <span style={TABULAR}>{int(Math.round((tall / scale) || 0))}</span> levels, in order
      </Line>
      <Line at={shuffledAt} x={R_X + 350} y={base - 40} size={24} weight={500} color={OK_INK}>
        <Num>{RAPID.bstShuffledHeight}</Num>, shuffled
      </Line>
      <Line at={avlAt} x={R_X + 620} y={c.T + c.h(190)} size={24} weight={500}>
        AVL, red-black:
      </Line>
      <Line at={avlAt + 6} x={R_X + 620} y={c.T + c.h(234)} size={24} weight={500} color={OK_INK}>
        stay at <M>O(log n)</M>
      </Line>
    </>
  );
};

// ── 22. The three traversals ─────────────────────────────────────────────────

type TNode = { v: number; left?: TNode; right?: TNode; depth: number };
const insert = (root: TNode | undefined, v: number, depth = 0): TNode => {
  if (!root) return { v, depth };
  if (v < root.v) root.left = insert(root.left, v, depth + 1);
  else root.right = insert(root.right, v, depth + 1);
  return root;
};
const walkOrder = (t: TNode | undefined, kind: "pre" | "in" | "post"): number[] =>
  !t
    ? []
    : kind === "pre"
      ? [t.v, ...walkOrder(t.left, kind), ...walkOrder(t.right, kind)]
      : kind === "in"
        ? [...walkOrder(t.left, kind), t.v, ...walkOrder(t.right, kind)]
        : [...walkOrder(t.left, kind), ...walkOrder(t.right, kind), t.v];
const nodesOf = (t: TNode | undefined): TNode[] => (!t ? [] : [t, ...nodesOf(t.left), ...nodesOf(t.right)]);

const Traverse: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const inAt = c.w("r-traverse", "In-order traversal visits a BST in sorted order");
  const preAt = c.w("r-traverse", "Pre-order, root first");
  const serialAt = c.w("r-traverse", "serializes a tree");
  const postAt = c.w("r-traverse", "Post-order, children first");
  const deleteAt = c.w("r-traverse", "suits deleting it");
  const root = PAGE_INPUTS.inorder.reduce<TNode | undefined>((t, v) => insert(t, v), undefined) as TNode;
  const all = nodesOf(root);
  const inorder = PAGE.inorder.map(Number);
  const pos = (t: TNode): P => [R_X + 40 + inorder.indexOf(t.v) * 80, c.T + c.h(70) + t.depth * c.h(100)];
  const rows = [
    { name: "In-order", order: inorder, at: inAt, note: "Sorted", noteAt: inAt + 20 },
    { name: "Pre-order", order: walkOrder(root, "pre"), at: preAt, note: "Root first: serialize", noteAt: serialAt },
    { name: "Post-order", order: walkOrder(root, "post"), at: postAt, note: "Children first: delete", noteAt: deleteAt },
  ];
  const rx = R_X + 480;
  return (
    <>
      <VRule x={1212} top={c.T + c.h(30)} bottom={c.T + c.h(72) + 2 * c.h(120) + 30} at={inAt} />
      <Svg opacity={ease(frame, inAt - 6, 10)}>
        {all.flatMap((t) =>
          [t.left, t.right]
            .filter((k): k is TNode => !!k)
            // The owner, 2026-11-13: blue edges.
            .map((k) => <line key={`${t.v}-${k.v}`} x1={pos(t)[0]} y1={pos(t)[1] + 22} x2={pos(k)[0]} y2={pos(k)[1] - 22} stroke={BAR} strokeWidth={1.6} />),
        )}
      </Svg>
      {all.map((t) => (
        <GraphNode key={t.v} x={pos(t)[0]} y={pos(t)[1]} at={inAt - 6} name={String(t.v)} r={24} />
      ))}
      {rows.map((r, i) => (
        <React.Fragment key={r.name}>
          <Line at={r.at} x={rx} y={c.T + c.h(30) + i * c.h(120)} size={23} weight={500}>
            {r.name}
          </Line>
          <div style={{ position: "absolute", left: rx, top: c.T + c.h(72) + i * c.h(120), display: "flex", gap: 18, fontSize: 26 }}>
            {r.order.map((v, k) => (
              <span key={k} style={{ ...label(26, BLUE_INK), ...TABULAR, fontWeight: 500, opacity: ease(frame, r.at + 4 + k * 3, 8) }}>
                {v}
              </span>
            ))}
          </div>
          <Line at={r.noteAt} x={rx + 260} y={c.T + c.h(76) + i * c.h(120)} size={22} color={INK_SOFT}>
            {r.note}
          </Line>
        </React.Fragment>
      ))}
    </>
  );
};

// ── 23. A balanced BST or a heap ─────────────────────────────────────────────

const BstHeap: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const topAt = c.w("r-bst-heap", "A heap only knows its top");
  const orderAt = c.w("r-bst-heap", "A balanced BST keeps the whole order");
  const nextAt = c.w("r-bst-heap", "the next key in log n");
  const rangeAt = c.w("r-bst-heap", "a range in log n plus its length");
  const keys = Array.from({ length: 10 }, (_, i) => 10 * (i + 1));
  /** A min-heap of seven: only the root is known to be the smallest. */
  const heap = [10, 30, 20, 70, 40, 50, 60];
  const level = (i: number) => Math.floor(Math.log2(i + 1));
  const hx = (i: number) => {
    const k = level(i);
    return R_X + 30 + ((i + 1 - 2 ** k + 0.5) / 2 ** k) * 420;
  };
  const hy = (i: number) => c.T + c.h(76) + level(i) * c.h(66);
  const sTop = c.T + c.h(350);
  return (
    <>
      <Line at={topAt} x={R_X} y={c.T} size={24} weight={500}>
        A heap: only its top is in order
      </Line>
      {/* The owner, 2026-11-13: hollow nodes with a black border and black
          text, joined by black edges. A hollow node shows what runs under
          it, so each edge runs from a parent's lowest point to a child's
          highest, r = 24 from each centre, and stops on the ring. */}
      <Svg opacity={ease(frame, topAt + 4, 10)}>
        {heap.map((_, i) => (i === 0 ? null : <line key={i} x1={hx(Math.floor((i - 1) / 2))} y1={hy(Math.floor((i - 1) / 2)) + 24} x2={hx(i)} y2={hy(i) - 24} stroke={INK} strokeWidth={1.6} />))}
      </Svg>
      {heap.map((v, i) => (
        <GraphNode key={i} x={hx(i)} y={hy(i)} at={topAt + 4 + i * 2} name={String(v)} r={24} outline />
      ))}
      <Line at={orderAt} x={R_X} y={sTop - c.h(54)} size={24} weight={500}>
        A balanced BST: the whole order
      </Line>
      {keys.map((v, i) => {
        const inRange = i >= 3 && i <= 6;
        const isNext = i === 4;
        const tone = frame >= rangeAt && inRange ? "ok" : frame >= nextAt && frame < rangeAt && isNext ? "look" : "data";
        return <Cell key={v} x={R_X + i * 70} y={sTop} at={orderAt + 4 + i * 2} value={v} w={62} h={50} size={20} tone={tone} />;
      })}
      <Line at={nextAt} x={R_X} y={sTop + c.h(76)} size={23}>
        Next key after <Num>{keys[3]}</Num>: <M>O(log n)</M>
      </Line>
      <Line at={rangeAt} x={R_X} y={sTop + c.h(118)} size={23} color={OK_INK} weight={500}>
        A range: <M>O(log n)</M> to find its start, then one step per key
      </Line>
    </>
  );
};

// ── 24. Trie ─────────────────────────────────────────────────────────────────

const TRIE: { ch: string; parent?: number; word?: boolean; x: number; d: number }[] = [
  { ch: "", x: 3, d: 0 },
  { ch: "c", parent: 0, x: 2, d: 1 },
  { ch: "d", parent: 0, x: 5, d: 1 },
  { ch: "a", parent: 1, x: 2, d: 2 },
  { ch: "o", parent: 2, x: 5, d: 2 },
  { ch: "r", parent: 3, x: 1, d: 3, word: true },
  { ch: "t", parent: 3, x: 3, d: 3, word: true },
  { ch: "g", parent: 4, x: 5, d: 3, word: true },
  { ch: "t", parent: 5, x: 1, d: 4, word: true },
];
/** The lookup the figure walks: c, a, r, t. */
const LOOKUP = [0, 1, 3, 5, 8];

const Trie: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const storesAt = c.w("r-trie", "A trie stores strings a character per level");
  const lookupAt = c.w("r-trie", "a lookup costs the key's length");
  const manyAt = c.w("r-trie", "however many keys");
  const usesAt = c.w("r-trie", "autocomplete, IP routing");
  const memAt = c.w("r-trie", "It takes more memory");
  const pos = (i: number): P => [R_X + 30 + TRIE[i].x * 80, c.T + c.h(60) + TRIE[i].d * c.h(84)];
  const lit = (i: number) => {
    const k = LOOKUP.indexOf(i);
    return k >= 0 && frame >= lookupAt + k * 6;
  };
  const rx = R_X + 560;
  return (
    <>
      <VRule x={1287} top={c.T + c.h(36)} bottom={c.T + c.h(60) + 4 * c.h(84) + 24} at={storesAt} />
      {TRIE.map((t, i) =>
        t.parent === undefined ? null : (
          <Edge key={`e${i}`} from={pos(t.parent)} to={pos(i)} at={storesAt + t.d * 4} r={24} color={lit(i) ? INK : INK_SOFT} width={lit(i) ? 3 : 2} />
        ),
      )}
      {TRIE.map((t, i) => (
        <GraphNode key={i} x={pos(i)[0]} y={pos(i)[1]} at={storesAt + t.d * 4} name={t.ch} r={24} tone={lit(i) ? "look" : t.word ? "ok" : "data"} />
      ))}
      <Line at={storesAt} x={rx} y={c.T + c.h(40)} size={24} weight={500}>
        One character per level
      </Line>
      <Line at={lookupAt} x={rx} y={c.T + c.h(86)} size={24}>
        Look up <span style={{ fontFamily: MONO, fontWeight: 500 }}>cart</span>: <Num>4</Num> steps, its length
      </Line>
      <Line at={manyAt} x={rx} y={c.T + c.h(128)} size={24} color={OK_INK} weight={500}>
        however many keys are stored
      </Line>
      <Line at={usesAt} x={rx} y={c.T + c.h(200)} size={24} weight={500} color={BLUE_INK}>
        Autocomplete, IP routing
      </Line>
      <Line at={memAt} x={rx} y={c.T + c.h(242)} size={24} color={ACCENT_INK}>
        More memory: a node per character
      </Line>
    </>
  );
};

// ── 25. Binary search ────────────────────────────────────────────────────────

const Binary: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const needsAt = c.w("r-binary", "Binary search needs sorted, indexable data");
  const probesAt = c.w("r-binary", "twenty probes at most for a million");
  const bugsAt = c.w("r-binary", "Its bugs");
  const offAt = c.w("r-binary", "off-by-one bounds");
  const overflowAt = c.w("r-binary", "a midpoint sum overflowing fixed-width integers");
  const W = 960;
  const probes = RAPID.binaryProbesMillion;
  const p = ease(frame, probesAt - 6, Math.max(30, bugsAt - probesAt));
  const shown = Math.round(p * probes);
  // Each probe halves the range: draw the interval left after each.
  const barY = c.T + c.h(70);
  let lo = 0;
  let hi = 1;
  const steps: [number, number][] = [];
  for (let k = 0; k < probes; k++) {
    const mid = (lo + hi) / 2;
    if (k % 3 === 1) hi = mid;
    else lo = mid;
    steps.push([lo, hi]);
  }
  return (
    <>
      <Line at={needsAt} x={R_X} y={c.T} size={24} weight={500}>
        Sorted, indexable data: <Num>{int(1_000_000)}</Num> items
      </Line>
      <div style={{ position: "absolute", left: R_X, top: barY, width: W, height: 34, background: BLUE_FILL, border: `2px solid ${BAR}`, borderRadius: 4, boxSizing: "border-box", opacity: ease(frame, needsAt, 10) }} />
      {steps.slice(0, shown).map(([a, b], k) => (
        <div key={k} style={{ position: "absolute", left: R_X + a * W, top: barY + 44 + k * 7, width: Math.max(2, (b - a) * W), height: 4, background: k === shown - 1 ? INK : BAR, borderRadius: 2 }} />
      ))}
      <Line at={probesAt} x={R_X} y={barY + c.h(190)} size={26} weight={500}>
        Probes: <span style={{ ...TABULAR, color: OK_INK }}>{shown}</span> at most
      </Line>
      <Line at={offAt} x={R_X} y={barY + c.h(250)} size={24} color={ACCENT_INK} weight={500}>
        Bugs: off-by-one bounds
      </Line>
      <Line at={overflowAt} x={R_X} y={barY + c.h(294)} size={24} color={ACCENT_INK} weight={500}>
        In C or Java, <span style={{ fontFamily: MONO }}>(lo + hi) / 2</span> can overflow an <span style={{ fontFamily: MONO }}>int</span>
      </Line>
      <Line at={overflowAt + 16} x={R_X} y={barY + c.h(338)} size={24} color={OK_INK} weight={500}>
        The safe midpoint: <span style={{ fontFamily: MONO }}>lo + (hi - lo) / 2</span>
      </Line>
    </>
  );
};

// ── 26. Two pointers ─────────────────────────────────────────────────────────

const Pointers: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const walkAt = c.w("r-pointers", "Two pointers walk in from both ends");
  const smallAt = c.w("r-pointers", "too small, move the left");
  const bigAt = c.w("r-pointers", "too big, move the right");
  const linearAt = c.w("r-pointers", "Linear, not n squared");
  const { nums, target } = PAGE_INPUTS.twoPointers;
  // The page's two_sum_sorted, step by step.
  const states: { lo: number; hi: number; sum: number }[] = [];
  for (let lo = 0, hi = nums.length - 1; lo < hi; ) {
    const sum = nums[lo] + nums[hi];
    states.push({ lo, hi, sum });
    if (sum === target) break;
    if (sum < target) lo++;
    else hi--;
  }
  const moveLeftAt = c.w("r-pointers", "move the left");
  // The first state shows as the pointers arrive; the next (too small) as
  // the rule for it is read, and the found pair once the left has moved.
  const stepAt = [walkAt + 10, smallAt - 6, moveLeftAt + 12];
  const k = Math.max(0, Math.min(states.length - 1, stepAt.filter((t) => frame >= t).length - 1));
  const s = states[k];
  const cw = 80;
  const rowY = c.T + c.h(110);
  const found = s.sum === target;
  // The page's two_sum_sorted returns indices, not values: say which values
  // they hold, so "(1, 3)" cannot be read as the numbers 1 and 3.
  const returned = PAGE.twoPointers[0].replace(/[()\s]/g, "").split(",").map(Number);
  const [va, vb] = returned.map((i) => nums[i]);
  if (va + vb !== target) throw new Error(`two_sum_sorted's ${PAGE.twoPointers[0]} does not sum to ${target}`);
  return (
    <>
      <Line at={walkAt} x={R_X} y={c.T} size={24} weight={500}>
        Sorted array, target <Num>{target}</Num>: walk in from both ends
      </Line>
      {nums.map((v, i) => (
        <Cell key={i} x={R_X + i * cw} y={rowY} at={walkAt + i * 2} value={v} w={cw - 10} h={58} tone={(i === s.lo || i === s.hi) && frame >= walkAt + 10 ? (found ? "ok" : "look") : "data"} />
      ))}
      {/* Each cell's index, above it, as the Two Sum row in HashScene has. */}
      {nums.map((_, i) => (
        <div key={`i${i}`} style={{ position: "absolute", left: R_X + i * cw, width: cw - 10, top: rowY - 34, textAlign: "center", ...label(20, INK_SOFT), ...TABULAR, opacity: ease(frame, walkAt + 6, 10) }}>
          {i}
        </div>
      ))}
      <Line at={walkAt + 6} x={R_X + nums.length * cw + 30} y={rowY - 36} size={20} color={INK_SOFT}>
        index
      </Line>
      {[
        { i: s.lo, t: "left" },
        { i: s.hi, t: "right" },
      ].map((ptr) => (
        <div key={ptr.t} style={{ position: "absolute", left: R_X + ptr.i * cw - 5, width: cw, top: rowY + 70, textAlign: "center", ...label(21, INK), opacity: ease(frame, walkAt + 10, 8) }}>
          ↑ {ptr.t}
        </div>
      ))}
      <Line at={walkAt + 12} x={R_X + nums.length * cw + 30} y={rowY + 12} size={24}>
        sum <b style={TABULAR}>{s.sum}</b>
        {found ? <b style={{ color: OK_INK }}> = target</b> : s.sum < target ? <span style={{ color: INK_SOFT }}> too small</span> : <span style={{ color: INK_SOFT }}> too big</span>}
      </Line>
      <Line at={smallAt} x={R_X} y={rowY + c.h(130)} size={24}>
        Too small: move the left
      </Line>
      <Line at={bigAt} x={R_X} y={rowY + c.h(172)} size={24}>
        Too big: move the right
      </Line>
      <Line at={linearAt} x={R_X} y={rowY + c.h(230)} size={25} weight={500} color={OK_INK}>
        Returns indices <span style={{ fontFamily: MONO }}>{PAGE.twoPointers[0]}</span>: <Num>{va}</Num> + <Num>{vb}</Num> = <Num>{target}</Num>
      </Line>
      <Line at={linearAt + 8} x={R_X} y={rowY + c.h(274)} size={25} weight={500}>
        One pass: <M>O(n)</M>, not <M>O(n²)</M>
      </Line>
    </>
  );
};

// ── 27. Sliding window ───────────────────────────────────────────────────────

const Window: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const growsAt = c.w("r-window", "A sliding window grows and shrinks one range");
  const longestAt = c.w("r-window", "the longest substring without a repeat");
  const passAt = c.w("r-window", "in one pass");
  const s = PAGE_INPUTS.window;
  // The page's length_of_longest_substring, step by step.
  const states: { left: number; right: number; best: number }[] = [];
  const seen: Record<string, number> = {};
  let left = 0;
  let best = 0;
  [...s].forEach((ch, right) => {
    if (ch in seen && seen[ch] >= left) left = seen[ch] + 1;
    seen[ch] = right;
    best = Math.max(best, right - left + 1);
    states.push({ left, right, best });
  });
  const run = ease(frame, growsAt + 6, Math.max(40, passAt - growsAt - 6));
  const k = Math.min(states.length - 1, Math.floor(run * states.length));
  const st = states[k];
  const cw = 76;
  const rowY = c.T + c.h(90);
  return (
    <>
      <Line at={growsAt} x={R_X} y={c.T} size={24} weight={500}>
        One range that grows and shrinks, never recomputed
      </Line>
      {[...s].map((ch, i) => (
        <Cell key={i} x={R_X + i * cw} y={rowY} at={growsAt + i * 2} value={ch} w={cw - 10} h={58} tone={i >= st.left && i <= st.right ? "look" : "data"} />
      ))}
      <div
        style={{
          position: "absolute",
          left: R_X + st.left * cw - 6,
          top: rowY - 8,
          width: (st.right - st.left + 1) * cw - 2,
          height: 74,
          border: `3px solid ${INK}`,
          borderRadius: 8,
          opacity: ease(frame, growsAt + 6, 8),
        }}
      />
      <Line at={longestAt} x={R_X} y={rowY + c.h(110)} size={24}>
        Longest without a repeat, so far: <b style={{ ...TABULAR, color: OK_INK }}>{st.best}</b>
      </Line>
      <Line at={passAt} x={R_X} y={rowY + c.h(156)} size={24} weight={500} color={OK_INK}>
        One pass. The page prints <Num>{PAGE.window[0]}</Num>
      </Line>
    </>
  );
};

// ── 28. Adjacency list or matrix ─────────────────────────────────────────────

const Adjacency: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const assumeAt = c.w("r-adjacency", "Assume a million users with a hundred friends each");
  const listAt = c.w("r-adjacency", "a list holds a hundred million entries");
  const matrixAt = c.w("r-adjacency", "a matrix a trillion cells");
  const emptyAt = c.w("r-adjacency", "nearly all empty");
  const denseAt = c.w("r-adjacency", "A matrix suits dense graphs");
  const A = RAPID.adjacency;
  const side = c.h(380);
  // Areas in proportion: the list's square is the matrix's side times the
  // square root of their ratio.
  const listSide = side * Math.sqrt(A.listEntries / A.matrixCells);
  const top = c.T + c.h(70);
  const m = ease(frame, matrixAt, 18);
  return (
    <>
      <Line at={assumeAt} x={R_X} y={c.T} size={24} weight={500}>
        Assume <Num>{int(A.users)}</Num> users, <Num>{A.friends}</Num> friends each
      </Line>
      <div style={{ position: "absolute", left: R_X, top, width: side * m, height: side * m, background: `color-mix(in srgb, ${ACCENT} 12%, ${PAPER})`, border: `2px solid ${ACCENT}`, boxSizing: "border-box", opacity: m > 0 ? 1 : 0 }} />
      <div style={{ position: "absolute", left: R_X + 2, top: top + 2, width: Math.max(4, listSide), height: Math.max(4, listSide), background: BAR, opacity: ease(frame, listAt, 8) }} />
      <Svg opacity={ease(frame, listAt + 6, 10)}>
        <circle cx={R_X + 4} cy={top + 4} r={14} fill="none" stroke={HIGHLIGHT} strokeWidth={5} />
      </Svg>
      <VRule x={R_X + side + 35} top={top} bottom={top + side} at={listAt} />
      <Line at={listAt} x={R_X + side + 70} y={top} size={24} weight={500} color={BLUE_INK}>
        List: <Num>{int(A.listEntries)}</Num> entries
      </Line>
      <Line at={listAt + 8} x={R_X + side + 70} y={top + c.h(40)} size={22} color={INK_SOFT}>
        the dot in the corner, to scale
      </Line>
      <Line at={matrixAt} x={R_X + side + 70} y={top + c.h(110)} size={24} weight={500} color={ACCENT_INK}>
        Matrix: <Num>{int(A.matrixCells)}</Num> cells
      </Line>
      <Line at={emptyAt} x={R_X + side + 70} y={top + c.h(150)} size={22} color={INK_SOFT}>
        nearly all of them empty
      </Line>
      <Line at={denseAt} x={R_X + side + 70} y={top + c.h(230)} size={24} weight={500}>
        A matrix suits dense graphs
      </Line>
      <Line at={denseAt + 12} x={R_X + side + 70} y={top + c.h(270)} size={24} weight={500}>
        and <M>O(1)</M> edge checks
      </Line>
    </>
  );
};

// ── 29. A cycle in a directed graph ──────────────────────────────────────────

const Cycle: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const runAt = c.w("r-cycle", "run DFS marking nodes unvisited");
  const pathAt = c.w("r-cycle", "on the path");
  const doneAt = c.w("r-cycle", "or done");
  const backAt = c.w("r-cycle", "An edge back to the path is a cycle");
  const G = PAGE_INPUTS.cyclic;
  const pos: Record<string, P> = { A: [R_X + 120, c.T + c.h(120)], B: [R_X + 400, c.T + c.h(120)], C: [R_X + 260, c.T + c.h(330)] };
  const visitAt: Record<string, number> = { A: pathAt, B: pathAt + 8, C: pathAt + 16 };
  const edges = Object.entries(G).flatMap(([a, nbs]) => nbs.map((b) => [a, b] as const));
  const isBack = (a: string, b: string) => a === "C" && b === "A";
  const rx = R_X + 560;
  return (
    <>
      {edges.map(([a, b]) => (
        <Edge key={`${a}${b}`} from={pos[a]} to={pos[b]} at={runAt} color={isBack(a, b) && frame >= backAt ? ACCENT : INK_SOFT} width={isBack(a, b) && frame >= backAt ? 3.4 : 2.4} r={32} />
      ))}
      {Object.keys(pos).map((k) => (
        <GraphNode key={k} x={pos[k][0]} y={pos[k][1]} at={runAt} name={k} r={32} tone={frame >= visitAt[k] ? "look" : "plain"} />
      ))}
      <VRule x={1276} top={c.T + c.h(40)} bottom={c.T + c.h(292) + 30} at={runAt} />
      <Line at={runAt} x={rx} y={c.T + c.h(40)} size={24} weight={500}>
        DFS, each node marked:
      </Line>
      {[
        { t: "unvisited", tone: PAPER, at: runAt + 6 },
        { t: "on the path", tone: HIGHLIGHT, at: pathAt },
        { t: "done", tone: BLUE_FILL, at: doneAt },
      ].map((m, i) => (
        <div key={m.t} style={{ position: "absolute", left: rx, top: c.T + c.h(90) + i * c.h(44), display: "flex", alignItems: "center", gap: 12, fontSize: 23, opacity: ease(frame, m.at, 10) }}>
          <span style={{ width: 22, height: 22, borderRadius: 11, background: m.tone, border: `2px solid ${INK}` }} />
          <span style={{ ...label(23, INK), fontWeight: 500 }}>{m.t}</span>
        </div>
      ))}
      <Line at={backAt} x={rx} y={c.T + c.h(250)} size={24} weight={500} color={ACCENT_INK}>
        C → A reaches a node on the path:
      </Line>
      <Line at={backAt + 8} x={rx} y={c.T + c.h(292)} size={24} weight={500} color={ACCENT_INK}>
        a cycle. The page prints {PAGE.cycle[1]}
      </Line>
    </>
  );
};

// ── 30. Topological sort ─────────────────────────────────────────────────────

const Topo: React.FC<{ c: Ctx }> = ({ c }) => {
  const ordersAt = c.w("r-topo", "Topological sort orders a graph with no cycles");
  const forwardAt = c.w("r-topo", "so every edge points forward");
  const buildAt = c.w("r-topo", "like build steps");
  const linearAt = c.w("r-topo", "in linear time");
  const order = JSON.parse(PAGE.topo[0].replace(/'/g, '"')) as string[];
  const G = PAGE_INPUTS.topo;
  const x = (k: string) => R_X + 60 + order.indexOf(k) * 220;
  const rowY = c.T + c.h(200);
  return (
    <>
      <Line at={ordersAt} x={R_X} y={c.T} size={24} weight={500}>
        An order for a graph with no cycles
      </Line>
      {Object.entries(G).flatMap(([a, nbs]) =>
        nbs.map((b) => {
          const x1 = x(a);
          const x2 = x(b);
          const lift = c.h(60) + (x2 - x1) * 0.1;
          return (
            <Flow
              key={`${a}${b}`}
              points={[
                [x1 + 10, rowY - 34],
                [x1 + 10, rowY - lift],
                [x2 - 10, rowY - lift],
                [x2 - 10, rowY - 36],
              ]}
              at={forwardAt + order.indexOf(a) * 4}
              // The owner, 2026-11-13: blue edges, not green.
              color={BAR}
              width={2.4}
              head={13}
            />
          );
        }),
      )}
      {order.map((k, i) => (
        <GraphNode key={k} x={x(k)} y={rowY} at={ordersAt + 6 + i * 4} name={k} r={32} />
      ))}
      <Line at={forwardAt} x={R_X} y={rowY + c.h(70)} size={24} weight={500} color={OK_INK}>
        Every edge points forward
      </Line>
      <Line at={buildAt} x={R_X} y={rowY + c.h(112)} size={24}>
        Build steps, task dependencies: the page prints <span style={{ fontFamily: MONO, fontWeight: 500 }}>{PAGE.topo[0]}</span>
      </Line>
      <Line at={linearAt} x={R_X} y={rowY + c.h(154)} size={24} weight={500}>
        <M>O(V + E)</M>
      </Line>
    </>
  );
};

// ── 31. Kahn's algorithm ─────────────────────────────────────────────────────

const Kahn: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const removesAt = c.w("r-kahn", "Kahn's algorithm keeps removing nodes with nothing pointing in");
  const leftAt = c.w("r-kahn", "If any are left");
  const cycleAt = c.w("r-kahn", "the graph has a cycle");
  const edges = RAPID.kahnCyclicEdges;
  const out = RAPID.kahnCyclic;
  const pos = (i: number): P => [R_X + 80 + i * 200, c.T + c.h(170) + (i === 2 ? c.h(90) : 0)];
  const nodes = [0, 1, 2, 3];
  const removed = (i: number) => out.includes(i) && frame >= removesAt + 16;
  return (
    <>
      <Line at={removesAt} x={R_X} y={c.T} size={24} weight={500}>
        Remove nodes with nothing pointing in (in-degree 0), one by one
      </Line>
      {edges.map(([a, b]) => (
        <Edge key={`${a}${b}`} from={pos(a)} to={pos(b)} at={removesAt + 4} r={30} side={a > b ? -22 : 22} color={removed(a) ? INK_SOFT : a === 2 && b === 1 && frame >= cycleAt ? ACCENT : INK_SOFT} opacity={removed(a) ? 0.25 : 1} />
      ))}
      {nodes.map((i) => (
        <GraphNode key={i} x={pos(i)[0]} y={pos(i)[1]} at={removesAt + 2} name={String(i)} tone={removed(i) ? "ok" : frame >= leftAt ? "bad" : "data"} />
      ))}
      <Line at={removesAt + 16} x={R_X} y={c.T + c.h(380)} size={24}>
        Removed: <span style={{ fontFamily: MONO, fontWeight: 500, color: OK_INK }}>[{out.join(", ")}]</span>; every node left has an edge pointing in
      </Line>
      <Line at={leftAt} x={R_X} y={c.T + c.h(424)} size={24} weight={500} color={ACCENT_INK}>
        <Num>{nodes.length - out.length}</Num> of <Num>{nodes.length}</Num> left<span style={{ opacity: ease(frame, cycleAt, 10) }}>: the graph has a cycle</span>
      </Line>
    </>
  );
};

// ── 32. Bit tricks ───────────────────────────────────────────────────────────

const Bits: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const singleAt = c.w("r-bits", "bit tricks are single instructions");
  const xorAt = c.w("r-bits", "take the XOR of every number");
  const cancelAt = c.w("r-bits", "the pairs cancel");
  const leftAt = c.w("r-bits", "the unpaired one is left");
  const spaceAt = c.w("r-bits", "in constant space");
  const nums = PAGE_INPUTS.bits;
  const result = Number(PAGE.bits[0]);
  const width = Math.max(...nums, result).toString(2).length;
  const bin = (v: number) => v.toString(2).padStart(width, "0");
  const paired = (v: number) => nums.filter((x) => x === v).length === 2;
  const rowH = c.h(46);
  return (
    <>
      <Line at={singleAt} x={R_X} y={c.T} size={24} weight={500}>
        Single instructions: take the XOR of every number
      </Line>
      {nums.map((v, i) => {
        const fade = paired(v) ? ease(frame, cancelAt + 4, 12) : 0;
        return (
          <div key={i} style={{ position: "absolute", left: R_X + 40, top: c.T + c.h(64) + i * rowH, display: "flex", gap: 30, fontSize: 26, opacity: ease(frame, xorAt + i * 3, 8) * (1 - 0.7 * fade) }}>
            <span style={{ fontFamily: MONO, fontWeight: 500, color: paired(v) && fade > 0 ? INK_SOFT : INK, width: 40, textAlign: "right" }}>{v}</span>
            <span style={{ fontFamily: MONO, fontWeight: 500, letterSpacing: "0.2em", color: paired(v) ? BLUE_INK : OK_INK }}>{bin(v)}</span>
          </div>
        );
      })}
      <Svg opacity={ease(frame, leftAt - 4, 10)}>
        <line x1={R_X + 30} x2={R_X + 230} y1={c.T + c.h(64) + nums.length * rowH + 6} y2={c.T + c.h(64) + nums.length * rowH + 6} stroke={INK} strokeWidth={1.8} />
      </Svg>
      <div style={{ position: "absolute", left: R_X + 40, top: c.T + c.h(64) + nums.length * rowH + 16, display: "flex", gap: 30, fontSize: 26, opacity: ease(frame, leftAt, 10) }}>
        <span style={{ fontFamily: MONO, fontWeight: 500, color: OK_INK, width: 40, textAlign: "right" }}>{result}</span>
        <span style={{ fontFamily: MONO, fontWeight: 500, letterSpacing: "0.2em", color: OK_INK }}>{bin(result)}</span>
      </div>
      <VRule x={1095} top={c.T + c.h(64)} bottom={c.T + c.h(64) + (nums.length + 1) * rowH + 30} at={xorAt} />
      <Line at={xorAt} x={R_X + 400} y={c.T + c.h(64)} size={24}>
        XOR, exclusive or: 1 where the bits differ
      </Line>
      <Line at={cancelAt} x={R_X + 400} y={c.T + c.h(112)} size={24}>
        So each pair cancels: <span style={{ fontFamily: MONO }}>x ^ x = 0</span>
      </Line>
      <Line at={leftAt} x={R_X + 400} y={c.T + c.h(160)} size={24} weight={500} color={OK_INK}>
        The unpaired one is left: <Num>{result}</Num>
      </Line>
      <Line at={spaceAt} x={R_X + 400} y={c.T + c.h(208)} size={24}>
        <M>O(n)</M> time, <Mark at={spaceAt + 4}><M>O(1)</M> space</Mark>
      </Line>
    </>
  );
};

/**
 * The second quick round, questions 20 to 32: structures, search and
 * graphs, each answer drawn on the right while it is read (the page's BST,
 * two-pointer, window, cycle, topological-sort and XOR outputs; the BST
 * heights, the binary search's twenty probes, Kahn's one node of four, and
 * the adjacency arithmetic). Then the close: the pangolin back, and the
 * bridge into the AI-allowed round.
 */
export const RapidTwoScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: (b, p) => n.word(b, p), y, h, T: y(330) };

  const from = n.beat("rapid2-in").from;
  const nowAt = n.word("rapid2-in", "Now structures");
  const graphsAt = n.word("rapid2-in", "search and graphs");
  const closeAt = n.word("close", "None of these answers needed a line of code");
  const argumentAt = n.word("close", "The structure and the count were the argument");
  const assistantAt = n.word("next", "And when an assistant writes the code with you");
  const gradedAt = n.word("next", "working code isn't what's graded");
  const nextAt = n.word("next", "Next");
  const end = n.beat("close").from - 6;

  const items: RapidItem[] = [
    { n: 20, label: "Array or linked list", beat: "r-array", body: <ArrayList c={c} /> },
    { n: 21, label: "A BST and its costs", beat: "r-bst", body: <Bst c={c} /> },
    { n: 22, label: "The three traversals", beat: "r-traverse", body: <Traverse c={c} /> },
    { n: 23, label: "A balanced BST or a heap", beat: "r-bst-heap", body: <BstHeap c={c} /> },
    { n: 24, label: "A trie", beat: "r-trie", body: <Trie c={c} /> },
    { n: 25, label: "Binary search", beat: "r-binary", body: <Binary c={c} /> },
    { n: 26, label: "Two pointers", beat: "r-pointers", body: <Pointers c={c} /> },
    { n: 27, label: "Sliding window", beat: "r-window", body: <Window c={c} /> },
    { n: 28, label: "Adjacency list or matrix", beat: "r-adjacency", body: <Adjacency c={c} /> },
    { n: 29, label: "A cycle in a directed graph", beat: "r-cycle", body: <Cycle c={c} /> },
    { n: 30, label: "Topological sort", beat: "r-topo", body: <Topo c={c} /> },
    { n: 31, label: "Kahn's algorithm", beat: "r-kahn", body: <Kahn c={c} /> },
    { n: 32, label: "Bit tricks", beat: "r-bits", body: <Bits c={c} /> },
  ].map(({ beat, ...item }) => ({ ...item, at: n.beat(beat).from }));

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={from} level={-34} />
      {items.map((item) => (
        <Sfx key={item.n} name="el-tap" at={item.at} level={-34} />
      ))}
      <Sfx name="el-chime" at={argumentAt} level={-32} />
      <Sfx name="el-pencil" at={nextAt} level={-34} />

      <Drift from={from} to={n.beat("next").to + 40} scale={0.012}>
        <Kicker at={from - 8}>Questions 20 to 32 · Structures, search and graphs</Kicker>
        <Headline lead="Now structures," turn="search and graphs." at={nowAt - 4} turnAt={graphsAt - 2} />
        <RapidFire items={items} x={X0} top={y(LIST_TOP)} rowH={h(ROW)} width={560} at={nowAt + 6} end={end} />
        <VRule x={730} top={y(LIST_TOP)} bottom={y(LIST_TOP) + items.length * h(ROW)} at={items[0].at - 6} />

        {/* The close. */}
        <Art name="pangolin" at={closeAt} left={1380} top={y(290)} h={330} />
        <Line at={closeAt} x={R_X} y={y(660)} size={30} weight={500}>
          None of these answers needed a line of code.
        </Line>
        <Line at={argumentAt} x={R_X} y={y(708)} size={30} weight={500} color={BLUE_INK}>
          The structure and the count were the argument.
        </Line>
        <Line at={assistantAt} x={R_X} y={y(766)} size={26} color={INK_SOFT}>
          With an assistant writing the code
          <span style={{ opacity: ease(frame, gradedAt, 10) }}>, working code isn&apos;t what&apos;s graded</span>
        </Line>
        <NextLine at={nextAt} x={R_X} y={y(816)} width={900}>
          the AI-allowed round
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
