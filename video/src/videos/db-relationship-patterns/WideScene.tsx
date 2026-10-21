import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Entity, Relation, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK } from "../../editorial/style";
import { FigLabel } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { OTO } from "./data";
import { Caption, DbTable, Drift, FIG_ABOVE, HEAD_H, Head, KEY_INK, Kicker, MARK, MARK_BAD, Pulse, ROW_H, Spot, Tag, tableGeometry } from "./parts";

const TABLE_Y = 400;
const ERD_Y = 400;
/** How far the profile columns slide away when they get a table of their
 *  own: far enough to leave room for the user_id column they gain. */
const SLIDE = 260;

/**
 * Part 4 opens: a users table that grew profile columns most users leave
 * empty, the profile moved to a table of its own, and the zero-or-one end
 * that the split draws.
 */
export const WideScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const from = n.beat("wide").from;
  const usersAt = n.word("wide", "users table");
  const profileAt = n.word("wide", "profile details");
  const nameAt = n.word("wide", "display name");
  const bioAt = n.word("wide", "bio");
  const linusAt = n.word("empty", "Linus");
  const neverAt = n.word("empty", "never fill");
  const movesAt = n.word("split", "moves");
  const ownAt = n.word("split", "own table");
  const zeroAt = n.word("split", "zero or one");
  const exactlyAt = n.word("split", "exactly one");
  const fkAt = n.word("side", "foreign key");
  const profileSideAt = n.word("side", "on the profile");
  const aloneAt = n.word("side", "alone");

  // ── The wide table, drawn as its users half and its profile half ──
  const COLS = OTO.wideCols;
  const P = COLS.indexOf("display_name");
  const userCols = COLS.slice(0, P);
  const profileCols = COLS.slice(P);
  const userRows = OTO.wideRows.map((r) => r.slice(0, P));
  const profileRows = OTO.wideRows.map((r) => r.slice(P));
  const ug = tableGeometry({ x: 120, top: y(TABLE_Y), cols: userCols, rows: userRows, headH: h(HEAD_H), rowH: h(ROW_H) });
  const pg = tableGeometry({ x: ug.x + ug.width, top: y(TABLE_Y), cols: profileCols, rows: profileRows, headH: h(HEAD_H), rowH: h(ROW_H) });
  const empty = OTO.wideRows.flatMap((r, i) => (r[P] === null ? [i] : []));
  const linus = empty[0];
  const slide = ease(frame, movesAt, 20) * SLIDE;
  // A user with no profile has no row in the profile table: the empty rows
  // close up as the columns move out, and the rows that go each name their
  // user in a user_id column.
  const closeAt = movesAt + 6;
  const uidCols = ["user_id"];
  const uidRows = OTO.wideRows.map((r) => [r[0]]);
  const uidW = tableGeometry({ x: 0, top: 0, cols: uidCols, rows: uidRows, headH: h(HEAD_H), rowH: h(ROW_H) }).width;
  const uid = tableGeometry({ x: pg.x - uidW, top: y(TABLE_Y), cols: uidCols, rows: uidRows, headH: h(HEAD_H), rowH: h(ROW_H) });
  // The split tables stay up through "Each user has", where user 3 has no
  // profile row to show for it, then give way to the diagram, whose
  // zero-or-one end lands on "zero or one".
  const tablesOut = zeroAt - 8;
  const erdAt = tablesOut + 6;
  // The tables' label and the diagram's share one line, over the tables'
  // names; the first has lifted by the time the second inks in.
  const figY = ug.top - 48 - FIG_ABOVE;

  // ── The split, as an ER diagram ──
  const users = useEntityLayout({
    x: 160,
    y: y(ERD_Y),
    width: 380,
    name: "users",
    columns: [
      { name: "id", type: "serial", key: "PK" },
      { name: "email", type: "text" },
    ],
  });
  const profiles = useEntityLayout({
    x: 980,
    y: y(ERD_Y),
    width: 460,
    name: "user_profiles",
    columns: [
      { name: "id", type: "serial", key: "PK" },
      { name: "user_id", type: "integer", key: "FK" },
      { name: "display_name", type: "text" },
      { name: "bio", type: "text" },
    ],
  });
  const u = users.anchor("right", "id");
  const p = profiles.anchor("left", "user_id");
  const midX = (u[0] + p[0]) / 2;

  return (
    <AbsoluteFill>
      {/* ── Sound: the profile columns, the empties, the split, the ends ── */}
      <Sfx name="el-whoosh" at={profileAt} level={-34} />
      <Sfx name="el-sprinkle" at={neverAt} level={-34} />
      <Sfx name="el-whoosh" at={movesAt} level={-33} />
      <Sfx name="el-pencil" at={erdAt + 8} level={-33} />
      <Sfx name="el-pop" at={Math.max(zeroAt, erdAt + 26)} level={-30} />
      <Sfx name="el-tap" at={fkAt} level={-29} />

      <Kicker at={from - 10}>One to one</Kicker>
      <Head lead="One user," leadAt={from - 6} turn="at most one profile." turnAt={zeroAt - 4} />
      <Spot id="db-relationship-patterns-badge" at={profileAt} left={1580} top={y(60)} width={240} height={260} />

      {/* ── A users table that grew profile columns ── */}
      <div style={{ position: "absolute", inset: 0, opacity: 1 - ease(frame, tablesOut, 14) }}>
        <FigLabel n="13" title="Profile columns on users, then in their own table" at={usersAt - 6} x={ug.x} y={figY} out={tablesOut - 6} />
        <Caption at={usersAt - 4} x={ug.x} y={ug.top - 48}>
          users
        </Caption>
        <DbTable
          g={ug}
          cols={userCols}
          rows={userRows.map((cells, i) => ({ cells, at: usersAt + 2 + i * 4 }))}
          at={usersAt - 2}
          numeric={[0]}
          colInk={{ 0: KEY_INK }}
          bands={[{ row: linus, at: linusAt, color: MARK }]}
        />
        <div style={{ position: "absolute", inset: 0, transform: `translateX(${slide}px)` }}>
          <DbTable
            g={uid}
            cols={uidCols}
            rows={uidRows.map((cells, i) => ({ cells, at: ownAt + 2 + i * 3, collapseAt: empty.includes(i) ? closeAt : undefined }))}
            at={ownAt - 2}
            numeric={[0]}
            colInk={{ 0: KEY_INK }}
          />
          <DbTable
            g={pg}
            cols={profileCols}
            rows={profileRows.map((cells, i) => ({
              cells,
              at: profileAt + 4 + i * 3,
              collapseAt: empty.includes(i) ? closeAt : undefined,
            }))}
            at={profileAt}
            headMarks={[
              { col: 0, at: nameAt, out: linusAt },
              { col: 1, at: bioAt, out: linusAt },
            ]}
            marks={empty.flatMap((row) => [
              { row, col: 0, at: neverAt, color: MARK_BAD },
              { row, col: 1, at: neverAt + 4, color: MARK_BAD },
            ])}
            bands={[{ row: linus, at: linusAt + 2, color: MARK }]}
          />
          <Caption at={ownAt - 2} x={uid.x} y={pg.top - 48}>
            its own table
          </Caption>
        </div>
        {empty.map((row) => (
          <Pulse key={row} x={pg.x + pg.widths[0] / 2} y={pg.rowMid(row)} at={neverAt + 2} r={18} />
        ))}
        <Tag at={neverAt + 4} x={ug.x} y={ug.rowTop(OTO.wideRows.length) + 18} color={ACCENT_INK} size={22}>
          {OTO.without} of {OTO.users} users have no profile
        </Tag>
      </div>

      {/* ── The split: users, and an optional profile each ── */}
      <Drift from={erdAt} to={aloneAt + 60} scale={0.018} origin={[midX, y(560)]}>
        <FigLabel n="14" title="Users and their optional profiles" at={erdAt - 2} x={users.x} y={figY} />
        <Entity layout={users} at={erdAt} />
        <Entity layout={profiles} at={erdAt + 6} marks={{ user_id: { at: fkAt, tone: "key" } }} />
        <Relation
          name="users has user_profiles"
          points={[u, [midX, u[1]], [midX, p[1]], p]}
          from="exactly-one"
          to="zero-or-one"
          at={erdAt + 8}
          dur={18}
          label="has"
        />
        <Tag at={Math.max(zeroAt - 2, erdAt + 24)} x={p[0] - 14} y={p[1] + 22} color={KEY_INK} size={22} align="right">
          zero or one
        </Tag>
        <Pulse x={p[0] - 20} y={p[1]} at={Math.max(zeroAt, erdAt + 26)} r={12} color={KEY_INK} />
        <Tag at={exactlyAt - 2} x={u[0] + 14} y={u[1] + 22} color={KEY_INK} size={22}>
          exactly one
        </Tag>
        <Pulse x={u[0] + 16} y={u[1]} at={exactlyAt} r={12} color={KEY_INK} />
        <Pulse x={profiles.x + profiles.width / 2} y={profiles.top + profiles.head / 2} at={profileSideAt} r={46} color={KEY_INK} />
        <Tag at={aloneAt - 6} x={profiles.x} y={profiles.bottom + 22} italic size={22}>
          a profile needs its user; a user can go without
        </Tag>
      </Drift>
    </AbsoluteFill>
  );
};
