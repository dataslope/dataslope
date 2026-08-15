/**
 * Message protocol and repo-state shape shared by the Git playground UI and
 * `public/_workers/git-worker.js`. Isomorphic (no DOM, no Worker APIs) so both
 * sides import the same types.
 */

/** One row of `statusMatrix()`: 0–3 per area, straight from isomorphic-git. */
export interface FileStatus {
  path: string;
  /** 0 = absent from HEAD, 1 = present. */
  head: number;
  /** 0 = deleted, 1 = same as HEAD, 2 = modified. */
  workdir: number;
  /** 0 = absent, 1 = same as HEAD, 2 = staged change, 3 = staged then edited. */
  stage: number;
}

export interface CommitNode {
  oid: string;
  message: string;
  parents: string[];
  author: string;
  timestamp: number;
  /** Branch names (and HEAD) pointing at this commit. */
  refs: string[];
}

/** Everything the panels render, re-read after every command. */
export interface RepoState {
  initialized: boolean;
  head: { branch: string | null; oid: string | null; detached: boolean };
  branches: string[];
  files: FileStatus[];
  commits: CommitNode[];
  /** Working-tree paths outside `.git`, for the file list. */
  tree: string[];
  cwd: string;
}

export const EMPTY_STATE: RepoState = {
  initialized: false,
  head: { branch: null, oid: null, detached: false },
  branches: [],
  files: [],
  commits: [],
  tree: [],
  cwd: "/repo",
};

export type GitWorkerRequest =
  | { id: number; type: "init"; scenario: string }
  | { id: number; type: "exec"; command: string }
  | { id: number; type: "reset"; scenario: string }
  | { id: number; type: "readFile"; path: string }
  | { id: number; type: "writeFile"; path: string; content: string };

export type GitWorkerResponse =
  | {
      id: number;
      ok: true;
      stdout: string;
      stderr: string;
      exitCode: number;
      state: RepoState;
      /** Set by `readFile`. */
      content?: string;
    }
  | { id: number; ok: false; error: string };

/** §5.7.2 — caps enforced in the FS wrapper, not by just-bash: its
 *  `maxFileSystemBytes` only governs the filesystem Bash creates itself, and
 *  we inject our own so isomorphic-git can share it. Large files break the
 *  per-command snapshot before they break a share URL. */
export const MAX_FILE_BYTES = 256 * 1024;
export const MAX_TREE_BYTES = 2 * 1024 * 1024;
