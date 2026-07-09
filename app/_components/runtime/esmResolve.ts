// Bare-import → esm.sh URL mapping for the React preview bundler.
//
// esm.sh is a no-build CDN that serves npm packages as native ES
// modules; the esbuild worker rewrites every bare specifier in learner
// code to one of these URLs and marks it external, so the browser
// fetches the module directly inside the sandboxed preview iframe (the
// "import-map passthrough" variant from §5/§9 of the research report,
// no fetch-and-bundle step, each module cached by the browser).
//
// React itself is version-pinned for reproducible course content, and
// every OTHER package gets `?deps=react@<pin>` so esm.sh resolves any
// transitive react peer-dependency to the exact same module instance,
// two copies of react would break hooks with the infamous "Invalid hook
// call" error. Keep REACT_VERSION in step with the react major the repo
// itself uses (package.json), bumping deliberately alongside course
// content checks.

import { ESM_SH_ORIGIN } from "./cdn";

export const REACT_VERSION = "19.2.7";

/** Exact-version pins applied when learner code imports these packages.
 *  Everything else resolves to the package's latest published version
 *  (fine for exploratory playground use; course content should stick to
 *  the pinned set). */
const PINNED_VERSIONS: Record<string, string> = {
  react: REACT_VERSION,
  "react-dom": REACT_VERSION,
};

/** True for the module specifiers that need CDN resolution, anything
 *  that isn't a relative/absolute path or a full URL. */
export function isBareSpecifier(specifier: string): boolean {
  if (specifier.startsWith(".") || specifier.startsWith("/")) return false;
  if (/^https?:\/\//i.test(specifier)) return false;
  return true;
}

/** Split `@scope/pkg/sub/path` into package name and subpath. */
export function splitPackageSpecifier(specifier: string): {
  packageName: string;
  subpath: string;
} {
  const parts = specifier.split("/");
  const nameSegments = specifier.startsWith("@") ? 2 : 1;
  const packageName = parts.slice(0, nameSegments).join("/");
  const rest = parts.slice(nameSegments).join("/");
  return { packageName, subpath: rest ? `/${rest}` : "" };
}

/** Map a bare import from learner code to a pinned esm.sh URL. */
export function esmShUrlFor(specifier: string): string {
  const { packageName, subpath } = splitPackageSpecifier(specifier);
  const pin = PINNED_VERSIONS[packageName];
  const version = pin ? `@${pin}` : "";
  // Pin the shared react instance for everything except react itself
  // (react's own subpaths, jsx-runtime etc., already resolve within
  // the pinned package).
  const deps = packageName === "react" ? "" : `?deps=react@${REACT_VERSION}`;
  return `${ESM_SH_ORIGIN}/${packageName}${version}${subpath}${deps}`;
}
