import type {
  CompletionRequest,
  CompletionResult,
  EmitOutput,
  EntryFileInfo,
  ExampleSnippet,
  LanguageAdapter,
  LanguageRuntime,
  PackageInfo,
  RunOptions,
  HoverResult,
  PositionRequest,
  SignatureHelpResult,
} from "../types";
import { getWebFmt, WEB_FMT_2SPACE } from "./webFmt";
import {
  buildTsCompletionRequest,
  completeWithTsService,
  hoverWithTsService,
  signatureHelpWithTsService,
} from "./tsLanguageService";
import {
  cancelPreviewRun,
  composeWebDocument,
  hasHarnessMarker,
  newPreviewToken,
  runPreviewDocument,
} from "./webPreview";
import { TAILWIND_BROWSER_CDN } from "./cdn";

// The web (HTML/CSS/JS) playground runs on native browser primitives — no
// downloaded runtime. Each Run composes the entry document, injects a
// console bridge, and swaps it into a sandboxed `<iframe srcdoc>`; see
// runtime/webPreview.ts for the architecture and sandboxing rules.

// CodePen-style default workspace: three panes, implicit composition
// (see composeWebDocument), no <link>/<script src> boilerplate.
const DEFAULT_HTML = `<div class="card">
  <h1>Hello, Web Playground!</h1>
  <p>
    Edit any pane and press Run, the HTML, CSS, and JS tabs compose
    into one live page, CodePen-style.
  </p>
  <button id="greet">Click me</button>
</div>
`;

const DEFAULT_CSS = `body {
  font-family: system-ui, sans-serif;
  display: grid;
  place-items: center;
  min-height: 90vh;
  background: #f8fafc;
}

.card {
  background: white;
  padding: 2rem 3rem;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  text-align: center;
}

h1 {
  color: #0f172a;
  margin: 0 0 0.5rem;
}

p {
  color: #475569;
  max-width: 26rem;
}

button {
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1.25rem;
  font-size: 1rem;
  cursor: pointer;
}

button:hover {
  background: #1d4ed8;
}
`;

const DEFAULT_JS = `const button = document.querySelector("#greet");
let clicks = 0;

button.addEventListener("click", () => {
  clicks += 1;
  button.textContent = "Clicked " + clicks + (clicks === 1 ? " time" : " times");
});

console.log("Scripts run too, check the console output below.");
`;

