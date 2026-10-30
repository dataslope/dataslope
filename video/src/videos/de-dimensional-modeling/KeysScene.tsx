import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { KEYED_ORDERS, type Result, VERSIONS } from "./data";
import { colsOf, DataTable, Drift, geoOf, geoWith, KEY_INK, KeyArrow, Mark, MARK, MARK_BAD, MARK_KEY, Mono, PanelHead, TableName, X0 } from "./parts";

const R_X = 1000;
const TABLE_Y = 612;
const OPTS = { headH: 50, rowH: 58, bodySize: 27, headSize: 22 } as const;

/** Only these columns of a result, in this order. */
const pick = (t: Result, cols: readonly string[]): Result => ({
  cols,
  rows: t.rows.map((r) => cols.map((c) => r[t.cols.indexOf(c)])),
  sql: t.sql,
});

/**
 * Question 8, after Unit 4 (db-keys: a natural key is a value the thing
 * already has, a surrogate a number the database makes up), carried into
 * the warehouse: what goes wrong with a natural key, what a surrogate
 * promises, and the page's own Type 2 dimension, where customer 42 is two
 * rows, keys 1001 and 1087, and each order points at the version true when
 * it was placed.
 */
export const KeysScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("keys").from;
  const qAt = n.word("keys", "Question eight");
  const textAt = n.word("keys", "What is a surrogate key");
  const surrogateWordAt = n.word("keys", "a surrogate key");
  const naturalWordAt = n.word("keys", "over a natural key");
  const naturalAt = n.word("keys", "A natural key comes from the business");
  const emailAt = n.word("keys", "an email");
  const codeAt = n.word("keys", "a product code");
  const changeAt = n.word("keys", "Those change");
  const reusedAt = n.word("keys", "get reused");
  const longAt = n.word("keys", "long strings that slow every join");
  const surrogateAt = n.word("surrogate", "A surrogate key is a number");
  const nothingAt = n.word("surrogate", "It means nothing");
  const upstreamAt = n.word("surrogate", "nothing upstream can change it");
  const smallAt = n.word("surrogate", "it's small");
  const twoRowsAt = n.word("versions", "one customer have two rows");
  const fortyTwoAt = n.word("versions", "Customer forty-two");
  const movedAt = n.word("versions", "from Boston to Austin");
  const k1At = n.word("versions", "ten oh one");
  const k2At = n.word("versions", "ten eighty-seven");
  const pointsAt = n.word("versions", "each order points");
  const trueAt = n.word("versions", "true when it was placed");
  const scdAt = n.word("keys-next", "a slowly changing dimension");
  const historyAt = n.word("keys-next", "where modeling history begins");
  const end = n.beat("keys-next").to;

  const dim = VERSIONS;
  const fact = pick(KEYED_ORDERS, ["order_id", "order_date", "customer_key"]);
  const dimCols = colsOf(dim, {
    customer_key: { ink: KEY_INK, tag: { text: "PK", at: k1At } },
    customer_id: { tag: { text: "natural", at: fortyTwoAt + 4, color: INK_SOFT } },
  });
  const dg = geoWith(dim, dimCols, X0, y(TABLE_Y), h, OPTS);
  const fg = geoOf(fact, R_X + 120, y(TABLE_Y), h, OPTS);
  const dKey = dim.cols.indexOf("customer_key");
  const dId = dim.cols.indexOf("customer_id");
  const dCity = dim.cols.indexOf("city");
  const fKey = fact.cols.indexOf("customer_key");
  const fDate = fact.cols.indexOf("order_date");
  const target = (i: number) => dim.rows.findIndex((r) => r[dKey] === fact.rows[i][fKey]);
  const panelsDim = twoRowsAt;
  const problems = [
    { what: "changes", code: "ada@old.test → ada@new.test", text: "", at: changeAt },
    { what: "gets reused", code: "SKU-XYZ", text: ", given to a new product", at: reusedAt },
    { what: "long strings", code: "", text: "a wide key on every fact row, in every join", at: longAt },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={naturalAt} level={-33} />
      {problems.map((p) => (
        <Sfx key={p.what} name="el-tap" at={p.at} level={-36} />
      ))}
      <Sfx name="el-pop" at={surrogateAt} level={-33} />
      <Sfx name="el-whoosh" at={twoRowsAt} level={-35} />
      <Sfx name="el-pencil" at={pointsAt + 4} level={-35} />
      <Sfx name="el-chime" at={historyAt} level={-37} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={8} at={qAt - 4} textAt={textAt - 4} size={58}>
          What is a{" "}
          <Mark at={surrogateWordAt + 3} out={naturalAt}>
            surrogate key
          </Mark>
          , and why prefer it over a{" "}
          <Mark at={naturalWordAt + 6} out={naturalAt}>
            natural key
          </Mark>
          ?
        </QuestionCard>

        <div style={{ position: "absolute", inset: 0, opacity: 1 - ease(frame, panelsDim, 16) * 0.45 }}>
          {/* ── Natural keys ── */}
          <PanelHead at={naturalAt - 2} x={X0} y={y(262)} width={760} sub="comes from the business" subAt={naturalAt + 8}>
            Natural key
          </PanelHead>
          <Note at={emailAt} x={X0} y={y(364)}>
            <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
              <Mono>email</Mono>
              <span style={{ opacity: ease(frame, codeAt, 10) }}>
                , <Mono>product_code</Mono>
              </span>
            </span>
          </Note>
          {problems.map((p, i) => (
            <Note key={p.what} at={p.at - 2} x={X0} y={y(412) + i * h(50)}>
              <span style={{ display: "flex", alignItems: "baseline", gap: 18, whiteSpace: "nowrap" }}>
                <span style={{ ...label(25, ACCENT_INK), fontWeight: 700, width: 170 }}>{p.what}</span>
                <span style={{ ...note(24, INK) }}>
                  {p.code ? <Mono>{p.code}</Mono> : null}
                  {p.text}
                </span>
              </span>
            </Note>
          ))}

          {/* ── Surrogate keys ── */}
          <PanelHead at={surrogateAt - 2} x={R_X} y={y(262)} width={800} sub="a number the warehouse makes up" subAt={surrogateAt + 8}>
            Surrogate key
          </PanelHead>
          <Note at={nothingAt} x={R_X} y={y(372)}>
            <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
              means nothing,
              <span style={{ opacity: ease(frame, upstreamAt, 10) }}> so nothing upstream can change it</span>
            </span>
          </Note>
          <Note at={smallAt} x={R_X} y={y(424)}>
            <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
              small: an integer, <Mono>1001</Mono>
            </span>
          </Note>
        </div>

        {/* ── The page's Type 2 dimension: one customer, two rows ── */}
        <TableName g={dg} at={twoRowsAt}>
          <Mono>dim_customer</Mono>
        </TableName>
        <DataTable
          g={dg}
          cols={dimCols}
          at={twoRowsAt}
          rows={dim.rows.map((cells, i) => ({ cells, at: twoRowsAt + 6 + i * 4 }))}
          marks={[
            ...dim.rows.map((_, i) => ({ row: i, col: dId, at: fortyTwoAt + 2 + i * 3, color: MARK_BAD })),
            ...dim.rows.map((_, i) => ({ row: i, col: dCity, at: movedAt + i * 8, color: MARK })),
            { row: 0, col: dKey, at: k1At, color: MARK_KEY },
            { row: 1, col: dKey, at: k2At, color: MARK_KEY },
          ]}
        />
        <Note at={fortyTwoAt + 10} x={X0} y={dg.rowTop(dim.rows.length) + h(22)}>
          <span style={{ ...note(23, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>42 twice: the natural key can&apos;t be the key</span>
        </Note>

        <TableName g={fg} at={pointsAt - 4}>
          <Mono>fact_orders</Mono>
        </TableName>
        <DataTable
          g={fg}
          cols={colsOf(fact, { customer_key: { ink: KEY_INK } })}
          at={pointsAt - 4}
          rows={fact.rows.map((cells, i) => ({ cells, at: pointsAt + i * 4 }))}
          marks={[
            ...fact.rows.map((_, i) => ({ row: i, col: fKey, at: pointsAt + 6 + i * 4, color: MARK_KEY })),
            ...fact.rows.map((_, i) => ({ row: i, col: fDate, at: trueAt + i * 6, color: MARK })),
          ]}
        />
        {fact.rows.map((_, i) => (
          <KeyArrow key={i} from={[fg.x - 10, fg.rowMid(i)]} to={[dg.right + 12, dg.rowMid(target(i))]} at={pointsAt + 8 + i * 6} />
        ))}
        <Note at={trueAt + 8} x={fg.x} y={fg.rowTop(fact.rows.length) + h(22)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>each order: the version true when it was placed</span>
        </Note>

        {/* ── Where it leads ── */}
        <Note at={scdAt} x={X0} y={dg.rowTop(dim.rows.length) + h(96)}>
          <span style={{ ...note(27, BLUE_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            Versions like these: a slowly changing dimension
            <span style={{ color: INK, fontWeight: 560, opacity: ease(frame, historyAt, 10) }}> · where modeling history begins</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
