import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, INK_SOFT, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { APPLIED, APPROVED, FUNDED, SNAPSHOT_ADA, STAGES, TRANSACTIONS } from "./data";
import { colsOf, DataTable, Drift, geoOf, MARK, MARK_OK, Mono, OK, OK_INK, PanelHead, X0 } from "./parts";

const R_X = 1000;
const TOP_TABLES = 372;
const ACC_HEAD = 640;
const ACC_TABLE = 742;
const OPTS = { headH: 46, rowH: 50, bodySize: 24, headSize: 21 } as const;

/** A span under two cells, drawn on `at`, with how long it was. */
const Lag: React.FC<{ x0: number; x1: number; y: number; at: number; days: number }> = ({ x0, x1, y, at, days }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  if (p <= 0) return null;
  const xm = x0 + (x1 - x0) * p;
  return (
    <>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <path d={`M${x0},${y - 10} L${x0},${y} L${xm},${y} ${p >= 1 ? `L${x1},${y - 10}` : ""}`} fill="none" stroke={OK} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div
        style={{
          position: "absolute",
          left: (x0 + x1) / 2 - 80,
          width: 160,
          top: y + 8,
          textAlign: "center",
          ...note(23, OK_INK),
          fontWeight: 700,
          opacity: ease(frame, at + 8, 10),
          whiteSpace: "nowrap",
        }}
      >
        {days} days
      </div>
    </>
  );
};

/**
 * Question 9. The three kinds of fact table on the video's own account and
 * loan: Ada's transactions (one row per event), her month-end balances (one
 * row per account per month), and loan application 7 (one row per process,
 * its dates filled in as it moves: 7 days to approve, 9 more to fund). Then
 * which question each one answers.
 */
