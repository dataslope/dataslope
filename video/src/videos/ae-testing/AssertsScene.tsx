import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, INK, INK_SOFT, body, label, note } from "../../editorial/style";
import { Ink, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { DUPLICATES, UNIQUE } from "./data";
import {
  Box,
  Chip,
  DataTable,
  Drift,
  Flow,
  KeyArrow,
  Listing,
  ListingTitle,
  listingWidth,
  MARK,
  MARK_RED,
  pulse,
  resultGeometry,
  SmallMono,
  StopBar,
  TableName,
  tableGeometry,
  TestResult,
  X0,
} from "./parts";

const FIG_Y = 344;
const LIST_SIZE = 22;
const TABLE_X = 930;
const PIPE = { x: 1370, w: 270, h: 58 };

/**
 * Questions 1 and 2. The assumption "order_id is unique" becomes the query
 * for the rows that break it, the page's own unique query, and beside it the
 * rows it returns: nothing at first ("0 rows: pass"), then the failures
 * ("3 rows: fail"), and the run stops. The page's 24 rows sit beside it,
 * untouched, and a pipeline from fct_orders to a dashboard stops at the
 * failing test. Question 2 reads the query (GROUP BY, then HAVING), links
 * each returned key to its pair in the table, and sends the fix back to the
 * source: the rows are still there.
 */
export const AssertsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("asserts").from;
  const q1At = n.word("asserts", "Question one");
  const q1TextAt = n.word("asserts", "What does it mean");
  const assumptionAt = n.word("asserts", "an assumption down");
  const queryAt = n.word("asserts", "as a query");
  const breakAt = n.word("asserts", "the rows that break it");
  const zeroAt = n.word("asserts-zero", "Zero rows back");
  const passesAt = n.word("asserts-zero", "the test passes");
  const anyAt = n.word("asserts-zero", "Any rows back");
  const runFailsAt = n.word("asserts-zero", "the run fails");
  const neverAt = n.word("asserts-never", "It never changes the data");
  const stopsAt = n.word("asserts-never", "It stops the pipeline loudly");
  const dashAt = n.word("asserts-never", "reach a dashboard quietly");
  const q2At = n.word("surface", "Question two");
  const q2TextAt = n.word("surface", "What does a failing uniqueness test");
  const theRowsAt = n.word("surface", "The rows that break it");
  const roughlyAt = n.word("surface", "compiles to roughly this");
  const groupAt = n.word("surface", "group by the key");
  const havingAt = n.word("surface", "keep any key that appears more than once");
  const pageRowsAt = n.word("surface-run", "the page's twenty-four rows");
  const twoAt = n.word("surface-run", "orders two");
  const elevenAt = n.word("surface-run", "eleven");
  const nineteenAt = n.word("surface-run", "nineteen");
  const twiceAt = n.word("surface-run", "twice each");
  const workAt = n.word("surface-fix", "Those rows are the work");
  const removedAt = n.word("surface-fix", "dbt hasn't removed them");
  const stayAt = n.word("surface-fix", "they stay until");
  const sentAt = n.word("surface-fix", "whatever sent them twice");
  const end = n.beat("surface-fix").to;

  // ── The query and the rows it returns ──
  const top = y(FIG_Y);
  const query = UNIQUE.test.sql.filter((l) => !l.startsWith("--"));
  const listW = listingWidth(query, LIST_SIZE);
  const result = UNIQUE.test.result;
  const rg = resultGeometry(X0 + listW + 56, top, result.cols, result.rows, h);

  // ── The page's 24 rows ──
  const g = tableGeometry({
    x: TABLE_X,
    top,
    cols: [{ name: "order_id" }, { name: "amount" }],
    rows: UNIQUE.table.rows,
    headH: h(28),
    rowH: h(21.6),
    headSize: 19,
    bodySize: 19,
    pad: 18,
  });
  const pairRows = (id: number) => UNIQUE.table.rows.map((r, i) => (Number(r[0]) === id ? i : -1)).filter((i) => i >= 0);
  const pairMid = (id: number) => {
    const rows = pairRows(id);
    return (g.rowTop(rows[0]) + g.rowTop(rows[rows.length - 1] + 1)) / 2;
  };
  const linkAt = [twoAt, elevenAt, nineteenAt];

  // ── The pipeline: fct_orders to a dashboard, through the test ──
  const srcY = top;
  const modelY = top + h(150);
  const stopY = top + h(310);
  const dashY = top + h(420);
  const pipeMid = PIPE.x + PIPE.w / 2;
  const busX = (g.right + PIPE.x) / 2 + 10;

  const q1Out = q2At - 6;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={assumptionAt + 2} level={-35} />
      <Sfx name="el-whoosh" at={queryAt} level={-37} />
      <Sfx name="el-sprinkle" at={queryAt + 6} level={-35} />
      <Sfx name="el-tap" at={zeroAt + 2} level={-33} />
      <Sfx name="el-chime" at={passesAt + 2} level={-34} />
      <Sfx name="el-sprinkle" at={anyAt + 4} level={-34} />
      <Sfx name="el-tap" at={runFailsAt} level={-31} />
      <Sfx name="el-pop" at={runFailsAt + 4} level={-33} />
      <Sfx name="el-tap" at={stopsAt + 2} level={-31} />
      <Sfx name="el-pop" at={dashAt} level={-33} />
      <Sfx name="el-pencil" at={groupAt + 2} level={-35} />
      <Sfx name="el-pencil" at={havingAt + 2} level={-35} />
      {linkAt.map((at, i) => (
        <Sfx key={i} name="el-pencil" at={at + 2} level={-35} />
      ))}
      <Sfx name="el-tap" at={removedAt + 2} level={-33} />
      <Sfx name="el-pop" at={stayAt} level={-33} />
      <Sfx name="el-whoosh" at={sentAt} level={-36} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={1} at={q1At - 4} textAt={q1TextAt - 4} out={q1Out} size={58}>
          What does it mean that a dbt test &ldquo;asserts&rdquo;?
        </QuestionCard>
        <Ink at={q1TextAt + 10} dur={14} out={q1Out} style={{ left: 96, top: y(226), whiteSpace: "nowrap" }}>
          <span style={{ ...label(22, INK_SOFT) }}>Also on the dbt page: How do dbt tests work?</span>
        </Ink>
        <QuestionCard n={2} at={q2At - 2} textAt={q2TextAt - 4} size={58}>
          What does a failing uniqueness test actually surface?
        </QuestionCard>

        {/* ── An assumption, written down as a query ── */}
        <Note at={assumptionAt} x={X0} y={top + h(40)} out={queryAt - 2} from="up">
          <span style={{ ...body(42), color: INK, whiteSpace: "nowrap" }}>
            &ldquo;<SmallMono>order_id</SmallMono> is unique&rdquo;
          </span>
        </Note>
        <ListingTitle x={X0} top={top} at={queryAt} out={roughlyAt - 4}>
          &ldquo;<SmallMono>order_id</SmallMono> is unique&rdquo;, as a query
        </ListingTitle>
        <ListingTitle x={X0} top={top} at={roughlyAt}>
          Roughly what <SmallMono>unique</SmallMono> compiles to
        </ListingTitle>
        <Listing
          lines={query}
          x={X0}
          top={top}
          size={LIST_SIZE}
          at={queryAt}
          marks={[
            { line: "GROUP BY", at: groupAt, out: twoAt },
            { line: "HAVING", at: havingAt },
          ]}
        />
        <Note at={breakAt + 2} x={X0} y={top + 268} out={zeroAt - 2}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>It returns the rows that break the assumption</span>
        </Note>

        {/* ── The rows it returns: none, then the failures ── */}
        <TestResult
          g={rg}
          cols={result.cols.map((name) => ({ name, numeric: true }))}
          rows={result.rows}
          at={zeroAt}
          rowsAt={anyAt + 4}
          verdict={[
            { at: zeroAt + 4, tone: "ok", text: "0 rows: pass" },
            { at: anyAt + 6, tone: "bad", text: `${result.rows.length} rows: fail` },
          ]}
          bands={result.rows.map((_, i) => ({ row: i, at: theRowsAt + i * 3, color: MARK_RED }))}
          marks={result.rows.map((_, i) => ({ row: i, col: 1, at: twiceAt + i * 2, color: MARK }))}
        />
        <Note at={anyAt + 8} x={rg.x} y={rg.rowTop(result.rows.length) + h(16)} out={q2At}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>The failures</span>
        </Note>

        {/* ── The table, untouched ── */}
        <TableName g={g} at={queryAt + 6}>
          fct_orders · <span style={{ color: BLUE_INK }}><Num>{UNIQUE.after}</Num> rows</span>
          <span style={{ color: INK_SOFT, opacity: ease(frame, neverAt + 6, 10) }}>, unchanged</span>
        </TableName>
        <div style={{ position: "absolute", left: g.x - 12, top: g.top - 44, width: 250, height: 36, borderRadius: 6, background: MARK, opacity: 0.8 * Math.max(pulse(frame, neverAt, 30), pulse(frame, pageRowsAt, 30), pulse(frame, removedAt, 30)) }} />
        <DataTable
          g={g}
          cols={[
            { name: "order_id", numeric: true },
            { name: "amount", numeric: true },
          ]}
          rows={UNIQUE.table.rows.map((cells, i) => ({ cells, at: queryAt + 8 + i * 1 }))}
          at={queryAt + 6}
          bands={DUPLICATES.flatMap((id, k) => pairRows(id).map((row) => ({ row, at: linkAt[k] + 6, color: MARK_RED })))}
        />
        {DUPLICATES.map((id, k) => (
          <KeyArrow key={id} from={[rg.right + 8, rg.rowMid(k)]} to={[g.x - 10, pairMid(id)]} at={linkAt[k]} color={ACCENT} />
        ))}

        {/* ── The pipeline stops at the failing test ── */}
        <Box x={PIPE.x} y={modelY} w={PIPE.w} h={h(PIPE.h)} at={runFailsAt - 4} title="fct_orders" mono size={22} />
        <Flow points={[[pipeMid, modelY + h(PIPE.h) + 6], [pipeMid, stopY - 10]]} at={runFailsAt} color={INK} noHead />
        <StopBar x={pipeMid} y={stopY} at={runFailsAt + 10} />
        <Ink at={runFailsAt + 12} dur={12} style={{ left: pipeMid + 34, top: stopY - 22, whiteSpace: "nowrap" }}>
          <Chip tone="red" size={22}>
            run fails
          </Chip>
        </Ink>
        <Note at={stopsAt + 8} x={pipeMid + 34} y={stopY + h(26)}>
          <span style={{ ...note(21, ACCENT_INK), whiteSpace: "nowrap" }}>Stopped, loudly</span>
        </Note>
        <Flow points={[[pipeMid, stopY + 14], [pipeMid, dashY - 10]]} at={dashAt} color={ds("gray", 400)} dash="6 7" noHead />
        <Box x={PIPE.x} y={dashY} w={PIPE.w} h={h(PIPE.h)} at={dashAt + 4} title="Dashboard" tones={[{ at: dashAt, tone: "off" }]} size={22} />
        <Note at={dashAt + 10} x={PIPE.x} y={dashY + h(PIPE.h) + h(14)}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>No bad rows reach it</span>
        </Note>

        {/* ── The fix goes back to whatever sent them ── */}
        <Box x={PIPE.x} y={srcY} w={PIPE.w} h={h(PIPE.h)} at={stayAt} title="raw.orders" sub={undefined} mono size={22} tones={[{ at: sentAt, tone: "bad" }]} />
        <Note at={sentAt + 6} x={PIPE.x} y={srcY - h(40)}>
          <span style={{ ...label(21, ACCENT_INK), whiteSpace: "nowrap" }}>The source: fix it here</span>
        </Note>
        <Flow points={[[pipeMid, srcY + h(PIPE.h) + 6], [pipeMid, modelY - 8]]} at={stayAt + 6} color={INK} />
        {DUPLICATES.map((id, k) => (
          <Flow key={id} points={[[g.right + 10, pairMid(id)], [busX, pairMid(id)]]} at={sentAt + k * 3} color={ACCENT} noHead />
        ))}
        <Flow
          points={[
            [busX, pairMid(DUPLICATES[DUPLICATES.length - 1])],
            [busX, srcY + h(PIPE.h) / 2],
            [PIPE.x - 8, srcY + h(PIPE.h) / 2],
          ]}
          at={sentAt + 8}
          dur={18}
          color={ACCENT}
        />
        <Note at={workAt} x={rg.x} y={rg.rowTop(result.rows.length) + h(16)}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>The work</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
