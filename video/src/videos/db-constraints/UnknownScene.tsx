import React from "react";
import { AbsoluteFill } from "remotion";
import { Entity, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK, INK_SOFT, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { CHECK_AND_NOT_NULL, CHECK_ONLY } from "./data";
import {
  Arrow,
  CARD_Y,
  Code,
  DbTable,
  ErrorBox,
  Head,
  HEAD_H,
  Kicker,
  ROW_H,
  RuleTags,
  TABLE_X,
  TABLE_Y,
  tableGeometry,
  Tick,
  TypeMark,
  X0,
} from "./parts";

/**
 * Part 5's catch: a CHECK refuses only false, and NULL >= 0 is null, so a
 * product with no price is stored. A required price takes all three rules:
 * the type, the CHECK, and NOT NULL, which refuses the same row.
 */
export const UnknownScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const open = n.beat("unknown").from;
  const refusesAt = n.word("unknown", "only refuses");
  const falseAt = n.word("unknown", "false");
  const leaveAt = n.word("unknown", "Leave");
  const outAt = n.word("unknown", "price out");
  const testAt = n.word("unknown", "the test");
  const unknownAt = n.word("unknown", "unknown");
  const slipsAt = n.word("unknown", "slips");
  const throughAt = n.word("unknown", "through");
  const requiredAt = n.word("layers", "required");
  const numericAt = n.word("layers", "Numeric");
  const rangeAt = n.word("layers", "range");
  const notNullAt = n.word("layers", "not null");
  const thereAt = n.word("layers", "actually there");

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
  const g = tableGeometry({ x: TABLE_X, top: y(TABLE_Y), cols: CHECK_ONLY.cols, rows: CHECK_ONLY.rows, headH: h(HEAD_H), rowH: h(ROW_H) });
  const pen = 1;
  const below = g.rowTop(2) + h(40);
  const testOut = requiredAt - 2;

  // The three rules a required price takes, each one narrowing the last.
  const LAYERS = [
    { code: "numeric", what: "an exact number", at: numericAt },
    { code: "CHECK (price >= 0)", what: "zero or more", at: rangeAt - 6 },
    { code: "NOT NULL", what: "and always there", at: notNullAt },
  ] as const;
  const layerY = (i: number) => y(720) + i * h(70);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={leaveAt - 2} level={-30} />
      <Sfx name="el-tap" at={unknownAt} level={-28} />
      <Sfx name="el-whoosh" at={slipsAt - 2} level={-34} />
      {LAYERS.map((l) => (
        <Sfx key={l.code} name="el-tap" at={l.at + 8} level={-30} />
      ))}
      <Sfx name="el-scratch" at={thereAt + 2} level={-30} />

      <Kicker at={open - 10}>Rules about values</Kicker>
      <Head lead="One catch:" at={open - 6} turn="a check only refuses false." turnAt={refusesAt - 4} out={requiredAt - 4} />
      <Head lead="A required price gets three rules." at={requiredAt - 2} />

      <Entity layout={card} at={open - 2} marks={{ price: { at: outAt, out: testOut } }} />
      <TypeMark layout={card} row="price" at={numericAt - 2} />
      <RuleTags
        layout={card}
        row="price"
        chips={[
          { code: "CHECK (price >= 0)", at: open + 4, pulses: [falseAt, rangeAt] },
          { code: "NOT NULL", at: notNullAt - 2, pulses: [thereAt + 4] },
        ]}
      />

      <DbTable
        g={g}
        cols={CHECK_ONLY.cols}
        at={open + 2}
        numeric={[0, 2]}
        rows={[
          { cells: CHECK_ONLY.rows[0], at: open + 8 },
          { cells: CHECK_ONLY.rows[pen], at: leaveAt, grow: true, ghostAt: thereAt - 2, strikeAt: thereAt + 2 },
        ]}
        marks={[{ row: pen, col: 2, at: outAt + 2 }]}
        bands={[{ row: pen, at: slipsAt, out: requiredAt }]}
      />
      <Note at={throughAt - 2} x={g.x + g.width + 18} y={g.rowMid(pen) - 15} out={thereAt - 4}>
        <span style={{ ...note(22, ACCENT_INK), fontWeight: 600, whiteSpace: "nowrap" }}>stored</span>
      </Note>

      {/* The test, as Postgres evaluates it on the row with no price. */}
      <Ink at={testAt - 2} dur={14} out={testOut} style={{ left: TABLE_X, top: below, display: "flex", alignItems: "center", gap: 18 }}>
        <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>The test on that row:</span>
        <Code size={28}>{"null >= 0"}</Code>
      </Ink>
      <Arrow from={[TABLE_X + 420, below + 22]} to={[TABLE_X + 490, below + 22]} at={unknownAt - 6} dur={10} color={INK_SOFT} out={testOut} />
      <Ink at={unknownAt - 2} dur={14} out={testOut} style={{ left: TABLE_X + 510, top: below, whiteSpace: "nowrap" }}>
        <span style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: ACCENT_INK }}>{String(CHECK_ONLY.test)}</span>
        <span style={{ ...note(23, INK), marginLeft: 16 }}>unknown, not false</span>
      </Ink>

      {/* ── The three rules, narrowing ── */}
      {LAYERS.map((l, i) => (
        <React.Fragment key={l.code}>
          <Ink at={l.at - 2} dur={14} style={{ left: X0, top: layerY(i) - 20, display: "flex", alignItems: "center", gap: 18 }}>
            <span style={{ ...note(23, INK_SOFT), width: 26, textAlign: "right" }}>{i + 1}</span>
            <Code size={24}>{l.code}</Code>
            <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>{l.what}</span>
          </Ink>
          <Tick x={X0 + 560} y={layerY(i)} at={l.at + 8} />
        </React.Fragment>
      ))}

      <ErrorBox
        x={TABLE_X}
        top={below}
        width={1824 - TABLE_X}
        at={thereAt}
        message={CHECK_AND_NOT_NULL.refusal.message}
        detail={CHECK_AND_NOT_NULL.refusal.detail}
        name="price"
        nameAt={thereAt + 10}
      />
    </AbsoluteFill>
  );
};
