import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { FILTER, num, pct } from "./data";
import { Chip, DATA, Drift, madeUp, Mark, MARK_BAD, OK, OK_INK, QueryMark, QUIET, X0 } from "./parts";
import { clusters, nearestOf, tenantOf } from "./space";

const SC = { x: 140, w: 660, top: 330, h: 430 };

/** The drawn space: about one point in ten is the viewer's tenant, and none
 *  of them is among the query's ten nearest (a picture; the share that
 *  comes back empty is the simulation's, on the right). Nearness is measured
 *  where the points are drawn (px), so the ten struck out are the ten the
 *  eye sees nearest. */
const SPACE = clusters(31, 9, 14, 0.07);
const PTS = SPACE.points.map((p) => ({ x: p.x * SC.w, y: p.y * SC.h, c: p.c }));
const MINE = tenantOf(1, PTS.length, 0.1);
const Q = { x: 0.5 * SC.w, y: 0.5 * SC.h };
const TOP10 = nearestOf(PTS, Q.x, Q.y, 10);
if (TOP10.some((i) => MINE[i])) throw new Error("the drawn top ten should hold none of the tenant's points");
const MINE_IDX = PTS.map((_, i) => i).filter((i) => MINE[i]);
/** Pre-filtering: the tenant's own ten nearest, a full ten. */
const MY_NEAREST = nearestOf(
  MINE_IDX.map((i) => PTS[i]),
  Q.x,
  Q.y,
  10,
).map((k) => MINE_IDX[k]);
const GRID = { x: 1070, top: 360, cols: 20, cell: 26, gap: 7 };

/**
 * Question 8. Left, a drawn space where the viewer's tenant is one point in
 * ten (blue) and the rest are other tenants (grey). Post-filtering takes the
 * query's ten nearest, then drops what the user may not see, and here
 * nothing is left. Right, the simulation's 200 searches (check.mjs), one
 * cell each: with one tenant in a hundred, the top ten post-filtered comes
 * back empty for 182 of them (91%). Then pre-filtering, which keeps only the
 * tenant's points and finds a full ten, but with an index that was not built
 * for the subset: a small subset is scanned exactly, a big one leaves the
 * search skipping most of what it visits. Last, the three answers, in green,
 * the engine's filter checked at each step until it has ten.
 */
