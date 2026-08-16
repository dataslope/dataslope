"use client";

/**
 * The shell equivalent of the Git state panels: what the working directory
 * holds right now, with paths that changed since the last command flagged.
 *
 * A shell lesson's "state" is the filesystem, and the thing learners lose
 * track of is what their pipeline actually wrote. Directories are inferred
 * from the paths rather than listed by the worker, so an empty directory does
 * not appear — an acceptable trade for not walking the tree twice.
 */

import { ChevronRight } from "lucide-react";
import type { RepoState } from "../git/protocol";

export function treeSummary(state: RepoState): string {
  const n = state.tree.length;
  if (n === 0) return "empty directory";
  const dirs = new Set(state.tree.filter((p) => p.includes("/")).map((p) => p.split("/")[0]));
  const files = `${n} file${n === 1 ? "" : "s"}`;
  return dirs.size ? `${files} · ${dirs.size} director${dirs.size === 1 ? "y" : "ies"}` : files;
}

interface Node {
  name: string;
  path: string;
  depth: number;
  isDir: boolean;
}

/** Flatten the path list into an indented listing, directories before files at
 *  each level, matching what `ls` would suggest. */
function flatten(paths: string[]): Node[] {
  const nodes = new Map<string, Node>();
  for (const path of paths) {
    const parts = path.split("/");
    for (let i = 0; i < parts.length; i += 1) {
      const sub = parts.slice(0, i + 1).join("/");
      if (!nodes.has(sub)) {
        nodes.set(sub, {
          name: parts[i],
          path: sub,
          depth: i,
          isDir: i < parts.length - 1,
        });
      }
    }
  }
  return [...nodes.values()].sort((a, b) => {
    const ad = a.path.split("/");
    const bd = b.path.split("/");
    for (let i = 0; i < Math.max(ad.length, bd.length); i += 1) {
      if (ad[i] === bd[i]) continue;
      if (ad[i] === undefined) return -1;
      if (bd[i] === undefined) return 1;
      const aIsDir = i < ad.length - 1;
      const bIsDir = i < bd.length - 1;
      if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
      return ad[i].localeCompare(bd[i]);
    }
    return 0;
  });
}

export function FileTreePanel({
  state,
  changed,
}: {
  state: RepoState;
  /** Paths added or edited by the last command. */
  changed: Set<string>;
}) {
  const nodes = flatten(state.tree);

  return (
    <section className="git-panel">
      <header className="git-panel-head">
        <h2>Working directory</h2>
        <span className="git-panel-sub">{treeSummary(state)}</span>
      </header>

      {nodes.length === 0 ? (
        <p className="git-panel-empty">
          Nothing here. Create a file with <code>touch</code> or a redirect.
        </p>
      ) : (
        <ul className="bash-tree">
          {nodes.map((node) => (
            <li
              key={node.path}
              className={changed.has(node.path) ? "bash-tree-row changed" : "bash-tree-row"}
              style={{ paddingLeft: `${node.depth * 14}px` }}
            >
              <span className={node.isDir ? "bash-tree-name dir" : "bash-tree-name"}>
                {node.name}
                {node.isDir ? "/" : ""}
              </span>
              {!node.isDir && state.contents?.[node.path] !== undefined && (
                <span className="bash-tree-meta">
                  {(() => {
                    const n = state.contents[node.path].split("\n").filter((l) => l !== "").length;
                    return `${n} line${n === 1 ? "" : "s"}`;
                  })()}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function BashStateStrip({
  state,
  open,
  onToggle,
  changed,
}: {
  state: RepoState;
  open: boolean;
  onToggle: () => void;
  changed: Set<string>;
}) {
  return (
    <div className="sblock-state">
      <button type="button" className="sblock-strip" onClick={onToggle} aria-expanded={open}>
        <ChevronRight
          size={13}
          className={open ? "sblock-strip-caret open" : "sblock-strip-caret"}
          aria-hidden="true"
        />
        <span className="sblock-strip-text">{treeSummary(state)}</span>
        <span className="sblock-strip-action">{open ? "Hide files" : "Show files"}</span>
      </button>
      {open && (
        <div className="sblock-panels">
          <FileTreePanel state={state} changed={changed} />
        </div>
      )}
    </div>
  );
}
