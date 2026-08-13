/**
 * The live-preview stage's reserved height.
 *
 * `.previewSlot` (ChallengeCard.module.css) reserves its box from first
 * paint whether or not a frame has been mounted into it, so a Run never
 * grows the card under the reader. That only works if the reservation is
 * the right size, which the stylesheet cannot know: a page demo wants the
 * 300px default, a box-model demo wants 60px and would otherwise sit in a
 * screenful of reserved white.
 *
 * So the author declares it per block, and it arrives as a CSS custom
 * property rather than an inline `height` — the stylesheet keeps ownership
 * of the drag-resize floor and the empty-state rules, and the prop only
 * moves the number they are all written against.
 *
 * Both preview surfaces import this (`<CodeBlock>` and `<ChallengeCard>`),
 * so the number → px convention has one implementation and they cannot
 * disagree about what `previewHeight={240}` means.
 */

import type { CSSProperties } from "react";

/** Custom property `.previewSlot` reads its height from. */
export const PREVIEW_HEIGHT_VAR = "--ch-preview-height";

/**
 * Style object setting the preview stage's height, or `undefined` when the
 * block didn't ask for one (the stylesheet's own default then applies).
 *
 * A bare number means pixels, matching `<LivePreview height>` and
 * `<ReactPreview height>`; a string passes through, so `"50vh"` and
 * `"min(400px, 60vh)"` work.
 */
export function previewStageStyle(
  previewHeight: number | string | undefined,
): CSSProperties | undefined {
  if (previewHeight === undefined) return undefined;
  const height =
    typeof previewHeight === "number" ? `${previewHeight}px` : previewHeight;
  return { [PREVIEW_HEIGHT_VAR]: height } as CSSProperties;
}
