import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { ColumnRule, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { TYPE3 } from "./data";
import {
  acme,
  Axis,
  Band,
  colsOf,
  DataTable,
  Drift,
  geoOf,
  lineOf,
  Listing,
  listingWidth,
  LOW,
  MARK_BAD,
  OK_INK,
  QMono,
  TableName,
  useAcme,
  VMark,
  X0,
  YEARS,
} from "./parts";

const ROWS = { headH: 42, rowH: 48, bodySize: 23, headSize: 20 } as const;
const SIZE = 21;
/** The dated axis ends at today here, leaving room for a later move. */
const TODAY_X = 1400;
const LATER_X1 = 1800;

/** What one column of the Type 3 row holds: a bracket over a band, its
 *  column's name above it, sliding to another band on `moveAt`. */
const Bracket: React.FC<{
  name: string;
  at: number;
  x0: number;
  x1: number;
  moveAt?: number;
  to?: { x0: number; x1: number };
  top: number;
}> = ({ name, at, x0, x1, moveAt, to, top }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  if (p <= 0) return null;
  const m = moveAt === undefined || !to ? 0 : ease(frame, moveAt, 18);
  const a = x0 + (to ? (to.x0 - x0) * m : 0) + 14;
  const b = x1 + (to ? (to.x1 - x1) * m : 0) - 14;
  return (
    <div style={{ position: "absolute", left: a, top, width: b - a, opacity: p }}>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: -14, height: 12, borderTop: `2px solid ${INK}`, borderLeft: `2px solid ${INK}`, borderRight: `2px solid ${INK}` }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 8, textAlign: "center", fontFamily: MONO, fontSize: 22, fontWeight: 500, color: INK, whiteSpace: "nowrap" }}>{name}</div>
    </div>
  );
};

/**
 * Question 3, on the recurring figure. Acme's history as it happened (East,
 * then West), and the Type 3 row's two columns bracketed over the part of it
 * each one holds: region over West, prev_region over East, as the page's
 * UPDATE shifts the value across. What it suits: one change compared both
 * ways, old regions and new, from one table. Then a second move, to the
 * North, after today: both brackets slide one band right, and the East
 * band, which no column holds any more, goes red.
 */
