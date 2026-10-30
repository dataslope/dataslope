import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK, QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Ink, Note, Num } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { WHERE } from "./data";
import { Drift, ElbowArrow, ErrorBox, lineOf, Listing, listingHeight, Mark, MARK_BAD, MARK_OK, Mono, X0 } from "./parts";

const SIZE = 24;
const LIST_Y = 300;
const LIST_W = 640;
const STEP_X = 880;
const STEP_Y = 300;
const STEP_PITCH = 62;
const FUNNEL_X = 1170;
const SQ = 15;
const SQ_GAP = 4;

/** The clauses in the order a query runs them, and the word that names each. */
const STEPS = [
  { clause: "FROM, JOIN", word: "From" },
  { clause: "WHERE", word: "WHERE" },
  { clause: "GROUP BY", word: "GROUP BY" },
  { clause: "HAVING", word: "HAVING" },
  { clause: "SELECT", word: "SELECT" },
  { clause: "DISTINCT", word: "DISTINCT" },
  { clause: "ORDER BY", word: "ORDER BY" },
  { clause: "LIMIT", word: "LIMIT" },
] as const;

/** Which step each line of the written query is, by its first keyword. */
const stepOf = (line: string) => STEPS.findIndex((s) => line.startsWith(s.clause.split(",")[0]));

/**
 * Questions 4 and 5: da-sql's OrderScene, copied and re-cued, on da-sql's
 * results (the Data Analyst page's 24 orders). The query as it is written,
 * each line badged with where it runs, and the run order as a list of steps,
 * with window functions computed at SELECT and QUALIFY right after them. WHERE
 * comes before both, so it can't see a row number or a SELECT alias; ORDER BY
 * can. Then question 5 on the same steps: the 24 orders going through WHERE
 * (11 over 100), GROUP BY (4 regions) and HAVING (2 over 400); a SUM put in
 * WHERE, and DuckDB's refusal (da-sql's WhereScene); and why row filters
 * still belong in WHERE.
 */
