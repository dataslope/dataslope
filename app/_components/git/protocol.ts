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

/** Which engine a session runs. A bash session skips every git read, so a
 *  shell lesson does not pay for repository introspection it never shows. */
export type SessionKind = "git" | "bash";

/** Everything the panels render, re-read after every command. */
export interface RepoState {
  kind: SessionKind;
  initialized: boolean;
  head: { branch: string | null; oid: string | null; detached: boolean };
  branches: string[];
  files: FileStatus[];
  commits: CommitNode[];
  /** Working-tree paths outside `.git`, for the file list. */
  tree: string[];
  /**
   * Directories, for tab-completion. `tree` holds files, so a directory is
   * normally inferable from the paths beneath it — but an empty one has no
   * paths beneath it, and `mkdir test` followed by `cd te<Tab>` has to work.
   */
  dirs: string[];
  cwd: string;
  /**
   * The branch a conflicted merge is waiting to bring in, or null when no
   * merge is in progress. isomorphic-git never writes MERGE_HEAD, so this is
   * the only place the UI can learn that `git commit` will finish a merge
   * and that a file marked "conflict" needs the reader's attention.
   */
  merging: string | null;
  /** Contents of small text files, for grading `fileContains` without a round
   *  trip per assertion. Bash sessions only, and capped (see the limits
   *  below) so a session cannot post megabytes back on every command. */
  contents?: Record<string, string>;
}

/**
 * Where a session's filesystem starts, by kind.
 *
 * A Git session's root is the repository it is teaching, so `/repo` names
 * exactly what is there. A shell session has nothing to do with
 * repositories: it gets a home directory, which is what `pwd` should answer
 * in a lesson about `ls` and `cd`, and what the `user` in `ls -l` implies.
 */
export const SESSION_ROOTS: Record<SessionKind, string> = {
  git: "/repo",
  bash: "/home/user",
};

export const EMPTY_STATE: RepoState = {
  kind: "git",
  initialized: false,
  head: { branch: null, oid: null, detached: false },
  branches: [],
  files: [],
  commits: [],
  tree: [],
  dirs: [],
  cwd: "/repo",
  merging: null,
};

/**
 * Every request names a session. One Worker serves a whole page, but each
 * session is a separate repository: sharing the worker is cheap, sharing repo
 * state between unrelated blocks is the bug (a block would silently inherit
 * the one above it). Blocks opt into continuity by passing the same id.
 */
export type GitWorkerRequest =
  | { id: number; session: string; type: "init"; scenario: string; kind?: SessionKind }
  /** `shell` names one of several shells over the session's one filesystem
   *  (the Bash playground's split terminals); omitted, it is the session's
   *  main shell. An unknown id is opened at the session root on first use. */
  | { id: number; session: string; type: "exec"; command: string; shell?: string }
  /** Open a shell, optionally in a given directory (a split inherits the
   *  directory of the terminal it was split from). */
  | { id: number; session: string; type: "openShell"; shell: string; cwd?: string }
  | { id: number; session: string; type: "closeShell"; shell: string }
  | { id: number; session: string; type: "reset"; scenario: string; kind?: SessionKind }
  | { id: number; session: string; type: "readFile"; path: string }
  | { id: number; session: string; type: "writeFile"; path: string; content: string }
  | { id: number; session: string; type: "dispose" }
  /** Read a session's current state without re-seeding it, so a second block
   *  sharing a repo id joins the first block's work rather than wiping it. */
  | { id: number; session: string; type: "attach" };

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
      /** The line was not finished (an open `if`, quote or pipe) and did
       *  not run; the terminal can ask for the rest. */
      incomplete?: boolean;
    }
  | { id: number; ok: false; error: string };

/** §5.7.2 — caps enforced in the FS wrapper, not by just-bash: its
 *  `maxFileSystemBytes` only governs the filesystem Bash creates itself, and
 *  we inject our own so isomorphic-git can share it. Large files break the
 *  per-command snapshot before they break a share URL. */
export const MAX_FILE_BYTES = 256 * 1024;
export const MAX_TREE_BYTES = 2 * 1024 * 1024;

/** Caps on the contents snapshot a bash session posts back per command. */
export const MAX_SNAPSHOT_FILES = 40;
export const MAX_SNAPSHOT_FILE_BYTES = 8 * 1024;
