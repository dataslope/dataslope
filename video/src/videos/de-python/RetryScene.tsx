import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, HAIRLINE, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { RETRY } from "./data";
import { Code, Console, Drift, ErrorBox, lineOf, Listing, listingHeight, Mark, MARK, MARK_BAD, MARK_OK, OK, OK_INK, Source, Title, X0 } from "./parts";

const TOP = 330;
const SIZE = 19;
const RIGHT_X = 1070;
const AXIS_W = 720;
const SECONDS = 16;
const ROW = 36;

/**
 * Question 11. The page's with_retries, its doubling delay and the console
 * it prints (fail, 0.010 s, fail, 0.020 s, ok). Then the video's own model of
 * an outage: six clients fail at once and back off with the page's doubling
 * on a 1 s base, so all six retry at 1, 3, 7 and 15 s; with full jitter
 * (random.Random(42)) the same dots slide apart. Last, what not to retry: a
 * bad request raises on its first call, and a capped number of attempts.
 */
export const RetryScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("retry").from;
  const qAt = n.word("retry", "Question eleven");
  const textAt = n.word("retry", "How do you make a network call");
  const catchAt = n.word("retry-loop", "Catch transient errors");
  const waitAt = n.word("retry-loop", "wait, and try again");
  const doublingAt = n.word("retry-loop", "doubling the wait each time");
  const failsAt = n.word("retry-loop", "Here the call fails twice");
  const tenAt = n.word("retry-loop", "waits ten milliseconds");
  const twentyAt = n.word("retry-loop", "then twenty");
  const thirdAt = n.word("retry-loop", "succeeds on the third try");
  const jitterAt = n.word("retry-herd", "Then add jitter");
  const modelAt = n.word("retry-herd", "Model six clients");
  const togetherAt = n.word("retry-herd", "they all come back together");
  const timesAt = ["at one", "three,", "seven", "fifteen seconds"].map((p) => n.word("retry-herd", p));
  const randomAt = n.word("retry-jitter", "Wait a random time up to each delay");
  const spreadAt = n.word("retry-jitter", "their retries spread out");
  const notAt = n.word("retry-not", "Know what not to retry");
  const badAt = n.word("retry-not", "A bad request fails the same way every time");
  const onceAt = n.word("retry-not", "raised at once");
  const capAt = n.word("retry-not", "Cap the attempts");
  const safeAt = n.word("retry-not", "retry only what's safe to repeat");
  const chargeAt = n.word("retry-not", "a retried payment can charge twice");
  const end = n.beat("idem-in").to;

  const F = RETRY.fn;
  const fH = listingHeight(F.length, SIZE);
  const outLines = RETRY.page.out;
  const consoleTop = y(TOP);

  // The outage model: six rows, one per client, on one time axis.
  const axisTop = y(470);
  const rowsTop = axisTop + h(40);
  const sx = (t: number) => RIGHT_X + (t / SECONDS) * AXIS_W;
  const slide = ease(frame, spreadAt - 6, 24);
  const axisY = rowsTop + RETRY.plain.length * h(ROW) + h(6);

  const badTop = y(TOP) + fH + h(26);
  const jitterLine = RETRY.schedule[lineOf(RETRY.schedule, "rng.uniform")].trim();

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={failsAt + 4} level={-36} />
      <Sfx name="el-tap" at={twentyAt} level={-36} />
      <Sfx name="el-pop" at={thirdAt + 4} level={-34} />
      {timesAt.map((at, i) => (
        <Sfx key={i} name="el-tap" at={at} level={-35} />
      ))}
      <Sfx name="el-sprinkle" at={spreadAt - 6} level={-36} />
      <Sfx name="el-scratch" at={onceAt} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={11} at={qAt - 4} textAt={textAt - 4} size={60}>
          How do you make a network call resilient with retries and backoff?
        </QuestionCard>

        {/* ── The page's retry loop ── */}
        <Listing
          lines={F}
          x={X0}
          top={y(TOP)}
          width={910}
          size={SIZE}
          at={catchAt - 4}
          marks={[
            { line: lineOf(F, "except ConnectionError"), at: catchAt + 2, out: waitAt + 10 },
            { line: lineOf(F, "time.sleep(delay)"), at: waitAt, out: doublingAt },
            { line: lineOf(F, "delay = base * (2 **"), at: doublingAt, out: capAt },
            { line: lineOf(F, "if attempt == max_tries"), at: capAt, color: MARK_OK },
          ]}
        />
        <Console
          lines={outLines}
          x={RIGHT_X}
          top={consoleTop}
          width={620}
          size={20}
          at={failsAt - 4}
          lineAt={[failsAt + 2, twentyAt, thirdAt]}
          marks={[
            { line: lineOf(outLines, "0.010s"), at: tenAt, color: MARK },
            { line: lineOf(outLines, "0.020s"), at: twentyAt + 4, color: MARK },
            { line: lineOf(outLines, "ok"), at: thirdAt + 4, color: MARK_OK },
          ]}
        />

        {/* ── The model: six clients, one outage ── */}
        <Note at={jitterAt} x={RIGHT_X} y={axisTop - h(10)}>
          <span style={{ display: "flex", gap: 16, alignItems: "baseline", whiteSpace: "nowrap" }}>
            <Title>a model: six clients fail at once</Title>
            <Source>random.Random(42)</Source>
          </span>
        </Note>
        {RETRY.plain.map((plain, c) => {
          const rowY = rowsTop + c * h(ROW) + h(ROW) / 2;
          const p = ease(frame, modelAt + c * 2, 10);
          if (p <= 0) return null;
          return (
            <React.Fragment key={c}>
              <div style={{ position: "absolute", left: RIGHT_X, top: rowY, width: AXIS_W * p, height: 1, background: HAIRLINE }} />
              {/* The outage: every client fails at 0. */}
              <div
                style={{
                  position: "absolute",
                  left: sx(0) - 6,
                  top: rowY - 6,
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  background: ACCENT,
                  opacity: p,
                }}
              />
              {plain.map((t, k) => {
                const at = timesAt[k] - 4;
                const q = ease(frame, at, 8);
                if (q <= 0) return null;
                const tx = t + (RETRY.jittered[c][k] - t) * slide;
                return (
                  <div
                    key={k}
                    style={{
                      position: "absolute",
                      left: sx(tx) - 8,
                      top: rowY - 8,
                      width: 16,
                      height: 16,
                      borderRadius: 999,
                      background: slide > 0.5 ? OK : BAR,
                      opacity: q * 0.9,
                    }}
                  />
                );
              })}
            </React.Fragment>
          );
        })}
        {/* The axis: seconds after the outage. */}
        {[0, 1, 3, 7, 15].map((t) => (
          <Note key={t} at={modelAt + 4} x={sx(t) - 12} y={axisY}>
            <span style={{ ...label(20, INK_SOFT), display: "inline-block", width: 24, textAlign: "center" }}>{t}</span>
          </Note>
        ))}
        <Note at={modelAt + 8} x={sx(SECONDS) + 4} y={axisY}>
          <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>s</span>
        </Note>
        <Note at={togetherAt} x={RIGHT_X} y={axisY + h(40)} out={randomAt - 4}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>plain backoff: all six at once, every time</span>
        </Note>
        <Note at={randomAt} x={RIGHT_X} y={axisY + h(40)}>
          <span style={{ ...note(24, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            <Code line={jitterLine} size={22} /> <Mark at={spreadAt} color={MARK_OK}>spread out</Mark>
          </span>
        </Note>

        {/* ── What not to retry ── */}
        <Note at={badAt} x={X0} y={badTop + h(36)}>
          <Code line={RETRY.permanent.lines[0]} size={22} />
        </Note>
        <ErrorBox x={X0} top={badTop + h(80)} width={700} at={onceAt - 4} kind={RETRY.permanent.kind} message={RETRY.permanent.message} size={21} />
        <Note at={onceAt + 6} x={X0 + 730} y={badTop + h(90)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <Mark at={onceAt + 10} color={MARK_BAD}>{RETRY.permanentCalls} call</Mark>, no retry
          </span>
        </Note>
        <Note at={safeAt} x={RIGHT_X} y={axisY + h(96)}>
          <span style={{ ...note(24, OK_INK), whiteSpace: "nowrap" }}>retry only what&apos;s safe to repeat</span>
        </Note>
        <Note at={chargeAt} x={RIGHT_X} y={axisY + h(134)}>
          <span style={{ ...note(24, ACCENT_INK), whiteSpace: "nowrap" }}>a retried payment can charge twice</span>
        </Note>
        <Note at={notAt} x={X0} y={badTop}>
          <Title color={ACCENT_INK}>a permanent error</Title>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
