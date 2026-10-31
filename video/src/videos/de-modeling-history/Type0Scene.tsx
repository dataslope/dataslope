import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { HIGHLIGHT, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { TYPE0 } from "./data";
import { colsOf, DataTable, Drift, geoOf, lineOf, Listing, listingHeight, MARK_OK, OK_INK, TableName, X0 } from "./parts";

const TOP = 330;
const SIZE = 23;
const TABLE_X = 1100;
const ROWS = { headH: 40, rowH: 46, bodySize: 24, headSize: 20 } as const;

/**
 * Question 3. Type 0 as the page puts it, insert once: two loads of customer
 * 42's sign-up date with ON CONFLICT DO NOTHING (the video's own), the first
 * writing a row and the second, carrying a different date, writing none. The
 * row keeps 2022-01-01, and the refused value sits beside it in a dashed
 * outline. Then the follow-up: types are chosen per column, shown as one
 * customer row's columns, each with its type.
 */
export const Type0Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("type0").from;
  const qAt = n.word("type0", "Question three");
  const textAt = n.word("type0", "What is SCD Type zero");
  const neverAt = n.word("type0", "never changes once it's written");
  const signedAt = n.word("type0", "the date a customer signed up");
  const onceAt = n.word("type0", "Load it once");
  const ignoreAt = n.word("type0", "ignore whatever the source says later");
  const secondAt = n.word("type0-run", "a second load sends a different sign-up date");
  const nothingAt = n.word("type0-run", "the insert adds nothing");
  const standsAt = n.word("type0-run", "the first value stands");
  const perAt = n.word("type0-mix", "Types are chosen per column");
  const zeroAt = n.word("type0-mix", "a Type zero sign-up date");
  const twoAt = n.word("type0-mix", "beside a Type two city");
  const end = n.beat("type0-mix").to;

  const F = TYPE0.first;
  const L = TYPE0.later;
  const firstTop = y(TOP) + h(40);
  const laterTop = firstTop + listingHeight(F.lines.length, SIZE) + h(64);
  const listW = 620;
  const T = TYPE0.rows;
  const g = geoOf(T, TABLE_X, y(TOP) + h(40), h, { ...ROWS, extra: [["42", "2023-06-30"]] });
  // The later load's value, refused, as a ghost row under the kept one.
  const laterDate = L.lines.join(" ").match(/DATE '([\d-]+)'/)?.[1] ?? "";
  const stripY = y(800);

  const columns = [
    { name: "customer_key", type: "surrogate key", at: perAt + 4, lit: undefined },
    { name: "signup_date", type: "Type 0: never changes", at: zeroAt - 2, lit: zeroAt },
    { name: "city", type: "Type 2: a new version", at: twoAt - 2, lit: twoAt },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={onceAt + 2} level={-36} />
      <Sfx name="el-tap" at={onceAt + 14} level={-35} />
      <Sfx name="el-pencil" at={secondAt + 2} level={-36} />
      <Sfx name="el-scratch" at={nothingAt + 4} level={-35} />
      <Sfx name="el-pop" at={standsAt} level={-35} />
      <Sfx name="el-tap" at={zeroAt} level={-36} />
      <Sfx name="el-tap" at={twoAt} level={-36} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is SCD Type 0?
        </QuestionCard>
        <Note at={neverAt} x={X0} y={y(258)}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            A value that <b>never changes</b> once it&rsquo;s written
            <span style={{ color: INK_SOFT, opacity: ease(frame, signedAt, 10) }}>, like a sign-up date</span>
          </span>
        </Note>

        {/* The two loads. */}
        <Listing
          lines={F.lines}
          x={X0}
          top={firstTop}
          width={listW}
          size={SIZE}
          at={onceAt - 2}
          title="first load"
          marks={[{ line: lineOf(F.lines, "ON CONFLICT"), at: ignoreAt, out: secondAt }]}
        />
        <Note at={onceAt + 12} x={X0 + listW + 24} y={firstTop + h(44)}>
          <span style={{ ...note(24, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            <Num>{TYPE0.firstCount}</Num> row written
          </span>
        </Note>
        <Listing
          lines={L.lines}
          x={X0}
          top={laterTop}
          width={listW}
          size={SIZE}
          at={secondAt - 2}
          title="a later load"
          marks={[
            { line: lineOf(L.lines, laterDate), at: secondAt + 8 },
            { line: lineOf(L.lines, "ON CONFLICT"), at: nothingAt, color: MARK_OK },
          ]}
        />
        <Note at={nothingAt + 4} x={X0 + listW + 24} y={laterTop + h(44)}>
          <span style={{ ...note(24, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            <Num>{TYPE0.laterCount}</Num> rows written
          </span>
        </Note>

        {/* The table it loads. */}
        <TableName g={g} at={onceAt + 6}>
          dim_customer
        </TableName>
        <DataTable
          g={g}
          cols={colsOf(T)}
          at={onceAt + 6}
          rows={[
            { cells: T.rows[0], at: onceAt + 14 },
            { cells: ["42", laterDate], at: secondAt + 12, ghost: true, grow: true, dimAt: nothingAt + 4, collapseAt: standsAt + 20 },
          ]}
          marks={[{ row: 0, col: T.cols.indexOf("signup_date"), at: standsAt + 2, color: MARK_OK }]}
        />
        <Note at={nothingAt + 8} x={g.right + 24} y={g.rowTop(1) + h(8)} out={standsAt + 18}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 700, whiteSpace: "nowrap" }}>ignored</span>
        </Note>
        <Note at={standsAt + 26} x={TABLE_X} y={g.rowTop(1) + h(20)}>
          <span style={{ ...note(25, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>the first value stands</span>
        </Note>

        {/* Types are per column: one row, each column with its own. */}
        <Note at={perAt} x={X0} y={stripY - h(54)}>
          <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>one customer row, a type per column</span>
        </Note>
        <div style={{ position: "absolute", left: X0, top: stripY, display: "flex", gap: 18 }}>
          {columns.map((c) => {
            const p = ease(frame, c.at, 12);
            const lit = c.lit === undefined ? 0 : ease(frame, c.lit, 10);
            return (
              <div
                key={c.name}
                style={{
                  opacity: p,
                  transform: `translateY(${(1 - p) * 10}px)`,
                  border: `2px solid ${INK}`,
                  borderRadius: 8,
                  background: PAPER,
                  padding: "12px 20px 14px",
                  minWidth: 200,
                }}
              >
                <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 600, color: INK, whiteSpace: "nowrap" }}>{c.name}</div>
                <div style={{ marginTop: 6 }}>
                  <span
                    style={{
                      ...label(21, INK),
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      padding: "1px 6px",
                      margin: "0 -6px",
                      borderRadius: 4,
                      background: lit > 0 ? `color-mix(in srgb, ${HIGHLIGHT} ${lit * 100}%, transparent)` : undefined,
                    }}
                  >
                    {c.type}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
