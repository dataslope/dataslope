import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BACKFILL, num } from "./data";
import { DATA, Drift, LineArrow, madeUp, Mark, MARK_OK, OK, OK_INK, QUIET, X0 } from "./parts";

const BATCHES = 24;
const CELL = 58;
const GAP = 10;
const FAIL = 14;
const CHECKPOINTS = [6, 12, 18];
/** The run dies before this batch. */
const CRASH = 21;
/** Embedded before the crash, after the last checkpoint: on the restart
 *  their content hashes match what is indexed, so they are skipped. */
const UNCHANGED = [18, 19, 20];
/** The restart's row starts at the last checkpoint. */
const RESUME = CHECKPOINTS[CHECKPOINTS.length - 1];

/**
 * Question 11. The page's arithmetic, worked as it is said (check.mjs): 10
 * million chunks at about 400 tokens is 4 billion tokens; cost is 4,000
 * times the price per million tokens; time is that over the rate limit, at a
 * million tokens a minute (labelled a rate for scale, not a provider's)
 * 4,000 minutes, 2.8 days; and, at a range of list prices for scale (2 to 20
 * cents per million), $80 to $800, so the days are the constraint. Then the
 * run drawn as batches, the first run on one row: one rate-limited and
 * retried with growing waits, checkpoints, and the crash. The restart is a
 * second row under it, from the last checkpoint, with idempotent upserts:
 * the batches the first run had already embedded are skipped by their
 * content hash (grey), and the rest are embedded.
 */
