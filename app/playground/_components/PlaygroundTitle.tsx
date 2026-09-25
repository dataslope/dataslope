import type { CSSProperties } from "react";
import { PLAYGROUNDS } from "@/app/_components/playgrounds";

/**
 * The page `<h1>` a playground route serves before its client chunk arrives.
 * Every language page is `dynamic(..., { ssr: false })`, so without this the
 * server HTML carried no heading at all. Passed as that import's `loading`
 * fallback, it is exactly what the server renders, and the shell's own
 * visually hidden `<h1>` replaces it when the chunk mounts, so the page never
 * holds two. It is invisible, so it cannot flash the wrong theme the way a
 * visible skeleton did.
 *
 * Hidden with an inline style rather than `.playground-sr-title`: that class
 * lives in playground.css, which arrives with the same lazy chunk, and until
 * then the heading would paint as plain text.
 */
const VISUALLY_HIDDEN: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
  border: 0,
};

/** The `loading` option for a playground's dynamic import, titled from the
 *  playground registry ("Python Playground"). */
export function playgroundTitle(id: string) {
  const label = PLAYGROUNDS.find((p) => p.id === id)?.label ?? id;
  return function PlaygroundTitle() {
    return <h1 style={VISUALLY_HIDDEN}>{`${label} Playground`}</h1>;
  };
}
