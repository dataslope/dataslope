import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { ColumnRule, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { DISTINCT, LOGINS, RETURNING, USERS_BY_DAY } from "./data";
import { Chip, Box, Cross, Drift, Flow, OK_INK, QMono, X0 } from "./parts";

const CELL = 130;
const GAP = 24;
const ID_PITCH = 30;
const PANEL_X = 1100;

const thousands = (s: string) => Number(s).toLocaleString("en-US");

/**
 * Question 11 on the same logins. The ten days that have any, each with its
 * distinct users: the counts sum to 23, against 12 people over the range.
 * User 101's IDs light up, then the other five who came back: six people,
 * eleven extra counts (no label singles 101 out; the narration doesn't).
 * The fix as a flow: the month recounted from the logins, never summed from
 * the daily table. Then the cost at scale and
 * DuckDB's approximate count on a million distinct IDs.
 */
export const DistinctScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("distinct").from;
  const qAt = n.word("distinct", "Question eleven");
  const textAt = n.word("distinct", "When is count distinct a problem");
  const asked = n.word("distinct", "what do you do about it") + 4;
  const addAt = n.word("distinct-add", "When you add it up");
  const dayUsersAt = n.word("distinct-add", "each day's active users");
  const sumAt = n.word("distinct-add", "sum to twenty-three");
  const onlyAt = n.word("distinct-add", "Only twelve people");
  const sixAt = n.word("distinct-why", "Six of them came back");
  const againAt = n.word("distinct-why", "counts them again each time");
  const monthlyAt = n.word("distinct-fix", "a monthly count");
  const loginRowsAt = n.word("distinct-fix", "recounted from the login rows");
  const neverAt = n.word("distinct-fix", "never summed from a daily table");
  const expensiveAt = n.word("distinct-approx", "expensive at scale");
  const tracksAt = n.word("distinct-approx", "tracks every value");
  const approxAt = n.word("distinct-approx", "approximate count distinct");
  const hllAt = n.word("distinct-approx", "HyperLogLog");
  const millionAt = n.word("distinct-approx", "a million distinct IDs");
  const lowAt = n.word("distinct-approx", "about four percent low");
  const cheaperAt = n.word("distinct-approx", "cheaper, and not exact");
  const end = n.beat("distinct-approx").to;

  const cellX = (i: number) => X0 + i * (CELL + GAP);
  const stripTop = y(326);
  const maxUsers = Math.max(...USERS_BY_DAY.map((d) => d.users.length));
  const cellH = maxUsers * ID_PITCH + 22;
  const countY = stripTop + cellH + h(46);
  const firstUser = RETURNING[0];
  const others = RETURNING.slice(1);
  const sumX = cellX(USERS_BY_DAY.length - 1) + CELL + 24;

  // ── The fix, as a flow ──
  const fixTop = y(660);
  const A = { x: X0, y: fixTop, w: 230, h: h(58) };
  const B = { x: X0, y: fixTop + h(116), w: 230, h: h(58) };
  const C = { x: 560, y: fixTop + h(58), w: 250, h: h(58) };
  const aMid = A.y + A.h / 2;
  const bMid = B.y + B.h / 2;
  const cMid = C.y + C.h / 2;

  // ── The approximate count ──
  const [exact, approx] = DISTINCT.approx.rows[0];
  const lowPct = ((1 - Number(approx) / Number(exact)) * 100).toFixed(1);
  const BAR_W = 440;

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={asked} level={-34} />
      <Sfx name="el-tap" at={sumAt + 6} level={-32} />
      <Sfx name="el-pop" at={onlyAt + 2} level={-32} />
      <Sfx name="el-sprinkle" at={sixAt} level={-34} />
      <Sfx name="el-pencil" at={loginRowsAt} level={-35} />
      <Sfx name="el-scratch" at={neverAt + 4} level={-34} />
      <Sfx name="el-tap" at={hllAt} level={-33} />
      <Sfx name="el-whoosh" at={millionAt} level={-36} />
      <Sfx name="el-tap" at={lowAt} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={11} at={qAt - 4} textAt={textAt - 4} size={60}>
          When is <QMono>COUNT(DISTINCT ...)</QMono> a problem, and what do you do about it?
        </QuestionCard>

        {/* ── The ten login days, each day's distinct users ── */}
        {USERS_BY_DAY.map((d, i) => {
          const p = ease(frame, asked + i * 2, 10);
          return (
            <React.Fragment key={d.day}>
              <div
                style={{
                  position: "absolute",
                  left: cellX(i),
                  top: stripTop,
                  width: CELL,
                  height: cellH,
                  boxSizing: "border-box",
                  borderRadius: 8,
                  border: `2px solid ${BAR}`,
                  background: PAPER,
                  opacity: p,
                }}
              />
              {d.users.map((u, j) => {
                const back = u === firstUser ? ease(frame, sixAt, 10) : others.includes(u) ? ease(frame, sixAt + 14 + others.indexOf(u) * 4, 10) : 0;
                return (
                  <div
                    key={u}
                    style={{
                      position: "absolute",
                      left: cellX(i),
                      width: CELL,
                      top: stripTop + 11 + j * ID_PITCH,
                      height: ID_PITCH,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: ease(frame, asked + 4 + i * 2 + j, 8),
                    }}
                  >
                    <span
                      style={{
                        fontFamily: MONO,
                        fontSize: 21,
                        fontWeight: 500,
                        color: INK,
                        padding: "0 8px",
                        borderRadius: 4,
                        background: back > 0 ? `color-mix(in srgb, ${ds("yellow", 300)} ${Math.round(back * 60)}%, transparent)` : undefined,
                      }}
                    >
                      {u}
                    </span>
                  </div>
                );
              })}
              <div style={{ position: "absolute", left: cellX(i), top: stripTop + cellH + h(8), width: CELL, textAlign: "center", ...label(20, INK_SOFT), ...TABULAR, opacity: p }}>
                {i === 0 ? "May " : ""}
                {Number(d.day.slice(8))}
              </div>
              {/* The day's count, and the plus that sums it with the next. */}
              <div
                style={{
                  position: "absolute",
                  left: cellX(i),
                  top: countY,
                  width: CELL,
                  textAlign: "center",
                  fontFamily: MONO,
                  fontSize: 26,
                  fontWeight: 500,
                  color: BLUE_INK,
                  opacity: ease(frame, dayUsersAt + i * 2, 8),
                }}
              >
                {d.count}
              </div>
              {i > 0 ? (
                <div style={{ position: "absolute", left: cellX(i) - GAP, top: countY, width: GAP, textAlign: "center", fontFamily: MONO, fontSize: 26, color: INK_SOFT, opacity: ease(frame, addAt + i * 2, 8) }}>
                  +
                </div>
              ) : null}
            </React.Fragment>
          );
        })}
        <Note at={sumAt + 4} x={sumX} y={countY}>
          <span style={{ fontFamily: MONO, fontSize: 26, fontWeight: 500, color: ACCENT_INK, whiteSpace: "nowrap" }}>= {DISTINCT.summed}</span>
        </Note>
        <Note at={onlyAt} x={X0} y={countY + h(62)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <QMono>COUNT(DISTINCT user_id)</QMono> over May 1 to 15: <b style={{ color: OK_INK }}>{DISTINCT.whole}</b> people
          </span>
        </Note>
        <Note at={sixAt + 4} x={1080} y={countY + h(62)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap", ...TABULAR }}>
            {DISTINCT.repeatUsers} came back on other days
            <span style={{ color: ACCENT_INK, opacity: ease(frame, againAt, 10) }}>: {DISTINCT.extraCounts} extra counts</span>
          </span>
        </Note>

        {/* ── The month: recounted, never summed ── */}
        <Box x={A.x} y={A.y} w={A.w} h={A.h} at={monthlyAt}>
          <span style={{ ...label(24, "currentColor"), whiteSpace: "nowrap" }}>
            <QMono>logins</QMono>, <Num>{LOGINS.length}</Num> rows
          </span>
        </Box>
        <Box x={B.x} y={B.y} w={B.w} h={B.h} at={monthlyAt + 6}>
          <span style={{ ...label(24, "currentColor"), whiteSpace: "nowrap" }}>Daily table</span>
        </Box>
        <Box x={C.x} y={C.y} w={C.w} h={C.h} at={monthlyAt + 2}>
          <span style={{ ...label(24, "currentColor"), whiteSpace: "nowrap" }}>The month</span>
        </Box>
        <Flow
          points={[
            [A.x + A.w + 10, aMid],
            [A.x + A.w + 120, aMid],
            [A.x + A.w + 120, cMid - h(12)],
            [C.x - 12, cMid - h(12)],
          ]}
          at={loginRowsAt}
          color={OK}
          width={3}
        />
        <Flow
          points={[
            [B.x + B.w + 10, bMid],
            [B.x + B.w + 120, bMid],
            [B.x + B.w + 120, cMid + h(12)],
            [C.x - 12, cMid + h(12)],
          ]}
          at={neverAt}
          color={ACCENT}
          width={3}
          dash="8 6"
        />
        <Cross x={B.x + B.w + 70} y={bMid} at={neverAt + 10} size={24} />
        <Note at={loginRowsAt + 10} x={C.x + C.w + 30} y={cMid - h(44)}>
          <span style={{ ...note(23, OK_INK), whiteSpace: "nowrap", ...TABULAR }}>Recounted: {DISTINCT.whole}</span>
        </Note>
        <Note at={neverAt + 12} x={C.x + C.w + 30} y={cMid + h(4)}>
          <span style={{ ...note(23, ACCENT_INK), whiteSpace: "nowrap", ...TABULAR }}>Summed: {DISTINCT.summed}</span>
        </Note>

        {/* ── At scale: exact against approximate ── */}
        <ColumnRule x={PANEL_X - 50} top={fixTop} height={h(190)} at={expensiveAt} />
        <Note at={tracksAt - 2} x={PANEL_X} y={fixTop - h(6)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>Exact: the engine tracks every value</span>
        </Note>
        <Note at={approxAt} x={PANEL_X} y={fixTop + h(36)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 12 }}>
            <QMono>approx_count_distinct</QMono>
            <span style={{ opacity: ease(frame, hllAt - 2, 10) }}>
              <Chip tone="ink" size={23}>
                HyperLogLog
              </Chip>
            </span>
          </span>
        </Note>
        {[
          { name: "exact", value: exact, at: millionAt, color: BAR },
          { name: "approx", value: approx, at: lowAt - 4, color: ds("blue", 300) },
        ].map((b, i) => {
          const p = ease(frame, b.at, 18);
          const top = fixTop + h(92) + i * h(52);
          return (
            <React.Fragment key={b.name}>
              <div style={{ position: "absolute", left: PANEL_X, top, width: 90, ...note(22, INK_SOFT), opacity: Math.min(1, p * 2) }}>{b.name}</div>
              <div style={{ position: "absolute", left: PANEL_X + 100, top: top + 4, height: 26, width: BAR_W * (Number(b.value) / Number(exact)) * p, background: b.color, borderRadius: 3 }} />
              <div style={{ position: "absolute", left: PANEL_X + 100 + BAR_W + 14, top, ...note(22, INK), ...TABULAR, whiteSpace: "nowrap", opacity: ease(frame, b.at + 10, 10) }}>{thousands(b.value)}</div>
            </React.Fragment>
          );
        })}
        <Note at={cheaperAt - 2} x={PANEL_X} y={fixTop + h(206)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap", ...TABULAR }}>
            <span style={{ color: ACCENT_INK }}>{lowPct}% low</span>: cheaper, and not exact
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
