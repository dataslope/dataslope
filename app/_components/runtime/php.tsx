import type {
  EmitOutput,
  ExampleSnippet,
  LanguageAdapter,
  LanguageRuntime,
  PackageInfo,
  RunOptions,
} from "../types";
import { getMagoFmt } from "./magoFmt";

// PHP (via php-wasm) runs inside a dedicated Web Worker, see php-worker.ts.

const EXAMPLES: ExampleSnippet[] = [
  {
    key: "hello",
    title: "Hello World",
    desc: "Basic echo, math & strings",
    code: `<?php
// Hello, PHP Playground!
echo "PHP " . PHP_VERSION . ", running entirely in your browser.\\n";
echo "π ≈ " . M_PI . "\\n";
echo "e ≈ " . M_E . "\\n\\n";

for ($i = 1; $i <= 5; $i++) {
    echo "  $i: " . str_repeat("★", $i) . "\\n";
}

$msg = "Hello, World!";
echo "\\n" . str_repeat("─", 30) . "\\n";
echo str_pad($msg, 30, " ", STR_PAD_BOTH) . "\\n";
echo str_repeat("─", 30) . "\\n";
`,
  },
  {
    key: "arrays",
    title: "Arrays",
    desc: "array_map / array_filter / array_reduce",
    code: `<?php
$sales = [
    ["product" => "Widget A", "region" => "North", "revenue" => 42000],
    ["product" => "Widget A", "region" => "South", "revenue" => 38000],
    ["product" => "Widget B", "region" => "North", "revenue" => 51000],
    ["product" => "Widget B", "region" => "South", "revenue" => 47000],
    ["product" => "Widget C", "region" => "North", "revenue" => 29000],
    ["product" => "Widget C", "region" => "South", "revenue" => 33000],
];

$totals = array_reduce($sales, function ($acc, $row) {
    $acc[$row["product"]] = ($acc[$row["product"]] ?? 0) + $row["revenue"];
    return $acc;
}, []);

echo "Revenue by product:\\n";
foreach ($totals as $name => $total) {
    echo "  " . str_pad($name, 10) . " $" . number_format($total) . "\\n";
}

$top = array_map(
    fn($r) => "{$r['product']} ({$r['region']})",
    array_filter($sales, fn($r) => $r["revenue"] >= 40000)
);

echo "\\nTop performers (>= \\$40k):\\n";
echo implode(", ", $top) . "\\n";
`,
  },
  {
    key: "classes",
    title: "Classes",
    desc: "Object-oriented PHP with iterators",
    code: `<?php
class Range implements IteratorAggregate
{
    public function __construct(
        private int $start,
        private int $end,
        private int $step = 1,
    ) {}

    public function getIterator(): Generator
    {
        for ($i = $this->start; $i < $this->end; $i += $this->step) {
            yield $i;
        }
    }

    public function map(callable $fn): array
    {
        return array_map($fn, iterator_to_array($this));
    }
}

$r = new Range(0, 10, 2);
echo "Range:   " . implode(", ", iterator_to_array($r)) . "\\n";
echo "Squared: " . implode(", ", $r->map(fn($x) => $x * $x)) . "\\n";
`,
  },
  {
    key: "json",
    title: "JSON",
    desc: "json_decode, transform, json_encode",
    code: `<?php
$raw = <<<'JSON'
[
  {"id": 1, "name": "Ada",   "score": 92},
  {"id": 2, "name": "Linus", "score": 88},
  {"id": 3, "name": "Grace", "score": 95},
  {"id": 4, "name": "Alan",  "score": 81}
]
JSON;

$people = json_decode($raw, true);

usort($people, fn($a, $b) => $b["score"] <=> $a["score"]);

$ranked = [];
foreach ($people as $idx => $p) {
    $ranked[] = ["rank" => $idx + 1, ...$p];
}

echo json_encode($ranked, JSON_PRETTY_PRINT) . "\\n";

$avg = array_sum(array_column($people, "score")) / count($people);
echo "\\nAverage score: " . number_format($avg, 1) . "\\n";
`,
  },
  {
    key: "strings",
    title: "String Manipulation",
    desc: "Regex, splitting, formatting",
    code: `<?php
$text = "The quick brown fox jumps over the lazy dog. "
      . "Pack my box with five dozen liquor jugs.";

// Word frequency
$words = preg_split('/\\W+/', strtolower(trim($text)));
$counts = array_count_values(array_filter($words));
arsort($counts);

echo "Top 5 words by frequency:\\n";
$i = 0;
foreach ($counts as $word => $n) {
    if ($i++ >= 5) break;
    echo "  " . str_pad($word, 8) . " $n\\n";
}

// Letter histogram
$letters = array_count_values(str_split(strtolower(preg_replace('/[^A-Za-z]/', '', $text))));
ksort($letters);
echo "\\nLetter counts:\\n";
foreach ($letters as $ch => $n) {
    echo "  $ch: " . str_repeat("█", $n) . " $n\\n";
}
`,
  },
  {
    key: "multifile",
    title: "Multi-file Project",
    desc: "require a helper file alongside index.php",
    code: `<?php
require_once __DIR__ . "/greetings.php";

echo hello("PHP Playground") . "\\n";
echo bye("PHP Playground") . "\\n";
`,
    files: [
      {
        filename: "greetings.php",
        content: `<?php
function hello(string $name): string {
    return "Hello, {$name}!";
}

function bye(string $name): string {
    return "Goodbye, {$name}!";
}
`,
      },
    ],
    entryFilename: "index.php",
  },
];

