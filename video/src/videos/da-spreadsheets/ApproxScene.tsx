import React from "react";
import { AbsoluteFill } from "remotion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, INK, INK_SOFT, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { type Cell, LOOKUPS, printed, screen } from "./data";
import { Drift, FormulaBar, MARK, MARK_BAD, MARK_OK, RangeBox, Sheet, sheetGeometry, X0 } from "./parts";

const TIERS_Y = 330;
const PRODUCTS_Y = 600;
const ROW = 42;
const BAR_X = 620;
const BAR_W = 1140;

/** A discount as the sheet formats it. */
const pct = (v: unknown) => (typeof v === "number" ? `${Math.round(v * 100)}%` : String(v));
const money = (v: unknown) => (typeof v === "number" ? v.toFixed(2) : String(v));
const result = (c: Cell, as: (v: unknown) => string) => (typeof c.value === "number" ? as(c.value) : printed(c.value));

/**
 * Question 6. Approximate match on the video's own discount tiers, sorted as
 * it assumes: 640 takes the largest threshold not above it, 500, and 10%.
 * Then the same mode on the product codes: P-105 doesn't exist, and without
 * FALSE the lookup returns P-104's price, 24.00, where exact match says #N/A.
 */
export const ApproxScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("approx").from;
  const qAt = n.word("approx", "Question");
  const textAt = n.word("approx", "What's the difference");
  const asked = n.beat("approx").to;
  const exactAt = n.word("approx-what", "Exact returns only");
  const sortedAt = n.word("approx-what", "assumes the first column is sorted");
  const largestAt = n.word("approx-what", "the largest value");
  const tiersAt = n.word("approx-what", "right for tiers");
  const sixFortyAt = n.word("approx-what", "six hundred forty");
  const tenAt = n.word("approx-what", "ten percent off");
  const codesAt = n.word("approx-trap", "silently wrong for codes");
  const leaveAt = n.word("approx-trap", "Leave off false");
  const notExistAt = n.word("approx-trap", "which doesn't exist");
  const naAt = n.word("approx-trap", "Instead of NA");
  const lampAt = n.word("approx-trap", "the lamp's price");
  const unsortedAt = n.word("approx-trap", "On unsorted data");
  const end = n.beat("refs-in").to;

  const L = LOOKUPS;
  const tg = sheetGeometry({ x: X0, top: y(TIERS_Y), widths: [96, 116], rows: 5, rowH: h(ROW) });
  const tiers = L.tiers.map((r, i) => (i === 0 ? r.map(String) : [String(r[0]), pct(r[1])]));
  // The order value the tier lookup asks about, as written in its formula.
  const key = Number(/VLOOKUP\((\d+)/.exec(L.approxTier.formula ?? "")?.[1]);
  const tierRow = 2 + L.tiers.slice(1).findLastIndex((r) => Number(r[0]) <= key);
  const pg = sheetGeometry({ x: X0, top: y(PRODUCTS_Y), widths: [96, 124, 90], rows: 5, rowH: h(ROW) });
  const products = L.products.map((r, i) => r.map((v, c) => (i > 0 && c === 2 ? money(v) : String(v))));
  // The last code not above P-105: where approximate match stops.
  const code = /"([^"]+)"/.exec(L.approxId.formula ?? "")?.[1] ?? "";
  const lampRow = 2 + L.products.slice(1).findLastIndex((r) => String(r[0]) <= code);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={sortedAt + 2} level={-34} />
      <Sfx name="el-pop" at={tenAt} level={-32} />
      <Sfx name="el-pencil" at={leaveAt} level={-34} />
      <Sfx name="el-scratch" at={lampAt + 4} level={-30} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4}>
          What&apos;s the difference between exact and approximate match?
        </QuestionCard>

        {/* ── Tiers: sorted, as approximate match assumes ── */}
        <Sheet
          g={tg}
          values={tiers}
          at={asked - 8}
          cellAt={(r) => asked - 6 + (r - 1) * 2}
          bold={(r) => r === 1}
          fills={[
            { r: tierRow, c: 0, at: largestAt, out: tenAt, color: MARK },
            { r: tierRow, c: 1, at: tenAt - 2, color: MARK_OK },
          ]}
        />
        <RangeBox g={tg} r0={2} r1={5} c0={0} c1={0} at={sortedAt} out={codesAt} color={ds("blue", 500)} />
        <Note at={sortedAt + 4} x={X0} y={tg.top - h(36)}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>sorted, smallest first</span>
        </Note>
        <Note at={exactAt - 2} x={BAR_X} y={tg.top - h(4)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <b>exact</b>: a precise hit, or #N/A
          </span>
        </Note>
        <FormulaBar
          x={BAR_X}
          top={tg.top + h(40)}
          width={BAR_W}
          formula={screen(L.approxTier)}
          at={tiersAt}
          result={result(L.approxTier, pct)}
          resultAt={tenAt - 2}
          tone="ok"
        />
        <Note at={sixFortyAt + 4} x={BAR_X} y={tg.top + h(98)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            the largest &ldquo;from&rdquo; not above {key} is <b>{L.tiers[tierRow - 1][0]}</b>
          </span>
        </Note>

        {/* ── Codes: approximate match where only exact makes sense ── */}
        <Sheet
          g={pg}
          values={products}
          at={asked - 4}
          cellAt={(r) => asked - 2 + (r - 1) * 2}
          bold={(r) => r === 1}
          fills={[{ r: lampRow, c: 2, at: lampAt, color: MARK_BAD }]}
        />
        <FormulaBar
          x={BAR_X}
          top={pg.top}
          width={BAR_W}
          formula={screen(L.approxId)}
          at={leaveAt}
          result={result(L.approxId, money)}
          resultAt={lampAt - 2}
          tone="bad"
        />
        <Note at={notExistAt} x={BAR_X} y={pg.top + h(52)}>
          <span style={{ ...note(23, ACCENT_INK), whiteSpace: "nowrap" }}>{code} isn&apos;t in the list</span>
        </Note>
        <FormulaBar
          x={BAR_X}
          top={pg.top + h(94)}
          width={BAR_W}
          formula={screen(L.exact)}
          at={naAt - 4}
          typeDur={14}
          result={result(L.exact, money)}
          resultAt={naAt + 6}
          tone="ok"
        />
        <Note at={unsortedAt - 2} x={BAR_X} y={pg.top + h(160)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            unsorted? <span style={{ color: ACCENT_INK }}>approximate match can land anywhere</span>
          </span>
        </Note>
        <RangeBox g={pg} r0={lampRow} r1={lampRow} c0={0} c1={2} at={lampAt + 4} color={ACCENT} dash />
      </Drift>
    </AbsoluteFill>
  );
};
