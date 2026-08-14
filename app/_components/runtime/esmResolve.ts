// Bare-import → esm.sh URL mapping for the React preview bundler. Every
// bare specifier rewrites to an esm.sh URL and stays external; the browser
// fetches modules directly inside the preview iframe. React is pinned, and
// every OTHER package gets `?deps=react@<pin>` so transitive react peers
// resolve to the same instance — two copies break hooks ("Invalid hook
// call"). Keep REACT_VERSION in step with the react major in package.json.

import { ESM_SH_ORIGIN } from "./cdn";

export const REACT_VERSION = "19.2.8";

/** Exact pins for these packages; everything else resolves to latest
 *  (course content should stick to the pinned set). */
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
  // react's own subpaths already resolve within the pinned package.
  const deps = packageName === "react" ? "" : `?deps=react@${REACT_VERSION}`;
  return `${ESM_SH_ORIGIN}/${packageName}${version}${subpath}${deps}`;
}
