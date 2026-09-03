"use client";

/**
 * Hand-rolled SVG commit graph. Teaching repos run to a couple of dozen
 * commits and a handful of branches, so lane assignment is short and we keep
 * full control of theming and labelling — a general graph library would buy a
 * layout engine we do not need and fight the brand palette.
 *
 * Two sizes: `compact` for the embedded blocks, `large` for the playground
 * where the graph is the hero. Optionally a WIP row at the top, the GitKraken
 * convention: uncommitted work drawn as the commit it is about to become,
 * which is the one image that connects "my edits" to "the history".
 */

import { useState } from "react";
import type { CommitNode } from "./protocol";

const SIZES = {
  compact: { row: 30, lane: 18, left: 16, top: 16, r: 5, merge: 6 },
  large: { row: 36, lane: 22, left: 18, top: 18, r: 6, merge: 7 },
} as const;

/** Lane colors come from the categorical wheel, which the brand reserves for
 *  telling series apart without meaning. Blue first, so a single-lane history
 *  reads in the accent. */
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

/** A ref string as the worker decorates it: `HEAD -> main`, `main`, `HEAD`,
 *  `tag: v1`. Split into what to draw. */
function parseRef(ref: string): { kind: "head" | "branch" | "tag"; name: string; head: boolean } {
  if (ref === "HEAD") return { kind: "head", name: "HEAD", head: true };
  if (ref.startsWith("HEAD -> ")) return { kind: "branch", name: ref.slice(8), head: true };
  if (ref.startsWith("tag: ")) return { kind: "tag", name: ref.slice(5), head: false };
  return { kind: "branch", name: ref, head: false };
}

interface Props {
  commits: CommitNode[];
  detached: boolean;
  size?: keyof typeof SIZES;
  /** Uncommitted work, drawn as a dashed node above the newest commit. */
  wip?: { files: number } | null;
  /** Show object ids. The playground hides them until the reader asks. */
  showOids?: boolean;
  /** When given, clicking a commit opens a small card; the button on it
   *  fills the prompt with `git show`. */
  onCompose?: (command: string) => void;
  /** Frame it as a panel with its own heading (the embedded blocks) or not
   *  (the playground, which supplies the pane head). */
  framed?: boolean;
}

