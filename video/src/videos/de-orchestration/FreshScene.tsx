import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, HAIRLINE, INK, INK_SOFT, PAPER, label, note, svgText } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { FRESH, hm } from "./data";
import { Cross, Drift, lineOf, MARK, OK, OK_INK, Pill, SqlListing, X0 } from "./parts";

const LINES = FRESH.sql.split("\n");
/** The clock from June 1, 00:00 to June 4, 08:00. */
const H0 = 160;
const PX_H = 20;
const hx = (hours: number) => H0 + hours * PX_H;
/** Hours from June 1, 00:00, for a "2025-06-0D HH:MM" time. */
const hoursOf = (t: string) => (Number(t.slice(8, 10)) - 1) * 24 + Number(t.slice(11, 13)) + Number(t.slice(14, 16)) / 60;

/**
 * Question 10. Freshness, and the check the page describes: the newest
 * updated_at against now, with an alert past a threshold (here 12 hours, the
 * video's own). Run in DuckDB on the video's own daily_orders (check.mjs): at
 * 06:00 on June 3 the newest order is 23:58 the night before, 6 h 2 min old;
 * June 3's source sent nothing, so at 06:00 on June 4 it is 30 h 2 min old,
 * though every task succeeded. Then why quality checks cannot catch it.
 */
