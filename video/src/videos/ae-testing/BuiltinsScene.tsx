import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { OK_INK, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, HAIRLINE, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { BUILTINS, type Test } from "./data";
import {
  Bracket,
  DataTable,
  Drift,
  Flow,
  linesFrom,
  Listing,
  listingCharX,
  listingLineMid,
  ListingTitle,
  listingWidth,
  MARK,
  MARK_RED,
  resultGeometry,
  SmallMono,
  TableName,
  tableGeometry,
  TestResult,
  X0,
} from "./parts";

const FIG_Y = 330;
const YAML_SIZE = 20;
const PANE_SIZE = 19;
const TABLE = { x: 1310, y: 540 };

type Pane = { name: string; test: Test; lines: string[]; at: number; litAt: number };

/**
 * Questions 3 and 4. The page's YAML for fct_orders, each test named in
 * yellow as it is read, with what each one checks beside it. Then each test
 * as the query it compiles to (the clause that decides), beside the one row
 * it returns from the video's own eight rows, each row lit in the table as
 * it is named; unique lets the null through, so unique and not_null are
 * bracketed as a key. Question 4: the generic tests as one query with the
 * column as a slot, the page's singular test beside its one row (order 7,
 * -25.00), and the two kinds side by side, the copied singular test
 * becoming a generic one.
 */
export const BuiltinsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("builtins").from;
  const q3At = n.word("builtins", "Question three");
  const q3TextAt = n.word("builtins", "What are dbt's four");
  const yamlAt = n.word("builtins", "Here they are in YAML");
  const uniqueAt = n.word("builtins", "unique");
  const notNullAt = n.word("builtins", "not null");
  const acceptedAt = n.word("builtins", "accepted values");
  const relAt = n.word("builtins", "relationships");
  const dimAt = n.word("builtins", "the customer dimension");
  const compilesAt = n.word("builtins-run", "Each one compiles");
  const eightAt = n.word("builtins-run", "Here are eight rows");
  const plantedAt = n.word("builtins-run", "a problem planted");
  const exactlyAt = n.word("builtins-run", "every query returns exactly");
  const each = [
    n.word("builtins-each", "Order three"),
    n.word("builtins-each", "The row with no ID"),
    n.word("builtins-each", "A status of returned"),
    n.word("builtins-each", "customer ninety-nine"),
  ];
  const letAt = n.word("builtins-pair", "unique let the missing ID through");
  const singleAt = n.word("builtins-pair", "a single null isn't a duplicate");
  const togetherAt = n.word("builtins-pair", "unique and not null go together");
  const pkAt = n.word("builtins-pair", "a valid primary key");
  const q4At = n.word("singular", "Question four");
  const q4TextAt = n.word("singular", "Generic versus singular");
  const genericAt = n.word("singular", "Those four are generic");
  const paramAt = n.word("singular", "the column as a parameter");
  const anyColAt = n.word("singular", "attached to any column");
  const macroAt = n.word("singular", "Your own generic tests are macros");
  const fileAt = n.word("singular-sql", "one SQL file for one rule");
  const negAt = n.word("singular-sql", "a negative amount");
  const sevenAt = n.word("singular-sql", "it returns order seven");
  const minusAt = n.word("singular-sql", "minus twenty-five dollars");
  const reuseAt = n.word("singular-pick", "generic for rules you reuse");
  const bespokeAt = n.word("singular-pick", "singular for bespoke business checks");
  const copyingAt = n.word("singular-pick", "copying into other models");
  const becomeAt = n.word("singular-pick", "wants to become a generic one");
  const end = n.beat("singular-pick").to;

  const top = y(FIG_Y);
  const q3Out = q4At - 6;

  // ── The page's YAML, and what each test checks ──
  const yaml = BUILTINS.yaml;
  const yamlW = listingWidth(yaml, YAML_SIZE);
  const checks = [
    { name: "unique", text: "every value is distinct", at: uniqueAt + 4 },
    { name: "not_null", text: "no nulls", at: notNullAt + 4 },
    { name: "accepted_values", text: "every value is in the list", at: acceptedAt + 4 },
    { name: "relationships", text: "every value has a match in the parent", at: relAt + 4 },
  ];

  // ── Four tests, each as the clause it compiles to, beside its one row ──
  const panes: Pane[] = [
    { name: "unique", test: BUILTINS.unique, lines: linesFrom(BUILTINS.unique.sql, "GROUP BY", "HAVING"), at: compilesAt, litAt: each[0] },
    { name: "not_null", test: BUILTINS.notNull, lines: linesFrom(BUILTINS.notNull.sql, "WHERE"), at: compilesAt + 6, litAt: each[1] },
    { name: "accepted_values", test: BUILTINS.acceptedValues, lines: linesFrom(BUILTINS.acceptedValues.sql, "WHERE"), at: compilesAt + 12, litAt: each[2] },
    { name: "relationships", test: BUILTINS.relationships, lines: linesFrom(BUILTINS.relationships.sql, "LEFT JOIN"), at: compilesAt + 18, litAt: each[3] },
  ];
  const paneW = Math.max(...panes.map((p) => listingWidth(p.lines, PANE_SIZE)));
  const resultX = X0 + paneW + 28;
  const listH = (k: number) => 2 * Math.round(PANE_SIZE * 0.66) + k * Math.round(PANE_SIZE * 1.8);
  const resultH = h(34) + h(36);
  const paneTops: number[] = [];
  panes.forEach((p, i) => {
    paneTops.push(i === 0 ? top : paneTops[i - 1] + Math.max(listH(panes[i - 1].lines.length), resultH) + h(60));
  });
  const paneResult = (p: Pane, i: number) =>
    tableGeometry({ x: resultX, top: paneTops[i], cols: p.test.result.cols.map((name) => ({ name })), rows: p.test.result.rows, headH: h(34), rowH: h(36), headSize: 18, bodySize: PANE_SIZE, pad: 12 });

  // ── The video's own eight rows ──
  const t = BUILTINS.table;
  const tg = tableGeometry({ x: TABLE.x, top: y(TABLE.y), cols: t.cols.map((name) => ({ name })), rows: t.rows, headH: h(34), rowH: h(36), headSize: 18, bodySize: PANE_SIZE, pad: 12 });
  const rowOf = (pred: (r: string[]) => boolean) => t.rows.findIndex(pred);
  const firstThree = rowOf((r) => r[0] === BUILTINS.unique.result.rows[0][0]);
  const nullRow = rowOf((r) => r[0] === "null");
  const returnedRow = rowOf((r) => r[1] === BUILTINS.acceptedValues.result.rows[0][1]);
  const orphanRow = rowOf((r) => r[2] === BUILTINS.relationships.result.rows[0][2]);
  const sevenRow = rowOf((r) => r[0] === BUILTINS.singular.result.rows[0][0]);
  const statusCol = t.cols.indexOf("status");
  const customerCol = t.cols.indexOf("customer_id");
  const amountCol = t.cols.indexOf("amount");

  // ── Question 4 ──
  const tmplTop = top;
  const tmpl = linesFrom(BUILTINS.notNull.sql, "SELECT");
  const slotLine = tmpl.findIndex((l) => l.startsWith("WHERE"));
  const slotWord = "order_id";
  const slotCol = tmpl[slotLine].indexOf(slotWord);
  const SLOT_CHARS = 11;
  const tmplLines = tmpl.map((l, i) => (i === slotLine ? `${l.slice(0, slotCol)}${" ".repeat(SLOT_CHARS)}${l.slice(slotCol + slotWord.length)}` : l));
  const tmplW = listingWidth(tmplLines, YAML_SIZE);
  const slotNames = ["column_name", ...t.cols.filter((c) => c !== "amount").map((c) => c)];
  const slotAts = [paramAt, anyColAt, anyColAt + 14, anyColAt + 28];
  const sing = BUILTINS.singularFile;
  const fileName = sing[0].replace(/^--\s*/, "").split(" ")[0];
  const singLines = sing.slice(1);
  const singTop = y(540);
  const singW = listingWidth(singLines, YAML_SIZE);
  const sr = BUILTINS.singular.result;
  const srg = resultGeometry(X0 + singW + 28, singTop, sr.cols, sr.rows, h, 20);
  const colsTop = y(726);
  const COL_X = [X0, 700];

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={yamlAt} level={-35} />
      {[uniqueAt, notNullAt, acceptedAt, relAt].map((at, i) => (
        <Sfx key={i} name="el-pencil" at={at + 2} level={-36} />
      ))}
      <Sfx name="el-whoosh" at={compilesAt - 2} level={-37} />
      <Sfx name="el-sprinkle" at={eightAt} level={-34} />
      {panes.map((p, i) => (
        <Sfx key={p.name} name="el-tap" at={exactlyAt + 4 + i * 6} level={-33} />
      ))}
      {each.map((at, i) => (
        <Sfx key={i} name="el-pencil" at={at + 2} level={-35} />
      ))}
      <Sfx name="el-pencil" at={letAt + 4} level={-35} />
      <Sfx name="el-pencil" at={togetherAt + 2} level={-35} />
      <Sfx name="el-chime" at={pkAt + 4} level={-33} />
      <Sfx name="el-whoosh" at={genericAt - 4} level={-37} />
      {slotAts.slice(1).map((at, i) => (
        <Sfx key={i} name="el-tap" at={at} level={-35} />
      ))}
      <Sfx name="el-sprinkle" at={fileAt} level={-35} />
      <Sfx name="el-tap" at={sevenAt + 2} level={-32} />
      <Sfx name="el-tap" at={reuseAt} level={-34} />
      <Sfx name="el-tap" at={bespokeAt} level={-34} />
      <Sfx name="el-pencil" at={becomeAt} level={-35} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={3} at={q3At - 4} textAt={q3TextAt - 4} out={q3Out} size={58}>
          What are dbt&rsquo;s four built-in generic tests?
        </QuestionCard>
        <QuestionCard n={4} at={q4At - 2} textAt={q4TextAt - 4} size={58}>
          Generic vs singular tests, what is the difference?
        </QuestionCard>

        {/* ── The page's YAML, each test named as it is read ── */}
        <ListingTitle x={X0} top={top} at={yamlAt} out={compilesAt - 4}>
          <SmallMono>models/schema.yml</SmallMono>, on the page
        </ListingTitle>
        <Listing
          lines={yaml}
          lang="yaml"
          x={X0}
          top={top}
          size={YAML_SIZE}
          at={yamlAt}
          step={2}
          out={compilesAt - 4}
          marks={[
            { line: "tests: [unique", text: "unique", at: uniqueAt },
            { line: "tests: [unique", text: "not_null", at: notNullAt },
            { line: "- accepted_values", text: "accepted_values", at: acceptedAt },
            { line: "- relationships", text: "relationships", at: relAt },
            { line: "to: ref('dim_customer')", text: "ref('dim_customer')", at: dimAt },
          ]}
        />
        <Note at={uniqueAt} x={X0 + yamlW + 70} y={top - h(40)} out={compilesAt - 4}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>What each checks</span>
        </Note>
        {checks.map((c, i) => (
          <Note key={c.name} at={c.at} x={X0 + yamlW + 70} y={top + h(8) + i * h(64)} out={compilesAt - 4}>
            <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
              <SmallMono>{c.name}</SmallMono>
              <span style={{ color: INK_SOFT }}>: {c.text}</span>
            </span>
          </Note>
        ))}

        {/* ── Each test, as the query it compiles to, beside its one row ── */}
        {panes.map((p, i) => {
          const rg = paneResult(p, i);
          const lit = ease(frame, p.litAt - 2, 10) * (1 - ease(frame, panes[i + 1]?.litAt ?? letAt, 10));
          return (
            <React.Fragment key={p.name}>
              <ListingTitle x={X0} top={paneTops[i]} at={p.at} out={q3Out}>
                <span style={{ fontFamily: MONO, fontSize: 21, fontWeight: 500, background: lit > 0.01 ? `color-mix(in srgb, ${inkOf.yellow} ${30 * lit}%, transparent)` : undefined, borderRadius: 4, padding: "0 4px", margin: "0 -4px" }}>{p.name}</span>
              </ListingTitle>
              <Listing lines={p.lines} x={X0} top={paneTops[i]} width={paneW} size={PANE_SIZE} at={p.at} out={q3Out} />
              <TestResult
                g={rg}
                cols={p.test.result.cols.map((name) => ({ name }))}
                rows={p.test.result.rows}
                at={exactlyAt + i * 6}
                verdict={[{ at: exactlyAt + 4 + i * 6, tone: "bad", text: "1 row: fail" }]}
                verdictSize={20}
                bands={[{ row: 0, at: p.litAt, out: panes[i + 1]?.litAt ?? letAt, color: MARK_RED }]}
                out={q3Out}
              />
            </React.Fragment>
          );
        })}
        {/* unique's pane holds only order 3: the null went through. */}
        <Note at={singleAt} x={resultX + paneResult(panes[0], 0).width + 30} y={paneTops[0] + h(10)} out={q3Out}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>
            Not here: the null row
          </span>
        </Note>
        <Bracket x={resultX + 500} top={paneTops[0] - h(46)} bottom={paneTops[1] + resultH} at={togetherAt + 4} out={q3Out}>
          <span style={{ ...note(24, OK_INK), fontWeight: 600, opacity: ease(frame, pkAt - 2, 10) }}>= a valid primary key</span>
        </Bracket>

        {/* ── The eight rows, one problem for each test ── */}
        <TableName g={tg} at={eightAt}>
          fct_orders <span style={{ color: INK_SOFT }}>· </span>
          <span style={{ color: BLUE_INK }}>{t.rows.length} rows</span>
          <span style={{ color: INK_SOFT, opacity: ease(frame, plantedAt, 10) }}>, a problem for each test</span>
        </TableName>
        <DataTable
          g={tg}
          cols={t.cols.map((name) => ({ name, numeric: name !== "status" }))}
          rows={t.rows.map((cells, i) => ({ cells, at: eightAt + 4 + i * 2 }))}
          at={eightAt}
          bands={[
            { row: firstThree, at: each[0], out: each[1], color: MARK_RED },
            { row: firstThree + 1, at: each[0] + 3, out: each[1], color: MARK_RED },
            { row: nullRow, at: each[1], out: each[2], color: MARK_RED },
            { row: nullRow, at: letAt + 2, out: q4At, color: MARK },
            { row: returnedRow, at: each[2], out: each[3], color: MARK_RED },
            { row: orphanRow, at: each[3], out: letAt, color: MARK_RED },
            { row: sevenRow, at: sevenAt + 4, color: MARK_RED },
          ]}
          marks={[
            { row: returnedRow, col: statusCol, at: each[2] + 6, out: each[3], color: MARK_RED },
            { row: orphanRow, col: customerCol, at: each[3] + 6, out: letAt, color: MARK_RED },
            { row: sevenRow, col: amountCol, at: minusAt, color: MARK_RED },
          ]}
        />
        <Note at={eightAt + 20} x={tg.x} y={tg.rowTop(t.rows.length) + h(14)}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>
            <SmallMono>dim_customer</SmallMono> holds {BUILTINS.dim.rows.map((r) => r[0]).join(", ")}
          </span>
        </Note>

        {/* ── Question 4: generic tests are one query, the column a slot ── */}
        <ListingTitle x={X0} top={tmplTop} at={genericAt} out={fileAt - 4} dim={fileAt - 4}>
          Generic: written once, the column a parameter
        </ListingTitle>
        <Listing lines={tmplLines} x={X0} top={tmplTop} size={YAML_SIZE} at={genericAt + 2} dim={fileAt + 10} />
        <Slot
          x={listingCharX(X0, slotCol, YAML_SIZE)}
          mid={listingLineMid(tmplTop, slotLine, YAML_SIZE)}
          size={YAML_SIZE}
          chars={SLOT_CHARS}
          names={slotNames}
          ats={slotAts}
          at={genericAt + 8}
          dim={fileAt + 10}
        />
        <Note at={anyColAt} x={X0 + tmplW + 40} y={tmplTop + h(30)} dim={fileAt + 10}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>Attached in YAML to any column</span>
        </Note>
        <Note at={macroAt} x={X0 + tmplW + 40} y={tmplTop + h(76)} dim={fileAt + 10}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            Your own generic test: <b>a macro</b>
          </span>
        </Note>

        {/* ── A singular test: one SQL file, one rule ── */}
        <ListingTitle x={X0} top={singTop} at={fileAt}>
          Singular: <SmallMono>{fileName}</SmallMono>
        </ListingTitle>
        <Listing lines={singLines} x={X0} top={singTop} size={YAML_SIZE} at={fileAt} marks={[{ line: "WHERE amount < 0", at: negAt }]} />
        <TestResult
          g={srg}
          cols={sr.cols.map((name) => ({ name, numeric: true }))}
          rows={sr.rows}
          at={sevenAt - 2}
          verdict={[{ at: sevenAt, tone: "bad", text: "1 row: fail" }]}
          marks={[{ row: 0, col: 1, at: minusAt, color: MARK_RED }]}
        />

        {/* ── Which to reach for ── */}
        <TwoColumns top={colsTop} xs={COL_X} heads={[{ head: "Generic", sub: "Reusable rules", at: reuseAt }, { head: "Singular", sub: "Bespoke business checks", at: bespokeAt }]} />
        <Copies x={COL_X[1]} top={colsTop + h(96)} at={copyingAt} names={["fct_orders", "fct_refunds", "fct_invoices"]} />
        <Flow points={[[COL_X[1] - 24, colsTop + h(114)], [COL_X[0] + 330, colsTop + h(114)]]} at={becomeAt} dur={16} color={INK} />
        <Note at={becomeAt + 8} x={COL_X[0]} y={colsTop + h(96)}>
          <span style={{ ...note(22, INK), fontWeight: 500, whiteSpace: "nowrap" }}>Make it generic</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};

