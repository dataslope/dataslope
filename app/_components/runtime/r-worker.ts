/// <reference lib="webworker" />
export {};

// WebR runs inside a dedicated Web Worker so that:
//   1. Heavy R execution (package loading, model fitting, plotting) doesn't
//      block the main thread, keeping the UI responsive.
//   2. The WebR init (which may spin up its own internal worker) is isolated
//      from the main thread.
//
// Protocol (same shape as pyodide-worker.ts):
//   Main → Worker  { kind: "init" }
//                  { kind: "run"; id: number; code: string }
//   Worker → Main  { kind: "loading"; message: string }
//                  { kind: "ready" }
//                  { kind: "init-error"; message: string }
//                  { kind: "output"; id: number; cell: OutputCellMessage }
//                  { kind: "done"; id: number }
//                  { kind: "error"; id: number; message: string }

// Minimal WebR type shims — importing from "webr" directly conflicts with
// the webworker lib that's needed for OffscreenCanvas. We only type the
// surface area we actually call.
interface RObjectProxy {
  type(): Promise<string>;
  toJs(): Promise<unknown>;
}
interface CaptureROutput {
  type: string;
  data: unknown;
}
interface CaptureRResult {
  output: CaptureROutput[];
  images: ImageBitmap[];
  result: RObjectProxy;
}
interface ShelterInstance {
  captureR(
    code: string,
    options: { withAutoprint: boolean; captureGraphics: { width: number; height: number } },
  ): Promise<CaptureRResult>;
  purge(): Promise<void>;
}
interface WebRShelterConstructor {
  new (): Promise<ShelterInstance>;
}
interface WebRInstance {
  Shelter: WebRShelterConstructor;
  init(): Promise<void>;
  evalRVoid(code: string): Promise<void>;
  installPackages(pkgs: string[]): Promise<void>;
}

type OutputCellType = "stdout" | "stderr" | "html" | "image";
interface OutputCellMessage {
  type: OutputCellType;
  content: string;
}

type InMessage =
  | { kind: "init" }
  | { kind: "run"; id: number; code: string };

type OutMessage =
  | { kind: "loading"; message: string }
  | { kind: "ready" }
  | { kind: "init-error"; message: string }
  | { kind: "output"; id: number; cell: OutputCellMessage }
  | { kind: "done"; id: number }
  | { kind: "error"; id: number; message: string };

function post(msg: OutMessage) {
  self.postMessage(msg);
}

// ─── Helpers (ported from r.tsx, adapted for worker context) ───────────

const R_BUILTIN_PACKAGES = new Set([
  "base", "compiler", "datasets", "graphics", "grDevices", "grid",
  "methods", "parallel", "splines", "stats", "stats4", "tcltk",
  "tools", "utils", "translations",
]);

function extractLibraryCalls(code: string): string[] {
  const stripped = code
    .split("\n")
    .map((line) => {
      const idx = line.indexOf("#");
      return idx >= 0 ? line.slice(0, idx) : line;
    })
    .join("\n");

  const re =
    /\b(?:library|require|requireNamespace|loadNamespace)\s*\(\s*(?:"([^"]+)"|'([^']+)'|([A-Za-z_.][A-Za-z0-9_.]*))/g;
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(stripped)) !== null) {
    const name = m[1] ?? m[2] ?? m[3];
    if (!name) continue;
    if (!/^[A-Za-z][A-Za-z0-9_.]*$/.test(name)) continue;
    if (R_BUILTIN_PACKAGES.has(name)) continue;
    found.add(name);
  }
  return [...found];
}

