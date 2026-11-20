import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, INK, INK_SOFT, note } from "../../editorial/style";
import { Note, OutlineBadge } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO, SANS } from "../../theme/fonts";
import { HASH } from "./data";
import {
  Bar,
  BAR_BLUE,
  Caption,
  colsOf,
  DataTable,
  Drift,
  geoOf,
  KEY,
  KeyArrow,
  Listing,
  listingHeight,
  MARK,
  MARK_BAD,
  MARK_KEY,
  Mono,
  OK_INK,
  TableName,
  X0,
} from "./parts";

const LIST_Y = 340;
const SIZE = 20;
const RIGHT_X = 920;
const ROWS = { headH: 40, rowH: 40, bodySize: 22, headSize: 20 } as const;

/** "2.3 MB" from a byte count, as the narration rounds it. */
const mb = (bytes: number) => `${(bytes / 1e6).toFixed(1)} MB`;

/**
 * Question 5. The page's two key queries side by side: md5 of the natural
 * key on the left, row_number() on the right. The md5 of 42 is the same
 * string wherever and whenever it is computed (after the rebuild too, by the
 * run), so a fact can compute its own key. Integers are compact: the
 * primary-key index over 100,000 keys, 2.3 MB against 7.8 MB. But numbered
 * by row_number() on every rebuild, the keys shift when customer 12
 * arrives: Monday's order, loaded with Acme's 3, reads back on Tuesday as
 * Umbrella's. Then the pick: hashes for projects that rebuild often, and a
 * uniqueness test either way.
 */