const PACKAGES: PackageInfo[] = [
  // The whole PHP stdlib is globally available; nothing to install.
];

// ─── Worker-based runtime ────────────────────────────────────────────────

type WorkerOutMessage =
  | { kind: "loading"; message: string }
  | { kind: "ready" }
  | { kind: "init-error"; message: string }
  | {
      kind: "output";
      id: number;
      cell: { type: string; content: string };
      seq: number;
      append: boolean;
    }
  | { kind: "created-files"; id: number; files: Array<[string, Uint8Array]> }
  | { kind: "done"; id: number }
  | { kind: "error"; id: number; message: string; fatal?: boolean }
  | { kind: "prepare-fs-done"; id: number }
  | { kind: "prepare-fs-error"; id: number; message: string };

/**
 * How long a run may take before the host stops it.
 *
 * `max_execution_time` is 0 in this build and php-wasm cannot interrupt a
 * tight loop from inside, so the cap belongs out here: without one, a
 * `while (true)` left the playground running forever with no Stop and no
 * recovery short of reloading the page. Generous, because the first run
 * after boot competes with the WASM warm-up.
 */
const RUN_TIMEOUT_MS = 15_000;

/** A fresh PHP worker, booted and ready to run. */
function spawnPhpWorker(): Promise<Worker> {
  const worker = new Worker(new URL("./php-worker.ts", import.meta.url));
  return new Promise<Worker>((resolve, reject) => {
    const onMessage = (ev: MessageEvent<WorkerOutMessage>) => {
      const msg = ev.data;
      if (msg.kind === "ready") {
        worker.removeEventListener("message", onMessage);
        resolve(worker);
      } else if (msg.kind === "init-error") {
        worker.removeEventListener("message", onMessage);
        worker.terminate();
        reject(new Error(msg.message));
      }
    };
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", (ev) => {
      worker.removeEventListener("message", onMessage);
      reject(new Error(ev.message || "PHP worker failed to start"));
    });
    worker.postMessage({ kind: "init" });
  });
}

class PhpWorkerRuntime implements LanguageRuntime {
  private nextId = 0;
  /** Rejects the run in flight, for Stop and for the timeout. */
  private abortActiveRun: ((err: Error) => void) | null = null;
  /** Set while a replacement worker is booting after a terminate. */
  private restartPromise: Promise<void> | null = null;
  /** Files the last run wrote, awaiting collection by the surface. */
  private createdFiles: Array<[string, Uint8Array]> = [];

  constructor(private worker: Worker) {}

  /** Terminate the worker (registry-eviction hook; unusable after). */
  dispose(): void {
    this.worker.terminate();
  }

  /**
   * Stop the running script.
   *
   * PHP cannot be interrupted from inside a tight loop, so stopping means
   * terminating the worker and standing a fresh one up. Output already
   * streamed stays on screen, which is the part that says where it hung.
   */
  async cancelRun(): Promise<void> {
    if (this.restartPromise) return this.restartPromise;
    const abort = this.abortActiveRun;
    this.abortActiveRun = null;
    if (abort) {
      const err = new Error("Run stopped.");
      err.name = "RunCancelledError";
      abort(err);
    }
    return this.restart();
  }

