/**
 * The live-preview stage's reserved height. `.previewSlot` reserves its box
 * from first paint so a Run never grows the card under the reader; the author
 * declares the size per block, delivered as a CSS custom property (not inline
 * `height`) so the stylesheet keeps ownership of the drag-resize floor and
 * empty-state rules. Shared by `<CodeBlock>` and `<ChallengeCard>`.
 */

import type { CSSProperties } from "react";

/** Custom property `.previewSlot` reads its height from. */
export const PREVIEW_HEIGHT_VAR = "--ch-preview-height";

/** Style object setting the preview stage's height, or `undefined` to use the
 *  stylesheet default. Bare numbers mean px; strings pass through ("50vh"). */
export function previewStageStyle(
  previewHeight: number | string | undefined,
): CSSProperties | undefined {
  if (previewHeight === undefined) return undefined;
  const height =
    typeof previewHeight === "number" ? `${previewHeight}px` : previewHeight;
  return { [PREVIEW_HEIGHT_VAR]: height } as CSSProperties;
}
