/**
 * `/svg-gallery` — a build-time review page for every custom inline `<svg>`
 * graphic used across the `/learn` courses (Mermaid diagrams excluded).
 *
 * Each graphic is rendered alongside its globally-unique ID (the same label
 * shown under the graphic on its lesson page, e.g.
 * `svg-intro-sql-postgres-filtering-rows-f4f4db`) and a deep link to the
 * lesson, so the whole set can be skimmed in one place to spot graphics that
 * need replacing or removing.
 *
 * Generated entirely at build time: `force-static` pre-renders the route, and
 * `getSvgGallery()` reads the MDX content from disk during that render. The
 * page is intended for development but is harmless if publicly reachable.
 */
import type { Metadata } from "next";
import { getSvgGallery } from "@/lib/svgGallery";
import styles from "./svg-gallery.module.css";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "SVG graphics gallery",
  description: "Every custom SVG graphic used across the Dataslope courses.",
  robots: { index: false, follow: false },
};

export default function SvgGalleryPage() {
  const courses = getSvgGallery();
  const total = courses.reduce((n, c) => n + c.graphics.length, 0);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>SVG graphics gallery</h1>
        <p className={styles.subtitle}>
          Every custom inline <code>&lt;svg&gt;</code> graphic across the{" "}
          <code>/learn</code> courses — <span className={styles.count}>{total}</span>{" "}
          graphic{total === 1 ? "" : "s"} in {courses.length} course
          {courses.length === 1 ? "" : "s"}. Mermaid diagrams are excluded. Each
          graphic shows its ID and links to the lesson that contains it.
        </p>
      </header>

      {total === 0 ? (
        <p className={styles.empty}>No custom SVG graphics found.</p>
      ) : (
        courses.map((course) => (
          <section key={course.slug} className={styles.course}>
            <h2 className={styles.courseHeading}>
              {course.title}
              <span className={styles.courseSlug}>{course.slug}</span>
            </h2>
            <div className={styles.grid}>
              {course.graphics.map((g) => (
                <figure key={g.id} className={styles.card}>
                  <div
                    className={styles.figure}
                    // Authored SVG source, rewritten to valid markup by
                    // jsxSvgToHtml in lib/svgGallery.ts. Content is repo-owned.
                    dangerouslySetInnerHTML={{ __html: g.html }}
                  />
                  <figcaption className={styles.meta}>
                    <p className={styles.id}>{g.id}</p>
                    <a className={styles.link} href={g.href}>
                      View on lesson page →
                    </a>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        ))
      )}
    </main>
  );
}
