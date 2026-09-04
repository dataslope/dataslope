/// <reference lib="webworker" />

/**
 * Web Worker running the Git playground: just-bash for the shell, isomorphic-git
 * for the repository, both over one in-memory filesystem. Pre-bundled to
 * `public/_workers/git-worker.js` by `scripts/build-almostnode-workers.mjs`, so
 * neither library reaches the client or Worker bundles.
 *
 * Memory-only: nothing here touches OPFS or the network.
 */

import { Bash, defineCommand } from "just-bash/browser";
import git from "isomorphic-git";
import { createGitFs } from "../git/gitFs";
import { createGitCommand } from "../git/gitCommand";
import { scenarioById } from "../git/scenarios";
import { bashScenarioById } from "../bash/bashScenarios";
import { runCommand, ShellSession } from "../git/runCommand";
import {
  EMPTY_STATE,
  MAX_SNAPSHOT_FILES,
  MAX_SNAPSHOT_FILE_BYTES,
  type SessionKind,
  type CommitNode,
  type FileStatus,
  type GitWorkerRequest,
  type GitWorkerResponse,
  type RepoState,
  SESSION_ROOTS,
} from "../git/protocol";



/** A replayed history is untrusted input (design addendum §5.7.4): the
 *  defaults are sized for server sandboxes, far too generous for a tab. */
const EXECUTION_LIMITS = {
  maxSourceBytes: 64 * 1024,
  // Sized for a lesson, not a server: a 20,000-step counter loop is an
  // ordinary exercise ("how long does a loop take?") and costs two commands
  // per step. The wall-clock budget is what actually keeps the tab
  // responsive; the counts are a backstop under it.
  maxCommandCount: 250_000,
  maxLoopIterations: 100_000,
  maxExecutionTimeMs: 20_000,
  maxCallDepth: 32,
  maxTraversalEntries: 20_000,
};

type Session = {
  store: ReturnType<typeof createGitFs>["store"];
  fs: ReturnType<typeof createGitFs>["fs"];
  bash: InstanceType<typeof Bash>;
  clock: { commits: number };
  kind: SessionKind;
  /** Where this session's filesystem starts. A Git session lives in a
   *  repository, a shell session in a home directory. */
  root: string;
  /** The `git` command bound to this session, kept so its merge state can be
   *  read back after each command. */
  run: ReturnType<typeof createGitCommand>;
  /** Working directory, environment and functions that outlive one exec, so
   *  the terminal behaves like a terminal. This is the main shell; the Git
   *  playground and the blocks only ever use it. */
  shell: ShellSession;
  /**
   * Every shell over this session's filesystem, the main one included. The
   * Bash playground opens one per terminal: same files, separate working
   * directory, environment and functions, which is what a split terminal
   * means everywhere else.
   */
  shells: Map<string, ShellSession>;
  /**
   * Commands on one session run one at a time. The message handler is async
   * per message, so two terminals typing at once would otherwise interleave
   * inside the one `Bash` instance mid-command. Reads queue too, so a
   * snapshot never sees a filesystem halfway through a write.
   */
  queue: Promise<unknown>;
};

const MAIN_SHELL = "main";

/** The named shell, opened on first use. `cwd` only applies when opening. */
function shellFor(s: Session, id = MAIN_SHELL, cwd?: string): ShellSession {
  let shell = s.shells.get(id);
  if (!shell) {
    shell = new ShellSession(cwd ?? s.root, s.root);
    s.shells.set(id, shell);
  }
  return shell;
}

/** Run `fn` after everything already queued on the session. A failure does
 *  not poison the queue: the next job still runs. */
function enqueue<T>(s: Session, fn: () => Promise<T>): Promise<T> {
  const job = s.queue.then(fn, fn);
  s.queue = job.catch(() => undefined);
  return job;
}

/** One repository per session id. The Worker is shared by a whole page; the
 *  sessions are not (see GitWorkerRequest). */
const sessions = new Map<string, Session>();

async function createSession(kind: SessionKind): Promise<Session> {
  const { store, fs } = createGitFs();
  const clock = { commits: 0 };
  const root = SESSION_ROOTS[kind];
  // Git is bound to the session root rather than to `/repo` outright, so a
  // `git init` in a shell session initialises the directory the reader is
  // actually standing in.
  const run = createGitCommand({ fs, dir: root, clock });
  const bash = new Bash({
    fs: store,
    cwd: root,
    executionLimits: EXECUTION_LIMITS,
    customCommands: [defineCommand("git", run)],
  });
  await store.mkdir(root, { recursive: true });
  const shell = new ShellSession(root);
  return {
    store,
    fs,
    bash,
    clock,
    kind,
    root,
    run,
    shell,
    shells: new Map([[MAIN_SHELL, shell]]),
    queue: Promise.resolve(),
  };
}

