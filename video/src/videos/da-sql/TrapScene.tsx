import React from "react";
import { AbsoluteFill } from "remotion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { TRAP } from "./data";
import { DataTable, Drift, Listing, listingHeight, Mark, MARK_BAD, MARK_OK, Mono, Spot, TableName, tableGeometry, X0 } from "./parts";

const LIST_Y = 330;
const LIST_W = 700;
const SIZE = 26;
const TABLE_X = 1000;
const TABLE_Y = 350;

/**
 * Question 3, carried on: the left join that turns inner. The ask is every
 * customer with their orders over 50. The page's customers and orders,
 * filtered on amount in WHERE (Di's null amount fails the test and she drops
 * out), then the same filter moved into ON (she stays, with a null), and when
 * each is the one to use.
 */
export const TrapScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("trap").from;
  const textAt = n.word("trap", "a left join");
  // The left join's rows arrive as the headline is read; the filter on its words.
  const rowsAt = n.beat("trap").to - 6;
  const everyAt = n.word("trap-where", "every customer");
  const askAt = n.word("trap-where", "orders over fifty");
  const filterAt = n.word("trap-where", "put that filter");
  const goneAt = n.word("trap-gone", "Di disappears");
  const herAt = n.word("trap-why", "Her amount");
  const overAt = n.word("trap-why", "null over fifty");
  const onAt = n.word("trap-on", "on clause");
  const staysAt = n.word("trap-on", "Di stays");
  const onlyAt = n.word("trap-when", "only want");
  const fineAt = n.word("trap-when", "WHERE is fine");
  const keepAt = n.word("trap-when", "keep every customer");
  const inOnAt = n.word("trap-when", "filter in ON");
  const end = n.beat("fanout-in").to;

  const cols = [{ name: "name" }, { name: "amount", numeric: true }];
  const g = tableGeometry({ x: TABLE_X, top: y(TABLE_Y), cols, rows: TRAP.joined.rows, headH: h(48), rowH: h(56) });
  const kept = (amount: string) => amount !== "null" && Number(amount) > 50;
  const diRow = TRAP.joined.rows.findIndex((r) => r[0] === "Di");
  const rg = tableGeometry({ x: TABLE_X, top: y(TABLE_Y), cols, rows: TRAP.on.rows, headH: h(48), rowH: h(56) });
  const diResult = TRAP.on.rows.findIndex((r) => r[0] === "Di");
  const whereLine = TRAP.where.lines.findIndex((l) => l.startsWith("WHERE"));
  const onLine = TRAP.on.lines.findIndex((l) => l.trim().startsWith("AND"));
  const onH = listingHeight(TRAP.on.lines.length, SIZE);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={filterAt + 6} level={-34} />
      <Sfx name="el-scratch" at={goneAt + 2} level={-30} />
      <Sfx name="el-pencil" at={onAt + 8} level={-34} />
      <Sfx name="el-pop" at={staysAt} level={-30} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={3} kicker="Question 3: the trap" at={from - 4} textAt={textAt - 6}>
          A left join can quietly turn into an inner one.
        </QuestionCard>
        <Spot id="da-sql-trap" at={from + 6} left={1500} top={y(640)} width={260} height={194} />

        {/* ── What was asked for ── */}
        <Ink at={everyAt - 2} dur={14} style={{ left: X0, top: y(LIST_Y) - 44, whiteSpace: "nowrap" }}>
          <span style={{ ...note(24, INK_SOFT) }}>
            The ask: <span style={{ color: INK, fontWeight: 650 }}>every customer</span>, with their orders over 50
          </span>
        </Ink>

        {/* ── The filter in WHERE ── */}
        <Listing
          lines={TRAP.where.lines}
          x={X0}
          top={y(LIST_Y)}
          width={LIST_W}
          size={SIZE}
          at={askAt - 6}
          marks={[{ line: whereLine, at: filterAt + 4, color: MARK_BAD }]}
          out={onAt - 2}
        />
        <TableName g={g} at={rowsAt} out={onAt - 2}>
          the left join&apos;s rows
        </TableName>
        <DataTable
          g={g}
          cols={cols}
          at={rowsAt}
          out={onAt - 2}
          rows={TRAP.joined.rows.map((cells, i) => ({
            cells,
            at: rowsAt + 4 + i * 2,
            // Small orders going is what the filter is for; Di going is the trap.
            strikeAt: kept(cells[1]) ? undefined : i === diRow ? goneAt + 2 : filterAt + 12 + i,
            strikeColor: kept(cells[1]) || i === diRow ? undefined : INK_SOFT,
            dimAt: kept(cells[1]) || i === diRow ? undefined : filterAt + 20,
          }))}
          marks={[{ row: diRow, col: 1, at: herAt + 4, color: MARK_BAD }]}
          bands={[{ row: diRow, at: goneAt - 4, out: goneAt + 10, color: MARK_BAD }]}
        />
        <Note at={overAt - 2} x={X0} y={y(LIST_Y + 330)} out={onAt - 2}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            <Mono>NULL &gt; 50</Mono> isn&apos;t true, so <Mono>WHERE</Mono> drops her.
          </span>
        </Note>

        {/* ── The filter in the join's ON ── */}
        <Listing
          lines={TRAP.on.lines}
          x={X0}
          top={y(LIST_Y)}
          width={LIST_W}
          size={SIZE}
          at={onAt + 2}
          marks={[{ line: onLine, at: onAt + 12, color: MARK_OK }]}
        />
        <TableName g={rg} at={onAt + 6}>
          result
        </TableName>
        <DataTable
          g={rg}
          cols={cols}
          at={onAt + 6}
          rows={TRAP.on.rows.map((cells, i) => ({ cells, at: onAt + 10 + i * 3 }))}
          bands={[{ row: diResult, at: staysAt }]}
        />

        {/* ── Which one to use ── */}
        <Note at={onlyAt - 2} x={X0} y={y(LIST_Y) + onH + 30}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
            Only the big orders? <Mark at={fineAt}><Mono>WHERE</Mono> is fine</Mark>.
          </span>
        </Note>
        <Note at={keepAt - 2} x={X0} y={y(LIST_Y) + onH + 80}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
            Every customer? <Mark at={inOnAt} color={MARK_OK}>Filter in <Mono>ON</Mono></Mark>.
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
