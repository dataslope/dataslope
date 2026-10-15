import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useNarration } from "../../narration/NarrationContext";
import { useLayout } from "../../editorial/layout";
import { HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { DEEP_PATH, DISTINCT, NAIVE_CALLS, NAIVE_TREE, REPEATS, TREE_DEPTH, TREE_N } from "./data";
import { COUNTER_TOP, levelTop, nodeX, SIDE_W, SIDE_X } from "./geometry";
import { Fig, Key, Mono, NAIVE, NAIVE_INK } from "./kit";
import { Counter, NODE_H, TreeEdge, TreeNode } from "./tree";

/** The stack column: frame height and gap, in layout units, and its base. */
const FRAME_H = 50;
const FRAME_GAP = 8;
const STACK_BASE = 800;

/**
 * Every call naive fib(5) makes, as a tree drawn in the order the calls
 * happen; then the repeats, and the one path the stack holds at its deepest.
 */
export const TreeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const start = n.beat("tree").from;
  const everyAt = n.word("tree", "every call");
  const fifteenAt = n.word("tree", "Fifteen");
  const threeAt = n.word("repeat", "Fib of three");
  const twoAt = n.word("repeat", "fib of two");
  const branchAt = n.word("repeat", "Each repeat");
  const pathAt = n.word("stack", "one path");
  const deepAt = n.word("stack", "five calls deep");
  const depthAt = n.word("point", "Depth");
  const countAt = n.word("point", "count");

  const step = Math.max(2, (fifteenAt - everyAt) / (NAIVE_CALLS - 1));
  const appearAt = (i: number) => everyAt - 4 + i * step;
  const pos = NAIVE_TREE.map((c) => [nodeX(c.slot), y(levelTop(c.depth))] as const);
  const onPath = new Set(DEEP_PATH);
  const pathStep = Math.max(3, (deepAt - pathAt) / DEEP_PATH.length);
  const shown = NAIVE_TREE.filter((c) => frame >= appearAt(c.i) + 4).length;
  const ringOut = ease(frame, pathAt - 10, 10);
  const stackDim = ease(frame, depthAt - 2, 12);

  return (
    <AbsoluteFill>
      <Fig n="2" at={start - 14} x={120} y={y(104)}>
        Every call <Mono>fib(5)</Mono> makes, in the order it makes them
      </Fig>
      {/* The legend, at the right end of the label's line. */}
      <Note at={branchAt} x={1800} y={y(104) + 1} align="right" from="right">
        <span style={{ ...note(22, INK_SOFT), display: "inline-flex", alignItems: "center", gap: 10 }}>
          <Key stroke={INK_SOFT} fill={PAPER} /> <span>first time</span>
          <span style={{ width: 16 }} />
          <Key stroke={NAIVE} fill={`color-mix(in srgb, ${NAIVE} 20%, ${PAPER})`} />
          <span style={{ color: NAIVE_INK, fontWeight: 650 }}>repeat</span>
        </span>
      </Note>

      {NAIVE_TREE.map((c) =>
        c.parent < 0 ? null : (
          <TreeEdge
            key={`e${c.i}`}
            from={pos[c.parent]}
            to={pos[c.i]}
            draw={ease(frame, appearAt(c.i) - 3, 8)}
            color={onPath.has(c.i) && frame >= pathAt - 2 ? INK : INK_SOFT}
            width={onPath.has(c.i) ? 1.8 + 2.2 * ease(frame, pathAt + DEEP_PATH.indexOf(c.i) * pathStep, 8) : 1.8}
          />
        ),
      )}
      {NAIVE_TREE.map((c) => {
        const ringOn = c.n === 3 ? threeAt : c.n === 2 ? twoAt : null;
        const k = DEEP_PATH.indexOf(c.i);
        return (
          <TreeNode
            key={c.i}
            n={c.n}
            x={pos[c.i][0]}
            top={pos[c.i][1]}
            appear={ease(frame, appearAt(c.i), 8)}
            to={c.repeat ? "repeat" : "call"}
            mix={c.repeat ? ease(frame, branchAt - 2 + (c.i % 5) * 1.5, 12) : 0}
            ring={ringOn === null ? 0 : ease(frame, ringOn - 2 + (c.i % 3) * 3, 12) * (1 - ringOut)}
            glow={k < 0 ? 0 : ease(frame, pathAt + k * pathStep, 8) * 0.9}
          />
        );
      })}
      <Note at={branchAt + 12} x={120} y={y(levelTop(TREE_DEPTH)) + NODE_H + h(40)} out={pathAt - 6}>
        <span style={note(22, INK_SOFT)}>
          {DISTINCT} different values. {REPEATS} of the {NAIVE_CALLS} calls redo work an earlier call already did.
        </span>
      </Note>

      {/* The counter, top right. */}
      <Counter
        x={SIDE_X}
        top={y(COUNTER_TOP)}
        at={everyAt - 6}
        value={shown}
        color={NAIVE_INK}
        caption={
          <>
            calls for <Mono>{`fib(${TREE_N})`}</Mono>
          </>
        }
        hot={ease(frame, countAt - 2, 10)}
      />

      {/* The stack at its deepest: the calls open on that one path. */}
      <Ink at={pathAt - 6} dur={14} style={{ left: SIDE_X, top: y(452), width: SIDE_W, opacity: 1 - stackDim * 0.6 }}>
        <span style={label(22, INK_SOFT)}>The call stack, at its deepest</span>
      </Ink>
      {DEEP_PATH.map((i, k) => {
        const p = ease(frame, pathAt + k * pathStep, 8);
        if (p <= 0) return null;
        const top = y(STACK_BASE) - (k + 1) * h(FRAME_H + FRAME_GAP) + h(FRAME_GAP);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: SIDE_X,
              top: top - (1 - p) * 24,
              width: 240,
              height: h(FRAME_H),
              boxSizing: "border-box",
              border: `2px solid ${INK}`,
              background: `color-mix(in srgb, ${HIGHLIGHT} 70%, ${PAPER})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: MONO,
              fontSize: 24,
              fontWeight: 500,
              color: INK,
              opacity: p * (1 - stackDim * 0.6),
            }}
          >
            fib({NAIVE_TREE[i].n})
          </div>
        );
      })}
      <Note at={deepAt} x={SIDE_X} y={y(STACK_BASE) + h(16)} from="up">
        <span style={{ ...note(24, INK), fontWeight: 700, opacity: 1 - stackDim * 0.6 }}>{TREE_DEPTH} calls deep</span>
      </Note>
    </AbsoluteFill>
  );
};
