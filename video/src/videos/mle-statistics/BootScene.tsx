import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { I, MathRun } from "../../editorial/math";
import { INK, INK_SOFT, label, note } from "../../editorial/style";
import { ColumnRule, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { BOOT_P95, CLUSTER } from "./data";
import { BAD, BAD_INK, Baseline, DATA, DATA_FILL, Drift, Heading, Hist, Line, Mark, MUTED, mulberry32, OK, OK_INK, POINT, Svg, X0, QMark } from "./parts";

const R_X0 = 980;
const R_X1 = 1780;
const DISC = 40;
const DISC_PITCH = 54;
const DISC_X0 = 290;

/** Three resamples of ten: how many times each original point is drawn. A
 *  seeded draw with replacement, so it is the same on every frame. */
const RESAMPLES = (() => {
  const rand = mulberry32(55);
  return [0, 1, 2].map(() => {
    const counts = Array<number>(10).fill(0);
    for (let i = 0; i < 10; i++) counts[Math.floor(rand() * 10)]++;
    return counts;
  });
})();

/** 200 users of ten rows each, each user with an accuracy of their own
 *  (a seeded picture of what clustered rows look like). */
const USERS = (() => {
  const rand = mulberry32(12);
  return Array.from({ length: CLUSTER.users }, () => {
    const p = Math.min(0.99, Math.max(0.4, CLUSTER.accuracy + (rand() + rand() + rand() - 1.5) * 0.3));
    return Array.from({ length: CLUSTER.perUser }, () => rand() < p);
  });
})();

/** A hat drawn over its letter. The combining circumflex (θ̂) lands to the
 *  right of an italic θ in the serif, over the subscript that follows it. */
const Hat: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ position: "relative", display: "inline-block" }}>
    {children}
    <span style={{ position: "absolute", left: "0.14em", right: 0, top: "-0.36em", textAlign: "center", fontStyle: "normal", lineHeight: 1 }}>ˆ</span>
  </span>
);

/**
 * Question 5. The bootstrap as a picture: ten points, resampled with
 * replacement three times (repeats stacked, dropouts faded), the statistic
 * recomputed each time, × 5,000. Then the case with no formula: a thousand
 * simulated latencies, their p95 at 110 ms, and the 5,000 bootstrap p95s
 * with the middle 95% (101 to 120 ms) shaded green. Then the follow-up:
 * 2,000 rows from 200 users, where resampling rows gives an interval a third
 * too narrow (red) and resampling users gives the true spread (green).
 */
