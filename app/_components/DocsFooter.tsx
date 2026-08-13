import { HomeFooter } from "./home/HomeFooter";

/**
 * The site-wide footer (`HomeFooter`, Tabbied band and all) on the Fumadocs
 * routes: course lessons, interview-prep pages, and the /fumadocs-dev gallery.
 *
 * A thin wrapper around the shared footer, but the wrapping is the point: it
 * gives the three docs layouts one import to render and one place to state
 * WHERE it has to be rendered, which is load-bearing.
 *
 * ── Rendered as a SIBLING of `DocsLayout`, after it, never as its child ──
 *
 * That placement is what keeps the sidebar pinned for the length of the lesson
 * and then lets it go as the footer arrives, with no scroll listener and no
 * measuring:
 *
 *   Fumadocs's layout container (`#nd-docs-layout`) is a CSS grid, and the
 *   sidebar's column is a single grid area spanning every row of it. The
 *   sidebar inside that area is `position: sticky` at the top and exactly one
 *   viewport tall (`h-[calc(var(--fd-docs-height) - …)]`), so it stays pinned
 *   while its grid area scrolls past, and unpins precisely when the grid's
 *   bottom edge meets the bottom of the viewport. Keeping the footer outside
 *   the grid makes the grid's bottom edge the top of the footer: the sidebar
 *   holds still for the whole lesson, then scrolls up with the page as the
 *   footer comes in. The table of contents, sticky in its own column the same
 *   way, releases with it.
 *
 *   Passing the footer to `DocsLayout` as `children` instead makes it a grid
 *   item, which costs both halves of that: the sidebar's area now spans it, so
 *   the sidebar stays pinned right through the footer, and the footer is laid
 *   into the grid's columns rather than across the page (~900px of a 1440px
 *   window, wearing the docs content's left margin).
 *
 * The footer's own styling needs nothing route-specific: the shared @source
 * list (app/tailwind.shared.css) scans `_components/home`, so the docs
 * Tailwind root compiles the same utilities the home root does, and the
 * layout rules that must be unlayered live in app/footer.css, which
 * app/docs.css imports.
 */
export function DocsFooter() {
  return <HomeFooter />;
}
