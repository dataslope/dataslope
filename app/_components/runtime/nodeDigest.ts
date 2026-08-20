/**
 * Correct `crypto.createHash` / `crypto.createHmac` digests for the
 * almostnode runtimes.
 *
 * almostnode's crypto shim computes a synchronous digest with a
 * non-cryptographic mixer that ignores the algorithm apart from its output
 * length: `md5("hi")` and `sha256("hi")` return the same 64 hex characters,
 * neither of which is a hash of anything, and an algorithm that does not
 * exist returns a digest rather than throwing. A wrong-looking answer is
 * recoverable; a plausible-looking wrong answer is a trap, so the digest
 * methods are replaced here with @noble/hashes (audited, synchronous, and
 * the same primitives WebCrypto would give asynchronously).
 *
 * The shim's module namespace is frozen, so the replacement patches the
 * `Hash`/`Hmac` prototypes — reached through one instance of each — which
 * is what every `createHash()` result inherits. `verifyDigestPatch` asserts
 * a known vector afterwards, so a change in the shim's shape fails loudly
 * instead of quietly restoring the old behaviour.
 */
import { hmac } from "@noble/hashes/hmac.js";
import { md5, ripemd160, sha1 } from "@noble/hashes/legacy.js";
import {
  sha224,
  sha256,
  sha384,
  sha512,
  sha512_224,
  sha512_256,
} from "@noble/hashes/sha2.js";
import { sha3_224, sha3_256, sha3_384, sha3_512 } from "@noble/hashes/sha3.js";

/** A @noble/hashes hash: callable for one-shot use, `.create()` to stream. */
type NobleHash = Parameters<typeof hmac>[0];

/** Node's OpenSSL digest names, keyed by their alphanumeric form so
 *  `sha256`, `SHA-256` and `sha_256` all resolve, as they do in Node. */
const ALGORITHMS: Record<string, NobleHash> = {
  md5,
  sha1,
  sha224,
  sha256,
  sha384,
  sha512,
  sha512224: sha512_224,
  sha512256: sha512_256,
  sha3224: sha3_224,
  sha3256: sha3_256,
  sha3384: sha3_384,
  sha3512: sha3_512,
  ripemd160,
  rmd160: ripemd160,
};

/** Names `crypto.getHashes()` should report, in Node's spelling. */
export const SUPPORTED_ALGORITHMS = [
  "md5",
  "ripemd160",
  "sha1",
  "sha224",
  "sha256",
  "sha384",
  "sha512",
  "sha512-224",
  "sha512-256",
  "sha3-224",
  "sha3-256",
  "sha3-384",
  "sha3-512",
];

/** The hash for a Node algorithm name, or null when there isn't one. */
export function resolveDigest(name: string): NobleHash | null {
  if (typeof name !== "string") return null;
  return ALGORITHMS[name.toLowerCase().replace(/[^a-z0-9]/g, "")] ?? null;
}

function unsupported(name: unknown): Error {
  // Node's message for an algorithm OpenSSL doesn't know.
  return new Error(`Digest method not supported: ${String(name)}`);
}

// ─── Encoding ───────────────────────────────────────────────────────────

const HEX = "0123456789abcdef";

export function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) out += HEX[byte >> 4] + HEX[byte & 15];
  return out;
}

