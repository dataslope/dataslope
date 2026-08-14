// Guards the synchronous XMLHttpRequest shim (scripts/lib/sync-http.mjs) that
// lets pyodide_http work in the Node sweeps. Exercised without Pyodide: what
// matters is that send() really blocks (an async transport would let every
// HTTP lesson "pass" having fetched nothing), bytes survive intact, and every
// global pyodide_http reads at import exists — a missing one makes patch_all
// swallow the ImportError and patch nothing. The test server runs on its own
// thread because send() blocks in Atomics.wait; a same-thread server could
// never accept the connection.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Worker } from "node:worker_threads";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { installSyncHttp } from "../scripts/lib/sync-http.mjs";

interface XHRLike {
  status: number;
  response: unknown;
  responseText: string;
  responseType: string;
  open(method: string, url: string, isAsync: boolean): void;
  setRequestHeader(name: string, value: string): void;
  send(body?: unknown): void;
  getAllResponseHeaders(): string;
}

// Every byte 0x00-0xff, the payload a lossy text round-trip mangles.
const BINARY = Buffer.from(Array.from({ length: 256 }, (_, i) => i));

const SERVER = `
const { createServer } = require("node:http");
const { parentPort } = require("node:worker_threads");
const { gzipSync } = require("node:zlib");

const BINARY = Buffer.from(Array.from({ length: 256 }, (_, i) => i));
const hits = new Map();
const lastHeaders = {};

const server = createServer((req, res) => {
  const path = req.url.split("?")[0];
  if (path !== "/__hits") {
    hits.set(path, (hits.get(path) || 0) + 1);
    Object.assign(lastHeaders, req.headers);
  }

  if (path === "/__hits") {
    const want = new URL(req.url, "http://x").searchParams.get("path");
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(String(hits.get(want) || 0));
    return;
  }
  if (path === "/__lastheader") {
    const name = new URL(req.url, "http://x").searchParams.get("name");
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(String(lastHeaders[name] ?? ""));
    return;
  }
  if (path === "/bytes") {
    res.writeHead(200, { "Content-Type": "application/octet-stream" });
    res.end(BINARY);
    return;
  }
  if (path === "/gzipped") {
    // A text body the server compresses on the wire. fetch inflates it and
    // leaves content-encoding behind; the shim must not report that header.
    const body = gzipSync(Buffer.from("species,island\\nAdelie,Torgersen\\n"));
    res.writeHead(200, { "Content-Type": "text/csv", "Content-Encoding": "gzip" });
    res.end(body);
    return;
  }
  if (path === "/echo") {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      res.writeHead(200, { "Content-Type": "text/plain", "X-Custom": "kept" });
      res.end(Buffer.concat(chunks));
    });
    return;
  }
  if (path === "/missing") {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("nope");
    return;
  }
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("hello");
});

server.listen(0, "127.0.0.1", () => {
  parentPort.postMessage({ port: server.address().port });
});
`;

let serverWorker: Worker;
let origin: string;
let uninstall: () => void;
let cacheDir: string;

const xhr = () =>
  new (globalThis as unknown as { XMLHttpRequest: new () => XHRLike }).XMLHttpRequest();

/** Blocking GET returning the body as text. */
function get(url: string): XHRLike {
  const x = xhr();
  x.open("GET", url, false);
  x.send();
  return x;
}

// Probe routes must not be cached or every cache assertion below passes
// vacuously; the cache keys on the full URL, so a nonce bypasses it.
let nonce = 0;
const uncached = (path: string) => `${origin}${path}${path.includes("?") ? "&" : "?"}n=${nonce++}`;

const hitsFor = (path: string) =>
  Number(get(uncached(`/__hits?path=${encodeURIComponent(path)}`)).responseText);

beforeAll(async () => {
  serverWorker = new Worker(SERVER, { eval: true });
  const port = await new Promise<number>((resolve, reject) => {
    serverWorker.once("message", (m: { port: number }) => resolve(m.port));
    serverWorker.once("error", reject);
  });
  origin = `http://127.0.0.1:${port}`;
  cacheDir = mkdtempSync(join(tmpdir(), "sync-http-"));
  uninstall = installSyncHttp({ cacheDir });
});

afterAll(async () => {
  uninstall?.();
  rmSync(cacheDir, { recursive: true, force: true });
  await serverWorker?.terminate();
});