// Uses OffscreenCanvas (available in workers) instead of document.createElement.
async function imageBitmapToPngBase64(bmp: ImageBitmap): Promise<string> {
  const canvas = new OffscreenCanvas(bmp.width, bmp.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context not available");
  ctx.drawImage(bmp, 0, 0);
  const blob = await canvas.convertToBlob({ type: "image/png" });
  const buf = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function dataFrameToHtml(rows: Record<string, unknown>[]): string | null {
  if (rows.length === 0) return null;
  const cols = Object.keys(rows[0] ?? {});
  if (cols.length === 0) return null;
  const escape = (v: unknown): string => {
    const s = v === null || v === undefined ? "" : String(v);
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  };
  const head = cols.map((c) => `<th>${escape(c)}</th>`).join("");
  const body = rows
    .map(
      (r) =>
        `<tr>${cols.map((c) => `<td>${escape(r[c])}</td>`).join("")}</tr>`,
    )
    .join("");
  return `<table class="dataframe"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function rowsFromDataFrame(value: unknown): Record<string, unknown>[] | null {
  if (!value || typeof value !== "object") return null;
  const v = value as { type?: string; names?: unknown; values?: unknown };
  if (v.type !== "list") return null;
  if (!Array.isArray(v.names) || !Array.isArray(v.values)) return null;
  const names = v.names as string[];
  const cols = v.values as unknown[];
  if (cols.length === 0 || cols.length !== names.length) return null;
  const arrays: unknown[][] = cols.map((c) => {
    if (Array.isArray(c)) return c as unknown[];
    if (
      c &&
      typeof c === "object" &&
      Array.isArray((c as { values?: unknown }).values)
    ) {
      return (c as { values: unknown[] }).values;
    }
    return [c];
  });
  const len = arrays[0].length;
  if (!arrays.every((a) => a.length === len)) return null;
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < len; i++) {
    const row: Record<string, unknown> = {};
    for (let j = 0; j < names.length; j++) {
      row[names[j]] = arrays[j][i];
    }
    rows.push(row);
  }
  return rows;
}

// ─── WebR state ─────────────────────────────────────────────────────────

let webR: WebRInstance | null = null;
let initPromise: Promise<void> | null = null;
const installedPackages = new Set<string>();

async function ensurePackages(code: string): Promise<string> {
  if (!webR) throw new Error("WebR is not initialised");
  const referenced = extractLibraryCalls(code);
  const toInstall = referenced.filter((p) => !installedPackages.has(p));
  if (toInstall.length === 0) return "";
  for (const p of toInstall) installedPackages.add(p);
  try {
    await webR.installPackages(toInstall);
    return "";
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Failed to auto-install R package(s) [${toInstall.join(", ")}]: ${msg}\n`;
  }
}

async function initWebR(): Promise<void> {
  post({ kind: "loading", message: "Loading WebR…" });
  // webr's published types reference DOM globals that conflict with the
  // webworker lib; suppress resolution here and rely on our local shim.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const { WebR } = (await import("webr")) as { WebR: new () => WebRInstance };

  post({ kind: "loading", message: "Initialising R runtime…" });
  webR = new WebR();
  await webR.init();

  post({ kind: "loading", message: "Configuring graphics device…" });
  await webR.evalRVoid(
    `options(device = function() webr::canvas(width = 720, height = 432, capture = TRUE))`,
  );

  post({ kind: "ready" });
}

async function runCode(id: number, code: string): Promise<void> {
  if (!webR) throw new Error("WebR is not initialised");

  const installWarnings = await ensurePackages(code);

  await webR.evalRVoid(
    `rm(list = ls(envir = .GlobalEnv, all.names = TRUE), envir = .GlobalEnv)`,
  );

  const shelter: ShelterInstance = await new webR.Shelter();
  try {
    const result = await shelter.captureR(code, {
      withAutoprint: true,
      captureGraphics: { width: 720, height: 432 },
    });

    let stdoutBuf = "";
    let stderrBuf = installWarnings;
    for (const o of result.output) {
      if (o.type === "stdout") stdoutBuf += String(o.data) + "\n";
      else if (o.type === "stderr") stderrBuf += String(o.data) + "\n";
    }
    if (stdoutBuf.trim())
      post({ kind: "output", id, cell: { type: "stdout", content: stdoutBuf.trim() } });
    if (stderrBuf.trim())
      post({ kind: "output", id, cell: { type: "stderr", content: stderrBuf.trim() } });

    for (const bmp of result.images) {
      const b64 = await imageBitmapToPngBase64(bmp);
      post({ kind: "output", id, cell: { type: "image", content: b64 } });
      bmp.close();
    }

    try {
      const t = await result.result.type();
      if (t === "list") {
        const js = (await result.result.toJs()) as unknown;
        const rows = rowsFromDataFrame(js);
        if (rows) {
          const html = dataFrameToHtml(rows);
          if (html) post({ kind: "output", id, cell: { type: "html", content: html } });
        }
      }
    } catch {
      /* not convertible — ignore */
    }
  } finally {
    await shelter.purge();
  }
}

// Serialise run requests — WebR is not reentrant.
let workQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = workQueue.then(task, task);
  workQueue = next.catch(() => {});
  return next;
}

self.addEventListener("message", (ev: MessageEvent<InMessage>) => {
  const msg = ev.data;

  if (msg.kind === "init") {
    if (!initPromise) {
      initPromise = initWebR().catch((err) => {
        post({
          kind: "init-error",
          message: err instanceof Error ? err.message : String(err),
        });
        throw err;
      });
    }
    return;
  }

  if (msg.kind === "run") {
    const { id, code } = msg;
    enqueue(async () => {
      try {
        if (initPromise) await initPromise;
        await runCode(id, code);
        post({ kind: "done", id });
      } catch (err) {
        post({
          kind: "error",
          id,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    });
    return;
  }
});
