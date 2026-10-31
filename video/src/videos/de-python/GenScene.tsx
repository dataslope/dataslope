import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, HAIRLINE, INK, INK_SOFT, PAPER, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { GEN, PIPE } from "./data";
import {
  Bars,
  bytes,
  Console,
  Drift,
  lineOf,
  Listing,
  listingHeight,
  Mark,
  MARK,
  MARK_BAD,
  MARK_OK,
  OK,
  OK_INK,
  Source,
  Title,
  X0,
} from "./parts";

const TOP = 322;
const SIZE = 22;
const RIGHT_X = 1000;
const BARS_Y = 676;
/** Where the notes on the 100,000-row bars start: past the longer one's value. */
const NOTE_X = 820;

/** Eight blocks in a row: a list (all of them at once) or a generator (one
 *  lit at a time, stepping along on demand). */
const Blocks: React.FC<{ x: number; top: number; at: number; out: number; one?: boolean; color: string }> = ({
  x,
  top,
  at,
  out,
  one = false,
  color,
}) => {
  const frame = useCurrentFrame();
  const o = 1 - ease(frame, out, 10);
  if (frame < at || o <= 0) return null;
  const lit = Math.floor((frame - at) / 12) % 8;
  return (
    <>
      {Array.from({ length: 8 }, (_, i) => {
        const p = ease(frame, at + (one ? 0 : i * 2), 10);
        const on = one ? i === lit : true;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + i * 62,
              top,
              width: 50,
              height: 50,
              borderRadius: 5,
              boxSizing: "border-box",
              border: `2px solid ${on ? color : `color-mix(in srgb, ${INK} 22%, transparent)`}`,
              background: on ? `color-mix(in srgb, ${color} 55%, ${PAPER})` : "transparent",
              opacity: p * o,
            }}
          />
        );
      })}
    </>
  );
};

/**
 * Questions 1 and 2. The page's parser, a list against a generator drawn as
 * blocks, then the same million-row file read both ways, its peak memory
 * measured in Pyodide: 62.6 MB against 149 KB, and at a tenth of the rows a
 * tenth of the list's memory beside the generator's same 149 KB. Question 2:
 * the three-stage pipeline in square brackets and in round ones (160 MB
 * against 150 KB), a row stepping through the generator stages, and the
 * trade-off: a generator summed twice gives the total, then zero.
 */
