import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, TABULAR, fmt, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { METRIC } from "./data";
import { colsOf, DataTable, Drift, geoOf, MARK_BAD, Mark, OK_INK, TableName, X0 } from "./parts";

const LIST_Y = 380;
const PITCH = 100;
const TABLE_X = 1080;

/** A signed percentage, the way a weekly report prints a change. */
const change = (x: number) => `${x > 0 ? "+" : "−"}${fmt(Math.abs(x) * 100, 0)}%`;

/**
 * Question 5. Four checks down the left, the last one the trap: the video's
 * own two weeks, where conversion rose 20% because sessions fell 20% and
 * orders fell 4%.
 */
export const MetricScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("metric").from;
  const qAt = n.word("metric", "Question");
  const textAt = n.word("metric", "A metric went up");
  const assumeAt = n.word("metric-steps", "State your assumptions");
  const realAt = n.word("metric-steps", "Is it real");
  const regionAt = n.word("metric-steps", "Which region");
  const dayAt = n.word("metric-steps", "the day of the week");
  const denomAt = n.word("metric-denom", "did the denominator move");
  const convAt = n.word("metric-denom", "conversion went from");
  const upAt = n.word("metric-denom", "up twenty percent");
  const ordersAt = n.word("metric-denom", "orders fell");
  const sessionsAt = n.word("metric-denom", "Sessions fell");
  const becauseAt = n.word("metric-denom", "because the traffic dropped");
  const finishAt = n.word("metric-end", "Finish with");
  const lostAt = n.word("metric-driver", "sessions fell by two thousand");
  const twelveAt = n.word("metric-driver", "orders by only twelve");
  const driverAt = n.word("metric-driver", "The likeliest driver");
  const campaignAt = n.word("metric-driver", "a paused campaign");
  const checkAt = n.word("metric-driver", "Check sessions by channel");
  const ordersFellAt = n.word("metric-driver", "say plainly that orders fell");
  const end = n.beat("quantile-in").to;

  const steps = [
    { at: realAt, text: "Is it real? A tracking change, bots, a deploy" },
    { at: regionAt, text: "Which region, platform or cohort moved?" },
    { at: dayAt, text: "The day of the week, or the season?" },
    { at: denomAt, text: "Did the denominator move?" },
  ];

  const [last, now] = METRIC.weeks.rows;
  const lost = METRIC.lost;
  const ci = METRIC.weeks.cols.indexOf("conversion");
  const si = METRIC.weeks.cols.indexOf("sessions");
  const oi = METRIC.weeks.cols.indexOf("orders");
  const count = (s: string) => Number(s).toLocaleString("en-US");
  const row = (r: readonly string[], k: number) =>
    r.map((c, j) => (j === ci ? `${fmt(METRIC.percent[k], 1)}%` : j === si || j === oi ? count(c) : c));
  const table = { cols: METRIC.weeks.cols, rows: [row(last, 0), row(now, 1), ["change", "", "", ""]] };
  const changes = [
    { col: ci, at: upAt, value: change(METRIC.lift) },
    { col: oi, at: ordersAt, value: change(METRIC.orders) },
    { col: si, at: sessionsAt, value: change(METRIC.sessions) },
  ];
  const g = geoOf(table, TABLE_X, y(LIST_Y), h, { extra: [changes.map((c) => c.value)], headH: 56, rowH: 62, bodySize: 32, headSize: 24 });
  const cols = colsOf(table, { conversion: { numeric: true }, sessions: { numeric: true }, orders: { numeric: true } });

  return (
    <AbsoluteFill>
      {steps.map((s) => (
        <Sfx key={s.text} name="el-tap" at={s.at} level={-34} />
      ))}
      <Sfx name="el-pop" at={upAt + 2} level={-32} />
      <Sfx name="el-scratch" at={sessionsAt + 2} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} size={60}>
          A metric went up 20% week over week. How do you investigate?
        </QuestionCard>

        <Note at={assumeAt - 2} x={X0} y={y(LIST_Y) - h(58)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>state your assumptions, then take it apart:</span>
        </Note>
        {steps.map((s, i) => {
          const trap = i === steps.length - 1;
          const p = ease(frame, s.at - 2, 12);
          return (
            <div
              key={s.text}
              style={{
                position: "absolute",
                left: X0,
                top: y(LIST_Y) + i * h(PITCH),
                display: "flex",
                alignItems: "center",
                gap: 18,
                opacity: p,
                transform: `translateX(${(1 - p) * -16}px)`,
              }}
            >
              <span
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  border: `2px solid ${trap ? ACCENT_INK : INK_SOFT}`,
                  background: PAPER,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  ...label(21, trap ? ACCENT_INK : INK),
                  ...TABULAR,
                }}
              >
                {i + 1}
              </span>
              <span style={{ ...note(28, INK), whiteSpace: "nowrap", fontWeight: trap ? 650 : 500 }}>
                {trap ? (
                  <Mark at={denomAt + 8} color={HIGHLIGHT}>
                    {s.text}
                  </Mark>
                ) : (
                  s.text
                )}
              </span>
            </div>
          );
        })}

        {/* ── Two weeks ── */}
        <TableName g={g} at={convAt - 8}>
          weeks
        </TableName>
        <DataTable
          g={g}
          cols={cols}
          at={convAt - 8}
          rows={[
            { cells: table.rows[0], at: convAt - 4 },
            { cells: table.rows[1], at: convAt + 4 },
            { cells: table.rows[2], at: upAt - 6, grow: true },
          ]}
          swaps={changes.map((c) => ({ row: 2, col: c.col, at: c.at, value: c.value }))}
          marks={[
            { row: 0, col: ci, at: convAt + 2, out: upAt },
            { row: 1, col: ci, at: convAt + 10, out: upAt },
            { row: 2, col: ci, at: upAt + 4 },
            { row: 2, col: oi, at: ordersAt + 4, color: MARK_BAD },
            { row: 2, col: si, at: sessionsAt + 4, color: MARK_BAD },
          ]}
        />
        {/* A rate's change in points, beside its change in percent. */}
        <Note at={upAt + 10} x={g.xs[ci] + g.widths[ci] - g.pad} align="right" y={g.rowTop(3) + 8} from="up">
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            (<Num>+{fmt(METRIC.points, 1)}</Num> points)
          </span>
        </Note>
        <Note at={becauseAt - 2} x={TABLE_X} y={g.rowTop(3) + h(44)}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            the rate rose <b>because the traffic dropped</b>
          </span>
        </Note>

        {/* ── This example's driver, and what to check next ── */}
        <Note at={lostAt - 2} x={TABLE_X} y={g.rowTop(3) + h(92)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            lost: <Num>{count(String(lost[0]))}</Num> sessions
            <span style={{ opacity: ease(frame, twelveAt - 2, 10) }}>
              , only <Num>{lost[1]}</Num> orders (<Num>{fmt(lost[2], 1)}%</Num>)
            </span>
          </span>
        </Note>
        <Note at={driverAt - 2} x={TABLE_X} y={g.rowTop(3) + h(132)}>
          <span style={{ ...note(26, OK_INK), fontWeight: 600, whiteSpace: "nowrap" }}>likeliest: low-intent traffic dropped away</span>
        </Note>
        <Note at={campaignAt - 2} x={TABLE_X} y={g.rowTop(3) + h(162)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>a paused campaign, or bots now filtered out</span>
        </Note>
        <Note at={checkAt - 2} x={TABLE_X} y={g.rowTop(3) + h(200)}>
          <span style={{ ...note(26, OK_INK), fontWeight: 600, whiteSpace: "nowrap" }}>
            check next: sessions by channel
            <span style={{ opacity: ease(frame, ordersFellAt - 2, 10) }}>; say orders fell</span>
          </span>
        </Note>

        <Note at={finishAt - 2} x={X0} y={y(LIST_Y) + 4 * h(PITCH) + h(40)}>
          <span style={{ ...note(28, OK_INK), fontWeight: 600, whiteSpace: "nowrap" }}>
            finish with the likeliest driver, and what you&apos;d check next
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
