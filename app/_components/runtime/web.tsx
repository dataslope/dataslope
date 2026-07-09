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
} from "../types";
import { getWebFmt, WEB_FMT_2SPACE } from "./webFmt";
import {
  buildTsCompletionRequest,
  completeWithTsService,
} from "./tsLanguageService";
import {
  composeWebDocument,
  hasHarnessMarker,
  newPreviewToken,
  runPreviewDocument,
} from "./webPreview";
import { TAILWIND_BROWSER_CDN } from "./cdn";

// The web (HTML/CSS/JS) playground runs on native browser primitives,
// no downloaded runtime at all. Each Run composes the workspace's entry
// document (inlining `<link>`/`<script src>` references to sibling
// tabs), injects a console bridge, and swaps the result into a
// sandboxed `<iframe srcdoc>` rendered by the surface's preview slot.
// Console output and uncaught errors stream back over postMessage as
// ordinary stdout/stderr cells. See runtime/webPreview.ts for the
// architecture and the sandboxing rules.

// The CodePen-style default workspace: three panes, three languages,
// implicit composition. The HTML pane is a body fragment, the CSS and
// JS tabs apply automatically (see composeWebDocument), no <link> or
// <script src> boilerplate required.
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
  // No installable packages, the preview is the platform. External
  // libraries load the way real pages load them: a `<script src>` /
  // `<link>` tag pointing at a CDN (see the Tailwind example).
];

// Text extensions staged for composition & completion; anything else is
// kept as bytes so `<img src>` references can inline as data URIs.
const TEXT_FILE_RE = /\.(html?|css|js|mjs|cjs|json|svg|txt|md|xml)$/i;

class WebPreviewRuntime implements LanguageRuntime {
  private stagedText = new Map<string, string>();
  private stagedBinary = new Map<string, Uint8Array>();

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

  /** JS tabs get real TypeScript-service completions (allowJs
   *  inference), matching the JavaScript adapter; HTML/CSS tabs rely on
   *  the CodeMirror language packages' built-in completion sources. */
  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const filename = request.filename ?? "";
    if (!/\.(js|mjs|cjs)$/i.test(filename)) {
      return { list: [], replaceLength: 0 };
    }
    return completeWithTsService(
      buildTsCompletionRequest(
        this.stagedText,
        request.doc,
        filename,
        "script.js",
        request.offset,
      ),
    );
  }

  async run(
    code: string,
    emit: EmitOutput,
    options?: RunOptions,
  ): Promise<void> {
    // Consume-and-clear the staged snapshot: surfaces that stage
    // (multi-file) always re-stage before each run, and surfaces that
    // don't (single-file blocks sharing this scope's runtime) must not
    // inherit another block's files.
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
    });
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
      "Root-level .css/.js tabs apply automatically, CodePen-style (reference a file explicitly with " +
      "<link>/<script src> to control its position instead); console output and errors stream into " +
      "the output panel.",
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
  outputCapabilities: { preview: true },
  exportFormats: [
    { extension: "html", label: "HTML (.html)", mimeType: "text/html" },
  ],
  exportBaseFilename: "index",
  defaultFileExtension: "html",
  // Fresh workspaces open as the CodePen trio with one always-visible
  // editor per pane (the playground's split view).
  defaultWorkspace: [
    { filename: "index.html", content: DEFAULT_HTML },
    { filename: "styles.css", content: DEFAULT_CSS },
    { filename: "script.js", content: DEFAULT_JS },
  ],
  splitEditors: true,
  // The split panes already show every file; a separate file tree with
  // nowhere to "open" files into would only confuse.
  hideFilesPane: true,
  // The HTML/CSS/JS playground is a fixed index.html / styles.css /
  // script.js trio, hide the "+ New file" affordances so the workspace
  // stays the CodePen-style three-pane shape.
  disableAddFile: true,
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
