/**
 * Pins the wire format shared by the incremental cache's writer and reader —
 * a disagreement is not a build error, it is a cache the Worker cannot
 * decode, i.e. site-wide 500s with a green build. The deployed read path
 * cannot be exercised locally (`wrangler dev` re-renders instead of serving
 * from this cache), so these tests run the real class against a fake R2
 * binding as the substitute.
 */
import { brotliCompressSync, constants } from "node:zlib";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BROTLI_CACHE_MAGIC,
  BROTLI_CACHE_QUALITY,
  hasBrotliCacheMagic,
} from "../lib/cache/brotliCacheFormat";

/** The one R2 object the fake bucket holds, swapped per test. */
let stored: Uint8Array | null = null;
/** What `put` last wrote, so `set()` can be asserted on. */
let written: Uint8Array | null = null;

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => ({
    env: {
      NEXT_INC_CACHE_R2_BUCKET: {
        get: async () =>
          stored === null
            ? null
            : {
                arrayBuffer: async () =>
                  stored!.buffer.slice(
                    stored!.byteOffset,
                    stored!.byteOffset + stored!.byteLength,
                  ) as ArrayBuffer,
                uploaded: new Date("2026-08-14T00:00:00Z"),
              },
        put: async (_key: string, body: Uint8Array) => {
          written = body;
        },
        delete: async () => {},
      },
      NEXT_INC_CACHE_R2_PREFIX: undefined,
    },
  }),
}));

const { default: cache, NAME } = await import("../lib/cache/brotliR2IncrementalCache");
const { NAME: R2_CACHE_NAME } = await import(
  "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache"
);

/** A cache entry shaped like the real ones (see any `.open-next/cache/*.cache`). */
const entry = {
  type: "page",
  meta: { status: 200, headers: {} },
  html: "<!doctype html><html><head></head><body>lesson</body></html>",
  rsc: '0:{"f":[["",{"children":["__PAGE__",{}]}]]}',
  segmentData: { "/_full": '0:{"f":[["",{"children":["__PAGE__",{}]}]]}' },
};

/** Exactly what scripts/compress-cache.mjs writes: magic, then the brotli stream. */
function frame(value: unknown): Uint8Array {
  const body = brotliCompressSync(Buffer.from(JSON.stringify(value), "utf8"), {
    params: { [constants.BROTLI_PARAM_QUALITY]: BROTLI_CACHE_QUALITY },
  });
  return new Uint8Array([...BROTLI_CACHE_MAGIC, ...body]);
}

beforeEach(() => {
  stored = null;
  written = null;
});

describe("brotli cache framing", () => {
  it("cannot be confused with uncompressed JSON", () => {
    // The whole dual-format read rests on this: JSON may start with `{`, `[` or
    // whitespace, never with 0x00. If the magic's first byte ever stops being
    // NUL, an uncompressed entry could be misread as a compressed one.
    expect(BROTLI_CACHE_MAGIC[0]).toBe(0x00);
    for (const start of ["{", "[", " ", "\n", "\t"]) {
      expect(hasBrotliCacheMagic(new TextEncoder().encode(`${start}"x"`))).toBe(false);
    }
  });

  it("recognises its own output and rejects short input", () => {
    expect(hasBrotliCacheMagic(frame(entry))).toBe(true);
    expect(hasBrotliCacheMagic(new Uint8Array([0x00, 0x42]))).toBe(false);
    expect(hasBrotliCacheMagic(new Uint8Array())).toBe(false);
  });
});

describe("BrotliR2IncrementalCache", () => {
  it("keeps the stock R2 cache's name, or the deploy stops populating", async () => {
    // `populateCache` switches on the override's name; an unrecognized one
    // silently populates nothing → empty cache → site-wide 500s. Shipped
    // once. Pinned against the upstream constant, not a string literal, so
    // an upstream rename fails here instead of in a deploy.
    expect(NAME).toBe(R2_CACHE_NAME);
    expect(cache.name).toBe(R2_CACHE_NAME);
  });

  it("reads a brotli-compressed entry", async () => {
    stored = frame(entry);
    const result = await cache.get("/courses/x/y");
    expect(result?.value).toEqual(entry);
    expect(result?.lastModified).toBe(new Date("2026-08-14T00:00:00Z").getTime());
  });

  it("still reads an UNCOMPRESSED entry", async () => {
    // The failure this covers: a deploy whose Cloudflare build command was not
    // updated to run scripts/compress-cache.mjs. Every object in that build's
    // prefix is raw JSON, and a reader that assumed compression would 500 the
    // entire site. It must degrade to "the cache is merely as big as it was".
    stored = new TextEncoder().encode(JSON.stringify(entry));
    const result = await cache.get("/courses/x/y");
    expect(result?.value).toEqual(entry);
  });

  it("round-trips its own set() through get()", async () => {
    await cache.set("/courses/x/y", entry as never);
    expect(written).not.toBeNull();
    expect(hasBrotliCacheMagic(written!)).toBe(true);
    // A `set` that wrote a format this `get` could not read would be a trap for
    // whoever first adds a revalidating route.
    stored = written;
    expect((await cache.get("/courses/x/y"))?.value).toEqual(entry);
  });

  it("compresses substantially on a realistically-sized entry", () => {
    // Deliberately not the small `entry` fixture above: at ~250 bytes brotli's
    // fixed overhead dominates and the framed output is *larger* than the
    // input, which says nothing about the real cache. Production entries
    // average 2.2 MB of repetitive prerendered HTML and RSC, and measure ~17×
    // (`node scripts/analyze-cache.mjs --compress`). The bound here is loose on
    // purpose — this asserts the format is doing its job, not a ratio that will
    // drift with the corpus.
    const section = "<section class='prose'><h2>Heading</h2><p>Body text.</p></section>";
    const big = { ...entry, html: `<!doctype html><body>${section.repeat(2000)}</body>` };
    const raw = Buffer.byteLength(JSON.stringify(big), "utf8");
    expect(raw).toBeGreaterThan(100_000);
    expect(frame(big).length).toBeLessThan(raw / 5);
  });

  it("returns a miss rather than throwing on a corrupt entry", async () => {
    // One poisoned object must not take down requests for every other page.
    stored = new Uint8Array([...BROTLI_CACHE_MAGIC, 0xff, 0xff, 0xff, 0xff]);
    await expect(cache.get("/courses/x/y")).resolves.toBeNull();
  });

  it("returns null when the object is absent", async () => {
    stored = null;
    await expect(cache.get("/courses/x/y")).resolves.toBeNull();
  });
});
