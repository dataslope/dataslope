/**
 * Base64 for the data files a code bundle carries.
 *
 * `btoa(String.fromCharCode(...bytes))` is the usual one-liner and blows the
 * argument limit somewhere around a few hundred KB, which a real uploaded
 * CSV comfortably exceeds — so both directions work in fixed-size chunks.
 * Isomorphic (`atob`/`btoa` exist in browsers, Workers and Node 16+), same
 * as the rest of `lib/workspaces`.
 */

/** Characters per chunk; a multiple of 3 so no chunk boundary lands inside
 *  a base64 group and produces stray padding. */
const CHUNK = 0x8000 * 3;

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}
