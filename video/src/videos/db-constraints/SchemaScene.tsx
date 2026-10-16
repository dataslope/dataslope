import React from "react";
import { AbsoluteFill } from "remotion";
import { Entity, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { body, INK, INK_SOFT, label } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { PRICE } from "./data";
import {
  Arrow,
  CARD_Y,
  DbTable,
  ErrorBox,
  Head,
  HEAD_H,
  Kicker,
  MARK_BAD,
  ROW_H,
  RuleTags,
  Spot,
  TABLE_X,
  TABLE_Y,
  tableGeometry,
  TypeMark,
  X0,
} from "./parts";

const WRITERS = ["Web app", "Mobile app", "Import", "By hand"] as const;

/**
 * The rule moves into the schema: a CHECK on products' price, every writer
 * going through it, and Postgres refusing the -3.00 with the rule's own
 * name. Then the turn to types: every column already has one rule.
 */
export const SchemaScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const open = n.beat("schema").from;
  const schemaAt = n.word("schema", "schema");
  const constraintAt = n.word("schema", "constraint");
  const everyAt = n.word("schema", "every write");
  const whoeverAt = n.word("schema", "whoever's");
  const priceAt = n.word("reject", "Price");
  const zeroAt = n.word("reject", "zero");
  const tryAt = n.word("reject", "Try");
  const threeAt = n.word("reject", "three");
  const refusesAt = n.word("reject", "refuses");
  const namingAt = n.word("reject", "naming");
  const neverAt = n.word("stored", "never");
  const notebookAt = n.word("stored", "notebook's");
  const onlyAt = n.word("stored", "only");
  const errorAt = n.word("door", "error");
  const failureAt = n.word("door", "failure");
  const doorAt = n.word("door", "door");
  const cheapAt = n.word("door", "cheap");
  const everyColAt = n.word("types-in", "every column");
  const singleAt = n.word("types-in", "single");

  const card = useEntityLayout({
    x: X0,
    y: y(CARD_Y),
    width: 380,
    name: "products",
    columns: [
      { name: "id", type: "serial", key: "PK" },
      { name: "name", type: "text" },
      { name: "price", type: "numeric" },
    ],
  });

  const rows = [...PRICE.rows, PRICE.failing];
  const g = tableGeometry({ x: TABLE_X, top: y(TABLE_Y), cols: PRICE.cols, rows, headH: h(HEAD_H), rowH: h(ROW_H) });
  const ghost = PRICE.rows.length;

  // The writers under the card, each arrow running up into it.
  const wy = card.bottom + h(150);
  const wx = (i: number) => card.left - 4 + i * 128;
  /** Where each writer's arrow meets the card's bottom edge. */
  const wt = (i: number) => card.left + 70 + i * 80;

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={schemaAt - 4} level={-30} />
      <Sfx name="el-pencil" at={constraintAt} level={-33} />
      <Sfx name="el-tap" at={tryAt} level={-28} />
      <Sfx name="el-scratch" at={refusesAt + 2} level={-30} />
      <Sfx name="el-pop" at={doorAt - 2} level={-30} />
      <Sfx name="el-chime" at={n.beat("door").to + 6} level={-33} />

      <Kicker at={open - 10}>Why constraints</Kicker>
      <Head lead="Put the rule in the schema." at={open - 6} out={errorAt - 4} />
      <Head lead="Not a failure:" at={failureAt - 6} turn="a catch at the door." turnAt={doorAt - 6} />
      <Ink at={cheapAt - 4} dur={16} style={{ left: 96, top: y(252), whiteSpace: "nowrap" }}>
        <span style={{ ...body(34, true), color: INK }}>while the mistake is still cheap to fix</span>
      </Ink>

      <Entity layout={card} at={schemaAt - 6} />
      <RuleTags
        layout={card}
        row="price"
        chips={[{ code: "CHECK (price >= 0)", at: constraintAt, pulses: [everyAt, zeroAt, namingAt + 4], out: singleAt + 4 }]}
      />
      {(["id", "name", "price"] as const).map((r, i) => (
        <TypeMark key={r} layout={card} row={r} at={everyColAt + i * 6} />
      ))}

      {/* Every writer goes through the same rule. */}
      {WRITERS.map((w, i) => (
        <React.Fragment key={w}>
          <Ink at={everyAt + i * 4} dur={12} out={errorAt} style={{ left: wx(i), top: wy, width: 120, textAlign: "center" }}>
            <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>{w}</span>
          </Ink>
          <Arrow
            from={[wx(i) + 60, wy - 8]}
            to={[wt(i), card.bottom + 10]}
            at={whoeverAt + i * 4}
            dur={12}
            color={INK_SOFT}
            width={2}
            out={errorAt}
          />
        </React.Fragment>
      ))}

      {/* ── What Postgres stores, and what it refuses ── */}
      <DbTable
        g={g}
        cols={PRICE.cols}
        at={priceAt - 4}
        numeric={[0, 2]}
        rows={[
          { cells: PRICE.rows[0], at: zeroAt - 2 },
          { cells: PRICE.failing, at: tryAt, ghost: true, grow: true, strikeAt: refusesAt + 2, collapseAt: neverAt },
        ]}
        marks={[
          { row: ghost, col: 2, at: threeAt, color: MARK_BAD },
          { row: 0, col: 1, at: onlyAt },
        ]}
        bands={[{ row: 0, at: notebookAt - 2, out: errorAt }]}
      />
      <ErrorBox
        x={TABLE_X}
        top={g.rowTop(2) + h(36)}
        width={1824 - TABLE_X}
        at={refusesAt}
        message={PRICE.refusal.message}
        detail={PRICE.refusal.detail}
        name={PRICE.refusal.constraint}
        nameAt={namingAt}
        dim={neverAt + 6}
      />
      <Spot id="db-constraints-door" at={doorAt - 4} left={1400} top={y(720)} width={300} height={300} />
    </AbsoluteFill>
  );
};
