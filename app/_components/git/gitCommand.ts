/**
 * `git` as a just-bash custom command, dispatching to isomorphic-git. We own
 * this layer, so error text is git's actual wording rather than
 * isomorphic-git's — the cost the design accepted in §2.3 is paid back here.
 *
 * Commits use a seeded clock (not wall time) so a replayed command history
 * reproduces byte-identical object ids, which is what makes share links work
 * and lets lesson prose quote a real SHA.
 */

import git from "isomorphic-git";

interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const ok = (stdout = ""): ExecResult => ({ stdout, stderr: "", exitCode: 0 });
const fail = (stderr: string, exitCode = 1): ExecResult => ({ stdout: "", stderr, exitCode });

/** 2026-01-01T00:00:00Z, advanced one minute per commit. */
const EPOCH = 1767225600;
const AUTHOR = { name: "You", email: "you@dataslope.dev" };

export interface GitCommandOptions {
  fs: unknown;
  dir: string;
  /** Mutable counter so replays are deterministic across a session. */
  clock: { commits: number };
  author?: { name: string; email: string };
}

type FsArg = Parameters<typeof git.log>[0]["fs"];

const short = (oid: string) => oid.slice(0, 7);

function splitFlags(args: string[]) {
  const flags = new Set<string>();
  const values = new Map<string, string>();
  const rest: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === "--") {
      rest.push(...args.slice(i + 1));
      break;
    }
    if (a === "-m" || a === "--message") {
      values.set("message", args[++i] ?? "");
    } else if (a.startsWith("--") && a.includes("=")) {
      const [k, v] = a.slice(2).split(/=(.*)/s);
      values.set(k, v);
    } else if (a.startsWith("-")) {
      flags.add(a);
    } else {
      rest.push(a);
    }
  }
  return { flags, values, rest };
}

/** Resolve a user-typed path against the shell's cwd, into a repo-relative one. */
function relToRepo(dir: string, cwd: string, p: string): string {
  const abs = p.startsWith("/") ? p : `${cwd.replace(/\/$/, "")}/${p}`;
  const norm: string[] = [];
  for (const seg of abs.split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") norm.pop();
    else norm.push(seg);
  }
  const full = `/${norm.join("/")}`;
  const base = dir.replace(/\/$/, "");
  return full === base ? "." : full.startsWith(`${base}/`) ? full.slice(base.length + 1) : full;
}