function toBinaryString(bytes: Uint8Array): string {
  let out = "";
  // Chunked so a large digest can't blow the argument limit.
  for (let i = 0; i < bytes.length; i += 8192) {
    out += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return out;
}

function toBase64(bytes: Uint8Array, url: boolean): string {
  const b64 = btoa(toBinaryString(bytes));
  return url ? b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : b64;
}

function fromBase64(text: string): Uint8Array {
  const normalized = text.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function fromHex(text: string): Uint8Array {
  // Node stops at the first non-hex pair rather than throwing.
  const clean = /^[0-9a-fA-F]*$/.test(text) ? text : (/^[0-9a-fA-F]*/.exec(text)?.[0] ?? "");
  const len = clean.length >> 1;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
  return out;
}

function fromLatin1(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 0xff;
  return out;
}

/** Bytes for one `update()` argument, honouring Node's input encodings. */
export function bytesFrom(data: unknown, encoding?: string): Uint8Array {
  if (typeof data === "string") {
    switch ((encoding ?? "utf8").toLowerCase()) {
      case "hex":
        return fromHex(data);
      case "base64":
      case "base64url":
        return fromBase64(data);
      case "latin1":
      case "binary":
      case "ascii":
        return fromLatin1(data);
      default:
        return new TextEncoder().encode(data);
    }
  }
  if (data instanceof Uint8Array) return data;
  if (ArrayBuffer.isView(data)) {
    const view = data as ArrayBufferView;
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  }
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (Array.isArray(data)) return Uint8Array.from(data as number[]);
  throw new TypeError("The data argument must be a string, Buffer, or TypedArray");
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const chunk of chunks) total += chunk.length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/** Buffer constructor, as almostnode's `buffer` shim exposes it. */
interface BufferLike {
  from(data: Uint8Array): unknown;
}

/** Node returns a Buffer with no encoding, and a string with one. */
export function encodeDigest(
  bytes: Uint8Array,
  encoding: string | undefined,
  BufferImpl?: BufferLike,
): unknown {
  switch (encoding?.toLowerCase()) {
    case undefined:
    case "":
    case "buffer":
      return BufferImpl ? BufferImpl.from(bytes) : bytes;
    case "hex":
      return toHex(bytes);
    case "base64":
      return toBase64(bytes, false);
    case "base64url":
      return toBase64(bytes, true);
    case "latin1":
    case "binary":
      return toBinaryString(bytes);
    case "utf8":
    case "utf-8":
      return new TextDecoder().decode(bytes);
    default:
      return toHex(bytes);
  }
}

// ─── Patching almostnode's Hash / Hmac ──────────────────────────────────

interface ShimHash {
  algorithm: string;
  data: unknown[];
  update(data: unknown, encoding?: string): ShimHash;
  digest(encoding?: string): unknown;
  digestAsync(encoding?: string): Promise<unknown>;
}

interface ShimHmac extends ShimHash {
  key: unknown;
}

/** The crypto shim's surface this patch needs. */
export interface CryptoShim {
  createHash(algorithm: string): ShimHash;
  createHmac(algorithm: string, key: unknown): ShimHmac;
}

/** Chunks collected by `update()`, as bytes. */
function collected(target: ShimHash): Uint8Array {
  return concatBytes(target.data.map((chunk) => bytesFrom(chunk)));
}

/** @noble/hashes types its inputs as views over a non-shared buffer, which
 *  is all the worker ever has (SharedArrayBuffer needs cross-origin
 *  isolation the site doesn't set). */
function nobleBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  return bytes as Uint8Array<ArrayBuffer>;
}

function patchHashPrototype(proto: ShimHash, BufferImpl?: BufferLike): void {
  proto.update = function update(this: ShimHash, data: unknown, encoding?: string) {
    // Bytes, not the shim's Buffer-from-string, so an input encoding
    // ("hex", "base64", "latin1") means what it does in Node.
    this.data.push(bytesFrom(data, encoding));
    return this;
  };
  proto.digest = function digest(this: ShimHash, encoding?: string) {
    const hash = resolveDigest(this.algorithm);
    if (!hash) throw unsupported(this.algorithm);
    return encodeDigest(hash(nobleBytes(collected(this))), encoding, BufferImpl);
  };
  proto.digestAsync = function digestAsync(this: ShimHash, encoding?: string) {
    return Promise.resolve(this.digest(encoding));
  };
}

function patchHmacPrototype(proto: ShimHmac, BufferImpl?: BufferLike): void {
  proto.update = function update(this: ShimHmac, data: unknown, encoding?: string) {
    this.data.push(bytesFrom(data, encoding));
    return this;
  };
  proto.digest = function digest(this: ShimHmac, encoding?: string) {
    const hash = resolveDigest(this.algorithm);
    if (!hash) throw unsupported(this.algorithm);
    const mac = hmac(hash, nobleBytes(bytesFrom(this.key)), nobleBytes(collected(this)));
    return encodeDigest(mac, encoding, BufferImpl);
  };
  proto.digestAsync = function digestAsync(this: ShimHmac, encoding?: string) {
    return Promise.resolve(this.digest(encoding));
  };
}

/**
 * Replace the shim's digest methods with real ones. Idempotent, and safe to
 * call before any user code runs: it only touches the two prototypes.
 */
export function installNodeDigests(crypto: CryptoShim, BufferImpl?: BufferLike): void {
  const hashProto = Object.getPrototypeOf(crypto.createHash("sha256")) as ShimHash;
  patchHashPrototype(hashProto, BufferImpl);
  const hmacProto = Object.getPrototypeOf(crypto.createHmac("sha256", "key")) as ShimHmac;
  patchHmacPrototype(hmacProto, BufferImpl);
}

/** FIPS-180 vector for SHA-256, the canonical "is this a real hash" check. */
export const SHA256_ABC =
  "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

/** True when the patch took: `createHash` now returns real digests. Used to
 *  fail loudly rather than ship a runtime that fabricates hashes. */
export function verifyDigestPatch(crypto: CryptoShim): boolean {
  try {
    return crypto.createHash("sha256").update("abc").digest("hex") === SHA256_ABC;
  } catch {
    return false;
  }
}
