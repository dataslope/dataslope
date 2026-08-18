/**
 * How a PHP run is handed to php-wasm.
 *
 * Kept out of the worker so it can be tested: the worker's module body
 * stubs browser globals and its runtime is a ~190 MB CDN download, neither
 * of which belongs in a unit test.
 */

/**
 * Prelude run before the reader's entry file.
 *
 * php-wasm evaluates a string, so `__FILE__` was the literal label
 * "php-wasm run script" and every diagnostic quoted it as if it were a
 * path, while an included file reported a real `/lib.php`. Requiring the
 * entry from the VFS instead gives the entry the same identity as any
 * other file: `__FILE__`, `__DIR__`, the warning text and every stack
 * frame agree, and `require __DIR__ . '/config.php'` works from either.
 *
 * The prelude also defines what the CLI SAPI would have. php-wasm runs the
 * `embed` SAPI, where STDIN/STDOUT/STDERR and `$argv` simply do not exist,
 * so `fwrite(STDERR, …)` — the standard way to write a diagnostic, and
 * common in pasted example code — was a fatal error on line 1.
 *
 * The required file keeps its own line numbering. `require` *does* add a
 * frame of its own to a stack trace, naming this wrapper; the output
 * router drops that frame and renumbers the rest, so a trace reads exactly
 * as PHP would have printed it without the wrapper.
 */
export function buildEntryScript(entryPath: string): string {
  const path = JSON.stringify(entryPath);
  return `<?php
if (!defined('STDIN')) { define('STDIN', fopen('php://stdin', 'r')); }
if (!defined('STDOUT')) { define('STDOUT', fopen('php://stdout', 'w')); }
if (!defined('STDERR')) { define('STDERR', fopen('php://stderr', 'w')); }
$argv = [${path}];
$argc = 1;
$_SERVER['argv'] = $argv;
$_SERVER['argc'] = 1;
$_SERVER['SCRIPT_FILENAME'] = ${path};
$_SERVER['SCRIPT_NAME'] = ${path};
$_SERVER['PHP_SELF'] = ${path};
require ${path};
`;
}

/**
 * php-wasm ships `pdo_pglite`, which registers a `pgsql` driver but needs a
 * PGlite class handed in by the embedder. Without one, `new PDO('pgsql:')`
 * aborts the whole run past any `catch`, and the abort used to be reported
 * as a successful `Done`. Recognised here so it reads as a failure with a
 * PHP-facing explanation.
 */
export const PGLITE_ABORT_RE = /The PGlite class must be provided as a constructor arg/i;

export const PGLITE_EXPLANATION =
  "PDO error: the pgsql driver is registered by the pdo_pglite extension, but no " +
  "database is wired up in this playground, and the failure aborts the script past " +
  "any catch block. PDO::getAvailableDrivers() is misleading here; there is no " +
  "working database driver.";