export function CommitGraph({
  commits,
  detached,
  size = "compact",
  wip = null,
  showOids = true,
  onCompose,
  framed = true,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const S = SIZES[size];

  const wrap = (children: React.ReactNode) =>
    framed ? (
      <section className="git-panel git-graph-panel">
        <header className="git-panel-head">
          <h2>Commit graph</h2>
          {commits.length > 0 && (
            <span className="git-panel-sub">
              {commits.length} commit{commits.length === 1 ? "" : "s"}
            </span>
          )}
        </header>
        {children}
      </section>
    ) : (
      <div className="git-graph-panel unframed">{children}</div>
    );

  if (!commits.length && !wip) {
    return wrap(
      <p className="git-panel-empty">
        No commits yet. <code>git commit</code> puts the first node here.
      </p>,
    );
  }

  const placed = layout(commits);
  const offset = wip ? 1 : 0;
  const byOid = new Map(placed.map((c) => [c.oid, c]));
  const lanes = Math.max(1, ...placed.map((c) => c.lane + 1));
  const rows = placed.length + offset;
  const height = S.top * 2 + (rows - 1) * S.row;
  const graphWidth = S.left + lanes * S.lane;

  const x = (lane: number) => S.left + lane * S.lane;
  const y = (row: number) => S.top + (row + offset) * S.row;
  const headLane = placed.find((c) => c.refs.some((r) => r.startsWith("HEAD")))?.lane ?? 0;
  const current = selected ? byOid.get(selected) ?? null : null;

  return wrap(
    <>
      <div className={`git-graph-scroll size-${size}`}>
        <div className="git-graph-inner" style={{ height }}>
          <svg
            className="git-graph-svg"
            width={graphWidth}
            height={height}
            viewBox={`0 0 ${graphWidth} ${height}`}
            role="img"
            aria-label={`Commit graph with ${commits.length} commits`}
          >
            {wip && placed.length > 0 && (
              <path
                d={`M ${x(headLane)} ${S.top} L ${x(headLane)} ${y(0)}`}
                className="git-graph-edge wip"
                stroke={LANE_COLORS[headLane % LANE_COLORS.length]}
              />
            )}
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
                    : `M ${x1} ${y1} C ${x1} ${y1 + S.row / 2}, ${x2} ${y2 - S.row / 2}, ${x2} ${y2}`;
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
            {wip && (
              <circle
                cx={x(headLane)}
                cy={S.top}
                r={S.r}
                className="git-graph-node wip"
                stroke={LANE_COLORS[headLane % LANE_COLORS.length]}
              />
            )}
            {placed.map((commit) => {
              const isHead = commit.refs.some((r) => r.startsWith("HEAD"));
              const color = LANE_COLORS[commit.lane % LANE_COLORS.length];
              const merge = commit.parents.length > 1;
              const cls = `git-graph-node${isHead ? " head" : ""}${selected === commit.oid ? " selected" : ""}`;
              return isHead && detached ? (
                <rect
                  key={commit.oid}
                  x={x(commit.lane) - S.r}
                  y={y(commit.row) - S.r}
                  width={S.r * 2}
                  height={S.r * 2}
                  transform={`rotate(45 ${x(commit.lane)} ${y(commit.row)})`}
                  className={cls}
                  fill={color}
                />
              ) : (
                <circle
                  key={commit.oid}
                  cx={x(commit.lane)}
                  cy={y(commit.row)}
                  r={merge ? S.merge : S.r}
                  className={cls}
                  fill={merge ? "var(--bg)" : color}
                  stroke={color}
                />
              );
            })}
          </svg>

          <ul className="git-graph-labels">
            {wip && (
              <li className="git-graph-label wip" style={{ top: S.top - S.row / 2, height: S.row }}>
                <span className="git-graph-message muted">
                  Uncommitted · {wip.files} file{wip.files === 1 ? "" : "s"}
                </span>
              </li>
            )}
            {placed.map((commit) => {
              const color = LANE_COLORS[commit.lane % LANE_COLORS.length];
              const refs = commit.refs.map(parseRef);
              const hasHead = refs.some((r) => r.head);
              return (
                <li
                  key={commit.oid}
                  className={`git-graph-label${selected === commit.oid ? " selected" : ""}`}
                  style={{ top: y(commit.row) - S.row / 2 - S.top + S.top, height: S.row }}
                >
                  <button
                    type="button"
                    className="git-graph-row"
                    onClick={() => setSelected((s) => (s === commit.oid ? null : commit.oid))}
                    aria-expanded={selected === commit.oid}
                  >
                    {showOids && <code className="git-graph-oid">{commit.oid.slice(0, 7)}</code>}
                    {refs
                      .filter((r) => r.kind !== "head")
                      .map((r) => (
                        <span
                          key={r.name}
                          className={`git-ref-pill${r.kind === "tag" ? " tag" : ""}`}
                          style={{ "--pill": color } as React.CSSProperties}
                        >
                          {r.name}
                        </span>
                      ))}
                    {hasHead && (
                      <span className={`git-ref-tag${detached ? " detached" : ""}`} title="Where you are">
                        HEAD
                      </span>
                    )}
                    <span className="git-graph-message" title={commit.message}>
                      {commit.message}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {current && (
        <div className="git-commit-card" role="region" aria-label={`Commit ${current.oid.slice(0, 7)}`}>
          <div className="git-commit-card-msg">{current.message}</div>
          <div className="git-commit-card-meta">
            <code>{current.oid.slice(0, 7)}</code>
            <span>{current.author}</span>
            <span>{new Date(current.timestamp * 1000).toLocaleString()}</span>
            {current.parents.length > 1 && <span>merge of {current.parents.length} parents</span>}
          </div>
          {onCompose && (
            <div className="git-commit-card-actions">
              <button type="button" className="gitx-btn" onClick={() => onCompose(`git show ${current.oid.slice(0, 7)}`)}>
                Show this commit
              </button>
              <button type="button" className="gitx-btn quiet" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          )}
        </div>
      )}
    </>,
  );
}
