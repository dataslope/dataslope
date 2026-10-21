import React from "react";
import { AbsoluteFill } from "remotion";
import { Entity, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, note } from "../../editorial/style";
import { FigLabel, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { UNIQUE } from "./data";
import {
  CARD_Y,
  DbTable,
  ErrorBox,
  FIG_Y,
  Head,
  HEAD_H,
  Kicker,
  MARK_BAD,
  MARK_KEY,
  ROW_H,
  RuleTags,
  TABLE_X,
  TABLE_Y,
  tableGeometry,
  X0,
} from "./parts";

/**
 * Part 4: one email, one account. A second account with Ada's email and a
 * new username is refused as a duplicate key; UNIQUE guards what the primary
 * key does not, and a table can carry several.
 */
export const UniqueScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const open = n.beat("unique").from;
  const adaAt = n.word("unique", "Ada signs");
  const secondAt = n.word("unique", "second account");
  const herAt = n.word("unique", "her email");
  const usernameAt = n.word("unique", "new username");
  const dupFrom = n.beat("dup").from;
  const refusedAt = n.word("dup", "Refused");
  const markedAt = n.word("dup", "unique");
  const oneEmailAt = n.word("dup", "One email");
  const oneAccountAt = n.word("dup", "one account");
  const primaryAt = n.word("many", "primary key");
  const distinctAt = n.word("many", "distinct");
  const rowsAt = n.word("many", "rows");
  const uniqueAt = n.word("many", "Unique");
  const everythingAt = n.word("many", "everything");
  const repeatAt = n.word("many", "repeat");
  const evenAt = n.word("pair-in", "even");

  const card = useEntityLayout({
    x: X0,
    y: y(CARD_Y),
    width: 400,
    name: "accounts",
    columns: [
      { name: "id", type: "serial", key: "PK" },
      { name: "email", type: "text" },
      { name: "username", type: "text" },
    ],
  });
  const rows = [...UNIQUE.rows, UNIQUE.attempt];
  const g = tableGeometry({ x: TABLE_X, top: y(TABLE_Y), cols: UNIQUE.cols, rows, headH: h(HEAD_H), rowH: h(ROW_H) });
  const ghost = UNIQUE.rows.length;

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={open - 4} level={-30} />
      <Sfx name="el-tap" at={secondAt - 2} level={-28} />
      <Sfx name="el-scratch" at={refusedAt + 2} level={-30} />
      <Sfx name="el-pencil" at={open + 16} level={-34} />
      <Sfx name="el-pencil" at={everythingAt - 2} level={-34} />

      <Kicker at={open - 10}>No repeats</Kicker>
      <Head lead="Two accounts, one email?" at={open - 6} out={oneEmailAt - 10} />
      <Head lead="One email," at={oneEmailAt - 4} turn="one account." turnAt={oneAccountAt - 4} />

      <FigLabel n="8" title="A second account with Ada's email" at={open - 4} x={X0} y={y(FIG_Y)} />
      <Entity
        layout={card}
        at={open - 2}
        marks={{ id: { at: primaryAt, tone: "key", out: uniqueAt } }}
        dim={evenAt}
      />
      <RuleTags
        layout={card}
        row="email"
        chips={[
          { code: "NOT NULL", at: open + 8 },
          // On the card before the attempt, so the refusal has its cause.
          { code: "UNIQUE", at: open + 16, pulses: [markedAt, oneEmailAt, uniqueAt] },
        ]}
        dim={evenAt}
      />
      <RuleTags
        layout={card}
        row="username"
        chips={[
          { code: "NOT NULL", at: open + 12 },
          { code: "UNIQUE", at: everythingAt - 2, pulses: [repeatAt] },
        ]}
        dim={evenAt}
      />

      <Note at={distinctAt - 2} x={card.right + 14} y={card.rows[0].mid - 15} dim={evenAt}>
        <span style={{ ...note(22, BLUE_INK), fontWeight: 600, whiteSpace: "nowrap" }}>never repeats</span>
      </Note>
      <DbTable
        g={g}
        cols={UNIQUE.cols}
        at={adaAt - 6}
        numeric={[0]}
        rows={[
          { cells: UNIQUE.rows[0], at: adaAt },
          { cells: UNIQUE.attempt, at: secondAt - 2, ghost: true, grow: true, strikeAt: refusedAt + 2, dimAt: primaryAt },
        ]}
        marks={[
          { row: 0, col: 1, at: herAt, out: primaryAt },
          { row: ghost, col: 1, at: herAt + 4, color: MARK_BAD },
          { row: ghost, col: 2, at: usernameAt },
          { row: 0, col: 0, at: rowsAt, color: MARK_KEY, out: uniqueAt + 6 },
        ]}
        dim={evenAt}
      />
      <ErrorBox
        x={TABLE_X}
        top={g.rowTop(2) + h(36)}
        width={1824 - TABLE_X}
        at={dupFrom - 2}
        message={UNIQUE.refusal.message}
        detail={UNIQUE.refusal.detail}
        name={UNIQUE.refusal.constraint}
        nameAt={markedAt}
        dim={primaryAt}
      />
    </AbsoluteFill>
  );
};