export const BootScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q5").from;
  const qAt = n.word("q5", "Question five");
  const textAt = n.word("q5", "What is bootstrapping");
  const resampleAt = n.word("q5", "Resample your data");
  const sizeAt = n.word("q5", "at its own size");
  const thousandsAt = n.word("q5", "thousands of times");
  const recomputeAt = n.word("q5", "recompute the statistic");
  const percentilesAt = n.word("q5", "off the percentiles");
  const noFormulaAt = n.word("q5", "No formula needed");
  const latAt = n.word("q5-p95", "simulated request latencies");
  const p95At = n.word("q5-p95", "a hundred and ten milliseconds");
  const fiveKAt = n.word("q5-p95", "five thousand resamples");
  const betweenAt = n.word("q5-p95", "between a hundred and one");
  const ifAt = n.word("q5-unit", "If two thousand test rows");
  const testRowsAt = n.word("q5-unit", "test rows come");
  const usersAt = n.word("q5-unit", "two hundred users");
  const rowsAt = n.word("q5-unit", "resampling rows treats them");
  const narrowAt = n.word("q5-unit", "a third too narrow");
  const wholeAt = n.word("q5-unit", "Resample whole users");
  const end = n.beat("q5-unit").to;

  // The bootstrap figure stays up while the follow-up's rule is said, and
  // gives way only as the rows it is about are named.
  const out = ifAt - 6;
  const rowY = [y(360), y(450), y(520), y(590)];

  // ── Right: latencies and their bootstrap ──
  const lx = (v: number) => R_X0 + (v / 200) * (R_X1 - R_X0);
  const latBase = y(530);
  const bx = (v: number) => R_X0 + ((v - 90) / 40) * (R_X1 - R_X0);
  const bootBase = y(780);
  const inside = (i: number) => {
    const mid = (BOOT_P95.boots.edges[i] + BOOT_P95.boots.edges[i + 1]) / 2;
    return mid >= BOOT_P95.low && mid <= BOOT_P95.high;
  };
  const shade = ease(frame, betweenAt, 14);

  // ── The follow-up: users ──
  const uCols = 20;
  const uW = 34;
  const uH = 28;
  const uGap = 6;
  const uTop = y(372);
  const ax0 = 1080;
  const lx0 = 1300;
  const ax1 = 1760;
  const ax = (v: number) => lx0 + ((v - 0.8) / 0.1) * (ax1 - lx0);
  const rowsHalf = 1.96 * CLUSTER.seRows;
  const usersHalf = 1.96 * CLUSTER.seUsers;
  const trueHalf = 1.96 * CLUSTER.seTrue;
  const rowsY = y(460);
  const usersY = y(600);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={resampleAt + 2} level={-33} />
      <Sfx name="el-sprinkle" at={sizeAt + 6} level={-33} />
      <Sfx name="el-tap" at={thousandsAt} level={-31} />
      <Sfx name="el-sprinkle" at={latAt} level={-32} />
      <Sfx name="el-tap" at={p95At} level={-30} />
      <Sfx name="el-sprinkle" at={fiveKAt + 4} level={-33} />
      <Sfx name="el-pencil" at={betweenAt} level={-35} />
      <Sfx name="el-sprinkle" at={usersAt} level={-33} />
      <Sfx name="el-pencil" at={rowsAt + 4} level={-35} />
      <Sfx name="el-tap" at={narrowAt} level={-30} />
      <Sfx name="el-pencil" at={wholeAt + 2} level={-35} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is <QMark at={n.word("q5", "bootstrapping, and")} after=",">bootstrapping</QMark> and{" "}
          <QMark at={n.word("q5", "when do you use it?")} after="?">when do you use it</QMark>
        </QuestionCard>

        {/* ── Left: ten points, resampled ── */}
        <div style={{ position: "absolute", inset: 0, opacity: 1 - ease(frame, out, 12) }}>
          <Heading at={resampleAt} x={X0} y={y(286)}>
            Resample with replacement, at the data&apos;s own size
          </Heading>
          {[0, 1, 2, 3].map((r) => {
            const at = r === 0 ? resampleAt + 2 : sizeAt + 4 + (r - 1) * 8;
            const p = ease(frame, at, 12);
            if (p <= 0) return null;
            const counts = r === 0 ? Array<number>(10).fill(1) : RESAMPLES[r - 1];
            return (
              <React.Fragment key={r}>
                <div style={{ position: "absolute", left: X0, top: rowY[r] + DISC / 2 - 15, ...note(22, r === 0 ? INK : INK_SOFT), whiteSpace: "nowrap", opacity: p }}>
                  {r === 0 ? "Data" : `Resample ${r}`}
                </div>
                {counts.map((c, j) => {
                  const cx = DISC_X0 + j * DISC_PITCH;
                  const q = ease(frame, at + j * 0.8, 8);
                  return (
                    <div key={j} style={{ position: "absolute", left: cx, top: rowY[r], width: DISC, height: DISC, opacity: q }}>
                      {Array.from({ length: Math.max(1, c) }, (_, k) => (
                        <div
                          key={k}
                          style={{
                            position: "absolute",
                            left: k * 5,
                            top: -k * 5,
                            width: DISC,
                            height: DISC,
                            borderRadius: "50%",
                            boxSizing: "border-box",
                            background: c === 0 ? "transparent" : k === c - 1 ? DATA : DATA_FILL,
                            border: c === 0 ? `2px dashed ${MUTED}` : "none",
                            zIndex: k + 1,
                          }}
                        />
                      ))}
                      {c > 0 ? (
                        <div
                          style={{
                            position: "absolute",
                            left: (c - 1) * 5,
                            top: -(c - 1) * 5,
                            width: DISC,
                            height: DISC,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            ...label(20, "var(--ds-white)"),
                            fontWeight: 600,
                            zIndex: 10,
                          }}
                        >
                          {j + 1}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                {r > 0 ? (
                  <div
                    style={{
                      position: "absolute",
                      left: DISC_X0 + 10 * DISC_PITCH + 14,
                      top: rowY[r] + DISC / 2 - 17,
                      ...note(24, INK),
                      whiteSpace: "nowrap",
                      opacity: ease(frame, recomputeAt + (r - 1) * 4, 10),
                    }}
                  >
                    →{" "}
                    <MathRun>
                      <Hat>
                        <I>θ</I>
                      </Hat>
                      <sub style={{ fontSize: "0.7em" }}>{r}</sub>
                    </MathRun>
                  </div>
                ) : null}
              </React.Fragment>
            );
          })}
          <Line at={thousandsAt} x={DISC_X0} y={y(676)} size={26}>
            × <Num>5,000</Num>,{" "}
            <span style={{ opacity: ease(frame, percentilesAt - 2, 10) }}>then read the percentiles</span>
          </Line>
          <Line at={noFormulaAt} x={DISC_X0} y={y(736)} size={28} color={OK_INK} weight={600}>
            No formula needed
          </Line>
        </div>

        {/* ── Right: a p95 with no formula ── */}
        <div style={{ position: "absolute", inset: 0, opacity: 1 - ease(frame, out, 12) }}>
          <ColumnRule x={(DISC_X0 + 10 * DISC_PITCH + 90 + R_X0) / 2} top={y(286)} height={y(880) - y(286)} at={thousandsAt} />
          <Heading at={latAt} x={R_X0} y={y(286)}>
            <Num>1,000</Num> simulated request latencies
          </Heading>
          <Hist
            counts={BOOT_P95.latency.counts}
            edges={BOOT_P95.latency.edges}
            x={lx}
            base={latBase}
            height={h(150)}
            grow={(i) => ease(frame, latAt + 2 + i * 0.5, 10)}
            ink={(i) => (BOOT_P95.latency.edges[i] >= BOOT_P95.p95 ? ds("blue", 300) : DATA)}
          />
          <Baseline x0={R_X0} x1={R_X1} base={latBase} at={latAt} ticks={[50, 100, 150, 200].map((v) => ({ v, x: lx(v), text: `${v} ms` }))} />
          <Svg opacity={ease(frame, p95At - 2, 10)}>
            <line x1={lx(BOOT_P95.p95)} x2={lx(BOOT_P95.p95)} y1={latBase} y2={latBase - h(150) - 10} stroke={POINT} strokeWidth={3} />
          </Svg>
          <Line at={p95At} x={lx(BOOT_P95.p95) + 12} y={latBase - h(150) - 6} size={24}>
            <Mark at={p95At + 4}>
              p95: <Num>{Math.round(BOOT_P95.p95)}</Num> ms
            </Mark>
          </Line>

          <Heading at={thousandsAt} out={fiveKAt - 2} x={R_X0} y={y(610)}>
            The statistic, over <Num>5,000</Num> resamples
          </Heading>
          <Heading at={fiveKAt} x={R_X0} y={y(610)}>
            <Num>5,000</Num> bootstrap p95s
          </Heading>
          <Hist
            counts={BOOT_P95.boots.counts}
            edges={BOOT_P95.boots.edges}
            x={bx}
            base={bootBase}
            height={h(120)}
            grow={(i) => ease(frame, thousandsAt + 4 + i * 0.6, 10)}
            ink={(i) => (inside(i) && shade > 0.5 ? OK : DATA)}
          />
          <Svg opacity={ease(frame, thousandsAt, 10)}>
            <line x1={R_X0} x2={R_X1} y1={bootBase + 0.5} y2={bootBase + 0.5} stroke={INK} strokeWidth={1.6} />
            {[BOOT_P95.low, BOOT_P95.high].map((v) => (
              <line
                key={v}
                x1={bx(v)}
                x2={bx(v)}
                y1={bootBase}
                y2={bootBase - h(120) * ease(frame, percentilesAt + 2, 12)}
                stroke={POINT}
                strokeWidth={3}
                opacity={1 - ease(frame, betweenAt + 6, 12)}
              />
            ))}
          </Svg>
          <Line at={percentilesAt + 6} out={betweenAt} x={bx(BOOT_P95.high) + 12} y={bootBase - h(120)} size={22}>
            The middle <Num>95%</Num>
          </Line>
          <Baseline x0={R_X0} x1={R_X1} base={bootBase} at={fiveKAt} ticks={[100, 110, 120, 130].map((v) => ({ v, x: bx(v), text: `${v} ms` }))} />
          <Line at={betweenAt + 4} x={R_X0} y={bootBase + h(56)} size={26} color={OK_INK} weight={600}>
            <Num>95%</Num> interval: <Num>{Math.round(BOOT_P95.low)}</Num> to <Num>{Math.round(BOOT_P95.high)}</Num> ms
          </Line>
        </div>

        {/* ── The follow-up: resample the unit that was sampled ── */}
        <Heading at={ifAt + 2} x={X0} y={y(296)}>
          <Num>{CLUSTER.rows.toLocaleString("en-US")}</Num> test rows from <Num>{CLUSTER.users}</Num> users
        </Heading>
        <Svg>
          {USERS.map((rowsOf, u) => {
            const c = u % uCols;
            const r = Math.floor(u / uCols);
            const p = ease(frame, testRowsAt + c * 0.5 + r * 0.8, 10);
            if (p <= 0) return null;
            const bx0 = X0 + c * (uW + uGap);
            const by0 = uTop + r * (uH + h(12));
            return (
              <g key={u} opacity={p}>
                <rect x={bx0} y={by0} width={uW} height={uH} rx={4} fill={ds("blue", 100)} />
                {rowsOf.map((right, k) => (
                  <rect key={k} x={bx0 + 3 + (k % 5) * 6} y={by0 + 3 + Math.floor(k / 5) * 12} width={4.5} height={10} rx={1} fill={right ? DATA : MUTED} />
                ))}
              </g>
            );
          })}
        </Svg>
        <Line at={usersAt + 10} x={X0} y={uTop + 10 * (uH + h(12)) + h(10)} size={22} color={INK_SOFT}>
          One block per user, ten rows each; users differ in how often the model is right
        </Line>

        <ColumnRule x={(X0 + uCols * (uW + uGap) + 1020) / 2 - 10} top={y(296)} height={y(860) - y(296)} at={rowsAt} />

        <Heading at={rowsAt} x={ax0} y={y(296)}>
          The accuracy&apos;s <Num>95%</Num> interval
        </Heading>
        {/* The true spread, over 3,000 fresh datasets. */}
        <Svg opacity={ease(frame, narrowAt, 12)}>
          <path
            d={`M${ax(CLUSTER.accuracy - trueHalf)},${usersY - 20} L${ax(CLUSTER.accuracy - trueHalf)},${usersY - 30} L${ax(CLUSTER.accuracy + trueHalf)},${usersY - 30} L${ax(CLUSTER.accuracy + trueHalf)},${usersY - 20}`}
            fill="none"
            stroke={INK}
            strokeWidth={2}
          />
        </Svg>
        <Line at={narrowAt + 4} x={ax(CLUSTER.accuracy)} y={usersY - h(80)} size={22} align="center" width={400}>
          The true spread
        </Line>
        <Svg>
          <line
            x1={ax(CLUSTER.accuracy - rowsHalf)}
            x2={ax(CLUSTER.accuracy - rowsHalf) + 2 * (ax(CLUSTER.accuracy + rowsHalf) - ax(CLUSTER.accuracy)) * ease(frame, rowsAt + 4, 14)}
            y1={rowsY}
            y2={rowsY}
            stroke={BAD}
            strokeWidth={6}
            strokeLinecap="round"
            opacity={ease(frame, rowsAt + 4, 3)}
          />
          <line
            x1={ax(CLUSTER.accuracy - usersHalf)}
            x2={ax(CLUSTER.accuracy - usersHalf) + 2 * (ax(CLUSTER.accuracy + usersHalf) - ax(CLUSTER.accuracy)) * ease(frame, wholeAt + 2, 14)}
            y1={usersY}
            y2={usersY}
            stroke={OK}
            strokeWidth={6}
            strokeLinecap="round"
            opacity={ease(frame, wholeAt + 2, 3)}
          />
        </Svg>
        <Line at={rowsAt + 2} x={ax0} y={rowsY - 16} size={24} color={BAD_INK}>
          Resample rows
        </Line>
        <Line at={wholeAt} x={ax0} y={usersY - 16} size={24} color={OK_INK}>
          Resample users
        </Line>
        <Baseline x0={lx0 - 20} x1={ax1} base={y(680)} at={rowsAt} ticks={[0.8, 0.85, 0.9].map((v) => ({ v, x: ax(v), text: `${Math.round(v * 100)}%` }))} />
        <Line at={narrowAt} x={ax0} y={y(770)} size={28} color={BAD_INK} weight={600}>
          Rows as if independent: <Num>{Math.round(CLUSTER.narrower * 100)}%</Num> too narrow
        </Line>
        <Line at={wholeAt + 4} x={ax0} y={y(822)} size={28} color={OK_INK} weight={600}>
          Resample whole users
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