  /** Throw the interpreter away and boot a fresh one. */
  private restart(): Promise<void> {
    if (this.restartPromise) return this.restartPromise;
    this.worker.terminate();
    this.restartPromise = (async () => {
      try {
        this.worker = await spawnPhpWorker();
      } finally {
        this.restartPromise = null;
      }
    })();
    return this.restartPromise;
  }

  /** Files the script wrote, for the Files panel. */
  async collectCreatedFiles(): Promise<Map<string, Uint8Array>> {
    const collected = new Map(this.createdFiles);
    this.createdFiles = [];
    return collected;
  }

  async prepareFileSystem(files: Map<string, Uint8Array>): Promise<void> {
    const id = ++this.nextId;
    const payload: Array<[string, Uint8Array]> = [];
    for (const [path, bytes] of files) payload.push([path, bytes]);
    return new Promise<void>((resolve, reject) => {
      const onMessage = (ev: MessageEvent<WorkerOutMessage>) => {
        const msg = ev.data;
        if (
          msg.kind !== "prepare-fs-done" &&
          msg.kind !== "prepare-fs-error"
        ) {
          return;
        }
        if (msg.id !== id) return;
        this.worker.removeEventListener("message", onMessage);
        if (msg.kind === "prepare-fs-done") resolve();
        else reject(new Error(msg.message));
      };
      this.worker.addEventListener("message", onMessage);
      this.worker.postMessage({ kind: "prepare-fs", id, files: payload });
    });
  }

  async run(
    code: string,
    emit: EmitOutput,
    options?: RunOptions,
  ): Promise<void> {
    if (this.restartPromise) await this.restartPromise;
    const entry = options?.entryFilename ?? "index.php";
    const entryPath = entry.startsWith("/") ? entry : `/${entry}`;
    const id = ++this.nextId;
    const worker = this.worker;
    this.createdFiles = [];

    await new Promise<void>((resolve, reject) => {
      let timer: number | null = null;
      const finish = (settle: () => void) => {
        if (timer !== null) window.clearTimeout(timer);
        worker.removeEventListener("message", onMessage);
        this.abortActiveRun = null;
        settle();
      };
      this.abortActiveRun = (err) => finish(() => reject(err));

      const onMessage = (ev: MessageEvent<WorkerOutMessage>) => {
        const msg = ev.data;
        if (msg.kind !== "output" && msg.kind !== "done" && msg.kind !== "error") {
          return;
        }
        if (msg.id !== id) return;
        if (msg.kind === "output") {
          emit(
            msg.cell as Parameters<EmitOutput>[0],
            msg.seq,
            msg.append,
          );
          return;
        }
        if (msg.kind === "done") {
          finish(resolve);
        } else if (msg.kind === "error") {
          // An aborted interpreter cannot run anything else; replace it
          // rather than leaving the next Run to fail mysteriously.
          if (msg.fatal) void this.restart();
          finish(() => reject(new Error(msg.message)));
        }
      };
      worker.addEventListener("message", onMessage);

      timer = window.setTimeout(() => {
        // Whatever the script printed before it hung has already streamed,
        // so terminating costs the reader nothing but the hang.
        const seconds = Math.round(RUN_TIMEOUT_MS / 1000);
        emit({
          type: "stderr",
          content:
            `Stopped after ${seconds}s: the script never finished, so it is probably ` +
            "stuck in a loop. Output it produced before then is above.",
        });
        void this.cancelRun();
      }, RUN_TIMEOUT_MS);

      worker.postMessage({ kind: "run", id, code, entryPath });
    });

    // Asked for after the run so a script that wrote a file mid-run still
    // reports it; a terminated run skips this with its worker.
    this.createdFiles = await this.requestCreatedFiles();
  }

