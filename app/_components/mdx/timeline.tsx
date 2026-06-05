import { Fragment, type ReactNode } from "react";
import styles from "./timeline.module.css";

/**
 * A single point on the timeline: one time period (the marker on the rail)
 * plus the one or more event descriptions recorded against it.
 */
export interface TimelineEntry {
  period: string;
  events: string[];
}

export interface ParsedTimeline {
  title?: string;
  entries: TimelineEntry[];
}

/**
 * Parse a Mermaid `timeline` chart into structured data.
 *
 * We render these as a native React timeline instead of a Mermaid SVG because
 * Mermaid lays timelines out horizontally: with a dozen year-columns the SVG
 * grows far wider than the article column and gets scaled to fit, leaving the
 * text illegible. The vertical layout below stays readable at any width.
 *
 * Supported subset (everything our lesson content actually uses):
 *
 *   timeline
 *       title The C family tree
 *       1972 : C by Dennis Ritchie at Bell Labs
 *       1996 : Ihaka & Gentleman publish "R: A Language…"
 *              Core development team forms (now "R Core")
 *
 * Rules:
 *   - `title <text>`            → diagram title.
 *   - `section <text>`          → group label (rare in our content; rendered
 *                                 as a divider so nothing is silently dropped).
 *   - `<period> : <event>`      → a new marker. Only the FIRST colon splits the
 *                                 period from the text, because event text
 *                                 frequently contains colons (book titles, etc.).
 *   - an indented continuation line with no colon attaches as an additional
 *     event under the most recent period (Mermaid stacks these).
 *
 * Note we deliberately do not split the event text on subsequent colons into
 * multiple events: none of our timelines rely on that, and doing so would
 * mangle the common `"Title: Subtitle"` case.
 */
export function parseMermaidTimeline(chart: string): ParsedTimeline {
  // The Mermaid pipeline can hand us literal "\n" escapes rather than real
  // newlines (see mermaid.tsx), so normalise both forms.
  const lines = chart.replace(/\\n/g, "\n").split("\n");

  let title: string | undefined;
  const entries: TimelineEntry[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (/^timeline\b/i.test(line)) continue;

    const titleMatch = line.match(/^title\s+(.+)$/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
      continue;
    }

    const sectionMatch = line.match(/^section\s+(.+)$/i);
    if (sectionMatch) {
      entries.push({ period: sectionMatch[1].trim(), events: [] });
      continue;
    }

    const colon = line.indexOf(":");
    if (colon !== -1) {
      const period = line.slice(0, colon).trim();
      const event = line.slice(colon + 1).trim();
      entries.push({ period, events: event ? [event] : [] });
    } else if (entries.length > 0) {
      entries[entries.length - 1].events.push(line);
    }
  }

  return { title, entries };
}

/**
 * Render Mermaid `<br>` separators inside event text as real line breaks.
 * Event text is plain author prose (no HTML), so this is the only inline
 * markup we need to honour.
 */
function renderEventText(text: string): ReactNode {
  const parts = text.split(/<br\s*\/?>/i);
  return parts.map((part, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {part}
    </Fragment>
  ));
}

/**
 * Vertical, center-railed timeline for Mermaid `timeline` diagrams.
 *
 * A single rail runs down the centre with a circular marker for every period;
 * the event cards alternate left and right of the rail on wide layouts and
 * collapse to a single left-railed column on narrow ones. Layout switching is
 * driven by a container query so it responds to the article column width
 * rather than the viewport.
 */
export function Timeline({ chart }: { chart: string }) {
  const { title, entries } = parseMermaidTimeline(chart);
  if (entries.length === 0) return null;

  return (
    <figure className={styles.timeline}>
      {title && <figcaption className={styles.title}>{title}</figcaption>}
      <ol className={styles.track}>
        {entries.map((entry, i) => (
          <li
            key={i}
            className={`${styles.row} ${i % 2 === 0 ? styles.left : styles.right}`}
          >
            <span className={styles.marker} aria-hidden="true" />
            <div className={styles.card}>
              <p className={styles.period}>{entry.period}</p>
              {entry.events.map((event, j) => (
                <p key={j} className={styles.event}>
                  {renderEventText(event)}
                </p>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </figure>
  );
}
