import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { inkOf } from "../../theme/brand";
import { COVER, INDEX } from "./data";
import { Bar, DataTable, Drift, Listing, listingHeight, MARK_OK, OK_INK, PageStrip, PlanBox, TableName, tableGeometry, X0 } from "./parts";

const TOP = 300;
const SIZE = 21;
const PLAN = 19;
const R_X = 1300;
const R_W = 500;
/** Index entries shown: the first few of customer 42's twenty. */
const SHOWN = 4;

/**
 * Question 4. Left: the query for two columns, then the plan Postgres
 * printed with only a customer_id index (Heap Blocks: exact=20), then the
 * index with INCLUDE (amount) and the plan it gets: an Index Only Scan,
 * Heap Fetches: 0. Right: the index's entries for customer 42, whose amount
 * column opens as INCLUDE adds it, over the table's pages, the twenty it
 * had to read going dark. Last, the price: the two indexes' sizes.
 */
export const CoverScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("cover").from;
  const qAt = n.word("cover", "Question four");
  const textAt = n.word("cover", "What is a covering index");
  const holdsAt = n.word("cover", "holds every column");
  const neverAt = n.word("cover", "never read");
  const wantsAt = n.word("cover-include", "This query wants");
  const includeAt = n.word("cover-include", "with include");
  const onlyAt = n.word("cover-include", "an index only scan");
  const zeroAt = n.word("cover-include", "zero heap fetches");
  const sizeAt = n.word("cover-cost", "The price is size");
  const fourAt = n.word("cover-cost", "four times the plain one");
  const writesAt = n.word("cover-cost", "every insert writes all of it");
  const fewAt = n.word("cover-cost", "Cover the few queries");
  const end = n.beat("cover-cost").to;

  const queryTop = y(TOP);
  const planTop = queryTop + listingHeight(COVER.query.length, SIZE) + h(22);
  const includeTop = planTop;
  const afterTop = includeTop + listingHeight(COVER.include.length, SIZE) + h(22);

  // The index's entries for 42: customer_id, then amount once INCLUDE adds it.
  const rows = [...COVER.rows.rows.slice(0, SHOWN), ["…", "…"]];
  const ig = tableGeometry({
    x: R_X,
    top: y(TOP) + h(40),
    cols: [{ name: "customer_id" }, { name: "amount" }],
    rows,
    headH: h(44),
    rowH: h(42),
    bodySize: 22,
    headSize: 20,
  });
  const stripY = ig.rowTop(rows.length) + h(110);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={includeAt + 4} level={-35} />
      <Sfx name="el-pop" at={zeroAt} level={-32} />
      <Sfx name="el-pop" at={fourAt} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is a covering index?
        </QuestionCard>

        {/* ── Left: the query, its plan before, then INCLUDE and after ── */}
        <Listing
          lines={COVER.query}
          x={X0}
          top={queryTop}
          width={640}
          size={SIZE}
          at={holdsAt - 2}
          marks={[{ line: "SELECT", text: "customer_id, amount", at: wantsAt + 4 }]}
        />
        <PlanBox
          lines={COVER.before}
          x={X0}
          top={planTop}
          width={1150}
          size={PLAN}
          step={2}
          at={holdsAt + 6}
          out={includeAt - 8}
          marks={[{ line: "Heap Blocks", at: neverAt }]}
        />
        <Listing
          lines={COVER.include}
          x={X0}
          top={includeTop}
          width={640}
          size={SIZE}
          at={includeAt - 4}
          marks={[{ line: "INCLUDE", text: "INCLUDE (amount)", at: includeAt + 4, color: MARK_OK }]}
        />
        <PlanBox
          lines={COVER.after}
          x={X0}
          top={afterTop}
          width={1150}
          size={PLAN}
          step={2}
          at={onlyAt - 4}
          marks={[
            { line: "Index Only Scan", text: "Index Only Scan", at: onlyAt + 4, color: MARK_OK },
            { line: "Heap Fetches", at: zeroAt, color: MARK_OK },
          ]}
        />

        {/* ── Right: the index's entries, and the table's pages ── */}
        <TableName g={ig} at={holdsAt}>
          the index, at 42
        </TableName>
        <DataTable
          g={ig}
          cols={[
            { name: "customer_id", ink: BLUE_INK },
            { name: "amount", ink: BLUE_INK, at: includeAt + 2 },
          ]}
          at={holdsAt}
          rows={rows.map((cells, i) => ({ cells, at: holdsAt + 4 + i * 2 }))}
          bands={rows.slice(0, SHOWN).map((_, row) => ({ row, at: zeroAt + row * 2, color: MARK_OK }))}
        />
        <Note at={holdsAt + 10} x={R_X} y={ig.rowTop(rows.length) + h(14)} out={includeAt}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>amount lives only in the table</span>
        </Note>
        <PageStrip
          x={R_X}
          y={stripY}
          width={R_W}
          pages={INDEX.pages}
          at={holdsAt + 6}
          ticks={[{ pages: INDEX.pages42, at: neverAt - 6, out: onlyAt + 6, color: inkOf.red }]}
          out={sizeAt}
        />
        <div style={{ position: "absolute", left: R_X, top: stripY + h(64), ...note(22, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, holdsAt + 6, 12) * (1 - ease(frame, sizeAt, 10)) }}>
          the table&rsquo;s pages
        </div>
        <Note at={neverAt + 4} x={R_X} y={stripY + h(100)} out={onlyAt}>
          <span style={{ ...note(24, ACCENT_INK), whiteSpace: "nowrap" }}>
            <Num>20</Num> pages read, to fetch 20 amounts
          </span>
        </Note>
        <Note at={zeroAt + 2} x={R_X} y={stripY + h(100)} out={sizeAt}>
          <span style={{ ...note(24, OK_INK), whiteSpace: "nowrap" }}>
            <Num>0</Num> pages read: the index answers alone
          </span>
        </Note>

        {/* ── The price: size ── */}
        <Note at={sizeAt + 2} x={R_X} y={stripY - h(16)}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>Index size on disk</span>
        </Note>
        <Bar
          x={R_X}
          y={stripY + h(28)}
          width={300}
          value={COVER.plain.bytes}
          max={COVER.covering.bytes}
          at={sizeAt + 4}
          label={
            <>
              <QMono>(customer_id)</QMono>
            </>
          }
          shown={COVER.plain.pretty}
          color={BAR}
          ink={BLUE_INK}
        />
        <Bar
          x={R_X}
          y={stripY + h(118)}
          width={300}
          value={COVER.covering.bytes}
          max={COVER.covering.bytes}
          at={fourAt - 4}
          label={
            <>
              <QMono>(customer_id) INCLUDE (amount)</QMono>
            </>
          }
          shown={COVER.covering.pretty}
          color={inkOf.red}
          ink={ACCENT_INK}
        />
        <Note at={writesAt} x={X0} y={afterTop + h(200)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            Every insert writes the wider index too.{" "}
            <span style={{ color: INK, fontWeight: 650, opacity: ease(frame, fewAt, 10) }}>Cover the few that run constantly.</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