export const Type3Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const G = useAcme();
  const A = acme(G.x0, TODAY_X);

  const from = n.beat("t3").from;
  const qAt = n.word("t3", "Question three");
  const textAt = n.word("t3", "What is SCD Type three");
  const addsAt = n.word("t3", "It adds a column for the previous value");
  const readsAt = n.word("t3", "Acme's row now reads West");
  const prevAt = n.word("t3", "with a previous region of East");
  const suitsAt = n.word("t3-use", "That suits one change");
  const territoriesAt = n.word("t3-use", "like sales territories redrawn");
  const oldAt = n.word("t3-use", "under the old regions");
  const newAt = n.word("t3-use", "and the new");
  const noJoinAt = n.word("t3-use", "with no history join");
  const limitAt = n.word("t3-limit", "The limit is one step");
  const againAt = n.word("t3-limit", "Move Acme again, to the North");
  const becomesAt = n.word("t3-limit", "the previous region becomes West");
  const goneAt = n.word("t3-limit", "The East is gone");
  const thirdAt = n.word("t3-limit", "a third column would only push the problem back a step");
  const end = n.beat("t3-limit").to;

  const [east, west] = A.versions;
  const later = { x0: TODAY_X + 30, x1: LATER_X1 };
  const westBand = { x0: west.x0 + 3, x1: TODAY_X };
  const eastBand = { x0: east.x0, x1: east.x1 };
  const bracketTop = G.bandTop - h(64);
  const low = y(LOW);

  // ── Lower left: the row, and the UPDATE that shifts it ──
  const T = TYPE3.after;
  const before = TYPE3.before.rows[0];
  const twice = TYPE3.twice.rows[0];
  const tRegion = T.cols.indexOf("region");
  const tPrev = T.cols.indexOf("prev_region");
  const gt = geoOf(T, X0, low, h, { ...ROWS, extra: [before, twice] });
  const listTop = gt.rowTop(1) + h(80);
  const L1 = TYPE3.move.lines;
  const L2 = TYPE3.again.lines;
  const listW = Math.max(listingWidth(L1, SIZE), listingWidth(L2, SIZE));

  // ── Lower right: what it suits ──
  const RX = 940;
  const useOut = limitAt - 4;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={addsAt + 4} level={-36} />
      <Sfx name="el-tap" at={readsAt + 4} level={-34} />
      <Sfx name="el-tap" at={prevAt + 2} level={-34} />
      <Sfx name="el-pencil" at={oldAt} level={-36} />
      <Sfx name="el-whoosh" at={againAt + 2} level={-36} />
      <Sfx name="el-scratch" at={goneAt} level={-34} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} size={58}>
          What is SCD Type 3, and what is its main limitation?
        </QuestionCard>

        {/* ── The recurring figure: what happened, and what the row holds ── */}
        <Axis tl={A} top={G.axisTop} at={textAt + 6} years={YEARS} />
        <Band x0={eastBand.x0} x1={eastBand.x1} top={G.bandTop} h={G.bandH} at={textAt + 10} label={east.region} tones={[{ at: goneAt, tone: "bad" }]} />
        <Band x0={westBand.x0} x1={westBand.x1} top={G.bandTop} h={G.bandH} at={textAt + 16} label={west.region} />
        <VMark x={TODAY_X + 15} top={G.bandTop - h(10)} bottom={G.bandTop + G.bandH + h(10)} at={againAt - 6} color={INK_SOFT} />
        <Note at={againAt - 4} x={TODAY_X + 30} y={G.axisTop + h(6)}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>Later</span>
        </Note>
        <Band x0={later.x0} x1={later.x1} top={G.bandTop} h={G.bandH} at={againAt + 2} label={twice[tRegion]} />
        <Bracket name="region" at={readsAt + 4} x0={westBand.x0} x1={westBand.x1} moveAt={becomesAt - 6} to={later} top={bracketTop} />
        <Bracket name="prev_region" at={prevAt + 2} x0={eastBand.x0} x1={eastBand.x1} moveAt={becomesAt} to={westBand} top={bracketTop} />

        {/* ── Lower left: the row ── */}
        <TableName g={gt} at={addsAt}>
          dim_customer_t3
        </TableName>
        {/* The second move re-runs the UPDATE on the row as it stands: the
            row closes up as its successor opens under it, and that one's
            cells swap from the last values. */}
        <DataTable
          g={gt}
          cols={colsOf(T, { prev_region: { at: addsAt + 4 } })}
          at={addsAt}
          rows={[
            { cells: before, at: addsAt + 2, collapseAt: againAt + 2 },
            { cells: T.rows[0], at: againAt + 6, grow: true },
          ]}
          swaps={[
            { row: 0, col: tRegion, at: readsAt + 2, value: T.rows[0][tRegion] },
            { row: 0, col: tPrev, at: prevAt - 2, value: T.rows[0][tPrev] },
            { row: 1, col: tRegion, at: againAt + 14, value: twice[tRegion] },
            { row: 1, col: tPrev, at: becomesAt + 4, value: twice[tPrev] },
          ]}
          marks={[
            { row: 0, col: tPrev, at: prevAt, out: limitAt },
            { row: 1, col: tPrev, at: becomesAt - 8, out: becomesAt + 4, color: MARK_BAD },
            { row: 1, col: tPrev, at: becomesAt + 8, out: goneAt + 20 },
          ]}
        />
        <Listing
          lines={L1}
          x={X0}
          top={listTop}
          width={listW}
          size={SIZE}
          at={addsAt + 10}
          out={againAt - 4}
          title="Each move"
          marks={[{ line: lineOf(L1, "SET prev_region"), at: readsAt }]}
        />
        <Listing
          lines={L2}
          x={X0}
          top={listTop}
          width={listW}
          size={SIZE}
          at={againAt}
          title="The second move"
          marks={[{ line: lineOf(L2, "SET prev_region"), at: becomesAt - 4 }]}
        />

        {/* ── Lower right: one change, compared both ways ── */}
        <Note at={suitsAt} x={RX} y={low - h(4)} out={useOut}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            One change, compared both ways
            <span style={{ color: INK_SOFT, opacity: ease(frame, territoriesAt, 10) }}>: territories redrawn</span>
          </span>
        </Note>
        <Note at={oldAt - 2} x={RX} y={low + h(60)} out={useOut}>
          <div style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>This year, old regions</div>
          <div style={{ ...note(24, INK), whiteSpace: "nowrap", marginTop: 12 }}>
            <QMono>GROUP BY prev_region</QMono>
          </div>
        </Note>
        {ease(frame, useOut, 10) < 1 ? <ColumnRule x={RX + 380} top={low + h(60)} height={h(90)} at={newAt} dim={useOut} /> : null}
        <Note at={newAt - 2} x={RX + 420} y={low + h(60)} out={useOut}>
          <div style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>This year, new regions</div>
          <div style={{ ...note(24, INK), whiteSpace: "nowrap", marginTop: 12 }}>
            <QMono>GROUP BY region</QMono>
          </div>
        </Note>
        <Note at={noJoinAt} x={RX} y={low + h(186)} out={useOut}>
          <span style={{ ...note(25, OK_INK), whiteSpace: "nowrap" }}>One table, no history join</span>
        </Note>

        {/* ── Lower right: the limit ── */}
        <Note at={limitAt} x={RX} y={low - h(4)}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>One step of history</span>
        </Note>
        <Note at={goneAt} x={RX} y={low + h(58)}>
          <span style={{ ...note(25, ACCENT_INK), whiteSpace: "nowrap" }}>The East is gone: no column holds it</span>
        </Note>
        <Note at={thirdAt} x={RX} y={low + h(116)}>
          <span style={{ ...note(25, INK_SOFT), whiteSpace: "nowrap" }}>A third column: the same loss, one move later</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
