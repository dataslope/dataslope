import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK, INK_SOFT, note } from "../../editorial/style";
import { NextLine, Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CONDITIONS, type Cell, PIVOT, printed, REFERENCES, TEXT } from "./data";
import { Drift, type FormulaMark, FormulaBar, Headline, Kicker, MARK, MARK_BAD, MARK_OK, Mono, Sheet, sheetGeometry, Spot, X0 } from "./parts";

/** Where the answers go: right of the list. */
const R_X = 760;
const BAR_W = 1040;
const TOP = 320;
const LIST_TOP = 330;
const ROW = 50;

type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"] };

const shown = (c: Cell) => (typeof c.value === "number" && !Number.isInteger(c.value) ? c.value.toFixed(2) : printed(c.value));

/** A formula and its result, in the answer column's k-th slot. */
const Slot: React.FC<{ c: Ctx; k: number; cell: Cell; at: number; resultAt: number; money?: boolean; marks?: readonly FormulaMark[] }> = ({
  c,
  k,
  cell,
  at,
  resultAt,
  money,
  marks,
}) => (
  <FormulaBar
    x={R_X}
    top={c.y(TOP) + k * c.h(62)}
    width={BAR_W}
    formula={cell.formula ?? ""}
    at={at}
    typeDur={12}
    result={money && typeof cell.value === "number" ? cell.value.toFixed(2) : shown(cell)}
    resultAt={resultAt}
    tone="ok"
    marks={marks}
    // A long formula sets a little smaller, so it fits the bar.
    size={(cell.formula ?? "").length > 54 ? 20 : 21}
  />
);

/** The ten orders, small, under the formulas that read them. */
const Orders: React.FC<{ c: Ctx; at: number; fills: { r: number; c: number; at: number; color: string }[] }> = ({ c, at, fills }) => {
  const g = sheetGeometry({ x: R_X, top: c.y(TOP) + c.h(140), widths: [48, 88, 104, 100], rows: 11, rowH: c.h(34) });
  return (
    <Sheet g={g} values={PIVOT.orders.map((r) => r.map(String))} at={at} bold={(r) => r === 1} size={19} fills={fills} />
  );
};

/** Sheet rows of the orders that match a test. */
const rowsWhere = (test: (r: (string | number)[]) => boolean) => PIVOT.orders.flatMap((r, i) => (i > 0 && test(r) ? [i + 1] : []));

// ── 11. SUMIF and SUMIFS ────────────────────────────────────────────────────

const SumIf: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-sumif", "Sum if adds");
  const severalAt = c.w("r-sumif", "sum ifs several");
  const northAt = c.w("r-sumif", "North sums to");
  const marchAt = c.w("r-sumif", "North in March");
  const north = rowsWhere((r) => r[1] === "North");
  const march = rowsWhere((r) => r[1] === "North" && r[2] === PIVOT.months[2]);
  return (
    <>
      <Slot c={c} k={0} cell={CONDITIONS.sumif} at={at} resultAt={northAt + 4} />
      <Slot c={c} k={1} cell={CONDITIONS.sumifs} at={severalAt} resultAt={marchAt + 6} />
      <Orders
        c={c}
        at={at - 2}
        fills={[
          ...north.map((r, i) => ({ r, c: 3, at: northAt + i * 2, color: MARK })),
          ...march.flatMap((r, i) => [1, 2].map((col) => ({ r, c: col, at: marchAt + 4 + i * 2, color: MARK_OK }))),
        ]}
      />
    </>
  );
};

// ── 12. COUNTIF and COUNTIFS ────────────────────────────────────────────────

const CountIf: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-countif", "Count if and count ifs");
  const threeAt = c.w("r-countif", "three North orders");
  const avgAt = c.w("r-countif", "Average if");
  const fortyAt = c.w("r-countif", "averages one forty");
  const over = rowsWhere((r) => r[1] === "North" && Number(r[3]) > 100);
  return (
    <>
      <Slot c={c} k={0} cell={CONDITIONS.countifs} at={at} resultAt={threeAt} />
      <Slot c={c} k={1} cell={CONDITIONS.averageif} at={avgAt} resultAt={fortyAt - 2} />
      <Orders c={c} at={at - 2} fills={over.map((r, i) => ({ r, c: 3, at: threeAt + i * 3, color: MARK_OK }))} />
    </>
  );
};

// ── 13. Cleaning text ───────────────────────────────────────────────────────

const Clean: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-clean", "Trim strips");
  const caseAt = c.w("r-clean", "proper fixes the case");
  const backAt = c.w("r-clean", "comes back as Ava Smith");
  const lookAt = c.w("r-clean-keys", "Tidy the keys");
  const raw = /"([^"]*)"/.exec(TEXT.clean.formula ?? "")?.[1] ?? "";
  return (
    <>
      <Slot c={c} k={0} cell={TEXT.clean} at={at} resultAt={backAt - 2} />
      <Note at={at + 6} x={R_X} y={c.y(TOP) + c.h(110)}>
        <span style={{ fontFamily: MONO, fontSize: 30, color: ACCENT_INK, whiteSpace: "pre" }}>
          &ldquo;{raw.replaceAll(" ", "·")}&rdquo;
        </span>
      </Note>
      <Note at={caseAt} x={R_X} y={c.y(TOP) + c.h(170)}>
        <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>· marks a space: TRIM drops the extras, PROPER fixes the case</span>
      </Note>
      <Note at={lookAt - 2} x={R_X} y={c.y(TOP) + c.h(230)}>
        <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>tidy the keys first, or lookups miss</span>
      </Note>
    </>
  );
};

