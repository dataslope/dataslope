/**
 * HOC lifting the search-anchor id injected by `remarkComponentAnchors`
 * (lib/search/anchors.mjs) onto a neutral wrapper div. `data-search-anchor`
 * lets docs.css give these targets the heading scroll offset so the sticky
 * navbar doesn't cover them. Components without an injected id pass through
 * unwrapped.
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
