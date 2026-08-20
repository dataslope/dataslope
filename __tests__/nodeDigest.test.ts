import { createHash, createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  bytesFrom,
  encodeDigest,
  installNodeDigests,
  resolveDigest,
  SHA256_ABC,
  toHex,
  verifyDigestPatch,
} from "../app/_components/runtime/nodeDigest";

/** Digests through the module under test, the way the patched shim does. */
function digest(algorithm: string, input: string): string {
  const hash = resolveDigest(algorithm);
  if (!hash) throw new Error(`unsupported: ${algorithm}`);
  return toHex(hash(new TextEncoder().encode(input)));
}

const ALGORITHMS = [
  "md5",
  "sha1",
  "sha224",
  "sha256",
  "sha384",
  "sha512",
  "sha512-224",
  "sha512-256",
  "sha3-256",
  "sha3-512",
  "ripemd160",
];

describe("nodeDigest", () => {
  it("matches the canonical SHA-256 vector", () => {
    expect(digest("sha256", "abc")).toBe(SHA256_ABC);
  });

  it("agrees with Node for every supported algorithm", () => {
    const inputs = ["", "hi", "abc", "a".repeat(1000), "café 你好 🌊"];
    for (const algorithm of ALGORITHMS) {
      for (const input of inputs) {
        expect(digest(algorithm, input), `${algorithm}(${input.slice(0, 12)})`).toBe(
          createHash(algorithm).update(input, "utf8").digest("hex"),
        );
      }
    }
  });

  it("accepts the same spellings of an algorithm name Node does", () => {
    for (const spelling of ["sha256", "SHA256", "SHA-256", "sha-256"]) {
      expect(digest(spelling, "abc")).toBe(SHA256_ABC);
    }
  });

  it("has no hash for an algorithm that does not exist", () => {
    expect(resolveDigest("notarealalgorithm")).toBeNull();
    expect(resolveDigest("sha257")).toBeNull();
  });

  it("decodes update() input encodings the way Node does", () => {
    expect(bytesFrom("6869", "hex")).toEqual(new Uint8Array([0x68, 0x69]));
    expect(bytesFrom("aGk=", "base64")).toEqual(new Uint8Array([0x68, 0x69]));
    expect(bytesFrom("hi", "latin1")).toEqual(new Uint8Array([0x68, 0x69]));
    expect(bytesFrom("hi")).toEqual(new Uint8Array([0x68, 0x69]));
  });

  it("encodes a digest the way Node does", () => {
    const bytes = new Uint8Array([0xba, 0x78, 0x16, 0xbf]);
    const nodeDigest = Buffer.from(bytes);
    expect(encodeDigest(bytes, "hex")).toBe(nodeDigest.toString("hex"));
    expect(encodeDigest(bytes, "base64")).toBe(nodeDigest.toString("base64"));
    expect(encodeDigest(bytes, "base64url")).toBe(nodeDigest.toString("base64url"));
    expect(encodeDigest(bytes, "latin1")).toBe(nodeDigest.toString("latin1"));
    // No encoding is a Buffer in Node; the shim hands us its own Buffer.
    expect(encodeDigest(bytes, undefined)).toEqual(bytes);
    expect(encodeDigest(bytes, undefined, { from: (b: Uint8Array) => Buffer.from(b) })).toEqual(
      nodeDigest,
    );
  });
});

/** A stand-in for almostnode's shim: same shape (algorithm + data chunks on
 *  the instance, methods on the prototype), same fabricated digest. */
class FakeHash {
  algorithm: string;
  data: unknown[] = [];
  constructor(algorithm: string) {
    this.algorithm = algorithm.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^SHA(\d)/, "SHA-$1");
  }
  update(data: unknown): FakeHash {
    this.data.push(data);
    return this;
  }
  digest(_encoding?: string): unknown {
    return "0".repeat(64);
  }
  digestAsync(encoding?: string): Promise<unknown> {
    return Promise.resolve(this.digest(encoding));
  }
}

class FakeHmac extends FakeHash {
  key: unknown;
  constructor(algorithm: string, key: unknown) {
    super(algorithm);
    this.key = key;
  }
}

function fakeCryptoShim() {
  return {
    createHash: (algorithm: string) => new FakeHash(algorithm),
    createHmac: (algorithm: string, key: unknown) => new FakeHmac(algorithm, key),
  };
}

describe("installNodeDigests", () => {
  it("replaces fabricated digests with real ones", () => {
    const crypto = fakeCryptoShim();
    expect(verifyDigestPatch(crypto)).toBe(false);
    installNodeDigests(crypto);
    expect(verifyDigestPatch(crypto)).toBe(true);

    for (const algorithm of ["md5", "sha1", "sha256", "sha512"]) {
      expect(crypto.createHash(algorithm).update("hi").digest("hex")).toBe(
        createHash(algorithm).update("hi").digest("hex"),
      );
    }
    // MD5 is 128 bits: the shim used to return 64 hex characters for it.
    expect(crypto.createHash("md5").update("hi").digest("hex")).toHaveLength(32);
  });

  it("hashes chunked updates as one message", () => {
    const crypto = fakeCryptoShim();
    installNodeDigests(crypto);
    expect(
      crypto.createHash("sha256").update("he").update("ll").update("o").digest("hex"),
    ).toBe(createHash("sha256").update("hello").digest("hex"));
  });

  it("computes HMAC correctly", () => {
    const crypto = fakeCryptoShim();
    installNodeDigests(crypto);
    expect(crypto.createHmac("sha256", "k").update("hi").digest("hex")).toBe(
      createHmac("sha256", "k").update("hi").digest("hex"),
    );
    expect(crypto.createHmac("sha512", "secret").update("payload").digest("base64")).toBe(
      createHmac("sha512", "secret").update("payload").digest("base64"),
    );
  });

  it("throws for an algorithm that does not exist instead of returning a digest", () => {
    const crypto = fakeCryptoShim();
    installNodeDigests(crypto);
    expect(() => crypto.createHash("notarealalgorithm").update("hi").digest("hex")).toThrow(
      /not supported/i,
    );
  });

  it("resolves the digest asynchronously to the same value", async () => {
    const crypto = fakeCryptoShim();
    installNodeDigests(crypto);
    await expect(crypto.createHash("sha256").update("abc").digestAsync("hex")).resolves.toBe(
      SHA256_ABC,
    );
  });
});
