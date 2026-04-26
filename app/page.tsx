import Link from "next/link";
import {
  SiPython,
  SiR,
  SiPostgresql,
  SiJavascript,
  SiTypescript,
  SiPhp,
  SiC,
  SiCplusplus,
  SiOpenjdk,
  SiSharp,
} from "react-icons/si";
import styles from "./home.module.css";

// We use the official brand glyphs from `react-icons/si` rather than
// hand-rolled SVGs — those tended to render with merged colours (the
// Python and PostgreSQL logos in particular looked muddy). Each icon
// gets its brand colour applied via the `color` style.
function PythonLogo() {
  return (
    <SiPython
      className={styles.logoSvg}
      style={{ color: "#3776AB" }}
      aria-hidden="true"
    />
  );
}

function RLogo() {
  return (
    <SiR
      className={styles.logoSvg}
      style={{ color: "#276DC3" }}
      aria-hidden="true"
    />
  );
}

function JavaScriptLogo() {
  return (
    <SiJavascript
      className={styles.logoSvg}
      style={{ color: "#F7DF1E" }}
      aria-hidden="true"
    />
  );
}

function TypeScriptLogo() {
  return (
    <SiTypescript
      className={styles.logoSvg}
      style={{ color: "#3178C6" }}
      aria-hidden="true"
    />
  );
}

function PhpLogo() {
  return (
    <SiPhp
      className={styles.logoSvg}
      style={{ color: "#777BB4" }}
      aria-hidden="true"
    />
  );
}

function CLogo() {
  return (
    <SiC
      className={styles.logoSvg}
      style={{ color: "#A8B9CC" }}
      aria-hidden="true"
    />
  );
}

function CppLogo() {
  return (
    <SiCplusplus
      className={styles.logoSvg}
      style={{ color: "#00599C" }}
      aria-hidden="true"
    />
  );
}

function JavaLogo() {
  return (
    <SiOpenjdk
      className={styles.logoSvg}
      style={{ color: "#ED8B00" }}
      aria-hidden="true"
    />
  );
}

function CSharpLogo() {
  return (
    <SiSharp
      className={styles.logoSvg}
      style={{ color: "#9B4F96" }}
      aria-hidden="true"
    />
  );
}

function PostgresLogo() {
  return (
    <SiPostgresql
      className={styles.logoSvg}
      style={{ color: "#4169E1" }}
      aria-hidden="true"
    />
  );
}

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>Playground</h1>
        <p className={styles.subtitle}>Browser-based language playgrounds.</p>
        <ul className={styles.list}>
          <li>
            <Link href="/python" className={styles.card}>
              <span className={styles.logo}>
                <PythonLogo />
              </span>
              <span className={styles.cardText}>
                <strong>Python</strong>
                <span className={styles.cardDesc}>
                  Run Python in the browser via Pyodide.
                </span>
              </span>
            </Link>
          </li>
          <li>
            <Link href="/r" className={styles.card}>
              <span className={styles.logo}>
                <RLogo />
              </span>
              <span className={styles.cardText}>
                <strong>R</strong>
                <span className={styles.cardDesc}>
                  Run R in the browser via WebR.
                </span>
              </span>
            </Link>
          </li>
          <li>
            <Link href="/javascript" className={styles.card}>
              <span className={styles.logo}>
                <JavaScriptLogo />
              </span>
              <span className={styles.cardText}>
                <strong>JavaScript</strong>
                <span className={styles.cardDesc}>
                  Run JavaScript natively in the browser.
                </span>
              </span>
            </Link>
          </li>
          <li>
            <Link href="/typescript" className={styles.card}>
              <span className={styles.logo}>
                <TypeScriptLogo />
              </span>
              <span className={styles.cardText}>
                <strong>TypeScript</strong>
                <span className={styles.cardDesc}>
                  Transpile TypeScript in the browser, then run it natively.
                </span>
              </span>
            </Link>
          </li>
          <li>
            <Link href="/php" className={styles.card}>
              <span className={styles.logo}>
                <PhpLogo />
              </span>
              <span className={styles.cardText}>
                <strong>PHP</strong>
                <span className={styles.cardDesc}>
                  Run PHP in the browser via php-wasm.
                </span>
              </span>
            </Link>
          </li>
          <li>
            <Link href="/c" className={styles.card}>
              <span className={styles.logo}>
                <CLogo />
              </span>
              <span className={styles.cardText}>
                <strong>C</strong>
                <span className={styles.cardDesc}>
                  Compile and run C in the browser via clang (WebAssembly).
                </span>
              </span>
            </Link>
          </li>
          <li>
            <Link href="/cpp" className={styles.card}>
              <span className={styles.logo}>
                <CppLogo />
              </span>
              <span className={styles.cardText}>
                <strong>C++</strong>
                <span className={styles.cardDesc}>
                  Compile and run C++ in the browser via clang (WebAssembly).
                </span>
              </span>
            </Link>
          </li>
          <li>
            <Link href="/java" className={styles.card}>
              <span className={styles.logo}>
                <JavaLogo />
              </span>
              <span className={styles.cardText}>
                <strong>Java</strong>
                <span className={styles.cardDesc}>
                  Compile and run Java in the browser via CheerpJ (OpenJDK).
                </span>
              </span>
            </Link>
          </li>
          <li>
            <Link href="/csharp" className={styles.card}>
              <span className={styles.logo}>
                <CSharpLogo />
              </span>
              <span className={styles.cardText}>
                <strong>C#</strong>
                <span className={styles.cardDesc}>
                  Compile and run C# in the browser via Roslyn on .NET WebAssembly.
                </span>
              </span>
            </Link>
          </li>
          <li>
            <span className={`${styles.card} ${styles.cardDisabled}`}>
              <span className={styles.logo}>
                <PostgresLogo />
              </span>
              <span className={styles.cardText}>
                <strong>PostgreSQL</strong>
                <span className={styles.cardDesc}>
                  Coming soon at /postgres.
                </span>
              </span>
            </span>
          </li>
        </ul>
      </div>
    </main>
  );
}
