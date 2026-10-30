import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QMono, RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { NextLine, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { Arrow, Chip, Drift, Headline, Kicker, Machine, OK, OK_INK, Spot, X0 } from "./parts";

const R_X = 780;
const LIST_TOP = 352;
const ROW = 62;

type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"] };

const Line: React.FC<{ at: number; x?: number; top: number; size?: number; color?: string; weight?: number; children: React.ReactNode }> = ({
  at,
  x = R_X,
  top,
  size = 25,
  color = INK,
  weight = 500,
  children,
}) => (
  <Note at={at} x={x} y={top}>
    <span style={{ ...note(size, color), fontWeight: weight, whiteSpace: "nowrap" }}>{children}</span>
  </Note>
);

// ── 15. RDD or DataFrame ────────────────────────────────────────────────────
const Rdd: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const objAt = c.w("r-rdd", "a low-level collection of objects");
  const seeAt = c.w("r-rdd", "can't see inside");
  const dfAt = c.w("r-rdd", "A DataFrame has a schema");
  const catAt = c.w("r-rdd", "the Catalyst optimizer");
  const pushAt = c.w("r-rdd", "push filters down");
  const pruneAt = c.w("r-rdd", "prune columns");
  const codeAt = c.w("r-rdd", "generate code");
  const preferAt = c.w("r-rdd", "Prefer DataFrames");
  const onlyAt = c.w("r-rdd", "use RDDs only");
  const cols = [
    ["user_id", "long"],
    ["region", "string"],
    ["amount", "double"],
  ];
  return (
    <>
      <Line at={objAt - 2} top={c.y(350)} size={27} weight={700}>
        RDD
      </Line>
      {[0, 1, 2, 3].map((k) => (
        <div
          key={k}
          style={{
            position: "absolute",
            left: R_X + 90 + k * 76,
            top: c.y(348),
            width: 62,
            height: c.h(40),
            borderRadius: 6,
            background: ds("gray", 300),
            opacity: ease(frame, objAt + k * 2, 10),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            ...label(22, PAPER),
            fontWeight: 800,
          }}
        >
          ?
        </div>
      ))}
      <Line at={seeAt - 2} x={R_X + 410} top={c.y(352)} color={INK_SOFT} size={23}>
        objects Spark can&apos;t see inside
      </Line>
      <Line at={dfAt - 2} top={c.y(436)} size={27} weight={700}>
        DataFrame
      </Line>
      <Note at={dfAt + 4} x={R_X + 180} y={c.y(434)}>
        <span style={{ display: "flex", gap: 8 }}>
          {cols.map(([name, type]) => (
            <Chip key={name} mono size={20}>
              {name}: <span style={{ color: INK_SOFT }}>{type}</span>
            </Chip>
          ))}
        </span>
      </Note>
      <Line at={catAt - 2} top={c.y(500)} size={24}>
        a schema, so <b>Catalyst</b> can
        <span style={{ opacity: ease(frame, pushAt, 10) }}> push filters down,</span>
        <span style={{ opacity: ease(frame, pruneAt, 10) }}> prune columns,</span>
        <span style={{ opacity: ease(frame, codeAt, 10) }}> generate code</span>
      </Line>
      <Line at={preferAt - 2} top={c.y(580)} size={26} color={OK_INK} weight={700}>
        Prefer DataFrames
        <span style={{ opacity: ease(frame, onlyAt, 10), color: INK, fontWeight: 500 }}>; RDDs only for what they can&apos;t express</span>
      </Line>
    </>
  );
};

