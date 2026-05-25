import Link from "next/link";
import styles from "./root.module.css";

export const metadata = {
  title: "Dataslope",
  description: "Dataslope — browser-based playgrounds and tooling.",
};

function GitHubIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.004.071 1.532 1.031 1.532 1.031.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.087.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.03-2.682-.103-.253-.447-1.27.097-2.646 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.376.202 2.393.1 2.646.64.698 1.028 1.591 1.028 2.682 0 3.841-2.337 4.687-4.565 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>Dataslope</h1>
        <p className={styles.subtitle}>
          A growing collection of browser-based developer tools.
        </p>
        <div className={styles.ctas}>
          <Link href="/learn" className={styles.cta}>
            Browse Learn
            <span aria-hidden="true" className={styles.arrow}>
              →
            </span>
          </Link>
          <Link href="/playground" className={styles.ctaSecondary}>
            Open the Playground
          </Link>
          <Link href="/color-test" className={styles.ctaSecondary}>
            Color Theme Test
          </Link>
          <a
            href="https://github.com/dataslope/dataslope/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.ctaSecondary}
            aria-label="View source on GitHub"
          >
            <GitHubIcon />
            GitHub
          </a>
        </div>

        <section className={styles.courses}>
          <h2 className={styles.coursesHeading}>Courses</h2>
          <div className={styles.courseList}>
            <Link href="/learn/python-basics" className={styles.courseCard}>
              <span className={styles.courseTitle}>Python Basics</span>
              <span className={styles.courseArrow} aria-hidden="true">→</span>
            </Link>
            <Link href="/learn/mastering-dsa-cpp" className={styles.courseCard}>
              <span className={styles.courseTitle}>
                Mastering Data Structures and Algorithms with C++
              </span>
              <span className={styles.courseArrow} aria-hidden="true">→</span>
            </Link>
            <Link href="/learn/oop-blueprint-java" className={styles.courseCard}>
              <span className={styles.courseTitle}>
                Object-Oriented Programming Blueprint with Java
              </span>
              <span className={styles.courseArrow} aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
