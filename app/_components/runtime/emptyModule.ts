// Empty CommonJS stand-in used by `next.config.ts` to alias Node-only
// modules (`fs`, `path`, `crypto`) when bundling sql.js for the browser.
// sql.js's Emscripten preamble statically references those modules but
// only invokes them inside `if (process.env)` branches that are dead
// code in the browser, so an empty default export is enough to satisfy
// the resolver without changing runtime behaviour.

const emptyStub = {};
export default emptyStub;
export const readFileSync = () => {
  throw new Error("fs.readFileSync is not available in the browser");
};
export const existsSync = () => false;
export const mkdirSync = () => {
  throw new Error("fs.mkdirSync is not available in the browser");
};
export const join = (...parts: string[]) => parts.filter(Boolean).join("/");
export const resolve = (...parts: string[]) => join(...parts);