export const BackfillScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("backfill").from;
  const qAt = n.word("backfill", "Question");
  const textAt = n.word("backfill", "How do you estimate");
  const countAt = n.word("backfill", "Count tokens");
  const tenAt = n.word("backfill", "ten million chunks");
  const fourHAt = n.word("backfill", "about four hundred tokens");
  const billionAt = n.word("backfill", "is four billion");
  const costAt = n.word("backfill-div", "For cost");
  const thousandAt = n.word("backfill-div", "four thousand times the price per million tokens");
  const timeAt = n.word("backfill-div", "For time, divide by your rate limit");
  const rateAt = n.word("backfill-div", "at a million tokens a minute");
  const minutesAt = n.word("backfill-div", "four thousand minutes");
  const daysAt = n.word("backfill-div", "nearly three days");
  const pricesAt = n.word("backfill-price", "Embedding prices are cents per million tokens");
  const billAt = n.word("backfill-price", "the bill is tens to hundreds of dollars");
  const realAt = n.word("backfill-price", "the days are the real constraint");
  const failAt = n.word("backfill-fail", "design for failure partway");
  const batchAt = n.word("backfill-fail", "batch the requests");
  const retryAt = n.word("backfill-fail", "retry with backoff on rate limits");
  const checkAt = n.word("backfill-fail", "checkpoint progress");
  const upsertAt = n.word("backfill-fail", "upsert idempotently");
  const resumeAt = n.word("backfill-fail", "a restart resumes");
  const overAt = n.word("backfill-fail", "rather than starting over");
  const hashAt = n.word("backfill-hash", "content hashing pays for itself again");
  const neverAt = n.word("backfill-hash", "never embedded twice");
  const end = n.beat("backfill-hash").to;

  const eqY = y(340);
  const barTop = y(650);
  const row2Top = barTop + CELL + 28;
  const cellX = (i: number) => X0 + i * (CELL + GAP);
  const cents = (usd: number) => Math.round(usd * 100);

  // The run, batch by batch.
  const fill = (i: number) => {
    if (i < FAIL) return ease(frame, batchAt + 4 + i * 1.2, 6);
    if (i === FAIL) return ease(frame, retryAt + 20, 8);
    if (i < CRASH) return ease(frame, checkAt + 6 + (i - FAIL) * 2, 6);
    return ease(frame, resumeAt + 10 + (i - CRASH) * 4, 6);
  };
  const failed = ease(frame, retryAt + 2, 8) * (1 - ease(frame, retryAt + 20, 8));
  const crashAt = upsertAt - 10;
  const crash = ease(frame, crashAt, 8) * (1 - 0.6 * ease(frame, resumeAt + 16, 12));
  const restart = ease(frame, upsertAt, 10);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={tenAt + 2} level={-35} />
      <Sfx name="el-tap" at={fourHAt + 2} level={-35} />
      <Sfx name="el-pop" at={billionAt + 2} level={-33} />
      <Sfx name="el-pencil" at={thousandAt + 4} level={-36} />
      <Sfx name="el-pencil" at={minutesAt + 2} level={-36} />
      <Sfx name="el-sprinkle" at={batchAt + 4} level={-36} />
      <Sfx name="el-scratch" at={retryAt + 2} level={-34} />
      <Sfx name="el-tap" at={checkAt + 4} level={-35} />
      <Sfx name="el-whoosh" at={resumeAt + 4} level={-36} />
      <Sfx name="el-chime" at={neverAt + 4} level={-34} />

      <Drift from={from} to={end + 40} scale={0.015}>
        <QuestionCard n={11} kicker="Question 11, the last" at={qAt - 4} textAt={textAt - 4} size={58}>
          How do you estimate the cost and time of an embedding backfill?
        </QuestionCard>

        {/* Count tokens. */}
        <Note at={countAt - 2} x={X0} y={eqY - 46}>
          <span style={{ ...label(22, INK_SOFT), fontWeight: 600, whiteSpace: "nowrap" }}>count tokens</span>
        </Note>
        <Note at={tenAt - 2} x={X0} y={eqY}>
          <span style={{ ...note(36, INK), whiteSpace: "nowrap" }}>
            <Num>{num(BACKFILL.chunks)}</Num> chunks
            <span style={{ opacity: ease(frame, fourHAt - 2, 10) }}>
              {" "}× <Num>{BACKFILL.tokensPerChunk}</Num> tokens
            </span>
            <span style={{ opacity: ease(frame, billionAt - 2, 10), color: BLUE_INK, fontWeight: 600 }}>
              {" "}= <Mark at={billionAt + 4}><Num>{num(BACKFILL.tokens)}</Num> tokens</Mark>
            </span>
          </span>
        </Note>
        <Note at={costAt - 2} x={X0} y={eqY + 70}>
          <span style={{ ...note(29, INK), whiteSpace: "nowrap" }}>
            <b>cost</b> ={" "}
            <span style={{ opacity: ease(frame, thousandAt - 2, 10) }}>
              <Num>{num(BACKFILL.millions)}</Num> × the price per million tokens
            </span>
            <span style={{ opacity: ease(frame, pricesAt - 2, 10), color: INK_SOFT }}>
              ; at <Num>{cents(BACKFILL.priceLow)}</Num> to <Num>{cents(BACKFILL.priceHigh)}</Num> cents,
            </span>
            <span style={{ opacity: ease(frame, billAt - 2, 10), color: BLUE_INK, fontWeight: 600 }}>
              {" "}$<Num>{num(BACKFILL.costLow)}</Num> to $<Num>{num(BACKFILL.costHigh)}</Num>
            </span>
          </span>
        </Note>
        <Note at={timeAt - 2} x={X0} y={eqY + 122}>
          <span style={{ ...note(29, INK), whiteSpace: "nowrap" }}>
            <b>time</b> = 4 billion ÷ your rate limit
            <span style={{ opacity: ease(frame, rateAt - 2, 10), color: INK_SOFT }}>
              ; at <Num>{num(BACKFILL.rate)}</Num> tokens a minute,
            </span>
            <span style={{ opacity: ease(frame, minutesAt - 2, 10) }}>
              {" "}<Num>{num(BACKFILL.minutes)}</Num> minutes
            </span>
            <span style={{ opacity: ease(frame, daysAt - 2, 10), color: BLUE_INK, fontWeight: 600 }}>
              {" "}
              <Mark at={realAt + 4}>
                ≈ <Num>{BACKFILL.days.toFixed(1)}</Num> days
              </Mark>
            </span>
          </span>
        </Note>
        <Note at={rateAt + 6} x={X0} y={eqY + 170}>
          <span style={madeUp(19)}>the page&apos;s numbers; the rate and the price range are for scale, not a provider&apos;s quote</span>
        </Note>

        {/* The run, designed to fail partway. */}
        <Note at={failAt} x={X0} y={barTop - 104}>
          <span style={{ ...note(28, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            <Mark at={failAt + 4}>design for failure partway</Mark>
          </span>
        </Note>
        {/* The key, on a line of its own just over the squares it names. */}
        <div style={{ position: "absolute", left: X0, top: barTop - 44, ...label(21, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, failAt, 14) * ease(frame, batchAt - 2, 10) }}>
          each square, one batch of requests
        </div>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {/* The first run, up to the crash. */}
          {Array.from({ length: CRASH }, (_, i) => {
            const s = ease(frame, batchAt + i * 0.6, 8);
            if (s <= 0) return null;
            const f = fill(i);
            return (
              <g key={i} opacity={s}>
                <rect x={cellX(i)} y={barTop} width={CELL} height={CELL} rx={6} fill={PAPER} stroke={INK_SOFT} strokeWidth={1.6} />
                <rect x={cellX(i)} y={barTop} width={CELL} height={CELL} rx={6} fill={DATA} opacity={0.85 * f} />
                {i === FAIL && failed > 0 ? (
                  <rect x={cellX(i)} y={barTop} width={CELL} height={CELL} rx={6} fill="none" stroke={ACCENT} strokeWidth={3.4} opacity={failed} />
                ) : null}
              </g>
            );
          })}
          {/* The restart, from the last checkpoint: already embedded is skipped. */}
          {Array.from({ length: BATCHES - RESUME }, (_, k) => {
            const i = RESUME + k;
            const s = ease(frame, resumeAt + 2 + k * 1.5, 8);
            if (s <= 0) return null;
            const skip = UNCHANGED.includes(i);
            const f = skip ? ease(frame, hashAt + 4 + UNCHANGED.indexOf(i) * 3, 10) : fill(i);
            return (
              <g key={i} opacity={s}>
                <rect x={cellX(i)} y={row2Top} width={CELL} height={CELL} rx={6} fill={PAPER} stroke={INK_SOFT} strokeWidth={1.6} strokeDasharray={skip && f < 0.5 ? "4 4" : undefined} />
                <rect x={cellX(i)} y={row2Top} width={CELL} height={CELL} rx={6} fill={skip ? QUIET : DATA} opacity={0.85 * f} />
              </g>
            );
          })}
          {/* Backoff: each retry waits longer than the last. */}
          {[0, 1, 2].map((k) => {
            const xs = [cellX(FAIL) + CELL / 2 + 8, cellX(FAIL) + CELL / 2 + 26, cellX(FAIL) + CELL / 2 + 60];
            const o = ease(frame, retryAt + 6 + k * 5, 6) * (1 - ease(frame, checkAt, 10));
            return <circle key={k} cx={xs[k]} cy={barTop - 14} r={4} fill={ACCENT} opacity={o} />;
          })}
          {/* The crash, after the last checkpoint. */}
          <g opacity={crash}>
            <line x1={cellX(CRASH) - GAP / 2} x2={cellX(CRASH) - GAP / 2} y1={barTop - 14} y2={barTop + CELL + 14} stroke={ACCENT} strokeWidth={3} />
          </g>
          {/* Checkpoints. */}
          {CHECKPOINTS.map((c, k) => {
            const o = ease(frame, checkAt + 2 + k * 4, 10);
            const x = cellX(c) - GAP / 2;
            return (
              <g key={c} opacity={o}>
                <line x1={x} x2={x} y1={barTop - 8} y2={barTop + CELL + 8} stroke={INK} strokeWidth={2.6} />
                <path d={`M${x},${barTop - 8} L${x + 18},${barTop - 2} L${x},${barTop + 4}`} fill={OK} />
              </g>
            );
          })}
        </svg>
        <Note at={retryAt} x={cellX(FAIL) - 60} y={barTop - 52} dim={checkAt}>
          <span style={{ ...label(20, ACCENT_INK), fontWeight: 600, whiteSpace: "nowrap" }}>rate-limited: retry, wait longer</span>
        </Note>
        <Note at={crashAt} x={cellX(CRASH) + 4} y={barTop - 52}>
          <span style={{ ...label(20, ACCENT_INK), fontWeight: 600, whiteSpace: "nowrap", opacity: crash }}>the run dies</span>
        </Note>
        <Note at={checkAt + 2} x={cellX(CHECKPOINTS[0]) - 4} y={barTop + CELL + 14}>
          <span style={{ ...label(20, INK), fontWeight: 600, whiteSpace: "nowrap" }}>checkpoints</span>
        </Note>
        {/* The restart: a second row, from the last checkpoint, not from zero. */}
        <div style={{ opacity: restart }}>
          <LineArrow
            from={[cellX(RESUME) - 64, row2Top + CELL / 2]}
            to={[cellX(RESUME) - 12, row2Top + CELL / 2]}
            at={resumeAt}
            color={OK}
            width={2.6}
          />
        </div>
        <Note at={resumeAt + 2} x={cellX(RESUME) - 76} y={row2Top + 2} align="right" width={360}>
          <span style={{ ...note(24, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>a restart resumes here</span>
        </Note>
        <Note at={overAt - 2} x={cellX(RESUME) - 76} y={row2Top + 36} align="right" width={360}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>not from batch one</span>
        </Note>
        <Note at={upsertAt - 2} x={X0} y={row2Top + 28}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            upserts are idempotent: a batch written twice
            <br />
            is still one copy of each chunk
          </span>
        </Note>
        <Note at={hashAt - 2} x={X0} y={row2Top + CELL + 64}>
          <span style={{ ...note(26, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            <span style={{ display: "inline-block", width: 18, height: 18, borderRadius: 4, background: QUIET, marginRight: 10, verticalAlign: "-2px" }} />
            already embedded, hash unchanged:{" "}
            <Mark at={neverAt + 4} color={MARK_OK}>
              never embedded twice
            </Mark>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
