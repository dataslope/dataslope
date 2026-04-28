import type {
  EmitOutput,
  ExampleSnippet,
  LanguageAdapter,
  LanguageRuntime,
  PackageInfo,
} from "../types";

// Run PHP in the browser via php-wasm (https://github.com/seanmorris/php-wasm).
// PhpWeb is an EventTarget that streams `output` and `error` events as
// the script runs; we forward them into the playground's output pane.
//
// We pin the exact CDN-hosted version we depend on and override
// `locateFile` so php-wasm fetches its `.wasm` / shared-library files
// from jsDelivr instead of from a Next.js bundle URL — this mirrors how
// pyodide / WebR are loaded and avoids having to teach Next.js how to
// emit the WebAssembly assets that ship inside the npm package.

const PHP_WASM_VERSION = "0.0.9-alpha-32";
const PHP_WASM_CDN = `https://cdn.jsdelivr.net/npm/php-wasm@${PHP_WASM_VERSION}/`;

/** The narrow slice of the PhpWeb API we consume. */
interface PhpWebInstance extends EventTarget {
  /** Resolves once the underlying Emscripten module is initialised. */
  binary: Promise<unknown>;
  /** Run a PHP script (the package internally prepends `?>` so the
   *  argument is treated as a template — start with `<?php` to enter
   *  PHP mode). Resolves once the script finishes. */
  run(code: string): Promise<unknown>;
  /** Reset the underlying PHP interpreter so user-defined variables,
   *  functions, classes, constants, and superglobals from a previous
   *  `run()` don't leak into the next one. */
  refresh(): Promise<unknown>;
}

interface PhpOutputEvent extends Event {
  detail: string[];
}

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

class PhpRuntime implements LanguageRuntime {
  constructor(private php: PhpWebInstance) {}

  async run(code: string, emit: EmitOutput): Promise<void> {
    let stdoutBuf = "";
    let stderrBuf = "";

    const onOutput = (event: Event) => {
      const detail = (event as PhpOutputEvent).detail;
      if (detail) stdoutBuf += detail.join("");
    };
    const onError = (event: Event) => {
      const detail = (event as PhpOutputEvent).detail;
      if (detail) stderrBuf += detail.join("");
    };

    this.php.addEventListener("output", onOutput);
    this.php.addEventListener("error", onError);

    try {
      // Reset the interpreter so variables / functions / classes /
      // constants from a previous run can't leak into this one — the
      // playground guarantees a fresh execution state per Run click.
      try {
        await this.php.refresh();
      } catch {
        // `refresh` is best-effort; if it ever fails, fall through to
        // running the user code anyway rather than blocking the run.
      }
      // php-wasm internally prepends `?>` to the script, so user code
      // that begins with `<?php` enters PHP mode immediately.
      await this.php.run(code);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      stderrBuf += message + "\n";
    } finally {
      this.php.removeEventListener("output", onOutput);
      this.php.removeEventListener("error", onError);
    }

    const stdout = stdoutBuf.replace(/\n+$/, "");
    const stderr = stderrBuf.replace(/\n+$/, "");
    if (stdout) emit({ type: "stdout", content: stdout });
    if (stderr) emit({ type: "stderr", content: stderr });
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
    version: "8.x",
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
  async init(setLoadingMessage): Promise<LanguageRuntime> {
    setLoadingMessage("Loading PHP runtime…");
    // Dynamic import keeps php-wasm (which touches `navigator`,
    // `document.currentScript`, and other browser-only globals at
    // import time) out of the SSR bundle.
    const mod = (await import("php-wasm/PhpWeb.mjs")) as unknown as {
      PhpWeb: new (args?: Record<string, unknown>) => PhpWebInstance;
    };

    setLoadingMessage("Initialising PHP (WebAssembly)…");
    const php = new mod.PhpWeb({
      // Resolve php-wasm's wasm / shared-library files against jsDelivr
      // instead of relying on Next.js to emit them from node_modules.
      locateFile: (path: string) => PHP_WASM_CDN + path,
    });

    // `binary` resolves once the Emscripten module is fully ready.
    await php.binary;

    return new PhpRuntime(php);
  },
};