export const OrderScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("order").from;
  const qAt = n.word("order", "Question");
  const textAt = n.word("order", "What is the logical order");
  const notAt = n.word("order-list", "Not the order");
  const stepAt = STEPS.map((s) => n.word("order-list", s.word));
  const windowsAt = n.word("order-list", "window functions are computed");
  const qualifyAt = n.word("order-list", "qualify right after");
  const cantAt = n.word("order-why", "WHERE can't see");
  const madeAt = n.word("order-why", "made up in SELECT");
  const laterAt = n.word("order-why", "ORDER BY runs later");
  const q5At = n.word("where", "Question five");
  const q5TextAt = n.word("where", "What is the difference");
  const watchAt = n.word("where", "Watch");
  const elevenAt = n.word("where", "keeps the eleven");
  const fourAt = n.word("where", "four regions");
  const twoAt = n.word("where", "keeps the two");
  const tryAt = n.word("where-try", "Put a sum in WHERE");
  const refusesAt = n.word("where-try", "DuckDB refuses");
  const yetAt = n.word("where-try", "doesn't exist yet");
  const earlyAt = n.word("where-early", "filter rows in WHERE");
  const fewerAt = n.word("where-early", "fewer rows to group");
  const keepAt = n.word("where-early", "Keep HAVING");
  const bridgeAt = n.beat("frame-in").from;
  const clearAt = n.beat("frame").from - 8 - 30;
  const end = n.beat("frame-in").to;

  const lines = WHERE.both.lines;
  const g = { lineH: Math.round(SIZE * 1.8), padY: Math.round(SIZE * 0.66) };
  const rowY = (i: number) => y(STEP_Y + i * STEP_PITCH);
  // Question 4's arrows give their room to question 5's funnel.
  const aliasOut = q5At - 4;

  // The page's orders, in the page's order; WHERE keeps the ones over 100.
  const amounts = WHERE.orders.rows.map((r) => Number(r[1]));
  const big = amounts.map((a) => a > 100);
  if (big.filter(Boolean).length !== WHERE.bigRows) throw new Error("the funnel's WHERE disagrees with check.mjs");
  // Region groups after WHERE, and the two HAVING keeps.
  const groups = WHERE.bigGroups.rows.map((r) => ({ region: r[0], orders: Number(r[1]), revenue: r[2] }));
  const keptGroups = new Set(WHERE.both.rows.map((r) => r[0]));
  const selectLine = lineOf(lines, "SELECT");
  const whereLine = lineOf(lines, "WHERE");
  const havingLine = lineOf(lines, "HAVING");
  const arrowX = STEP_X + 220;

  // Question 5's refusal: the sum in WHERE, in the written query's place.
  const A = WHERE.aggregate;
  const aggH = listingHeight(A.lines.length, SIZE);
  const notesY = y(LIST_Y) + aggH + h(150);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={stepAt[0]} level={-32} />
      <Sfx name="el-tap" at={stepAt[4]} level={-32} />
      <Sfx name="el-pencil" at={cantAt + 2} level={-34} />
      <Sfx name="el-pop" at={elevenAt} level={-32} />
      <Sfx name="el-pop" at={fourAt} level={-32} />
      <Sfx name="el-pop" at={twoAt + 2} level={-32} />
      <Sfx name="el-scratch" at={refusesAt + 2} level={-32} />

      <Drift from={from} to={end + 40}>
        <AbsoluteFill style={{ opacity: 1 - ease(frame, clearAt, 36) }}>
          <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} out={q5At - 4} size={60}>
            What is the logical order of SQL clause execution?
          </QuestionCard>
          <QuestionCard n={5} at={q5At} textAt={q5TextAt - 2} size={60}>
            What is the difference between <QMono>WHERE</QMono> and <QMono>HAVING</QMono>?
          </QuestionCard>

          {/* ── The query as it is written, each line badged with its step ── */}
          <Listing
            lines={lines}
            x={X0}
            top={y(LIST_Y)}
            width={LIST_W}
            size={SIZE}
            at={notAt - 4}
            out={tryAt - 2}
            marks={[
              { line: selectLine, at: madeAt, out: q5At },
              { line: lineOf(lines, "ORDER BY"), at: laterAt, color: MARK_OK, out: q5At },
              { line: whereLine, at: elevenAt - 2 },
              { line: havingLine, at: twoAt - 2, color: MARK_OK },
            ]}
          />
          {lines.map((line, i) => {
            const s = stepOf(line);
            if (s < 0) return null;
            return (
              <Ink
                key={i}
                at={stepAt[s] + 2}
                dur={10}
                out={tryAt - 2}
                style={{ left: X0 + LIST_W - 52, top: y(LIST_Y) + g.padY + i * g.lineH + g.lineH / 2 - 15 }}
              >
                <StepBadge n={s + 1} />
              </Ink>
            );
          })}
          <Caption at={notAt - 4} out={tryAt - 2} x={X0} top={y(LIST_Y) - 40}>
            As you write it
          </Caption>
          <Caption at={stepAt[0] - 4} x={STEP_X} top={y(LIST_Y) - 40}>
            As it runs, logically
          </Caption>

          {/* ── The run order ── */}
          {STEPS.map((s, i) => (
            <Ink
              key={s.clause}
              at={stepAt[i] - 4}
              dur={12}
              style={{ left: STEP_X, top: rowY(i), height: h(44), display: "flex", alignItems: "center", gap: 16 }}
            >
              <StepBadge n={i + 1} />
              <span style={{ fontFamily: MONO, fontSize: 26, fontWeight: 600, color: INK, whiteSpace: "nowrap", fontVariantLigatures: "none" }}>
                {s.clause}
              </span>
            </Ink>
          ))}
          {/* Window functions are computed at SELECT, QUALIFY right after. */}
          <Note at={windowsAt} x={arrowX + 90} y={rowY(4) + h(6)} out={madeAt - 4}>
            <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
              window functions here,{" "}
              <span style={{ opacity: ease(frame, qualifyAt - 2, 10) }}>
                then <QMono>QUALIFY</QMono>
              </span>
            </span>
          </Note>

          {/* ── Made in SELECT: too late for WHERE, ready for ORDER BY ── */}
          <ElbowArrow
            points={[
              [arrowX, rowY(4) + h(22)],
              [arrowX + 70, rowY(4) + h(22)],
              [arrowX + 70, rowY(1) + h(22)],
              [arrowX - 70, rowY(1) + h(22)],
            ]}
            at={cantAt}
            out={aliasOut}
            color={ACCENT}
          />
          <Note at={madeAt + 12} x={arrowX + 90} y={rowY(2) + h(14)} out={aliasOut}>
            <span style={{ ...note(24, ACCENT_INK), whiteSpace: "nowrap", fontWeight: 650 }}>
              <Mono>WHERE</Mono> can&apos;t see them
            </span>
          </Note>
          <Note at={madeAt + 2} x={arrowX + 90} y={rowY(4) + h(6)} out={aliasOut}>
            <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>row numbers and aliases are made here</span>
          </Note>
          <ElbowArrow
            points={[
              [arrowX, rowY(4) + h(30)],
              [arrowX + 40, rowY(4) + h(30)],
              [arrowX + 40, rowY(6) + h(22)],
              [arrowX - 26, rowY(6) + h(22)],
            ]}
            at={laterAt}
            out={aliasOut}
            color={OK}
          />
          <Note at={laterAt + 10} x={arrowX + 60} y={rowY(5) + h(18)} out={aliasOut}>
            <span style={{ ...note(24, INK), whiteSpace: "nowrap", fontWeight: 650 }}>
              <Mono>ORDER BY</Mono> can
            </span>
          </Note>

          {/* ── Question 5: the page's orders, going through ── */}
          {amounts.map((_, i) => {
            const p = ease(frame, watchAt + i, 8);
            const cut = big[i] ? 0 : ease(frame, elevenAt, 12) * 0.7;
            return p > 0 ? (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: FUNNEL_X + i * (SQ + SQ_GAP),
                  top: rowY(0) + h(8),
                  width: SQ,
                  height: h(28),
                  borderRadius: 2,
                  background: big[i] ? BAR : INK_SOFT,
                  opacity: p * (1 - cut),
                }}
              />
            ) : null;
          })}
          <Count at={watchAt + 10} x={FUNNEL_X + amounts.length * (SQ + SQ_GAP) + 14} top={rowY(0) + h(4)}>
            <Num>{WHERE.rows}</Num> rows
          </Count>

          {big.flatMap((b, i) => (b ? [i] : [])).map((i, k) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: FUNNEL_X + k * (SQ + SQ_GAP),
                top: rowY(1) + h(8),
                width: SQ,
                height: h(28),
                borderRadius: 2,
                background: BAR,
                opacity: ease(frame, elevenAt + 2 + k, 8),
              }}
            />
          ))}
          <Count at={elevenAt + 8} x={FUNNEL_X + WHERE.bigRows * (SQ + SQ_GAP) + 14} top={rowY(1) + h(4)}>
            <Num>{WHERE.bigRows}</Num> rows over <Num>100</Num>
          </Count>

          {groups.map((grp, k) => (
            <Group key={grp.region} region={grp.region} at={fourAt + k * 3} x={FUNNEL_X + k * 112} top={rowY(2) + h(4)} />
          ))}
          <Count at={fourAt + 14} x={FUNNEL_X + groups.length * 112 + 4} top={rowY(2) + h(4)}>
            <Num>{groups.length}</Num> groups
          </Count>

          {groups
            .filter((grp) => keptGroups.has(grp.region))
            .map((grp, k) => (
              <Group key={grp.region} region={grp.region} at={twoAt + 4 + k * 3} x={FUNNEL_X + k * 112} top={rowY(3) + h(4)} kept />
            ))}
          <Count at={twoAt + 14} x={FUNNEL_X + keptGroups.size * 112 + 4} top={rowY(3) + h(4)}>
            <Num>{keptGroups.size}</Num> over <Num>400</Num>
          </Count>

          {/* ── The sum in WHERE, and DuckDB's refusal ── */}
          <Listing
            lines={A.lines}
            x={X0}
            top={y(LIST_Y)}
            width={LIST_W}
            size={SIZE}
            at={tryAt - 2}
            marks={[{ line: lineOf(A.lines, "WHERE"), at: tryAt + 8, color: MARK_BAD }]}
          />
          <ErrorBox x={X0} top={y(LIST_Y) + aggH + 18} width={LIST_W} at={refusesAt} kind={A.kind} message={A.message} size={21} markAt={yetAt} />

          {/* ── Row filters still go in WHERE ── */}
          <Note at={earlyAt - 2} x={X0} y={notesY}>
            <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
              Filter rows in <Mono>WHERE</Mono>: <Mark at={fewerAt}>fewer rows to group</Mark>.
            </span>
          </Note>
          <Note at={keepAt - 2} x={X0} y={notesY + h(50)}>
            <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
              <Mark at={bridgeAt} color={MARK_OK}>
                <Mono>HAVING</Mono> is for conditions on an aggregate.
              </Mark>
            </span>
          </Note>
        </AbsoluteFill>
      </Drift>
    </AbsoluteFill>
  );
};

