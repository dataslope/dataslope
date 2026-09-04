/**
 * One filesystem, two consumers. just-bash's `IFileSystem` is the single
 * source of truth; isomorphic-git gets a `node:fs`-promises facade over the
 * same object, so `cat .git/HEAD` in the shell reads what `git.commit()`
 * wrote. Memory-only by design — see the Git playground design addendum §5.
 *
 * `CappedFs` wraps the store because just-bash's `maxFileSystemBytes` applies
 * only to the filesystem Bash creates for itself, never to an injected one.
 */

import { InMemoryFs } from "just-bash/browser";
import { MAX_FILE_BYTES, MAX_TREE_BYTES } from "./protocol";

/** Structural type for the bits of `IFileSystem` we call or forward. */
type AnyFs = InstanceType<typeof InMemoryFs> & Record<string, unknown>;

interface JbStat {
  isFile: boolean;
  isDirectory: boolean;
  isSymbolicLink: boolean;
  mode: number;
  size: number;
  mtime: Date;
  ino?: number | bigint;
}


const enc = new TextEncoder();
const dec = new TextDecoder();

const byteLength = (content: string | Uint8Array): number =>
  typeof content === "string" ? enc.encode(content).length : content.byteLength;

export class FileTooLargeError extends Error {
  constructor(path: string, limit: number) {
    super(`cannot write '${path}': exceeds the ${Math.round(limit / 1024)} KB playground limit`);
    this.name = "FileTooLargeError";
  }
}

/**
 * Enforces a per-file and whole-tree byte cap on every write path — shell
 * redirection, editor save, and upload all funnel through here.
 */
/**
 * isomorphic-git's index records mtime in **whole seconds**, and its
 * status walk skips hashing a file whose size and mtime both match the index.
 * In a browser that is fine, because seconds pass between a learner's edits.
 * It is not fine for scenario seeding or history replay, where a whole lesson
 * runs inside one millisecond and a same-length rewrite would read as
 * unmodified. A virtual clock advancing one second per write keeps the
 * shortcut honest without making anything wait.
 */
function monotonicMtimes() {
  const stamps = new Map<string, number>();
  let seq = 0;
  const base = 1767225600000; // 2026-01-01T00:00:00Z, matching the commit clock.
  return {
    touch: (path: string) => stamps.set(path, base + (seq += 1) * 1000),
    of: (path: string) => stamps.get(path),
  };
}

export function cappedFs(inner: AnyFs): AnyFs {
  const clock = monotonicMtimes();
  const guard = async (path: string, content: string | Uint8Array, appending: boolean) => {
    const incoming = byteLength(content);
    if (incoming > MAX_FILE_BYTES) throw new FileTooLargeError(path, MAX_FILE_BYTES);

    let existing = 0;
    try {
      existing = (await inner.stat(path)).size;
    } catch {
      existing = 0;
    }
    const next = appending ? existing + incoming : incoming;
    if (next > MAX_FILE_BYTES) throw new FileTooLargeError(path, MAX_FILE_BYTES);

    // Whole-tree cap: `getAllPaths` is part of IFileSystem, so this stays
    // inside the interface rather than reaching into InMemoryFs internals.
    let total = 0;
    for (const p of await inner.getAllPaths()) {
      if (p === path) continue;
      try {
        const s = await inner.stat(p);
        if (s.isFile) total += s.size;
      } catch {
        /* raced away; not worth failing a write over */
      }
    }
    if (total + next > MAX_TREE_BYTES) throw new FileTooLargeError(path, MAX_TREE_BYTES);
  };

  return new Proxy(inner, {
    get(target, prop, receiver) {
      if (prop === "writeFile" || prop === "appendFile") {
        return async (path: string, content: string | Uint8Array, options?: unknown) => {
          await guard(path, content, prop === "appendFile");
          const result = await (target[prop] as (...a: unknown[]) => Promise<void>).call(
            target,
            path,
            content,
            options,
          );
          clock.touch(path);
          return result;
        };
      }
      if (prop === "stat" || prop === "lstat") {
        return async (path: string) => {
          const s = (await (target[prop] as (p: string) => Promise<JbStat>).call(
            target,
            path,
          )) as JbStat;
          const stamped = clock.of(path);
          return stamped === undefined ? s : { ...s, mtime: new Date(stamped) };
        };
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as AnyFs;
}

const errno = (code: string, message: string) =>
  Object.assign(new Error(`${code}: ${message}`), { code });

/** IFileSystem reports booleans; isomorphic-git calls methods. */
const toNodeStat = (s: JbStat) => ({
  isFile: () => s.isFile,
  isDirectory: () => s.isDirectory,
  isSymbolicLink: () => s.isSymbolicLink,
  mode: s.mode,
  size: s.size,
  mtimeMs: s.mtime.getTime(),
  ctimeMs: s.mtime.getTime(),
  uid: 1,
  gid: 1,
  dev: 1,
  ino: typeof s.ino === "bigint" ? Number(s.ino) : (s.ino ?? 1),
});

/** isomorphic-git branches on `err.code`, so map messages onto errno strings. */
const wrap =
  <A extends unknown[], R>(fn: (...args: A) => Promise<R>) =>
  async (...args: A): Promise<R> => {
    try {
      return await fn(...args);
    } catch (e) {
      const err = e as { code?: string; message?: string };
      if (err.code) throw e;
      const m = String(err.message ?? "");
      if (/no such file|not found|does not exist|ENOENT/i.test(m)) throw errno("ENOENT", m);
      if (/exists|EEXIST/i.test(m)) throw errno("EEXIST", m);
      if (/not a directory|ENOTDIR/i.test(m)) throw errno("ENOTDIR", m);
      throw e;
    }
  };

/** The `fs` object isomorphic-git accepts, backed by the shell's filesystem. */
export function nodeFacade(fs: AnyFs) {
  return {
    promises: {
      readFile: wrap(async (path: string, options?: string | { encoding?: string }) => {
        const encoding = typeof options === "string" ? options : options?.encoding;
        const buf = await fs.readFileBuffer(path);
        return encoding && encoding !== "binary" ? dec.decode(buf) : buf;
      }),
      writeFile: wrap(async (path: string, data: string | Uint8Array) => {
        await fs.writeFile(path, typeof data === "string" ? data : new Uint8Array(data));
      }),
      unlink: wrap(async (path: string) => {
        await fs.rm(path, {});
      }),
      readdir: wrap(async (path: string) => await fs.readdir(path)),
      mkdir: wrap(async (path: string) => {
        await fs.mkdir(path, {});
      }),
      rmdir: wrap(async (path: string) => {
        await fs.rm(path, { recursive: true });
      }),
      stat: wrap(async (path: string) => toNodeStat((await fs.stat(path)) as JbStat)),
      lstat: wrap(async (path: string) => toNodeStat((await fs.lstat(path)) as JbStat)),
      readlink: wrap(async (path: string) => await fs.readlink(path)),
      symlink: wrap(async (target: string, path: string) => {
        await fs.symlink(target, path);
      }),
    },
  };
}

export function createGitFs() {
  const store = cappedFs(new InMemoryFs() as AnyFs);
  return { store, fs: nodeFacade(store) };
}