/**
 * The generic test's column: a dashed slot in the listing line, holding
 * dbt's parameter name, then each column it is attached to in turn.
 */
const Slot: React.FC<{ x: number; mid: number; size: number; chars: number; names: readonly string[]; ats: readonly number[]; at: number; dim?: number }> = ({
  x,
  mid,
  size,
  chars,
  names,
  ats,
  at,
  dim,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.55;
  if (frame < at) return null;
  const w = chars * 0.6 * size + 12;
  return (
    <div
      style={{
        position: "absolute",
        left: x - 6,
        top: mid - size * 0.8,
        width: w,
        height: size * 1.6,
        boxSizing: "border-box",
        border: `2px dashed ${inkOf.yellow}`,
        borderRadius: 6,
        opacity: Math.min(1, p) * (1 - d),
      }}
    >
      {names.map((name, i) => {
        const on = ease(frame, ats[i], 8) * (i + 1 < names.length ? 1 - ease(frame, ats[i + 1] - 4, 6) : 1);
        if (on <= 0) return null;
        return (
          <span
            key={name}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: MONO,
              fontSize: size,
              color: i === 0 ? INK_SOFT : INK,
              fontStyle: i === 0 ? "italic" : "normal",
              opacity: on,
              transform: `translateY(${(1 - on) * 6}px)`,
            }}
          >
            {name}
          </span>
        );
      })}
    </div>
  );
};

