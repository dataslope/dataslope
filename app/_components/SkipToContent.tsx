"use client";

/**
 * Skip-to-content link, mounted first in the root layout's <body> so it is
 * the first tab stop on every page. Pages here don't share a stable content
 * id, so activation focuses the page's main landmark (falling back to the
 * first h1) instead of relying on a fragment target. Styled by
 * `.skip-to-content` in globals.css, visually hidden until focused.
 */
export default function SkipToContent() {
  return (
    <a
      href="#main"
      className="skip-to-content"
      onClick={(event) => {
        event.preventDefault();
        const target = document.querySelector<HTMLElement>(
          "main, [role='main'], h1",
        );
        if (!target) return;
        target.tabIndex = -1;
        target.focus();
        target.scrollIntoView({ block: "start" });
      }}
    >
      Skip to main content
    </a>
  );
}
