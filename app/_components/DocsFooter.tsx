import { HomeFooter } from "./home/HomeFooter";

/**
 * The site-wide footer (`HomeFooter`) for the Fumadocs routes. Hard
 * constraint: render it as a SIBLING of `DocsLayout`, after it, never as its
 * child. The layout is a CSS grid whose sticky sidebar/TOC unpin exactly when
 * the grid's bottom edge meets the viewport; keeping the footer outside the
 * grid makes that edge the top of the footer. As a grid child, the sidebar
 * would stay pinned through the footer and the footer would be squeezed into
 * the content columns.
 */
export function DocsFooter() {
  return <HomeFooter />;
}
