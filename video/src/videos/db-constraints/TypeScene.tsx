import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Entity, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, INK, INK_SOFT, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { TYPE } from "./data";
import {
  CARD_Y,
  DbTable,
  ErrorBox,
  Head,
  HEAD_H,
  Kicker,
  MARK_BAD,
  pulse,
  ROW_H,
  Strike,
  Svg,
  TABLE_X,
  TABLE_Y,
  tableGeometry,
  TypeMark,
  X0,
} from "./parts";

/** The integer number line: whole numbers from LO to HI, and more beyond. */
const LO = -3;
const HI = 6;
const LINE_X0 = TABLE_X + 40;
const LINE_X1 = 1760;
const sxi = (v: number) => LINE_X0 + ((v - LO + 0.5) / (HI - LO + 1)) * (LINE_X1 - LINE_X0);

/**
 * Part 2: the type is the first constraint. An INTEGER quantity refuses
 * 'many', which is no number at all, so it never reaches the CHECK; a type
 * is the set of values a column can hold.
 */
export const TypeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const open = n.beat("type").from;
  const quantityAt = n.word("type", "quantity");
  const integerAt = n.word("type", "integer");
  const sendsAt = n.word("type", "sends");
  const manyAt = n.word("type", "many");
  const refusedAt = n.word("nan", "Refused");
  const bigAt = n.word("nan", "big");
  const smallAt = n.word("nan", "small");
  const numberAt = n.word("nan", "number");
  const valuesAt = n.word("domain", "values");
  const existAt = n.word("domain", "exist");
  const pickAt = n.word("domain", "pick");
  const meansAt = n.word("domain", "means");
  const moneyAt = n.word("money-in", "money");
  const thinkAt = n.word("money-in", "think");

  const card = useEntityLayout({
    x: X0,
    y: y(CARD_Y),
    width: 380,
    name: "order_items",
    columns: [
      { name: "id", type: "serial", key: "PK" },
      { name: "sku", type: "text" },
      { name: "quantity", type: "integer" },
    ],
  });
  const rows = [...TYPE.rows, TYPE.attempt];
  const g = tableGeometry({ x: TABLE_X, top: y(TABLE_Y), cols: TYPE.cols, rows, headH: h(HEAD_H), rowH: h(ROW_H) });
  const ghost = TYPE.rows.length;
  const errTop = g.rowTop(2) + h(36);

  // The number line under the error.
  const lineY = y(800);
  const lineIn = ease(frame, bigAt - 10, 16);
  const lineDim = 1 - ease(frame, moneyAt, 14) * 0.55;
  const ticks = Array.from({ length: HI - LO + 1 }, (_, i) => LO + i);
  // "Too big" and "too small" point past the ends, where integer goes on
  // (to about 2.1 billion either way): each "…" swells on its word, in ink,
  // since nothing out there is refused here.
  const big = pulse(frame, bigAt, 26);
  const small = pulse(frame, smallAt, 26);
  // "many" lifts off above the line: it has no place on it.
  const manyIn = ease(frame, numberAt - 8, 14);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={open - 4} level={-30} />
      <Sfx name="el-tap" at={sendsAt} level={-28} />
      <Sfx name="el-scratch" at={refusedAt + 2} level={-30} />
      <Sfx name="el-pencil" at={bigAt - 10} level={-34} />

      <Kicker at={open - 10}>The first constraint</Kicker>
      <Head lead="Every column has a type." at={open - 6} turn="That's a rule." turnAt={integerAt} />

      <Entity layout={card} at={open - 2} marks={{ quantity: { at: meansAt, out: moneyAt } }} dim={moneyAt} />
      <TypeMark layout={card} row="quantity" at={integerAt - 2} />
      {/* What each type lets in, beside its row. */}
      {(
        [
          ["sku", "any text"],
          ["quantity", "whole numbers"],
        ] as const
      ).map(([r, what], i) => {
        const row = card.rows[card.columns.findIndex((c) => c.name === r)];
        return (
          <Note key={r} at={pickAt + i * 6} x={card.right + 18} y={row.mid - 16} dim={moneyAt}>
            <span style={{ ...note(22, INK_SOFT), fontStyle: "italic", whiteSpace: "nowrap" }}>{what}</span>
          </Note>
        );
      })}

      <DbTable
        g={g}
        cols={TYPE.cols}
        at={quantityAt - 4}
        numeric={[0, 2]}
        rows={[
          { cells: TYPE.rows[0], at: quantityAt },
          { cells: TYPE.attempt, at: sendsAt - 2, ghost: true, grow: true, strikeAt: refusedAt + 2, dimAt: valuesAt },
        ]}
        marks={[{ row: ghost, col: 2, at: manyAt, color: MARK_BAD }]}
        dim={moneyAt}
      />
      <ErrorBox
        x={TABLE_X}
        top={errTop}
        width={1824 - TABLE_X}
        at={refusedAt}
        message={TYPE.refusal.message}
        name="many"
        nameAt={numberAt}
        dim={valuesAt}
      />

      {/* ── The integer domain ── */}
      {lineIn > 0 ? (
        <Svg opacity={lineDim}>
          <line
            x1={LINE_X0 - 30}
            x2={LINE_X0 - 30 + (LINE_X1 - LINE_X0 + 60) * lineIn}
            y1={lineY}
            y2={lineY}
            stroke={INK}
            strokeWidth={1.8}
          />
          {ticks.map((v, i) => {
            const t = ease(frame, bigAt - 8 + i * 1.5, 8);
            const swell = pulse(frame, existAt + i * 2, 16);
            return (
              <g key={v} opacity={t}>
                <circle cx={sxi(v)} cy={lineY} r={6 + swell * 4} fill={INK} />
                <text
                  x={sxi(v)}
                  y={lineY + 40}
                  textAnchor="middle"
                  style={{ ...note(21, INK_SOFT), fontVariantNumeric: "tabular-nums" }}
                  fill={INK_SOFT}
                >
                  {v < 0 ? `−${-v}` : v}
                </text>
              </g>
            );
          })}
          {/* ...and on past both ends. */}
          {[-1, 1].map((s) => {
            const k = s < 0 ? small : big;
            return (
              <text
                key={s}
                x={s < 0 ? LINE_X0 - 56 : LINE_X1 + 40}
                y={lineY + 8}
                textAnchor="middle"
                style={{ ...note(26 + k * 16, k > 0.05 ? INK : INK_SOFT), fontWeight: 500 + Math.round(k * 200) }}
                fill={k > 0.05 ? INK : INK_SOFT}
                opacity={ease(frame, bigAt - 8, 10)}
              >
                …
              </text>
            );
          })}
        </Svg>
      ) : null}
      <Note at={valuesAt} x={LINE_X0 - 30} y={lineY + 64} from="up" dim={moneyAt}>
        <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
          <span style={{ fontFamily: MONO, fontWeight: 600 }}>integer</span>: whole numbers only (about ±2.1 billion)
        </span>
      </Note>
      {manyIn > 0 ? (
        <Ink
          at={numberAt - 8}
          dur={14}
          out={valuesAt}
          style={{ left: (sxi(1) + sxi(2)) / 2 - 50, top: lineY - 92 - manyIn * 10, whiteSpace: "nowrap" }}
        >
          <span style={{ fontFamily: MONO, fontSize: 30, fontWeight: 600, color: ACCENT_INK }}>
            <Strike at={numberAt + 8} color={ACCENT}>
              {"'many'"}
            </Strike>
          </span>
        </Ink>
      ) : null}

      {/* The coins wait for the money scene, so they never jump sides at the cut. */}
      <Note at={thinkAt - 6} x={X0} y={y(760)}>
        <span style={{ ...note(28, INK), fontStyle: "italic", whiteSpace: "nowrap" }}>And for money?</span>
      </Note>
    </AbsoluteFill>
  );
};
