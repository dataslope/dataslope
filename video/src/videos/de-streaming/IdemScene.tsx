import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { count, DELIVERY } from "./data";
import { Box, Cell, Drift, ElbowArrow, Lane, MARK_BAD, OK, OK_INK, pulse, Strike, X0 } from "./parts";

/** What at-least-once delivered after the crash: 5 to 7, then 5 to 7 again, 8 and 9. */
const DELIVERED = [5, 6, 7, 5, 6, 7, 8, 9];
const IN = { x: X0 + 230, top: 330, w: 70, step: 80, h: 48 };
const TABLE = { top: 470, row: 40, w: 420 };
const BLIND_X = X0;
const IDEM_X = 760;

/**
 * Questions 6 and 7. What at-least-once delivered in question 5 (5 to 7
 * twice) goes into two sinks: a blind insert keeps every copy; an upsert by
 * key, or a check against the ids already seen, keeps one row a message. The
 * model's totals: 1,096 rows against 1,000. Then exactly-once inside Kafka:
 * an idempotent producer's sequence numbers let the broker drop a retried
 * copy, and one transaction writes the output and the offsets together; an
 * email, an API call or an outside database sits outside it.
 */
export const IdemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("idem").from;
  const qAt = n.word("idem", "Question six");
  const textAt = n.word("idem", "How do you make");
  const harmlessAt = n.word("idem-how", "Make a replay harmless");
  const upsertAt = n.word("idem-how", "Upsert by key");
  const blindAt = n.word("idem-how", "a blind insert");
  const overwritesAt = n.word("idem-how", "overwrites its row");
  const storeAt = n.word("idem-how", "store each message's id");
  const skipAt = n.word("idem-how", "skip any you've already seen");
  const modelAt = n.word("idem-sim", "In the model");
  const blindRowsAt = n.word("idem-sim", "a thousand and ninety-six rows");
  const idemRowsAt = n.word("idem-sim", "leaves a thousand");
  const effAt = n.word("idem-sim", "That's effectively-once");
  const q7At = n.word("eos", "Question seven");
  const q7TextAt = n.word("eos", "What is exactly-once processing");
  const insideAt = n.word("eos-producer", "Inside Kafka");
  const producerAt = n.word("eos-producer", "An idempotent producer");
  const pidAt = n.word("eos-producer", "a producer id");
  const seqAt = n.word("eos-producer", "a sequence number");
  const dropsAt = n.word("eos-producer", "the broker drops a retried copy");
  const txnAt = n.word("eos-txn", "a transaction writes");
  const outputAt = n.word("eos-txn", "the output messages");
  const offsetsAt = n.word("eos-txn", "the consumer's offsets");
  const bothAt = n.word("eos-txn", "both land, or neither does");
  const loopAt = n.word("eos-txn", "consume, transform, produce");
  const edgeAt = n.word("eos-edge", "stops at Kafka's edge");
  const outside = [
    { text: "email", at: n.word("eos-edge", "An email") },
    { text: "API call", at: n.word("eos-edge", "an API call") },
    { text: "outside database", at: n.word("eos-edge", "an outside database") },
  ];
  const notInAt = n.word("eos-edge", "isn't in the transaction");
  const joinAt = n.word("eos-edge", "join it, or accept idempotent writes");
  const end = n.beat("eos-edge").to;

  const q6Out = q7At - 4;
  const arriveAt = (k: number) => harmlessAt + 6 + k * 5;
  const rowY = (k: number) => y(TABLE.top) + h(46) + k * h(TABLE.row);
  // The idempotent table keeps one row a message: where each delivery lands.
  const idemRow = (off: number) => off - 5;

  // Question 7's geometry.
  const K = { x: X0, top: y(330), w: 1170, bottom: y(880) };
  const prod = { x: X0 + 40, y: y(380), w: 230, h: h(86) };
  const topicL = { x: 560, y: y(390), w: 440, h: h(66) };
  const app = { x: 560, y: y(580), w: 250, h: h(86) };
  const outT = { x: 930, y: y(560), w: 300, h: h(56) };
  const offs = { x: 930, y: y(680), w: 300, h: h(56) };
  const txn = { x: 900, y: y(520), w: 360, h: y(770) - y(520) };
  const OUT_X = 1380;
  const seqs = [41, 42, 42];
  const sendAt = (k: number) => seqAt + 4 + k * 10;

  return (
    <AbsoluteFill>
      {DELIVERED.map((_, k) => (
        <Sfx key={k} name="el-tap" at={arriveAt(k) + 6} level={-38} />
      ))}
      <Sfx name="el-pop" at={blindRowsAt} level={-35} />
      <Sfx name="el-chime" at={effAt + 4} level={-36} />
      <Sfx name="el-whoosh" at={q7At} level={-37} />
      <Sfx name="el-scratch" at={dropsAt + 4} level={-35} />
      <Sfx name="el-pencil" at={txnAt} level={-37} />
      <Sfx name="el-pop" at={bothAt} level={-35} />
      {outside.map((o) => (
        <Sfx key={o.text} name="el-tap" at={o.at} level={-37} />
      ))}

      <Drift from={from} to={end + 30}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} out={q6Out} size={60}>
          How do you make a consumer idempotent?
        </QuestionCard>
        <QuestionCard n={7} at={q7At} textAt={q7TextAt - 2} size={58}>
          What is exactly-once processing in Kafka, and how is it achieved?
        </QuestionCard>

        {/* ── Question 6 ─────────────────────────────────────────────── */}
        <Note at={harmlessAt} x={X0} y={y(IN.top) + h(8)} out={q6Out}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>delivered:</span>
        </Note>
        {DELIVERED.map((off, k) => (
          <Cell
            key={k}
            x={IN.x + k * IN.step}
            y={y(IN.top)}
            w={IN.w}
            h={IN.h}
            plain
            size={22}
            opacity={ease(frame, arriveAt(k) - 4, 8) * (1 - ease(frame, q6Out, 10))}
            ring={k >= 3 && k <= 5 ? MARK_BAD : undefined}
            ringP={k >= 3 && k <= 5 ? ease(frame, arriveAt(k), 8) : 0}
          >
            {off}
          </Cell>
        ))}
        <Note at={arriveAt(3) + 4} x={IN.x + 3 * IN.step} y={y(IN.top) + IN.h + h(8)} out={q6Out}>
          <span style={{ ...label(20, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>the replay: 5 to 7 again</span>
        </Note>

        {/* Two sinks: a blind insert, and an idempotent one. */}
        {[
          { x: BLIND_X, title: "blind insert", at: blindAt - 2, ink: ACCENT_INK },
          { x: IDEM_X, title: "upsert by key", at: upsertAt - 2, ink: OK_INK },
        ].map((t) => (
          <React.Fragment key={t.title}>
            <Note at={t.at} x={t.x} y={y(TABLE.top) - h(36)} out={q6Out}>
              <span style={{ ...note(26, t.ink), fontWeight: 750, whiteSpace: "nowrap" }}>{t.title}</span>
            </Note>
            <div
              style={{
                position: "absolute",
                left: t.x,
                top: y(TABLE.top) + h(6),
                width: TABLE.w * ease(frame, t.at, 12),
                height: h(36),
                borderBottom: `1.5px solid ${HAIRLINE}`,
                display: "flex",
                alignItems: "center",
                ...label(20, INK_SOFT),
                fontWeight: 700,
                opacity: 1 - ease(frame, q6Out, 10),
              }}
            >
              <span style={{ width: 140, paddingLeft: 10, opacity: ease(frame, t.at + 6, 8) }}>message id</span>
              <span style={{ opacity: ease(frame, t.at + 6, 8) }}>value</span>
            </div>
          </React.Fragment>
        ))}
        {DELIVERED.map((off, k) => {
          const p = ease(frame, Math.max(arriveAt(k) + 6, blindAt), 8);
          const dup = k >= 3 && k <= 5;
          return (
            <div
              key={k}
              style={{
                position: "absolute",
                left: BLIND_X,
                top: rowY(k),
                width: TABLE.w,
                height: h(TABLE.row) - 4,
                display: "flex",
                alignItems: "center",
                borderRadius: 4,
                background: dup ? `color-mix(in srgb, ${MARK_BAD} ${100 * ease(frame, Math.max(arriveAt(k) + 10, blindAt + 6), 8)}%, transparent)` : undefined,
                ...note(23, INK),
                opacity: p * (1 - ease(frame, q6Out, 10)),
              }}
            >
              <span style={{ width: 140, paddingLeft: 10, ...TABULAR, fontWeight: 650 }}>{off}</span>
              <span style={{ color: INK_SOFT }}>click</span>
              {dup ? <span style={{ marginLeft: "auto", paddingRight: 10, ...label(20, ACCENT_INK), fontWeight: 700 }}>duplicate</span> : null}
            </div>
          );
        })}
        {[5, 6, 7, 8, 9].map((off) => {
          const firstK = DELIVERED.indexOf(off);
          const secondK = DELIVERED.lastIndexOf(off);
          const p = ease(frame, Math.max(arriveAt(firstK) + 6, upsertAt), 8);
          const over = secondK !== firstK ? pulse(frame, Math.max(arriveAt(secondK) + 6, overwritesAt + (off - 5) * 4), 22) : 0;
          return (
            <div
              key={off}
              style={{
                position: "absolute",
                left: IDEM_X,
                top: rowY(idemRow(off)),
                width: TABLE.w,
                height: h(TABLE.row) - 4,
                display: "flex",
                alignItems: "center",
                borderRadius: 4,
                background: over > 0 ? `color-mix(in srgb, ${HIGHLIGHT} ${over * 100}%, transparent)` : undefined,
                ...note(23, INK),
                opacity: p * (1 - ease(frame, q6Out, 10)),
              }}
            >
              <span style={{ width: 140, paddingLeft: 10, ...TABULAR, fontWeight: 650 }}>{off}</span>
              <span style={{ color: INK_SOFT }}>click</span>
            </div>
          );
        })}
        <Note at={overwritesAt + 4} x={IDEM_X} y={rowY(5) + h(4)} out={q6Out}>
          <span style={{ ...label(21, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>a second copy overwrites its row with the same values</span>
        </Note>

        {/* Or: remember the ids already seen. */}
        <Note at={storeAt} x={1300} y={y(TABLE.top) - h(36)} out={q6Out}>
          <span style={{ ...note(26, OK_INK), fontWeight: 750, whiteSpace: "nowrap" }}>or: skip ids already seen</span>
        </Note>
        <Box x={1300} y={y(TABLE.top) + h(10)} w={420} h={h(70)} at={storeAt + 4} out={q6Out} color={OK} size={21}>
          <span style={{ fontFamily: MONO, fontSize: 21, fontVariantLigatures: "none" }}>
            seen = {"{"}5, 6, 7{"}"}
          </span>
        </Box>
        {[5, 6, 7].map((off, i) => (
          <Note key={off} at={skipAt + 2 + i * 4} x={1300} y={y(TABLE.top) + h(100) + i * h(40)} out={q6Out}>
            <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
              <span style={TABULAR}>{off}</span> again: <b style={{ color: OK_INK }}>seen, skip</b>
            </span>
          </Note>
        ))}

        {/* The model's totals. */}
        <Note at={modelAt} x={BLIND_X} y={rowY(8) + h(16)} out={q6Out}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>
            model, <Num>{count(DELIVERY.messages)}</Num> messages:
          </span>
        </Note>
        <Note at={blindRowsAt} x={BLIND_X} y={rowY(8) + h(52)} out={q6Out}>
          <span style={{ ...note(30, ACCENT_INK), fontWeight: 750, whiteSpace: "nowrap" }}>
            <Num>{count(DELIVERY.blindRows)}</Num> rows
          </span>
        </Note>
        <Note at={idemRowsAt} x={IDEM_X} y={rowY(8) + h(52)} out={q6Out}>
          <span style={{ ...note(30, OK_INK), fontWeight: 750, whiteSpace: "nowrap" }}>
            <Num>{count(DELIVERY.idempotentRows)}</Num> rows
          </span>
        </Note>
        <Note at={effAt} x={1300} y={rowY(8) + h(52)} out={q6Out}>
          <span style={{ ...note(26, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            effectively-once,
            <br />
            without a distributed transaction
          </span>
        </Note>

        {/* ── Question 7 ─────────────────────────────────────────────── */}
        <Box x={K.x} y={K.top} w={K.w} h={K.bottom - K.top} at={insideAt} color={INK_SOFT} fill="transparent" dashed>
          {null}
        </Box>
        <Note at={insideAt + 2} x={K.x + 18} y={K.bottom - h(40)}>
          <span style={{ ...label(22, INK), fontWeight: 750, whiteSpace: "nowrap" }}>inside Kafka</span>
        </Note>
        <Box x={prod.x} y={prod.y} w={prod.w} h={prod.h} at={producerAt}>
          <span>idempotent producer</span>
          <span style={{ ...label(20, BLUE_INK), marginTop: 4, opacity: ease(frame, pidAt, 10) }}>producer id 7</span>
        </Box>
        <Lane x={topicL.x} y={topicL.y} w={topicL.w} h={topicL.h} at={producerAt + 6} name="input topic, on the broker" />
        {seqs.map((s, k) => {
          const t0 = sendAt(k);
          const p = ease(frame, t0, 14);
          if (p <= 0) return null;
          const retry = k === 2;
          const tx = topicL.x + 14 + k * 96;
          const bounce = retry ? ease(frame, dropsAt + 2, 14) : 0;
          const x = interpolate(p, [0, 1], [prod.x + prod.w - 40, retry ? topicL.x + 14 + 2 * 96 : tx]);
          const yy = interpolate(p, [0, 1], [prod.y + prod.h / 2 - 22, topicL.y + (topicL.h - 46) / 2]) + bounce * h(70);
          return (
            <Cell
              key={k}
              x={x}
              y={yy}
              w={84}
              h={46}
              plain
              size={20}
              opacity={Math.min(1, p * 3) * (1 - 0.6 * bounce)}
              ring={retry && bounce > 0 ? ACCENT : undefined}
              ringP={bounce}
            >
              <span style={TABULAR}>seq {s}</span>
            </Cell>
          );
        })}
        <Note at={sendAt(2) + 4} x={topicL.x + 2 * 96 + 104} y={topicL.y + topicL.h / 2 - h(16)}>
          <span style={{ ...label(20, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>← a retry</span>
        </Note>
        <Note at={dropsAt + 10} x={topicL.x + 2 * 96 - 6} y={topicL.y + topicL.h + h(80)}>
          <span style={{ ...label(20, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            <Strike at={dropsAt + 14}>seq 42 again</Strike>: dropped
          </span>
        </Note>

        {/* Consume, transform, produce, in one transaction. */}
        <Box x={app.x} y={app.y} w={app.w} h={app.h} at={txnAt - 4}>
          <span>your app</span>
          <span style={{ ...label(20, INK_SOFT), marginTop: 4 }}>consume, transform</span>
        </Box>
        <ElbowArrow
          points={[
            [app.x + 70, topicL.y + topicL.h + 6],
            [app.x + 70, app.y - 6],
          ]}
          at={txnAt}
          color={BAR}
          dur={10}
          head={12}
        />
        <div
          style={{
            position: "absolute",
            left: txn.x,
            top: txn.y,
            width: txn.w,
            height: txn.h,
            boxSizing: "border-box",
            borderRadius: 14,
            border: `3px solid ${OK}`,
            background: `color-mix(in srgb, ${OK} 6%, transparent)`,
            opacity: ease(frame, txnAt + 4, 12),
          }}
        />
        <Note at={txnAt + 6} x={txn.x + 10} y={txn.y - h(34)}>
          <span style={{ ...label(21, OK_INK), fontWeight: 750, whiteSpace: "nowrap" }}>one transaction</span>
        </Note>
        <Box x={outT.x} y={outT.y} w={outT.w} h={outT.h} at={outputAt} size={21}>
          output messages
        </Box>
        <Box x={offs.x} y={offs.y} w={offs.w} h={offs.h} at={offsetsAt} size={21}>
          consumer offsets
        </Box>
        <ElbowArrow
          points={[
            [app.x + app.w + 6, outT.y + outT.h / 2],
            [outT.x - 6, outT.y + outT.h / 2],
          ]}
          at={outputAt + 2}
          color={BAR}
          dur={10}
          head={12}
        />
        <ElbowArrow
          points={[
            [app.x + app.w - 40, app.y + app.h + 6],
            [app.x + app.w - 40, offs.y + offs.h / 2],
            [offs.x - 6, offs.y + offs.h / 2],
          ]}
          at={offsetsAt + 2}
          color={BAR}
          dur={12}
          head={12}
        />
        <Note at={bothAt} x={txn.x + 10} y={txn.y + txn.h + h(12)}>
          <span style={{ ...note(25, OK_INK), fontWeight: 750, whiteSpace: "nowrap" }}>both land, or neither</span>
        </Note>
        <Note at={loopAt} x={app.x - 330} y={app.y + h(18)}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>consume → transform → produce</span>
        </Note>

        {/* The edge, and what lies past it. */}
        <div
          style={{
            position: "absolute",
            left: K.x + K.w - 2,
            top: K.top - 8,
            width: 6,
            height: K.bottom - K.top + 16,
            background: ACCENT,
            borderRadius: 3,
            opacity: pulse(frame, edgeAt + 2, 30) * 0.8,
          }}
        />
        {outside.map((o, i) => (
          <Box key={o.text} x={OUT_X} y={y(430) + i * h(90)} w={300} h={h(62)} at={o.at} color={ACCENT} size={21}>
            {o.text}
          </Box>
        ))}
        <Note at={notInAt} x={OUT_X} y={y(430) + 3 * h(90) + h(6)}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>not in the transaction</span>
        </Note>
        <Note at={joinAt} x={OUT_X} y={y(430) + 3 * h(90) + h(56)}>
          <span style={{ ...note(24, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            each must join it,
            <br />
            or accept idempotent writes
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
