import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK, OK_INK, RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, PAPER, headline, label, note, svgText } from "../../editorial/style";
import { NextLine, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { RAPID } from "./data";
import {
  Cylinder,
  DataTable,
  Drift,
  Flow,
  Headline,
  KeyArrow,
  Kicker,
  Listing,
  MARK_BAD,
  MARK_OK,
  SmallMono,
  Spot,
  Svg,
  TableName,
  tableGeometry,
  X0,
} from "./parts";

const R_X = 800;
const LIST_TOP = 380;
const ROW = 62;

type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"] };

// ── 12. ACID ────────────────────────────────────────────────────────────────

const Acid: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const parts = [
    { letter: "A", word: "atomicity", gist: "all or nothing", at: c.w("r-acid", "atomicity") },
    { letter: "C", word: "consistency", gist: "every constraint holds", at: c.w("r-acid", "consistency") },
    { letter: "I", word: "isolation", gist: "concurrent transactions don't corrupt each other", at: c.w("r-acid", "isolation") },
    { letter: "D", word: "durability", gist: "a commit survives a crash", at: c.w("r-acid", "durability") },
  ];
  const top = c.y(360);
  return (
    <>
      {parts.map((p, i) => {
        const x = R_X + 40 + i * 245;
        const a = ease(frame, p.at - 4, 12);
        return (
          <div key={p.letter} style={{ position: "absolute", left: x, top, width: 220, opacity: Math.max(0.25, a) }}>
            <div style={{ ...headline(110), color: a > 0.5 ? BLUE_INK : INK_SOFT, lineHeight: 1 }}>{p.letter}</div>
            <div style={{ ...label(26, INK), fontWeight: 700, marginTop: c.h(20), opacity: a }}>{p.word}</div>
            <div style={{ ...note(23, INK_SOFT), marginTop: c.h(10), opacity: ease(frame, p.at + 8, 10), width: 220 }}>{p.gist}</div>
          </div>
        );
      })}
    </>
  );
};

// ── 13. Normalization ───────────────────────────────────────────────────────