export const TypesScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("types").from;
  const qAt = n.word("types", "Question nine");
  const textAt = n.word("types", "What are the three types of fact tables");
  const txnAt = n.word("types", "A transaction fact");
  const eventAt = n.word("types", "one row per event");
  const depositAt = n.word("types", "each deposit and withdrawal");
  const periodicAt = n.word("periodic", "A periodic snapshot");
  const perPeriodAt = n.word("periodic", "one row per account per period");
  const monthAt = n.word("periodic", "at the end of every month");
  const accumAt = n.word("accum", "an accumulating snapshot");
  const processAt = n.word("accum", "one row per process");
  const loanAt = n.word("accum", "like a loan application");
  const stageAt = n.word("accum", "a date for each stage");
  const updatedAt = n.word("accum", "The row is updated");
  const approvedAt = n.word("accum", "approved after seven days");
  const fundedAt = n.word("accum", "funded nine days later");
  const pickAt = n.word("types-pick", "Pick by the question");
  const happenedAt = n.word("types-pick", "what happened");
  const stoodAt = n.word("types-pick", "where things stood");
  const longAt = n.word("types-pick", "how long each step took");
  const end = n.beat("types-pick").to;

  const tg = geoOf(TRANSACTIONS, X0, y(TOP_TABLES), h, OPTS);
  const sg = geoOf(SNAPSHOT_ADA, R_X, y(TOP_TABLES), h, OPTS);
  const ag = geoOf(APPLIED, X0, y(ACC_TABLE), h, { ...OPTS, extra: FUNDED.rows });
  const amount = TRANSACTIONS.cols.indexOf("amount");
  const balance = SNAPSHOT_ADA.cols.indexOf("balance");
  const cApplied = APPLIED.cols.indexOf("applied");
  const cApproved = APPLIED.cols.indexOf("approved");
  const cFunded = APPLIED.cols.indexOf("funded");
  const swapApprove = approvedAt + 4;
  const swapFund = fundedAt + 4;
  const lagY = ag.rowTop(1) + h(20);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={txnAt} level={-28} />
      {TRANSACTIONS.rows.map((_, i) => (
        <Sfx key={i} name="el-tap" at={depositAt + i * 4} level={-31} />
      ))}
      <Sfx name="el-tap" at={periodicAt} level={-28} />
      <Sfx name="el-tap" at={accumAt} level={-28} />
      <Sfx name="el-pop" at={swapApprove} level={-29} />
      <Sfx name="el-pop" at={swapFund} level={-29} />
      <Sfx name="el-chime" at={longAt} level={-35} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={9} at={qAt - 4} textAt={textAt - 4} size={60}>
          What are the three types of fact tables?
        </QuestionCard>

        {/* ── Transaction ── */}
        <PanelHead
          at={txnAt - 2}
          x={X0}
          y={y(262)}
          width={760}
          sub={
            <>
              one row per event · <Mono>fact_transactions</Mono>
            </>
          }
          subAt={eventAt}
        >
          Transaction fact
        </PanelHead>
        <DataTable
          g={tg}
          cols={colsOf(TRANSACTIONS)}
          at={eventAt}
          rows={TRANSACTIONS.rows.map((cells, i) => ({ cells, at: depositAt + i * 4 }))}
          marks={TRANSACTIONS.rows.map((_, i) => ({ row: i, col: amount, at: happenedAt + i * 2, color: MARK_OK }))}
        />
        <Note at={happenedAt} x={tg.right + 34} y={tg.rowTop(TRANSACTIONS.rows.length - 1) + h(8)}>
          <span style={{ ...note(25, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>what happened</span>
        </Note>

        {/* ── Periodic snapshot ── */}
        <PanelHead
          at={periodicAt - 2}
          x={R_X}
          y={y(262)}
          width={800}
          sub={
            <>
              one row per account per period · <Mono>fact_balance</Mono>
            </>
          }
          subAt={perPeriodAt}
        >
          Periodic snapshot
        </PanelHead>
        <DataTable
          g={sg}
          cols={colsOf(SNAPSHOT_ADA)}
          at={perPeriodAt}
          rows={SNAPSHOT_ADA.rows.map((cells, i) => ({ cells, at: monthAt + i * 5 }))}
          marks={[
            ...SNAPSHOT_ADA.rows.map((_, i) => ({ row: i, col: 0, at: monthAt + 4 + i * 5, color: MARK, out: pickAt })),
            ...SNAPSHOT_ADA.rows.map((_, i) => ({ row: i, col: balance, at: stoodAt + i * 2, color: MARK_OK })),
          ]}
        />
        <Note at={stoodAt} x={R_X} y={sg.rowTop(SNAPSHOT_ADA.rows.length) + h(16)}>
          <span style={{ ...note(25, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>where things stood</span>
        </Note>

        {/* ── Accumulating snapshot ── */}
        <PanelHead
          at={accumAt - 2}
          x={X0}
          y={y(ACC_HEAD)}
          width={1700}
          sub={
            <>
              one row per process, a date per stage · <Mono>fact_loan_application</Mono>
            </>
          }
          subAt={processAt}
        >
          Accumulating snapshot
        </PanelHead>
        <DataTable
          g={ag}
          cols={colsOf(APPLIED)}
          at={loanAt - 2}
          rows={[{ cells: APPLIED.rows[0], at: loanAt + 4 }]}
          marks={[
            { row: 0, col: cApplied, at: stageAt, color: MARK, out: updatedAt },
            { row: 0, col: cApproved, at: swapApprove, color: MARK_OK },
            { row: 0, col: cFunded, at: swapFund, color: MARK_OK },
          ]}
          swaps={[
            { row: 0, col: cApproved, at: swapApprove, value: APPROVED.rows[0][cApproved] },
            { row: 0, col: cFunded, at: swapFund, value: FUNDED.rows[0][cFunded] },
          ]}
          bands={[{ row: 0, at: updatedAt, out: updatedAt + 26 }]}
        />
        <Note at={updatedAt} x={ag.right + 40} y={ag.rowTop(0) + 8}>
          <span style={{ ...note(24, BLUE_INK), fontWeight: 650, whiteSpace: "nowrap" }}>updated in place, stage by stage</span>
        </Note>
        <Lag x0={ag.colMid(cApplied)} x1={ag.colMid(cApproved)} y={lagY} at={swapApprove + 6} days={STAGES.approve} />
        <Lag x0={ag.colMid(cApproved)} x1={ag.colMid(cFunded)} y={lagY} at={swapFund + 6} days={STAGES.fund} />
        <Note at={longAt} x={ag.right + 40} y={ag.rowTop(1) + h(6)}>
          <span style={{ ...note(25, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>how long each step took</span>
        </Note>
        <Note at={pickAt} x={ag.right + 40} y={ag.rowTop(0) - h(56)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>pick by the question:</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
