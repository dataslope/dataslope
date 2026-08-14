/**
 * A synchronous `XMLHttpRequest` for Pyodide-in-Node, so `pyodide_http` works
 * as it does in the reader's browser. Without it, `patch_all()` "succeeds"
 * against an XHR that isn't there and HTTP falls through to a raw socket with
 * no TLS. `urlopen` is synchronous by contract, so nothing short of a
 * genuinely blocking transport keeps the code under test unchanged.
 *
 * Blocking works by fetching on a worker thread while the caller waits with
 * `Atomics.wait` (legal on Node's main thread); the payload comes back over a
 * `MessageChannel` via `receiveMessageOnPort`, which reads a delivered
 * message without yielding.
 *
 * The shim presents pyodide_http's *worker* shape (`importScripts` defined,
 * `responseType = "arraybuffer"`) — what readers get, and the only path that
 * survives binary data: the non-worker branch round-trips the body through
 * ISO-8859-15, which is not byte-transparent.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { MessageChannel, Worker, receiveMessageOnPort } from "node:worker_threads";

/** Fetches on a worker thread, signals completion through shared memory, and
 *  hands the payload back over a port. */
const FETCH_WORKER = `
const { parentPort, workerData } = require("node:worker_threads");
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { createHash } = require("node:crypto");
const { join } = require("node:path");

const signal = new Int32Array(workerData.signal);
const port = workerData.port;
const cacheDir = workerData.cacheDir;

const cachePath = (url) =>
  join(cacheDir, createHash("sha256").update(url).digest("hex").slice(0, 32));

parentPort.on("message", async (req) => {
  let payload;
  try {
    // Only plain GETs are cached, and only successes. A sweep re-run is then
    // offline and instant, matching how declared datasets already behave.
    const cacheable = req.method === "GET" && !req.body && cacheDir;
    const file = cacheable ? cachePath(req.url) : null;
    if (file && existsSync(file)) {
      const cached = JSON.parse(readFileSync(file, "utf8"));
      payload = {
        ok: true,
        status: cached.status,
        statusText: cached.statusText,
        headers: cached.headers,
        body: Uint8Array.from(Buffer.from(cached.body, "base64")),
      };
    } else {
      const res = await fetch(req.url, {
        method: req.method,
        headers: req.headers,
        body: req.body ?? undefined,
        redirect: "follow",
      });
      const body = new Uint8Array(await res.arrayBuffer());
      // XHR reports headers as a CRLF-delimited block; pyodide_http parses it
      // with email.parser, which wants exactly that shape.
      //
      // content-encoding and content-length are dropped because both describe
      // the bytes on the wire, and what we hand back are the decoded ones:
      // fetch has already inflated the body. A browser's
      // getAllResponseHeaders() omits them for exactly that reason, Node's
      // fetch keeps them, and keeping them is not cosmetic — urllib believes
      // the header, so a plain CSV served with "content-encoding: gzip" came
      // back as "BadGzipFile: Not a gzipped file (b'sp')", the 'sp' being the
      // start of the CSV's own "species" column.
      const OMIT = new Set(["content-encoding", "content-length"]);
      let headers = "";
      res.headers.forEach((v, k) => {
        if (!OMIT.has(k.toLowerCase())) headers += k + ": " + v + "\\r\\n";
      });
      payload = { ok: true, status: res.status, statusText: res.statusText, headers, body };
      if (file && res.ok) {
        mkdirSync(cacheDir, { recursive: true });
        writeFileSync(
          file,
          JSON.stringify({
            url: req.url,
            status: res.status,
            statusText: res.statusText,
            headers,
            body: Buffer.from(body).toString("base64"),
          }),
        );
      }
    }
  } catch (err) {
    payload = { ok: false, error: String(err?.message ?? err) };
  }
  port.postMessage(payload);
  Atomics.store(signal, 0, 1);
  Atomics.notify(signal, 0);
});
`;

/**
 * Define a synchronous `XMLHttpRequest` (and the `importScripts` marker
 * `pyodide_http` uses to detect a worker) on `globalThis`, where Pyodide's
 * `js` module will find them.
 *
 * @param {object} [opts]
 * @param {string|null} [opts.cacheDir] directory for the GET cache, or null to
 *   disable caching.
 * @returns {() => void} teardown, which removes the globals and stops the
 *   worker.
 */
