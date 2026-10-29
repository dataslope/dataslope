import React from "react";
import { AbsoluteFill } from "remotion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, INK, INK_SOFT, TABULAR, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { VECTOR } from "./data";
import {
  Bars,
  colsOf,
  DataTable,
  Drift,
  geoOf,
  FadeIn,
  Listing,
  listingHeight,
  Mark,
  MARK_BAD,
  MARK_OK,
  OK,
  OK_INK,
  Source,
  TableName,
  X0,
} from "./parts";

const TOP = 340;
const SIZE = 22;
const TABLE_X = 1080;
const BARS_Y = 744;

/**
 * Question 1, on the page's five prices and quantities: the loop (four
 * lines, a multiplication per row in Python) against the vectorized line (one
 * call into NumPy), the same revenues either way. Then the same product on a
 * million rows, timed in Pyodide: two bars, a few hundred ms against ~1 ms,
 * the ratio printed beside the typical 10-100x. Then the follow-up: why the
 * loop is slow (marked on its lines), and .apply with a lambda, which takes
 * the df table's place, as the same loop.
 */
export const VectorScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("vector").from;
  const qAt = n.word("vector", "Question");
  const textAt = n.word("vector", "Why is vectorization");
  const asked = n.beat("vector").to;
  const fiveAt = n.word("vector-loop", "five prices and quantities");
  const loopAt = n.word("vector-loop", "The loop walks the rows");
  const pyAt = n.word("vector-loop", "multiplying in Python");
  const vecAt = n.word("vector-loop", "The vectorized line");
  const numpyAt = n.word("vector-loop", "which multiplies them in compiled code");
  const oneAt = n.word("vector-loop", "in one call");
  const sameAt = n.word("vector-loop", "The revenues are the same");
  const millionAt = n.word("vector-time", "On a million rows");
  const wasmAt = n.word("vector-time", "timed in WebAssembly");
  const loopTimeAt = n.word("vector-time", "several hundred milliseconds");
  const msAt = n.word("vector-time", "takes about one");
  const hundredsAt = n.word("vector-ratio", "hundreds of times faster");
  const laptopAt = n.word("vector-ratio", "On a laptop");
  const objectAt = n.word("vector-why", "each number becomes a Python object");
  const typeAt = n.word("vector-why", "its type is checked");
  const applyAt = n.word("vector-why", "Apply with a lambda");
  const stillAt = n.word("vector-why", "still a loop");
  const onlyAt = n.word("vector-only", "Write a loop only");
  const patternAt = n.word("split-in", "the pattern under every groupby");
  const end = n.beat("split-in").to;

  const L = VECTOR.loop;
  const V = VECTOR.vectorized;
  const loopH = listingHeight(L.lines.length, SIZE);
  const vecTop = y(TOP) + loopH + h(74);
  const g = geoOf(L, TABLE_X, y(TOP), h, { rowH: 52 });
  const rev = L.cols.indexOf("revenue");
  const A = VECTOR.apply;
  const applyH = listingHeight(A.lines.length, SIZE);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={pyAt + 4} level={-34} />
      <Sfx name="el-pencil" at={oneAt} level={-34} />
      <Sfx name="el-pop" at={sameAt + 4} level={-32} />
      <Sfx name="el-whoosh" at={loopTimeAt} level={-36} />
      <Sfx name="el-pop" at={hundredsAt} level={-32} />
      <Sfx name="el-tap" at={applyAt} level={-35} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} size={62}>
          Why is vectorization preferred over Python loops?
        </QuestionCard>

        {/* ── The loop, and the one line ── */}
        <Note at={loopAt - 4} x={X0} y={y(TOP) - h(40)} dim={onlyAt + 4}>
          <span style={{ ...note(22, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>a Python loop</span>
        </Note>
        <Listing
          lines={L.lines}
          x={X0}
          top={y(TOP)}
          width={680}
          size={SIZE}
          at={asked - 6}
          lineAt={L.lines.map((_, i) => loopAt - 4 + i * 5)}
          marks={[
            { line: 1, at: loopAt + 6, out: vecAt - 2 },
            { line: 2, at: pyAt, out: vecAt - 2 },
            { line: 1, at: objectAt, out: onlyAt },
            { line: 2, at: typeAt, out: onlyAt },
          ]}
          dim={onlyAt + 4}
        />
        <Note at={vecAt - 4} x={X0} y={vecTop - h(40)}>
          <span style={{ ...note(22, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>vectorized</span>
        </Note>
        <Listing
          lines={V.lines}
          x={X0}
          top={vecTop}
          width={680}
          size={SIZE}
          at={vecAt - 2}
          marks={[{ line: 0, at: oneAt, color: MARK_OK }]}
        />
        <Note at={numpyAt + 4} x={X0 + 700} y={vecTop + 20}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>one call into NumPy</span>
        </Note>

        {/* ── The page's frame, and the revenues both ways ── */}
        <TableName g={g} at={fiveAt - 4} out={applyAt - 8}>
          df
        </TableName>
        <DataTable
          g={g}
          cols={colsOf(L, { revenue: { at: pyAt, ink: BLUE_INK } })}
          at={fiveAt - 4}
          out={applyAt - 8}
          rows={L.rows.map((cells, i) => ({ cells, at: fiveAt + i * 2 }))}
          marks={L.rows.map((_, row) => ({ row, col: rev, at: sameAt + row * 3, color: MARK_OK }))}
        />

        {/* ── apply with a lambda, in the table's place: the same loop ── */}
        <Note at={applyAt - 2} x={TABLE_X} y={y(TOP) - h(40)} dim={onlyAt + 4}>
          <span style={{ ...note(22, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>apply with a lambda</span>
        </Note>
        <Listing
          lines={A.lines}
          x={TABLE_X}
          top={y(TOP)}
          width={680}
          size={SIZE}
          at={applyAt}
          marks={[{ line: 1, at: stillAt - 2, color: MARK_BAD }]}
          dim={onlyAt + 4}
        />
        <Note at={stillAt} x={TABLE_X} y={y(TOP) + applyH + h(20)} dim={onlyAt + 4}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            a Python call per row: still a loop
          </span>
        </Note>

        {/* ── A million rows, timed ── */}
        <Bars
          x={X0}
          top={y(BARS_Y)}
          width={1060}
          rowH={h(66)}
          nameW={240}
          bars={[
            {
              name: "the loop",
              value: VECTOR.loopMs,
              text: `${Math.round(VECTOR.loopMs)} ms`,
              color: ACCENT,
              ink: ACCENT_INK,
              at: loopTimeAt - 6,
            },
            {
              name: "vectorized",
              value: VECTOR.vecMs,
              text: `${VECTOR.vecMs.toFixed(1)} ms`,
              color: OK,
              ink: OK_INK,
              at: msAt - 4,
            },
          ]}
        />
        <Note at={millionAt} x={X0} y={y(BARS_Y) - h(46)}>
          <span style={{ ...note(24, INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>1,000,000 rows</span>
        </Note>
        <Note at={wasmAt + 4} x={X0 + 240} y={y(BARS_Y) - h(44)}>
          <Source>timed in Pyodide, Python in WebAssembly; a laptop will differ</Source>
        </Note>
        <Note at={hundredsAt} x={X0 + 600} y={y(BARS_Y) + h(66) + h(16)}>
          <span style={{ ...note(30, INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>
            <Mark at={hundredsAt + 6} out={patternAt + 4}>
              about {VECTOR.ratio}× faster here
            </Mark>
            <FadeIn at={laptopAt}>
              <span style={{ ...note(24, INK_SOFT), fontWeight: 400, marginLeft: "0.8em" }}>
                on a laptop, 10–100× is typical
              </span>
            </FadeIn>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