const EXAMPLES: ExampleSnippet[] = [
  {
    key: "hello",
    title: "Hello, Web Page",
    desc: "The HTML/CSS/JS starter trio (CodePen-style)",
    code: DEFAULT_HTML,
    files: [
      { filename: "styles.css", content: DEFAULT_CSS },
      { filename: "script.js", content: DEFAULT_JS },
    ],
    entryFilename: "index.html",
  },
  {
    key: "multi_file",
    title: "Multi-File Page",
    desc: "index.html + styles.css + script.js",
    code: `<!doctype html>
<html>
  <head>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <main>
      <h1>Three files, one page</h1>
      <p>
        The <code>&lt;link&gt;</code> and <code>&lt;script src&gt;</code>
        tags below resolve to the other editor tabs.
      </p>
      <button id="greet">Say hello</button>
      <p id="message"></p>
    </main>
    <script src="script.js"></script>
  </body>
</html>
`,
    files: [
      {
        filename: "styles.css",
        content: `body {
  font-family: system-ui, sans-serif;
  margin: 2rem;
  color: #1e293b;
}

main {
  max-width: 32rem;
  margin: 0 auto;
}

button {
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1.25rem;
  font-size: 1rem;
  cursor: pointer;
}

button:hover {
  background: #1d4ed8;
}

#message {
  font-weight: 600;
  color: #16a34a;
}
`,
      },
      {
        filename: "script.js",
        content: `const button = document.querySelector("#greet");
const message = document.querySelector("#message");

button.addEventListener("click", () => {
  message.textContent = "Hello from script.js!";
  console.log("Button clicked at", new Date().toLocaleTimeString());
});
`,
      },
    ],
    entryFilename: "index.html",
  },
  {
    key: "dom_events",
    title: "DOM & Events",
    desc: "Query elements, react to clicks, update the page",
    code: `<!doctype html>
<html>
  <body>
    <h1>Click counter</h1>
    <button id="btn">Clicked 0 times</button>

    <script>
      const btn = document.querySelector("#btn");
      let count = 0;

      btn.addEventListener("click", () => {
        count += 1;
        btn.textContent = \`Clicked \${count} times\`;
        console.log("count is now", count);
      });

      console.log("Ready, click the button in the preview!");
    </script>
  </body>
</html>
`,
  },
  {
    key: "flexbox",
    title: "Flexbox Layout",
    desc: "A responsive row of cards with flexbox",
    code: `<!doctype html>
<html>
  <head>
    <style>
      body { font-family: system-ui, sans-serif; margin: 1.5rem; }
      .row {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
      }
      .card {
        flex: 1 1 140px;
        padding: 1.25rem;
        border-radius: 10px;
        color: white;
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <h1>Flexbox in action</h1>
    <div class="row">
      <div class="card" style="background:#3b82f6">flex: 1</div>
      <div class="card" style="background:#22c55e">flex: 1</div>
      <div class="card" style="background:#f59e0b">flex: 1</div>
    </div>
  </body>
</html>
`,
  },
  {
    key: "form",
    title: "Form Validation",
    desc: "Inputs, submit handling, and live feedback",
    code: `<!doctype html>
<html>
  <head>
    <style>
      body { font-family: system-ui, sans-serif; margin: 2rem; }
      input { padding: 0.4rem 0.6rem; font-size: 1rem; }
      .error { color: #dc2626; }
      .ok { color: #16a34a; }
    </style>
  </head>
  <body>
    <h1>Sign up</h1>
    <form id="signup">
      <label>
        Email:
        <input type="email" id="email" placeholder="ada@example.com" />
      </label>
      <button type="submit">Join</button>
    </form>
    <p id="feedback"></p>

    <script>
      const form = document.querySelector("#signup");
      const email = document.querySelector("#email");
      const feedback = document.querySelector("#feedback");

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (email.value.includes("@")) {
          feedback.textContent = "Welcome aboard, " + email.value + "!";
          feedback.className = "ok";
        } else {
          feedback.textContent = "That doesn't look like an email address.";
          feedback.className = "error";
        }
      });
    </script>
  </body>
</html>
`,
  },
  {
    key: "canvas",
    title: "Canvas Drawing",
    desc: "Draw shapes with the 2D canvas API",
    code: `<!doctype html>
<html>
  <body>
    <h1>Canvas</h1>
    <canvas id="scene" width="360" height="200"></canvas>

    <script>
      const ctx = document.querySelector("#scene").getContext("2d");

      // Sky and ground
      ctx.fillStyle = "#bae6fd";
      ctx.fillRect(0, 0, 360, 140);
      ctx.fillStyle = "#86efac";
      ctx.fillRect(0, 140, 360, 60);

      // Sun
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(300, 45, 25, 0, Math.PI * 2);
      ctx.fill();

      // House
      ctx.fillStyle = "#f87171";
      ctx.fillRect(70, 90, 90, 60);
      ctx.fillStyle = "#7c2d12";
      ctx.beginPath();
      ctx.moveTo(60, 90);
      ctx.lineTo(115, 55);
      ctx.lineTo(170, 90);
      ctx.closePath();
      ctx.fill();

      console.log("Scene drawn, 6 shapes on a 360×200 canvas.");
    </script>
  </body>
</html>
`,
  },
  {
    key: "tailwind",
    title: "Tailwind CSS",
    desc: "Utility classes via the in-browser compiler",
    code: `<!doctype html>
<html>
  <head>
    <!-- Tailwind's official in-browser compiler (a development-time
         tool, real projects compile Tailwind at build time). -->
    <script src="${TAILWIND_BROWSER_CDN}"></script>
  </head>
  <body class="bg-slate-100 font-sans">
    <main class="mx-auto mt-16 max-w-sm rounded-xl bg-white p-8 shadow-lg">
      <h1 class="text-2xl font-bold text-slate-900">Tailwind, no build step</h1>
      <p class="mt-2 text-slate-600">
        Utility classes compile on the fly, right in the preview.
      </p>
      <button
        class="mt-4 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
        onclick="console.log('Styled with Tailwind utilities!')"
      >
        Click me
      </button>
    </main>
  </body>
</html>
`,
  },
];

const PACKAGES: PackageInfo[] = [
  // No installable packages; external libraries load via CDN tags.
];

// Text extensions staged for composition & completion; anything else is
// kept as bytes so `<img src>` references can inline as data URIs.
const TEXT_FILE_RE = /\.(html?|css|js|mjs|cjs|json|svg|txt|md|xml)$/i;

class WebPreviewRuntime implements LanguageRuntime {
  private stagedText = new Map<string, string>();
  private stagedBinary = new Map<string, Uint8Array>();
  /** Slot the run in flight is rendering into, for `cancelRun`. */
  private activeHost: HTMLElement | null = null;

