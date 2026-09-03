"use client";

/**
 * The always-visible one-line summary of repo state, and the compact panels it
 * opens into.
 *
 * Embedded surfaces are clamped to a few hundred pixels, so the design's rule
 * is reduce, don't shrink: a ~24px strip that a reader can ignore, expanding
 * to a compact three-areas table plus a small graph on the blocks where the
 * state *is* the lesson.
 */

import { ChevronRight } from "lucide-react";
import { ThreeAreasPanel } from "./ThreeAreasPanel";
import { CommitGraph } from "./CommitGraph";
import type { RepoState } from "./protocol";

export function stateSummary(state: RepoState): string {
  if (!state.initialized) return "No repository";
  const head = state.head.detached
    ? `HEAD detached at ${state.head.oid?.slice(0, 7) ?? "?"}`
    : `HEAD → ${state.head.branch ?? "main"}`;
  const commits = `${state.commits.length} commit${state.commits.length === 1 ? "" : "s"}`;
  const staged = state.files.filter((f) => f.stage !== f.head).length;
  const modified = state.files.filter((f) => f.workdir !== f.stage).length;
  const dirty =
    staged || modified
      ? `${staged} staged, ${modified} modified`
      : "working tree clean";
  return `${head} · ${commits} · ${dirty}`;
}

export function StateStrip({
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
      <button
        type="button"
        className="sblock-strip"
        onClick={onToggle}
        aria-expanded={open}
      >
        <ChevronRight
          size={13}
          className={open ? "sblock-strip-caret open" : "sblock-strip-caret"}
          aria-hidden="true"
        />
        <span className="sblock-strip-text">{stateSummary(state)}</span>
        <span className="sblock-strip-action">{open ? "Hide state" : "Show state"}</span>
      </button>

      {open && (
        <div className="sblock-panels">
          <ThreeAreasPanel files={state.files} changed={changed} merging={state.merging} />
          <CommitGraph commits={state.commits} detached={state.head.detached} />
        </div>
      )}
    </div>
  );
}
