import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, PAPER, label, note, svgText } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { INDEX, thousands } from "./data";
import { Bar, Drift, Listing, listingHeight, MARK_RED, PageStrip, PlanBox, X0 } from "./parts";

const TOP = 330;
const SIZE = 21;
const PLAN = 20;
const R_X = 1110;
const R_W = 700;
const TREE_TOP = 320;
const STRIP_Y = 700;

/** One B-tree node: a row of key slots, drawn schematically. */
const Node: React.FC<{ x: number; y: number; keys: readonly string[]; at: number; hot?: number; hotAt?: number }> = ({ x, y, keys, at, hot, hotAt }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const slot = 62;
  const w = keys.length * slot;
  const hp = hotAt === undefined ? 0 : ease(frame, hotAt, 10);
  return (
    <g opacity={p}>
      <rect x={x - w / 2} y={y} width={w} height={44} rx={5} fill={PAPER} stroke={INK_SOFT} strokeWidth={1.5} />
      {keys.map((k, i) => (
        <g key={i}>
          {i > 0 ? <line x1={x - w / 2 + i * slot} y1={y + 6} x2={x - w / 2 + i * slot} y2={y + 38} stroke={HAIRLINE} strokeWidth={1} /> : null}
          {hot === i && hp > 0 ? <rect x={x - w / 2 + i * slot + 4} y={y + 5} width={slot - 8} height={34} rx={3} fill={inkOf.yellow} opacity={0.45 * hp} /> : null}
          <text
            x={x - w / 2 + i * slot + slot / 2}
            y={y + 29}
            textAnchor="middle"
            style={svgText({ fontFamily: MONO, fontSize: 21, fontWeight: hot === i ? 700 : 400, color: k === "…" ? INK_SOFT : INK })}
          >
            {k}
          </text>
        </g>
      ))}
    </g>
  );
};

/**
 * Question 3. Left: the index, the listing and the plan Postgres printed for
 * customer 42 (a Bitmap Heap Scan, Heap Blocks: exact=20). Right: the
 * B-tree, drawn schematically, its leaf holding 42, and from that one entry
 * a line to each of the twenty pages its rows sit on (their real page
 * numbers, from ctid) along the table's 7,360. Then the unselective filter:
 * 'shipped' matches nine rows in ten, so the plan stays a Seq Scan and the
 * strip is swept end to end. Last, what an index costs a write: WAL records
 * for 10,000 inserted rows, with no index and with three.
 */
