/**
 * Let a generator `import` the app's own TypeScript modules.
 *
 * Node 22 strips types by itself, so `import { blockOutputKey } from
 * "../lib/blockOutputKey.ts"` already works — which is why
 * `build-block-outputs.mjs` can share that file rather than reimplement it.
 * What Node does *not* do is Node-resolution of extensionless specifiers in
 * ESM, so the moment a shared module imports a sibling the way app code
 * always does (`from "./cdn"`), the import fails.
 *
 * That one gap is the whole reason a generator would otherwise copy logic
 * out of the app and let it drift. `scripts/lib/python-output-capture.mjs`
 * is the standing example of the alternative, and AGENTS.md describes what
 * it costs. So: register a resolve hook that tries the TypeScript
 * extensions before giving up, and the generator gets the real module.
 *
 * Deliberately narrow. It only fires for relative specifiers that have no
 * extension at all and only when a matching file is actually on disk, so it
 * cannot shadow a package, a builtin, or an explicit `.js` import.
 */

import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const EXTENSIONS = [".ts", ".tsx"];

let registered = false;

/** Idempotent: a process that imports this twice registers one hook. */
export function enableTsResolution() {
  if (registered) return;
  registered = true;
  registerHooks({
    resolve(specifier, context, next) {
      const relative = specifier.startsWith("./") || specifier.startsWith("../");
      if (relative && !/\.[a-z0-9]+$/i.test(specifier) && context.parentURL) {
        const base = new URL(specifier, context.parentURL);
        for (const ext of EXTENSIONS) {
          if (existsSync(fileURLToPath(new URL(base.href + ext)))) {
            return next(specifier + ext, context);
          }
        }
      }
      return next(specifier, context);
    },
  });
}