describe("installSyncHttp globals", () => {
  it("defines everything pyodide_http reads at import time", () => {
    // All three are read via `from js import …`; a missing one means
    // patch_all swallows the ImportError and patches nothing.
    expect(typeof globalThis.XMLHttpRequest).toBe("function");
    expect(typeof (globalThis as { importScripts?: unknown }).importScripts).toBe("function");
    expect(globalThis.crossOriginIsolated).toBe(false);
  });

  it("reports crossOriginIsolated false, matching the site", () => {
    // The site serves no COOP/COEP headers, so this is false in the reader's
    // worker too; pyodide_http then takes the XHR path rather than SAB streaming.
    expect(globalThis.crossOriginIsolated).toBe(false);
  });
});

describe("synchronous transport", () => {
  it("returns the body from send(), with no await anywhere", () => {
    const x = get(`${origin}/hello`);
    // If this were async, status would still be 0 here — the failure that
    // would let every HTTP lesson pass having fetched nothing.
    expect(x.status).toBe(200);
    expect(x.responseText).toBe("hello");
  });

  it("rejects an async request rather than faking one", () => {
    const x = xhr();
    expect(() => x.open("GET", `${origin}/hello`, true)).toThrow(/synchronous/);
  });

  it("round-trips all 256 byte values through responseType=arraybuffer", () => {
    const x = xhr();
    x.responseType = "arraybuffer";
    x.open("GET", `${origin}/bytes`, false);
    x.send();
    // The non-worker branch of pyodide_http decodes via ISO-8859-15, which is
    // not byte-transparent; the arraybuffer path this shim presents is.
    expect(Buffer.from(x.response as Uint8Array).equals(BINARY)).toBe(true);
  });

  it("sends request headers and a body", () => {
    const x = xhr();
    x.open("POST", `${origin}/echo`, false);
    x.setRequestHeader("X-Test", "abc");
    x.send(new TextEncoder().encode("payload"));
    expect(x.status).toBe(200);
    expect(x.responseText).toBe("payload");
    expect(get(uncached("/__lastheader?name=x-test")).responseText).toBe("abc");
  });

  it("exposes response headers in the CRLF block pyodide_http parses", () => {
    const x = xhr();
    x.open("POST", `${origin}/echo`, false);
    x.send(new TextEncoder().encode(""));
    const raw = x.getAllResponseHeaders();
    expect(raw).toContain("x-custom: kept\r\n");
    expect(raw.endsWith("\r\n")).toBe(true);
  });

  it("omits content-encoding, because the body it returns is already decoded", () => {
    const x = xhr();
    x.responseType = "arraybuffer";
    x.open("GET", `${origin}/gzipped`, false);
    x.send();
    // fetch inflates the body but leaves the header on; reporting it made
    // urllib gunzip plain bytes ("BadGzipFile: Not a gzipped file").
    const raw = x.getAllResponseHeaders().toLowerCase();
    expect(raw).not.toContain("content-encoding");
    expect(raw).not.toContain("content-length");
    expect(Buffer.from(x.response as Uint8Array).toString()).toContain("species,island");
  });

  it("surfaces an HTTP error status instead of throwing", () => {
    // A 404 is a response, not a transport failure; urllib turns it into
    // HTTPError itself.
    const x = get(`${origin}/missing`);
    expect(x.status).toBe(404);
    expect(x.responseText).toBe("nope");
  });

  it("throws on a genuine transport failure", () => {
    const x = xhr();
    // Port 1 on localhost refuses connections.
    x.open("GET", "http://127.0.0.1:1/nope", false);
    expect(() => x.send()).toThrow(/sync-http/);
  });
});

describe("GET cache", () => {
  it("serves a repeat GET without hitting the server again", () => {
    const url = `${origin}/cache-me`;
    expect(get(url).responseText).toBe("hello");
    const afterFirst = hitsFor("/cache-me");

    const second = get(url);
    expect(second.status).toBe(200);
    expect(second.responseText).toBe("hello");
    // A sweep re-run should be offline and instant, the way declared datasets
    // already are.
    expect(hitsFor("/cache-me")).toBe(afterFirst);
  });

  it("does not cache a POST", () => {
    const before = hitsFor("/echo");
    for (let i = 0; i < 2; i += 1) {
      const x = xhr();
      x.open("POST", `${origin}/echo`, false);
      x.send(new TextEncoder().encode("x"));
    }
    expect(hitsFor("/echo")).toBe(before + 2);
  });
});