async function seed(scenarioId: string, kind: SessionKind): Promise<Session> {
  const next = await createSession(kind);
  if (kind === "bash") {
    const scenario = bashScenarioById(scenarioId);
    // Scenery is written straight to the filesystem; anything the learner is
    // meant to *see* as a command goes through the shell.
    for (const [path, contents] of Object.entries(scenario.files)) {
      const slash = path.lastIndexOf("/");
      if (slash > 0)
        await next.store.mkdir(`${next.root}/${path.slice(0, slash)}`, { recursive: true });
      await next.store.writeFile(`${next.root}/${path}`, contents);
    }
    for (const command of scenario.setup ?? []) await runCommand(next.bash, command);
    return next;
  }
  for (const command of scenarioById(scenarioId).setup) {
    await runCommand(next.bash, command);
  }
  return next;
}

/** Working-tree paths, `.git` excluded — that stays explorable via `ls`/`cat`
 *  in the terminal rather than being listed in the UI. Files and directories
 *  come back separately: the UI lists files, and completion needs both,
 *  because an empty directory leaves no file to infer it from. */
async function listTree(s: Session): Promise<{ files: string[]; dirs: string[] }> {
  const files: string[] = [];
  const dirs: string[] = [];
  for (const p of await s.store.getAllPaths()) {
    if (!p.startsWith(`${s.root}/`)) continue;
    const rel = p.slice(s.root.length + 1);
    if (rel === ".git" || rel.startsWith(".git/")) continue;
    try {
      const stat = await s.store.stat(p);
      if (stat.isFile) files.push(rel);
      else if (stat.isDirectory) dirs.push(rel);
    } catch {
      /* vanished mid-walk */
    }
  }
  return { files: files.sort(), dirs: dirs.sort() };
}

/** Small text files, so a card can grade `fileContains` without a round trip
 *  per assertion. Capped in both directions: a runaway session must not post
 *  megabytes back after every command. */
async function snapshot(s: Session, tree: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const rel of tree.slice(0, MAX_SNAPSHOT_FILES)) {
    try {
      const stat = await s.store.stat(`${s.root}/${rel}`);
      if (stat.size > MAX_SNAPSHOT_FILE_BYTES) continue;
      out[rel] = await s.store.readFile(`${s.root}/${rel}`);
    } catch {
      /* binary, or vanished between the walk and the read */
    }
  }
  return out;
}

/** The session's state as seen from one shell: the filesystem is shared,
 *  the working directory is the shell's own. */
async function readState(s: Session, shell: ShellSession = s.shell): Promise<RepoState> {
  const fs = s.fs as Parameters<typeof git.log>[0]["fs"];
  const { files: tree, dirs } = await listTree(s);

  if (s.kind === "bash") {
    return {
      ...EMPTY_STATE,
      kind: "bash",
      tree,
      dirs,
      cwd: shell.cwd,
      contents: await snapshot(s, tree),
    };
  }

  let initialized = false;
  try {
    initialized = (await s.store.stat(`${s.root}/.git`)).isDirectory;
  } catch {
    initialized = false;
  }
  if (!initialized) return { ...EMPTY_STATE, kind: "git", tree, dirs, cwd: shell.cwd, merging: null };

  const branches = await git.listBranches({ fs, dir: s.root });
  let branch: string | null = null;
  try {
    branch = (await git.currentBranch({ fs, dir: s.root, fullname: false })) ?? null;
  } catch {
    branch = null;
  }
  let oid: string | null = null;
  try {
    oid = await git.resolveRef({ fs, dir: s.root, ref: "HEAD" });
  } catch {
    oid = null;
  }

  let files: FileStatus[] = [];
  try {
    files = (await git.statusMatrix({ fs, dir: s.root })).map(([path, head, workdir, stage]) => ({
      path: String(path),
      head: Number(head),
      workdir: Number(workdir),
      stage: Number(stage),
    }));
  } catch {
    files = [];
  }

  // Decorate like `git log` does, so the graph can render a distinct
  // `HEAD -> main` pill and a bare `HEAD` when it detaches.
  const refs = new Map<string, string[]>();
  const decorate = (oid: string, label: string) =>
    refs.set(oid, [...(refs.get(oid) ?? []), label]);
  for (const b of branches) {
    try {
      const target = await git.resolveRef({ fs, dir: s.root, ref: b });
      decorate(target, b === branch ? `HEAD -> ${b}` : b);
    } catch {
      /* unborn */
    }
  }
  if (oid && branch === null) decorate(oid, "HEAD");
  for (const t of await git.listTags({ fs, dir: s.root })) {
    try {
      decorate(await git.resolveRef({ fs, dir: s.root, ref: t }), `tag: ${t}`);
    } catch {
      /* dangling tag */
    }
  }

  // Walk every branch, not just HEAD: a graph that hides the branch you
  // diverged from cannot show ahead/behind, which is the relationship the
  // panel exists to explain.
  const seen = new Map<string, CommitNode>();
  const tips = [...branches, ...(oid && branch === null ? ["HEAD"] : [])];
  for (const ref of tips) {
    try {
      for (const c of await git.log({ fs, dir: s.root, ref, depth: 60 })) {
        if (seen.has(c.oid)) continue;
        seen.set(c.oid, {
          oid: c.oid,
          message: c.commit.message.trim(),
          parents: c.commit.parent,
          author: c.commit.author.name,
          timestamp: c.commit.author.timestamp,
          refs: refs.get(c.oid) ?? [],
        });
      }
    } catch {
      /* unborn branch, or a ref with no commits yet */
    }
  }
  const commits = [...seen.values()]
    .sort((a, b) => b.timestamp - a.timestamp || (a.oid < b.oid ? 1 : -1))
    .slice(0, 60);

  return {
    kind: "git",
    initialized: true,
    head: { branch, oid, detached: Boolean(oid) && branch === null },
    branches,
    files,
    commits,
    tree,
    dirs,
    cwd: shell.cwd,
    merging: s.run.merging,
  };
}

