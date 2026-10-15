import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { HAIRLINE, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { compared, FIG2 } from "./data";
import {
  cellDot,
  Code,
  Fig,
  FRESH_TINT,
  HeapObj,
  InkSlot,
  markP,
  Mono,
  type Pt,
  RefArrow,
  SHARED_TINT,
  STRING_INK,
  VarCell,
  Verdict,
} from "./kit";

const LEFT = 120;
const CODE = 28;
/** The code of each declaration ends here, beside its variable's cell. */
const CODE_R = 690;
const CELL_X = 730;
const CELL_W = 170;
/** Stack on the left of this line, heap on the right. */
const DIVIDE = 970;
const HEAP_X = 1010;
/** Objects made fresh sit in the near column; the pooled one further out. */
const NEAR_X = 1070;
const POOL_X = 1500;
const OBJ_W = 200;
const POOL_PAD = 40;

/** Layout rows, before `y()`. */
const HEADS = 182;
const POOL_TOP = 214;
const ROWS = [262, 382, 502, 622] as const;
const ROW_H = 80;
const VERDICTS = 754;

/** Fig. 2's lines, by variable. */
const LINE = Object.fromEntries(FIG2.lines.map((l) => [l.split(" ")[1], l])) as Record<"a" | "b" | "c" | "d", string>;

/**
 * Fig. 2: what a String variable holds. Each declaration's cell holds an
 * arrow; the two literals share the pooled object, new String and a string
 * built at run time each get one of their own.
 */
export const HeapScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const start = n.beat("refs").from;
  const variableAt = n.word("refs", "string variable");
  const referenceAt = n.word("refs", "reference");
  const arrowAt = n.word("refs", "an arrow");
  const objectAt = n.word("refs", "object");
  const heapAt = n.word("refs", "heap");

  const internedAt = n.word("literal", "interned");
  const twiceAt = n.word("literal", "same literal twice");
  const bothAt = n.word("literal", "both arrows");
  const sharedAt = n.word("literal", "one shared object");
  const trueAt = n.word("literal", "is true");

  const freshAt = n.word("fresh", "fresh object");
  const builtAt = n.word("fresh", "built");
  const runsAt = n.word("fresh", "program runs");
  const lettersAt = n.word("fresh", "Same letters");
  const differentAt = n.word("fresh", "different arrows");

  const rowTop = (i: number) => y(ROWS[i]);
  const rowH = h(ROW_H);
  const mid = (i: number) => rowTop(i) + rowH / 2;
  const dot = (i: number): Pt => cellDot(CELL_X, rowTop(i), CELL_W, rowH);

  const poolTop = y(POOL_TOP);
  const poolBottom = rowTop(0) + rowH + 34;
  const poolMid = POOL_X + OBJ_W / 2;
  const pool = ease(frame, internedAt - 2, 16);

  // Same letters: every object's "hi" carries one highlight for a moment.
  const letters = markP(frame, lettersAt - 2, differentAt + 10);

  const rows: { v: "a" | "b" | "c" | "d"; i: number; at: number }[] = [
    { v: "a", i: 0, at: variableAt - 2 },
    { v: "b", i: 1, at: variableAt + 4 },
    { v: "c", i: 2, at: twiceAt - 2 },
    { v: "d", i: 3, at: builtAt - 4 },
  ];

  return (
    <AbsoluteFill>
      <Fig n="2" at={start - 2} x={LEFT} y={y(108)}>
        What a <Mono>String</Mono> variable holds
      </Fig>

      {/* Column heads and the line between stack and heap. */}
      <Ink at={Math.max(start - 2, variableAt - 6)} dur={14} style={{ left: CELL_X - 18, top: y(HEADS) }}>
        <span style={label(21, INK_SOFT)}>Stack frame of main</span>
      </Ink>
      <Ink at={heapAt - 4} dur={14} style={{ left: HEAP_X, top: y(HEADS) }}>
        <span style={label(21, INK_SOFT)}>Heap</span>
      </Ink>
      <div
        style={{
          position: "absolute",
          left: DIVIDE,
          top: y(HEADS),
          width: 1,
          height: (rowTop(3) + rowH + 10 - y(HEADS)) * ease(frame, Math.max(start - 2, variableAt - 4), 20),
          background: HAIRLINE,
        }}
      />
      {/* main's frame: one box around the four cells. */}
      <div
        style={{
          position: "absolute",
          left: CELL_X - 18,
          top: rowTop(0) - 18,
          width: CELL_W + 36,
          height: rowTop(3) + rowH + 18 - (rowTop(0) - 18),
          boxSizing: "border-box",
          border: `1.5px solid ${HAIRLINE}`,
          borderRadius: 8,
          background: `color-mix(in srgb, ${INK} 2%, ${PAPER})`,
          opacity: ease(frame, Math.max(start - 2, variableAt - 6), 14),
        }}
      />

      {/* The string pool: a dashed region of the heap around the literal. */}
      {pool > 0 ? (
        <div
          style={{
            position: "absolute",
            left: POOL_X - POOL_PAD,
            top: poolTop,
            width: OBJ_W + POOL_PAD * 2,
            height: poolBottom - poolTop,
            boxSizing: "border-box",
            border: `2px dashed ${INK_SOFT}`,
            borderRadius: 12,
            opacity: pool,
          }}
        >
          <span
            style={{
              ...label(20, INK_SOFT),
              position: "absolute",
              left: 16,
              top: 8,
            }}
          >
            String pool
          </span>
        </div>
      ) : null}

      {rows.map(({ v, i, at }) => (
        <React.Fragment key={v}>
          <Ink
            at={at}
            dur={14}
            style={{
              right: 1920 - CODE_R,
              top: rowTop(i),
              height: rowH,
              display: "flex",
              alignItems: "center",
            }}
          >
            <Code line={LINE[v]} size={CODE} />
          </Ink>
          <VarCell x={CELL_X} top={rowTop(i)} width={CELL_W} height={rowH} name={v} at={at + 2} />
        </React.Fragment>
      ))}

      {/* The objects. */}
      <HeapObj
        x={POOL_X}
        top={rowTop(0)}
        width={OBJ_W}
        height={rowH}
        type="String"
        value={'"hi"'}
        valueInk={STRING_INK}
        at={objectAt - 2}
        tint={ease(frame, sharedAt, 12) * 0.3}
        tintColor={SHARED_TINT}
        mark={letters}
      />
      <HeapObj
        x={NEAR_X}
        top={rowTop(1)}
        width={OBJ_W}
        height={rowH}
        type="String"
        value={'"hi"'}
        valueInk={STRING_INK}
        at={objectAt + 2}
        tint={ease(frame, freshAt - 2, 12) * 0.22}
        tintColor={FRESH_TINT}
        mark={letters}
      />
      <HeapObj
        x={NEAR_X}
        top={rowTop(3)}
        width={OBJ_W}
        height={rowH}
        type="String"
        value={'"hi"'}
        valueInk={STRING_INK}
        at={runsAt - 6}
        tint={ease(frame, runsAt + 4, 12) * 0.22}
        tintColor={FRESH_TINT}
        mark={letters}
      />

      {/* The references. */}
      <RefArrow points={[dot(0), [POOL_X - 8, mid(0)]]} dotAt={referenceAt} at={arrowAt} dur={18} />
      <RefArrow points={[dot(1), [NEAR_X - 8, mid(1)]]} dotAt={referenceAt + 3} at={arrowAt + 4} dur={14} />
      <RefArrow
        points={[dot(2), [poolMid, mid(2)], [poolMid, rowTop(0) + rowH + 8]]}
        dotAt={twiceAt + 4}
        at={bothAt - 2}
        dur={20}
      />
      <RefArrow points={[dot(3), [NEAR_X - 8, mid(3)]]} dotAt={builtAt} at={runsAt - 4} dur={12} />

      {/* What makes each object. */}
      <Note at={freshAt} x={NEAR_X + OBJ_W + 24} y={mid(1) - 14}>
        <span style={note(20, INK_SOFT)}>a new object</span>
      </Note>
      <Note at={runsAt + 2} x={NEAR_X + OBJ_W + 24} y={mid(3) - 14}>
        <span style={note(20, INK_SOFT)}>another new one</span>
      </Note>

      {/* What == prints for them. */}
      <div
        style={{
          position: "absolute",
          left: LEFT,
          top: y(VERDICTS) - 22,
          width: (1800 - LEFT) * ease(frame, trueAt - 10, 16),
          height: 1,
          background: HAIRLINE,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: LEFT,
          top: y(VERDICTS),
          display: "flex",
          gap: 84,
        }}
      >
        <InkSlot at={trueAt - 6}>
          <Verdict expr="a == c" value={compared("a == c")} size={30} outAt={trueAt} />
        </InkSlot>
        <InkSlot at={differentAt - 6}>
          <Verdict expr="a == b" value={compared("a == b")} size={30} outAt={differentAt} />
        </InkSlot>
        <InkSlot at={differentAt}>
          <Verdict expr="a == d" value={compared("a == d")} size={30} outAt={differentAt + 6} />
        </InkSlot>
        <InkSlot at={lettersAt - 2}>
          <Verdict expr="a.equals(d)" value={compared("a.equals(d)")} size={30} outAt={lettersAt + 4} />
        </InkSlot>
      </div>
    </AbsoluteFill>
  );
};
