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
/** Where the pointer from "The square promises less" starts: past the end
 *  of that line (25px Inter), clear of its last word. */
const WHICH_END = 1270;

/** A shape drawn to scale, `w` by `h` units, its bottom-left corner at
 *  (x, base), a faint grid inside so its area can be counted. */
const Shape: React.FC<{ x: number; base: number; w: number; h: number; at: number; tone: "data" | "ok" | "bad"; dim?: number }> = ({ x, base, w, h, at, tone, dim }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12) * (dim === undefined ? 1 : 1 - ease(frame, dim, 12) * 0.62);
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
  const handAt = n.word("lsp-hand", "Hand it a square");
  const sixteenAt = n.word("lsp-hand", "sixteen");
  const demandAt = n.word("lsp-rule", "mustn't demand more of its callers");
  const promiseAt = n.word("lsp-rule", "or promise them less");
  const whichAt = n.word("lsp-which", "The square promises less");
  const aloneAt = n.word("lsp-which", "no longer leaves the height alone");
  const fixAt = n.word("lsp-fix", "the fix isn't a cleverer square");
  const dontAt = n.word("lsp-fix", "Don't make a square a kind of resizable rectangle");
  const resizedAt = n.word("lsp-fix", "shapes that can't be resized");
  const siblingsAt = n.word("lsp-fix", "two siblings");
  const promiseKeptAt = n.word("lsp-fix", "both keep every promise");
  const end = n.beat("lsp-fix").to;
  // Once the fix is drawn, the run on the right is the old design: set back.
  const old = fixAt + 10;

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
  const setBack = 1 - ease(frame, old, 12) * 0.62;
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
        <Line x={X0} y={topRow - 60} at={trapAt} size={21} color={ACCENT_INK} weight={500} out={fixAt}>
          The classic trap
        </Line>
        <Line x={X0} y={topRow - 60} at={fixAt + 10} size={21} color={OK_INK} weight={500}>
          The fix
        </Line>
        <Box x={rectBox.x} y={rectBox.y} w={NODE.w} h={NODE.h} at={usableAt + 4} title={frame < rectAt ? "Parent" : "Rectangle"} lit={pulse(frame, rectAt, 20)} tones={[[siblingsAt + 10, "ok"]]} />
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
        <Line x={X0 + 92} y={(topRow + NODE.h + lowRow) / 2 - 14} at={usableAt + 16} size={21} color={INK_SOFT} weight={500} out={dontAt}>
          is a
        </Line>
        <Line x={X0} y={lowRow + NODE.h + 18} at={equalAt} size={21} color={INK_SOFT} weight={500} out={dontAt}>
          keeps width and height equal
        </Line>
        <Box x={shapeBox.x} y={shapeBox.y} w={shapeBox.w} h={shapeBox.h} at={siblingsAt} title="Shape" tone="ok" sub="each works out its own area" subSize={20} />
        <Flow points={[[X0 + NODE.w / 2, lowRow - 8], [X0 + NODE.w / 2, topRow + NODE.h + 8]]} at={siblingsAt + 14} dur={10} width={2.2} head={12} />
        <Flow points={[[X0 + 250 + NODE.w / 2, lowRow - 8], [X0 + 250 + NODE.w / 2, topRow + NODE.h + 8]]} at={siblingsAt + 18} dur={10} width={2.2} head={12} />
        <Line x={X0} y={lowRow + NODE.h + 18} at={resizedAt} size={22} weight={500} color={OK_INK}>
          Or: shapes that can&apos;t be resized
        </Line>

        <VRule x={(X0 + 250 + NODE.w + CALLER_X) / 2} top={topRow - 60} bottom={lowRow + NODE.h + 50} at={codeAt} />
        <VRule x={(RECT_X + LISKOV.width * UNIT + SQ_X) / 2} top={base - LISKOV.width * UNIT} bottom={base + 112} at={squareAt + 4} dim={old} />

        {/* The caller written for rectangles. */}
        <Line x={CALLER_X} y={topRow - 60} at={codeAt} size={21} color={INK_SOFT} weight={500} dim={old}>
          Code written for rectangles
        </Line>
        {[
          { at: widthAt, text: `sets the width to ${LISKOV.width}` },
          { at: heightAt, text: `sets the height to ${LISKOV.height}` },
          { at: expectsAt, text: `expects an area of ${LISKOV.width * LISKOV.height}` },
        ].map((s, i) => (
          <Line key={s.text} x={CALLER_X} y={topRow + i * 48} at={s.at} size={25} weight={i === 2 ? 700 : 500} dim={old}>
            <span style={{ color: INK_SOFT, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
            {"  "}
            {s.text}
          </Line>
        ))}

        {/* The rule, in plain words. */}
        <Line x={CALLER_X} y={y(764)} at={demandAt - 4} size={25} weight={500}>
          A subclass mustn&apos;t demand more of its callers,
        </Line>
        <Line x={CALLER_X} y={y(764) + 48} at={promiseAt - 2} size={25} weight={500}>
          or <Mark at={promiseAt + 4}>promise them less</Mark>.
        </Line>
        {/* Which half the square breaks: the caller's promise, "expected 20". */}
        <Line x={CALLER_X} y={y(764) + 104} at={whichAt} size={25} weight={500} color={ACCENT_INK} dim={old}>
          The square promises less: <span style={{ opacity: ease(frame, aloneAt, 10) }}>its width moves its height.</span>
        </Line>
        <Flow points={[[WHICH_END, y(764) + 120], [SQ_X + 60, y(764) + 120], [SQ_X + 60, y(BASE) + 128]]} at={whichAt + 8} dur={12} width={2.2} head={12} color={ACCENT} dim={old} />

        {/* The two shapes, to scale, each named under its base. */}
        <Shape x={RECT_X} base={base} w={rw} h={rh} at={rectAt} tone={rectDone ? "ok" : "data"} dim={old} />
        <Line x={RECT_X} y={base + 14} at={rectAt} size={21} color={INK_SOFT} weight={500} dim={old}>
          rectangle
        </Line>
        <Line x={RECT_X} y={base + 46} at={widthAt + 4} size={25} weight={500} color={rectDone ? OK_INK : INK} dim={old}>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            {Math.round(rw)} × {Math.round(rh)}
            {rectDone ? ` = ${LISKOV.rectangle}` : ""}
          </span>
        </Line>
        <Mark2 at={expectsAt + 8} kind="tick" size={30} style={{ left: RECT_X + 160, top: base + 48, opacity: setBack }} />

        <Shape x={SQ_X} base={base} w={sq} h={sq} at={squareAt + 4} tone={sqDone ? "bad" : "data"} dim={old} />
        <Line x={SQ_X} y={base + 14} at={squareAt + 4} size={21} color={INK_SOFT} weight={500} dim={old}>
          square
        </Line>
        <Line x={SQ_X} y={base + 46} at={handAt + 8} size={25} weight={500} color={sqDone ? ACCENT_INK : INK} dim={old}>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            {Math.round(sq)} × {Math.round(sq)}
            {sqDone ? ` = ${LISKOV.square}` : ""}
          </span>
        </Line>
        <Mark2 at={sixteenAt + 4} kind="cross" size={30} style={{ left: SQ_X + 160, top: base + 48, opacity: setBack }} />
        <Line x={SQ_X} y={base + 88} at={sixteenAt + 8} size={21} color={ACCENT_INK} weight={500} dim={old}>
          expected {LISKOV.width * LISKOV.height}
        </Line>
        <Line x={SQ_X} y={base + 46} at={tooAt} size={21} color={INK_SOFT} weight={500} out={handAt + 6}>
          width sets height
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