// ── 16. collect() ───────────────────────────────────────────────────────────
const Collect: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const pullAt = c.w("r-collect", "pulls every row to the driver");
  const oneAt = c.w("r-collect", "one machine");
  const oomAt = c.w("r-collect", "runs out of memory");
  const undoAt = c.w("r-collect", "undoes the distributing");
  const lookAt = c.w("r-collect", "To look, use show or take");
  const saveAt = c.w("r-collect", "To save, write from the executors in parallel");
  const exTop = (k: number) => c.y(350 + k * 66);
  const DRIVER_X = R_X + 520;
  const drvTop = c.y(400);
  const oom = ease(frame, oomAt, 10);
  return (
    <>
      {[0, 1, 2, 3].map((k) => (
        <React.Fragment key={k}>
          <Machine x={R_X} top={exTop(k)} width={200} height={c.h(52)} at={pullAt - 6 + k * 2} />
          <div style={{ position: "absolute", left: R_X + 14, top: exTop(k) + c.h(26) - 13, ...label(20, INK_SOFT), opacity: ease(frame, pullAt - 4 + k * 2, 10) }}>executor {k + 1}</div>
          <Arrow from={[R_X + 208, exTop(k) + c.h(26)]} to={[DRIVER_X - 10, drvTop + c.h(70)]} at={pullAt + 4 + k * 3} dur={12} color={ACCENT} width={1.8} head={10} />
        </React.Fragment>
      ))}
      <Machine x={DRIVER_X} top={drvTop} width={240} height={c.h(140)} at={pullAt + 2} tone="bad" toneAt={oomAt} name="driver" />
      <Line at={oneAt - 2} x={DRIVER_X + 16} top={drvTop + c.h(44)} size={22} color={INK_SOFT}>
        one machine
      </Line>
      <Line at={oomAt} x={DRIVER_X + 16} top={drvTop + c.h(84)} size={23} color={ACCENT_INK} weight={700}>
        <span style={{ opacity: oom }}>out of memory</span>
      </Line>
      <Line at={undoAt - 2} top={c.y(630)} size={23} color={ACCENT_INK}>
        and the work is no longer distributed
      </Line>
      <Line at={lookAt - 2} top={c.y(700)} size={24} color={OK_INK} weight={650}>
        to look: <span style={{ fontFamily: MONO, fontSize: 22 }}>show(n)</span>, <span style={{ fontFamily: MONO, fontSize: 22 }}>take(n)</span>
      </Line>
      <Line at={saveAt - 2} top={c.y(746)} size={24} color={OK_INK} weight={650}>
        to save: <span style={{ fontFamily: MONO, fontSize: 22 }}>write</span>, from the executors in parallel
      </Line>
    </>
  );
};

// ── 17. Predicate and projection pushdown ───────────────────────────────────
const GROUPS = [
  { min: 3, max: 120 },
  { min: 410, max: 980 },
  { min: 15, max: 260 },
];
const CUT = 500;
const COLUMNS = ["event_id", "user_id", "amount", "region", "ts", "payload"];
const NAMED = new Set(["amount", "region"]);

const Push: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const predAt = c.w("r-push", "Predicate pushdown filters at the file scan");
  const parquetAt = c.w("r-push", "Parquet, a columnar file format");
  const minAt = c.w("r-push", "minimum and maximum");
  const skipAt = c.w("r-push", "skips groups that can't match");
  const projAt = c.w("r-push", "Projection pushdown reads only the columns");
  const freeAt = c.w("r-push", "DataFrames get both for free");
  const skip = ease(frame, skipAt, 12);
  const prune = ease(frame, projAt + 8, 12);
  return (
    <>
      <Line at={predAt - 2} top={c.y(342)} size={25} weight={700}>
        Predicate pushdown:{" "}
        <span style={{ fontFamily: MONO, fontSize: 23, fontWeight: 600 }}>
          WHERE amount &gt; {CUT}
        </span>
      </Line>
      <Line at={parquetAt} top={c.y(392)} size={22} color={INK_SOFT}>
        a Parquet file&apos;s row groups
      </Line>
      {GROUPS.map((g, k) => {
        const can = g.max > CUT;
        const off = can ? 0 : skip;
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: R_X + k * 290,
              top: c.y(434),
              width: 270,
              height: c.h(62),
              boxSizing: "border-box",
              borderRadius: 8,
              border: `2px solid ${can && skip > 0.5 ? OK : off > 0.5 ? ds("gray", 300) : BAR}`,
              background: `color-mix(in srgb, ${BAR} ${14 * (1 - off)}%, ${PAPER})`,
              opacity: ease(frame, parquetAt + 4 + k * 3, 10) * (1 - 0.45 * off),
              display: "flex",
              alignItems: "center",
              padding: "0 14px",
              gap: 10,
              ...note(21, INK),
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ opacity: ease(frame, minAt, 10) }}>
              min {g.min} · max {g.max}
            </span>
            <span style={{ marginLeft: "auto", ...label(20, can ? OK_INK : INK_SOFT), opacity: skip }}>{can ? "read" : "skipped"}</span>
          </div>
        );
      })}
      <Line at={projAt - 2} top={c.y(536)} size={25} weight={700}>
        Projection pushdown: <span style={{ fontWeight: 500 }}>only the columns named</span>
      </Line>
      <Note at={projAt + 4} x={R_X} y={c.y(586)}>
        <span style={{ display: "flex", gap: 8 }}>
          {COLUMNS.map((col) => (
            <span key={col} style={{ opacity: NAMED.has(col) ? 1 : 1 - 0.72 * prune }}>
              <Chip mono size={20} color={NAMED.has(col) && prune > 0.5 ? OK : ds("gray", 400)} ink={NAMED.has(col) ? OK_INK : INK_SOFT}>
                {col}
              </Chip>
            </span>
          ))}
        </span>
      </Note>
      <Line at={freeAt - 2} top={c.y(668)} size={26} color={OK_INK} weight={700}>
        DataFrames get both for free
      </Line>
    </>
  );
};

