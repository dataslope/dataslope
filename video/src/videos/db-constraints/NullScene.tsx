import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Entity, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, HAIRLINE, INK, INK_SOFT, PAPER, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { NOT_NULL } from "./data";
import {
  CARD_Y,
  DbTable,
  ErrorBox,
  Head,
  HEAD_H,
  Kicker,
  MARK_BAD,
  ROW_H,
  RuleTags,
  TABLE_X,
  TABLE_Y,
  tableGeometry,
  X0,
} from "./parts";

/** Zero and the empty string are values; null is the absence of one. */
const KINDS = [
  { show: "0", says: "a number", word: "zero" },
  { show: "''", says: "a string, empty", word: "empty string" },
  { show: "", says: "no value", word: "no value" },
] as const;

/**
 * Part 3: null is no value; must every row know this? A default fills in an
 * omitted status, and NOT NULL refuses a missing email, Postgres's failing
 * row showing the default filled in beside the null.
 */
export const NullScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const open = n.beat("null").from;
  const nullAt = n.word("null", "null");
  const kindAt = KINDS.map((k) => n.word("null", k.word));
  const askFrom = n.beat("ask").from;
  const everyColAt = n.word("ask", "every column");
  const everyRowAt = n.word("ask", "every row");
  const knowAt = n.word("ask", "know");
  const statusAt = n.word("default", "status");
  const defaultAt = n.word("default", "default");
  const leaveAt = n.word("default", "Leave");
  const activeAt = n.word("default", "active");
  const noEmailAt = n.word("email", "no email");
  const senseAt = n.word("email", "sense");
  const notNullAt = n.word("email", "not null");
  const insertAt = n.word("email", "insert");
  const withoutAt = n.word("email", "without one");
  const refusedAt = n.word("email", "refused");
  const nowAt = n.word("unique-in", "Now");
  const hasEmailAt = n.word("unique-in", "email");
  const shareAt = n.word("unique-in", "share");

  const card = useEntityLayout({
    x: X0,
    y: y(CARD_Y),
    width: 380,
    name: "accounts",
    columns: [
      { name: "id", type: "serial", key: "PK" },
      { name: "email", type: "text" },
      { name: "status", type: "text" },
    ],
  });

  const stored = NOT_NULL.rows[0];
  // The first insert names only the email: the status cell arrives empty and
  // the default fills it.
  const omitted = [stored[0], stored[1], ""];
  const rows = [stored, NOT_NULL.failing];
  const g = tableGeometry({ x: TABLE_X, top: y(TABLE_Y), cols: NOT_NULL.cols, rows, headH: h(HEAD_H), rowH: h(ROW_H) });
  const ghost = 1;

  const chipsOut = askFrom - 2;

  return (
    <AbsoluteFill>
      {KINDS.map((k, i) => (
        <Sfx key={k.word} name="el-tap" at={kindAt[i] - 2} level={-29} />
      ))}
      <Sfx name="el-pop" at={everyColAt - 4} level={-30} />
      <Sfx name="el-pencil" at={defaultAt} level={-33} />
      <Sfx name="el-pencil" at={notNullAt} level={-33} />
      <Sfx name="el-scratch" at={refusedAt + 2} level={-30} />

      <Kicker at={open - 10}>Required or optional</Kicker>
      <Head lead="Null means no value." at={nullAt - 6} out={chipsOut} />
      <Head lead="Must every row know this?" at={everyRowAt - 4} />

      {/* ── Three things that look empty, only one of which is ── */}
      {KINDS.map((k, i) => {
        const at = kindAt[i] - 4;
        const p = ease(frame, at, 12);
        const o = ease(frame, chipsOut, 12);
        const dim = i < 2 ? ease(frame, kindAt[2], 14) * 0.6 : 0;
        if (p <= 0 || o >= 1) return null;
        const x = 470 + i * 360;
        const isNull = i === 2;
        return (
          <div
            key={k.word}
            style={{
              position: "absolute",
              left: x,
              top: y(420),
              width: 240,
              opacity: p * (1 - o) * (1 - dim),
              transform: `translateY(${(1 - p) * 14 - o * 16}px)`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
            }}
          >
            <div
              style={{
                width: 200,
                height: 96,
                boxSizing: "border-box",
                border: isNull ? `3px dashed ${ACCENT}` : `2px solid ${INK}`,
                borderRadius: 8,
                background: isNull ? "transparent" : PAPER,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: MONO,
                fontSize: 44,
                fontWeight: 600,
                color: INK,
              }}
            >
              {k.show}
            </div>
            <span style={{ ...note(26, isNull ? ACCENT_INK : INK_SOFT), fontWeight: isNull ? 650 : 500, whiteSpace: "nowrap" }}>
              {k.says}
            </span>
          </div>
        );
      })}

      {/* ── The accounts card and its rows ── */}
      <Entity
        layout={card}
        at={everyColAt - 4}
        marks={{
          id: { at: everyRowAt, out: knowAt + 4 },
          email: frame >= noEmailAt - 2 ? { at: noEmailAt - 2, tone: "warn", out: notNullAt + 10 } : { at: everyRowAt + 5, out: knowAt + 8 },
          status: frame >= statusAt - 2 ? { at: statusAt - 2, out: noEmailAt } : { at: everyRowAt + 10, out: knowAt + 12 },
        }}
      />
      <RuleTags layout={card} row="email" chips={[{ code: "NOT NULL", at: notNullAt - 2, pulses: [refusedAt + 4] }]} />
      <RuleTags
        layout={card}
        row="status"
        chips={[
          { code: "DEFAULT 'active'", at: defaultAt - 2, pulses: [activeAt] },
          { code: "NOT NULL", at: notNullAt + 8 },
        ]}
      />

      <DbTable
        g={g}
        cols={NOT_NULL.cols}
        at={leaveAt - 6}
        numeric={[0]}
        rows={[
          { cells: omitted, at: leaveAt },
          { cells: NOT_NULL.failing, at: insertAt - 2, ghost: true, grow: true, strikeAt: refusedAt + 2, collapseAt: nowAt },
        ]}
        swaps={[{ row: 0, col: 2, at: activeAt - 2, value: stored[2] as string }]}
        marks={[
          { row: 0, col: 2, at: activeAt + 2, out: senseAt },
          { row: ghost, col: 1, at: withoutAt, color: MARK_BAD },
          { row: ghost, col: 2, at: withoutAt + 8 },
          { row: 0, col: 1, at: hasEmailAt },
        ]}
      />
      <ErrorBox
        x={TABLE_X}
        top={g.rowTop(2) + h(36)}
        width={1824 - TABLE_X}
        at={refusedAt}
        message={NOT_NULL.refusal.message}
        detail={NOT_NULL.refusal.detail}
        name="email"
        nameAt={refusedAt + 10}
        dim={nowAt}
      />

      {/* "Could two of them share one?" */}
      <Ink at={shareAt - 6} dur={16} style={{ left: TABLE_X, top: g.rowTop(1) + h(16), display: "flex", gap: 18, alignItems: "center" }}>
        <span
          style={{
            display: "inline-block",
            padding: "6px 16px",
            border: `2px dashed ${HAIRLINE}`,
            borderRadius: 6,
            fontFamily: MONO,
            fontSize: 26,
            color: INK_SOFT,
          }}
        >
          {stored[1]}
        </span>
        <span style={{ ...note(26, INK), fontStyle: "italic", whiteSpace: "nowrap" }}>twice?</span>
      </Ink>
      <Note at={leaveAt + 10} x={TABLE_X} y={g.top - h(40)} out={senseAt}>
        <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>status left out</span>
      </Note>
    </AbsoluteFill>
  );
};
