/**
 * `git` as a just-bash custom command, dispatching to isomorphic-git. We own
 * this layer, so error text is git's actual wording rather than
 * isomorphic-git's — the cost the design accepted in §2.3 is paid back here.
 *
 * Three rules, learned the hard way (the September 2026 audit, BG-02 to
 * BG-11):
 *
 * - **Read the index through its object ids.** The "old" side of an
 *   unstaged diff is the index entry's blob, never the working file, or the
 *   diff marks nothing. `stage` codes from `statusMatrix` say *whether* the
 *   index differs, not what it holds.
 * - **One revision resolver.** `HEAD`, `HEAD~2`, `main^`, `v1.0`, a short
 *   sha, `HEAD:README.md`: every command that takes a revision goes through
 *   `resolveRevision`, and resolves it *before* touching anything, so a
 *   failing `reset --hard HEAD~1` changes nothing rather than half of it.
 * - **An option is honoured or refused.** Every command declares the
 *   options it understands; anything else is `error: unknown option`, because
 *   a silently ignored `--stat` answers a question the reader did not ask.
 *
 * Commits use a seeded clock (not wall time) so a replayed command history
 * reproduces byte-identical object ids, which is what makes share links work
 * and lets lesson prose quote a real SHA.
 */

import git from "isomorphic-git";
import diff3Merge from "diff3";

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
const ZERO = "0000000000000000000000000000000000000000";

export interface GitCommandOptions {
  fs: unknown;
  dir: string;
  /** Mutable counter so replays are deterministic across a session. */
  clock: { commits: number };
  author?: { name: string; email: string };
}

type FsArg = Parameters<typeof git.log>[0]["fs"];
type WalkEntry = { type: () => Promise<string>; oid: () => Promise<string>; mode: () => Promise<number> };

const short = (oid: string) => oid.slice(0, 7);

/** A refusal that carries git's exit code and wording, thrown from deep
 *  inside a command and printed by `run`. */
class GitError extends Error {
  constructor(
    message: string,
    public exitCode = 128,
  ) {
    super(message);
  }
}

// ─── Options ──────────────────────────────────────────────────────────────

/**
 * What a command accepts, every spelling mapped to one name. `bool` options
 * stand alone; `valued` ones take the next word (or `--name=value`, or
 * `-mValue`). Clustered short flags (`-am`) are split, and a run of digits
 * (`-3`) becomes the `numeric` option when the command has one.
 */
interface OptSpec {
  bool?: Record<string, string>;
  valued?: Record<string, string>;
  numeric?: string;
  /** The usage line printed after an unknown option. */
  usage: string;
}

interface Parsed {
  flags: Set<string>;
  values: Map<string, string>;
  rest: string[];
  /** Index into `rest` of the first word after `--`, or `rest.length` when
   *  there was no `--`: everything from here on is a path, never a revision. */
  dashes: number;
}

function parseOpts(args: string[], spec: OptSpec): Parsed {
  const flags = new Set<string>();
  const values = new Map<string, string>();
  const rest: string[] = [];
  let dashes = -1;
  const bool = spec.bool ?? {};
  const valued = spec.valued ?? {};
  const unknown = (opt: string) =>
    new GitError(`error: unknown option '${opt}'\nusage: git ${spec.usage}`, 129);

  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === "--") {
      dashes = rest.length;
      rest.push(...args.slice(i + 1));
      break;
    }
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      const name = eq === -1 ? a : a.slice(0, eq);
      if (name in valued) {
        const value = eq === -1 ? args[++i] : a.slice(eq + 1);
        if (value === undefined) throw new GitError(`error: option '${name}' requires a value`, 129);
        values.set(valued[name], value);
      } else if (name in bool && eq === -1) {
        flags.add(bool[name]);
      } else {
        throw unknown(name);
      }
      continue;
    }
    if (a.startsWith("-") && a.length > 1) {
      if (spec.numeric && /^-\d+$/.test(a)) {
        values.set(spec.numeric, a.slice(1));
        continue;
      }
      // Short flags, possibly clustered: -am "msg" is -a then -m "msg".
      for (let k = 1; k < a.length; k += 1) {
        const opt = `-${a[k]}`;
        if (opt in valued) {
          const attached = a.slice(k + 1);
          const value = attached !== "" ? attached : args[++i];
          if (value === undefined) throw new GitError(`error: option '${opt}' requires a value`, 129);
          values.set(valued[opt], value);
          break;
        }
        if (opt in bool) flags.add(bool[opt]);
        else throw unknown(opt);
      }
      continue;
    }
    rest.push(a);
  }
  return { flags, values, rest, dashes: dashes === -1 ? rest.length : dashes };
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

// ─── Dates ────────────────────────────────────────────────────────────────

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Git's own date format: `Thu Jan 1 00:01:00 2026 +0000`. */
export function gitDate(timestamp: number, timezoneOffset = 0): string {
  const d = new Date((timestamp - timezoneOffset * 60) * 1000);
  const two = (n: number) => String(n).padStart(2, "0");
  const sign = timezoneOffset <= 0 ? "+" : "-";
  const abs = Math.abs(timezoneOffset);
  const tz = `${sign}${two(Math.floor(abs / 60))}${two(abs % 60)}`;
  return `${DAYS[d.getUTCDay()]} ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()} ${two(d.getUTCHours())}:${two(d.getUTCMinutes())}:${two(d.getUTCSeconds())} ${d.getUTCFullYear()} ${tz}`;
}

// ─── Line diffs ───────────────────────────────────────────────────────────

type Op = { kind: " " | "-" | "+"; text: string };

/** Marks the last line of a file that does not end in a newline, so it
 *  compares unequal to the same text with one and gets diff's note. */
const NO_NEWLINE = "\u0000";

/** Split into lines the way diff does: no trailing empty line for a file
 *  that ends in a newline, and a note when it does not. */
function lines(text: string): string[] {
  if (text === "") return [];
  const parts = text.split("\n");
  if (parts[parts.length - 1] === "") parts.pop();
  else parts[parts.length - 1] += NO_NEWLINE;
  return parts;
}

/**
 * A line diff by longest common subsequence, after trimming the common
 * prefix and suffix. Teaching repositories are small; a middle section past
 * the cap is shown as one replacement rather than computed quadratically.
 */