export const GenScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("gen").from;
  const qAt = n.word("gen", "Question one");
  const textAt = n.word("gen", "Why prefer a generator");
  const listAt = n.word("gen-yield", "A list holds every element at once");
  const genAt = n.word("gen-yield", "A generator yields one at a time");
  const parserAt = n.word("gen-yield", "The page's parser");
  const readsAt = n.word("gen-yield", "reads a line");
  const splitsAt = n.word("gen-yield", "splits it");
  const yieldsAt = n.word("gen-yield", "yields a name and a quantity");
  const millionAt = n.word("gen-million", "On a file of a million orders");
  const collectAt = n.word("gen-million", "collecting the rows in a list");
  const sixtyAt = n.word("gen-million", "sixty-three megabytes");
  const sumAt = n.word("gen-million", "Summing straight from the generator");
  const kbAt = n.word("gen-million", "about a hundred fifty kilobytes");
  const soAt = n.word("gen-flat", "and so does the list");
  const moveAt = n.word("gen-flat", "The generator doesn't move");
  const q2At = n.word("pipe", "Question two");
  const q2TextAt = n.word("pipe", "How do generator pipelines");
  const twiceAt = n.word("pipe-swap", "a three-stage pipeline, twice");
  const squareAt = n.word("pipe-swap", "With square brackets");
  const aliveAt = n.word("pipe-swap", "all three are alive at once");
  const mbAt = n.word("pipe-swap", "a hundred sixty megabytes");
  const roundAt = n.word("pipe-swap", "With round brackets");
  const passesAt = n.word("pipe-swap", "one row passes through all three");
  const placeAt = n.word("pipe-trade", "Lists still earn their place");
  const printAt = n.word("pipe-trade", "print one to debug it");
  const spentAt = n.word("pipe-trade", "A generator is spent after one pass");
  const zeroAt = n.word("pipe-trade", "you get zero");
  const smallAt = n.word("pipe-trade", "Lists for small data you rescan");
  const largeAt = n.word("pipe-trade", "generators for large or endless data");
  const end = n.beat("file-in").to;
  const out1 = q2At - 4;

  const P = GEN.parser;
  const L = GEN.list.lines;
  const G = GEN.gen.lines;
  const lTop = y(TOP);
  const gTop = lTop + listingHeight(L.length, SIZE) + h(56);

  const m = bytes(GEN.list.m);
  const k = bytes(GEN.list.k);
  const g1 = bytes(GEN.gen.m);
  const g2 = bytes(GEN.gen.k);

  // Question 2: the two pipelines side by side.
  const PL = PIPE.lists.lines;
  const PG = PIPE.gens.lines;
  const stages = ["lines = ", "rows = ", "qtys = "];
  const pipeH = listingHeight(PL.length, SIZE);
  const pBarsY = lTop + pipeH + h(72);
  const lp = bytes(PIPE.lists.peak);
  const gp = bytes(PIPE.gens.peak);
  // One row steps through the generator's three stages, over and over.
  const STEP = 14;
  const stepK = Math.max(0, Math.floor((frame - passesAt) / STEP));
  const stepMarks = frame >= passesAt ? [{ line: lineOf(PG, stages[stepK % 3]), at: passesAt + stepK * STEP, color: MARK_OK }] : [];
  const A = PIPE.again.lines;
  const againTop = pBarsY;
  const againH = listingHeight(A.length, SIZE);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={listAt + 2} level={-38} />
      <Sfx name="el-tap" at={readsAt} level={-36} />
      <Sfx name="el-tap" at={yieldsAt} level={-36} />
      <Sfx name="el-whoosh" at={sixtyAt - 6} level={-36} />
      <Sfx name="el-pop" at={kbAt} level={-33} />
      <Sfx name="el-tap" at={soAt} level={-35} />
      <Sfx name="el-pencil" at={squareAt} level={-36} />
      <Sfx name="el-whoosh" at={mbAt - 6} level={-36} />
      <Sfx name="el-pencil" at={roundAt} level={-36} />
      <Sfx name="el-scratch" at={zeroAt} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} out={out1} size={60}>
          Why prefer a generator over a list when processing large data?
        </QuestionCard>
        <QuestionCard n={2} at={q2At} textAt={q2TextAt - 2} size={60}>
          How do generator pipelines compare to building intermediate lists?
        </QuestionCard>

        {/* ── 1. A list against a generator, as blocks ── */}
        <Note at={listAt - 2} x={RIGHT_X} y={lTop - h(6)} out={millionAt - 6}>
          <Title color={ACCENT_INK}>a list: every element at once</Title>
        </Note>
        <Blocks x={RIGHT_X} top={lTop + h(36)} at={listAt + 2} out={millionAt - 6} color={ACCENT} />
        <Note at={genAt - 2} x={RIGHT_X} y={lTop + h(126)} out={millionAt - 6}>
          <Title color={OK_INK}>a generator: one at a time, on demand</Title>
        </Note>
        <Blocks x={RIGHT_X} top={lTop + h(168)} at={genAt + 4} out={millionAt - 6} one color={OK} />

        {/* ── The page's parser ── */}
        <Note at={parserAt - 4} x={X0} y={lTop - h(40)} out={out1}>
          <Title>the page&apos;s parser</Title>
        </Note>
        <Listing
          lines={P}
          x={X0}
          top={lTop}
          width={800}
          size={SIZE}
          at={parserAt - 2}
          out={out1}
          marks={[
            { line: lineOf(P, "for line in f"), at: readsAt, out: splitsAt },
            { line: lineOf(P, "split("), at: splitsAt, out: yieldsAt },
            { line: lineOf(P, "yield"), at: yieldsAt, color: MARK_OK },
          ]}
        />

        {/* ── The same file read both ways ── */}
        <Note at={collectAt - 4} x={RIGHT_X} y={lTop - h(40)} out={out1}>
          <Title color={ACCENT_INK}>held in a list</Title>
        </Note>
        <Listing
          lines={L}
          x={RIGHT_X}
          top={lTop}
          width={800}
          size={SIZE}
          at={collectAt - 2}
          out={out1}
          marks={[{ line: lineOf(L, "list(parse_rows"), at: collectAt + 6, color: MARK_BAD }]}
        />
        <Note at={sumAt - 4} x={RIGHT_X} y={gTop - h(40)} out={out1}>
          <Title color={OK_INK}>streamed by the generator</Title>
        </Note>
        <Listing
          lines={G}
          x={RIGHT_X}
          top={gTop}
          width={800}
          size={SIZE}
          at={sumAt - 2}
          out={out1}
          marks={[{ line: lineOf(G, "sum("), at: sumAt + 6, color: MARK_OK }]}
        />

        <Note at={millionAt} x={X0} y={y(BARS_Y) - h(44)} out={out1}>
          <span style={{ display: "flex", gap: 28, alignItems: "baseline", whiteSpace: "nowrap" }}>
            <Title>peak memory</Title>
            <Source>tracemalloc, in Pyodide: Python in WebAssembly</Source>
          </span>
        </Note>
        <Bars
          x={X0}
          top={y(BARS_Y)}
          width={1000}
          rowH={h(54)}
          nameW={420}
          out={out1}
          bars={[
            { name: "list, 1,000,000 rows", value: GEN.list.m, ...m, color: ACCENT, ink: ACCENT_INK, at: sixtyAt - 8 },
            { name: "generator, 1,000,000 rows", value: GEN.gen.m, ...g1, color: OK, ink: OK_INK, at: kbAt - 6 },
            { name: "list, 100,000 rows", value: GEN.list.k, ...k, color: ACCENT, ink: ACCENT_INK, at: soAt - 4 },
            { name: "generator, 100,000 rows", value: GEN.gen.k, ...g2, color: OK, ink: OK_INK, at: moveAt - 4 },
          ]}
        />
        <Note at={moveAt + 10} x={NOTE_X} y={y(BARS_Y) + 3 * h(54) + h(8)} out={out1}>
          <span style={{ ...note(24, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            <Mark at={moveAt + 16}>the same, whatever the input&apos;s size</Mark>
          </span>
        </Note>
        <Note at={soAt + 6} x={NOTE_X} y={y(BARS_Y) + 2 * h(54) + h(8)} out={out1}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>a tenth of the rows, a tenth of the memory</span>
        </Note>

        {/* ── 2. The pipeline, in square brackets and in round ones ── */}
        <Note at={squareAt - 4} x={X0} y={lTop - h(40)} dim={placeAt}>
          <Title color={ACCENT_INK}>square brackets: three lists</Title>
        </Note>
        <Listing
          lines={PL}
          x={X0}
          top={lTop}
          width={820}
          size={SIZE}
          at={twiceAt}
          dim={placeAt}
          marks={stages.map((s, i) => ({ line: lineOf(PL, s), at: aliveAt + i * 2, color: MARK_BAD }))}
        />
        <Note at={roundAt - 4} x={RIGHT_X} y={lTop - h(40)} dim={placeAt}>
          <Title color={OK_INK}>round brackets: three generators</Title>
        </Note>
        <Listing lines={PG} x={RIGHT_X} top={lTop} width={800} size={SIZE} at={roundAt - 2} dim={placeAt} marks={stepMarks} />

        <Note at={mbAt - 10} x={X0} y={pBarsY - h(42)} out={placeAt - 4}>
          <span style={{ display: "flex", gap: 28, alignItems: "baseline", whiteSpace: "nowrap" }}>
            <Title>peak memory</Title>
            <Source>tracemalloc, in Pyodide</Source>
          </span>
        </Note>
        <Bars
          x={X0}
          top={pBarsY}
          width={1000}
          rowH={h(56)}
          nameW={420}
          out={placeAt - 4}
          bars={[
            { name: "lists, 1,000,000 rows", value: PIPE.lists.peak, ...lp, color: ACCENT, ink: ACCENT_INK, at: mbAt - 8 },
            { name: "generators, 1,000,000 rows", value: PIPE.gens.peak, ...gp, color: OK, ink: OK_INK, at: passesAt },
          ]}
        />

        {/* ── The trade-off ── */}
        <Note at={printAt} x={X0} y={againTop - h(40)}>
          <Title>a generator, summed twice</Title>
        </Note>
        <Listing
          lines={A}
          x={X0}
          top={againTop}
          width={820}
          size={SIZE}
          at={spentAt - 6}
          marks={[{ line: lineOf(A, "second = sum"), at: zeroAt - 2, color: MARK_BAD }]}
        />
        <Console
          lines={[`(${PIPE.again.first}, ${PIPE.again.second})`]}
          x={X0}
          top={againTop + againH + h(16)}
          width={420}
          at={zeroAt - 4}
          marks={[{ line: 0, at: zeroAt + 2, color: MARK_BAD }]}
        />
        <Note at={printAt} x={RIGHT_X} y={againTop + h(6)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>a list: print it, read it twice</span>
        </Note>
        <Note at={smallAt} x={RIGHT_X} y={againTop + h(70)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <Mark at={smallAt + 4} color={MARK}>small data you rescan:</Mark> lists
          </span>
        </Note>
        <Note at={largeAt} x={RIGHT_X} y={againTop + h(122)}>
          <span style={{ ...note(26, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            <Mark at={largeAt + 4} color={MARK_OK}>large or endless data:</Mark> generators
          </span>
        </Note>
        {/* A thin rule between the two halves of the trade-off. */}
        <div
          style={{
            position: "absolute",
            left: RIGHT_X - 40,
            top: againTop,
            width: 1,
            height: h(170) * ease(frame, printAt, 14),
            background: HAIRLINE,
          }}
        />
      </Drift>
    </AbsoluteFill>
  );
};
