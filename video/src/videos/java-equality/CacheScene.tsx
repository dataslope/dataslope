import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, HAIRLINE, headline, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { MONO } from "../../theme/fonts";
import { BOXED, CACHE, CACHE_RAISED, FIG3, JAVA_MAJOR, VALUE_OF_CALLS } from "./data";
import {
  cellDot,
  Code,
  Fig,
  FRESH_TINT,
  HeapObj,
  InkSlot,
  Marked,
  markP,
  Mono,
  NUMBER_INK,
  type Pt,
  RefArrow,
  SHARED_TINT,
  VarCell,
  Verdict,
} from "./kit";

const LEFT = 120;
const CELL_X = 136;
const CELL_W = 180;
const DIVIDE = 400;
const HEAP_X = 440;

/** The cache strip: its first three values, a gap, its last three. */
const STRIP_X = 470;
const BOX_W = 120;
const STEP = 132;
const GAP = 90;
const RUN = 3;
const STRIP = [
  ...Array.from({ length: RUN }, (_, k) => ({
    value: CACHE.low + k,
    x: STRIP_X + k * STEP,
  })),
  ...Array.from({ length: RUN }, (_, k) => ({
    value: CACHE.high - RUN + 1 + k,
    x: STRIP_X + RUN * STEP + GAP + k * STEP,
  })),
];
const LAST = STRIP[STRIP.length - 1];
const GAP_X = STRIP_X + RUN * STEP - (STEP - BOX_W);

/** The two references into the last cached box come up from below it, side by side. */
const ELBOW = { a: LAST.x + 40, b: LAST.x + 80 };
/** The two fresh 128s. */
const NEW_X = 760;
const OBJ_W = 180;
const VERDICT_X = NEW_X + OBJ_W + 44;

/** Layout rows, before `y()`. */
const COMPILE = 168;
const JAVAP = 228;
const HEADS = 284;
const CACHE_LABEL = 322;
const STRIP_TOP = 360;
const STRIP_H = 76;
const ROWS = { a: 460, b: 538, x: 628, y: 706 } as const;
const ROW_H = 64;
const FOOT = 812;

/** "Integer a = 127;" from Fig. 3, and what javac makes of the box. */
const DECL = FIG3.lines[0].split(",")[0] + ";";
const VALUE = FIG3.lines[0].match(/= (\d+)/)?.[1] ?? "";
const CALL = `Integer a = Integer.valueOf(${VALUE});`;

/**
 * Fig. 4: what autoboxing hands back. Integer.valueOf keeps one object for
 * each value from -128 to 127; a and b both get the cached 127, while x and y
 * each get a new 128.
 */
