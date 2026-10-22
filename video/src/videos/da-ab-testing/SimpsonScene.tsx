import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, INK, INK_SOFT, TABULAR, fmt, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { RATIO, STONES } from "./data";
import { colsOf, DataTable, Drift, geoOf, MARK, MARK_BAD, MARK_OK, OK_INK, rowsAt, TableName, X0 } from "./parts";

const TOP = 350;
const POOLED_X = 1040;

/** A percentage cell at one decimal, as the page prints it (73 is 73.0). */
const one = (t: { cols: string[]; rows: string[][] }) => {
  const j = t.cols.indexOf("pct");
  return { cols: t.cols, rows: t.rows.map((r) => r.map((c, k) => (k === j ? fmt(Number(c), 1) : c))) };
};

/**
 * Questions 14 and 15. The page's kidney-stone counts: A beats B for small
 * stones (93.1% to 86.7%) and for large ones (73.0% to 68.8%), and loses
 * pooled, 78.0% to 82.6%, because 263 of its 350 patients had large stones.
 * Then the page's five regions: their averages average 68, while per
 * customer the figure is 51.8, the Islands' 131 counting as much as North's
 * 52 for 40 customers against 4,200.
 */
export const SimpsonScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("simpson").from;
  const qAt = n.word("simpson", "Question fourteen");
  const textAt = n.word("simpson", "What is Simpson's paradox");
  const asked = n.beat("simpson").to;
  const reverseAt = n.word("simpson-stones", "can reverse inside every group");
  const smallAt = n.word("simpson-stones", "wins for small stones");
  const largeAt = n.word("simpson-stones", "for large ones");
  const losesAt = n.word("simpson-stones", "yet loses overall");
  const pctAt = n.word("simpson-stones", "seventy-eight percent against eighty-three");
  const givenAt = n.word("simpson-why", "mostly to large stones");
  const segmentAt = n.word("simpson-why", "segment before you conclude");
  const q15At = n.word("ratio", "Question fifteen");
  const q15TextAt = n.word("ratio", "How do you avoid");
  const bothAt = n.word("ratio", "the numerator and the denominator together");
  const fellAt = n.word("ratio", "because sessions fell");
  const avgAt = n.word("ratio", "an average of averages");
  const sixtyEightAt = n.word("ratio", "average sixty-eight");
  const perAt = n.word("ratio", "Per customer");
  const fortyAt = n.word("ratio", "only forty customers");
  const end = n.beat("ratio").to;
  const out14 = q15At - 4;

  // ── Question 14 ──
  const S = one(STONES.bySize);
  const Pd = one(STONES.pooled);
  const sg = geoOf(S, X0, y(TOP), h, { rowH: 54 });
  const pg = geoOf(Pd, POOLED_X, y(TOP), h, { rowH: 54 });
  const col = (t: { cols: string[] }, name: string) => t.cols.indexOf(name);
  const row = (size: string, tr: string) => S.rows.findIndex((r) => r[0] === size && r[1] === tr);
  const pA = Pd.rows.findIndex((r) => r[0] === "A");
  const pB = Pd.rows.findIndex((r) => r[0] === "B");
  const aSmall = row("Small", "A");
  const aLarge = row("Large", "A");
  const bSmall = row("Small", "B");
  const largeA = Number(S.rows[aLarge][col(S, "n")]);
  const totalA = Number(Pd.rows[pA][col(Pd, "n")]);

  // ── Question 15 ──
  const R = RATIO.regions;
  const rg = geoOf(R, X0, y(TOP + 110), h, { rowH: 50 });
  const islands = R.rows.findIndex((r) => r[0] === "Islands");
  const resultX = rg.right + 120;

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={smallAt} level={-34} />
      <Sfx name="el-tap" at={largeAt} level={-34} />
      <Sfx name="el-scratch" at={losesAt} level={-32} />
      <Sfx name="el-pencil" at={givenAt} level={-34} />
      <Sfx name="el-pop" at={sixtyEightAt} level={-32} />
      <Sfx name="el-scratch" at={perAt + 4} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={14} at={qAt - 4} textAt={textAt - 4} out={out14} size={60}>
          What is Simpson&apos;s paradox?
        </QuestionCard>
        <QuestionCard n={15} at={q15At} textAt={q15TextAt - 2} size={60}>
          How do you avoid a misleading ratio metric?
        </QuestionCard>

        {/* ── Question 14: the kidney-stone study ── */}
        <TableName g={sg} at={asked - 6} out={out14}>
          stones, by size
        </TableName>
        <DataTable
          g={sg}
          cols={colsOf(S)}
          at={asked - 6}
          out={out14}
          rows={rowsAt(S.rows, asked - 2)}
          marks={[
            { row: aSmall, col: col(S, "pct"), at: smallAt + 2, color: MARK_OK },
            { row: aLarge, col: col(S, "pct"), at: largeAt + 2, color: MARK_OK },
            { row: aLarge, col: col(S, "n"), at: givenAt, color: MARK },
            { row: bSmall, col: col(S, "n"), at: givenAt + 8, color: MARK },
          ]}
        />
        <Note at={reverseAt - 2} x={X0} y={sg.rowTop(S.rows.length) + h(26)} out={out14}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>A wins inside each group</span>
        </Note>
        <TableName g={pg} at={losesAt - 6} out={out14}>
          pooled
        </TableName>
        <DataTable
          g={pg}
          cols={colsOf(Pd)}
          at={losesAt - 6}
          out={out14}
          rows={rowsAt(Pd.rows, losesAt - 2, 4)}
          marks={[
            { row: pA, col: col(Pd, "pct"), at: pctAt, color: MARK_BAD },
            { row: pB, col: col(Pd, "pct"), at: pctAt + 10 },
          ]}
        />
        <Note at={losesAt + 6} x={POOLED_X} y={pg.rowTop(Pd.rows.length) + h(26)} out={out14}>
          <span style={{ ...note(26, ACCENT_INK), whiteSpace: "nowrap" }}>and loses overall</span>
        </Note>
        <Note at={givenAt + 4} x={POOLED_X} y={pg.rowTop(Pd.rows.length) + h(80)} out={out14} width={640}>
          <span style={{ ...note(25, INK), ...TABULAR }}>
            {largeA} of A&apos;s {totalA} patients had large stones, the hard cases
          </span>
        </Note>
        <Note at={segmentAt - 2} x={POOLED_X} y={pg.rowTop(Pd.rows.length) + h(160)} out={out14}>
          <span style={{ ...note(26, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>segment before you conclude</span>
        </Note>

        {/* ── Question 15: two ratios that mislead ── */}
        <Note at={bothAt - 4} x={X0} y={y(TOP - 20)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            revenue per session: watch the top and the bottom
            <span style={{ opacity: ease(frame, fellAt - 2, 10) }}>; it rises when sessions fall</span>
          </span>
        </Note>
        <TableName g={rg} at={avgAt - 6}>
          regions
        </TableName>
        <DataTable
          g={rg}
          cols={colsOf(R)}
          at={avgAt - 6}
          rows={rowsAt(R.rows, avgAt - 2)}
          bands={[{ row: islands, at: fortyAt, color: MARK }]}
          marks={R.rows.map((_, r) => ({ row: r, col: 1, at: sixtyEightAt - 8 + r * 2, out: perAt }))}
        />
        <Note at={sixtyEightAt - 2} x={resultX} y={rg.rowTop(0)}>
          <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>average of the five averages</span>
          <div style={{ ...note(44, ACCENT_INK), fontWeight: 650, ...TABULAR }}>{fmt(RATIO.averaged, 0)}</div>
        </Note>
        <Note at={perAt - 2} x={resultX} y={rg.rowTop(2) + h(10)}>
          <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>per customer, weighted by customers</span>
          <div style={{ ...note(44, BLUE_INK), fontWeight: 650, ...TABULAR }}>{fmt(RATIO.weighted, 1)}</div>
        </Note>
        <Note at={fortyAt + 4} x={resultX} y={rg.rowTop(4) + h(20)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap", ...TABULAR }}>
            the Islands&apos; {R.rows[islands][1]} counts as much as North&apos;s {R.rows[0][1]}, for {R.rows[islands][2]} customers
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};

