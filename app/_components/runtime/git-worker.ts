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
import { runCommand } from "../git/runCommand";
import {
  EMPTY_STATE,
  type CommitNode,
  type FileStatus,
  type GitWorkerRequest,
  type GitWorkerResponse,
  type RepoState,
} from "../git/protocol";

const REPO = "/repo";

/** A replayed history is untrusted input (design addendum §5.7.4): the
 *  defaults are sized for server sandboxes, far too generous for a tab. */
const EXECUTION_LIMITS = {
  maxSourceBytes: 64 * 1024,
  maxCommandCount: 5_000,
  maxLoopIterations: 10_000,
  maxCallDepth: 32,
  maxTraversalEntries: 20_000,
};

type Session = {
  store: ReturnType<typeof createGitFs>["store"];
  fs: ReturnType<typeof createGitFs>["fs"];
  bash: InstanceType<typeof Bash>;
  clock: { commits: number };
};

/** One repository per session id. The Worker is shared by a whole page; the
 *  sessions are not (see GitWorkerRequest). */
const sessions = new Map<string, Session>();

async function createSession(): Promise<Session> {
  const { store, fs } = createGitFs();
  const clock = { commits: 0 };
  const run = createGitCommand({ fs, dir: REPO, clock });
  const bash = new Bash({
    fs: store,
    cwd: REPO,
    executionLimits: EXECUTION_LIMITS,
    customCommands: [defineCommand("git", run)],
  });
  await store.mkdir(REPO, { recursive: true });
  return { store, fs, bash, clock };
}

async function seed(scenarioId: string): Promise<Session> {
  const next = await createSession();
  for (const command of scenarioById(scenarioId).setup) {
    await runCommand(next.bash, command);
  }
  return next;
}

/** Working-tree paths, `.git` excluded — that stays explorable via `ls`/`cat`
 *  in the terminal rather than being listed in the UI. */
async function listTree(s: Session): Promise<string[]> {
  const paths: string[] = [];
  for (const p of await s.store.getAllPaths()) {
    if (!p.startsWith(`${REPO}/`)) continue;
    const rel = p.slice(REPO.length + 1);
    if (rel === ".git" || rel.startsWith(".git/")) continue;
    try {
      if ((await s.store.stat(p)).isFile) paths.push(rel);
    } catch {
      /* vanished mid-walk */
    }
  }
  return paths.sort();
}

async function readState(s: Session): Promise<RepoState> {
  const fs = s.fs as Parameters<typeof git.log>[0]["fs"];
  const tree = await listTree(s);

  let initialized = false;
  try {
    initialized = (await s.store.stat(`${REPO}/.git`)).isDirectory;
  } catch {
    initialized = false;
  }
  if (!initialized) return { ...EMPTY_STATE, tree, cwd: REPO };

  const branches = await git.listBranches({ fs, dir: REPO });
  let branch: string | null = null;
  try {
    branch = (await git.currentBranch({ fs, dir: REPO, fullname: false })) ?? null;
  } catch {
    branch = null;
  }
  let oid: string | null = null;
  try {
    oid = await git.resolveRef({ fs, dir: REPO, ref: "HEAD" });
  } catch {
    oid = null;
  }

  let files: FileStatus[] = [];
  try {
    files = (await git.statusMatrix({ fs, dir: REPO })).map(([path, head, workdir, stage]) => ({
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
      const target = await git.resolveRef({ fs, dir: REPO, ref: b });
      decorate(target, b === branch ? `HEAD -> ${b}` : b);
    } catch {
      /* unborn */
    }
  }
  if (oid && branch === null) decorate(oid, "HEAD");
  for (const t of await git.listTags({ fs, dir: REPO })) {
    try {
      decorate(await git.resolveRef({ fs, dir: REPO, ref: t }), `tag: ${t}`);
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
      for (const c of await git.log({ fs, dir: REPO, ref, depth: 60 })) {
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
    initialized: true,
    head: { branch, oid, detached: Boolean(oid) && branch === null },
    branches,
    files,
    commits,
    tree,
    cwd: REPO,
  };
}

async function sessionFor(id: string): Promise<Session> {
  let s = sessions.get(id);
  if (!s) {
    s = await createSession();
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
          const seeded = await seed(req.scenario);
          sessions.set(req.session, seeded);
          post({ id: req.id, ok: true, stdout: "", stderr: "", exitCode: 0, state: await readState(seeded) });
          return;
        }
        case "exec": {
          const s = await sessionFor(req.session);
          const result = await runCommand(s.bash, req.command);
          post({
            id: req.id,
            ok: true,
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
            state: await readState(s),
          });
          return;
        }
        case "readFile": {
          const s = await sessionFor(req.session);
          const content = await s.store.readFile(`${REPO}/${req.path}`).catch(() => "");
          post({
            id: req.id,
            ok: true,
            stdout: "",
            stderr: "",
            exitCode: 0,
            content,
            state: await readState(s),
          });
          return;
        }
        case "writeFile": {
          const s = await sessionFor(req.session);
          let stderr = "";
          let exitCode = 0;
          try {
            await s.store.writeFile(`${REPO}/${req.path}`, req.content);
          } catch (e) {
            stderr = `${(e as Error).message}\n`;
            exitCode = 1;
          }
          post({ id: req.id, ok: true, stdout: "", stderr, exitCode, state: await readState(s) });
          return;
        }
        case "attach": {
          const s = await sessionFor(req.session);
          post({ id: req.id, ok: true, stdout: "", stderr: "", exitCode: 0, state: await readState(s) });
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
