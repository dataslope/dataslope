import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { type Cell, isError, LOOKUPS, printed, screen } from "./data";
import { Drift, ElbowArrow, FormulaBar, MARK, MARK_BAD, MARK_OK, RangeBox, Sheet, sheetGeometry, X0 } from "./parts";

const SHEET_Y = 400;
const ROW = 56;
const BAR_X = 730;
const BAR_W = 1060;
const INSERT_W = 140;

/** A product's price as the sheet formats it. */
const money = (v: unknown) => (typeof v === "number" ? v.toFixed(2) : String(v));

/** A lookup's result as its cell shows it: a price to the cent, an error as its code. */
const result = (c: Cell) => (typeof c.value === "number" ? money(c.value) : printed(c.value));

/**
 * Questions 3, 4 and 5 on the video's own product list. VLOOKUP counts three
 * columns to the price; looking for the mug's SKU it searches the SKU column
 * and finds nothing; a category column opens where the price was, and the
 * same formula, its range widened by Excel to A2:D5 but its 3 still typed in,
 * returns "Kitchen". INDEX/MATCH looks left, and after the insert still finds
 * 9.00; XLOOKUP looks either way and says "Not found" on its own.
 */
export const LookupScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("lookup").from;
  const qAt = n.word("lookup", "Question");
  const textAt = n.word("lookup", "What is V lookup");
  const asked = n.beat("lookup").to;
  const vertAt = n.word("lookup-what", "short for vertical lookup");
  const firstColAt = n.word("lookup-what", "the first column of a range");
  const rightAt = n.word("lookup-what", "a column to its right");
  const byNumberAt = n.word("lookup-what", "by number");
  const nineAt = n.word("lookup-what", "nine dollars");
  const onlyRightAt = n.word("lookup-limits", "It only looks right");
  const skuAt = n.word("lookup-limits", "stock-keeping unit");
  const searchAt = n.word("lookup-limits", "searches the S K U column");
  const naAt = n.word("lookup-limits", "comes back N A");
  const typedAt = n.word("lookup-limits", "column number is typed in");
  const insertAt = n.word("lookup-limits", "Insert a category column");
  const kitchenAt = n.word("lookup-limits", "comes back as kitchen");
  const q4At = n.word("index", "Question four");
  const q4TextAt = n.word("index", "How does index match");
  const matchAt = n.word("index", "Match finds the position");
  const indexAt = n.word("index", "Index returns what sits");
  const leftAt = n.word("index", "find mug among the names");
  const skuBackAt = n.word("index", "return its S K U");
  const rangesAt = n.word("index", "points at ranges");
  const stillAt = n.word("index", "still costs nine");
  const q5At = n.word("xlookup", "Question five");
  const q5TextAt = n.word("xlookup", "What does X lookup");
  const newerAt = n.word("xlookup", "the newer lookup");
  const arraysAt = n.word("xlookup", "a lookup array and a return array");
  const exactAt = n.word("xlookup", "Exact match by default");
  const notFoundAt = n.word("xlookup", "says not found");
  const end = n.beat("approx-in").to;

  const L = LOOKUPS;
  const A = L.after;
  const g = sheetGeometry({ x: X0, top: y(SHEET_Y), widths: [116, 150, 106], rows: 5, rowH: h(ROW) });
  const products = L.products.map((r, i) => r.map((v, c) => (i > 0 && c === 2 ? money(v) : String(v))));
  const category = L.inserted.map((r) => printed(r[2]));
  const ins = { c: 2, at: insertAt, width: INSERT_W, values: category };
  const shift = { c: 2, at: insertAt, width: INSERT_W };
  const mug = 3; // the mug's sheet row
  const slot = (k: number) => y(SHEET_Y) - h(10) + k * h(66);
  const out3 = q4At - 4;
  const out4 = q5At - 4;

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={byNumberAt} level={-34} />
      <Sfx name="el-pop" at={nineAt} level={-32} />
      <Sfx name="el-scratch" at={naAt + 2} level={-32} />
      <Sfx name="el-whoosh" at={insertAt + 2} level={-36} />
      <Sfx name="el-scratch" at={kitchenAt} level={-30} />
      <Sfx name="el-pop" at={stillAt} level={-32} />
      <Sfx name="el-pop" at={notFoundAt} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} out={out3}>
          What is VLOOKUP, and what are its limits?
        </QuestionCard>
        <QuestionCard n={4} at={q4At} textAt={q4TextAt - 2} out={out4}>
          How does INDEX/MATCH work, and why is it more robust?
        </QuestionCard>
        <QuestionCard n={5} at={q5At} textAt={q5TextAt - 2}>
          What does XLOOKUP improve over both?
        </QuestionCard>

        {/* ── The product list ── */}
        <Sheet
          g={g}
          values={products}
          at={asked - 8}
          cellAt={(r) => asked - 6 + (r - 1) * 3}
          bold={(r) => r === 1}
          size={25}
          insert={ins}
          fills={[
            { r: mug, c: 0, at: firstColAt, out: onlyRightAt, color: MARK },
            { r: mug, c: 2, at: nineAt - 2, out: insertAt, color: MARK_OK },
            { r: mug, c: 2, at: kitchenAt - 2, out: q4At, color: MARK_BAD, inserted: true },
          ]}
        />
        <Note at={skuAt - 2} x={X0} y={g.bottom + h(18)}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
            <b>sku</b>: stock-keeping unit, a product&apos;s code
          </span>
        </Note>
        {/* VLOOKUP counts columns from its range's left edge. */}
        {["1", "2", "3"].map((k, c) => (
          <div
            key={k}
            style={{
              position: "absolute",
              left: g.xs[c],
              width: c === 2 && frame >= insertAt ? INSERT_W : g.widths[c],
              top: g.top - 34,
              textAlign: "center",
              ...label(20, c === 2 && frame >= kitchenAt - 2 ? ACCENT_INK : INK_SOFT),
              opacity: ease(frame, byNumberAt + c * 3, 10) * (1 - ease(frame, out3, 10)),
              ...TABULAR,
            }}
          >
            {k}
          </div>
        ))}

        {/* ── Question 3 ── */}
        <FormulaBar
          x={BAR_X}
          top={slot(0)}
          width={BAR_W}
          formula={screen(L.vlookup)}
          at={vertAt}
          result={result(L.vlookup)}
          resultAt={nineAt - 2}
          tone="ok"
          out={insertAt + 10}
        />
        <RangeBox g={g} r0={2} r1={5} c0={0} c1={2} at={firstColAt + 4} out={onlyRightAt} />
        <ElbowArrow
          points={[
            [g.colMid(0) + 30, g.rowTop(mug) + g.rowH * 0.86],
            [g.xs[2] + 14, g.rowTop(mug) + g.rowH * 0.86],
          ]}
          at={rightAt}
          color={ds("blue", 500)}
          width={2.4}
          out={onlyRightAt}
        />
        <FormulaBar
          x={BAR_X}
          top={slot(1)}
          width={BAR_W}
          formula={screen(L.leftward)}
          at={onlyRightAt + 6}
          result={result(L.leftward)}
          resultAt={naAt}
          tone="bad"
          out={out3}
        />
        <RangeBox g={g} r0={2} r1={5} c0={0} c1={0} at={searchAt} out={insertAt} color={ACCENT} dash />
        <Note at={naAt + 6} x={BAR_X} y={slot(2) - h(6)} out={out3}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
            <b style={{ color: ACCENT_INK }}>#N/A</b>: not available, no match found
          </span>
        </Note>
        <Note at={typedAt - 2} x={BAR_X} y={slot(2) + h(40)} out={out3}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>the 3 is typed in</span>
        </Note>
        <FormulaBar
          x={BAR_X}
          top={slot(0)}
          width={BAR_W}
          formula={screen(A.vlookup)}
          at={insertAt + 12}
          typeDur={10}
          result={result(A.vlookup)}
          resultAt={kitchenAt - 2}
          tone="bad"
          marks={[{ text: "A2:D5", color: `color-mix(in srgb, ${ds("yellow", 400)} 60%, transparent)` }]}
          out={out3}
        />

        {/* ── Question 4: INDEX/MATCH ── */}
        <FormulaBar
          x={BAR_X}
          top={slot(0)}
          width={BAR_W}
          formula={screen(A.indexMatchSku)}
          at={matchAt}
          result={result(A.indexMatchSku)}
          resultAt={skuBackAt}
          tone="ok"
          out={out4}
        />
        <RangeBox g={g} r0={2} r1={5} c0={1} c1={1} at={matchAt + 6} out={rangesAt} color={ds("teal", 500)} />
        <RangeBox g={g} r0={2} r1={5} c0={0} c1={0} at={indexAt} out={rangesAt} color={ds("purple", 500)} />
        <ElbowArrow
          points={[
            [g.xs[1] + 20, g.rowTop(mug) + g.rowH * 0.86],
            [g.xs[0] + 16, g.rowTop(mug) + g.rowH * 0.86],
          ]}
          at={leftAt}
          color={ds("purple", 500)}
          width={2.4}
          out={rangesAt}
        />
        <FormulaBar
          x={BAR_X}
          top={slot(1)}
          width={BAR_W}
          formula={screen(A.indexMatchPrice)}
          at={rangesAt}
          result={result(A.indexMatchPrice)}
          resultAt={stillAt - 2}
          tone="ok"
          out={out4}
        />
        <RangeBox g={g} r0={2} r1={5} c0={2} c1={2} at={rangesAt + 8} out={out4} color={ds("purple", 500)} shiftAt={shift} />

        {/* ── Question 5: XLOOKUP ── */}
        <Note at={newerAt - 2} x={BAR_X} y={slot(0) - h(4)} out={arraysAt}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>the newer lookup, in current Excel</span>
        </Note>
        <FormulaBar
          x={BAR_X}
          top={slot(0)}
          width={BAR_W}
          formula={screen(A.xlookupLeft)}
          at={arraysAt}
          result={result(A.xlookupLeft)}
          resultAt={exactAt - 4}
          tone="ok"
        />
        <FormulaBar
          x={BAR_X}
          top={slot(1)}
          width={BAR_W}
          formula={screen(A.xlookupMissing)}
          at={exactAt + 4}
          result={result(A.xlookupMissing)}
          resultAt={notFoundAt - 2}
          tone={isError(A.xlookupMissing.value) ? "bad" : "ok"}
        />
        <Note at={notFoundAt + 6} x={BAR_X} y={slot(2) - h(6)}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>no IFERROR around it</span>
        </Note>
        <Note at={exactAt} x={BAR_X} y={slot(2) + h(40)}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>exact match unless you ask otherwise</span>
        </Note>
        <RangeBox g={g} r0={2} r1={5} c0={1} c1={1} at={arraysAt + 6} out={exactAt + 4} color={ds("teal", 500)} />
        <RangeBox g={g} r0={2} r1={5} c0={0} c1={0} at={arraysAt + 10} out={exactAt + 4} color={ds("purple", 500)} />
      </Drift>
    </AbsoluteFill>
  );
};
