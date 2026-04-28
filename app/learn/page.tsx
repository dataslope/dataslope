"use client";

// Test page that verifies the new `CodeBlock` component works for
// learning/textbook-style content. We deliberately mix multiple
// languages, and embed multiple blocks per language, to confirm that:
//   1. Each block runs independently when its Run button is clicked.
//   2. Multiple blocks for the same adapter share one runtime
//      (one Pyodide worker, one CheerpJ instance, etc.) — so state
//      set in one Python block is visible to the next, mirroring the
//      "notebook" UX learning sites typically want.
//   3. The component renders sensibly inside long-form prose so it is
//      ready to be embedded by fumadocs MDX once that lands.

import Link from "next/link";
import CodeBlock from "../_components/CodeBlock";
import { pythonAdapter } from "../_components/runtime/python";
import { javascriptAdapter } from "../_components/runtime/javascript";
import { rAdapter } from "../_components/runtime/r";
import { typescriptAdapter } from "../_components/runtime/typescript";
import styles from "./learn.module.css";

export default function LearnTestPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link href="/" className={styles.backLink}>
          ← Back to home
        </Link>
        <h1>Learning page (preview)</h1>
      <p className={styles.lede}>
        Scratch space for the new <code>CodeBlock</code> component that will
        eventually be embedded inside fumadocs-powered learning pages. Each
        block has its own editor, Run button, Reset button, and stdout/stderr
        panel. Blocks that share the same language share one runtime, so
        variables defined in an earlier block are visible to later blocks.
      </p>

      <h2>Python: variables</h2>
      <p>
        Python variables don&apos;t need to be declared with a type — assigning
        a value with <code>=</code> creates the binding. Run the next block
        and watch what happens.
      </p>
      <CodeBlock
        adapter={pythonAdapter}
        initialCode={`# Run this block
x = "3" * 3 + "3"
print(x)
`}
      />

      <p>
        The shared runtime keeps state between blocks, which is convenient for
        teaching: re-using <code>x</code> below just works.
      </p>
      <CodeBlock
        adapter={pythonAdapter}
        initialCode={`# x is still defined from the previous block
print("len(x) =", len(x))
print("x.upper() =", x.upper())
`}
      />

      <p>
        And of course you can reassign it. Try changing the operation, then
        click Run again.
      </p>
      <CodeBlock
        adapter={pythonAdapter}
        initialCode={`x = sum(range(1, 11))
print("Sum 1..10 =", x)
`}
      />

      <h2>JavaScript</h2>
      <p>
        JavaScript runs natively in the browser. <code>console.log</code> is
        captured and streamed into the output panel below.
      </p>
      <CodeBlock
        adapter={javascriptAdapter}
        initialCode={`const greet = (who) => \`Hello, \${who}!\`;
console.log(greet("learner"));
console.log("π ≈", Math.PI.toFixed(4));
`}
      />

      <p>Top-level <code>await</code> is supported, too.</p>
      <CodeBlock
        adapter={javascriptAdapter}
        initialCode={`const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await wait(50);
console.log("Done waiting!");
`}
      />

      <h2>TypeScript</h2>
      <p>TypeScript is transpiled in the browser, then run as JavaScript.</p>
      <CodeBlock
        adapter={typescriptAdapter}
        initialCode={`interface Point { x: number; y: number }
const p: Point = { x: 3, y: 4 };
const dist = Math.hypot(p.x, p.y);
console.log(\`distance = \${dist}\`);
`}
      />

      <h2>R</h2>
      <p>
        R runs via WebR (a WebAssembly build of R). The first run takes a
        moment while the runtime downloads.
      </p>
      <CodeBlock
        adapter={rAdapter}
        initialCode={`x <- c(1, 2, 3, 4, 5)
cat("mean:", mean(x), "\\n")
cat("sd:  ", sd(x), "\\n")
`}
      />
      </div>
    </main>
  );
}