function lineDiff(a: string[], b: string[]): Op[] {
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start += 1;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA -= 1;
    endB -= 1;
  }
  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  const ops: Op[] = a.slice(0, start).map((text) => ({ kind: " ", text }));

  if (midA.length * midB.length > 4_000_000) {
    ops.push(...midA.map((text): Op => ({ kind: "-", text })), ...midB.map((text): Op => ({ kind: "+", text })));
  } else {
    const n = midA.length;
    const m = midB.length;
    const table: Uint32Array[] = [];
    for (let i = 0; i <= n; i += 1) table.push(new Uint32Array(m + 1));
    for (let i = n - 1; i >= 0; i -= 1) {
      for (let j = m - 1; j >= 0; j -= 1) {
        table[i][j] =
          midA[i] === midB[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (midA[i] === midB[j]) {
        ops.push({ kind: " ", text: midA[i] });
        i += 1;
        j += 1;
      } else if (table[i + 1][j] >= table[i][j + 1]) {
        ops.push({ kind: "-", text: midA[i] });
        i += 1;
      } else {
        ops.push({ kind: "+", text: midB[j] });
        j += 1;
      }
    }
    while (i < n) ops.push({ kind: "-", text: midA[i++] });
    while (j < m) ops.push({ kind: "+", text: midB[j++] });
  }
  ops.push(...a.slice(endA).map((text): Op => ({ kind: " ", text })));
  return ops;
}

const CONTEXT = 3;

/** Unified hunks with three lines of context, like `git diff`. */
export function unifiedDiff(before: string, after: string): string[] {
  const a = lines(before);
  const b = lines(after);
  const ops = lineDiff(a, b);
  if (!ops.some((o) => o.kind !== " ")) return [];

  // Mark where each op falls in both files, then group changes into hunks.
  let ia = 0;
  let ib = 0;
  const placed = ops.map((op) => {
    const at = { ...op, a: ia, b: ib };
    if (op.kind !== "+") ia += 1;
    if (op.kind !== "-") ib += 1;
    return at;
  });
  const changed = placed.map((o) => o.kind !== " ");

  const out: string[] = [];
  let i = 0;
  while (i < placed.length) {
    if (!changed[i]) {
      i += 1;
      continue;
    }
    const start = Math.max(0, i - CONTEXT);
    let end = i;
    let last = i;
    while (end < placed.length && end - last <= CONTEXT * 2) {
      if (changed[end]) last = end;
      end += 1;
    }
    end = Math.min(placed.length, last + CONTEXT + 1);
    const slice = placed.slice(start, end);
    const aCount = slice.filter((o) => o.kind !== "+").length;
    const bCount = slice.filter((o) => o.kind !== "-").length;
    const aStart = aCount ? slice[0].a + 1 : slice[0].a;
    const bStart = bCount ? slice[0].b + 1 : slice[0].b;
    const range = (s: number, c: number) => (c === 1 ? `${s}` : `${s},${c}`);
    out.push(`@@ -${range(aStart, aCount)} +${range(bStart, bCount)} @@`);
    for (const op of slice) {
      const noNewline = op.text.endsWith(NO_NEWLINE);
      out.push(`${op.kind}${noNewline ? op.text.slice(0, -1) : op.text}`);
      if (noNewline) out.push("\\ No newline at end of file");
    }
    i = end;
  }
  return out;
}

/** Insertions and deletions in a diff, for stat lines and commit summaries. */
function countChanges(before: string, after: string): { added: number; removed: number } {
  const ops = lineDiff(lines(before), lines(after));
  return {
    added: ops.filter((o) => o.kind === "+").length,
    removed: ops.filter((o) => o.kind === "-").length,
  };
}

// ─── The command ──────────────────────────────────────────────────────────

/** One changed path between two snapshots, with both contents. `null` on a
 *  side means the file did not exist there. */
interface Change {
  path: string;
  before: string | null;
  after: string | null;
  beforeOid: string;
  afterOid: string;
}

export function createGitCommand(opts: GitCommandOptions) {
  const { dir, clock } = opts;
  const fs = opts.fs as FsArg;
  const promises = (fs as never as {
    promises: {
      readFile: (p: string, e: string) => Promise<string>;
      unlink: (p: string) => Promise<void>;
      stat: (p: string) => Promise<unknown>;
    };
  }).promises;

  /** isomorphic-git never writes MERGE_HEAD, so a conflicted merge is tracked
   *  here. Without it the commit that resolves a conflict would have a single
   *  parent, and the history would claim a merge never happened. */
  let pendingMerge: { branch: string; oid: string } | null = null;
  /** For `git switch -`. */
  let previousBranch: string | null = null;
  /** `git config user.name` and friends, kept here before there is a
   *  repository to write them into. */
  const config = new Map<string, string>();

  const isRepo = async () => {
    try {
      await promises.stat(`${dir}/.git`);
      return true;
    } catch {
      return false;
    }
  };

  const requireRepo = async () => {
    if (!(await isRepo())) {
      throw new GitError("fatal: not a git repository (or any of the parent directories): .git");
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

  const author = async () => ({
    name: config.get("user.name") ?? opts.author?.name ?? AUTHOR.name,
    email: config.get("user.email") ?? opts.author?.email ?? AUTHOR.email,
  });

  // ─── Revisions ───

  /** An annotated tag points at a tag object; follow it to the commit. */
  async function peel(oid: string): Promise<string> {
    for (let hops = 0; hops < 8; hops += 1) {
      const obj = await git.readObject({ fs, dir, oid, format: "parsed" });
      if (obj.type !== "tag") return oid;
      oid = (obj.object as { object: string }).object;
    }
    return oid;
  }

  const unknownRevision = (rev: string) =>
    new GitError(
      `fatal: ambiguous argument '${rev}': unknown revision or path not in the working tree.\n` +
        "Use '--' to separate paths from revisions, like this:\n" +
        "'git <command> [<revision>...] -- [<file>...]'",
    );

  /**
   * Turn what the reader typed into a commit id: `HEAD`, `@`, a branch, a
   * tag, a full or abbreviated sha, with any number of `~n` / `^` / `^n`
   * suffixes walked through the parents. Throws git's "ambiguous argument"
   * when nothing matches, and never touches the repository.
   */
  async function resolveRevision(rev: string): Promise<string> {
    const m = /^(.*?)((?:[~^]\d*)*)$/.exec(rev);
    const base = m?.[1] ?? rev;
    const suffix = m?.[2] ?? "";
    if (!base) throw unknownRevision(rev);

    let oid: string | null = null;
    if (base === "HEAD" || base === "@") {
      oid = await headOid();
    } else if (base === "-") {
      oid = previousBranch ? await git.resolveRef({ fs, dir, ref: previousBranch }).catch(() => null) : null;
    } else {
      const branches = await git.listBranches({ fs, dir });
      const tags = await git.listTags({ fs, dir });
      if (branches.includes(base) || tags.includes(base)) {
        oid = await peel(await git.resolveRef({ fs, dir, ref: base }));
      } else if (/^[0-9a-f]{40}$/i.test(base)) {
        oid = await git
          .readObject({ fs, dir, oid: base.toLowerCase(), format: "content" })
          .then(() => base.toLowerCase(), () => null);
      } else if (/^[0-9a-f]{4,39}$/i.test(base)) {
        oid = await git.expandOid({ fs, dir, oid: base.toLowerCase() }).then(peel, () => null);
      }
    }
    if (!oid) throw unknownRevision(rev);

    for (const step of suffix.match(/[~^]\d*/g) ?? []) {
      const n = step.length > 1 ? Number(step.slice(1)) : 1;
      if (step[0] === "~") {
        for (let i = 0; i < n; i += 1) oid = await parentOf(oid, 1, rev);
      } else {
        oid = await parentOf(oid, n, rev);
      }
    }
    return oid;
  }

  async function parentOf(oid: string, n: number, rev: string): Promise<string> {
    const { commit } = await git.readCommit({ fs, dir, oid }).catch(() => {
      throw unknownRevision(rev);
    });
    if (n === 0) return oid;
    const parent = commit.parent[n - 1];
    if (!parent) throw unknownRevision(rev);
    return parent;
  }

  /** `rev:path` → the blob (or tree listing) at that path in that commit. */
  async function objectAtPath(rev: string, path: string): Promise<{ type: "blob" | "tree"; text: string }> {
    const oid = await resolveRevision(rev);
    try {
      const { blob } = await git.readBlob({ fs, dir, oid, filepath: path });
      return { type: "blob", text: new TextDecoder().decode(blob) };
    } catch {
      try {
        const { tree } = await git.readTree({ fs, dir, oid, filepath: path });
        return { type: "tree", text: tree.map((e) => `${e.mode} ${e.type} ${e.oid}\t${e.path}`).join("\n") + "\n" };
      } catch {
        throw new GitError(`fatal: path '${path}' does not exist in '${rev}'`);
      }
    }
  }

  // ─── Reading trees, the index, and the working tree ───

  async function blobText(oid: string): Promise<string> {
    const { blob } = await git.readBlob({ fs, dir, oid });
    return new TextDecoder().decode(blob);
  }

  async function worktreeText(path: string): Promise<string | null> {
    try {
      return await promises.readFile(`${dir}/${path}`, "utf8");
    } catch {
      return null;
    }
  }

  /** Every blob in a commit's tree, path → oid. */
  async function treeEntries(oid: string): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    await git.walk({
      fs,
      dir,
      trees: [git.TREE({ ref: oid })],
      map: async (filepath: string, [entry]: Array<WalkEntry | null>) => {
        if (entry && (await entry.type()) === "blob") map.set(filepath, await entry.oid());
        return undefined;
      },
    });
    return map;
  }

  /** Every entry in the index, path → oid. The staged content, by id. */
  async function indexEntries(): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    await git.walk({
      fs,
      dir,
      trees: [git.STAGE()],
      map: async (filepath: string, [entry]: Array<WalkEntry | null>) => {
        if (entry && (await entry.type()) === "blob") map.set(filepath, await entry.oid());
        return undefined;
      },
    });
    return map;
  }

  const hashText = async (text: string) =>
    git.hashBlob({ object: new TextEncoder().encode(text) }).then((r) => r.oid);

  /** Changes between two path → oid maps, reading content for the ones that differ. */
  async function changesBetween(
    before: Map<string, string>,
    after: Map<string, string>,
    only?: string[],
  ): Promise<Change[]> {
    const paths = [...new Set([...before.keys(), ...after.keys()])].sort();
    const out: Change[] = [];
    for (const path of paths) {
      if (only?.length && !only.some((p) => path === p || path.startsWith(`${p}/`))) continue;
      const b = before.get(path);
      const a = after.get(path);
      if (b === a) continue;
      out.push({
        path,
        before: b ? await blobText(b) : null,
        after: a ? await blobText(a) : null,
        beforeOid: b ?? ZERO,
        afterOid: a ?? ZERO,
      });
    }
    return out;
  }

  /** Working tree against the index: what `git add` would pick up. */
  async function worktreeVsIndex(only?: string[]): Promise<Change[]> {
    const index = await indexEntries();
    const matrix = await git.statusMatrix({ fs, dir });
    const out: Change[] = [];
    for (const [file, head, workdir, stage] of matrix) {
      const path = String(file);
      if (only?.length && !only.some((p) => path === p || path.startsWith(`${p}/`))) continue;
      if (stage === 0 && head === 0) continue; // untracked
      if (workdir === stage) continue;
      if (stage === 0 && workdir === 0) continue; // deleted and staged as such
      const beforeOid = index.get(path);
      const before = beforeOid ? await blobText(beforeOid) : null;
      const after = workdir === 0 ? null : await worktreeText(path);
      if (before === after) continue;
      out.push({
        path,
        before,
        after,
        beforeOid: beforeOid ?? ZERO,
        afterOid: after === null ? ZERO : await hashText(after),
      });
    }
    return out;
  }

  /** Working tree against a commit, tracked paths only. */
  async function worktreeVsCommit(oid: string, only?: string[]): Promise<Change[]> {
    const tree = await treeEntries(oid);
    const index = await indexEntries();
    const paths = [...new Set([...tree.keys(), ...index.keys()])].sort();
    const out: Change[] = [];
    for (const path of paths) {
      if (only?.length && !only.some((p) => path === p || path.startsWith(`${p}/`))) continue;
      const beforeOid = tree.get(path);
      const before = beforeOid ? await blobText(beforeOid) : null;
      const after = await worktreeText(path);
      if (before === after) continue;
      out.push({
        path,
        before,
        after,
        beforeOid: beforeOid ?? ZERO,
        afterOid: after === null ? ZERO : await hashText(after),
      });
    }
    return out;
  }

  /** A commit against its first parent (or against nothing, for a root). */
  async function commitChanges(oid: string, only?: string[]): Promise<Change[]> {
    const { commit } = await git.readCommit({ fs, dir, oid });
    const before = commit.parent[0] ? await treeEntries(commit.parent[0]) : new Map<string, string>();
    return changesBetween(before, await treeEntries(oid), only);
  }

  // ─── Rendering diffs ───

  function patch(changes: Change[]): string[] {
    const out: string[] = [];
    for (const c of changes) {
      out.push(`diff --git a/${c.path} b/${c.path}`);
      if (c.before === null) {
        out.push("new file mode 100644", `index ${ZERO.slice(0, 7)}..${short(c.afterOid)}`);
      } else if (c.after === null) {
        out.push("deleted file mode 100644", `index ${short(c.beforeOid)}..${ZERO.slice(0, 7)}`);
      } else {
        out.push(`index ${short(c.beforeOid)}..${short(c.afterOid)} 100644`);
      }
      out.push(c.before === null ? "--- /dev/null" : `--- a/${c.path}`);
      out.push(c.after === null ? "+++ /dev/null" : `+++ b/${c.path}`);
      out.push(...unifiedDiff(c.before ?? "", c.after ?? ""));
    }
    return out;
  }

  function summary(changes: Change[]): string {
    let added = 0;
    let removed = 0;
    for (const c of changes) {
      const n = countChanges(c.before ?? "", c.after ?? "");
      added += n.added;
      removed += n.removed;
    }
    const parts = [`${changes.length} file${changes.length === 1 ? "" : "s"} changed`];
    if (added) parts.push(`${added} insertion${added === 1 ? "" : "s"}(+)`);
    if (removed) parts.push(`${removed} deletion${removed === 1 ? "" : "s"}(-)`);
    return ` ${parts.join(", ")}`;
  }

  function stat(changes: Change[]): string[] {
    if (!changes.length) return [];
    const width = Math.max(...changes.map((c) => c.path.length));
    const counts = changes.map((c) => countChanges(c.before ?? "", c.after ?? ""));
    const digits = Math.max(...counts.map((n) => String(n.added + n.removed).length));
    const out = changes.map((c, i) => {
      const n = counts[i];
      const bar = "+".repeat(Math.min(n.added, 40)) + "-".repeat(Math.min(n.removed, 40));
      return ` ${c.path.padEnd(width)} | ${String(n.added + n.removed).padStart(digits)} ${bar}`;
    });
    out.push(summary(changes));
    return out;
  }

  function nameStatus(changes: Change[]): string[] {
    return changes.map((c) => `${c.before === null ? "A" : c.after === null ? "D" : "M"}\t${c.path}`);
  }

  // ─── Refs and decorations ───

  async function refsByOid(): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    const push = (oid: string, label: string) => {
      const list = map.get(oid) ?? [];
      list.push(label);
      map.set(oid, list);
    };
    const branch = await currentBranch();
    const head = await headOid();
    if (head && branch === null) push(head, "HEAD");
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
        push(await peel(await git.resolveRef({ fs, dir, ref: t })), `tag: ${t}`);
      } catch {
        /* dangling tag */
      }
    }
    return map;
  }

  const decorationOf = (refs: Map<string, string[]>, oid: string) =>
    refs.get(oid)?.length ? ` (${refs.get(oid)!.join(", ")})` : "";

  async function subjectOf(oid: string): Promise<string> {
    try {
      return (await git.readCommit({ fs, dir, oid })).commit.message.trim().split("\n")[0];
    } catch {
      return "";
    }
  }

  /** Every commit reachable from `oid`, newest first by the seeded clock. */
  async function reachable(oid: string, limit = 500): Promise<Map<string, Awaited<ReturnType<typeof git.log>>[number]>> {
    const seen = new Map<string, Awaited<ReturnType<typeof git.log>>[number]>();
    for (const c of await git.log({ fs, dir, ref: oid, depth: limit })) seen.set(c.oid, c);
    return seen;
  }

  // ─── status ───

  type Row = { path: string; x: string; y: string; untracked: boolean; conflict: boolean };

  /** Classify every path from the (HEAD, index, worktree) triple, the way
   *  `git status --short` does: X is the index against HEAD, Y the working
   *  tree against the index. */
  async function classify(): Promise<Row[]> {
    const matrix = await git.statusMatrix({ fs, dir });
    const rows: Row[] = [];
    for (const [file, h, w, s] of matrix) {
      const path = String(file);
      const conflict = pendingMerge !== null && s !== h && w !== s && s !== 0;
      if (conflict) {
        rows.push({ path, x: "U", y: "U", untracked: false, conflict: true });
        continue;
      }
      if (h === 0 && s === 0) {
        if (w !== 0) rows.push({ path, x: "?", y: "?", untracked: true, conflict: false });
        continue;
      }
      let x = " ";
      if (s === 0 && h === 1) x = "D";
      else if (s !== h && s !== 0) x = h === 0 ? "A" : "M";
      let y = " ";
      if (s === 0) {
        // Deleted from the index: whatever is on disk is untracked again.
        if (w !== 0) rows.push({ path, x: "?", y: "?", untracked: true, conflict: false });
      } else if (w === 0) y = "D";
      else if (w !== s) y = "M";
      if (x !== " " || y !== " ") rows.push({ path, x, y, untracked: false, conflict: false });
    }
    return rows.sort((a, b) => (a.path < b.path ? -1 : 1));
  }

  async function status(short_: boolean): Promise<ExecResult> {
    await requireRepo();
    const branch = await currentBranch();
    const rows = await classify();

    if (short_) {
      const lines = [
        ...rows.filter((r) => !r.untracked).map((r) => `${r.x}${r.y} ${r.path}`),
        ...rows.filter((r) => r.untracked).map((r) => `?? ${r.path}`),
      ];
      return ok(lines.length ? `${lines.join("\n")}\n` : "");
    }

    const head = await headOid();
    const out: string[] = [
      branch ? `On branch ${branch}` : `HEAD detached at ${head ? short(head) : "?"}`,
    ];
    const unmerged = rows.filter((r) => r.conflict);
    if (pendingMerge) {
      if (unmerged.length) {
        out.push(
          "You have unmerged paths.",
          '  (fix conflicts and run "git commit")',
          '  (use "git merge --abort" to abort the merge)',
        );
      } else {
        out.push("All conflicts fixed but you are still merging.", '  (use "git commit" to conclude merge)');
      }
    }
    if (!head) out.push("", "No commits yet");

    const word = (code: string) =>
      code === "A" ? "new file:   " : code === "D" ? "deleted:    " : "modified:   ";
    const staged = rows.filter((r) => !r.untracked && !r.conflict && r.x !== " ");
    if (staged.length) {
      out.push("", "Changes to be committed:", head ? '  (use "git restore --staged <file>..." to unstage)' : '  (use "git rm --cached <file>..." to unstage)');
      for (const r of staged) out.push(`\t${word(r.x)}${r.path}`);
    }
    if (unmerged.length) {
      out.push("", "Unmerged paths:", '  (use "git add <file>..." to mark resolution)');
      for (const r of unmerged) out.push(`\tboth modified:   ${r.path}`);
    }
    const unstaged = rows.filter((r) => !r.untracked && !r.conflict && r.y !== " ");
    if (unstaged.length) {
      out.push(
        "",
        "Changes not staged for commit:",
        '  (use "git add <file>..." to update what will be committed)',
        '  (use "git restore <file>..." to discard changes in working directory)',
      );
      for (const r of unstaged) out.push(`\t${word(r.y)}${r.path}`);
    }
    const untracked = rows.filter((r) => r.untracked);
    if (untracked.length) {
      out.push("", "Untracked files:", '  (use "git add <file>..." to include in what will be committed)');
      for (const r of untracked) out.push(`\t${r.path}`);
    }
    if (!rows.length) {
      out.push("", pendingMerge ? "nothing to commit (use \"git commit\" to conclude merge)" : "nothing to commit, working tree clean");
    } else if (!staged.length && !unmerged.length) {
      out.push(
        "",
        unstaged.length
          ? 'no changes added to commit (use "git add" and/or "git commit -a")'
          : 'nothing added to commit but untracked files present (use "git add" to track)',
      );
    }
    return ok(`${out.join("\n")}\n`);
  }

  // ─── add / rm / restore ───

  async function stagePath(path: string, head: number, workdir: number) {
    if (workdir === 0 && head === 1) await git.remove({ fs, dir, filepath: path });
    else if (workdir !== 0) await git.add({ fs, dir, filepath: path });
  }

  async function add(args: string[], cwd: string): Promise<ExecResult> {
    await requireRepo();
    const { flags, rest } = parseOpts(args, {
      bool: { "-A": "all", "--all": "all", "-u": "update", "--update": "update", "-f": "force", "--force": "force", "-v": "verbose", "--verbose": "verbose" },
      usage: "add [-A | -u] [-f] [--] <pathspec>...",
    });
    const paths = flags.has("all") || flags.has("update") ? ["."] : rest;
    if (!paths.length) return fail("Nothing specified, nothing added.\nhint: Maybe you wanted to say 'git add .'?\n");
    const matrix = await git.statusMatrix({ fs, dir });
    for (const raw of paths) {
      const rel = relToRepo(dir, cwd, raw);
      if (rel === "." || rel === "") {
        for (const [f, h, w] of matrix) {
          if (flags.has("update") && h === 0) continue;
          await stagePath(String(f), h, w);
        }
        continue;
      }
      const under = matrix.filter(([f]) => String(f) === rel || String(f).startsWith(`${rel}/`));
      if (!under.length) return fail(`fatal: pathspec '${raw}' did not match any files\n`, 128);
      for (const [f, h, w] of under) await stagePath(String(f), h, w);
    }
    return ok();
  }

  async function rm(args: string[], cwd: string): Promise<ExecResult> {
    await requireRepo();
    const { flags, rest } = parseOpts(args, {
      bool: { "--cached": "cached", "-r": "recursive", "-f": "force", "--force": "force", "-q": "quiet", "--quiet": "quiet" },
      usage: "rm [-r] [-f] [--cached] [--] <file>...",
    });
    if (!rest.length) return fail("fatal: No pathspec was given. Which files should I remove?\n", 128);
    const matrix = await git.statusMatrix({ fs, dir });
    const out: string[] = [];
    for (const p of rest) {
      const rel = relToRepo(dir, cwd, p);
      const under = matrix.filter(([f, , , s]) => s !== 0 && (String(f) === rel || String(f).startsWith(`${rel}/`)));
      if (!under.length) return fail(`fatal: pathspec '${p}' did not match any files\n`, 128);
      if (under.length > 1 && !flags.has("recursive")) {
        return fail(`fatal: not removing '${p}' recursively without -r\n`, 128);
      }
      for (const [f, , w, s] of under) {
        const path = String(f);
        if (!flags.has("force") && !flags.has("cached") && w === 2 && s !== 2) {
          return fail(`error: the following file has local modifications:\n    ${path}\n(use --cached to keep the file, or -f to force removal)\n`, 1);
        }
        await git.remove({ fs, dir, filepath: path });
        if (!flags.has("cached")) await promises.unlink(`${dir}/${path}`).catch(() => {});
        if (!flags.has("quiet")) out.push(`rm '${path}'`);
      }
    }
    return ok(out.length ? `${out.join("\n")}\n` : "");
  }

  async function restore(args: string[], cwd: string): Promise<ExecResult> {
    await requireRepo();
    const { flags, values, rest } = parseOpts(args, {
      bool: { "--staged": "staged", "-S": "staged", "--worktree": "worktree", "-W": "worktree" },
      valued: { "--source": "source", "-s": "source" },
      usage: "restore [--source=<tree>] [--staged] [--worktree] [--] <pathspec>...",
    });
    if (!rest.length) return fail("fatal: you must specify path(s) to restore\n", 128);
    const source = values.has("source") ? await resolveRevision(values.get("source")!) : null;
    const staged = flags.has("staged");
    const worktree = flags.has("worktree") || !staged;
    const matrix = await git.statusMatrix({ fs, dir });
    for (const raw of rest) {
      const rel = relToRepo(dir, cwd, raw);
      const under = matrix.filter(([f]) => String(f) === rel || String(f).startsWith(`${rel}/`));
      if (!under.length) return fail(`error: pathspec '${raw}' did not match any file(s) known to git\n`, 1);
      for (const [f, h, , s] of under) {
        const path = String(f);
        if (staged) {
          await git.resetIndex({ fs, dir, filepath: path, ...(source ? { ref: source } : {}) });
        }
        if (worktree) {
          if (h === 0 && s === 0 && !source) continue; // untracked: nothing to restore from
          await git.checkout({ fs, dir, ref: source ?? undefined, force: true, filepaths: [path], noUpdateHead: true });
          if (!source && !staged) {
            // `checkout` restores from a commit; the working tree is meant to
            // come from the index, which may hold a newer staged version.
            const index = await indexEntries();
            const oid = index.get(path);
            if (oid) {
              const store = (fs as never as { promises: { writeFile: (p: string, d: string) => Promise<void> } }).promises;
              await store.writeFile(`${dir}/${path}`, await blobText(oid));
            }
          }
        }
      }
    }
    return ok();
  }

  // ─── commit ───

  async function commit(args: string[]): Promise<ExecResult> {
    await requireRepo();
    const { flags, values } = parseOpts(args, {
      bool: { "-a": "all", "--all": "all", "--amend": "amend", "--allow-empty": "allow-empty", "-q": "quiet", "--quiet": "quiet", "--no-edit": "no-edit", "-v": "verbose", "--verbose": "verbose" },
      valued: { "-m": "message", "--message": "message" },
      usage: 'commit [-a] [--amend] [--allow-empty] -m "<message>"',
    });
    const message = values.get("message");
    if (!message && !(flags.has("amend") && flags.has("no-edit"))) {
      return fail("fatal: no commit message supplied (use -m \"message\")\n", 128);
    }
    if (flags.has("all")) {
      // Stage every tracked change first; untracked files stay put.
      for (const [f, h, w, s] of await git.statusMatrix({ fs, dir })) {
        if (h === 0 && s === 0) continue;
        if (w === 0) await git.remove({ fs, dir, filepath: String(f) });
        else if (w === 2 || s === 3) await git.add({ fs, dir, filepath: String(f) });
      }
    }
    const rows = await classify();
    if (rows.some((r) => r.conflict)) {
      return fail(
        "error: Committing is not possible because you have unmerged files.\nhint: Fix them up in the work tree, and then use 'git add/rm <file>'\nhint: as appropriate to mark resolution and make a commit.\nfatal: Exiting because of an unresolved conflict.\n",
        128,
      );
    }
    const staged = rows.filter((r) => !r.untracked && r.x !== " ");
    if (!staged.length && !flags.has("amend") && !flags.has("allow-empty")) {
      const branch = await currentBranch();
      const unstaged = rows.filter((r) => !r.untracked && r.y !== " ");
      const untracked = rows.filter((r) => r.untracked);
      const lines = [branch ? `On branch ${branch}` : "HEAD detached"];
      if (unstaged.length) {
        lines.push("Changes not staged for commit:");
        for (const r of unstaged) lines.push(`\t${r.y === "D" ? "deleted:    " : "modified:   "}${r.path}`);
        lines.push("");
      }
      if (untracked.length) {
        lines.push("Untracked files:");
        for (const r of untracked) lines.push(`\t${r.path}`);
        lines.push("");
      }
      lines.push(
        unstaged.length
          ? 'no changes added to commit (use "git add" and/or "git commit -a")'
          : untracked.length
            ? 'nothing added to commit but untracked files present (use "git add" to track)'
            : "nothing to commit, working tree clean",
      );
      return fail(`${lines.join("\n")}\n`, 1);
    }

    const head = await headOid();
    const before = head ? await treeEntries(flags.has("amend") ? (await parentOf(head, 1, "HEAD").catch(() => ZERO)) : head).catch(() => new Map<string, string>()) : new Map<string, string>();
    const timestamp = EPOCH + clock.commits * 60;
    clock.commits += 1;
    const who = await author();
    const parents = pendingMerge && head ? [head, pendingMerge.oid] : undefined;
    const oid = await git.commit({
      fs,
      dir,
      message: message ?? (head ? (await git.readCommit({ fs, dir, oid: head })).commit.message : ""),
      author: { ...who, timestamp, timezoneOffset: 0 },
      committer: { ...who, timestamp, timezoneOffset: 0 },
      amend: flags.has("amend") || undefined,
      ...(parents ? { parent: parents } : {}),
    });
    const wasMerge = pendingMerge !== null;
    pendingMerge = null;
    const branch = await currentBranch();
    const changes = await changesBetween(before instanceof Map ? before : new Map(), await treeEntries(oid));
    const root = !head || (flags.has("amend") && (await git.readCommit({ fs, dir, oid })).commit.parent.length === 0);
    const subject = (message ?? "").trim().split("\n")[0];
    const out = [`[${branch ?? "detached HEAD"}${root ? " (root-commit)" : ""} ${short(oid)}] ${subject}`];
    if (changes.length || !wasMerge) out.push(summary(changes));
    for (const c of changes) {
      if (c.before === null) out.push(` create mode 100644 ${c.path}`);
      else if (c.after === null) out.push(` delete mode 100644 ${c.path}`);
    }
    return ok(`${out.join("\n")}\n`);
  }

  // ─── log ───

  const LOG_OPTS: OptSpec = {
    bool: {
      "--oneline": "oneline", "--all": "all", "-p": "patch", "--patch": "patch", "-u": "patch", "--stat": "stat",
      "--graph": "graph", "--decorate": "decorate", "--no-decorate": "no-decorate", "--reverse": "reverse",
      "--no-merges": "no-merges", "--merges": "merges", "--name-only": "name-only", "--name-status": "name-status",
      "--abbrev-commit": "abbrev", "--first-parent": "first-parent",
    },
    valued: { "-n": "max-count", "--max-count": "max-count", "--format": "format", "--pretty": "format", "--author": "author", "--grep": "grep", "--since": "since", "--after": "since", "--until": "until", "--before": "until" },
    numeric: "max-count",
    usage: "log [--oneline] [--all] [--graph] [-p] [--stat] [-n <number>] [--format=<format>] [<revision-range>] [[--] <path>...]",
  };

  type LogCommit = Awaited<ReturnType<typeof git.log>>[number];

  /** Split log's free arguments into revisions (or a range) and paths. */
  async function revsAndPaths(rest: string[], dashes: number, cwd: string): Promise<{ revs: string[]; exclude: string[]; paths: string[] }> {
    const revs: string[] = [];
    const exclude: string[] = [];
    const paths: string[] = [];
    const tracked = await git.statusMatrix({ fs, dir }).then((m) => m.map(([f]) => String(f)));
    for (const [i, a] of rest.entries()) {
      if (i >= dashes) {
        paths.push(relToRepo(dir, cwd, a));
        continue;
      }
      const range = /^(.*?)\.\.\.?(.*)$/.exec(a);
      if (range) {
        const [, from, to] = range;
        if (from) exclude.push(from);
        revs.push(to || "HEAD");
        continue;
      }
      const rel = relToRepo(dir, cwd, a);
      const isPath = tracked.some((f) => f === rel || f.startsWith(`${rel}/`));
      const isRev = await resolveRevision(a).then(() => true, () => false);
      if (isRev && !isPath) revs.push(a);
      else if (isPath) paths.push(rel);
      else throw unknownRevision(a);
    }
    return { revs, exclude, paths };
  }

  async function touches(c: LogCommit, paths: string[]): Promise<boolean> {
    const parent = c.commit.parent[0];
    for (const p of paths) {
      const now = await git.readBlob({ fs, dir, oid: c.oid, filepath: p }).then((r) => r.oid, () => null);
      const was = parent ? await git.readBlob({ fs, dir, oid: parent, filepath: p }).then((r) => r.oid, () => null) : null;
      if (now !== was) return true;
      // A directory: compare the subtree ids.
      const nowTree = await git.readTree({ fs, dir, oid: c.oid, filepath: p }).then((r) => r.oid, () => null);
      const wasTree = parent ? await git.readTree({ fs, dir, oid: parent, filepath: p }).then((r) => r.oid, () => null) : null;
      if (nowTree !== wasTree) return true;
    }
    return false;
  }

  /** Print one commit in a `--format` string: the placeholders a lesson
   *  is likely to meet. */
  function formatCommit(format: string, c: LogCommit, decoration: string): string {
    const a = c.commit.author;
    const k = c.commit.committer;
    return format.replace(/%([HhTtPpanaeadaDcncecdsbBdn%])/g, (m, code: string) => {
      switch (code) {
        case "H": return c.oid;
        case "h": return short(c.oid);
        case "T": return c.commit.tree;
        case "t": return short(c.commit.tree);
        case "P": return c.commit.parent.join(" ");
        case "p": return c.commit.parent.map(short).join(" ");
        case "s": return c.commit.message.trim().split("\n")[0];
        case "b": return c.commit.message.trim().split("\n").slice(2).join("\n");
        case "B": return c.commit.message.trim();
        case "d": return decoration;
        case "D": return decoration.replace(/^ \(|\)$/g, "");
        case "n": return "\n";
        case "%": return "%";
        default: return m;
      }
    }).replace(/%(an|ae|ad|ar|cn|ce|cd|cr)/g, (m, code: string) => {
      switch (code) {
        case "an": return a.name;
        case "ae": return a.email;
        case "ad": return gitDate(a.timestamp, a.timezoneOffset);
        case "cn": return k.name;
        case "ce": return k.email;
        case "cd": return gitDate(k.timestamp, k.timezoneOffset);
        case "ar":
        case "cr": return "some time ago";
        default: return m;
      }
    });
  }

  const NAMED_FORMATS: Record<string, string> = {
    oneline: "%H%d %s",
    short: "commit %H%d%nAuthor: %an <%ae>%n%n    %s%n",
    medium: "commit %H%d%nAuthor: %an <%ae>%nDate:   %ad%n%n    %B%n",
    full: "commit %H%d%nAuthor: %an <%ae>%nCommit: %cn <%ce>%n%n    %B%n",
    reference: "%h (%s)",
  };

  /**
   * `--graph` for the shapes a lesson draws: lanes are assigned newest-first,
   * a merge opens a lane for its second parent, and a lane closes when its
   * commit is reached by another. Enough for a branch that diverges and
   * comes back; the History panel draws the general case.
   */
  function graphLines(commits: LogCommit[], render: (c: LogCommit) => string[]): string[] {
    const out: string[] = [];
    const lanes: (string | null)[] = [];
    const laneOf = (oid: string) => lanes.indexOf(oid);
    const trimmed = () => {
      while (lanes.length && lanes[lanes.length - 1] === null) lanes.pop();
      return lanes;
    };
    const bars = (except?: number) => trimmed().map((l, i) => (l === null ? " " : i === except ? "*" : "|")).join(" ");
    for (const c of commits) {
      let lane = laneOf(c.oid);
      if (lane === -1) {
        lane = lanes.indexOf(null);
        if (lane === -1) lane = lanes.length;
        lanes[lane] = c.oid;
      }
      const body = render(c);
      out.push(`${bars(lane)}${body[0] ? ` ${body[0]}` : ""}`.trimEnd());
      for (const line of body.slice(1)) out.push(`${bars()}${line ? ` ${line}` : ""}`.trimEnd());
      const [first, ...others] = c.commit.parent;
      lanes[lane] = first ?? null;
      for (const p of others) {
        if (lanes.includes(p)) continue;
        let free = lanes.indexOf(null, lane + 1);
        if (free === -1) free = lanes.length;
        lanes[free] = p;
        out.push(trimmed().map((l, i) => (i === lane ? "|" : i === free ? "\\" : l === null ? " " : "|")).join(" ").replace(/\| \\/, "|\\"));
      }
      // Two lanes waiting on the same commit: the later one folds into the earlier.
      for (let i = trimmed().length - 1; i > 0; i -= 1) {
        const target = lanes[i];
        if (target && lanes.indexOf(target) < i) {
          lanes[i] = null;
          out.push(trimmed().map((l, j) => (j === i - 1 ? "|/" : l === null ? " " : "|")).join(" ").replace(/\|\/ *$/, "|/"));
        }
      }
    }
    return out;
  }

  async function log(args: string[], cwd: string): Promise<ExecResult> {
    await requireRepo();
    const { flags, values, rest, dashes } = parseOpts(args, LOG_OPTS);
    const { revs, exclude, paths } = await revsAndPaths(rest, dashes, cwd);
    if (!(await headOid()) && !revs.length && !flags.has("all")) {
      return fail(`fatal: your current branch '${(await currentBranch()) ?? "main"}' does not have any commits yet\n`, 128);
    }

    const starts: string[] = [];
    if (flags.has("all")) {
      for (const b of await git.listBranches({ fs, dir })) starts.push(await git.resolveRef({ fs, dir, ref: b }).catch(() => ""));
      for (const t of await git.listTags({ fs, dir })) starts.push(await resolveRevision(t).catch(() => ""));
      const head = await headOid();
      if (head) starts.push(head);
    }
    for (const r of revs) starts.push(await resolveRevision(r));
    if (!starts.length) starts.push((await headOid())!);

    const seen = new Map<string, LogCommit>();
    for (const s of starts.filter(Boolean)) for (const [oid, c] of await reachable(s)) if (!seen.has(oid)) seen.set(oid, c);
    for (const x of exclude) for (const oid of (await reachable(await resolveRevision(x))).keys()) seen.delete(oid);

    let commits = [...seen.values()].sort(
      (a, b) => b.commit.committer.timestamp - a.commit.committer.timestamp || (a.oid < b.oid ? 1 : -1),
    );
    if (flags.has("no-merges")) commits = commits.filter((c) => c.commit.parent.length < 2);
    if (flags.has("merges")) commits = commits.filter((c) => c.commit.parent.length > 1);
    if (values.has("author")) commits = commits.filter((c) => `${c.commit.author.name} <${c.commit.author.email}>`.includes(values.get("author")!));
    if (values.has("grep")) commits = commits.filter((c) => c.commit.message.includes(values.get("grep")!));
    if (paths.length) {
      const kept: LogCommit[] = [];
      for (const c of commits) if (await touches(c, paths)) kept.push(c);
      commits = kept;
    }
    const max = Number(values.get("max-count"));
    if (Number.isFinite(max) && max >= 0) commits = commits.slice(0, max);
    if (flags.has("reverse")) commits.reverse();

    const refs = await refsByOid();
    const decorate = !flags.has("no-decorate");
    let format = values.get("format");
    if (format && format.startsWith("format:")) format = format.slice(7);
    else if (format && format.startsWith("tformat:")) format = format.slice(8);
    else if (format && NAMED_FORMATS[format]) format = NAMED_FORMATS[format];
    if (flags.has("oneline")) format = "%h%d %s";
    if (format?.startsWith("%H%d %s")) format = format.replace(/^%H/, flags.has("abbrev") || flags.has("oneline") ? "%h" : "%H");

    const render = async (c: LogCommit): Promise<string[]> => {
      const decoration = decorate ? decorationOf(refs, c.oid) : "";
      const head = format
        ? formatCommit(format, c, decoration).split("\n")
        : [
            `commit ${c.oid}${decoration}`,
            ...(c.commit.parent.length > 1 ? [`Merge: ${c.commit.parent.map(short).join(" ")}`] : []),
            `Author: ${c.commit.author.name} <${c.commit.author.email}>`,
            `Date:   ${gitDate(c.commit.author.timestamp, c.commit.author.timezoneOffset)}`,
            "",
            ...c.commit.message.trim().split("\n").map((l) => `    ${l}`),
            "",
          ];
      const wantsBody = flags.has("patch") || flags.has("stat") || flags.has("name-only") || flags.has("name-status");
      if (!wantsBody) return head;
      const changes = await commitChanges(c.oid, paths);
      const body: string[] = [];
      if (flags.has("stat")) body.push(...stat(changes), "");
      if (flags.has("name-only")) body.push(...changes.map((x) => x.path), "");
      if (flags.has("name-status")) body.push(...nameStatus(changes), "");
      if (flags.has("patch")) body.push(...patch(changes), "");
      return [...head, ...body];
    };

    const rendered: string[][] = [];
    for (const c of commits) rendered.push(await render(c));
    const out = flags.has("graph")
      ? graphLines(commits, (c) => rendered[commits.indexOf(c)])
      : rendered.flat();
    return ok(out.length ? `${out.join("\n").replace(/\n+$/, "")}\n` : "");
  }

  // ─── show / diff / cat-file ───

  async function show(args: string[], cwd: string): Promise<ExecResult> {
    await requireRepo();
    const { flags, values, rest } = parseOpts(args, {
      bool: { "--stat": "stat", "-s": "no-patch", "--no-patch": "no-patch", "-p": "patch", "--patch": "patch", "--oneline": "oneline", "--name-only": "name-only", "--name-status": "name-status", "--no-decorate": "no-decorate", "--decorate": "decorate" },
      valued: { "--format": "format", "--pretty": "format" },
      usage: "show [--stat] [-s] [--format=<format>] [<object>]",
    });
    const target = rest[0] ?? "HEAD";
    const colon = target.indexOf(":");
    if (colon > 0) {
      const { text } = await objectAtPath(target.slice(0, colon), target.slice(colon + 1));
      return ok(text.endsWith("\n") || text === "" ? text : `${text}\n`);
    }
    const oid = await resolveRevision(target);
    const obj = await git.readObject({ fs, dir, oid, format: "parsed" });
    if (obj.type === "blob") return ok(new TextDecoder().decode(obj.object as Uint8Array));
    if (obj.type === "tree") {
      const entries = obj.object as Array<{ path: string; type: string }>;
      return ok(`tree ${target}\n\n${entries.map((e) => (e.type === "tree" ? `${e.path}/` : e.path)).join("\n")}\n`);
    }
    const { commit: c } = await git.readCommit({ fs, dir, oid });
    const refs = await refsByOid();
    const decoration = flags.has("no-decorate") ? "" : decorationOf(refs, oid);
    let format = values.get("format");
    if (format && NAMED_FORMATS[format]) format = NAMED_FORMATS[format];
    if (flags.has("oneline")) format = "%h%d %s";
    const fake = { oid, commit: c, payload: "" } as LogCommit;
    const head = format
      ? formatCommit(format, fake, decoration).split("\n")
      : [
          `commit ${oid}${decoration}`,
          ...(c.parent.length > 1 ? [`Merge: ${c.parent.map(short).join(" ")}`] : []),
          `Author: ${c.author.name} <${c.author.email}>`,
          `Date:   ${gitDate(c.author.timestamp, c.author.timezoneOffset)}`,
          "",
          ...c.message.trim().split("\n").map((l) => `    ${l}`),
          "",
        ];
    const paths = rest.slice(1).map((p) => relToRepo(dir, cwd, p));
    const changes = flags.has("no-patch") ? [] : await commitChanges(oid, paths);
    const body: string[] = [];
    if (flags.has("stat")) body.push(...stat(changes));
    else if (flags.has("name-only")) body.push(...changes.map((x) => x.path));
    else if (flags.has("name-status")) body.push(...nameStatus(changes));
    else if (!flags.has("no-patch")) body.push(...patch(changes));
    return ok(`${[...head, ...body].join("\n").replace(/\n+$/, "")}\n`);
  }

  async function diff(args: string[], cwd: string): Promise<ExecResult> {
    await requireRepo();
    const { flags, rest, dashes } = parseOpts(args, {
      bool: { "--staged": "staged", "--cached": "staged", "--stat": "stat", "--name-only": "name-only", "--name-status": "name-status", "-p": "patch", "--patch": "patch", "--no-color": "no-color", "--color": "color" },
      usage: "diff [--staged] [--stat] [--name-only] [<commit>] [<commit>] [--] [<path>...]",
    });
    const { revs, exclude, paths } = await revsAndPaths(rest, dashes, cwd);
    const all = [...exclude, ...revs];

    let changes: Change[];
    if (flags.has("staged")) {
      const base = all[0] ? await resolveRevision(all[0]) : await headOid();
      changes = await changesBetween(base ? await treeEntries(base) : new Map(), await indexEntries(), paths);
    } else if (all.length >= 2) {
      changes = await changesBetween(await treeEntries(await resolveRevision(all[0])), await treeEntries(await resolveRevision(all[1])), paths);
    } else if (all.length === 1) {
      changes = await worktreeVsCommit(await resolveRevision(all[0]), paths);
    } else {
      changes = await worktreeVsIndex(paths);
    }
    if (!changes.length) return ok();
    const out = flags.has("stat")
      ? stat(changes)
      : flags.has("name-only")
        ? changes.map((c) => c.path)
        : flags.has("name-status")
          ? nameStatus(changes)
          : patch(changes);
    return ok(`${out.join("\n")}\n`);
  }

  async function catFile(args: string[]): Promise<ExecResult> {
    await requireRepo();
    const { flags, rest } = parseOpts(args, {
      bool: { "-p": "pretty", "-t": "type", "-s": "size", "-e": "exists" },
      usage: "cat-file (-t | -s | -e | -p) <object>",
    });
    const target = rest[rest.length - 1];
    if (!target) return fail("fatal: git cat-file: must specify an object\n", 128);
    let oid: string;
    let colonPath: string | null = null;
    const colon = target.indexOf(":");
    if (colon > 0) {
      colonPath = target.slice(colon + 1);
      const { type, text } = await objectAtPath(target.slice(0, colon), colonPath).catch(() => {
        throw new GitError(`fatal: Not a valid object name ${target}`);
      });
      if (flags.has("type")) return ok(`${type}\n`);
      if (flags.has("size")) return ok(`${new TextEncoder().encode(text).length}\n`);
      if (flags.has("exists")) return ok();
      return ok(text);
    }
    try {
      // cat-file shows the object named, so an annotated tag is the tag.
      const m = /^(.*?)((?:[~^]\d*)*)$/.exec(target)!;
      oid = m[2] || !/^[0-9a-f]{4,40}$/i.test(m[1]) ? await resolveRevisionUnpeeled(target) : await git.expandOid({ fs, dir, oid: m[1].toLowerCase() });
    } catch {
      return fail(`fatal: Not a valid object name ${target}\n`, 128);
    }
    const res = await git.readObject({ fs, dir, oid, format: "parsed" }).catch(() => null);
    if (!res) return fail(`fatal: Not a valid object name ${target}\n`, 128);
    if (flags.has("exists")) return ok();
    if (flags.has("type")) return ok(`${res.type}\n`);
    if (flags.has("size")) {
      const raw = await git.readObject({ fs, dir, oid, format: "content" });
      return ok(`${(raw.object as Uint8Array).byteLength}\n`);
    }
    if (!flags.has("pretty")) {
      return fail("fatal: git cat-file: one of -t, -s, -e or -p is required\n", 129);
    }
    if (res.type === "blob") return ok(new TextDecoder().decode(res.object as Uint8Array));
    if (res.type === "tree") {
      const entries = res.object as Array<{ mode: string; type: string; oid: string; path: string }>;
      return ok(entries.map((e) => `${e.mode} ${e.type} ${e.oid}\t${e.path}`).join("\n") + "\n");
    }
    if (res.type === "commit") {
      const c = res.object as {
        tree: string;
        parent: string[];
        message: string;
        author: { name: string; email: string; timestamp: number; timezoneOffset: number };
        committer: { name: string; email: string; timestamp: number; timezoneOffset: number };
      };
      const who = (p: typeof c.author) => `${p.name} <${p.email}> ${p.timestamp} ${p.timezoneOffset <= 0 ? "+" : "-"}${String(Math.abs(p.timezoneOffset) / 60).padStart(2, "0").padEnd(4, "0")}`;
      const lines = [`tree ${c.tree}`];
      for (const p of c.parent) lines.push(`parent ${p}`);
      lines.push(`author ${who(c.author)}`, `committer ${who(c.committer)}`, "", c.message.trim());
      return ok(`${lines.join("\n")}\n`);
    }
    if (res.type === "tag") {
      const t = res.object as { object: string; type: string; tag: string; tagger: { name: string; email: string; timestamp: number; timezoneOffset: number }; message: string };
      return ok(`object ${t.object}\ntype ${t.type}\ntag ${t.tag}\ntagger ${t.tagger.name} <${t.tagger.email}> ${t.tagger.timestamp} +0000\n\n${t.message.trim()}\n`);
    }
    return ok(`${res.type}\n`);
  }

  /** Like `resolveRevision`, but an annotated tag resolves to the tag object. */
  async function resolveRevisionUnpeeled(rev: string): Promise<string> {
    if (!/[~^]/.test(rev) && (await git.listTags({ fs, dir })).includes(rev)) {
      return git.resolveRef({ fs, dir, ref: rev });
    }
    return resolveRevision(rev);
  }

  // ─── branch / checkout / switch ───

  async function branch(args: string[]): Promise<ExecResult> {
    await requireRepo();
    const { flags, rest } = parseOpts(args, {
      bool: { "-d": "delete", "--delete": "delete", "-D": "force-delete", "-m": "move", "--move": "move", "-M": "force-move", "-f": "force", "--force": "force", "-a": "all", "--all": "all", "-v": "verbose", "-vv": "verbose", "--verbose": "verbose", "--show-current": "show-current", "-l": "list", "--list": "list" },
      usage: "branch [-a] [-v] | branch <name> [<start-point>] | branch (-d | -D) <name> | branch (-m | -M) [<old>] <new> | branch --show-current",
    });
    const existing = await git.listBranches({ fs, dir });
    const current = await currentBranch();

    if (flags.has("show-current")) return ok(current ? `${current}\n` : "");

    if (flags.has("delete") || flags.has("force-delete")) {
      if (!rest.length) return fail("fatal: branch name required\n", 128);
      const out: string[] = [];
      for (const name of rest) {
        if (name === current) {
          return fail(`error: Cannot delete branch '${name}' checked out at '${dir}'\n`, 1);
        }
        if (!existing.includes(name)) return fail(`error: branch '${name}' not found.\n`, 1);
        const tip = await git.resolveRef({ fs, dir, ref: name });
        // Real git refuses to drop unmerged work with -d, which is the whole
        // point of the flag; -D is the override.
        if (!flags.has("force-delete")) {
          const head = await headOid();
          const merged = head ? await git.isDescendent({ fs, dir, oid: head, ancestor: tip }).catch(() => false) || head === tip : false;
          if (!merged) {
            return fail(
              `error: The branch '${name}' is not fully merged.\nIf you are sure you want to delete it, run 'git branch -D ${name}'.\n`,
              1,
            );
          }
        }
        await git.deleteBranch({ fs, dir, ref: name });
        out.push(`Deleted branch ${name} (was ${short(tip)}).`);
      }
      return ok(`${out.join("\n")}\n`);
    }

    if (flags.has("move") || flags.has("force-move")) {
      const [oldName, newName] = rest.length >= 2 ? rest : [current, rest[0]];
      if (!newName) return fail("fatal: branch name required\n", 128);
      if (!oldName || !existing.includes(oldName)) return fail(`error: refname refs/heads/${oldName ?? ""} not found\nfatal: Branch rename failed\n`, 128);
      if (existing.includes(newName) && !flags.has("force-move")) {
        return fail(`fatal: a branch named '${newName}' already exists\n`, 128);
      }
      if (existing.includes(newName)) await git.deleteBranch({ fs, dir, ref: newName });
      await git.renameBranch({ fs, dir, oldref: oldName, ref: newName, checkout: oldName === current });
      if (previousBranch === oldName) previousBranch = newName;
      return ok();
    }

    if (rest.length) {
      const [name, start] = rest;
      if (!/^[A-Za-z0-9._/-]+$/.test(name) || name.startsWith("-") || name.endsWith(".lock")) {
        return fail(`fatal: '${name}' is not a valid branch name\n`, 128);
      }
      if (existing.includes(name) && !flags.has("force")) {
        return fail(`fatal: a branch named '${name}' already exists\n`, 128);
      }
      const object = start ? await resolveRevision(start) : (await headOid()) ?? undefined;
      if (!object) return fail(`fatal: not a valid object name: '${start ?? "HEAD"}'\n`, 128);
      await git.branch({ fs, dir, ref: name, object, force: flags.has("force") });
      return ok();
    }

    const head = await headOid();
    const lines: string[] = [];
    if (head && current === null) lines.push(`* (HEAD detached at ${short(head)})`);
    for (const b of existing) {
      let line = `${b === current ? "*" : " "} ${b}`;
      if (flags.has("verbose")) {
        const tip = await git.resolveRef({ fs, dir, ref: b });
        line += ` ${short(tip)} ${await subjectOf(tip)}`;
      }
      lines.push(line);
    }
    return ok(lines.length ? `${lines.join("\n")}\n` : "");
  }

  const CHECKOUT_OPTS: OptSpec = {
    bool: { "-b": "new", "-B": "force-new", "-c": "new", "-C": "force-new", "-f": "force", "--force": "force", "--detach": "detach", "-d": "detach", "-q": "quiet", "--quiet": "quiet" },
    usage: "checkout [-b <new-branch>] <branch> | checkout <commit> | checkout [--] <pathspec>...",
  };

  /** `You are in 'detached HEAD' state`, in git's words, shortened. */
  const detachedNote = (rev: string, oid: string, subject: string) =>
    `Note: switching to '${rev}'.\n\nYou are in 'detached HEAD' state. You can look around, make experimental\nchanges and commit them, and you can discard any commits you make in this\nstate without impacting any branches by switching back to a branch.\n\nHEAD is now at ${short(oid)} ${subject}\n`;

  async function moveTo(ref: string, oid: string | null, opts: { force: boolean }): Promise<void> {
    try {
      await git.checkout({ fs, dir, ref: oid ?? ref, force: opts.force, noUpdateHead: false });
    } catch (e) {
      const err = e as { code?: string; data?: { filepaths?: string[] } };
      if (err.code === "CheckoutConflictError") {
        throw new GitError(
          `error: Your local changes to the following files would be overwritten by checkout:\n${(err.data?.filepaths ?? []).map((f) => `\t${f}`).join("\n")}\nPlease commit your changes or stash them before you switch branches.\nAborting`,
          1,
        );
      }
      throw e;
    }
  }

  async function checkout(args: string[], asSwitch: boolean, cwd: string): Promise<ExecResult> {
    await requireRepo();
    const { flags, rest, dashes } = parseOpts(args, asSwitch ? { ...CHECKOUT_OPTS, usage: "switch [-c <new-branch>] <branch> | switch --detach <commit> | switch -" } : CHECKOUT_OPTS);
    const existing = await git.listBranches({ fs, dir });
    const current = await currentBranch();

    // `checkout -- <paths>`: discard working-tree changes, as restore does.
    if (!asSwitch && dashes < rest.length) {
      const paths = rest.slice(dashes);
      const source = dashes > 0 ? rest[0] : null;
      return restore([...(source ? [`--source=${source}`] : []), "--", ...paths], cwd);
    }

    const create = flags.has("new") || flags.has("force-new");
    let target = rest[0];
    if (target === "-" || (!target && !create && flags.has("detach") === false && rest.length === 0 && args.includes("-"))) target = "-";
    if (!target) return fail(asSwitch ? "fatal: missing branch or commit argument\n" : "fatal: you must specify a branch name\n", 128);

    if (create) {
      const start = rest[1] ? await resolveRevision(rest[1]) : await headOid();
      if (existing.includes(target) && !flags.has("force-new")) {
        return fail(`fatal: a branch named '${target}' already exists\n`, 128);
      }
      if (!start) {
        // An unborn repository: the new branch is simply where HEAD points next.
        await git.writeRef({ fs, dir, ref: "HEAD", value: `refs/heads/${target}`, symbolic: true, force: true });
        return ok(`Switched to a new branch '${target}'\n`);
      }
      await git.branch({ fs, dir, ref: target, object: start, force: flags.has("force-new") });
      await moveTo(target, null, { force: flags.has("force") });
      if (current) previousBranch = current;
      return ok(`Switched to a new branch '${target}'\n`);
    }

    if (target === "-") {
      if (!previousBranch || !existing.includes(previousBranch)) {
        return fail("fatal: no previous branch to switch back to\n", 128);
      }
      target = previousBranch;
    }

    if (existing.includes(target) && !flags.has("detach")) {
      if (target === current) return ok(`Already on '${target}'\n`);
      await moveTo(target, null, { force: flags.has("force") });
      if (current) previousBranch = current;
      return ok(`Switched to branch '${target}'\n`);
    }

    // Not a branch: a commit, tag or sha detaches HEAD; anything else is a
    // path (checkout) or an invalid reference (switch).
    const oid = await resolveRevision(target).catch(() => null);
    if (!oid) {
      if (!asSwitch) {
        const matrix = await git.statusMatrix({ fs, dir });
        const rel = relToRepo(dir, cwd, target);
        if (matrix.some(([f]) => String(f) === rel || String(f).startsWith(`${rel}/`))) {
          return restore(["--", target], cwd);
        }
        return fail(`error: pathspec '${target}' did not match any file(s) known to git\n`, 1);
      }
      return fail(`fatal: invalid reference: ${target}\n`, 128);
    }
    if (asSwitch && !flags.has("detach")) {
      return fail(`fatal: a branch is expected, got commit '${target}'\nhint: If you want to detach HEAD at the commit, try again with the --detach option.\n`, 128);
    }
    await moveTo(target, oid, { force: flags.has("force") });
    if (current) previousBranch = current;
    return ok(detachedNote(target, oid, await subjectOf(oid)));
  }

  // ─── merge ───

  const LINEBREAKS = /^.*(\r?\n|$)/gm;

  /** isomorphic-git's own three-way merge, with the markers git writes:
   *  `<<<<<<< HEAD` rather than the branch name. */
  const mergeDriver = ({ branches, contents }: { branches: string[]; contents: string[] }) => {
    const [base, ours, theirs] = contents.map((c) => c.match(LINEBREAKS) ?? []);
    let mergedText = "";
    let cleanMerge = true;
    for (const item of diff3Merge(ours, base, theirs)) {
      if (item.ok) mergedText += item.ok.join("");
      if (item.conflict) {
        cleanMerge = false;
        mergedText += `<<<<<<< HEAD\n${item.conflict.a.join("")}=======\n${item.conflict.b.join("")}>>>>>>> ${branches[2]}\n`;
      }
    }
    return { cleanMerge, mergedText };
  };

  async function merge(args: string[]): Promise<ExecResult> {
    await requireRepo();
    const { flags, values, rest } = parseOpts(args, {
      bool: { "--abort": "abort", "--no-ff": "no-ff", "--ff": "ff", "--ff-only": "ff-only", "--continue": "continue", "--no-edit": "no-edit", "-q": "quiet", "--quiet": "quiet" },
      valued: { "-m": "message", "--message": "message" },
      usage: 'merge [--no-ff | --ff-only] [-m "<message>"] <branch> | merge --abort',
    });
    const ours = await currentBranch();
    // Handled before the target guard: `--abort` takes no branch name.
    if (flags.has("abort")) {
      if (!pendingMerge) return fail("fatal: There is no merge to abort (MERGE_HEAD missing).\n", 128);
      pendingMerge = null;
      if (ours) await git.checkout({ fs, dir, ref: ours, force: true });
      return ok();
    }
    if (flags.has("continue")) {
      if (!pendingMerge) return fail("fatal: There is no merge in progress (MERGE_HEAD missing).\n", 128);
      return commit(["-m", `Merge branch '${pendingMerge.branch}'`]);
    }
    const theirs = rest[0];
    if (!theirs) return fail("fatal: No commit specified and merge.defaultToUpstream not set.\n", 128);
    if (pendingMerge) {
      return fail("error: Merging is not possible because you have unmerged files.\nhint: Fix them up in the work tree, and then use 'git add/rm <file>'\nhint: as appropriate to mark resolution and make a commit.\nfatal: Exiting because of an unresolved conflict.\n", 128);
    }
    if (!ours) return fail("fatal: cannot merge with a detached HEAD in this playground; switch to a branch first\n", 128);
    const theirOid = await resolveRevision(theirs).catch(() => null);
    if (!theirOid) return fail(`merge: ${theirs} - not something we can merge\n`, 1);
    const before = (await headOid())!;
    if ((await classify()).some((r) => r.y !== " " && !r.untracked)) {
      // Merging over local edits is where isomorphic-git and git disagree
      // most; git refuses when the edits overlap, and so does this.
      const changed = new Set((await worktreeVsIndex()).map((c) => c.path));
      const incoming = await changesBetween(await treeEntries(before), await treeEntries(theirOid));
      const overlap = incoming.filter((c) => changed.has(c.path));
      if (overlap.length) {
        return fail(`error: Your local changes to the following files would be overwritten by merge:\n${overlap.map((c) => `\t${c.path}`).join("\n")}\nPlease commit your changes or stash them before you merge.\nAborting\n`, 1);
      }
    }
    try {
      const who = await author();
      const branches = await git.listBranches({ fs, dir });
      const result = await git.merge({
        fs,
        dir,
        ours,
        // The name, when it is one, so the conflict marker reads
        // `>>>>>>> rename` rather than a sha.
        theirs: branches.includes(theirs) ? theirs : theirOid,
        fastForward: !flags.has("no-ff"),
        fastForwardOnly: flags.has("ff-only"),
        // Leave real `<<<<<<< HEAD` markers in the working tree rather than
        // aborting: the markers are what a learner meets in a real terminal,
        // and resolving them by hand is the lesson.
        abortOnConflict: false,
        mergeDriver,
        author: { ...who, timestamp: EPOCH + clock.commits * 60, timezoneOffset: 0 },
        committer: { ...who, timestamp: EPOCH + clock.commits * 60, timezoneOffset: 0 },
        message: values.get("message") ?? `Merge branch '${theirs}'`,
      });
      if (result.alreadyMerged) return ok("Already up to date.\n");
      // isomorphic-git moves the ref but leaves the working tree alone, so
      // without this the merged files never appear on disk.
      await git.checkout({ fs, dir, ref: ours, force: true });
      const after = (await headOid())!;
      const changes = await changesBetween(await treeEntries(before), await treeEntries(after));
      if (result.fastForward) {
        return ok(`Updating ${short(before)}..${short(after)}\nFast-forward\n${stat(changes).join("\n")}\n`);
      }
      clock.commits += 1;
      return ok(`Merge made by the 'ort' strategy.\n${stat(changes).join("\n")}\n`);
    } catch (e) {
      const err = e as { code?: string; data?: { filepaths?: string[] } };
      if (err.code === "MergeConflictError") {
        const files = err.data?.filepaths ?? [];
        pendingMerge = { branch: theirs, oid: theirOid };
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
      if (err.code === "FastForwardError") {
        return fail("fatal: Not possible to fast-forward, aborting.\n", 128);
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

  // ─── reset ───

  async function reset(args: string[], cwd: string): Promise<ExecResult> {
    await requireRepo();
    const { flags, rest, dashes } = parseOpts(args, {
      bool: { "--hard": "hard", "--soft": "soft", "--mixed": "mixed", "-q": "quiet", "--quiet": "quiet" },
      usage: "reset [--soft | --mixed | --hard] [<commit>] | reset [<commit>] [--] <pathspec>...",
    });
    const mode = flags.has("hard") ? "hard" : flags.has("soft") ? "soft" : "mixed";
    const tracked = await git.statusMatrix({ fs, dir }).then((m) => m.map(([f]) => String(f)));

    // Which words are paths: everything after `--`, or anything that names a
    // tracked file and is not also a revision.
    let revArg: string | undefined;
    const paths: string[] = [];
    for (const [i, a] of rest.entries()) {
      const rel = relToRepo(dir, cwd, a);
      const isPath = tracked.some((f) => f === rel || f.startsWith(`${rel}/`));
      const afterDashes = i >= dashes;
      if (afterDashes || (isPath && (i > 0 || !(await resolveRevision(a).then(() => true, () => false))))) {
        paths.push(rel);
      } else if (i === 0 && !revArg) {
        revArg = a;
      } else {
        throw unknownRevision(a);
      }
    }

    if (paths.length) {
      if (mode !== "mixed") return fail(`fatal: Cannot do ${mode} reset with paths.\n`, 128);
      const source = revArg ? await resolveRevision(revArg) : await headOid();
      for (const p of paths) {
        await git.resetIndex({ fs, dir, filepath: p, ...(source ? { ref: source } : {}) });
      }
      const rows = (await classify()).filter((r) => paths.some((p) => r.path === p || r.path.startsWith(`${p}/`)) && r.y !== " " && !r.untracked);
      return ok(rows.length ? `Unstaged changes after reset:\n${rows.map((r) => `${r.y}\t${r.path}`).join("\n")}\n` : "");
    }

    // Resolve first, change nothing on failure.
    const head = await headOid();
    const target = revArg ? await resolveRevision(revArg) : head;
    if (!target) return fail("fatal: Failed to resolve 'HEAD' as a valid ref.\n", 128);
    if (!revArg && mode === "mixed") {
      // Bare `git reset`: unstage everything.
      for (const [f, , , s] of await git.statusMatrix({ fs, dir })) {
        if (s !== 1) await git.resetIndex({ fs, dir, filepath: String(f) });
      }
      const rows = (await classify()).filter((r) => r.y !== " " && !r.untracked);
      return ok(rows.length ? `Unstaged changes after reset:\n${rows.map((r) => `${r.y}\t${r.path}`).join("\n")}\n` : "");
    }

    const branch = await currentBranch();
    if (branch) await git.writeRef({ fs, dir, ref: `refs/heads/${branch}`, value: target, force: true });
    else await git.writeRef({ fs, dir, ref: "HEAD", value: target, force: true });
    pendingMerge = null;

    if (mode === "hard") {
      await git.checkout({ fs, dir, ref: branch ?? target, force: true });
      return ok(`HEAD is now at ${short(target)} ${await subjectOf(target)}\n`);
    }
    if (mode === "mixed") {
      const tree = await treeEntries(target);
      const index = await indexEntries();
      for (const p of tree.keys()) await git.resetIndex({ fs, dir, filepath: p, ref: target });
      for (const p of index.keys()) if (!tree.has(p)) await git.remove({ fs, dir, filepath: p });
      const rows = (await classify()).filter((r) => r.y !== " " && !r.untracked);
      return ok(rows.length ? `Unstaged changes after reset:\n${rows.map((r) => `${r.y}\t${r.path}`).join("\n")}\n` : "");
    }
    return ok();
  }

  // ─── tag ───

  async function tag(args: string[]): Promise<ExecResult> {
    await requireRepo();
    const { flags, values, rest } = parseOpts(args, {
      bool: { "-d": "delete", "--delete": "delete", "-l": "list", "--list": "list", "-a": "annotate", "--annotate": "annotate", "-f": "force", "--force": "force", "-n": "lines" },
      valued: { "-m": "message", "--message": "message" },
      usage: 'tag [-a -m "<message>"] <tagname> [<commit>] | tag -d <tagname> | tag [-l] [<pattern>]',
    });
    const tags = await git.listTags({ fs, dir });
    if (flags.has("delete")) {
      if (!rest.length) return fail("fatal: tag name required\n", 128);
      const out: string[] = [];
      for (const name of rest) {
        if (!tags.includes(name)) return fail(`error: tag '${name}' not found.\n`, 1);
        const was = await resolveRevision(name);
        await git.deleteTag({ fs, dir, ref: name });
        out.push(`Deleted tag '${name}' (was ${short(was)})`);
      }
      return ok(`${out.join("\n")}\n`);
    }
    if (flags.has("list") || !rest.length) {
      const pattern = rest[0];
      const re = pattern ? new RegExp(`^${pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".")}$`) : null;
      const list = tags.filter((t) => !re || re.test(t)).sort();
      return ok(list.length ? `${list.join("\n")}\n` : "");
    }
    const [name, at] = rest;
    if (!/^[A-Za-z0-9._/-]+$/.test(name) || name.startsWith("-")) return fail(`fatal: '${name}' is not a valid tag name.\n`, 128);
    if (tags.includes(name) && !flags.has("force")) return fail(`fatal: tag '${name}' already exists\n`, 128);
    const object = at ? await resolveRevision(at) : await headOid();
    if (!object) return fail("fatal: Failed to resolve 'HEAD' as a valid ref.\n", 128);
    if (flags.has("annotate") || values.has("message")) {
      const message = values.get("message");
      if (!message) return fail("fatal: no tag message supplied (use -m \"message\")\n", 128);
      const who = await author();
      await git.annotatedTag({
        fs,
        dir,
        ref: name,
        object,
        message,
        tagger: { ...who, timestamp: EPOCH + clock.commits * 60, timezoneOffset: 0 },
        force: flags.has("force"),
      });
    } else {
      await git.tag({ fs, dir, ref: name, object, force: flags.has("force") });
    }
    return ok();
  }

  // ─── config ───

  async function configCmd(args: string[]): Promise<ExecResult> {
    const { flags, rest } = parseOpts(args, {
      bool: { "--global": "global", "--local": "local", "--system": "system", "-l": "list", "--list": "list", "--get": "get", "--unset": "unset" },
      usage: "config [--global] <name> [<value>] | config --list | config --unset <name>",
    });
    const repo = await isRepo();
    if (flags.has("list")) {
      const lines = [...config.entries()].map(([k, v]) => `${k}=${v}`);
      return ok(lines.length ? `${lines.join("\n")}\n` : "");
    }
    const [name, ...valueParts] = rest;
    if (!name) return fail("usage: git config <name> [<value>]\n", 129);
    if (!/^[A-Za-z][A-Za-z0-9-]*\.[A-Za-z0-9.-]+$/.test(name)) return fail(`error: key does not contain a section: ${name}\n`, 2);
    if (flags.has("unset")) {
      config.delete(name);
      if (repo) await git.setConfig({ fs, dir, path: name, value: undefined }).catch(() => {});
      return ok();
    }
    if (!valueParts.length) {
      const value = config.get(name) ?? (repo ? await git.getConfig({ fs, dir, path: name }).catch(() => undefined) : undefined);
      return value === undefined || value === null ? fail("", 1) : ok(`${value}\n`);
    }
    const value = valueParts.join(" ");
    config.set(name, value);
    // Written into .git/config too when there is one, so `cat .git/config`
    // shows what a real repository would.
    if (repo) await git.setConfig({ fs, dir, path: name, value }).catch(() => {});
    return ok();
  }

  const HELP = `usage: git <command> [<args>]

These are the commands this playground supports:

   init       Create an empty Git repository
   config     Get and set user.name and user.email
   status     Show the working tree status
   add        Add file contents to the index
   commit     Record changes to the repository
   log        Show commit logs
   diff       Show changes between commits, commit and working tree, etc
   branch     List, create, rename or delete branches
   checkout   Switch branches or restore working tree files
   switch     Switch branches
   merge      Join two or more development histories together
   reset      Reset current HEAD to the specified state
   restore    Restore working tree files
   rm         Remove files from the working tree and from the index
   show       Show a commit, a tag, or a file at a revision
   tag        Create, list, or delete tags
   cat-file   Provide contents or details of repository objects

Revisions can be written as HEAD, a branch, a tag, a sha, or any of those
followed by ~n or ^ (HEAD~1, main^), and as rev:path (HEAD:README.md).
Run 'git <command> --help' for the options a command accepts.
`;

  /** isomorphic-git's messages carry hints for its JavaScript callers
   *  (`use 'force: true'`) that mean nothing at a prompt. Strip them, and
   *  translate the codes a learner is likely to hit. */
  function backendError(e: unknown): ExecResult {
    if (e instanceof GitError) return fail(`${e.message}\n`, e.exitCode);
    const err = e as { code?: string; message?: string; data?: Record<string, unknown> };
    const message = String(err.message ?? e).replace(/\s*\(Hint:[^)]*\)\.?/g, "").trim();
    if (err.code === "NotFoundError") return fail(`fatal: ${message.replace(/^Could not find (.*)\.$/, "'$1' not found")}\n`, 128);
    if (err.code === "AlreadyExistsError") return fail(`fatal: ${message}\n`, 128);
    if (err.code === "CheckoutConflictError") {
      const files = (err.data?.filepaths as string[] | undefined) ?? [];
      return fail(`error: Your local changes to the following files would be overwritten by checkout:\n${files.map((f) => `\t${f}`).join("\n")}\nPlease commit your changes or stash them before you switch branches.\nAborting\n`, 1);
    }
    return fail(`fatal: ${message}\n`, 128);
  }

  const run = async (args: string[], ctx: { cwd?: string }): Promise<ExecResult> => {
    const cwd = ctx?.cwd ?? dir;
    const [sub, ...rest] = args;
    try {
      if (sub && sub !== "help" && (rest.includes("--help") || rest.includes("-h"))) {
        // Each command's parser knows its usage line; ask it with an
        // impossible option to get the line back.
        const probe = await run([sub, "--no-such-option-please"], ctx);
        const usage = /usage: .*/.exec(probe.stderr)?.[0];
        return usage ? ok(`${usage}\n`) : probe;
      }
      switch (sub) {
        case undefined:
        case "help":
        case "--help":
          return ok(HELP);
        case "--version":
        case "version":
          return ok("git version 2.43.0 (dataslope playground)\n");
        case "init": {
          if (relToRepo(dir, cwd, ".") !== ".") {
            return fail(
              `fatal: this playground keeps one repository, at ${dir}. Run git init there.\n`,
              128,
            );
          }
          if (await isRepo()) return ok(`Reinitialized existing Git repository in ${dir}/.git/\n`);
          await git.init({ fs, dir, defaultBranch: "main" });
          for (const [k, v] of config) await git.setConfig({ fs, dir, path: k, value: v }).catch(() => {});
          return ok(`Initialized empty Git repository in ${dir}/.git/\n`);
        }
        case "status": {
          const { flags } = parseOpts(rest, { bool: { "-s": "short", "--short": "short", "--long": "long", "-b": "branch", "--branch": "branch", "-u": "untracked", "--untracked-files": "untracked" }, usage: "status [-s]" });
          return await status(flags.has("short"));
        }
        case "add":
          return await add(rest, cwd);
        case "commit":
          return await commit(rest);
        case "log":
          return await log(rest, cwd);
        case "branch":
          return await branch(rest);
        case "checkout":
          return await checkout(rest, false, cwd);
        case "switch":
          return await checkout(rest, true, cwd);
        case "merge":
          return await merge(rest);
        case "diff":
          return await diff(rest, cwd);
        case "reset":
          return await reset(rest, cwd);
        case "restore":
          return await restore(rest, cwd);
        case "rm":
          return await rm(rest, cwd);
        case "show":
          return await show(rest, cwd);
        case "tag":
          return await tag(rest);
        case "cat-file":
          return await catFile(rest);
        case "config":
          return await configCmd(rest);
        case "remote":
          return ok();
        default:
          return fail(
            `git: '${sub}' is not a git command. See 'git help'.\n` +
              "\nThis playground supports a teaching subset. Run 'git help' for the list.\n",
            1,
          );
      }
    } catch (e) {
      return backendError(e);
    }
  };

  // The pending merge is read by the worker after every command, so the UI
  // can say "merge in progress" without parsing `git status` output. A live
  // getter, defined rather than assigned: `Object.assign` would evaluate it
  // once and copy the `null` it returned before any merge had happened.
  Object.defineProperty(run, "merging", {
    get: (): string | null => pendingMerge?.branch ?? null,
    enumerable: true,
  });
  return run as typeof run & { readonly merging: string | null };
}
