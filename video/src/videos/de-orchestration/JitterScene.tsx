import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, PAPER, label, note, svgText } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { count, STORM } from "./data";
import { Drift, Headline, Kicker, OK, OK_INK, TaskBox } from "./parts";

const PANEL_W = 720;
const PANELS = [
  { key: "plain", x: 170, title: "one backoff schedule" },
  { key: "jitter", x: 1060, title: "with random jitter" },
] as const;
/** The axis tops out at 300 retries a window; the plain spikes run past it. */
const Y_MAX = 300;
const TASK_DOTS = 14;

/**
 * Question 4, the jitter. A shared source fails and every task reading it
 * fails with it; modelled, as charts/idempotency-retry-storm.mjs models it
 * (its code and seed, check.mjs), with a thousand of them retrying on one
 * doubling schedule. Without jitter all 1,000 land in one 100 ms window
 * against a service that takes 90; with jitter each lands somewhere in its
 * wait, and the peaks fall to 261, 134 and 75.
 */
export const JitterScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("jitter").from;
  const addAt = n.word("jitter", "Add jitter, too");
  const sourceAt = n.word("jitter", "When a shared source fails");
  const onceAt = n.word("jitter", "fails at once");
  const modelAt = n.word("jitter", "Model a thousand");
  const allAt = n.word("jitter", "all thousand retry");
  const sameAt = n.word("jitter", "in the same tenth of a second");
  const capAt = n.word("jitter", "a service that takes ninety");
  const randAt = n.word("jitter-fix", "With random jitter");
  const landsAt = n.word("jitter-fix", "lands somewhere in its wait");
  const peakAt = n.word("jitter-fix", "The peak falls to two hundred sixty-one");
  const thirdAt = n.word("jitter-fix", "below ninety by the third round");
  const end = n.beat("jitter-fix").to;

  const base = y(840);
  const H = h(380);
  const vy = (v: number) => base - (Math.min(v, Y_MAX) / Y_MAX) * H;
  const buckets = STORM.window / STORM.bucket;
  const bw = PANEL_W / buckets;
  const bx = (x0: number, i: number) => x0 + i * bw;
  const msX = (x0: number, ms: number) => x0 + (ms / STORM.window) * PANEL_W;

  // The source and the tasks that read it.
  const srcY = y(186);
  const dotY = y(262);
  const dotX = (i: number) => 1120 + i * 46;
  const failed = ease(frame, onceAt, 10);

  const plainSpikes = STORM.rounds.map((r) => r.plainAt);
  const jitterGrow = (i: number) => ease(frame, randAt + 4 + i * 1.2, 10);
  const round3 = STORM.rounds[2];
  const peakIdx = STORM.jittered.indexOf(STORM.peakJitter);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={onceAt} level={-33} />
      {plainSpikes.map((ms, i) => (
        <Sfx key={ms} name="el-tap" at={allAt + 2 + i * 6} level={-33} />
      ))}
      <Sfx name="el-pencil" at={capAt} level={-36} />
      <Sfx name="el-sprinkle" at={randAt + 4} level={-34} />
      <Sfx name="el-chime" at={thirdAt + 8} level={-36} />

      <Drift from={from} to={end + 30}>
        <Kicker at={addAt - 4}>Question 4 · retries</Kicker>
        <Headline lead="Add jitter, too." at={addAt - 2} size={66} />

        {/* One source, and every task that reads it. */}
        <TaskBox cx={1420} cy={srcY} w={190} h={h(50)} at={sourceAt} tones={[{ at: onceAt, tone: "bad" }]} size={24}>
          source
        </TaskBox>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, sourceAt + 4, 12) }}>
          {Array.from({ length: TASK_DOTS }, (_, i) => (
            <g key={i}>
              <line x1={1420} y1={srcY + h(25)} x2={dotX(i)} y2={dotY - 10} stroke={INK_SOFT} strokeWidth={1} opacity={0.4} />
              <circle cx={dotX(i)} cy={dotY} r={9} fill={`color-mix(in srgb, ${ACCENT} ${ease(frame, onceAt + i * 0.6, 6) * 100}%, ${BAR})`} />
            </g>
          ))}
        </svg>
        <Note at={onceAt + 6} x={dotX(TASK_DOTS - 1) + 22} y={dotY - 14} align="left">
          <span style={{ ...label(20, ACCENT_INK), whiteSpace: "nowrap", opacity: failed }}>fail at once</span>
        </Note>

        {/* The two panels. */}
        {PANELS.map((pnl) => {
          const shown = ease(frame, pnl.key === "plain" ? modelAt : randAt - 4, 12);
          return (
            <React.Fragment key={pnl.key}>
              <div style={{ position: "absolute", left: pnl.x, top: y(328), ...note(28, INK), fontWeight: 700, whiteSpace: "nowrap", opacity: shown }}>{pnl.title}</div>
              <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: shown }}>
                {[0, 100, 200, 300].map((v) => (
                  <g key={v}>
                    <line x1={pnl.x} x2={pnl.x + PANEL_W} y1={vy(v)} y2={vy(v)} stroke={INK_SOFT} strokeWidth={1} strokeDasharray="2 6" opacity={v ? 0.5 : 0} />
                    <text x={pnl.x - 12} y={vy(v) + 7} textAnchor="end" style={svgText({ ...label(19, INK_SOFT), fontWeight: 500 })}>
                      {v}
                    </text>
                  </g>
                ))}
                <line x1={pnl.x} x2={pnl.x + PANEL_W} y1={base} y2={base} stroke={INK} strokeWidth={1.6} />
                {[0, 1000, 2000, 3000, 4000].map((ms) => (
                  <text key={ms} x={msX(pnl.x, ms)} y={base + 30} textAnchor="middle" style={svgText({ ...label(19, INK_SOFT), fontWeight: 500 })}>
                    {count(ms)}
                  </text>
                ))}
                <text x={pnl.x + PANEL_W} y={base + 58} textAnchor="end" style={svgText({ ...label(19, INK_SOFT) })}>
                  ms after the failure
                </text>
              </svg>
            </React.Fragment>
          );
        })}
        <Note at={modelAt + 4} x={PANELS[0].x} y={y(372)}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>a model: 1,000 tasks, retries per 100 ms</span>
        </Note>

        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {/* Without jitter: every task on the same millisecond, three times. */}
          {STORM.plain.map((v, i) => {
            if (!v) return null;
            const k = plainSpikes.indexOf(i * STORM.bucket);
            const p = ease(frame, allAt + 2 + Math.max(0, k) * 6, 10);
            const top = vy(v * p);
            const capY = vy(STORM.capacity);
            const x = bx(PANELS[0].x, i);
            return (
              <g key={i}>
                <rect x={x + 1} y={Math.max(top, capY)} width={bw - 2} height={base - Math.max(top, capY)} fill={BAR} opacity={0.85} />
                {top < capY ? <rect x={x + 1} y={top} width={bw - 2} height={capY - top} fill={ACCENT} opacity={0.85} /> : null}
                {/* The axis stops at 300: a break where the spike runs on. */}
                {v * p > Y_MAX ? (
                  <path d={`M${x - 3},${vy(Y_MAX) + 14} l${bw + 6},-6 M${x - 3},${vy(Y_MAX) + 22} l${bw + 6},-6`} stroke={PAPER} strokeWidth={3} />
                ) : null}
              </g>
            );
          })}
          {/* With jitter: the same retries, spread through each wait. */}
          {STORM.jittered.map((v, i) => {
            if (!v) return null;
            const p = jitterGrow(i);
            const top = vy(v * p);
            const capY = vy(STORM.capacity);
            const x = bx(PANELS[1].x, i);
            return (
              <g key={i}>
                <rect x={x + 1} y={Math.max(top, capY)} width={bw - 2} height={base - Math.max(top, capY)} fill={BAR} opacity={0.85} />
                {top < capY ? <rect x={x + 1} y={top} width={bw - 2} height={capY - top} fill={ACCENT} opacity={0.85} /> : null}
              </g>
            );
          })}
          {/* What the service can take. */}
          {PANELS.map((pnl) => {
            const p = ease(frame, (pnl.key === "plain" ? capAt : Math.max(capAt, randAt - 4)) + 2, 14);
            return p > 0 ? (
              <line
                key={pnl.key}
                x1={pnl.x}
                x2={pnl.x + PANEL_W * p}
                y1={vy(STORM.capacity)}
                y2={vy(STORM.capacity)}
                stroke={INK}
                strokeWidth={2.4}
                strokeDasharray="8 6"
              />
            ) : null;
          })}
          {/* Each round's wait, over the jittered panel. */}
          {STORM.rounds.map((r, i) => {
            const p = ease(frame, landsAt + i * 5, 12);
            const x0 = msX(PANELS[1].x, r.from) + 3;
            const x1 = msX(PANELS[1].x, r.to) - 3;
            const top = vy(Y_MAX) - 16;
            const third = i === 2 ? ease(frame, thirdAt, 10) : 0;
            const color = `color-mix(in srgb, ${OK} ${third * 100}%, ${INK})`;
            return (
              <g key={i} opacity={p}>
                <path d={`M${x0},${top + 10} L${x0},${top} L${x1},${top} L${x1},${top + 10}`} fill="none" stroke={color} strokeWidth={2 + third} />
                <text x={(x0 + x1) / 2} y={top - 10} textAnchor="middle" style={svgText({ ...label(19, i === 2 && third > 0.5 ? OK_INK : INK_SOFT), fontWeight: 650 })}>
                  {`wait ${i + 1}`}
                </text>
              </g>
            );
          })}
        </svg>

        {/* The numbers. */}
        <Note at={sameAt} x={msX(PANELS[0].x, plainSpikes[0]) - 6} y={vy(Y_MAX) - h(46)}>
          <span style={{ ...note(23, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            <Num>{count(STORM.peakPlain)}</Num> in one 100 ms
          </span>
        </Note>
        <Note at={capAt + 8} x={PANELS[0].x + PANEL_W} y={vy(STORM.capacity) + h(10)} align="right">
          <span style={{ ...label(20, INK), whiteSpace: "nowrap" }}>
            service takes <Num>{STORM.capacity}</Num>
          </span>
        </Note>
        <Note at={peakAt + 6} x={bx(PANELS[1].x, peakIdx) + bw + 8} y={vy(STORM.peakJitter) - h(6)}>
          <span style={{ ...note(23, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            peak <Num>{STORM.peakJitter}</Num>
          </span>
        </Note>
        <Note at={thirdAt + 4} x={msX(PANELS[1].x, round3.to) + 12} y={vy(round3.jitterPeak) - h(20)}>
          <span style={{ ...note(23, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            <Num>{round3.jitterPeak}</Num>: under <Num>{STORM.capacity}</Num>
          </span>
        </Note>
        <div style={{ position: "absolute", left: PANELS[1].x, top: y(372), ...label(21, BLUE_INK), whiteSpace: "nowrap", opacity: ease(frame, landsAt, 10) }}>
          each retry at a random point in its wait
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