  /** Stop the page: the frame IS the program, so removing it ends the run
   *  even when the document has wedged itself in a loop. */
  async cancelRun(): Promise<void> {
    cancelPreviewRun(this.activeHost);
  }

  async prepareFileSystem(files: Map<string, Uint8Array>): Promise<void> {
    const text = new Map<string, string>();
    const binary = new Map<string, Uint8Array>();
    const decoder = new TextDecoder();
    for (const [path, bytes] of files) {
      if (TEXT_FILE_RE.test(path)) {
        try {
          text.set(path, decoder.decode(bytes));
          continue;
        } catch {
          // fall through to binary
        }
      }
      binary.set(path, bytes);
    }
    this.stagedText = text;
    this.stagedBinary = binary;
  }

  /** JS tabs get TypeScript-service completions, hover and parameter
   *  hints; HTML/CSS tabs use `@codemirror/lang-html` / `lang-css`'s own
   *  completion sources (wired per file in languageCompletion.ts). */
  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const req = this.serviceRequest(request);
    if (!req) return { list: [], replaceLength: 0 };
    return completeWithTsService(req);
  }

  hover(request: PositionRequest): Promise<HoverResult | null> {
    const req = this.serviceRequest(request);
    return req ? hoverWithTsService(req) : Promise.resolve(null);
  }

  signatureHelp(request: PositionRequest): Promise<SignatureHelpResult | null> {
    const req = this.serviceRequest(request);
    return req ? signatureHelpWithTsService(req) : Promise.resolve(null);
  }

  /** Null for anything but a script file. */
  private serviceRequest(request: PositionRequest) {
    const filename = request.filename ?? "";
    if (!/\.(js|mjs|cjs)$/i.test(filename)) return null;
    return buildTsCompletionRequest(
      this.stagedText,
      request.doc,
      filename,
      "script.js",
      request.offset,
    );
  }

  async run(
    code: string,
    emit: EmitOutput,
    options?: RunOptions,
  ): Promise<void> {
    // Consume-and-clear the staged snapshot so single-file blocks sharing
    // this runtime can't inherit another block's files.
    const textFiles = this.stagedText;
    const binaryFiles = this.stagedBinary;
    this.stagedText = new Map();
    this.stagedBinary = new Map();

    const token = newPreviewToken();
    const doc = composeWebDocument({
      entryHtml: code,
      token,
      textFiles,
      binaryFiles,
      tailwind: options?.previewTailwind,
      entryFile: options?.entryFilename ?? "index.html",
    });
    this.activeHost = options?.previewHost ?? null;
    await runPreviewDocument({
      doc,
      token,
      emit,
      previewHost: options?.previewHost,
      waitForHarness: hasHarnessMarker(code),
    });
  }
}

function findHtmlEntryFiles(
  files: { filename: string; content: string }[],
): EntryFileInfo[] {
  return files
    .filter((f) => /\.html?$/i.test(f.filename))
    .map((f) => ({ filename: f.filename, kind: "main" as const }));
}

/**
 * The document this workspace renders, composed from its sources alone —
 * pure, Node-safe and deterministic, so `<CodeBlock>` can put it in the
 * page's HTML. Goes through the same `composeWebDocument` as a real Run,
 * so preview and first Run agree by construction (webPreview.test.ts pins
 * that). The bridge token is supplied by the caller and derived from the
 * block, never random: this document must hydrate identically.
 */
function composeStaticWebPreview(
  sources: { filename: string; source: string }[],
  options: { entryFilename: string; token: string; tailwind?: boolean },
): string | null {
  const entry =
    sources.find((f) => f.filename === options.entryFilename) ?? sources[0];
  if (!entry) return null;
  // Mirrors the run path's staging; authored blocks carry no uploads, so
  // the binary half is empty and `<img src>` references stay as written.
  const textFiles = new Map<string, string>();
  for (const f of sources) {
    if (TEXT_FILE_RE.test(f.filename)) textFiles.set(f.filename, f.source);
  }
  return composeWebDocument({
    entryHtml: entry.source,
    token: options.token,
    textFiles,
    tailwind: options.tailwind,
    entryFile: entry.filename,
  });
}

