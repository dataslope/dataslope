/**
 * Binary container codec for workspace bundles (format v2).
 *
 * A bundle on the wire is gzip(container), where the container is:
 *
 *   bytes 0–3    magic "DSB2"
 *   bytes 4–7    u32 little-endian header length H
 *   bytes 8…8+H  JSON header: the WorkspaceBundle minus `database`
 *   bytes 8+H…   raw database image (SQL bundles; empty for code bundles)
 *
 * Framing the image as raw bytes (instead of base64 inside the JSON) keeps
 * memory flat and lets one gzip pass compress header and image together, so
 * the server's existing gzip-magic check and `application/gzip` content type
 * (lib/workspaces/server.ts) are unchanged. PGlite images are uncompressed
 * tarballs by construction (`dumpDataDir("none")`) for the same reason:
 * compression happens exactly once, here.
 *
 * Isomorphic: CompressionStream/DecompressionStream and crypto.subtle exist
 * in browsers, Workers, and Node 18+, so tests can round-trip bundles.
 */

import {
  validateBundle,
  type WorkspaceBundle,
} from "./types";

const MAGIC = new Uint8Array([0x44, 0x53, 0x42, 0x32]); // "DSB2"

/** Sanity ceiling for the JSON header alone (tabs/files metadata, not the
 *  database image). Real headers are a few KB. */
const HEADER_MAX_BYTES = 8 * 1024 * 1024;

/** Upper bound on a bundle's decompressed size. The server only validates
 *  the *compressed* size, and a hostile share could otherwise expand a few
 *  MB of gzip into multiple GB in the recipient's tab. Database images
 *  (PGlite tarballs especially) are large before compression, hence the
 *  generous ceiling. */
export const MAX_DECOMPRESSED_BYTES = 400 * 1024 * 1024;

/** Thrown for any malformed/oversized bundle; `message` is user-facing. */
export class BundleCodecError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BundleCodecError";
  }
}

const CORRUPT = "This bundle is corrupted.";
const UNSUPPORTED = "This bundle is not supported.";
const TOO_LARGE = "This bundle is too large to open.";

/** Builds the uncompressed container for `bundle`. `exportedAt` can be
 *  overridden so the content hash ignores the save timestamp. */
function buildContainer(
  bundle: WorkspaceBundle,
  exportedAtOverride?: number,
): Uint8Array {
  const { database, ...header } = bundle;
  if (exportedAtOverride !== undefined) header.exportedAt = exportedAtOverride;
  const headerBytes = new TextEncoder().encode(JSON.stringify(header));
  const dbBytes = database ?? new Uint8Array(0);
  const out = new Uint8Array(8 + headerBytes.length + dbBytes.length);
  out.set(MAGIC, 0);
  new DataView(out.buffer).setUint32(4, headerBytes.length, true);
  out.set(headerBytes, 8);
  out.set(dbBytes, 8 + headerBytes.length);
  return out;
}

/** Serializes + gzips a bundle for upload. */
export async function encodeBundle(bundle: WorkspaceBundle): Promise<Blob> {
  const container = buildContainer(bundle);
  const stream = new Blob([container as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  return new Response(stream).blob();
}

/** Gunzips + parses + validates a downloaded bundle, re-attaching the
 *  database image. Throws BundleCodecError with a user-facing message. */
export async function decodeBundle(
  data: Blob,
  maxBytes: number = MAX_DECOMPRESSED_BYTES,
): Promise<WorkspaceBundle> {
  const reader = data
    .stream()
    .pipeThrough(new DecompressionStream("gzip"))
    .getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        void reader.cancel().catch(() => {});
        throw new BundleCodecError(TOO_LARGE);
      }
      chunks.push(value);
    }
  } catch (err) {
    if (err instanceof BundleCodecError) throw err;
    throw new BundleCodecError(CORRUPT);
  }
  const container = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    container.set(chunk, offset);
    offset += chunk.byteLength;
  }

  if (
    container.length < 8 ||
    container[0] !== MAGIC[0] ||
    container[1] !== MAGIC[1] ||
    container[2] !== MAGIC[2] ||
    container[3] !== MAGIC[3]
  ) {
    throw new BundleCodecError(UNSUPPORTED);
  }
  const headerLen = new DataView(
    container.buffer,
    container.byteOffset,
  ).getUint32(4, true);
  if (headerLen > HEADER_MAX_BYTES || 8 + headerLen > container.length) {
    throw new BundleCodecError(CORRUPT);
  }

  let doc: unknown;
  try {
    doc = JSON.parse(
      new TextDecoder().decode(container.subarray(8, 8 + headerLen)),
    );
  } catch {
    throw new BundleCodecError(CORRUPT);
  }
  const bundle = validateBundle(doc);
  if (!bundle) throw new BundleCodecError(UNSUPPORTED);

  const database = container.slice(8 + headerLen);
  if (bundle.kind === "sql") {
    // The declared length must match the binary section exactly; a mismatch
    // means truncation or tampering, and handing a half image to a database
    // engine produces far worse errors than failing here.
    if (database.length !== bundle.sql?.dbBytes) {
      throw new BundleCodecError(CORRUPT);
    }
    bundle.database = database;
  } else if (database.length !== 0) {
    throw new BundleCodecError(CORRUPT);
  }
  return bundle;
}

/**
 * Content hash of a bundle (hex SHA-256 over the uncompressed container with
 * `exportedAt` zeroed), used to skip re-uploading a byte-identical backup.
 * Hashing pre-gzip keeps the value independent of compressor quirks; zeroing
 * `exportedAt` keeps it independent of *when* the snapshot was taken.
 */
export async function bundleContentHash(
  bundle: WorkspaceBundle,
): Promise<string> {
  const container = buildContainer(bundle, 0);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    container as BufferSource,
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
