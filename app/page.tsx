import Link from "next/link";
import { SiPython, SiR, SiPostgresql } from "react-icons/si";
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
