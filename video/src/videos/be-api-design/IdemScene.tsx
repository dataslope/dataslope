import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, INK, INK_SOFT, label, note, HAIRLINE } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { IDEM } from "./data";
import { artBox, type Col, DataTable, dollars, Drift, Flow, Mark, Msg, Node, OK, OK_INK, Pill, pulse, Spot, tableGeometry, type TableRow, X0, LISTING_PAPER, VRule } from "./parts";

const L_TABLE_X = 330;
const R_X = 1000;
const BODY = '{"amount": 5000, "currency": "usd"}';
/** The key as a card or a cell shows it: its first group, then an ellipsis. */
const SHORT_KEY = `${IDEM.key.split("-")[0]}-…`;

/**
 * Question 5. Why it matters: a client times out, its reply lost, and
 * retries. The run, in the site's Postgres: the page's payment POSTed three
 * times with no key makes three rows, $150.00; the same three with the
 * page's Idempotency-Key and a unique constraint make one, the retries
 * answered with payment 1. Then the constraint refusing a racing duplicate,
 * in Postgres's own words.
 */
export const IdemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("idem").from;
  const qAt = n.word("idem", "Question five");
  const textAt = n.word("idem", "What is idempotency");
  const defAt = n.word("idem", "An idempotent operation");
  const sameAt = n.word("idem", "the same result");
  const failAt = n.word("idem-retry", "networks fail");
  const timesOutAt = n.word("idem-retry", "A client that times out");
  const arrivedAt = n.word("idem-retry", "whether its request arrived");
  const retriesAt = n.word("idem-retry", "so it retries");
  const runAt = n.word("idem-run", "Here's a payment of fifty dollars");
  const postAt = n.word("idem-run", "sent with POST");
  const chargedAt = n.word("idem-run", "The first attempt is charged");
  const lostAt = n.word("idem-run", "its response is lost");
  const twiceAt = n.word("idem-run", "the client retries twice");
  const threeAt = n.word("idem-run", "Three charges");
  const hundredAt = n.word("idem-run", "a hundred and fifty dollars");
  const fixAt = n.word("idem-key", "The fix is an idempotency key");
  const keyAt = n.word("idem-key", "an idempotency key");
  const everyAt = n.word("idem-key", "sends with every attempt");
  const storesAt = n.word("idem-key", "The server stores it with the payment");
  const findsAt = n.word("idem-key", "Each retry finds the key");
  const originalAt = n.word("idem-key", "gets the original payment back");
  const requestsAt = n.word("idem-key", "Three requests");
  const oneAt = n.word("idem-key", "one charge");
  const safeAt = n.word("idem-race", "What makes it safe");
  const constraintAt = n.word("idem-race", "a unique constraint on the key");
  const racingAt = n.word("idem-race", "two retries racing each other");
  const refusesAt = n.word("idem-race", "the database refuses the second");
  const catchesAt = n.word("idem-reply", "The server catches that refusal");
  const storedAt = n.word("idem-reply", "answers with the stored payment");
  const reusedAt = n.word("idem-reply", "a key reused with a different body");
  const rejectedAt = n.word("idem-reply", "is rejected");
  const end = n.beat("idem-reply").to;

  // Why it matters: the retry, up for its own beat, gone as the run starts.
  const gone = runAt - 8;
  const rTop = y(440);
  const boxH = h(84);
  const mid = rTop + boxH / 2;
  const CLIENT = { x: X0, w: 220 };
  const SERVER = { x: 900, w: 240 };

  // The two runs, side by side.
  const labelTop = y(330);
  const msgTop = y(378);
  const tableTop = y(518);
  const headH = h(40);
  const rowH = h(42);
  const plainCols: Col[] = [{ name: "id", numeric: true }, { name: "amount", numeric: true }, { name: "currency" }];
  const plainRows: TableRow[] = IDEM.plainIds.map((id, i) => ({ cells: [String(id), "5000", "usd"], at: i === 0 ? chargedAt + 4 : twiceAt + 4 + (i - 1) * 8 }));
  const plainG = tableGeometry({ x: L_TABLE_X, top: tableTop, cols: plainCols, rows: plainRows.map((r) => r.cells), headH, rowH, headSize: 21, bodySize: 24 });
  const keyedCols: Col[] = [{ name: "id", numeric: true }, { name: "idempotency_key", tag: { text: "UNIQUE", at: constraintAt + 2, color: OK_INK } }, { name: "amount", numeric: true }];
  const [storedId, storedAmount] = IDEM.stored;
  const keyedRows: TableRow[] = [{ cells: [storedId, SHORT_KEY, storedAmount], at: storesAt + 4 }];
  const keyedG = tableGeometry({ x: R_X, top: tableTop, cols: keyedCols, rows: keyedRows.map((r) => r.cells), headH, rowH, headSize: 21, bodySize: 24 });
  const attemptsTop = keyedG.rowTop(1) + h(26);
  // What each keyed attempt got back: the first inserted payment 1; the
  // retries found the key, inserted nothing, and got payment 1.
  const keyedBack = IDEM.keyedIds.map((ids) => (ids.length ? `payment ${ids[0]}, inserted` : `key found: payment ${storedId}`));
  const key = artBox("key", 140);
  const raceTop = y(760);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={failAt} level={-34} />
      <Sfx name="el-scratch" at={failAt + 18} level={-32} />
      <Sfx name="el-whoosh" at={retriesAt} level={-36} />
      <Sfx name="el-tap" at={chargedAt + 4} level={-30} />
      <Sfx name="el-tap" at={twiceAt + 4} level={-31} />
      <Sfx name="el-tap" at={twiceAt + 12} level={-31} />
      <Sfx name="el-tap" at={threeAt} level={-28} />
      <Sfx name="el-pop" at={keyAt} level={-30} />
      <Sfx name="el-tap" at={storesAt + 4} level={-30} />
      <Sfx name="el-chime" at={oneAt} level={-33} />
      <Sfx name="el-pencil" at={refusesAt} level={-34} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is idempotency and why does it matter for APIs?
        </QuestionCard>
        <Note at={defAt} x={X0} y={y(258)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            Idempotent: <Mark at={sameAt}>the same result</Mark> whether it runs once or many times.
          </span>
        </Note>

        {/* Networks fail: the reply is lost, the client times out and retries. */}
        <Node x={CLIENT.x} y={rTop} w={CLIENT.w} h={boxH} at={failAt - 4} out={gone} tone="plain" title="client" size={26} />
        <Node x={SERVER.x} y={rTop} w={SERVER.w} h={boxH} at={failAt} out={gone} tone="data" title="server" size={26} />
        <Flow points={[[CLIENT.x + CLIENT.w + 8, mid - 14], [SERVER.x - 10, mid - 14]]} at={failAt + 2} out={gone} color={INK} head={14} />
        <Flow points={[[SERVER.x - 8, mid + 14], [CLIENT.x + CLIENT.w + 10, mid + 14]]} at={failAt + 12} out={gone} color={BAR} cut={0.45} />
        <Note at={failAt + 20} x={600} y={mid + h(26)} out={gone}>
          <span style={{ ...label(21, ACCENT_INK), whiteSpace: "nowrap" }}>✕ reply lost</span>
        </Note>
        <Note at={timesOutAt} x={CLIENT.x} y={rTop + boxH + h(20)} out={gone}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>times out</span>
        </Note>
        <Note at={arrivedAt} x={SERVER.x} y={rTop + boxH + h(20)} out={gone}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>did it arrive?</span>
        </Note>
        <Pill x={CLIENT.x} y={rTop + boxH + h(66)} at={retriesAt} out={gone} tone="lit" size={21}>
          ↻ retries
        </Pill>

        {/* Without a key: three POSTs, three rows. */}
        <Note at={runAt} x={X0} y={labelTop}>
          <span style={{ ...label(22, INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            Without a key <span style={{ color: INK_SOFT, fontWeight: 500 }}>· the amount in cents: 5000 is $50.00</span>
          </span>
        </Note>
        <Msg x={X0} y={msgTop} w={540} at={postAt} lines={[{ t: "POST /payments" }, { t: BODY }]} />
        {plainRows.map((r, i) => (
          <Note key={i} at={r.at - 2} x={X0} y={plainG.rowTop(i) + h(8)}>
            <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>{i === 0 ? "attempt" : "retry"}</span>
          </Note>
        ))}
        <DataTable g={plainG} cols={plainCols} rows={plainRows} at={chargedAt} />
        <Note at={lostAt} x={plainG.right + 30} y={plainG.rowTop(0) + h(8)}>
          <span style={{ ...note(22, ACCENT_INK), whiteSpace: "nowrap" }}>its reply lost</span>
        </Note>
        <Note at={threeAt} x={plainG.right + 30} y={plainG.rowTop(1) + h(4)}>
          <div style={{ ...note(26, ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            <Num>{IDEM.unkeyed.charges}</Num> charges
          </div>
          <div style={{ ...note(26, ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap", opacity: ease(frame, hundredAt, 10) }}>{dollars(IDEM.unkeyed.cents)}</div>
        </Note>

        {/* With a key: one row, and the retries get payment 1 back. */}
        <Note at={fixAt} x={R_X} y={labelTop}>
          <span style={{ ...label(22, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>With an idempotency key</span>
        </Note>
        <Msg
          x={R_X}
          y={msgTop}
          w={430}
          at={keyAt}
          tone="ok"
          lines={[{ t: "POST /payments" }, { t: `Idempotency-Key: ${SHORT_KEY}`, at: everyAt, mark: { at: everyAt + 6, out: storesAt } }]}
        />
        <Spot id="key" at={keyAt} left={1620} top={y(318)} {...key} />
        <DataTable g={keyedG} cols={keyedCols} rows={keyedRows} at={storesAt} />
        {keyedBack.map((back, i) => (
          <Note key={i} at={i === 0 ? storesAt + 8 : findsAt + (i - 1) * 8} x={R_X} y={attemptsTop + i * h(40)}>
            <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
              <span style={{ color: INK_SOFT }}>{i === 0 ? "attempt" : "retry"} →</span>{" "}
              {i === 0 ? back : <Mark at={originalAt + (i - 1) * 6}><span style={{ color: OK_INK, fontWeight: 500 }}>{back}</span></Mark>}
            </span>
          </Note>
        ))}
        <Note at={requestsAt} x={1500} y={attemptsTop}>
          <div style={{ ...note(26, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            <Num>3</Num> requests
          </div>
          <div style={{ ...note(26, OK_INK), fontWeight: 500, whiteSpace: "nowrap", opacity: ease(frame, oneAt, 10) }}>
            <Num>{IDEM.keyedTotal.charges}</Num> charge, {dollars(IDEM.keyedTotal.cents)}
          </div>
        </Note>

        {/* A racing duplicate, refused by the unique constraint. */}
        <Note at={safeAt} x={X0} y={raceTop}>
          <span style={{ ...label(22, INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            What makes it safe: <span style={{ fontFamily: MONO, fontWeight: 500 }}>idempotency_key</span> is <span style={{ color: OK_INK }}>UNIQUE</span>
          </span>
        </Note>
        <Note at={racingAt} x={X0} y={raceTop + h(44)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            Two retries racing, one key: <b style={{ color: OK_INK }}>the database refuses the second</b>
          </span>
        </Note>
        <Note at={refusesAt} x={X0} y={raceTop + h(92)}>
          <div
            style={{
              borderTop: `2px solid ${OK}`,
              borderBottom: `1px solid ${HAIRLINE}`,
              background: LISTING_PAPER,
              padding: "10px 20px 12px",
              fontFamily: MONO,
              fontSize: 21,
              lineHeight: 1.4,
              whiteSpace: "pre",
              color: INK_SOFT,
              fontVariantLigatures: "none",
              boxShadow: `0 0 0 ${2 * pulse(frame, refusesAt + 14, 20)}px ${OK}`,
            }}
          >
            {IDEM.duplicate}
          </div>
        </Note>

        {/* What the losing request gets back, and a key reused with another body. */}
        <Note at={catchesAt} x={1290} y={raceTop + h(44)}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
            caught: <span style={{ color: OK_INK, fontWeight: 500, opacity: ease(frame, storedAt, 10) }}>→ payment {storedId}, as stored</span>
          </span>
        </Note>
        <Note at={reusedAt} x={1290} y={raceTop + h(92) + 4}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            same key, new body: <b style={{ color: ACCENT_INK, opacity: ease(frame, rejectedAt, 10) }}>rejected</b>
          </span>
        </Note>

        {/* A hairline between the two runs. */}
        <VRule x={911} top={labelTop} bottom={attemptsTop + 2 * h(40) + 30} at={fixAt} />
      </Drift>
    </AbsoluteFill>
  );
};
