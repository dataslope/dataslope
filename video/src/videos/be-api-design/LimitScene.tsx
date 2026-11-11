import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { LIMIT_EXAMPLE } from "./data";
import { artBox, Cross, Drift, Msg, METHOD_INK, OK, OK_INK, Spot, X0, VRule } from "./parts";

const CARD_SIZE = 24;
const R_X = 1010;
const R_W = 780;
/** The example's Retry-After, then each refusal doubling the wait. */
const retryAfter = Number(LIMIT_EXAMPLE.headers.find(([k]) => k === "Retry-After")![1]);
const WAITS = [retryAfter, retryAfter * 2, retryAfter * 4];
/** Each wait's jitter: a spread past it, as a share of the wait. */
const JITTER = 0.35;
/** Where six clients come back after the last wait, spread by jitter. */
const SPREAD = [0.08, 0.31, 0.52, 0.17, 0.71, 0.9];

/**
 * Question 9, from the client's side. The server's half named and handed to
 * Part 2 (the token bucket). Then an example 429, its headers lit as each is
 * named; a client watching what's remaining and slowing down; the waits
 * after a refusal, Retry-After then doubling, each with its jitter, and a
 * crowd coming back spread out; and what may be repeated when the outcome is
 * unknown.
 */
export const LimitScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("limit").from;
  const q9At = n.word("limit", "Question nine");
  const q9TextAt = n.word("limit", "How do you rate-limit");
  const capsAt = n.word("limit", "The server caps requests");
  const bucketAt = n.word("limit", "a token bucket");
  const burstsAt = n.word("limit", "allows short bursts");
  const partAt = n.word("limit", "Part two, on scaling");
  const halfAt = n.word("limit-contract", "The client's half is a contract");
  const headersAt = n.word("limit-contract", "Headers carry the rest");
  const overAt = n.word("limit-contract", "Over the limit");
  const c429At = n.word("limit-contract", "four twenty-nine, too many requests");
  const limitH = n.word("limit-contract", "the limit", { nth: 2 });
  const remH = n.word("limit-contract", "what's remaining");
  const resetH = n.word("limit-contract", "when the window resets");
  const retryH = n.word("limit-contract", "and Retry-After");
  const watchesAt = n.word("limit-client", "watches what's remaining");
  const slowsAt = n.word("limit-client", "slows down before it's refused");
  const on429At = n.word("limit-client", "On a four twenty-nine");
  const leastAt = n.word("limit-client", "it waits at least Retry-After");
  const againAt = n.word("limit-client", "Refused again");
  const doublesAt = n.word("limit-client", "it doubles the wait each time");
  const jitterAt = n.word("limit-client", "plus random jitter");
  const crowdAt = n.word("limit-client", "so a crowd of clients");
  const sameAt = n.word("limit-safe", "The same backoff serves timeouts");
  const cantAt = n.word("limit-safe", "the client can't know what happened");
  const onlyAt = n.word("limit-safe", "repeats only what's safe");
  const getAt = n.word("limit-safe", "a GET");
  const putAt = n.word("limit-safe", "a PUT");
  const postAt = n.word("limit-safe", "or a POST with an idempotency key");
  const end = n.beat("limit-safe").to;

  // ── The server's half, for Part 2 ──
  const serverGone = halfAt - 8;
  const bucket = artBox("bucket", 170);
  const sTop = y(400);

  // ── The example 429 ──
  const cardTop = y(380);
  const headerAt = [limitH, remH, resetH, retryH];
  const says = ["the ceiling for this window", "what's left of it", "when the window resets", "seconds to wait"];
  const lines = [
    { t: LIMIT_EXAMPLE.status, at: c429At },
    ...LIMIT_EXAMPLE.headers.map(([k, v], i) => ({ t: `${k}: ${v}`, at: headersAt + 4 + i * 4, mark: { at: headerAt[i] + 2, out: headerAt[i + 1] ?? watchesAt } })),
  ];
  const lineH = Math.round(CARD_SIZE * 1.6);
  const lineMid = (i: number) => cardTop + Math.round(CARD_SIZE * 0.55) + i * lineH + lineH / 2;

  // ── The client: requests slowing as what's remaining runs low ──
  const gTop = y(350);
  const REQS = 12;
  const FAST = 7;
  const START = 20;
  // Gaps that widen as the client slows down.
  const reqX = Array.from({ length: REQS }, (_, i) => R_X + 20 + (i < FAST ? i * 38 : FAST * 38 + ((i - FAST) * (i - FAST + 1) * 28) / 2 + (i - FAST) * 24));
  const reqAt = (i: number) => watchesAt + i * 4 + (i >= FAST ? (i - FAST) * 6 : 0);
  const shown = reqX.filter((_, i) => frame >= reqAt(i)).length;
  const remaining = START - shown;

  // ── The waits ──
  const wTop = y(520);
  /** The wait bars: low enough under the heading for the 429s above them. */
  const barTop = wTop + h(80);
  const notesTop = wTop + h(174);
  const total = WAITS.reduce((a, b) => a + b, 0) * (1 + JITTER);
  const scale = (R_W - 40) / total;
  const waitX = WAITS.map((_, i) => R_X + WAITS.slice(0, i).reduce((a, b) => a + b * (1 + JITTER), 0) * scale);
  const waitAt = [leastAt + 4, againAt + 2, doublesAt + 8];

  // ── Safe to repeat ──
  const safeTop = y(780);
  const chips = [
    { t: "GET", ok: true, at: getAt },
    { t: "PUT", ok: true, at: putAt },
    { t: "POST + Idempotency-Key", ok: true, at: postAt + 4 },
    { t: "POST", ok: false, at: postAt + 14 },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={bucketAt} level={-30} />
      <Sfx name="el-tap" at={c429At + 2} level={-29} />
      {headerAt.map((at, i) => (
        <Sfx key={i} name="el-pencil" at={at + 2} level={-36} />
      ))}
      <Sfx name="el-sprinkle" at={watchesAt + 2} level={-33} />
      {waitAt.map((at, i) => (
        <Sfx key={i} name="el-tap" at={at} level={-31} />
      ))}
      <Sfx name="el-sprinkle" at={crowdAt + 4} level={-32} />
      {chips.map((c) => (
        <Sfx key={c.t} name="el-tap" at={c.at + 2} level={-32} />
      ))}

      <Drift from={from} to={end + 30}>
        <QuestionCard n={9} at={q9At - 4} textAt={q9TextAt - 4} size={56}>
          How do you rate-limit an API, and how should clients learn their limits?
        </QuestionCard>

        {/* The server's half: Part 2's subject. */}
        <Spot id="bucket" at={bucketAt} out={serverGone} left={X0 + 80} top={sTop} {...bucket} />
        <Note at={capsAt} x={X0 + 380} y={sTop + h(16)} out={serverGone}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            The server caps requests <b>per client, per window</b>
          </span>
        </Note>
        <Note at={bucketAt} x={X0 + 380} y={sTop + h(70)} out={serverGone}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            commonly a <b style={{ color: BLUE_INK }}>token bucket</b>
            <span style={{ opacity: ease(frame, burstsAt, 10) }}>, which allows short bursts</span>
          </span>
        </Note>
        <Note at={partAt} x={X0 + 380} y={sTop + h(130)} out={serverGone}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>Part 2, on scaling: how the server counts</span>
        </Note>

        {/* The contract: an example 429 and its headers. */}
        <Note at={halfAt} x={X0} y={cardTop - h(44)}>
          <span style={{ ...label(22, INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            The client's half: a contract <span style={{ color: INK_SOFT, fontWeight: 500 }}>· an example response</span>
          </span>
        </Note>
        <Msg x={X0} y={cardTop} w={500} at={overAt} tone="bad" size={CARD_SIZE} lines={lines} />
        {says.map((s, i) => (
          <Note key={s} at={headerAt[i] + 4} x={X0 + 530} y={lineMid(i + 1) - 14}>
            <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>{s}</span>
          </Note>
        ))}

        {/* A well-behaved client: watching what's remaining, slowing down. */}
        <Note at={watchesAt} x={R_X} y={gTop}>
          <span style={{ ...label(22, INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            Requests, as <span style={{ fontFamily: MONO, fontWeight: 500 }}>Remaining</span> runs low:{" "}
            <span style={{ color: BLUE_INK }}>
              <Num>{remaining}</Num> left
            </span>
          </span>
        </Note>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <line x1={R_X} y1={gTop + h(66)} x2={R_X + R_W} y2={gTop + h(66)} stroke={HAIRLINE} strokeWidth={1.4} opacity={ease(frame, watchesAt, 10)} />
          {reqX.map((x, i) => {
            const p = ease(frame, reqAt(i), 6);
            return <circle key={i} cx={x} cy={gTop + h(66)} r={8} fill={i >= FAST ? OK : BAR} opacity={p} transform={`translate(0 ${(1 - p) * -10})`} />;
          })}
        </svg>
        <Note at={slowsAt} x={reqX[FAST] - 10} y={gTop + h(86)}>
          <span style={{ ...note(21, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>slows down before the 429</span>
        </Note>

        {/* After a refusal: Retry-After, then doubling, each with jitter. */}
        <Note at={on429At} x={R_X} y={wTop}>
          <span style={{ ...label(22, INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            After a 429, it waits <span style={{ fontFamily: MONO, fontWeight: 500 }}>Retry-After</span>
            <span style={{ opacity: ease(frame, doublesAt, 10) }}>, then doubles the wait</span>
          </span>
        </Note>
        {WAITS.map((w, i) => {
          const at = waitAt[i];
          const x = waitX[i];
          const len = w * scale;
          const grow = ease(frame, at, 16);
          const jit = ease(frame, jitterAt + i * 4, 12);
          const top = barTop;
          return (
            <React.Fragment key={i}>
              <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, at - 2, 6) }}>
                <line x1={x} y1={top - 8} x2={x} y2={top + 34} stroke={ACCENT} strokeWidth={2.6} />
              </svg>
              <Note at={at - 2} x={i === 0 ? x - 2 : x - 18} y={top - h(34)}>
                <span style={{ fontFamily: MONO, fontSize: 19, fontWeight: 500, color: ACCENT_INK }}>429</span>
              </Note>
              <div style={{ position: "absolute", left: x + 4, top, width: Math.max(0, len - 4) * grow, height: 26, background: BAR, borderRadius: 4 }} />
              <div
                style={{
                  position: "absolute",
                  left: x + len,
                  top,
                  width: len * JITTER * jit,
                  height: 26,
                  borderRadius: "0 4px 4px 0",
                  background: `repeating-linear-gradient(90deg, color-mix(in srgb, ${BAR} 35%, ${PAPER}) 0 6px, ${PAPER} 6px 9px)`,
                }}
              />
              <Note at={at + 6} x={x + 4} y={top + h(38)}>
                <span style={{ ...note(21, i === 0 ? INK : BLUE_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
                  <Num>{w}</Num> s
                </span>
              </Note>
            </React.Fragment>
          );
        })}
        <Note at={jitterAt + 6} x={R_X} y={notesTop}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            <span style={{ color: BLUE_INK, fontWeight: 500 }}>dashed</span>: random jitter on top
          </span>
        </Note>
        {/* A crowd of clients comes back spread across the last jitter. */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {SPREAD.map((s, i) => {
            const x = waitX[2] + WAITS[2] * scale * (1 + JITTER * s);
            const p = ease(frame, crowdAt + 4 + i * 3, 8);
            return <circle key={i} cx={x} cy={barTop + 26 + 12 + (i % 3) * 11} r={6} fill={OK} opacity={p} />;
          })}
        </svg>
        <Note at={crowdAt + 10} x={waitX[2] + 60} y={notesTop}>
          <span style={{ ...note(22, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>a crowd returns spread out</span>
        </Note>

        {/* Timeouts and 5xx: repeat only what is safe. */}
        <Note at={sameAt} x={X0} y={safeTop}>
          <span style={{ ...label(22, INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            The same backoff after a timeout or a 5xx
            <span style={{ color: INK_SOFT, fontWeight: 500, opacity: ease(frame, cantAt, 10) }}>, where the outcome is unknown</span>
          </span>
        </Note>
        <Note at={onlyAt} x={X0} y={safeTop + h(50)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>safe to repeat:</span>
        </Note>
        {chips.map((c, i) => {
          const x = [X0 + 200, X0 + 360, X0 + 520, X0 + 950][i];
          return (
            <div key={c.t} style={{ position: "absolute", left: x, top: safeTop + h(46), display: "flex", alignItems: "center", gap: 10, fontSize: 23, opacity: ease(frame, c.at, 10) }}>
              {c.ok ? <Tick at={c.at + 2} size={24} /> : <Cross at={c.at + 2} size={22} />}
              <span style={{ fontFamily: MONO, fontSize: 23, fontWeight: 500, color: c.ok ? METHOD_INK : ACCENT_INK, whiteSpace: "nowrap" }}>
                {c.t.startsWith("POST +") ? (
                  <>
                    POST<span style={{ color: OK_INK }}> + Idempotency-Key</span>
                  </>
                ) : (
                  c.t
                )}
              </span>
              {c.ok ? null : <span style={{ ...note(22, ACCENT_INK), whiteSpace: "nowrap" }}>alone: no</span>}
            </div>
          );
        })}
        <div style={{ position: "absolute", left: X0, top: safeTop - h(20), width: 1680, height: 1, background: HAIRLINE, opacity: ease(frame, sameAt, 10) }} />

        {/* A hairline between the contract and the client that reads it. */}
        <VRule x={955} top={cardTop - h(44)} bottom={notesTop + 30} at={watchesAt} />
      </Drift>
    </AbsoluteFill>
  );
};
