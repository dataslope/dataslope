import Link from "next/link";
import styles from "./root.module.css";

export const metadata = {
  title: "Dataslope",
  description: "Dataslope — browser-based playgrounds and tooling.",
};

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>Dataslope</h1>
        <p className={styles.subtitle}>
          A growing collection of browser-based developer tools.
        </p>
        <div className={styles.ctas}>
          <Link href="/playground" className={styles.cta}>
            Open the Playground
            <span aria-hidden="true" className={styles.arrow}>
              →
            </span>
          </Link>
          <Link href="/learn" className={styles.ctaSecondary}>
            Browse Learn
          </Link>
        </div>
      </div>
    </main>
  );
}
