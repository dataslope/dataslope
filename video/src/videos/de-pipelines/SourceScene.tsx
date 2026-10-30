import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { SRC, splitError } from "./data";
import { type Col, colsOf, DataTable, Drift, ErrorBox, geoOf, Listing, MARK, MARK_OK, OK, OK_INK, TableName, X0 } from "./parts";

const TOP = 340;
const CLEAN_X = 800;
const LIST_Y = 610;
const LIST_X = 120;
const DEF_X = 1260;

/** One defense, numbered in the right answer's green. */
const Defense: React.FC<{ at: number; n: number; y: number; children: React.ReactNode }> = ({ at, n, y, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", left: DEF_X, top: y, display: "flex", gap: 16, alignItems: "flex-start", opacity: p, transform: `translateX(${(1 - p) * -16}px)` }}>
      <span
        style={{
          flex: "none",
          width: 38,
          height: 38,
          borderRadius: 19,
          background: OK,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...label(21, PAPER),
          fontWeight: 800,
        }}
      >
        {n}
      </span>
      <span style={{ ...note(24, INK), lineHeight: 1.35, whiteSpace: "nowrap" }}>{children}</span>
    </div>
  );
};

/**
 * Question 6. The source table gains a coupon column; a job that inserts
 * SELECT * into a fixed three-column table fails in DuckDB ("3 columns but 4
 * values"); naming the columns loads all three rows and ignores the new one.
 * Then the page's other three defenses, numbered on the right.
 */
export const SourceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("src").from;
  const qAt = n.word("src", "Question six");
  const textAt = n.word("src", "How do you handle schema changes");
  const hereAt = n.word("src", "Here the source");
  const addsAt = n.word("src", "adds a coupon column");
  const jobAt = n.word("src", "a job inserting select star");
  const fixedAt = n.word("src", "into a fixed table");
  const stopsAt = n.word("src", "stops");
  const countAt = n.word("src", "three columns, four values");
  const nameAt = n.word("src-name", "Name the columns you need");
  const ignoredAt = n.word("src-name", "the new one is ignored");
  const landAt = n.word("src-more", "land raw data in a schema-on-read layer");
  const neverAt = n.word("src-more", "so ingestion never breaks");
  const registryAt = n.word("src-more", "Give streaming sources a schema registry");
  const validateAt = n.word("src-more", "validate the schema at ingestion");
  const haltAt = n.word("src-more", "alert and halt on a breaking change");
  const end = n.beat("src-more").to;

  const top = y(TOP);
  const raw = SRC.raw;
  const rg = geoOf(raw, X0, top, h, { bodySize: 23 });
  const rawCols: Col[] = colsOf(raw).map((c) => (c.name === "coupon" ? { ...c, at: addsAt + 4 } : c));
  const cg = geoOf(SRC.clean, CLEAN_X, top, h, { bodySize: 23 });
  const listTop = y(LIST_Y);
  const star = SRC.starSql.split("\n");
  const named = SRC.namedSql.split("\n");
  const { kind, message } = splitError(SRC.starError);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={addsAt + 4} level={-35} />
      <Sfx name="el-pencil" at={jobAt} level={-36} />
      <Sfx name="el-scratch" at={stopsAt + 2} level={-34} />
      <Sfx name="el-pencil" at={nameAt} level={-36} />
      <Sfx name="el-tap" at={nameAt + 14} level={-35} />
      {[nameAt, landAt, registryAt, validateAt].map((at) => (
        <Sfx key={at} name="el-tap" at={at + 2} level={-37} />
      ))}

      <Drift from={from} to={end + 30}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} size={58}>
          How do you handle schema changes from source systems without breaking downstream?
        </QuestionCard>

        {/* The source, which gains a column. */}
        <TableName g={rg} at={hereAt}>
          <span style={{ fontFamily: MONO }}>orders_raw</span>, the source
        </TableName>
        <DataTable
          g={rg}
          cols={rawCols}
          at={hereAt}
          rows={raw.rows.map((cells, i) => ({ cells, at: i < 2 ? hereAt + 4 + i * 3 : addsAt + 8, grow: i === 2 }))}
          marks={[{ row: 2, col: raw.cols.indexOf("coupon"), at: addsAt + 14, out: nameAt, color: MARK }]}
        />

        {/* The fixed downstream table: its three columns, then the rows that load. */}
        <TableName g={cg} at={fixedAt}>
          <span style={{ fontFamily: MONO }}>orders_clean</span>, fixed at three columns
        </TableName>
        <DataTable g={cg} cols={colsOf(SRC.clean)} at={fixedAt} rows={SRC.clean.rows.map((cells, i) => ({ cells, at: nameAt + 16 + i * 4 }))} />

        {/* SELECT *, then the columns named. */}
        <Listing lines={star} x={LIST_X} top={listTop} width={600} size={23} at={jobAt} out={nameAt - 2} />
        <ErrorBox x={LIST_X} top={listTop + h(118)} width={1020} at={stopsAt} kind={kind} message={message} markAt={countAt} out={nameAt - 2} />
        <Listing lines={named} x={LIST_X} top={listTop} width={600} size={23} at={nameAt} marks={[{ line: 1, at: nameAt + 6, color: MARK_OK }]} />
        <Note at={ignoredAt} x={LIST_X + 640} y={listTop + h(40)}>
          <span style={{ ...note(25, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            loads; <span style={{ fontFamily: MONO }}>coupon</span> is ignored
          </span>
        </Note>

        {/* The defenses. */}
        <Note at={nameAt} x={DEF_X} y={top - 40}>
          <span style={{ ...label(22, OK_INK), fontWeight: 750, whiteSpace: "nowrap" }}>What keeps downstream whole</span>
        </Note>
        <Defense at={nameAt + 4} n={1} y={top + h(4)}>
          Name the columns;
          <br />
          never <span style={{ fontFamily: MONO, fontSize: 22 }}>SELECT *</span>
        </Defense>
        <Defense at={landAt} n={2} y={top + h(110)}>
          Land raw data schema-on-read
          <br />
          <span style={{ color: INK_SOFT, opacity: ease(frame, neverAt, 10) }}>so ingestion never breaks</span>
        </Defense>
        <Defense at={registryAt} n={3} y={top + h(216)}>
          Streaming sources: a schema
          <br />
          registry, compatibility enforced
        </Defense>
        <Defense at={validateAt} n={4} y={top + h(322)}>
          Validate at ingestion
          <br />
          <span style={{ opacity: ease(frame, haltAt, 10) }}>alert and halt on a breaking change</span>
        </Defense>
      </Drift>
    </AbsoluteFill>
  );
};
