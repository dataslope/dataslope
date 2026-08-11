/**
 * Makes polars able to read a file bigger than a megabyte in the browser.
 *
 * ── The failure ─────────────────────────────────────────────────────────
 * `pl.read_csv("diamonds.csv")` on the 2.5 MB diamonds file panics:
 *
 *     thread '<unnamed>' (1) panicked at crates/polars-utils/src/mmap.rs:273:10:
 *     could not spawn threads: ThreadPoolBuildError { kind: IOError(Os {
 *       code: 138, kind: Unsupported, message: "Not supported" }) }
 *
 * Polars memory-maps a file it is given by *path*, and above a size threshold
 * the mmap reader builds its own Rayon pool. wasm has no threads to give it —
 * the site serves no COOP/COEP headers, so `crossOriginIsolated` is false and
 * `SharedArrayBuffer` is unavailable in the reader's worker (there is a test
 * pinning exactly that in `__tests__/syncHttp.test.ts`). Rayon cannot spawn,
 * `.unwrap()` panics, and pyo3 turns the panic into a `PanicException` the
 * reader sees instead of their table. The panic also poisons the `LazyLock`,
 * so every later polars call in that interpreter fails too, with a different
 * and much more confusing message.
 *
 * `POLARS_MAX_THREADS` does not help: `pl.thread_pool_size()` is already 1 and
 * the mmap pool is built regardless. Neither does `POLARS_PREFETCH_SIZE`,
 * `POLARS_NO_MMAP`, `POLARS_FORCE_ASYNC`, nor `low_memory=True`.
 *
 * ── The fix ─────────────────────────────────────────────────────────────
 * Hand polars the *bytes* instead of the path. A file-like source never goes
 * near mmap, and the whole 53,940-row file then reads and aggregates fine.
 * So each `pl.read_*` that accepts a buffer is wrapped: a local path over the
 * threshold is slurped into a `BytesIO` first, and everything else is passed
 * straight through untouched.
 *
 * Measured on diamonds.csv: 0.91 MiB reads by path, 1.82 MiB panics, so the
 * real boundary is 1 MiB. The threshold here is half that, which leaves a
 * margin without buffering the small files the rest of the site reads — those
 * keep polars' true code path.
 *
 * ── What this does NOT fix ──────────────────────────────────────────────
 * `pl.scan_csv(...)`, and not because of the size. The Pyodide wheel is built
 * without `new-streaming`, and a LazyFrame whose source is a `scan_*` needs
 * that engine to execute anything at all: `scan_csv(...).select(pl.len())`
 * collects (the optimizer answers it from CSV metadata), but add a `filter`, a
 * `head` or a `group_by` and it panics with `invalid build. Missing feature
 * new-streaming` — on a 15 KB file as readily as on a 2.5 MB one. No `engine=`
 * argument and no `POLARS_*_NEW_STREAMING` env var changes that, and buffering
 * cannot help something that never reads the file.
 *
 * So a smaller dataset does not rescue those lessons; that was measured, and
 * it buys back only the `explain()`-only blocks. `read_csv(...).lazy()` runs
 * the same chain and is what the fixable blocks use, but it prints the source
 * as `DF [...]` instead of `Csv SCAN [file] / SELECTION: …`, which is the one
 * thing a lesson about predicate pushdown cannot trade away.
 * `scripts/check-polars-scan.mjs` counts what is left.
 */

/** Bytes above which a path-based read is buffered. Half the measured 1 MiB
 *  boundary; see the note above. */
export const POLARS_MMAP_LIMIT = 512 * 1024;

/**
 * Python source that installs the wrapper. Idempotent, and safe to run before
 * polars is imported by the block itself — it imports polars, patches the
 * module object, and the block's own `import polars as pl` then picks the
 * patched module up out of `sys.modules`.
 */
export const POLARS_WASM_SHIM = `
import io as _pg_io, os as _pg_os, polars as _pg_pl

if not getattr(_pg_pl, "_pg_mmap_shim", False):
    _pg_pl._pg_mmap_shim = True

    def _pg_buffered(fn, limit=${POLARS_MMAP_LIMIT}):
        def wrapper(source, *args, **kwargs):
            try:
                if isinstance(source, (str, _pg_os.PathLike)):
                    path = _pg_os.fspath(source)
                    if (
                        "://" not in path
                        and _pg_os.path.isfile(path)
                        and _pg_os.path.getsize(path) > limit
                    ):
                        with open(path, "rb") as fh:
                            source = _pg_io.BytesIO(fh.read())
            except OSError:
                # Unreadable, a glob, whatever: let polars raise its own
                # error about it rather than inventing one here.
                pass
            return fn(source, *args, **kwargs)

        wrapper.__name__ = fn.__name__
        wrapper.__qualname__ = fn.__qualname__
        wrapper.__doc__ = fn.__doc__
        return wrapper

    # Every eager reader that takes a file-like source as well as a path.
    for _pg_name in ("read_csv", "read_parquet", "read_ipc", "read_json", "read_ndjson"):
        _pg_fn = getattr(_pg_pl, _pg_name, None)
        if _pg_fn is not None:
            setattr(_pg_pl, _pg_name, _pg_buffered(_pg_fn))
    del _pg_name, _pg_fn
`;

/**
 * Does this block use polars? Same shape as the pyarrow-before-polars rule in
 * `pyodide-worker.ts`: an `import polars` in any of the spellings an author
 * actually writes.
 */
export const POLARS_IMPORT_PATTERN =
  /^\s*(?:from\s+polars(?:\.[\w.]+)?\s+import\b|import\s+(?:[\w.]+\s*,\s*)*polars(?:\.[\w.]+)?(?:\s+as\s+\w+)?\s*(?:,|$|#))/m;
