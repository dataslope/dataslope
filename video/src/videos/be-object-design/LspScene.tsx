import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, BAR, INK, INK_SOFT, PAPER } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { LISKOV } from "./data";
import { ACCENT_INK, Box, Drift, Flow, lerp, Line, Mark, Mark2, OK, OK_INK, pulse, VRule, X0 } from "./parts";

const NODE = { w: 210, h: 64 };
const CALLER_X = 650;
const UNIT = 40;
const RECT_X = 1080;
const SQ_X = 1460;
const BASE = 640;

/** A shape drawn to scale, `w` by `h` units, its bottom-left corner at
 *  (x, base), a faint grid inside so its area can be counted. */
const Shape: React.FC<{ x: number; base: number; w: number; h: number; at: number; tone: "data" | "ok" | "bad" }> = ({ x, base, w, h, at, tone }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  if (p <= 0) return null;
  const line = tone === "ok" ? OK : tone === "bad" ? ACCENT : BAR;
  const W = w * UNIT;
  const H = h * UNIT;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: p }}>
      <rect x={x} y={base - H} width={W} height={H} fill={`color-mix(in srgb, ${line} 14%, ${PAPER})`} />
      {Array.from({ length: Math.ceil(w) - 1 }, (_, i) => (
        <line key={`v${i}`} x1={x + (i + 1) * UNIT} y1={base - H} x2={x + (i + 1) * UNIT} y2={base} stroke={line} strokeOpacity={0.25} strokeWidth={1} />
      ))}
      {Array.from({ length: Math.ceil(h) - 1 }, (_, i) => (
        <line key={`h${i}`} x1={x} y1={base - (i + 1) * UNIT} x2={x + W} y2={base - (i + 1) * UNIT} stroke={line} strokeOpacity={0.25} strokeWidth={1} />
      ))}
      <rect x={x} y={base - H} width={W} height={H} fill="none" stroke={line} strokeWidth={3} />
    </svg>
  );
};

/**
 * Question 3. The square that subclasses a rectangle, run: a caller written
 * for rectangles sets the width to 5 and the height to 4 and expects 20. A
 * rectangle gives 20; a square, which keeps its sides equal, gives 16. The
 * rule in plain words, then the fix: square and rectangle as siblings under
 * one shape, each with its own area.
 */
