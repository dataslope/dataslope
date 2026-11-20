import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import type { Pt } from "../../components/arrow";
import { Entity, Relation, useEntityLayout, type EntityColumn } from "../../editorial/erd";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ROLE } from "./data";
import { Caption, colsOf, DataTable, Drift, geoOf, Listing, listingHeight, listingWidth, MARK, Mono, OK_INK, RIGHT, TableName, Verdict, X0 } from "./parts";

const ERD_Y = 330;
const FACT_W = 360;
const DATE_X = 740;
const DATE_W = 300;
const SIZE = 19;

const FACT: EntityColumn[] = [
  { name: "order_id", key: "PK" },
  { name: "order_date_sk", key: "FK" },
  { name: "ship_date_sk", key: "FK" },
  { name: "delivery_date_sk", key: "FK" },
];
const DATE: EntityColumn[] = [{ name: "date_sk", key: "PK" }, { name: "full_date" }];
const ROLES = [
  { key: "order_date_sk", alias: "od", name: "order" },
  { key: "ship_date_sk", alias: "sd", name: "ship" },
  { key: "delivery_date_sk", alias: "dd", name: "delivery" },
] as const;

/**
 * Question 8. The page's role-playing block: fact_orders carries three date
 * keys, and one dim_date box takes three relations, labelled order, ship and
 * delivery. The page's query joins dim_date three times under three aliases,
 * each JOIN lit as its role is named, and order 101 comes back placed on
 * March 1, shipped on the 3rd, delivered on the 7th. One table is one
 * calendar, the same for every role; together the roles answer what no
 * single one can (order to delivery, 6.7 days on average, 9 at most); and
 * each role gets a view of its own for BI tools, its columns renamed for it.
 */