export function createGitCommand(opts: GitCommandOptions) {
  const { dir, clock } = opts;
  const fs = opts.fs as FsArg;
  const author = opts.author ?? AUTHOR;

  const isRepo = async () => {
    try {
      await git.resolveRef({ fs, dir, ref: "HEAD", depth: 1 });
      return true;
    } catch {
      try {
        return (await (fs as never as { promises: { stat: (p: string) => Promise<unknown> } }).promises.stat(`${dir}/.git`)) != null;
      } catch {
        return false;
      }
    }
  };

  const requireRepo = async () => {
    if (!(await isRepo())) {
      throw new Error("not a git repository (or any of the parent directories): .git");
    }
  };

  const currentBranch = async () =>
    (await git.currentBranch({ fs, dir, fullname: false })) ?? null;

  const headOid = async () => {
    try {
      return await git.resolveRef({ fs, dir, ref: "HEAD" });
    } catch {
      return null;
    }
  };

  async function status(short_: boolean): Promise<ExecResult> {
    await requireRepo();
    const branch = await currentBranch();
    const matrix = await git.statusMatrix({ fs, dir });
    const staged = matrix.filter(([, h, , s]) => s !== h && s !== 0).map(([f]) => String(f));
    const deletedStaged = matrix.filter(([, h, , s]) => h === 1 && s === 0).map(([f]) => String(f));
    const modified = matrix.filter(([, , w, s]) => w === 2 && s !== 2 && s !== 3).map(([f]) => String(f));
    const modifiedAfterStage = matrix.filter(([, , w, s]) => s === 3 && w === 2).map(([f]) => String(f));
    const deleted = matrix.filter(([, h, w]) => h === 1 && w === 0).map(([f]) => String(f));
    const untracked = matrix.filter(([, h, w, s]) => h === 0 && s === 0 && w === 2).map(([f]) => String(f));

    if (short_) {
      const lines = [
        ...staged.filter((f) => !modifiedAfterStage.includes(f)).map((f) => `A  ${f}`),
        ...modifiedAfterStage.map((f) => `AM ${f}`),
        ...deletedStaged.map((f) => `D  ${f}`),
        ...modified.filter((f) => !untracked.includes(f)).map((f) => ` M ${f}`),
        ...deleted.map((f) => ` D ${f}`),
        ...untracked.map((f) => `?? ${f}`),
      ];
      return ok(lines.length ? `${lines.join("\n")}\n` : "");
    }

    const out: string[] = [branch ? `On branch ${branch}` : "HEAD detached"];
    if (!(await headOid())) out.push("", "No commits yet");

    const stagedAll = [...new Set([...staged, ...deletedStaged])];
    if (stagedAll.length) {
      out.push("", "Changes to be committed:", '  (use "git restore --staged <file>..." to unstage)');
      for (const f of stagedAll.sort()) {
        out.push(`\tnew file:   ${f}`.replace("new file", deletedStaged.includes(f) ? "deleted" : "new file"));
      }
    }
    const unstaged = [...new Set([...modified, ...modifiedAfterStage, ...deleted])].filter(
      (f) => !untracked.includes(f),
    );
    if (unstaged.length) {
      out.push("", "Changes not staged for commit:", '  (use "git add <file>..." to update what will be committed)');
      for (const f of unstaged.sort()) out.push(`\t${deleted.includes(f) ? "deleted" : "modified"}:   ${f}`);
    }
    if (untracked.length) {
      out.push("", "Untracked files:", '  (use "git add <file>..." to include in what will be committed)');
      for (const f of untracked.sort()) out.push(`\t${f}`);
    }
    if (!stagedAll.length && !unstaged.length && !untracked.length) {
      out.push("", "nothing to commit, working tree clean");
    }
    return ok(`${out.join("\n")}\n`);
  }

  async function add(paths: string[], cwd: string): Promise<ExecResult> {
    await requireRepo();
    if (!paths.length) return fail("Nothing specified, nothing added.\n");
    const matrix = await git.statusMatrix({ fs, dir });
    for (const raw of paths) {
      const rel = relToRepo(dir, cwd, raw);
      if (rel === "." || rel === "") {
        for (const [f, h, w] of matrix) {
          if (w === 0 && h === 1) await git.remove({ fs, dir, filepath: String(f) });
          else if (w !== 0) await git.add({ fs, dir, filepath: String(f) });
        }
        continue;
      }
      const under = matrix.filter(([f]) => String(f) === rel || String(f).startsWith(`${rel}/`));
      if (!under.length) return fail(`fatal: pathspec '${raw}' did not match any files\n`, 128);
      for (const [f, h, w] of under) {
        if (w === 0 && h === 1) await git.remove({ fs, dir, filepath: String(f) });
        else await git.add({ fs, dir, filepath: String(f) });
      }
    }
    return ok();
  }

  async function commit(args: string[]): Promise<ExecResult> {
    await requireRepo();
    const { flags, values } = splitFlags(args);
    const message = values.get("message");
    if (!message) {
      return fail("fatal: no commit message supplied (use -m \"message\")\n", 128);
    }
    const matrix = await git.statusMatrix({ fs, dir });
    const anyStaged = matrix.some(([, h, , s]) => s !== h);
    if (!anyStaged && !flags.has("--amend")) {
      const branch = await currentBranch();
      return fail(
        `On branch ${branch ?? "HEAD"}\nnothing to commit, working tree clean\n`,
        1,
      );
    }
    const timestamp = EPOCH + clock.commits * 60;
    clock.commits += 1;
    const oid = await git.commit({
      fs,
      dir,
      message,
      author: { ...author, timestamp, timezoneOffset: 0 },
      committer: { ...author, timestamp, timezoneOffset: 0 },
      amend: flags.has("--amend") || undefined,
    });
    const branch = await currentBranch();
    const count = matrix.filter(([, h, , s]) => s !== h).length;
    const root = (await git.log({ fs, dir, depth: 2 })).length === 1 ? " (root-commit)" : "";
    return ok(
      `[${branch ?? "detached HEAD"}${root} ${short(oid)}] ${message}\n` +
        ` ${count} file${count === 1 ? "" : "s"} changed\n`,
    );
  }

  async function log(args: string[]): Promise<ExecResult> {
    await requireRepo();
    const { flags, values } = splitFlags(args);
    const depth = Number(values.get("max-count") ?? args.find((a) => /^-\d+$/.test(a))?.slice(1)) || undefined;
    let commits;
    try {
      commits = await git.log({ fs, dir, depth });
    } catch {
      return fail("fatal: your current branch does not have any commits yet\n", 128);
    }
    const refs = await refsByOid();
    const oneline = flags.has("--oneline");
    const out: string[] = [];
    for (const c of commits) {
      const decoration = refs.get(c.oid)?.length ? ` (${refs.get(c.oid)!.join(", ")})` : "";
      if (oneline) {
        out.push(`${short(c.oid)}${decoration} ${c.commit.message.trim()}`);
      } else {
        out.push(`commit ${c.oid}${decoration}`);
        out.push(`Author: ${c.commit.author.name} <${c.commit.author.email}>`);
        out.push(`Date:   ${new Date(c.commit.author.timestamp * 1000).toUTCString()}`);
        out.push("", `    ${c.commit.message.trim()}`, "");
      }
    }
    return ok(out.length ? `${out.join("\n")}\n` : "");
  }

  async function refsByOid(): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    const push = (oid: string, label: string) => {
      const list = map.get(oid) ?? [];
      list.push(label);
      map.set(oid, list);
    };
    const branch = await currentBranch();
    for (const b of await git.listBranches({ fs, dir })) {
      try {
        const oid = await git.resolveRef({ fs, dir, ref: b });
        push(oid, b === branch ? `HEAD -> ${b}` : b);
      } catch {
        /* unborn branch */
      }
    }
    for (const t of await git.listTags({ fs, dir })) {
      try {
        push(await git.resolveRef({ fs, dir, ref: t }), `tag: ${t}`);
      } catch {
        /* dangling tag */
      }
    }
    return map;
  }

  async function branch(args: string[]): Promise<ExecResult> {
    await requireRepo();
    const { flags, rest } = splitFlags(args);
    if (flags.has("-d") || flags.has("-D")) {
      const name = rest[0];
      if (!name) return fail("fatal: branch name required\n", 128);
      if (name === (await currentBranch())) {
        return fail(`error: Cannot delete branch '${name}' checked out at '${dir}'\n`, 1);
      }
      await git.deleteBranch({ fs, dir, ref: name });
      return ok(`Deleted branch ${name}\n`);
    }
    if (rest.length) {
      const name = rest[0];
      if ((await git.listBranches({ fs, dir })).includes(name)) {
        return fail(`fatal: a branch named '${name}' already exists\n`, 128);
      }
      await git.branch({ fs, dir, ref: name });
      return ok();
    }
    const current = await currentBranch();
    const list = await git.listBranches({ fs, dir });
    return ok(list.map((b) => `${b === current ? "*" : " "} ${b}`).join("\n") + (list.length ? "\n" : ""));
  }

  async function checkout(args: string[], asSwitch: boolean): Promise<ExecResult> {
    await requireRepo();
    const { flags, rest } = splitFlags(args);
    const create = flags.has("-b") || flags.has("-c");
    const target = rest[0];
    if (!target) return fail("fatal: you must specify a branch name\n", 128);
    const existing = await git.listBranches({ fs, dir });
    if (create) {
      if (existing.includes(target)) {
        return fail(`fatal: a branch named '${target}' already exists\n`, 128);
      }
      await git.branch({ fs, dir, ref: target, checkout: true });
      return ok(`Switched to a new branch '${target}'\n`);
    }
    if (!existing.includes(target)) {
      return fail(
        asSwitch
          ? `fatal: invalid reference: ${target}\n`
          : `error: pathspec '${target}' did not match any file(s) known to git\n`,
        1,
      );
    }
    await git.checkout({ fs, dir, ref: target });
    return ok(`Switched to branch '${target}'\n`);
  }

  async function merge(args: string[]): Promise<ExecResult> {
    await requireRepo();
    const { rest } = splitFlags(args);
    const theirs = rest[0];
    if (!theirs) return fail("fatal: no merge target specified\n", 128);
    const ours = await currentBranch();
    if (!ours) return fail("fatal: cannot merge with a detached HEAD\n", 128);
    try {
      const result = await git.merge({
        fs,
        dir,
        ours,
        theirs,
        // Leave real `<<<<<<< HEAD` markers in the working tree rather than
        // aborting: the markers are what a learner meets in a real terminal,
        // and resolving them by hand is the lesson.
        abortOnConflict: false,
        author: { ...author, timestamp: EPOCH + clock.commits * 60, timezoneOffset: 0 },
        message: `Merge branch '${theirs}' into ${ours}`,
      });
      if (result.fastForward) return ok(`Updating ${theirs}\nFast-forward\n`);
      clock.commits += 1;
      return ok(`Merge made by the 'ort' strategy.\n`);
    } catch (e) {
      const err = e as { code?: string; data?: { filepaths?: string[] } };
      if (err.code === "MergeConflictError") {
        const files = err.data?.filepaths ?? [];
        return fail(
          [
            ...files.map((f) => `Auto-merging ${f}`),
            ...files.map((f) => `CONFLICT (content): Merge conflict in ${f}`),
            "Automatic merge failed; fix conflicts and then commit the result.",
            "",
          ].join("\n"),
          1,
        );
      }
      if (err.code === "MergeNotSupportedError") {
        return fail(
          "fatal: this merge needs a strategy the playground does not implement yet\n",
          128,
        );
      }
      throw e;
    }
  }

  async function diff(args: string[]): Promise<ExecResult> {
    await requireRepo();
    const { flags } = splitFlags(args);
    const staged = flags.has("--staged") || flags.has("--cached");
    const matrix = await git.statusMatrix({ fs, dir });
    const changed = staged
      ? matrix.filter(([, h, , s]) => s !== h)
      : matrix.filter(([, , w, s]) => w !== s);
    if (!changed.length) return ok();

    const out: string[] = [];
    for (const [file] of changed) {
      const path = String(file);
      const before = staged ? await blobAt("HEAD", path) : await stagedBlob(path);
      const after = staged ? await stagedBlob(path) : await worktreeBlob(path);
      out.push(`diff --git a/${path} b/${path}`);
      out.push(`--- a/${path}`, `+++ b/${path}`);
      out.push(...unifiedDiff(before, after));
    }
    return ok(`${out.join("\n")}\n`);
  }

  async function blobAt(ref: string, path: string): Promise<string> {
    try {
      const oid = await git.resolveRef({ fs, dir, ref });
      const { blob } = await git.readBlob({ fs, dir, oid, filepath: path });
      return new TextDecoder().decode(blob);
    } catch {
      return "";
    }
  }

  async function stagedBlob(path: string): Promise<string> {
    try {
      const [entry] = await git.statusMatrix({ fs, dir, filepaths: [path] });
      if (!entry || entry[3] === 0) return "";
      const oid = await git.hashBlob({ object: new TextEncoder().encode(await worktreeBlob(path)) });
      // Staged content equals the worktree unless the file changed after add.
      return entry[3] === 3 ? await blobAt("HEAD", path) : (oid ? await worktreeBlob(path) : "");
    } catch {
      return "";
    }
  }

  async function worktreeBlob(path: string): Promise<string> {
    try {
      const promises = (fs as never as { promises: { readFile: (p: string, e: string) => Promise<string> } }).promises;
      return await promises.readFile(`${dir}/${path}`, "utf8");
    } catch {
      return "";
    }
  }

  /** Minimal unified diff — enough to teach, not a Myers implementation. */
  function unifiedDiff(before: string, after: string): string[] {
    const a = before ? before.split("\n") : [];
    const b = after ? after.split("\n") : [];
    if (a[a.length - 1] === "") a.pop();
    if (b[b.length - 1] === "") b.pop();
    const out: string[] = [`@@ -1,${a.length} +1,${b.length} @@`];
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) {
      out.push(` ${a[i]}`);
      i += 1;
    }
    for (let k = i; k < a.length; k += 1) out.push(`-${a[k]}`);
    for (let k = i; k < b.length; k += 1) out.push(`+${b[k]}`);
    return out;
  }

  async function reset(args: string[], cwd: string): Promise<ExecResult> {
    await requireRepo();
    const { flags, rest } = splitFlags(args);
    if (flags.has("--hard")) {
      const ref = rest[0] ?? "HEAD";
      await git.checkout({ fs, dir, ref, force: true });
      const oid = await git.resolveRef({ fs, dir, ref });
      return ok(`HEAD is now at ${short(oid)}\n`);
    }
    if (rest.length) {
      for (const raw of rest) {
        await git.resetIndex({ fs, dir, filepath: relToRepo(dir, cwd, raw) });
      }
      return ok();
    }
    const matrix = await git.statusMatrix({ fs, dir });
    for (const [f, , , s] of matrix) {
      if (s !== 1) await git.resetIndex({ fs, dir, filepath: String(f) });
    }
    return ok();
  }

  async function catFile(args: string[]): Promise<ExecResult> {
    await requireRepo();
    const { rest } = splitFlags(args);
    const oid = rest[rest.length - 1];
    if (!oid) return fail("fatal: git cat-file: must specify an object\n", 128);
    try {
      const resolved = oid.length < 40 ? await git.expandOid({ fs, dir, oid }) : oid;
      const res = await git.readObject({ fs, dir, oid: resolved, format: "parsed" });
      if (res.type === "blob") {
        const obj = res.object as Uint8Array;
        return ok(new TextDecoder().decode(obj));
      }
      if (res.type === "tree") {
        const entries = res.object as Array<{ mode: string; type: string; oid: string; path: string }>;
        return ok(entries.map((e) => `${e.mode} ${e.type} ${e.oid}\t${e.path}`).join("\n") + "\n");
      }
      if (res.type === "commit") {
        const c = res.object as { tree: string; parent: string[]; message: string; author: { name: string; email: string; timestamp: number } };
        const lines = [`tree ${c.tree}`];
        for (const p of c.parent) lines.push(`parent ${p}`);
        lines.push(`author ${c.author.name} <${c.author.email}> ${c.author.timestamp} +0000`);
        lines.push("", c.message.trim());
        return ok(`${lines.join("\n")}\n`);
      }
      return ok(`${res.type}\n`);
    } catch {
      return fail(`fatal: Not a valid object name ${oid}\n`, 128);
    }
  }

  async function show(args: string[]): Promise<ExecResult> {
    await requireRepo();
    const { rest } = splitFlags(args);
    const ref = rest[0] ?? "HEAD";
    try {
      const oid = ref.length === 40 ? ref : await git.resolveRef({ fs, dir, ref }).catch(() => git.expandOid({ fs, dir, oid: ref }));
      const { commit: c } = await git.readCommit({ fs, dir, oid });
      return ok(
        [
          `commit ${oid}`,
          `Author: ${c.author.name} <${c.author.email}>`,
          `Date:   ${new Date(c.author.timestamp * 1000).toUTCString()}`,
          "",
          `    ${c.message.trim()}`,
          "",
        ].join("\n"),
      );
    } catch {
      return fail(`fatal: ambiguous argument '${ref}': unknown revision\n`, 128);
    }
  }

  async function tag(args: string[]): Promise<ExecResult> {
    await requireRepo();
    const { rest } = splitFlags(args);
    if (!rest.length) {
      const tags = await git.listTags({ fs, dir });
      return ok(tags.length ? `${tags.join("\n")}\n` : "");
    }
    await git.tag({ fs, dir, ref: rest[0] });
    return ok();
  }

  const HELP = `usage: git <command> [<args>]

These are the commands this playground supports:

   init       Create an empty Git repository
   status     Show the working tree status
   add        Add file contents to the index
   commit     Record changes to the repository
   log        Show commit logs
   diff       Show changes between commits, commit and working tree, etc
   branch     List, create, or delete branches
   checkout   Switch branches or restore working tree files
   switch     Switch branches
   merge      Join two or more development histories together
   reset      Reset current HEAD to the specified state
   restore    Restore working tree files
   rm         Remove files from the working tree and from the index
   show       Show a commit
   tag        Create or list tags
   cat-file   Provide contents or details of repository objects
`;

  return async (args: string[], ctx: { cwd?: string }): Promise<ExecResult> => {
    const cwd = ctx?.cwd ?? dir;
    const [sub, ...rest] = args;
    try {
      switch (sub) {
        case undefined:
        case "help":
        case "--help":
          return ok(HELP);
        case "--version":
        case "version":
          return ok("git version 2.43.0 (dataslope playground)\n");
        case "init": {
          if (await isRepo()) return ok(`Reinitialized existing Git repository in ${dir}/.git/\n`);
          await git.init({ fs, dir, defaultBranch: "main" });
          return ok(`Initialized empty Git repository in ${dir}/.git/\n`);
        }
        case "status":
          return await status(rest.includes("-s") || rest.includes("--short"));
        case "add":
          return await add(splitFlags(rest).rest, cwd);
        case "commit":
          return await commit(rest);
        case "log":
          return await log(rest);
        case "branch":
          return await branch(rest);
        case "checkout":
          return await checkout(rest, false);
        case "switch":
          return await checkout(rest, true);
        case "merge":
          return await merge(rest);
        case "diff":
          return await diff(rest);
        case "reset":
          return await reset(rest, cwd);
        case "restore": {
          const { flags, rest: paths } = splitFlags(rest);
          if (flags.has("--staged")) return await reset(paths, cwd);
          await requireRepo();
          for (const p of paths) {
            await git.checkout({ fs, dir, force: true, filepaths: [relToRepo(dir, cwd, p)] });
          }
          return ok();
        }
        case "rm": {
          await requireRepo();
          const { rest: paths } = splitFlags(rest);
          const promises = (fs as never as { promises: { unlink: (p: string) => Promise<void> } }).promises;
          for (const p of paths) {
            const rel = relToRepo(dir, cwd, p);
            await git.remove({ fs, dir, filepath: rel });
            await promises.unlink(`${dir}/${rel}`).catch(() => {});
          }
          return ok(paths.map((p) => `rm '${relToRepo(dir, cwd, p)}'`).join("\n") + (paths.length ? "\n" : ""));
        }
        case "show":
          return await show(rest);
        case "tag":
          return await tag(rest);
        case "cat-file":
          return await catFile(rest);
        case "remote":
          return ok();
        case "config":
          return ok();
        default:
          return fail(
            `git: '${sub}' is not a git command. See 'git help'.\n` +
              "\nThis playground supports a teaching subset. Run 'git help' for the list.\n",
            1,
          );
      }
    } catch (e) {
      const message = (e as Error).message ?? String(e);
      return fail(`fatal: ${message}\n`, 128);
    }
  };
}
