import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CONDITIONS, LOOKUPS, PIVOT, printed } from "./data";
import { Drift, FormulaBar, Headline, Kicker, MARK, RangeBox, Sheet, sheetGeometry, Spot, X0 } from "./parts";

const SHEET_Y = 380;
const ROW = 36;
const PRODUCTS_X = 640;

/**
 * The opening, drawn as a spreadsheet rather than Parts 1 to 3's numbered
 * tiles: the video's own orders fill in row by row, a SUMIFS types itself
 * into the formula bar and outlines the three ranges it reads, and the
 * narration's "copy it, sort it, or point it at the wrong column" walks those
 * outlines until the last one slips onto the wrong column in red. The plan
 * line brings in the product list beside it, the second sheet the first ten
 * questions are worked on, and the bridge lights the three fields the pivot
 * table takes next.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hook").from;
  const loopAt = n.word("hook", "spreadsheet round");
  const menusAt = n.word("hook", "rarely about menus");
  const formulaAt = n.word("hook", "what a formula does");
  const copyAt = n.word("hook", "copy it");
  const sortAt = n.word("hook", "sort it");
  const wrongAt = n.word("hook", "the wrong column");
  const eighteenAt = n.word("plan", "Eighteen questions");
  const tenAt = n.word("plan", "the first ten");
  const productAt = n.word("plan", "a product list");
  const eightAt = n.word("plan", "the last eight");
  const toolAt = n.word("pivot-in", "the tool");
  const end = n.beat("pivot-in").to;

  const g = sheetGeometry({ x: X0, top: y(SHEET_Y), widths: [50, 90, 104, 100], rows: 11, rowH: h(ROW) });
  const orders = PIVOT.orders.map((r) => r.map(String));
  const pg = sheetGeometry({ x: PRODUCTS_X, top: y(SHEET_Y), widths: [84, 110, 76], rows: 5, rowH: h(ROW) });
  const products = LOOKUPS.products.map((r, i) => r.map((v, c) => (i > 0 && c === 2 ? Number(v).toFixed(2) : String(v))));
  const sumifs = CONDITIONS.sumifs;
  const lit = (at: number, outAt: number) => ease(frame, at, 8) * (1 - ease(frame, outAt, 8));

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={loopAt} level={-34} />
      <Sfx name="el-tap" at={copyAt} level={-34} />
      <Sfx name="el-tap" at={sortAt} level={-34} />
      <Sfx name="el-scratch" at={wrongAt + 4} level={-32} />
      <Sfx name="el-pencil" at={productAt} level={-34} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>Data analyst interview prep</Kicker>
        <Headline lead="Not the menus." turn="The formulas." at={menusAt - 6} turnAt={formulaAt - 2} size={72} />

        <Spot id="da-spreadsheets-marmot" at={from + 4} left={1150} top={y(280)} width={640} height={470} />

        {/* The orders, row by row. */}
        <Sheet
          g={g}
          values={orders}
          at={from + 2}
          cellAt={(r) => loopAt - 10 + (r - 1) * 3}
          bold={(r) => r === 1}
          size={20}
          fills={[1, 2, 3].map((c, k) => ({ r: 1, c, at: toolAt + k * 3, color: MARK }))}
        />

        {/* A formula, the three ranges it reads, and the three things that go wrong with them. */}
        <FormulaBar
          x={X0}
          top={y(SHEET_Y) - h(72)}
          width={760}
          formula={sumifs.formula ?? ""}
          at={formulaAt}
          typeDur={24}
          result={printed(sumifs.value)}
          resultAt={formulaAt + 30}
          size={19}
          // Pointed at the wrong column, the 290 is no longer the answer.
          dim={wrongAt}
          out={eighteenAt - 4}
        />
        <RangeBox g={g} r0={2} r1={11} c0={3} c1={3} at={formulaAt + 10} out={wrongAt} color={ds("purple", 500)} />
        <RangeBox g={g} r0={2} r1={11} c0={1} c1={1} at={formulaAt + 16} out={eighteenAt - 4} color={ds("blue", 500)} />
        <RangeBox g={g} r0={2} r1={11} c0={2} c1={2} at={formulaAt + 22} out={eighteenAt - 4} color={ds("teal", 500)} />
        {/* "copy it": the dashed outline a copy draws; "sort it": the rows a sort would reorder. */}
        <div
          style={{
            position: "absolute",
            left: g.xs[1] - 4,
            top: g.rowTop(2) - 4,
            width: g.widths[1] + g.widths[2] + g.widths[3] + 8,
            height: g.rowH * 10 + 8,
            border: `2px dashed ${INK}`,
            borderRadius: 3,
            opacity: lit(copyAt, sortAt) * 0.8,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: g.xs[0],
            top: g.rowTop(2),
            width: g.width - (g.xs[0] - g.x),
            height: g.rowH * 10,
            background: `color-mix(in srgb, ${ds("yellow", 400)} 40%, transparent)`,
            opacity: lit(sortAt, wrongAt),
          }}
        />
        {/* The third failure stays up into the plan, so its note can be read. */}
        <RangeBox g={g} r0={2} r1={11} c0={2} c1={2} at={wrongAt + 2} out={tenAt - 8} color={ACCENT} dash />
        <Note at={wrongAt + 6} x={g.right + 20} y={g.rowTop(6)} out={tenAt - 8}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>the sum, pointed at the months</span>
        </Note>

        {/* The plan: ten questions on this workbook, eight one formula each. */}
        <Note at={eighteenAt - 2} x={X0} y={y(SHEET_Y) - h(64)}>
          <span style={{ ...label(26, INK), whiteSpace: "nowrap", ...TABULAR }}>18 questions</span>
        </Note>
        <Sheet g={pg} values={products} at={productAt - 6} cellAt={(r) => productAt - 4 + (r - 1) * 2} bold={(r) => r === 1} size={20} />
        <Note at={tenAt} x={PRODUCTS_X} y={pg.bottom + h(30)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            <b>1 to 10</b>: worked on these two sheets
          </span>
        </Note>
        <Note at={eightAt - 2} x={PRODUCTS_X} y={pg.bottom + h(74)}>
          <span style={{ ...note(25, INK_SOFT), whiteSpace: "nowrap" }}>
            <b style={{ color: INK }}>11 to 18</b>: one formula each
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
