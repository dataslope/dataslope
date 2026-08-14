/**
 * Makes polars able to read a >1 MiB file in the browser. Path-based reads
 * over a size threshold mmap and build a Rayon pool, but wasm here has no
 * threads (no COOP/COEP → no SharedArrayBuffer; pinned in
 * __tests__/syncHttp.test.ts), so the read panics AND poisons polars'
 * LazyLock for the rest of the session. No POLARS_* env var helps. Fix:
 * wrap each buffer-accepting `pl.read_*` to slurp large local paths into a
 * BytesIO — file-like sources never go near mmap. Measured boundary is
 * 1 MiB (0.91 reads, 1.82 panics); the threshold is half that for margin.
 *
 * Does NOT fix `pl.scan_csv`: the Pyodide wheel lacks `new-streaming`, so
 * any scan_*-sourced LazyFrame with a filter/head/group_by panics at any
 * file size, and buffering can't help something that never reads the file.
 * `scripts/check-polars-scan.mjs` counts what is left.
 */

/** Bytes above which a path-based read is buffered (half the measured
 *  1 MiB boundary). */
export const POLARS_MMAP_LIMIT = 512 * 1024;

/**
 * Python source installing the wrapper. Idempotent and safe to run before
 * the block's own import — it patches the module object in sys.modules.
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

/** Does this block import polars, in any spelling an author writes? */
export const POLARS_IMPORT_PATTERN =
  /^\s*(?:from\s+polars(?:\.[\w.]+)?\s+import\b|import\s+(?:[\w.]+\s*,\s*)*polars(?:\.[\w.]+)?(?:\s+as\s+\w+)?\s*(?:,|$|#))/m;