export function installSyncHttp({ cacheDir = join(".dataset-cache", "http") } = {}) {
  if (cacheDir) mkdirSync(cacheDir, { recursive: true });

  const signal = new Int32Array(new SharedArrayBuffer(4));
  const { port1, port2 } = new MessageChannel();
  const worker = new Worker(FETCH_WORKER, {
    eval: true,
    workerData: { signal: signal.buffer, port: port2, cacheDir },
    transferList: [port2],
  });
  // Never hold the process open; the sweep's own lifetime bounds this.
  worker.unref();

  function requestSync(method, url, headers, body) {
    Atomics.store(signal, 0, 0);
    worker.postMessage({ method, url, headers, body });
    // Blocks this thread until the worker stores 1. `Atomics.wait` returns
    // "not-equal" if the worker beat us here, which is a completed request
    // either way.
    Atomics.wait(signal, 0, 0);
    const received = receiveMessageOnPort(port1);
    if (!received) throw new Error("sync-http: worker signalled but sent no message");
    return received.message;
  }

  class NodeSyncXMLHttpRequest {
    constructor() {
      this.status = 0;
      this.statusText = "";
      this.response = null;
      this.responseText = "";
      this.responseType = "";
      this.timeout = 0;
      this._method = "GET";
      this._url = "";
      this._headers = {};
      this._responseHeaders = "";
    }

    open(method, url, isAsync) {
      // pyodide_http always passes false. Anything else would need a real
      // event loop and would silently return an empty response if faked.
      if (isAsync) throw new Error("sync-http: only synchronous requests are supported");
      this._method = String(method ?? "GET").toUpperCase();
      this._url = String(url);
    }

    setRequestHeader(name, value) {
      this._headers[String(name)] = String(value);
    }

    overrideMimeType() {
      // Only reached on the non-worker branch, which this shim does not take.
    }

    send(body) {
      // The body arrives as a JS view over WASM memory, which the worker must
      // not receive by reference: the heap can move under it. Copy first.
      let payloadBody;
      if (body !== null && body !== undefined) {
        payloadBody = ArrayBuffer.isView(body)
          ? new Uint8Array(body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength))
          : body;
      }
      const result = requestSync(this._method, this._url, this._headers, payloadBody);
      if (!result.ok) {
        // Surfaces as a Python-side exception through pyodide_http, which is
        // what a browser XHR failure does too.
        throw new Error(`sync-http: ${this._method} ${this._url} failed: ${result.error}`);
      }
      this.status = result.status;
      this.statusText = result.statusText;
      this._responseHeaders = result.headers;
      if (this.responseType === "arraybuffer") {
        this.response = result.body;
      } else {
        const text = Buffer.from(result.body).toString("latin1");
        this.response = text;
        this.responseText = text;
      }
    }

    getAllResponseHeaders() {
      return this._responseHeaders;
    }
  }

  const previous = {
    XMLHttpRequest: globalThis.XMLHttpRequest,
    importScripts: globalThis.importScripts,
    crossOriginIsolated: globalThis.crossOriginIsolated,
  };

  // All three globals are read via `from js import …` and must exist before
  // `import pyodide_http` — the package decides once, at import time, whether
  // to patch anything (`_SHOULD_PATCH`).
  globalThis.XMLHttpRequest = NodeSyncXMLHttpRequest;

  // Present only so `pyodide_http` takes its in-worker branch, the one
  // readers get. Never called.
  globalThis.importScripts = () => {
    throw new Error("sync-http: importScripts is a marker, not an implementation");
  };

  // `pyodide_http._streaming` reads this at import; a missing name is an
  // ImportError that `patch_all(continue_on_import_error=True)` swallows,
  // leaving nothing patched. False is also the honest value: the site serves
  // no COOP/COEP headers, so readers' workers are not cross-origin isolated
  // either, and everything takes the same synchronous XHR path.
  globalThis.crossOriginIsolated = false;

  return function uninstallSyncHttp() {
    globalThis.XMLHttpRequest = previous.XMLHttpRequest;
    globalThis.importScripts = previous.importScripts;
    globalThis.crossOriginIsolated = previous.crossOriginIsolated;
    port1.close();
    worker.terminate();
  };
}

/** Present so a caller can check the cache location without importing paths. */
export function httpCacheEntry(url, cacheDir = join(".dataset-cache", "http")) {
  const file = join(cacheDir, createHash("sha256").update(url).digest("hex").slice(0, 32));
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
}
