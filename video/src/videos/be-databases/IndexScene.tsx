import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK, OK_INK, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, HAIRLINE, INK, INK_SOFT, PAPER, label, note, svgText } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds, inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { INDEX, thousands } from "./data";
import { Drift, Flow, Listing, listingHeight, MARK_GREEN, MARK_RED, PageGrid, PlanBox, Svg, X0 } from "./parts";

const TOP = 304;
const SIZE = 21;
const PLAN = 19;
const PLAN_W = 960;
const R_X = 1110;
const R_W = 690;
/** The table's 7,360 pages, as 160 x 46 squares. */
const COLS = 160;
const ROWS = INDEX.pages / COLS;
const GRID_HIGH = 330;
const GRID_LOW = 620;
const TREE_TOP = 372;
const NODE_W = 96;
const NODE_H = 34;
const LEAVES = 6;
const BUCKETS = 8;

/** One B-tree page: a rounded box with key slots, tinted when on the path. */
const TreeNode: React.FC<{ cx: number; y: number; at: number; hot: number }> = ({ cx, y, at, hot }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10);
  if (p <= 0) return null;
  return (
    <g opacity={p}>
      <rect
        x={cx - NODE_W / 2}
        y={y}
        width={NODE_W}
        height={NODE_H}
        rx={5}
        fill={hot > 0 ? `color-mix(in srgb, ${ds("yellow", 400)} ${55 * hot}%, ${PAPER})` : PAPER}
        stroke={hot > 0.5 ? inkOf.yellow : INK_SOFT}
        strokeWidth={hot > 0.5 ? 2.5 : 1.6}
      />
      {[1, 2, 3].map((k) => (
        <line key={k} x1={cx - NODE_W / 2 + (k * NODE_W) / 4} x2={cx - NODE_W / 2 + (k * NODE_W) / 4} y1={y + 7} y2={y + NODE_H - 7} stroke={HAIRLINE} strokeWidth={1} />
      ))}
    </g>
  );
};

/**
 * Question 2. Left: the lookup, one email among a million users, and the
 * plan Postgres printed for it. Right: the users table as its 7,360 pages,
 * swept end to end as the narration says the scan read them all, the one
 * page holding the row lit. Then the index: the CREATE INDEX over a
 * three-level B-tree (root, branch, leaf, the path in yellow) and from the
 * leaf one arrow to the table page, while the plan becomes the index scan
 * that read four pages: "4 pages" against "7,360". log n against n, and a
 * range walked along the leaves. Last, a hash index: one bucket for the
 * equality, nothing to walk for a range, and the plan back to reading the
 * whole table.
 */
