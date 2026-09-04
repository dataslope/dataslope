"use client";

/**
 * The three areas as three boxes, top to bottom, with files as chips that
 * move between them.
 *
 * This is the playground's version of `ThreeAreasPanel`. The table there
 * reads the same `statusMatrix` rows as a grid of dots; this reads them as
 * places. `git add` moves a chip from the top box to the middle one and
 * `git commit` moves it to the bottom, with a FLIP transition so the move is
 * seen rather than inferred. The arrows between the boxes are labelled with
 * the command that crosses them, so the panel doubles as the cheat sheet for
 * the two commands that matter most.
 *
 * A file lives in exactly one box, the one that holds its most pending
 * state, because a chip can only animate to where it is going if it is the
 * same chip. "Staged, then edited again" is therefore a staged chip with a
 * note, not two chips.
 */

import { useLayoutEffect, useRef } from "react";
import { ArrowDown, GitCommit, FileText } from "lucide-react";
import type { FileStatus, RepoState } from "./protocol";
import { isConflicted } from "./repoFacts";

type Area = "work" | "stage" | "head";
type Tone = "new" | "modified" | "deleted" | "staged" | "conflict" | "clean";

export interface Chip {
  path: string;
  area: Area;
  /** One or two words, in the reader's vocabulary. */
  word: string;
  tone: Tone;
}

/** Which box each file belongs in, and what to call its state there. */
export function placeFiles(files: FileStatus[], merging: string | null): Chip[] {
  return files.map((f): Chip => {
    if (isConflicted(f, merging)) return { path: f.path, area: "stage", word: "conflict", tone: "conflict" };
    if (f.stage !== f.head) {
      const word =
        f.workdir === 0
          ? "staged, then deleted"
          : f.workdir !== f.stage
            ? "staged, edited since"
            : f.head === 0
              ? "new, staged"
              : "staged";
      return { path: f.path, area: "stage", word, tone: "staged" };
    }
    if (f.workdir === 0) return { path: f.path, area: "work", word: "deleted", tone: "deleted" };
    if (f.workdir !== f.stage) {
      return f.head === 0
        ? { path: f.path, area: "work", word: "new", tone: "new" }
        : { path: f.path, area: "work", word: "modified", tone: "modified" };
    }
    return { path: f.path, area: "head", word: "", tone: "clean" };
  });
}

/**
 * FLIP across the whole panel: every chip carries `data-flip`, and after a
 * render each one that is somewhere other than where it was last time is
 * translated back to its old spot and released. Keyed by path, so a chip
 * that changes box slides there rather than disappearing and reappearing.
 */
function useFlip(root: React.RefObject<HTMLElement | null>, dep: unknown) {
  const last = useRef(new Map<string, DOMRect>());
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const next = new Map<string, DOMRect>();
    el.querySelectorAll<HTMLElement>("[data-flip]").forEach((chip) => {
      const key = chip.dataset.flip ?? "";
      const rect = chip.getBoundingClientRect();
      next.set(key, rect);
      const prev = last.current.get(key);
      if (!prev || reduce) return;
      const dx = prev.left - rect.left;
      const dy = prev.top - rect.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      chip.style.transition = "none";
      chip.style.transform = `translate(${dx}px, ${dy}px)`;
      chip.classList.add("moving");
      // Force the start position to be laid out before it is animated away.
      void chip.getBoundingClientRect();
      requestAnimationFrame(() => {
        chip.style.transition = "transform 280ms cubic-bezier(0.2, 0.7, 0.2, 1)";
        chip.style.transform = "";
        const done = () => {
          chip.style.transition = "";
          chip.classList.remove("moving");
          chip.removeEventListener("transitionend", done);
        };
        chip.addEventListener("transitionend", done);
      });
    });
    last.current = next;
  }, [root, dep]);
}

const CLEAN_CAP = 8;

interface Props {
  state: RepoState;
  /** Paths the last command touched, ringed for a moment. */
  changed: Set<string>;
  /** Git's own names for the boxes, and the pointer chain under the third. */
  internals: boolean;
  onOpen: (path: string) => void;
}

const TITLES = {
  plain: { work: "Working directory", stage: "Staging area", head: "Committed" },
  internals: { work: "Working tree", stage: "Index", head: "HEAD" },
} as const;

