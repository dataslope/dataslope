/**
 * isomorphic-git reads the global `Buffer` (~120 call sites, never imported),
 * which exists in Node but not in a browser worker. esbuild `inject`s this
 * module into the Git worker bundle, so every reference resolves to the
 * `buffer` package's implementation without a global assignment racing the
 * module graph.
 */
export { Buffer } from "buffer";