export const IndexScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("index").from;
  const qAt = n.word("index", "Question three");
  const textAt = n.word("index", "What is an index");
  const sortedAt = n.word("index", "a sorted structure");
  const treeAt = n.word("index", "a B-tree by default");
  const pointsAt = n.word("index", "points at its rows");
  const selectiveAt = n.word("index-help", "a filter is selective");
  const findsAt = n.word("index-help", "finds forty-two in the index");
  const twentyAt = n.word("index-help", "the twenty pages");
  const outOfAt = n.word("index-help", "out of seven thousand");
  const lowAt = n.word("index-low", "It doesn't help");
  const nineAt = n.word("index-low", "Nine in ten orders");
  const statusAt = n.word("index-low", "an index on status");
  const scansAt = n.word("index-low", "Postgres scans the table");
  const passAt = n.word("index-low", "one pass beats");
  const costsAt = n.word("index-writes", "every index costs writes");
  const noneAt = n.word("index-writes", "ten thousand log records");
  const fourAt = n.word("index-writes", "four times that");
  const end = n.beat("index-writes").to;

  const createTop = y(TOP);
  const queryTop = createTop + listingHeight(1, SIZE) + h(20);
  const planTop = queryTop + listingHeight(INDEX.query.length, SIZE) + h(22);
  const shippedPlanTop = y(TOP) + listingHeight(INDEX.shippedQuery.length, SIZE) + h(22);
  const barsTop = shippedPlanTop + h(180);

  // The tree: a root, two inner nodes, a leaf holding 42.
  const rootX = R_X + R_W / 2;
  const tY = y(TREE_TOP);
  const leafX = R_X + 200;
  const leafY = tY + 200;
  const hotX = leafX - 62 / 2 + 62 * 0.5; // the second of four slots
  const px = (page: number) => R_X + ((page + 0.5) / INDEX.pages) * R_W;
  const stripY = y(STRIP_Y);
  const fanP = ease(frame, twentyAt, 18) * (1 - ease(frame, lowAt, 10));
  const treeOut = ease(frame, lowAt, 12);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={treeAt} level={-35} />
      <Sfx name="el-tap" at={findsAt + 4} level={-33} />
      <Sfx name="el-sprinkle" at={twentyAt + 2} level={-33} />
      <Sfx name="el-whoosh" at={scansAt} level={-35} />
      <Sfx name="el-pop" at={noneAt} level={-33} />
      <Sfx name="el-pop" at={fourAt} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is an index, and when does it help (or hurt)?
        </QuestionCard>

        {/* ── Left: the index, and the plan with it ── */}
        <Listing lines={INDEX.create} x={X0} top={createTop} width={640} size={SIZE} at={sortedAt} out={lowAt - 2} />
        <Listing lines={INDEX.query} x={X0} top={queryTop} width={640} size={SIZE} at={selectiveAt - 2} out={lowAt - 2} marks={[{ line: "WHERE", at: selectiveAt + 6 }]} />
        <PlanBox
          lines={INDEX.plan}
          x={X0}
          top={planTop}
          width={940}
          size={PLAN}
          at={findsAt - 6}
          step={2}
          out={lowAt - 2}
          marks={[
            { line: "Bitmap Index Scan", text: "Bitmap Index Scan", at: findsAt + 4 },
            { line: "Heap Blocks", at: twentyAt + 2 },
          ]}
        />

        {/* ── Right: the B-tree, schematic ── */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - treeOut }}>
          <text x={R_X} y={tY - 14} style={svgText({ ...label(21, INK_SOFT) })} opacity={ease(frame, treeAt, 12)}>
            B-tree on customer_id (drawn)
          </text>
          {[
            [rootX, tY + 20, leafX + 60, leafY - 70],
            [rootX, tY + 20, R_X + R_W - 160, leafY - 70],
            [leafX + 60, leafY - 26, leafX, leafY],
          ].map(([x1, y1, x2, y2], i) => (
            <line key={i} x1={x1} y1={y1 + 24} x2={x2} y2={y2} stroke={INK_SOFT} strokeWidth={1.5} opacity={ease(frame, treeAt + 4 + i * 3, 10)} />
          ))}
          <Node x={rootX} y={tY + 20} keys={["…", "…", "…"]} at={treeAt} />
          <Node x={leafX + 60} y={leafY - 70} keys={["…", "…"]} at={treeAt + 4} />
          <Node x={R_X + R_W - 160} y={leafY - 70} keys={["…", "…"]} at={treeAt + 6} />
          <Node x={leafX} y={leafY} keys={["41", "42", "43", "…"]} at={treeAt + 8} hot={1} hotAt={findsAt + 4} />
        </svg>
        <div
          style={{ position: "absolute", left: leafX + 140, top: leafY + 6, ...note(22, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, pointsAt, 12) * (1 - treeOut) }}
        >
          each key points at its rows
        </div>

        {/* From the one entry, a line to each of its twenty pages. */}
        {fanP > 0 ? (
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            {INDEX.pages42.map((page, i) => {
              const tx = px(page);
              const sx = hotX + 31;
              const sy = leafY + 44;
              const p = Math.min(1, Math.max(0, fanP * 1.6 - i * 0.03));
              return <line key={page} x1={sx} y1={sy} x2={sx + (tx - sx) * p} y2={sy + (stripY - 10 - sy) * p} stroke={inkOf.yellow} strokeWidth={1.6} opacity={0.9} />;
            })}
          </svg>
        ) : null}

        <PageStrip
          x={R_X}
          y={stripY}
          width={R_W}
          pages={INDEX.pages}
          at={pointsAt}
          ticks={[{ pages: INDEX.pages42, at: twentyAt + 8, out: lowAt }]}
          sweep={{ from: scansAt, to: scansAt + 40 }}
        />
        <div style={{ position: "absolute", left: R_X, top: stripY + h(64), ...note(22, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, pointsAt, 12) }}>
          orders, page by page: <Num>{thousands(INDEX.pages)}</Num> pages
        </div>
        <Note at={outOfAt} x={R_X} y={stripY + h(100)} out={lowAt}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            reads <b>{INDEX.heapBlocks}</b> of them
          </span>
        </Note>
        <Note at={passAt} x={R_X} y={stripY + h(100)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            reads them all, in order: one pass
          </span>
        </Note>

        {/* ── An unselective filter: the index on status goes unused ── */}
        <Note at={nineAt} x={X0} y={y(TOP) - h(46)}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>
            An index on <QMono>status</QMono> exists; <Num>{thousands(INDEX.shipped)}</Num> rows are shipped
          </span>
        </Note>
        <Listing lines={INDEX.shippedQuery} x={X0} top={y(TOP)} width={640} size={SIZE} at={lowAt} marks={[{ line: "WHERE", at: nineAt + 6 }]} />
        <PlanBox
          lines={INDEX.shippedPlan}
          x={X0}
          top={shippedPlanTop}
          width={940}
          size={PLAN}
          at={statusAt}
          marks={[{ line: "Seq Scan", text: "Seq Scan", at: scansAt, color: MARK_RED }]}
        />
        <Note at={scansAt + 6} x={R_X} y={y(TREE_TOP) + h(20)}>
          <div style={{ ...note(26, INK), width: 640 }}>
            With 9 rows in 10 matching, jumping from the index to each row costs more than reading every page once.
          </div>
        </Note>

        {/* ── What each index costs a write ── */}
        <Note at={costsAt} x={X0} y={barsTop}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>
            Inserting <Num>10,000</Num> rows: write-ahead log records
          </span>
        </Note>
        <Bar
          x={X0}
          y={barsTop + h(50)}
          width={720}
          value={INDEX.walNone}
          max={INDEX.walThree}
          at={noneAt - 4}
          label="no index"
          shown={thousands(INDEX.walNone)}
          color={BAR}
          ink={BLUE_INK}
        />
        <Bar
          x={X0}
          y={barsTop + h(140)}
          width={720}
          value={INDEX.walThree}
          max={INDEX.walThree}
          at={fourAt - 4}
          label="three indexes"
          shown={thousands(INDEX.walThree)}
          color={inkOf.red}
          ink={ACCENT_INK}
        />
      </Drift>
    </AbsoluteFill>
  );
};
