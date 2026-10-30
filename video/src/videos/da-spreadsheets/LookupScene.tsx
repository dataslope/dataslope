import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { ds, inkOf } from "../../theme/brand";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { type Cell, isError, LOOKUPS, printed, screen } from "./data";
import { Drift, ElbowArrow, FormulaBar, Mark, MARK, MARK_BAD, MARK_OK, Mono, RangeBox, Sheet, sheetGeometry, X0 } from "./parts";

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
  const vertAt = n.word("lookup-what", "short for vertical lookup");
  const firstColAt = n.word("lookup-what", "the first column of a range");
  const rightAt = n.word("lookup-what", "a column to its right");
  const byNumberAt = n.word("lookup-what", "by number");
  const nineAt = n.word("lookup-what", "nine dollars");
  const onlyRightAt = n.word("lookup-limits", "It only looks right");
  const skuAt = n.word("lookup-limits", "stock-keeping unit");
  const searchAt = n.word("lookup-limits", "searches the SKU column");
  const naAt = n.word("lookup-limits", "comes back NA");
  const typedAt = n.word("lookup-limits", "column number is typed in");
  const insertAt = n.word("lookup-limits", "Insert a category column");
  const kitchenAt = n.word("lookup-limits", "comes back as kitchen");
  const q4At = n.word("index", "Question four");
  const q4TextAt = n.word("index", "How does index match");
  const matchAt = n.word("index-match", "Match finds the position");
  const secondAt = n.word("index-second", "Mug is second");
  const zeroAt = n.word("index-second", "the zero asks");
  const indexAt = n.word("index-left", "Index returns what sits");
  const leftAt = n.word("index-left", "find mug among the names");
  const skuBackAt = n.word("index-left", "return its SKU");
  const rangesAt = n.word("index-ranges", "points at ranges");
  const afterAt = n.word("index-ranges", "after the insert");
  const movesAt = n.word("index-ranges", "moves with the data");
  const stillAt = n.word("index-ranges", "still costs nine");
  const q5At = n.word("xlookup", "Question five");
  const q5TextAt = n.word("xlookup", "What does X lookup");
  const newerAt = n.word("xlookup-newer", "the newer lookup");
  const olderAt = n.word("xlookup-newer", "older versions");
  const arraysAt = n.word("xlookup-what", "A lookup array and a return array");
  const exactAt = n.word("xlookup-what", "Exact match by default");
  const notFoundAt = n.word("xlookup-what", "says not found");
  const bridgeAt = n.beat("approx-in").from;
  const forgetAt = n.word("approx-in", "the argument everyone forgets");
  const limitsAt = n.word("lookup", "what are its limits");
  const end = n.beat("approx-in").to;

  const L = LOOKUPS;
  const A = L.after;
  const g = sheetGeometry({ x: X0, top: y(SHEET_Y), widths: [116, 150, 106], rows: 5, rowH: h(ROW) });
  const products = L.products.map((r, i) => r.map((v, c) => (i > 0 && c === 2 ? money(v) : String(v))));
  const category = L.inserted.map((r) => printed(r[2]));
  // Question 4 shows the sheet as the price formula was written, before the
  // insert, then the insert again: the range moves with the prices.
  const replay = { close: rangesAt, open: afterAt + 4 };
  const ins = { c: 2, at: insertAt, width: INSERT_W, values: category, replay };
  const shift = { c: 2, at: insertAt, width: INSERT_W, replay };
  const mug = 3; // the mug's sheet row
  const slot = (k: number) => y(SHEET_Y) - h(10) + k * h(66);
  const out3 = q4At - 4;
  const out4 = q5At - 4;
  const RANGE = `color-mix(in srgb, ${ds("yellow", 400)} 60%, transparent)`;
  // Where the mug sits in the name column B2:B5: MATCH's answer.
  const position = Number(A.matchMug.value);
  if (L.products[position][1] !== "Mug") throw new Error(`MATCH says ${position}, but the mug is elsewhere`);
  if (printed(A.leftward.value) !== printed(L.leftward.value)) throw new Error("the leftward lookup changed with the insert");

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
          at={limitsAt - 4}
          cellAt={(r) => limitsAt - 2 + (r - 1) * 3}
          bold={(r) => r === 1}
          size={25}
          insert={ins}
          fills={[
            { r: mug, c: 0, at: firstColAt, out: onlyRightAt, color: MARK },
            { r: mug, c: 2, at: nineAt - 2, out: insertAt, color: MARK_OK },
            { r: mug, c: 2, at: kitchenAt - 2, out: q4At, color: MARK_BAD, inserted: true },
            // "Mug is second": second in B2:B5, on the sheet's row 3.
            { r: mug, c: 1, at: secondAt, out: rangesAt, color: MARK },
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
        {/* At the insert Excel widens both ranges to A2:D5, and leaves the 3 alone. */}
        <FormulaBar
          x={BAR_X}
          top={slot(0)}
          width={BAR_W}
          formula={screen(L.vlookup)}
          at={vertAt}
          result={result(L.vlookup)}
          resultAt={nineAt - 2}
          tone="ok"
          rewrite={{
            at: insertAt + 12,
            formula: screen(A.vlookup),
            marks: [{ text: "A2:D5", color: RANGE }],
            result: result(A.vlookup),
            resultAt: kitchenAt - 2,
            tone: "bad",
          }}
          out={out3}
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
          rewrite={{ at: insertAt + 12, formula: screen(A.leftward), marks: [{ text: "A2:D5", color: RANGE }] }}
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
          marks={[{ text: "0", color: MARK, at: zeroAt }]}
          out={out4}
        />
        {/* MATCH on its own: the mug's position in B2:B5. */}
        <FormulaBar
          x={BAR_X}
          top={slot(1)}
          width={BAR_W}
          formula={screen(A.matchMug)}
          at={secondAt - 6}
          typeDur={10}
          result={printed(A.matchMug.value)}
          resultAt={secondAt + 2}
          marks={[{ text: "0", color: MARK, at: zeroAt }]}
          out={rangesAt}
        />
        <Note at={zeroAt} x={BAR_X} y={slot(2) - h(6)} out={rangesAt}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
            <b style={{ color: INK }}>0</b>: exact match, like VLOOKUP&apos;s <Mono>FALSE</Mono>
          </span>
        </Note>
        <Note at={indexAt + 6} x={BAR_X} y={slot(2) + h(40)} out={rangesAt}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
            <b style={{ color: INK }}>INDEX</b> takes position {position} of A2:A5: {result(A.indexMatchSku)}
          </span>
        </Note>
        {/* Positions within B2:B5, MATCH's count, beside the sheet's own row numbers. */}
        {L.products.slice(1).map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: g.x + g.width + INSERT_W + 10,
              top: g.rowTop(i + 2),
              height: g.rowH,
              display: "flex",
              alignItems: "center",
              ...label(i + 1 === position ? 22 : 20, i + 1 === position ? inkOf.teal : INK_SOFT),
              fontWeight: i + 1 === position ? 700 : 500,
              opacity: ease(frame, matchAt + 8 + i * 3, 10) * (1 - ease(frame, rangesAt, 10)),
              ...TABULAR,
            }}
          >
            {i + 1}
          </div>
        ))}
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
        {/* The price formula as it was written, before the insert; the insert
            opens again and Excel rewrites C2:C5 as D2:D5. */}
        <FormulaBar
          x={BAR_X}
          top={slot(1)}
          width={BAR_W}
          formula={screen(L.indexMatchPrice)}
          at={rangesAt + 12}
          typeDur={12}
          marks={[{ text: "C2:C5", color: RANGE }]}
          rewrite={{ at: movesAt, formula: screen(A.indexMatchPrice), marks: [{ text: "D2:D5", color: RANGE }] }}
          result={result(A.indexMatchPrice)}
          resultAt={stillAt - 2}
          tone="ok"
          out={out4}
        />
        <RangeBox g={g} r0={2} r1={5} c0={2} c1={2} at={rangesAt + 18} out={out4} color={ds("purple", 500)} shiftAt={shift} />
        <Note at={rangesAt + 16} x={BAR_X} y={slot(2) - h(6)} out={movesAt}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
            written before the insert: <b style={{ color: INK }}>C2:C5</b>, the prices
          </span>
        </Note>
        <Note at={movesAt + 4} x={BAR_X} y={slot(2) - h(6)} out={out4}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
            after it, Excel rewrites the range: <b style={{ color: INK }}>D2:D5</b>, still the prices
          </span>
        </Note>

        {/* ── Question 5: XLOOKUP ── */}
        <Note at={newerAt - 2} x={BAR_X} y={slot(0) - h(4)} out={arraysAt}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
            the newer lookup: <b style={{ color: INK }}>Excel 365 and 2021 or later</b>
          </span>
        </Note>
        <Note at={olderAt - 2} x={BAR_X} y={slot(0) + h(40)} out={arraysAt}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>older versions don&apos;t have it</span>
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
          out={bridgeAt}
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
          out={bridgeAt}
        />
        {/* The bridge: the argument question 6 is about, VLOOKUP's, with XLOOKUP gone. */}
        <Note at={forgetAt} x={BAR_X} y={slot(1)}>
          <span style={{ ...note(30, INK), whiteSpace: "nowrap" }}>
            VLOOKUP&apos;s fourth argument: <Mark at={forgetAt + 10}>
              <Mono>FALSE</Mono>
            </Mark>
          </span>
        </Note>
        <Note at={notFoundAt + 6} x={BAR_X} y={slot(2) - h(6)} out={bridgeAt}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>no IFERROR around it</span>
        </Note>
        <Note at={exactAt} x={BAR_X} y={slot(2) + h(40)} out={bridgeAt}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>exact match unless you ask otherwise</span>
        </Note>
        <RangeBox g={g} r0={2} r1={5} c0={1} c1={1} at={arraysAt + 6} out={exactAt + 4} color={ds("teal", 500)} />
        <RangeBox g={g} r0={2} r1={5} c0={0} c1={0} at={arraysAt + 10} out={exactAt + 4} color={ds("purple", 500)} />
      </Drift>
    </AbsoluteFill>
  );
};