const Norm: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const onceAt = c.w("r-norm", "Normalization stores each fact once");
  const disagreeAt = c.w("r-norm", "leaves copies disagreeing");
  const writeAt = c.w("r-norm", "suits write-heavy systems");
  const denormAt = c.w("r-norm", "Denormalization repeats data");
  const skipAt = c.w("r-norm", "to skip joins");
  const buyingAt = c.w("r-norm", "buying read speed");
  const harderAt = c.w("r-norm", "harder updates");
  const firstAt = c.w("r-norm", "Normalize first");
  const profAt = c.w("r-norm", "where profiling blames a join");
  const EMAIL = "ava@mail.com";
  const NEW = "ava@new.com";
  const top = c.y(372);
  const cg = tableGeometry({ x: R_X, top, cols: [{ name: "id" }, { name: "email" }], rows: [["7", EMAIL]], extra: [["7", NEW]], headH: c.h(42), rowH: c.h(46), headSize: 20, bodySize: 22 });
  const og = tableGeometry({ x: 1100, top, cols: [{ name: "order_id" }, { name: "customer_id" }], rows: [["101", "7"], ["102", "7"], ["103", "7"]], headH: c.h(42), rowH: c.h(46), headSize: 20, bodySize: 22 });
  const dg = tableGeometry({ x: 1470, top, cols: [{ name: "order_id" }, { name: "email" }], rows: [["101", EMAIL], ["102", EMAIL], ["103", EMAIL]], extra: [["101", NEW]], headH: c.h(42), rowH: c.h(46), headSize: 20, bodySize: 22 });
  const notesTop = c.y(640);
  return (
    <>
      <TableName g={cg} at={onceAt}>
        customers
      </TableName>
      <DataTable g={cg} cols={[{ name: "id", ink: BLUE_INK }, { name: "email" }]} rows={[{ cells: ["7", EMAIL], at: onceAt + 4 }]} at={onceAt} marks={[{ row: 0, col: 1, at: onceAt + 10, color: MARK_OK }]} />
      <TableName g={og} at={onceAt + 6}>
        orders
      </TableName>
      <DataTable g={og} cols={[{ name: "order_id" }, { name: "customer_id", ink: BLUE_INK }]} rows={[0, 1, 2].map((i) => ({ cells: [`${101 + i}`, "7"], at: onceAt + 10 + i * 3 }))} at={onceAt + 6} />
      <TableName g={dg} at={denormAt}>
        orders, denormalized
      </TableName>
      <DataTable
        g={dg}
        cols={[{ name: "order_id" }, { name: "email" }]}
        rows={[0, 1, 2].map((i) => ({ cells: [`${101 + i}`, EMAIL], at: denormAt + 4 + i * 3 }))}
        at={denormAt}
        swaps={[{ row: 0, col: 1, at: harderAt, value: NEW, color: INK }]}
        marks={[
          { row: 1, col: 1, at: harderAt + 8, color: MARK_BAD },
          { row: 2, col: 1, at: harderAt + 12, color: MARK_BAD },
        ]}
      />
      <Note at={harderAt + 14} x={dg.x} y={dg.rowTop(3) + c.h(14)}>
        <span style={{ ...note(22, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>one copy changed, two stale</span>
      </Note>
      <Note at={disagreeAt} x={R_X} y={notesTop}>
        <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
          <b>Normalized:</b> each fact once, nothing to disagree
          <span style={{ color: INK_SOFT, opacity: ease(frame, writeAt, 10) }}>; suits write-heavy systems</span>
        </span>
      </Note>
      <Note at={skipAt} x={R_X} y={notesTop + c.h(44)}>
        <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
          <b>Denormalized:</b> no join
          <span style={{ color: INK_SOFT, opacity: ease(frame, buyingAt, 10) }}>; faster reads, more storage, harder updates</span>
        </span>
      </Note>
      <Note at={firstAt} x={R_X} y={notesTop + c.h(100)}>
        <span style={{ ...note(24, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
          Normalize first<span style={{ opacity: ease(frame, profAt, 10) }}>; denormalize where profiling blames a join</span>
        </span>
      </Note>
    </>
  );
};

// ── 14. Join types ──────────────────────────────────────────────────────────

const Joins: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const survivesAt = c.w("r-joins", "which unmatched rows survive");
  const innerAt = c.w("r-joins", "Inner keeps only matches");
  const innerRowsAt = c.w("r-joins", "twenty-four rows");
  const leftAt = c.w("r-joins", "Left keeps every customer");
  const nullsAt = c.w("r-joins", "with nulls where there's no order");
  const thirtyAt = c.w("r-joins", "thirty");
  const sixAt = c.w("r-joins", "the six who never ordered");
  const rightAt = c.w("r-joins", "Right mirrors it");
  const fullAt = c.w("r-joins", "full keeps both sides");
  const cy = c.y(530);
  const r = c.h(150);
  const lx = R_X + 200;
  const rx = R_X + 410;
  const inner = ease(frame, innerAt, 12);
  const left = ease(frame, leftAt, 12) * (1 - ease(frame, rightAt, 10));
  const right = ease(frame, rightAt + 2, 12) * (1 - ease(frame, fullAt, 10));
  const full = ease(frame, fullAt + 2, 12);
  const fillL = Math.max(left, full);
  const fillR = Math.max(right, full);
  return (
    <>
      <Svg opacity={ease(frame, survivesAt - 4, 12)}>
        <defs>
          <clipPath id="be-joins-left">
            <circle cx={lx} cy={cy} r={r} />
          </clipPath>
        </defs>
        <circle cx={lx} cy={cy} r={r} fill={`color-mix(in srgb, ${BAR} ${30 * fillL}%, ${PAPER})`} stroke={BAR} strokeWidth={2.5} />
        <circle cx={rx} cy={cy} r={r} fill={`color-mix(in srgb, ${BAR} ${30 * fillR}%, transparent)`} stroke={BAR} strokeWidth={2.5} />
        <circle cx={rx} cy={cy} r={r} clipPath="url(#be-joins-left)" fill={`color-mix(in srgb, ${OK} ${45 * inner}%, transparent)`} />
        <text x={lx - r * 0.5} y={cy - r - 18} textAnchor="middle" style={svgText(label(22, INK))}>
          customers
        </text>
        <text x={rx + r * 0.5} y={cy - r - 18} textAnchor="middle" style={svgText(label(22, INK))}>
          orders
        </text>
        <text x={(lx + rx) / 2} y={cy + 8} textAnchor="middle" style={svgText({ ...label(22, OK_INK), fontWeight: 700 })} opacity={ease(frame, innerRowsAt, 10)}>
          matches
        </text>
      </Svg>
      <Note at={innerRowsAt} x={R_X + 700} y={c.y(400)}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
          <b>inner</b>: <Num>{RAPID.joins.inner}</Num> rows
        </span>
      </Note>
      <Note at={thirtyAt} x={R_X + 700} y={c.y(400) + c.h(48)}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
          <b>left</b>: <Num>{RAPID.joins.left}</Num> rows
        </span>
      </Note>
      <Note at={nullsAt} x={R_X + 700} y={c.y(400) + c.h(96)}>
        <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>
          order columns <i>null</i> for:
        </span>
      </Note>
      {RAPID.joins.none.map((name, i) => (
        <Note key={name} at={sixAt + i * 2} x={R_X + 700 + (i % 3) * 100} y={c.y(400) + c.h(136) + Math.floor(i / 3) * c.h(40)}>
          <span style={{ ...note(22, BLUE_INK), fontWeight: 650, whiteSpace: "nowrap" }}>{name}</span>
        </Note>
      ))}
      <Note at={rightAt} x={R_X + 700} y={c.y(400) + c.h(250)}>
        <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
          <b>right</b>: the mirror
          <span style={{ opacity: ease(frame, fullAt, 10) }}>
            ; <b>full</b>: both sides
          </span>
        </span>
      </Note>
    </>
  );
};

// ── 15. Keys ────────────────────────────────────────────────────────────────

const Keys: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const pkAt = c.w("r-keys", "A primary key identifies each row");
  const uniqueAt = c.w("r-keys", "unique, never null");
  const autoAt = c.w("r-keys", "indexed automatically");
  const fkAt = c.w("r-keys", "A foreign key points at");
  const missingAt = c.w("r-keys", "no order can name a missing customer");
  const doesntAt = c.w("r-keys", "Postgres doesn't index the foreign key's column");
  const top = c.y(372);
  const cg = tableGeometry({
    x: 1330,
    top,
    cols: [{ name: "id", tag: { text: "PK", at: pkAt } }, { name: "name" }],
    rows: [["1", "Ava"], ["2", "Ben"]],
    headH: c.h(44),
    rowH: c.h(46),
    headSize: 20,
    bodySize: 22,
  });
  const og = tableGeometry({
    x: R_X,
    top,
    cols: [{ name: "order_id", tag: { text: "PK", at: pkAt + 6 } }, { name: "customer_id", tag: { text: "FK", at: fkAt } }],
    rows: [["101", "1"], ["103", "2"]],
    headH: c.h(44),
    rowH: c.h(46),
    headSize: 20,
    bodySize: 22,
  });
  const idxTop = c.y(700);
  const ig = tableGeometry({ x: R_X, top: idxTop, cols: RAPID.keys.cols.map((n) => ({ name: n })), rows: RAPID.keys.rows, headH: c.h(42), rowH: c.h(42), headSize: 20, bodySize: 21 });
  return (
    <>
      <TableName g={cg} at={pkAt}>
        customers
      </TableName>
      <DataTable g={cg} cols={[{ name: "id", ink: BLUE_INK, tag: { text: "PK", at: pkAt + 4 } }, { name: "name" }]} rows={[["1", "Ava"], ["2", "Ben"]].map((cells, i) => ({ cells, at: pkAt + 4 + i * 3 }))} at={pkAt} />
      <Note at={uniqueAt} x={cg.x} y={cg.rowTop(2) + c.h(14)}>
        <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
          unique, never null<span style={{ color: OK_INK, fontWeight: 650, opacity: ease(frame, autoAt, 10) }}>, indexed for you</span>
        </span>
      </Note>
      <TableName g={og} at={fkAt - 4}>
        orders
      </TableName>
      <DataTable
        g={og}
        cols={[{ name: "order_id", tag: { text: "PK", at: fkAt } }, { name: "customer_id", ink: BLUE_INK, tag: { text: "FK", at: fkAt + 4, color: BLUE_INK } }]}
        rows={[
          { cells: ["101", "1"], at: fkAt },
          { cells: ["103", "2"], at: fkAt + 3 },
          { cells: ["104", "9"], at: missingAt, ghost: true, strikeAt: missingAt + 10 },
        ]}
        at={fkAt - 4}
      />
      {[0, 1].map((i) => (
        <KeyArrow key={i} from={[og.right + 8, og.rowMid(i)]} to={[cg.x - 8, cg.rowMid(i)]} at={fkAt + 8 + i * 4} />
      ))}
      <Note at={missingAt + 10} x={og.x} y={og.rowTop(3) + c.h(14)}>
        <span style={{ ...note(22, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>no customer 9: refused</span>
      </Note>
      <Note at={doesntAt - 4} x={R_X} y={idxTop - c.h(48)}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
          Indexes on the transfer example&rsquo;s tables, from <SmallMono color={INK}>pg_indexes</SmallMono>:
        </span>
      </Note>
      <DataTable g={ig} cols={RAPID.keys.cols.map((n) => ({ name: n }))} rows={RAPID.keys.rows.map((cells, i) => ({ cells, at: doesntAt + i * 3 }))} at={doesntAt - 2} />
      <Note at={doesntAt + 12} x={ig.right + 40} y={idxTop + c.h(30)}>
        <div style={{ ...note(22, INK), width: 400 }}>
          primary keys only: <b style={{ color: ACCENT_INK }}>nothing on</b> <SmallMono>from_id</SmallMono> or <SmallMono>to_id</SmallMono>, the foreign keys
        </div>
      </Note>
    </>
  );
};

// ── 16. Covering index ──────────────────────────────────────────────────────

const Cover: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const holdsAt = c.w("r-cover", "holds every column a query needs");
  const aloneAt = c.w("r-cover", "answers from the index alone");
  const zeroAt = c.w("r-cover", "zero trips to the table");
  const priceAt = c.w("r-cover", "a wider index");
  const top = c.y(360);
  const cv = RAPID.cover;
  return (
    <>
      <Listing lines={cv.query.slice(1)} x={R_X} top={top} width={760} size={20} at={holdsAt - 6} />
      <Listing lines={cv.include} x={R_X} top={top + c.h(118)} width={760} size={20} at={holdsAt} marks={[{ line: "INCLUDE", text: "INCLUDE (amount)", at: holdsAt + 8 }]} />
      <Note at={aloneAt - 6} x={R_X} y={top + c.h(250)}>
        <div style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
          index on <SmallMono>customer_id</SmallMono> alone: <SmallMono>Bitmap Heap Scan</SmallMono>,{" "}
          <b style={{ color: ACCENT_INK }}>
            <Num>{cv.heapBlocks}</Num> table pages
          </b>
        </div>
      </Note>
      <Note at={aloneAt} x={R_X} y={top + c.h(300)}>
        <div style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
          with <SmallMono>amount</SmallMono> inside: <SmallMono>Index Only Scan</SmallMono>,{" "}
          <b style={{ color: OK_INK }}>
            <SmallMono>Heap Fetches: {cv.heapFetches}</SmallMono>
          </b>
        </div>
      </Note>
      <Note at={zeroAt + 4} x={R_X} y={top + c.h(360)}>
        <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
          the same <SmallMono>SUM</SmallMono>, {cv.spend}, <b style={{ color: OK_INK }}>zero trips to the table</b>
        </span>
      </Note>
      <Note at={priceAt - 4} x={R_X} y={top + c.h(420)}>
        <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
          the price: <b>a wider index</b>
        </span>
      </Note>
    </>
  );
};

/**
 * The quick round: five questions down the left, each answer on the right
 * while it is read, then the bridge into concurrency with the hero back on
 * the page.
 */
export const RapidScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: n.word, y, h };

  const from = n.beat("rapid-in").from;
  const moreAt = n.word("rapid-in", "Five more");
  const eachAt = n.word("rapid-in", "a sentence or two each");
  const end = n.beat("next").from - 4;
  const sideAt = n.word("next", "the database's side of one problem");
  const isoAt = n.word("next", "Isolation, locks and deadlocks");
  const manyAt = n.word("next", "many requests arriving at once");
  const nextAt = n.word("next", "Next:");

  const items: RapidItem[] = [
    { n: 12, label: "ACID", at: n.word("r-acid", "ACID"), body: <Acid c={c} /> },
    { n: 13, label: "Normalization vs denormalization", at: n.word("r-norm", "Normalization stores"), body: <Norm c={c} /> },
    { n: 14, label: "The join types", at: n.word("r-joins", "Joins differ"), body: <Joins c={c} /> },
    { n: 15, label: "Primary key vs foreign key", at: n.word("r-keys", "A primary key"), body: <Keys c={c} /> },
    { n: 16, label: "Covering index", at: n.word("r-cover", "A covering index"), body: <Cover c={c} /> },
  ];
  const listBottom = y(LIST_TOP) + items.length * h(ROW);
  const dbTop = y(560);

  return (
    <AbsoluteFill>
      <Sfx name="el-chime" at={moreAt} level={-32} />
      {items.map((it) => (
        <Sfx key={it.n} name="el-tap" at={it.at} level={-32} />
      ))}
      <Sfx name="el-pop" at={isoAt + 4} level={-30} />
      <Sfx name="el-sprinkle" at={manyAt + 2} level={-34} />
      <Sfx name="el-pencil" at={nextAt} level={-34} />

      <Drift from={from} to={n.beat("next").to + 40}>
        <Kicker at={moreAt}>Quick round</Kicker>
        <Headline lead="Five more." turn="A sentence or two each." at={moreAt} turnAt={eachAt - 2} size={64} />
        <RapidFire items={items} x={X0} top={y(LIST_TOP)} rowH={h(ROW)} width={600} at={moreAt + 6} end={end} />

        {/* ── The bridge ── */}
        <Spot art="chipmunk" at={isoAt + 4} left={1260} top={y(330)} width={480} />
        <Note at={isoAt} x={X0} y={listBottom + h(46)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            Isolation, locks, deadlocks:
            <span style={{ opacity: ease(frame, sideAt, 10) }}> the database&rsquo;s side</span>
          </span>
        </Note>
        <Note at={manyAt} x={X0} y={listBottom + h(94)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            of <b style={{ color: BLUE_INK }}>many requests arriving at once</b>
          </span>
        </Note>
        {Array.from({ length: 5 }, (_, i) => (
          <Flow key={i} points={[[800, dbTop + h(20) + i * h(30)], [1040, dbTop + h(80)]]} at={manyAt + i * 2} color={BAR} width={2.4} head={12} out={end + 400} />
        ))}
        <Cylinder x={1060} y={dbTop + h(10)} w={120} h={h(140)} at={manyAt - 2} title="" />
        <NextLine at={nextAt} x={X0} y={y(820)} width={900}>
          concurrency
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
