import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useNarration } from "../../narration/NarrationContext";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, note, PAPER } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { MEMO_CALLS, MEMO_HITS, MEMO_TREE, memoAt, NAIVE_CALLS, NAIVE_TREE, TREE_N } from "./data";
import { COUNTER_TOP, levelTop, nodeX, SIDE_X } from "./geometry";
import { Fig, Key, MEMO, MEMO_INK, Mono, NAIVE_INK } from "./kit";
import { Counter, TreeEdge, TreeNode } from "./tree";

/** The memoized tree keeps its root where the naive root was. */
const ROOT = NAIVE_TREE[0];
const MEMO_X0 = nodeX(ROOT.slot) - MEMO_TREE[0].slot * (nodeX(1) - nodeX(0));

/**
 * Fig. 2's tree again, now run with the memo: each repeated branch is cut
 * back to one call answered from the table, and what is left closes up
 * around the one path down.
 */
export const CollapseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();
  const start = n.beat("collapse").from;
  const branchAt = n.word("collapse", "repeated branch");
  const tableAt = n.word("collapse", "table");
  const collapsesAt = n.word("collapse", "collapses");
  const nineAt = n.word("collapse", "nine");

  const cut = ease(frame, branchAt - 2, 16);
  const rename = ease(frame, branchAt + 8, 14);
  const turn = ease(frame, tableAt - 4, 12);
  const close = ease(frame, collapsesAt - 4, 22);

  const place = (path: string, slot: number, depth: number) => {
    const m = memoAt(path);
    const from = nodeX(slot);
    const to = m ? nodeX(m.slot, MEMO_X0) : from;
    return [interpolate(close, [0, 1], [from, to]), y(levelTop(depth))] as const;
  };
  const pos = NAIVE_TREE.map((c) => place(c.path, c.slot, c.depth));
  const gone = NAIVE_TREE.filter((c) => !memoAt(c.path)).length;
  const count = Math.round(NAIVE_CALLS - gone * cut);

  return (
    <AbsoluteFill>
      <Fig n="5" at={start - 14} x={120} y={y(104)}>
        Every call <Mono>{`fibMemo(${TREE_N})`}</Mono> makes
      </Fig>
      <Note at={tableAt} x={1800} y={y(104) + 1} align="right" from="right">
        <span style={{ ...note(22, INK_SOFT), display: "inline-flex", alignItems: "center", gap: 10 }}>
          <Key stroke={INK_SOFT} fill={PAPER} /> <span>computed</span>
          <span style={{ width: 16 }} />
          <Key stroke={MEMO} dashed fill={`color-mix(in srgb, ${MEMO} 14%, ${PAPER})`} />
          <span style={{ color: MEMO_INK, fontWeight: 650 }}>read from the table</span>
        </span>
      </Note>

      {NAIVE_TREE.map((c) => {
        if (c.parent < 0) return null;
        const kept = Boolean(memoAt(c.path));
        return (
          <TreeEdge
            key={`e${c.i}`}
            from={pos[c.parent]}
            to={pos[c.i]}
            draw={1}
            color={INK_SOFT}
            opacity={kept ? 1 : 1 - cut}
          />
        );
      })}
      {NAIVE_TREE.map((c) => {
        const m = memoAt(c.path);
        const hit = m?.kind === "hit";
        return (
          <TreeNode
            key={c.i}
            n={c.n}
            x={pos[c.i][0]}
            top={pos[c.i][1]}
            appear={1}
            from={c.repeat ? "repeat" : "call"}
            to={hit ? "lookup" : m ? "call" : "repeat"}
            mix={turn}
            opacity={m ? 1 : 1 - cut}
            rename={m ? rename : 0}
          />
        );
      })}

      <Counter
        x={SIDE_X}
        top={y(COUNTER_TOP)}
        at={start - 10}
        value={count}
        color={count === MEMO_CALLS ? MEMO_INK : NAIVE_INK}
        caption={
          <>
            calls for <Mono>{`fibMemo(${TREE_N})`}</Mono>
          </>
        }
        hot={ease(frame, nineAt - 2, 10)}
      />
      <Note at={nineAt + 6} x={SIDE_X} y={y(COUNTER_TOP) + 200} from="up" width={330}>
        <span style={{ ...note(22, INK_SOFT) }}>
          {NAIVE_CALLS} without the table.{" "}
          <span style={{ color: INK }}>
            {MEMO_HITS} of these {MEMO_CALLS} only read it.
          </span>
        </span>
      </Note>
    </AbsoluteFill>
  );
};

