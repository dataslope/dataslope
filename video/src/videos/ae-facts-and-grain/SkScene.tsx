import React from "react";
import { AbsoluteFill } from "remotion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { ColumnRule, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { KEYS, type Table } from "./data";
import { DataTable, Drift, geoWith, KEY, KEY_INK, KeyArrow, MARK, MARK_KEY, Mono, Spot, TableName, X0, type Col } from "./parts";

const DIM_Y = 360;
const WHY_Y = 740;
const OPTS = { headH: 50, rowH: 58, bodySize: 23, headSize: 20 } as const;

/**
 * Question 4. Customer 42 in the page's SCD Type 2 block: the natural key
 * from the source first, then the surrogate column opening beside it, the
 * warehouse's own number. A second version of the row grows in (1001 in the
 * East, 1002 in the West, each with the dates it was valid), and the two
 * orders beside it point at the version each was placed under, by the
 * page's point-in-time join. Then the three ways a natural key fails, and
 * customer_id lit as the column each load looks the surrogate up by. The key
 * spot pops in as the surrogate is named.
 */
export const SkScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("sk").from;
  const qAt = n.word("sk", "Question four");
  const textAt = n.word("sk", "What is a surrogate key");
  const naturalAt = n.word("sk", "A natural key comes from the source");
  const fortyAt = n.word("sk", "like customer ID forty-two");
  const surrogateAt = n.word("sk", "A surrogate key is one the warehouse makes up");
  const nothingAt = n.word("sk", "it means nothing");
  const twoRowsAt = n.word("sk-versions", "have two rows");
  const eastAt = n.word("sk-versions", "while Acme Corp was in the East");
  const westAt = n.word("sk-versions", "once it moved West");
  const eachAt = n.word("sk-versions", "Each order matches the version");
  const changeAt = n.word("sk-why", "Natural keys also change");
  const reusedAt = n.word("sk-why", "get reused");
  const clashAt = n.word("sk-why", "or clash when two sources");
  const staysAt = n.word("sk-why", "The natural key stays on the row");
  const lookAt = n.word("sk-why", "each load can look up");
  const end = n.beat("sk-why").to;

  // Customer 42's two versions, and its name from the same rows' other read.
  const dimT = KEYS.validity;
  const names = new Set(KEYS.versions.rows.map((r) => r[KEYS.versions.cols.indexOf("customer_name")]));
  if (names.size !== 1) throw new Error("customer 42 has one name in both versions");
  const [customer] = names;
  const dimCols: Col[] = dimT.cols.map((c) =>
    c === "customer_sk"
      ? { name: c, at: surrogateAt, ink: BLUE_INK, tag: { text: "surrogate", at: surrogateAt + 8 } }
      : c === "customer_id"
        ? { name: c, tag: { text: "natural", at: naturalAt + 6, color: INK_SOFT } }
        : { name: c },
  );
  const dg = geoWith(dimT, dimCols, X0, y(DIM_Y), h, OPTS);
  const sk = dimT.cols.indexOf("customer_sk");
  const id = dimT.cols.indexOf("customer_id");
  const region = dimT.cols.indexOf("region");

  // Its two orders, and the version each one carries.
  const O = KEYS.orders;
  const factT: Table = { cols: ["order_id", "order_date", "customer_sk"], rows: O.rows.map((r) => [r[0], r[1], r[O.cols.indexOf("customer_sk")]]) };
  const factCols: Col[] = [{ name: "order_id" }, { name: "order_date" }, { name: "customer_sk", ink: BLUE_INK }];
  // Beside the dimension, row for row, so each order's arrow runs straight
  // to the version it carries.
  const fg = geoWith(factT, factCols, dg.right + 120, y(DIM_Y), h, OPTS);
  const target = (i: number) => dimT.rows.findIndex((r) => r[sk] === factT.rows[i][2]);
  if (factT.rows.some((_, i) => target(i) !== i)) throw new Error("each order sits level with the version it carries");

  const reasons = [
    { text: "They change", at: changeAt },
    { text: "They get reused", at: reusedAt },
    { text: "Two sources, two 42s", at: clashAt },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={naturalAt + 4} level={-31} />
      <Sfx name="el-pop" at={surrogateAt} level={-30} />
      <Sfx name="el-whoosh" at={surrogateAt + 2} level={-36} />
      <Sfx name="el-tap" at={twoRowsAt + 2} level={-29} />
      <Sfx name="el-pencil" at={eachAt + 6} level={-35} />
      <Sfx name="el-pencil" at={eachAt + 14} level={-35} />
      {reasons.map((r) => (
        <Sfx key={r.text} name="el-tap" at={r.at} level={-31} />
      ))}
      <Sfx name="el-chime" at={lookAt + 6} level={-35} />

      <Drift from={from} to={end + 30} scale={0.015}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} size={56}>
          What is a surrogate key, and why prefer it over a natural key?
        </QuestionCard>
        <Spot art="key" at={surrogateAt} left={1600} top={y(650)} width={170} />

        <TableName g={dg} at={naturalAt - 2}>
          <Mono>dim_customer</Mono>, customer 42: {customer}
        </TableName>
        <DataTable
          g={dg}
          cols={dimCols}
          at={naturalAt - 2}
          rows={dimT.rows.map((cells, i) => (i === 0 ? { cells, at: fortyAt } : { cells, at: twoRowsAt, grow: true }))}
          marks={[
            { row: 0, col: id, at: fortyAt + 6, out: surrogateAt, color: MARK },
            { row: 0, col: sk, at: nothingAt, out: twoRowsAt, color: MARK_KEY },
            { row: 0, col: sk, at: eastAt, color: MARK_KEY },
            { row: 0, col: region, at: eastAt + 6 },
            { row: 1, col: sk, at: westAt, color: MARK_KEY },
            { row: 1, col: region, at: westAt + 6 },
            ...dimT.rows.map((_, row) => ({ row, col: id, at: staysAt + row * 4, color: MARK })),
          ]}
        />
        <Note at={nothingAt + 4} x={dg.right + 40} y={dg.rowTop(0) + h(14)} out={twoRowsAt}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>Made up here, means nothing</span>
        </Note>

        {/* Each order carries the version it was placed under. */}
        <TableName g={fg} at={eachAt}>
          <Mono>fact_orders</Mono>
        </TableName>
        <DataTable
          g={fg}
          cols={factCols}
          at={eachAt}
          rows={factT.rows.map((cells, i) => ({ cells, at: eachAt + 4 + i * 8 }))}
          marks={factT.rows.map((_, row) => ({ row, col: 2, at: eachAt + 6 + row * 8, color: MARK_KEY }))}
        />
        {factT.rows.map((_, i) => (
          <KeyArrow key={i} from={[fg.x - 12, fg.rowMid(i)]} to={[dg.right + 12, dg.rowMid(target(i))]} at={eachAt + 6 + i * 8} color={KEY} />
        ))}

        {/* Why not the natural key: three ways it fails. */}
        <Note at={changeAt - 2} x={X0} y={y(WHY_Y) - h(46)}>
          <span style={{ ...label(23, ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap" }}>Natural keys</span>
        </Note>
        <div style={{ position: "absolute", left: X0, top: y(WHY_Y), display: "flex", gap: 56, fontSize: 26 }}>
          {reasons.map((r, i) => (
            <React.Fragment key={r.text}>
              {i ? (
                <div style={{ position: "relative", width: 1 }}>
                  <ColumnRule x={0} top={-4} height={40} at={r.at} />
                </div>
              ) : null}
              <Note at={r.at} x={0} y={0} style={{ position: "relative" }}>
                <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>{r.text}</span>
              </Note>
            </React.Fragment>
          ))}
        </div>
        <Note at={lookAt} x={X0} y={y(WHY_Y) + h(66)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <Mono color={KEY_INK}>customer_id</Mono> stays on the row: each load looks up a new fact&apos;s surrogate by it
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
