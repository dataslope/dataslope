import Link from "next/link";
import styles from "./home.module.css";

function PythonLogo() {
  return (
    <svg
      className={styles.logoSvg}
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="py-blue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5A9FD4" />
          <stop offset="100%" stopColor="#306998" />
        </linearGradient>
        <linearGradient id="py-yellow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFE873" />
          <stop offset="100%" stopColor="#FFD43B" />
        </linearGradient>
      </defs>
      <path
        fill="url(#py-blue)"
        d="M31.9 4c-7 0-6.6 3-6.6 3v3.2h6.7v.9H22.7s-4.5-.5-4.5 6.5 3.9 6.7 3.9 6.7H25v-3.4s-.2-3.9 3.8-3.9h6.6s3.7.06 3.7-3.6v-6.1S39.7 4 31.9 4zM28.3 6.1a1.2 1.2 0 0 1 1.2 1.2 1.2 1.2 0 0 1-1.2 1.2 1.2 1.2 0 0 1-1.2-1.2 1.2 1.2 0 0 1 1.2-1.2z"
      />
      <path
        fill="url(#py-yellow)"
        d="M32.1 60c7 0 6.6-3 6.6-3v-3.2h-6.7v-.9h9.3s4.5.5 4.5-6.5-3.9-6.7-3.9-6.7H39v3.4s.2 3.9-3.8 3.9h-6.6s-3.7-.06-3.7 3.6v6.1S24.3 60 32.1 60zm3.6-2.1a1.2 1.2 0 0 1-1.2-1.2 1.2 1.2 0 0 1 1.2-1.2 1.2 1.2 0 0 1 1.2 1.2 1.2 1.2 0 0 1-1.2 1.2z"
      />
    </svg>
  );
}

function RLogo() {
  return (
    <svg
      className={styles.logoSvg}
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="r-grey" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#cbced0" />
          <stop offset="100%" stopColor="#84838b" />
        </linearGradient>
        <linearGradient id="r-blue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#276dc3" />
          <stop offset="100%" stopColor="#165caa" />
        </linearGradient>
      </defs>
      <path
        fill="url(#r-grey)"
        fillRule="evenodd"
        d="M32 50c-15.5 0-28-8.7-28-19.5S16.5 11 32 11s28 8.7 28 19.5c0 6-3.9 11.4-10 14.9-2.5-3.4-7.6-7.5-14.5-9.4 5.7.8 12-1.1 14.5-4.5 2.7-3.5.4-7.6-5.5-9.5-3.7-1.3-9.2-1.5-14.5-1V47.4c-2.6.4-5.4.6-8 .6 1.7.7 3.4 1.3 5.2 1.7C28.6 49.9 30.3 50 32 50z"
      />
      <path
        fill="url(#r-blue)"
        d="M44 38l13 17h-9L36 41c1.4-.2 2.7-.4 4-.7 1.5-.4 2.8-1 4-1.7v-.6z"
      />
    </svg>
  );
}

function PostgresLogo() {
  return (
    <svg
      className={styles.logoSvg}
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <path
        fill="#336791"
        d="M48 8c-3 0-5.5.6-7.5 1.5-2-.5-4-.7-6-.7-3.5 0-6.5.8-9 2-2-.6-4-1-6-1-7 0-12 4-12 12 0 4 1 8 2 12 1.5 6 4 13 8 16 1 .8 2 .8 3 .3 1-.5 2-1.6 3-3-.5 1.5-.7 3-.5 4 .3 1 1 2 2 2.4 1 .4 2.4.4 3.5 0 2-.7 3.5-2.4 4.5-4.5 0 1.5.5 3 1.5 4 1 .8 2.5 1 4 .5 1.5-.5 3-2 4-4 1-2 1.5-5 1.5-8 0-.5-.1-1-.2-1.5h.2c4.5 0 8-1.5 10-4.5 2-3 2.5-7 1.8-12-.5-3-1.5-6-3-8-1.5-2-3.5-3.5-5.8-4z"
      />
      <path
        fill="none"
        stroke="#fff"
        strokeWidth="1.2"
        strokeLinecap="round"
        d="M22 22c1 5 1.5 10 1 14M30 23c0 5-.5 10-1 14M40 22c-.5 4-.5 8 0 12"
      />
      <ellipse cx="40" cy="20" rx="2" ry="1.2" fill="#fff" />
    </svg>
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