// ── 14. Splitting and joining text ──────────────────────────────────────────

const Split: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-split", "Left with find");
  const userAt = c.w("r-split", "the username");
  const joinAt = c.w("r-split", "Text join");
  const blanksAt = c.w("r-split", "skips the blanks");
  return (
    <>
      <Slot c={c} k={0} cell={TEXT.username} at={at} resultAt={userAt - 2} />
      <Slot c={c} k={1} cell={TEXT.join} at={joinAt} resultAt={blanksAt - 4} marks={[{ text: "TRUE", color: MARK, at: blanksAt - 4 }]} />
      <Note at={joinAt + 12} x={R_X} y={c.y(TOP) + c.h(140)}>
        <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
          <Mono color={INK}>TRUE</Mono> skips the empty <Mono color={INK}>&quot;&quot;</Mono>: no double space
        </span>
      </Note>
    </>
  );
};

// ── 15. Dates ───────────────────────────────────────────────────────────────

const Dates: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-dates", "A date is stored");
  const serialAt = c.w("r-dates", "forty-five thousand");
  const minusAt = c.w("r-dates", "March thirty-first minus");
  const thirtyAt = c.w("r-dates", "is thirty");
  const textAt = c.w("r-dates", "A date stored as text");
  const convertsAt = c.w("r-dates", "date value converts it");
  return (
    <>
      <Slot c={c} k={0} cell={TEXT.serial} at={at + 4} resultAt={serialAt} />
      <Slot c={c} k={1} cell={TEXT.days} at={minusAt - 2} resultAt={thirtyAt} />
      <Slot c={c} k={2} cell={TEXT.datevalue} at={textAt} resultAt={convertsAt + 4} />
      <Note at={at} x={R_X} y={c.y(TOP) + 3 * c.h(62) + c.h(14)}>
        <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>a date is a count of days, so dates subtract</span>
      </Note>
    </>
  );
};

// ── 16. Conditional formatting ──────────────────────────────────────────────

const Format: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const at = c.w("r-format", "Conditional formatting colors");
  const overAt = c.w("r-format", "Over a hundred fifty");
  const lit = CONDITIONS.over150.flatMap((cell, i) => (cell.value === true ? [i + 2] : []));
  const g = sheetGeometry({ x: R_X, top: c.y(TOP) + c.h(70), widths: [48, 88, 104, 100], rows: 11, rowH: c.h(34) });
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: R_X,
          top: c.y(TOP),
          ...note(24, INK),
          whiteSpace: "nowrap",
          opacity: ease(frame, at, 12),
        }}
      >
        rule on <b>revenue</b>: cell value <Mono>&gt; 150</Mono>
      </div>
      <Sheet
        g={g}
        values={PIVOT.orders.map((r) => r.map(String))}
        at={at - 2}
        bold={(r) => r === 1}
        size={19}
        fills={lit.map((r, i) => ({ r, c: 3, at: overAt + 4 + i * 4, color: MARK }))}
      />
    </>
  );
};

// ── 17. Named ranges ────────────────────────────────────────────────────────

const Named: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-named", "A named range");
  const meansAt = c.w("r-named", "reads as what it means");
  const pointsAt = c.w("r-named", "still points at F one");
  return (
    <>
      <Slot c={c} k={0} cell={REFERENCES.named[0]} at={at + 6} resultAt={meansAt} money />
      <Slot c={c} k={1} cell={REFERENCES.absolute[0]} at={pointsAt - 2} resultAt={pointsAt + 6} money />
      <Note at={meansAt + 6} x={R_X} y={c.y(TOP) + 2 * c.h(62) + c.h(14)}>
        <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
          <b style={{ color: INK }}>TaxRate</b> names <span style={{ fontFamily: MONO }}>$F$1</span>: the same cell, read in words
        </span>
      </Note>
    </>
  );
};

// ── 18. Duplicates ──────────────────────────────────────────────────────────

