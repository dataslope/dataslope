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

/** A `<code>` span, the marker lesson authors use for code inside a diagram
 *  label (see `applyCodeFont` in mermaid.tsx for the Mermaid-rendered side of
 *  the same convention). Everything else in a label is plain author prose. */
const CODE_TAG = /<code>([\s\S]*?)<\/code>/gi;

/**
 * Render one label: Mermaid's `<br>` separators become real line breaks, and a
 * `<code>` span becomes a real `<code>` element, which `app/docs.css` sets in
 * JetBrains Mono. Those two are the only markup a timeline label carries.
 */
function renderLabel(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let cursor = 0;
  const pushProse = (run: string, at: number) => {
    if (!run) return;
    run.split(/<br\s*\/?>/i).forEach((line, i) => {
      parts.push(
        <Fragment key={`p${at}-${i}`}>
          {i > 0 && <br />}
          {line}
        </Fragment>,
      );
    });
  };

  for (const match of text.matchAll(CODE_TAG)) {
    pushProse(text.slice(cursor, match.index), cursor);
    parts.push(<code key={`c${match.index}`}>{match[1]}</code>);
    cursor = match.index + match[0].length;
  }
  pushProse(text.slice(cursor), cursor);
  return parts;
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
      {title && (
        <figcaption className={styles.title}>{renderLabel(title)}</figcaption>
      )}
      <ol className={styles.track}>
        {entries.map((entry, i) => (
          <li
            key={i}
            className={`${styles.row} ${i % 2 === 0 ? styles.left : styles.right}`}
          >
            <span className={styles.marker} aria-hidden="true" />
            <div className={styles.card}>
              <p className={styles.period}>{renderLabel(entry.period)}</p>
              {entry.events.map((event, j) => (
                <p key={j} className={styles.event}>
                  {renderLabel(event)}
                </p>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </figure>
  );
}
