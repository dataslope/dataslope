import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK_INK, QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Ink, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { RECURSIVE } from "./data";
import { Drift, lineOf, Listing, listingHeight, MARK_OK, Svg, X0 } from "./parts";

const TOP = 310;
const SIZE = 18;
const LIST_W = 700;
/** The tree: one row per depth, nodes spread across the right of the page. */
const TREE_X0 = 920;
const TREE_X1 = 1640;
const LEVEL_Y = [340, 490, 640];
const NODE_W = 116;
const NODE_H = 54;
const LEVEL_LABEL_X = 1690;

/**
 * Question 11: the page's recursive CTE, as the page prints it, on the
 * video's own seven employees. The listing on the left lights its parts as
 * they are named (WITH, the anchor, UNION ALL, the recursive half); on the
 * right the result grows as a tree, one level a pass: the anchor finds Ana,
 * the first pass her two reports, the second their four, the third nothing,
 * which ends it. Every node is a row of the query's result, placed by its
 * depth and joined to its manager_id. Then the cap that stops a walk of
 * data with a loop, as it ran on a three-node loop.
 */
export const RecursiveScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("recursive").from;
  const qAt = n.word("recursive", "Question");
  const textAt = n.word("recursive", "How do you write a recursive CTE");
  const namedAt = n.word("recursive", "a named query");
  const withAt = n.word("recursive", "written with WITH");
  const halvesAt = n.word("recursive-anchor", "two halves");
  const unionAt = n.word("recursive-anchor", "joined with union all");
  const anchorAt = n.word("recursive-anchor", "The anchor is the base case");
  const noManagerAt = n.word("recursive-anchor", "the employee with no manager");
  const stepAt = n.word("recursive-step", "The recursive half joins");
  const foundAt = n.word("recursive-step", "the rows found so far");
  const twoAt = n.word("recursive-step", "Ana's two reports");
  const fourAt = n.word("recursive-step", "then their four");
  const nothingAt = n.word("recursive-stop", "A pass that adds nothing");
  const sevenAt = n.word("recursive-stop", "seven people, three levels");
  const loopAt = n.word("recursive-stop", "If the data has a loop");
  const capAt = n.word("recursive-stop", "cap the depth");
  const end = n.beat("recursive-stop").to;

  const L = RECURSIVE.page;
  const id = L.cols.indexOf("id");
  const name = L.cols.indexOf("name");
  const manager = L.cols.indexOf("manager_id");
  const depth = L.cols.indexOf("depth");
  const depths = [...new Set(L.rows.map((r) => Number(r[depth])))].sort((a, b) => a - b);
  const levelAt = [noManagerAt, twoAt, fourAt];
  if (depths.length !== levelAt.length) throw new Error(`the tree has ${depths.length} levels, the narration three`);

  // Each row's place: its depth's level, spread evenly across the tree.
  const place = new Map<string, { x: number; y: number; level: number; at: number }>();
  depths.forEach((d, level) => {
    const rows = L.rows.filter((r) => Number(r[depth]) === d);
    rows.forEach((r, k) => {
      const x = TREE_X0 + ((k + 0.5) * (TREE_X1 - TREE_X0)) / rows.length;
      place.set(r[id], { x, y: y(LEVEL_Y[level]), level, at: levelAt[level] + 2 + k * 3 });
    });
  });
  const edges = L.rows.filter((r) => r[manager] !== "null").map((r) => ({ child: place.get(r[id])!, parent: place.get(r[manager])! }));
  const people = RECURSIVE.levels.rows.reduce((s, r) => s + Number(r[1]), 0);
  if (people !== L.rows.length) throw new Error("the levels and the rows disagree");
  const bottom = y(LEVEL_Y[LEVEL_Y.length - 1]) + h(NODE_H);
  const passLabels = ["anchor", "pass 1", "pass 2"];

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={noManagerAt + 2} level={-34} />
      <Sfx name="el-pop" at={twoAt + 2} level={-34} />
      <Sfx name="el-pop" at={fourAt + 2} level={-34} />
      <Sfx name="el-tap" at={nothingAt + 2} level={-34} />
      <Sfx name="el-pencil" at={capAt} level={-36} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={11} at={qAt - 4} textAt={textAt - 4} size={60}>
          How do you write a recursive CTE?
        </QuestionCard>

        {/* ── The page's query ── */}
        <Listing
          lines={L.lines}
          x={X0}
          top={y(TOP)}
          width={LIST_W}
          size={SIZE}
          at={namedAt - 6}
          marks={[
            { line: lineOf(L.lines, "WITH RECURSIVE"), at: withAt },
            { line: lineOf(L.lines, "UNION ALL"), at: unionAt + 2 },
            { line: lineOf(L.lines, "1 AS depth"), at: anchorAt + 2 },
            { line: lineOf(L.lines, "WHERE manager_id IS NULL"), at: noManagerAt },
            { line: lineOf(L.lines, "t.depth + 1"), at: stepAt + 2 },
            { line: lineOf(L.lines, "JOIN org_tree t"), at: foundAt, color: MARK_OK },
          ]}
        />
        <Note at={halvesAt} x={X0} y={y(TOP) + listingHeight(L.lines.length, SIZE) + h(24)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            anchor <QMono>UNION ALL</QMono> recursive half, run until a pass adds no rows
          </span>
        </Note>

        {/* ── The result, as a tree: one level a pass ── */}
        <Svg>
          {edges.map(({ child, parent }, k) => {
            const p = ease(frame, child.at - 2, 12);
            const x1 = parent.x;
            const y1 = parent.y + h(NODE_H);
            const x2 = child.x;
            const y2 = child.y;
            return p > 0 ? (
              <line key={k} x1={x1} y1={y1} x2={x1 + (x2 - x1) * p} y2={y1 + (y2 - y1) * p} stroke={INK_SOFT} strokeWidth={2.2} />
            ) : null;
          })}
        </Svg>
        {L.rows.map((r) => {
          const pl = place.get(r[id])!;
          const p = ease(frame, pl.at, 10);
          return p > 0 ? (
            <div
              key={r[id]}
              style={{
                position: "absolute",
                left: pl.x - NODE_W / 2,
                top: pl.y,
                width: NODE_W,
                height: h(NODE_H),
                boxSizing: "border-box",
                borderRadius: 8,
                border: `2.5px solid ${BAR}`,
                background: `color-mix(in srgb, ${BAR} ${pl.level === 0 ? 30 : 16}%, ${PAPER})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...label(23, INK),
                opacity: p,
                transform: `scale(${0.85 + 0.15 * p})`,
              }}
            >
              {r[name]}
            </div>
          ) : null;
        })}
        {depths.map((d, level) => (
          <Ink key={d} at={levelAt[level] + 4} dur={12} style={{ left: LEVEL_LABEL_X, top: y(LEVEL_Y[level]) + h(4), whiteSpace: "nowrap" }}>
            <div style={{ ...label(20, BLUE_INK) }}>depth {d}</div>
            <div style={{ ...note(20, INK_SOFT) }}>{passLabels[level]}</div>
          </Ink>
        ))}
        <Note at={noManagerAt + 8} x={place.get(L.rows[0][id])!.x + NODE_W / 2 + 20} y={y(LEVEL_Y[0]) + h(12)}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>
            <QMono>manager_id</QMono> is null
          </span>
        </Note>

        {/* ── The pass that adds nothing, and the cap ── */}
        <Note at={nothingAt} x={TREE_X0} y={bottom + h(28)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>pass 3 adds no rows: done</span>
        </Note>
        <Note at={sevenAt} x={TREE_X0} y={bottom + h(70)}>
          <span style={{ ...note(24, OK_INK), whiteSpace: "nowrap", fontWeight: 650 }}>
            <Num>{people}</Num> people, <Num>{depths.length}</Num> levels
          </span>
        </Note>
        <Note at={loopAt} x={TREE_X0} y={bottom + h(128)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            a loop in the data never runs dry:{" "}
            <span style={{ opacity: ease(frame, capAt - 2, 10) }}>
              <QMono>{RECURSIVE.cap}</QMono>
            </span>
          </span>
        </Note>
        <Note at={capAt + 6} x={TREE_X0} y={bottom + h(170)}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>
            on a three-node loop, it stops at depth <Num>{RECURSIVE.capped}</Num>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
