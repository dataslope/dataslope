import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK, OK_INK, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { TXN } from "./data";
import { ColumnRule, DataTable, Drift, Listing, listingHeight, MARK_GREEN, MARK_OK, PgError, Strike, TableName, tableGeometry, X0 } from "./parts";

const TOP = 300;
const SIZE = 20;
const LIST_W = 900;
const R_X = 1250;

/**
 * Question 7. Right, first: a transaction as a bracket, BEGIN, two
 * statements, then COMMIT or ROLLBACK. Then the transfer of 30, run: the
 * accounts table on the right, the statements on the left as Postgres took
 * them. The debit takes account 1 to 70; recording the transfer to account
 * 99 fails its foreign key (the error as printed); the next statement is
 * refused because the transaction is aborted; ROLLBACK, and account 1 is
 * back at 100 in green. Last, what the application does with the error.
 */
export const TxnScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("txn").from;
  const qAt = n.word("txn", "Question seven");
  const textAt = n.word("txn", "What is a transaction");
  const oneAt = n.word("txn", "succeed or fail as one");
  const beginAt = n.word("txn", "begin");
  const runAt = n.word("txn", "run them");
  const commitAt = n.word("txn", "then commit");
  const rollAt = n.word("txn", "or, roll back");
  const transferAt = n.word("txn-run", "Here's a transfer of thirty");
  const debitAt = n.word("txn-run", "The debit takes account one to seventy");
  const seventyAt = n.word("txn-run", "seventy");
  const recordAt = n.word("txn-run", "recording the transfer fails");
  const ninetyAt = n.word("txn-run", "account ninety-nine doesn't exist");
  const fkAt = n.word("txn-run", "the foreign key refuses it");
  const refusesAt = n.word("txn-abort", "Postgres now refuses every statement");
  const rollbackAt = n.word("txn-abort", "Roll back", { nth: 1 });
  const hundredAt = n.word("txn-abort", "at a hundred again");
  const jobAt = n.word("txn-abort", "The application's job");
  const catchAt = n.word("txn-abort", "catch the error");
  const retryAt = n.word("txn-abort", "retry or report it");
  const neverAt = n.word("txn-abort", "never carry on");
  const end = n.beat("txn-abort").to;

  // ── The statements, as run ──
  const l1 = ["BEGIN;", ...TXN.debit];
  const top1 = y(TOP);
  const top2 = top1 + listingHeight(l1.length, SIZE) + h(14);
  const err1 = top2 + listingHeight(TXN.record.length, SIZE) + h(8);
  const top3 = err1 + h(96);
  const err2 = top3 + listingHeight(TXN.next.length, SIZE) + h(8);
  const top4 = err2 + h(96);

  // ── The schematic, then the table ──
  const schemOut = transferAt - 4;
  const sTop = y(TOP) + h(10);
  const step = h(70);
  const g = tableGeometry({
    x: R_X,
    top: y(TOP) + h(56),
    cols: TXN.before.cols.map((c) => ({ name: c })),
    rows: TXN.before.rows,
    headH: h(46),
    rowH: h(54),
    bodySize: 26,
  });

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={beginAt} level={-34} />
      <Sfx name="el-tap" at={runAt + 2} level={-34} />
      <Sfx name="el-tap" at={commitAt + 2} level={-34} />
      <Sfx name="el-pencil" at={transferAt} level={-35} />
      <Sfx name="el-tap" at={seventyAt} level={-32} />
      <Sfx name="el-scratch" at={fkAt} level={-32} />
      <Sfx name="el-scratch" at={refusesAt + 6} level={-33} />
      <Sfx name="el-whoosh" at={rollbackAt} level={-35} />
      <Sfx name="el-pop" at={hundredAt} level={-31} />
      <Sfx name="el-tap" at={retryAt} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={7} at={qAt - 4} textAt={textAt - 4} size={58}>
          What is a transaction, and how do you use one?
        </QuestionCard>

        {/* ── A transaction, as a bracket ── */}
        <div style={{ opacity: 1 - ease(frame, schemOut, 10) }}>
          {[
            { at: beginAt - 2, i: 0, body: <span style={{ fontFamily: MONO, fontSize: 28, fontWeight: 500, color: INK }}>BEGIN</span> },
            { at: runAt, i: 1, body: <span style={{ ...note(28, BLUE_INK) }}>a statement</span> },
            { at: runAt + 4, i: 2, body: <span style={{ ...note(28, BLUE_INK) }}>another statement</span> },
          ].map((r) => (
            <Note key={r.i} at={r.at} x={X0 + 50} y={sTop + r.i * step + h(8)}>
              <span style={{ whiteSpace: "nowrap" }}>{r.body}</span>
            </Note>
          ))}
          <Note at={commitAt} x={X0 + 50} y={sTop + 3 * step + h(8)}>
            <span style={{ whiteSpace: "nowrap", fontFamily: MONO, fontSize: 28, fontWeight: 500, color: OK_INK }}>
              COMMIT
              <span style={{ ...note(28, INK_SOFT), fontWeight: 500, opacity: ease(frame, rollAt - 2, 10) }}> or </span>
              <span style={{ color: ACCENT_INK, opacity: ease(frame, rollAt, 10) }}>ROLLBACK</span>
            </span>
          </Note>
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, oneAt, 12) }}>
            <path d={`M${X0 + 24},${sTop + h(10)} h-14 V${sTop + 3 * step + h(46)} h14`} fill="none" stroke={INK} strokeWidth={2.5} />
          </svg>
          <Note at={oneAt + 4} x={X0 + 560} y={sTop + step + h(40)}>
            <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
              succeed or fail <b>as one</b>
            </span>
          </Note>
        </div>

        {/* ── The transfer, as Postgres ran it ── */}
        <Listing lines={l1} x={X0} top={top1} width={LIST_W} size={SIZE} at={transferAt} lineAt={[transferAt + 2, debitAt, debitAt + 3]} marks={[{ line: "SET balance", text: "balance - 30", at: debitAt + 8 }]} />
        <Listing lines={TXN.record} x={X0} top={top2} width={LIST_W} size={SIZE} at={recordAt - 2} marks={[{ line: "VALUES", text: "99", at: ninetyAt }]} />
        <PgError x={X0} top={err1} width={LIST_W - 36} at={fkAt} message={TXN.recordError} size={19} />
        <Listing lines={TXN.next} x={X0} top={top3} width={LIST_W} size={SIZE} at={refusesAt - 2} />
        <PgError x={X0} top={err2} width={LIST_W - 36} at={refusesAt + 6} message={TXN.afterError} size={19} />
        <Listing lines={["ROLLBACK;"]} x={X0} top={top4} width={LIST_W} size={SIZE} at={rollbackAt - 2} marks={[{ line: "ROLLBACK", at: rollbackAt + 6, color: MARK_GREEN }]} />

        {/* ── The accounts ── */}
        <ColumnRule x={(X0 + LIST_W + R_X) / 2} top={y(TOP)} bottom={Math.max(top4 + listingHeight(1, SIZE), y(640) + h(230))} at={transferAt} />
        <TableName g={g} at={transferAt} out={rollbackAt}>
          accounts
        </TableName>
        <DataTable
          g={g}
          cols={TXN.before.cols.map((c) => ({ name: c, numeric: true, ink: c === "id" ? BLUE_INK : undefined }))}
          rows={TXN.before.rows.map((cells, i) => ({ cells, at: transferAt + 4 + i * 3 }))}
          at={transferAt}
          swaps={[{ row: 0, col: 1, at: seventyAt, value: TXN.debited.rows[0][1], color: INK }]}
          out={rollbackAt}
        />
        <TableName g={g} at={rollbackAt}>
          accounts, after <span style={{ fontFamily: MONO }}>ROLLBACK</span>
        </TableName>
        <DataTable
          g={g}
          cols={TXN.after.cols.map((c) => ({ name: c, numeric: true, ink: c === "id" ? BLUE_INK : undefined }))}
          rows={TXN.after.rows.map((cells) => ({ cells, at: rollbackAt + 2 }))}
          at={rollbackAt}
          marks={[{ row: 0, col: 1, at: hundredAt, color: MARK_OK }]}
        />
        <Note at={transferAt + 6} x={R_X} y={g.rowTop(2) + h(24)} out={rollbackAt}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>moving 30 from account 1</span>
        </Note>
        <Note at={hundredAt + 4} x={R_X} y={g.rowTop(2) + h(24)}>
          <span style={{ ...note(24, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>the debit is undone</span>
        </Note>

        {/* ── What the application does ── */}
        <Note at={jobAt} x={R_X} y={y(640)}>
          <span style={{ ...label(24, INK_SOFT), whiteSpace: "nowrap" }}>The application, on an error:</span>
        </Note>
        {[
          { at: catchAt, text: "catch it" },
          { at: catchAt + 10, text: "roll back" },
          { at: retryAt, text: "retry, or report it" },
        ].map((s, i) => (
          <Note key={s.text} at={s.at} x={R_X} y={y(640) + h(44) + i * h(48)}>
            <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
              <span style={{ color: OK_INK, fontWeight: 500 }}>{i + 1}</span>&nbsp;&nbsp;{s.text}
            </span>
          </Note>
        ))}
        <Note at={neverAt} x={R_X} y={y(640) + h(196)}>
          <span style={{ ...note(24, ACCENT_INK), whiteSpace: "nowrap" }}>
            <Strike at={neverAt + 6}>carry on</Strike>
          </span>
        </Note>
        <div style={{ position: "absolute", left: R_X - 24, top: y(640) + h(44), width: 3, height: h(134), background: OK, opacity: ease(frame, catchAt, 10) * 0.6 }} />
      </Drift>
    </AbsoluteFill>
  );
};
