import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK, label, TABULAR } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { JT } from "./data";
import {
  Caption,
  DbTable,
  Drift,
  ErrorBox,
  HEAD_H,
  Head,
  KEY,
  KEY_INK,
  Kicker,
  Listing,
  listingHeight,
  MARK,
  MARK_BAD,
  MARK_KEY,
  MARK_OK,
  OK_INK,
  Reply,
  Svg,
  tableGeometry,
} from "./parts";

const TABLE_Y = 410;
const LIST_X = 860;
const LIST_W = 900;
const LIST_SIZE = 24;
/** Seven rows (four shown, the rows left out, Linus's twice) fit under the
 *  headline at this height (before `h()`). */
const TABLE_ROW_H = 52;

/**
 * Part 3 opens: in a junction table the pair of foreign keys is the primary
 * key, so the lesson's challenge (enroll Linus in Math) goes in once, and is
 * refused the second time.
 */
export const PairScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const from = n.beat("pair").from;
  const pairAt = n.word("pair", "pair of keys");
  const identityAt = n.word("pair", "identity");
  const studentAt = n.word("pair", "student");
  const courseAt = n.word("pair", "course");
  const pkAt = n.word("pair", "primary key");
  const enrollAt = n.word("once", "Enroll Linus");
  const mathAt = n.word("once", "Math");
  const rowAt = n.word("once", "row forty-nine");
  const againAt = n.word("once", "Try it again");
  const noAt = n.word("once", "says no");
  const existsAt = n.word("once", "already exists");

  const g = tableGeometry({
    x: 120,
    top: y(TABLE_Y),
    cols: JT.rowCols,
    rows: [...JT.rows, JT.linusRow],
    headH: h(HEAD_H),
    rowH: h(TABLE_ROW_H),
  });
  // The rows the table leaves out, between the four shown and Linus's.
  const elided = JT.rows.length;
  const linus = elided + 1;
  const listTop = y(TABLE_Y);
  const listH = listingHeight(JT.insertSql.length, LIST_SIZE);
  const lineAt = JT.insertSql.map((_, i) => enrollAt - 2 + i * 4);

  // The brace over the two key columns.
  const braceIn = ease(frame, pkAt - 2, 14);
  const bx0 = g.xs[0] + 8;
  const bx1 = g.xs[1] + g.widths[1] - 8;
  const by = g.top - 14;
  const mid = (bx0 + bx1) / 2;
  const count = frame >= rowAt ? JT.after : JT.before;

  return (
    <AbsoluteFill>
      {/* ── Sound: the brace, the listing, the new row, the refusal ── */}
      <Sfx name="el-pencil" at={pkAt - 2} level={-34} />
      <Sfx name="el-tap" at={enrollAt} level={-30} />
      <Sfx name="el-pop" at={rowAt} level={-29} />
      <Sfx name="el-tap" at={againAt} level={-30} />
      <Sfx name="el-scratch" at={noAt} level={-30} />

      <Kicker at={from - 10}>Junction tables</Kicker>
      <Head lead="The pair is the key," leadAt={from - 6} turn="so it fits once." turnAt={existsAt - 4} />

      <Drift from={from} to={existsAt + 60} scale={0.016} origin={[960, y(600)]}>
        {/* ── The table, its two key columns braced as one key ── */}
        {braceIn > 0 ? (
          <Svg opacity={braceIn}>
            <path
              d={`M${bx0},${by + 10} L${bx0},${by} L${bx1},${by} L${bx1},${by + 10}`}
              fill="none"
              stroke={KEY}
              strokeWidth={2.4}
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray={`${braceIn} 1`}
            />
          </Svg>
        ) : null}
        <Ink at={pkAt} dur={14} style={{ left: mid, top: by - 44, whiteSpace: "nowrap" }}>
          <span style={{ ...label(22, KEY_INK), fontWeight: 700, display: "inline-block", transform: "translateX(-50%)" }}>
            primary key
          </span>
        </Ink>
        <Caption at={from - 2} x={g.x} y={g.top - 100}>
          enrollments
        </Caption>
        <DbTable
          g={g}
          cols={JT.rowCols}
          rows={[
            ...JT.rows.map((cells, i) => ({ cells, at: from + 2 + i * 4 })),
            { cells: [], note: `… ${JT.before - JT.rows.length} more rows`, at: from + 2 + elided * 4 },
            { cells: JT.linusRow, at: rowAt - 2, grow: true },
            { cells: JT.linusRow, at: againAt + 8, grow: true, ghostAt: noAt, strikeAt: existsAt + 6 },
          ]}
          at={from - 2}
          numeric={[0, 1]}
          colInk={{ 0: KEY_INK, 1: KEY_INK }}
          headMarks={[
            { col: 0, at: pairAt, color: MARK_KEY },
            { col: 1, at: pairAt + 5, color: MARK_KEY },
          ]}
          marks={[
            ...JT.rows.flatMap((_, i) => [
              { row: i, col: 0, at: studentAt + i * 2, out: pkAt + 20, color: MARK },
              { row: i, col: 1, at: courseAt + i * 2, out: pkAt + 20, color: MARK },
            ]),
            { row: linus + 1, col: 0, at: noAt + 4, color: MARK_BAD },
            { row: linus + 1, col: 1, at: noAt + 4, color: MARK_BAD },
          ]}
          bands={[{ row: linus, at: rowAt + 4, color: MARK_OK }]}
        />
        <Ink at={identityAt} dur={14} style={{ left: g.x, top: g.rowTop(linus + 2) + 22, whiteSpace: "nowrap" }}>
          <span style={{ ...label(22, frame >= rowAt ? OK_INK : INK), fontWeight: 600 }}>
            <span style={TABULAR}>{count}</span> rows in all
          </span>
        </Ink>

        {/* ── The lesson's challenge, run twice ── */}
        <Caption at={enrollAt - 6} x={LIST_X} y={listTop - 48}>
          Enroll Linus in Math
        </Caption>
        <Listing
          lines={JT.insertSql}
          x={LIST_X}
          top={listTop}
          width={LIST_W}
          size={LIST_SIZE}
          at={enrollAt - 6}
          lineAt={lineAt}
          marks={[
            { line: JT.insertSql.length - 1, at: mathAt, out: rowAt, color: MARK },
            { line: JT.insertSql.length - 1, at: againAt, color: MARK_BAD },
          ]}
        />
        <Reply x={LIST_X} y={listTop + listH + 20} at={rowAt} text={JT.insertTag}>
          the first time
        </Reply>
        <ErrorBox
          x={LIST_X}
          top={listTop + listH + 84}
          width={LIST_W}
          at={noAt}
          message={JT.again.message}
          detail={JT.again.detail ?? ""}
          detailMark={existsAt}
        />
        <Ink at={noAt + 10} dur={12} style={{ left: LIST_X, top: listTop + listH + 220, whiteSpace: "nowrap" }}>
          <span style={{ ...label(22, ACCENT_INK), fontWeight: 600 }}>the second time: still {JT.againCount} rows</span>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
