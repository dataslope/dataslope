import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, INK, INK_SOFT, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { DEDUP } from "./data";
import {
  colsOf,
  Console,
  DataTable,
  Drift,
  geoOf,
  lineOf,
  Listing,
  listingHeight,
  Mark,
  MARK,
  MARK_OK,
  OK_INK,
  TableName,
  Title,
  X0,
} from "./parts";
import { Mono } from "./mono";

const TOP = 330;
const SIZE = 21;
const MID_X = 560;
const RIGHT_X = 1360;

/**
 * Questions 7 and 8, on the page's own rows. The page's set of seen user_ids
 * walks the four records, skips user 1's second and prints [1, 2, 3]; the
 * challenge's dict keeps the latest instead ({1: 'b', 2: 'c'}). Then pandas:
 * sort by ts, drop duplicates on id keeping the last, and id 1 keeps b from
 * ts 20, the pandas form of ROW_NUMBER() = 1; and the tiebreaker.
 */
export const DedupScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("dedup").from;
  const qAt = n.word("dedup", "Question seven");
  const textAt = n.word("dedup", "How do you deduplicate");
  const asked = n.beat("dedup").to;
  const passAt = n.word("dedup-set", "One pass");
  const seenAt = n.word("dedup-set", "a set of the keys you've seen");
  const skippedAt = n.word("dedup-set", "User one's second record is skipped");
  const keptAt = n.word("dedup-set", "each user's first is kept");
  const orderAt = n.word("dedup-set", "in order: one, two, three");
  const latestAt = n.word("dedup-dict", "To keep the latest instead");
  const mapAt = n.word("dedup-dict", "map each key to a record in a dict");
  const replaceAt = n.word("dedup-dict", "replace it when a later timestamp arrives");
  const q8At = n.word("latest", "Question eight");
  const q8TextAt = n.word("latest", "How do you keep only");
  const sortAt = n.word("latest-sort", "Sort by timestamp");
  const dropAt = n.word("latest-sort", "drop duplicates on the key");
  const lastAt = n.word("latest-sort", "keep the last");
  const keepsAt = n.word("latest-sort", "ID one keeps b");
  const sqlAt = n.word("latest-sort", "the pandas version of row number equals one");
  const tieAt = n.word("latest-tie", "If two rows can share a timestamp");
  const breakAt = n.word("latest-tie", "add a tiebreaker to the sort");
  const arbitraryAt = n.word("latest-tie", "the row you keep is arbitrary");
  const end = n.beat("join-in").to;
  const out7 = latestAt - 4;
  // The dict answer stays until question 8's text writes in, and pandas'
  // frame takes its place then, so the page is never empty between them.
  const outDict = q8TextAt - 4;

  // ── 7. The page's records, walked once ──
  const R = DEDUP.records;
  const rg = geoOf(R, X0, y(TOP), h, { rowH: 54 });
  const F = DEDUP.first.lines;
  // The walk: each record in turn, one every 10 frames from "One pass".
  const walkFrom = seenAt + 6;
  const walkK = frame < walkFrom ? -1 : Math.min(R.rows.length - 1, Math.floor((frame - walkFrom) / 10));
  const uid = R.cols.indexOf("user_id");
  const seenIds: string[] = [];
  R.rows.forEach((r, i) => {
    if (i <= walkK && !seenIds.includes(r[uid])) seenIds.push(r[uid]);
  });
  const dupRow = R.rows.findIndex((r, i) => R.rows.slice(0, i).some((q) => q[uid] === r[uid]));

  // ── The latest: plain records for the dict, the page's frame for pandas ──
  const RR = DEDUP.rows;
  const rrg = geoOf(RR, X0, y(TOP), h, { rowH: 54 });
  const rts = RR.cols.indexOf("ts");
  const D = DEDUP.frame;
  const dg = geoOf(D, X0, y(TOP), h, { rowH: 54 });
  const DL = DEDUP.dict.lines;
  const LT = DEDUP.latest;
  const lg = geoOf(LT, RIGHT_X, y(TOP), h, { rowH: 54 });
  const ts = D.cols.indexOf("ts");
  const idc = D.cols.indexOf("id");
  const older = D.rows.findIndex((r, i) => D.rows.some((q, j) => j !== i && q[idc] === r[idc] && Number(q[ts]) > Number(r[ts])));
  const newer = D.rows.findIndex((r, i) => i !== older && r[idc] === D.rows[older][idc]);
  const LL = LT.lines;
  const llH = listingHeight(LL.length, SIZE);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={walkFrom + 2} level={-36} />
      <Sfx name="el-scratch" at={skippedAt + 4} level={-33} />
      <Sfx name="el-pop" at={orderAt + 4} level={-34} />
      <Sfx name="el-pencil" at={mapAt} level={-36} />
      <Sfx name="el-tap" at={sortAt + 4} level={-35} />
      <Sfx name="el-pop" at={keepsAt} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={7} at={qAt - 4} textAt={textAt - 4} out={q8At - 4} size={60}>
          How do you deduplicate records in memory?
        </QuestionCard>
        <QuestionCard n={8} at={q8At} textAt={q8TextAt - 2} size={60}>
          How do you keep only the latest record per key in pandas?
        </QuestionCard>

        {/* ── 7. The first per user, with a set ── */}
        <TableName g={rg} at={asked - 6} out={out7}>
          <span style={{ fontFamily: MONO, fontWeight: 500 }}>records</span>
        </TableName>
        <DataTable
          g={rg}
          cols={colsOf(R, { user_id: { ink: BLUE_INK } })}
          at={asked - 6}
          out={out7}
          rows={R.rows.map((cells, i) => ({ cells, at: asked - 2 + i * 2, dimAt: i === dupRow ? skippedAt + 2 : undefined }))}
          bands={R.rows.map((_, row) => ({
            row,
            at: walkFrom + row * 10,
            out: walkFrom + row * 10 + 10,
            color: MARK,
          }))}
        />
        <Listing
          lines={F}
          x={MID_X}
          top={y(TOP)}
          width={660}
          size={SIZE}
          at={passAt - 2}
          out={out7}
          marks={[
            { line: lineOf(F, "seen = set()"), at: seenAt },
            { line: lineOf(F, "not in seen"), at: skippedAt, out: keptAt },
            { line: lineOf(F, "deduped.append"), at: keptAt, color: MARK_OK },
          ]}
        />
        <Note at={seenAt + 2} x={RIGHT_X} y={y(TOP) + h(4)} out={out7}>
          <span style={{ ...note(30, INK), whiteSpace: "nowrap", fontFamily: MONO }}>
            seen = {"{"}
            {seenIds.map((id, i) => (
              <span key={id} style={{ color: BLUE_INK }}>
                {i ? ", " : ""}
                {id}
              </span>
            ))}
            {"}"}
          </span>
        </Note>
        <Console lines={DEDUP.first.out} x={RIGHT_X} top={y(TOP) + h(80)} width={300} at={orderAt - 4} out={out7} marks={[{ line: 0, at: orderAt + 4, color: MARK_OK }]} />
        <Note at={keptAt} x={RIGHT_X} y={y(TOP) + h(160)} out={out7}>
          <span style={{ ...note(24, OK_INK), whiteSpace: "nowrap" }}>The first of each, in order</span>
        </Note>

        {/* ── The latest instead: plain records, and a dict ── */}
        <TableName g={rrg} at={latestAt} out={outDict}>
          <Mono>rows</Mono>
        </TableName>
        <DataTable
          g={rrg}
          cols={colsOf(RR, { id: { ink: BLUE_INK } })}
          at={latestAt}
          out={outDict}
          rows={RR.rows.map((cells, i) => ({ cells, at: latestAt + 4 + i * 2 }))}
          marks={[
            { row: older, col: rts, at: replaceAt },
            { row: newer, col: rts, at: replaceAt + 6, color: MARK_OK },
          ]}
        />

        {/* ── 8. The page's frame, for pandas ── */}
        <TableName g={dg} at={q8TextAt}>
          <Mono>df</Mono>
        </TableName>
        <DataTable
          g={dg}
          cols={colsOf(D, { id: { ink: BLUE_INK } })}
          at={q8TextAt}
          rows={D.rows.map((cells, i) => ({
            cells,
            at: q8TextAt + 4 + i * 2,
            dimAt: i === older ? keepsAt + 4 : undefined,
          }))}
          marks={[
            { row: newer, col: ts, at: lastAt, color: MARK_OK },
            { row: newer, col: D.cols.indexOf("value"), at: keepsAt, color: MARK_OK },
          ]}
        />
        <Listing
          lines={DL}
          x={MID_X}
          top={y(TOP)}
          width={870}
          size={SIZE}
          at={mapAt - 4}
          out={outDict}
          marks={[
            { line: lineOf(DL, "latest = {}"), at: mapAt + 4, out: replaceAt },
            { line: lineOf(DL, '> latest[r["id"]]["ts"]'), at: replaceAt, color: MARK_OK },
          ]}
        />
        <Console
          lines={DEDUP.dict.out}
          x={MID_X}
          top={y(TOP) + listingHeight(DL.length, SIZE) + h(16)}
          width={360}
          at={replaceAt + 10}
          out={outDict}
        />

        {/* ── 8. pandas ── */}
        <Listing
          lines={LL}
          x={MID_X}
          top={y(TOP)}
          width={680}
          size={SIZE}
          at={q8TextAt + 4}
          marks={[
            { line: lineOf(LL, 'sort_values("ts")'), at: sortAt, out: dropAt },
            { line: lineOf(LL, "drop_duplicates"), at: dropAt, color: MARK_OK },
          ]}
        />
        <TableName g={lg} at={lastAt}>
          <Mono>latest</Mono>
        </TableName>
        <DataTable
          g={lg}
          cols={colsOf(LT, { id: { ink: BLUE_INK } })}
          at={lastAt}
          rows={LT.rows.map((cells, i) => ({ cells, at: lastAt + 4 + i * 3 }))}
          marks={[{ row: 0, col: LT.cols.indexOf("value"), at: keepsAt + 4, color: MARK_OK }]}
        />
        <Note at={sqlAt} x={MID_X} y={y(TOP) + llH + h(22)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            The pandas <Mono>ROW_NUMBER() = 1</Mono> <span style={{ color: INK_SOFT }}>of SQL</span>
          </span>
        </Note>
        <Note at={tieAt} x={MID_X} y={y(TOP) + llH + h(90)}>
          <Title>A tie on ts?</Title>
        </Note>
        <Note at={breakAt} x={MID_X} y={y(TOP) + llH + h(134)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <Mark at={breakAt + 6} color={MARK_OK}>Add a tiebreaker column to the sort</Mark>
            <span style={{ color: INK_SOFT, opacity: ease(frame, arbitraryAt - 4, 10) }}>, or the row kept is arbitrary</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
