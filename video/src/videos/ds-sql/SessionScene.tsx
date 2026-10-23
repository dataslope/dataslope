import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { SESSION } from "./data";
import { colsOf, DataTable, Drift, geoOf, Listing, MARK, MARK_OK, OK, OK_INK, rowsAt, X0 } from "./parts";

/** The timeline: 08:30 to 15:00, across the page. */
const T0 = 8 * 60 + 30;
const T1 = 15 * 60;
const AX_X0 = 170;
const AX_X1 = 1760;
const AXIS_Y = 400;
const TABLE_TOP = 500;
const SQL_X = 760;

const minutes = (hhmm: string) => {
  const [hh, mm] = hhmm.split(":").map(Number);
  return hh * 60 + mm;
};
const tx = (m: number) => AX_X0 + ((m - T0) / (T1 - T0)) * (AX_X1 - AX_X0);

/**
 * Question 5, on the page's hits. User 1's six hits on a timeline, the
 * thirty-minute rule as a scale bar; LAG brings each the gap before it, the
 * gaps over thirty minutes (and the first hit) are flagged, and the running
 * sum of the flags numbers three sessions, bracketed under the dots. The
 * steps as a table beside the page's query.
 */
export const SessionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("session").from;
  const qAt = n.word("session", "Question");
  const textAt = n.word("session", "What is sessionization");
  const groupsAt = n.word("session", "It groups one user's events into visits");
  const thirtyAt = n.word("session", "passes thirty minutes");
  const hitsAt = n.word("session", "User one has six hits");
  const lagAt = n.word("session-lag", "Lag brings each row");
  const flagAt = n.word("session-lag", "Flag a one");
  const firstAt = n.word("session-lag", "no earlier hit at all");
  const sumAt = n.word("session-sum", "a running sum of the flags");
  const gapsAt = n.word("session-sum", "Gaps of ninety-five");
  const threeAt = n.word("session-sum", "make three");
  const allAt = n.word("session-sum", "Across all five users");
  const end = n.beat("pct-in").to;

  const S = SESSION.steps;
  const time = S.cols.indexOf("time");
  const gap = S.cols.indexOf("gap_min");
  const isNew = S.cols.indexOf("is_new");
  const sid = S.cols.indexOf("session_id");
  const xs = S.rows.map((r) => tx(minutes(r[time])));
  const ay = y(AXIS_Y);
  const flagged = S.rows.flatMap((r, i) => (r[isNew] === "1" ? [i] : []));
  const sessions = [...new Set(S.rows.map((r) => r[sid]))];
  const totalHits = SESSION.perUser.rows.reduce((a, r) => a + Number(r[2]), 0);
  const totalSessions = SESSION.perUser.rows.reduce((a, r) => a + Number(r[1]), 0);

  const g = geoOf(S, X0, y(TABLE_TOP), h, { rowH: 38, headH: 42, bodySize: 22, headSize: 19 });
  const axisIn = ease(frame, groupsAt, 16);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={groupsAt + 4} level={-34} />
      {S.rows.map((_, i) => (
        <Sfx key={i} name="el-tap" at={hitsAt + 6 + i * 4} level={-36} />
      ))}
      <Sfx name="el-scratch" at={flagAt + 6} level={-34} />
      <Sfx name="el-pop" at={threeAt} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is sessionization, and how do you do it in SQL?
        </QuestionCard>

        {/* ── User 1's day ── */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: axisIn }}>
          <line x1={AX_X0 - 10} x2={AX_X0 + (AX_X1 - AX_X0) * axisIn + 10} y1={ay} y2={ay} stroke={INK} strokeWidth={1.6} />
          {Array.from({ length: 7 }, (_, k) => 9 + k).map((hr) => (
            <g key={hr} opacity={ease(frame, groupsAt + 6 + (hr - 9) * 2, 10)}>
              <line x1={tx(hr * 60)} x2={tx(hr * 60)} y1={ay} y2={ay + 8} stroke={INK_SOFT} strokeWidth={1.4} />
              <text x={tx(hr * 60)} y={ay + 32} textAnchor="middle" style={{ ...label(18, INK_SOFT), ...TABULAR }}>
                {hr}:00
              </text>
            </g>
          ))}
          {/* The rule: thirty minutes, to scale. */}
          <g opacity={ease(frame, thirtyAt - 2, 12)}>
            <rect x={tx(T1 - 30)} y={ay - 100} width={tx(T0 + 30) - tx(T0)} height={10} rx={3} fill={ACCENT} />
            <text x={tx(T1 - 30)} y={ay - 110} style={{ ...label(18, ACCENT_INK) }}>
              30 min
            </text>
          </g>
          {/* Sessions, bracketed under the dots as they are numbered. */}
          {sessions.map((s, k) => {
            const members = S.rows.flatMap((r, i) => (r[sid] === s ? [i] : []));
            const a = xs[members[0]] - 14;
            const b = xs[members[members.length - 1]] + 14;
            const p = ease(frame, sumAt + 6 + k * 6, 12);
            return (
              <g key={s} opacity={p}>
                <path d={`M${a},${ay + 48} L${a},${ay + 56} L${b},${ay + 56} L${b},${ay + 48}`} fill="none" stroke={OK} strokeWidth={3} />
                <text x={(a + b) / 2} y={ay + 82} textAnchor="middle" style={{ ...label(18, OK_INK), fontWeight: 700 }}>
                  session {s}
                </text>
              </g>
            );
          })}
          {/* The gap before each hit, once LAG has brought it. */}
          {S.rows.map((r, i) => {
            if (i === 0) return null;
            const p = ease(frame, lagAt + 6 + i * 3, 10);
            const long = Number(r[gap]) > 30;
            const hot = long ? ease(frame, flagAt + 4, 12) : 0;
            const mid = (xs[i - 1] + xs[i]) / 2;
            return (
              <g key={i} opacity={p}>
                <path
                  d={`M${xs[i - 1]},${ay - 16} Q${mid},${ay - 46} ${xs[i]},${ay - 16}`}
                  fill="none"
                  stroke={hot > 0.5 ? ACCENT : INK_SOFT}
                  strokeWidth={long ? 2.6 : 1.8}
                />
                <text x={mid} y={ay - 54} textAnchor="middle" style={{ ...label(19, hot > 0.5 ? ACCENT_INK : INK_SOFT), fontWeight: long ? 700 : 500, ...TABULAR }}>
                  {long ? `${r[gap]} min` : r[gap]}
                </text>
              </g>
            );
          })}
          {S.rows.map((_, i) => {
            const p = ease(frame, hitsAt + 6 + i * 4, 10);
            const isFlag = flagged.includes(i);
            const ring = isFlag ? ease(frame, i === 0 ? firstAt + 2 : flagAt + 6, 10) : 0;
            return (
              <g key={i} opacity={p}>
                <circle cx={xs[i]} cy={ay} r={9 * p} fill={BAR} />
                {ring > 0 && <circle cx={xs[i]} cy={ay} r={16} fill="none" stroke={ACCENT} strokeWidth={2.6} opacity={ring} />}
              </g>
            );
          })}
        </svg>
        <div style={{ position: "absolute", left: AX_X0 - 10, top: ay - h(116), ...label(19, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, hitsAt, 12) }}>
          user 1, January 1
        </div>

        {/* ── The steps, and the page's query ── */}
        <DataTable
          g={g}
          cols={colsOf(S, {
            gap_min: { at: lagAt + 2, ink: BLUE_INK },
            is_new: { at: flagAt + 2, ink: BLUE_INK },
            session_id: { at: sumAt + 2, ink: BLUE_INK },
          })}
          at={hitsAt + 2}
          rows={rowsAt(S.rows, hitsAt + 6, 4)}
          marks={[
            ...flagged.map((row, k) => ({ row, col: isNew, at: (row === 0 ? firstAt : flagAt + 8) + k * 2, color: MARK })),
            ...S.rows.map((_, row) => ({ row, col: sid, at: sumAt + 8 + row * 3, color: MARK_OK })),
          ]}
        />
        <Listing
          lines={SESSION.page.lines}
          x={SQL_X}
          top={y(TABLE_TOP)}
          width={1060}
          size={14}
          at={lagAt - 4}
          marks={[
            { line: 3, at: lagAt + 6 },
            { line: 4, at: firstAt },
            { line: 11, at: sumAt + 4, color: MARK_OK },
          ]}
        />
        <Note at={gapsAt} x={X0} y={g.rowTop(S.rows.length) + h(14)} out={allAt}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>gaps over 30 minutes open a session</span>
        </Note>
        <Note at={allAt} x={X0} y={g.rowTop(S.rows.length) + h(14)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap", ...TABULAR }}>
            all 5 users: <b>{totalHits}</b> hits, <b>{totalSessions}</b> sessions
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