const Dupes: React.FC<{ c: Ctx }> = ({ c }) => {
  const at = c.w("r-dupes", "to find duplicates");
  const flagAt = c.w("r-dupes", "flags the repeated email");
  const bothAt = c.w("r-dupes-both", "It flags both copies");
  const firstAt = c.w("r-dupes-both", "keeps the first");
  const g = sheetGeometry({ x: R_X, top: c.y(TOP) + c.h(140), widths: [250, 120, 130], rows: 5, rowH: c.h(44) });
  const values = TEXT.emails.map((e, i) =>
    i === 0 ? [e, "repeated", "later copy"] : [e, printed(TEXT.repeated[i - 1].value), printed(TEXT.later[i - 1].value)],
  );
  const flagged = TEXT.repeated.flatMap((cell, i) => (cell.value === true ? [i + 2] : []));
  const later = TEXT.later.flatMap((cell, i) => (cell.value === true ? [i + 2] : []));
  return (
    <>
      <FormulaBar x={R_X} top={c.y(TOP)} width={640} cell={TEXT.repeated[0].ref} formula={TEXT.repeated[0].formula ?? ""} at={at} typeDur={12} size={21} />
      {/* Counting only down to its own row flags the later copy alone. */}
      <FormulaBar
        x={R_X}
        top={c.y(TOP) + c.h(62)}
        width={640}
        cell={TEXT.later[0].ref}
        formula={TEXT.later[0].formula ?? ""}
        at={firstAt - 4}
        typeDur={12}
        size={21}
        marks={[{ text: "$A$2:A2", color: MARK, at: firstAt + 8 }]}
      />
      <Sheet
        g={g}
        values={values}
        at={at - 2}
        cellAt={(r, col) => (col === 2 ? firstAt + 8 + r * 2 : col === 1 && r > 1 ? at + 14 + r * 2 : at)}
        bold={(r) => r === 1}
        size={20}
        fills={[
          ...flagged.flatMap((r, i) => [0, 1].map((col) => ({ r, c: col, at: flagAt + i * 4, out: bothAt, color: MARK }))),
          ...flagged.map((r, i) => ({ r, c: 1, at: bothAt + i * 4, color: MARK_BAD })),
          ...later.map((r) => ({ r, c: 2, at: firstAt + 20, color: MARK_OK })),
        ]}
      />
      <Note at={bothAt + 6} x={R_X} y={g.bottom + c.h(20)}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
          <b style={{ color: ACCENT_INK }}>both copies flag</b>; Remove Duplicates keeps the first
        </span>
      </Note>
    </>
  );
};

/**
 * The rapid round, questions 11 to 18: the numbered list on the left, ticked
 * as it goes, and each answer on the right as one formula, computed in
 * HyperFormula.
 */
export const RapidScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: (b, p) => n.word(b, p), y, h };

  const from = n.beat("rapid-in").from;
  const lastAt = n.word("rapid-in", "The last eight");
  const cellAt = n.word("rapid-in", "a single cell");
  const tableAt = n.word("next", "A good table");
  const nextAt = n.word("next", "Next");
  const end = n.beat("next").from;

  const items: RapidItem[] = [
    { n: 11, label: "SUMIF and SUMIFS", beat: "r-sumif", body: <SumIf c={c} /> },
    { n: 12, label: "COUNTIF and COUNTIFS", beat: "r-countif", body: <CountIf c={c} /> },
    { n: 13, label: "Cleaning messy text", beat: "r-clean", body: <Clean c={c} /> },
    { n: 14, label: "Splitting and joining text", beat: "r-split", body: <Split c={c} /> },
    { n: 15, label: "How dates are stored", beat: "r-dates", body: <Dates c={c} /> },
    { n: 16, label: "Conditional formatting", beat: "r-format", body: <Format c={c} /> },
    { n: 17, label: "Named ranges", beat: "r-named", body: <Named c={c} /> },
    { n: 18, label: "Finding duplicates", beat: "r-dupes", body: <Dupes c={c} /> },
  ].map(({ beat, ...item }) => ({ ...item, at: n.beat(beat).from }));
  const dupesAt = n.beat("r-dupes").from;

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={from} level={-34} />
      {items.map((item) => (
        <Sfx key={item.n} name="el-tap" at={item.at} level={-34} />
      ))}
      <Sfx name="el-chime" at={end} level={-34} />

      <Drift from={from} to={n.beat("next").to + 40} scale={0.015}>
        <Kicker at={from}>Questions 11 to 18</Kicker>
        <Headline lead="One cell," turn="one answer." at={lastAt - 6} turnAt={cellAt - 2} size={64} />

        {/* The last answer stays up through the bridge, so its body sits outside the list. */}
        <RapidFire
          items={items.map((it) => (it.n === 18 ? { ...it, body: undefined } : it))}
          x={X0}
          top={y(LIST_TOP)}
          rowH={h(ROW)}
          width={560}
          at={cellAt}
          end={end}
        />
        <Fade from={dupesAt - 6} dim={tableAt}>
          <Dupes c={c} />
        </Fade>
        <Spot id="da-spreadsheets-marmot" at={from + 6} left={1630} top={y(100)} width={150} height={150} />

        <NextLine at={nextAt} x={R_X} y={y(850)} width={960}>
          data visualization
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};

/** Fades its children in from `from`, and sets them back from `dim`. */
const Fade: React.FC<{ from: number; dim?: number; children: React.ReactNode }> = ({ from, dim, children }) => {
  const frame = useCurrentFrame();
  const o = ease(frame, from, 8) * (dim === undefined ? 1 : 1 - 0.55 * ease(frame, dim, 16));
  return o > 0 ? <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill> : null;
};
