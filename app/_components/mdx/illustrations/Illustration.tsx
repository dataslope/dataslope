/**
 * `<Illustration>` — the single MDX entry point for the course's SVG artwork.
 *
 * Registered globally in `mdx-components.tsx`, so any lesson can drop a graphic
 * in by key with no import:
 *
 * ```mdx
 * <Illustration name="types-as-tokens" />
 * <Illustration name="closures-backpack" size="lg" caption="A function keeps its scope." />
 * ```
 *
 * The component is a pure server component: it renders a static `<svg>` whose
 * colors are CSS variables (see palette.ts), so it themes itself for light and
 * dark mode with no client JavaScript. The artwork for each `name` lives in the
 * section files under this folder and is wired up in `registry.tsx`.
 */
import type { IllustrationSize } from "./types";
import { illustrations } from "./registry";
import s from "./illustrations.module.css";

interface IllustrationProps {
  /** Registry key — see registry.tsx for the full list. */
  name: string;
  /** Frame width; falls back to the registry default, then `"md"`. */
  size?: IllustrationSize;
  /** Optional visible caption. Used sparingly — the art should carry meaning. */
  caption?: string;
  /** Wrap the art in a soft surface panel. */
  framed?: boolean;
  /** Override the built-in accessible label. */
  label?: string;
}

export function Illustration({
  name,
  size,
  caption,
  framed,
  label,
}: IllustrationProps) {
  const entry = illustrations[name];

  if (!entry) {
    // Authoring guard: a mistyped name shows a visible marker during
    // development instead of silently rendering nothing. Not expected to ship.
    if (process.env.NODE_ENV !== "production") {
      return (
        <figure className={`${s.figure} ${s.md}`}>
          <div
            style={{
              border: "1px dashed var(--ds-red-500)",
              color: "var(--ds-red-500)",
              borderRadius: 8,
              padding: "0.75rem 1rem",
              font: "500 0.8125rem/1.4 var(--font-mono, monospace)",
            }}
          >
            Unknown illustration: <code>{name}</code>
          </div>
        </figure>
      );
    }
    return null;
  }

  const resolvedSize = size ?? entry.size ?? "md";
  const a11yLabel = label ?? entry.label;

  return (
    <figure
      className={`${s.figure} ${s[resolvedSize]} ${framed ? s.framed : ""}`}
    >
      <svg
        className={s.art}
        viewBox={entry.viewBox}
        role="img"
        aria-label={a11yLabel}
        xmlns="http://www.w3.org/2000/svg"
      >
        <title>{a11yLabel}</title>
        {entry.render()}
      </svg>
      {caption ? <figcaption className={s.caption}>{caption}</figcaption> : null}
    </figure>
  );
}
