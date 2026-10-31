import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, INK, INK_SOFT, PAPER, headline, label, note } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { COLUMNS, FILES, MB } from "./data";
import { COLUMN_TINT, Drift, FileBar, OK, OK_INK, PARQUET_SEGMENTS, pulse, X0 } from "./parts";

const TOP = 300;
const CARD_W = 520;
const CARD_GAP = 60;
const DIAGRAM_Y = 372;
const DIAGRAM_H = 84;
const LINES_Y = 484;
const LINE_H = 38;
const CSV_W = 820;

const TINTS = COLUMNS.map((c) => COLUMN_TINT[c.name]);

/** Column chunks inside row groups (Parquet) or stripes (ORC), then a footer of statistics. */
const Columnar: React.FC<{ x: number; y: number; h: number; at: number; part: string; statsAt: number }> = ({ x, y, h, at, part, statsAt }) => {
  const frame = useCurrentFrame();
  const groupW = 168;
  return (
    <>
      {[0, 1].map((gIdx) => {
        const p = ease(frame, at + gIdx * 6, 14);
        return (
          <div key={gIdx} style={{ position: "absolute", left: x + gIdx * (groupW + 14), top: y, width: groupW, height: h, opacity: p }}>
            <div style={{ display: "flex", gap: 3, height: h - 26 }}>
              {TINTS.map((t, i) => (
                <div key={i} style={{ flex: 1, background: t, borderRadius: 2, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${INK} 18%, transparent)` }} />
              ))}
            </div>
            <div style={{ ...label(19, INK_SOFT), marginTop: 4, whiteSpace: "nowrap" }}>
              {part} {gIdx + 1}
            </div>
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: x + 2 * (groupW + 14),
          top: y,
          width: 120,
          height: h - 26,
          borderRadius: 3,
          border: `2px solid ${INK}`,
          boxSizing: "border-box",
          background: PAPER,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...label(19, INK),
          opacity: ease(frame, statsAt, 12),
        }}
      >
        min / max
      </div>
    </>
  );
};

/** A schema in the header, then whole records one after another. */
const Rows: React.FC<{ x: number; y: number; h: number; at: number; schemaAt: number }> = ({ x, y, h, at, schemaAt }) => {
  const frame = useCurrentFrame();
  const recH = (h - 26 - 2 * 4) / 3;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: 104,
          height: h - 26,
          borderRadius: 3,
          border: `2px solid ${INK}`,
          boxSizing: "border-box",
          background: PAPER,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...label(19, INK),
          opacity: ease(frame, schemaAt, 12),
        }}
      >
        schema
      </div>
      {[0, 1, 2].map((r) => (
        <div
          key={r}
          style={{
            position: "absolute",
            left: x + 118,
            top: y + r * (recH + 4),
            height: recH,
            width: 340,
            display: "flex",
            gap: 3,
            opacity: ease(frame, at + r * 5, 12),
          }}
        >
          {TINTS.map((t, i) => (
            <div key={i} style={{ flex: i === 5 ? 1.4 : 1, background: t, borderRadius: 2, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${INK} 18%, transparent)` }} />
          ))}
        </div>
      ))}
      <div style={{ position: "absolute", left: x + 118, top: y + h - 22, ...label(19, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, at + 12, 12) }}>
        record 1, record 2, record 3 …
      </div>
    </>
  );
};

/**
 * Question 3, which also answers the Pipelines page's Parquet-over-CSV, Avro
 * and ORC questions. Three cards, each with its layout: Parquet and ORC as
 * column chunks inside row groups (stripes, in ORC) with a footer of min/max
 * statistics; Avro as a schema in the header and whole records after it.
 * Then Parquet against CSV, measured on the made-up table (types, a schema,
 * under a quarter of the size), and the rule of thumb.
 */
