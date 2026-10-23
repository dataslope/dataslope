import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { LATEST } from "./data";
import {
  colsOf,
  DataTable,
  Drift,
  geoOf,
  Listing,
  listingHeight,
  MARK,
  MARK_OK,
  OK,
  OK_INK,
  rowsAt,
  Svg,
  X0,
} from "./parts";

const TOP = 330;
const RESULT_X = 900;
const CHART = { x0: 520, x1: 860, base: 700, top: 560 };
const SPINE_SIZE = 17;
const SPINE_RESULT_X = 1490;

/**
 * Questions 11 and 12. The video's own plan changes, numbered newest first
 * per user: rows after the first are struck, and user 1 keeps only "team".
 * Then the page's March sales, which skip the 2nd and the 5th: on their own
 * those days are missing and a line chart draws straight over them; joined
 * onto a generated spine of days they come back as zeros.
 */
export const LatestScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("latest").from;
  const qAt = n.word("latest", "Question");
  const textAt = n.word("latest", "How do you keep only");
  const numberAt = n.word("latest", "Number each user's rows");
  // The question and its answer share a beat: the figure comes as the answer starts.
  const asked = numberAt - 4;
  const keepAt = n.word("latest", "keep row one");
  const threeAt = n.word("latest", "User one has three rows");
  const teamAt = n.word("latest", "team, survives");
  const q12At = n.word("spine", "Question twelve");
  const q12TextAt = n.word("spine", "How do you fill gaps");
  const skipAt = n.word("spine", "skip the second and the fifth");
  const missingAt = n.word("spine", "simply missing");
  const chartAt = n.word("spine", "a chart draws straight over them");
  const generateAt = n.word("spine-fix", "Generate every day");
  const joinAt = n.word("spine-fix", "left join the sales onto it");
  const zerosAt = n.word("spine-fix", "into zeros with coalesce");
  const end = n.beat("spine-fix").to;

  // ── Question 11 ──
  const R = LATEST.ranked;
  const rg = geoOf(R, RESULT_X, y(TOP), h, { rowH: 52 });
  const rn = R.cols.indexOf("rn");
  const user = R.cols.indexOf("user_id");
  const firsts = R.rows.flatMap((r, i) => (r[rn] === "1" ? [i] : []));
  const userOne = R.rows.flatMap((r, i) => (r[user] === "1" ? [i] : []));
  const out11 = q12At - 4;

  // ── Question 12 ──
  const W = LATEST.without;
  const S = LATEST.spine;
  const wg = geoOf(W, X0, y(TOP) + listingHeight(W.lines.length, 21) + h(20), h, { rowH: 46 });
  const sg = geoOf(S, SPINE_RESULT_X, y(TOP), h, { rowH: 46, bodySize: 22 });
  const zeros = S.rows.flatMap((r, i) => (r[1] === "0" ? [i] : []));
  const dayIndex = (d: string) => S.rows.findIndex((r) => r[0] === d);
  const cx = (i: number) => CHART.x0 + (i * (CHART.x1 - CHART.x0)) / (S.rows.length - 1);
  const top = Math.max(...S.rows.map((r) => Number(r[1])));
  const cy = (v: number) => y(CHART.base) - (v / top) * (y(CHART.base) - y(CHART.top));
  const pts = (rows: readonly (readonly string[])[]) => rows.map((r) => [cx(dayIndex(r[0])), cy(Number(r[1]))] as const);
  const path = (p: readonly (readonly [number, number])[]) => p.map(([x, v], i) => `${i ? "L" : "M"}${x},${v}`).join(" ");
  const redP = ease(frame, chartAt, 20);
  const greenP = ease(frame, zerosAt, 20);
  const redFade = ease(frame, zerosAt + 10, 14) * 0.65;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={numberAt + 4} level={-34} />
      <Sfx name="el-scratch" at={keepAt + 4} level={-32} />
      <Sfx name="el-pop" at={teamAt} level={-32} />
      <Sfx name="el-scratch" at={chartAt + 6} level={-32} />
      <Sfx name="el-pop" at={zerosAt + 4} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={11} at={qAt - 4} textAt={textAt - 4} out={out11} size={60}>
          How do you keep only the latest row for each user?
        </QuestionCard>
        <QuestionCard n={12} at={q12At} textAt={q12TextAt - 2} size={60}>
          How do you fill gaps in a date series?
        </QuestionCard>

        {/* ── Question 11: number from the newest, keep row one ── */}
        <Listing lines={R.lines} x={X0} top={y(TOP)} width={720} size={21} at={asked - 6} out={out11} marks={[{ line: 2, at: numberAt + 4 }]} />
        <DataTable
          g={rg}
          cols={colsOf(R, { rn: { ink: BLUE_INK } })}
          at={asked - 4}
          out={out11}
          rows={R.rows.map((cells, i) => ({
            cells,
            at: asked + i * 2,
            strikeAt: cells[rn] === "1" ? undefined : keepAt + 4 + i * 2,
            strikeColor: INK_SOFT,
          }))}
          bands={[
            ...userOne.map((row) => ({ row, at: threeAt, out: teamAt, color: MARK })),
            ...firsts.map((row, k) => ({ row, at: (row === 0 ? teamAt : keepAt + 6) + k * 3, color: MARK_OK })),
          ]}
          marks={R.rows.map((_, row) => ({ row, col: rn, at: numberAt + 6 + row * 2, out: keepAt + 4 }))}
        />
        <Note at={keepAt} x={X0} y={y(TOP) + listingHeight(R.lines.length, 21) + h(30)} out={out11}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            then keep <span style={{ fontFamily: MONO, fontSize: 24, fontWeight: 600, color: OK_INK }}>WHERE rn = 1</span>
          </span>
        </Note>
        <Note at={teamAt + 4} x={rg.right + 24} y={rg.rowTop(0) + 8} out={out11}>
          <span style={{ ...note(24, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>the newest</span>
        </Note>

        {/* ── Question 12: the days that aren't there ── */}
        <Listing lines={W.lines} x={X0} top={y(TOP)} width={520} size={21} at={q12At + 6} />
        <DataTable g={wg} cols={colsOf(W)} at={q12At + 10} rows={rowsAt(W.rows, q12At + 14, 3)} />
        <Note at={skipAt + 2} x={X0} y={wg.rowTop(W.rows.length) + h(18)}>
          <span style={{ ...note(24, ACCENT_INK), whiteSpace: "nowrap" }}>no row for the 2nd or the 5th</span>
        </Note>

        {/* A small line chart: drawn over the gaps, then through the zeros. */}
        <Svg opacity={ease(frame, missingAt, 12)}>
          <line x1={CHART.x0 - 14} x2={CHART.x1 + 14} y1={y(CHART.base)} y2={y(CHART.base)} stroke={INK} strokeWidth={1.4} />
          {S.rows.map((r, i) => (
            <text
              key={r[0]}
              x={cx(i)}
              y={y(CHART.base) + 24}
              textAnchor="middle"
              style={{ ...label(17, zeros.includes(i) ? ACCENT_INK : INK_SOFT), fontVariantNumeric: "tabular-nums" }}
            >
              Mar {Number(r[0].slice(8))}
            </text>
          ))}
          <path d={path(pts(W.rows))} fill="none" stroke={ACCENT} strokeWidth={3} pathLength={1} strokeDasharray={`${redP} 1`} opacity={1 - redFade} />
          {pts(W.rows).map(([x, v], i) => (
            <circle key={i} cx={x} cy={v} r={6 * redP} fill={ACCENT} opacity={1 - redFade} />
          ))}
          <path d={path(pts(S.rows))} fill="none" stroke={OK} strokeWidth={3.4} pathLength={1} strokeDasharray={`${greenP} 1`} />
          {pts(S.rows).map(([x, v], i) => (
            <circle key={i} cx={x} cy={v} r={6 * greenP} fill={OK} />
          ))}
        </Svg>

        {/* The spine: every day, generated, with the sales left-joined on. */}
        <Listing
          lines={S.lines}
          x={RESULT_X}
          top={y(TOP)}
          width={570}
          size={SPINE_SIZE}
          at={generateAt - 4}
          marks={[
            { line: 1, at: generateAt + 4 },
            { line: 6, at: joinAt },
            { line: 4, at: zerosAt - 2, color: MARK_OK },
          ]}
        />
        <DataTable
          g={sg}
          cols={colsOf(S)}
          at={joinAt - 4}
          rows={rowsAt(S.rows, joinAt)}
          bands={zeros.map((row, k) => ({ row, at: zerosAt + k * 4, color: MARK_OK }))}
        />
        <Note at={zerosAt + 8} x={SPINE_RESULT_X} y={sg.rowTop(S.rows.length) + h(16)}>
          <span style={{ ...note(24, OK_INK), whiteSpace: "nowrap", ...TABULAR }}>back, as 0</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
