import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { EVO, splitError } from "./data";
import { type Col, DataTable, Drift, Flow, geoOf, Listing, Mark, MARK, MARK_BAD, Node, OK_INK, Pill, TableName, X0 } from "./parts";

const FILE_Y = 380;
const FILE_ROW = 58;
const LIST_Y = 600;
const TABLE_X = 960;

/** One Parquet file: its name, then the columns it holds. */
const FileRow: React.FC<{
  at: number;
  y: number;
  name: string;
  cols: readonly string[];
  /** Columns in their own ink: new (blue) or renamed (red). */
  inks?: Record<string, string>;
  markAt?: number;
  markOut?: number;
  out?: number;
}> = ({ at, y, name, cols, inks = {}, markAt, markOut, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  const m = (markAt === undefined ? 0 : ease(frame, markAt, 12)) * (markOut === undefined ? 1 : 1 - ease(frame, markOut, 10));
  if (p <= 0 || o >= 1) return null;
  return (
    <div style={{ position: "absolute", left: X0, top: y, display: "flex", alignItems: "center", gap: 18, opacity: p * (1 - o), transform: `translateX(${(1 - p) * -14}px)` }}>
      <span
        style={{
          fontFamily: MONO,
          fontSize: 22,
          fontWeight: 700,
          color: INK,
          padding: "6px 12px",
          border: `2px solid ${INK}`,
          borderRadius: 6,
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </span>
      <span style={{ position: "relative", display: "flex", gap: 14, fontFamily: MONO, fontSize: 21, whiteSpace: "nowrap" }}>
        <span style={{ position: "absolute", inset: "-4px -8px", background: HIGHLIGHT, borderRadius: 4, opacity: m, clipPath: `inset(0 ${(1 - m) * 100}% 0 0)` }} />
        {cols.map((c) => (
          <span key={c} style={{ position: "relative", color: inks[c] ?? INK_SOFT, fontWeight: inks[c] ? 700 : 500 }}>
            {c}
          </span>
        ))}
      </span>
    </div>
  );
};

/**
 * Question 5. Three daily Parquet files read together in DuckDB. Each file
 * keeps its own schema, so the reader decides: by default the first file's
 * columns win and day 2's coupon is dropped without an error (with day 2
 * first, the read fails); union_by_name keeps it, null for day 1; day 3's
 * rename of amount to total reads as one column ending and another
 * beginning, which a table format that tracks columns by ID avoids. Then
 * Avro: a reader resolves the writer's schema against its own, and a schema
 * registry holds each new schema to one compatibility rule, which v2's
 * coupon passes with a default and fails backward without one.
 */
export const EvoScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("evo").from;
  const qAt = n.word("evo", "Question five");
  const textAt = n.word("evo", "What is schema evolution");
  const defAt = n.word("evo", "It's changing a schema");
  const kinds = [
    { text: "add", at: n.word("evo", "adding") },
    { text: "rename", at: n.word("evo", "renaming") },
    { text: "drop", at: n.word("evo", "dropping") },
    { text: "retype", at: n.word("evo", "retyping") },
  ];
  const parqAt = n.word("evo-parquet", "Parquet, the columnar file format");
  const schemaAt = n.word("evo-parquet", "keeps a schema in each file");
  const noRewriteAt = n.word("evo-parquet", "needs no rewrite");
  const decidesAt = n.word("evo-parquet", "the reader decides");
  const day2At = n.word("evo-read", "Day two's file gained a coupon");
  const readAt = n.word("evo-read", "Read both files in DuckDB");
  const firstAt = n.word("evo-read", "takes the first file's columns");
  const goneAt = n.word("evo-read", "coupon silently disappears");
  const failsAt = n.word("evo-fails", "the read fails");
  const nameAt = n.word("evo-byname", "Read them by name");
  const appearsAt = n.word("evo-byname", "coupon appears");
  const emptyAt = n.word("evo-byname", "empty for day one");
  const breakAt = n.word("evo-rename", "Renames and type changes");
  const day3At = n.word("evo-rename", "Day three calls amount total");
  const endAt = n.word("evo-rename", "sees one column end");
  const beginAt = n.word("evo-rename", "and another begin");
  const icebergAt = n.word("evo-iceberg", "Table formats like Iceberg");
  const avroAt = n.word("evo-avro", "Avro, a row format");
  const contractAt = n.word("evo-avro", "makes evolution a contract");
  const resolveAt = n.word("evo-avro-read", "Each reader resolves");
  const matchAt = n.word("evo-avro-read", "fields match by name");
  const defaultAt = n.word("evo-avro-read", "takes the reader's default");
  const aliasAt = n.word("evo-avro-read", "a rename needs an alias");
  const registryAt = n.word("evo-avro-registry", "A schema registry checks");
  const backAt = n.word("evo-avro-registry", "backward compatible");
  const fwdAt = n.word("evo-avro-registry", "forward if old readers");
  const fullAt = n.word("evo-avro-registry", "full if both");
  const withAt = n.word("evo-avro-coupon", "Add coupon with a default");
  const passesAt = n.word("evo-avro-coupon", "passes all three");
  const failsBackAt = n.word("evo-avro-coupon", "it fails backward");
  const suitsAt = n.word("evo-avro-suits", "So it suits many services");
  const end = n.beat("evo-avro-suits").to;
  const gone = avroAt - 2;

  // One table that grows through all three reads: the plain read is its
  // first three columns, union_by_name opens coupon, day 3 opens total and
  // adds a row. Checked against each read DuckDB returned.
  const R = EVO.renamed;
  const same = (a: string[][], b: string[][], k: number) => a.every((r, i) => r.join() === b[i].slice(0, k).join());
  if (!same(EVO.plain.rows, R.rows, 3) || !same(EVO.byName.rows, R.rows, 4) || R.cols.join() !== "order_id,status,amount,coupon,total")
    throw new Error("the schema figure no longer matches the reads");
  const tTop = y(FILE_Y);
  const g = geoOf(R, TABLE_X, tTop, h, { bodySize: 23 });
  const cols: Col[] = R.cols.map((name) => ({
    name,
    numeric: name === "order_id",
    at: name === "coupon" ? nameAt + 6 : name === "total" ? day3At + 10 : undefined,
  }));
  const listTop = y(LIST_Y);
  const reads = [
    { lines: EVO.plainSql.split("\n"), at: readAt, out: nameAt - 2 },
    { lines: EVO.byNameSql.split("\n"), at: nameAt, out: day3At - 2 },
    { lines: EVO.renamedSql.split("\n"), at: day3At, out: gone },
  ];
  const tableBottom = g.rowTop(4);
  // The same two files with day 2 first: DuckDB refuses the read.
  const reversed = splitError(EVO.plainReversed);
  const mismatch = reversed.message.match(/schema mismatch[^:]*/)?.[0];
  if (!mismatch) throw new Error("the reversed read no longer fails on a schema mismatch");

  // Avro: how a reader resolves a record, then the registry's one rule.
  const AY = y(380);
  const resolve = [
    { text: "fields match by name", at: matchAt },
    { text: "a missing field: the reader's default", at: defaultAt },
    { text: "a rename: an alias", at: aliasAt },
  ];
  const reg = { x: 690, y: AY + h(190), w: 330, h: 110 };
  const regMid = AY + h(245);
  const RULE_X = 1130;
  const ruleY = (i: number) => AY + h(150 + i * 85);
  const rules = [
    { name: "backward", at: backAt, text: "new readers read old data", reader: "v2", data: "v1" },
    { name: "forward", at: fwdAt, text: "old readers read new data", reader: "v1", data: "v2" },
    { name: "full", at: fullAt, text: "both", reader: "", data: "" },
  ];

  return (
    <AbsoluteFill>
      {kinds.map((k) => (
        <Sfx key={k.text} name="el-tap" at={k.at} level={-33} />
      ))}
      <Sfx name="el-pop" at={day2At + 4} level={-31} />
      <Sfx name="el-pencil" at={readAt} level={-34} />
      <Sfx name="el-scratch" at={goneAt + 2} level={-31} />
      <Sfx name="el-whoosh" at={nameAt + 6} level={-32} />
      <Sfx name="el-pop" at={day3At + 4} level={-31} />
      <Sfx name="el-scratch" at={failsAt + 2} level={-32} />
      <Sfx name="el-whoosh" at={avroAt} level={-32} />
      {resolve.map((r) => (
        <Sfx key={r.text} name="el-tap" at={r.at} level={-34} />
      ))}
      {rules.map((r) => (
        <Sfx key={r.name} name="el-tap" at={r.at} level={-32} />
      ))}
      <Sfx name="el-chime" at={passesAt + 4} level={-33} />
      <Sfx name="el-scratch" at={failsBackAt + 2} level={-32} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is schema evolution, and how do Parquet and Avro handle it?
        </QuestionCard>
        <Note at={defAt} x={X0} y={y(296)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 12 }}>
            Changing a schema without breaking readers or rewriting old data:
            {kinds.map((k) => (
              <span key={k.text} style={{ ...label(22, BLUE_INK), fontWeight: 700, padding: "2px 10px", border: `2px solid ${BAR}`, borderRadius: 8, opacity: ease(frame, k.at, 8) }}>
                {k.text}
              </span>
            ))}
          </span>
        </Note>

        {/* Parquet: three daily files. */}
        <Note at={parqAt} x={X0} y={tTop - 40} out={gone}>
          <span style={{ ...label(22, INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            Parquet, one file a day<span style={{ opacity: ease(frame, schemaAt, 10) }}>: each file keeps its own schema</span>
          </span>
        </Note>
        <FileRow at={parqAt + 4} y={tTop} name="day1.parquet" cols={EVO.files[0]} markAt={firstAt} markOut={nameAt} out={gone} />
        <FileRow at={day2At} y={tTop + h(FILE_ROW)} name="day2.parquet" cols={EVO.files[1]} inks={{ coupon: BLUE_INK }} out={gone} />
        <FileRow at={day3At} y={tTop + 2 * h(FILE_ROW)} name="day3.parquet" cols={EVO.files[2]} inks={{ coupon: BLUE_INK, total: ACCENT_INK }} out={gone} />

        {/* Before any read: what a schema per file buys, and what it leaves open. */}
        <Note at={noRewriteAt} x={TABLE_X} y={tTop + h(10)} out={readAt}>
          <div style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            add a column: <b>old files need no rewrite</b>
          </div>
          <div style={{ ...note(25, INK), whiteSpace: "nowrap", marginTop: 14, opacity: ease(frame, decidesAt, 10) }}>
            <Mark at={decidesAt + 4}>the reader decides</Mark> whether it survives
          </div>
        </Note>

        {reads.map((r, i) => (
          <Listing key={i} lines={r.lines} x={X0} top={listTop} width={720} size={21} at={r.at} out={r.out} marks={i === 1 ? [{ line: 2, at: nameAt + 4 }] : []} />
        ))}

        {/* What DuckDB returned. */}
        <TableName g={g} at={readAt + 6} out={gone}>
          What DuckDB returns
        </TableName>
        <DataTable
          g={g}
          cols={cols}
          at={readAt + 6}
          out={gone}
          rows={R.rows.map((cells, i) => ({ cells, at: i < 3 ? readAt + 10 + i * 3 : day3At + 6, grow: i === 3 }))}
          marks={[
            { row: 0, col: 3, at: emptyAt, color: MARK },
            { row: 1, col: 3, at: emptyAt + 3, color: MARK },
            { row: 3, col: 2, at: endAt, color: MARK_BAD },
            { row: 0, col: 4, at: beginAt, color: MARK_BAD },
            { row: 1, col: 4, at: beginAt + 3, color: MARK_BAD },
            { row: 2, col: 4, at: beginAt + 6, color: MARK_BAD },
          ]}
        />
        <Note at={goneAt} x={TABLE_X} y={tableBottom + h(24)} out={nameAt + 4}>
          <span style={{ ...note(25, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>by default: coupon dropped, and no error</span>
        </Note>
        <Note at={failsAt} x={TABLE_X} y={tableBottom + h(70)} out={nameAt + 4}>
          <span style={{ ...note(24, ACCENT_INK), whiteSpace: "nowrap" }}>
            day 2 first: <b>{reversed.kind}</b>, {mismatch}
          </span>
        </Note>
        <Note at={appearsAt + 4} x={TABLE_X} y={tableBottom + h(24)} out={breakAt}>
          <span style={{ ...note(25, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>by name: coupon kept, null for day 1</span>
        </Note>
        <Note at={breakAt} x={TABLE_X} y={tableBottom + h(76)} out={gone}>
          <span style={{ ...note(25, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>renames and type changes break readers</span>
        </Note>
        <Note at={endAt + 4} x={TABLE_X} y={tableBottom + h(120)} out={gone}>
          <span style={{ ...note(24, ACCENT_INK), whiteSpace: "nowrap" }}>
            <span style={{ fontFamily: MONO }}>amount</span> ends
            <span style={{ opacity: ease(frame, beginAt + 4, 10) }}>
              , <span style={{ fontFamily: MONO }}>total</span> begins: each half empty
            </span>
          </span>
        </Note>
        <Note at={icebergAt} x={TABLE_X} y={tableBottom + h(176)} out={gone}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: OK_INK }}>safe rename:</b> a table format like Iceberg, which tracks columns by ID
          </span>
        </Note>

        {/* Avro: a reader resolves each record against its own schema. */}
        <Note at={avroAt + 4} x={X0} y={AY - 40}>
          <span style={{ ...label(22, INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            Avro, a row format for messages<span style={{ color: OK_INK, opacity: ease(frame, contractAt, 10) }}>: evolution as a contract</span>
          </span>
        </Note>
        <Note at={resolveAt} x={X0} y={AY + h(16)}>
          <span style={{ display: "flex", alignItems: "center", gap: 14, whiteSpace: "nowrap" }}>
            <span style={{ ...label(22, INK_SOFT), fontWeight: 650 }}>A reader resolves the writer's schema:</span>
            {resolve.map((r) => (
              <span key={r.text} style={{ ...label(21, INK), fontWeight: 650, padding: "4px 12px 5px", border: `2px solid ${INK}`, borderRadius: 8, opacity: ease(frame, r.at, 10) }}>
                {r.text}
              </span>
            ))}
          </span>
        </Note>

        {/* The registry holds v2 to one rule. */}
        <Node x={X0} y={AY + h(90)} w={420} h={h(80)} at={contractAt} tone="data" align="left" title="schema v1" size={22} sub={<span style={{ fontFamily: MONO }}>order_id, status, amount</span>} />
        <Node
          x={X0}
          y={AY + h(210)}
          w={420}
          h={h(80)}
          at={registryAt + 2}
          tone="data"
          align="left"
          title="schema v2, new"
          size={22}
          sub={
            <span>
              <span style={{ fontFamily: MONO }}>…, amount, coupon</span>
              <span style={{ color: OK_INK, fontWeight: 650, opacity: ease(frame, withAt, 10) }}> default null</span>
            </span>
          }
        />
        <Flow points={[[X0 + 426, AY + h(250)], [reg.x - 8, AY + h(250)]]} at={registryAt + 8} color={BAR} />
        <Flow points={[[X0 + 426, AY + h(130)], [reg.x - 60, AY + h(130)], [reg.x - 60, AY + h(220)], [reg.x - 8, AY + h(220)]]} at={registryAt + 10} color={INK_SOFT} width={2} head={12} />
        <Node x={reg.x} y={reg.y} w={reg.w} h={h(reg.h)} at={registryAt + 4} tone="plain" title="schema registry" sub="checks v2 against v1" />
        <Flow points={[[reg.x + reg.w + 6, regMid], [RULE_X - 30, regMid]]} at={backAt - 6} color={INK} width={2.2} head={12} />
        <Note at={backAt - 6} x={RULE_X - 14} y={AY + h(108)}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>one rule, set in the registry:</span>
        </Note>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, backAt - 6, 10) }}>
          {/* A bracket that gathers the three rules, for the arrow to land on. */}
          <path
            d={`M${RULE_X - 14},${ruleY(0) + 4} L${RULE_X - 22},${ruleY(0) + 4} L${RULE_X - 22},${ruleY(2) + h(54)} L${RULE_X - 14},${ruleY(2) + h(54)}`}
            fill="none"
            stroke={INK_SOFT}
            strokeWidth={2}
          />
        </svg>
        {rules.map((r, i) => (
          <Note key={r.name} at={r.at} x={RULE_X} y={ruleY(i)}>
            <div style={{ ...label(25, INK), fontWeight: 750, whiteSpace: "nowrap" }}>{r.name}</div>
            <div style={{ ...note(23, INK), whiteSpace: "nowrap", marginTop: 2 }}>
              {r.text}
              {r.reader ? (
                <span style={{ ...label(20, INK_SOFT), marginLeft: 14 }}>
                  ({r.reader} reader, {r.data} data)
                </span>
              ) : null}
            </div>
          </Note>
        ))}

        {/* The verdict on v2's coupon. */}
        <Pill x={X0} y={AY + h(318)} at={passesAt} tone="ok" size={22}>
          coupon with a default: passes all three
        </Pill>
        <Note at={failsBackAt} x={X0} y={AY + h(370)}>
          <span style={{ ...note(23, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>no default: fails backward, so fails full</span>
        </Note>
        <Pill x={X0} y={AY + h(428)} at={suitsAt} tone="ok" size={23} solid>
          many services that must agree on one schema
        </Pill>
      </Drift>
    </AbsoluteFill>
  );
};
