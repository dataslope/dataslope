import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Cross, Drift, Edge, OK, OK_INK, Pill, TaskBox, type Tone } from "./parts";

const X_START = 140;
const BOX_W = 104;
const GAP = 14;
const DAYS = [
  ...[28, 29, 30, 31].map((d) => `May ${d}`),
  ...Array.from({ length: 10 }, (_, i) => `Jun ${i + 1}`),
];
/** The pipeline's first run; every date before it never ran. */
const LAUNCH = DAYS.indexOf("Jun 3");
const TODAY = DAYS.length - 1;
const RERUN = DAYS.indexOf("Jun 6");

/**
 * Question 5. One strip of daily runs, the three ideas each on its own part
 * of it: a retry inside today's run (one task fails and is tried again), a
 * rerun of a date that already finished, and a backfill of the dates before
 * the pipeline existed, or a range of past ones again. All three need
 * idempotent tasks, which Part 6 answers.
 */
export const KindsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("kinds").from;
  const qAt = n.word("kinds", "Question five");
  const textAt = n.word("kinds", "What is the difference");
  const retryAt = n.word("kinds", "A retry re-attempts");
  const failedAt = n.word("kinds", "a failed task");
  const insideAt = n.word("kinds", "inside one run");
  const transAt = n.word("kinds", "for a transient error");
  const rerunAt = n.word("kinds", "A rerun runs a finished date again");
  const fixAt = n.word("kinds", "after a code or data fix");
  const backAt = n.word("kinds", "A backfill runs past dates");
  const neverAt = n.word("kinds", "that never ran");
  const rangeAt = n.word("kinds", "or a whole range again");
  const safeAt = n.word("kinds-safe", "All three are safe");
  const idemAt = n.word("kinds-safe", "only on idempotent tasks");
  const sameAt = n.word("kinds-safe", "which end the same");
  const partAt = n.word("kinds-safe", "Part six shows how");
  const end = n.beat("kinds-safe").to;

  const stripY = y(590);
  const boxH = h(74);
  const bx = (i: number) => X_START + i * (BOX_W + GAP);
  const cx = (i: number) => bx(i) + BOX_W / 2;
  const stripAt = retryAt - 10;

  // Each day's state over the scene.
  const tonesOf = (i: number): { at: number; tone: Tone }[] => {
    if (i < LAUNCH) return [{ at: 0, tone: "quiet" }, { at: neverAt + 2 + i * 3, tone: "data" }];
    if (i === TODAY) return [{ at: retryAt, tone: "lit" }, { at: rerunAt - 6, tone: "data" }];
    const range = i <= RERUN ? [{ at: rangeAt + 2 + (i - LAUNCH) * 3, tone: "lit" as Tone }, { at: rangeAt + 30, tone: "data" as Tone }] : [];
    if (i === RERUN) return [{ at: 0, tone: "data" }, { at: rerunAt, tone: "lit" }, { at: backAt - 8, tone: "data" }, ...range];
    return [{ at: 0, tone: "data" }, ...range];
  };

  // The retry, inside today's run: transform fails, and is tried again.
  const zoomX = cx(TODAY) - 194;
  const zoomY = y(400);
  const retryOk = transAt + 6;

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={stripAt} level={-37} />
      <Sfx name="el-scratch" at={failedAt + 4} level={-35} />
      <Sfx name="el-tap" at={retryOk} level={-35} />
      <Sfx name="el-pop" at={rerunAt + 6} level={-35} />
      <Sfx name="el-sprinkle" at={neverAt + 2} level={-34} />
      <Sfx name="el-chime" at={idemAt} level={-36} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} size={54}>
          What is the difference between retries, backfills, and reruns?
        </QuestionCard>

        {/* The daily runs. */}
        {DAYS.map((d, i) => (
          <React.Fragment key={d}>
            <TaskBox cx={cx(i)} cy={stripY} w={BOX_W} h={boxH} at={stripAt + i} tones={tonesOf(i)} size={20}>
              {i === TODAY ? "today" : ""}
            </TaskBox>
            <div
              style={{
                position: "absolute",
                left: bx(i) - 10,
                width: BOX_W + 20,
                top: stripY + boxH / 2 + h(10),
                textAlign: "center",
                ...label(19, i < LAUNCH ? INK_SOFT : INK),
                fontWeight: 600,
                whiteSpace: "nowrap",
                opacity: ease(frame, stripAt + i, 10),
              }}
            >
              {d}
            </div>
          </React.Fragment>
        ))}
        {DAYS.map((d, i) =>
          i < LAUNCH && frame >= neverAt + 8 + i * 3 ? (
            <div key={d} style={{ position: "absolute", left: cx(i) - 13, top: stripY - 13 }}>
              <Tick at={neverAt + 8 + i * 3} size={26} />
            </div>
          ) : null,
        )}
        {DAYS.map((d, i) =>
          i >= LAUNCH && i < TODAY ? (
            <div key={d} style={{ position: "absolute", left: cx(i) - 13, top: stripY - 13, opacity: ease(frame, stripAt + 6 + i, 8) }}>
              <Tick at={stripAt + 6 + i} size={26} />
            </div>
          ) : null,
        )}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, stripAt + 8, 10) }}>
          <line x1={bx(LAUNCH) - GAP / 2} x2={bx(LAUNCH) - GAP / 2} y1={stripY - boxH / 2 - h(30)} y2={stripY + boxH / 2 + h(44)} stroke={INK} strokeWidth={2} strokeDasharray="4 4" />
        </svg>
        <Note at={stripAt + 10} x={bx(LAUNCH) + 4} y={stripY - boxH / 2 - h(40)}>
          <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>pipeline starts</span>
        </Note>

        {/* A retry: one failed task, inside today's run. */}
        <TaskBox
          cx={zoomX + 120}
          cy={zoomY}
          w={200}
          h={h(52)}
          at={insideAt - 6}
          tones={[
            { at: failedAt + 4, tone: "bad" },
            { at: retryOk, tone: "ok" },
          ]}
          dim={rerunAt - 6}
          size={22}
        >
          transform
        </TaskBox>
        <Edge
          points={[
            [zoomX + 220, zoomY - h(14)],
            [zoomX + 262, zoomY - h(14)],
            [zoomX + 262, zoomY + h(14)],
            [zoomX + 224, zoomY + h(14)],
          ]}
          at={transAt - 2}
          dur={12}
          head={10}
          color={OK}
          dim={rerunAt - 6}
        />
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, insideAt - 4, 10) * (1 - 0.6 * ease(frame, rerunAt - 6, 12)) }}>
          <line x1={zoomX + 120} x2={cx(TODAY)} y1={zoomY + h(26)} y2={stripY - boxH / 2} stroke={INK_SOFT} strokeWidth={1.4} strokeDasharray="3 4" />
        </svg>
        <Note at={retryAt} x={zoomX + 274} y={zoomY - h(96)} align="right" dim={rerunAt - 6}>
          <span style={{ ...note(25, INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            retry: <span style={{ fontWeight: 500 }}>one failed task, the same run</span>
          </span>
        </Note>
        {frame >= failedAt + 4 ? (
          <div style={{ position: "absolute", left: zoomX - 20, top: zoomY - 11, opacity: 1 - ease(frame, retryOk, 8) }}>
            <Cross at={failedAt + 4} size={22} />
          </div>
        ) : null}

        {/* A rerun: a finished date, run again after a fix. */}
        <TaskBox cx={cx(RERUN)} cy={stripY - h(118)} w={BOX_W} h={boxH} at={rerunAt + 4} tones={[{ at: rerunAt + 4, tone: "data" }]} dim={backAt - 6} size={20}>
          again
        </TaskBox>
        <Edge
          points={[
            [cx(RERUN), stripY - boxH / 2 - 3],
            [cx(RERUN), stripY - h(118) + boxH / 2 + 4],
          ]}
          at={rerunAt + 2}
          dur={8}
          head={10}
          dim={backAt - 6}
        />
        <Note at={rerunAt} x={cx(RERUN) - 180} y={stripY - h(118) - boxH / 2 - h(46)} dim={backAt - 6}>
          <span style={{ ...note(25, INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            rerun: <span style={{ fontWeight: 500, opacity: ease(frame, fixAt, 10) }}>a finished date, after a fix</span>
          </span>
        </Note>

        {/* A backfill: the dates that never ran, or a range again. */}
        <Note at={backAt} x={X_START} y={stripY - boxH / 2 - h(96)}>
          <span style={{ ...note(25, INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            backfill: <span style={{ fontWeight: 500, opacity: ease(frame, neverAt, 10) }}>dates that never ran</span>
          </span>
        </Note>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, rangeAt, 12) }}>
          <path
            d={`M${bx(LAUNCH)},${stripY + boxH / 2 + h(44)} l0,10 L${bx(RERUN) + BOX_W},${stripY + boxH / 2 + h(54)} l0,-10`}
            fill="none"
            stroke={INK}
            strokeWidth={2}
          />
        </svg>
        <Note at={rangeAt + 4} x={bx(LAUNCH)} y={stripY + boxH / 2 + h(66)}>
          <span style={{ ...note(24, BLUE_INK), fontWeight: 600, whiteSpace: "nowrap" }}>or a range of past dates, again</span>
        </Note>

        {/* What all three need. */}
        <Pill x={X_START} y={y(800)} at={safeAt} ink={OK_INK} size={26}>
          all three: safe only on idempotent tasks
        </Pill>
        <Note at={sameAt} x={X_START + 640} y={y(806)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            the same end state however often they run
            <span style={{ ...label(21, INK_SOFT), opacity: ease(frame, partAt, 10) }}> · Part 6</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
