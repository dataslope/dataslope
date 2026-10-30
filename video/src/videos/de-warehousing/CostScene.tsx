import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { COST, KB, MB } from "./data";
import { Drift, FileBar, OK, OK_INK, X0 } from "./parts";

const BILL_Y = 296;
const READ_Y = 474;
const BAR_W = 1180;
const STEP = 80;
const COMPUTE_Y = 790;

/**
 * Question 8 (and the Pipelines page's cost question). What a warehouse
 * bills for, then the two halves of the answer: read less, shown as the
 * bytes DuckDB read for the page's query from the CSV, from the Parquet file,
 * and for March alone from the monthly folders (all measured on the made-up
 * table); then compute less often, as four levers from the page.
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
    { at: coldAt, text: "cold data on cheaper storage" },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={scansAt + 2} level={-36} />
      <Sfx name="el-tap" at={computeAt + 2} level={-36} />
      <Sfx name="el-whoosh" at={csvAt} level={-36} />
      <Sfx name="el-whoosh" at={pqAt} level={-37} />
      <Sfx name="el-tap" at={kbAt} level={-35} />
      {levers.map((l) => (
        <Sfx key={l.text} name="el-pop" at={l.at} level={-36} />
      ))}

      <Drift from={from} to={end + 40}>
        <QuestionCard n={8} at={qAt - 4} textAt={qTextAt - 2} size={60}>
          What drives cost in a cloud data warehouse, and how do you control it?
        </QuestionCard>

        {/* ── What the bill counts ── */}
        {bills.map((b, i) => (
          <div
            key={b.title}
            style={{
              position: "absolute",
              left: X0 + i * 700,
              top: y(BILL_Y),
              padding: "12px 20px",
              borderRadius: 8,
              border: `2px solid ${BAR}`,
              background: PAPER,
              whiteSpace: "nowrap",
              opacity: ease(frame, b.at, 12),
            }}
          >
            <div style={{ ...note(24, INK), fontWeight: 650 }}>{b.title}</div>
            <div style={{ ...note(21, BLUE_INK), opacity: ease(frame, b.sub, 10) }}>{b.who}</div>
          </div>
        ))}

        {/* ── Read less ── */}
        <div style={{ position: "absolute", left: X0, top: y(READ_Y) - h(44), ...label(24, OK_INK), fontWeight: 700, whiteSpace: "nowrap", opacity: ease(frame, lessAt, 12) }}>
          Read less <span style={{ ...label(21, INK_SOFT), fontWeight: 500 }}>· the page&apos;s query on the made-up million sales, bytes DuckDB read</span>
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

        {/* ── Compute less often ── */}
        <div style={{ position: "absolute", left: X0, top: y(COMPUTE_Y) - h(44), ...label(24, OK_INK), fontWeight: 700, whiteSpace: "nowrap", opacity: ease(frame, oftenAt, 12) }}>
          Compute less often
        </div>
        {levers.map((l, i) => (
          <div
            key={l.text}
            style={{
              position: "absolute",
              left: X0 + (i % 2) * 820,
              top: y(COMPUTE_Y) + Math.floor(i / 2) * h(60),
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
      </Drift>
    </AbsoluteFill>
  );
};