export const LspScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("lsp").from;
  const qAt = n.word("lsp", "Question three");
  const textAt = n.word("lsp", "What is the Liskov substitution principle");
  const usableAt = n.word("lsp", "A subclass must be usable anywhere");
  const surpriseAt = n.word("lsp", "without surprising the caller");
  const trapAt = n.word("lsp-square", "The classic trap");
  const squareAt = n.word("lsp-square", "a square that subclasses a rectangle");
  const rectAt = n.word("lsp-square", "a rectangle");
  const equalAt = n.word("lsp-square", "It keeps its sides equal");
  const tooAt = n.word("lsp-square", "sets its height too");
  const codeAt = n.word("lsp-break", "Code written for rectangles");
  const widthAt = n.word("lsp-break", "sets the width to five");
  const heightAt = n.word("lsp-break", "then the height to four");
  const expectsAt = n.word("lsp-break", "expects an area of twenty");
  const handAt = n.word("lsp-break", "Hand it a square");
  const sixteenAt = n.word("lsp-break", "sixteen");
  const demandAt = n.word("lsp-rule", "mustn't demand more of its callers");
  const promiseAt = n.word("lsp-rule", "or promise them less");
  const fixAt = n.word("lsp-fix", "the fix isn't a cleverer square");
  const dontAt = n.word("lsp-fix", "Don't make a square a kind of resizable rectangle");
  const resizedAt = n.word("lsp-fix", "shapes that can't be resized");
  const siblingsAt = n.word("lsp-fix", "two siblings");
  const promiseKeptAt = n.word("lsp-fix", "both keep every promise");
  const end = n.beat("lsp-fix").to;

  // The hierarchy: square under rectangle, then siblings under one shape.
  const fix = ease(frame, siblingsAt, 24);
  const topRow = y(392);
  const lowRow = y(560);
  const rectBox = { x: lerp(X0, X0, fix), y: lerp(topRow, lowRow, fix) };
  const sqBox = { x: lerp(X0, X0 + 250, fix), y: lowRow };
  const shapeBox = { x: X0 + 65, y: topRow - 12, w: 330, h: NODE.h + 12 };

  // The run: width then height, on a rectangle, then on a square.
  const rw = lerp(2, LISKOV.width, ease(frame, widthAt + 4, 12));
  const rh = lerp(3, LISKOV.height, ease(frame, heightAt + 4, 12));
  const sqW = ease(frame, handAt + 10, 12);
  const sqH = ease(frame, handAt + 30, 12);
  const sq = lerp(lerp(3, LISKOV.width, sqW), LISKOV.height, sqH);
  const base = y(BASE);
  const rectDone = frame >= expectsAt + 6;
  const sqDone = frame >= sixteenAt - 2;
  if (LISKOV.rectangle !== LISKOV.width * LISKOV.height) throw new Error("the rectangle's run disagrees with its sides");

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={squareAt} level={-32} />
      <Sfx name="el-pencil" at={codeAt} level={-35} />
      <Sfx name="el-tap" at={widthAt + 4} level={-33} />
      <Sfx name="el-tap" at={heightAt + 4} level={-33} />
      <Sfx name="el-tap" at={expectsAt + 6} level={-31} />
      <Sfx name="el-tap" at={handAt + 10} level={-33} />
      <Sfx name="el-tap" at={handAt + 30} level={-33} />
      <Sfx name="el-scratch" at={sixteenAt} level={-31} />
      <Sfx name="el-whoosh" at={siblingsAt} level={-35} />
      <Sfx name="el-chime" at={promiseKeptAt + 6} level={-33} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} size={56}>
          What is the Liskov Substitution Principle in plain terms?
        </QuestionCard>
        <Line x={X0} y={y(270)} at={usableAt} size={26}>
          A subclass must be usable anywhere its parent is expected, <Mark at={surpriseAt}>without surprising the caller</Mark>.
        </Line>

        {/* The hierarchy. */}
        <Line x={X0} y={topRow - 60} at={trapAt} size={21} color={ACCENT_INK} weight={600} out={fixAt}>
          The classic trap
        </Line>
        <Line x={X0} y={topRow - 60} at={fixAt + 10} size={21} color={OK_INK} weight={600}>
          The fix
        </Line>
        <Box x={rectBox.x} y={rectBox.y} w={NODE.w} h={NODE.h} at={usableAt + 4} title={frame < rectAt ? "Parent" : "Rectangle"} lit={pulse(frame, rectAt, 20)} />
        <Box
          x={sqBox.x}
          y={sqBox.y}
          w={NODE.w}
          h={NODE.h}
          at={usableAt + 10}
          title={frame < squareAt ? "Subclass" : "Square"}
          lit={pulse(frame, squareAt, 20)}
          tones={[
            [sixteenAt, "bad"],
            [siblingsAt + 10, "ok"],
          ]}
        />
        <Flow points={[[X0 + 70, lowRow - 8], [X0 + 70, topRow + NODE.h + 8]]} at={usableAt + 14} out={dontAt} />
        <Line x={X0 + 92} y={(topRow + NODE.h + lowRow) / 2 - 14} at={usableAt + 16} size={21} color={INK_SOFT} weight={650} out={dontAt}>
          is a
        </Line>
        <Line x={X0} y={lowRow + NODE.h + 18} at={equalAt} size={21} color={INK_SOFT} weight={600} out={dontAt}>
          keeps width and height equal
        </Line>
        <Box x={shapeBox.x} y={shapeBox.y} w={shapeBox.w} h={shapeBox.h} at={siblingsAt} title="Shape" tone="ok" sub="each works out its own area" subSize={20} />
        <Flow points={[[X0 + NODE.w / 2, lowRow - 8], [X0 + NODE.w / 2, topRow + NODE.h + 8]]} at={siblingsAt + 14} dur={10} width={2.2} head={12} />
        <Flow points={[[X0 + 250 + NODE.w / 2, lowRow - 8], [X0 + 250 + NODE.w / 2, topRow + NODE.h + 8]]} at={siblingsAt + 18} dur={10} width={2.2} head={12} />
        <Line x={X0} y={lowRow + NODE.h + 18} at={resizedAt} size={22} weight={600} color={OK_INK}>
          Or: shapes that can&apos;t be resized
        </Line>

        <VRule x={(X0 + 250 + NODE.w + CALLER_X) / 2} top={topRow - 60} bottom={lowRow + NODE.h + 50} at={codeAt} />
        <VRule x={(RECT_X + LISKOV.width * UNIT + SQ_X) / 2} top={base - LISKOV.width * UNIT} bottom={base + 112} at={squareAt + 4} />

        {/* The caller written for rectangles. */}
        <Line x={CALLER_X} y={topRow - 60} at={codeAt} size={21} color={INK_SOFT} weight={600}>
          Code written for rectangles
        </Line>
        {[
          { at: widthAt, text: `sets the width to ${LISKOV.width}` },
          { at: heightAt, text: `sets the height to ${LISKOV.height}` },
          { at: expectsAt, text: `expects an area of ${LISKOV.width * LISKOV.height}` },
        ].map((s, i) => (
          <Line key={s.text} x={CALLER_X} y={topRow + i * 48} at={s.at} size={25} weight={i === 2 ? 700 : 500}>
            <span style={{ color: INK_SOFT, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
            {"  "}
            {s.text}
          </Line>
        ))}

        {/* The rule, in plain words. */}
        <Line x={CALLER_X} y={y(764)} at={demandAt - 4} size={25} weight={600}>
          A subclass mustn&apos;t <Mark at={demandAt + 4}>demand more</Mark> of its callers,
        </Line>
        <Line x={CALLER_X} y={y(764) + 48} at={promiseAt - 2} size={25} weight={600}>
          or <Mark at={promiseAt + 4}>promise them less</Mark>.
        </Line>

        {/* The two shapes, to scale, each named under its base. */}
        <Shape x={RECT_X} base={base} w={rw} h={rh} at={rectAt} tone={rectDone ? "ok" : "data"} />
        <Line x={RECT_X} y={base + 14} at={rectAt} size={21} color={INK_SOFT} weight={600}>
          rectangle
        </Line>
        <Line x={RECT_X} y={base + 46} at={widthAt + 4} size={25} weight={600} color={rectDone ? OK_INK : INK}>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            {Math.round(rw)} × {Math.round(rh)}
            {rectDone ? ` = ${LISKOV.rectangle}` : ""}
          </span>
        </Line>
        <Mark2 at={expectsAt + 8} kind="tick" size={30} style={{ left: RECT_X + 160, top: base + 48 }} />

        <Shape x={SQ_X} base={base} w={sq} h={sq} at={squareAt + 4} tone={sqDone ? "bad" : "data"} />
        <Line x={SQ_X} y={base + 14} at={squareAt + 4} size={21} color={INK_SOFT} weight={600}>
          square
        </Line>
        <Line x={SQ_X} y={base + 46} at={handAt + 8} size={25} weight={600} color={sqDone ? ACCENT_INK : INK}>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            {Math.round(sq)} × {Math.round(sq)}
            {sqDone ? ` = ${LISKOV.square}` : ""}
          </span>
        </Line>
        <Mark2 at={sixteenAt + 4} kind="cross" size={30} style={{ left: SQ_X + 160, top: base + 48 }} />
        <Line x={SQ_X} y={base + 88} at={sixteenAt + 8} size={21} color={ACCENT_INK} weight={650}>
          expected {LISKOV.width * LISKOV.height}
        </Line>
        <Line x={SQ_X} y={base + 46} at={tooAt} size={21} color={INK_SOFT} weight={600} out={handAt + 6}>
          width sets height
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