async function sessionFor(id: string): Promise<Session> {
  let s = sessions.get(id);
  if (!s) {
    s = await createSession("git");
    sessions.set(id, s);
  }
  return s;
}

const post = (msg: GitWorkerResponse) => (self as unknown as Worker).postMessage(msg);

self.addEventListener("message", (event: MessageEvent<GitWorkerRequest>) => {
  void (async () => {
    const req = event.data;
    try {
      switch (req.type) {
        case "init":
        case "reset": {
          const seeded = await seed(req.scenario, req.kind ?? "git");
          sessions.set(req.session, seeded);
          post({ id: req.id, ok: true, stdout: "", stderr: "", exitCode: 0, state: await readState(seeded) });
          return;
        }
        case "exec": {
          const s = await sessionFor(req.session);
          const shell = shellFor(s, req.shell);
          const { result, state } = await enqueue(s, async () => ({
            result: await shell.run(s.bash, req.command),
            state: await readState(s, shell),
          }));
          post({
            id: req.id,
            ok: true,
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
            ...(result.incomplete ? { incomplete: true } : {}),
            state,
          });
          return;
        }
        case "openShell": {
          const s = await sessionFor(req.session);
          const shell = shellFor(s, req.shell, req.cwd);
          post({ id: req.id, ok: true, stdout: "", stderr: "", exitCode: 0, state: await enqueue(s, () => readState(s, shell)) });
          return;
        }
        case "closeShell": {
          const s = await sessionFor(req.session);
          if (req.shell !== MAIN_SHELL) s.shells.delete(req.shell);
          post({ id: req.id, ok: true, stdout: "", stderr: "", exitCode: 0, state: await enqueue(s, () => readState(s)) });
          return;
        }
        case "readFile": {
          const s = await sessionFor(req.session);
          const { content, state } = await enqueue(s, async () => ({
            content: await s.store.readFile(`${s.root}/${req.path}`).catch(() => ""),
            state: await readState(s),
          }));
          post({ id: req.id, ok: true, stdout: "", stderr: "", exitCode: 0, content, state });
          return;
        }
        case "writeFile": {
          const s = await sessionFor(req.session);
          const { stderr, exitCode, state } = await enqueue(s, async () => {
            let stderr = "";
            let exitCode = 0;
            try {
              await s.store.writeFile(`${s.root}/${req.path}`, req.content);
            } catch (e) {
              stderr = `${(e as Error).message}\n`;
              exitCode = 1;
            }
            return { stderr, exitCode, state: await readState(s) };
          });
          post({ id: req.id, ok: true, stdout: "", stderr, exitCode, state });
          return;
        }
        case "attach": {
          const s = await sessionFor(req.session);
          post({ id: req.id, ok: true, stdout: "", stderr: "", exitCode: 0, state: await enqueue(s, () => readState(s)) });
          return;
        }
        case "dispose": {
          sessions.delete(req.session);
          post({ id: req.id, ok: true, stdout: "", stderr: "", exitCode: 0, state: EMPTY_STATE });
          return;
        }
      }
    } catch (e) {
      post({ id: req.id, ok: false, error: (e as Error).message ?? String(e) });
    }
  })();
});
