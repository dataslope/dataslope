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
export function cappedFs(inner: AnyFs): AnyFs {
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
          return (target[prop] as (...a: unknown[]) => Promise<void>).call(
            target,
            path,
            content,
            options,
          );
        };
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as AnyFs;
}

const errno = (code: string, message: string) =>
  Object.assign(new Error(`${code}: ${message}`), { code });

interface JbStat {
  isFile: boolean;
  isDirectory: boolean;
  isSymbolicLink: boolean;
  mode: number;
  size: number;
  mtime: Date;
  ino?: number | bigint;
}

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
