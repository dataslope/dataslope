import React from "react";
import { AbsoluteFill } from "remotion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { INK, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { FILTER } from "./data";
import {
  colsOf,
  DataTable,
  Drift,
  ErrorBox,
  geoOf,
  Listing,
  listingHeight,
  MARK_BAD,
  MARK_OK,
  Mono,
  TableName,
  X0,
} from "./parts";

const TOP = 340;
const LIST_X = 900;
const LIST_W = 900;
const SIZE = 22;

/**
 * Question 2, boolean filtering, on the page's frame: the mask as a column
 * beside the rows it picks, the two North orders over 100 it keeps, then the
 * two ways the same filter fails, each with Python's own error.
 */
export const FilterScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("filter").from;
  const qAt = n.word("filter", "Question");
  const textAt = n.word("filter", "How does");
  const asked = n.beat("filter").to;
  const compAt = n.word("filter-mask", "A comparison");
  const maskAt = n.word("filter-mask", "called a mask");
  const ampAt = n.word("filter-mask", "with an ampersand");
  const passAt = n.word("filter-mask", "pass it to lock");
  const backAt = n.word("filter-mask", "The two North orders");
  const offAt = n.word("filter-parens", "Leave them off");
  const firstAt = n.word("filter-parens", "runs first");
  const typeAt = n.word("filter-parens", "type error");
  const andAt = n.word("filter-and", "the word and");
  const ambAt = n.word("filter-and", "ambiguous");
  const end = n.beat("groupby-in").to;

  const g = geoOf(FILTER.frame, X0, y(TOP), h);
  const mask = { cols: ["mask"], rows: FILTER.mask.rows.map((r) => [r[1]]) };
  const mg = geoOf(mask, g.right + 28, y(TOP), h);
  const kept = FILTER.mask.rows.flatMap((r, i) => (r[1] === "True" ? [i] : []));
  const lineH = listingHeight(1, SIZE);
  const resultTop = y(TOP) + lineH + h(30);
  const rg = geoOf(FILTER.result, LIST_X, resultTop + lineH + h(50), h);
  const andTop = y(TOP) + lineH + h(150);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={maskAt + 4} level={-34} />
      <Sfx name="el-pop" at={backAt + 4} level={-32} />
      <Sfx name="el-scratch" at={typeAt} level={-30} />
      <Sfx name="el-scratch" at={ambAt} level={-30} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={2} at={qAt - 4} textAt={textAt - 4}>
          How does boolean filtering work?
        </QuestionCard>

        {/* ── The page's frame, and its mask ── */}
        <TableName g={g} at={asked - 6}>
          df
        </TableName>
        <DataTable
          g={g}
          cols={colsOf(FILTER.frame)}
          at={asked - 6}
          rows={FILTER.frame.rows.map((cells, i) => ({ cells, at: asked - 2 + i * 2 }))}
          bands={kept.map((row, k) => ({ row, at: backAt + 4 + k * 4, out: offAt, color: MARK_OK }))}
        />
        <DataTable
          g={mg}
          cols={[{ name: "mask" }]}
          at={maskAt - 4}
          rows={mask.rows.map((cells, i) => ({ cells, at: maskAt + i * 2 }))}
          marks={kept.map((row, k) => ({ row, col: 0, at: ampAt + 6 + k * 4, out: offAt }))}
        />

        {/* ── The mask, and the rows it keeps ── */}
        <Listing lines={FILTER.mask.lines} x={LIST_X} top={y(TOP)} width={LIST_W} size={SIZE} at={compAt - 2} out={offAt - 2} />
        <Listing lines={FILTER.result.lines} x={LIST_X} top={resultTop} width={LIST_W} size={SIZE} at={passAt - 2} out={offAt - 2} />
        <DataTable
          g={rg}
          cols={colsOf(FILTER.result)}
          at={backAt - 4}
          rows={FILTER.result.rows.map((cells, i) => ({ cells, at: backAt + i * 3 }))}
          out={offAt - 2}
        />

        {/* ── Without brackets, and with the word `and` ── */}
        <Listing
          lines={FILTER.noParens.lines}
          x={LIST_X}
          top={y(TOP)}
          width={LIST_W}
          size={SIZE}
          at={offAt + 2}
          marks={[{ line: 0, at: firstAt, color: MARK_BAD }]}
        />
        <Note at={firstAt + 4} x={LIST_X} y={y(TOP) + lineH + h(10)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <Mono>100 &amp; df[&quot;region&quot;]</Mono> runs first
          </span>
        </Note>
        <ErrorBox
          x={LIST_X}
          top={y(TOP) + lineH + h(52)}
          width={LIST_W}
          at={typeAt - 2}
          kind={FILTER.noParens.kind}
          message={FILTER.noParens.message}
        />
        <Listing
          lines={FILTER.andWord.lines}
          x={LIST_X}
          top={andTop}
          width={LIST_W}
          size={SIZE}
          at={andAt - 4}
          marks={[{ line: 0, at: andAt + 6, color: MARK_BAD }]}
        />
        <ErrorBox
          x={LIST_X}
          top={andTop + lineH + h(12)}
          width={LIST_W}
          at={ambAt - 6}
          kind={FILTER.andWord.kind}
          message={FILTER.andWord.message}
        />
      </Drift>
    </AbsoluteFill>
  );
};
