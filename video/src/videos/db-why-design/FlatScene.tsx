import React from "react";
import { AbsoluteFill } from "remotion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, body, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { ADA, F, FIXED_ROW, FLAT, GROUPED, GROUPED_ADA, MISSED_ROW, NEW_EMAIL } from "./data";
import {
  DbTable,
  Drift,
  FIG_Y,
  Headline,
  Kicker,
  Listing,
  listingHeight,
  MARK,
  MARK_BAD,
  RowBracket,
  tableGeometry,
  X0,
} from "./parts";

const RIGHT_X = 1150;
const TABLE_Y = 345;
const GROUP_FIG_Y = 612;
const GROUP_Y = 658;
const SQL_SIZE = 22;
/** A small count, set as the narration says it. */
const WORDS = ["No", "One", "Two", "Three", "Four"];

/**
 * Part 1 opens: the lesson's flat table, every field in one place, works on
 * day one; Ada's email is stored twice; a rushed update reaches one of her
 * rows; and the lesson's GROUP BY then finds two emails for one person.
 */
export const FlatScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const hookFrom = n.beat("hook").from;
  const rarelyAt = n.word("hook", "rarely");
  const oneTableAt = n.word("table", "One");
  const fieldAt = n.word("table", "every");
  const ordersAt = n.word("table", "orders");
  const worksAt = n.word("table", "screen");
  const adaAt = n.word("twice", "Ada's");
  const emailAt = n.word("twice", "email's");
  const twiceAt = n.word("twice", "twice", { nth: 2 });
  const changesAt = n.word("change", "changes");
  const rushedAt = n.word("change", "rushed");
  const fixesAt = n.word("change", "fixes");
  const oneOhOneAt = n.word("change", "one-oh-one");
  const missesAt = n.word("change", "misses");
  const saysAt = n.word("confident", "says");
  const confidenceAt = n.word("confident", "confidence");
  const personAt = n.word("confident", "person");
  const twoAt = n.word("confident", "two");
  const end = n.beat("legal").from;

  const g = tableGeometry({
    x: X0,
    top: y(TABLE_Y),
    cols: FLAT.cols,
    rows: FLAT.rows,
    extra: FLAT.after,
    headH: h(48),
    rowH: h(56),
  });
  const gg = tableGeometry({ x: X0, top: y(GROUP_Y), cols: GROUPED.cols, rows: GROUPED.rows, headH: h(48), rowH: h(56) });
  const swapAt = oneOhOneAt + 8;
  const rowAts = FLAT.rows.map((_, i) => ordersAt - 6 + i * 6);
  const groupAts = GROUPED.rows.map((_, i) => confidenceAt - 4 + i * 6);
  const replyTop = y(TABLE_Y) + listingHeight(FLAT.update.length, SQL_SIZE) + 26;
  const adaRows = FLAT.rows.flatMap((row, i) => (row[F.name] === ADA ? [i] : []));

  return (
    <AbsoluteFill>
      {/* ── Sound: the rows, the update's listing and its one changed cell, the answer ── */}
      {rowAts.map((t, i) => (
        <Sfx key={i} name="el-tap" at={t} level={-29} />
      ))}
      <Sfx name="el-pencil" at={changesAt - 4} level={-34} />
      <Sfx name="el-pop" at={swapAt} level={-29} />
      <Sfx name="el-scratch" at={twoAt + 4} level={-31} />

      <Kicker at={hookFrom - 10}>What a shortcut costs</Kicker>
      <Headline lead="Day one:" turn="it works." at={rarelyAt - 4} turnAt={worksAt - 4} out={twoAt - 8} />
      <Headline lead="One person," turn="two emails." at={twoAt - 2} turnAt={twoAt + 8} />

      <Drift from={hookFrom} to={end} amount={0.016} origin="40% 60%">
        <FigLabel n="1" title="One table for everything" at={oneTableAt - 4} x={X0} y={y(FIG_Y)} />
        <DbTable
          g={g}
          cols={FLAT.cols}
          rows={FLAT.rows.map((cells, i) => ({ cells, at: rowAts[i] }))}
          at={fieldAt - 4}
          numeric={[F.id, F.qty]}
          swaps={[{ row: FIXED_ROW, col: F.email, at: swapAt, value: NEW_EMAIL }]}
          marks={[
            ...adaRows.map((r, k) => ({ row: r, col: F.name, at: adaAt + k * 5, out: changesAt })),
            ...adaRows.map((r, k) => ({ row: r, col: F.email, at: emailAt + k * 5, out: swapAt - 6 })),
            { row: MISSED_ROW, col: F.email, at: missesAt, color: MARK_BAD },
            { row: FIXED_ROW, col: F.email, at: missesAt + 6, color: MARK },
          ]}
        />
        <RowBracket x={g.x + g.width + 16} y0={g.rowTop(adaRows[0]) + 8} y1={g.rowTop(adaRows.at(-1)! + 1) - 8} at={twiceAt - 4} />

        {/* The right column: day one, the copies, then the rushed update. */}
        <Note at={worksAt} out={adaAt} x={RIGHT_X} y={g.rowTop(0)}>
          <div style={label(21, INK_SOFT)}>Day one</div>
          <div style={{ ...body(34), color: INK, marginTop: 10, whiteSpace: "nowrap" }}>The first screen works.</div>
        </Note>
        <Note at={twiceAt - 2} out={changesAt - 6} x={RIGHT_X} y={g.rowTop(0) + 4}>
          <div style={{ ...body(34), color: INK, whiteSpace: "nowrap" }}>Her email, stored twice.</div>
        </Note>
        <Listing
          lines={FLAT.update}
          x={RIGHT_X}
          top={y(TABLE_Y)}
          width={630}
          size={SQL_SIZE}
          at={changesAt - 4}
          lineAt={[changesAt - 2, rushedAt, fixesAt]}
          marks={[{ line: 2, at: oneOhOneAt - 2 }]}
        />
        <Ink at={swapAt + 4} dur={14} style={{ left: RIGHT_X, top: replyTop, whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 18 }}>
          <span style={label(21, INK_SOFT)}>Postgres replies</span>
          <span style={{ fontFamily: MONO, fontSize: 30, fontWeight: 600, color: INK }}>UPDATE {FLAT.updated}</span>
        </Ink>
        <Note at={missesAt + 2} x={RIGHT_X} y={replyTop + 58}>
          <div style={{ ...note(22, ACCENT_INK), whiteSpace: "nowrap" }}>Order {FLAT.rows[MISSED_ROW][F.id]} still has the old one.</div>
        </Note>

        {/* Fig. 2: the lesson's GROUP BY, after the update. */}
        <FigLabel n="2" title="Each name with each email it has" at={saysAt - 4} x={X0} y={y(GROUP_FIG_Y)} />
        <DbTable
          g={gg}
          cols={GROUPED.cols}
          rows={GROUPED.rows.map((cells, i) => ({ cells, at: groupAts[i], dimAt: GROUPED_ADA.includes(i) ? undefined : twoAt }))}
          at={saysAt - 2}
          numeric={[2]}
          marks={[
            ...GROUPED_ADA.map((r, k) => ({ row: r, col: 0, at: personAt - 2 + k * 5 })),
            ...GROUPED_ADA.map((r, k) => ({ row: r, col: 1, at: twoAt + k * 5, color: MARK_BAD })),
          ]}
        />
        <RowBracket
          x={gg.x + gg.width + 16}
          y0={gg.rowTop(GROUPED_ADA[0]) + 8}
          y1={gg.rowTop(GROUPED_ADA.at(-1)! + 1) - 8}
          at={twoAt + 4}
        />
        <Note at={twoAt + 8} x={gg.x + gg.width + 54} y={gg.rowTop(GROUPED_ADA[0]) + 10}>
          <div style={{ ...body(36), color: ACCENT_INK, whiteSpace: "nowrap" }}>
            {WORDS[FLAT.adaEmails]} emails for {ADA.split(" ")[0]}.
          </div>
          <div style={{ ...note(22, INK_SOFT), marginTop: 10, whiteSpace: "nowrap" }}>Which is right? The table can&apos;t say.</div>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