export const HashScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hash").from;
  const qAt = n.word("hash", "Question five");
  const textAt = n.word("hash", "What are the trade-offs");
  const detAt = n.word("hash", "A hash of the natural key is deterministic");
  const md5At = n.word("hash", "The MD5 of forty-two");
  const devAt = n.word("hash", "in development");
  const prodAt = n.word("hash", "in production");
  const rebuildAt = n.word("hash", "in tomorrow's rebuild");
  const lookupAt = n.word("hash", "without a lookup");
  const intAt = n.word("hash-size", "a hundred thousand integer keys");
  const thirdAt = n.word("hash-size", "under a third the size");
  const hashesAt = n.word("hash-size", "the same number of hashes");
  const trapAt = n.word("hash-trap", "But an integer has to be handed out once");
  const keptAt = n.word("hash-trap", "by one counter, and kept");
  const numberAt = n.word("hash-trap", "Number the rows with row number");
  const newAt = n.word("hash-trap", "a new customer with a lower ID");
  const shiftsAt = n.word("hash-trap", "shifts every key after it");
  const mondayAt = n.word("hash-trap", "On Monday, Acme was key three");
  const tuesdayAt = n.word("hash-trap", "On Tuesday, three is Umbrella");
  const theirsAt = n.word("hash-trap", "Monday's order reads as theirs");
  const suitAt = n.word("hash-pick", "So hashes suit projects that rebuild often");
  const dbtAt = n.word("hash-pick", "they're common in dbt");
  const collideAt = n.word("hash-pick", "They can collide, rarely");
  const testAt = n.word("hash-pick", "so test the key for uniqueness");
  const end = n.beat("hash-pick").to;

  // ── The two queries ──
  const hashL = HASH.hash.lines;
  const seqL = HASH.seqBefore.lines;
  const listTop = y(LIST_Y);
  const leftOut = trapAt - 2;
  const after42 = HASH.hashAfter.rows.find((r) => r[1] === "42")![0];
  const same = [
    { label: "Development", value: HASH.md5, at: devAt },
    { label: "Production", value: HASH.md5, at: prodAt },
    { label: "Tomorrow's rebuild", value: after42, at: rebuildAt },
  ];
  const sameTop = listTop + listingHeight(hashL.length, SIZE) + h(34);
  const barsTop = listTop + listingHeight(seqL.length, SIZE) + h(60);
  const { integer, md5 } = HASH.index;
  if (integer / md5 >= 1 / 3) throw new Error("the integer index is not under a third of the hash index");

  // ── The renumbering ──
  const mon = HASH.seqBefore;
  const tue = HASH.seqAfter;
  const mg = geoOf(mon, X0, y(LIST_Y), h, ROWS);
  const tg = geoOf(tue, X0, y(566), h, ROWS);
  const fact = HASH.factMonday;
  const fg = geoOf(fact, RIGHT_X, y(606), h, ROWS);
  const bad = HASH.misread;
  const bg = geoOf(bad, RIGHT_X, y(746), h, ROWS);
  const sk = mon.cols.indexOf("customer_sk");
  const id = mon.cols.indexOf("customer_id");
  const factKey = fact.rows[0][fact.cols.indexOf("customer_sk")];
  const acmeMon = mon.rows.findIndex((r) => r[id] === "42");
  const sameKeyTue = tue.rows.findIndex((r) => r[sk] === factKey);
  const newRow = tue.rows.findIndex((r) => !mon.rows.some((m) => m[id] === r[id]));
  if (mon.rows[acmeMon][sk] !== factKey) throw new Error("Monday's order carries Acme's key");
  if (tue.rows[sameKeyTue][2] !== bad.rows[0][1]) throw new Error("the misread names Tuesday's holder of the key");

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={md5At + 4} level={-31} />
      {same.map((s) => (
        <Sfx key={s.label} name="el-tap" at={s.at} level={-32} />
      ))}
      <Sfx name="el-pop" at={intAt} level={-31} />
      <Sfx name="el-pop" at={hashesAt} level={-31} />
      <Sfx name="el-whoosh" at={trapAt} level={-35} />
      <Sfx name="el-pencil" at={numberAt + 4} level={-36} />
      <Sfx name="el-tap" at={newAt + 2} level={-29} />
      <Sfx name="el-sprinkle" at={shiftsAt + 2} level={-34} />
      <Sfx name="el-pencil" at={mondayAt + 8} level={-35} />
      <Sfx name="el-pencil" at={tuesdayAt + 8} level={-35} />
      <Sfx name="el-scratch" at={theirsAt + 4} level={-34} />
      <Sfx name="el-chime" at={testAt + 6} level={-35} />

      <Drift from={from} to={end + 30} scale={0.015}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} size={56}>
          What are the trade-offs of using a hash surrogate key vs. a sequence integer?
        </QuestionCard>

        {/* ── A hash: the same string anywhere, any day ── */}
        <Caption at={detAt - 4} x={X0} y={listTop - h(40)} out={leftOut}>
          Hash of the natural key
        </Caption>
        <Listing
          lines={hashL}
          x={X0}
          top={listTop}
          size={SIZE}
          at={detAt - 4}
          out={leftOut}
          marks={[{ line: "md5(customer_id::TEXT)", text: "md5(customer_id::TEXT)", at: detAt + 8 }]}
        />
        {same.map((s, i) => (
          <Note key={s.label} at={s.at} x={X0} y={sameTop + i * h(46)} out={leftOut}>
            <span style={{ display: "flex", alignItems: "baseline", gap: 18, fontSize: 22, whiteSpace: "nowrap" }}>
              <span style={{ ...note(22, INK_SOFT), width: 210 }}>{s.label}</span>
              <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 500, color: BLUE_INK, fontVariantLigatures: "none" }}>{s.value}</span>
            </span>
          </Note>
        ))}
        <Note at={lookupAt - 4} x={X0} y={sameTop + 3 * h(46) + h(16)} out={leftOut}>
          <span style={{ ...note(24, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>A fact computes its key: no lookup</span>
        </Note>

        {/* ── A sequence integer: compact ── */}
        <Caption at={detAt + 4} x={RIGHT_X} y={listTop - h(40)} out={suitAt - 4}>
          Sequence integer, numbered in order
        </Caption>
        <Listing
          lines={seqL}
          x={RIGHT_X}
          top={listTop}
          size={SIZE}
          at={detAt + 4}
          out={suitAt - 4}
          marks={[{ line: "row_number()", text: "row_number() OVER (ORDER BY customer_id)", at: numberAt + 2 }]}
        />
        <Bar
          x={RIGHT_X}
          y={barsTop}
          width={560}
          max={md5}
          at={intAt}
          out={leftOut}
          label="Primary-key index, 100,000 integer keys"
          shown={mb(integer)}
          segments={[{ value: integer, color: BAR_BLUE }]}
        />
        <Bar
          x={RIGHT_X}
          y={barsTop + h(92)}
          width={560}
          max={md5}
          at={hashesAt}
          out={leftOut}
          label="The same 100,000 as md5 hashes"
          shown={mb(md5)}
          segments={[{ value: md5, color: BAR_BLUE }]}
        />
        <Note at={thirdAt} x={RIGHT_X} y={barsTop + h(196)} out={leftOut}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>Under a third the size</span>
        </Note>

        {/* ── The trap: renumbered on every rebuild ── */}
        <Note at={keptAt} x={RIGHT_X} y={listTop + listingHeight(seqL.length, SIZE) + h(22)} out={suitAt - 4}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            Handed out once, by one counter, <b>and kept</b>
          </span>
        </Note>
        <TableName g={mg} at={numberAt + 4}>
          Monday&apos;s build
        </TableName>
        <DataTable
          g={mg}
          cols={colsOf(mon)}
          at={numberAt + 4}
          rows={mon.rows.map((cells, i) => ({ cells, at: numberAt + 8 + i * 3 }))}
          marks={[{ row: acmeMon, col: sk, at: mondayAt + 4, color: MARK_KEY }]}
        />
        <TableName g={tg} at={newAt}>
          Tuesday&apos;s rebuild, customer {tue.rows[newRow][id]} arrived
        </TableName>
        <DataTable
          g={tg}
          cols={colsOf(tue)}
          at={newAt}
          rows={tue.rows.map((cells, i) => ({ cells, at: newAt + 4 + i * 3 }))}
          marks={[
            { row: newRow, col: id, at: newAt + 10 },
            ...tue.rows.map((_, row) => row).filter((row) => row !== newRow).map((row, k) => ({ row, col: sk, at: shiftsAt + 2 + k * 4, out: tuesdayAt, color: MARK })),
            { row: sameKeyTue, col: sk, at: tuesdayAt + 4, color: MARK_BAD },
            { row: sameKeyTue, col: 2, at: tuesdayAt + 8, color: MARK_BAD },
          ]}
        />
        <TableName g={fg} at={mondayAt}>
          Monday&apos;s order, loaded with key {factKey}
        </TableName>
        <DataTable
          g={fg}
          cols={colsOf(fact)}
          at={mondayAt}
          rows={fact.rows.map((cells) => ({ cells, at: mondayAt + 4 }))}
          marks={[{ row: 0, col: fact.cols.indexOf("customer_sk"), at: mondayAt + 6, color: MARK_KEY }]}
        />
        <KeyArrow from={[fg.x - 12, fg.rowMid(0)]} to={[mg.right + 12, mg.rowMid(acmeMon)]} at={mondayAt + 8} color={KEY} />
        <KeyArrow from={[fg.x - 12, fg.rowMid(0)]} to={[tg.right + 12, tg.rowMid(sameKeyTue)]} at={tuesdayAt + 8} color={ACCENT} />
        <TableName g={bg} at={theirsAt}>
          The same order, read on Tuesday
        </TableName>
        <DataTable
          g={bg}
          cols={colsOf(bad)}
          at={theirsAt}
          rows={bad.rows.map((cells) => ({ cells, at: theirsAt + 4 }))}
          marks={[{ row: 0, col: bad.cols.indexOf("customer_name"), at: theirsAt + 8, color: MARK_BAD }]}
        />

        {/* ── The pick ── */}
        <Note at={suitAt + 4} x={RIGHT_X} y={listTop + h(10)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: OK_INK }}>Hashes</b> suit rebuilding often, in many environments
            <br />
            <span style={{ color: INK_SOFT, opacity: ease(frame, dbtAt, 10) }}>and are common in dbt</span>
          </span>
        </Note>
        <div
          style={{
            position: "absolute",
            left: RIGHT_X,
            top: listTop + h(112),
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 25,
            whiteSpace: "nowrap",
            opacity: ease(frame, collideAt, 12),
          }}
        >
          <span style={{ ...note(25, INK) }}>
            They can <span style={{ color: ACCENT_INK }}>collide</span>, rarely, so either way
          </span>
          <span style={{ opacity: ease(frame, testAt, 10), transform: `scale(${0.85 + 0.15 * ease(frame, testAt, 10)})` }}>
            <OutlineBadge tone="green" size={24} style={{ fontFamily: SANS }}>
              test: <Mono>unique</Mono>
            </OutlineBadge>
          </span>
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
