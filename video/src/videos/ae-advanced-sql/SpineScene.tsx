import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { LOGINS, SPINE } from "./data";
import {
  colsOf,
  DataTable,
  Drift,
  geoOf,
  Listing,
  listingHeight,
  MARK,
  OK_INK,
  QMono,
  rowsAt,
  Spot,
  Stage,
  SyntaxBreak,
  type SynPart,
  X0,
} from "./parts";

const STRIP_X = 400;
const CELL = 86;
const GAP = 8;
const CAL = { left: 1580, top: 92, width: 190 };
const SIZE = 19;

/** "May 1" for the first day, the day number after it. */
const dayLabel = (iso: string, i: number) => (i === 0 ? `May ${Number(iso.slice(8))}` : String(Number(iso.slice(8))));

/**
 * Questions 9 and 10 on the page's logins, May 1 to 15. The fifteen days as
 * cells with a dot per login, five of them empty; grouped by day the logins
 * give ten rows, and a chart of them draws straight across the gaps. On the
 * spine all fifteen are there, zero on the five; COUNT(*) says one on each,
 * the spine's own row. Then generate_series, the page's breakdown and the
 * type it really returns, and where a spine's bounds should come from.
 */
export const SpineScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Question 9 ──
  const from = n.beat("spine").from;
  const qAt = n.word("spine", "Question nine");
  const textAt = n.word("spine", "What is a date spine");
  const rowAt = n.word("spine-gap", "one row per calendar day");
  const calendarAt = n.word("spine-gap", "calendar day");
  const loginsAt = n.word("spine-gap", "The page's logins");
  const noneAt = n.word("spine-gap", "five of those days have none");
  const groupedAt = n.word("spine-gap", "Grouped by day");
  const tenAt = n.word("spine-gap", "ten rows");
  const missingAt = n.word("spine-gap", "they're missing");
  const acrossAt = n.word("spine-gap", "draws straight across them");
  const joinAt = n.word("spine-join", "Left join the logins onto the spine");
  const fifteenAt = n.word("spine-join", "all fifteen days are there");
  const zeroAt = n.word("spine-join", "zero on the empty five");
  const starAt = n.word("spine-count", "Count star counts");
  const oneAt = n.word("spine-count", "every empty day says one");
  const itsZeroAt = n.word("spine-count", "it's zero");

  // ── Question 10 ──
  const q10At = n.word("series", "Question ten");
  const q10TextAt = n.word("series", "How do you generate");
  const genAt = n.word("series-how", "Generate series");
  const startAt = n.word("series-how", "from a start");
  const endAt = n.word("series-how", "to an end");
  const stepAt = n.word("series-how", "by an interval of one day");
  const tsAt = n.word("series-how", "returns timestamps with a time zone");
  const castAt = n.word("series-how", "cast each one back to a date");
  const boundsAt = n.word("series-bounds", "first and last login");
  const reportAt = n.word("series-bounds", "take them from the report's range");
  const vanishAt = n.word("series-bounds", "empty days at either end still vanish");
  const end = n.beat("series-bounds").to;
  const out9 = q10At - 4;

  // ── The fifteen days ──
  const days = SPINE.spine.rows.map((r) => r[0]);
  const empty = new Set(SPINE.emptyDays);
  const cx = (i: number) => STRIP_X + i * (CELL + GAP);
  const mid = (i: number) => cx(i) + CELL / 2;
  const stripTop = y(330);
  const stripH = h(74);
  const perDay = days.map((d) => LOGINS.filter((l) => l.day === d).length);
  const loginStep = Math.max(1, (noneAt - loginsAt) / LOGINS.length);
  let k = 0;
  const dotAt = days.map((_, i) => perDay[i] && Array.from({ length: perDay[i] }, () => loginsAt + 2 + k++ * loginStep));

  // ── The chart, aligned with the days ──
  const ch0 = y(540);
  const ch1 = y(650);
  const vmax = 3;
  const cy = (v: number) => ch1 - (v / vmax) * (ch1 - ch0);
  const grouped = SPINE.without.rows.map((r) => ({ i: days.indexOf(r[0]), v: Number(r[1]) }));
  const filled = SPINE.spine.rows.map((r, i) => ({ i, v: Number(r[1]) }));
  const seg = (a: { i: number; v: number }, b: { i: number; v: number }) => `M${mid(a.i)},${cy(a.v)} L${mid(b.i)},${cy(b.v)}`;
  const bridgeDraw = ease(frame, acrossAt, 18);
  const zeros = ease(frame, zeroAt, 14);

  // ── The two counts on the spine ──
  const rowA = y(706);
  const rowB = y(790);
  const sc = SPINE.spine.cols.indexOf("active_users");
  const cs = SPINE.countStar.cols.indexOf("active_users");

  // ── Question 10 ──
  const gen: SynPart[] = [
    { text: "generate_series(" },
    { text: "DATE '2024-01-01',", label: "start, inclusive", at: startAt, hot: { at: startAt, out: endAt } },
    { text: "DATE '2024-12-31',", label: "end, inclusive", at: endAt, hot: { at: endAt, out: stepAt } },
    { text: "INTERVAL '1 day'", label: "the step", at: stepAt, hot: { at: stepAt, out: tsAt } },
    { text: ")" },
  ];
  const TY = SPINE.pageSeries;
  const typeQ = SPINE.typeQuery;
  const qTop = y(470);
  const typeTable = typeQ;
  const tg = geoOf(typeTable, X0, qTop + listingHeight(typeQ.lines.length, SIZE) + h(22), h, { rowH: 44, bodySize: 21, headSize: 20 });
  const mini = 16;
  const MC = 62;
  const mx = (i: number) => X0 + i * (MC + 8);
  const miniTop = qTop + listingHeight(TY.lines.length, SIZE) + h(92);
  const miniH = h(52);
  const miniDays = Array.from({ length: mini }, (_, i) => i);
  const present = (i: number) => i < days.length && !empty.has(days[i]);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={calendarAt} level={-30} />
      <Sfx name="el-sprinkle" at={loginsAt + 2} level={-34} />
      <Sfx name="el-scratch" at={acrossAt + 4} level={-34} />
      <Sfx name="el-pop" at={zeroAt + 2} level={-32} />
      <Sfx name="el-tap" at={oneAt} level={-33} />
      <Sfx name="el-tap" at={itsZeroAt} level={-33} />
      <Sfx name="el-pencil" at={startAt} level={-35} />
      <Sfx name="el-pencil" at={endAt} level={-35} />
      <Sfx name="el-pencil" at={stepAt} level={-35} />
      <Sfx name="el-tap" at={tsAt + 4} level={-33} />
      <Sfx name="el-scratch" at={vanishAt} level={-34} />
      <Sfx name="el-chime" at={reportAt + 6} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={9} at={qAt - 4} textAt={textAt - 4} out={out9} size={60}>
          What is a date spine, and why generate one?
        </QuestionCard>
        <QuestionCard n={10} at={q10At} textAt={q10TextAt - 2} size={60}>
          How do you generate a series of dates in Postgres?
        </QuestionCard>
        <Spot art="calendar" at={calendarAt} left={CAL.left} top={CAL.top} width={CAL.width} out={out9} />

        <Stage from={rowAt - 6} to={out9}>
          {/* ── Fifteen days, a dot per login ── */}
          <Note at={rowAt - 4} x={X0} y={stripTop + stripH / 2 - h(16)}>
            <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>One row per day</span>
          </Note>
          {days.map((d, i) => {
            const p = ease(frame, rowAt - 4 + i * 1.5, 10);
            const bad = empty.has(d) ? ease(frame, noneAt + 2, 10) * (1 - ease(frame, zeroAt, 12)) : 0;
            const good = empty.has(d) ? ease(frame, zeroAt, 12) : 0;
            const edge = good > 0 ? `color-mix(in srgb, ${OK} ${Math.round(good * 100)}%, ${BAR})` : bad > 0 ? `color-mix(in srgb, ${ACCENT} ${Math.round(bad * 100)}%, ${BAR})` : BAR;
            return (
              <React.Fragment key={d}>
                <div
                  style={{
                    position: "absolute",
                    left: cx(i),
                    top: stripTop,
                    width: CELL,
                    height: stripH,
                    boxSizing: "border-box",
                    borderRadius: 8,
                    border: `2.5px solid ${edge}`,
                    background: bad > 0 ? `color-mix(in srgb, ${ACCENT} ${Math.round(bad * 14)}%, ${PAPER})` : PAPER,
                    opacity: p,
                    transform: `scale(${0.85 + 0.15 * p})`,
                  }}
                />
                {(dotAt[i] || []).map((at, j) => (
                  <div
                    key={j}
                    style={{
                      position: "absolute",
                      left: mid(i) - (perDay[i] * 22 - 8) / 2 + j * 22 - 7,
                      top: stripTop + stripH / 2 - 7,
                      width: 14,
                      height: 14,
                      borderRadius: 7,
                      background: BAR,
                      opacity: ease(frame, at, 6),
                      transform: `scale(${0.4 + 0.6 * ease(frame, at, 6)})`,
                    }}
                  />
                ))}
                <div style={{ position: "absolute", left: cx(i) - 10, top: stripTop + stripH + h(10), width: CELL + 20, textAlign: "center", ...label(20, INK_SOFT), ...TABULAR, opacity: p }}>
                  {dayLabel(d, i)}
                </div>
              </React.Fragment>
            );
          })}
          <Note at={noneAt + 4} x={X0} y={stripTop + stripH / 2 + h(18)} out={zeroAt}>
            <span style={{ ...note(21, ACCENT_INK), whiteSpace: "nowrap", ...TABULAR }}>{SPINE.emptyDays.length} with none</span>
          </Note>

          {/* ── Grouped by day: ten rows, a chart drawn across the gaps ── */}
          <Note at={groupedAt} x={X0} y={(ch0 + ch1) / 2 - h(30)}>
            <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>Grouped by day</span>
          </Note>
          <Note at={tenAt} x={X0} y={(ch0 + ch1) / 2 + h(4)}>
            <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap", ...TABULAR }}>
              {SPINE.without.rows.length} rows
              <span style={{ opacity: ease(frame, fifteenAt, 10) }}>, then {SPINE.spine.rows.length}</span>
            </span>
          </Note>
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            <line x1={STRIP_X - 10} x2={cx(days.length - 1) + CELL + 10} y1={ch1} y2={ch1} stroke={ds("gray", 300)} strokeWidth={1.5} opacity={ease(frame, groupedAt, 10)} />
            {grouped.slice(1).map((b, j) => {
              const a = grouped[j];
              const bridge = b.i - a.i > 1;
              const p = bridge ? bridgeDraw : ease(frame, groupedAt + 4 + j * 2, 8);
              return (
                <path
                  key={b.i}
                  d={seg(a, b)}
                  fill="none"
                  stroke={bridge ? ACCENT : BAR}
                  strokeWidth={bridge ? 3 : 3}
                  strokeDasharray={bridge ? "8 6" : undefined}
                  opacity={p * (bridge ? 1 - zeros : 1 - zeros * 0.0)}
                  style={bridge ? { clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` } : undefined}
                />
              );
            })}
            {/* Through the spine: every day, zero where there was none. */}
            {filled.slice(1).map((b, j) => {
              const a = filled[j];
              if (!empty.has(days[a.i]) && !empty.has(days[b.i])) return null;
              return <path key={`f${b.i}`} d={seg(a, b)} fill="none" stroke={BAR} strokeWidth={3} opacity={zeros} />;
            })}
            {grouped.map((g) => (
              <circle key={g.i} cx={mid(g.i)} cy={cy(g.v)} r={6.5} fill={BAR} stroke={PAPER} strokeWidth={2} opacity={ease(frame, groupedAt + 2 + g.i, 8)} />
            ))}
            {filled
              .filter((f) => empty.has(days[f.i]))
              .map((f, j) => (
                <circle key={`z${f.i}`} cx={mid(f.i)} cy={cy(f.v)} r={7} fill={OK} stroke={PAPER} strokeWidth={2} opacity={ease(frame, zeroAt + j * 3, 8)} />
              ))}
          </svg>
          <Note at={missingAt} x={STRIP_X} y={ch1 + h(10)} out={joinAt}>
            <span style={{ ...note(22, ACCENT_INK), whiteSpace: "nowrap" }}>The empty days are missing, not zero</span>
          </Note>

          {/* ── On the spine: the two counts ── */}
          <Note at={zeroAt - 6} x={X0} y={rowA - h(14)}>
            <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 500, color: INK, lineHeight: 1.25, whiteSpace: "pre", fontVariantLigatures: "none" }}>
              {"COUNT(DISTINCT\n  l.user_id)"}
            </div>
          </Note>
          {SPINE.spine.rows.map((r, i) => (
            <Value key={i} x={mid(i)} y={rowA} at={zeroAt - 4 + i} text={r[sc]} tone={empty.has(r[0]) ? "ok" : "plain"} pulseAt={empty.has(r[0]) ? itsZeroAt : undefined} />
          ))}
          <Note at={starAt - 4} x={X0} y={rowB - h(2)}>
            <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 500, color: INK, whiteSpace: "pre", fontVariantLigatures: "none" }}>COUNT(*)</span>
          </Note>
          {SPINE.countStar.rows.map((r, i) => (
            <Value key={i} x={mid(i)} y={rowB} at={starAt + i} text={r[cs]} tone={empty.has(r[0]) ? "bad" : "plain"} pulseAt={empty.has(r[0]) ? oneAt : undefined} />
          ))}
        </Stage>

        {/* ── 10. generate_series ── */}
        <SyntaxBreak parts={gen} x={X0} top={y(300)} at={genAt - 4} />
        <Stage from={tsAt - 6} to={boundsAt - 4}>
          <Listing lines={typeQ.lines} x={X0} top={qTop} size={SIZE} at={tsAt - 6} marks={[{ line: "pg_typeof(g)", text: "pg_typeof(g)", at: tsAt }]} />
          <DataTable
            g={tg}
            cols={colsOf(typeTable, { type: { ink: BLUE_INK } })}
            at={tsAt - 2}
            rows={rowsAt(typeTable.rows, tsAt + 2)}
            marks={typeTable.rows.map((_, row) => ({ row, col: 0, at: tsAt + 10 + row * 3, color: MARK }))}
          />
          <Note at={castAt} x={tg.right + 60} y={tg.rowTop(0) + h(4)}>
            <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
              <span style={{ background: MARK, padding: "2px 6px", borderRadius: 4 }}>
                <QMono>CAST(g AS DATE)</QMono>
              </span>
            </span>
          </Note>
          <Note at={castAt + 8} x={tg.right + 60} y={tg.rowTop(1) + h(8)}>
            <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
              <QMono>{SPINE.pageSeries.rows[0][0]}</QMono>, a date again
            </span>
          </Note>
        </Stage>

        {/* ── Where the bounds come from ── */}
        <Stage from={boundsAt - 4}>
          <Listing
            lines={TY.lines}
            x={X0}
            top={qTop}
            size={SIZE}
            at={boundsAt - 4}
            marks={[
              { line: "MIN(login_date)", text: "MIN(login_date)", at: boundsAt + 2 },
              { line: "MAX(login_date)", text: "MAX(login_date)", at: boundsAt + 6 },
            ]}
          />
          {miniDays.map((i) => {
            const p = ease(frame, boundsAt + 4 + i, 8);
            const last = i === mini - 1;
            const bad = last ? ease(frame, vanishAt, 10) * (1 - ease(frame, reportAt, 10)) : 0;
            return (
              <React.Fragment key={i}>
                <div
                  style={{
                    position: "absolute",
                    left: mx(i),
                    top: miniTop,
                    width: MC,
                    height: miniH,
                    boxSizing: "border-box",
                    borderRadius: 6,
                    border: `2px ${last ? "dashed" : "solid"} ${bad > 0 ? ACCENT : last ? INK_SOFT : BAR}`,
                    background: present(i) ? `color-mix(in srgb, ${BAR} 22%, ${PAPER})` : PAPER,
                    opacity: p,
                  }}
                />
                <div style={{ position: "absolute", left: mx(i) - 10, top: miniTop + miniH + h(8), width: MC + 20, textAlign: "center", ...label(19, last ? ACCENT_INK : INK_SOFT), ...TABULAR, opacity: p }}>
                  {i === 0 ? "May 1" : i + 1}
                </div>
              </React.Fragment>
            );
          })}
          <Bracket x0={mx(0)} x1={mx(days.length - 1) + MC} y={miniTop - h(14)} at={boundsAt + 10} color={BAR} up />
          <Note at={boundsAt + 14} x={mx(0)} y={miniTop - h(56)}>
            <span style={{ ...note(22, BLUE_INK), whiteSpace: "nowrap" }}>
              <QMono>MIN</QMono> to <QMono>MAX</QMono> of the logins
            </span>
          </Note>
          <Note at={vanishAt} x={mx(mini - 1) + MC + 40} y={miniTop + h(4)}>
            <span style={{ ...note(22, ACCENT_INK), whiteSpace: "nowrap" }}>An empty last day: outside the spine</span>
          </Note>
          <Bracket x0={mx(0)} x1={mx(mini - 1) + MC} y={miniTop + miniH + h(44)} at={reportAt + 4} color={OK} />
          <Note at={reportAt + 10} x={mx(0)} y={miniTop + miniH + h(56)}>
            <span style={{ ...note(22, OK_INK), whiteSpace: "nowrap" }}>The report&rsquo;s range: every day it shows</span>
          </Note>
        </Stage>
      </Drift>
    </AbsoluteFill>
  );
};

/** One count under a day, centred on it. */
const Value: React.FC<{ x: number; y: number; at: number; text: string; tone: "ok" | "bad" | "plain"; pulseAt?: number }> = ({ x, y, at, text, tone, pulseAt }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 8);
  if (p <= 0) return null;
  const color = tone === "ok" ? OK_INK : tone === "bad" ? ACCENT_INK : INK;
  const lit = pulseAt === undefined ? 0 : ease(frame, pulseAt, 10);
  return (
    <div
      style={{
        position: "absolute",
        left: x - 30,
        top: y,
        width: 60,
        textAlign: "center",
        fontFamily: MONO,
        fontSize: 24,
        fontWeight: 500,
        color,
        opacity: p,
        fontVariantLigatures: "none",
      }}
    >
      <span style={{ background: lit > 0 ? (tone === "bad" ? `color-mix(in srgb, ${ACCENT} ${Math.round(lit * 22)}%, transparent)` : `color-mix(in srgb, ${OK} ${Math.round(lit * 22)}%, transparent)`) : undefined, padding: "1px 10px", borderRadius: 4 }}>
        {text}
      </span>
    </div>
  );
};

/** A span's bracket: a rule with short ends, drawn from the left. `up` turns
 *  its ends down onto what it spans from above. */
const Bracket: React.FC<{ x0: number; x1: number; y: number; at: number; color: string; up?: boolean }> = ({ x0, x1, y, at, color, up }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  if (p <= 0) return null;
  const t = up ? 10 : -10;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <path d={`M${x0},${y + t} L${x0},${y} L${x1},${y} L${x1},${y + t}`} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" pathLength={1} strokeDasharray={`${p} 1`} />
    </svg>
  );
};
