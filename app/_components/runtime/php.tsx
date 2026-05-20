import type {
  EmitOutput,
  ExampleSnippet,
  LanguageAdapter,
  LanguageRuntime,
  PackageInfo,
} from "../types";
import { getMagoFmt } from "./magoFmt";

// PHP (via php-wasm) runs inside a dedicated Web Worker — see php-worker.ts.

const EXAMPLES: ExampleSnippet[] = [
  {
    key: "hello",
    title: "Hello World",
    desc: "Basic echo, math & strings",
    code: `<?php
// Hello, PHP Playground!
echo "PHP " . PHP_VERSION . " — running entirely in your browser.\\n";
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
];

const PACKAGES: PackageInfo[] = [
  // All PHP standard-library functions and constants (str_replace,
  // sprintf, M_PI, array_map, json_decode, etc.) are globally available
  // without any require or include — there are no packages to install.
];

// ─── Worker-based runtime ────────────────────────────────────────────────

type WorkerOutMessage =
  | { kind: "loading"; message: string }
  | { kind: "ready" }
  | { kind: "init-error"; message: string }
  | { kind: "output"; id: number; cell: { type: string; content: string } }
  | { kind: "done"; id: number }
  | { kind: "error"; id: number; message: string }
  | { kind: "prepare-fs-done"; id: number }
  | { kind: "prepare-fs-error"; id: number; message: string };

class PhpWorkerRuntime implements LanguageRuntime {
  private nextId = 0;

  constructor(private worker: Worker) {}

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

  async run(code: string, emit: EmitOutput): Promise<void> {
    const id = ++this.nextId;
    return new Promise<void>((resolve, reject) => {
      const onMessage = (ev: MessageEvent<WorkerOutMessage>) => {
        const msg = ev.data;
        if (msg.kind !== "output" && msg.kind !== "done" && msg.kind !== "error") return;
        if (msg.id !== id) return;
        if (msg.kind === "output") {
          emit(msg.cell as Parameters<EmitOutput>[0]);
          return;
        }
        this.worker.removeEventListener("message", onMessage);
        if (msg.kind === "done") resolve();
        else reject(new Error(msg.message));
      };
      this.worker.addEventListener("message", onMessage);
      this.worker.postMessage({ kind: "run", id, code });
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
    version: "8.3.11",
    engine: "php-wasm",
    engineUrl: "https://github.com/seanmorris/php-wasm",
    notes:
      "PHP compiled to WebAssembly — runs entirely in the browser, no server roundtrip.",
  },
  codeMirrorMode: "php",
  examples: EXAMPLES,
  packages: PACKAGES,
  exportFormats: [
    { extension: "php", label: "PHP (.php)", mimeType: "application/x-php" },
  ],
  exportBaseFilename: "script",
  defaultFileExtension: "php",
  entryPoint: "index.php",
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
      and are always available — no <code>require</code> needed.
    </>
  ),
  // PHP doesn't have a per-call import statement that maps cleanly to
  // the packages drawer, so we just drop a hint comment near the top of
  // the file. Keeps the click affordance consistent with the other
  // playgrounds.
  importSnippet: (name) => `<?php // ${name} is part of the PHP standard library.`,
  hasImport(code, name) {
    return code.includes(`// ${name} is part of the PHP standard library.`);
  },
  async formatCode(code: string): Promise<string> {
    const { format } = await getMagoFmt();
    return format(code, "main.php");
  },
  async init(setLoadingMessage): Promise<LanguageRuntime> {
    setLoadingMessage("Loading PHP worker…");
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
