import React from "react";
import { AbsoluteFill } from "remotion";
import { RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, INK, INK_SOFT, note } from "../../editorial/style";
import { NextLine, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { FILE, QUICK } from "./data";
import {
  Bars,
  bytes,
  colsOf,
  Console,
  DataTable,
  Drift,
  FadeIn,
  geoOf,
  Headline,
  Kicker,
  lineOf,
  Listing,
  listingHeight,
  Mark,
  MARK,
  MARK_OK,
  Mono,
  OK,
  OK_INK,
  Spot,
  Strike,
  TitleCode,
  X0,
} from "./parts";

/** Where the answers go: right of the list. */
const R_X = 800;
const LIST_TOP = 360;
const ROW = 64;
const SIZE = 21;

type Ctx = {
  w: (beat: string, phrase: string) => number;
  y: Layout["y"];
  h: Layout["h"];
};

/** A one-line note in the answer column. */
const Line: React.FC<{ at: number; top: number; x?: number; children: React.ReactNode; color?: string; size?: number }> = ({
  at,
  top,
  x = R_X,
  children,
  color = INK,
  size = 26,
}) => (
  <Note at={at} x={x} y={top}>
    <span style={{ ...note(size, color), whiteSpace: "nowrap" }}>{children}</span>
  </Note>
);

/** 15. The page's running dict: five rows in, two groups held. */
const StreamBody: React.FC<{ c: Ctx }> = ({ c }) => {
  const S = QUICK.stream;
  const at = c.w("r-stream", "fold each record into a running dict");
  const top = c.y(372);
  const lH = listingHeight(S.lines.length, SIZE);
  return (
    <>
      <Listing
        lines={S.lines}
        x={R_X}
        top={top}
        width={620}
        size={SIZE}
        at={at - 6}
        marks={[{ line: lineOf(S.lines, "running[region] += n"), at: at + 6, color: MARK_OK }]}
      />
      <Console lines={S.out} x={R_X} top={top + lH + c.h(16)} width={360} at={c.w("r-stream", "Memory grows with the groups")} />
      <Line at={c.w("r-stream", "not the rows")} top={top + lH + c.h(96)}>
        five rows in, <Mark at={c.w("r-stream", "here, two")}>two groups held</Mark>
      </Line>
    </>
  );
};

/** 16. pandas against generators, with the memory measured at question 4. */
const PandasBody: React.FC<{ c: Ctx }> = ({ c }) => {
  const fits = c.w("r-pandas", "Reach for pandas when the data fits in memory");
  const gens = c.w("r-pandas", "Stay with generators");
  const wh = bytes(FILE.whole.peak);
  const st = bytes(FILE.stream.peak);
  return (
    <>
      <Line at={fits} top={c.y(372)}>
        <Mono color={BLUE_INK}>pandas</Mono>: fits in memory; vectorized columns, <Mono>groupby</Mono>, joins
      </Line>
      <Line at={gens} top={c.y(432)} color={OK_INK}>
        generators: it streams, or it won&apos;t fit
      </Line>
      <Line at={gens + 8} top={c.y(520)} color={INK_SOFT} size={22}>
        the same 1,000,000 rows, peak memory in Pyodide
      </Line>
      <Bars
        x={R_X}
        top={c.y(556)}
        width={480}
        rowH={c.h(60)}
        nameW={300}
        bars={[
          { name: <TitleCode>pd.read_csv</TitleCode>, value: FILE.whole.peak, ...wh, color: ACCENT, ink: ACCENT_INK, at: fits + 10 },
          { name: <TitleCode>for line in f</TitleCode>, value: FILE.stream.peak, ...st, color: OK, ink: OK_INK, at: gens + 10 },
        ]}
      />
    </>
  );
};

/** 17. The page's groupby, and the frame it returns. */
const GroupbyBody: React.FC<{ c: Ctx }> = ({ c }) => {
  const G = QUICK.groupby;
  const at = c.w("r-groupby", "Group by splits the rows by key");
  const keepsAt = c.w("r-groupby", "As index equals false keeps region a column");
  const top = c.y(372);
  const g = geoOf(G, R_X, top + listingHeight(G.lines.length, SIZE) + c.h(52), c.h, { rowH: 52 });
  const said = [c.w("r-groupby", "E U two twenty-five"), c.w("r-groupby", "U S one fifty")];
  return (
    <>
      <Listing
        lines={G.lines}
        x={R_X}
        top={top}
        width={760}
        size={SIZE}
        at={at - 4}
        marks={[
          { line: lineOf(G.lines, ".sum()"), at: c.w("r-groupby", "sums each group"), out: keepsAt },
          { line: lineOf(G.lines, "as_index=False"), at: keepsAt, color: MARK_OK },
        ]}
      />
      <DataTable
        g={g}
        cols={colsOf(G, { amount: { ink: BLUE_INK } })}
        at={c.w("r-groupby", "combines the answers")}
        rows={G.rows.map((cells, i) => ({ cells, at: c.w("r-groupby", "combines the answers") + 4 + i * 3 }))}
        marks={G.rows.map((_, row) => ({ row, col: G.cols.indexOf("amount"), at: said[row], color: MARK }))}
      />
      <Line at={keepsAt + 4} x={g.right + 30} top={g.rowMid(0) - c.h(16)} color={INK_SOFT} size={22}>
        <Mono>region</Mono> stays a column
      </Line>
    </>
  );
};

/** 18. The page's five pitfalls, each struck, with its fix. */
const PitfallsBody: React.FC<{ c: Ctx }> = ({ c }) => {
  const items: { bad: React.ReactNode; fix: React.ReactNode; at: number }[] = [
    { bad: <><Mono>x in a_list</Mono> in a loop</>, fix: <>a set</>, at: c.w("r-pitfalls", "membership tests against a list") },
    { bad: <><Mono>s += row</Mono> in a loop</>, fix: <><Mono>&quot;&quot;.join</Mono> once</>, at: c.w("r-pitfalls", "strings built with plus") },
    { bad: <Mono>df.iterrows()</Mono>, fix: <>a column operation</>, at: c.w("r-pitfalls", "iter rows") },
    { bad: <><Mono>pd.concat</Mono> row by row</>, fix: <>collect rows, build once</>, at: c.w("r-pitfalls", "a data frame grown concat by concat") },
    { bad: <><Mono>f.read()</Mono> of a whole file</>, fix: <>stream it</>, at: c.w("r-pitfalls", "a whole file read") },
  ];
  return (
    <>
      {items.map((it, i) => (
        <Note key={i} at={it.at} x={R_X} y={c.y(372) + i * c.h(66)}>
          <span style={{ display: "flex", alignItems: "baseline", gap: 26, whiteSpace: "nowrap" }}>
            <span style={{ display: "inline-block", width: 420, ...note(26, INK) }}>
              <Strike at={it.at + 10}>{it.bad}</Strike>
            </span>
            <span style={{ ...note(26, OK_INK), fontWeight: 600 }}>
              <FadeIn at={it.at + 14}>{it.fix}</FadeIn>
            </span>
          </span>
        </Note>
      ))}
      <Line at={c.w("r-pitfalls", "iter rows") + 20} top={c.y(372) + 5 * c.h(66) + c.h(8)} color={INK_SOFT} size={22}>
        the page: a column operation is often 10–100× faster than <Mono>iterrows</Mono>
      </Line>
    </>
  );
};

/**
 * Questions 15 to 18 beside a numbered list: the page's running dict; pandas
 * against generators, with question 4's measured memory; the page's groupby;
 * the page's five pitfalls, each struck beside its fix. The bridge turns the
 * script into a pipeline that runs every night.
 */
export const RapidScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: n.word, y, h };

  const from = n.beat("rapid-in").from;
  const downAt = n.word("rapid-in", "Fourteen down");
  const quickAt = n.word("rapid-in", "Four more, quickly");
  const nextFrom = n.beat("next").from;
  const togetherAt = n.word("next", "Put these together");
  const nightAt = n.word("next", "run them every night on a schedule");
  const pipelineAt = n.word("next", "one script has become a pipeline");
  const nextAt = n.word("next", "Next: pipelines and systems");
  const end = n.beat("next").to;

  const items: RapidItem[] = [
    { n: 15, label: "Aggregating a stream", at: n.beat("r-stream").from, body: <StreamBody c={c} /> },
    { n: 16, label: "pandas or plain Python", at: n.beat("r-pandas").from, body: <PandasBody c={c} /> },
    { n: 17, label: <>groupby in pandas</>, at: n.beat("r-groupby").from, body: <GroupbyBody c={c} /> },
    { n: 18, label: "Performance pitfalls", at: n.beat("r-pitfalls").from, body: <PitfallsBody c={c} /> },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={downAt} level={-36} />
      {items.map((it) => (
        <Sfx key={it.n} name="el-tap" at={it.at} level={-35} />
      ))}
      <Sfx name="el-pencil" at={nightAt} level={-36} />
      <Sfx name="el-chime" at={nextAt} level={-35} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>Questions 15 to 18</Kicker>
        <Headline lead="Fourteen down." turn="Four more, quickly." at={downAt - 4} turnAt={quickAt - 4} size={64} />
        <Spot id="da-sql-stopwatch" video="da-sql" at={from + 6} left={1640} top={y(112)} width={130} height={140} />

        <RapidFire items={items} x={X0} top={y(LIST_TOP)} rowH={h(ROW)} width={600} at={downAt} end={nextFrom} />

        {/* ── The bridge: the same script, every night ── */}
        <Line at={togetherAt} top={y(400)}>
          the script from these questions
        </Line>
        <Line at={nightAt} top={y(460)}>
          <Mark at={nightAt + 6}>every night, on a schedule</Mark>
        </Line>
        <Line at={pipelineAt} top={y(520)} color={OK_INK}>
          <span style={{ fontWeight: 650 }}>a pipeline</span>
        </Line>
        <NextLine at={nextAt} x={R_X} y={y(640)} width={900}>
          pipelines and systems
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
