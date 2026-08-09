/**
 * Renders the search-anchor id that `remarkComponentAnchors` injects into
 * anchored MDX components (see lib/search/anchors.mjs).
 *
 * The plugin adds an `id` attribute to the JSX element, which MDX delivers as
 * an `id` prop. None of the wrapped components render an `id` themselves, so
 * this HOC lifts it onto a neutral wrapper `<div>` instead of threading an
 * extra prop through a dozen component signatures. The wrapper carries no
 * styling of its own; `data-search-anchor` exists so docs.css can give these
 * targets the same scroll offset as Fumadocs headings (`scroll-m-28`), keeping
 * the sticky navbar from covering the component a search link lands on.
 *
 * Components rendered without an injected id (anything outside MDX, or the
 * plugin being absent) pass through unwrapped.
 */
import type { ComponentType, JSX } from "react";

export function withSearchAnchor<P extends object>(
  Component: ComponentType<P>,
): (props: P & { id?: string }) => JSX.Element {
  function WithSearchAnchor({ id, ...props }: P & { id?: string }) {
    const inner = <Component {...(props as P)} />;
    if (!id) return inner;
    return (
      <div id={id} data-search-anchor="">
        {inner}
      </div>
    );
  }
  WithSearchAnchor.displayName = `WithSearchAnchor(${
    Component.displayName ?? Component.name ?? "Component"
  })`;
  return WithSearchAnchor;
}
