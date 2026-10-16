import React from "react";
import { AbsoluteFill } from "remotion";
import { Entity, Relation, useEntityLayout, type EntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import type { Pt } from "../../editorial/ui";
import type { Cardinality } from "../../components/crowsfoot";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { OTM } from "./data";
import { Caption, DbTable, Drift, HEAD_H, Head, KEY_INK, KeyArrow, Kicker, Pulse, ROW_H, tableGeometry } from "./parts";

/** The four panels: left edges, each panel PANEL wide. */
const PANEL_X = [120, 560, 1000, 1440];
const PANEL = 360;
const BOX_W = 300;
const TITLE_Y = 400;
const TOP_Y = 470;
const BOTTOM_Y = 720;
const SELF_Y = 570;
/** How far the self-reference's loop runs out from its box. */
const LOOP = 72;

/** One panel: two header-only entities, one above the other, and the line between. */
const Pair: React.FC<{
  i: number;
  top: string;
  bottom: string;
  from: Cardinality;
  to: Cardinality;
  at: number;
  name: string;
}> = ({ i, top, bottom, from, to, at, name }) => {
  const { y } = useLayout();
  const x = PANEL_X[i] + (PANEL - BOX_W) / 2;
  const a = useEntityLayout({ x, y: y(TOP_Y), width: BOX_W, name: top, columns: [] });
  const b = useEntityLayout({ x, y: y(BOTTOM_Y), width: BOX_W, name: bottom, columns: [] });
  return (
    <>
      <Entity layout={a} at={at - 6} />
      <Entity layout={b} at={at} />
      <Relation name={name} points={[a.anchor("bottom"), b.anchor("top")]} from={from} to={to} at={at + 6} dur={16} />
    </>
  );
};

/** The self-reference panel: one entity, its line leaving and coming back. */
const Loop: React.FC<{ e: EntityLayout; at: number }> = ({ e, at }) => {
  const start = e.anchor("right");
  const end = e.anchor("bottom");
  const pts: Pt[] = [start, [start[0] + LOOP, start[1]], [start[0] + LOOP, e.bottom + LOOP], [end[0], e.bottom + LOOP], end];
  return <Relation name="employees manages employees" points={pts} from="zero-or-one" to="zero-or-many" at={at} dur={22} />;
};

/**
 * The opening: Unit 4's bridge (with keys, one row can point at another),
 * then the four shapes those links take, each drawn on its name.
 */
export const ShapesScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const from = n.beat("shapes").from;
  const keysAt = n.word("shapes", "keys");
  const rowAt = n.word("shapes", "one row");
  const pointAt = n.word("shapes", "point");
  const shapesAt = n.word("shapes", "few shapes");
  const otmAt = n.word("names", "One to many");
  const mtmAt = n.word("names", "Many to many");
  const otoAt = n.word("names", "One to one");
  const oddAt = n.word("names", "odd one");
  const selfAt = n.word("names", "a table");
  const itselfAt = n.word("names", "itself");

  // Unit 4's last picture, small: an order row naming a customer row.
  const ORDER = OTM.orderRows[2];
  const CUSTOMER = OTM.list[0];
  const cg = tableGeometry({ x: 520, top: y(470), cols: ["id", "name"], rows: [CUSTOMER.slice(0, 2)], headH: h(HEAD_H), rowH: h(ROW_H) });
  const og = tableGeometry({ x: 1060, top: y(470), cols: ["id", "customer_id"], rows: [ORDER.slice(0, 2)], headH: h(HEAD_H), rowH: h(ROW_H) });
  const pairOut = shapesAt + 2;

  const self = useEntityLayout({ x: PANEL_X[3] + (PANEL - BOX_W) / 2 - LOOP / 2, y: y(SELF_Y), width: BOX_W, name: "employees", columns: [] });

  return (
    <AbsoluteFill>
      {/* ── Sound: the pointer landing, the pair leaving, each shape's line ── */}
      <Sfx name="el-tap" at={pointAt + 14} level={-28} />
      <Sfx name="el-whoosh" at={pairOut} level={-34} />
      {[otmAt, mtmAt, otoAt].map((at, k) => (
        <Sfx key={k} name="el-pencil" at={at + 6} level={-34} />
      ))}
      <Sfx name="el-pencil" at={selfAt} level={-33} />

      <Kicker at={from - 10}>Four shapes</Kicker>
      <Head lead="Links come in" leadAt={from - 6} turn="a few shapes." turnAt={shapesAt - 4} />

      {/* ── With keys, one row can point at another ── */}
      <DbTable g={cg} cols={["id", "name"]} rows={[{ cells: CUSTOMER.slice(0, 2), at: rowAt }]} at={keysAt} numeric={[0]} colInk={{ 0: KEY_INK }} out={pairOut} />
      <DbTable
        g={og}
        cols={["id", "customer_id"]}
        rows={[{ cells: ORDER.slice(0, 2), at: rowAt + 6 }]}
        at={keysAt + 6}
        numeric={[0, 1]}
        colInk={{ 1: KEY_INK }}
        out={pairOut}
      />
      <Caption at={keysAt} x={cg.x} y={cg.top - 44} out={pairOut}>
        customers
      </Caption>
      <Caption at={keysAt + 6} x={og.x} y={og.top - 44} out={pairOut}>
        orders
      </Caption>
      <KeyArrow from={[og.x - 10, og.rowMid(0)]} to={[cg.x + cg.width + 8, cg.rowMid(0)]} at={pointAt} out={pairOut} />

      {/* ── The four shapes ── */}
      <Drift from={otmAt} to={n.beat("names").to + 50} scale={0.018} origin={[960, y(600)]}>
        {(
          [
            ["One to many", otmAt],
            ["Many to many", mtmAt],
            ["One to one", otoAt],
            ["Self-reference", selfAt - 4],
          ] as const
        ).map(([title, at], i) => (
          <Caption key={title} at={at - 4} x={PANEL_X[i] + (PANEL - BOX_W) / 2 - (i === 3 ? LOOP / 2 : 0)} y={y(TITLE_Y)}>
            {title}
          </Caption>
        ))}
        <Pair i={0} top="customers" bottom="orders" from="exactly-one" to="zero-or-many" at={otmAt} name="customers to orders" />
        <Pair i={1} top="students" bottom="courses" from="zero-or-many" to="zero-or-many" at={mtmAt} name="students to courses" />
        <Pair i={2} top="users" bottom="user_profiles" from="exactly-one" to="zero-or-one" at={otoAt} name="users to user_profiles" />
        <Entity layout={self} at={selfAt - 6} />
        <Loop e={self} at={selfAt + 2} />
        <Pulse x={self.right + LOOP} y={self.bottom + LOOP} at={itselfAt + 4} r={14} />
        <Pulse x={PANEL_X[3] + PANEL / 2} y={y(TITLE_Y) + 14} at={oddAt} r={6} color={KEY_INK} />
      </Drift>
    </AbsoluteFill>
  );
};
