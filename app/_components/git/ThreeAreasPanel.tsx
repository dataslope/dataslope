"use client";

/**
 * The three areas — Working Tree, Index (staging), HEAD — read straight off
 * `statusMatrix()`, which returns `[filepath, HEAD, workdir, stage]` and is
 * therefore already this component's data model.
 *
 * Rows changed by the last command are flagged so the dot that moves from
 * Working Tree to Index on `git add` is visible. That movement is the whole
 * pedagogical payload; everything else on the page supports it.
 */

import type { FileStatus } from "./protocol";
import { isConflicted } from "./repoFacts";

/** `statusMatrix` codes → does this area hold the file? */
const inHead = (f: FileStatus) => f.head === 1;
const inIndex = (f: FileStatus) => f.stage !== 0;
const inWorkdir = (f: FileStatus) => f.workdir !== 0;

/** A file is "pending" in an area when its content there differs from HEAD. */
const indexDiffers = (f: FileStatus) => f.stage !== f.head && f.stage !== 0;
const workdirDiffers = (f: FileStatus) => f.workdir === 2 && f.workdir !== f.stage;

function areaLabel(f: FileStatus, merging: string | null): string {
  if (isConflicted(f, merging)) return "conflict";
  if (f.head === 0 && f.stage === 0) return "untracked";
  if (indexDiffers(f) && workdirDiffers(f)) return "staged, then edited";
  if (indexDiffers(f)) return "staged";
  if (workdirDiffers(f)) return "modified";
  if (f.workdir === 0 && f.head === 1) return "deleted";
  return "committed";
}

function Dot({
  present,
  pending,
  title,
}: {
  present: boolean;
  pending: boolean;
  title: string;
}) {
  return (
    <span
      className={`git-dot${present ? " on" : ""}${pending ? " pending" : ""}`}
      title={title}
      aria-label={title}
      role="img"
    />
  );
}

export function ThreeAreasPanel({
  files,
  changed,
  merging = null,
}: {
  files: FileStatus[];
  /** Paths touched by the last command, highlighted for one render. */
  changed: Set<string>;
  /** The branch a stopped merge is bringing in, so an unmerged file is
   *  labelled "conflict" rather than "staged, then edited". */
  merging?: string | null;
}) {
  const rows = files.filter((f) => f.head !== 1 || f.workdir !== 1 || f.stage !== 1);
  const clean = files.length - rows.length;

  return (
    <section className="git-panel">
      <header className="git-panel-head">
        <h2>Three areas</h2>
        <span className="git-panel-sub">
          {rows.length === 0 ? "working tree clean" : `${rows.length} changed`}
          {clean > 0 && ` · ${clean} clean`}
        </span>
      </header>

      {rows.length === 0 ? (
        <p className="git-panel-empty">
          Nothing to show yet. Edit a file, then run <code>git add</code> and watch a dot move.
        </p>
      ) : (
        <table className="git-areas">
          <thead>
            <tr>
              <th scope="col" className="git-areas-file">
                File
              </th>
              <th scope="col">Working tree</th>
              <th scope="col">Index</th>
              <th scope="col">HEAD</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => (
              <tr key={f.path} className={changed.has(f.path) ? "git-areas-row changed" : "git-areas-row"}>
                <th scope="row" className="git-areas-file">
                  <span className="git-areas-name" title={f.path}>
                    {f.path}
                  </span>
                  <span className="git-areas-state">{areaLabel(f, merging)}</span>
                </th>
                <td>
                  <Dot
                    present={inWorkdir(f)}
                    pending={workdirDiffers(f)}
                    title={inWorkdir(f) ? "in the working tree" : "not in the working tree"}
                  />
                </td>
                <td>
                  <Dot
                    present={inIndex(f)}
                    pending={indexDiffers(f)}
                    title={inIndex(f) ? "in the index" : "not staged"}
                  />
                </td>
                <td>
                  <Dot
                    present={inHead(f)}
                    pending={false}
                    title={inHead(f) ? "committed in HEAD" : "not committed"}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
