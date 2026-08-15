"use client";

/**
 * Hand-rolled SVG commit graph. Teaching repos run to a couple of dozen
 * commits and a handful of branches, so lane assignment is short and we keep
 * full control of theming and labelling — a general graph library would buy a
 * layout engine we do not need and fight the brand palette.
 *
 * Labels are deliberate: branch pills, a distinct `HEAD →` marker, and a
 * different node shape when HEAD detaches.
 */

import type { CommitNode } from "./protocol";

const ROW = 30;
const LANE = 18;
const LEFT = 16;
const TOP = 16;

const LANE_COLORS = [
  "var(--ds-blue-500)",
  "var(--ds-green-500)",
  "var(--ds-purple-500)",
  "var(--ds-orange-500)",
  "var(--ds-teal-500)",
];

interface Placed extends CommitNode {
  row: number;
  lane: number;
}

/**
 * Assign each commit a lane: reuse the lane a child reserved for its first
 * parent, and open a new one for every additional parent. Commits arrive
 * newest-first from `git log`, which is the order they are drawn in.
 */
function layout(commits: CommitNode[]): Placed[] {
  const laneOf = new Map<string, number>();
  const active: (string | null)[] = [];

  const claim = (oid: string): number => {
    const existing = laneOf.get(oid);
    if (existing !== undefined) return existing;
    let lane = active.findIndex((slot) => slot === null);
    if (lane === -1) lane = active.length;
    active[lane] = oid;
    laneOf.set(oid, lane);
    return lane;
  };

  return commits.map((commit, row) => {
    const lane = claim(commit.oid);
    // This commit's slot is free once its parents have taken their own.
    active[lane] = null;
    laneOf.delete(commit.oid);
    commit.parents.forEach((parent, index) => {
      if (index === 0) {
        if (!laneOf.has(parent)) {
          active[lane] = parent;
          laneOf.set(parent, lane);
        }
      } else {
        claim(parent);
      }
    });
    return { ...commit, row, lane };
  });
}

export function CommitGraph({ commits, detached }: { commits: CommitNode[]; detached: boolean }) {
  if (!commits.length) {
    return (
      <section className="git-panel">
        <header className="git-panel-head">
          <h2>Commit graph</h2>
        </header>
        <p className="git-panel-empty">
          No commits yet. <code>git commit</code> puts the first node here.
        </p>
      </section>
    );
  }

  const placed = layout(commits);
  const byOid = new Map(placed.map((c) => [c.oid, c]));
  const lanes = Math.max(...placed.map((c) => c.lane)) + 1;
  const height = TOP * 2 + (placed.length - 1) * ROW;
  const graphWidth = LEFT + lanes * LANE;

  const x = (lane: number) => LEFT + lane * LANE;
  const y = (row: number) => TOP + row * ROW;

  return (
    <section className="git-panel git-graph-panel">
      <header className="git-panel-head">
        <h2>Commit graph</h2>
        <span className="git-panel-sub">
          {commits.length} commit{commits.length === 1 ? "" : "s"}
        </span>
      </header>

      <div className="git-graph-scroll">
        <div className="git-graph-inner" style={{ height }}>
          <svg
            className="git-graph-svg"
            width={graphWidth}
            height={height}
            viewBox={`0 0 ${graphWidth} ${height}`}
            role="img"
            aria-label={`Commit graph with ${commits.length} commits`}
          >
            {placed.map((commit) =>
              commit.parents.map((parent) => {
                const target = byOid.get(parent);
                if (!target) return null;
                const x1 = x(commit.lane);
                const y1 = y(commit.row);
                const x2 = x(target.lane);
                const y2 = y(target.row);
                const path =
                  x1 === x2
                    ? `M ${x1} ${y1} L ${x2} ${y2}`
                    : `M ${x1} ${y1} C ${x1} ${y1 + ROW / 2}, ${x2} ${y2 - ROW / 2}, ${x2} ${y2}`;
                return (
                  <path
                    key={`${commit.oid}-${parent}`}
                    d={path}
                    className="git-graph-edge"
                    stroke={LANE_COLORS[target.lane % LANE_COLORS.length]}
                  />
                );
              }),
            )}
            {placed.map((commit) => {
              const isHead = commit.refs.some((r) => r.startsWith("HEAD"));
              const color = LANE_COLORS[commit.lane % LANE_COLORS.length];
              const merge = commit.parents.length > 1;
              return isHead && detached ? (
                <rect
                  key={commit.oid}
                  x={x(commit.lane) - 5}
                  y={y(commit.row) - 5}
                  width={10}
                  height={10}
                  transform={`rotate(45 ${x(commit.lane)} ${y(commit.row)})`}
                  className="git-graph-node head"
                  fill={color}
                />
              ) : (
                <circle
                  key={commit.oid}
                  cx={x(commit.lane)}
                  cy={y(commit.row)}
                  r={merge ? 6 : 5}
                  className={isHead ? "git-graph-node head" : "git-graph-node"}
                  fill={merge ? "var(--bg)" : color}
                  stroke={color}
                />
              );
            })}
          </svg>

          <ul className="git-graph-labels">
            {placed.map((commit) => (
              <li
                key={commit.oid}
                className="git-graph-label"
                style={{ top: y(commit.row) - ROW / 2, height: ROW }}
              >
                <code className="git-graph-oid">{commit.oid.slice(0, 7)}</code>
                {commit.refs.map((ref) => (
                  <span
                    key={ref}
                    className={ref.startsWith("HEAD") ? "git-ref-pill head" : "git-ref-pill"}
                  >
                    {ref}
                  </span>
                ))}
                <span className="git-graph-message" title={commit.message}>
                  {commit.message}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
