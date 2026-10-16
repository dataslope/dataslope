import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { OTO } from "./data";
import {
  Caption,
  ColTag,
  DbTable,
  Drift,
  ErrorBox,
  HEAD_H,
  Head,
  KEY_INK,
  Kicker,
  Listing,
  listingHeight,
  MARK,
  MARK_BAD,
  Reply,
  ROW_H,
  tableGeometry,
} from "./parts";

const X = 120;
const TABLE_Y = 410;
const LIST_X = 640;
const LIST_W = 760;
const LIST_SIZE = 24;

/**
 * What makes it one to one: the foreign key alone takes a second profile for
 * Ada (run against a copy of the table without UNIQUE); with the lesson's
 * UNIQUE on user_id, Postgres refuses it.
 */
export const UniqueScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const from = n.beat("unique").from;
  const fkAt = n.word("unique", "foreign key");
  const keepAt = n.word("unique", "keep it to one");
  const happilyAt = n.word("unique", "happily");
  const secondAt = n.word("unique", "second profile");
  const forAdaAt = n.word("unique", "for Ada");
  const makeAt = n.word("unique-fix", "Make");
  const uniqueAt = n.word("unique-fix", "unique");
  const bouncesAt = n.word("unique-fix", "bounces");
  const oneToOneAt = n.word("unique-fix", "one to one");
  const lastAt = n.word("self-in", "last shape");

  const COLS = OTO.profileCols;
  const U = COLS.indexOf("user_id");
  const g = tableGeometry({ x: X, top: y(TABLE_Y), cols: COLS, rows: [...OTO.profileRows, OTO.looseRow], headH: h(HEAD_H), rowH: h(ROW_H) });
  const ada = OTO.looseRow[U];
  const adaRows = OTO.profileRows.flatMap((r, i) => (r[U] === ada ? [i] : []));
  const second = OTO.profileRows.length;
  const listTop = y(TABLE_Y);
  const listH = listingHeight(OTO.secondSql.length, LIST_SIZE);
  const lineAt = OTO.secondSql.map((_, i) => secondAt - 6 + i * 4);
  const fade = 1 - ease(frame, lastAt, 16) * 0.55;

  return (
    <AbsoluteFill>
      {/* ── Sound: the second row going in, the tag, the refusal ── */}
      <Sfx name="el-tap" at={secondAt + 4} level={-29} />
      <Sfx name="el-pop" at={happilyAt + 2} level={-30} />
      <Sfx name="el-pencil" at={uniqueAt} level={-33} />
      <Sfx name="el-scratch" at={bouncesAt} level={-30} />

      <Kicker at={from - 10}>One to one</Kicker>
      <Head lead="A foreign key," leadAt={from - 6} turn="plus unique." turnAt={uniqueAt - 2} />

      <Drift from={from} to={lastAt + 30} scale={0.016} origin={[960, y(600)]}>
        <div style={{ position: "absolute", inset: 0, opacity: fade }}>
          <Caption at={from - 2} x={g.x} y={g.top - 84}>
            user_profiles
          </Caption>
          <ColTag g={g} col={U} at={fkAt} out={uniqueAt - 12}>
            FK
          </ColTag>
          <ColTag g={g} col={U} at={uniqueAt} color={ACCENT_INK}>
            FK, unique
          </ColTag>
          <DbTable
            g={g}
            cols={COLS}
            rows={[
              ...OTO.profileRows.map((cells, i) => ({ cells, at: from + 2 + i * 4 })),
              { cells: OTO.looseRow, at: secondAt + 4, grow: true, ghostAt: bouncesAt, strikeAt: bouncesAt + 8 },
            ]}
            at={from - 2}
            numeric={[0, U]}
            colInk={{ [U]: KEY_INK }}
            headMarks={[{ col: U, at: keepAt, out: makeAt }]}
            marks={[
              ...adaRows.map((row) => ({ row, col: U, at: forAdaAt, color: MARK_BAD })),
              { row: second, col: U, at: forAdaAt + 4, color: MARK_BAD },
            ]}
            bands={[{ row: second, at: secondAt + 8, out: bouncesAt, color: MARK }]}
          />

          {/* ── The same insert, with and without UNIQUE ── */}
          <Caption at={secondAt - 10} x={LIST_X} y={listTop - 48}>
            A second profile for Ada
          </Caption>
          <Listing lines={OTO.secondSql} x={LIST_X} top={listTop} width={LIST_W} size={LIST_SIZE} at={secondAt - 10} lineAt={lineAt} />
          <Reply x={LIST_X} y={listTop + listH + 20} at={secondAt + 10} text={OTO.secondLoose} out={uniqueAt - 4}>
            with only the foreign key: {OTO.looseAda} profiles for Ada
          </Reply>
          <ErrorBox
            x={LIST_X}
            top={listTop + listH + 20}
            width={1180}
            at={bouncesAt}
            message={OTO.second.message}
            detail={OTO.second.detail ?? ""}
            detailMark={oneToOneAt}
          />
        </div>
      </Drift>
    </AbsoluteFill>
  );
};