export const CacheScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const start = n.beat("cache").from;
  const autoAt = n.word("cache", "Autoboxing");
  const valueOfAt = n.word("cache", "Integer dot value of");
  const cachedAt = n.word("cache", "cached object");
  const lowAt = n.word("cache", "minus");
  const highAt = n.word("cache", "one hundred twenty-seven");

  const insideAt = n.word("outside", "Inside");
  const bothAt = n.word("outside", "both variables");
  const sameAt = n.word("outside", "same cached object");
  const outsideAt = n.word("outside", "Outside");
  const newAt = n.word("outside", "brand new");
  const differAt = n.word("outside", "arrows differ");

  const rowTop = (v: keyof typeof ROWS) => y(ROWS[v]);
  const rowH = h(ROW_H);
  const mid = (v: keyof typeof ROWS) => rowTop(v) + rowH / 2;
  const dot = (v: keyof typeof ROWS): Pt => cellDot(CELL_X, rowTop(v), CELL_W, rowH);
  const stripTop = y(STRIP_TOP);
  const stripH = h(STRIP_H);
  const under = stripTop + stripH + 8;

  const lowMark = markP(frame, lowAt - 2, insideAt - 6);
  const highMark = markP(frame, highAt - 2, insideAt - 6);
  const shared = ease(frame, sameAt - 2, 12);

  const frameTop = rowTop("a") - 16;
  const frameBottom = rowTop("y") + rowH + 16;

  return (
    <AbsoluteFill>
      <Fig n="4" at={start - 2} x={LEFT} y={y(108)}>
        What autoboxing hands back
      </Fig>

      {/* Integer a = 127;  compiles to  Integer a = Integer.valueOf(127); */}
      <div
        style={{
          position: "absolute",
          left: LEFT,
          top: y(COMPILE),
          display: "flex",
          alignItems: "baseline",
          gap: "0.6em",
          whiteSpace: "nowrap",
          fontSize: 30,
        }}
      >
        <Ink at={autoAt - 4} dur={14} style={{ position: "relative" }}>
          <Code line={DECL} size={30} />
        </Ink>
        <Ink at={valueOfAt - 6} dur={14} style={{ position: "relative" }}>
          <span style={{ ...body(32, true), color: INK_SOFT }}>compiles to</span>
        </Ink>
        <Ink at={valueOfAt} dur={16} style={{ position: "relative" }}>
          <Code line={CALL} size={30} />
        </Ink>
      </div>
      <Note at={valueOfAt + 14} x={LEFT} y={y(JAVAP)}>
        <span style={note(20, INK_SOFT)}>
          javap shows one <Mono>Integer.valueOf</Mono> call for each of the {VALUE_OF_CALLS} boxings in Fig. 3.
        </span>
      </Note>

      {/* Heads, and the line between stack and heap. */}
      <Ink at={insideAt - 6} dur={14} style={{ left: CELL_X - 16, top: y(HEADS) }}>
        <span style={label(21, INK_SOFT)}>Stack frame</span>
      </Ink>
      <Ink at={cachedAt - 8} dur={14} style={{ left: HEAP_X, top: y(HEADS) }}>
        <span style={label(21, INK_SOFT)}>Heap</span>
      </Ink>
      <div
        style={{
          position: "absolute",
          left: DIVIDE,
          top: y(HEADS),
          width: 1,
          height: (frameBottom - y(HEADS)) * ease(frame, insideAt - 8, 20),
          background: HAIRLINE,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: CELL_X - 16,
          top: frameTop,
          width: CELL_W + 32,
          height: frameBottom - frameTop,
          boxSizing: "border-box",
          border: `1.5px solid ${HAIRLINE}`,
          borderRadius: 8,
          background: `color-mix(in srgb, ${INK} 2%, ${PAPER})`,
          opacity: ease(frame, insideAt - 6, 14),
        }}
      />

      {/* The cache. */}
      <Ink at={cachedAt - 4} dur={16} style={{ left: STRIP_X, top: y(CACHE_LABEL), whiteSpace: "nowrap" }}>
        <span style={label(21, INK)}>Integer cache</span>
        <span style={{ ...note(21, INK_SOFT), marginLeft: "0.7em" }}>
          one object for each of {CACHE.count} values
          <InkSlot at={lowAt}>
            , from {CACHE.low} to {CACHE.high}
          </InkSlot>
        </span>
      </Ink>
      {STRIP.map((c, k) => {
        const at = cachedAt - 2 + k * 2;
        const isLow = c.value === CACHE.low;
        const isHigh = c.value === CACHE.high;
        return (
          <HeapCell
            key={c.value}
            x={c.x}
            top={stripTop}
            height={stripH}
            at={at}
            value={c.value}
            mark={isLow ? lowMark : isHigh ? highMark : 0}
            tint={isHigh ? shared * 0.3 : 0}
          />
        );
      })}
      <div
        style={{
          position: "absolute",
          left: GAP_X,
          top: stripTop,
          width: GAP + (STEP - BOX_W),
          height: stripH,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...headline(48),
          color: INK_SOFT,
          opacity: ease(frame, cachedAt + 4, 12),
        }}
      >
        …
      </div>

      {/* a and b: both references land on the cached 127. */}
      <VarCell x={CELL_X} top={rowTop("a")} width={CELL_W} height={rowH} name="a" at={insideAt - 2} />
      <VarCell x={CELL_X} top={rowTop("b")} width={CELL_W} height={rowH} name="b" at={insideAt + 2} />
      <RefArrow points={[dot("a"), [ELBOW.a, mid("a")], [ELBOW.a, under]]} dotAt={insideAt + 6} at={bothAt} dur={20} />
      <RefArrow
        points={[dot("b"), [ELBOW.b, mid("b")], [ELBOW.b, under]]}
        dotAt={insideAt + 8}
        at={bothAt + 6}
        dur={20}
      />
      <Note at={sameAt + 4} x={LAST.x + BOX_W + 40} y={mid("a") - 22}>
        <Verdict expr="a == b" value={BOXED.aSameB} size={30} />
        <div style={{ ...note(20, INK_SOFT), marginTop: 12 }}>one cached object</div>
      </Note>

      {/* x and y: two new objects. */}
      <VarCell x={CELL_X} top={rowTop("x")} width={CELL_W} height={rowH} name="x" at={outsideAt - 2} />
      <VarCell x={CELL_X} top={rowTop("y")} width={CELL_W} height={rowH} name="y" at={outsideAt + 2} />
      {(["x", "y"] as const).map((v, k) => (
        <React.Fragment key={v}>
          <HeapObj
            x={NEW_X}
            top={rowTop(v)}
            width={OBJ_W}
            height={rowH}
            type="Integer"
            value="128"
            valueInk={NUMBER_INK}
            at={newAt - 4 + k * 4}
            tint={ease(frame, newAt + 4, 12) * 0.22}
            tintColor={FRESH_TINT}
          />
          <RefArrow points={[dot(v), [NEW_X - 8, mid(v)]]} dotAt={outsideAt + 6 + k * 2} at={newAt + k * 4} dur={14} />
        </React.Fragment>
      ))}
      <Note at={differAt - 2} x={VERDICT_X} y={mid("x") - 20}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.8em" }}>
          <Verdict expr="x == y" value={BOXED.xSameY} size={30} />
          <span style={note(20, INK_SOFT)}>two objects</span>
        </div>
      </Note>
      <Note at={differAt + 10} x={VERDICT_X} y={mid("y") - 20}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.8em" }}>
          <Verdict expr="x.equals(y)" value={BOXED.xEqualsY} size={30} />
          <span style={note(20, INK_SOFT)}>same value</span>
        </div>
      </Note>

      <Note at={highAt + 24} x={LEFT} y={y(FOOT)}>
        <span style={note(20, INK_SOFT)}>
          The default range on OpenJDK {JAVA_MAJOR}. Run with <Mono>{CACHE_RAISED.flag}</Mono> and it reaches{" "}
          {CACHE_RAISED.high}, so <Mono>x == y</Mono> in Fig. 3 prints <Mono>{String(CACHE_RAISED.xEqualsY)}</Mono>.
        </span>
      </Note>
    </AbsoluteFill>
  );
};

/** One cached Integer in the strip: its value, in the number ink. */
const HeapCell: React.FC<{
  x: number;
  top: number;
  height: number;
  at: number;
  value: number;
  mark: number;
  tint: number;
}> = ({ x, top, height, at, value, mark, tint }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top,
        width: BOX_W,
        height,
        boxSizing: "border-box",
        border: `2px solid ${INK}`,
        borderRadius: 8,
        background:
          tint > 0
            ? `color-mix(in srgb, ${SHARED_TINT} ${Math.round(tint * 100)}%, ${PAPER})`
            : `color-mix(in srgb, ${INK} 3%, ${PAPER})`,
        opacity: p,
        transform: `translateY(${(1 - p) * 10}px)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: MONO,
        fontSize: 30,
        fontWeight: 600,
        color: NUMBER_INK,
        fontVariantLigatures: "none",
      }}
    >
      <Marked p={mark}>{String(value)}</Marked>
    </div>
  );
};