/** Two columns of a heading and a line under it, a hairline between. */
const TwoColumns: React.FC<{ top: number; xs: readonly number[]; heads: readonly { head: string; sub: string; at: number }[] }> = ({ top, xs, heads }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {heads.map((c, i) => (
        <React.Fragment key={c.head}>
          {i > 0 ? (
            <div style={{ position: "absolute", left: xs[i] - 40, top: top + 2, width: 1, height: 70 * ease(frame, c.at - 2, 14), background: HAIRLINE }} />
          ) : null}
          <Ink at={c.at - 2} dur={12} style={{ left: xs[i], top, whiteSpace: "nowrap" }}>
            <div style={{ ...label(26, INK), fontWeight: 600 }}>{c.head}</div>
            <div style={{ ...note(23, INK_SOFT), marginTop: 10 }}>{c.sub}</div>
          </Ink>
        </React.Fragment>
      ))}
    </>
  );
};

/** The same singular check, copied into model after model: one file each. */
const Copies: React.FC<{ x: number; top: number; at: number; names: readonly string[] }> = ({ x, top, at, names }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: x, top, display: "flex", gap: "0.8em", fontSize: 21, whiteSpace: "nowrap" }}>
      {names.map((name, i) => {
        const p = ease(frame, at + i * 6, 10);
        return (
          <span key={name} style={{ fontFamily: MONO, fontSize: 21, color: INK, opacity: p, transform: `translateY(${(1 - p) * 8}px)` }}>
            {name}
          </span>
        );
      })}
    </div>
  );
};

