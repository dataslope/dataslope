import React from "react";
import { AbsoluteFill } from "remotion";
import { RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, TABULAR, note } from "../../editorial/style";
import { NextLine, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { QUICK } from "./data";
import {
  Bars,
  colsOf,
  DataTable,
  Drift,
  geoOf,
  Headline,
  Kicker,
  Listing,
  listingHeight,
  Mark,
  MARK_BAD,
  MARK_KEY,
  Mono,
  OK,
  OK_INK,
  Spot,
  X0,
} from "./parts";

/** Where the answers go: right of the list. */
const R_X = 800;
const LIST_TOP = 360;
const ROW = 64;
const SIZE = 20;

type Ctx = {
  w: (beat: string, phrase: string) => number;
  y: Layout["y"];
  h: Layout["h"];
};

/** A one-line note in the answer column. */
const Line: React.FC<{ at: number; top: number; x?: number; children: React.ReactNode; color?: string }> = ({
  at,
  top,
  x = R_X,
  children,
  color = INK,
}) => (
  <Note at={at} x={x} y={top}>
    <span style={{ ...note(26, color), whiteSpace: "nowrap", ...TABULAR }}>{children}</span>
  </Note>
);

/** 10. Series.map, DataFrame.apply, DataFrame.map: what each works on. */
const MapBody: React.FC<{ c: Ctx }> = ({ c }) => {
  const S = QUICK.mapCode;
  const g = geoOf(S, R_X, c.y(560), c.h, { rowH: 50 });
  return (
    <>
      <Line at={c.w("r-map", "Series map")} top={c.y(370)}>
        <Mono color={BLUE_INK}>Series.map</Mono> value by value, one column
      </Line>
      <Line at={c.w("r-map", "Apply works along an axis")} top={c.y(424)}>
        <Mono color={BLUE_INK}>DataFrame.apply</Mono> along an axis: a row or a column
      </Line>
      <Line at={c.w("r-map", "Data frame map")} top={c.y(478)}>
        <Mono color={BLUE_INK}>DataFrame.map</Mono> every cell
      </Line>
      <Listing lines={S.lines} x={R_X + 340} top={c.y(560)} width={640} size={18} at={c.w("r-map", "from a function or a lookup")} />
      <DataTable
        g={g}
        cols={colsOf(S, { code: { ink: BLUE_INK } })}
        at={c.w("r-map", "from a function or a lookup")}
        rows={S.rows.map((cells, i) => ({ cells, at: c.w("r-map", "from a function or a lookup") + 4 + i * 3 }))}
      />
    </>
  );
};

/** 11. The page's chain, top to bottom, and what it returns. */
const ChainBody: React.FC<{ c: Ctx }> = ({ c }) => {
  const C = QUICK.chain;
  const at = c.w("r-chain", "Method chaining writes the steps");
  const steps = ["query", "assign", "group", "sum"].map((s) => c.w("r-chain", s));
  const g = geoOf(C, R_X + 700, c.y(370), c.h, { rowH: 52 });
  return (
    <>
      <Listing
        lines={C.lines}
        x={R_X}
        top={c.y(370)}
        width={660}
        size={SIZE}
        at={at - 4}
        marks={[
          { line: 2, at: steps[0], out: steps[1] },
          { line: 3, at: steps[1], out: steps[2] },
          { line: 4, at: steps[2] },
        ]}
      />
      <DataTable
        g={g}
        cols={colsOf(C, { tax: { ink: BLUE_INK } })}
        at={steps[3]}
        rows={C.rows.map((cells, i) => ({ cells, at: steps[3] + 4 + i * 3 }))}
      />
      <Line at={c.w("r-chain", "no throwaway variables")} top={c.y(370) + listingHeight(C.lines.length, SIZE) + c.h(22)}>
        no throwaway variables in between
      </Line>
    </>
  );
};

/** 12. np.select with a default, and case_when started without one. */
const CaseBody: React.FC<{ c: Ctx }> = ({ c }) => {
  const S = QUICK.select;
  const at = c.w("r-case", "use NumPy select");
  const listH = listingHeight(S.lines.length, SIZE);
  const g = geoOf(S, R_X, c.y(370) + listH + c.h(26), c.h, { rowH: 48 });
  const size = S.cols.indexOf("size");
  const B = QUICK.bare;
  const bx = R_X + 480;
  const bg = geoOf(B, bx, c.y(370) + listH + c.h(26), c.h, { rowH: 48 });
  const kept = B.rows.flatMap((r, i) => (/^\d+$/.test(r[1]) ? [i] : []));
  const caseAt = c.w("r-case", "Pandas has case when too");
  const oldAt = c.w("r-case", "keep their old value");
  return (
    <>
      <Listing lines={S.lines} x={R_X} top={c.y(370)} width={960} size={SIZE} at={at - 4} marks={[{ line: 2, at: c.w("r-case", "and a default") }]} />
      <DataTable
        g={g}
        cols={colsOf(S, { size: { ink: BLUE_INK } })}
        at={at + 6}
        rows={S.rows.map((cells, i) => ({ cells, at: at + 10 + i * 2 }))}
        marks={S.rows.map((_, row) => ({ row, col: size, at: c.w("r-case", "a list of conditions") + row * 2, color: MARK_KEY }))}
      />
      <Note at={caseAt} x={bx} y={c.y(370) + listH + c.h(26) - c.h(40)}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
          <Mono>case_when</Mono>, with no default
        </span>
      </Note>
      <DataTable
        g={bg}
        cols={colsOf(B)}
        at={caseAt + 4}
        rows={B.rows.map((cells, i) => ({ cells, at: caseAt + 8 + i * 2 }))}
        marks={kept.map((row) => ({ row, col: 1, at: oldAt + (row - kept[0]) * 4, color: MARK_BAD }))}
      />
      <Line at={oldAt + 4} x={bx + 200} top={bg.rowMid(kept[0]) - c.h(16)} color={ACCENT_INK}>
        old values kept
      </Line>
    </>
  );
};

/** 13. 300 regions as strings, and as a category. */
const CatBody: React.FC<{ c: Ctx }> = ({ c }) => (
  <>
    <Line at={c.w("r-cat", "stores each distinct string once")} top={c.y(370)}>
      <Mono color={BLUE_INK}>astype(&quot;category&quot;)</Mono>: each string once, a small code per row
    </Line>
    <Line at={c.w("r-cat", "Three hundred regions")} top={c.y(430)} color={INK_SOFT}>
      300 rows, four distinct regions
    </Line>
    <Bars
      x={R_X}
      top={c.y(500)}
      width={620}
      rowH={c.h(70)}
      nameW={210}
      bars={[
        {
          name: "as strings",
          value: QUICK.catBefore,
          text: `${QUICK.catBefore.toLocaleString("en-US")} bytes`,
          color: BAR,
          ink: BLUE_INK,
          at: c.w("r-cat", "eight thousand nine hundred bytes") - 4,
        },
        {
          name: "as a category",
          value: QUICK.catAfter,
          text: `${QUICK.catAfter} bytes`,
          color: OK,
          ink: OK_INK,
          at: c.w("r-cat", "four hundred eighteen") - 4,
        },
      ]}
    />
  </>
);

/** 14. Parse, reach the parts, resample by week. */
const DatesBody: React.FC<{ c: Ctx }> = ({ c }) => {
  const W = QUICK.weekly;
  const sumsAt = c.w("r-dates", "By week");
  const g = geoOf(W, R_X, c.y(470) + listingHeight(1, SIZE) + c.h(26), c.h, { rowH: 52 });
  const said = ["a hundred eighty", "one seventy", "and seventy"].map((p) => c.w("r-dates", p));
  return (
    <>
      <Line at={c.w("r-dates", "to datetime parses them")} top={c.y(370)}>
        <Mono color={BLUE_INK}>pd.to_datetime</Mono> parses
      </Line>
      <Line at={c.w("r-dates", "the D T accessor")} x={R_X + 330} top={c.y(370)}>
        <Mono color={BLUE_INK}>.dt</Mono> reaches the parts
      </Line>
      <Line at={c.w("r-dates", "resample groups them by time")} x={R_X + 680} top={c.y(370)}>
        <Mono color={BLUE_INK}>.resample</Mono> groups by time
      </Line>
      <Listing lines={W.lines} x={R_X} top={c.y(470)} width={720} size={SIZE} at={sumsAt - 10} />
      <DataTable
        g={g}
        cols={colsOf(W, { amount: { ink: BLUE_INK } })}
        at={sumsAt - 4}
        rows={W.rows.map((cells, i) => ({ cells, at: sumsAt + i * 2 }))}
        marks={W.rows.map((_, row) => ({ row, col: 1, at: said[row] }))}
      />
      <Line at={sumsAt + 6} x={g.right + 30} top={g.rowMid(0) - c.h(16)} color={INK_SOFT}>
        weeks end on Sunday
      </Line>
    </>
  );
};

/**
 * Questions 10 to 14, a sentence and a line of code each, beside a numbered
 * list: map, apply and DataFrame.map; the page's chain; np.select with a
 * default, and case_when without one keeping 50 and 80; 300 regions as
 * strings and as a category; a week's resample. The bridge maps three
 * pandas words onto their SQL twins.
 */
export const RapidScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: n.word, y, h };

  const from = n.beat("rapid-in").from;
  const doneAt = n.word("rapid-in", "Nine done");
  const lineAt = n.word("rapid-in", "a line of code apiece");
  const nextFrom = n.beat("next").from;
  const sqlAt = n.word("next", "translates straight into SQL");
  const pairs = [
    { pandas: "groupby", sql: "GROUP BY", at: n.word("next", "Groupby becomes group by") },
    { pandas: "merge", sql: "JOIN", at: n.word("next", "merge becomes a join") },
    { pandas: "transform", sql: "a window function", at: n.word("next", "transform becomes a window function") },
  ];
  const nextAt = n.word("next", "Next: SQL");
  const end = n.beat("next").to;

  const items: RapidItem[] = [
    { n: 10, label: <>map, apply, DataFrame.map</>, at: n.beat("r-map").from, body: <MapBody c={c} /> },
    { n: 11, label: "Method chaining", at: n.beat("r-chain").from, body: <ChainBody c={c} /> },
    { n: 12, label: "A vectorized CASE", at: n.beat("r-case").from, body: <CaseBody c={c} /> },
    { n: 13, label: "The category dtype", at: n.beat("r-cat").from, body: <CatBody c={c} /> },
    { n: 14, label: "Datetimes", at: n.beat("r-dates").from, body: <DatesBody c={c} /> },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={doneAt} level={-36} />
      {items.map((it) => (
        <Sfx key={it.n} name="el-tap" at={it.at} level={-35} />
      ))}
      {pairs.map((p, i) => (
        <Sfx key={i} name="el-pencil" at={p.at + 4} level={-36} />
      ))}
      <Sfx name="el-chime" at={nextAt} level={-35} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>Questions 10 to 14</Kicker>
        <Headline lead="Nine done." turn="A line of code apiece." at={doneAt - 4} turnAt={lineAt - 4} size={64} />
        <Spot id="da-sql-stopwatch" video="da-sql" at={from + 6} left={1640} top={y(112)} width={130} height={140} />

        <RapidFire items={items} x={X0} top={y(LIST_TOP)} rowH={h(ROW)} width={600} at={doneAt} end={nextFrom} />

        {/* ── The bridge: three pandas words and their SQL twins ── */}
        <Line at={sqlAt} top={y(380)}>
          <span style={{ color: INK_SOFT }}>pandas</span>
          <span style={{ display: "inline-block", width: 220 }} />
          <span style={{ color: INK_SOFT }}>SQL</span>
        </Line>
        {pairs.map((p, i) => (
          <Line key={p.pandas} at={p.at} top={y(440) + i * h(62)}>
            <span style={{ display: "inline-block", width: 290 }}>
              <Mono color={BLUE_INK}>{p.pandas}</Mono>
            </span>
            <Mark at={p.at + 8}>{i < 2 ? <Mono>{p.sql}</Mono> : p.sql}</Mark>
          </Line>
        ))}
        <NextLine at={nextAt} x={R_X} y={y(818)} width={900}>
          SQL
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
