import React from "react";
import { AbsoluteFill } from "remotion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { NORTHWIND, NORTHWIND_COUNTS } from "./data";
import { BODY_Y, DbTable, Fig, FIG_Y, HEAD_H, Headline, MARK, MARK_KEY, ROW_H, tableGeometry, X0 } from "./kit";
import { Count, Drift, Spot, Tick } from "./parts";

const SHOWN = 5;
const RIGHT = 1170;

/**
 * Northwind's two prices (the lesson's own query on its own remoteInitSql):
 * a catalog price on each product and a price on every order line, which
 * disagree on 662 of 2,155 lines because they are two different facts.
 */
export const PriceScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("prices").from;
  const copiesAt = n.word("prices", "aren't copies");
  const northwindAt = n.word("prices", "Northwind");
  const productAt = n.word("prices", "each product");
  const lineAt = n.word("prices", "every order line");
  const countAt = n.word("history", "Six hundred");
  const rightAt = n.word("history", "RIGHT");
  const roseAt = n.word("history", "Prices rose");
  const keptAt = n.word("history", "kept");
  const paidAt = n.word("history", "paid");
  const factsAt = n.word("facts", "Two facts");
  const nameAt = n.word("facts", "share a name");
  const syncAt = n.word("facts", "copy needs syncing");
  const historyAt = n.word("facts", "History");
  const end = n.beat("facts").to;

  const rows = NORTHWIND.rows.slice(0, SHOWN);
  const g = tableGeometry({ x: X0, top: y(BODY_Y), cols: NORTHWIND.cols, rows, headH: h(HEAD_H), rowH: h(ROW_H) });
  const bottom = g.bottom(rows.length);
  const { disagree, lines, lower } = NORTHWIND_COUNTS;

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={northwindAt} level={-30} />
      <Sfx name="el-tap" at={countAt + 24} level={-28} />
      <Sfx name="el-sprinkle" at={keptAt} level={-34} />
      <Sfx name="el-pencil" at={nameAt - 2} level={-34} />
      <Sfx name="el-pop" at={lineAt - 4} level={-30} />

      <Headline kicker="Denormalization" lead="Same name," turn="two facts." at={from - 6} turnAt={factsAt - 4} underlineAt={nameAt + 6} />
      <Spot id="db-normalization-receipt" at={lineAt - 4} left={1530} top={40} width={250} height={270} />

      <Drift from={from} to={end + 40} amount={0.012} origin="35% 50%">
        <Fig n="11" at={copiesAt - 4} y={y(FIG_Y)}>
          Northwind, catalog price now against price charged
        </Fig>
        <DbTable
          g={g}
          cols={NORTHWIND.cols}
          rows={rows.map((cells, i) => ({ cells, at: northwindAt + 4 + i * 4 }))}
          at={northwindAt - 2}
          numeric={[1, 2, 3]}
          marks={[
            ...rows.map((_, i) => ({ row: i, col: 1, at: productAt + i * 3, color: MARK_KEY })),
            ...rows.map((_, i) => ({ row: i, col: 2, at: lineAt + i * 3, out: keptAt - 4 })),
            // "each line kept what the customer paid": the charged prices, one by one.
            ...rows.map((_, i) => ({ row: i, col: 2, at: keptAt + i * 5, color: MARK })),
          ]}
        />

        {/* How many lines disagree with today's catalog. */}
        <Ink at={countAt - 4} dur={12} style={{ left: RIGHT, top: y(BODY_Y) - 6, whiteSpace: "nowrap" }}>
          <span style={{ ...headline(96), color: INK }}>
            <Count value={disagree} at={countAt} dur={30} />
          </span>
        </Ink>
        <Note at={countAt + 8} x={RIGHT} y={y(BODY_Y) + 104}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>of {lines.toLocaleString("en-US")} order lines disagree</span>
        </Note>
        <Tick x={RIGHT + 210} y={y(BODY_Y) + 34} at={rightAt} size={40} />
        <Note at={roseAt} x={RIGHT} y={y(BODY_Y) + 150}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            {lower.toLocaleString("en-US")} of them below today&apos;s price
          </span>
        </Note>
        <Note at={paidAt - 2} x={RIGHT} y={y(BODY_Y) + 190}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>each one, what the customer paid</span>
        </Note>

        {/* Two questions with different answers. */}
        <Note at={nameAt - 2} x={g.xs[1] + 16} y={bottom + 20} from="up">
          <span style={{ ...label(22, BLUE_INK), whiteSpace: "nowrap" }}>What does it cost now?</span>
        </Note>
        <Note at={nameAt + 8} x={g.xs[2] + 16} y={bottom + 60} from="up">
          <span style={{ ...label(22, ACCENT_INK), whiteSpace: "nowrap" }}>What did they pay that day?</span>
        </Note>
        <Note at={syncAt - 2} x={RIGHT} y={y(BODY_Y) + 290}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>A copy: keep it in sync.</span>
        </Note>
        <Note at={historyAt - 2} x={RIGHT} y={y(BODY_Y) + 334}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            History: <span style={{ color: ACCENT_INK, fontWeight: 600 }}>never fix it.</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
