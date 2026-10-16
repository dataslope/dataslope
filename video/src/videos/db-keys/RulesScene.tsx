import React from "react";
import { AbsoluteFill } from "remotion";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { DUPLICATE } from "./data";
import {
  DataTable,
  Drift,
  ErrorBox,
  Headline,
  KEY_INK,
  Listing,
  listingHeight,
  MARK_BAD,
  MARK_KEY,
  Mark,
  Mono,
  RIGHT,
  TableName,
  tableGeometry,
  X0,
} from "./parts";

const TABLE_Y = 430;
const HEAD_H = 46;
const ROW_H = 56;
const RIGHT_X = 700;
const SIZE = 24;
const FIRST_Y = 352;
const SECOND_Y = 604;

/**
 * The key's two rules, as the lesson's block shows them: Ada is customer 1;
 * Grace as customer 1 is refused (unique), and Grace with no id is refused
 * (not null). The table keeps one row, so customer 1 names exactly one.
 */
export const RulesScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const from = n.beat("rules").from;
  const uniqueAt = n.word("rules", "unique");
  const neverAt = n.word("rules", "never null");
  const adaAt = n.word("dup", "Ada");
  const graceAt = n.word("dup", "Grace");
  const refusedAt = n.word("dup", "refused");
  const keyAt = n.word("dup", "Key one");
  const leaveAt = n.word("null", "Leave");
  const offAt = n.word("null", "off");
  const againAt = n.word("null", "Refused again");
  const pointerAt = n.word("null", "No pointer");
  const maybeAt = n.word("null", "maybe this one");
  const end = n.beat("null").to;

  const cols = [
    { name: "customer_id", numeric: true, ink: KEY_INK, tag: { text: "PK", at: from + 4 } },
    { name: "name" },
  ];
  // Ada, then the two rows Postgres refused, as each statement tried them.
  const tried = [DUPLICATE.before.rows[0], ...DUPLICATE.tried];
  const g = tableGeometry({ x: X0, top: y(TABLE_Y), cols, rows: tried, headH: h(HEAD_H), rowH: h(ROW_H) });
  const errW = RIGHT - RIGHT_X;
  const listH = listingHeight(1, SIZE);

  return (
    <AbsoluteFill>
      {/* ── Sound: Ada, each refused row and its error, the struck rows ── */}
      <Sfx name="el-tap" at={adaAt - 2} level={-28} />
      <Sfx name="el-pop" at={graceAt} level={-30} />
      <Sfx name="el-scratch" at={refusedAt + 2} level={-30} />
      <Sfx name="el-pop" at={offAt - 2} level={-30} />
      <Sfx name="el-scratch" at={againAt + 2} level={-30} />
      <Sfx name="el-pencil" at={pointerAt + 6} level={-34} />

      <Drift from={from} to={end + 50}>
        <Headline lead="Unique," turn="and never null." at={uniqueAt - 6} turnAt={neverAt - 4} />

        <TableName g={g} at={from - 2}>
          customers
        </TableName>
        <DataTable
          g={g}
          cols={cols}
          at={from - 2}
          rows={[
            { cells: tried[0], at: adaAt - 4 },
            { cells: tried[1], at: graceAt, ghost: true, grow: true, strikeAt: refusedAt + 2, collapseAt: pointerAt - 2 },
            { cells: tried[2], at: offAt - 2, ghost: true, grow: true, strikeAt: againAt + 2, collapseAt: pointerAt + 2 },
          ]}
          marks={[
            { row: 1, col: 0, at: graceAt + 6, out: pointerAt, color: MARK_BAD },
            { row: 2, col: 0, at: offAt + 4, out: pointerAt, color: MARK_BAD },
            { row: 0, col: 0, at: pointerAt + 10, color: MARK_KEY },
          ]}
        />

        {/* ── The two statements and Postgres's answers ── */}
        <Listing lines={DUPLICATE.same.lines} x={RIGHT_X} top={y(FIRST_Y)} width={errW} size={SIZE} at={graceAt - 6} dim={leaveAt} />
        <ErrorBox
          x={RIGHT_X}
          top={y(FIRST_Y) + listH + 18}
          width={errW}
          at={refusedAt}
          message={DUPLICATE.same.message}
          detail={DUPLICATE.same.detail}
          mark={{ text: DUPLICATE.same.detail, at: keyAt }}
          dim={leaveAt}
        />
        <Listing lines={DUPLICATE.none.lines} x={RIGHT_X} top={y(SECOND_Y)} width={errW} size={SIZE} at={leaveAt - 4} />
        <ErrorBox
          x={RIGHT_X}
          top={y(SECOND_Y) + listH + 18}
          width={errW}
          at={againAt}
          message={DUPLICATE.none.message}
          detail={DUPLICATE.none.detail}
        />

        {/* What the rules buy: customer 1 names exactly one row. */}
        <Note at={pointerAt + 8} x={X0} y={g.rowTop(1) + h(30)}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
            <Mono color={KEY_INK}>customer_id = 1</Mono>
            <span style={{ color: INK }}>
              {" "}
              names <Mark at={maybeAt + 4}>exactly one row</Mark>
            </span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
