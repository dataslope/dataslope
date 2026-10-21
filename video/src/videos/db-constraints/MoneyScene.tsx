import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease, map } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, HAIRLINE, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { MONEY } from "./data";
import { FIG_Y, Head, Kicker, Mark, MARK, MARK_BAD, OK_INK, pulse, Spot, X0 } from "./parts";

const SIZE = 40;
/** Columns. Postgres's answer to "= 0.3" sits under its own header, so the
 *  row never reads as a chain of equals signs. */
const COL = { type: X0, sum: 520, eq: 800, result: 860, test: 1440 } as const;

/**
 * Part 2, money: 0.1 + 0.2 as a float is 0.30000000000000004 and not equal
 * to 0.3; as NUMERIC it is 0.3, and equal. Both answers are Postgres's own.
 */
export const MoneyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const open = n.beat("money").from;
  const tenAt = n.word("money", "ten");
  const twentyAt = n.word("money", "twenty");
  const floatsAt = n.word("money", "floats");
  const thirtyAt = n.word("money", "thirty");
  const falseAt = n.word("false", "False");
  const approxAt = n.word("false", "approximate");
  const pointAt = n.word("false", "point three");
  const runAt = n.word("false", "long run");
  const zerosAt = n.word("false", "zeros", { edge: "end" });
  const fourAt = n.word("false", "four");
  const numericAt = n.word("exact", "Numeric");
  const exactAt = n.word("exact", "exact");
  const trueAt = n.word("exact", "true");
  const honestAt = n.word("exact", "honest");
  const priceAt = n.word("exact", "price");
  const kindAt = n.word("null-in", "right kind");
  const thereAt = n.word("null-in", "there");

  const rowA = y(530);
  const rowB = y(670);
  // numeric's band holds its row and the note under it.
  const bandTop = rowB - h(50);
  const bandH = h(124);

  // The float's digits, typed as they are read out: "point three", the run
  // of zeros, then the four.
  const digits = MONEY.float;
  const typed =
    frame < pointAt - 2
      ? 0
      : frame < runAt
        ? 3
        : frame < fourAt - 2
          ? Math.round(map(frame, [runAt, zerosAt], [3, digits.length - 1]))
          : digits.length;
  const zerosMark = ease(frame, runAt, Math.max(8, zerosAt - runAt));

  const verdict = (text: string, at: number, ok: boolean) => {
    const p = ease(frame, at - 2, 10);
    if (p <= 0) return null;
    const swell = pulse(frame, at - 2, 20);
    return (
      <span
        style={{
          display: "inline-block",
          fontFamily: MONO,
          fontSize: SIZE,
          fontWeight: 700,
          color: ok ? OK_INK : ACCENT_INK,
          opacity: p,
          transform: `scale(${0.8 + 0.2 * p + swell * 0.12})`,
          transformOrigin: "0 60%",
        }}
      >
        {text}
      </span>
    );
  };

  const cell = (left: number, top: number, at: number, children: React.ReactNode, dim = 0) => (
    <Ink at={at} dur={12} style={{ left, top: top - SIZE * 0.7, whiteSpace: "nowrap", opacity: 1 - dim }}>
      <span style={{ fontFamily: MONO, fontSize: SIZE, fontWeight: 500, color: INK }}>{children}</span>
    </Ink>
  );
  const dimAll = ease(frame, kindAt, 14) * 0.5;
  const bandB = ease(frame, honestAt - 2, 14) * (1 - ease(frame, kindAt, 12));

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={tenAt} level={-29} />
      <Sfx name="el-tap" at={twentyAt} level={-30} />
      <Sfx name="el-pop" at={falseAt - 2} level={-29} />
      <Sfx name="el-sprinkle" at={runAt} level={-34} />
      <Sfx name="el-pop" at={trueAt - 2} level={-30} />
      <Sfx name="el-chime" at={n.beat("exact").to + 8} level={-33} />

      <Kicker at={open - 10}>The first constraint</Kicker>
      <Head lead="Ten cents plus twenty." at={open - 6} turn="Thirty?" turnAt={thirtyAt - 2} />
      <FigLabel n="5" title="The same sum in two types, and Postgres's answers" at={tenAt - 6} x={X0} y={y(FIG_Y)} />

      {/* Column titles. */}
      {(
        [
          [COL.type, "type", tenAt - 4],
          [COL.sum, "sum", tenAt - 2],
          [COL.result, "result", approxAt - 4],
          [COL.test, "equals 0.3?", thirtyAt - 4],
        ] as const
      ).map(([x, t, at]) => (
        <Ink key={t} at={at} dur={12} style={{ left: x, top: y(420), whiteSpace: "nowrap", opacity: 1 - dimAll }}>
          <span style={label(22, INK_SOFT)}>{t}</span>
        </Ink>
      ))}
      <div
        style={{
          position: "absolute",
          left: X0,
          top: y(420) + 40,
          width: (1680 - X0) * ease(frame, tenAt - 4, 20),
          height: 1,
          background: HAIRLINE,
        }}
      />

      {/* The band under numeric's row, the honest one. */}
      <div
        style={{
          position: "absolute",
          left: X0 - 16,
          top: bandTop,
          width: (1680 - X0 + 32) * bandB,
          height: bandH,
          background: MARK,
          opacity: bandB > 0 ? 0.8 : 0,
          borderRadius: 6,
        }}
      />

      {/* ── As a float ── */}
      {cell(COL.type, rowA, floatsAt - 2, <span style={{ fontSize: 30, color: INK_SOFT }}>double precision</span>, dimAll)}
      {cell(COL.sum, rowA, tenAt, "0.1", dimAll)}
      {cell(COL.sum + 96, rowA, twentyAt, "+ 0.2", dimAll)}
      {cell(COL.eq, rowA, approxAt - 4, "=", dimAll)}
      {typed > 0 ? (
        <div
          style={{
            position: "absolute",
            left: COL.result,
            top: rowA - SIZE * 0.7,
            fontFamily: MONO,
            fontSize: SIZE,
            color: INK,
            whiteSpace: "pre",
            opacity: 1 - dimAll,
          }}
        >
          <span>{digits.slice(0, 3)}</span>
          <span style={{ position: "relative" }}>
            {typed > 3 ? (
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  top: "0.12em",
                  bottom: "0.02em",
                  width: `${(digits.length - 4) * 0.6 * zerosMark}em`,
                  background: MARK,
                }}
              />
            ) : null}
            <span style={{ position: "relative" }}>{digits.slice(3, Math.min(typed, digits.length - 1))}</span>
          </span>
          {typed >= digits.length ? (
            <span style={{ color: ACCENT_INK, fontWeight: 700 }}>
              <Mark at={fourAt} color={MARK_BAD}>
                {digits.slice(-1)}
              </Mark>
            </span>
          ) : null}
        </div>
      ) : null}
      <div style={{ position: "absolute", left: COL.test, top: rowA - SIZE * 0.7, opacity: 1 - dimAll }}>
        {verdict(String(MONEY.floatEquals), falseAt, MONEY.floatEquals)}
      </div>
      <Note at={approxAt - 4} x={COL.result} y={rowA + h(34)} dim={trueAt}>
        <span style={{ ...note(23, INK_SOFT), fontStyle: "italic", whiteSpace: "nowrap" }}>approximate: a binary fraction</span>
      </Note>

      {/* ── As numeric ── */}
      {cell(COL.type, rowB, numericAt - 2, <span style={{ fontSize: 30, color: INK_SOFT }}>numeric</span>, dimAll)}
      {cell(COL.sum, rowB, numericAt + 2, "0.1", dimAll)}
      {cell(COL.sum + 96, rowB, numericAt + 5, "+ 0.2", dimAll)}
      {cell(COL.eq, rowB, exactAt - 4, "=", dimAll)}
      {cell(COL.result, rowB, exactAt - 2, MONEY.exact, dimAll)}
      <div style={{ position: "absolute", left: COL.test, top: rowB - SIZE * 0.7, opacity: 1 - dimAll }}>
        {verdict(String(MONEY.exactEquals), trueAt, MONEY.exactEquals)}
      </div>
      <Note at={priceAt - 6} x={COL.result} y={rowB + h(34)}>
        <span style={{ ...note(23, INK_SOFT), fontStyle: "italic", whiteSpace: "nowrap" }}>exact: the type for a price</span>
      </Note>

      {/* "Does it have to be there at all?": an empty cell, held open. */}
      <Ink at={thereAt - 8} dur={16} style={{ left: X0, top: y(830), display: "flex", alignItems: "center", gap: 22 }}>
        <span
          style={{
            display: "inline-block",
            width: 150,
            height: 56,
            border: `2.5px dashed ${ACCENT}`,
            borderRadius: 6,
          }}
        />
        <span style={{ ...note(26, INK), fontStyle: "italic", whiteSpace: "nowrap" }}>And if there's no value at all?</span>
      </Ink>

      <Spot id="db-constraints-coins" at={open - 6} left={1470} top={y(748)} width={270} height={230} dim={kindAt} />
    </AbsoluteFill>
  );
};