export const FreshScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("fresh").from;
  const qAt = n.word("fresh", "Question ten");
  const textAt = n.word("fresh", "What is data freshness");
  const howAt = n.word("fresh", "how recently a dataset was successfully updated");
  const expectAt = n.word("fresh", "against what you expect");
  const checkAt = n.word("fresh", "Check the newest timestamp against now");
  const alertAt = n.word("fresh", "alert when the gap passes a threshold");
  const twelveAt = n.word("fresh", "here, twelve hours");
  const sixAt = n.word("fresh-run", "At six on June third");
  const newestAt = n.word("fresh-run", "the newest order is from two minutes to midnight");
  const sixHAt = n.word("fresh-run", "six hours old");
  const nightAt = n.word("fresh-run", "That night the source sent nothing");
  const loadAt = n.word("fresh-run", "The load still succeeded");
  const noRowsAt = n.word("fresh-run", "with no new rows");
  const fourthAt = n.word("fresh-run", "so at six on the fourth");
  const thirtyAt = n.word("fresh-run", "thirty hours old");
  const greenAt = n.word("fresh-run", "Every task is green");
  const onlyAt = n.word("fresh-run", "Only the freshness check fails");
  const catchAt = n.word("fresh-why", "It catches missing data");
  const cantAt = n.word("fresh-why", "which quality checks can't");
  const thereAt = n.word("fresh-why", "the rows that are there");
  const end = n.beat("fresh-why").to;

  // ── The two mornings on one clock ─────────────────────────────────────────
  const bandY = y(600);
  const bandH = h(34);
  const newest = hoursOf(FRESH.fine.newest);
  const now1 = hoursOf(FRESH.fine.now);
  const now2 = hoursOf(FRESH.stale.now);
  const clockIn = ease(frame, sixAt - 4, 12);
  const ordersIn = ease(frame, sixAt, 24);
  const b1Y = bandY + bandH / 2 + h(30);
  const b2Y = bandY + bandH / 2 + h(76);

  // ── The query's two answers ───────────────────────────────────────────────
  const RES_X = 940;
  const COLS = [
    { key: "now", label: "now", w: 150 },
    { key: "newest", label: "newest", w: 250 },
    { key: "age", label: "age", w: 230 },
  ];
  const results = [
    { r: FRESH.fine, at: sixHAt, ok: true },
    { r: FRESH.stale, at: thirtyAt, ok: false },
  ];
  const resTop = y(292);
  const RH = h(44);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={checkAt} level={-36} />
      <Sfx name="el-sprinkle" at={sixAt} level={-36} />
      <Sfx name="el-tap" at={sixHAt} level={-35} />
      <Sfx name="el-whoosh" at={nightAt + 4} level={-37} />
      <Sfx name="el-tap" at={thirtyAt} level={-34} />
      <Sfx name="el-scratch" at={onlyAt + 6} level={-34} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={10} at={qAt - 4} textAt={textAt - 4} size={56}>
          What is data freshness, and how do you monitor it?
        </QuestionCard>

        <Note at={howAt} x={X0} y={y(268)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            how recently it was updated<span style={{ color: INK_SOFT, opacity: ease(frame, expectAt, 10) }}>, against what you expect</span>
          </span>
        </Note>

        {/* The check, as the page describes it. */}
        <SqlListing
          lines={LINES}
          x={X0}
          top={y(318)}
          width={720}
          size={22}
          at={checkAt}
          marks={[{ line: lineOf(LINES, "now()"), at: checkAt + 10, color: MARK }]}
        />
        <Note at={alertAt} x={X0} y={y(318) + h(148)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            alert when age is over <b style={{ opacity: ease(frame, twelveAt, 10) }}><Num>{FRESH.thresholdHours}</Num> hours</b>
          </span>
        </Note>

        {/* Its answers, one each morning at six. */}
        <div style={{ position: "absolute", left: RES_X, top: resTop, display: "flex", opacity: ease(frame, sixHAt - 6, 10) }}>
          {COLS.map((c) => (
            <div key={c.key} style={{ width: c.w, ...label(20, INK_SOFT), fontWeight: 700, fontFamily: c.key === "now" ? undefined : MONO }}>
              {c.label}
            </div>
          ))}
        </div>
        <div style={{ position: "absolute", left: RES_X, top: resTop + RH - 8, width: 680, height: 1, background: HAIRLINE, opacity: ease(frame, sixHAt - 6, 10) }} />
        {results.map((row, i) => {
          const p = ease(frame, row.at - 2, 10);
          return (
            <div key={i} style={{ position: "absolute", left: RES_X, top: resTop + (i + 1) * RH, display: "flex", alignItems: "center", opacity: p }}>
              <div style={{ width: COLS[0].w, ...note(22, INK), fontWeight: 600 }}>06:00 Jun {Number(row.r.now.slice(8, 10))}</div>
              <div style={{ width: COLS[1].w, fontFamily: MONO, fontSize: 21, color: INK, fontVariantLigatures: "none" }}>{row.r.newest}</div>
              <div style={{ width: COLS[2].w, fontFamily: MONO, fontSize: 21, fontWeight: 700, color: row.ok ? OK_INK : ACCENT_INK, fontVariantLigatures: "none" }}>{row.r.age}</div>
              <div style={{ width: 40 }}>{frame >= row.at + 6 ? row.ok ? <Tick at={row.at + 6} size={24} /> : <Cross at={row.at + 6} size={24} /> : null}</div>
            </div>
          );
        })}

        {/* The orders, by the clock. */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: clockIn }}>
          {[0, 24, 48, 72].map((hr) => (
            <g key={hr}>
              <line x1={hx(hr)} x2={hx(hr)} y1={bandY - bandH / 2 - h(26)} y2={bandY + bandH / 2 + 6} stroke={INK_SOFT} strokeWidth={1.2} opacity={0.6} />
              <text x={hx(hr) + 8} y={bandY - bandH / 2 - h(12)} style={svgText({ ...label(20, INK), fontWeight: 650 })}>
                {`June ${hr / 24 + 1}`}
              </text>
            </g>
          ))}
          {/* An order every three minutes, June 1 and 2. */}
          <rect x={hx(0)} y={bandY - bandH / 2} width={(hx(newest) - hx(0)) * ordersIn} height={bandH} rx={3} fill={BAR} opacity={0.8} />
          {/* June 3: nothing. */}
          <rect
            x={hx(48) + 2}
            y={bandY - bandH / 2}
            width={hx(72) - hx(48) - 4}
            height={bandH}
            rx={3}
            fill="none"
            stroke={ACCENT}
            strokeWidth={2}
            strokeDasharray="7 6"
            opacity={ease(frame, nightAt, 12)}
          />
          {/* The newest order. */}
          <circle cx={hx(newest)} cy={bandY} r={9 * ease(frame, newestAt + 4, 8)} fill={PAPER} stroke={INK} strokeWidth={2.6} />
          {/* Six o'clock, each morning. */}
          {[
            { t: now1, at: sixAt, to: b1Y },
            { t: now2, at: fourthAt, to: b2Y },
          ].map((m) => (
            <g key={m.t} opacity={ease(frame, m.at, 10)}>
              <line x1={hx(m.t)} x2={hx(m.t)} y1={bandY - bandH / 2 - h(10)} y2={m.to + h(12)} stroke={INK} strokeWidth={2.2} />
              <text x={hx(m.t)} y={bandY - bandH / 2 - h(16)} textAnchor="middle" style={svgText({ ...label(19, INK), fontWeight: 700 })}>
                06:00
              </text>
            </g>
          ))}
          {/* The age each morning: newest order to now. */}
          {[
            { t: now1, at: sixHAt, yy: b1Y, color: OK },
            { t: now2, at: thirtyAt, yy: b2Y, color: ACCENT },
          ].map((b) => {
            const p = ease(frame, b.at - 2, 14);
            return (
              <path
                key={b.t}
                d={`M${hx(newest)},${b.yy - 8} l0,8 L${hx(newest) + (hx(b.t) - hx(newest)) * p},${b.yy} l0,-8`}
                fill="none"
                stroke={b.color}
                strokeWidth={3}
                opacity={p > 0 ? 1 : 0}
              />
            );
          })}
        </svg>
        <Note at={sixAt + 10} x={hx(0)} y={bandY + bandH / 2 + h(6)}>
          <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>an order every 3 minutes</span>
        </Note>
        <Note at={newestAt + 6} x={hx(newest) - 12} y={bandY - bandH / 2 - h(58)} align="right">
          <span style={{ ...label(20, INK), whiteSpace: "nowrap" }}>newest: 23:58</span>
        </Note>
        <Note at={nightAt + 6} x={hx(58)} y={bandY - 14}>
          <span style={{ ...label(20, ACCENT_INK), whiteSpace: "nowrap" }}>the source sent nothing</span>
        </Note>
        <Note at={sixHAt + 6} x={hx(now1) + 12} y={b1Y - 16}>
          <span style={{ ...note(23, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>{hm(FRESH.fine.minutes)}: fresh</span>
        </Note>
        <Note at={thirtyAt + 6} x={hx(now2) - 12} y={b2Y + h(4)} align="right">
          <span style={{ ...note(23, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>{hm(FRESH.stale.minutes)}: stale, alert</span>
        </Note>

        {/* The run that night, all green, and the one check that is not. */}
        {[
          { text: "extract", at: greenAt },
          { text: "transform", at: greenAt + 3 },
          { text: "load", at: loadAt },
        ].map((t, i) => (
          <Pill key={t.text} x={X0 + i * 230} y={y(770)} at={t.at} ink={OK_INK} size={24}>
            {t.text} ✓
          </Pill>
        ))}
        <Note at={noRowsAt} x={X0 + 460} y={y(826)}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>0 new rows</span>
        </Note>
        <Pill x={X0 + 720} y={y(770)} at={onlyAt + 2} ink={ACCENT_INK} size={24}>
          freshness check ✗
        </Pill>
        <Note at={catchAt} x={X0 + 1010} y={y(762)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>catches missing data</span>
        </Note>
        <Note at={cantAt} x={X0 + 1010} y={y(802)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            quality checks only read the rows <span style={{ opacity: ease(frame, thereAt, 10) }}>that are there</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