export const RoleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("role").from;
  const qAt = n.word("role", "Question eight");
  const textAt = n.word("role", "What is a role-playing dimension");
  const oneAt = n.word("role", "One physical table used several times");
  const rolesAt = n.word("role", "in different roles");
  const threeAt = n.word("role", "three date keys");
  const roleAt = [n.word("role", "ordered"), n.word("role", "shipped"), n.word("role", "delivered")];
  const joinedAt = n.word("role-join", "joined three times");
  const aliasAt = n.word("role-join", "under three aliases");
  const placedAt = n.word("role-join", "Order one oh one was placed");
  const dayAt = [n.word("role-join", "on March first"), n.word("role-join", "shipped on the third"), n.word("role-join", "delivered on the seventh")];
  const calendarAt = n.word("role-why", "One table means one calendar");
  const everyRoleAt = n.word("role-why", "every role reads the same holidays");
  const togetherAt = n.word("role-span", "Together, the roles answer");
  const noSingleAt = n.word("role-span", "what no single role can");
  const tookAt = n.word("role-span", "order to delivery took");
  const mostAt = n.word("role-span", "nine at most");
  const viewAt = n.word("role-view", "give each role its own view");
  const namedAt = n.word("role-view", "with columns named for it");
  const shipDateAt = n.word("role-view", "like ship date");
  const wrongAt = n.word("role-view", "nobody filters on the wrong date");
  const end = n.beat("role-view").to;

  // ── The ERD: three relations into one table, each straight ──
  const fact = useEntityLayout({ x: X0, y: y(ERD_Y), width: FACT_W, name: "fact_orders", columns: FACT });
  // dim_date's box spans the three key rows' heights, so each relation runs
  // level from its key into the same table.
  const dateTop = fact.rows[1].mid - 36;
  const date = useEntityLayout({ x: DATE_X, y: dateTop, width: DATE_W, name: "dim_date", columns: DATE });
  if (date.bottom < fact.rows[3].mid + 12) throw new Error("dim_date must reach the third key's row");
  const line = (k: string): Pt[] => {
    const mid = fact.anchor("right", k)[1];
    return [fact.anchor("right", k), [date.left, mid]];
  };

  // ── The page's query, its three JOINs ──
  const L = ROLE.read.lines;
  const listX = RIGHT - listingWidth(L, SIZE);
  const listTop = y(ERD_Y - 20);
  const joinLine = (alias: string) => L.find((l) => l.startsWith(`JOIN dim_date ${alias} `))!;
  const V = ROLE.view.lines;
  const viewTop = listTop + listingHeight(L.length, SIZE) + h(80);
  const viewX = RIGHT - listingWidth(V, SIZE);

  // ── Order 101's row ──
  const R = { cols: ROLE.read.cols, rows: ROLE.read.rows.slice(0, 1) };
  const rg = geoOf(R, X0, fact.bottom + h(100), h, { headH: 44, rowH: 50, bodySize: 23, headSize: 20 });
  const D = ROLE.days;
  const avg = D.rows[0][D.cols.indexOf("avg_days")];
  const most = D.rows[0][D.cols.indexOf("most")];

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={oneAt} level={-30} />
      {roleAt.map((t, i) => (
        <Sfx key={i} name="el-pencil" at={t + 2} level={-36} />
      ))}
      {ROLES.map((_, i) => (
        <Sfx key={`j${i}`} name="el-tap" at={joinedAt + 4 + i * 8} level={-32} />
      ))}
      {dayAt.map((t, i) => (
        <Sfx key={`d${i}`} name="el-tap" at={t} level={-31} />
      ))}
      <Sfx name="el-tap" at={calendarAt + 2} level={-31} />
      <Sfx name="el-pop" at={tookAt + 4} level={-30} />
      <Sfx name="el-whoosh" at={viewAt} level={-35} />
      <Sfx name="el-chime" at={wrongAt + 4} level={-35} />

      <Drift from={from} to={end + 30} scale={0.015}>
        <QuestionCard n={8} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is a role-playing dimension?
        </QuestionCard>

        {/* ── One table, three roles ── */}
        <Entity layout={fact} at={oneAt} rowAt={{ order_id: oneAt + 6, order_date_sk: roleAt[0], ship_date_sk: roleAt[1], delivery_date_sk: roleAt[2] }} />
        <Entity layout={date} at={oneAt + 4} />
        {ROLES.map((r, i) => (
          <Relation
            key={r.key}
            name={r.name}
            points={line(r.key)}
            from="zero-or-many"
            to="exactly-one"
            at={roleAt[i] + 2}
            label={r.name}
            labelAt={roleAt[i] + 8}
            labelPos={[fact.right + 52, fact.anchor("right", r.key)[1] - 30]}
          />
        ))}
        <Note at={rolesAt} x={date.left} y={date.bottom + h(22)}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>One physical table, three roles</span>
        </Note>
        {/* Why one table: one calendar, the same for every role. */}
        <Note at={calendarAt} x={date.left} y={date.bottom + h(58)}>
          <span style={{ ...note(23, INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            One calendar<span style={{ opacity: ease(frame, everyRoleAt, 10) }}> for every role</span>
          </span>
        </Note>
        <Note at={threeAt} x={fact.left} y={fact.top - h(44)}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 500, whiteSpace: "nowrap" }}>Three date keys on each order</span>
        </Note>

        {/* ── The page's read: dim_date three times, under three aliases ── */}
        <Caption at={joinedAt - 4} x={listX} y={listTop - h(40)}>
          The page&apos;s read
        </Caption>
        <Listing
          lines={L}
          x={listX}
          top={listTop}
          size={SIZE}
          at={joinedAt - 4}
          lineAt={L.map((_, i) => joinedAt + i * 2)}
          marks={ROLES.map((r, i) => ({ line: joinLine(r.alias), text: `dim_date ${r.alias}`, at: aliasAt + i * 6 }))}
        />

        {/* Order 101: three dates from one table. */}
        <TableName g={rg} at={placedAt}>
          Order 101, its three roles read back
        </TableName>
        <DataTable
          g={rg}
          cols={colsOf(R)}
          at={placedAt}
          rows={R.rows.map((cells) => ({ cells, at: placedAt + 4 }))}
          marks={dayAt.map((at, i) => ({ row: 0, col: i + 1, at: at + 2, color: MARK }))}
        />

        {/* Together: a question across roles. */}
        <Verdict
          at={tookAt}
          x={X0}
          y={rg.rowTop(1) + h(60)}
          label="Order to delivery, on average"
          value={`${avg} days`}
          tone="ok"
          size={26}
        />
        <Verdict at={mostAt} x={X0} y={rg.rowTop(1) + h(112)} label="At most" value={`${most} days`} size={26} />
        <Note at={togetherAt} x={X0} y={rg.rowTop(1) + h(16)} out={tookAt - 2}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            Together, they answer <span style={{ color: OK_INK, opacity: ease(frame, noSingleAt, 10) }}>across roles</span>
          </span>
        </Note>

        {/* ── A view per role, for BI tools ── */}
        <Caption at={viewAt} x={viewX} y={viewTop - h(40)}>
          One view per role, its columns named for it
        </Caption>
        <Listing
          lines={V}
          x={viewX}
          top={viewTop}
          size={SIZE}
          at={viewAt}
          marks={[
            { line: "AS ship_date_sk", text: "date_sk AS ship_date_sk", at: namedAt + 2 },
            { line: "full_date AS ship_date", text: "full_date AS ship_date", at: shipDateAt + 2 },
          ]}
        />
        <Note at={wrongAt} x={viewX} y={viewTop + listingHeight(V.length, SIZE) + h(24)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <Mono>ship_date</Mono>: nobody filters on the wrong date
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
