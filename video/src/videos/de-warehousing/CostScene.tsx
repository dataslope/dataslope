import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { COST, KB, MB } from "./data";
import { Drift, FileBar, OK, OK_INK, VRule, X0 } from "./parts";

const BILL_Y = 296;
const READ_Y = 474;
const BAR_W = 1180;
const STEP = 80;
const COMPUTE_Y = 790;
const STORE_X = 920;
/** The space either side of a hairline between the bill's three columns. */
const BILL_GAP = 48;

/**
 * Question 8 (and the Pipelines page's cost question). What a warehouse
 * bills for (scans or compute, and storage), then the answer: read less,
 * shown as the bytes DuckDB read for the page's query from the CSV, from the
 * Parquet file, and for March alone from the monthly folders (all measured
 * on the made-up table); compute less often, three levers from the page; and
 * store cheaper, the page's sixth.
 */
export const CostScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("cost").from;
  const qAt = n.word("cost", "Question eight");
  const qTextAt = n.word("cost", "What drives cost");
  const scansAt = n.word("cost", "the data a query scans");
  const bqAt = n.word("cost", "like BigQuery");
  const computeAt = n.word("cost", "the compute time it uses");
  const sfAt = n.word("cost", "like Snowflake and Redshift");
  const storeAt = n.word("cost-store", "Storage is billed too");
  const smallerAt = n.word("cost-store", "usually the smaller part");
  const lessAt = n.word("cost-read", "So read less");
  const csvAt = n.word("cost-read", "thirty-nine point two megabytes of CSV");
  const pqAt = n.word("cost-read", "five of Parquet");
  const marchAt = n.word("cost-read", "Asked about March alone");
  const kbAt = n.word("cost-read", "four hundred twenty-three kilobytes");
  const oftenAt = n.word("cost-compute", "Then compute less often");
  const incAt = n.word("cost-compute", "incremental models");
  const storedAt = n.word("cost-compute", "stored results");
  const suspendAt = n.word("cost-compute", "warehouses that suspend when idle");
  const coldAt = n.word("cost-compute", "cold data on cheaper storage");
  const end = n.beat("cost-compute").to;

  const w = (bytes: number) => Math.max(4, (BAR_W * bytes) / COST.csv.read);
  const bills = [
    { at: scansAt, sub: bqAt, title: "billed by the data a query scans", who: "BigQuery" },
    { at: computeAt, sub: sfAt, title: "billed by compute time", who: "Snowflake, Redshift" },
    { at: storeAt, sub: smallerAt, title: "and storage, billed too", who: "usually the smaller part" },
  ];
  const reads = [
    { at: csvAt, sizeAt: csvAt + 6, bytes: COST.csv.read, size: MB(COST.csv.read), what: "the CSV, read whole" },
    { at: pqAt, sizeAt: pqAt + 6, bytes: COST.parquet.read, size: MB(COST.parquet.read), what: "Parquet: three columns" },
    { at: marchAt + 4, sizeAt: kbAt, bytes: COST.march.read, size: KB(COST.march.read), what: "Parquet by month: March's file, three columns" },
  ];
  const levers = [
    { at: incAt, text: "incremental models, not full refreshes" },
    { at: storedAt, text: "stored results for heavy, repeated queries" },
    { at: suspendAt, text: "warehouses that suspend when idle" },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={scansAt + 2} level={-36} />
      <Sfx name="el-tap" at={computeAt + 2} level={-36} />
      <Sfx name="el-whoosh" at={csvAt} level={-36} />
      <Sfx name="el-whoosh" at={pqAt} level={-37} />
      <Sfx name="el-tap" at={kbAt} level={-35} />
      <Sfx name="el-tap" at={storeAt + 2} level={-36} />
      {levers.map((l) => (
        <Sfx key={l.text} name="el-pop" at={l.at} level={-36} />
      ))}
      <Sfx name="el-pop" at={coldAt} level={-36} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={8} at={qAt - 4} textAt={qTextAt - 2} size={60}>
          What drives cost in a cloud data warehouse, and how do you control it?
        </QuestionCard>

        {/* ── What the bill counts: three columns of text, a hairline in
            each gap, inking in with the column to its right. ── */}
        <div style={{ position: "absolute", left: X0, top: y(BILL_Y), display: "flex", alignItems: "stretch", gap: BILL_GAP, whiteSpace: "nowrap" }}>
          {bills.map((b, i) => (
            <React.Fragment key={b.title}>
              {i ? <div style={{ width: 1, background: HAIRLINE, opacity: ease(frame, b.at - 2, 14) }} /> : null}
              <div style={{ opacity: ease(frame, b.at, 12) }}>
                <div style={{ ...note(24, INK), fontWeight: 500 }}>{b.title}</div>
                <div style={{ ...note(21, BLUE_INK), marginTop: 10, opacity: ease(frame, b.sub, 10) }}>{b.who}</div>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* ── Read less ── */}
        <div style={{ position: "absolute", left: X0, top: y(READ_Y) - h(44), ...label(24, OK_INK), fontWeight: 500, whiteSpace: "nowrap", opacity: ease(frame, lessAt, 12) }}>
          Read less <span style={{ ...label(22, INK_SOFT), fontWeight: 500 }}>· the page&apos;s query on the made-up million sales, bytes DuckDB read</span>
        </div>
        {reads.map((r, i) => (
          <React.Fragment key={r.what}>
            <FileBar x={X0} y={y(READ_Y) + i * h(STEP)} width={w(r.bytes)} height={h(42)} at={r.at} fill={BAR} />
            <div
              style={{
                position: "absolute",
                left: X0 + w(r.bytes) + 18,
                top: y(READ_Y) + i * h(STEP) + (h(42) - 32) / 2,
                ...note(24, INK),
                whiteSpace: "nowrap",
                opacity: ease(frame, r.at + 4, 10),
              }}
            >
              <b style={{ opacity: ease(frame, r.sizeAt, 10) }}>
                <Num>{r.size}</Num>
              </b>
              <span style={{ color: INK_SOFT }}> · {r.what}</span>
            </div>
          </React.Fragment>
        ))}

        {/* What the bytes are, on the scan-billed warehouse: its own tables bill logical bytes. */}
        <div style={{ position: "absolute", left: X0, top: y(READ_Y) + 2 * h(STEP) + h(58), ...note(21, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, kbAt + 16, 12) }}>
          On BigQuery&apos;s own tables, a query is billed by the columns and partitions it reads, before compression.
        </div>

        {/* ── Compute less often ── */}
        <div style={{ position: "absolute", left: X0, top: y(COMPUTE_Y) - h(44), ...label(24, OK_INK), fontWeight: 500, whiteSpace: "nowrap", opacity: ease(frame, oftenAt, 12) }}>
          Compute less often
        </div>
        {levers.map((l, i) => (
          <div
            key={l.text}
            style={{
              position: "absolute",
              left: X0,
              top: y(COMPUTE_Y) + i * h(44),
              display: "flex",
              alignItems: "center",
              gap: 12,
              ...note(25, INK),
              whiteSpace: "nowrap",
              opacity: ease(frame, l.at, 12),
            }}
          >
            <Tick at={l.at + 4} size={24} color={OK} />
            {l.text}
          </div>
        ))}

        {/* Compute and storage side by side: a hairline in the gap, as tall
            as the levers, inking in with storage on its right. */}
        <VRule x={(X0 + 528 + STORE_X) / 2} top={y(COMPUTE_Y) - h(44)} height={h(44) + 3 * h(44) - h(10)} at={coldAt} />

        {/* ── Store cheaper ── */}
        <div style={{ position: "absolute", left: STORE_X, top: y(COMPUTE_Y) - h(44), ...label(24, OK_INK), fontWeight: 500, whiteSpace: "nowrap", opacity: ease(frame, coldAt, 12) }}>
          Store cheaper
        </div>
        <div
          style={{
            position: "absolute",
            left: STORE_X,
            top: y(COMPUTE_Y),
            display: "flex",
            alignItems: "center",
            gap: 12,
            ...note(25, INK),
            whiteSpace: "nowrap",
            opacity: ease(frame, coldAt, 12),
          }}
        >
          <Tick at={coldAt + 4} size={24} color={OK} />
          cold data on cheaper storage
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