export const webAdapter: LanguageAdapter = {
  id: "web",
  displayName: "Web Playground",
  logoText: "<>",
  documentTitle: "HTML Playground",
  readyStatus: "Web preview ready",
  runtimeInfo: {
    language: "HTML",
    version: "",
    engine: "Sandboxed iframe preview (native browser)",
    notes:
      "Pages render in a sandboxed iframe with a unique opaque origin, no runtime download at all. " +
      "The three tabs are the whole workspace: styles.css and script.js apply automatically, " +
      "CodePen-style, or reference either with <link>/<script src> in your HTML to place it " +
      "yourself. Console output and errors stream into the output panel, with locations in your " +
      "own files. The opaque origin means localStorage and sessionStorage are emulated in memory " +
      "and reset with the preview; cookies are unavailable.",
  },
  codeMirrorMode: "htmlmixed",
  codeMirrorModeForFile(filename) {
    if (/\.css$/i.test(filename)) return "css";
    if (/\.(js|mjs|cjs|json)$/i.test(filename)) return "javascript";
    if (/\.(xml|svg)$/i.test(filename)) return "xml";
    if (/\.html?$/i.test(filename)) return "htmlmixed";
    return undefined;
  },
  // web_fmt (markup_fmt/malva/biome) at 2-space indentation, keep in
  // sync with formatCode below.
  indentWidth: 2,
  examples: EXAMPLES,
  packages: PACKAGES,
  outputCapabilities: { preview: true, autoPreview: true },
  composeStaticPreview: composeStaticWebPreview,
  exportFormats: [
    { extension: "html", label: "HTML (.html)", mimeType: "text/html" },
  ],
  // A CSS or JS tab is not an HTML document; exporting it as one renamed
  // the file rather than converting it, and the browser then rendered
  // JavaScript as a text document.
  exportFormatsForFile(filename) {
    if (/\.css$/i.test(filename)) {
      return [{ extension: "css", label: "CSS (.css)", mimeType: "text/css" }];
    }
    if (/\.mjs$/i.test(filename)) {
      return [
        { extension: "mjs", label: "JavaScript module (.mjs)", mimeType: "text/javascript" },
      ];
    }
    if (/\.js$/i.test(filename)) {
      return [
        { extension: "js", label: "JavaScript (.js)", mimeType: "text/javascript" },
      ];
    }
    return undefined;
  },
  // The composed page is built on every Run; this is the same document
  // without the console bridge, which is the artifact someone opening an
  // Export menu in an HTML playground is looking for.
  exportProject: {
    label: "Page, with CSS and JS inlined",
    description: "One self-contained .html file that runs anywhere",
    extension: "html",
    mimeType: "text/html",
    compose(files, entryFilename) {
      const entry =
        files.find((f) => f.filename === entryFilename) ??
        files.find((f) => /\.html?$/i.test(f.filename));
      if (!entry) return null;
      const textFiles = new Map<string, string>();
      for (const f of files) {
        if (TEXT_FILE_RE.test(f.filename)) textFiles.set(f.filename, f.content);
      }
      return composeWebDocument({
        entryHtml: entry.content,
        token: "export",
        textFiles,
        entryFile: entry.filename,
        omitBridge: true,
      });
    },
  },
  exportBaseFilename: "index",
  defaultFileExtension: "html",
  // Fresh workspaces open as the CodePen trio, one editor per pane.
  defaultWorkspace: [
    { filename: "index.html", content: DEFAULT_HTML },
    { filename: "styles.css", content: DEFAULT_CSS },
    { filename: "script.js", content: DEFAULT_JS },
  ],
  splitEditors: true,
  // The split panes already show every file; a file tree would only confuse.
  hideFilesPane: true,
  // Fixed trio: hide "+ New file" so the three-pane shape stays put.
  disableAddFile: true,
  // No close/delete/duplicate/rename either: with no Files pane a closed
  // file would be unreachable, and the trio references itself by name, so
  // a rename silently breaks the composed page.
  lockWorkspaceFiles: true,
  // Run executes the composed preview, not a named file: bare "Run" label.
  simpleRunLabel: true,
  findEntryFiles: findHtmlEntryFiles,
  packagesFooter: (
    <>
      The preview is a real (sandboxed) browser page, bring in any
      library the way real pages do, with a CDN tag like{" "}
      <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
        &lt;script src=&quot;…&quot;&gt;&lt;/script&gt;
      </code>{" "}
      in your HTML. The Tailwind example shows the pattern.
    </>
  ),
  importSnippet: (name) => `<script src="${name}"></script>`,
  hasImport(code, name) {
    return code.includes(name);
  },
  async formatCode(code: string, filename?: string): Promise<string> {
    const { format } = await getWebFmt();
    return format(code, filename ?? "index.html", WEB_FMT_2SPACE);
  },
  async init(setLoadingMessage): Promise<LanguageRuntime> {
    // Nothing to download or instantiate, the browser is the runtime.
    setLoadingMessage("Preparing web preview…");
    return new WebPreviewRuntime();
  },
};
