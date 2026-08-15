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
 * Parse a Mermaid `timeline` chart into structured data (rendered natively
 * because Mermaid's horizontal layout scales wide charts illegibly small).
 * Supported subset: `title`, `section` (rendered as a divider), and
 * `<period> : <event>` markers. Only the FIRST colon splits — event text
 * frequently contains colons ("Title: Subtitle") — and a continuation line
 * with no colon attaches as an extra event under the most recent period.
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

/** The author convention for code inside a diagram label (see applyCodeFont in
 *  mermaid.tsx for the Mermaid-rendered side). */
const CODE_TAG = /<code>([\s\S]*?)<\/code>/gi;

/**
 * Render one label: `<br>` becomes a real line break and `<code>` a real code
 * element — the only two pieces of markup a timeline label carries.
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
 * Vertical, center-railed timeline for Mermaid `timeline` diagrams. Cards
 * alternate sides on wide layouts and collapse to one column on narrow ones,
 * switched by a container query (article column width, not viewport).
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