export function AreasBoxes({ state, changed, internals, onOpen }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const chips = state.initialized
    ? placeFiles(state.files, state.merging)
    : state.tree.map((path): Chip => ({ path, area: "work", word: "", tone: "new" }));
  useFlip(root, chips.map((c) => `${c.path}:${c.area}`).join("|"));

  const titles = internals ? TITLES.internals : TITLES.plain;
  const inArea = (area: Area) => chips.filter((c) => c.area === area);
  const work = inArea("work");
  const stage = inArea("stage");
  const head = inArea("head");
  const shownHead = head.slice(0, CLEAN_CAP);

  const headLine = !state.initialized
    ? "no repository yet"
    : state.head.detached
      ? `HEAD detached at ${state.head.oid?.slice(0, 7) ?? "?"}`
      : `on ${state.head.branch ?? "main"} · ${state.commits.length} commit${state.commits.length === 1 ? "" : "s"}`;

  const renderChip = (chip: Chip) => (
    <button
      key={chip.path}
      type="button"
      data-flip={chip.path}
      className={`gitx-chip tone-${chip.tone}${changed.has(chip.path) ? " changed" : ""}`}
      onClick={() => onOpen(chip.path)}
      title={`Open ${chip.path}`}
    >
      <i className="gitx-chip-dot" aria-hidden="true" />
      <span className="gitx-chip-path">{chip.path}</span>
      {chip.word && <small className="gitx-chip-word">{chip.word}</small>}
    </button>
  );

  return (
    <div className="gitx-areas" ref={root}>
      <section className="gitx-box area-work" aria-label={titles.work}>
        <header className="gitx-box-head">
          <span className="gitx-box-title">
            <FileText size={13} aria-hidden="true" />
            {titles.work}
          </span>
          <span className="gitx-box-count">{work.length ? `${work.length} file${work.length === 1 ? "" : "s"}` : "clean"}</span>
        </header>
        <div className="gitx-box-body">
          {work.length ? (
            work.map(renderChip)
          ) : (
            <p className="gitx-box-empty">
              {state.initialized
                ? "Nothing changed on disk. Open a file and edit it, or create one."
                : "Empty. Create a file to have something to track."}
            </p>
          )}
        </div>
      </section>

      <div className="gitx-arrow" aria-hidden="true">
        <ArrowDown size={14} strokeWidth={2} />
        <span className="gitx-arrow-text">
          <code>git add</code> moves a file here
        </span>
      </div>

      <section
        className={`gitx-box area-stage${state.initialized ? "" : " muted"}`}
        aria-label={titles.stage}
      >
        <header className="gitx-box-head">
          <span className="gitx-box-title">
            <GitCommit size={13} aria-hidden="true" />
            {titles.stage}
          </span>
          <span className="gitx-box-count">
            {!state.initialized ? "needs a repository" : stage.length ? `${stage.length} ready` : "empty"}
          </span>
        </header>
        <div className="gitx-box-body">
          {stage.length ? (
            stage.map(renderChip)
          ) : (
            <p className="gitx-box-empty">
              {state.initialized ? "Nothing staged. What is here goes into the next commit." : "Run git init first."}
            </p>
          )}
        </div>
      </section>

      <div className="gitx-arrow" aria-hidden="true">
        <ArrowDown size={14} strokeWidth={2} />
        <span className="gitx-arrow-text">
          <code>git commit</code> records it
        </span>
      </div>

      <section
        className={`gitx-box area-head${state.initialized ? "" : " muted"}`}
        aria-label={titles.head}
      >
        <header className="gitx-box-head">
          <span className="gitx-box-title">
            <GitCommit size={13} aria-hidden="true" />
            {titles.head}
          </span>
          <span className="gitx-box-count">{headLine}</span>
        </header>
        <div className="gitx-box-body">
          {shownHead.length ? (
            <>
              {shownHead.map(renderChip)}
              {head.length > CLEAN_CAP && (
                <span className="gitx-chip-more">+{head.length - CLEAN_CAP} more</span>
              )}
            </>
          ) : (
            <p className="gitx-box-empty">
              {!state.initialized
                ? "Run git init first."
                : state.commits.length
                  ? "Every tracked file has uncommitted changes."
                  : "No commits yet. The first git commit puts files here."}
            </p>
          )}
          {internals && state.initialized && (
            <p className="gitx-chain" title="Where HEAD points">
              HEAD → {state.head.detached ? "" : `refs/heads/${state.head.branch ?? "main"} → `}
              {state.head.oid ? state.head.oid.slice(0, 7) : "(unborn)"}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
