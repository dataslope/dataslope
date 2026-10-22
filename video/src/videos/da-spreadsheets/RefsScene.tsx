import React from "react";
import { AbsoluteFill } from "remotion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, INK, INK_SOFT, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { type Cell, LOOKUPS, PIVOT, printed, REFERENCES, screen } from "./data";
import { Drift, FormulaBar, MARK, MARK_BAD, MARK_OK, RangeBox, Sheet, sheetGeometry, X0 } from "./parts";

const SHEET_Y = 400;
const ROW = 48;
const BAR_X = 860;
const BAR_W = 940;

const money = (c: Cell) => (typeof c.value === "number" ? c.value.toFixed(2) : printed(c.value));
const LOCK = `color-mix(in srgb, ${ds("yellow", 400)} 70%, transparent)`;

/**
 * Questions 7 and 8. The page's $F$1 tax rate filled down three amounts: with
 * dollar signs every row reads F1; without them the second row reads F2, an
 * empty cell, and pays no tax. Then the cross-tab's own SUMIFS from question
 * 2, where $F and $1 lock one side each. Question 8 runs four lookups
 * through IFERROR and IFNA: IFERROR turns all three failures into "Unknown",
 * IFNA only the not-available one, and the broken formula shows #REF!.
 */
export const RefsScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("refs").from;
  const qAt = n.word("refs", "Question");
  const textAt = n.word("refs", "Explain absolute");
  const asked = n.beat("refs").to;
  const shiftsAt = n.word("refs-fill", "A relative reference shifts");
  const staysAt = n.word("refs-fill", "stays put");
  const fillAt = n.word("refs-fill", "Fill down");
  const everyAt = n.word("refs-fill", "every row uses the tax rate");
  const offAt = n.word("refs-fill", "Leave the dollars off");
  const f2At = n.word("refs-fill", "multiplies by F two");
  const zeroAt = n.word("refs-fill", "zero tax");
  const mixedAt = n.word("refs-mixed", "A mixed reference");
  const lockAt = n.word("refs-mixed", "locks the region's column");
  const rowAt = n.word("refs-mixed", "the month's row");
  const wholeAt = n.word("refs-mixed", "fills the whole grid");
  const q8At = n.word("iferror", "Question eight");
  const q8TextAt = n.word("iferror", "What does if error do");
  const asked8 = n.beat("iferror").to;
  const swapsAt = n.word("iferror-what", "swaps an error for a fallback");
  const honestAt = n.word("iferror-what", "unknown is honest");
  const hidesAt = n.word("iferror-trap", "hides every error");
  const spaceAt = n.word("iferror-trap", "a stray space");
  const fourthAt = n.word("iferror-trap", "a fourth column");
  const bothAt = n.word("iferror-trap", "both come back unknown");
  const causeAt = n.word("iferror-trap", "Fix the cause first");
  const ifnaAt = n.word("iferror-trap", "If N A catches only");
  const showAt = n.word("iferror-trap", "lets the broken formula show");
  const end = n.beat("tool-in").to;

  // ── Question 7: the tax sheet ──
  const R = REFERENCES;
  const g = sheetGeometry({ x: X0, top: y(SHEET_Y), widths: [104, 104, 104, 30, 76, 76], rows: 4, rowH: h(ROW) });
  const rate = `${Math.round(Number(R.rows[0][5]) * 100)}%`;
  const sheet = [
    ["amount", "with $", "no $", "", "rate", rate],
    ...R.rows.slice(1).map((r, i) => [String(r[0]), money(R.absolute[i]), money(R.relative[i]), "", "", ""]),
  ];
  const absAt = (i: number) => fillAt + 6 + i * 8;
  const relAt = (i: number) => offAt + 4 + i * 10;
  const out7 = q8At - 4;
  const bar = (c: Cell, at: number, out: number, tone: "ok" | "bad" | "plain" = "plain", marks?: { text: string; color: string }[]) => (
    <FormulaBar
      key={`${c.ref}-${at}`}
      x={X0}
      top={y(SHEET_Y) - h(70)}
      width={620}
      cell={c.ref}
      formula={c.formula ?? ""}
      at={at}
      typeDur={10}
      out={out}
      tone={tone}
      marks={marks}
    />
  );

  // ── Question 8: four lookups, two ways ──
  const L = LOOKUPS;
  const lg = sheetGeometry({ x: X0, top: y(SHEET_Y), widths: [290, 150, 150], rows: 5, rowH: h(ROW) });
  const lookups = [
    ["looks up", "IFERROR", "IFNA"],
    ["P-102", printed(L.iferrorFound.value), printed(L.ifnaFound.value)],
    ["P-109", printed(L.iferrorMissing.value), printed(L.ifnaMissing.value)],
    ['"P-102 " (stray space)', printed(L.iferrorSpace.value), printed(L.ifnaSpace.value)],
    ["P-102, column 4", printed(L.iferrorBroken.value), printed(L.ifnaBroken.value)],
  ];
  // The header as the question ends, then each row as the narration reaches it.
  const rowAtIn = (r: number) => [asked8 - 4, swapsAt, swapsAt + 4, spaceAt - 2, fourthAt - 2][r - 1];
  const space = `color-mix(in srgb, ${ds("red", 400)} 45%, transparent)`;

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={absAt(0)} level={-34} />
      <Sfx name="el-tap" at={absAt(1)} level={-34} />
      <Sfx name="el-tap" at={absAt(2)} level={-34} />
      <Sfx name="el-scratch" at={zeroAt} level={-32} />
      <Sfx name="el-pop" at={wholeAt} level={-32} />
      <Sfx name="el-pop" at={honestAt} level={-32} />
      <Sfx name="el-scratch" at={bothAt} level={-30} />
      <Sfx name="el-pop" at={showAt} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={7} at={qAt - 4} textAt={textAt - 4} out={out7}>
          Explain absolute, relative and mixed references.
        </QuestionCard>
        <QuestionCard n={8} at={q8At} textAt={q8TextAt - 2}>
          What does IFERROR do, and when should you avoid it?
        </QuestionCard>

        {/* ── Question 7 ── */}
        <Sheet
          g={g}
          values={sheet}
          at={asked - 8}
          cellAt={(r, c) => (r === 1 || c === 0 || c >= 4 ? asked - 6 + r : c === 1 ? absAt(r - 2) + 6 : relAt(r - 2) + 6)}
          bold={(r) => r === 1}
          ink={(r, c) => (c === 2 && r > 2 ? ACCENT_INK : undefined)}
          fills={[
            { r: 1, c: 5, at: everyAt, out: offAt, color: MARK },
            { r: 3, c: 2, at: zeroAt, color: MARK_BAD },
            { r: 4, c: 2, at: zeroAt + 4, color: MARK_BAD },
          ]}
          out={out7}
        />
        <Note at={shiftsAt - 2} x={g.right + 30} y={g.rowTop(2)} out={staysAt}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <b>A2</b>: shifts when copied
          </span>
        </Note>
        <Note at={staysAt - 2} x={g.right + 30} y={g.rowTop(2)} out={fillAt}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <b>$F$1</b>: stays put
          </span>
        </Note>
        {R.absolute.map((c, i) => bar(c, absAt(i), i < 2 ? absAt(i + 1) : offAt, "plain", [{ text: "$F$1", color: LOCK }]))}
        {R.absolute.map((c, i) => (
          <RangeBox key={c.ref} g={g} r0={i + 2} r1={i + 2} c0={1} c1={1} at={absAt(i)} out={i < 2 ? absAt(i + 1) : offAt} color={ds("green", 600)} />
        ))}
        <RangeBox g={g} r0={1} r1={1} c0={5} c1={5} at={absAt(0) + 4} out={offAt} color={ds("blue", 500)} />
        {R.relative.map((c, i) => bar(c, relAt(i), i < 2 ? relAt(i + 1) : mixedAt, i === 0 ? "plain" : "bad"))}
        {R.relative.map((c, i) => (
          <RangeBox key={c.ref} g={g} r0={i + 2} r1={i + 2} c0={2} c1={2} at={relAt(i)} out={i < 2 ? relAt(i + 1) : mixedAt} color={ds("green", 600)} />
        ))}
        {/* What each pasted copy reads: F2, then F3, both empty. */}
        <RangeBox g={g} r0={2} r1={2} c0={5} c1={5} at={relAt(1)} out={relAt(2)} color={ACCENT} dash />
        <RangeBox g={g} r0={3} r1={3} c0={5} c1={5} at={relAt(2)} out={mixedAt} color={ACCENT} dash />
        <Note at={f2At + 4} x={g.right + 30} y={g.rowTop(2)} out={out7}>
          <span style={{ ...note(24, ACCENT_INK), whiteSpace: "nowrap" }}>F2 and F3 are empty: no tax</span>
        </Note>

        {/* The cross-tab's SUMIFS, filled from G2 to I4: $F and $1 each lock one side. */}
        <FormulaBar
          x={X0}
          top={g.bottom + h(40)}
          width={1060}
          cell={PIVOT.grid[0][0].ref}
          formula={PIVOT.grid[0][0].formula ?? ""}
          at={mixedAt}
          size={21}
          marks={[
            { text: "$F2", color: LOCK },
            { text: "G$1", color: LOCK },
          ]}
          out={out7}
        />
        <FormulaBar
          x={X0}
          top={g.bottom + h(100)}
          width={1060}
          cell={PIVOT.grid[2][2].ref}
          formula={PIVOT.grid[2][2].formula ?? ""}
          at={wholeAt - 6}
          size={21}
          marks={[
            { text: "$F4", color: LOCK },
            { text: "I$1", color: LOCK },
          ]}
          out={out7}
        />
        <Note at={lockAt} x={X0 + 1090} y={g.bottom + h(46)} out={out7}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            <b>$F</b>: the column stays on the regions
          </span>
        </Note>
        <Note at={rowAt} x={X0 + 1090} y={g.bottom + h(84)} out={out7}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            <b>$1</b>: the row stays on the months
          </span>
        </Note>

        {/* ── Question 8: four lookups through IFERROR, then IFNA ── */}
        <Sheet
          g={lg}
          values={lookups}
          at={asked8 - 6}
          cellAt={(r, c) => (c === 2 ? (r === 1 ? ifnaAt - 2 : ifnaAt + 4 + (r - 2) * 3) : rowAtIn(r))}
          bold={(r) => r === 1}
          ink={(r, c) => (c === 2 && r === 5 ? ACCENT_INK : undefined)}
          fills={[
            { r: 3, c: 1, at: honestAt, color: MARK_OK },
            { r: 4, c: 1, at: bothAt, color: MARK_BAD },
            { r: 5, c: 1, at: bothAt + 4, color: MARK_BAD },
            { r: 5, c: 2, at: showAt, color: MARK },
          ]}
        />
        <FormulaBar
          x={BAR_X}
          top={lg.top}
          width={BAR_W}
          formula={screen(L.iferrorMissing)}
          at={swapsAt}
          result={printed(L.iferrorMissing.value)}
          resultAt={honestAt - 2}
          tone="ok"
          out={spaceAt}
        />
        <FormulaBar
          x={BAR_X}
          top={lg.top}
          width={BAR_W}
          formula={screen(L.iferrorSpace)}
          at={spaceAt + 2}
          typeDur={12}
          result={printed(L.iferrorSpace.value)}
          resultAt={bothAt}
          tone="bad"
          marks={[{ text: '"P-102 "', color: space }]}
          out={fourthAt}
        />
        <FormulaBar
          x={BAR_X}
          top={lg.top}
          width={BAR_W}
          formula={screen(L.iferrorBroken)}
          at={fourthAt + 2}
          typeDur={12}
          result={printed(L.iferrorBroken.value)}
          resultAt={bothAt + 2}
          tone="bad"
          out={ifnaAt}
        />
        <Note at={hidesAt} x={BAR_X} y={lg.top + h(70)} out={ifnaAt}>
          <span style={{ ...note(24, ACCENT_INK), whiteSpace: "nowrap" }}>every error looks the same</span>
        </Note>
        <Note at={causeAt - 2} x={BAR_X} y={lg.top + h(110)} out={ifnaAt}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>fix the cause first: trim the key, fix the column</span>
        </Note>
        <FormulaBar
          x={BAR_X}
          top={lg.top}
          width={BAR_W}
          formula={screen(L.ifnaBroken)}
          at={ifnaAt + 2}
          typeDur={12}
          result={printed(L.ifnaBroken.value)}
          resultAt={showAt}
          tone="bad"
        />
        <Note at={showAt + 6} x={BAR_X} y={lg.top + h(70)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
            <b style={{ color: ACCENT_INK }}>#REF!</b>: a reference to a cell that isn&apos;t there
          </span>
        </Note>
        <Note at={ifnaAt + 4} x={BAR_X} y={lg.top + h(110)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <b>IFNA</b> catches only <b>#N/A</b>, not available
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