/** A step's number in a ring. */
const StepBadge: React.FC<{ n: number }> = ({ n }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 32,
      height: 32,
      borderRadius: 999,
      border: `2px solid ${INK}`,
      background: PAPER,
      ...label(19, INK),
      ...TABULAR,
      fontWeight: 700,
    }}
  >
    {n}
  </span>
);

/** A figure's small title, over its top. */
const Caption: React.FC<{ at: number; out?: number; x: number; top: number; children: React.ReactNode }> = ({ at, out, x, top, children }) => (
  <Ink at={at} out={out} dur={12} style={{ left: x, top, whiteSpace: "nowrap" }}>
    <span style={label(21, INK_SOFT)}>{children}</span>
  </Ink>
);

/** A count beside a row of the funnel, inked on its word. */
const Count: React.FC<{ at: number; x: number; top: number; children: React.ReactNode }> = ({ at, x, top, children }) => (
  <Ink at={at} dur={10} style={{ left: x, top, whiteSpace: "nowrap" }}>
    <span style={{ ...note(24, INK), fontWeight: 650 }}>{children}</span>
  </Ink>
);

/** One region group, as a block with its name. */
const Group: React.FC<{ region: string; at: number; x: number; top: number; kept?: boolean }> = ({ region, at, x, top, kept }) => {
  const { h } = useLayout();
  return (
    <Ink at={at} dur={10} style={{ left: x, top }}>
      <div
        style={{
          width: 100,
          height: h(36),
          borderRadius: 4,
          border: `2px solid ${BAR}`,
          background: kept ? `color-mix(in srgb, ${BAR} 18%, ${PAPER})` : PAPER,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...label(20, INK),
        }}
      >
        {region}
      </div>
    </Ink>
  );
};