  /** Ask the worker for files the run left behind. Best-effort: a worker
   *  that has gone away answers nothing rather than failing the run. */
  private requestCreatedFiles(): Promise<Array<[string, Uint8Array]>> {
    const id = ++this.nextId;
    const worker = this.worker;
    return new Promise((resolve) => {
      const timer = window.setTimeout(() => {
        worker.removeEventListener("message", onMessage);
        resolve([]);
      }, 5_000);
      const onMessage = (ev: MessageEvent<WorkerOutMessage>) => {
        const msg = ev.data;
        if (msg.kind !== "created-files" || msg.id !== id) return;
        window.clearTimeout(timer);
        worker.removeEventListener("message", onMessage);
        resolve(msg.files);
      };
      worker.addEventListener("message", onMessage);
      worker.postMessage({ kind: "collect-created-files", id });
    });
  }
}

export const phpAdapter: LanguageAdapter = {
  id: "php",
  displayName: "PHP Playground",
  logoText: "PHP",
  documentTitle: "PHP Playground",
  readyStatus: "PHP ready",
  runtimeInfo: {
    language: "PHP",
    version: "8.4",
    engine: "php-wasm",
    engineUrl: "https://github.com/seanmorris/php-wasm",
    notes:
      "PHP compiled to WebAssembly, runs entirely in the browser, no server roundtrip. " +
      "This is a 32-bit build: PHP_INT_MAX is 2147483647, so a cast like (int)\"3000000000\" " +
      "clamps rather than overflowing to float, crc32() returns a negative number, dates past " +
      "19 January 2038 are out of range, and json_decode() fails on a document containing an " +
      "integer too large to represent. bcmath is available and unaffected when you need the " +
      "range. PHP_OS_FAMILY reports Unknown here even though PHP_OS is Linux. " +
      "Extensions: bcmath, calendar, ctype, date, exif, filter, hash, json, libxml, PDO, pcre, " +
      "random, Reflection, session, SPL, tokenizer, plus php-wasm's own pib, vrzno and " +
      "waitline. Notably absent: mbstring, iconv, intl, openssl, zlib, curl, gd, fileinfo, " +
      "sqlite3 and the DOM/SimpleXML extensions. PDO::getAvailableDrivers() lists pgsql, but " +
      "no database is wired up and using it fails the run. A script that has not finished " +
      "after 15 seconds is stopped, and Stop ends one sooner.",
  },
  codeMirrorMode: "php",
  // mago_fmt (PSR-12) (see formatCode), keep in sync.
  indentWidth: 4,
  examples: EXAMPLES,
  packages: PACKAGES,
  exportFormats: [
    { extension: "php", label: "PHP (.php)", mimeType: "application/x-php" },
  ],
  exportBaseFilename: "index",
  defaultFileExtension: "php",
  packagesFooter: (
    <>
      Functions above are part of the{" "}
      <a
        href="https://www.php.net/manual/en/funcref.php"
        target="_blank"
        rel="noreferrer"
      >
        PHP standard library
      </a>{" "}
      and are always available, no <code>require</code> needed.
    </>
  ),
  // PHP has no per-call import statement; a hint comment keeps the click
  // affordance consistent with the other playgrounds.
  importSnippet: (name) => `<?php // ${name} is part of the PHP standard library.`,
  hasImport(code, name) {
    return code.includes(`// ${name} is part of the PHP standard library.`);
  },
  async formatCode(code: string): Promise<string> {
    const { format } = await getMagoFmt();
    return format(code, "main.php");
  },
  async init(setLoadingMessage): Promise<LanguageRuntime> {
    setLoadingMessage("Starting PHP runtime…");
    const worker = new Worker(new URL("./php-worker.ts", import.meta.url));
    return new Promise<LanguageRuntime>((resolve, reject) => {
      const onMessage = (ev: MessageEvent<WorkerOutMessage>) => {
        const msg = ev.data;
        if (msg.kind === "loading") {
          setLoadingMessage(msg.message);
        } else if (msg.kind === "ready") {
          worker.removeEventListener("message", onMessage);
          resolve(new PhpWorkerRuntime(worker));
        } else if (msg.kind === "init-error") {
          worker.removeEventListener("message", onMessage);
          worker.terminate();
          reject(new Error(msg.message));
        }
      };
      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", (ev) => {
        worker.removeEventListener("message", onMessage);
        reject(new Error(ev.message || "PHP worker failed to start"));
      });
      worker.postMessage({ kind: "init" });
    });
  },
};