export const FormatsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("fmt").from;
  const qAt = n.word("fmt", "Question three");
  const qTextAt = n.word("fmt", "Compare Parquet");
  const qEnd = n.beat("fmt").to;
  const pqAt = n.word("fmt-columnar", "Parquet and ORC");
  const orcAt = n.word("fmt-columnar", "ORC, optimized row columnar");
  const bothAt = n.word("fmt-columnar", "both columnar and compressed");
  const statsAt = n.word("fmt-columnar", "per-column statistics");
  const defaultAt = n.word("fmt-columnar", "Parquet is the default");
  const hiveAt = n.word("fmt-columnar", "ORC grew up around Hive");
  const avroAt = n.word("fmt-avro", "Avro, a row-based binary format");
  const recordsAt = n.word("fmt-avro", "writes whole records");
  const schemaAt = n.word("fmt-avro", "its files carry the schema");
  const streamAt = n.word("fmt-avro", "It suits streaming");
  const compatAt = n.word("fmt-avro", "its compatibility rules");
  const csvAt = n.word("fmt-csv", "And over CSV");
  const typesAt = n.word("fmt-csv", "types and a schema");
  const quarterAt = n.word("fmt-csv", "under a quarter of the size");
  const ruleAt = n.word("fmt-csv", "Columnar for analytics");
  const motionAt = n.word("fmt-csv", "Avro for records in motion");
  const end = n.beat("fmt-csv").to;

  const cardX = (i: number) => X0 + i * (CARD_W + CARD_GAP);
  const cards: {
    name: string;
    kind: string;
    at: number;
    kindAt: number;
    diagram: React.ReactNode;
    lines: { at: number; text: React.ReactNode }[];
  }[] = [
    {
      name: "Parquet",
      kind: "columnar",
      at: pqAt,
      kindAt: bothAt,
      diagram: <Columnar x={cardX(0)} y={y(DIAGRAM_Y)} h={h(DIAGRAM_H)} at={bothAt} part="row group" statsAt={statsAt} />,
      lines: [
        { at: bothAt + 4, text: "columnar, compressed" },
        { at: statsAt + 4, text: "min and max per column, to skip data" },
        { at: defaultAt, text: "the default: Spark, pandas, DuckDB, BigQuery, Snowflake" },
      ],
    },
    {
      name: "ORC",
      kind: "optimized row columnar",
      at: orcAt,
      kindAt: orcAt + 6,
      diagram: <Columnar x={cardX(1)} y={y(DIAGRAM_Y)} h={h(DIAGRAM_H)} at={bothAt + 6} part="stripe" statsAt={statsAt + 6} />,
      lines: [
        { at: bothAt + 10, text: "columnar, compressed" },
        { at: statsAt + 10, text: "statistics to skip data" },
        { at: hiveAt, text: "grew up with Hive, in Hadoop" },
      ],
    },
    {
      name: "Avro",
      kind: "row-based, binary",
      at: avroAt,
      kindAt: avroAt + 6,
      diagram: <Rows x={cardX(2)} y={y(DIAGRAM_Y)} h={h(DIAGRAM_H)} at={recordsAt} schemaAt={schemaAt} />,
      lines: [
        { at: schemaAt + 4, text: "the writer's schema in the file header" },
        { at: streamAt, text: "a record at a time: streaming, Kafka" },
        { at: compatAt, text: "schemas evolve by compatibility rules" },
      ],
    },
  ];

  const pqW = (CSV_W * FILES.parquet) / FILES.csv;
  const lowY = y(690);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={pqAt} level={-34} />
      <Sfx name="el-pop" at={orcAt} level={-34} />
      <Sfx name="el-pop" at={avroAt} level={-34} />
      <Sfx name="el-whoosh" at={csvAt + 2} level={-36} />
      <Sfx name="el-tap" at={quarterAt + 4} level={-35} />
      <Sfx name="el-chime" at={ruleAt + 4} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={3} at={qAt - 4} textAt={qTextAt - 2} size={60}>
          Compare Parquet, ORC, and Avro.
        </QuestionCard>

        {cards.map((c, i) => {
          // The three names head their cards as the question finishes, and
          // each swells as the answer reaches it.
          const p = ease(frame, qEnd - 12 + i * 6, 14);
          if (p <= 0) return null;
          const x = cardX(i);
          const named = pulse(frame, c.at, 18);
          return (
            <React.Fragment key={c.name}>
              <div style={{ position: "absolute", left: x, top: y(TOP), width: CARD_W, height: 2, background: INK, transform: `scaleX(${p})`, transformOrigin: "left" }} />
              <div style={{ position: "absolute", left: x, top: y(TOP) + 12, display: "flex", alignItems: "baseline", gap: 14, whiteSpace: "nowrap", opacity: p }}>
                <span style={{ ...headline(44), display: "inline-block", transform: `scale(${1 + 0.08 * named})`, transformOrigin: "left bottom" }}>{c.name}</span>
                <span style={{ ...label(21, BLUE_INK), opacity: ease(frame, c.kindAt, 10) }}>{c.kind}</span>
              </div>
              {c.diagram}
              {c.lines.map((l, k) => (
                <div
                  key={k}
                  style={{
                    position: "absolute",
                    left: x,
                    top: y(LINES_Y) + k * h(LINE_H),
                    width: CARD_W,
                    ...note(22, INK),
                    lineHeight: 1.2,
                    opacity: ease(frame, l.at, 12),
                  }}
                >
                  {l.text}
                </div>
              ))}
            </React.Fragment>
          );
        })}

        {/* ── Parquet against CSV, on the made-up million sales ── */}
        <div style={{ position: "absolute", left: X0, top: lowY - 44, ...label(22, INK), whiteSpace: "nowrap", opacity: ease(frame, csvAt, 12) }}>
          Over CSV <span style={{ color: INK_SOFT, fontWeight: 500 }}>· the same million sales</span>
        </div>
        <div style={{ position: "absolute", left: X0, top: lowY, width: 200, fontFamily: MONO, fontSize: 22, fontWeight: 600, color: INK, opacity: ease(frame, csvAt + 2, 12) }}>
          sales.csv
        </div>
        <FileBar x={X0 + 210} y={lowY} width={CSV_W} height={h(34)} at={csvAt + 2} pattern={TINTS} />
        <div style={{ position: "absolute", left: X0 + 210 + CSV_W + 18, top: lowY, ...note(23, INK), whiteSpace: "nowrap", opacity: ease(frame, csvAt + 10, 12) }}>
          <Num>{MB(FILES.csv)}</Num>
          <span style={{ color: INK_SOFT, opacity: ease(frame, typesAt, 10) }}> · text, no types, no schema</span>
        </div>
        <div style={{ position: "absolute", left: X0, top: lowY + h(52), width: 200, fontFamily: MONO, fontSize: 22, fontWeight: 600, color: INK, opacity: ease(frame, csvAt + 6, 12) }}>
          sales.parquet
        </div>
        <FileBar x={X0 + 210} y={lowY + h(52)} width={pqW} height={h(34)} at={csvAt + 6} segments={PARQUET_SEGMENTS} />
        <div style={{ position: "absolute", left: X0 + 210 + pqW + 18, top: lowY + h(52), ...note(23, INK), whiteSpace: "nowrap", opacity: ease(frame, csvAt + 14, 12) }}>
          <Num>{MB(FILES.parquet)}</Num>
          <span style={{ color: INK_SOFT, opacity: ease(frame, typesAt + 4, 10) }}> · typed, with a schema</span>
          <span style={{ fontWeight: 700, color: OK_INK, opacity: ease(frame, quarterAt + 4, 10) }}>
            {" "}
            · under a quarter of the size
          </span>
        </div>

        {/* ── The rule of thumb ── */}
        <div
          style={{
            position: "absolute",
            left: X0,
            top: y(850),
            display: "flex",
            alignItems: "center",
            gap: 14,
            ...note(28, INK),
            whiteSpace: "nowrap",
            opacity: ease(frame, ruleAt, 12),
          }}
        >
          <Tick at={ruleAt + 6} size={28} color={OK} />
          <span>
            <b style={{ color: OK_INK }}>Columnar</b> for analytics
            <span style={{ opacity: ease(frame, motionAt, 10) }}>
              , <b style={{ color: OK_INK }}>Avro</b> for records in motion
            </span>
          </span>
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