/**
 * Questions 15 to 17: RDD against DataFrame, why not collect(), and
 * predicate and projection pushdown, each answered on the right of a
 * numbered list. Then the bridge: everything here assumed the data had
 * stopped arriving; streaming is where it doesn't. The honeybee comes back
 * for the close.
 */
export const RapidScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: n.word, y, h };

  const from = n.beat("rapid-in").from;
  const threeAt = n.word("rapid-in", "Three quick ones");
  const closeAt = n.word("rapid-in", "to close");
  const nextFrom = n.beat("next").from;
  const assumedAt = n.word("next", "assumed the data had finished arriving");
  const neverAt = n.word("next", "In streaming, it never does");
  const nextAt = n.word("next", "Next: streaming and messaging");
  const end = n.beat("next").to;

  const items: RapidItem[] = [
    { n: 15, label: "RDD or DataFrame", at: n.beat("r-rdd").from, body: <Rdd c={c} /> },
    {
      n: 16,
      label: (
        <>
          Why avoid <QMono>collect()</QMono>
        </>
      ),
      at: n.beat("r-collect").from,
      body: <Collect c={c} />,
    },
    { n: 17, label: "Predicate and projection pushdown", at: n.beat("r-push").from, body: <Push c={c} /> },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={threeAt} level={-37} />
      {items.map((it) => (
        <Sfx key={it.n} name="el-tap" at={it.at} level={-35} />
      ))}
      <Sfx name="el-pop" at={assumedAt} level={-35} />
      <Sfx name="el-chime" at={nextAt} level={-35} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>Questions 15 to 17</Kicker>
        <Headline lead="Three quick ones," turn="to close." at={threeAt - 4} turnAt={closeAt - 2} size={64} />

        <RapidFire items={items} x={X0} top={y(LIST_TOP)} rowH={h(ROW)} width={600} at={threeAt} end={nextFrom} />

        {/* The bridge: data that never stops arriving. */}
        <Note at={assumedAt} x={R_X} y={y(430)}>
          <span style={{ ...note(30, INK), display: "block", lineHeight: 1.3, whiteSpace: "nowrap" }}>
            Every answer here assumed
            <br />
            the data had <b>finished arriving</b>.
          </span>
        </Note>
        <Note at={neverAt - 2} x={R_X} y={y(540)}>
          <span style={{ ...note(30, INK), fontWeight: 700, whiteSpace: "nowrap" }}>In streaming, it never does.</span>
        </Note>
        <Spot id="de-distributed-honeybee" at={assumedAt + 4} left={1420} top={y(560)} width={360} height={282} />
        <NextLine at={nextAt} x={R_X} y={y(760)} width={560}>
          streaming and messaging
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
