/**
 * Let a generator `import` the app's own TypeScript modules. Node 22 strips
 * types itself but does not resolve extensionless relative specifiers in ESM
 * (`from "./cdn"`), so this registers a resolve hook that tries the TS
 * extensions. Deliberately narrow: fires only for extensionless relative
 * specifiers with a matching file on disk, so it cannot shadow a package, a
 * builtin, or an explicit `.js` import.
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