export const FilterScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("filter").from;
  const qAt = n.word("filter", "Question");
  const textAt = n.word("filter", "Why do metadata filters");
  const simAt = n.word("filter", "built for similarity");
  const yourAt = n.word("filter", "not for your filter");
  const postAt = n.word("filter-post", "Post-filtering searches first");
  const dropsAt = n.word("filter-post", "then drops what the user may not see");
  const fewerAt = n.word("filter-post", "far fewer results than you asked for");
  const sameAt = n.word("filter-sim", "In the same simulation");
  const tenantsAt = n.word("filter-sim", "one of a hundred tenants");
  const topAt = n.word("filter-sim", "Take the top ten");
  const keepAt = n.word("filter-sim", "keep one tenant's");
  const emptyAt = n.word("filter-sim", "ninety-one percent of searches come back empty");
  const preAt = n.word("filter-pre", "Pre-filtering restricts first");
  const thenAt = n.word("filter-pre", "then searches");
  const correctAt = n.word("filter-pre-why", "That's correct");
  const smallAt = n.word("filter-pre-why", "a small subset can just be scanned exactly");
  const bigAt = n.word("filter-pre-why", "A big one can't");
  const builtAt = n.word("filter-pre-why", "built over everything");
  const skipAt = n.word("filter-pre-why", "points it has to skip");
  const fixes = [
    { text: "partition by tenant", at: n.word("filter-fix", "partition by tenant") },
    { text: "filter during the search", at: n.word("filter-fix", "an engine that checks the filter") },
    { text: "test with realistic, selective filters", at: n.word("filter-fix", "test with realistic, selective filters") },
  ];
  const stepAt = n.word("filter-fix", "at each step of the search");
  const tenAt = n.word("filter-fix", "until it has ten");
  const end = n.beat("filter-fix").to;

  const top = y(SC.top);
  // Drawn px within the space, to the page.
  const px = (v: number) => SC.x + v;
  const py = (v: number) => top + v;
  const tint = ease(frame, yourAt, 12);
  const ring = ease(frame, postAt + 4, 10) * (1 - ease(frame, preAt, 12));
  const dropped = ease(frame, dropsAt + 6, 14) * (1 - ease(frame, preAt, 12));
  const pre = ease(frame, preAt + 2, 14);
  const found = ease(frame, thenAt + 4, 10);

  const empty = FILTER.keptHist["0"];
  const total = FILTER.kept.length;
  const gridTop = y(GRID.top);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={from + 10} level={-36} />
      <Sfx name="el-pencil" at={postAt + 4} level={-36} />
      <Sfx name="el-scratch" at={dropsAt + 8} level={-33} />
      <Sfx name="el-sprinkle" at={topAt} level={-35} />
      <Sfx name="el-pop" at={emptyAt + 2} level={-33} />
      <Sfx name="el-whoosh" at={preAt + 2} level={-36} />
      {fixes.map((f) => (
        <Sfx key={f.text} name="el-tap" at={f.at} level={-35} />
      ))}

      <Drift from={from} to={end + 40} scale={0.015}>
        <QuestionCard n={8} at={qAt - 4} textAt={textAt - 4} size={60}>
          Why do metadata filters make vector search harder?
        </QuestionCard>
        <Note at={simAt - 2} x={X0} y={y(244)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            the index is built for similarity
            <span style={{ opacity: ease(frame, yourAt - 2, 10) }}>
              , <Mark at={yourAt + 4}>not for your filter</Mark>
            </span>
          </span>
        </Note>

        {/* The drawn space. */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {PTS.map((p, i) => {
            const s = ease(frame, from + 6 + (i % 30) * 0.6, 8);
            if (s <= 0) return null;
            const mine = MINE[i];
            const color = mine ? `color-mix(in srgb, ${DATA} ${100 * tint}%, ${QUIET})` : QUIET;
            const inTop = TOP10.includes(i);
            const gone = inTop ? dropped : 0;
            const out = !mine ? pre * 0.85 : 0;
            return <circle key={i} cx={px(p.x)} cy={py(p.y)} r={(mine ? 7.5 : 6) * s} fill={color} opacity={(1 - 0.75 * gone) * (1 - out)} />;
          })}
          {TOP10.map((i) => {
            const p = PTS[i];
            const cx = px(p.x);
            const cy = py(p.y);
            const x = ease(frame, dropsAt + 6, 10) * (1 - ease(frame, preAt, 12));
            return (
              <g key={i} opacity={ring}>
                <circle cx={cx} cy={cy} r={11} fill="none" stroke={INK} strokeWidth={2} />
                {x > 0 ? (
                  <path d={`M${cx - 7},${cy - 7} L${cx + 7},${cy + 7} M${cx + 7},${cy - 7} L${cx - 7},${cy + 7}`} stroke={ACCENT} strokeWidth={2.4} opacity={x} />
                ) : null}
              </g>
            );
          })}
          {MY_NEAREST.map((i, k) => (
            <circle
              key={i}
              cx={px(PTS[i].x)}
              cy={py(PTS[i].y)}
              r={13}
              fill="none"
              stroke={OK}
              strokeWidth={2.6}
              opacity={found * ease(frame, thenAt + 4 + k * 2, 8)}
            />
          ))}
        </svg>
        <QueryMark x={px(Q.x)} y={py(Q.y)} at={postAt} />
        <Note at={yourAt + 4} x={SC.x} y={top + SC.h + 20}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>
            <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: 7, background: DATA, marginRight: 8 }} />
            this user&apos;s tenant
            <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 6, background: QUIET, margin: "0 8px 0 24px" }} />
            everyone else&apos;s
          </span>
        </Note>
        <Note at={postAt} x={SC.x} y={top + SC.h + 60} dim={preAt}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            <b>post-filter</b>: the ten nearest
            <span style={{ opacity: ease(frame, dropsAt - 2, 10) }}>, then drop the rest</span>
            <span style={{ opacity: ease(frame, fewerAt - 2, 10), color: ACCENT_INK, fontWeight: 600 }}>: 0 of 10 left</span>
          </span>
        </Note>
        <Note at={preAt} x={SC.x} y={top + SC.h + 100}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            <b>pre-filter</b>: this tenant first, a full ten
            <span style={{ opacity: ease(frame, correctAt - 2, 10), color: OK_INK, fontWeight: 650 }}>, correct</span>
          </span>
        </Note>
        <Note at={smallAt - 2} x={SC.x} y={top + SC.h + 140}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            a small subset: scan it exactly
            <span style={{ opacity: ease(frame, bigAt - 2, 10) }}> · too big to scan: use the index</span>
          </span>
        </Note>
        <Note at={builtAt - 2} x={SC.x} y={top + SC.h + 176}>
          <span style={{ ...note(22, ACCENT_INK), whiteSpace: "nowrap" }}>
            but it wasn&apos;t built for the subset
            <span style={{ opacity: ease(frame, skipAt - 2, 10) }}>: most points it visits are skipped</span>
          </span>
        </Note>

        {/* The simulation's 200 searches. */}
        <Note at={sameAt - 2} x={GRID.x} y={gridTop - 112}>
          <span style={{ ...note(25, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            the same simulation
            <span style={{ opacity: ease(frame, tenantsAt - 2, 10), fontWeight: 500 }}>: {FILTER.tenants} tenants</span>
            <span style={{ opacity: ease(frame, keepAt - 2, 10), fontWeight: 500 }}>, top {FILTER.k} kept to one</span>
          </span>
        </Note>
        <Note at={topAt - 2} x={GRID.x} y={gridTop - 72}>
          <span style={madeUp(19)}>{num(total)} seeded searches, one square each</span>
        </Note>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {FILTER.kept.map((k, i) => {
            const r = Math.floor(i / GRID.cols);
            const c = i % GRID.cols;
            const s = ease(frame, topAt + r * 1.5 + c * 0.25, 8);
            if (s <= 0) return null;
            const e = ease(frame, keepAt + 4 + r * 1.2, 10);
            const x = GRID.x + c * (GRID.cell + GRID.gap);
            const yy = gridTop + r * (GRID.cell + GRID.gap);
            const fill = k > 0 ? DATA : `color-mix(in srgb, ${ACCENT} ${22 * e}%, ${PAPER})`;
            const stroke = k > 0 ? BLUE_INK : `color-mix(in srgb, ${ACCENT} ${100 * e}%, ${INK_SOFT})`;
            return <rect key={i} x={x + (GRID.cell / 2) * (1 - s)} y={yy + (GRID.cell / 2) * (1 - s)} width={GRID.cell * s} height={GRID.cell * s} rx={4} fill={e > 0 ? fill : PAPER} stroke={stroke} strokeWidth={1.8} />;
          })}
        </svg>
        <Note at={emptyAt - 2} x={GRID.x} y={gridTop + 10 * (GRID.cell + GRID.gap) + 18}>
          <span style={{ ...note(28, ACCENT_INK), fontWeight: 600, whiteSpace: "nowrap" }}>
            <Mark at={emptyAt + 4} color={MARK_BAD}>
              {num(empty)} of {num(total)} come back empty: {pct(FILTER.emptyShare)}
            </Mark>
          </span>
        </Note>
        <Note at={emptyAt + 6} x={GRID.x} y={gridTop + 10 * (GRID.cell + GRID.gap) + 62}>
          <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>
            <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: 3, background: DATA, marginRight: 8, verticalAlign: "-1px" }} />
            the rest found one
          </span>
        </Note>

        {/* What good answers do. */}
        {fixes.map((f, i) => (
          <Chip key={f.text} x={GRID.x} y={gridTop + 10 * (GRID.cell + GRID.gap) + 120 + i * 54} at={f.at - 2} size={24} tone="green">
            {f.text}
            {i === 1 ? (
              <span style={{ color: INK_SOFT, fontWeight: 500 }}>
                <span style={{ opacity: ease(frame, stepAt - 2, 10) }}>: at each step</span>
                <span style={{ opacity: ease(frame, tenAt - 2, 10) }}>, until 10</span>
              </span>
            ) : null}
          </Chip>
        ))}
      </Drift>
    </AbsoluteFill>
  );
};