export const IndexScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("index").from;
  const qAt = n.word("index", "Question two");
  const textAt = n.word("index", "What is a database index");
  const findAt = n.word("index-scan", "Find one email");
  const readsAt = n.word("index-scan", "Postgres reads all");
  const pagesAt = n.word("index-scan", "seven thousand three hundred sixty pages");
  const keepAt = n.word("index-scan", "to keep one row");
  const structAt = n.word("index-tree", "a separate structure");
  const btreeAt = n.word("index-tree", "usually a B-tree");
  const levelsAt = n.word("index-tree", "three levels deep");
  const threeAt = n.word("index-tree", "three index pages");
  const tableAt = n.word("index-tree", "one table page");
  const fourAt = n.word("index-tree", "four pages");
  const notAt = n.word("index-tree", "not seven thousand");
  const logAt = n.word("index-log", "log n against n");
  const rangesAt = n.word("index-log", "it answers ranges too");
  const kindAt = n.word("index-hash", "The kind matters");
  const hashAt = n.word("index-hash", "A hash index");
  const straightAt = n.word("index-hash", "goes straight to one email");
  const rangeAt = n.word("index-hash", "ask it for a range");
  const againAt = n.word("index-hash", "reads the whole table again");
  const end = n.beat("index-hash").to;

  // ── Left: the query and its plans ──
  const listTop = y(TOP);
  const planTop = listTop + listingHeight(INDEX.query.length, SIZE) + h(24);

  // ── Right: the pages, high for the scan, low under the tree ──
  const move = ease(frame, structAt - 4, 24);
  const gridTop = y(GRID_HIGH) + (y(GRID_LOW) - y(GRID_HIGH)) * move;
  const pitch = R_W / COLS;
  const gridBottom = gridTop + ROWS * pitch;

  // The tree: a root, three branches, six leaves; the path runs root,
  // middle branch, third leaf.
  const treeOut = kindAt - 2;
  const tOut = ease(frame, treeOut, 12);
  const lv = [y(TREE_TOP), y(TREE_TOP) + h(64), y(TREE_TOP) + h(128)];
  const rootX = R_X + R_W / 2;
  const branchX = [R_X + 120, R_X + R_W / 2, R_X + R_W - 120];
  const leafX = Array.from({ length: LEAVES }, (_, i) => R_X + 55 + (i * (R_W - 110)) / (LEAVES - 1));
  const path = ease(frame, threeAt, 8);
  const hotRoot = ease(frame, threeAt, 8);
  const hotBranch = ease(frame, threeAt + 6, 8);
  const hotLeaf = ease(frame, threeAt + 12, 8);
  const leafPath = 2;
  const edges: { x1: number; y1: number; x2: number; y2: number; hot: number; at: number }[] = [
    ...branchX.map((bx, i) => ({ x1: rootX, y1: lv[0] + NODE_H, x2: bx, y2: lv[1], hot: i === 1 ? hotBranch : 0, at: btreeAt + 4 + i * 2 })),
    ...leafX.map((lx, i) => ({ x1: branchX[Math.floor(i / 2)], y1: lv[1] + NODE_H, x2: lx, y2: lv[2], hot: i === leafPath ? hotLeaf : 0, at: btreeAt + 10 + i * 2 })),
  ];

  // The hash index: hash(email) and eight buckets.
  const hashTop = y(TOP) - h(4) + listingHeight(1, 20) + h(24);
  const bucketY = hashTop + h(50) + h(44);
  const bucketW = 64;
  const bucketX = (i: number) => R_X + 40 + i * ((R_W - 80 - bucketW) / (BUCKETS - 1));
  const hashBox = { x: R_X, w: 240, y: hashTop, h: h(50) };
  const eqBucket = 5;
  const rangeBuckets = [0, 3, 6, 7];

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={findAt} level={-35} />
      <Sfx name="el-sprinkle" at={readsAt + 2} level={-33} />
      <Sfx name="el-tap" at={keepAt + 4} level={-32} />
      <Sfx name="el-whoosh" at={structAt - 2} level={-36} />
      <Sfx name="el-pencil" at={btreeAt + 4} level={-35} />
      <Sfx name="el-tap" at={threeAt} level={-34} />
      <Sfx name="el-tap" at={tableAt + 2} level={-33} />
      <Sfx name="el-pop" at={fourAt} level={-31} />
      <Sfx name="el-pencil" at={rangesAt + 4} level={-35} />
      <Sfx name="el-pencil" at={hashAt} level={-35} />
      <Sfx name="el-tap" at={straightAt + 6} level={-33} />
      <Sfx name="el-scratch" at={againAt + 2} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={2} at={qAt - 4} textAt={textAt - 4} size={58}>
          What is a database index and how does it speed up queries?
        </QuestionCard>

        {/* ── Left: the lookup and the plans ── */}
        <Listing lines={INDEX.query} x={X0} top={listTop} width={PLAN_W} size={SIZE} at={findAt - 2} out={rangeAt - 4} marks={[{ line: "WHERE", text: "email = 'user42@example.com'", at: findAt + 8 }]} />
        <Listing lines={INDEX.hashRangeQuery} x={X0} top={listTop} width={PLAN_W} size={SIZE} at={rangeAt} marks={[{ line: "BETWEEN", text: "BETWEEN", at: rangeAt + 8 }]} />
        <PlanBox
          lines={INDEX.seqPlan}
          x={X0}
          top={planTop}
          width={PLAN_W}
          size={PLAN}
          at={readsAt - 6}
          out={levelsAt - 4}
          marks={[
            { line: "Seq Scan", text: "Seq Scan", at: readsAt + 2 },
            { line: "Buffers", at: pagesAt + 4 },
            { line: "Rows Removed", at: keepAt + 2, color: MARK_RED },
          ]}
        />
        <Note at={pagesAt + 8} x={X0} y={planTop + h(196)} out={levelsAt - 4}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            hit + read: <Num>{thousands(INDEX.seqBuffers.hit)}</Num> + <Num>{thousands(INDEX.seqBuffers.read)}</Num> = <b>{thousands(INDEX.seqPages)}</b> pages, for <b>1</b> row
          </span>
        </Note>
        <PlanBox
          lines={INDEX.btreePlan}
          x={X0}
          top={planTop}
          width={PLAN_W}
          size={PLAN}
          at={levelsAt}
          out={kindAt - 4}
          marks={[
            { line: "Index Scan", text: "Index Scan", at: levelsAt + 6, color: MARK_GREEN },
            { line: "Buffers", at: fourAt, color: MARK_GREEN },
          ]}
        />
        <PlanBox
          lines={INDEX.hashEqPlan}
          x={X0}
          top={planTop}
          width={PLAN_W}
          size={PLAN}
          at={hashAt}
          out={rangeAt - 4}
          marks={[{ line: "users_email_hash", text: "Index Scan using users_email_hash", at: straightAt + 4, color: MARK_GREEN }]}
        />
        <PlanBox
          lines={INDEX.hashRangePlan}
          x={X0}
          top={planTop}
          width={PLAN_W}
          size={PLAN}
          at={rangeAt + 6}
          marks={[
            { line: "Seq Scan", text: "Seq Scan", at: againAt, color: MARK_RED },
            { line: "Rows Removed", at: againAt + 8, color: MARK_RED },
          ]}
        />

        {/* log n against n, under the plan */}
        <Note at={logAt} x={X0} y={planTop + h(196)} out={kindAt - 4}>
          <span style={{ ...note(30, INK), whiteSpace: "nowrap" }}>
            index: <i>O</i>(log <i>n</i>)
            <span style={{ color: INK_SOFT }}> against </span>
            scan: <i>O</i>(<i>n</i>)
          </span>
        </Note>

        {/* ── Right: the table, page by page ── */}
        <div style={{ position: "absolute", right: 1920 - (R_X + R_W), top: gridTop - h(40), ...label(21, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, findAt, 12) }}>
          users: <Num>{thousands(INDEX.pages)}</Num> pages, <span style={{ color: INK }}>{INDEX.size}</span>
        </div>
        <PageGrid
          id="index-pages"
          x={R_X}
          top={gridTop}
          cols={COLS}
          rows={ROWS}
          pitch={pitch}
          cell={pitch * 0.8}
          at={findAt}
          sweeps={[
            { from: readsAt, to: readsAt + 54, color: `color-mix(in srgb, ${BAR} 70%, ${PAPER})`, out: structAt },
            { from: againAt, to: againAt + 54, color: `color-mix(in srgb, ${ACCENT} 60%, ${PAPER})` },
          ]}
          lit={[
            { index: 0, at: keepAt + 2, out: structAt },
            { index: 0, at: tableAt + 6, out: kindAt - 2, color: OK },
          ]}
        />
        <Note at={keepAt + 4} x={R_X + 40} y={gridBottom + h(18)} out={structAt}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            every page read, <b>1</b> row kept: the first page holds it
          </span>
        </Note>

        {/* ── The B-tree ── */}
        <Listing lines={INDEX.create} x={R_X} top={y(TOP) - h(4)} width={R_W} size={20} at={structAt + 2} out={treeOut} />
        <Svg opacity={1 - tOut}>
          {edges.map((e, i) => {
            const p = ease(frame, e.at, 10);
            if (p <= 0) return null;
            return (
              <line
                key={i}
                x1={e.x1}
                y1={e.y1}
                x2={e.x1 + (e.x2 - e.x1) * p}
                y2={e.y1 + (e.y2 - e.y1) * p}
                stroke={e.hot > 0.5 ? inkOf.yellow : INK_SOFT}
                strokeWidth={e.hot > 0.5 ? 3.5 : 1.5}
              />
            );
          })}
          <TreeNode cx={rootX} y={lv[0]} at={btreeAt} hot={hotRoot * path} />
          {branchX.map((bx, i) => (
            <TreeNode key={i} cx={bx} y={lv[1]} at={btreeAt + 4 + i * 2} hot={i === 1 ? hotBranch : 0} />
          ))}
          {leafX.map((lx, i) => (
            <TreeNode key={i} cx={lx} y={lv[2]} at={btreeAt + 10 + i * 2} hot={i === leafPath ? hotLeaf : 0} />
          ))}
        </Svg>
        <Note at={levelsAt} x={R_X + 20} y={lv[0] + NODE_H / 2 - h(15)} out={treeOut}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            <b>3 levels</b> deep
          </span>
        </Note>
        {/* Sorted leaves: a range is a walk along them. */}
        <Flow
          points={[
            [leafX[1] - NODE_W / 2, lv[2] + NODE_H + h(18)],
            [leafX[4] + NODE_W / 2, lv[2] + NODE_H + h(18)],
          ]}
          at={rangesAt + 4}
          dur={20}
          color={inkOf.yellow}
          width={3}
          out={treeOut}
        />
        <Note at={rangesAt + 10} x={leafX[4] + NODE_W / 2 + 18} y={lv[2] + NODE_H + h(2)} out={treeOut}>
          <span style={{ ...note(21, INK), whiteSpace: "nowrap" }}>a range</span>
        </Note>
        {/* From the leaf to the one table page. */}
        <Flow
          points={[
            [leafX[leafPath] - 20, lv[2] + NODE_H + 6],
            [R_X + 14, gridTop - 12],
          ]}
          at={tableAt}
          color={OK}
          width={3}
          out={rangesAt}
        />
        <Note at={fourAt} x={R_X} y={y(GRID_LOW) + ROWS * pitch + h(18)} out={kindAt - 2}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: OK_INK }}>4 pages</b>
            <span style={{ opacity: ease(frame, notAt, 10) }}>
              {" "}
              against <b>{thousands(INDEX.seqPages)}</b>
            </span>
          </span>
        </Note>

        {/* ── A hash index ── */}
        <Listing lines={INDEX.hashCreate} x={R_X} top={y(TOP) - h(4)} width={R_W} size={20} at={hashAt} />
        <Svg opacity={ease(frame, hashAt, 12)}>
          <rect x={hashBox.x} y={hashBox.y} width={hashBox.w} height={hashBox.h} rx={8} fill={PAPER} stroke={INK} strokeWidth={2} />
          <text x={hashBox.x + hashBox.w / 2} y={hashBox.y + hashBox.h / 2 + 7} textAnchor="middle" style={svgText({ fontFamily: MONO, fontSize: 21, fontWeight: 600, color: INK })}>
            hash(email)
          </text>
          {Array.from({ length: BUCKETS }, (_, i) => {
            const eq = i === eqBucket ? ease(frame, straightAt + 8, 10) : 0;
            const bad = rangeBuckets.includes(i) ? ease(frame, rangeAt + 14, 10) * (1 - ease(frame, againAt, 10)) : 0;
            return (
              <rect
                key={i}
                x={bucketX(i)}
                y={bucketY}
                width={bucketW}
                height={h(46)}
                rx={6}
                fill={eq > 0 ? `color-mix(in srgb, ${OK} ${30 * eq}%, ${PAPER})` : PAPER}
                stroke={eq > 0.5 ? OK : bad > 0.5 ? ACCENT : INK_SOFT}
                strokeWidth={eq > 0.5 || bad > 0.5 ? 2.5 : 1.5}
                strokeDasharray={bad > 0.5 ? "6 5" : undefined}
                opacity={ease(frame, hashAt + 4 + i * 1.5, 8)}
              />
            );
          })}
        </Svg>
        <Flow points={[[hashBox.x + hashBox.w - 30, hashBox.y + hashBox.h + 6], [bucketX(eqBucket) + bucketW / 2, bucketY - 10]]} at={straightAt} color={OK} width={3} out={rangeAt} />
        <Note at={straightAt + 6} x={hashBox.x + hashBox.w + 36} y={hashTop + h(10)} out={rangeAt}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: OK_INK }}>equality:</b> one bucket
          </span>
        </Note>
        {rangeBuckets.map((b, k) => (
          <Flow
            key={b}
            points={[[hashBox.x + 40 + k * 50, hashBox.y + hashBox.h + 6], [bucketX(b) + bucketW / 2, bucketY - 10]]}
            at={rangeAt + 6 + k * 3}
            color={ACCENT}
            width={2}
            dash="6 5"
            out={againAt}
          />
        ))}
        <Note at={rangeAt + 10} x={hashBox.x + hashBox.w + 36} y={hashTop + h(10)}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: ACCENT_INK }}>a range:</b>
          </span>
          <div style={{ ...note(22, INK), whiteSpace: "nowrap", marginTop: h(6) }}>scattered buckets, nothing to walk</div>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
